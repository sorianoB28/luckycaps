"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/providers/LanguageProvider";

export default function AdminLoginRedirect() {
  const t = useT();
  const router = useRouter();
  useEffect(() => {
    router.replace("/auth/sign-in?redirect=/admin");
  }, [router]);
  return (
    <div className="min-h-screen bg-lucky-dark text-white px-4 py-10">
      {t("admin.redirecting")}
    </div>
  );
}
