"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/store/cartStore";
import { cn } from "@/lib/utils";

type DeliveryOption = {
  id: string;
  name: string;
  description: string;
  price: number;
  eta: string;
};

const deliveryOptions: DeliveryOption[] = [
  { id: "standard", name: "Standard", description: "Ground service", price: 0, eta: "3-6 business days" },
  { id: "express", name: "Express", description: "Priority air", price: 12, eta: "1-2 business days" },
];

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCartStore();
  const [contact, setContact] = useState({ email: "", phone: "" });
  const [shipping, setShipping] = useState({
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
  });
  const [delivery, setDelivery] = useState<DeliveryOption>(deliveryOptions[0]);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">("card");
  const [cardFields, setCardFields] = useState({ number: "", expiry: "", cvc: "" });
  const [promo, setPromo] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errors, setErrors] = useState<string | null>(null);

  const lineSubtotal = useMemo(() => subtotal(), [subtotal]);
  const shippingCost = delivery.price;
  const tax = Math.round(lineSubtotal * 0.06 * 100) / 100;
  const total = lineSubtotal + shippingCost + tax;

  const requiredFilled =
    contact.email &&
    shipping.firstName &&
    shipping.lastName &&
    shipping.address1 &&
    shipping.city &&
    shipping.state &&
    shipping.zip;

  const handlePlaceOrder = () => {
    if (!requiredFilled || items.length === 0) {
      setErrors("Please complete required fields and add items to your cart.");
      setStatus("error");
      return;
    }
    setErrors(null);
    setStatus("success");
    // Future: send payload to checkout API / Stripe intent here.
    clear();
  };

  if (items.length === 0 && status !== "success") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-2xl font-semibold text-white">Your cart is empty.</p>
        <p className="mt-2 text-white/70">Add products before checking out.</p>
        <Button className="mt-6" asChild>
          <Link href="/shop">Back to shop</Link>
        </Button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Order placed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-white/70">
            <p>Thank you for your order. We&apos;ll email you when it ships.</p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/shop">Back to shop</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin">Go to Admin</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex-1 space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/50">Checkout</p>
            <h1 className="font-display text-4xl text-white">Complete your order</h1>
            <p className="text-white/60">Secure UI flow — payments not enabled yet.</p>
          </div>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  value={contact.email}
                  onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="bg-white/5 text-white"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Phone (optional)</Label>
                <Input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  className="bg-white/5 text-white"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle>Shipping address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input
                  value={shipping.firstName}
                  onChange={(e) => setShipping((prev) => ({ ...prev, firstName: e.target.value }))}
                  className="bg-white/5 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input
                  value={shipping.lastName}
                  onChange={(e) => setShipping((prev) => ({ ...prev, lastName: e.target.value }))}
                  className="bg-white/5 text-white"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address line 1</Label>
                <Input
                  value={shipping.address1}
                  onChange={(e) => setShipping((prev) => ({ ...prev, address1: e.target.value }))}
                  className="bg-white/5 text-white"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address line 2 (optional)</Label>
                <Input
                  value={shipping.address2}
                  onChange={(e) => setShipping((prev) => ({ ...prev, address2: e.target.value }))}
                  className="bg-white/5 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={shipping.city}
                  onChange={(e) => setShipping((prev) => ({ ...prev, city: e.target.value }))}
                  className="bg-white/5 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={shipping.state}
                  onChange={(e) => setShipping((prev) => ({ ...prev, state: e.target.value }))}
                  className="bg-white/5 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Zip</Label>
                <Input
                  value={shipping.zip}
                  onChange={(e) => setShipping((prev) => ({ ...prev, zip: e.target.value }))}
                  className="bg-white/5 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={shipping.country}
                  onChange={(e) => setShipping((prev) => ({ ...prev, country: e.target.value }))}
                  className="bg-white/5 text-white"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle>Delivery method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {deliveryOptions.map((option) => {
                const active = delivery.id === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDelivery(option)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                      active
                        ? "border-lucky-green bg-lucky-green/10"
                        : "border-white/10 bg-white/5 hover:border-white/30"
                    )}
                  >
                    <div>
                      <p className="font-semibold text-white">{option.name}</p>
                      <p className="text-sm text-white/60">
                        {option.description} • {option.eta}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {option.price === 0 ? "Free" : `$${option.price.toFixed(2)}`}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle>Payment method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left transition",
                    paymentMethod === "card"
                      ? "border-lucky-green bg-lucky-green/10"
                      : "border-white/10 bg-white/5 hover:border-white/30"
                  )}
                >
                  <p className="font-semibold text-white">Card</p>
                  <p className="text-sm text-white/60">Visa, MasterCard, Amex</p>
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white/50"
                >
                  <p className="font-semibold text-white/70">PayPal (coming soon)</p>
                  <p className="text-sm text-white/50">Not enabled yet</p>
                </button>
              </div>

              {paymentMethod === "card" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Card number</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="4242 4242 4242 4242"
                      value={cardFields.number}
                      onChange={(e) =>
                        setCardFields((prev) => ({ ...prev, number: e.target.value }))
                      }
                      className="bg-white/5 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry</Label>
                    <Input
                      placeholder="MM/YY"
                      value={cardFields.expiry}
                      onChange={(e) =>
                        setCardFields((prev) => ({ ...prev, expiry: e.target.value }))
                      }
                      className="bg-white/5 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CVC</Label>
                    <Input
                      placeholder="123"
                      value={cardFields.cvc}
                      onChange={(e) =>
                        setCardFields((prev) => ({ ...prev, cvc: e.target.value }))
                      }
                      className="bg-white/5 text-white"
                    />
                  </div>
                </div>
              ) : null}
              <p className="text-sm text-white/60">
                Payments aren&apos;t enabled yet — this is a UI preview. Hook Stripe or your PSP here.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle>Order notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                rows={4}
                placeholder="Order notes / embroidery instructions"
                className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green"
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            {errors ? <p className="text-sm text-red-400">{errors}</p> : null}
            <Button onClick={handlePlaceOrder} disabled={!requiredFilled || items.length === 0}>
              Place Order
            </Button>
            <p className="text-xs text-white/60">
              Clicking place order will simulate success. Payments will be added later.
            </p>
          </div>
        </div>

        <div className="w-full md:w-[360px]">
          <Card className="border-white/10 bg-white/5 text-white md:sticky md:top-6">
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/40 p-3"
                  >
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-white/5">
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-white/60">
                        {item.variant} • {item.size}
                      </p>
                      <p className="mt-1 text-white/70">
                        {item.quantity} × ${item.price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="border-white/10" />
              <div className="space-y-2 text-sm text-white/80">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>${lineSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? "Free" : `$${shippingCost.toFixed(2)}`}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              </div>
              <Separator className="border-white/10" />
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <Separator className="border-white/10" />
              <div className="space-y-2">
                <Label>Promo code</Label>
                <div className="flex gap-2">
                  <Input
                    value={promo}
                    onChange={(e) => setPromo(e.target.value)}
                    placeholder="LUCKY10"
                    className="bg-white/5 text-white"
                  />
                  <Button
                    variant="secondary"
                    className="bg-white/10"
                    type="button"
                    onClick={() => setStatus("error")}
                  >
                    Apply
                  </Button>
                </div>
                <p className="text-xs text-white/60">Promo codes coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
