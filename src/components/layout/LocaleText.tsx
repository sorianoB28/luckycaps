"use client";

import { ReactNode } from "react";

import { useUIStore } from "@/store/uiStore";

interface LocaleTextProps {
  en: ReactNode;
  es: ReactNode;
}

export default function LocaleText({ en, es }: LocaleTextProps) {
  const language = useUIStore((state) => state.language);
  return <>{language === "EN" ? en : es}</>;
}
