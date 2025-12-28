"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/slugify";
import { Product } from "@/types";

export type ProductFormValues = {
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  salePrice?: number;
  originalPrice?: number;
  isSale: boolean;
  isNewDrop: boolean;
  stock: number;
  images: string[];
};

interface ProductFormProps {
  initialProduct?: Product;
  onSubmit: (values: ProductFormValues) => void;
  submitLabel: string;
}

const buildInitialForm = (product?: Product): ProductFormValues => ({
  name: product?.name ?? "",
  slug: product?.slug ?? "",
  category: product?.category ?? "",
  description: product?.description ?? "",
  price: product?.isSale ? product.salePrice ?? product.price : product?.price ?? 0,
  salePrice: product?.isSale
    ? product.salePrice ?? product.price
    : product?.salePrice,
  originalPrice: product?.originalPrice ?? undefined,
  isSale: product?.isSale ?? false,
  isNewDrop: product?.isNewDrop ?? false,
  stock: product?.stock ?? 0,
  images: product?.images ?? [],
});

export function ProductForm({
  initialProduct,
  onSubmit,
  submitLabel,
}: ProductFormProps) {
  const [form, setForm] = useState<ProductFormValues>(
    buildInitialForm(initialProduct)
  );
  const [slugEdited, setSlugEdited] = useState(
    initialProduct?.slug ? true : false
  );
  const [imageUrl, setImageUrl] = useState("");

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: slugEdited ? prev.slug : slugify(value),
    }));
  };

  const handleNumberChange = (
    e: ChangeEvent<HTMLInputElement>,
    key: keyof Pick<ProductFormValues, "price" | "salePrice" | "originalPrice" | "stock">
  ) => {
    const nextValue = e.target.value;
    setForm((prev) => ({
      ...prev,
      [key]:
        nextValue === "" ? (key === "stock" ? 0 : undefined) : Number(nextValue),
    }));
  };

  const handleAddImageUrl = () => {
    if (!imageUrl.trim()) return;
    setForm((prev) => ({ ...prev, images: [...prev.images, imageUrl.trim()] }));
    setImageUrl("");
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (result && typeof result === "string") {
          setForm((prev) => ({ ...prev, images: [...prev.images, result] }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const normalizedSlug = form.slug ? slugify(form.slug) : slugify(form.name);
    onSubmit({ ...form, slug: normalizedSlug });
  };

  const hasImages = useMemo(() => form.images.length > 0, [form.images.length]);

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="bg-white/5 text-white"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <div className="flex items-center gap-2">
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setForm((prev) => ({ ...prev, slug: e.target.value }));
                }}
                className="bg-white/5 text-white"
                required
              />
              <Button
                type="button"
                variant="secondary"
                className="bg-white/10"
                onClick={() => {
                  setSlugEdited(true);
                  setForm((prev) => ({
                    ...prev,
                    slug: slugify(prev.name),
                  }));
                }}
              >
                Auto
              </Button>
            </div>
            <p className="text-xs text-white/50">
              Must be unique; auto-generates from the name.
            </p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              className={cn(
                "min-h-[90px] w-full rounded-md border border-white/10 bg-white/5 p-3 text-sm text-white",
                "placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lucky-green/60"
              )}
              placeholder="Short product description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={form.category}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, category: e.target.value }))
              }
              className="bg-white/5 text-white"
              placeholder="Snapbacks, Beanies..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock">Stock</Label>
            <Input
              id="stock"
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) => handleNumberChange(e, "stock")}
              className="bg-white/5 text-white"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="price">Base Price</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price ?? 0}
              onChange={(e) => handleNumberChange(e, "price")}
              className="bg-white/5 text-white"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-lucky-green"
                checked={form.isSale}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isSale: e.target.checked }))
                }
              />
              On Sale
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Sale price"
                value={form.salePrice ?? ""}
                onChange={(e) => handleNumberChange(e, "salePrice")}
                className="bg-white/5 text-white"
                disabled={!form.isSale}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Original price"
                value={form.originalPrice ?? ""}
                onChange={(e) => handleNumberChange(e, "originalPrice")}
                className="bg-white/5 text-white"
                disabled={!form.isSale}
              />
            </div>
            <p className="text-xs text-white/50">
              When on sale, the red price is the sale price and the muted value
              is the crossed-out original.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-lucky-green"
                checked={form.isNewDrop}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isNewDrop: e.target.checked }))
                }
              />
              Mark as New Drop
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="image-url">Add image by URL</Label>
              <div className="flex gap-2">
                <Input
                  id="image-url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-white/5 text-white"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="bg-white/10"
                  onClick={handleAddImageUrl}
                >
                  Add
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-file">Upload for preview</Label>
              <Input
                id="image-file"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="bg-white/5 text-white"
              />
              <p className="text-xs text-white/50">
                Uploads are stored as data URLs for preview/persistence. You can
                also paste hosted URLs.
              </p>
            </div>
          </div>

          {hasImages ? (
            <div className="grid gap-3 md:grid-cols-3">
              {form.images.map((src, idx) => (
                <div
                  key={`${src}-${idx}`}
                  className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40"
                >
                  <div className="relative h-32 w-full">
                    <Image src={src} alt={`Preview ${idx + 1}`} fill className="object-cover" />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 text-xs text-white/70">
                    <span className="truncate">
                      {src.startsWith("data:") ? "Uploaded preview" : src}
                    </span>
                    <button
                      type="button"
                      className="text-red-400 hover:text-red-300"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/50">
              No images yet. Add a URL or upload for preview.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
