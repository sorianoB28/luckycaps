"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, Lock, Chrome } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuthStore } from "@/store/authStore";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!emailRegex.test(email)) {
      setError("Enter a valid email.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    setError(null);
    setLoading(true);
    setTimeout(() => {
      signIn(email);
      setLoading(false);
      const redirect = searchParams?.get("redirect");
      router.push(redirect || "/account");
    }, 700);
  };

  return (
    <AuthShell title="Sign in" subtitle="Access your Lucky Caps account.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              className="bg-white/5 pl-10 text-white"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
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
            Remember me
          </label>
          <Link href="/auth/forgot-password" className="text-white hover:text-lucky-green">
            Forgot password?
          </Link>
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign in
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full border-white/20 text-white"
          onClick={() => router.push("/shop")}
        >
          Continue as guest
        </Button>
        <Separator className="border-white/10" />
        <Button type="button" variant="secondary" className="w-full bg-white/10" disabled>
          <Chrome className="mr-2 h-4 w-4" />
          Sign in with Google (coming soon)
        </Button>
        <p className="text-sm text-white/70">
          Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up" className="text-white hover:text-lucky-green">
            Create one
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
