import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { lowContrastTexts, tooSmall } from './contrast'
import { freshDevice } from './helpers'

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
