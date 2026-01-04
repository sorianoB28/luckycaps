"use client";

import { ReactNode } from "react";

import { useLanguage } from "@/components/providers/LanguageProvider";

interface LocaleTextProps {
  en: ReactNode;
  es: ReactNode;
}

export default function LocaleText({ en, es }: LocaleTextProps) {
  const { language } = useLanguage();
  return <>{language === "EN" ? en : es}</>;
}
