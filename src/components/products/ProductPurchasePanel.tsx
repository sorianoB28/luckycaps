"use client";

import { useState } from "react";
import { Heart, ShieldCheck, Truck, Undo2 } from "lucide-react";

import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cartStore";
import { cn } from "@/lib/utils";

interface ProductPurchasePanelProps {
  product: Product;
}

export default function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const [variant, setVariant] = useState(product.variants[0]);
  const [size, setSize] = useState(product.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

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

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          Variant
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

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          Size
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

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
          <button
            type="button"
            onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
            className="h-8 w-8 rounded-full bg-white/10 text-white"
            aria-label="Decrease quantity"
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
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <Button
          className="flex-1"
          onClick={() =>
            Array.from({ length: quantity }).forEach(() =>
              addItem(product, { variant, size })
            )
          }
        >
          Add to Cart
        </Button>
        <Button variant="outline" size="icon" aria-label="Add to wishlist">
          <Heart className="h-5 w-5" />
        </Button>
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          Features
        </p>
        <ul className="mt-3 space-y-2 text-sm text-white/60">
          {product.features.map((feature) => (
            <li key={feature}>• {feature}</li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        <div className="flex items-center gap-3">
          <Truck className="h-4 w-4 text-lucky-green" /> Fast Shipping
        </div>
        <div className="flex items-center gap-3">
          <Undo2 className="h-4 w-4 text-lucky-green" /> 30 Day Returns
        </div>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-4 w-4 text-lucky-green" /> Secure Checkout
        </div>
      </div>
    </div>
  );
}
