import { expect, test, type Page } from './fixtures'
import { freshDevice, shot } from './helpers'

/**
 * Screens for proofreading the texts in context (docs/texts-de.md) that the smoke tests do not show:
 * the lower part of the credits, the level pickers and the staff menu's PIN prompt. Laptop only
 * (1280 × 800); the "Texts" workflow uploads these with every other laptop screenshot.
 */
freshDevice()

test.skip(({ phone }) => phone, 'the texts are proofread at 1280 × 800')

async function startGame(page: Page, game: string) {
  await page.goto(`./#/play/${game}`)
  await page.getByRole('dialog', { name: "So geht's" }).getByRole('button', { name: "Los geht's!" }).click()
  const setup = page.getByRole('dialog', { name: 'Neues Spiel' })
  if (await setup.count()) await setup.getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.locator('header h1')).toBeVisible()
}

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
