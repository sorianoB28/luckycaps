"use client";

import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/providers/LanguageProvider";

export default function AboutPage() {
  const t = useT();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 md:px-8">
      <Badge variant="green">{t("about.badge")}</Badge>
      <h1 className="mt-4 font-display text-5xl">{t("about.title")}</h1>
      <p className="mt-4 text-lg text-white/70">
        {t("about.intro")}
      </p>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="section-heading">{t("about.ethosKicker")}</p>
          <h2 className="font-display text-3xl">{t("about.ethosTitle")}</h2>
          <p className="text-white/70">
            {t("about.ethosCopy")}
          </p>
        </div>
        <div className="relative min-h-[260px] overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <Image
            src="https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=900&q=80"
            alt={t("about.imageAlt")}
            fill
            className="object-cover"
          />
        </div>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {[t("about.pill.one"), t("about.pill.two"), t("about.pill.three")].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
