"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/store/cart";
import { useT } from "@/components/providers/LanguageProvider";

export default function CheckoutSuccessPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clearCart = useCart((s) => s.clear);
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          `/api/checkout/complete?session_id=${encodeURIComponent(sessionId)}`,
          { credentials: "include" }
        );
        if (res.status === 202) {
          if (attempt >= maxAttempts) {
            throw new Error(t("checkout.unableToFinalize"));
          }
          setTimeout(() => poll(attempt + 1), 750);
          return;
        }
        if (!res.ok) throw new Error(t("checkout.unableToFinalize"));
        const data = (await res.json()) as { orderId?: string };
        if (!data.orderId) throw new Error(t("checkout.unableToFinalize"));
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
  }, [clearCart, router, sessionId, t]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="font-display text-3xl">
            {t("checkout.finalizingTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-white/70">
          {loading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("checkout.finalizingCopy")}</span>
            </div>
          ) : error ? (
            <div className="space-y-3">
              <p className="text-sm text-red-300">{error}</p>
              <Button asChild variant="secondary" className="bg-white/10">
                <Link href="/checkout">{t("checkout.returnToCheckout")}</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
