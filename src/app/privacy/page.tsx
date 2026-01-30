import type { Metadata } from "next";

import PrivacyContent from "./PrivacyContent";
import { legalConfig } from "@/config/legal";

const siteUrl = (legalConfig.siteUrl || "https://luckycapsshop.com").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Privacy Policy | Lucky Caps",
  description: "How Lucky Caps collects and uses information to run the store, ship orders, and communicate with you.",
  alternates: {
    canonical: `${siteUrl}/privacy`,
  },
  openGraph: {
    title: "Privacy Policy | Lucky Caps",
    description: "How Lucky Caps collects and uses information to run the store, ship orders, and communicate with you.",
    url: `${siteUrl}/privacy`,
  },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
