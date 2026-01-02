"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/slugify";
import { Product } from "@/types";

const isHttpUrl = (url?: string | null) => !!url && /^https?:\/\//i.test(url);

const PLACEHOLDER_IMAGE = "/images/placeholder-product.svg";

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
  images: { url: string; publicId?: string | null }[];
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
  images: (product?.images ?? []).map((url) => ({ url })),
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
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<
    { name: string; status: "uploading" | "uploaded" | "failed"; message?: string }[]
  >([]);
  const fileInputId = "product-image-file";

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
    setForm((prev) => ({
      ...prev,
      images: [...prev.images, { url: imageUrl.trim() }],
    }));
    setImageUrl("");
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || uploading) return;

    setUploading(true);
    setUploadErrors([]);
    const incoming = Array.from(files).map((file) => ({
      name: file.name,
      status: "uploading" as const,
    }));
    setUploadStatuses((prev) => [...prev, ...incoming]);

    const data = new FormData();
    Array.from(files).forEach((file) => data.append("files", file));

    try {
      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        body: data,
      });
      let payload: { error?: string; images?: { url: string; publicId?: string }[] } = {};
      try {
        payload = (await res.json()) as typeof payload;
      } catch {
        // ignore parse errors
      }
      if (!res.ok || !payload.images) {
        const baseMessage =
          res.status === 401 || res.status === 403
            ? "Your admin session expired. Please sign in again."
            : payload.error
            ? `${payload.error} (status ${res.status})`
            : `Upload failed (status ${res.status})`;
        throw new Error(baseMessage);
      }
      const urls = payload.images.map((img) => img.url).filter(Boolean);
      if (urls.length) {
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, ...urls.map((url) => ({ url }))],
        }));
      }
      setUploadStatuses((prev) =>
        prev.map((s, idx) =>
          idx >= prev.length - incoming.length ? { ...s, status: "uploaded" } : s
        )
      );
      // clear input value so same file can be selected again
      const inputEl = document.getElementById(fileInputId) as HTMLInputElement | null;
      if (inputEl) inputEl.value = "";
    } catch (err) {
      const message = (err as Error).message || "Upload failed";
      setUploadErrors([
        message,
        "Check admin login and CLOUDINARY_* env vars.",
      ]);
      setUploadStatuses((prev) =>
        prev.map((s, idx) =>
          idx >= prev.length - incoming.length
            ? { ...s, status: "failed", message }
            : s
        )
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (submitBlockedReason) return;
    const normalizedSlug = form.slug ? slugify(form.slug) : slugify(form.name);
    onSubmit({ ...form, slug: normalizedSlug });
  };

  const hasImages = useMemo(() => form.images.length > 0, [form.images.length]);
  const hasInvalidImages = useMemo(
    () => form.images.some((img) => !isHttpUrl(img.url?.trim())),
    [form.images]
  );
  const submitBlockedReason = useMemo(() => {
    if (uploading) return "Please wait for uploads to finish.";
    if (uploadErrors.length) return uploadErrors[0];
    if (hasInvalidImages)
      return "Images must be uploaded to Cloudinary or use http(s) URLs.";
    return null;
  }, [uploadErrors, uploading, hasInvalidImages]);

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
                id={fileInputId}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                disabled={uploading}
                className="bg-white/5 text-white"
              />
              <p className="text-xs text-white/50">
                Select images to auto-upload to Cloudinary. You can also paste hosted URLs.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {uploading ? (
                <span className="text-xs text-white/70">Uploading...</span>
              ) : null}
            </div>
            {uploadErrors.length ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                <p className="font-semibold">Upload failed</p>
                <ul className="mt-1 space-y-1 text-xs">
                  {uploadErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {uploadStatuses.length ? (
              <div className="space-y-1 text-xs text-white/70">
                {uploadStatuses.map((stat, idx) => (
                  <div key={`${stat.name}-${idx}`} className="flex items-center gap-2">
                    <span className="truncate">{stat.name}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        stat.status === "uploaded"
                          ? "bg-lucky-green/20 text-lucky-green"
                          : stat.status === "failed"
                          ? "bg-red-500/20 text-red-200"
                          : "bg-white/10 text-white/70"
                      )}
                    >
                      {stat.status === "uploaded"
                        ? "Uploaded"
                        : stat.status === "failed"
                        ? "Failed"
                        : "Uploading..."}
                    </span>
                    {stat.message ? <span className="text-red-200">{stat.message}</span> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {hasImages ? (
            <div className="grid gap-3 md:grid-cols-3">
              {form.images.map((img, idx) => (
                <div
                  key={`${img.url}-${idx}`}
                  className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40"
                >
                  <div className="relative h-32 w-full">
                    <img
                      src={img.url?.trim() || PLACEHOLDER_IMAGE}
                      alt={`Preview ${idx + 1}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = PLACEHOLDER_IMAGE;
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 text-xs text-white/70">
                    <span className="truncate">{img.url}</span>
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
              No images yet. Add a URL or upload to Cloudinary.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={Boolean(submitBlockedReason)}
          title={submitBlockedReason ?? undefined}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
