import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { lowContrastTexts, tooSmall } from './contrast'
import { de } from '../src/ui/games/frechet/i18n.de'
import { woodsDe } from '../src/ui/games/frechet/woods/i18n.de'
import { freshDevice } from './helpers'
import { drag, type Pt } from './roads-helpers'

freshDevice()

/**
 * Checks the screen as it is: axe-core (WCAG 2.1 A and AA; serious and critical violations fail), and
 * the checks of `contrast.ts` that axe cannot do over parchment and SVG boards: the contrast of every
 * text against what is drawn behind it, text sizes, and 44 px hit targets. Soft assertions, so one run
 * lists every problem of every screen.
 */
async function expectAccessible(page: Page, screen: string) {
  await page.evaluate(() => document.fonts.ready)
  // Let fade-ins finish (overlays fade in over 160 ms), so contrast is measured on the final colours.
  await page.waitForTimeout(400)
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const report = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n` +
        v.nodes
          .slice(0, 6)
          .map((n) => `    ${n.target.join(' ')}: ${n.failureSummary?.split('\n').slice(1).join(' ').trim()}`)
          .join('\n'),
    )
  expect.soft(report, `axe-core on ${screen}`).toEqual([])
  expect.soft(await lowContrastTexts(page), `contrast of the texts on ${screen}`).toEqual([])
  expect.soft(await tooSmall(page), `text sizes and hit targets on ${screen}`).toEqual([])
}

test('start map, credits and the demo dialogs', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Ruler of the Plane' })).toBeVisible()
  await expectAccessible(page, 'start map')
  await page.getByRole('button', { name: /Switch to English/ }).click()
  await expectAccessible(page, 'start map (English)')
  await page.getByRole('button', { name: /Auf Deutsch/ }).click()

  await page.goto('./#/credits')
  await expect(page.getByRole('heading', { name: 'Mitwirkende', level: 1 })).toBeVisible()
  await expectAccessible(page, 'credits')

  await page.goto('./#/demo')
  await page.getByRole('button', { name: "So geht's" }).click()
  await expect(page.getByRole('dialog', { name: "So geht's" })).toBeVisible()
  await expectAccessible(page, 'how-to overlay')
  await page.getByRole('button', { name: "Los geht's!" }).click()
  await page.getByRole('button', { name: 'Ergebnis' }).click()
  await expect(page.getByRole('dialog', { name: 'Geschafft!' })).toBeVisible()
  await expectAccessible(page, 'result screen with the leaderboard')
})

test('attract screen and staff menu', async ({ page, isMobile }) => {
  await page.goto('./?kiosk')
  await expect(page.getByRole('dialog', { name: 'Ruler of the Plane' })).toBeVisible()
  await expectAccessible(page, 'attract screen')
  await page.getByRole('dialog', { name: 'Ruler of the Plane' }).click()
  if (isMobile) return
  await page.keyboard.press('Control+Shift+KeyS')
  await expect(page.getByRole('dialog', { name: 'Personalmenü' })).toBeVisible()
  await expectAccessible(page, 'staff menu')
})

for (const game of ['art-gallery', 'voronoi', 'frechet', 'lawn-mowing', 'roads']) {
  test(`game ${game}: how-to, setup, board and theory`, async ({ page }) => {
    await page.goto(`./#/play/${game}`)
    const howTo = page.getByRole('dialog', { name: "So geht's" })
    await expect(howTo).toBeVisible()
    await expectAccessible(page, `${game}: how-to`)
    await howTo.getByRole('button', { name: "Los geht's!" }).click()
    const setup = page.getByRole('dialog', { name: 'Neues Spiel' })
    if (await setup.count()) {
      await expectAccessible(page, `${game}: setup`)
      await setup.getByRole('button', { name: "Los geht's!" }).click()
    }
    await expect(page.locator('header h1')).toBeVisible()
    await expectAccessible(page, `${game}: board`)
    const theory = page.locator('header').getByRole('button', { name: 'Theorie' })
    if (await theory.count()) {
      await theory.click()
      await expectAccessible(page, `${game}: theory`)
    }
  })
}

test('game frechet, "Im Wald": picker, how-to, board, theory and a snapped leash', async ({ page }) => {
  await page.goto('./#/play/frechet')
  await page.getByRole('button', { name: "Los geht's!" }).click()
  await page.getByRole('button', { name: 'Spaziergänge' }).click()
  const woods = page.getByRole('dialog', { name: 'Spaziergänge' }).getByRole('region', { name: 'Im Wald' })
  await woods.scrollIntoViewIfNeeded()
  await expectAccessible(page, 'frechet: picker with the woods')
  await woods.getByRole('button', { name: /Laternenpfahl/ }).click()
  const howTo = page.getByRole('dialog', { name: "So geht's" })
  await expect(howTo.getByText(/bleibt die Leine an Stämmen und Pfählen hängen/)).toBeVisible()
  await expectAccessible(page, 'frechet woods: how-to')
  await howTo.getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.getByTestId('leash')).toContainText('von 3,4 m Leine')
  await expectAccessible(page, 'frechet woods: board')
  await page.locator('header').getByRole('button', { name: 'Theorie' }).click()
  await expect(page.getByRole('complementary', { name: 'Theorie' })).toBeVisible()
  await expectAccessible(page, 'frechet woods: theory')
  await page
    .getByRole('complementary', { name: 'Theorie' })
    .getByRole('button', { name: 'Ohne Bäume' })
    .click()
  await expectAccessible(page, 'frechet woods: theory without trees')
  await page.getByRole('button', { name: 'Theorie schließen' }).click()
  // The person walks on alone until the leash snaps.
  await page.getByTestId('hold-person').dispatchEvent('pointerdown', {
    pointerId: 21,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    buttons: 1,
    bubbles: true,
  })
  const snapped = page.getByRole('dialog', { name: 'Leine zu straff!' })
  await expect(snapped).toBeVisible({ timeout: 10_000 })
  await page.getByTestId('hold-person').dispatchEvent('pointerup', {
    pointerId: 21,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    buttons: 0,
    bubbles: true,
  })
  await expectAccessible(page, 'frechet woods: leash snapped')
})

test('game frechet, harder tiers: picker, a hard walk in the park and in the woods', async ({ page }) => {
  await page.goto('./#/play/frechet')
  await page.getByRole('button', { name: "Los geht's!" }).click()
  const open = async () => {
    await page.getByRole('button', { name: 'Spaziergänge' }).click()
    const picker = page.getByRole('dialog', { name: 'Spaziergänge' })
    await picker.getByRole('button', { name: 'Schwer', exact: true }).click()
    return picker
  }
  const picker = await open()
  await expect(picker.getByText(/viele Sackgassen/)).toBeVisible()
  // Not a text cut in half at the dialog's lower edge (on a phone the woods section starts there).
  await picker.getByRole('region', { name: 'Im Wald' }).scrollIntoViewIfNeeded()
  await expectAccessible(page, 'frechet: picker, tier Schwer')
  await picker.getByRole('button', { name: new RegExp(de.walks.s1) }).click()
  await expect(page.getByTestId('leash')).toBeVisible()
  await expectAccessible(page, 'frechet: a hard walk in the park')
  const again = await open()
  const woods = again.getByRole('region', { name: 'Im Wald' })
  await woods.getByRole('button', { name: new RegExp(woodsDe.walks.ws1) }).click()
  const howTo = page.getByRole('dialog', { name: "So geht's" })
  if (await howTo.count()) await howTo.getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.getByTestId('trunks')).toBeVisible()
  await expectAccessible(page, 'frechet: a hard walk in the woods')
})

test('game roads, "Kreuzungen" and "Zwei Sorten": picker, how-to, board, theory', async ({
  page,
  isMobile,
}) => {
  const read = (path: string) =>
    JSON.parse(readFileSync(new URL(`../public/levels/${path}.json`, import.meta.url), 'utf8')) as {
      villages: Pt[]
      castles: Pt[]
      optimum: { junctions?: Pt[] }
      free?: { roads: [number, number][] }
    }
  await page.goto('./#/play/roads')
  await page.getByRole('button', { name: "Los geht's!" }).click()
  await page.getByRole('button', { name: 'Karten' }).click()
  await expectAccessible(page, 'roads: picker with the three sets')
  await page.getByRole('button', { name: 'Kreuzungen: Karte 2' }).click()
  await expectAccessible(page, 'roads, Kreuzungen: how-to')
  await page.getByRole('button', { name: "Los geht's!" }).click()
  // A junction off its best spot, with the angle labels, and a hint marking it.
  const steiner = read('roads/steiner/2-viereck')
  const places = [...steiner.villages, ...steiner.castles]
  const [j] = steiner.optimum.junctions!
  const at: Pt = [j![0] + 0.3, j![1] + 0.3]
  await drag(page, places[0]!, at, isMobile)
  await drag(page, places[3]!, at, isMobile)
  await drag(page, places[1]!, at, isMobile)
  await expect(page.getByTestId('junction-angles')).toContainText('°')
  await page.getByRole('button', { name: 'Tipp' }).click()
  await expectAccessible(page, 'roads, Kreuzungen: board with a junction and a hint')
  await page.locator('header').getByRole('button', { name: 'Theorie' }).click()
  await page.getByRole('button', { name: 'Kürzestes Netz' }).click()
  await expectAccessible(page, 'roads, Kreuzungen: theory')

  await page.getByRole('button', { name: 'Karten' }).click()
  await page.getByRole('button', { name: 'Zwei Sorten: Karte 2' }).click()
  await expectAccessible(page, 'roads, Zwei Sorten: how-to')
  await page.getByRole('button', { name: "Los geht's!" }).click()
  const plane = read('roads/bichromatic/2-weiler')
  const points = [...plane.villages, ...plane.castles]
  for (const [a, b] of plane.free!.roads) await drag(page, points[a]!, points[b]!, isMobile)
  await expect(page.getByTestId('roads-state')).toContainText('Schnittpunkte')
  await expectAccessible(page, 'roads, Zwei Sorten: board with crossings')
  await page.locator('header').getByRole('button', { name: 'Theorie' }).click()
  await expectAccessible(page, 'roads, Zwei Sorten: theory')
})
