"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminStore } from "@/store/adminStore";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAdmin } = useAdminStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    if (!success) {
      setError("Invalid credentials. Try admin / luckycaps.");
      return;
    }
    setError(null);
    router.replace("/admin");
  };

  if (isAdmin) {
    router.replace("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-lucky-dark px-4">
      <Card className="w-full max-w-md border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="font-display text-3xl">
            LuckyCaps Admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="bg-white/5 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="luckycaps"
                className="bg-white/5 text-white"
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full">
              Log in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
