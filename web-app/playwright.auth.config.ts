import { defineConfig } from "@playwright/test";
export default defineConfig({
  outputDir: "./test-results-auth",
  testDir: "./e2e-auth",
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report-auth", open: "never" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1365, height: 900 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: "/api/v1", VITE_ACCOUNTS_ENABLED: "true" },
  },
});
