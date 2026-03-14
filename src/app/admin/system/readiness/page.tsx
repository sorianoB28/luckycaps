import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  collectReadinessDiagnostics,
  type DiagnosticLevel,
} from "@/lib/readinessDiagnostics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function badgeClass(level: DiagnosticLevel) {
  if (level === "green") {
    return "border-lucky-green/40 bg-lucky-green/15 text-lucky-green";
  }
  if (level === "yellow") {
    return "border-yellow-400/40 bg-yellow-400/15 text-yellow-200";
  }
  return "border-red-400/40 bg-red-500/15 text-red-200";
}

function labelForLevel(level: DiagnosticLevel) {
  if (level === "green") return "Ready";
  if (level === "yellow") return "Warn";
  return "Fail";
}

export default async function AdminSystemReadinessPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/sign-in?redirect=/admin/system/readiness&reason=auth_required");
  }

  if (session.user?.role !== "admin") {
    redirect("/auth/sign-in?redirect=/admin/system/readiness&reason=admin_required");
  }

  const diagnostics = await collectReadinessDiagnostics();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">Admin</p>
          <h1 className="font-display text-4xl text-white">Production Readiness</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/70">
            Server-side diagnostics for deployment mode, payment, shipping, email, safety
            guards, and database schema. Secrets are never shown.
          </p>
        </div>
        <div className="text-right text-sm text-white/60">
          <p>Generated</p>
          <p className="font-mono text-xs text-white/80">{diagnostics.generatedAt}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/orders"
          className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Orders
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Products
        </Link>
      </div>

      <div className="grid gap-5">
        {diagnostics.sections.map((section) => (
          <section
            key={section.title}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
          >
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="font-display text-2xl text-white">{section.title}</h2>
            </div>
            <div className="divide-y divide-white/10">
              {section.rows.map((row) => (
                <div
                  key={`${section.title}-${row.label}`}
                  className="grid gap-3 px-5 py-4 md:grid-cols-[1.3fr_0.55fr_1fr]"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{row.label}</p>
                    {row.detail ? (
                      <p className="mt-1 text-xs leading-5 text-white/60">{row.detail}</p>
                    ) : null}
                  </div>
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${badgeClass(
                        row.level
                      )}`}
                    >
                      {labelForLevel(row.level)}
                    </span>
                  </div>
                  <div className="text-sm text-white/80 md:text-right">{row.value}</div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
