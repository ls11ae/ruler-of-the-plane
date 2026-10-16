import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

const port = 4173
const base = '/ruler-of-the-plane/'

// Cloud sessions of Claude Code ship a Chromium that may not match this Playwright version's browser
// build; use it when present instead of downloading one. CI installs the matching browser.
const preinstalledChromium = '/opt/pw-browsers/chromium'
const executablePath =
  process.env.PW_CHROMIUM_EXECUTABLE ??
  (!process.env.CI && existsSync(preinstalledChromium) ? preinstalledChromium : undefined)

// Smoke tests run against the production build (`npm run build` first), as served by `vite preview`.
// Screenshots go to `screenshots/<project>/` and are uploaded by CI as a workflow artifact.
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}${base}`,
    trace: 'retain-on-failure',
    locale: 'de-DE',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    {
      name: 'laptop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'phone',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}${base}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
