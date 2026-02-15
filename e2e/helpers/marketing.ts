import { expect, type Locator, type Page } from "@playwright/test";

import { captureSectionDiagnostics } from "./diagnostics";
import { gotoAndWait } from "./navigation";

const UI_TIMEOUT = 20_000;
const NETWORK_TIMEOUT = 15_000;
const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type DevSubscriberPayload = {
  ok?: boolean;
  error?: string;
  exists?: boolean;
  count?: number;
  email?: string;
  alreadySubscribed?: boolean;
  subscriber?: {
    email: string;
    status: string | null;
    locale: string | null;
    source: string | null;
    user_id?: string | null;
  } | null;
};

type MarketingSubmitState = "success" | "duplicate" | "error";

type MarketingSubmitResult = {
  state: MarketingSubmitState;
  message: string;
  exists: boolean;
  count: number;
};

type SubmitMarketingOptions = {
  ensureHome?: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function parseJsonSafe(responseText: string): Promise<DevSubscriberPayload | null> {
  try {
    return JSON.parse(responseText) as DevSubscriberPayload;
  } catch {
    return null;
  }
}

async function firstVisible(candidates: Locator[], timeout = UI_TIMEOUT) {
  const perCandidate = Math.max(1_500, Math.floor(timeout / Math.max(candidates.length, 1)));
  for (const candidate of candidates) {
    const locator = candidate.first();
    const visible = await locator.isVisible({ timeout: perCandidate }).catch(() => false);
    if (visible) return locator;
  }
  return null;
}

async function dumpMarketingDiagnostics(page: Page, email: string, reason: string) {
  await captureSectionDiagnostics(page, {
    label: `marketing-${email}`,
    reason,
    sectionSelector: '[data-testid="marketing-signup-form"], footer, main',
  });
}

export async function seedOrClearSubscriber(
  page: Page,
  email: string,
  mode: "seed" | "clear" = "clear"
) {
  const normalized = normalizeEmail(email);
  if (!emailRegex.test(normalized)) {
    throw new Error(`Invalid marketing subscriber email: "${email}"`);
  }

  if (mode === "seed") {
    const response = await page.request.post("/api/dev/marketing-subscriber", {
      data: {
        email: normalized,
        locale: "en",
        source: "e2e_marketing",
      },
    });
    const text = await response.text();
    const body = await parseJsonSafe(text);
    if (!response.ok() || !body?.ok) {
      throw new Error(
        `Unable to seed marketing subscriber ${normalized}. Status ${response.status()}. Response: ${text}`
      );
    }
    return body;
  }

  const response = await page.request.delete(
    `/api/dev/marketing-subscriber?email=${encodeURIComponent(normalized)}`
  );
  const text = await response.text();
  const body = await parseJsonSafe(text);
  if (!response.ok() || !body?.ok) {
    throw new Error(
      `Unable to clear marketing subscriber ${normalized}. Status ${response.status()}. Response: ${text}`
    );
  }
  return body;
}

export async function getMarketingSubscriber(page: Page, email: string) {
  const normalized = normalizeEmail(email);
  if (!emailRegex.test(normalized)) {
    throw new Error(`Invalid marketing subscriber email: "${email}"`);
  }

  const response = await page.request.get(
    `/api/dev/marketing-subscriber?email=${encodeURIComponent(normalized)}`
  );
  const text = await response.text();
  const body = await parseJsonSafe(text);
  if (!response.ok() || !body?.ok) {
    throw new Error(
      `Unable to fetch marketing subscriber ${normalized}. Status ${response.status()}. Response: ${text}`
    );
  }
  return body;
}

export async function submitMarketingSignup(
  page: Page,
  email: string,
  options: SubmitMarketingOptions = {}
): Promise<MarketingSubmitResult> {
  const normalized = normalizeEmail(email);
  if (!emailRegex.test(normalized)) {
    throw new Error(`Invalid marketing signup email: "${email}"`);
  }

  if (options.ensureHome) {
    await gotoAndWait(page, "/", {
      timeout: 30_000,
      debugLabel: "marketing-signup-home",
    });
  }

  const input = await firstVisible([
    page.getByTestId("marketing-email-input"),
    page.getByTestId("marketing-signup-input"),
  ]);
  const consent = await firstVisible([
    page.getByTestId("marketing-consent"),
    page.getByTestId("marketing-signup-consent"),
  ]);
  const submit = await firstVisible([
    page.getByTestId("marketing-submit"),
    page.getByTestId("marketing-signup-submit"),
  ]);
  const status = await firstVisible([
    page.getByTestId("marketing-status"),
    page.getByTestId("marketing-signup-status"),
  ]);

  if (!input || !consent || !submit) {
    await dumpMarketingDiagnostics(page, normalized, "missing-marketing-controls");
    throw new Error("Unable to locate marketing signup controls.");
  }

  const before = await getMarketingSubscriber(page, normalized).catch(() => null);

  await input.scrollIntoViewIfNeeded();
  await expect(input).toBeVisible({ timeout: UI_TIMEOUT });
  await input.fill(normalized);
  await expect(input).toHaveValue(normalized, { timeout: 5_000 });
  if (!(await consent.isChecked())) {
    await consent.check();
  }

  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().toLowerCase().includes("marketing"),
    { timeout: NETWORK_TIMEOUT }
  );

  await submit.click();

  const response = await responsePromise.catch(async () => {
    await dumpMarketingDiagnostics(page, normalized, "Marketing subscribe network response not observed");
    throw new Error("Marketing subscribe network response not observed");
  });

  const responseText = await response.text();
  const responseJson = await parseJsonSafe(responseText);
  if (!response.ok()) {
    await dumpMarketingDiagnostics(
      page,
      normalized,
      `marketing response non-2xx: status=${response.status()} body=${responseText}`
    );
    throw new Error(
      `Marketing subscribe failed (${response.status()}). Response: ${responseText || "<empty>"}`
    );
  }

  let uiMessage = "";
  let uiState = "";
  if (status) {
    const statusVisible = await status.isVisible({ timeout: 4_000 }).catch(() => false);
    if (statusVisible) {
      uiMessage = ((await status.textContent()) ?? "").trim();
      uiState = ((await status.getAttribute("data-state")) ?? "").trim();
    }
  }

  const after = await getMarketingSubscriber(page, normalized);
  if (!after.exists || (after.count ?? 0) < 1) {
    await dumpMarketingDiagnostics(page, normalized, "marketing subscriber not found after submit");
    throw new Error(
      `Marketing signup did not persist subscriber for ${normalized}. exists=${String(
        after.exists
      )} count=${String(after.count)}`
    );
  }

  const duplicateFromApi = Boolean(responseJson?.alreadySubscribed);
  const duplicateFromDb = Boolean(before?.exists);
  const finalState =
    uiState === "error"
      ? ("error" as const)
      : uiState === "duplicate" || duplicateFromApi || duplicateFromDb
        ? ("duplicate" as const)
        : ("success" as const);
  const finalMessage = uiMessage || (finalState === "duplicate" ? "already subscribed" : "subscribed");

  if (finalState === "error") {
    await dumpMarketingDiagnostics(page, normalized, `marketing status error: ${finalMessage}`);
    throw new Error(`Marketing signup UI error for ${normalized}: ${finalMessage}`);
  }

  return {
    state: finalState,
    message: finalMessage,
    exists: Boolean(after.exists),
    count: after.count ?? 0,
  };
}
