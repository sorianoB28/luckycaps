"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/components/providers/LanguageProvider";
import {
  buyAdminOrderShippingLabel,
  archiveAdminOrderLabel,
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
  type AdminShippingPurchaseFailure,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { resolveAdminError } from "@/lib/adminErrors";
import { OrderTotalsCard } from "@/app/admin/orders/OrderTotalsCard";

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

const toInches = (value: number, unit: string) =>
  unit === "cm" ? value / 2.54 : value;

const formatPostage = (
  amount?: number | null,
  currency?: string | null
) => {
  if (amount == null) return null;
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return null;
  const code = currency ? currency.toUpperCase() : "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(
      numeric
    );
  } catch {
    return `$${numeric.toFixed(2)} ${code}`;
  }
};

const formatOrderMoney = (cents?: number | null, currency?: string | null) => {
  const numeric = Number(cents ?? 0);
  if (!Number.isFinite(numeric)) return null;
  const code = currency ? currency.toUpperCase() : "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(numeric / 100);
  } catch {
    return `$${(numeric / 100).toFixed(2)} ${code}`;
  }
};

type CheckTone = "green" | "yellow" | "red";

type FulfillmentCheck = {
  label: string;
  tone: CheckTone;
  value: string;
  detail?: string;
};

const hasNonEmptyString = (value: unknown) => readString(value).trim().length > 0;

const hasFiniteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value);

const extractShippingPurchaseFailure = (err: unknown): AdminShippingPurchaseFailure | null => {
  const data = (err as { data?: unknown } | null | undefined)?.data;
  if (!data || typeof data !== "object") return null;

  const failure = data as AdminShippingPurchaseFailure;
  if (!failure.error) return null;
  if (failure.code === "shippo_purchase_failed") return failure;
  if (failure.label_created === false && failure.shipment_persisted === false) return failure;
  return null;
};

const checkToneClass = (tone: CheckTone) =>
  tone === "green"
    ? "border-lucky-green/30 bg-lucky-green/15 text-lucky-green"
    : tone === "yellow"
    ? "border-yellow-500/30 bg-yellow-500/15 text-yellow-100"
    : "border-red-500/30 bg-red-500/15 text-red-200";

const checkToneLabel = (tone: CheckTone) =>
  tone === "green" ? "Ready" : tone === "yellow" ? "Pending" : "Missing";

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
    mass_unit: "oz",
  });
  const [labelFormat, setLabelFormat] = useState<LabelFormat>("PDF_4x6");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingBusy, setShippingBusy] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingNotice, setShippingNotice] = useState<string | null>(null);
  const [shippingPurchaseFailure, setShippingPurchaseFailure] =
    useState<AdminShippingPurchaseFailure | null>(null);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [labelArchiving, setLabelArchiving] = useState(false);
  const [labelArchiveError, setLabelArchiveError] = useState<string | null>(null);
  const [readinessExpanded, setReadinessExpanded] = useState(false);
  const [readinessRefreshing, setReadinessRefreshing] = useState(false);

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
      if (res.shipment) {
        setShipment(res.shipment);
      }
    } catch (err) {
      setError(resolveAdminError(t, err, "admin.unableToLoadOrder"));
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
      mass_unit: next.mass_unit || "oz",
    });
  };

  const applyTemplate = (template: AdminParcelTemplate) => {
    setParcel((prev) => ({
      length: template.length != null ? String(template.length) : prev.length,
      width: template.width != null ? String(template.width) : prev.width,
      height: template.height != null ? String(template.height) : prev.height,
      weight: prev.weight,
      distance_unit: template.distance_unit || prev.distance_unit || "in",
      mass_unit: template.mass_unit || prev.mass_unit || "oz",
    }));

    if (template.label_format_default) {
      const nextFormat = template.label_format_default as LabelFormat;
      if (LABEL_FORMATS.includes(nextFormat)) {
        setLabelFormat(nextFormat);
      }
    }
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
    setShippingPurchaseFailure(null);
    setTemplateNotice(null);
    try {
      const res = await getAdminOrderShipping(orderId);
      setShipment(res.shipment ?? null);
      const nextRates = res.rates?.length
        ? res.rates
        : (res.shipment?.rates as AdminShipmentRate[] | undefined) ?? [];
      setShippingRates(nextRates);
      setTemplateNotice(res.template_notice ?? null);
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
      }
      if (res.shipment?.parcel_template_id) {
        const match = nextTemplates.find(
          (template) => template.id === res.shipment?.parcel_template_id
        );
        if (match) {
          setParcelTemplateId(match.id);
          applyTemplate(match);
        }
      } else {
        setParcelTemplateId(null);
      }
    } catch (err) {
      setShippingError(resolveAdminError(t, err, "admin.unableToLoadOrder"));
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

  const handleRefreshReadiness = async () => {
    setReadinessRefreshing(true);
    setError(null);
    try {
      await Promise.all([load(), loadShipping()]);
    } finally {
      setReadinessRefreshing(false);
    }
  };

  useEffect(() => {
    if (shipment?.label_asset_url) {
      setLabelArchiveError(null);
    }
  }, [shipment?.label_asset_url]);

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
      setError(resolveAdminError(t, err, "admin.unableToSaveChanges"));
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
    const nextTemplateId = value || null;
    setParcelTemplateId(nextTemplateId);
    if (!nextTemplateId) {
      setParcel({
        length: "",
        width: "",
        height: "",
        weight: "",
        distance_unit: "in",
        mass_unit: "oz",
      });
      return;
    }

    const match = parcelTemplates.find((template) => template.id === value);
    if (match) {
      applyTemplate(match);
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
    setShippingPurchaseFailure(null);
    try {
      const res = await createAdminOrderShippingDraft(orderId, {
        parcel: parsedParcel,
        parcel_template_id: parcelTemplateId,
      });
      setShipment(res.shipment ?? null);
      setShippingRates(res.rates ?? []);
      setShippingNotice(t("admin.shippingRatesReady"));
    } catch (err) {
      setShippingError(resolveAdminError(t, err, "admin.unableToLoadOrder"));
    } finally {
      setShippingBusy(false);
    }
  };

  const handleBuyLabel = async (rateId: string) => {
    if (!orderId) return;
    setShippingBusy(true);
    setShippingError(null);
    setShippingNotice(null);
    setLabelArchiveError(null);
    setShippingPurchaseFailure(null);
    try {
      const res = await buyAdminOrderShippingLabel(orderId, {
        rate_id: rateId,
        label_format: labelFormat,
      });
      setShipment(res.shipment ?? null);
      const nextRates = (res.shipment?.rates as AdminShipmentRate[] | undefined) ?? shippingRates;
      setShippingRates(nextRates);
      setShippingNotice(t("admin.shippingLabelPurchased"));
      if (res.label_error) {
        setLabelArchiveError(res.label_error);
      }
    } catch (err) {
      const failure = extractShippingPurchaseFailure(err);
      if (failure?.shipment) {
        setShipment(failure.shipment);
      }
      setShippingPurchaseFailure(failure);
      setShippingError(
        failure?.provider_error_summary ||
          failure?.error ||
          resolveAdminError(t, err, "admin.unableToLoadOrder")
      );
    } finally {
      setShippingBusy(false);
    }
  };

  const handleDownloadLabel = async () => {
    if (!orderId) return;
    window.open(`/api/admin/orders/${orderId}/shipping/label`, "_blank", "noopener");
  };

  const handleRetryArchive = async () => {
    if (!orderId) return;
    setLabelArchiving(true);
    setLabelArchiveError(null);
    setShippingNotice(null);
    try {
      const res = await archiveAdminOrderLabel(orderId);
      if (res.shipment) {
        setShipment(res.shipment);
      }
      setShippingNotice(t("admin.shippingLabelArchived"));
    } catch (err) {
      setLabelArchiveError(resolveAdminError(t, err, "admin.shippingUnableToArchiveLabel"));
    } finally {
      setLabelArchiving(false);
    }
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

  const parcelWarnings = useMemo(() => {
    const length = Number(parcel.length);
    const width = Number(parcel.width);
    const height = Number(parcel.height);
    if (![length, width, height].every((value) => Number.isFinite(value) && value > 0)) {
      return [];
    }
    const unit = parcel.distance_unit || "in";
    const lengthIn = toInches(length, unit);
    const widthIn = toInches(width, unit);
    const heightIn = toInches(height, unit);
    const volume = lengthIn * widthIn * heightIn;
    const warnings: string[] = [];
    if (volume > 1728) {
      warnings.push(t("admin.shippingVolumeWarning"));
    }
    if (lengthIn >= 22) {
      warnings.push(t("admin.shippingLengthWarning"));
    }
    return warnings;
  }, [parcel.length, parcel.width, parcel.height, parcel.distance_unit, t]);

  const sortedRates = useMemo(() => {
    return [...shippingRates].sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0));
  }, [shippingRates]);

  const readinessChecks = useMemo<FulfillmentCheck[]>(() => {
    if (!order) return [];

    const orderPaid =
      order.status === "paid" || order.status === "shipped" || order.status === "delivered";
    const shippingAddress =
      order.shipping_address && typeof order.shipping_address === "object"
        ? order.shipping_address
        : null;
    const shippingAddressPresent = Boolean(
      shippingAddress &&
        hasNonEmptyString(shippingAddress.address1) &&
        hasNonEmptyString(shippingAddress.city) &&
        hasNonEmptyString(shippingAddress.zip) &&
        hasNonEmptyString(shippingAddress.country)
    );
    const shipmentPurchased = shipment?.status === "purchased";

    const checks: FulfillmentCheck[] = [
      {
        label: "Order paid",
        tone: orderPaid ? "green" : "red",
        value: orderPaid ? "Paid" : `Status: ${order.status}`,
      },
      {
        label: "Stripe checkout session",
        tone: hasNonEmptyString(order.stripe_checkout_session_id) ? "green" : "red",
        value: hasNonEmptyString(order.stripe_checkout_session_id) ? "Present" : "Missing",
      },
      {
        label: "Subtotal",
        tone: hasFiniteNumber(order.subtotal_cents) ? "green" : "red",
        value:
          hasFiniteNumber(order.subtotal_cents) && formatOrderMoney(order.subtotal_cents, order.currency)
            ? formatOrderMoney(order.subtotal_cents, order.currency) || "Present"
            : "Missing",
      },
      {
        label: "Discount",
        tone: hasFiniteNumber(order.discount_cents) ? "green" : "red",
        value:
          hasFiniteNumber(order.discount_cents) && formatOrderMoney(order.discount_cents, order.currency)
            ? formatOrderMoney(order.discount_cents, order.currency) || "Present"
            : "Missing",
      },
      {
        label: "Shipping",
        tone: hasFiniteNumber(order.shipping_cents) ? "green" : "red",
        value:
          hasFiniteNumber(order.shipping_cents) && formatOrderMoney(order.shipping_cents, order.currency)
            ? formatOrderMoney(order.shipping_cents, order.currency) || "Present"
            : "Missing",
      },
      {
        label: "Tax",
        tone: hasFiniteNumber(order.tax_cents) ? "green" : "red",
        value:
          hasFiniteNumber(order.tax_cents) && formatOrderMoney(order.tax_cents, order.currency)
            ? formatOrderMoney(order.tax_cents, order.currency) || "Present"
            : "Missing",
      },
      {
        label: "Total",
        tone: hasFiniteNumber(order.total_cents) ? "green" : "red",
        value:
          hasFiniteNumber(order.total_cents) && formatOrderMoney(order.total_cents, order.currency)
            ? formatOrderMoney(order.total_cents, order.currency) || "Present"
            : "Missing",
      },
      {
        label: "Shipping address",
        tone: shippingAddressPresent ? "green" : "red",
        value: shippingAddressPresent ? "Present" : "Missing",
      },
      {
        label: "Customer email",
        tone: hasNonEmptyString(order.account_email || order.email) ? "green" : "red",
        value: hasNonEmptyString(order.account_email || order.email) ? "Present" : "Missing",
      },
      {
        label: "Shipment row",
        tone: shipment?.id ? "green" : canManageShipping ? "yellow" : "red",
        value: shipment?.id ? "Present" : canManageShipping ? "Can create now" : "Blocked until paid",
      },
      {
        label: "Order confirmation email",
        tone: order.order_confirmation_sent_at
          ? "green"
          : order.last_email_error
          ? "red"
          : orderPaid
          ? "yellow"
          : "yellow",
        value: order.order_confirmation_sent_at
          ? "Sent"
          : order.last_email_error
          ? "Error"
          : orderPaid
          ? "Pending"
          : "Waiting for paid order",
        detail: order.order_confirmation_sent_at
          ? new Date(order.order_confirmation_sent_at).toLocaleString()
          : order.last_email_error || undefined,
      },
      {
        label: "Shipping confirmation email",
        tone: order.shipping_confirmation_sent_at
          ? "green"
          : order.last_email_error && (order.status === "shipped" || order.status === "delivered")
          ? "red"
          : order.status === "shipped" || order.status === "delivered"
          ? "yellow"
          : "yellow",
        value: order.shipping_confirmation_sent_at
          ? "Sent"
          : order.status === "shipped" || order.status === "delivered"
          ? order.last_email_error
            ? "Error"
            : "Pending"
          : "Not applicable yet",
        detail: order.shipping_confirmation_sent_at
          ? new Date(order.shipping_confirmation_sent_at).toLocaleString()
          : order.last_email_error &&
            (order.status === "shipped" || order.status === "delivered")
          ? order.last_email_error
          : undefined,
      },
      {
        label: "Label provider rate",
        tone: hasNonEmptyString(shipment?.provider_rate_id)
          ? "green"
          : shipmentPurchased
          ? "red"
          : "yellow",
        value: hasNonEmptyString(shipment?.provider_rate_id)
          ? "Stored"
          : shipmentPurchased
          ? "Missing"
          : "Pending label purchase",
      },
      {
        label: "Label URL",
        tone: hasNonEmptyString(shipment?.label_url) ? "green" : shipmentPurchased ? "red" : "yellow",
        value: hasNonEmptyString(shipment?.label_url)
          ? "Stored"
          : shipmentPurchased
          ? "Missing"
          : "Pending label purchase",
      },
      {
        label: "Tracking number",
        tone: hasNonEmptyString(shipment?.tracking_number)
          ? "green"
          : shipmentPurchased
          ? "red"
          : "yellow",
        value: hasNonEmptyString(shipment?.tracking_number)
          ? "Stored"
          : shipmentPurchased
          ? "Missing"
          : "Pending label purchase",
      },
      {
        label: "Tracking URL",
        tone: hasNonEmptyString(shipment?.tracking_url)
          ? "green"
          : shipmentPurchased
          ? "red"
          : "yellow",
        value: hasNonEmptyString(shipment?.tracking_url)
          ? "Stored"
          : shipmentPurchased
          ? "Missing"
          : "Pending label purchase",
      },
      {
        label: "Postage amount",
        tone: hasFiniteNumber(shipment?.postage_amount)
          ? "green"
          : shipmentPurchased
          ? "red"
          : "yellow",
        value:
          hasFiniteNumber(shipment?.postage_amount) &&
          formatPostage(shipment?.postage_amount, shipment?.postage_currency)
            ? formatPostage(shipment?.postage_amount, shipment?.postage_currency) || "Stored"
            : shipmentPurchased
            ? "Missing"
            : "Pending label purchase",
      },
      {
        label: "Postage currency",
        tone: hasNonEmptyString(shipment?.postage_currency)
          ? "green"
          : shipmentPurchased
          ? "red"
          : "yellow",
        value: hasNonEmptyString(shipment?.postage_currency)
          ? String(shipment?.postage_currency).toUpperCase()
          : shipmentPurchased
          ? "Missing"
          : "Pending label purchase",
      },
    ];

    return checks;
  }, [canManageShipping, order, shipment]);

  const readinessSummary = useMemo(() => {
    const green = readinessChecks.filter((check) => check.tone === "green").length;
    const yellow = readinessChecks.filter((check) => check.tone === "yellow").length;
    const red = readinessChecks.filter((check) => check.tone === "red").length;
    return { green, yellow, red, total: readinessChecks.length };
  }, [readinessChecks]);

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

          <div
            className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white space-y-4"
            data-testid="admin-shipping-panel"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{t("admin.shippingLabelTitle")}</h3>
              {shipment?.status ? (
                <span
                  className="text-xs uppercase tracking-[0.2em] text-white/50"
                  data-testid="admin-shipping-status"
                >
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
                  <SelectField
                    value={parcelTemplateId ?? ""}
                    aria-label={t("admin.shippingPackageTemplate")}
                    onValueChange={(value) => handleTemplateChange(value)}
                    options={[
                      { value: "", label: t("admin.shippingCustomTemplate") },
                      ...parcelTemplates.map((template) => ({
                        value: template.id,
                        label: template.name,
                      })),
                    ]}
                  />
                  {templateNotice ? (
                    <p className="text-xs text-yellow-200">{templateNotice}</p>
                  ) : null}
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
                    <SelectField
                      value={parcel.distance_unit}
                      aria-label={t("admin.shippingDistanceUnit")}
                      onValueChange={(value) =>
                        setParcel((prev) => ({ ...prev, distance_unit: value }))
                      }
                      options={distanceUnits.map((unit) => ({
                        value: unit,
                        label: unit,
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                      {t("admin.shippingMassUnit")}
                    </label>
                    <SelectField
                      value={parcel.mass_unit}
                      aria-label={t("admin.shippingMassUnit")}
                      onValueChange={(value) =>
                        setParcel((prev) => ({ ...prev, mass_unit: value }))
                      }
                      options={massUnits.map((unit) => ({
                        value: unit,
                        label: unit,
                      }))}
                    />
                  </div>
                </div>
                {parcelWarnings.length ? (
                  <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">
                    {parcelWarnings.join(" ")}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                    {t("admin.shippingLabelFormat")}
                  </label>
                  <SelectField
                    value={labelFormat}
                    aria-label={t("admin.shippingLabelFormat")}
                    onValueChange={(value) => setLabelFormat(value as LabelFormat)}
                    options={LABEL_FORMATS.map((format) => ({
                      value: format,
                      label: format,
                    }))}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleGetRates}
                    disabled={shippingBusy || !canManageShipping}
                    className="bg-white/10"
                  >
                    {shippingBusy ? t("common.loading") : t("admin.shippingGetRates")}
                  </Button>
                </div>

                {shippingNotice ? (
                  <p className="text-sm text-lucky-green" data-testid="admin-shipping-notice">
                    {shippingNotice}
                  </p>
                ) : null}
                {shippingError ? (
                  <p className="text-sm text-red-400">{shippingError}</p>
                ) : null}
                {shippingPurchaseFailure ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100 space-y-2">
                    <p className="font-semibold">Label purchase failed</p>
                    {(shippingPurchaseFailure.provider_status ||
                      shippingPurchaseFailure.provider_object_state) ? (
                      <p className="text-xs text-red-100/80">
                        Shippo response:{" "}
                        {shippingPurchaseFailure.provider_status || "unknown"}
                        {shippingPurchaseFailure.provider_object_state
                          ? ` / ${shippingPurchaseFailure.provider_object_state}`
                          : ""}
                      </p>
                    ) : null}
                    {shippingPurchaseFailure.shippo_transaction_id ? (
                      <p className="text-xs text-red-100/80">
                        Shippo transaction: {shippingPurchaseFailure.shippo_transaction_id}
                      </p>
                    ) : null}
                    <p className="text-xs text-red-100/80">Label created: No</p>
                    <p className="text-xs text-red-100/80">
                      Shipment fields persisted:{" "}
                      {shippingPurchaseFailure.shipment_persisted ? "Partial" : "None"}
                    </p>
                    {shippingPurchaseFailure.missing_fields?.length ? (
                      <p className="text-xs text-red-100/80">
                        Not persisted: {shippingPurchaseFailure.missing_fields.join(", ")}
                      </p>
                    ) : null}
                    {shippingPurchaseFailure.provider_messages?.length ? (
                      <div className="space-y-1 border-t border-red-200/20 pt-2 text-xs text-red-100/80">
                        {shippingPurchaseFailure.provider_messages.map((message, index) => {
                          const prefix = [message.code, message.source]
                            .filter(Boolean)
                            .join(" / ");
                          const text = message.text?.trim() || "Provider error";
                          return (
                            <p key={`${prefix || "message"}-${index}`}>
                              {prefix ? `${prefix}: ${text}` : text}
                            </p>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {labelArchiveError ? (
                  <p className="text-sm text-red-400">{labelArchiveError}</p>
                ) : null}

                {shipment?.status === "purchased" ? (
                  <div
                    className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2"
                    data-testid="admin-shipping-purchased-panel"
                  >
                    <p className="text-sm text-lucky-green" data-testid="admin-shipping-label-ready">
                      {t("admin.shippingLabelReady")}
                    </p>
                    <Button
                      variant="secondary"
                      className="bg-white/10"
                      onClick={handleDownloadLabel}
                      disabled={shippingBusy}
                    >
                      {t("admin.shippingDownloadLabel", {
                        format: shipment.label_format || labelFormat,
                      })}
                    </Button>
                    {!shipment.label_asset_url ? (
                      <div className="text-xs text-white/60">
                        {labelArchiving
                          ? t("admin.shippingLabelArchiving")
                          : t("admin.shippingLabelNotArchived")}
                        <Button
                          variant="secondary"
                          onClick={handleRetryArchive}
                          disabled={labelArchiving}
                          className="ml-2 bg-white/10"
                        >
                          {labelArchiving
                            ? t("admin.shippingLabelArchiving")
                            : t("admin.shippingRetryArchive")}
                        </Button>
                      </div>
                    ) : null}
                    {shipment.tracking_number ? (
                      <p className="text-sm text-white/70" data-testid="admin-shipping-tracking-number">
                        {t("admin.shippingTrackingNumber")}: {shipment.tracking_number}
                      </p>
                    ) : null}
                    {formatPostage(shipment.postage_amount, shipment.postage_currency) ? (
                      <p className="text-sm text-white/70">
                        {t("admin.shippingPostage")}:{" "}
                        {formatPostage(shipment.postage_amount, shipment.postage_currency)}
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
                          data-testid="admin-shipping-mark-shipped"
                        >
                          {t("admin.shippingMarkShipped")}
                        </Button>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <p className="text-sm font-semibold">{t("admin.shippingRatesTitle")}</p>
                  {sortedRates.length ? (
                    <div className="space-y-2" data-testid="admin-shipping-rates-list">
                      {sortedRates.map((rate) => {
                        const amount = Number(rate.amount);
                        const displayAmount = Number.isFinite(amount) ? amount.toFixed(2) : "--";
                        return (
                          <div
                            key={rate.id}
                            className="rounded-xl border border-white/10 bg-black/30 p-3"
                            data-testid="admin-shipping-rate-row"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-white">
                                  {rate.provider} · {rate.service}
                                </p>
                                {rate.estimated_days != null ? (
                                  <p className="text-xs text-white/60">
                                    {t("admin.shippingEstimatedDays", {
                                      days: rate.estimated_days,
                                    })}
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
                                  data-testid="admin-shipping-buy-label"
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

          <OrderTotalsCard order={order} />
        </div>

        <div className="space-y-5">
          <div
            className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white"
            data-testid="admin-fulfillment-readiness"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">Readiness / Fulfillment Check</h3>
                <p className="mt-1 text-sm text-white/60">
                  Quick verification for payment, totals, contact, shipment, and label persistence.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                  <span className="rounded-full border border-lucky-green/30 bg-lucky-green/15 px-3 py-1 text-lucky-green">
                    Ready {readinessSummary.green}
                  </span>
                  <span className="rounded-full border border-yellow-500/30 bg-yellow-500/15 px-3 py-1 text-yellow-100">
                    Pending {readinessSummary.yellow}
                  </span>
                  <span className="rounded-full border border-red-500/30 bg-red-500/15 px-3 py-1 text-red-200">
                    Missing {readinessSummary.red}
                  </span>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleRefreshReadiness}
                    disabled={readinessRefreshing}
                    className="bg-white/10"
                  >
                    {readinessRefreshing ? "Refreshing..." : "Refresh"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setReadinessExpanded((prev) => !prev)}
                    className="bg-white/10"
                  >
                    {readinessExpanded ? "Collapse" : "Expand"}
                  </Button>
                </div>
              </div>
            </div>

            {readinessExpanded ? (
              <div className="mt-4 space-y-2">
                {readinessChecks.map((check) => (
                  <div
                    key={check.label}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{check.label}</p>
                        {check.detail ? (
                          <p className="mt-1 text-xs leading-5 text-white/55">{check.detail}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${checkToneClass(
                            check.tone
                          )}`}
                        >
                          {checkToneLabel(check.tone)}
                        </span>
                        <span className="text-sm text-white/75">{check.value}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-white/55">
                Minimized. Expand to review detailed readiness checks.
              </p>
            )}
          </div>

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
              <SelectField
                value={status}
                aria-label={t("admin.statusLabel")}
                onValueChange={(value) =>
                  setStatus(value as AdminOrderDetail["status"])
                }
                options={STATUSES.map((s) => ({
                  value: s,
                  label: t(STATUS_LABEL_KEYS[s]),
                }))}
              />
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
