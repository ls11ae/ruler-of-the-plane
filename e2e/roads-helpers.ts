import type { Page } from '@playwright/test'
import { startGame } from './helpers'

/** Helpers of the "Straßenbau" tests: points on the board and drags. */

export type Pt = readonly [number, number]

/** Screen position of a point in level coordinates (the board may be turned by 90°). */
export async function toScreen(page: Page, [x, y]: Pt) {
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

/**
 * Drags from one point of the map to another: with the mouse on the laptop, with synthetic touch pointer
 * events on the phone (Playwright's touchscreen only taps).
 */
export async function drag(page: Page, from: Pt, to: Pt, touch: boolean) {
  const p = await toScreen(page, from)
  const q = await toScreen(page, to)
  if (!touch) {
    await page.mouse.move(p.x, p.y)
    await page.mouse.down()
    await page.mouse.move(q.x, q.y, { steps: 10 })
    await page.mouse.up()
    return
  }
  const input = page.getByTestId('roads-input')
  const ev = (x: number, y: number, buttons: number) => ({
    clientX: x,
    clientY: y,
    pointerId: 7,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    buttons,
    bubbles: true,
  })
  await input.dispatchEvent('pointerdown', ev(p.x, p.y, 1))
  for (let i = 1; i <= 10; i++) {
    await input.dispatchEvent(
      'pointermove',
      ev(p.x + ((q.x - p.x) * i) / 10, p.y + ((q.y - p.y) * i) / 10, 1),
    )
  }
  await input.dispatchEvent('pointerup', ev(q.x, q.y, 0))
}

/** Opens a map of a set through the picker (after starting "Leicht" on the tier screen). */
export async function openMap(page: Page, set: string, map: number) {
  await startGame(page, 'roads', 'Leicht')
  await page.getByRole('button', { name: 'Karten' }).click()
  const picker = page.getByRole('dialog', { name: 'Karten' })
  await picker
    .getByRole('region', { name: set })
    .getByRole('button', { name: `${set}: Karte ${map}` })
    .click()
}
