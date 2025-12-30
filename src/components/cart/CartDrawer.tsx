"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/store/cart";
import { useUIStore } from "@/store/uiStore";

export default function CartDrawer() {
  const { items, setQuantity, removeItem } = useCart();
  const entries = Object.entries(items);
  const setCartOpen = useUIStore((state) => state.setCartOpen);
  const router = useRouter();
  const totalCents = entries.reduce(
    (sum, [, item]) => sum + item.priceCents * item.quantity,
    0
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <SheetTitle className="font-display text-2xl">Your Cart</SheetTitle>
        <Button variant="ghost" size="icon" onClick={() => setCartOpen(false)}>
          ✕
        </Button>
      </div>
      <Separator className="my-4" />
      <div className="flex-1 space-y-4 overflow-auto pr-2">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 p-6 text-center text-white/60">
            Your cart is empty. Start a new drop.
          </div>
        ) : (
          entries.map(([key, item]) => (
            <div
              key={key}
              className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-white/5">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-white/50">
                    No image
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-white/50">
                  {(item.variant || "Standard")} · {(item.size || "One size")}
                </p>
                <p className="mt-2 text-sm text-white/80">
                  ${(item.priceCents / 100).toFixed(2)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(key, Math.max(1, item.quantity - 1))}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-semibold">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(key, item.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(key)}
                aria-label="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
      <Separator className="my-4" />
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Subtotal</span>
          <span className="font-semibold">${(totalCents / 100).toFixed(2)}</span>
        </div>
        <Button
          className="w-full"
          disabled={entries.length === 0}
          onClick={() => {
            if (entries.length === 0) return;
            setCartOpen(false);
            router.push("/checkout");
          }}
        >
          Checkout
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setCartOpen(false)}
          asChild
        >
          <Link href="/cart">View cart</Link>
        </Button>
      </div>
    </div>
  );
}
