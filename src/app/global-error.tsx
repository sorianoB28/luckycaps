"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-2xl font-semibold">Something went wrong.</h1>
          <p className="mt-2 text-sm text-zinc-400">
            We logged this issue and are looking into it.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-lg bg-lime-500 px-4 py-2 text-sm font-semibold text-black hover:bg-lime-400"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
