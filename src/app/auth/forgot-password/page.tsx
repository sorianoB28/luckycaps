"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/AuthShell";
import { useT } from "@/components/providers/LanguageProvider";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!emailRegex.test(email)) {
      setError(t("auth.errors.invalidEmail"));
      return;
    }
    setError(null);
    setStatus("loading");
    setTimeout(() => setStatus("sent"), 700);
  };

  return (
    <AuthShell title={t("auth.forgotPassword")} subtitle={t("auth.forgotSubtitle")}>
      {status === "sent" ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-lucky-green/10 p-6 text-white">
          <div className="flex items-center gap-2 text-lucky-green">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">{t("auth.reset.emailSent")}</span>
          </div>
          <p className="text-white/80">{t("auth.reset.sentCopy", { email })}</p>
          <Button asChild>
            <Link href="/auth/sign-in">{t("auth.reset.returnToSignIn")}</Link>
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>{t("auth.emailLabel")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 pl-10 text-white"
                placeholder={t("auth.emailPlaceholder")}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("auth.reset.sendLink")}
          </Button>
          <p className="text-sm text-white/70">
            {t("auth.reset.remembered")}{" "}
            <Link href="/auth/sign-in" className="text-white hover:text-lucky-green">
              {t("auth.signIn")}
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

