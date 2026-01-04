"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/LanguageProvider";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  const t = useT();

  return (
    <div className="relative min-h-screen bg-lucky-dark text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-lucky-darker/70 to-black" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-10 top-10 h-56 w-56 rounded-full bg-lucky-green/15 blur-3xl" />
        <div className="absolute right-16 bottom-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center px-4 py-12">
        <div className="w-full">
          <div className={cn("mx-auto w-full max-w-xl space-y-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur")}>
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
                <p className="font-display text-2xl">Lucky Caps</p>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  {t("footer.tagline")}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-4xl">{title}</h1>
              {subtitle ? <p className="text-white/70">{subtitle}</p> : null}
            </div>
            <div className="space-y-6">{children}</div>
            <div className="flex items-center justify-between text-sm text-white/60">
              <Link href="/shop" className="hover:text-white">
                {t("common.backToShop")}
              </Link>
              <Link href="/about" className="hover:text-white">
                {t("nav.story")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
