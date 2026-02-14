type TargetLang = "EN" | "ES";

const SPANISH = "ES";
const ENGLISH = "EN";

const TARGETS = { ENGLISH, SPANISH };

function resolveBaseUrl(apiKey: string | undefined) {
  const envBase = process.env.DEEPL_API_BASE_URL?.trim();
  if (envBase) return envBase.replace(/\/+$/, "");
  if (apiKey?.endsWith(":fx")) return "https://api-free.deepl.com";
  return "https://api.deepl.com";
}

type DeeplTranslation = {
  text: string | null;
  detectedSourceLang: TargetLang | null;
};

const normalizeLang = (val?: string | null): TargetLang | null => {
  const up = (val ?? "").toUpperCase();
  return up === "EN" || up === "ES" ? (up as TargetLang) : null;
};

async function requestTranslate(
  text: string,
  targetLang: TargetLang
): Promise<DeeplTranslation> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    console.error("DeepL translate: missing API key");
    return { text: null, detectedSourceLang: null };
  }

  const trimmed = text?.trim() ?? "";
  if (!trimmed) return { text: null, detectedSourceLang: null };

  const baseUrl = resolveBaseUrl(apiKey);
  const url = `${baseUrl}/v2/translate`;

  try {
    const params = new URLSearchParams();
    params.set("text", trimmed);
    params.set("target_lang", targetLang);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`DeepL translate failed status=${res.status}`);
      return { text: null, detectedSourceLang: null };
    }

    const data = (await res.json()) as {
      translations?: { text?: string; detected_source_language?: string }[];
    };
    const translated = data?.translations?.[0]?.text;
    const detected = normalizeLang(data?.translations?.[0]?.detected_source_language);
    return {
      text: typeof translated === "string" ? translated : null,
      detectedSourceLang: detected,
    };
  } catch (err) {
    const message = (err as Error).message ?? "unknown error";
    console.error(`DeepL translate error: ${message}`);
    return { text: null, detectedSourceLang: null };
  }
}

export async function translateText(
  text: string,
  targetLang: TargetLang
): Promise<string | null> {
  const { text: translated } = await requestTranslate(text, targetLang);
  return translated;
}

export async function translateTextWithDetection(
  text: string,
  targetLang: TargetLang
): Promise<DeeplTranslation> {
  return requestTranslate(text, targetLang);
}

export async function detectLanguage(text: string): Promise<TargetLang | null> {
  const { detectedSourceLang } = await requestTranslate(text, "EN");
  return detectedSourceLang;
}

export { TARGETS };
export type { TargetLang };
