"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { useSession } from "next-auth/react";
import * as Sentry from "@sentry/nextjs";

function SyncSentryUser() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") {
      Sentry.setUser(null);
      return;
    }

    const id = session?.user?.id?.trim() || undefined;
    const email = session?.user?.email?.trim() || undefined;
    if (id || email) {
      Sentry.setUser({ id, email });
    } else {
      Sentry.setUser(null);
    }
  }, [session?.user?.email, session?.user?.id, status]);

  return null;
}

export function SessionProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SyncSentryUser />
      {children}
    </SessionProvider>
  );
}
