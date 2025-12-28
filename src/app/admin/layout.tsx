"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAdminStore } from "@/store/adminStore";
import { useTranslations } from "@/lib/translations";

const ADMIN_OPEN = true;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin, logout } = useAdminStore();
  const allowAccess = ADMIN_OPEN || isAdmin;
  const t = useTranslations();
  const [hydrated, setHydrated] = useState(
    // fall back to true for non-persist environments
    (useAdminStore.persist as any)?.hasHydrated?.() ?? true
  );

  useEffect(() => {
    const unsub = (useAdminStore.persist as any)?.onFinishHydration?.(() =>
      setHydrated(true)
    );
    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!allowAccess && pathname !== "/admin/login") {
      router.replace("/admin/login");
    }
  }, [allowAccess, hydrated, pathname, router]);

  const showShell = pathname !== "/admin/login";

  return (
    <div className="min-h-screen bg-lucky-dark text-white">
      {showShell ? (
        <header className="border-b border-white/10 bg-black/30 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="font-display text-2xl">
                Admin
              </Link>
              <nav className="flex items-center gap-4 text-sm uppercase tracking-[0.2em] text-white/70">
                <Link
                  href="/admin"
                  className={
                    pathname === "/admin"
                      ? "text-white"
                      : "transition hover:text-white"
                  }
                >
                  Products
                </Link>
                <Link
                  href="/admin/products/new"
                  className={
                    pathname?.startsWith("/admin/products/new")
                      ? "text-white"
                      : "transition hover:text-white"
                  }
                >
                  {t.actions.addProduct}
                </Link>
              </nav>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                router.replace("/admin/login");
              }}
            >
              Log out
            </Button>
          </div>
        </header>
      ) : null}
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}
