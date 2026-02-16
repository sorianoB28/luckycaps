import React from "react";
import { render, type RenderOptions } from "@testing-library/react";

import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { type Language, createTranslator } from "@/lib/i18n";

type I18nRenderOptions = RenderOptions & {
  locale?: Language;
};

export function renderWithI18n(
  ui: React.ReactElement,
  { locale = "EN", ...options }: I18nRenderOptions = {}
) {
  window.localStorage.setItem("luckycaps.language", locale);

  return {
    ...render(<LanguageProvider>{ui}</LanguageProvider>, options),
    t: createTranslator(locale),
    locale,
  };
}

