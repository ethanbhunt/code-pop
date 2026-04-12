import { defineConfig, devices } from "@playwright/test";

/**
 * Browser smoke tests. Start the app first unless you add `webServer` below.
 *
 *   npm run dev
 *   npx playwright install   # once per machine
 *   npm run test:e2e
 *
 * Override base URL: PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npm run test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
