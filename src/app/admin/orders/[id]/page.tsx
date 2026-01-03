"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAdminOrder, updateAdminOrder, type AdminOrderDetail, type AdminOrderItem } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUSES: AdminOrderDetail["status"][] = [
  "created",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

type StatusAction = "paid" | "shipped" | "delivered" | "cancelled" | "refunded";

const readString = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = useMemo(() => {
    const value = Array.isArray(params.id) ? params.id[0] : params.id;
    return value && value !== "undefined" ? value : null;
  }, [params.id]);

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [items, setItems] = useState<AdminOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [status, setStatus] = useState<AdminOrderDetail["status"]>("created");
  const [tracking, setTracking] = useState("");
  const [notes, setNotes] = useState("");
  const canInteract = Boolean(orderId && order);

  const load = async () => {
    if (!orderId) {
      setError("Invalid order id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await getAdminOrder(orderId);
      setOrder(res.order);
      setItems(res.items);
      setStatus(res.order.status);
      setTracking(res.order.tracking_number ?? "");
      setNotes(res.order.admin_notes ?? "");
    } catch (err) {
      setError((err as Error).message || "Unable to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orderId]);

  const handleSave = async (next: { status?: AdminOrderDetail["status"]; tracking_number?: string | null; admin_notes?: string | null }) => {
    if (!order || !orderId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateAdminOrder(orderId, next);
      setOrder(res.order);
      setStatus(res.order.status);
      setTracking(res.order.tracking_number ?? "");
      setNotes(res.order.admin_notes ?? "");
      setSuccess("Saved changes");
    } catch (err) {
      setError((err as Error).message || "Unable to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handlePrimarySave = () =>
    handleSave({
      status,
      tracking_number: tracking.trim() || null,
      admin_notes: notes.trim() || null,
    });

  const handleQuickAction = (action: StatusAction) => {
    if ((action === "cancelled" || action === "refunded") && !confirm(`Mark order as ${action}?`)) {
      return;
    }
    handleSave({ status: action });
  };

  const statusBadgeClass = (value: AdminOrderDetail["status"]) =>
    cn(
      "inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize",
      value === "created"
        ? "bg-white/10 text-white"
        : value === "paid"
        ? "bg-lucky-green/20 text-lucky-green"
        : value === "shipped"
        ? "bg-blue-500/20 text-blue-200"
        : value === "delivered"
        ? "bg-emerald-500/20 text-emerald-200"
        : value === "cancelled"
        ? "bg-red-500/20 text-red-200"
        : "bg-yellow-500/20 text-yellow-200"
    );

  const timestamps = useMemo(
    () => [
      { label: "Paid", value: order?.paid_at },
      { label: "Shipped", value: order?.shipped_at },
      { label: "Delivered", value: order?.delivered_at },
      { label: "Cancelled", value: order?.cancelled_at },
      { label: "Refunded", value: order?.refunded_at },
    ],
    [order]
  );

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-white/70">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading order...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4 text-white/80">
        <p className="text-lg font-semibold text-white">{error ?? "Order not found"}</p>
        <Button variant="secondary" onClick={() => router.push("/admin/orders")}>
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">Admin</p>
          <h1 className="font-display text-3xl text-white">Order {order.id}</h1>
          <p className="text-sm text-white/60">
            {new Date(order.created_at).toLocaleString()} · {order.email}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/orders">Back to Orders</Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1.1fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Items</h2>
              <span className={statusBadgeClass(order.status)}>{order.status}</span>
            </div>
            <div className="mt-4 space-y-3">
              {items.map((item, idx) => (
                <div
                  key={`${item.product_slug}-${idx}`}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3"
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-white/5">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/images/placeholder-product.svg";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-white/50">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-sm text-white/80">
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-white/60">
                      {item.variant || "Standard"} · {item.size || "One size"}
                    </p>
                    <p className="text-white/60">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    ${((item.price_cents * item.quantity) / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

            <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
              <h3 className="font-semibold">Shipping</h3>
              <p className="text-sm text-white/70">
                {readString(order.shipping_address?.firstName)}{" "}
                {readString(order.shipping_address?.lastName)}
              </p>
              <p className="text-sm text-white/70">
                {readString(order.shipping_address?.address1)}
              </p>
              {order.shipping_address?.address2 ? (
                <p className="text-sm text-white/70">
                  {readString(order.shipping_address.address2)}
                </p>
              ) : null}
              <p className="text-sm text-white/70">
                {readString(order.shipping_address?.city)}, {readString(order.shipping_address?.state)}{" "}
                {readString(order.shipping_address?.zip)}
              </p>
              <p className="text-sm text-white/70">
                {readString(order.shipping_address?.country)}
              </p>
              <p className="mt-2 text-sm text-white/60">
                Delivery: {order.delivery_option ?? "N/A"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
              <h3 className="font-semibold">Contact</h3>
              <p className="text-sm text-white/70">{order.email}</p>
              {order.contact?.phone ? (
                <p className="text-sm text-white/70">{String(order.contact.phone)}</p>
              ) : null}
              {order.contact?.notes ? (
                <p className="mt-2 text-sm text-white/70 whitespace-pre-line">
                  {String(order.contact.notes)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
            <h3 className="font-semibold">Totals</h3>
            <div className="mt-3 flex items-center justify-between text-sm text-white/70">
              <span>Subtotal</span>
              <span className="font-semibold text-white">
                ${(order.subtotal_cents / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Manage</h3>
              <span className={statusBadgeClass(order.status)}>{order.status}</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/50">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AdminOrderDetail["status"])}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                Tracking Number
              </label>
              <Input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="Enter tracking"
                className="bg-black/40 text-white"
              />
              <p className="text-xs text-white/50">Add tracking when shipped (optional).</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                Admin Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Internal notes"
                className="bg-black/40 text-white"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handlePrimarySave} disabled={saving || !canInteract} className="bg-lucky-green text-lucky-darker">
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <Button variant="secondary" onClick={() => handleQuickAction("paid")} disabled={saving || !canInteract} className="bg-white/10">
                Mark Paid
              </Button>
              <Button variant="secondary" onClick={() => handleQuickAction("shipped")} disabled={saving || !canInteract} className="bg-white/10">
                Mark Shipped
              </Button>
              <Button variant="secondary" onClick={() => handleQuickAction("delivered")} disabled={saving || !canInteract} className="bg-white/10">
                Mark Delivered
              </Button>
              <Button variant="secondary" onClick={() => handleQuickAction("cancelled")} disabled={saving || !canInteract} className="bg-white/10">
                Cancel Order
              </Button>
              <Button variant="secondary" onClick={() => handleQuickAction("refunded")} disabled={saving || !canInteract} className="bg-white/10">
                Mark Refunded
              </Button>
            </div>

            {success ? <p className="text-sm text-lucky-green">{success}</p> : null}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <div className="space-y-2 border-t border-white/10 pt-3 text-sm text-white/70">
              {timestamps.map(
                (ts) =>
                  ts.value && (
                    <div key={ts.label} className="flex items-center justify-between">
                      <span>{ts.label}</span>
                      <span>{new Date(ts.value).toLocaleString()}</span>
                    </div>
                  )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
