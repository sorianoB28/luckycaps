"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
import { buildCloudinaryCardUrl } from "@/lib/cloudinaryUrl";

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

type Quote = {
  currency: "usd";
  delivery_option: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  promo:
    | null
    | {
        promo_code_id: string;
        normalized_code: string;
        stripe_coupon_id: string;
      };
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

type QuoteResponseOk = { ok: true; quote: Quote };
type QuoteResponseErr = {
  ok: false;
  error?: string;
  promoError?: { valid?: false; reason?: string; min_subtotal_cents?: number | null } | null;
};

function CheckoutPageContent() {
  const t = useT();
  const { items } = useCart();
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const isCanceled = searchParams.get("canceled") === "1";
  const entries = useMemo(() => Object.entries(items), [items]);
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
  const [appliedPromo, setAppliedPromo] = useState<
    | null
    | {
        promo_code_id: string;
        normalized_code: string;
      }
  >(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoApplying, setPromoApplying] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const didPrefillRef = useRef(false);
  const quoteReqIdRef = useRef(0);

  useEffect(() => {
    if (didPrefillRef.current) return;
    if (sessionStatus !== "authenticated") return;
    const user = session?.user;
    if (!user) return;

    didPrefillRef.current = true;

    const email = user.email?.toString().trim() ?? "";
    const fullName = user.name?.toString().trim() ?? "";
    const firstNameFromProfile = user.firstName?.toString().trim() ?? "";
    const lastNameFromProfile = user.lastName?.toString().trim() ?? "";

    let derivedFirst = "";
    let derivedLast = "";
    if (fullName) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      derivedFirst = parts[0] ?? "";
      derivedLast = parts.slice(1).join(" ");
    }

    const nextFirst = firstNameFromProfile || derivedFirst;
    const nextLast = lastNameFromProfile || derivedLast;

    if (email) {
      setContact((prev) => (prev.email ? prev : { ...prev, email }));
    }
    if (nextFirst || nextLast) {
      setShipping((prev) => ({
        ...prev,
        firstName: prev.firstName || nextFirst || prev.firstName,
        lastName: prev.lastName || nextLast || prev.lastName,
      }));
    }
  }, [session?.user, sessionStatus]);

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

  const itemsPayload = useMemo(
    () =>
      entries.map(([, item]) => ({
        productId: item.productId ?? "",
        quantity: item.quantity,
        size: item.size ?? null,
        variant: item.variant ?? null,
      })),
    [entries]
  );

  const requestQuote = async (overrides?: {
    promoCode?: string | null;
    deliveryOption?: string;
    preserveExisting?: boolean;
  }) => {
    const nextId = ++quoteReqIdRef.current;
    setQuoteLoading(true);
    setQuoteError(null);
    const preserveExisting = overrides?.preserveExisting ?? false;

    try {
      const res = await fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsPayload,
          currency: "usd",
          deliveryOption: overrides?.deliveryOption ?? delivery.id,
          promoCode: overrides?.promoCode ?? appliedPromo?.normalized_code ?? null,
          shippingAddress: shipping,
        }),
      });

      const data = (await res.json()) as QuoteResponseOk | QuoteResponseErr;
      if (nextId !== quoteReqIdRef.current) return null;

      if (!("ok" in data) || !data.ok) {
        if (!preserveExisting) setQuote(null);
        const message = data.error || t("checkout.unableToPlaceOrder");
        if (preserveExisting && data.promoError) {
          setQuoteError(null);
        } else {
          setQuoteError(message);
        }
        return data;
      }

      setQuote(data.quote);
      setQuoteError(null);
      return data;
    } catch {
      if (nextId !== quoteReqIdRef.current) return null;
      if (!preserveExisting) setQuote(null);
      setQuoteError(t("checkout.unableToPlaceOrder"));
      return { ok: false, error: t("checkout.unableToPlaceOrder") } satisfies QuoteResponseErr;
    } finally {
      if (nextId === quoteReqIdRef.current) setQuoteLoading(false);
    }
  };

  useEffect(() => {
    if (entries.length === 0) return;
    requestQuote().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsPayload, delivery.id, entries.length]);

  useEffect(() => {
    if (entries.length === 0) return;
    const id = window.setTimeout(() => {
      requestQuote().catch(() => null);
    }, 400);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    shipping.address1,
    shipping.address2,
    shipping.city,
    shipping.state,
    shipping.zip,
    shipping.country,
    entries.length,
  ]);

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
    if (!quote || quoteLoading || quoteError) {
      setErrors(quoteError || t("checkout.unableToPlaceOrder"));
      return;
    }
    if (!requiredFilled || entries.length === 0) {
      setErrors(t("checkout.requiredFieldsError"));
      return;
    }

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
      promoCode: appliedPromo?.normalized_code || undefined,
      notes: notes.trim() ? notes.trim() : undefined,
      items: itemsPayload,
    };

    setSubmitting(true);
    setErrors(null);

    try {
      const response = await createCheckout(payload);
      if (!response.url) {
        throw new Error(t("checkout.missingCheckoutUrl"));
      }
      window.location.href = response.url;
    } catch (err) {
      setErrors((err as Error).message || t("checkout.unableToPlaceOrder"));
    } finally {
      setSubmitting(false);
    }
  };

  const promoMessageFromReason = (
    reason: string,
    meta?: { min_subtotal_cents?: number | null }
  ) => {
    if (reason === "missing_code") return t("checkout.promoErrors.missing");
    if (reason === "not_found") return t("checkout.promoErrors.notFound");
    if (reason === "inactive") return t("checkout.promoErrors.inactive");
    if (reason === "not_started") return t("checkout.promoErrors.notStarted");
    if (reason === "expired") return t("checkout.promoErrors.expired");
    if (reason === "max_redemptions") return t("checkout.promoErrors.maxRedemptions");
    if (reason === "no_stripe_coupon") return t("checkout.promoErrors.notAvailable");
    if (reason === "min_subtotal") {
      const min = (meta?.min_subtotal_cents ?? 0) / 100;
      return t("checkout.promoErrors.minSubtotal", { min: min.toFixed(2) });
    }
    return t("checkout.promoErrors.invalid");
  };

  const handleApplyPromo = async () => {
    if (promoApplying) return;

    const code = promo.trim();
    if (!code) {
      setPromoError(t("checkout.promoErrors.missing"));
      return;
    }

    setPromoApplying(true);
    setPromoError(null);
    try {
      const res = await requestQuote({ promoCode: code, preserveExisting: true });
      if (!res || !("ok" in res)) return;

      if (!res.ok) {
        setAppliedPromo(null);
        const reason = res.promoError?.reason ?? "invalid";
        setPromoError(promoMessageFromReason(reason, res.promoError ?? undefined));
        return;
      }

      if (!res.quote.promo) {
        setAppliedPromo(null);
        setPromoError(t("checkout.promoErrors.invalid"));
        return;
      }

      setAppliedPromo({
        promo_code_id: res.quote.promo.promo_code_id,
        normalized_code: res.quote.promo.normalized_code,
      });
      setPromo(res.quote.promo.normalized_code);
      setPromoError(null);
    } catch {
      setAppliedPromo(null);
      setPromoError(t("checkout.promoErrors.invalid"));
    } finally {
      setPromoApplying(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromo("");
    setPromoError(null);
    requestQuote({ promoCode: null }).catch(() => null);
  };


  if (entries.length === 0) {
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
            <Button
              onClick={handlePlaceOrder}
              disabled={
                !requiredFilled ||
                entries.length === 0 ||
                submitting ||
                quoteLoading ||
                !quote ||
                Boolean(quoteError)
              }
            >
              {submitting
                ? t("checkout.placingOrder")
                : quoteLoading
                  ? t("common.loading")
                  : t("checkout.placeOrder")}
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
                {quote?.items?.length ? (
                  quote.items.map((item, idx) => (
                    <div
                      key={`${item.product_id}-${item.size ?? "na"}-${idx}`}
                      className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/40 p-3"
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
                ) : (
                  entries.map(([key, item]) => (
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
                      <p className="mt-1 text-white/70">{item.quantity} x {t("common.loading")}</p>
                    </div>
                  </div>
                ))
                )}
              </div>
              <Separator className="border-white/10" />
              <div className="space-y-2 text-sm text-white/80">
                <div className="flex items-center justify-between">
                  <span>{t("common.subtotal")}</span>
                  <span>
                    {quote ? `$${(quote.subtotal_cents / 100).toFixed(2)}` : t("common.loading")}
                  </span>
                </div>
                {quote && quote.discount_cents > 0 ? (
                  <div className="flex items-center justify-between">
                    <span>{t("common.discount")}</span>
                    <span className="text-lucky-green">
                      -${(quote.discount_cents / 100).toFixed(2)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span>{t("cart.shipping")}</span>
                  <span>
                    {quote
                      ? quote.shipping_cents === 0
                        ? t("checkout.free")
                        : `$${(quote.shipping_cents / 100).toFixed(2)}`
                      : t("common.loading")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t("cart.tax")}</span>
                  <span>
                    {quote ? `$${(quote.tax_cents / 100).toFixed(2)}` : t("common.loading")}
                  </span>
                </div>
              </div>
              <Separator className="border-white/10" />
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>{t("common.total")}</span>
                <span>
                  {quote ? `$${(quote.total_cents / 100).toFixed(2)}` : t("common.loading")}
                </span>
              </div>
              <Separator className="border-white/10" />
              <div className="space-y-2">
                <Label>{t("checkout.promoCode")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={promo}
                    onChange={(e) => {
                      setPromo(e.target.value);
                      setPromoError(null);
                    }}
                    placeholder={t("checkout.couponPlaceholder")}
                    disabled={Boolean(appliedPromo)}
                    className="bg-white/5 text-white"
                  />
                  {appliedPromo ? (
                    <Button
                      variant="secondary"
                      className="bg-white/10"
                      type="button"
                      onClick={handleRemovePromo}
                    >
                      {t("checkout.promoRemove")}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      className="bg-white/10"
                      type="button"
                      disabled={promoApplying}
                      onClick={handleApplyPromo}
                    >
                      {promoApplying ? t("common.loading") : t("checkout.apply")}
                    </Button>
                  )}
                </div>
                {promoError ? (
                  <p className="text-xs text-red-300">{promoError}</p>
                ) : appliedPromo ? (
                  <p className="text-xs text-white/60">
                    {t("checkout.promoApplied")}: {appliedPromo.normalized_code}
                  </p>
                ) : null}
                {quoteError ? <p className="text-xs text-red-300">{quoteError}</p> : null}
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
