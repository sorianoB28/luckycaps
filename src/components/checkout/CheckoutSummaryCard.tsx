"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/components/providers/LanguageProvider";
import { buildCloudinaryCardUrl } from "@/lib/cloudinaryUrl";

export type CheckoutSummaryQuote = {
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  items: Array<{
    product_id: string;
    product_slug: string;
    name: string;
    image_url: string | null;
    price_cents: number;
    quantity: number;
    variant: string | null;
    size: string | null;
  }>;
};

export type CheckoutSummaryFallbackItem = {
  key: string;
  name: string;
  imageUrl?: string | null;
  variant?: string | null;
  size?: string | null;
  quantity: number;
};

type CheckoutSummaryCardProps = {
  quote: CheckoutSummaryQuote | null;
  fallbackItems: CheckoutSummaryFallbackItem[];
  promo: string;
  onPromoChange: (value: string) => void;
  promoApplying: boolean;
  appliedPromo: { promo_code_id: string; normalized_code: string } | null;
  promoError: string | null;
  quoteError: string | null;
  onApplyPromo: () => void;
  onRemovePromo: () => void;
  onRetryQuote: () => void;
};

export function CheckoutSummaryCard({
  quote,
  fallbackItems,
  promo,
  onPromoChange,
  promoApplying,
  appliedPromo,
  promoError,
  quoteError,
  onApplyPromo,
  onRemovePromo,
  onRetryQuote,
}: CheckoutSummaryCardProps) {
  const t = useT();

  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader>
        <CardTitle>{t("checkout.orderSummary")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {quote?.items?.length
            ? quote.items.map((item, idx) => (
                <div
                  key={`${item.product_id}-${item.size ?? "na"}-${idx}`}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/40 p-3"
                  data-testid="checkout-line-item"
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
                  <div className="flex-1 text-sm">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-white/60">
                      {(item.variant || t("cart.variantFallback"))} /{" "}
                      {(item.size || t("cart.sizeFallback"))}
                    </p>
                    <p className="mt-1 text-white/70">
                      {item.quantity} x ${(item.price_cents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            : fallbackItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/40 p-3"
                  data-testid="checkout-line-item"
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-white/5">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-white/50">
                        {t("cart.noImage")}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-white/60">
                      {(item.variant || t("cart.variantFallback"))} /{" "}
                      {(item.size || t("cart.sizeFallback"))}
                    </p>
                    <p className="mt-1 text-white/70">
                      {item.quantity} x {t("common.loading")}
                    </p>
                  </div>
                </div>
              ))}
        </div>
        <Separator className="border-white/10" />
        <div className="space-y-2 text-sm text-white/80">
          <div className="flex items-center justify-between">
            <span>{t("common.subtotal")}</span>
            <span data-testid="checkout-summary-subtotal-value">
              <span data-testid="checkout-subtotal-value">
                {quote ? `$${(quote.subtotal_cents / 100).toFixed(2)}` : t("common.loading")}
              </span>
            </span>
          </div>
          {quote && quote.discount_cents > 0 ? (
            <div
              className="flex items-center justify-between"
              data-testid="checkout-summary-discount-row"
            >
              <span>{t("common.discount")}</span>
              <span className="text-lucky-green" data-testid="checkout-summary-discount-value">
                <span data-testid="checkout-discount-value">
                  -${(quote.discount_cents / 100).toFixed(2)}
                </span>
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span>{t("cart.shipping")}</span>
            <span data-testid="checkout-summary-shipping-value">
              <span data-testid="checkout-shipping-value">
                {quote
                  ? quote.shipping_cents === 0
                    ? t("checkout.free")
                    : `$${(quote.shipping_cents / 100).toFixed(2)}`
                  : t("common.loading")}
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("cart.tax")}</span>
            <span>{quote ? `$${(quote.tax_cents / 100).toFixed(2)}` : t("common.loading")}</span>
          </div>
        </div>
        <Separator className="border-white/10" />
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>{t("common.total")}</span>
          <span data-testid="checkout-summary-total-value">
            <span data-testid="checkout-total-value">
              {quote ? `$${(quote.total_cents / 100).toFixed(2)}` : t("common.loading")}
            </span>
          </span>
        </div>
        <Separator className="border-white/10" />
        <div className="space-y-2">
          <Label>{t("checkout.promoCode")}</Label>
          <div className="flex gap-2">
            <Input
              data-testid="checkout-promo-input"
              value={promo}
              onChange={(e) => onPromoChange(e.target.value)}
              placeholder={t("checkout.couponPlaceholder")}
              disabled={Boolean(appliedPromo)}
              className="bg-white/5 text-white"
            />
            {appliedPromo ? (
              <Button
                data-testid="checkout-promo-remove"
                variant="secondary"
                className="bg-white/10"
                type="button"
                onClick={onRemovePromo}
              >
                {t("checkout.promoRemove")}
              </Button>
            ) : (
              <Button
                data-testid="checkout-promo-apply"
                variant="secondary"
                className="bg-white/10"
                type="button"
                disabled={promoApplying}
                onClick={onApplyPromo}
              >
                {promoApplying ? t("common.loading") : t("checkout.apply")}
              </Button>
            )}
          </div>
          {promoError || appliedPromo ? (
            <p
              className={promoError ? "text-xs text-red-300" : "text-xs text-white/60"}
              data-testid="checkout-promo-status"
            >
              {promoError ? (
                promoError
              ) : (
                <span data-testid="checkout-promo-applied">
                  {t("checkout.promoApplied")}: {appliedPromo?.normalized_code}
                </span>
              )}
            </p>
          ) : null}
          {quoteError ? (
            <div
              className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3"
              data-testid="checkout-quote-error"
            >
              <p className="text-xs text-red-300" data-testid="checkout-quote-error-text">
                {quoteError}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="bg-white/10"
                onClick={onRetryQuote}
                data-testid="checkout-quote-retry"
              >
                {t("checkout.retryQuote")}
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
