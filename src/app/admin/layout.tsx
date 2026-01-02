"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/translations";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const t = useTranslations();
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (status === "loading") return;
    if (!isAdmin) {
      router.replace(`/auth/sign-in?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAdmin, pathname, router, status]);

  if (status === "loading") {
    return <div className="min-h-screen bg-lucky-dark text-white px-4 py-10">Checking access...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-lucky-dark text-white">
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!isAdmin}
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}
