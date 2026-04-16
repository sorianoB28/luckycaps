"use client";

import { useT } from "@/components/providers/LanguageProvider";
import type { AdminOrderDetail } from "@/lib/api";

type OrderTotalsCardProps = {
  order: Pick<
    AdminOrderDetail,
    | "subtotal_cents"
    | "discount_cents"
    | "shipping_cents"
    | "tax_cents"
    | "total_cents"
    | "currency"
    | "promo_code"
    | "status"
  >;
};

const PAID_STATUSES = new Set<AdminOrderDetail["status"]>(["paid", "shipped", "delivered"]);

function formatOrderMoney(cents?: number | null, currency?: string | null) {
  const numeric = Number(cents ?? 0);
  if (!Number.isFinite(numeric)) return null;
  const code = currency ? currency.toUpperCase() : "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(numeric / 100);
  } catch {
    return `$${(numeric / 100).toFixed(2)} ${code}`;
  }
}

export function OrderTotalsCard({ order }: OrderTotalsCardProps) {
  const t = useT();
  const discountCents = order.discount_cents ?? 0;
  const shippingCents = order.shipping_cents ?? 0;
  const taxCents = order.tax_cents ?? 0;
  const totalCents = order.total_cents ?? 0;
  const totalBadge = PAID_STATUSES.has(order.status) ? t("common.paid") : null;
  const discountLabel = order.promo_code
    ? `${t("common.discount")} (${order.promo_code})`
    : t("common.discount");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-semibold">{t("admin.totalsTitle")}</h3>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">{t("common.total")}</p>
          <p className="text-2xl font-semibold text-white">
            {formatOrderMoney(totalCents, order.currency)}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-white/70">
        <div className="flex items-center justify-between">
          <span>{t("common.subtotal")}</span>
          <span className="font-semibold text-white">
            {formatOrderMoney(order.subtotal_cents, order.currency)}
          </span>
        </div>
        {discountCents > 0 ? (
          <div className="flex items-center justify-between">
            <span>{discountLabel}</span>
            <span className="font-semibold text-lucky-green">
              -{formatOrderMoney(discountCents, order.currency)}
            </span>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span>{t("cart.shipping")}</span>
          <span className="font-semibold text-white">
            {formatOrderMoney(shippingCents, order.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>{t("cart.tax")}</span>
          <span className="font-semibold text-white">
            {formatOrderMoney(taxCents, order.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold text-white">
          <div className="flex items-center gap-2">
            <span>{t("common.total")}</span>
            {totalBadge ? (
              <span className="inline-flex rounded-full bg-lucky-green/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-lucky-green">
                {totalBadge}
              </span>
            ) : null}
          </div>
          <span>{formatOrderMoney(totalCents, order.currency)}</span>
        </div>
      </div>
    </div>
  );
}
