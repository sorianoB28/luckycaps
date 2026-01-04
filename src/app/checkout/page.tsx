"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";
import { createCheckout } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useT } from "@/components/providers/LanguageProvider";

const SHOW_DEV_TOOLS = process.env.NODE_ENV !== "production";

type DeliveryOption = {
  id: string;
  nameKey: string;
  descriptionKey: string;
  price: number;
  etaKey: string;
};

const deliveryOptions: DeliveryOption[] = [
  {
    id: "standard",
    nameKey: "checkout.delivery.standard.name",
    descriptionKey: "checkout.delivery.standard.description",
    price: 0,
    etaKey: "checkout.delivery.standard.eta",
  },
  {
    id: "express",
    nameKey: "checkout.delivery.express.name",
    descriptionKey: "checkout.delivery.express.description",
    price: 12,
    etaKey: "checkout.delivery.express.eta",
  },
];

function CheckoutPageContent() {
  const t = useT();
  const { items } = useCart();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const isCanceled = searchParams.get("canceled") === "1";
  const hasAdminToken = session?.user?.role === "admin";
  const entries = Object.entries(items);
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
  const [promo, setPromo] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errors, setErrors] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const handleAutofill = () => {
    setContact({ email: "jane.doe@example.com", phone: "+1 (555) 123-4567" });
    setShipping({
      firstName: "Jane",
      lastName: "Doe",
      address1: "123 Market Street",
      address2: "Apt 4B",
      city: "San Francisco",
      state: "CA",
      zip: "94103",
      country: "United States",
    });
    setNotes("Please leave at the front desk. Test order.");
  };

  const lineSubtotal = useMemo(
    () =>
      entries.reduce(
        (sum, [, item]) => sum + item.priceCents * item.quantity,
        0
      ) / 100,
    [entries]
  );
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

  const handlePlaceOrder = async () => {
    if (submitting) return;
    if (!requiredFilled || entries.length === 0) {
      setErrors("Please complete required fields and add items to your cart.");
      setStatus("error");
      return;
    }

    const itemsPayload = entries.map(([, item]) => ({
      productId: item.productId ?? "",
      quantity: item.quantity,
      size: item.size ?? null,
      variant: item.variant ?? null,
    }));

    const payload = {
      contact: {
        email: contact.email.trim(),
        phone: contact.phone?.trim() || null,
      },
      shippingAddress: {
        firstName: shipping.firstName,
        lastName: shipping.lastName,
        address1: shipping.address1,
        address2: shipping.address2 || undefined,
        city: shipping.city,
        state: shipping.state,
        zip: shipping.zip,
        country: shipping.country,
      },
      deliveryOption: delivery.id,
      promoCode: promo.trim() || undefined,
      notes: notes.trim() ? notes.trim() : undefined,
      items: itemsPayload,
    };

    setSubmitting(true);
    setErrors(null);
    setStatus("idle");
    setOrderId(null);

    try {
      const response = await createCheckout(payload);
      if (!response.url) {
        throw new Error("Missing checkout url");
      }
      setOrderId(response.orderId ?? null);
      setStatus("success");
      window.location.href = response.url;
    } catch (err) {
      setStatus("error");
      setErrors((err as Error).message || t("checkout.unableToPlaceOrder"));
    } finally {
      setSubmitting(false);
    }
  };

  if (entries.length === 0 && status !== "success") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-2xl font-semibold text-white">{t("checkout.emptyTitle")}</p>
        <p className="mt-2 text-white/70">{t("checkout.emptyCopy")}</p>
        <Button className="mt-6" asChild>
          <Link href="/shop">{t("common.backToShop")}</Link>
        </Button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="font-display text-3xl">{t("checkout.redirectingTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-white/70">
            <p>{t("checkout.redirectingCopy")}</p>
            <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-sm">
              <p className="text-white/60">{t("checkout.orderIdLabel")}</p>
              <p className="font-mono text-white">{orderId ?? t("checkout.processing")}</p>
            </div>
            <div className="flex gap-3">
              <Button asChild>
                <Link href={`/order/${orderId ?? ""}`}>{t("checkout.viewOrder")}</Link>
              </Button>
              <Button asChild>
                <Link href="/shop">{t("common.backToShop")}</Link>
              </Button>
              {hasAdminToken ? (
                <Button variant="outline" asChild>
                  <Link href="/admin">{t("checkout.goToAdmin")}</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
      {isCanceled ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {t("checkout.canceled")}
        </div>
      ) : null}
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex-1 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/50">{t("checkout.title")}</p>
              <h1 className="font-display text-4xl text-white">{t("checkout.heading")}</h1>
              <p className="text-white/60">{t("checkout.notice")}</p>
            </div>
            {SHOW_DEV_TOOLS ? (
              <Button
                type="button"
                variant="secondary"
                className="bg-white/10"
                onClick={handleAutofill}
              >
                {t("checkout.autofill")}
              </Button>
            ) : null}
          </div>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle>{t("checkout.contactTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>{t("checkout.email")}</Label>
                <Input
                  type="email"
                  required
                  value={contact.email}
                  onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder={t("auth.emailPlaceholder")}
                  className="bg-white/5 text-white"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t("checkout.phoneOptional")}</Label>
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
              <CardTitle>{t("checkout.shippingAddressTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("checkout.firstName")}</Label>
                <Input
                  value={shipping.firstName}
                  onChange={(e) => setShipping((prev) => ({ ...prev, firstName: e.target.value }))}
                  className="bg-white/5 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("checkout.lastName")}</Label>
                <Input
                  value={shipping.lastName}
                  onChange={(e) => setShipping((prev) => ({ ...prev, lastName: e.target.value }))}
                  className="bg-white/5 text-white"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t("checkout.address1")}</Label>
                <Input
                  value={shipping.address1}
                  onChange={(e) => setShipping((prev) => ({ ...prev, address1: e.target.value }))}
                  className="bg-white/5 text-white"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t("checkout.address2")}</Label>
                <Input
                  value={shipping.address2}
                  onChange={(e) => setShipping((prev) => ({ ...prev, address2: e.target.value }))}
                  className="bg-white/5 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("checkout.city")}</Label>
                <Input
                  value={shipping.city}
                  onChange={(e) => setShipping((prev) => ({ ...prev, city: e.target.value }))}
                  className="bg-white/5 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("checkout.state")}</Label>
                <Input
                  value={shipping.state}
                  onChange={(e) => setShipping((prev) => ({ ...prev, state: e.target.value }))}
                  className="bg-white/5 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("checkout.zip")}</Label>
                <Input
                  value={shipping.zip}
                  onChange={(e) => setShipping((prev) => ({ ...prev, zip: e.target.value }))}
                  className="bg-white/5 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("checkout.country")}</Label>
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
              <CardTitle>{t("checkout.deliveryMethodTitle")}</CardTitle>
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
                      <p className="font-semibold text-white">{t(option.nameKey)}</p>
                      <p className="text-sm text-white/60">
                        {t(option.descriptionKey)} • {t(option.etaKey)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {option.price === 0 ? t("checkout.free") : `$${option.price.toFixed(2)}`}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle>{t("checkout.orderNotes")}</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                rows={4}
                placeholder={t("checkout.orderNotesPlaceholder")}
                className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            {errors ? <p className="text-sm text-red-400">{errors}</p> : null}
            <Button onClick={handlePlaceOrder} disabled={!requiredFilled || entries.length === 0 || submitting}>
              {submitting ? t("checkout.placingOrder") : t("checkout.placeOrder")}
            </Button>
            <p className="text-xs text-white/60">
              {t("checkout.redirectNotice")}
            </p>
          </div>
        </div>

        <div className="w-full md:w-[360px]">
          <Card className="border-white/10 bg-white/5 text-white md:sticky md:top-6">
            <CardHeader>
              <CardTitle>{t("checkout.orderSummary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {entries.map(([key, item]) => (
                  <div
                    key={key}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/40 p-3"
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
                        {(item.variant || t("cart.variantFallback"))} / {(item.size || t("cart.sizeFallback"))}
                      </p>
                      <p className="mt-1 text-white/70">
                        {item.quantity} x ${(item.priceCents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="border-white/10" />
              <div className="space-y-2 text-sm text-white/80">
                <div className="flex items-center justify-between">
                  <span>{t("common.subtotal")}</span>
                  <span>${lineSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t("cart.shipping")}</span>
                  <span>{shippingCost === 0 ? t("checkout.free") : `$${shippingCost.toFixed(2)}`}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t("cart.tax")}</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              </div>
              <Separator className="border-white/10" />
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>{t("common.total")}</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <Separator className="border-white/10" />
              <div className="space-y-2">
                <Label>{t("checkout.promoCode")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={promo}
                    onChange={(e) => setPromo(e.target.value)}
                    placeholder={t("checkout.couponPlaceholder")}
                    className="bg-white/5 text-white"
                  />
                  <Button
                    variant="secondary"
                    className="bg-white/10"
                    type="button"
                    onClick={() => setStatus("error")}
                  >
                    {t("checkout.apply")}
                  </Button>
                </div>
                <p className="text-xs text-white/60">{t("checkout.promoSoon")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const t = useT();

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-16 text-center text-white/70">
          {t("checkout.loadingCheckout")}
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}
