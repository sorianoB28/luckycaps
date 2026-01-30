import type { Metadata } from "next";

import TermsContent from "./TermsContent";
import { legalConfig } from "@/config/legal";

const siteUrl = (legalConfig.siteUrl || "https://luckycapsshop.com").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Terms of Service | Lucky Caps",
  description: "The rules for using Lucky Caps and purchasing our products.",
  alternates: {
    canonical: `${siteUrl}/terms`,
  },
  openGraph: {
    title: "Terms of Service | Lucky Caps",
    description: "The rules for using Lucky Caps and purchasing our products.",
    url: `${siteUrl}/terms`,
  },
};

export default function TermsPage() {
  return <TermsContent />;
}
