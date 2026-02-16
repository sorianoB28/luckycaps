export function parseMoneyToCents(value: string): number {
  const raw = (value ?? "").trim();
  if (!raw) {
    throw new Error("Unable to parse money value: empty input");
  }

  const sanitized = raw.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  if (!sanitized || sanitized === "-" || sanitized === "." || sanitized === "-.") {
    throw new Error(`Unable to parse money value: "${value}"`);
  }

  const amount = Number.parseFloat(sanitized);
  if (!Number.isFinite(amount)) {
    throw new Error(`Unable to parse money value: "${value}"`);
  }

  return Math.round(amount * 100);
}

