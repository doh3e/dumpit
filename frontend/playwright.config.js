import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:5184'

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    headless: true,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev:e2e -- --host 127.0.0.1 --port 5184 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      VITE_API_URL: '/api',
      VITE_SENTRY_DSN: '',
      SENTRY_AUTH_TOKEN: '',
    },
  },
})
