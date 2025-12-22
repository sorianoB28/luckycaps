import { notFound } from "next/navigation";

import { products } from "@/data/products";
import ProductGallery from "@/components/products/ProductGallery";
import ProductPurchasePanel from "@/components/products/ProductPurchasePanel";
import { Badge } from "@/components/ui/badge";

interface ProductPageProps {
  params: { slug: string };
}

export default function ProductPage({ params }: ProductPageProps) {
  const product = products.find((item) => item.slug === params.slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            {product.isNewDrop ? <Badge variant="green">New Drop</Badge> : null}
            {product.isSale ? <Badge>Sale</Badge> : null}
          </div>
          <ProductGallery images={product.images} name={product.name} />
        </div>
        <ProductPurchasePanel product={product} />
      </div>
    </div>
  );
}
