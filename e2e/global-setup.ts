import { request, type FullConfig } from "@playwright/test";

import { getE2EBaseURL, RUN_ID } from "./helpers/run";

async function callReset(baseURL: string) {
  const req = await request.newContext({ baseURL });
  try {
    const ping = await req.get("/api/dev/e2e/ping");
    if (!ping.ok()) {
      const text = await ping.text();
      throw new Error(
        `E2E ping failed at ${baseURL}/api/dev/e2e/ping with status ${ping.status()}: ${text}`
      );
    }

    const reset = await req.post("/api/dev/e2e/reset", {
      data: { runId: RUN_ID },
    });
    if (!reset.ok()) {
      const text = await reset.text();
      throw new Error(
        `E2E reset failed at ${baseURL}/api/dev/e2e/reset with status ${reset.status()}: ${text}`
      );
    }
  } finally {
    await req.dispose();
  }
}

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL?.toString() || getE2EBaseURL();

  // eslint-disable-next-line no-console
  console.log(`[e2e] runId=${RUN_ID} baseURL=${baseURL}`);
  await callReset(baseURL);

  return async () => {
    await callReset(baseURL);
  };
}
