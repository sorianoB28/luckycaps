"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PromoCodeForm } from "@/app/admin/components/PromoCodeForm";
import { createAdminPromoCode } from "@/lib/api";
import { useT } from "@/components/providers/LanguageProvider";

export default function AdminNewPromoCodePage() {
  const t = useT();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-white/50">{t("admin.title")}</p>
        <h1 className="font-display text-4xl">{t("common.add")} {t("admin.promoCodes")}</h1>
      </div>

      <PromoCodeForm
        submitting={submitting}
        error={error}
        onSubmit={async (payload) => {
          setSubmitting(true);
          setError(null);
          try {
            const created = await createAdminPromoCode(payload as any);
            router.replace(`/admin/promo-codes/${created.id}`);
          } catch (err) {
            setError((err as Error).message || "Unable to create promo code");
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </div>
  );
}

