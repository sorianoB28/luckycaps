"use client";

import { useT } from "@/components/providers/LanguageProvider";
import { buildCloudinaryCardUrl } from "@/lib/cloudinaryUrl";

type Order = {
  id: string;
  status: string;
  email: string;
  delivery_option: string | null;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  contact: { email?: string; phone?: string | null; notes?: string | null } | null;
  shipping_address: {
    firstName?: string;
    lastName?: string;
    address1?: string;
    address2?: string | null;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  shipment?: {
    status?: string | null;
    tracking_number?: string | null;
    tracking_url?: string | null;
  } | null;
};

type OrderItem = {
  name: string;
  image_url: string | null;
  quantity: number;
  price_cents: number;
  size: string | null;
};

export default function OrderPageClient({
  order,
  items,
  successNotice,
}: {
  order: Order;
  items: OrderItem[];
  successNotice: boolean;
}) {
  const t = useT();
  const shipping = order.shipping_address;
  const contact = order.contact;
  const shipment = order.shipment;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-8">
      <p className="text-sm uppercase tracking-[0.2em] text-white/50">{t("order.kicker")}</p>
      <h1 className="mt-2 font-display text-4xl text-white">{t("order.title", { id: order.id })}</h1>
      <p className="mt-1 text-white/60">{t("order.statusValue", { status: order.status })}</p>
      {successNotice ? (
        <div className="mt-3 rounded-xl border border-lucky-green/30 bg-lucky-green/10 px-4 py-3 text-sm text-lucky-green">
          {t("order.paymentReceived")}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-semibold text-white">{t("common.items")}</h2>
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
                      {t("cart.noImage")}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-sm text-white/80">
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-white/60">
                    {t("order.sizeValue", { size: item.size ?? t("cart.sizeFallback") })}
                  </p>
                  <p className="text-white/60">{t("order.qtyValue", { qty: item.quantity })}</p>
                </div>
                <p className="text-sm font-semibold text-white">
                  ${((item.price_cents * item.quantity) / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
            <h2 className="font-semibold">{t("cart.shipping")}</h2>
            <p className="text-sm text-white/70">
              {shipping?.firstName} {shipping?.lastName}
            </p>
            <p className="text-sm text-white/70">{shipping?.address1}</p>
            {shipping?.address2 ? <p className="text-sm text-white/70">{shipping.address2}</p> : null}
            <p className="text-sm text-white/70">
              {shipping?.city}, {shipping?.state} {shipping?.zip}
            </p>
            <p className="text-sm text-white/70">{shipping?.country}</p>
            <p className="mt-2 text-sm text-white/60">
              {t("order.deliveryValue", { delivery: order.delivery_option ?? t("order.na") })}
            </p>
            {shipment?.tracking_number || shipment?.tracking_url ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/70">
                {shipment.tracking_number ? (
                  <p>
                    {t("common.tracking")}: {shipment.tracking_number}
                  </p>
                ) : null}
                {shipment.tracking_url ? (
                  <a
                    href={shipment.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-lucky-green hover:text-lucky-green/80"
                  >
                    {t("common.view")}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
            <h2 className="font-semibold">{t("checkout.contactTitle")}</h2>
            <p className="text-sm text-white/70">{order.email}</p>
            {contact?.phone ? <p className="text-sm text-white/70">{contact.phone}</p> : null}
            {contact?.notes ? (
              <p className="mt-2 text-sm text-white/70 whitespace-pre-line">{contact.notes}</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
            <h2 className="font-semibold">{t("order.totalsTitle")}</h2>
            <div className="mt-2 flex items-center justify-between text-sm text-white/70">
              <span>{t("common.subtotal")}</span>
              <span className="font-semibold text-white">${(order.subtotal_cents / 100).toFixed(2)}</span>
            </div>
            {order.discount_cents > 0 ? (
              <div className="flex items-center justify-between text-sm text-white/70">
                <span>{t("common.discount")}</span>
                <span className="font-semibold text-lucky-green">
                  -${(order.discount_cents / 100).toFixed(2)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>{t("cart.shipping")}</span>
              <span>${(order.shipping_cents / 100).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>{t("cart.tax")}</span>
              <span>${(order.tax_cents / 100).toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm font-semibold text-white">
              <span>{t("common.total")}</span>
              <span>${(order.total_cents / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
