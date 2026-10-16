import { test, type Page, type TestInfo } from '@playwright/test'

/**
 * Saves a screenshot to `screenshots/<project>/<name>.png` (uploaded by CI). Animations and transitions
 * are disabled for the shot: finished fade-ins (overlays fade in over 160 ms) are shown in their final
 * state, endless ones in their initial state, so a screenshot never catches a half-transparent screen.
 */
export async function shot(page: Page, testInfo: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `screenshots/${testInfo.project.name}/${name}.png`, animations: 'disabled' })
}

/** Every test starts from a fresh device: no stored settings, leaderboards or game progress. */
export function freshDevice() {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('e2e-cleared')) {
        localStorage.clear()
        sessionStorage.setItem('e2e-cleared', '1')
      }
    })
  })
}
