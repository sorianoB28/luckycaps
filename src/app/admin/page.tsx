"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/lib/translations";
import {
  AdminProduct,
  deleteAdminProduct,
  duplicateAdminProduct,
  getAdminProducts,
} from "@/lib/api";
import { useSession } from "next-auth/react";

const PLACEHOLDER_IMAGE = "/images/placeholder-product.svg";

export default function AdminDashboard() {
  const router = useRouter();
  const t = useTranslations();
  const { data: session, status } = useSession();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const isAdmin = useMemo(() => session?.user?.role === "admin", [session?.user?.role]);

  const loadProducts = useCallback(
    async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAdminProducts();
        setProducts(data);
      } catch (err) {
        const status = (err as Error & { status?: number }).status;
        if (status === 401) {
          setError("Unauthorized. Please sign in as admin.");
        } else {
          setError((err as Error).message || "Unable to load products.");
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!isAdmin) {
      router.replace("/auth/sign-in?redirect=/admin");
      return;
    }
    loadProducts();
  }, [isAdmin, loadProducts, router, status]);

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
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="text-lg">Inventory</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {status === "loading" ? (
            <p className="text-sm text-white/60">Checking access...</p>
          ) : loading ? (
            <p className="text-sm text-white/60">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-white/60">No products found.</p>
          ) : (
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
                {products.map((product) => {
                  const effectivePrice =
                    product.is_sale && product.sale_price_cents != null
                      ? product.sale_price_cents
                      : product.price_cents;
                  const originalPrice = product.original_price_cents;
                  const rawThumb = product.image_url || product.images?.[0];
                  const thumbSrc =
                    rawThumb && /^https?:\/\//i.test(rawThumb)
                      ? rawThumb
                      : PLACEHOLDER_IMAGE;
                  return (
                    <tr key={product.id} className="align-middle">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                            <img
                              src={thumbSrc}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = PLACEHOLDER_IMAGE;
                              }}
                            />
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
                            ${(effectivePrice / 100).toFixed(2)}
                          </span>
                          {product.is_sale && originalPrice ? (
                            <span className="text-xs text-white/50 line-through">
                              ${(originalPrice / 100).toFixed(2)}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 pr-3">{product.stock}</td>
                      <td className="py-3 pr-3">
                        <div className="flex gap-2 text-xs">
                          {product.is_new_drop ? (
                            <span className="rounded-full bg-lucky-green/20 px-3 py-1 text-lucky-green">
                              New Drop
                            </span>
                          ) : null}
                          {product.is_sale ? (
                            <span className="rounded-full bg-red-600/20 px-3 py-1 text-red-300">
                              Sale
                            </span>
                          ) : null}
                          {!product.active ? (
                            <span className="rounded-full bg-white/10 px-3 py-1 text-white/70">
                              Inactive
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
                            disabled={actionId === product.id}
                            onClick={async () => {
                              setActionId(product.id);
                              try {
                                await duplicateAdminProduct(product.id);
                                await loadProducts();
                              } catch (err) {
                                setError((err as Error).message || "Unable to duplicate.");
                              } finally {
                                setActionId(null);
                              }
                            }}
                          >
                            Duplicate
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            disabled={actionId === product.id}
                            onClick={async () => {
                              if (
                                !confirm(
                                  `Delete ${product.name}? This cannot be undone.`
                                )
                              ) {
                                return;
                              }
                              setActionId(product.id);
                              try {
                                await deleteAdminProduct(product.id);
                                await loadProducts();
                              } catch (err) {
                                setError((err as Error).message || "Unable to delete.");
                              } finally {
                                setActionId(null);
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
