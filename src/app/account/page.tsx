"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type TabKey = "profile" | "orders" | "addresses" | "settings";
type OrderResponse = {
  id: string;
  status: string;
  subtotal_cents: number;
  created_at: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    price_cents: number;
    image_url: string | null;
  }[];
}[];

export default function AccountPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<TabKey>("profile");
  const [orders, setOrders] = useState<OrderResponse>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const isAuthed = status === "authenticated";

  useEffect(() => {
    if (status === "loading") return;
    if (!isAuthed) {
      router.replace("/auth/sign-in");
    }
  }, [isAuthed, router, status]);

  const displayName = useMemo(() => {
    return session?.user?.name || session?.user?.email || "Guest";
  }, [session?.user?.email, session?.user?.name]);

  useEffect(() => {
    if (!isAuthed) return;
    setOrdersLoading(true);
    setOrdersError(null);
    fetch("/api/my/orders", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Unable to load orders.");
        }
        const data = (await res.json()) as OrderResponse;
        setOrders(data);
      })
      .catch((err) => setOrdersError(err.message || "Unable to load orders."))
      .finally(() => setOrdersLoading(false));
  }, [isAuthed]);

  if (status === "loading" || !isAuthed) {
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
          <p className="text-white/70">Manage your profile, orders, and preferences.</p>
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
                  <Label>Name</Label>
                  <Input value={displayName} readOnly className="bg-white/5 text-white" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={session?.user?.email ?? ""}
                    readOnly
                    className="bg-white/5 text-white"
                  />
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
                {ordersLoading ? (
                  <p>Loading orders...</p>
                ) : ordersError ? (
                  <p className="text-red-400">{ordersError}</p>
                ) : orders.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/20 bg-black/30 p-6 text-center">
                    <p className="font-semibold text-white">No orders yet</p>
                    <p className="text-sm text-white/60">
                      Start a drop to see your order history here.
                    </p>
                    <Button className="mt-4" asChild>
                      <Link href="/shop">Shop collection</Link>
                    </Button>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/80"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-white">Order #{order.id.slice(0, 8)}</p>
                        <span className="text-white/60">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-white/60">Status: {order.status}</p>
                      <p className="text-white/60">
                        Total ${(order.subtotal_cents / 100).toFixed(2)}
                      </p>
                      <div className="mt-3 space-y-2">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 overflow-hidden rounded-md bg-white/10">
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[10px] text-white/60">
                                    No image
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-white">{item.name}</p>
                                <p className="text-xs text-white/60">Qty {item.quantity}</p>
                              </div>
                            </div>
                            <span className="text-white/70">
                              ${((item.price_cents * item.quantity) / 100).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
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
                  <Button variant="secondary" className="mt-4 bg-white/10" disabled>
                    Add address (coming soon)
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
                      placeholder="********"
                      className="bg-white/5 text-white"
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm password</Label>
                    <Input
                      type="password"
                      placeholder="********"
                      className="bg-white/5 text-white"
                      disabled
                    />
                  </div>
                  <Button className="md:col-span-2" variant="secondary" disabled>
                    Update password (coming soon)
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
                    onClick={() => signOut({ callbackUrl: "/" })}
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
