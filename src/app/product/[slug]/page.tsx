"use client";

import Link from "next/link";

import { products } from "@/data/products";
import ProductGallery from "@/components/products/ProductGallery";
import ProductPurchasePanel from "@/components/products/ProductPurchasePanel";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/lib/translations";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";

interface ProductPageProps {
  params: { slug: string };
}

export default function ProductPage({ params }: ProductPageProps) {
  const t = useTranslations();
  const product = products.find((item) => item.slug === params.slug);

  if (!product) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-xl font-semibold text-white">{t.messages.productNotFound}</p>
        <p className="mt-2 text-white/70">
          {t.actions.explore} {t.nav.shop}
        </p>
        <div className="mt-6">
          <Link
            href="/shop"
            className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-lucky-green hover:text-lucky-green"
          >
            {t.nav.shop}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            {product.isNewDrop ? <Badge variant="green">{t.badges.newDrop}</Badge> : null}
            {product.isSale ? <Badge>{t.badges.sale}</Badge> : null}
          </div>
          <ProductGallery
            images={product.images}
            name={product.name}
            category={product.category}
            slug={product.slug}
          />
        </div>
        <ProductPurchasePanel product={product} />
      </div>
      <ReviewsSection
        productId={product.id}
        productSlug={product.slug}
        productName={product.name}
        variants={product.variants}
        sizes={product.sizes}
      />
    </div>
  );
}
