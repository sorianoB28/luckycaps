"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/providers/LanguageProvider";
import type { AdminPromoCode } from "@/lib/api";

type FormValue = {
  code: string;
  active: boolean;
  discount_type: "percent" | "amount";
  percent_off: string;
  amount_off: string;
  currency: string;
  min_subtotal: string;
  max_redemptions: string;
  starts_at: string;
  ends_at: string;
};

const centsFromDollars = (value: string) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
};

const dollarsFromCents = (cents?: number | null) =>
  cents == null ? "" : (cents / 100).toFixed(2);

export function PromoCodeForm(props: {
  initial?: AdminPromoCode | null;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (payload: {
    code: string;
    active: boolean;
    discount_type: "percent" | "amount";
    percent_off: number | null;
    amount_off_cents: number | null;
    currency: string;
    min_subtotal_cents: number | null;
    max_redemptions: number | null;
    starts_at: string | null;
    ends_at: string | null;
  }) => void | Promise<void>;
}) {
  const { initial, submitting, error, onSubmit } = props;
  const t = useT();

  const initialValue: FormValue = useMemo(() => {
    const discountType = initial?.discount_type ?? "percent";
    return {
      code: initial?.code ?? "",
      active: initial?.active ?? true,
      discount_type: discountType,
      percent_off: initial?.percent_off != null ? String(initial.percent_off) : "",
      amount_off: dollarsFromCents(initial?.amount_off_cents),
      currency: (initial?.currency ?? "usd").toLowerCase(),
      min_subtotal: dollarsFromCents(initial?.min_subtotal_cents),
      max_redemptions: initial?.max_redemptions != null ? String(initial.max_redemptions) : "",
      starts_at: initial?.starts_at ? initial.starts_at.slice(0, 16) : "",
      ends_at: initial?.ends_at ? initial.ends_at.slice(0, 16) : "",
    };
  }, [initial]);

  const [value, setValue] = useState<FormValue>(initialValue);

  const handleSubmit = async () => {
    const code = value.code.trim().toUpperCase();
    const currency = (value.currency || "usd").toLowerCase();

    const percentOff =
      value.discount_type === "percent" && value.percent_off.trim()
        ? Number(value.percent_off)
        : null;
    const amountOffCents =
      value.discount_type === "amount" && value.amount_off.trim()
        ? centsFromDollars(value.amount_off)
        : null;
    const minSubtotalCents = value.min_subtotal.trim()
      ? centsFromDollars(value.min_subtotal)
      : null;
    const maxRedemptions = value.max_redemptions.trim()
      ? Math.max(0, Math.floor(Number(value.max_redemptions)))
      : null;

    const startsAt = value.starts_at.trim() ? new Date(value.starts_at).toISOString() : null;
    const endsAt = value.ends_at.trim() ? new Date(value.ends_at).toISOString() : null;

    await onSubmit({
      code,
      active: Boolean(value.active),
      discount_type: value.discount_type,
      percent_off: percentOff,
      amount_off_cents: amountOffCents,
      currency,
      min_subtotal_cents: minSubtotalCents,
      max_redemptions: maxRedemptions,
      starts_at: startsAt,
      ends_at: endsAt,
    });
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("common.code")}</Label>
          <Input
            value={value.code}
            onChange={(e) => setValue((prev) => ({ ...prev, code: e.target.value }))}
            className="bg-white/5 text-white"
            placeholder="SAVE10"
          />
        </div>

        <div className="space-y-2">
          <Label>{t("common.status")}</Label>
          <select
            value={value.active ? "active" : "inactive"}
            onChange={(e) => setValue((prev) => ({ ...prev, active: e.target.value === "active" }))}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="active">{t("adminPromoCodes.statusActive")}</option>
            <option value="inactive">{t("adminPromoCodes.statusInactive")}</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>{t("adminPromoCodes.discountTypeLabel")}</Label>
          <select
            value={value.discount_type}
            onChange={(e) => setValue((prev) => ({ ...prev, discount_type: e.target.value as any }))}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="percent">{t("adminPromoCodes.discountTypePercent")}</option>
            <option value="amount">{t("adminPromoCodes.discountTypeAmount")}</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>{t("adminPromoCodes.currency")}</Label>
          <Input
            value={value.currency}
            onChange={(e) => setValue((prev) => ({ ...prev, currency: e.target.value }))}
            className="bg-white/5 text-white"
            placeholder="usd"
          />
        </div>

        {value.discount_type === "percent" ? (
          <div className="space-y-2 md:col-span-2">
            <Label>{t("adminPromoCodes.percentOff")}</Label>
            <Input
              value={value.percent_off}
              onChange={(e) => setValue((prev) => ({ ...prev, percent_off: e.target.value }))}
              className="bg-white/5 text-white"
              placeholder="10"
            />
          </div>
        ) : (
          <div className="space-y-2 md:col-span-2">
            <Label>{t("adminPromoCodes.amountOff")}</Label>
            <Input
              value={value.amount_off}
              onChange={(e) => setValue((prev) => ({ ...prev, amount_off: e.target.value }))}
              className="bg-white/5 text-white"
              placeholder="5.00"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>{t("adminPromoCodes.minSubtotal")}</Label>
          <Input
            value={value.min_subtotal}
            onChange={(e) => setValue((prev) => ({ ...prev, min_subtotal: e.target.value }))}
            className="bg-white/5 text-white"
            placeholder="20.00"
          />
        </div>

        <div className="space-y-2">
          <Label>{t("adminPromoCodes.maxRedemptions")}</Label>
          <Input
            value={value.max_redemptions}
            onChange={(e) => setValue((prev) => ({ ...prev, max_redemptions: e.target.value }))}
            className="bg-white/5 text-white"
            placeholder="100"
          />
        </div>

        <div className="space-y-2">
          <Label>{t("adminPromoCodes.startsAt")}</Label>
          <Input
            type="datetime-local"
            value={value.starts_at}
            onChange={(e) => setValue((prev) => ({ ...prev, starts_at: e.target.value }))}
            className="bg-white/5 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label>{t("adminPromoCodes.endsAt")}</Label>
          <Input
            type="datetime-local"
            value={value.ends_at}
            onChange={(e) => setValue((prev) => ({ ...prev, ends_at: e.target.value }))}
            className="bg-white/5 text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={handleSubmit}
          disabled={Boolean(submitting)}
          className="bg-lucky-green text-lucky-darker"
        >
          {submitting ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  );
}
