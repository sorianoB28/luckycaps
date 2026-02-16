import type * as Sentry from "@sentry/nextjs";

const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-forwarded-for",
  "x-real-ip",
]);

function sanitizeHeaders(
  headers: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!headers) return headers;

  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_KEYS.has(key.toLowerCase())) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

export function sanitizeSentryErrorEvent(
  event: Sentry.ErrorEvent
): Sentry.ErrorEvent {
  if (event.request) {
    if (event.request.headers && typeof event.request.headers === "object") {
      event.request.headers = sanitizeHeaders(event.request.headers);
    }
    delete event.request.data;
  }

  if (event.user) {
    delete event.user.ip_address;
    if (!event.user.id && !event.user.email) {
      delete event.user;
    }
  }

  return event;
}
