import "server-only";

export type DeploymentContext = "development" | "preview" | "production";

function isTruthy(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function resolveDeploymentContext(): DeploymentContext {
  const netlifyContext = process.env.CONTEXT?.trim().toLowerCase() ?? "";

  if (isTruthy(process.env.NETLIFY_DEV) || netlifyContext === "dev") {
    return "development";
  }

  if (netlifyContext === "production") {
    return "production";
  }

  if (netlifyContext === "deploy-preview" || netlifyContext === "branch-deploy") {
    return "preview";
  }

  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export function isProductionDeployment() {
  return resolveDeploymentContext() === "production";
}

export function shouldLogServerMode() {
  return process.env.NODE_ENV !== "production";
}
