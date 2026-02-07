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

export async function translateText(
  text: string,
  targetLang: TargetLang
): Promise<string | null> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    console.error("DeepL translate: missing API key");
    return null;
  }

  const trimmed = text?.trim() ?? "";
  if (!trimmed) return null;

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
      return null;
    }

    const data = (await res.json()) as {
      translations?: { text?: string }[];
    };
    const translated = data?.translations?.[0]?.text;
    return typeof translated === "string" ? translated : null;
  } catch (err) {
    const message = (err as Error).message ?? "unknown error";
    console.error(`DeepL translate error: ${message}`);
    return null;
  }
}

export { TARGETS };
export type { TargetLang };
