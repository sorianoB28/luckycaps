"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Search, ChevronDown, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminOrders, type AdminOrder } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUSES: AdminOrder["status"][] = [
  "created",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

type SortOption = "newest" | "oldest";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AdminOrder["status"] | "all">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const queryParams = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      q: search.trim() || undefined,
      sort,
    }),
    [statusFilter, search, sort]
  );

  const loadOrders = async (cursor?: string | null, append = false) => {
    setLoading(cursor ? false : true);
    setLoadingMore(Boolean(cursor));
    setError(null);
    try {
      const res = await getAdminOrders({
        ...queryParams,
        cursor: cursor ?? null,
      });
      setNextCursor(res.nextCursor ?? null);
      setOrders((prev) => (append ? [...prev, ...res.orders] : res.orders));
    } catch (err) {
      setError((err as Error).message || "Unable to load orders.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams.status, queryParams.q, queryParams.sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">Admin</p>
          <h1 className="font-display text-4xl">Orders</h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin">Back to Products</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID or email"
              className="bg-black/40 pl-9 text-white"
            />
          </div>
          <Button type="submit" variant="secondary" className="bg-white/10">
            Search
          </Button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AdminOrder["status"] | "all")}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="grid grid-cols-[1.3fr_1fr_1fr_0.8fr_0.6fr_0.6fr_0.8fr_0.9fr] items-center gap-4 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-white/50">
          <span>Order</span>
          <span>Created</span>
          <span>Customer</span>
          <span>Type</span>
          <span>Status</span>
          <span>Items</span>
          <span>Subtotal</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 px-4 py-6 text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading orders...
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-sm text-red-400">{error}</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col gap-3 px-4 py-12 text-center text-white/70">
            <p className="text-lg font-semibold text-white">No orders yet</p>
            <p className="text-sm">Orders will appear here once customers checkout.</p>
            <Button variant="secondary" asChild className="mx-auto bg-white/10">
              <Link href="/admin/products">Go to Products</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {orders.map((order) => (
              <div
                key={order.id}
                className="grid grid-cols-[1.3fr_1fr_1fr_0.8fr_0.6fr_0.6fr_0.8fr_0.9fr] items-center gap-4 px-4 py-3 text-sm text-white"
              >
                <div className="font-mono text-xs text-white/80">{order.id.slice(0, 8)}</div>
                <span className="text-white/70">
                  {new Date(order.created_at).toLocaleString()}
                </span>
                <div className="space-y-0.5">
                  <p className="text-white/80">
                    {order.customer_name || "Guest"}
                  </p>
                  <p className="text-xs text-white/60">{order.email}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    order.user_id ? "bg-lucky-green/15 text-lucky-green" : "bg-white/10 text-white/70"
                  )}
                >
                  {order.user_id ? "Account" : "Guest"}
                </span>
                <span
                  className={cn(
                    "inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize",
                    order.status === "created"
                      ? "bg-white/10 text-white"
                      : order.status === "paid"
                      ? "bg-lucky-green/20 text-lucky-green"
                      : order.status === "shipped"
                      ? "bg-blue-500/20 text-blue-200"
                      : order.status === "delivered"
                      ? "bg-emerald-500/20 text-emerald-200"
                      : order.status === "cancelled"
                      ? "bg-red-500/20 text-red-200"
                      : "bg-yellow-500/20 text-yellow-200"
                  )}
                >
                  {order.status}
                </span>
                <span className="text-white/80">{order.items_count}</span>
                <span className="font-semibold text-white">
                  ${(order.subtotal_cents / 100).toFixed(2)}
                </span>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" asChild className="bg-white/10">
                    <Link href={`/admin/orders/${order.id}/view`}>View</Link>
                  </Button>
                  <Button variant="secondary" size="sm" asChild className="bg-white/10">
                    <Link href={`/admin/orders/${order.id}`}>Manage</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {nextCursor ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="bg-white/5"
            disabled={loadingMore}
            onClick={() => loadOrders(nextCursor, true)}
          >
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
