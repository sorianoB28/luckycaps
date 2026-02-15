"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, Lock, Chrome } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { useT } from "@/components/providers/LanguageProvider";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SignInContent() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error" | "loading";
    message: string;
  } | null>(null);

  const target =
    searchParams?.get("redirect") ||
    searchParams?.get("callbackUrl") ||
    "/";
  const accessReason = searchParams?.get("reason");
  const accessNoticeMessage =
    accessReason === "admin_required"
      ? t("admin.unauthorized")
      : accessReason === "session_expired"
      ? t("adminProductForm.sessionExpired")
      : accessReason === "auth_required"
      ? t("auth.signInSubtitle")
      : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailRegex.test(email)) {
      setFeedback({ status: "error", message: t("auth.errors.invalidEmail") });
      return;
    }
    if (!password) {
      setFeedback({ status: "error", message: t("auth.errors.passwordRequired") });
      return;
    }
    setFeedback({ status: "loading", message: t("auth.signingIn") });
    setLoading(true);
    const result = await signIn("credentials", {
      redirect: false,
      email: email.toLowerCase(),
      password,
    });
    setLoading(false);
    if (result?.error) {
      const generic = t("auth.errors.signInFailed");
      const message =
        result.error === "CredentialsSignin"
          ? t("auth.errors.invalidCredentials")
          : generic;
      setFeedback({ status: "error", message });
      return;
    }
    setFeedback({ status: "success", message: t("auth.success.signedIn") });
    setTimeout(() => {
      router.push(target || "/");
    }, 450);
  };

  return (
    <AuthShell title={t("auth.signIn")} subtitle={t("auth.signInSubtitle")}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {accessNoticeMessage ? (
          <div data-testid="auth-access-notice" data-reason={accessReason ?? ""}>
            <AuthNotice status="error" title={accessNoticeMessage} />
          </div>
        ) : null}
        {feedback ? (
          <AuthNotice status={feedback.status} title={feedback.message} />
        ) : null}
        <div className="space-y-2">
          <Label>{t("auth.emailLabel")}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              className="bg-white/5 pl-10 text-white"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t("auth.passwordLabel")}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="bg-white/5 pl-10 text-white"
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-white/70">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-lucky-green"
            />
            {t("auth.rememberMe")}
          </label>
          <Link href="/auth/forgot-password" className="text-white hover:text-lucky-green">
            {t("auth.forgotPasswordLink")}
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? t("auth.signingIn") : t("auth.signIn")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full border-white/20 text-white"
          onClick={() => router.push("/shop")}
        >
          {t("auth.continueAsGuest")}
        </Button>
        <Separator className="border-white/10" />
        <Button type="button" variant="secondary" className="w-full bg-white/10" disabled>
          <Chrome className="mr-2 h-4 w-4" />
          {t("auth.googleSoon")}
        </Button>
        <p className="text-sm text-white/70">
          {t("auth.noAccount")}{" "}
          <Link href="/auth/sign-up" className="text-white hover:text-lucky-green">
            {t("auth.createOne")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-[200px]" aria-hidden />}>
      <SignInContent />
    </Suspense>
  );
}
