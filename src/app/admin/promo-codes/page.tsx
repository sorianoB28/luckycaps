"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/components/providers/LanguageProvider";
import { getAdminPromoCodes, type AdminPromoCode, updateAdminPromoCode } from "@/lib/api";

const dollars = (cents?: number | null) =>
  cents == null ? "-" : `$${(cents / 100).toFixed(2)}`;

export default function AdminPromoCodesPage() {
  const t = useT();
  const [codes, setCodes] = useState<AdminPromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminPromoCodes();
      setCodes(res);
    } catch (err) {
      setError((err as Error).message || "Unable to load promo codes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">{t("admin.title")}</p>
          <h1 className="font-display text-4xl">{t("admin.promoCodes")}</h1>
        </div>
        <Button asChild>
          <Link href="/admin/promo-codes/new">{t("common.add")}</Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle>{t("admin.promoCodes")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-white/70">{t("common.loading")}</p>
          ) : codes.length === 0 ? (
            <p className="text-sm text-white/70">{t("adminPromoCodes.noneYet")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-white/60">
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-3">{t("common.code")}</th>
                  <th className="py-3 pr-3">{t("common.status")}</th>
                  <th className="py-3 pr-3">{t("common.type")}</th>
                  <th className="py-3 pr-3">{t("common.value")}</th>
                  <th className="py-3 pr-3">{t("adminPromoCodes.minSubtotal")}</th>
                  <th className="py-3 pr-3">{t("adminPromoCodes.redeemed")}</th>
                  <th className="py-3 pr-3">{t("adminPromoCodes.window")}</th>
                  <th className="py-3 pr-0 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {codes.map((pc) => {
                  const value =
                    pc.discount_type === "percent"
                      ? `${pc.percent_off ?? 0}%`
                      : dollars(pc.amount_off_cents);
                  const discountTypeLabel =
                    pc.discount_type === "percent"
                      ? t("adminPromoCodes.discountTypePercent")
                      : t("adminPromoCodes.discountTypeAmount");
                  const window =
                    pc.starts_at || pc.ends_at
                      ? `${pc.starts_at ? new Date(pc.starts_at).toLocaleDateString() : "-"} -> ${
                          pc.ends_at ? new Date(pc.ends_at).toLocaleDateString() : "-"
                        }`
                      : "-";
                  return (
                    <tr key={pc.id}>
                      <td className="py-3 pr-3 font-mono text-xs">{pc.code}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={
                            pc.active
                              ? "rounded-full bg-lucky-green/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-lucky-green"
                              : "rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70"
                          }
                        >
                          {pc.active
                            ? t("adminPromoCodes.statusActive")
                            : t("adminPromoCodes.statusInactive")}
                        </span>
                      </td>
                      <td className="py-3 pr-3">{discountTypeLabel}</td>
                      <td className="py-3 pr-3">{value}</td>
                      <td className="py-3 pr-3">{dollars(pc.min_subtotal_cents)}</td>
                      <td className="py-3 pr-3">
                        {(pc.times_redeemed ?? 0).toString()}
                        {pc.max_redemptions != null ? ` / ${pc.max_redemptions}` : ""}
                      </td>
                      <td className="py-3 pr-3 text-white/70">{window}</td>
                      <td className="py-3 pr-0 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" asChild className="bg-white/10">
                            <Link href={`/admin/promo-codes/${pc.id}`}>{t("admin.edit")}</Link>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="bg-white/10"
                            disabled={savingId === pc.id}
                            onClick={async () => {
                              setSavingId(pc.id);
                              try {
                                const updated = await updateAdminPromoCode(pc.id, {
                                  active: !pc.active,
                                });
                                setCodes((prev) =>
                                  prev.map((row) => (row.id === pc.id ? updated : row))
                                );
                              } catch (err) {
                                setError((err as Error).message || "Unable to update promo code");
                              } finally {
                                setSavingId(null);
                              }
                            }}
                          >
                            {pc.active ? t("common.disable") : t("common.enable")}
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

