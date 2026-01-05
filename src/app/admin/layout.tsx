"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
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

  useEffect(() => {
    if (status === "loading") return;
    if (!isAdmin) {
      router.replace(`/auth/sign-in?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAdmin, pathname, router, status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-lucky-dark text-white px-4 py-10">
        {t("admin.checkingAccess")}
      </div>
    );
  }

  if (!isAdmin) {
    return null;
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
