import type { Page, TestInfo } from "@playwright/test";

import { waitForAppReady } from "./appReady";
import { captureSectionDiagnostics } from "./diagnostics";

type GotoAndWaitOptions = {
  timeout?: number;
  testInfo?: TestInfo;
  debugLabel?: string;
  sectionSelector?: string;
  maxRetries?: number;
};

async function writeDiagnostics(
  page: Page,
  debugLabel: string,
  reason: string,
  testInfo?: TestInfo,
  sectionSelector?: string
) {
  return captureSectionDiagnostics(page, {
    label: `goto-${debugLabel}`,
    reason,
    testInfo,
    sectionSelector: sectionSelector ?? "main, [role='main'], header, footer",
  });
}

type ServerErrorSignal = {
  reason: string;
  snippet?: string;
};

async function detectServerErrorSignal(page: Page): Promise<ServerErrorSignal | null> {
  const url = page.url();
  if (url.includes("/_error")) {
    return { reason: `Detected /_error route (${url})` };
  }

  const html = await page.content().catch(() => "");
  if (!html) return null;

  const next500Patterns = [
    '"pageProps":{"statusCode":500',
    '"statusCode":500',
    "Internal Server Error",
    "TypeError:",
    ">Server Error<",
  ];

  const hit = next500Patterns.find((pattern) => html.includes(pattern));
  if (!hit) return null;

  const index = html.indexOf(hit);
  const snippet =
    index >= 0 ? html.slice(Math.max(0, index - 220), Math.min(html.length, index + 420)) : hit;
  return {
    reason: `Detected server-error marker (${hit})`,
    snippet,
  };
}

function isRetryable500Signal(text: string) {
  return (
    text.includes("/_error") ||
    text.includes('"statusCode":500') ||
    text.includes("Cannot read properties of null (reading 'useContext')") ||
    text.includes("ErrorBoundary")
  );
}

export async function gotoAndWait(page: Page, pagePath = "/", options: GotoAndWaitOptions = {}) {
  const timeout = options.timeout ?? 20_000;
  const debugLabel = options.debugLabel ?? pagePath;
  const maxRetries = Math.max(0, options.maxRetries ?? 1);

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await page.goto(pagePath, { waitUntil: "domcontentloaded", timeout });

      if (response && response.status() >= 500) {
        const responseBody = await response.text().catch(() => "<unable to read response body>");
        const diagnostics = await writeDiagnostics(
          page,
          debugLabel,
          `navigation status ${response.status()} for ${pagePath}`,
          options.testInfo,
          options.sectionSelector
        );
        const retryable = isRetryable500Signal(`${response.status()} ${responseBody}`);
        if (retryable && attempt < maxRetries) {
          await page.waitForTimeout(750);
          continue;
        }
        throw new Error(
          `${pagePath} returned ${response.status()}. Check server logs for TypeError stack. Screenshot saved to ${diagnostics.screenshotPath}. Response snippet: ${responseBody.slice(
            0,
            500
          )}`
        );
      }

      const earlyServerError = await detectServerErrorSignal(page);
      if (earlyServerError) {
        const diagnostics = await writeDiagnostics(
          page,
          debugLabel,
          `pre-ready server error: ${earlyServerError.reason}`,
          options.testInfo,
          options.sectionSelector
        );
        const retryable = isRetryable500Signal(
          `${earlyServerError.reason} ${earlyServerError.snippet ?? ""}`
        );
        if (retryable && attempt < maxRetries) {
          await page.waitForTimeout(750);
          continue;
        }
        throw new Error(
          `${pagePath} appears to be a server error page before app-ready. ${earlyServerError.reason}. Check server logs for TypeError stack. Screenshot saved to ${diagnostics.screenshotPath}.`
        );
      }

      await waitForAppReady(page, { timeout });

      const lateServerError = await detectServerErrorSignal(page);
      if (lateServerError) {
        const diagnostics = await writeDiagnostics(
          page,
          debugLabel,
          `post-ready server error: ${lateServerError.reason}`,
          options.testInfo,
          options.sectionSelector
        );
        const retryable = isRetryable500Signal(
          `${lateServerError.reason} ${lateServerError.snippet ?? ""}`
        );
        if (retryable && attempt < maxRetries) {
          await page.waitForTimeout(750);
          continue;
        }
        throw new Error(
          `${pagePath} resolved to a server error page. ${lateServerError.reason}. Check server logs for TypeError stack. Screenshot saved to ${diagnostics.screenshotPath}.`
        );
      }

      return;
    } catch (err) {
      lastError = err;
      await writeDiagnostics(
        page,
        debugLabel,
        `gotoAndWait failed: ${err instanceof Error ? err.message : String(err)}`,
        options.testInfo,
        options.sectionSelector
      );

      const retryable = isRetryable500Signal(
        err instanceof Error ? err.message : String(err)
      );
      if (retryable && attempt < maxRetries) {
        await page.waitForTimeout(750);
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`gotoAndWait failed for ${pagePath} with unknown error`);
}
