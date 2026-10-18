import { expect, test, type Page } from './fixtures'
import { readFileSync } from 'node:fs'
import { mapOf } from '../src/core/games/roads/levels'
import { kruskal, roadsByLength, type Road } from '../src/core/games/roads/mst'
import type { KingsTaxesLevel } from '../src/core/levels/schema'
import { chooseTier, expectHeaderLaidOut, freshDevice, shot } from './helpers'

freshDevice()

const level = JSON.parse(
  readFileSync(new URL('../public/levels/kings-taxes/mst/ktLevel1.json', import.meta.url), 'utf8'),
) as KingsTaxesLevel
const map = mapOf(level)

/** Screen position of a point in level coordinates (the board may be turned by 90°). */
async function toScreen(page: Page, [x, y]: readonly [number, number]) {
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

/** Builds a road: a mouse drag on the laptop, two taps on the phone. */
async function build(page: Page, [a, b]: Road, touch: boolean) {
  const p = await toScreen(page, map.points[a]!)
  const q = await toScreen(page, map.points[b]!)
  if (touch) {
    await page.touchscreen.tap(p.x, p.y)
    await page.touchscreen.tap(q.x, q.y)
    return
  }
  await page.mouse.move(p.x, p.y)
  await page.mouse.down()
  await page.mouse.move(q.x, q.y, { steps: 8 })
  await page.mouse.up()
}

async function tapRoad(page: Page, [a, b]: Road, touch: boolean) {
  const p = await toScreen(page, map.points[a]!)
  const q = await toScreen(page, map.points[b]!)
  const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
  if (touch) await page.touchscreen.tap(mid.x, mid.y)
  else await page.mouse.click(mid.x, mid.y)
}

test('connects the first map with the shortest network, with one hint', async ({ page, phone }, testInfo) => {
  await page.goto('./#/play/roads')
  await expect(page.getByTestId('tier-screen')).toContainText(
    'Der König will alle Orte mit Straßen verbinden',
  )
  await shot(page, testInfo, 'roads-tiers')
  await chooseTier(page, 'Leicht')
  await expect(page.getByTestId('roads-state')).toHaveText('Verbinde alle Orte')
  if (!phone) await expectHeaderLaidOut(page)

  const { roads: mst } = kruskal(map.points)
  const longest = roadsByLength(map.points).at(-1)!.road
  // A long road first: the hint says it is too long; tapping it removes it.
  await build(page, longest, phone)
  await expect(page.getByTestId('roads-state')).toHaveText(/Noch \d Teile verbinden/)
  await page.getByRole('button', { name: 'Tipp' }).click()
  await expect(page.getByTestId('roads-hint')).toContainText('zu lang')
  await shot(page, testInfo, 'roads-hint')
  await tapRoad(page, longest, phone)
  await expect(page.getByTestId('roads-length')).toHaveText('Länge: 0,0 km')

  for (const road of mst.slice(0, -1)) await build(page, road, phone)
  await shot(page, testInfo, 'roads-building')
  await build(page, mst.at(-1)!, phone)
  await expect(page.getByTestId('roads-state')).toHaveText('Optimal!')

  const result = page.getByRole('dialog', { name: 'Geschafft!' })
  await expect(result).toBeVisible()
  await expect(result.getByRole('img', { name: '2 Sterne von 3' })).toBeVisible()
  await shot(page, testInfo, 'roads-result')
  await result.getByRole('button', { name: 'Theorie' }).click()

  const theory = page.getByRole('complementary', { name: 'Theorie' })
  await theory.getByRole('button', { name: 'Nächster Schritt' }).click()
  await expect(theory.getByTestId('kruskal-status')).toContainText('Schritt 1 von')
  await theory.getByRole('button', { name: 'Alle Schritte' }).click()
  await expect(theory.getByTestId('kruskal-status')).toContainText('Fertig')
  await shot(page, testInfo, 'roads-theory')
})
