"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import ProductCard from "@/components/products/ProductCard";
import { useT } from "@/components/providers/LanguageProvider";
import { foundersSocialUrls } from "@/config/foundersSocial";
import { buildCloudinaryCardUrl } from "@/lib/cloudinaryUrl";
import { CategoryInfo } from "@/lib/categories";
import { Product } from "@/types";

const heroBackground =
  "https://res.cloudinary.com/dgg7cxdoj/image/upload/v1767463691/heroimage_toguj8.png";

interface HomePageClientProps {
  newDrops: Product[];
  categories: CategoryInfo[];
}

export default function HomePageClient({ newDrops, categories }: HomePageClientProps) {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();
  const hasNewDrops = newDrops.length > 0;

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={heroBackground}
            alt={t("home.heroImageAlt")}
            fill
            className="object-cover object-[50%_25%]"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.55)_55%,rgba(0,0,0,0.35)_100%)]" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at top, rgba(0,0,0,0.35), transparent 55%), radial-gradient(ellipse at bottom, rgba(0,0,0,0.35), transparent 55%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.00) 55%)",
            }}
          />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 py-20 md:px-8 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6">
            <motion.div
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h1 className="font-display text-5xl tracking-wide md:text-7xl">
                {t("home.heroHeadline")}
              </h1>
            </motion.div>
            <motion.p
              className="max-w-xl text-lg text-white/70"
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            >
              {t("home.heroSub")}
            </motion.p>
            <motion.div
              className="flex flex-wrap gap-4"
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            >
              <Button size="lg" asChild>
                <Link href="/shop">{t("home.heroCtaPrimary")}</Link>
              </Button>
            </motion.div>
            <motion.div
              className="flex items-center gap-6 text-sm text-white/60"
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.25 }}
            >
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-lucky-green" />
                {t("home.heroStatsOne")}
              </div>
              <div>{t("home.heroStatsTwo")}</div>
            </motion.div>
            <motion.div
              className="mt-2 overflow-hidden rounded-full border border-white/10 bg-black/40"
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.35 }}
            >
              <div className="flex animate-marquee items-center space-x-6 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60">
                {[
                  t("home.marquee.drop01"),
                  t("home.marquee.limitedRun"),
                  t("home.marquee.restock"),
                  t("home.marquee.premiumEmbroidery"),
                ].map((item, idx, arr) => (
                  <span key={`${item}-${idx}`} className="flex items-center whitespace-nowrap gap-3">
                    <span>{item}</span>
                    {idx < arr.length - 1 ? <span className="text-white/30">•</span> : null}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <motion.div
          className="flex items-center justify-between"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div>
            <p className="section-heading">{t("home.newDrops")}</p>
            <h2 className="mt-3 font-display text-4xl">{t("home.freshHeading")}</h2>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/shop" className="flex items-center gap-2">
              {t("home.explore")} <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
        <motion.div
          className="mt-8 flex gap-6 overflow-x-auto pb-4"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
        >
          {hasNewDrops ? (
            newDrops.map((product) => (
              <motion.div
                key={product.id}
                className="min-w-[260px] max-w-[260px]"
                whileHover={
                  prefersReducedMotion
                    ? undefined
                    : { rotateX: -2, rotateY: 2, translateY: -4 }
                }
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))
          ) : (
            <div className="min-w-[260px] rounded-2xl border border-white/10 bg-black/30 p-6 text-white/70">
              <p className="text-lg font-semibold text-white">{t("home.emptyNewDropsTitle")}</p>
              <p className="mt-2 text-sm">
                {t("home.emptyNewDropsCopy")}
              </p>
            </div>
          )}
        </motion.div>
      </section>

      <section className="bg-lucky-dark">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-heading">{t("home.featuredCategories")}</p>
              <h2 className="mt-3 font-display text-4xl">{t("home.builtForEveryDrop")}</h2>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-sm font-semibold text-lucky-green transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green"
            >
              {t("home.viewAll")} <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {categories.length ? categories.map((category) => (
              <motion.div
                key={category.key}
                whileHover={prefersReducedMotion ? undefined : { y: -6 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <Link
                  href={`/shop?category=${encodeURIComponent(category.key)}`}
                  aria-label={t("home.shopCategoryAria", { category: category.label })}
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green"
                >
                  <div className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent transition duration-300 group-hover:border-lucky-green/60 group-hover:shadow-[0_0_30px_rgba(104,240,160,0.25)]" />
                  <div className="relative overflow-hidden rounded-2xl bg-black/30">
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={category.imageUrl}
                        alt={category.label}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        sizes="(min-width: 1024px) 300px, (min-width: 768px) 50vw, 100vw"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-1 flex-col justify-between gap-2">
                    <p className="text-lg font-semibold">{category.label}</p>
                    <p className="text-sm text-white/60">{t("home.featuredCopy")}</p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white transition group-hover:text-lucky-green">
                    {t("home.shopNow")} <ArrowUpRight className="h-4 w-4" />
                  </span>
                </Link>
              </motion.div>
            )) : (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
                <p className="text-sm">{t("home.emptyCategories")}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-lucky-dark">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-center md:grid-cols-3 md:px-8">
          {[t("home.midBand.one"), t("home.midBand.two"), t("home.midBand.three")].map((item) => (
            <div key={item} className="text-sm uppercase tracking-[0.3em]">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <p className="section-heading">{t("home.luckySocial")}</p>
        <h2 className="mt-3 font-display text-4xl">{t("home.seenOn")}</h2>
        <motion.div
          className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 24 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {foundersSocialUrls.map((url, index) => (
            <motion.div
              key={index}
              className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/5"
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
              whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.03 }}
            >
              <img
                src={buildCloudinaryCardUrl(url)}
                alt={t("home.socialImageAlt")}
                className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = "/images/placeholder-product.svg";
                }}
                loading="lazy"
              />
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
