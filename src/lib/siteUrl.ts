const LOCAL_NETLIFY_DEV_ORIGIN = "http://localhost:8888";
const LOCAL_FALLBACK_ORIGIN = "http://localhost:3000";

export type AppOriginSource =
  | "netlify_dev"
  | "SITE_URL"
  | "NEXT_PUBLIC_SITE_URL"
  | "URL"
  | "DEPLOY_PRIME_URL"
  | "request"
  | "fallback";

export type AppOriginDiagnostics = {
  configuredOrigin: string | null;
  resolvedOrigin: string;
  source: AppOriginSource;
  isHttps: boolean;
  isLocalhost: boolean;
};

export function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

export function resolveAppOriginDiagnostics(requestUrl?: string): AppOriginDiagnostics {
  const isNetlifyDev =
    process.env.NETLIFY_DEV === "true" || process.env.NETLIFY_DEV === "1";
  if (isNetlifyDev) {
    return {
      configuredOrigin: null,
      resolvedOrigin: LOCAL_NETLIFY_DEV_ORIGIN,
      source: "netlify_dev",
      isHttps: false,
      isLocalhost: true,
    };
  }

  const configuredCandidates = [
    ["SITE_URL", process.env.SITE_URL],
    ["NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL],
    ["URL", process.env.URL],
    ["DEPLOY_PRIME_URL", process.env.DEPLOY_PRIME_URL],
  ] as const;

  for (const [source, value] of configuredCandidates) {
    const configuredOrigin = normalizeOrigin(value?.trim() || "");
    if (configuredOrigin) {
      return {
        configuredOrigin,
        resolvedOrigin: configuredOrigin,
        source,
        isHttps: configuredOrigin.startsWith("https://"),
        isLocalhost: isLocalhostOrigin(configuredOrigin),
      };
    }
  }

  if (requestUrl) {
    try {
      const resolvedOrigin = new URL(requestUrl).origin;
      return {
        configuredOrigin: null,
        resolvedOrigin,
        source: "request",
        isHttps: resolvedOrigin.startsWith("https://"),
        isLocalhost: isLocalhostOrigin(resolvedOrigin),
      };
    } catch {
      // Fall through to local fallback origin.
    }
  }

  return {
    configuredOrigin: null,
    resolvedOrigin: LOCAL_FALLBACK_ORIGIN,
    source: "fallback",
    isHttps: false,
    isLocalhost: true,
  };
}

export function resolveAppOrigin(requestUrl?: string): string {
  return resolveAppOriginDiagnostics(requestUrl).resolvedOrigin;
}

export function resolveAppUrl(pathname: string, requestUrl?: string) {
  return new URL(pathname, resolveAppOrigin(requestUrl)).toString();
}

export function resolveConfiguredAppOrigin(): string | null {
  return resolveAppOriginDiagnostics().configuredOrigin;
}

export function isLocalhostOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  } catch {
    return false;
  }
}
