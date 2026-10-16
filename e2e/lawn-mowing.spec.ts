import { readFileSync } from 'node:fs'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { freshDevice, shot } from './helpers'

freshDevice()

type Dir = 'up' | 'down' | 'left' | 'right'
type Pt = [number, number]

const lawn1 = JSON.parse(readFileSync('public/levels/lawn-mowing/lawn1.json', 'utf8')) as {
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

/** Unit steps from `from` through `points` (axis-parallel legs, x first). */
function stepsThrough(from: Pt, points: Pt[]): Dir[] {
  const out: Dir[] = []
  let [x, y] = from
  for (const [tx, ty] of points) {
    while (x !== tx) {
      out.push(tx > x ? 'right' : 'left')
      x += Math.sign(tx - x)
    }
    while (y !== ty) {
      out.push(ty > y ? 'up' : 'down')
      y += Math.sign(ty - y)
    }
  }
  return out
}

/** Back and forth over the rows `lo` to `hi` (cells) of the lawn's width, with a 3 × 3 cutter. */
function sweep(lo: number, hi: number): Pt[] {
  const { minX, maxX } = lawn1.bounds
  const rows: number[] = []
  for (let r = lo + 1; ; r += 3) {
    rows.push(Math.min(r, hi - 1))
    if (r + 1 >= hi) break
  }
  return rows.flatMap(
    (y, i) =>
      (i % 2 === 0
        ? [
            [minX + 1, y],
            [maxX - 2, y],
          ]
        : [
            [maxX - 2, y],
            [minX + 1, y],
          ]) as Pt[],
  )
}

async function cutterPositions(page: Page): Promise<Pt[]> {
  const text = (await page.locator('[data-cutters]').getAttribute('data-cutters')) ?? ''
  return text.split(';').map((p) => p.split(',').map(Number) as Pt)
}

/** Screen direction for a lawn direction (a portrait phone shows the board turned by 90°). */
async function screenDir(page: Page, d: Dir): Promise<Dir> {
  const rotated = (await page.locator('svg[role=img][data-rotated]').count()) > 0
  if (!rotated) return d
  return ({ left: 'up', right: 'down', down: 'left', up: 'right' } as const)[d]
}

async function startGame(page: Page, players: 1 | 2, testInfo: TestInfo) {
  await page.goto('./#/play/lawn-mowing')
  const howTo = page.getByRole('dialog', { name: "So geht's" })
  await expect(howTo).toBeVisible()
  await shot(page, testInfo, 'lawn-mowing-howto')
  await howTo.getByRole('button', { name: "Los geht's!" }).click()
  const setup = page.getByRole('dialog', { name: 'Neues Spiel' })
  await expect(setup).toBeVisible()
  if (players === 2) await setup.getByRole('button', { name: 'Zu zweit (2 Mäher)' }).click()
  return setup
}

test('two players mow a lawn with WASD and the arrow keys', async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, 'phones play with one mower and the direction pad')
  const setup = await startGame(page, 2, testInfo)
  await shot(page, testInfo, 'lawn-mowing-setup')
  await setup.getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.getByTestId('steps-2')).toBeVisible()
  await shot(page, testInfo, 'lawn-mowing-start')

  const [one, two] = await cutterPositions(page)
  const mid = Math.floor((lawn1.bounds.minY + lawn1.bounds.maxY) / 2)
  const plan1 = stepsThrough(one!, sweep(lawn1.bounds.minY, mid))
  const plan2 = stepsThrough(two!, sweep(mid, lawn1.bounds.maxY))
  const keys1: Record<Dir, string> = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }
  const keys2: Record<Dir, string> = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
  }
  for (let i = 0; i < Math.max(plan1.length, plan2.length); i++) {
    if (plan1[i]) await page.keyboard.press(keys1[plan1[i]!], { delay: 15 })
    if (plan2[i]) await page.keyboard.press(keys2[plan2[i]!], { delay: 15 })
    if (i === 30) await shot(page, testInfo, 'lawn-mowing-playing')
  }
  await expect(page.getByTestId('mowed-percent')).toHaveText(/^100 %/)
  await shot(page, testInfo, 'lawn-mowing-mowed')

  // Feierabend: both drive home, the round ends.
  await page.keyboard.press('Space')
  const result = page.getByRole('dialog', { name: 'Feierabend!' })
  await expect(result).toBeVisible({ timeout: 15_000 })
  await expect(result.getByText(/^Längste Runde: \d+ Schritte/)).toBeVisible()
  await shot(page, testInfo, 'lawn-mowing-result')
  await result.getByRole('button', { name: 'Theorie' }).click()
  await expect(page.getByRole('complementary', { name: 'Theorie' })).toBeVisible()
  await expect(page.getByText('Eine echte Wettbewerbsaufgabe')).toBeVisible()
  await shot(page, testInfo, 'lawn-mowing-theory')
})

test('one player mows a lawn with the direction pad', async ({ page, isMobile }, testInfo) => {
  test.skip(!isMobile, 'the direction pad is for phones')
  const setup = await startGame(page, 1, testInfo)
  await expect(setup.getByText('Auf dem Handy mähst du mit einem Mäher.')).toBeVisible()
  await shot(page, testInfo, 'lawn-mowing-setup')
  await setup.getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.getByTestId('pad-up')).toBeVisible()
  await shot(page, testInfo, 'lawn-mowing-start')

  const [start] = await cutterPositions(page)
  const plan = stepsThrough(start!, sweep(lawn1.bounds.minY, lawn1.bounds.maxY))
  for (const [i, d] of plan.entries()) {
    const pad = page.getByTestId(`pad-${await screenDir(page, d)}`)
    const ev = (buttons: number) => ({
      pointerId: 5,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons,
      bubbles: true,
    })
    await pad.dispatchEvent('pointerdown', ev(1))
    await pad.dispatchEvent('pointerup', ev(0))
    if (i === 40) await shot(page, testInfo, 'lawn-mowing-playing')
  }
  await expect(page.getByTestId('mowed-percent')).toHaveText(/^100 %/)
  await page.getByRole('button', { name: /Feierabend/ }).click()
  const result = page.getByRole('dialog', { name: 'Feierabend!' })
  await expect(result).toBeVisible({ timeout: 15_000 })
  await shot(page, testInfo, 'lawn-mowing-result')
})
