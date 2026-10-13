import { defineConfig, devices } from "@playwright/test";

// Browser tests against a running install (the self-hosted stack in CI: .github/workflows/selfhost.yml).
// Run locally with E2E_BASE_URL=https://<your install> npm run test:e2e (creates and deletes a test account).
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8080",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
