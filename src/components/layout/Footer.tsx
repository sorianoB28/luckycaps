import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-lucky-dark">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:grid-cols-3 md:px-8">
        <div>
          <p className="font-display text-2xl tracking-wide">Lucky Caps</p>
          <p className="mt-2 text-sm text-white/60">
            Premium streetwear headwear designed for the builders, hustlers, and
            founders.
          </p>
        </div>
        <div className="text-sm text-white/60">
          <p className="uppercase tracking-[0.2em] text-white/70">Collections</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/shop">New Drops</Link>
            <Link href="/shop">Entrepreneur Packs</Link>
            <Link href="/shop">Custom Lab</Link>
          </div>
        </div>
        <div className="text-sm text-white/60">
          <p className="uppercase tracking-[0.2em] text-white/70">Support</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/about">Brand Story</Link>
            <Link href="/account">Account</Link>
            <Link href="/cart">Cart</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-white/40">
        © 2025 Lucky Caps. All rights reserved.
      </div>
    </footer>
  );
}
