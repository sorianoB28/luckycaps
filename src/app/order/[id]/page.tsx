import { notFound } from "next/navigation";

import sql from "@/lib/db";
import OrderPageClient from "./OrderPageClient";

type OrderRow = {
  id: string;
  status: string;
  email: string;
  contact: Record<string, unknown> | null;
  shipping_address: Record<string, unknown> | null;
  delivery_option: string | null;
  promo_code: string | null;
  subtotal_cents: number;
  discount_cents: number;
  created_at: string;
};

type OrderItemRow = {
  name: string;
  image_url: string | null;
  quantity: number;
  price_cents: number;
  size: string | null;
};

type ShipmentRow = {
  status: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
};

async function getOrder(id: string) {
  const rows = (await sql`
    SELECT
      id,
      status,
      email,
      contact,
      shipping_address,
      delivery_option,
      promo_code,
      subtotal_cents,
      COALESCE(discount_cents, 0)::int AS discount_cents,
      created_at
    FROM public.orders
    WHERE id = ${id}::uuid
    LIMIT 1
  `) as OrderRow[];

  const order = rows[0];
  if (!order) return null;

  const items = (await sql`
    SELECT
      name,
      image_url,
      quantity,
      price_cents,
      size
    FROM public.order_items
    WHERE order_id = ${id}::uuid
  `) as OrderItemRow[];

  const shipmentRows = (await sql`
    SELECT status, tracking_number, tracking_url
    FROM public.shipments
    WHERE order_id = ${id}::uuid
    LIMIT 1
  `) as ShipmentRow[];

  return { order, items, shipment: shipmentRows[0] ?? null };
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const data = await getOrder(params.id);
  if (!data) return notFound();

  const { order, items, shipment } = data;
  const contact = order.contact as { email?: string; phone?: string | null; notes?: string | null } | null;
  const shipping = order.shipping_address as {
    firstName?: string;
    lastName?: string;
    address1?: string;
    address2?: string | null;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;

  const successNotice =
    (typeof searchParams?.success === "string" && searchParams?.success === "1") ||
    (Array.isArray(searchParams?.success) && searchParams?.success.includes("1"));

  const shippingCents = order.delivery_option === "express" ? 1200 : 0;
  const totalCents = Math.max(0, order.subtotal_cents + shippingCents - order.discount_cents);

  return (
    <OrderPageClient
      order={{
        ...order,
        contact,
        shipping_address: shipping,
        shipping_cents: shippingCents,
        tax_cents: 0,
        total_cents: totalCents,
        shipment,
      }}
      items={items}
      successNotice={successNotice}
    />
  );
}
