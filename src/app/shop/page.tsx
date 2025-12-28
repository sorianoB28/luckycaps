"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { products } from "@/data/products";
import ProductCard from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useTranslations } from "@/lib/translations";

export default function ShopPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortOptions = useMemo(
    () => [
      { value: "featured", label: t.shop.featured },
      { value: "newest", label: t.shop.newest },
      { value: "low", label: t.shop.priceLow },
      { value: "high", label: t.shop.priceHigh },
    ],
    [t]
  );
  const getEffectivePrice = (product: (typeof products)[number]) =>
    product.isSale && product.salePrice ? product.salePrice : product.price;

  const categories = Array.from(new Set(products.map((product) => product.category)));
  const priceBounds = useMemo(() => {
    const prices = products.map(getEffectivePrice);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, []);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showNewDrop, setShowNewDrop] = useState(false);
  const [showSale, setShowSale] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    priceBounds.min,
    priceBounds.max,
  ]);
  const [sort, setSort] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const didInitFromUrl = useRef(false);

  useEffect(() => {
    if (didInitFromUrl.current) return;
    const urlCategory = searchParams.get("category");
    if (urlCategory && categories.includes(urlCategory)) {
      setSelectedCategories([urlCategory]);
      setFiltersOpen(true);
    }
    didInitFromUrl.current = true;
  }, [categories, searchParams]);

  const filtered = useMemo(() => {
    let list = products.filter((product) => {
      const price = getEffectivePrice(product);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    if (selectedCategories.length) {
      list = list.filter((product) =>
        selectedCategories.includes(product.category)
      );
    }

    if (showNewDrop) {
      list = list.filter((product) => product.isNewDrop);
    }

    if (showSale) {
      list = list.filter((product) => product.isSale);
    }

    switch (sort) {
      case "newest":
        list = [...list].sort(
          (a, b) => Number(b.isNewDrop) - Number(a.isNewDrop)
        );
        break;
      case "low":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "high":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }

    return list;
  }, [priceRange, selectedCategories, showNewDrop, showSale, sort]);

  const syncCategoryToUrl = (nextCategories: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextCategories.length === 1) {
      params.set("category", nextCategories[0]);
    } else {
      params.delete("category");
    }
    router.replace(`/shop?${params.toString()}`, { scroll: false });
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      const next = prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category];
      syncCategoryToUrl(next);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-heading">{t.shop.title}</p>
          <h1 className="mt-2 font-display text-4xl">{t.shop.heading}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="md:hidden"
            onClick={() => setFiltersOpen((prev) => !prev)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" /> {t.actions.filters}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {t.actions.sort}: {sortOptions.find((option) => option.value === sort)?.label}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSort(option.value)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-[260px_1fr]">
        <aside
          className={`space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 md:block ${
            filtersOpen ? "block" : "hidden"
          }`}
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              {t.shop.categories}
            </p>
            <div className="mt-4 space-y-3">
              {categories.map((category) => (
                <div key={category} className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedCategories.includes(category)}
                    onClick={() => toggleCategory(category)}
                    aria-label={`Filter by ${category}`}
                  />
                  <span className="text-sm text-white/70">{category}</span>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              {t.shop.priceRange}
            </p>
            <div className="mt-4 space-y-3">
              <Slider
                value={priceRange}
                min={priceBounds.min}
                max={priceBounds.max}
                step={1}
                minStepsBetweenThumbs={1}
                className="py-2"
                onValueChange={(value) => {
                  if (value.length === 2) setPriceRange([value[0], value[1]]);
                }}
                aria-label="Price range"
              />
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>${priceRange[0]}</span>
                <span>
                  {t.shop.upTo} ${priceRange[1]}
                </span>
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={showNewDrop}
                onClick={() => setShowNewDrop((prev) => !prev)}
                aria-label="Filter new drops"
              />
              <span className="text-sm text-white/70">{t.shop.newDrop}</span>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={showSale}
                onClick={() => setShowSale((prev) => !prev)}
                aria-label="Filter sale"
              />
              <span className="text-sm text-white/70">{t.shop.sale}</span>
            </div>
          </div>
        </aside>

        <div>
          <p className="text-sm text-white/60">
            {filtered.length} {t.shop.productsSuffix}
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
