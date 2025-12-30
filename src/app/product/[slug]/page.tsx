"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getProductBySlug, ProductDetailResponse } from "@/lib/api";
import { useCart } from "@/store/cart";

type ProductPageProps = {
  params: { slug: string };
};

export default function ProductPage({ params }: ProductPageProps) {
  const router = useRouter();
  const addToCart = useCart((s) => s.addItem);
  const [data, setData] = useState<ProductDetailResponse | null>(null);
  const [variant, setVariant] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getProductBySlug(params.slug)
      .then((res) => {
        if (!mounted) return;
        setData(res);
        setVariant(res.variants[0]?.name ?? null);
        setSize(res.sizes[0]?.name ?? null);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        if ((err as Error).message.includes("404")) {
          setError("Product not found");
        } else {
          setError("Unable to load product");
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [params.slug]);

  const priceDisplay = useMemo(() => {
    if (!data) return "";
    const cents =
      data.product.is_sale && data.product.sale_price_cents != null
        ? data.product.sale_price_cents
        : data.product.price_cents;
    return `$${(cents / 100).toFixed(2)}`;
  }, [data]);

  const primaryImage = data?.images[0]?.url;

  const handleAddToCart = () => {
    if (!data) return;
    addToCart({
      productId: data.product.id,
      productSlug: data.product.slug,
      name: data.product.name,
      imageUrl: primaryImage,
      priceCents:
        data.product.is_sale && data.product.sale_price_cents != null
          ? data.product.sale_price_cents
          : data.product.price_cents,
      variant,
      size,
      quantity: 1,
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-white/70">
        Loading product…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-xl font-semibold text-white">{error ?? "Product not found"}</p>
        <p className="mt-2 text-white/70">Try browsing other products.</p>
        <div className="mt-6">
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-lucky-green hover:text-lucky-green"
            onClick={() => router.push("/shop")}
          >
            Back to shop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          {primaryImage ? (
            <div className="aspect-square overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <img
                src={primaryImage}
                alt={data.product.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-3xl border border-dashed border-white/20 bg-white/5 text-white/60">
              No image available
            </div>
          )}
        </div>

        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              {data.product.category}
            </p>
            <h1 className="font-display text-4xl">{data.product.name}</h1>
            <p className="text-lg font-semibold text-white">{priceDisplay}</p>
            <p className="text-sm text-white/70">{data.product.description}</p>
            <p className="text-sm text-white/60">Stock: {data.product.stock}</p>
          </div>

          {data.variants.length ? (
            <div className="space-y-2">
              <label className="text-sm text-white/80">Variant</label>
              <select
                value={variant ?? ""}
                onChange={(e) => setVariant(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-black/40 p-2 text-white"
              >
                {data.variants.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {data.sizes.length ? (
            <div className="space-y-2">
              <label className="text-sm text-white/80">Size</label>
              <select
                value={size ?? ""}
                onChange={(e) => setSize(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-black/40 p-2 text-white"
              >
                {data.sizes.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <button
            type="button"
            className="w-full rounded-full bg-lucky-green px-4 py-3 font-semibold text-lucky-darker transition hover:brightness-110"
            onClick={handleAddToCart}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
