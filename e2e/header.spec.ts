import { test } from './fixtures'
import { expectHeaderLaidOut, freshDevice, shot } from './helpers'

freshDevice()

// The header must not draw title, status and buttons over each other in any window width.
for (const width of [768, 1024, 1280]) {
  test(`game headers fit ${width} px`, async ({ page, phone }, testInfo) => {
    test.skip(phone, 'window widths of laptops and tablets')
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
    // These two ask for a setup ("Neues Spiel") after "So geht's", then show the full header.
    for (const game of ['voronoi', 'lawn-mowing']) {
      await page.goto(`./#/play/${game}`)
      await page
        .getByRole('dialog', { name: "So geht's" })
        .getByRole('button', { name: "Los geht's!" })
        .click()
      await page
        .getByRole('dialog', { name: 'Neues Spiel' })
        .getByRole('button', { name: "Los geht's!" })
        .click()
      await expectHeaderLaidOut(page)
      await shot(page, testInfo, `header-${game}-${width}`)
    }
    await page.goto('./#/demo')
    await expectHeaderLaidOut(page)
  })
}
