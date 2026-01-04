"use client";

import { useState } from "react";
import { Heart, ShieldCheck, Truck, Undo2 } from "lucide-react";

import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/LanguageProvider";

interface ProductPurchasePanelProps {
  product: Product;
}

export default function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const [variant, setVariant] = useState(product.variants[0] ?? "");
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart((state) => state.addItem);
  const t = useT();
  const requiresSize = product.sizes.length > 0;
  const requiresVariant = product.variants.length > 0;
  const addDisabled = (requiresSize && !size) || (requiresVariant && !variant);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-white/50">
          {product.category}
        </p>
        <h1 className="mt-2 font-display text-4xl">{product.name}</h1>
        <p className="mt-2 text-lg text-white/80">${product.price}</p>
        <p className="mt-4 text-white/60">{product.description}</p>
      </div>

      {product.variants.length ? (
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            {t("product.variant")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.variants.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setVariant(option)}
                className={cn(
                  "rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-lucky-green",
                  variant === option && "border-lucky-green bg-lucky-green/10 text-white"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {product.sizes.length ? (
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            {t("product.size")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.sizes.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSize(option)}
                className={cn(
                  "rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-lucky-green",
                  size === option && "border-lucky-green bg-lucky-green/10 text-white"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
          <button
            type="button"
            onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
            className="h-8 w-8 rounded-full bg-white/10 text-white"
            aria-label={t("product.decreaseQuantityAria")}
          >
            -
          </button>
          <span className="min-w-[24px] text-center text-sm font-semibold">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((prev) => prev + 1)}
            className="h-8 w-8 rounded-full bg-white/10 text-white"
            aria-label={t("product.increaseQuantityAria")}
          >
            +
          </button>
        </div>
        <Button
          className="flex-1"
          onClick={() =>
            addItem({
              productId: product.id,
              productSlug: product.slug,
              name: product.name,
              imageUrl: product.images?.[0],
              priceCents: Math.round(
                (product.isSale && product.salePrice ? product.salePrice : product.price) * 100
              ),
              variant: variant || null,
              size: size || null,
              quantity,
            })
          }
          disabled={addDisabled}
        >
          {t("product.addToCart")}
        </Button>
        <Button variant="outline" size="icon" aria-label={t("product.addToWishlistAria")}>
          <Heart className="h-5 w-5" />
        </Button>
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          {t("product.features")}
        </p>
        <ul className="mt-3 space-y-2 text-sm text-white/60">
          {product.features.map((feature) => (
            <li key={feature}>- {feature}</li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        <div className="flex items-center gap-3">
          <Truck className="h-4 w-4 text-lucky-green" /> {t("product.fastShipping")}
        </div>
        <div className="flex items-center gap-3">
          <Undo2 className="h-4 w-4 text-lucky-green" /> {t("product.returns")}
        </div>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-4 w-4 text-lucky-green" /> {t("product.secureCheckout")}
        </div>
      </div>
    </div>
  );
}
