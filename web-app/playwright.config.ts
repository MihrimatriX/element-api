import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', fullyParallel: true, retries: process.env.CI ? 1 : 0,
  workers: 2, reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1365, height: 900 } } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : [
    { command: 'dotnet run --project ../science-service/Element.Science.csproj --urls http://127.0.0.1:5080', url: 'http://127.0.0.1:5080/health', reuseExistingServer: !process.env.CI, timeout: 120000 },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: false,
      env: { VITE_SCIENCE_API_BASE_URL: 'http://127.0.0.1:5080/api/v2', VITE_ACCOUNTS_ENABLED: 'false' } },
  ],
});
