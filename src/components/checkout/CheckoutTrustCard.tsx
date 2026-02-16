"use client";

import { Headset, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import type { ComponentType } from "react";

type CheckoutTrustCardProps = {
  title: string;
  stripeLabel: string;
  shippingLabel: string;
  supportLabel: string;
  returnsLabel: string;
  className?: string;
};

type TrustRowProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
};

function TrustRow({ icon: Icon, label }: TrustRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-lucky-green" />
      <span>{label}</span>
    </div>
  );
}

export function CheckoutTrustCard({
  title,
  stripeLabel,
  shippingLabel,
  supportLabel,
  returnsLabel,
  className,
}: CheckoutTrustCardProps) {
  return (
    <div
      className={`space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-white ${className ?? ""}`}
      data-testid="checkout-trust-card"
    >
      <p className="text-sm font-semibold text-white/80">{title}</p>
      <div className="space-y-2 text-xs text-white/70">
        <TrustRow icon={ShieldCheck} label={stripeLabel} />
        <TrustRow icon={Truck} label={shippingLabel} />
        <TrustRow icon={Headset} label={supportLabel} />
        <TrustRow icon={RotateCcw} label={returnsLabel} />
      </div>
    </div>
  );
}
