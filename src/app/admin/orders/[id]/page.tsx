"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/components/providers/LanguageProvider";
import {
  buyAdminOrderShippingLabel,
  createAdminOrderShippingDraft,
  getAdminOrder,
  getAdminOrderShipping,
  updateAdminOrder,
  type AdminOrderDetail,
  type AdminOrderItem,
  type AdminParcelTemplate,
  type AdminShipment,
  type AdminShipmentParcel,
  type AdminShipmentRate,
} from "@/lib/api";
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

const STATUS_LABEL_KEYS: Record<AdminOrderDetail["status"], string> = {
  created: "common.created",
  paid: "common.paid",
  shipped: "common.shipped",
  delivered: "common.delivered",
  cancelled: "common.cancelled",
  refunded: "common.refunded",
};

const LABEL_FORMATS = ["PDF_4x6", "ZPLII"] as const;
type LabelFormat = (typeof LABEL_FORMATS)[number];

const readString = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

type ParcelDraft = {
  length: string;
  width: string;
  height: string;
  weight: string;
  distance_unit: string;
  mass_unit: string;
};

export default function AdminOrderDetailPage() {
  const t = useT();
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

  const [shipment, setShipment] = useState<AdminShipment | null>(null);
  const [shippingRates, setShippingRates] = useState<AdminShipmentRate[]>([]);
  const [parcelTemplates, setParcelTemplates] = useState<AdminParcelTemplate[]>([]);
  const [parcelTemplateId, setParcelTemplateId] = useState<string | null>(null);
  const [parcel, setParcel] = useState<ParcelDraft>({
    length: "",
    width: "",
    height: "",
    weight: "",
    distance_unit: "in",
    mass_unit: "lb",
  });
  const [labelFormat, setLabelFormat] = useState<LabelFormat>("PDF_4x6");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingBusy, setShippingBusy] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingNotice, setShippingNotice] = useState<string | null>(null);

  const load = async () => {
    if (!orderId) {
      setError(t("admin.invalidOrderId"));
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
      setError((err as Error).message || t("admin.unableToLoadOrder"));
    } finally {
      setLoading(false);
    }
  };

  const applyParcel = (next: AdminShipmentParcel) => {
    setParcel({
      length: next.length ? String(next.length) : "",
      width: next.width ? String(next.width) : "",
      height: next.height ? String(next.height) : "",
      weight: next.weight ? String(next.weight) : "",
      distance_unit: next.distance_unit || "in",
      mass_unit: next.mass_unit || "lb",
    });
  };

  const parseParcelDraft = (draft: ParcelDraft): AdminShipmentParcel | null => {
    const length = Number(draft.length);
    const width = Number(draft.width);
    const height = Number(draft.height);
    const weight = Number(draft.weight);
    if (![length, width, height, weight].every((value) => Number.isFinite(value) && value > 0)) {
      return null;
    }
    if (!draft.distance_unit || !draft.mass_unit) return null;
    return {
      length,
      width,
      height,
      weight,
      distance_unit: draft.distance_unit,
      mass_unit: draft.mass_unit,
    };
  };

  const loadShipping = async () => {
    if (!orderId) return;
    setShippingLoading(true);
    setShippingError(null);
    setShippingNotice(null);
    try {
      const res = await getAdminOrderShipping(orderId);
      setShipment(res.shipment ?? null);
      const nextRates = res.rates?.length
        ? res.rates
        : (res.shipment?.rates as AdminShipmentRate[] | undefined) ?? [];
      setShippingRates(nextRates);
      const nextTemplates = res.parcel_templates ?? [];
      setParcelTemplates(nextTemplates);

      const defaults = res.defaults ?? {};
      const shipmentFormat = res.shipment?.label_format;
      if (shipmentFormat === "PDF_4x6" || shipmentFormat === "ZPLII") {
        setLabelFormat(shipmentFormat);
      } else {
        const defaultLabel = defaults?.label_format;
        if (defaultLabel === "PDF_4x6" || defaultLabel === "ZPLII") {
          setLabelFormat(defaultLabel);
        }
      }

      if (res.shipment?.parcel) {
        applyParcel(res.shipment.parcel);
      } else if (defaults?.default_parcel_template_id) {
        const match = nextTemplates.find(
          (template) => template.id === defaults.default_parcel_template_id
        );
        if (match) {
          setParcelTemplateId(match.id);
          applyParcel(match);
        }
      } else if (nextTemplates.length) {
        setParcelTemplateId(nextTemplates[0].id);
        applyParcel(nextTemplates[0]);
      }
    } catch (err) {
      setShippingError((err as Error).message || t("admin.unableToLoadOrder"));
    } finally {
      setShippingLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orderId, t]);

  useEffect(() => {
    loadShipping();
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
      setSuccess(t("admin.savedChanges"));
    } catch (err) {
      setError((err as Error).message || t("admin.unableToSaveChanges"));
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

  const handleTemplateChange = (value: string) => {
    setParcelTemplateId(value || null);
    const match = parcelTemplates.find((template) => template.id === value);
    if (match) {
      applyParcel(match);
    }
  };

  const handleGetRates = async () => {
    if (!orderId) return;
    const parsedParcel = parseParcelDraft(parcel);
    if (!parsedParcel) {
      setShippingError(t("admin.shippingInvalidParcel"));
      return;
    }
    setShippingBusy(true);
    setShippingError(null);
    setShippingNotice(null);
    try {
      const res = await createAdminOrderShippingDraft(orderId, {
        parcel: parsedParcel,
        parcel_template_id: parcelTemplateId,
      });
      setShipment(res.shipment ?? null);
      setShippingRates(res.rates ?? []);
      setShippingNotice(t("admin.shippingRatesReady"));
    } catch (err) {
      setShippingError((err as Error).message || t("admin.unableToLoadOrder"));
    } finally {
      setShippingBusy(false);
    }
  };

  const handleBuyLabel = async (rateId: string) => {
    if (!orderId) return;
    setShippingBusy(true);
    setShippingError(null);
    setShippingNotice(null);
    try {
      const res = await buyAdminOrderShippingLabel(orderId, {
        rate_id: rateId,
        label_format: labelFormat,
      });
      setShipment(res.shipment ?? null);
      const nextRates = (res.shipment?.rates as AdminShipmentRate[] | undefined) ?? shippingRates;
      setShippingRates(nextRates);
      setShippingNotice(t("admin.shippingLabelPurchased"));
    } catch (err) {
      setShippingError((err as Error).message || t("admin.unableToLoadOrder"));
    } finally {
      setShippingBusy(false);
    }
  };

  const handleRandomizeParcel = () => {
    const randomBetween = (min: number, max: number) =>
      Math.round((Math.random() * (max - min) + min) * 100) / 100;

    const distanceUnit = parcel.distance_unit || "in";
    const massUnit = parcel.mass_unit || "oz";

    const lengthRange = distanceUnit === "cm" ? [10, 40] : [6, 14];
    const widthRange = distanceUnit === "cm" ? [10, 35] : [6, 12];
    const heightRange = distanceUnit === "cm" ? [4, 20] : [2, 8];

    let weightRange: [number, number] = [4, 16];
    if (massUnit === "lb") weightRange = [0.5, 3];
    if (massUnit === "g") weightRange = [200, 1200];
    if (massUnit === "kg") weightRange = [0.2, 2];

    setParcel((prev) => ({
      ...prev,
      length: String(randomBetween(lengthRange[0], lengthRange[1])),
      width: String(randomBetween(widthRange[0], widthRange[1])),
      height: String(randomBetween(heightRange[0], heightRange[1])),
      weight: String(randomBetween(weightRange[0], weightRange[1])),
      distance_unit: distanceUnit,
      mass_unit: massUnit,
    }));
  };

  const handleQuickAction = (action: StatusAction) => {
    if (
      (action === "cancelled" || action === "refunded") &&
      !confirm(
        t("admin.markOrderConfirm", { status: t(STATUS_LABEL_KEYS[action]) })
      )
    ) {
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
      { status: "paid" as const, value: order?.paid_at },
      { status: "shipped" as const, value: order?.shipped_at },
      { status: "delivered" as const, value: order?.delivered_at },
      { status: "cancelled" as const, value: order?.cancelled_at },
      { status: "refunded" as const, value: order?.refunded_at },
    ],
    [order]
  );

  const canManageShipping =
    order?.status === "paid" || order?.status === "shipped" || order?.status === "delivered";

  const distanceUnits = useMemo(() => {
    const units = new Set<string>(["in", "cm"]);
    parcelTemplates.forEach((template) => {
      if (template.distance_unit) units.add(template.distance_unit);
    });
    if (parcel.distance_unit) units.add(parcel.distance_unit);
    return Array.from(units);
  }, [parcel.distance_unit, parcelTemplates]);

  const massUnits = useMemo(() => {
    const units = new Set<string>(["lb", "oz", "g", "kg"]);
    parcelTemplates.forEach((template) => {
      if (template.mass_unit) units.add(template.mass_unit);
    });
    if (parcel.mass_unit) units.add(parcel.mass_unit);
    return Array.from(units);
  }, [parcel.mass_unit, parcelTemplates]);

  const sortedRates = useMemo(() => {
    return [...shippingRates].sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0));
  }, [shippingRates]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-white/70">
        <Loader2 className="h-5 w-5 animate-spin" />
        {t("admin.loadingOrder")}
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4 text-white/80">
        <p className="text-lg font-semibold text-white">
          {error ?? t("admin.orderNotFound")}
        </p>
        <Button variant="secondary" onClick={() => router.push("/admin/orders")}>
          {t("admin.backToOrders")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">
            {t("admin.title")}
          </p>
          <h1 className="font-display text-3xl text-white">
            {t("order.title", { id: order.id })}
          </h1>
          <p className="text-sm text-white/60">
            {new Date(order.created_at).toLocaleString()} •{" "}
            {order.account_email || order.email}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/orders">{t("admin.backToOrders")}</Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1.1fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">{t("admin.itemsTitle")}</h2>
              <span className={statusBadgeClass(order.status)}>
                {t(STATUS_LABEL_KEYS[order.status])}
              </span>
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
                        {t("cart.noImage")}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-sm text-white/80">
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-white/60">
                      {item.variant || t("cart.variantFallback")} •{" "}
                      {item.size || t("cart.sizeFallback")}
                    </p>
                    <p className="text-white/60">
                      {t("order.qtyValue", { qty: item.quantity })}
                    </p>
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
              <h3 className="font-semibold">{t("admin.shippingTitle")}</h3>
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
                {t("order.deliveryValue", {
                  delivery: order.delivery_option ?? t("order.na"),
                })}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
              <h3 className="font-semibold">{t("admin.contactTitle")}</h3>
              <p className="text-sm text-white/70">
                {order.account_email || order.email}
              </p>
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

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{t("admin.shippingLabelTitle")}</h3>
              {shipment?.status ? (
                <span className="text-xs uppercase tracking-[0.2em] text-white/50">
                  {t("common.status")}: {shipment.status}
                </span>
              ) : null}
            </div>

            {!canManageShipping ? (
              <p className="text-sm text-white/60">{t("admin.shippingPaidOnly")}</p>
            ) : null}

            {shippingLoading ? (
              <p className="text-sm text-white/60">{t("common.loading")}</p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                    {t("admin.shippingPackageTemplate")}
                  </label>
                  <select
                    value={parcelTemplateId ?? ""}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  >
                    <option value="">{t("admin.shippingCustomTemplate")}</option>
                    {parcelTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                      {t("admin.shippingLength")}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={parcel.length}
                      onChange={(e) => setParcel((prev) => ({ ...prev, length: e.target.value }))}
                      className="bg-black/40 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                      {t("admin.shippingWidth")}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={parcel.width}
                      onChange={(e) => setParcel((prev) => ({ ...prev, width: e.target.value }))}
                      className="bg-black/40 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                      {t("admin.shippingHeight")}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={parcel.height}
                      onChange={(e) => setParcel((prev) => ({ ...prev, height: e.target.value }))}
                      className="bg-black/40 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                      {t("admin.shippingWeight")}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={parcel.weight}
                      onChange={(e) => setParcel((prev) => ({ ...prev, weight: e.target.value }))}
                      className="bg-black/40 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                      {t("admin.shippingDistanceUnit")}
                    </label>
                    <select
                      value={parcel.distance_unit}
                      onChange={(e) =>
                        setParcel((prev) => ({ ...prev, distance_unit: e.target.value }))
                      }
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    >
                      {distanceUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                      {t("admin.shippingMassUnit")}
                    </label>
                    <select
                      value={parcel.mass_unit}
                      onChange={(e) =>
                        setParcel((prev) => ({ ...prev, mass_unit: e.target.value }))
                      }
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    >
                      {massUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                    {t("admin.shippingLabelFormat")}
                  </label>
                  <select
                    value={labelFormat}
                    onChange={(e) => setLabelFormat(e.target.value as LabelFormat)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                  >
                    {LABEL_FORMATS.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleGetRates}
                    disabled={shippingBusy || !canManageShipping}
                    className="bg-white/10"
                  >
                    {shippingBusy ? t("common.loading") : t("admin.shippingGetRates")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleRandomizeParcel}
                    disabled={!canManageShipping}
                    className="bg-white/10"
                  >
                    {t("admin.shippingRandomize")}
                  </Button>
                </div>

                {shippingNotice ? (
                  <p className="text-sm text-lucky-green">{shippingNotice}</p>
                ) : null}
                {shippingError ? (
                  <p className="text-sm text-red-400">{shippingError}</p>
                ) : null}

                {shipment?.status === "purchased" && shipment.label_url ? (
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2">
                    <p className="text-sm text-lucky-green">{t("admin.shippingLabelReady")}</p>
                    <Button variant="secondary" className="bg-white/10" asChild>
                      <a href={shipment.label_url} target="_blank" rel="noreferrer">
                        {t("admin.shippingDownloadLabel", {
                          format: shipment.label_format || labelFormat,
                        })}
                      </a>
                    </Button>
                    {shipment.tracking_number ? (
                      <p className="text-sm text-white/70">
                        {t("admin.shippingTrackingNumber")}: {shipment.tracking_number}
                      </p>
                    ) : null}
                    {shipment.tracking_url ? (
                      <a
                        href={shipment.tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-lucky-green hover:text-lucky-green/80"
                      >
                        {t("common.view")}
                      </a>
                    ) : null}
                    {order.status !== "shipped" ? (
                      <Button
                        variant="secondary"
                        onClick={() => handleQuickAction("shipped")}
                        disabled={saving || !canInteract}
                        className="bg-white/10"
                      >
                        {t("admin.shippingMarkShipped")}
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <p className="text-sm font-semibold">{t("admin.shippingRatesTitle")}</p>
                  {sortedRates.length ? (
                    <div className="space-y-2">
                      {sortedRates.map((rate) => {
                        const amount = Number(rate.amount);
                        const displayAmount = Number.isFinite(amount) ? amount.toFixed(2) : "--";
                        return (
                          <div
                            key={rate.id}
                            className="rounded-xl border border-white/10 bg-black/30 p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-white">
                                  {rate.provider} · {rate.service}
                                </p>
                                {rate.estimated_days != null ? (
                                  <p className="text-xs text-white/60">
                                    {rate.estimated_days} days
                                  </p>
                                ) : rate.duration_terms ? (
                                  <p className="text-xs text-white/60">
                                    {rate.duration_terms}
                                  </p>
                                ) : null}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-white">
                                  ${displayAmount} {rate.currency}
                                </p>
                                <Button
                                  variant="secondary"
                                  onClick={() => handleBuyLabel(rate.id)}
                                  disabled={shippingBusy || !canManageShipping}
                                  className="mt-2 bg-white/10"
                                >
                                  {t("admin.shippingBuyLabel")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-white/60">{t("admin.shippingNoRates")}</p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
            <h3 className="font-semibold">{t("admin.totalsTitle")}</h3>
            <div className="mt-3 flex items-center justify-between text-sm text-white/70">
              <span>{t("common.subtotal")}</span>
              <span className="font-semibold text-white">
                ${(order.subtotal_cents / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t("admin.manageTitle")}</h3>
              <span className={statusBadgeClass(order.status)}>
                {t(STATUS_LABEL_KEYS[order.status])}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                {t("admin.statusLabel")}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AdminOrderDetail["status"])}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(STATUS_LABEL_KEYS[s])}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                {t("admin.trackingNumberLabel")}
              </label>
              <Input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder={t("admin.enterTrackingPlaceholder")}
                className="bg-black/40 text-white"
              />
              <p className="text-xs text-white/50">{t("admin.trackingHelp")}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                {t("admin.adminNotesLabel")}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder={t("admin.internalNotesPlaceholder")}
                className="bg-black/40 text-white"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handlePrimarySave} disabled={saving || !canInteract} className="bg-lucky-green text-lucky-darker">
                {saving ? t("common.saving") : t("admin.saveChanges")}
              </Button>
              <Button variant="secondary" onClick={() => handleQuickAction("paid")} disabled={saving || !canInteract} className="bg-white/10">
                {t("admin.markPaid")}
              </Button>
              <Button variant="secondary" onClick={() => handleQuickAction("shipped")} disabled={saving || !canInteract} className="bg-white/10">
                {t("admin.markShipped")}
              </Button>
              <Button variant="secondary" onClick={() => handleQuickAction("delivered")} disabled={saving || !canInteract} className="bg-white/10">
                {t("admin.markDelivered")}
              </Button>
              <Button variant="secondary" onClick={() => handleQuickAction("cancelled")} disabled={saving || !canInteract} className="bg-white/10">
                {t("admin.cancelOrder")}
              </Button>
              <Button variant="secondary" onClick={() => handleQuickAction("refunded")} disabled={saving || !canInteract} className="bg-white/10">
                {t("admin.markRefunded")}
              </Button>
            </div>

            {success ? <p className="text-sm text-lucky-green">{success}</p> : null}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <div className="space-y-2 border-t border-white/10 pt-3 text-sm text-white/70">
              {timestamps.map(
                (ts) =>
                  ts.value && (
                    <div key={ts.status} className="flex items-center justify-between">
                      <span>{t(STATUS_LABEL_KEYS[ts.status])}</span>
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
