"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/AuthShell";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!emailRegex.test(email)) {
      setError("Enter a valid email.");
      return;
    }
    setError(null);
    setStatus("loading");
    setTimeout(() => setStatus("sent"), 700);
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle="We’ll email you a reset link if an account exists for this email."
    >
      {status === "sent" ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-lucky-green/10 p-6 text-white">
          <div className="flex items-center gap-2 text-lucky-green">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">Email sent</span>
          </div>
          <p className="text-white/80">
            If an account exists for <span className="font-semibold">{email}</span>, you&apos;ll get a
            reset link shortly.
          </p>
          <Button asChild>
            <Link href="/auth/sign-in">Return to sign in</Link>
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 pl-10 text-white"
                placeholder="you@example.com"
              />
            </div>
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send reset link
          </Button>
          <p className="text-sm text-white/70">
            Remembered your password?{" "}
            <Link href="/auth/sign-in" className="text-white hover:text-lucky-green">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
