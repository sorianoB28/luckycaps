"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

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
const DISTANCE_UNITS = ["in", "cm"] as const;
const MASS_UNITS = ["oz", "lb", "g", "kg"] as const;

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

function Field({
  id,
  label,
  help,
  required,
  requiredText,
  className,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  required?: boolean;
  requiredText?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <label htmlFor={id} className="text-xs uppercase tracking-[0.18em] text-white/55">
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="ml-1 text-red-400">
              *
            </span>
            <span className="sr-only"> {requiredText}</span>
          </>
        ) : null}
      </label>
      {children}
      {help ? <p className="text-xs leading-5 text-white/50">{help}</p> : null}
    </div>
  );
}

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

  const validateRecipient = () => {
    const requiredValues = [
      recipient.name,
      recipient.address1,
      recipient.city,
      recipient.zip,
      recipient.country,
    ];
    return requiredValues.every((value) => String(value ?? "").trim().length > 0);
  };

  const normalizeRecipient = (): AdminManualRecipient => ({
    ...recipient,
    name: String(recipient.name ?? "").trim(),
    email: String(recipient.email ?? "").trim() || null,
    phone: String(recipient.phone ?? "").trim() || null,
    address1: String(recipient.address1 ?? "").trim(),
    address2: String(recipient.address2 ?? "").trim() || null,
    city: String(recipient.city ?? "").trim(),
    state: String(recipient.state ?? "").trim() || null,
    zip: String(recipient.zip ?? "").trim(),
    country: String(recipient.country ?? "").trim().toUpperCase(),
  });

  const validateParcel = () =>
    [parcel.length, parcel.width, parcel.height, parcel.weight].every(
      (value) => Number.isFinite(Number(value)) && Number(value) > 0
    ) && Boolean(parcel.distance_unit && parcel.mass_unit);

  const handleGetRates = async () => {
    if (!validateRecipient()) {
      setError(t("admin.manualInvalidRecipient"));
      return;
    }
    if (!validateParcel()) {
      setError(t("admin.shippingInvalidParcel"));
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await createAdminManualShippingDraft({
        recipient: normalizeRecipient(),
        parcel,
        label_format: labelFormat,
      });
      setCurrentShipment(res.shipment ?? null);
      setRates(res.rates ?? []);
      setNotice(t("admin.manualRatesReady"));
      await loadShipments();
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
          <div className="grid gap-4 md:grid-cols-3">
            <Field
              id="manual-recipient-name"
              label={t("admin.manualRecipientName")}
              help={t("admin.manualRecipientNameHelp")}
              required
              requiredText={t("admin.requiredField")}
            >
              <Input
                id="manual-recipient-name"
                value={recipient.name || ""}
                onChange={(e) => setRecipient((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t("admin.manualRecipientNamePlaceholder")}
                className="bg-black/40 text-white"
                autoComplete="name"
              />
            </Field>
            <Field
              id="manual-recipient-email"
              label={t("admin.manualRecipientEmail")}
              help={t("admin.manualRecipientEmailHelp")}
            >
              <Input
                id="manual-recipient-email"
                type="email"
                value={recipient.email || ""}
                onChange={(e) => setRecipient((prev) => ({ ...prev, email: e.target.value }))}
                placeholder={t("admin.manualRecipientEmailPlaceholder")}
                className="bg-black/40 text-white"
                autoComplete="email"
              />
            </Field>
            <Field
              id="manual-recipient-phone"
              label={t("admin.manualRecipientPhone")}
              help={t("admin.manualRecipientPhoneHelp")}
            >
              <Input
                id="manual-recipient-phone"
                type="tel"
                value={recipient.phone || ""}
                onChange={(e) => setRecipient((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder={t("admin.manualRecipientPhonePlaceholder")}
                className="bg-black/40 text-white"
                autoComplete="tel"
              />
            </Field>
            <Field
              id="manual-address-1"
              label={t("admin.manualAddress1")}
              help={t("admin.manualAddress1Help")}
              className="md:col-span-2"
              required
              requiredText={t("admin.requiredField")}
            >
              <Input
                id="manual-address-1"
                value={recipient.address1}
                onChange={(e) => setRecipient((prev) => ({ ...prev, address1: e.target.value }))}
                placeholder={t("admin.manualAddress1Placeholder")}
                className="bg-black/40 text-white"
                autoComplete="address-line1"
              />
            </Field>
            <Field
              id="manual-address-2"
              label={t("admin.manualAddress2")}
              help={t("admin.manualAddress2Help")}
            >
              <Input
                id="manual-address-2"
                value={recipient.address2 || ""}
                onChange={(e) => setRecipient((prev) => ({ ...prev, address2: e.target.value }))}
                placeholder={t("admin.manualAddress2Placeholder")}
                className="bg-black/40 text-white"
                autoComplete="address-line2"
              />
            </Field>
            <Field
              id="manual-city"
              label={t("admin.manualCity")}
              required
              requiredText={t("admin.requiredField")}
            >
              <Input
                id="manual-city"
                value={recipient.city}
                onChange={(e) => setRecipient((prev) => ({ ...prev, city: e.target.value }))}
                placeholder={t("admin.manualCityPlaceholder")}
                className="bg-black/40 text-white"
                autoComplete="address-level2"
              />
            </Field>
            <Field id="manual-state" label={t("admin.manualState")} help={t("admin.manualStateHelp")}>
              <Input
                id="manual-state"
                value={recipient.state || ""}
                onChange={(e) => setRecipient((prev) => ({ ...prev, state: e.target.value }))}
                placeholder={t("admin.manualStatePlaceholder")}
                className="bg-black/40 text-white"
                autoComplete="address-level1"
              />
            </Field>
            <Field
              id="manual-zip"
              label={t("admin.manualZip")}
              required
              requiredText={t("admin.requiredField")}
            >
              <Input
                id="manual-zip"
                value={recipient.zip}
                onChange={(e) => setRecipient((prev) => ({ ...prev, zip: e.target.value }))}
                placeholder={t("admin.manualZipPlaceholder")}
                className="bg-black/40 text-white"
                autoComplete="postal-code"
              />
            </Field>
            <Field
              id="manual-country"
              label={t("admin.manualCountry")}
              help={t("admin.manualCountryHelp")}
              required
              requiredText={t("admin.requiredField")}
            >
              <Input
                id="manual-country"
                value={recipient.country}
                onChange={(e) =>
                  setRecipient((prev) => ({ ...prev, country: e.target.value.toUpperCase() }))
                }
                placeholder={t("admin.manualCountryPlaceholder")}
                className="bg-black/40 text-white uppercase"
                autoComplete="country"
                maxLength={2}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Field
              id="manual-parcel-length"
              label={t("admin.shippingLength")}
              help={t("admin.shippingLengthHelp")}
              required
              requiredText={t("admin.requiredField")}
            >
              <Input
                id="manual-parcel-length"
                type="number"
                min="0"
                step="0.01"
                value={parcel.length}
                onChange={(e) => setParcel((prev) => ({ ...prev, length: Number(e.target.value) }))}
                placeholder="8"
                className="bg-black/40 text-white"
              />
            </Field>
            <Field
              id="manual-parcel-width"
              label={t("admin.shippingWidth")}
              help={t("admin.shippingWidthHelp")}
              required
              requiredText={t("admin.requiredField")}
            >
              <Input
                id="manual-parcel-width"
                type="number"
                min="0"
                step="0.01"
                value={parcel.width}
                onChange={(e) => setParcel((prev) => ({ ...prev, width: Number(e.target.value) }))}
                placeholder="8"
                className="bg-black/40 text-white"
              />
            </Field>
            <Field
              id="manual-parcel-height"
              label={t("admin.shippingHeight")}
              help={t("admin.shippingHeightHelp")}
              required
              requiredText={t("admin.requiredField")}
            >
              <Input
                id="manual-parcel-height"
                type="number"
                min="0"
                step="0.01"
                value={parcel.height}
                onChange={(e) => setParcel((prev) => ({ ...prev, height: Number(e.target.value) }))}
                placeholder="4"
                className="bg-black/40 text-white"
              />
            </Field>
            <Field
              id="manual-parcel-weight"
              label={t("admin.shippingWeight")}
              help={t("admin.shippingWeightHelp")}
              required
              requiredText={t("admin.requiredField")}
            >
              <Input
                id="manual-parcel-weight"
                type="number"
                min="0"
                step="0.01"
                value={parcel.weight}
                onChange={(e) => setParcel((prev) => ({ ...prev, weight: Number(e.target.value) }))}
                placeholder="8"
                className="bg-black/40 text-white"
              />
            </Field>
            <Field
              id="manual-distance-unit"
              label={t("admin.shippingDistanceUnit")}
              help={t("admin.shippingDistanceUnitHelp")}
              required
              requiredText={t("admin.requiredField")}
            >
              <SelectField
                id="manual-distance-unit"
                value={parcel.distance_unit}
                aria-label={t("admin.shippingDistanceUnit")}
                onValueChange={(value) => setParcel((prev) => ({ ...prev, distance_unit: value }))}
                options={DISTANCE_UNITS.map((unit) => ({
                  value: unit,
                  label: t(`admin.shippingDistanceUnit_${unit}`),
                }))}
              />
            </Field>
            <Field
              id="manual-mass-unit"
              label={t("admin.shippingMassUnit")}
              help={t("admin.shippingMassUnitHelp")}
              required
              requiredText={t("admin.requiredField")}
            >
              <SelectField
                id="manual-mass-unit"
                value={parcel.mass_unit}
                aria-label={t("admin.shippingMassUnit")}
                onValueChange={(value) => setParcel((prev) => ({ ...prev, mass_unit: value }))}
                options={MASS_UNITS.map((unit) => ({
                  value: unit,
                  label: t(`admin.shippingMassUnit_${unit}`),
                }))}
              />
            </Field>
            <Field
              id="manual-label-format"
              label={t("admin.shippingLabelFormat")}
              help={t("admin.shippingLabelFormatHelp")}
              required
              requiredText={t("admin.requiredField")}
            >
              <SelectField
                id="manual-label-format"
                value={labelFormat}
                aria-label={t("admin.shippingLabelFormat")}
                onValueChange={(value) => setLabelFormat(value as LabelFormat)}
                options={LABEL_FORMATS.map((format) => ({
                  value: format,
                  label: t(`admin.shippingLabelFormat_${format}`),
                }))}
              />
            </Field>
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
                      {rate.provider} - {rate.service}
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
