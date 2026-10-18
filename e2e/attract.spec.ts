import { expect, test } from '@playwright/test'
import { de } from '../src/ui/i18n/de'
import { freshDevice, shot } from './helpers'

freshDevice()

const GAMES = ['art-gallery', 'voronoi', 'frechet', 'lawn-mowing', 'roads'] as const

test('the attract screen shows the demos of all five games in turn', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await page.clock.install()
  await page.goto('./?kiosk')
  const attract = page.getByRole('dialog', { name: 'Ruler of the Plane' })
  await expect(attract).toBeVisible()
  const stage = attract.locator('[data-demo]')
  const step = () => stage.locator('[data-step]').first().getAttribute('data-step')
  for (const game of GAMES) {
    // Each demo tells its story in 20–30 s, then the next game's begins.
    for (let s = 0; s < 45 && (await stage.getAttribute('data-demo')) !== game; s++) {
      await page.clock.runFor(1000)
      await page.waitForTimeout(20)
    }
    await expect(stage).toHaveAttribute('data-demo', game)
    await expect(attract.getByText(de.places[game].name)).toBeVisible()
    await expect(attract.getByText('Komm spielen!')).toBeVisible()
    await expect(stage.locator('[data-step]')).toHaveCount(1, { timeout: 10_000 })
    const first = await step()
    // Under way: the demo moves on.
    for (let s = 0; s < 10; s++) {
      await page.clock.runFor(1000)
      await page.waitForTimeout(20)
    }
    expect(await step()).not.toBe(first)
    await shot(page, testInfo, `attract-${game}`)
  }
  // Any click leads to the start map.
  await attract.click()
  await expect(attract).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Ruler of the Plane' })).toBeVisible()
})
