import { expect, test, type Page } from './fixtures'
import { readFileSync } from 'node:fs'
import { mapOf } from '../src/core/games/roads/levels'
import { kruskal } from '../src/core/games/roads/mst'
import type { KingsTaxesLevel } from '../src/core/levels/schema'
import { de as frechet } from '../src/ui/games/frechet/i18n.de'
import { de as shell } from '../src/ui/i18n/de'
import { chooseTier, expectHeaderLaidOut, freshDevice, shot } from './helpers'
import { drag } from './roads-helpers'

freshDevice()

const TIERS = ['Leicht', 'Mittel', 'Schwer'] as const
type TierName = (typeof TIERS)[number]

/**
 * What the game shows once a tier has started on the tier screen: its first level (the header names
 * it) and, for "Kreuzungen" and "Zwei Sorten", the "So geht's" of their new rules first.
 */
const STARTS: Record<string, Record<TierName, { header: string; howTo?: RegExp }>> = {
  'art-gallery': {
    Leicht: { header: 'Leicht 1 von 4 · Ziel: 2 Fackeln' },
    Mittel: { header: 'Mittel 1 von 5 · Ziel: 8 Fackeln' },
    Schwer: { header: 'Schwer 1 von 5 · Ziel: 4 Fackeln' },
  },
  voronoi: {
    Leicht: { header: 'Du gegen den Computer (Leicht) · Burg 1 von 10' },
    Mittel: { header: 'Du gegen den Computer (Mittel) · Burg 1 von 10' },
    Schwer: { header: 'Du gegen den Computer (Schwer) · Burg 1 von 10' },
  },
  frechet: {
    Leicht: { header: `Schlosspark · ${frechet.walks.avenue} · Spaziergang 1 von 6` },
    Mittel: { header: `Schlosspark · Mittel · ${frechet.walks.m1} · 1 von 4` },
    Schwer: { header: `Schlosspark · Schwer · ${frechet.walks.s1} · 1 von 4` },
  },
  'lawn-mowing': {
    Leicht: { header: 'Rasen 1 ·' },
    Mittel: { header: 'Rasen 2 ·' },
    Schwer: { header: 'Rasen 3 ·' },
  },
  roads: {
    Leicht: { header: 'Karte 1 von 8' },
    Mittel: { header: 'Kreuzungen 1 von 6', howTo: /Jetzt darfst du Kreuzungen bauen/ },
    Schwer: { header: 'Zwei Sorten 1 von 6', howTo: /Burgen und Dörfer/ },
  },
}

/** Back to the start map and into the game again: the tier screen. */
async function reopen(page: Page, game: keyof typeof shell.places) {
  await page.getByRole('link', { name: 'Zurück zur Karte' }).click()
  await page.getByRole('link', { name: new RegExp(shell.places[game].name) }).click()
  await expect(page.getByTestId('tier-screen')).toBeVisible()
}

for (const [game, starts] of Object.entries(STARTS)) {
  test(`${game}: the tier screen starts each tier`, async ({ page, phone }, testInfo) => {
    await page.goto(`./#/play/${game}`)
    const tiers = page.getByTestId('tier-screen')
    for (const tier of TIERS)
      await expect(tiers.getByRole('button', { name: new RegExp(`^${tier}`) })).toBeVisible()
    // A fresh device: nothing to continue, no tier marked.
    await expect(tiers.getByRole('button', { name: /^Weiterspielen/ })).toHaveCount(0)
    await expect(tiers.getByText('zuletzt gespielt')).toHaveCount(0)
    if (!phone) await expectHeaderLaidOut(page)
    await shot(page, testInfo, `tiers-${game}`)
    for (const tier of TIERS) {
      // Through the start map: the same address again would not open the game anew.
      await page.goto('./#/')
      await page.goto(`./#/play/${game}`)
      await chooseTier(page, tier)
      const { header, howTo } = starts[tier]
      if (howTo) {
        const dialog = page.getByRole('dialog', { name: "So geht's" })
        await expect(dialog.getByText(howTo)).toBeVisible()
        await dialog.getByRole('button', { name: "Los geht's!" }).click()
      }
      await expect(page.getByTestId('tier-screen')).toHaveCount(0)
      await expect(page.locator('header')).toContainText(header)
      await shot(page, testInfo, `tiers-${game}-${tier}`)
    }
    // The tier played last is marked when the game opens again.
    await reopen(page, game as keyof typeof shell.places)
    await expect(page.getByTestId('tier-screen').getByRole('button', { name: /^Schwer/ })).toContainText(
      'zuletzt gespielt',
    )
  })
}

test('"Weiterspielen", the tier played last, the kiosk reset and the staff suggestion', async ({
  page,
  phone,
}, testInfo) => {
  test.skip(phone, 'one project is enough for the stored state')
  await page.clock.install()
  await page.goto('./#/play/roads')
  await chooseTier(page, 'Mittel')
  await page.getByRole('dialog', { name: "So geht's" }).getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.locator('header')).toContainText('Kreuzungen 1 von 6')

  // Back on the tier screen: "Mittel" is marked, "Weiterspielen" returns to the same map.
  await reopen(page, 'roads')
  const tiers = page.getByTestId('tier-screen')
  await expect(tiers.getByRole('button', { name: /^Mittel/ })).toHaveAttribute('aria-current', 'true')
  await expect(tiers.getByRole('button', { name: /^Mittel/ })).toContainText('zuletzt gespielt')
  await shot(page, testInfo, 'tiers-roads-played')
  await tiers.getByRole('button', { name: 'Weiterspielen: Kreuzungen, Karte 1' }).click()
  await expect(page.locator('header')).toContainText('Kreuzungen 1 von 6')

  // The staff suggests "Schwer" for "Straßenbau" (Ctrl+Shift+S; no PIN in the test build).
  await page.keyboard.press('Control+Shift+KeyS')
  const menu = page.getByRole('dialog', { name: 'Personalmenü' })
  await menu
    .getByRole('group', { name: 'Schwierigkeit beim Start: Straßenbau' })
    .getByRole('button', { name: 'Schwer' })
    .click()
  await menu.getByRole('button', { name: 'Schließen', exact: true }).last().click()

  // The tier played here wins over the suggestion.
  await reopen(page, 'roads')
  await expect(tiers.getByRole('button', { name: /^Mittel/ })).toContainText('zuletzt gespielt')
  await expect(tiers.getByText('empfohlen')).toHaveCount(0)

  // Kiosk mode starts on the attract screen and hands the booth to the next visitor: no tier played,
  // nothing to continue, the staff's suggestion marked.
  await page.goto('./?kiosk')
  const attract = page.getByRole('dialog', { name: 'Ruler of the Plane' })
  await attract.click()
  await page.getByRole('link', { name: /Straßenbau/ }).click()
  await expect(tiers.getByRole('button', { name: /^Weiterspielen/ })).toHaveCount(0)
  await expect(tiers.getByRole('button', { name: /^Schwer/ })).toContainText('empfohlen')
  await expect(tiers.getByText('zuletzt gespielt')).toHaveCount(0)
  await shot(page, testInfo, 'tiers-roads-suggested')
  await chooseTier(page, 'Leicht')
  await expect(page.locator('header')).toContainText('Karte 1 von 8')
  // So again after the kiosk timeout (90 s without input).
  await page.clock.fastForward('01:35')
  await expect(attract).toBeVisible()
  await attract.click()
  await page.getByRole('link', { name: /Straßenbau/ }).click()
  await expect(tiers.getByText('zuletzt gespielt')).toHaveCount(0)
  await expect(tiers.getByRole('button', { name: /^Schwer/ })).toContainText('empfohlen')
})

test('after the last map of "Leicht", the result offers "Mittel"', async ({ page, phone }, testInfo) => {
  test.setTimeout(120_000)
  const level = JSON.parse(
    readFileSync(new URL('../public/levels/kings-taxes/tsp/ktLevel3.json', import.meta.url), 'utf8'),
  ) as KingsTaxesLevel
  const map = mapOf(level)
  await page.goto('./#/play/roads')
  await chooseTier(page, 'Leicht')
  await page.getByRole('button', { name: 'Karten' }).click()
  const picker = page.getByRole('dialog', { name: 'Karten' })
  // The picker's sections are the tiers, in the same order.
  await expect(picker.getByRole('heading', { level: 3 })).toHaveText([
    'Leicht · Von Ort zu Ort',
    'Mittel · Kreuzungen',
    'Schwer · Zwei Sorten',
  ])
  await picker.getByRole('button', { name: 'Von Ort zu Ort: Karte 8' }).click()
  await expect(page.locator('header')).toContainText('Karte 8 von 8')
  for (const [a, b] of kruskal(map.points).roads) await drag(page, map.points[a]!, map.points[b]!, phone)
  const result = page.getByRole('dialog', { name: 'Geschafft!' })
  await expect(result).toBeVisible()
  const next = result.getByRole('button', { name: 'Weiter mit „Mittel“' })
  await expect(next).toBeVisible()
  await shot(page, testInfo, 'tiers-next')
  await next.click()
  await expect(
    page.getByRole('dialog', { name: "So geht's" }).getByText(/Jetzt darfst du Kreuzungen bauen/),
  ).toBeVisible()
})
