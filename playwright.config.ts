import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1, // Increased retries for flaky tests
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3001', // Frontend port
    trace: 'on-first-retry',
    screenshot: 'on', // Take screenshots on all test steps
    video: 'retain-on-failure',
    actionTimeout: 15000, // Increased timeout
    navigationTimeout: 45000, // Increased timeout
    viewport: { width: 1920, height: 1080 }, // Set proper viewport size
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001', // Frontend port
    reuseExistingServer: !process.env.CI,
    timeout: 180000, // Increased timeout for server startup
  },
});