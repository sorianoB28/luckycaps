import type { Page, TestInfo } from "@playwright/test";

import { gotoAndWait } from "./navigation";
import { RUN_ID, e2eEmail } from "./run";

type SeedCheckoutSuccessOptions = {
  sessionId?: string;
  email?: string;
  productId?: string;
};

type SeedCheckoutSuccessResponse = {
  ok?: boolean;
  sessionId?: string;
  orderId?: string;
  email?: string;
  productId?: string;
};

export type SeededCheckoutSuccessSession = {
  sessionId: string;
  orderId: string;
  email: string;
  productId: string;
};

type VisitCheckoutSuccessOptions = {
  testInfo?: TestInfo;
  debugLabel?: string;
  timeout?: number;
};

export async function seedCheckoutSuccessSession(
  page: Page,
  options: SeedCheckoutSuccessOptions = {}
): Promise<SeededCheckoutSuccessSession> {
  const stamp = Date.now().toString(36);
  const sessionId =
    options.sessionId ?? `cs_test_E2E_SUCCESS_${RUN_ID.replace(/[^a-z0-9]/gi, "_")}_${stamp}`;
  const email = options.email ?? e2eEmail(`checkout-success-${stamp}`);

  const response = await page.request.post("/api/dev/seed-checkout-success-session", {
    data: {
      sessionId,
      email,
      productId: options.productId,
    },
  });

  const raw = await response.text();
  if (!response.ok()) {
    throw new Error(
      `Unable to seed checkout success session. Status ${response.status()}. Response: ${raw}`
    );
  }

  let body: SeedCheckoutSuccessResponse | null = null;
  try {
    body = JSON.parse(raw) as SeedCheckoutSuccessResponse;
  } catch {
    body = null;
  }

  if (!body?.ok || !body.sessionId || !body.orderId || !body.email || !body.productId) {
    throw new Error(`Unexpected seed-checkout-success-session response: ${raw}`);
  }

  return {
    sessionId: body.sessionId,
    orderId: body.orderId,
    email: body.email,
    productId: body.productId,
  };
}

export async function visitCheckoutSuccess(
  page: Page,
  sessionId: string,
  options: VisitCheckoutSuccessOptions = {}
) {
  await gotoAndWait(page, `/checkout/success?session_id=${encodeURIComponent(sessionId)}`, {
    timeout: options.timeout ?? 30_000,
    testInfo: options.testInfo,
    debugLabel: options.debugLabel ?? "checkout-success",
    sectionSelector: "main, [role='main']",
  });
}

