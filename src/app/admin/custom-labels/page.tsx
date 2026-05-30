"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { useT } from "@/components/providers/LanguageProvider";
import { resolveAdminError } from "@/lib/adminErrors";
import {
  type AdminManualRecipient,
  type AdminManualShipment,
  type AdminShipmentParcel,
  type AdminShipmentRate,
  buyAdminManualShippingLabel,
  createAdminManualShippingDraft,
  getAdminManualShipments,
} from "@/lib/api";

type LabelFormat = "PDF_4x6" | "ZPLII";
const LABEL_FORMATS: LabelFormat[] = ["PDF_4x6", "ZPLII"];

const money = (amount?: number | null, currency?: string | null) => {
  const numeric = Number(amount ?? 0);
  if (!Number.isFinite(numeric)) return null;
  const code = currency ? currency.toUpperCase() : "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(numeric);
  } catch {
    return `$${numeric.toFixed(2)} ${code}`;
  }
};

export default function AdminCustomLabelsPage() {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rates, setRates] = useState<AdminShipmentRate[]>([]);
  const [currentShipment, setCurrentShipment] = useState<AdminManualShipment | null>(null);
  const [shipments, setShipments] = useState<AdminManualShipment[]>([]);
  const [labelFormat, setLabelFormat] = useState<LabelFormat>("PDF_4x6");

  const [recipient, setRecipient] = useState<AdminManualRecipient>({
    name: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });
  const [parcel, setParcel] = useState<AdminShipmentParcel>({
    length: 8,
    width: 8,
    height: 4,
    distance_unit: "in",
    weight: 8,
    mass_unit: "oz",
  });

  const loadShipments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminManualShipments();
      setShipments(res.shipments ?? []);
    } catch (err) {
      setError(resolveAdminError(t, err, "admin.manualUnableToLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const sortedRates = useMemo(
    () => [...rates].sort((a, b) => Number(a.amount ?? 0) - Number(b.amount ?? 0)),
    [rates]
  );

  const handleGetRates = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await createAdminManualShippingDraft({
        recipient,
        parcel,
        label_format: labelFormat,
      });
      setCurrentShipment(res.shipment ?? null);
      setRates(res.rates ?? []);
      setNotice(t("admin.manualRatesReady"));
    } catch (err) {
      setError(resolveAdminError(t, err, "admin.manualUnableToCreateDraft"));
    } finally {
      setBusy(false);
    }
  };

  const handleBuyLabel = async (rateId: string) => {
    if (!currentShipment?.id) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await buyAdminManualShippingLabel(currentShipment.id, {
        rate_id: rateId,
        label_format: labelFormat,
      });
      setCurrentShipment(res.shipment ?? null);
      setNotice(t("admin.manualLabelPurchased"));
      if (res.label_error) setError(res.label_error);
      await loadShipments();
    } catch (err) {
      setError(resolveAdminError(t, err, "admin.manualUnableToBuyLabel"));
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = (id: string) => {
    window.open(`/api/admin/manual-shipments/${id}/label`, "_blank", "noopener");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-white/50">{t("admin.title")}</p>
        <h1 className="font-display text-4xl">{t("admin.customLabels")}</h1>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-lg border border-lucky-green/30 bg-lucky-green/10 px-4 py-3 text-sm text-lucky-green">
          {notice}
        </div>
      ) : null}

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>{t("admin.manualCreateTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              value={recipient.name || ""}
              onChange={(e) => setRecipient((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t("admin.manualRecipientName")}
              className="bg-black/40 text-white"
            />
            <Input
              value={recipient.email || ""}
              onChange={(e) => setRecipient((prev) => ({ ...prev, email: e.target.value }))}
              placeholder={t("admin.manualRecipientEmail")}
              className="bg-black/40 text-white"
            />
            <Input
              value={recipient.phone || ""}
              onChange={(e) => setRecipient((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder={t("admin.manualRecipientPhone")}
              className="bg-black/40 text-white"
            />
            <Input
              value={recipient.address1}
              onChange={(e) => setRecipient((prev) => ({ ...prev, address1: e.target.value }))}
              placeholder={t("admin.manualAddress1")}
              className="bg-black/40 text-white md:col-span-2"
            />
            <Input
              value={recipient.address2 || ""}
              onChange={(e) => setRecipient((prev) => ({ ...prev, address2: e.target.value }))}
              placeholder={t("admin.manualAddress2")}
              className="bg-black/40 text-white"
            />
            <Input
              value={recipient.city}
              onChange={(e) => setRecipient((prev) => ({ ...prev, city: e.target.value }))}
              placeholder={t("admin.manualCity")}
              className="bg-black/40 text-white"
            />
            <Input
              value={recipient.state || ""}
              onChange={(e) => setRecipient((prev) => ({ ...prev, state: e.target.value }))}
              placeholder={t("admin.manualState")}
              className="bg-black/40 text-white"
            />
            <Input
              value={recipient.zip}
              onChange={(e) => setRecipient((prev) => ({ ...prev, zip: e.target.value }))}
              placeholder={t("admin.manualZip")}
              className="bg-black/40 text-white"
            />
            <Input
              value={recipient.country}
              onChange={(e) => setRecipient((prev) => ({ ...prev, country: e.target.value }))}
              placeholder={t("admin.manualCountry")}
              className="bg-black/40 text-white"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={parcel.length}
              onChange={(e) => setParcel((prev) => ({ ...prev, length: Number(e.target.value) }))}
              placeholder={t("admin.shippingLength")}
              className="bg-black/40 text-white"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={parcel.width}
              onChange={(e) => setParcel((prev) => ({ ...prev, width: Number(e.target.value) }))}
              placeholder={t("admin.shippingWidth")}
              className="bg-black/40 text-white"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={parcel.height}
              onChange={(e) => setParcel((prev) => ({ ...prev, height: Number(e.target.value) }))}
              placeholder={t("admin.shippingHeight")}
              className="bg-black/40 text-white"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={parcel.weight}
              onChange={(e) => setParcel((prev) => ({ ...prev, weight: Number(e.target.value) }))}
              placeholder={t("admin.shippingWeight")}
              className="bg-black/40 text-white"
            />
            <SelectField
              value={parcel.distance_unit}
              aria-label={t("admin.shippingDistanceUnit")}
              onValueChange={(value) => setParcel((prev) => ({ ...prev, distance_unit: value }))}
              options={[
                { value: "in", label: "in" },
                { value: "cm", label: "cm" },
              ]}
            />
            <SelectField
              value={parcel.mass_unit}
              aria-label={t("admin.shippingMassUnit")}
              onValueChange={(value) => setParcel((prev) => ({ ...prev, mass_unit: value }))}
              options={[
                { value: "oz", label: "oz" },
                { value: "lb", label: "lb" },
                { value: "g", label: "g" },
                { value: "kg", label: "kg" },
              ]}
            />
            <SelectField
              value={labelFormat}
              aria-label={t("admin.shippingLabelFormat")}
              onValueChange={(value) => setLabelFormat(value as LabelFormat)}
              options={LABEL_FORMATS.map((format) => ({ value: format, label: format }))}
            />
          </div>

          <div>
            <Button onClick={handleGetRates} disabled={busy}>
              {busy ? t("common.loading") : t("admin.shippingGetRates")}
            </Button>
          </div>

          {sortedRates.length ? (
            <div className="space-y-2">
              {sortedRates.map((rate) => (
                <div
                  key={rate.id}
                  className="rounded-xl border border-white/10 bg-black/30 p-3 flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {rate.provider} · {rate.service}
                    </p>
                    <p className="text-xs text-white/70">
                      {money(rate.amount, rate.currency) || `$${Number(rate.amount ?? 0).toFixed(2)} ${rate.currency}`}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="bg-white/10"
                    disabled={busy || !currentShipment?.id}
                    onClick={() => handleBuyLabel(rate.id)}
                  >
                    {t("admin.shippingBuyLabel")}
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>{t("admin.manualRecentTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-white/70">{t("common.loading")}</p>
          ) : shipments.length === 0 ? (
            <p className="text-sm text-white/70">{t("admin.manualNoneYet")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-white/60">
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-3">{t("common.created")}</th>
                  <th className="py-3 pr-3">{t("common.customer")}</th>
                  <th className="py-3 pr-3">{t("common.status")}</th>
                  <th className="py-3 pr-3">{t("admin.shippingTrackingNumber")}</th>
                  <th className="py-3 pr-0 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {shipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td className="py-3 pr-3 text-white/80">
                      {shipment.created_at ? new Date(shipment.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="py-3 pr-3">{shipment.recipient?.name || "-"}</td>
                    <td className="py-3 pr-3">{shipment.status || "-"}</td>
                    <td className="py-3 pr-3">{shipment.tracking_number || "-"}</td>
                    <td className="py-3 pr-0 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-white/10"
                        disabled={shipment.status !== "purchased"}
                        onClick={() => handleDownload(shipment.id)}
                      >
                        {t("admin.shippingDownloadLabel", {
                          format: shipment.label_format || "PDF_4x6",
                        })}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
