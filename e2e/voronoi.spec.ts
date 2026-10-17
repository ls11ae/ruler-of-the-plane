import { expect, test, type Page } from './fixtures'
import { expectHeaderLaidOut, freshDevice, shot } from './helpers'

freshDevice()

/** Screen position of a point given in map coordinates (the board may be turned by 90°). */
async function toScreen(page: Page, x: number, y: number) {
  return page
    .locator('svg[role=img] > g')
    .first()
    .evaluate(
      (g, [x, y]) => {
        const p = new DOMPoint(x, y).matrixTransform((g as SVGGElement).getScreenCTM()!)
        return { x: p.x, y: p.y }
      },
      [x, y],
    )
}

/** Sites on the island, far enough apart for five castles each; the computer may take some first. */
const SITES: [number, number][] = [
  [-4.2, -1.6],
  [1.0, -2.2],
  [-1.6, 2.3],
  [3.6, 0.9],
  [-5.2, 1.4],
  [5.6, -1.2],
  [0.6, 0.4],
  [-3.0, -2.6],
  [2.6, 2.8],
  [4.6, -2.6],
  [-3.4, 0.6],
  [3.0, -1.0],
]

test('plays a short game against the computer on the island', async ({ page, phone }, testInfo) => {
  await page.goto('./#/play/voronoi')
  const howTo = page.getByRole('dialog', { name: "So geht's" })
  await expect(howTo).toBeVisible()
  await shot(page, testInfo, 'voronoi-howto')
  await howTo.getByRole('button', { name: "Los geht's!" }).click()

  const setup = page.getByRole('dialog', { name: 'Neues Spiel' })
  await expect(setup).toBeVisible()
  await setup.getByRole('button', { name: 'Leicht' }).click()
  await setup.getByRole('button', { name: '5', exact: true }).click()
  await shot(page, testInfo, 'voronoi-setup')
  await setup.getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.locator('[data-castles]')).toHaveAttribute('data-turn', '0')
  if (!phone) await expectHeaderLaidOut(page)

  const game = page.locator('[data-castles]')
  const input = page.locator('svg[role=img] rect[fill="transparent"]')
  const castles = async () => Number(await game.getAttribute('data-castles'))

  /** Builds at a site: click with the mouse; press, hold and release with a finger (ghost 64 px above). */
  const build = async (x: number, y: number) => {
    const p = await toScreen(page, x, y)
    if (!phone) {
      await page.mouse.move(p.x, p.y)
      await page.mouse.click(p.x, p.y)
      return
    }
    const ev = (buttons: number) => ({
      pointerId: 3,
      pointerType: 'touch',
      isPrimary: true,
      clientX: p.x,
      clientY: p.y + 64,
      button: 0,
      buttons,
      bubbles: true,
    })
    await input.dispatchEvent('pointerdown', ev(1))
    await page.waitForTimeout(250)
    await input.dispatchEvent('pointerup', ev(0))
  }

  // Aim first: the ghost shows the land a castle would win.
  if (!phone) {
    const p = await toScreen(page, ...SITES[0]!)
    await page.mouse.move(p.x, p.y)
    await expect(page.getByText('Neue Burg hier:')).toBeVisible()
    await shot(page, testInfo, 'voronoi-aim')
  }

  let site = 0
  for (let round = 0; round < 5; round++) {
    await expect(game).toHaveAttribute('data-turn', String(2 * round))
    const before = await castles()
    while ((await castles()) === before) {
      expect(site).toBeLessThan(SITES.length)
      await build(...SITES[site++]!)
      await page.waitForTimeout(50)
    }
    if (round === 1) await shot(page, testInfo, 'voronoi-playing')
    // The computer answers.
    await expect(game).toHaveAttribute('data-turn', String(2 * round + 2), { timeout: 10_000 })
  }

  const result = page.getByRole('dialog').filter({ hasText: 'Was steckt dahinter?' })
  await expect(result).toBeVisible({ timeout: 10_000 })
  await expect(result.getByText(/^Du \d+ : \d+ Computer$/)).toBeVisible()
  await shot(page, testInfo, 'voronoi-result')
  await result.getByRole('button', { name: 'Theorie' }).click()

  const theory = page.getByRole('complementary', { name: 'Theorie' })
  await expect(theory).toBeVisible()
  await expect(page.getByTestId('theory-layer')).toBeVisible()
  await expect(theory.getByTestId('think-time')).toHaveText(/letzten Zug des Computers: \d+ ms/)
  await theory.getByRole('button', { name: 'Leere Umkreise' }).click()
  await shot(page, testInfo, 'voronoi-theory')
  await theory.getByRole('button', { name: 'Voronoi-Diagramm' }).click()
  await theory.getByRole('button', { name: 'Delaunay-Dreiecke' }).click()
  await theory.getByRole('button', { name: 'Leere Umkreise' }).click()
  await theory.getByRole('button', { name: 'Wärmekarte' }).click()
  await expect(page.getByTestId('heat-map')).toBeVisible()
  await shot(page, testInfo, 'voronoi-heat')
})

test('two players take turns on the river valley', async ({ page }, testInfo) => {
  await page.goto('./#/play/voronoi')
  await page.getByRole('dialog', { name: "So geht's" }).getByRole('button', { name: "Los geht's!" }).click()
  const setup = page.getByRole('dialog', { name: 'Neues Spiel' })
  await setup.getByRole('button', { name: /Flusstal/ }).click()
  await setup.getByRole('button', { name: 'Zu zweit' }).click()
  await setup.getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.getByText('Blau ist dran')).toBeVisible()

  const tap = async (x: number, y: number) => {
    const p = await toScreen(page, x, y)
    await page.mouse.click(p.x, p.y)
  }
  await tap(-4, -2)
  await expect(page.getByText('Orange ist dran')).toBeVisible()
  await tap(4, 2)
  await expect(page.getByText('Blau ist dran')).toBeVisible()
  // In the river: no castle.
  const game = page.locator('[data-castles]')
  await expect(game).toHaveAttribute('data-castles', '2')
  await shot(page, testInfo, 'voronoi-two-players')
})

test('the attract screen shows the computer playing against itself', async ({ page }, testInfo) => {
  await page.goto('./?kiosk#/')
  const attract = page.getByRole('dialog', { name: 'Ruler of the Plane' })
  await expect(attract).toBeVisible()
  // Castles appear one after the other behind the attract card.
  await expect
    .poll(async () => attract.locator('image[href*="castle"]').count(), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(4)
  await shot(page, testInfo, 'voronoi-attract')
})
