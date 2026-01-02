import { NextResponse } from "next/server";

import sql from "@/lib/db";

type CheckoutItem = {
  product_id?: string | null;
  product_slug: string;
  name: string;
  image_url?: string | null;
  variant?: string | null;
  size?: string | null;
  quantity: number;
  unit_price_cents: number;
};

type CheckoutBody = {
  customer: { name: string; email: string; phone?: string | null };
  contact_notes?: string | null;
  notes?: string | null;
  shipping_address: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string | null;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  delivery_option?: string | null;
  promo_code?: string | null;
  items: CheckoutItem[];
};

const isPositiveInt = (value: unknown) =>
  Number.isInteger(value) && (value as number) > 0;

const isNonNegativeInt = (value: unknown) =>
  Number.isInteger(value) && (value as number) >= 0;

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value
  );

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validateBody(
  body: unknown
): { ok: true; data: CheckoutBody & { subtotal_cents: number } } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Invalid payload" };
  }

  const input = body as Partial<CheckoutBody>;

  const customer = input.customer;
  const items = input.items;
  const shippingAddress = input.shipping_address;
  const deliveryOption = input.delivery_option;
  const promoCode = input.promo_code;
  const contactNotesRaw = (input as { contact_notes?: unknown }).contact_notes;
  const legacyNotesRaw = (input as { notes?: unknown }).notes;

  if (!customer || typeof customer !== "object") {
    return { ok: false, message: "Customer is required" };
  }

  const name = customer.name?.trim();
  const email = customer.email?.trim();
  const phone = customer.phone?.trim() ?? null;

  if (!name) return { ok: false, message: "Customer name is required" };
  if (!email || !emailRegex.test(email)) {
    return { ok: false, message: "A valid customer email is required" };
  }

  if (!shippingAddress || typeof shippingAddress !== "object") {
    return { ok: false, message: "Shipping address is required" };
  }

  const requiredShipping = [
    shippingAddress.firstName?.trim?.(),
    shippingAddress.lastName?.trim?.(),
    shippingAddress.address1?.trim?.(),
    shippingAddress.city?.trim?.(),
    shippingAddress.state?.trim?.(),
    shippingAddress.zip?.trim?.(),
    shippingAddress.country?.trim?.(),
  ];

  if (requiredShipping.some((field) => !field)) {
    return { ok: false, message: "All shipping address fields are required" };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, message: "At least one item is required" };
  }

  const sanitizedItems: CheckoutItem[] = [];

  for (const item of items) {
    const productIdRaw = item?.product_id?.trim?.();
    const productId = productIdRaw && isUuid(productIdRaw) ? productIdRaw : null;
    const productSlug = item?.product_slug?.trim?.();
    const nameRaw = item?.name?.trim?.();
    const imageUrl = item?.image_url?.trim?.() ?? null;
    const variant = item?.variant?.trim?.() ?? null;
    const size = item?.size?.trim?.() ?? null;
    const { quantity, unit_price_cents: unitPriceCents } = item ?? {};

    if (!productSlug) {
      return { ok: false, message: "Each item requires a product_slug" };
    }
    if (!nameRaw) {
      return { ok: false, message: "Each item requires a name" };
    }

    if (!isPositiveInt(quantity)) {
      return { ok: false, message: "Quantity must be a positive integer" };
    }

    if (!isNonNegativeInt(unitPriceCents)) {
      return {
        ok: false,
        message: "unit_price_cents must be a non-negative integer",
      };
    }

    sanitizedItems.push({
      product_id: productId,
      product_slug: productSlug,
      name: nameRaw,
      image_url: imageUrl,
      variant,
      size,
      quantity,
      unit_price_cents: unitPriceCents,
    });
  }

  const subtotal = sanitizedItems.reduce(
    (sum, item) => sum + item.unit_price_cents * item.quantity,
    0
  );

  const contactNotes =
    typeof contactNotesRaw === "string" ? contactNotesRaw : null;
  const legacyNotes =
    typeof legacyNotesRaw === "string" ? legacyNotesRaw : null;

  let combinedNotes = contactNotes ?? legacyNotes ?? null;
  if (combinedNotes && typeof combinedNotes !== "string") {
    return { ok: false, message: "notes must be a string" };
  }
  combinedNotes =
    typeof combinedNotes === "string" && combinedNotes.trim().length > 0
      ? combinedNotes.trim()
      : null;
  if (combinedNotes && combinedNotes.length > 2000) {
    return { ok: false, message: "notes is too long (max 2000 characters)" };
  }

  return {
    ok: true,
    data: {
      customer: { name, email, phone },
      contact_notes: combinedNotes,
      shipping_address: {
        firstName: shippingAddress.firstName.trim(),
        lastName: shippingAddress.lastName.trim(),
        address1: shippingAddress.address1.trim(),
        address2: shippingAddress.address2?.trim?.() ?? null,
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        zip: shippingAddress.zip.trim(),
        country: shippingAddress.country.trim(),
      },
      delivery_option: deliveryOption?.trim?.() ?? null,
      promo_code: promoCode?.trim?.() ?? null,
      items: sanitizedItems,
      subtotal_cents: subtotal,
    },
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = validateBody(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  const {
    customer,
    items,
    shipping_address: shippingAddress,
    delivery_option: deliveryOption,
    promo_code: promoCode,
    subtotal_cents: subtotalCents,
    contact_notes: contactNotes,
  } = result.data;

  try {
    const itemsJson = JSON.stringify(items);
    const contactJson = JSON.stringify({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      notes: contactNotes ?? null,
    });
    const shippingJson = JSON.stringify(shippingAddress);

    const rows = (await sql`
      WITH new_order AS (
        INSERT INTO public.orders (
          email,
          status,
          contact,
          shipping_address,
          delivery_option,
          promo_code,
          subtotal_cents
        )
        VALUES (
          ${customer.email},
          'pending',
          ${contactJson}::jsonb,
          ${shippingJson}::jsonb,
          ${deliveryOption},
          ${promoCode},
          ${subtotalCents}
        )
        RETURNING id
      ),
      inserted_items AS (
        INSERT INTO public.order_items (
          order_id,
          product_id,
          product_slug,
          name,
          image_url,
          price_cents,
          variant,
          size,
          quantity
        )
        SELECT
          (SELECT id FROM new_order),
          items.product_id,
          items.product_slug,
          items.name,
          items.image_url,
          items.unit_price_cents,
          items.variant,
          items.size,
          items.quantity
        FROM jsonb_to_recordset(${itemsJson}::jsonb) AS items(
          product_id uuid,
          product_slug text,
          name text,
          image_url text,
          unit_price_cents int,
          variant text,
          size text,
          quantity int
        )
        RETURNING order_id
      )
      SELECT id AS order_id FROM new_order
    `) as Array<{ order_id: string }>;

    const orderId = rows[0]?.order_id;
    if (!orderId) {
      throw new Error("Order insertion failed");
    }

    return NextResponse.json({ orderId });
  } catch (error) {
    console.error("Checkout error", error);
    return NextResponse.json(
      { error: "Unable to process order" },
      { status: 500 }
    );
  }
}
