export async function register() {
  const hasDsn = Boolean(process.env.SENTRY_DSN?.trim());
  if (!hasDsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
