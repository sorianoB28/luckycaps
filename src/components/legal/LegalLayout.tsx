"use client";

import Link from "next/link";
import { ReactNode } from "react";

type TocItem = { id: string; label: string };

type LegalLayoutProps = {
  title: string;
  description: string;
  lastUpdated: string;
  disclaimer: string;
  tocLabel: string;
  tocItems: TocItem[];
  children: ReactNode;
};

export function LegalLayout({
  title,
  description,
  lastUpdated,
  disclaimer,
  tocLabel,
  tocItems,
  children,
}: LegalLayoutProps) {
  return (
    <div className="relative bg-gradient-to-b from-[#050805] via-[#0c120c] to-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,0,0.08),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(0,255,0,0.06),transparent_28%),radial-gradient(circle_at_50%_70%,rgba(0,255,0,0.05),transparent_35%)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-16">
        <header className="mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/60">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-lucky-green shadow-[0_0_12px_rgba(0,255,0,0.65)]" />
            Lucky Caps Legal
          </div>
          <div className="space-y-3">
            <h1 className="font-display text-4xl md:text-5xl">{title}</h1>
            <p className="max-w-3xl text-base text-white/70 md:text-lg">{description}</p>
            <p className="text-sm uppercase tracking-[0.18em] text-white/50">{lastUpdated}</p>
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-[260px,1fr] lg:items-start">
          <aside className="hidden lg:block sticky top-28 h-fit rounded-2xl border border-white/10 bg-white/5/40 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">{tocLabel}</p>
            <nav className="mt-3 space-y-2 text-sm text-white/70">
              {tocItems.map((item) => (
                <Link
                  key={item.id}
                  href={`#${item.id}`}
                  className="group flex items-center gap-2 rounded-md px-2 py-1 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green"
                >
                  <span className="inline-block h-1 w-1 rounded-full bg-white/30 transition group-hover:bg-lucky-green" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>

          <div className="space-y-8">
            {children}
            <footer className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white/60 backdrop-blur">
              {disclaimer}
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

type LegalSectionProps = {
  id: string;
  title: string;
  eyebrow?: string;
  children: ReactNode;
};

export function LegalSection({ id, title, eyebrow, children }: LegalSectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-2xl border border-white/10 bg-black/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35),0_0_20px_rgba(0,255,0,0.05)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
        {eyebrow ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60">
            {eyebrow}
          </span>
        ) : null}
      </div>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/75 md:text-base">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-white/75">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-lucky-green/80" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalCallout({
  title,
  body,
  tone = "default",
}: {
  title: string;
  body: string;
  tone?: "default" | "warning";
}) {
  const toneStyles =
    tone === "warning"
      ? "border-amber-400/60 bg-amber-400/5 text-amber-100"
      : "border-lucky-green/60 bg-lucky-green/5 text-white";

  return (
    <div className={`rounded-xl border-l-4 px-4 py-3 text-sm ${toneStyles}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-white/80">{body}</p>
    </div>
  );
}
