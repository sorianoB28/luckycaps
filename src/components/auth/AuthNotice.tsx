"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "success" | "error" | "info" | "loading";

export function AuthNotice({
  status,
  title,
  body,
}: {
  status: Status;
  title: string;
  body?: string;
}) {
  const icon =
    status === "success"
      ? CheckCircle2
      : status === "loading"
      ? Loader2
      : AlertCircle;

  const Icon = icon;

  const base =
    status === "success"
      ? "border-lucky-green/70 bg-lucky-green/10 text-lucky-green"
      : status === "loading"
      ? "border-white/30 bg-white/5 text-white"
      : "border-red-400/70 bg-red-400/10 text-red-200";

  return (
    <div
      role={status === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 text-sm shadow-lg backdrop-blur",
        base
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-5 w-5",
          status === "loading" ? "animate-spin text-white/80" : ""
        )}
      />
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {body ? <p className="text-white/80">{body}</p> : null}
      </div>
    </div>
  );
}
