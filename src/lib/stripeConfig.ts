import "server-only";

import Stripe from "stripe";

import {
  resolveDeploymentContext,
  type DeploymentContext,
  shouldLogServerMode,
} from "@/lib/deploymentContext";
import { resolveAppOrigin } from "@/lib/siteUrl";

type StripeMode = "test" | "live";

type StripeConfig = {
  context: DeploymentContext;
  mode: StripeMode;
  secretKey: string;
  publishableKey: string | null;
  webhookSecret: string | null;
};

export type StripeEnvironmentInspection = {
  context: DeploymentContext;
  expectedMode: StripeMode;
  resolvedMode: StripeMode | null;
  secretKeyPresent: boolean;
  secretKeyMode: StripeMode | null;
  publishableKeyPresent: boolean;
  publishableKeyMode: StripeMode | null;
  webhookSecretPresent: boolean;
  legacyLiveSecretPresent: boolean;
  keyModesMatch: boolean | null;
  issues: string[];
};

const STRIPE_API_VERSION = "2024-04-10";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

let lastStripeLogSignature: string | null = null;
let lastStripeWarningSignature: string | null = null;

function inferStripeSecretMode(secretKey: string | null) {
  if (!secretKey) return null;
  if (secretKey.startsWith("sk_live_")) return "live" as const;
  if (secretKey.startsWith("sk_test_")) return "test" as const;
  return null;
}

function inferStripePublishableMode(publishableKey: string | null) {
  if (!publishableKey) return null;
  if (publishableKey.startsWith("pk_live_")) return "live" as const;
  if (publishableKey.startsWith("pk_test_")) return "test" as const;
  return null;
}

function logStripeMode(config: StripeConfig) {
  if (!shouldLogServerMode()) return;

  const signature = [
    config.context,
    config.mode,
    config.publishableKey ? "publishable:set" : "publishable:missing",
    config.webhookSecret ? "webhook:set" : "webhook:missing",
  ].join("|");

  if (signature === lastStripeLogSignature) return;
  lastStripeLogSignature = signature;

  console.info(
    `[stripe] context=${config.context} mode=${config.mode} secret=STRIPE_SECRET_KEY publishable=${
      config.publishableKey ? "configured" : "missing"
    } webhook=${config.webhookSecret ? "configured" : "missing"}`
  );
}

function warnDeprecatedStripeUrl(message: string) {
  if (!shouldLogServerMode()) return;
  if (message === lastStripeWarningSignature) return;
  lastStripeWarningSignature = message;
  console.warn(message);
}

function resolveStripeConfig(): StripeConfig {
  const inspection = inspectStripeEnvironment();
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() || null;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || null;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;

  if (!secretKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY. Use STRIPE_SECRET_KEY as the single runtime Stripe secret."
    );
  }

  if (!inspection.secretKeyMode) {
    throw new Error("STRIPE_SECRET_KEY must start with sk_test_ or sk_live_.");
  }

  if (inspection.issues.length > 0) {
    throw new Error(inspection.issues[0]);
  }

  const mode = inspection.secretKeyMode;

  const config = {
    context: inspection.context,
    mode,
    secretKey,
    publishableKey,
    webhookSecret,
  } satisfies StripeConfig;

  logStripeMode(config);
  return config;
}

function assertLiveOrigin(url: URL) {
  if (url.protocol !== "https:") {
    throw new Error("Stripe live mode requires an https SITE_URL/URL/NEXT_PUBLIC_SITE_URL origin.");
  }
  if (LOCAL_HOSTNAMES.has(url.hostname)) {
    throw new Error("Stripe live mode cannot use a localhost checkout origin.");
  }
}

function validateDeprecatedCheckoutUrl(
  name: "STRIPE_SUCCESS_URL" | "STRIPE_CANCEL_URL",
  configuredValue: string | null,
  generatedValue: string,
  mode: StripeMode
) {
  if (!configuredValue) return;

  let parsed: URL;
  try {
    parsed = new URL(configuredValue);
  } catch {
    const message = `${name} must be an absolute URL when set.`;
    if (mode !== "live") {
      warnDeprecatedStripeUrl(`[stripe] ${message}`);
    }
    return;
  }

  if (mode === "live") {
    assertLiveOrigin(parsed);
  }

  if (name === "STRIPE_SUCCESS_URL" && !configuredValue.includes("{CHECKOUT_SESSION_ID}")) {
    const message = `${name} must include {CHECKOUT_SESSION_ID} when set.`;
    if (mode !== "live") {
      warnDeprecatedStripeUrl(`[stripe] ${message}`);
    }
    return;
  }

  if (configuredValue !== generatedValue) {
    const message =
      `${name} is deprecated and does not match the app checkout URL. ` +
      `Remove it or update it to ${generatedValue}.`;
    if (mode !== "live") {
      warnDeprecatedStripeUrl(`[stripe] ${message}`);
    }
  }
}

export function getStripeServer() {
  const config = resolveStripeConfig();
  return new Stripe(config.secretKey, { apiVersion: STRIPE_API_VERSION });
}

export function getStripeWebhookSecret() {
  const config = resolveStripeConfig();
  if (!config.webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET.");
  }
  return config.webhookSecret;
}

export function resolveStripeCheckoutUrls(requestUrl?: string) {
  const config = resolveStripeConfig();
  const appOrigin = resolveAppOrigin(requestUrl);

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(appOrigin);
  } catch {
    throw new Error("Unable to resolve the app checkout origin.");
  }

  if (config.mode === "live") {
    assertLiveOrigin(parsedOrigin);
  }

  const successUrl = new URL(
    "/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    parsedOrigin
  ).toString();
  const cancelUrl = new URL("/checkout?canceled=1", parsedOrigin).toString();

  validateDeprecatedCheckoutUrl(
    "STRIPE_SUCCESS_URL",
    process.env.STRIPE_SUCCESS_URL?.trim() || null,
    successUrl,
    config.mode
  );
  validateDeprecatedCheckoutUrl(
    "STRIPE_CANCEL_URL",
    process.env.STRIPE_CANCEL_URL?.trim() || null,
    cancelUrl,
    config.mode
  );

  return { appOrigin: parsedOrigin.origin, successUrl, cancelUrl };
}

export function getStripeMode() {
  return resolveStripeConfig().mode;
}

export function inspectStripeEnvironment(): StripeEnvironmentInspection {
  const context = resolveDeploymentContext();
  const expectedMode: StripeMode = context === "production" ? "live" : "test";

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() || null;
  const legacyLiveSecret = process.env.STRIPE_LIVE_API_TOKEN?.trim() || null;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || null;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;

  const secretKeyMode = inferStripeSecretMode(secretKey);
  const publishableKeyMode = inferStripePublishableMode(publishableKey);
  const issues: string[] = [];

  if (!secretKey) {
    issues.push(
      "Missing STRIPE_SECRET_KEY. Use STRIPE_SECRET_KEY as the single runtime Stripe secret."
    );
  } else if (!secretKeyMode) {
    issues.push("STRIPE_SECRET_KEY must start with sk_test_ or sk_live_.");
  }

  if (legacyLiveSecret) {
    const legacyMode = inferStripeSecretMode(legacyLiveSecret);
    if (legacyMode !== "live") {
      issues.push("STRIPE_LIVE_API_TOKEN must be a live Stripe secret when set.");
    }
    if (context === "production" && secretKey && legacyLiveSecret !== secretKey) {
      issues.push(
        "Production Stripe config is inconsistent: STRIPE_SECRET_KEY and STRIPE_LIVE_API_TOKEN do not match."
      );
    }
  }

  if (secretKeyMode && secretKeyMode !== expectedMode) {
    issues.push(
      `Stripe ${context} environment requires ${expectedMode} credentials, but STRIPE_SECRET_KEY is ${secretKeyMode}.`
    );
  }

  if (publishableKey) {
    if (!publishableKeyMode) {
      issues.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_test_ or pk_live_.");
    } else if (secretKeyMode && publishableKeyMode !== secretKeyMode) {
      issues.push(
        `Stripe publishable key mode (${publishableKeyMode}) does not match STRIPE_SECRET_KEY mode (${secretKeyMode}).`
      );
    }
  }

  if (webhookSecret && !webhookSecret.startsWith("whsec_")) {
    issues.push("STRIPE_WEBHOOK_SECRET must start with whsec_.");
  }

  return {
    context,
    expectedMode,
    resolvedMode: secretKeyMode,
    secretKeyPresent: Boolean(secretKey),
    secretKeyMode,
    publishableKeyPresent: Boolean(publishableKey),
    publishableKeyMode,
    webhookSecretPresent: Boolean(webhookSecret),
    legacyLiveSecretPresent: Boolean(legacyLiveSecret),
    keyModesMatch:
      secretKeyMode && publishableKeyMode ? secretKeyMode === publishableKeyMode : null,
    issues,
  };
}
