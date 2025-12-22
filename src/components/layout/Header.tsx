"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ShoppingBag, Globe, Menu, User } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";
import CartDrawer from "@/components/cart/CartDrawer";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: { EN: "Home", ES: "Inicio" } },
  { href: "/shop", label: { EN: "Shop", ES: "Tienda" } },
  { href: "/about", label: { EN: "Story", ES: "Historia" } },
];

export default function Header() {
  const { toggleLanguage, language, cartOpen, setCartOpen } = useUIStore();
  const items = useCartStore((state) => state.items);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const previousCount = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [cartPulseKey, setCartPulseKey] = useState(0);

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
            className="h-10 w-10 rounded-full bg-lucky-green/20 text-lucky-green flex items-center justify-center font-display text-xl"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            LC
          </motion.div>
          <div>
            <p className="font-display text-2xl tracking-wide">Lucky Caps</p>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              Lucky Supply
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
            >
              {link.label[language]}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            aria-label="Toggle language"
          >
            <Globe className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" asChild aria-label="Account">
            <Link href="/account">
              <User className="h-5 w-5" />
            </Link>
          </Button>

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
              aria-label="Open cart"
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
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <p className="font-display text-xl">Menu</p>
                </div>
                <div className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "text-lg uppercase tracking-[0.2em] text-white/80",
                        "hover:text-white"
                      )}
                    >
                      {link.label[language]}
                    </Link>
                  ))}
                  <Link
                    href="/account"
                    className="text-lg uppercase tracking-[0.2em] text-white/80 hover:text-white"
                  >
                    {language === "EN" ? "Account" : "Cuenta"}
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
