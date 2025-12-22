import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";

import { products } from "@/data/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/products/ProductCard";
import LocaleText from "@/components/layout/LocaleText";

<<<<<<< HEAD
const heroBackground =
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80";
=======
const heroBackground = "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80";
>>>>>>> 2e5e4cd (fix: resolve home page parse error)

export default function HomePage() {
  const newDrops = products.filter((product) => product.isNewDrop).slice(0, 6);
  const categories = [
    { name: "Snapbacks", image: products[0].images[0] },
    { name: "Fitted", image: products[1].images[0] },
    { name: "Beanies", image: products[3].images[0] },
    { name: "Packs", image: products[5].images[0] },
  ];

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={heroBackground}
            alt="Cinematic city street background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-lucky-darker" />
          <div className="absolute inset-0 bg-hero-gradient opacity-80" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 py-20 md:px-8 lg:flex-row lg:items-center">
<<<<<<< HEAD
const categories = [
  { name: "Snapbacks", image: "/products/cap-01.svg" },
  { name: "Fitted", image: "/products/cap-02.svg" },
  { name: "Beanies", image: "/products/cap-04.svg" },
  { name: "Packs", image: "/products/cap-06.svg" },
];

export default function HomePage() {
  const newDrops = products.filter((product) => product.isNewDrop).slice(0, 6);

  return (
    <div>
      <section className="bg-lucky-dark">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-16 md:px-8 lg:flex-row lg:items-center">
=======
>>>>>>> 2e5e4cd (fix: resolve home page parse error)
          <div className="flex-1 space-y-6">
            <Badge variant="green">NEW DROP</Badge>
            <h1 className="font-display text-5xl tracking-wide md:text-7xl">
              WEAR YOUR LUCK.
            </h1>
            <p className="max-w-xl text-lg text-white/70">
              Premium caps, custom embroidery, and entrepreneur packs built for
              late-night founders.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link href="/shop">
                  <LocaleText en="Shop Collection" es="Comprar Colección" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/shop">
                  <LocaleText en="Custom Lab" es="Laboratorio" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-lucky-green" />
                4.9 / 5 from 2,000+ drops
              </div>
              <div>Limited batch releases weekly</div>
            </div>
          </div>
          <div className="relative flex-1">
            <div className="absolute -top-10 right-6 h-64 w-64 rounded-full bg-lucky-green/20 blur-3xl" />
            <div className="relative grid gap-4 sm:grid-cols-2">
              {products.slice(0, 4).map((product) => (
                <div
                  key={product.id}
                  className="glass-panel p-4 transition hover:-translate-y-1"
                >
                  <div className="relative h-32 w-full overflow-hidden rounded-xl">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="mt-3 text-sm text-white/70">{product.name}</p>
                  <p className="text-sm font-semibold">${product.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-heading">New Drops</p>
            <h2 className="mt-3 font-display text-4xl">Fresh off the press</h2>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/shop" className="flex items-center gap-2">
              Explore <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 flex gap-6 overflow-x-auto pb-4">
          {newDrops.map((product) => (
            <div key={product.id} className="min-w-[260px] max-w-[260px]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-lucky-dark">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <p className="section-heading">Featured Categories</p>
          <h2 className="mt-3 font-display text-4xl">Built for every drop</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-4">
            {categories.map((category) => (
              <div
                key={category.name}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition group-hover:opacity-100" />
                <div className="relative h-32 w-full overflow-hidden rounded-2xl">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="mt-4 text-lg font-semibold">{category.name}</p>
                <p className="text-sm text-white/60">
                  Limited runs, premium materials.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="grid gap-8 rounded-3xl border border-white/10 bg-white/5 p-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="section-heading">Entrepreneur Packs</p>
            <h2 className="mt-3 font-display text-4xl">Build your founder kit</h2>
            <p className="mt-3 text-white/70">
              Curated packs for late-night launchers. Two caps, custom tokens,
              and access to the Lucky Custom Lab.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/shop">Reserve a pack</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {products.slice(5, 7).map((product) => (
              <div
                key={product.id}
                className="rounded-2xl border border-white/10 bg-lucky-dark p-4"
              >
                <div className="relative h-28 w-full overflow-hidden rounded-xl">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="mt-3 text-sm text-white/70">{product.name}</p>
                <p className="text-sm font-semibold">${product.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-lucky-dark">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-center md:grid-cols-3 md:px-8">
          {[
            "Fast global shipping",
            "Limited editions weekly",
            "Custom embroidery studio",
          ].map((item) => (
            <div key={item} className="text-sm uppercase tracking-[0.3em]">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <p className="section-heading">Lucky Social</p>
        <h2 className="mt-3 font-display text-4xl">Seen on the founders</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/5"
            >
              <Image
                src={products[index % products.length].images[0]}
                alt="Lucky Caps social gallery"
<<<<<<< HEAD
                src={`/products/cap-0${(index % 6) + 1}.svg`}
                alt="Lucky Caps social placeholder"
=======
>>>>>>> 2e5e4cd (fix: resolve home page parse error)
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
