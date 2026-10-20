import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { readFileSync } from 'node:fs'
import { componentCount, kruskal, networkLength, roadsByLength, type Road } from '../src/core/games/roads/mst'
import { freeTree } from '../src/core/games/roads/plane'
import type { KingsTaxesLevel, RoadsBichromaticLevel, RoadsSteinerLevel } from '../src/core/levels/schema'
import { expectHeaderLaidOut, freshDevice, shot } from './helpers'
import { drag, openMap, toScreen, type Pt } from './roads-helpers'

freshDevice()

const read = <T>(path: string) =>
  JSON.parse(readFileSync(new URL(`../public/levels/${path}.json`, import.meta.url), 'utf8')) as T
const steiner = read<RoadsSteinerLevel>('roads/steiner/1-gabel')
const plane = read<RoadsBichromaticLevel>('roads/bichromatic/1-burgen')

const places: Pt[] = [...steiner.villages, ...steiner.castles]
const n = places.length
const best = steiner.optimum.junctions[0]!
// The first map: one junction, and a road from place to place.
const forked = steiner.optimum.roads.filter(([, b]) => b === n).map(([a]) => a)
const straight = steiner.optimum.roads.filter(([a, b]) => a < n && b < n)

/** The first map's network with its junction at `at`: three roads to the junction, then the straight one. */
async function buildFork(page: Page, at: Pt, phone: boolean) {
  expect([forked.length, straight.length]).toEqual([3, 1])
  await drag(page, places[forked[0]!]!, at, phone)
  await expect(page.locator('[data-junction=built]')).toHaveCount(1)
  await drag(page, places[forked[1]!]!, at, phone)
  await drag(page, places[forked[2]!]!, at, phone)
  await expect(page.getByTestId('roads-state')).toHaveText('Noch 2 Teile verbinden')
  await drag(page, places[straight[0]![0]]!, places[straight[0]![1]]!, phone)
}

test('Kreuzungen: a junction, its angles, the 1 % rule, the theory', async ({ page, phone }, testInfo) => {
  await openMap(page, 'Kreuzungen', 1)
  // The rules changed: "So geht's" of the new set.
  const howTo = page.getByRole('dialog', { name: "So geht's" })
  await expect(howTo.getByText(/Jetzt darfst du Kreuzungen bauen/)).toBeVisible()
  await shot(page, testInfo, 'roads-steiner-howto')
  await howTo.getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.locator('header')).toContainText('Kreuzungen 1 von 6')
  if (!phone) await expectHeaderLaidOut(page)

  // A junction well off its best spot: a road dragged onto open land there, then the others to it.
  const off: Pt = [best[0] + 0.5, best[1] + 0.25]
  await buildFork(page, off, phone)
  await expect(page.getByTestId('roads-state')).toHaveText(/über dem Optimum/)
  await expect(page.getByTestId('junction-angles')).toContainText('°')
  await page.getByRole('button', { name: 'Tipp' }).click()
  await expect(page.getByTestId('roads-hint')).toContainText('120°')
  await shot(page, testInfo, 'roads-steiner-building')

  // Moved closer (0.5 % above the optimum, within 1 %): optimal, but the junction stays where it was put,
  // with its angles some 10–20° off 120°.
  await drag(page, off, [best[0] + 0.3, best[1]], phone)
  await expect(page.getByTestId('roads-state')).toHaveText('Optimal!')
  const angles = page.getByTestId('junction-angles')
  const put = await angles.textContent()
  const result = page.getByRole('dialog', { name: 'Geschafft!' })
  await expect(result).toBeVisible()
  await expect(angles).toHaveText(put!)
  await expect(angles).not.toContainText('120°')
  await expect(result.getByRole('img', { name: '2 Sterne von 3' })).toBeVisible()
  await expect(result.getByText(/Steinerpunkte/)).toBeVisible()
  await expect(result.getByTestId('steiner-animation-length')).toHaveText('Länge: 7,7 km', {
    timeout: 10_000,
  })
  await shot(page, testInfo, 'roads-steiner-result')
  await result.getByRole('button', { name: 'Theorie' }).click()
  const theory = page.getByRole('complementary', { name: 'Theorie' })
  await expect(theory.getByTestId('steiner-compare')).toContainText('8,5 % länger')
  await theory.getByRole('button', { name: 'Ohne Kreuzungen' }).click()
  await shot(page, testInfo, 'roads-steiner-theory')
})

test('Kreuzungen: very close to the optimum the junction settles at 120°', async ({ page, phone }) => {
  await openMap(page, 'Kreuzungen', 1)
  await page.getByRole('dialog', { name: "So geht's" }).getByRole('button', { name: "Los geht's!" }).click()
  // 0.02 % above the optimum, angles 123°, 120° and 117°: the junction slides the last bit.
  await buildFork(page, [best[0] + 0.05, best[1] - 0.03], phone)
  await expect(page.getByTestId('roads-state')).toHaveText('Optimal!')
  await expect(page.getByTestId('junction-angles').getByText('120°')).toHaveCount(3)
  await expect(page.getByRole('dialog', { name: 'Geschafft!' })).toBeVisible()
})

test('Kreuzungen: a road from a junction by clicking it, then a place, with a dashed line to the pointer', async ({
  page,
  phone,
}, testInfo) => {
  await openMap(page, 'Kreuzungen', 1)
  await page.getByRole('dialog', { name: "So geht's" }).getByRole('button', { name: "Los geht's!" }).click()
  // The footer says how.
  await expect(page.locator('footer')).toContainText(
    phone
      ? 'Ort oder Kreuzung antippen, dann Ort, Kreuzung oder freies Land'
      : 'Kreuzung anklicken, dann Ort oder Kreuzung: Straße',
  )
  // A junction at the optimum's spot, with one road from a place.
  await drag(page, places[forked[0]!]!, best, phone)
  await expect(page.locator('[data-junction=built]')).toHaveCount(1)
  const junction = await toScreen(page, best)
  const place = await toScreen(page, places[forked[1]!]!)
  if (phone) {
    await page.touchscreen.tap(junction.x, junction.y)
    await page.touchscreen.tap(place.x, place.y)
  } else {
    await page.mouse.click(junction.x, junction.y)
    // A road has been started: it follows the pointer as a dashed line.
    await page.mouse.move((junction.x + place.x) / 2, (junction.y + place.y) / 2 + 30, { steps: 4 })
    await expect(page.getByTestId('road-preview')).toHaveCount(1)
    await shot(page, testInfo, 'roads-steiner-click-junction')
    await page.mouse.click(place.x, place.y)
    await expect(page.getByTestId('road-preview')).toHaveCount(0)
  }
  await expect(page.getByTestId('junction-angles')).toContainText('°')
  await expect(page.locator('[data-junction=built]')).toHaveCount(1)
  await expect(page.getByTestId('roads-state')).toHaveText('Noch 3 Teile verbinden')
})

test('Kreuzungen: a bent road and a junction dropped onto a village', async ({ page, phone }) => {
  await openMap(page, 'Kreuzungen', 1)
  await page.getByRole('dialog', { name: "So geht's" }).getByRole('button', { name: "Los geht's!" }).click()
  const [a, b] = [places[0]!, places[1]!]
  await drag(page, a, b, phone)
  // Dragged at its middle, the road bends at a new junction; dropped onto a village, the junction is gone.
  const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const bend: Pt = [mid[0], mid[1] - 0.8]
  await drag(page, mid, bend, phone)
  await expect(page.locator('[data-junction=built]')).toHaveCount(1)
  await expect(page.getByTestId('junction-angles')).toContainText('°')
  await drag(page, bend, a, phone)
  await expect(page.locator('[data-junction=built]')).toHaveCount(0)
  await expect(page.getByTestId('roads-state')).toHaveText('Noch 3 Teile verbinden')
})

test('Zwei Sorten: castles to villages, crossings marked, the theory', async ({ page, phone }, testInfo) => {
  await openMap(page, 'Zwei Sorten', 1)
  const howTo = page.getByRole('dialog', { name: "So geht's" })
  await expect(howTo.getByText(/Burgen und Dörfer/)).toBeVisible()
  await shot(page, testInfo, 'roads-plane-howto')
  await howTo.getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.locator('header')).toContainText('Zwei Sorten 1 von 6')

  const places: Pt[] = [...plane.villages, ...plane.castles]
  const build = ([u, v]: Road) => drag(page, places[u]!, places[v]!, phone)
  // Two villages: refused.
  await build([0, 1])
  await expect(page.getByTestId('roads-hint')).toContainText('nie zwei Burgen oder zwei Dörfer')
  await expect(page.getByTestId('roads-length')).toHaveText('Länge: 0,0 km')

  // The tree without the crossing rule: connected, but its crossings are marked and it does not count.
  const free = freeTree(places, plane.villages.length)
  for (const road of free) await build(road)
  await expect(page.getByTestId('roads-state')).toHaveText(`${plane.free.crossings} Schnittpunkte`)
  await expect(page.locator('[data-mark=crossing]')).toHaveCount(plane.free.crossings)
  await page.getByRole('button', { name: 'Tipp' }).click()
  await expect(page.getByTestId('roads-hint')).toContainText('schneidet eine andere')
  await shot(page, testInfo, 'roads-plane-crossings')

  await page.getByRole('button', { name: 'Neu' }).click()
  for (const road of plane.optimum.roads) await build(road)
  await expect(page.getByTestId('roads-state')).toHaveText('Optimal!')
  const result = page.getByRole('dialog', { name: 'Geschafft!' })
  await expect(result).toBeVisible()
  await expect(result.getByText(/NP-schwer/)).toBeVisible()
  await expect(result.getByTestId('plane-animation-caption')).toContainText('Ohne Schnittpunkte', {
    timeout: 10_000,
  })
  await shot(page, testInfo, 'roads-plane-result')
  await result.getByRole('button', { name: 'Theorie' }).click()
  const theory = page.getByRole('complementary', { name: 'Theorie' })
  await expect(theory.getByTestId('plane-free').locator('[data-mark=crossing]')).toHaveCount(
    plane.free.crossings,
  )
  await expect(theory).toContainText('O(log n)')
  await shot(page, testInfo, 'roads-plane-theory')
})

test('Von Ort zu Ort: a network 0,45 % longer than the shortest counts, and the result says so', async ({
  page,
  phone,
}, testInfo) => {
  const level = read<KingsTaxesLevel>('kings-taxes/spanner/ktLevel2_1.7')
  const points: Pt[] = [...level.villages, ...level.castles]
  const { roads: mst, length } = kruskal(points)
  // The next-best network: Kruskal's tree with one road swapped, 0.45 % longer.
  let near: { roads: Road[]; over: number } | null = null
  for (const { road: into } of roadsByLength(points)) {
    for (const out of mst) {
      const roads = [...mst.filter((r) => r !== out), into]
      const over = networkLength(points, roads) / length - 1
      if (componentCount(points.length, roads) === 1 && over > 1e-6 && (!near || over < near.over))
        near = { roads, over }
    }
  }
  expect(near!.over).toBeGreaterThan(0.004)
  expect(near!.over).toBeLessThan(0.005)
  await openMap(page, 'Von Ort zu Ort', 5)
  for (const [a, b] of near!.roads) await drag(page, points[a]!, points[b]!, phone)
  await expect(page.getByTestId('roads-state')).toHaveText('Optimal!')
  const result = page.getByRole('dialog', { name: 'Geschafft!' })
  await expect(result.getByTestId('roads-nearly')).toHaveText(
    'Optimal! Nur 0,5 % länger als das kürzeste Netz – mit bloßem Auge kaum zu sehen.',
  )
  await shot(page, testInfo, 'roads-nearly-optimal')
})
