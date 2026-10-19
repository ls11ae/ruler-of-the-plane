import { expect, test } from './fixtures'
import { readFileSync } from 'node:fs'
import type { Road } from '../src/core/games/roads/mst'
import { freeTree } from '../src/core/games/roads/plane'
import type { RoadsBichromaticLevel, RoadsSteinerLevel } from '../src/core/levels/schema'
import { expectHeaderLaidOut, freshDevice, shot } from './helpers'
import { drag, openMap, type Pt } from './roads-helpers'

freshDevice()

const read = <T>(path: string) =>
  JSON.parse(readFileSync(new URL(`../public/levels/${path}.json`, import.meta.url), 'utf8')) as T
const steiner = read<RoadsSteinerLevel>('roads/steiner/1-gabel')
const plane = read<RoadsBichromaticLevel>('roads/bichromatic/1-burgen')

test('Kreuzungen: a junction, its angles, the 1 % rule, the theory', async ({ page, phone }, testInfo) => {
  await openMap(page, 'Kreuzungen', 1)
  // The rules changed: "So geht's" of the new set.
  const howTo = page.getByRole('dialog', { name: "So geht's" })
  await expect(howTo.getByText(/Jetzt darfst du Kreuzungen bauen/)).toBeVisible()
  await shot(page, testInfo, 'roads-steiner-howto')
  await howTo.getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.locator('header')).toContainText('Kreuzungen 1 von 6')
  if (!phone) await expectHeaderLaidOut(page)

  const places: Pt[] = [...steiner.villages, ...steiner.castles]
  const n = places.length
  const best = steiner.optimum.junctions[0]!
  // The first map: one junction, and a road from place to place.
  const forked = steiner.optimum.roads.filter(([, b]) => b === n).map(([a]) => a)
  const straight = steiner.optimum.roads.filter(([a, b]) => a < n && b < n)
  expect([forked.length, straight.length]).toEqual([3, 1])
  // A junction well off its best spot: a road dragged onto open land there, then the others to it.
  const off: Pt = [best[0] + 0.5, best[1] + 0.25]
  await drag(page, places[forked[0]!]!, off, phone)
  await expect(page.locator('[data-junction=built]')).toHaveCount(1)
  await drag(page, places[forked[1]!]!, off, phone)
  await drag(page, places[forked[2]!]!, off, phone)
  await expect(page.getByTestId('roads-state')).toHaveText('Noch 2 Teile verbinden')
  await drag(page, places[straight[0]![0]]!, places[straight[0]![1]]!, phone)
  await expect(page.getByTestId('roads-state')).toHaveText(/über dem Optimum/)
  await expect(page.getByTestId('junction-angles')).toContainText('°')
  await page.getByRole('button', { name: 'Tipp' }).click()
  await expect(page.getByTestId('roads-hint')).toContainText('120°')
  await shot(page, testInfo, 'roads-steiner-building')

  // Moved close to its best spot (within 1 % of the optimum): optimal.
  await drag(page, off, [best[0] + 0.05, best[1] - 0.03], phone)
  await expect(page.getByTestId('roads-state')).toHaveText('Optimal!')
  await expect(page.getByTestId('junction-angles')).toContainText('120°')
  const result = page.getByRole('dialog', { name: 'Geschafft!' })
  await expect(result).toBeVisible()
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

test('Kreuzungen: a bent road and a junction dropped onto a village', async ({ page, phone }) => {
  await openMap(page, 'Kreuzungen', 1)
  await page.getByRole('dialog', { name: "So geht's" }).getByRole('button', { name: "Los geht's!" }).click()
  const places: Pt[] = [...steiner.villages, ...steiner.castles]
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
