import { expect, test } from './fixtures'
import { expectHeaderLaidOut, freshDevice, shot, startGame } from './helpers'

freshDevice()

// The header must not draw title, status and buttons over each other in any window width.
for (const width of [768, 1024, 1280]) {
  test(`game headers fit ${width} px`, async ({ page, phone }, testInfo) => {
    test.skip(phone, 'window widths of laptops and tablets')
    await page.setViewportSize({ width, height: 800 })
    await page.goto('./#/play/art-gallery')
    // The tier screen has a header of its own.
    await expectHeaderLaidOut(page)
    await startGame(page, 'art-gallery')
    await expectHeaderLaidOut(page)
    await shot(page, testInfo, `header-art-gallery-${width}`)
    for (const game of ['frechet', 'roads', 'voronoi', 'lawn-mowing']) {
      await startGame(page, game)
      await expect(page.getByTestId('tier-screen')).toHaveCount(0)
      await expectHeaderLaidOut(page)
      if (game === 'voronoi' || game === 'lawn-mowing') await shot(page, testInfo, `header-${game}-${width}`)
    }
    await page.goto('./#/demo')
    await expectHeaderLaidOut(page)
  })
}
