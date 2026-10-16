import { expect, test, type Locator, type Page } from '@playwright/test'
import { freshDevice, shot } from './helpers'

freshDevice()

/** Screen position of a point given in level coordinates (the board may be turned by 90°). */
async function toScreen(page: Page, x: number, y: number) {
  return page
    .locator('svg[role=img] > g')
    .first()
    .evaluate(
      (g, [x, y]) => {
        const p = new DOMPoint(x, y).matrixTransform((g as SVGGElement).getScreenCTM()!)
        return { x: p.x, y: p.y }
      },
      [x, y],
    )
}

/** A touch drag with Pointer Events (Playwright's touchscreen API has taps only). */
async function touchDrag(
  input: Locator,
  from: { x: number; y: number },
  to: () => Promise<{ x: number; y: number }>,
) {
  const ev = (x: number, y: number, buttons: number) => ({
    pointerId: 7,
    pointerType: 'touch',
    isPrimary: true,
    clientX: x,
    clientY: y,
    button: 0,
    buttons,
    bubbles: true,
  })
  await input.dispatchEvent('pointerdown', ev(from.x, from.y, 1))
  for (let i = 1; i <= 5; i++) await input.dispatchEvent('pointermove', ev(from.x, from.y - 8 * i, 1))
  const target = await to()
  await input.dispatchEvent('pointermove', ev(target.x, target.y, 1))
  await input.dispatchEvent('pointerup', ev(target.x, target.y, 0))
}

test('plays the first dungeon: place, remove, light it with two torches', async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto('./#/play/art-gallery')
  const howTo = page.getByRole('dialog', { name: "So geht's" })
  await expect(howTo).toBeVisible()
  await shot(page, testInfo, 'art-gallery-howto')
  await howTo.getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.getByText('Fackeln: 0 von 2')).toBeVisible()

  const place = async (x: number, y: number) => {
    const p = await toScreen(page, x, y)
    if (isMobile) await page.touchscreen.tap(p.x, p.y)
    else await page.mouse.click(p.x, p.y)
  }

  // A torch in a poor spot: the dungeon stays partly dark and the thickest dark spot is marked.
  await place(-2.5, 3.5)
  await expect(page.getByText('Fackeln: 1 von 2')).toBeVisible()
  await expect(page.getByTestId('dark-hint')).toBeVisible()
  await shot(page, testInfo, 'art-gallery-one-torch')

  // Remove it again: laptop by dragging it off the dungeon, phone by dragging it onto the bucket.
  const torch = await toScreen(page, -2.5, 3.5)
  if (isMobile) {
    const input = page.locator('svg[role=img] rect[fill="transparent"]')
    await touchDrag(input, torch, async () => {
      const box = (await page.getByText('Hierher ziehen: Fackel wegnehmen').boundingBox())!
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    })
  } else {
    const outside = await toScreen(page, -4.4, 4.6)
    await page.mouse.move(torch.x, torch.y)
    await page.mouse.down()
    await page.mouse.move(torch.x + 20, torch.y, { steps: 3 })
    await expect(page.getByText('Hierher ziehen: Fackel wegnehmen')).toBeVisible()
    await page.mouse.move(outside.x, outside.y, { steps: 6 })
    await page.mouse.up()
  }
  await expect(page.getByText('Fackeln: 0 von 2')).toBeVisible()

  // Two well-placed torches light everything: three stars.
  await place(2.35, -2.79)
  await place(1.37, 1.83)
  await expect(page.getByTestId('lit-percent')).toHaveText(/^100 %/)
  const result = page.getByRole('dialog', { name: 'Geschafft!' })
  await expect(result).toBeVisible()
  await expect(result.getByRole('img', { name: '3 Sterne von 3' })).toBeVisible()
  await shot(page, testInfo, 'art-gallery-result')
  await result.getByRole('button', { name: 'Schließen', exact: true }).first().click()
  await shot(page, testInfo, 'art-gallery-lit')
})
