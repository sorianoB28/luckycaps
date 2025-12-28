"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProductsStore } from "@/store/productsStore";
import { useTranslations } from "@/lib/translations";

export default function AdminDashboard() {
  const router = useRouter();
  const { products, deleteProduct, duplicateProduct, resetToSeed } = useProductsStore();
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">
            Admin
          </p>
          <h1 className="font-display text-4xl">Products</h1>
        </div>
        <Button onClick={() => router.push("/admin/products/new")}>
          {t.actions.addProduct}
        </Button>
        <Button
          variant="secondary"
          className="bg-white/10"
          onClick={() => {
            if (confirm("Reset demo catalog to seed data? This will discard admin edits.")) {
              resetToSeed();
            }
          }}
        >
          Reset Demo Catalog
        </Button>
      </div>

      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
        Admin auth is currently disabled (dev mode). Lock this down before launch.
      </div>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="text-lg">Inventory</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-white/60">
              <tr className="border-b border-white/10">
                <th className="py-3 pr-3">Product</th>
                <th className="py-3 pr-3">Category</th>
                <th className="py-3 pr-3">Price</th>
                <th className="py-3 pr-3">Stock</th>
                <th className="py-3 pr-3">Flags</th>
                <th className="py-3 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {products.map((product) => (
                <tr key={product.id} className="align-middle">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        {product.images?.[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-white/50">{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-white/80">
                    {product.category}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        ${product.price.toFixed(2)}
                      </span>
                      {product.isSale && product.originalPrice ? (
                        <span className="text-xs text-white/50 line-through">
                          ${product.originalPrice.toFixed(2)}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3 pr-3">{product.stock}</td>
                  <td className="py-3 pr-3">
                    <div className="flex gap-2 text-xs">
                      {product.isNewDrop ? (
                        <span className="rounded-full bg-lucky-green/20 px-3 py-1 text-lucky-green">
                          New Drop
                        </span>
                      ) : null}
                      {product.isSale ? (
                        <span className="rounded-full bg-red-600/20 px-3 py-1 text-red-300">
                          Sale
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3 pr-0 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        asChild
                        className="bg-white/10"
                      >
                        <Link href={`/admin/products/${product.id}`}>
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-white/10"
                        onClick={() => duplicateProduct(product.id)}
                      >
                        Duplicate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => {
                          if (
                            confirm(
                              `Delete ${product.name}? This cannot be undone.`
                            )
                          ) {
                            deleteProduct(product.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
