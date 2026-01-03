"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { ProductForm, ProductFormValues } from "@/app/admin/components/ProductForm";
import { Button } from "@/components/ui/button";
import {
  AdminProduct,
  AdminProductPayload,
  deleteAdminProduct,
  getAdminProduct,
  updateAdminProduct,
} from "@/lib/api";
import { normalizeSize, sortSizes } from "@/lib/sizeOptions";
import { Product } from "@/types";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = useMemo(
    () => (Array.isArray(params.id) ? params.id[0] : params.id),
    [params.id]
  );
  const { data: session, status } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isAdmin = useMemo(() => session?.user?.role === "admin", [session?.user?.role]);

  const mapAdminToProduct = useCallback(
    (item: AdminProduct): Product => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      price:
        item.is_sale && item.sale_price_cents != null
          ? item.sale_price_cents / 100
          : item.price_cents / 100,
      salePrice: item.sale_price_cents != null ? item.sale_price_cents / 100 : undefined,
      originalPrice: item.original_price_cents != null ? item.original_price_cents / 100 : undefined,
      images:
        item.images && item.images.length
          ? item.images
          : item.image_url
          ? [item.image_url]
          : [],
      category: item.category,
      tags: item.tags ?? [],
      description: item.description ?? "",
      features: item.features ?? [],
      isNewDrop: item.is_new_drop,
      isSale: item.is_sale,
      variants: [],
      sizes: sortSizes(
        (item.sizes ?? [])
          .map((s) => normalizeSize(s))
          .filter((s): s is string => Boolean(s))
      ),
      stock: item.stock,
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAdminProduct(productId);
        if (cancelled) return;
        setProduct(mapAdminToProduct(data));
      } catch (err) {
        if (cancelled) return;
        const status = (err as Error & { status?: number }).status;
        if (status === 401) {
          setError("Unauthorized. Check admin access.");
        } else if ((err as Error).message?.includes("Not found")) {
          setError("Product not found.");
        } else {
          setError((err as Error).message || "Unable to load product.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (status === "loading") return;
    if (!isAdmin) {
      router.replace(`/auth/sign-in?redirect=${encodeURIComponent(`/admin/products/${productId}`)}`);
      return;
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, mapAdminToProduct, productId, router, status]);

  const toPayload = (values: ProductFormValues): AdminProductPayload => ({
    name: values.name.trim(),
    slug: values.slug.trim(),
    category: values.category.trim().toLowerCase(),
    description: values.description.trim(),
    price: values.isSale ? values.salePrice ?? values.price : values.price,
    salePrice: values.isSale ? values.salePrice ?? values.price : null,
    originalPrice: values.isSale
      ? values.originalPrice ?? values.price
      : values.originalPrice ?? undefined,
    isSale: values.isSale,
    isNewDrop: values.isNewDrop,
    stock: values.stock ?? 0,
    images: values.images
      .filter((img) => img.url && !img.url.startsWith("data:"))
      .map((img) => ({ url: img.url, publicId: img.publicId })),
    sizes: values.sizes,
  });

  const handleUpdate = async (values: ProductFormValues) => {
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    try {
      await updateAdminProduct(productId, toPayload(values));
      router.replace("/admin");
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status === 401) {
        setError("Unauthorized. Check admin access.");
      } else {
        setError((err as Error).message || "Unable to update product.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">
            Admin
          </p>
          <h1 className="font-display text-4xl">Edit Product</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            variant="ghost"
            className="text-red-400 hover:text-red-300"
            onClick={async () => {
              if (!isAdmin) return;
              if (!confirm("Delete this product?")) return;
              setSaving(true);
              try {
                await deleteAdminProduct(productId);
                router.replace("/admin");
              } catch (err) {
                const status = (err as Error & { status?: number }).status;
                if (status === 401) {
                  setError("Unauthorized. Check admin access.");
                } else {
                  setError((err as Error).message || "Unable to delete product.");
                }
              } finally {
                setSaving(false);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? (
        <p className="text-white/70">Loading product...</p>
      ) : product ? (
        <>
          <ProductForm
            initialProduct={product}
            submitLabel={saving ? "Saving..." : "Save Changes"}
            onSubmit={handleUpdate}
          />
        </>
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-white/80">
          <p className="font-semibold">Product not found.</p>
          <p className="text-sm text-white/60">
            The item may have been removed. Return to the dashboard to view the
            current catalog.
          </p>
          <div className="mt-4">
            <Button onClick={() => router.replace("/admin")}>Back to Admin</Button>
          </div>
        </div>
      )}
    </div>
  );
}
