"use client";

import { useT } from "@/components/providers/LanguageProvider";

export default function PrivacyPage() {
  const t = useT();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 text-white">
      <h1 className="font-display text-4xl">{t("privacy.title")}</h1>
      <p className="mt-4 text-white/70">
        {t("privacy.copy")}
      </p>
    </div>
  );
}
