import Link from "next/link";

import { getProducts, Product } from "@/lib/api";

const formatPrice = (product: Product) => {
  const cents =
    product.is_sale && product.sale_price_cents != null
      ? product.sale_price_cents
      : product.price_cents;
  return `$${(cents / 100).toFixed(2)}`;
};

export default async function ShopPage() {
  const products = await getProducts();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-heading">Shop</p>
          <h1 className="mt-2 font-display text-4xl">Lucky Caps Collection</h1>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/70">
          No products available.
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-lucky-green/70 hover:shadow-[0_0_20px_rgba(104,240,160,0.2)]"
            >
              <div className="aspect-[4/3] bg-white/5">
                {product?.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                  No image
                </div>
              )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  {product.category}
                </p>
                <h3 className="mt-2 font-display text-2xl">{product.name}</h3>
                <p className="mt-3 text-sm text-white/70 line-clamp-3">
                  {product.description}
                </p>
                <p className="mt-4 text-lg font-semibold text-white">
                  {formatPrice(product)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
