import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";

import type { Page, TestInfo } from "@playwright/test";

type CaptureDiagnosticsOptions = {
  label: string;
  reason?: string;
  sectionSelector?: string;
  testInfo?: TestInfo;
};

export type SectionDiagnosticsCapture = {
  textPath: string;
  screenshotPath: string;
  payload: string;
};

const DEFAULT_SECTION_SELECTOR = "main, [role='main'], [data-testid], header, footer";

function makeSafeName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "diag";
}

export async function captureSectionDiagnostics(
  page: Page,
  options: CaptureDiagnosticsOptions
): Promise<SectionDiagnosticsCapture> {
  const stamp = Date.now();
  const outDir = "test-results";
  const base = `${makeSafeName(options.label)}-${stamp}`;
  const textPath = path.join(outDir, `${base}.txt`);
  const screenshotPath = path.join(outDir, `${base}.png`);

  await mkdir(outDir, { recursive: true });

  const sectionData = await page
    .evaluate((rawSelector) => {
      const selectors = rawSelector
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      const isVisible = (el: Element) => {
        const style = window.getComputedStyle(el);
        if (!style || style.display === "none" || style.visibility === "hidden") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      let selectedElement: Element | null = null;
      let selectedSelector = "body";
      for (const selector of selectors) {
        const candidate = document.querySelector(selector);
        if (candidate && isVisible(candidate)) {
          selectedElement = candidate;
          selectedSelector = selector;
          break;
        }
      }

      const node = selectedElement ?? document.body;
      const html = (node as HTMLElement).outerHTML || "";
      const text = (node.textContent || "").replace(/\s+/g, " ").trim();

      return {
        selector: selectedSelector,
        html: html.slice(0, 80_000),
        text: text.slice(0, 4_000),
      };
    }, options.sectionSelector ?? DEFAULT_SECTION_SELECTOR)
    .catch(() => ({
      selector: "<unavailable>",
      html: "<unable to capture section html>",
      text: "<unable to capture section text>",
    }));

  const payload = [
    `label: ${options.label}`,
    `reason: ${options.reason ?? "n/a"}`,
    `url: ${page.url()}`,
    `selector: ${sectionData.selector}`,
    "",
    "text:",
    sectionData.text,
    "",
    "html:",
    sectionData.html,
  ].join("\n");

  await writeFile(textPath, payload, "utf8").catch(() => {});
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

  // eslint-disable-next-line no-console
  console.error(`[diag] ${options.label} url=${page.url()}`);
  // eslint-disable-next-line no-console
  console.error(`[diag] section dump: ${textPath}`);
  // eslint-disable-next-line no-console
  console.error(`[diag] screenshot: ${screenshotPath}`);

  if (options.testInfo) {
    await options.testInfo.attach(`${options.label}-url`, {
      body: Buffer.from(page.url(), "utf8"),
      contentType: "text/plain",
    });
    await options.testInfo.attach(`${options.label}-section`, {
      body: Buffer.from(payload, "utf8"),
      contentType: "text/plain",
    });
    await options.testInfo.attach(`${options.label}-screenshot-path`, {
      body: Buffer.from(screenshotPath, "utf8"),
      contentType: "text/plain",
    });
  }

  return {
    textPath,
    screenshotPath,
    payload,
  };
}
