import * as Sentry from "@sentry/nextjs";

type SessionLike = {
  user?: {
    id?: string | null;
    email?: string | null;
  } | null;
} | null;

export function setSentryUserFromSession(session: SessionLike) {
  const id = session?.user?.id?.trim() || undefined;
  const email = session?.user?.email?.trim() || undefined;

  if (id || email) {
    Sentry.setUser({ id, email });
    return;
  }

  Sentry.setUser(null);
}
