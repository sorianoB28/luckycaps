import { type Language } from "@/lib/i18n";

const SPANISH_MARKERS = [
  "¿",
  "¡",
  "ñ",
  "á",
  "é",
  "í",
  "ó",
  "ú",
  " que ",
  " para ",
  " con ",
  " de ",
  " los ",
  " las ",
  " una ",
  " uno ",
  " por ",
  " gracias",
];

export function detectInputLanguage({
  preferred,
  name,
  description,
}: {
  preferred?: Language | null;
  name?: string | null;
  description?: string | null;
}): Language {
  if (preferred === "EN" || preferred === "ES") return preferred;

  const text = `${name ?? ""} ${description ?? ""}`.toLowerCase();
  const hasSpanishWord = SPANISH_MARKERS.some((marker) => text.includes(marker));
  if (hasSpanishWord) return "ES";

  const charCount = text.length || 1;
  const nonAscii = Array.from(text).filter((ch) => ch.charCodeAt(0) > 127).length;
  const ratio = nonAscii / charCount;
  if (ratio > 0.3) return "ES";

  return "EN";
}

type LocalizedField = {
  primary?: string | null;
  en?: string | null;
  es?: string | null;
};

export function selectLocalizedText(
  field: LocalizedField,
  language: Language
): string {
  const clean = (val?: string | null) => val?.trim() ?? "";
  const primary = clean(field.primary);
  const en = clean(field.en);
  const es = clean(field.es);

  if (language === "ES") {
    return es || primary || en || "";
  }
  return en || primary || es || "";
}
