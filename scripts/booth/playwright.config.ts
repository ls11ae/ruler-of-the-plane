import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

/**
 * Plays the assembled booth package (STAND_DIR, default build/Stand) as the booth laptop serves it: its
 * own server.ps1 under PowerShell (PWSH, default pwsh), every request to another host blocked.
 *
 *   npx playwright test -c scripts/booth/playwright.config.ts
 *
 * BOOTH_BROWSERS=chromium,firefox adds Firefox, the booth's fallback (CI installs it).
 */
const root = resolve(import.meta.dirname, '../..')
const stand = resolve(root, process.env.STAND_DIR ?? 'build/Stand')
const shell = process.env.PWSH ?? 'pwsh'
const port = 8137

const preinstalledChromium = '/opt/pw-browsers/chromium'
const executablePath =
  process.env.PW_CHROMIUM_EXECUTABLE ??
  (!process.env.CI && existsSync(preinstalledChromium) ? preinstalledChromium : undefined)
const browsers = (process.env.BOOTH_BROWSERS ?? 'chromium').split(',')

export default defineConfig({
  testDir: '.',
  testMatch: 'package.spec.ts',
  outputDir: resolve(root, 'test-results/booth'),
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}/`,
    locale: 'de-DE',
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  projects: [
    ...(browsers.includes('chromium')
      ? [
          {
            name: 'booth-chromium',
            use: {
              ...devices['Desktop Chrome'],
              viewport: { width: 1280, height: 800 },
              launchOptions: executablePath ? { executablePath } : {},
            },
          },
        ]
      : []),
    ...(browsers.includes('firefox')
      ? [
          {
            name: 'booth-firefox',
            use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } },
          },
        ]
      : []),
  ],
  webServer: {
    command: `"${shell}" -NoLogo -NoProfile -File "${resolve(stand, 'scripts/server.ps1')}" -Root "${resolve(stand, 'web')}" -Port ${port}`,
    url: `http://localhost:${port}/__stand/ping`,
    cwd: root,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
