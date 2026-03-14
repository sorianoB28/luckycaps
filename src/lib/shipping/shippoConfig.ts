import "server-only";

import {
  resolveDeploymentContext,
  type DeploymentContext,
  shouldLogServerMode,
} from "@/lib/deploymentContext";

type ShippoMode = "test" | "live";

type ShippoConfig = {
  context: DeploymentContext;
  mode: ShippoMode;
  token: string;
};

export type ShippoEnvironmentInspection = {
  context: DeploymentContext;
  expectedMode: ShippoMode;
  resolvedMode: ShippoMode | null;
  liveTokenPresent: boolean;
  liveTokenMode: ShippoMode | null;
  testTokenPresent: boolean;
  testTokenMode: ShippoMode | null;
  productionUsesLiveToken: boolean;
  issues: string[];
};

let lastShippoLogSignature: string | null = null;

function inferShippoMode(token: string | null) {
  if (!token) return null;
  if (token.startsWith("shippo_live_")) return "live" as const;
  if (token.startsWith("shippo_test_")) return "test" as const;
  return null;
}

function logShippoMode(config: ShippoConfig) {
  if (!shouldLogServerMode()) return;

  const signature = `${config.context}|${config.mode}`;
  if (signature === lastShippoLogSignature) return;
  lastShippoLogSignature = signature;

  console.info(`[shippo] context=${config.context} mode=${config.mode} token=configured`);
}

export function resolveShippoConfig(): ShippoConfig {
  const inspection = inspectShippoEnvironment();
  const liveToken = process.env.SHIPPO_API_TOKEN?.trim() || null;
  const testToken = process.env.SHIPPO_TEST_TOKEN?.trim() || null;

  if (inspection.issues.length > 0) {
    throw new Error(inspection.issues[0]);
  }

  if (inspection.expectedMode === "live") {
    if (!liveToken) {
      throw new Error("Missing SHIPPO_API_TOKEN for production live shipping.");
    }

    const config = { context: inspection.context, mode: "live", token: liveToken } satisfies ShippoConfig;
    logShippoMode(config);
    return config;
  }

  if (!testToken) {
    throw new Error(
      "Missing SHIPPO_TEST_TOKEN for non-production shipping. Refusing to fall back to SHIPPO_API_TOKEN."
    );
  }

  const config = { context: inspection.context, mode: "test", token: testToken } satisfies ShippoConfig;
  logShippoMode(config);
  return config;
}

export function inspectShippoEnvironment(): ShippoEnvironmentInspection {
  const context = resolveDeploymentContext();
  const expectedMode: ShippoMode = context === "production" ? "live" : "test";

  const liveToken = process.env.SHIPPO_API_TOKEN?.trim() || null;
  const testToken = process.env.SHIPPO_TEST_TOKEN?.trim() || null;

  const liveTokenMode = inferShippoMode(liveToken);
  const testTokenMode = inferShippoMode(testToken);
  const issues: string[] = [];

  if (liveToken && liveTokenMode !== "live") {
    issues.push("SHIPPO_API_TOKEN must be a live Shippo token when set.");
  }
  if (testToken && testTokenMode !== "test") {
    issues.push("SHIPPO_TEST_TOKEN must be a test Shippo token when set.");
  }

  if (expectedMode === "live") {
    if (!liveToken) {
      issues.push("Missing SHIPPO_API_TOKEN for production live shipping.");
    }
  } else if (!testToken) {
    issues.push(
      "Missing SHIPPO_TEST_TOKEN for non-production shipping. Refusing to fall back to SHIPPO_API_TOKEN."
    );
  }

  return {
    context,
    expectedMode,
    resolvedMode: expectedMode === "live" ? liveTokenMode : testTokenMode,
    liveTokenPresent: Boolean(liveToken),
    liveTokenMode,
    testTokenPresent: Boolean(testToken),
    testTokenMode,
    productionUsesLiveToken: expectedMode === "live" && liveTokenMode === "live",
    issues,
  };
}
