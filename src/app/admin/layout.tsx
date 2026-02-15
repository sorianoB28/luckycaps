"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/LanguageProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const t = useT();
  const isAdmin = session?.user?.role === "admin";
  const hadAuthenticatedSession = useRef(false);
  const safePath = pathname || "/admin";
  const accessReason =
    status === "authenticated"
      ? "admin_required"
      : hadAuthenticatedSession.current
      ? "session_expired"
      : "auth_required";
  const signInHref = `/auth/sign-in?redirect=${encodeURIComponent(
    safePath
  )}&reason=${accessReason}`;

  useEffect(() => {
    if (status === "authenticated") {
      hadAuthenticatedSession.current = true;
    }
  }, [status]);

  useEffect(() => {
    if (status === "loading") return;
    if (!isAdmin) {
      router.replace(signInHref);
    }
  }, [isAdmin, router, signInHref, status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-lucky-dark text-white px-4 py-10">
        {t("admin.checkingAccess")}
      </div>
    );
  }

  if (!isAdmin) {
    const accessMessage =
      accessReason === "admin_required"
        ? t("admin.unauthorized")
        : accessReason === "session_expired"
        ? t("adminProductForm.sessionExpired")
        : t("auth.signInSubtitle");

    return (
      <div className="min-h-screen bg-lucky-dark px-4 py-16 text-white">
        <div
          className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-black/40 p-6 text-center"
          data-testid="admin-access-blocked"
          data-reason={accessReason}
        >
          <h1 className="font-display text-2xl">{t("admin.title")}</h1>
          <p className="mt-3 text-sm text-white/80">{accessMessage}</p>
          <Button asChild className="mt-5">
            <Link href={signInHref} data-testid="admin-access-signin-link">
              {t("auth.signIn")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lucky-dark text-white">
      <header className="border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-display text-2xl">
              {t("admin.title")}
            </Link>
            <nav className="flex items-center gap-3 text-sm uppercase tracking-[0.2em] text-white/70">
              <Link
                href="/admin"
                className={pathname === "/admin" ? "text-lucky-green" : "transition hover:text-white"}
              >
                {t("admin.products")}
              </Link>
              <span className="text-white/30">/</span>
              <Link
                href="/admin/orders"
                className={
                  pathname?.startsWith("/admin/orders")
                    ? "text-lucky-green"
                    : "transition hover:text-white"
                }
              >
                {t("admin.orders")}
              </Link>
              <span className="text-white/30">/</span>
              <Link
                href="/admin/promo-codes"
                className={
                  pathname?.startsWith("/admin/promo-codes")
                    ? "text-lucky-green"
                    : "transition hover:text-white"
                }
              >
                {t("admin.promoCodes")}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!isAdmin}
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              {t("admin.logOut")}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}
