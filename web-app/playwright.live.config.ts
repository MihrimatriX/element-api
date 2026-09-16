import { defineConfig } from '@playwright/test';
export default defineConfig({
  outputDir: './test-results-live',
  testDir: './e2e-live', workers: 1, timeout: 90000, retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-live', open: 'never' }]],
  use: { baseURL: process.env.WEB_BASE || 'http://localhost:3000', viewport: { width: 1365, height: 900 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
});
