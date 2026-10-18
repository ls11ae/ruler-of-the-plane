import { expect, test, type Page, type TestInfo } from './fixtures'

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

/**
 * Checks the game header: back button, title, subtitle, status and every button lie inside the window
 * and do not overlap, and the title is not cut off.
 */
export async function expectHeaderLaidOut(page: Page) {
  const header = page.locator('header').first()
  const parts = await header.evaluate((el) => {
    const boxes: { name: string; x: number; y: number; w: number; h: number }[] = []
    // Text and status by the extent of what is drawn (text may overflow its box), buttons by their box.
    const add = (name: string, node: Element | null, drawn = false) => {
      if (!node) return
      let r = node.getBoundingClientRect()
      if (drawn) {
        const range = document.createRange()
        range.selectNodeContents(node)
        r = range.getBoundingClientRect()
      }
      if (r.width > 0 && r.height > 0) boxes.push({ name, x: r.left, y: r.top, w: r.width, h: r.height })
    }
    add('back', el.querySelector('[data-part=back]'))
    add('title', el.querySelector('h1'), true)
    add('subtitle', el.querySelector('[data-part=titles] > span'), true)
    add('status', el.querySelector('[data-testid=header-status]'), true)
    el.querySelectorAll('[data-part=actions] > *').forEach((b, i) => add(`button ${i + 1}`, b))
    const h1 = el.querySelector('h1')!
    return { boxes, titleCut: h1.scrollWidth > h1.clientWidth + 1, width: window.innerWidth }
  })
  expect(parts.titleCut, 'title cut off').toBe(false)
  for (const b of parts.boxes) {
    expect(b.x, `${b.name} inside the window`).toBeGreaterThanOrEqual(-0.5)
    expect(b.x + b.w, `${b.name} inside the window`).toBeLessThanOrEqual(parts.width + 0.5)
  }
  for (let i = 0; i < parts.boxes.length; i++) {
    for (let j = i + 1; j < parts.boxes.length; j++) {
      const a = parts.boxes[i]!
      const b = parts.boxes[j]!
      // Title and subtitle are stacked on purpose; their line boxes may touch.
      if (a.name === 'title' && b.name === 'subtitle') continue
      const overlap =
        Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 &&
        Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1
      expect(overlap, `${a.name} overlaps ${b.name}`).toBe(false)
    }
  }
}

/** Starts a tier ("Leicht", "Mittel", "Schwer") on the tier screen a game opens with. */
export async function chooseTier(page: Page, tier = 'Leicht') {
  await page
    .getByTestId('tier-screen')
    .getByRole('button', { name: new RegExp(`^${tier}\\b`) })
    .click()
}

/** Opens a game and starts a tier. */
export async function startGame(page: Page, game: string, tier = 'Leicht') {
  await page.goto(`./#/play/${game}`)
  await chooseTier(page, tier)
}
