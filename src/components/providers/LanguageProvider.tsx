"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { createTranslator, type Language } from "@/lib/i18n";

type Translator = ReturnType<typeof createTranslator>;

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: Translator;
};

const STORAGE_KEY = "luckycaps.language";

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function parseLanguage(value: string | null): Language | null {
  if (value === "EN" || value === "ES") return value;
  return null;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("EN");

  useEffect(() => {
    const saved = parseLanguage(window.localStorage.getItem(STORAGE_KEY));
    if (saved) setLanguageState(saved);
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === "EN" ? "ES" : "EN";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const t = useMemo(() => createTranslator(language), [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within <LanguageProvider />");
  return ctx;
}

export function useT() {
  return useLanguage().t;
}
