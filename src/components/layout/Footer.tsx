"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

import { useT } from "@/components/providers/LanguageProvider";

const shopLinks = [
  { href: "/shop?category=Snapbacks", labelKey: "footer.shopLinks.snapbacks" },
  { href: "/shop?category=Fitted", labelKey: "footer.shopLinks.fitted" },
  { href: "/shop?category=Trucker", labelKey: "footer.shopLinks.trucker" },
  { href: "/shop?category=Beanies", labelKey: "footer.shopLinks.beanies" },
  { href: "/shop?category=Custom", labelKey: "footer.shopLinks.custom" },
  { href: "/shop", labelKey: "footer.shopLinks.shopAll" },
] as const;

const companyLinks = [
  { href: "/about", labelKey: "footer.companyLinks.story" },
  { href: "/contact", labelKey: "footer.companyLinks.contact" },
] as const;

const legalLinks = [
  { href: "/privacy", labelKey: "footer.legalLinks.privacy" },
  { href: "/terms", labelKey: "footer.legalLinks.terms" },
] as const;

export default function Footer() {
  const t = useT();
  const [showTop, setShowTop] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 320);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headerClass =
    "text-base font-bold uppercase tracking-[0.28em] text-white/90 flex items-center gap-2 mb-3";
  const accentDot =
    "inline-block h-2 w-2 rounded-full bg-lucky-green shadow-[0_0_12px_rgba(0,255,0,0.5)]";

  return (
    <footer className="relative mt-16 bg-gradient-to-b from-[#0a0f0a] via-lucky-dark to-black text-white">
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,0,0.05),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(0,255,0,0.05),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5/70 p-6 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(0,0,0,0.35),0_0_20px_rgba(0,255,0,0.08)] motion-reduce:transform-none">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/20 bg-black">
                <Image
                  src="/brand/luckycaps-logo.png"
                  alt={t("header.logoAlt")}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="font-display text-2xl">{t("brand.name")}</p>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  {t("footer.tagline")}
                </p>
              </div>
            </div>
            <p className="text-white/70">
              {t("footer.blurb")}
            </p>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span className="inline-flex items-center gap-1">
                <span className="inline-flex h-3 w-3 items-center justify-center">
                  <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-lucky-green/40 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-lucky-green" />
                </span>
                {t("footer.rating")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/60">
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lucky-green/30 motion-reduce:animate-none"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-lucky-green"></span>
              </span>
              <span>{t("footer.dropAlert")}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-white/70">
              {[t("product.secureCheckout"), t("product.fastShipping"), t("product.returns")].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-black/30 px-3 py-1 transition hover:border-lucky-green/60 hover:text-white hover:shadow-[0_0_16px_rgba(0,255,0,0.12)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5/60 p-6 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(0,0,0,0.35),0_0_20px_rgba(0,255,0,0.08)] motion-reduce:transform-none">
            <div className={headerClass}>
              <span className={accentDot} />
              <span>{t("footer.shop")}</span>
            </div>
            <div className="mt-2 grid gap-2 text-sm text-white/80">
              {shopLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center justify-between rounded-lg px-3 py-2 transition hover:bg-white/5 hover:text-lucky-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green"
                >
                  <span className="flex items-center gap-2">{t(link.labelKey)}</span>
                  <ArrowUpRight className="h-4 w-4 text-white/40 transition group-hover:translate-x-1 group-hover:text-lucky-green" />
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5/60 p-6 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(0,0,0,0.35),0_0_20px_rgba(0,255,0,0.08)] motion-reduce:transform-none">
            <div className={headerClass}>
              <span className={accentDot} />
              <span>{t("footer.stayInLoop")}</span>
            </div>
            <div className="space-y-3 text-sm text-white/70">
              <p className="text-white/60">{t("footer.noSpam")}</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("footer.emailPlaceholder")}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-lucky-green"
                />
                <button
                  onClick={() => {
                    if (!email || !consent) return;
                    setJoinSuccess(true);
                    setEmail("");
                    setConsent(false);
                    setTimeout(() => setJoinSuccess(false), 3000);
                  }}
                  className="rounded-lg bg-lucky-green px-4 text-sm font-semibold text-lucky-darker transition hover:bg-lucky-green/90 focus:outline-none focus:ring-2 focus:ring-lucky-green"
                >
                  {t("footer.join")}
                </button>
              </div>
              <label className="mb-2 flex items-center gap-2 text-xs text-white/60">
                <input
                  type="checkbox"
                  className="accent-lucky-green"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />{" "}
                {t("footer.consent")}
              </label>
              {joinSuccess ? (
                <p className="text-xs text-lucky-green">{t("footer.subscribed")}</p>
              ) : null}
            </div>
            <div className="mt-5 grid gap-4 text-sm text-white/80 md:grid-cols-2">
              <div>
                <div className={headerClass}>
                  <span className={accentDot} />
                  <span>{t("footer.company")}</span>
                </div>
                <div className="space-y-1">
                  {companyLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block rounded px-2 py-1 transition hover:text-lucky-green hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green"
                    >
                      {t(link.labelKey)}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <div className={headerClass}>
                  <span className={accentDot} />
                  <span>{t("footer.legal")}</span>
                </div>
                <div className="space-y-1">
                  {legalLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block rounded px-2 py-1 transition hover:text-lucky-green hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green"
                    >
                      {t(link.labelKey)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5/40 p-4 text-xs text-white/60 backdrop-blur">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/60">
              <span className="hidden text-white/50 md:inline">{t("footer.legal")}</span>
              <Link
                href="/privacy"
                className="rounded px-1 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green"
              >
                {t("footer.legalLinks.privacy")}
              </Link>
              <Link
                href="/terms"
                className="rounded px-1 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green"
              >
                {t("footer.legalLinks.terms")}
              </Link>
              <Link
                href="/contact"
                className="rounded px-1 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green"
              >
                {t("footer.companyLinks.contact")}
              </Link>
            </div>
            <div className="text-center text-[11px] text-white/70">
              {t("footer.copyright", { year: new Date().getFullYear() })}
            </div>
            <div className="flex justify-end">
              {showTop ? (
                <button
                  type="button"
                  aria-label={t("footer.backToTop")}
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-white transition hover:border-lucky-green hover:text-lucky-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green"
                >
                  <ArrowUp className="h-4 w-4 transition group-hover:-translate-y-px" />
                  {t("footer.backToTop")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
