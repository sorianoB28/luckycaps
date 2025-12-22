"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg"
    >
      <Link href={`/product/${product.slug}`} className="relative block">
        <div className="relative h-56 w-full overflow-hidden bg-white/5">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
            {product.isNewDrop ? (
              <Badge className="rounded-none bg-lucky-green px-3 py-1 text-xs font-bold uppercase tracking-wide text-lucky-darker">
                New Drop
              </Badge>
            ) : null}
            {product.isSale ? (
              <Badge className="rounded-none bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                Sale
              </Badge>
            ) : null}
          </div>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">
          {product.category}
        </p>
        <h3 className="mt-2 font-display text-2xl">{product.name}</h3>
        <p className="mt-2 text-sm text-white/60">
          {product.description}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          {product.isSale && product.originalPrice ? (
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-red-500">
                From ${product.price}
              </p>
              <p className="text-sm text-white/40 line-through">
                ${product.originalPrice}
              </p>
            </div>
          ) : (
            <p className="text-lg font-semibold">${product.price}</p>
          )}
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/product/${product.slug}`}>View</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
