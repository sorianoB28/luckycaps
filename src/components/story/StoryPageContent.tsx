"use client";

import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/LanguageProvider";

const founderImage =
  "https://res.cloudinary.com/dgg7cxdoj/image/upload/v1768941092/jesus_to3eks.jpg";

export default function StoryPageContent() {
  const t = useT();
  const facts = [t("about.fact.role"), t("about.fact.location"), t("about.fact.started")];
  const sections = [
    { title: t("about.sections.how.title"), copy: t("about.sections.how.copy") },
    { title: t("about.sections.what.title"), copy: t("about.sections.what.copy") },
    { title: t("about.sections.why.title"), copy: t("about.sections.why.copy") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-4">
          <Badge variant="green">{t("about.badge")}</Badge>
          <h1 className="font-display text-5xl leading-[1.05]">{t("about.heroHeading")}</h1>
          <p className="text-lg text-white/70">{t("about.heroSub")}</p>
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.26em] text-white/60">
            {facts.map((fact) => (
              <span
                key={fact}
                className="rounded-full border border-white/10 bg-black/30 px-3 py-1"
              >
                {fact}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/shop">{t("about.ctaShop")}</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/">{t("common.back")}</Link>
            </Button>
          </div>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10 bg-black/40">
          <Image
            src={founderImage}
            alt={t("about.imageAlt")}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 520px, 90vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {sections.map((section) => (
          <div
            key={section.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg"
          >
            <p className="section-heading">{t("about.sections.kicker")}</p>
            <h3 className="font-display text-2xl">{section.title}</h3>
            <p className="mt-3 text-white/70">{section.copy}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-3xl border border-white/10 bg-gradient-to-r from-black/70 via-lucky-dark to-black p-6 shadow-lg md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="section-heading">{t("about.whyTitle")}</p>
            <h3 className="font-display text-3xl">{t("about.whyHeadline")}</h3>
            <p className="mt-2 text-white/70">{t("about.whyCopy")}</p>
          </div>
          <Button asChild size="lg" className="self-start">
            <Link href="/shop">{t("about.ctaShop")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
