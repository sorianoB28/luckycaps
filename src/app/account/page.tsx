"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

type TabKey = "profile" | "orders" | "addresses" | "settings";

export default function AccountPage() {
  const router = useRouter();
  const { isAuthed, user, updateUser, signOut } = useAuthStore();
  const [hydrated, setHydrated] = useState(
    (useAuthStore.persist as any)?.hasHydrated?.() ?? true
  );
  const [tab, setTab] = useState<TabKey>("profile");

  useEffect(() => {
    const unsub = (useAuthStore.persist as any)?.onFinishHydration?.(() =>
      setHydrated(true)
    );
    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthed) {
      router.replace("/auth/sign-in");
    }
  }, [hydrated, isAuthed, router]);

  const displayName = useMemo(() => {
    if (!user) return "Guest";
    return `${user.firstName} ${user.lastName}`.trim();
  }, [user]);

  if (!hydrated || !isAuthed) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-white/70">
        Loading account...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">Account</p>
          <h1 className="font-display text-4xl text-white">Welcome, {displayName}</h1>
          <p className="text-white/70">
            Manage your profile, orders, and preferences. Auth is client-side only for now.
          </p>
        </div>
        <Button variant="outline" className="border-white/20 text-white" asChild>
          <Link href="/shop">Back to shop</Link>
        </Button>
      </div>

      <div className="mt-8 flex flex-col gap-4 md:flex-row">
        <div className="flex w-full flex-wrap gap-2 md:w-48 md:flex-col">
          {(
            [
              ["profile", "Profile"],
              ["orders", "Order History"],
              ["addresses", "Addresses"],
              ["settings", "Settings"],
            ] as [TabKey, string][]
          ).map(([key, label]) => (
            <Button
              key={key}
              variant={tab === key ? "default" : "ghost"}
              className={cn(
                "w-full justify-start",
                tab === key ? "" : "text-white/70 hover:text-white"
              )}
              onClick={() => setTab(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="flex-1 space-y-6">
          {tab === "profile" ? (
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input
                    value={user?.firstName ?? ""}
                    onChange={(e) => updateUser({ firstName: e.target.value })}
                    className="bg-white/5 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input
                    value={user?.lastName ?? ""}
                    onChange={(e) => updateUser({ lastName: e.target.value })}
                    className="bg-white/5 text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={user?.email ?? ""}
                    onChange={(e) => updateUser({ email: e.target.value })}
                    className="bg-white/5 text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={Boolean(user?.marketingOptIn)}
                      onChange={(e) => updateUser({ marketingOptIn: e.target.checked })}
                      className="accent-lucky-green"
                    />
                    Email me drops and promos
                  </label>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {tab === "orders" ? (
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle>Order history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-white/70">
                <div className="rounded-xl border border-dashed border-white/20 bg-black/30 p-6 text-center">
                  <p className="font-semibold text-white">No orders yet</p>
                  <p className="text-sm text-white/60">
                    Start a drop to see your order history here.
                  </p>
                  <Button className="mt-4" asChild>
                    <Link href="/shop">Shop collection</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {tab === "addresses" ? (
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle>Addresses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-white/70">
                <div className="rounded-xl border border-dashed border-white/20 bg-black/30 p-6 text-center">
                  <p className="font-semibold text-white">No addresses saved</p>
                  <p className="text-sm text-white/60">
                    Add a shipping address to speed up checkout.
                  </p>
                  <Button className="mt-4" variant="secondary" className="bg-white/10">
                    Add address (UI only)
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {tab === "settings" ? (
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>New password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="bg-white/5 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="bg-white/5 text-white"
                    />
                  </div>
                  <Button className="md:col-span-2" variant="secondary" disabled>
                    Update password (UI only)
                  </Button>
                </div>
                <Separator className="border-white/10" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Sign out</p>
                    <p className="text-sm text-white/60">Clear session and return home.</p>
                  </div>
                  <Button
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => {
                      signOut();
                      router.replace("/");
                    }}
                  >
                    Sign out
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
