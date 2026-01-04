"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AuthShell } from "@/components/auth/AuthShell";
import { useT } from "@/components/providers/LanguageProvider";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SignUpContent() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
    terms: false,
    marketing: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) {
      setError(t("auth.errors.nameRequired"));
      return;
    }
    if (!emailRegex.test(form.email)) {
      setError(t("auth.errors.invalidEmail"));
      return;
    }
    if (form.password.length < 8) {
      setError(t("auth.errors.passwordTooShort"));
      return;
    }
    if (form.password !== form.confirm) {
      setError(t("auth.errors.passwordsMustMatch"));
      return;
    }
    if (!form.terms) {
      setError(t("auth.errors.mustAgreeTerms"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          first_name: form.firstName,
          last_name: form.lastName,
          marketing_opt_in: form.marketing,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || t("auth.errors.unableToCreateAccount"));
      }
      await signIn("credentials", {
        redirect: false,
        email: form.email.toLowerCase(),
        password: form.password,
      });
      const redirect = searchParams?.get("redirect");
      router.push(redirect || "/account");
    } catch (err) {
      setError((err as Error).message || t("auth.errors.unableToCreateAccount"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.signUp")}
      subtitle={t("auth.signUpSubtitle")}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("auth.firstNameLabel")}</Label>
            <Input
              value={form.firstName}
              onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
              className="bg-white/5 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("auth.lastNameLabel")}</Label>
            <Input
              value={form.lastName}
              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
              className="bg-white/5 text-white"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t("auth.emailLabel")}</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="bg-white/5 text-white"
            placeholder={t("auth.emailPlaceholder")}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("auth.passwordLabel")}</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="bg-white/5 text-white"
              placeholder="••••••••"
            />
            <p className="text-xs text-white/50">{t("auth.minPasswordHint")}</p>
          </div>
          <div className="space-y-2">
            <Label>{t("auth.confirmPasswordLabel")}</Label>
            <Input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm((prev) => ({ ...prev, confirm: e.target.value }))}
              className="bg-white/5 text-white"
              placeholder="••••••••"
            />
          </div>
        </div>
        <div className="space-y-2 text-sm text-white/80">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.terms}
              onChange={(e) => setForm((prev) => ({ ...prev, terms: e.target.checked }))}
              className="accent-lucky-green"
            />
            {t("auth.termsAgree")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.marketing}
              onChange={(e) => setForm((prev) => ({ ...prev, marketing: e.target.checked }))}
              className="accent-lucky-green"
            />
            {t("auth.marketingOptIn")}
          </label>
          <p className="text-xs text-white/50">{t("auth.unsubscribeCopy")}</p>
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t("auth.signUp")}
        </Button>
        <Separator className="border-white/10" />
        <p className="text-sm text-white/70">
          {t("auth.alreadyAccount")}{" "}
          <Link href="/auth/sign-in" className="text-white hover:text-lucky-green">
            {t("auth.signIn")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-[200px]" aria-hidden />}>
      <SignUpContent />
    </Suspense>
  );
}
