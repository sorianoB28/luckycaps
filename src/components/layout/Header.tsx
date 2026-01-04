"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag, Menu, User, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/store/cart";
import { useUIStore } from "@/store/uiStore";
import CartDrawer from "@/components/cart/CartDrawer";
import { cn } from "@/lib/utils";
import { useLanguage, useT } from "@/components/providers/LanguageProvider";
import { signOut, useSession } from "next-auth/react";

const navLinks = [
  { href: "/", key: "home" as const },
  { href: "/shop", key: "shop" as const },
  { href: "/about", key: "story" as const },
];

export default function Header() {
  const { cartOpen, setCartOpen } = useUIStore();
  const { setLanguage, language } = useLanguage();
  const { data: session, status } = useSession();
  const isAuthed = status === "authenticated";
  const isAdmin = session?.user?.role === "admin";
  const items = useCart((state) => state.items);
  const itemCount = Object.values(items).reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const previousCount = useRef<number | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const prefersReducedMotion = useReducedMotion();
  const [cartPulseKey, setCartPulseKey] = useState(0);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  useEffect(() => {
    if (previousCount.current === null) {
      previousCount.current = itemCount;
      return;
    }
    if (itemCount > previousCount.current && !prefersReducedMotion) {
      setCartPulseKey((prev) => prev + 1);
    }
    previousCount.current = itemCount;
  }, [itemCount, prefersReducedMotion]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-lucky-dark/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <motion.div
            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/20 bg-black"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Image
              src="/brand/luckycaps-logo.png"
              alt={t("header.logoAlt")}
              width={48}
              height={48}
              className="h-full w-full object-cover"
              priority
            />
          </motion.div>
          <div>
            <p className="font-display text-2xl tracking-wide">Lucky Caps</p>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              {t("footer.tagline")}
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm uppercase tracking-[0.2em] transition",
                isActive(link.href)
                  ? "text-white"
                  : "text-white/70 hover:text-white"
              )}
            >
              {t(`nav.${link.key}`)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em]">
            <button
              type="button"
              onClick={() => setLanguage("EN")}
              className={cn(
                "transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green",
                language === "EN"
                  ? "text-white"
                  : "text-white/60 hover:text-white"
              )}
              aria-label={t("header.switchToEnglish")}
            >
              {t("langToggle.en")}
            </button>
            <span className="text-white/40">|</span>
            <button
              type="button"
              onClick={() => setLanguage("ES")}
              className={cn(
                "transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green",
                language === "ES"
                  ? "text-white"
                  : "text-white/60 hover:text-white"
              )}
              aria-label={t("header.switchToSpanish")}
            >
              {t("langToggle.es")}
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("header.accountMenu")}>
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[180px] border-white/10 bg-lucky-dark text-white shadow-2xl"
            >
              <DropdownMenuItem asChild>
                <Link href={isAuthed ? "/account" : "/auth/sign-in"} className="w-full">
                  {t("nav.account")}
                </Link>
              </DropdownMenuItem>
              {isAdmin ? (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="w-full">
                    {t("nav.admin")}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator className="bg-white/10" />
              {isAuthed ? (
                <DropdownMenuItem
                  className="text-red-400 focus:text-red-300"
                  onSelect={(e) => {
                    e.preventDefault();
                    signOut();
                    router.push("/");
                  }}
                >
                  {t("auth.signOut")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/auth/sign-in" className="w-full">
                    {t("auth.signIn")}
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <motion.div
            key={cartPulseKey}
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    scale: [1, 1.08, 1],
                    boxShadow: [
                      "0 0 0 rgba(0,0,0,0)",
                      "0 0 18px rgba(0, 157, 0, 0.45)",
                      "0 0 0 rgba(0,0,0,0)",
                    ],
                  }
            }
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="rounded-full"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCartOpen(true)}
              aria-label={t("header.openCart")}
              className="relative"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-lucky-green text-[10px] font-bold text-lucky-darker">
                  {itemCount}
                </span>
              ) : null}
            </Button>
          </motion.div>

          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetContent className="flex flex-col">
              <CartDrawer />
            </SheetContent>
          </Sheet>

          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t("header.openMenu")}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="flex w-[70vw] max-w-xs flex-col gap-5 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg">{t("header.menuTitle")}</p>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" aria-label={t("header.closeMenu")}>
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                </div>

                <div className="flex flex-col gap-3">
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className={cn(
                          "text-base uppercase tracking-[0.2em] transition",
                          isActive(link.href)
                            ? "text-white"
                            : "text-white/80 hover:text-white"
                        )}
                      >
                        {t(`nav.${link.key}`)}
                      </Link>
                    </SheetClose>
                  ))}

                  <SheetClose asChild>
                    <Link
                      href={isAuthed ? "/account" : "/auth/sign-in"}
                      className="text-base uppercase tracking-[0.2em] text-white/80 hover:text-white"
                    >
                      {t("nav.account")}
                    </Link>
                  </SheetClose>

                  {isAdmin ? (
                    <SheetClose asChild>
                      <Link
                        href="/admin"
                        className="text-base uppercase tracking-[0.2em] text-white/80 hover:text-white"
                      >
                        {t("nav.admin")}
                      </Link>
                    </SheetClose>
                  ) : null}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
