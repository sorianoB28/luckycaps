"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { PromoCodeForm } from "@/app/admin/components/PromoCodeForm";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/LanguageProvider";
import { getAdminPromoCode, type AdminPromoCode, updateAdminPromoCode } from "@/lib/api";

export default function AdminEditPromoCodePage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [promo, setPromo] = useState<AdminPromoCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getAdminPromoCode(id)
      .then((data) => setPromo(data))
      .catch((err) => setError((err as Error).message || "Unable to load promo code"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-white/70">{t("common.loading")}</div>;
  }

  if (error || !promo) {
    return (
      <div className="space-y-4 text-white/80">
        <p className="text-lg font-semibold text-white">{error ?? "Not found"}</p>
        <Button asChild variant="secondary" className="bg-white/10">
          <Link href="/admin/promo-codes">{t("common.back")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">{t("admin.title")}</p>
          <h1 className="font-display text-4xl">{promo.code}</h1>
          <p className="text-sm text-white/60">{promo.id}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/promo-codes">{t("common.back")}</Link>
        </Button>
      </div>

      <PromoCodeForm
        initial={promo}
        submitting={submitting}
        error={error}
        onSubmit={async (payload) => {
          setSubmitting(true);
          setError(null);
          try {
            const updated = await updateAdminPromoCode(promo.id, payload as any);
            setPromo(updated);
          } catch (err) {
            setError((err as Error).message || "Unable to update promo code");
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </div>
  );
}

