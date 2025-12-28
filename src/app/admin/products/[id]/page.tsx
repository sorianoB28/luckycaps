"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ProductForm, ProductFormValues } from "@/app/admin/components/ProductForm";
import { Button } from "@/components/ui/button";
import { useProductsStore } from "@/store/productsStore";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = useMemo(
    () => (Array.isArray(params.id) ? params.id[0] : params.id),
    [params.id]
  );
  const { products, updateProduct, deleteProduct } = useProductsStore();
  const [hydrated, setHydrated] = useState(
    (useProductsStore.persist as any)?.hasHydrated?.() ?? true
  );

  useEffect(() => {
    const unsub = (useProductsStore.persist as any)?.onFinishHydration?.(() =>
      setHydrated(true)
    );
    return () => unsub?.();
  }, []);

  const product = products.find((p) => p.id === productId);

  useEffect(() => {
    if (!hydrated || product || !productId) return;
    // If a persisted product doesn't exist anymore, return to dashboard.
    router.replace("/admin");
  }, [hydrated, product, productId, router]);

  const handleUpdate = (values: ProductFormValues) => {
    const payload = {
      ...values,
      isSale: values.isSale,
      salePrice: values.isSale ? values.salePrice ?? values.price : undefined,
      originalPrice: values.isSale
        ? values.originalPrice ?? values.price
        : undefined,
      price: values.isSale ? values.salePrice ?? values.price : values.price,
    };
    updateProduct(productId, payload);
    router.replace("/admin");
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
            onClick={() => {
              if (confirm("Delete this product?")) {
                deleteProduct(productId);
                router.replace("/admin");
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>
      {!hydrated ? (
        <p className="text-white/70">Loading product…</p>
      ) : product ? (
        <ProductForm
          initialProduct={product}
          submitLabel="Save Changes"
          onSubmit={handleUpdate}
        />
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
