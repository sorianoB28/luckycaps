import "./globals.css";

import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { SessionProviders } from "@/components/providers/SessionProviders";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { legalConfig } from "@/config/legal";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const siteUrl = (legalConfig.siteUrl || "https://luckycapsshop.com").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Lucky Caps | Premium Streetwear Headwear",
  description: "Premium caps, custom embroidery, and entrepreneur packs.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "any", type: "image/png" },
      { url: "/brand/newlogocropped.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icon.png"],
  },
  openGraph: {
    title: "Lucky Caps | Premium Streetwear Headwear",
    description: "Premium caps, custom embroidery, and entrepreneur packs.",
    url: siteUrl,
    siteName: "Lucky Caps",
    images: [
      {
        url: "/brand/newlogocropped.png",
        width: 512,
        height: 512,
        alt: "Lucky Caps logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Lucky Caps | Premium Streetwear Headwear",
    description: "Premium caps, custom embroidery, and entrepreneur packs.",
    images: ["/brand/newlogocropped.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <SessionProviders>
          <LanguageProvider>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </LanguageProvider>
        </SessionProviders>
      </body>
    </html>
  );
}
