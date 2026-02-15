import type { Page } from "@playwright/test";

export type SeedPaidOrderForShippingResult = {
  orderId: string;
  shipmentId: string | null;
  rateId: string;
};

export function ensureE2EModeEnabled() {
  if (process.env.E2E_MODE?.toLowerCase() === "true") {
    return;
  }

  throw new Error(
    "E2E_MODE must be set to true for admin shipping label tests to avoid real Shippo calls."
  );
}

export async function seedPaidOrderForShipping(page: Page, params: { productId: string; email: string }) {
  const response = await page.request.post("/api/dev/seed-paid-order-for-shipping", {
    data: {
      productId: params.productId,
      email: params.email,
    },
  });

  const text = await response.text();
  if (!response.ok()) {
    throw new Error(
      `Unable to seed paid order for shipping. Status ${response.status()}. Response: ${text}`
    );
  }

  let body: { ok?: boolean; orderId?: string; shipmentId?: string | null; rateId?: string } | null =
    null;
  try {
    body = JSON.parse(text) as {
      ok?: boolean;
      orderId?: string;
      shipmentId?: string | null;
      rateId?: string;
    };
  } catch {
    body = null;
  }

  if (!body?.ok || !body.orderId || !body.rateId) {
    throw new Error(`Unexpected seed-paid-order-for-shipping response: ${text}`);
  }

  return {
    orderId: body.orderId,
    shipmentId: body.shipmentId ?? null,
    rateId: body.rateId,
  } satisfies SeedPaidOrderForShippingResult;
}
