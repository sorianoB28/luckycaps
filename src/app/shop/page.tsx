"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpDown, Check, Loader2, RotateCcw, Sparkles, Tag } from "lucide-react";

import { ProductImageWithFallback } from "@/components/products/ProductImageWithFallback";
import { getProducts, type Product } from "@/lib/api";
import { getPlaceholderImages } from "@/lib/placeholderImages";
import { Slider } from "@/components/ui/slider";
import { formatCategory } from "@/lib/formatCategory";
import { buildCloudinaryCardUrl } from "@/lib/cloudinaryUrl";
import { getCategoriesFromProducts, type CategoryInfo } from "@/lib/categories";
import { useT } from "@/components/providers/LanguageProvider";

type SortOption = "featured" | "price-asc" | "price-desc" | "newest";

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const effectivePrice = (product: Product) =>
  product.is_sale && product.sale_price_cents != null
    ? product.sale_price_cents
    : product.price_cents;

export default function ShopPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [onlyNew, setOnlyNew] = useState(false);
  const [onlySale, setOnlySale] = useState(false);
  const [sort, setSort] = useState<SortOption>("featured");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [priceBounds, setPriceBounds] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getProducts();
        if (cancelled) return;
        setProducts(res);
        if (res.length) {
          const prices = res.map((p) => effectivePrice(p));
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          setPriceBounds([min, max]);
          setPriceRange([min, max]);
        } else {
          setPriceBounds([0, 0]);
          setPriceRange([0, 0]);
        }
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || "Unable to load products.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories: CategoryInfo[] = useMemo(
    () => getCategoriesFromProducts(products),
    [products]
  );

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (!categoryParam || selectedCategories.length) return;
    const normalized = categoryParam.trim().toLowerCase();
    if (!normalized) return;
    const exists = categories.some((c) => c.key === normalized);
    if (exists) {
      setSelectedCategories([normalized]);
    }
  }, [categories, searchParams, selectedCategories.length]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategories.length) {
      list = list.filter((p) =>
        selectedCategories.includes((p.category ?? "").trim().toLowerCase())
      );
    }

    if (onlyNew) {
      list = list.filter((p) => p.is_new_drop);
    }

    if (onlySale) {
      list = list.filter(
        (p) => p.is_sale || (p.sale_price_cents ?? null) !== null
      );
    }

    if (priceRange[1] > 0) {
      list = list.filter((p) => {
        const price = effectivePrice(p);
        return price >= priceRange[0] && price <= priceRange[1];
      });
    }

    switch (sort) {
      case "price-asc":
        list.sort((a, b) => effectivePrice(a) - effectivePrice(b));
        break;
      case "price-desc":
        list.sort((a, b) => effectivePrice(b) - effectivePrice(a));
        break;
      case "newest":
        list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
        break;
      default:
        list.sort((a, b) => {
          const newDropDiff = Number(b.is_new_drop) - Number(a.is_new_drop);
          if (newDropDiff !== 0) return newDropDiff;
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
        });
    }

    return list;
  }, [products, selectedCategories, onlyNew, onlySale, priceRange, sort]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setOnlyNew(false);
    setOnlySale(false);
    setPriceRange(priceBounds);
    setSort("featured");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">
            {t("shop.kicker")}
          </p>
          <h1 className="font-display text-4xl text-white">{t("shop.heading")}</h1>
          <p className="mt-2 text-sm text-white/70">
            {t("shop.description")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/70">
            <Sparkles className="h-4 w-4 text-lucky-green" />
            <span>{t("shop.itemsCount", { count: filteredProducts.length })}</span>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-sm text-white transition hover:border-white/40"
          >
            <RotateCcw className="h-4 w-4" />
            {t("shop.reset")}
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[280px_1fr]">
        <aside className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              <ArrowUpDown className="h-4 w-4" />
              {t("shop.filters")}
            </div>
            <span className="text-xs text-white/50">{t("shop.refine")}</span>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white/80">{t("shop.categories")}</p>
            <div className="space-y-2">
              {categories.map((category) => (
                <label
                  key={category.key}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-sm transition hover:border-white/15 hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-lucky-green"
                    checked={selectedCategories.includes(category.key)}
                    onChange={() => toggleCategory(category.key)}
                  />
                  <span className="text-white/80">{category.label}</span>
                </label>
              ))}
              {categories.length === 0 ? (
                <p className="text-xs text-white/60">{t("shop.noCategories")}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-white/80">{t("shop.priceRange")}</p>
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>{formatPrice(priceBounds[0] ?? 0)}</span>
              <span>{formatPrice(priceBounds[1] ?? 0)}</span>
            </div>
          <div className="space-y-4">
            <Slider
              value={priceRange}
              min={priceBounds[0]}
              max={priceBounds[1]}
              step={100}
              onValueChange={(val) => {
                if (!val || val.length !== 2) return;
                setPriceRange([val[0], val[1]]);
              }}
            />
            <div className="flex items-center justify-between text-sm text-white/80">
              <span>{formatPrice(priceRange[0])}</span>
              <span>{formatPrice(priceRange[1])}</span>
            </div>
          </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-white/80">{t("shop.highlights")}</p>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-sm transition hover:border-white/15 hover:bg-white/5">
              <input
                type="checkbox"
                className="h-4 w-4 accent-lucky-green"
                checked={onlyNew}
                onChange={() => setOnlyNew((p) => !p)}
              />
              <span className="flex items-center gap-2 text-white/80">
                <Sparkles className="h-4 w-4 text-lucky-green" />
                {t("shop.newDropsFilter")}
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-sm transition hover:border-white/15 hover:bg-white/5">
              <input
                type="checkbox"
                className="h-4 w-4 accent-lucky-green"
                checked={onlySale}
                onChange={() => setOnlySale((p) => !p)}
              />
              <span className="flex items-center gap-2 text-white/80">
                <Tag className="h-4 w-4 text-lucky-green" />
                {t("shop.onSale")}
              </span>
            </label>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-white/70">
              {t("shop.showing", { shown: filteredProducts.length, total: products.length })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
                <ArrowUpDown className="h-4 w-4 text-white/60" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="bg-transparent text-sm text-white focus:outline-none"
                >
                  <option value="featured">{t("shop.featured")}</option>
                  <option value="price-asc">{t("shop.priceLowHigh")}</option>
                  <option value="price-desc">{t("shop.priceHighLow")}</option>
                  <option value="newest">{t("shop.newest")}</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("shop.loadingProducts")}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
              {error}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 bg-black/30 p-8 text-center text-white/70">
              <p className="text-lg font-semibold text-white">
                {t("shop.emptyTitle")}
              </p>
              <p className="mt-2 text-sm">
                {t("shop.emptyCopy")}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-white/40"
              >
                <Check className="h-4 w-4" />
                {t("shop.clearFilters")}
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const price = effectivePrice(product);
                const placeholder = getPlaceholderImages(
                  product.category,
                  product.slug,
                  2
                );
                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg transition hover:border-lucky-green/40 hover:shadow-[0_12px_40px_rgba(18,255,140,0.12)]"
                  >
                    <div className="relative aspect-square overflow-hidden bg-black/40">
                      <ProductImageWithFallback
                        src={buildCloudinaryCardUrl(product.image_url ?? undefined)}
                        alt={product.name}
                        category={product.category}
                        slug={product.slug}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        fallbacks={placeholder}
                      />
                      <div className="absolute left-3 top-3 flex flex-col gap-2">
                        {product.is_new_drop ? (
                          <span className="rounded-full bg-lucky-green px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-lucky-darker shadow">
                            New Drop
                          </span>
                        ) : null}
                        {product.is_sale ? (
                          <span className="rounded-full bg-red-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow">
                            Sale
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs tracking-[0.1em] text-white/70">
                          {formatCategory(product.category)}
                        </p>
                        <span className="text-[11px] text-white/50">
                          {new Date(product.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="line-clamp-1 font-display text-xl text-white">
                        {product.name}
                      </h3>
                      {product.description ? (
                        <p className="line-clamp-2 text-sm text-white/70">
                          {product.description}
                        </p>
                      ) : null}
                      <div className="mt-auto flex items-center justify-between">
                        {product.is_sale && product.sale_price_cents ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-lucky-green">
                              {formatPrice(price)}
                            </span>
                            <span className="text-sm text-white/50 line-through">
                              {formatPrice(
                                product.original_price_cents ??
                                  product.price_cents
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-lg font-semibold text-white">
                            {formatPrice(price)}
                          </span>
                        )}
                        <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition group-hover:border-lucky-green group-hover:text-lucky-green">
                          View
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
