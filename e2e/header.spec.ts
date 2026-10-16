import { test } from '@playwright/test'
import { expectHeaderLaidOut, freshDevice, shot } from './helpers'

freshDevice()

// The header must not draw title, status and buttons over each other in any window width.
for (const width of [768, 1024, 1280]) {
  test(`game headers fit ${width} px`, async ({ page, isMobile }, testInfo) => {
    test.skip(isMobile, 'window widths of laptops and tablets')
    await page.setViewportSize({ width, height: 800 })
    await page.goto('./#/play/art-gallery')
    await page.getByRole('button', { name: "Los geht's!" }).click()
    await expectHeaderLaidOut(page)
    await shot(page, testInfo, `header-art-gallery-${width}`)
    for (const game of ['frechet', 'roads']) {
      await page.goto(`./#/play/${game}`)
      await page.getByRole('button', { name: "Los geht's!" }).click()
      await expectHeaderLaidOut(page)
    }
    await page.goto('./#/demo')
    await expectHeaderLaidOut(page)
  })
}
