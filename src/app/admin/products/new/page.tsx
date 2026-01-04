"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { ProductForm, ProductFormValues } from "@/app/admin/components/ProductForm";
import { useT } from "@/components/providers/LanguageProvider";
import { createAdminProduct, type AdminProductPayload } from "@/lib/api";

export default function NewProductPage() {
  const router = useRouter();
  const t = useT();
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = useMemo(() => session?.user?.role === "admin", [session?.user?.role]);

  useEffect(() => {
    if (status === "loading") return;
    if (!isAdmin) {
      router.replace(`/auth/sign-in?redirect=${encodeURIComponent("/admin/products/new")}`);
    }
  }, [isAdmin, router, status]);

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

  const handleCreate = async (values: ProductFormValues) => {
    if (!isAdmin) return;
    setSubmitting(true);
    setError(null);
    try {
      await createAdminProduct(toPayload(values));
      router.replace("/admin");
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status === 401) {
        setError(t("admin.unauthorized"));
      } else {
        setError((err as Error).message || t("admin.unableToCreateProduct"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-white/50">
          {t("admin.title")}
        </p>
        <h1 className="font-display text-4xl">{t("admin.addProduct")}</h1>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <ProductForm
        submitLabel={submitting ? t("common.saving") : t("admin.addProduct")}
        onSubmit={handleCreate}
      />
    </div>
  );
}
