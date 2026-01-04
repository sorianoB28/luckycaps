"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/store/cart";
import { useT } from "@/components/providers/LanguageProvider";

export default function CartPage() {
  const t = useT();
  const { items, setQuantity, removeItem } = useCart();
  const entries = Object.entries(items);

  const subtotalCents = entries.reduce(
    (sum, [, item]) => sum + item.priceCents * item.quantity,
    0
  );

  if (entries.length === 0) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center md:px-8">
        <ShoppingBag className="h-12 w-12 text-lucky-green" />
        <h1 className="mt-4 font-display text-4xl">{t("cart.emptyPageTitle")}</h1>
        <p className="mt-2 text-white/70">
          {t("cart.emptyPageCopy")}
        </p>
        <Button className="mt-6" asChild>
          <Link href="/shop">{t("cart.browseCollection")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-8">
      <h1 className="font-display text-4xl">{t("cart.title")}</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          {entries.map(([key, item]) => (
            <div
              key={key}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row"
            >
              <div className="relative h-28 w-28 overflow-hidden rounded-xl bg-white/5">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                    {t("cart.noImage")}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-white/50">
                  {item.variant || t("cart.variantFallback")} / {item.size || t("cart.sizeFallback")}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity(key, Math.max(1, item.quantity - 1))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white"
                      aria-label={t("product.decreaseQuantityAria")}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[24px] text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(key, item.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white"
                      aria-label={t("product.increaseQuantityAria")}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(key)}
                    aria-label={t("cart.removeItemAria")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-lg font-semibold">
                ${(item.priceCents / 100).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        <div className="h-fit rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-2xl">{t("cart.orderSummary")}</h2>
          <Separator className="my-4" />
          <div className="space-y-3 text-sm text-white/70">
            <div className="flex items-center justify-between">
              <span>{t("common.subtotal")}</span>
              <span className="font-semibold text-white">
                ${(subtotalCents / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t("cart.shipping")}</span>
              <span>{t("cart.calculatedAtCheckout")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t("cart.tax")}</span>
              <span>{t("cart.calculatedAtCheckout")}</span>
            </div>
          </div>
          <Button className="mt-6 w-full">{t("cart.checkout")}</Button>
          <Button variant="outline" className="mt-3 w-full" asChild>
            <Link href="/shop">{t("cart.continueShopping")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
