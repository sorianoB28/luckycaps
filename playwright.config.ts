import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { getE2EBaseURL } from "./e2e/helpers/run";

loadEnvConfig(process.cwd());

const baseURL = getE2EBaseURL();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  globalSetup: "./e2e/global-setup.ts",
  timeout: 45_000,
  workers: process.env.CI ? 2 : 4,
  expect: {
    timeout: 10_000,
  },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["dot"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    navigationTimeout: 20_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Optional: enable this if you want Playwright to boot your app automatically.
  // webServer: {
  //   command: "npx netlify dev",
  //   url: "http://localhost:8888",
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
