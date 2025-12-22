"use client";

import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "low", label: "Price low" },
  { value: "high", label: "Price high" },
];

export default function ShopPage() {
  const categories = Array.from(
    new Set(products.map((product) => product.category))
  );
  const maxProductPrice = Math.max(...products.map((product) => product.price));

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showNewDrop, setShowNewDrop] = useState(false);
  const [showSale, setShowSale] = useState(false);
  const [maxPrice, setMaxPrice] = useState(maxProductPrice);
  const [sort, setSort] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = products.filter((product) => product.price <= maxPrice);

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
  }, [maxPrice, selectedCategories, showNewDrop, showSale, sort]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-heading">Shop</p>
          <h1 className="mt-2 font-display text-4xl">Lucky Collection</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="md:hidden"
            onClick={() => setFiltersOpen((prev) => !prev)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" /> Filters
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Sort: {sortOptions.find((option) => option.value === sort)?.label}
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
              Categories
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
              Price Range
            </p>
            <div className="mt-4 space-y-3">
              <Input
                type="range"
                min={30}
                max={maxProductPrice}
                value={maxPrice}
                onChange={(event) => setMaxPrice(Number(event.target.value))}
                aria-label="Filter by price"
              />
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>$30</span>
                <span>Up to ${maxPrice}</span>
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
              <span className="text-sm text-white/70">New Drop</span>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={showSale}
                onClick={() => setShowSale((prev) => !prev)}
                aria-label="Filter sale"
              />
              <span className="text-sm text-white/70">Sale</span>
            </div>
          </div>
        </aside>

        <div>
          <p className="text-sm text-white/60">{filtered.length} products</p>
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
