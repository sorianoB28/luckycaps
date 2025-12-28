"use client";

import { useRouter } from "next/navigation";

import { ProductForm, ProductFormValues } from "@/app/admin/components/ProductForm";
import { useProductsStore } from "@/store/productsStore";
import { useTranslations } from "@/lib/translations";

export default function NewProductPage() {
  const router = useRouter();
  const { addProduct } = useProductsStore();
  const t = useTranslations();

  const handleCreate = (values: ProductFormValues) => {
    const payload = {
      ...values,
      isSale: values.isSale,
      salePrice: values.isSale ? values.salePrice ?? values.price : undefined,
      originalPrice: values.isSale
        ? values.originalPrice ?? values.price
        : undefined,
      price: values.isSale ? values.salePrice ?? values.price : values.price,
    };
    addProduct(payload);
    router.replace("/admin");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-white/50">
          Admin
        </p>
        <h1 className="font-display text-4xl">{t.actions.addProduct}</h1>
      </div>
      <ProductForm submitLabel={t.actions.addProduct} onSubmit={handleCreate} />
    </div>
  );
}
