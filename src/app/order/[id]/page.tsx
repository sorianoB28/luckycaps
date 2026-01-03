import { notFound } from "next/navigation";

import sql from "@/lib/db";
import { buildCloudinaryCardUrl } from "@/lib/cloudinaryUrl";

type OrderRow = {
  id: string;
  status: string;
  email: string;
  contact: Record<string, unknown> | null;
  shipping_address: Record<string, unknown> | null;
  delivery_option: string | null;
  promo_code: string | null;
  subtotal_cents: number;
  created_at: string;
};

type OrderItemRow = {
  name: string;
  image_url: string | null;
  quantity: number;
  price_cents: number;
  size: string | null;
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

  return { order, items };
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

  const { order, items } = data;
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-8">
      <p className="text-sm uppercase tracking-[0.2em] text-white/50">Order</p>
      <h1 className="mt-2 font-display text-4xl text-white">Order {order.id}</h1>
      <p className="mt-1 text-white/60">Status: {order.status}</p>
      {successNotice ? (
        <div className="mt-3 rounded-xl border border-lucky-green/30 bg-lucky-green/10 px-4 py-3 text-sm text-lucky-green">
          Payment received. We&apos;re processing your order.
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-semibold text-white">Items</h2>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={`${item.name}-${idx}`}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3"
              >
                <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-white/5">
                  {item.image_url ? (
                    <img
                      src={buildCloudinaryCardUrl(item.image_url)}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-white/50">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex-1 text-sm text-white/80">
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-white/60">Size: {item.size ?? "One size"}</p>
                  <p className="text-white/60">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-white">
                  ${(item.price_cents * item.quantity / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
            <h2 className="font-semibold">Shipping</h2>
            <p className="text-sm text-white/70">
              {shipping?.firstName} {shipping?.lastName}
            </p>
            <p className="text-sm text-white/70">{shipping?.address1}</p>
            {shipping?.address2 ? (
              <p className="text-sm text-white/70">{shipping.address2}</p>
            ) : null}
            <p className="text-sm text-white/70">
              {shipping?.city}, {shipping?.state} {shipping?.zip}
            </p>
            <p className="text-sm text-white/70">{shipping?.country}</p>
            <p className="mt-2 text-sm text-white/60">Delivery: {order.delivery_option ?? "N/A"}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
            <h2 className="font-semibold">Contact</h2>
            <p className="text-sm text-white/70">{order.email}</p>
            {contact?.phone ? <p className="text-sm text-white/70">{contact.phone}</p> : null}
            {contact?.notes ? (
              <p className="mt-2 text-sm text-white/70 whitespace-pre-line">{contact.notes}</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
            <h2 className="font-semibold">Totals</h2>
            <div className="mt-2 flex items-center justify-between text-sm text-white/70">
              <span>Subtotal</span>
              <span className="font-semibold text-white">
                ${(order.subtotal_cents / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>Shipping</span>
              <span>$0.00</span>
            </div>
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>Tax</span>
              <span>$0.00</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm font-semibold text-white">
              <span>Total</span>
              <span>${(order.subtotal_cents / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
