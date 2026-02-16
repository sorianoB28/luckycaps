const RUN_ID_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/i;

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function generateRunId() {
  const ts = Date.now().toString(36);
  return `run-${ts}`;
}

function resolveRunId() {
  const raw = process.env.E2E_RUN_ID?.trim();
  if (raw && RUN_ID_PATTERN.test(raw)) {
    return raw.toLowerCase();
  }

  const generated = generateRunId();
  process.env.E2E_RUN_ID = generated;
  return generated;
}

export const RUN_ID = resolveRunId();

export function getE2EBaseURL() {
  return process.env.E2E_BASE_URL || "http://localhost:8888";
}

export function getWorkerScope() {
  const raw = process.env.TEST_WORKER_INDEX?.trim() ?? "0";
  return raw.replace(/[^0-9]+/g, "") || "0";
}

export function e2eSlug(label: string) {
  const suffix = sanitizeSegment(label) || "item";
  return `e2e-${RUN_ID}-${suffix}`;
}

export function e2eEmail(label: string) {
  const suffix = sanitizeSegment(label) || "user";
  return `e2e-${RUN_ID}-${suffix}@example.com`;
}

export function e2ePromoCode(label: string) {
  const run = RUN_ID.replace(/[^a-z0-9]/gi, "_").toUpperCase();
  const suffix =
    sanitizeSegment(label)
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase() || "PROMO";
  return `E2E_${run}_${suffix}`;
}
