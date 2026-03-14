"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/store/cart";
import { useT } from "@/components/providers/LanguageProvider";

const CheckoutShell = ({ children }: { children: ReactNode }) => {
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16" data-testid="checkout-success-shell">
      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="font-display text-3xl">
            {t("checkout.finalizingTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-white/70">{children}</CardContent>
      </Card>
    </div>
  );
};

const CheckoutSuccessContent = () => {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clearCart = useCart((s) => s.clear);
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setError(t("checkout.unableToFinalize"));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const maxAttempts = 20;
    const poll = async (attempt: number) => {
      try {
        const res = await fetch(
          `/api/orders/by-session?session_id=${encodeURIComponent(sessionId)}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          throw new Error(t("checkout.unableToFinalize"));
        }
        const data = (await res.json()) as { found?: boolean; orderId?: string };
        if (!data.found || !data.orderId) {
          if (attempt >= maxAttempts) {
            throw new Error(t("checkout.unableToFinalize"));
          }
          setTimeout(() => poll(attempt + 1), 750);
          return;
        }
        if (cancelled) return;
        clearCart();
        router.replace(`/order/${data.orderId}?success=1`);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || t("checkout.unableToFinalize"));
        setLoading(false);
      }
    };

    poll(0);

    return () => {
      cancelled = true;
    };
  }, [clearCart, retryTick, router, sessionId, t]);

  return (
    <CheckoutShell>
      {loading ? (
        <div className="flex items-center gap-3" data-testid="checkout-success-finalizing">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t("checkout.finalizingCopy")}</span>
        </div>
      ) : error ? (
        <div className="space-y-3" data-testid="checkout-success-error">
          <p className="text-sm text-red-300" data-testid="checkout-success-error-text">
            {error}
          </p>
          <Button
            type="button"
            onClick={() => setRetryTick((prev) => prev + 1)}
            data-testid="checkout-success-retry-button"
          >
            {t("checkout.retryFinalization")}
          </Button>
          <Button asChild variant="secondary" className="bg-white/10">
            <Link href="/checkout" data-testid="checkout-success-return-link">
              {t("checkout.returnToCheckout")}
            </Link>
          </Button>
        </div>
      ) : null}
    </CheckoutShell>
  );
};

const CheckoutSuccessFallback = () => {
  const t = useT();
  return (
    <CheckoutShell>
      <div className="flex items-center gap-3" data-testid="checkout-success-finalizing">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t("checkout.finalizingCopy")}</span>
      </div>
    </CheckoutShell>
  );
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessFallback />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
