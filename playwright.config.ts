import { existsSync } from 'node:fs'
import {
  defineConfig,
  devices,
  firefox,
  webkit,
  type PlaywrightTestOptions,
  type PlaywrightWorkerOptions,
  type Project,
} from '@playwright/test'

const port = 4173
const base = '/ruler-of-the-plane/'

// Cloud sessions of Claude Code ship a Chromium that may not match this Playwright version's browser
// build; use it when present instead of downloading one. CI installs the matching browser.
const preinstalledChromium = '/opt/pw-browsers/chromium'
const executablePath =
  process.env.PW_CHROMIUM_EXECUTABLE ??
  (!process.env.CI && existsSync(preinstalledChromium) ? preinstalledChromium : undefined)

const laptop = { viewport: { width: 1280, height: 800 } }
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, phone: true }

// Firefox and WebKit run the smoke tests of the games and the shell; the accessibility checks (pixel
// contrast is measured in Chromium), the soak run and the benchmarks stay in Chromium. CI installs
// each browser in its own job (see .github/workflows/ci.yml); a session without them (the cloud image
// has only Chromium) leaves their projects out.
const chromiumOnly = ['a11y.spec.ts', 'soak.spec.ts', 'bench.spec.ts', 'first-visit.spec.ts']
const installed = (browser: { executablePath(): string }) => {
  try {
    return !!process.env.CI || existsSync(browser.executablePath())
  } catch {
    return false
  }
}

type Options = PlaywrightTestOptions & { phone: boolean }
const projects: Project<Options, PlaywrightWorkerOptions>[] = [
  {
    name: 'laptop',
    use: { ...devices['Desktop Chrome'], ...laptop, launchOptions: executablePath ? { executablePath } : {} },
  },
  {
    name: 'phone',
    use: {
      ...devices['Desktop Chrome'],
      ...phone,
      isMobile: true,
      launchOptions: executablePath ? { executablePath } : {},
    },
  },
]
if (installed(firefox)) {
  projects.push(
    { name: 'laptop-firefox', testIgnore: chromiumOnly, use: { ...devices['Desktop Firefox'], ...laptop } },
    {
      name: 'phone-firefox',
      testIgnore: chromiumOnly,
      // Firefox has no `isMobile`; touch, a coarse pointer without hover and a phone's user agent make
      // it look like Firefox for Android to the app (`(pointer: coarse)` picks the on-screen controls).
      use: {
        ...devices['Desktop Firefox'],
        ...phone,
        userAgent: 'Mozilla/5.0 (Android 14; Mobile; rv:157.0) Gecko/157.0 Firefox/157.0',
        launchOptions: {
          firefoxUserPrefs: { 'ui.primaryPointerCapabilities': 1, 'ui.allPointerCapabilities': 1 },
        },
      },
    },
  )
}
if (installed(webkit)) {
  projects.push(
    { name: 'laptop-webkit', testIgnore: chromiumOnly, use: { ...devices['Desktop Safari'], ...laptop } },
    {
      name: 'phone-webkit',
      testIgnore: chromiumOnly,
      use: { ...devices['iPhone 13'], ...phone, deviceScaleFactor: 3, isMobile: true },
    },
  )
}

// Smoke tests run against the production build (`npm run build` first), as served by `vite preview`.
// Screenshots go to `screenshots/<project>/` and are uploaded by CI as a workflow artifact.
export default defineConfig<Options, PlaywrightWorkerOptions>({
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
  },
  projects,
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}${base}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
