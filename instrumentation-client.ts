import * as Sentry from "@sentry/nextjs";

import { sanitizeSentryErrorEvent } from "@/lib/sentrySanitizer";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend(event) {
    return sanitizeSentryErrorEvent(event);
  },
});
