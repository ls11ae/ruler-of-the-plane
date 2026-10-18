import { expect, test } from '@playwright/test'
import { freshDevice, shot, startGame } from './helpers'

/**
 * Screens for proofreading the texts in context (docs/texts-de.md) that the smoke tests do not show:
 * the lower part of the credits, the level pickers and the staff menu's PIN prompt. Laptop only
 * (1280 × 800); the "Texts" workflow uploads these with every other laptop screenshot.
 */
freshDevice()

test.skip(({ isMobile }) => isMobile, 'the texts are proofread at 1280 × 800')

test('credits, lower part', async ({ page }, testInfo) => {
  await page.goto('./#/credits')
  await expect(page.getByRole('heading', { name: 'Mitwirkende', level: 1 })).toBeVisible()
  await page.locator('main').evaluate((el) => el.scrollTo(0, el.scrollHeight))
  await shot(page, testInfo, 'screens-credits-end')
})

test('level pickers', async ({ page }, testInfo) => {
  const pickers = [
    { game: 'art-gallery', button: 'Verliese' },
    { game: 'frechet', button: 'Spaziergänge' },
    { game: 'roads', button: 'Karten' },
  ]
  for (const { game, button } of pickers) {
    await startGame(page, game)
    await page.locator('header').getByRole('button', { name: button }).click()
    await expect(page.getByRole('dialog', { name: button })).toBeVisible()
    await shot(page, testInfo, `screens-${game}-picker`)
  }
})

test('Gassi gehen: the leash snaps', async ({ page }, testInfo) => {
  await startGame(page, 'frechet')
  await page.keyboard.down('KeyA')
  await expect(page.getByRole('dialog', { name: 'Leine zu straff!' })).toBeVisible({ timeout: 15_000 })
  await page.keyboard.up('KeyA')
  await shot(page, testInfo, 'screens-frechet-snapped')
})
