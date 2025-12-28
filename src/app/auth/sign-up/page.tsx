"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuthStore } from "@/store/authStore";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signUp = useAuthStore((s) => s.signUp);
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) {
      setError("Name is required.");
      return;
    }
    if (!emailRegex.test(form.email)) {
      setError("Enter a valid email.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords must match.");
      return;
    }
    if (!form.terms) {
      setError("You must agree to the Terms & Privacy.");
      return;
    }
    setError(null);
    setLoading(true);
    setTimeout(() => {
      signUp({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        marketingOptIn: form.marketing,
      });
      setLoading(false);
      const redirect = searchParams?.get("redirect");
      router.push(redirect || "/account");
    }, 700);
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Save your drops, track orders, and stay ahead of releases."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>First name</Label>
            <Input
              value={form.firstName}
              onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
              className="bg-white/5 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label>Last name</Label>
            <Input
              value={form.lastName}
              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
              className="bg-white/5 text-white"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="bg-white/5 text-white"
            placeholder="you@example.com"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="bg-white/5 text-white"
              placeholder="••••••••"
            />
            <p className="text-xs text-white/50">Minimum 8 characters.</p>
          </div>
          <div className="space-y-2">
            <Label>Confirm password</Label>
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
            I agree to the Terms & Privacy
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.marketing}
              onChange={(e) => setForm((prev) => ({ ...prev, marketing: e.target.checked }))}
              className="accent-lucky-green"
            />
            Email me product drops and promos
          </label>
          <p className="text-xs text-white/50">You can unsubscribe anytime.</p>
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create account
        </Button>
        <Separator className="border-white/10" />
        <p className="text-sm text-white/70">
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="text-white hover:text-lucky-green">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
