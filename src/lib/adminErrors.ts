type Translator = (key: string, vars?: Record<string, string | number>) => string;

const REQUEST_FAILED_PATTERN = /Request to .* failed with status (\d+)/i;

export function resolveAdminError(t: Translator, err: unknown, fallbackKey: string) {
  const message = (err as Error | undefined)?.message;
  if (!message) return t(fallbackKey);

  const match = message.match(REQUEST_FAILED_PATTERN);
  if (match?.[1]) {
    return t("admin.requestFailed", { status: match[1] });
  }

  return message;
}
