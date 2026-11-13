const { randomBytes } = require('node:crypto')
const { defineConfig, devices } = require('@playwright/test')

const testDatabaseUrl = process.env.TEST_DATABASE_URL
if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required. Start the isolated test database before Playwright.')
}

const databaseUrl = new URL(testDatabaseUrl)
const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1)).toLowerCase()
const hostname = databaseUrl.hostname.replace(/^\[|\]$/g, '').toLowerCase()
if (!databaseName.includes('test') || !['localhost', '127.0.0.1', '::1'].includes(hostname) || databaseUrl.password) {
  throw new Error('Playwright requires a password-free, loopback PostgreSQL database with "test" in its name.')
}

const jwtSecret = process.env.JWT_SECRET || randomBytes(32).toString('hex')
const apiPort = process.env.TEST_API_PORT || '3101'
const clientPort = process.env.TEST_CLIENT_PORT || '5174'
const apiUrl = `http://127.0.0.1:${apiPort}`
const clientUrl = `http://127.0.0.1:${clientPort}`
const serverEnv = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: testDatabaseUrl,
  JWT_SECRET: jwtSecret,
  CLIENT_URL: clientUrl,
  PORT: apiPort,
}
const clientEnv = {
  ...process.env,
  VITE_API_URL: apiUrl,
}

module.exports = defineConfig({
  testDir: './tests/e2e',
  globalTeardown: './tests/e2e/globalTeardown.cjs',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: clientUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    acceptDownloads: true,
    actionTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
            '--autoplay-policy=no-user-gesture-required',
          ],
        },
      },
    },
  ],
  webServer: [
    {
      command: 'mkdir -p playwright-logs && npm --prefix server run start > playwright-logs/server.log 2>&1',
      url: `${apiUrl}/`,
      reuseExistingServer: false,
      timeout: 120000,
      env: serverEnv,
    },
    {
      command: 'mkdir -p playwright-logs && npm --prefix client run dev -- --host 127.0.0.1 > playwright-logs/client.log 2>&1',
      url: `${clientUrl}/`,
      reuseExistingServer: false,
      timeout: 120000,
      env: clientEnv,
    },
  ],
})
