import { readFileSync } from 'node:fs'
import { expect, test, type Page, type TestInfo } from './fixtures'
import { chooseTier, expectHeaderLaidOut, freshDevice, shot } from './helpers'

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

/** Starts "Leicht" alone or together, then opens "Neu" (the setup with every lawn) on the same lawn. */
async function startGame(page: Page, players: 1 | 2, testInfo: TestInfo) {
  await page.goto('./#/play/lawn-mowing')
  const tiers = page.getByTestId('tier-screen')
  await expect(tiers).toContainText('Mähe den ganzen Rasen!')
  // The mower may hang over the edge: said in the rules, and the how-to's last strip does.
  await expect(tiers).toContainText('Er darf über den Rand hinausragen und über Steinplatten fahren')
  await expect(tiers.getByRole('img', { name: /der letzte Streifen ragt über den Rand/ })).toBeVisible()
  if (players === 2) await tiers.getByRole('button', { name: 'Zu zweit (2 Mäher)' }).click()
  await shot(page, testInfo, 'lawn-mowing-tiers')
  await chooseTier(page, 'Leicht')
  await expect(page.locator('header')).toContainText('Rasen 1')
  await page.locator('header').getByRole('button', { name: 'Neu' }).click()
  const setup = page.getByRole('dialog', { name: 'Neues Spiel' })
  await expect(setup).toBeVisible()
  await expect(
    setup.getByRole('region', { name: 'Leicht' }).getByRole('button', { name: /Vorgarten/ }),
  ).toHaveAttribute('aria-pressed', 'true')
  return setup
}

test('two players mow a lawn with WASD and the arrow keys', async ({ page, phone }, testInfo) => {
  test.skip(phone, 'phones play with one mower and the direction pad')
  const setup = await startGame(page, 2, testInfo)
  await shot(page, testInfo, 'lawn-mowing-setup')
  await setup.getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.getByTestId('steps-2')).toBeVisible()
  await expectHeaderLaidOut(page)
  // The score card: the longer of the two rounds, and the computer's.
  await expect(page.getByTestId('longest')).toHaveText(/^Längerer Mäher:\d+ SchritteComputer: 56 Schritte$/)
  // The holes of the lawn (a terrace and a small square) are stone slabs, 16 cells.
  await expect(page.getByTestId('slabs').locator('rect[rx]')).toHaveCount(16)
  await shot(page, testInfo, 'lawn-mowing-start')

  // A step and a step back with each mower's undo key (Q, Backspace): the steps go down again.
  const percent = await page.getByTestId('mowed-percent').textContent()
  for (const [i, step, back] of [
    [1, 'KeyD', 'KeyQ'],
    [2, 'ArrowLeft', 'Backspace'],
  ] as const) {
    await page.keyboard.press(step)
    await expect(page.getByTestId(`steps-${i}`).locator('strong')).toHaveText('1 Schritt')
    await page.keyboard.press(back)
    await expect(page.getByTestId(`steps-${i}`).locator('strong')).toHaveText('0 Schritte')
  }
  await expect(page.getByTestId('mowed-percent')).toHaveText(percent!)
  // And with the mouse: each card's button "Zurück" with its key, disabled before the first step.
  for (const [i, step, key] of [
    [1, 'KeyD', 'Q'],
    [2, 'ArrowLeft', 'Rücktaste'],
  ] as const) {
    const back = page.getByTestId(`undo-${i}`)
    await expect(back).toHaveText(`Zurück${key}`)
    await expect(back).toBeDisabled()
    await page.keyboard.press(step)
    await back.click()
    await expect(page.getByTestId(`steps-${i}`).locator('strong')).toHaveText('0 Schritte')
    await expect(back).toBeDisabled()
  }
  await expect(page.getByTestId('mowed-percent')).toHaveText(percent!)

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
  // The explanation keeps this lawn's numbers and plays the computer's tours on an example lawn.
  await expect(
    result.getByText(/mindestens 48 Schritte\. Eure längere Runde hatte \d+, der Computer 56\./),
  ).toBeVisible()
  await expect(
    result.getByText('Beispiel – ein kleiner Rasen: So mäht der Computer mit zwei Mähern, 26 Schritte.'),
  ).toBeVisible()
  await expect(
    result.getByRole('img', { name: /^Beispiel: die Runden des Computers mit zwei Mähern/ }),
  ).toBeVisible()
  await shot(page, testInfo, 'lawn-mowing-result')
  await result.getByRole('button', { name: 'Theorie' }).click()
  await expect(page.getByRole('complementary', { name: 'Theorie' })).toBeVisible()
  await expect(page.getByText('Eine echte Wettbewerbsaufgabe')).toBeVisible()
  await shot(page, testInfo, 'lawn-mowing-theory')
})

test('one player mows a lawn with the direction pad', async ({ page, phone }, testInfo) => {
  test.skip(!phone, 'the direction pad is for phones')
  const setup = await startGame(page, 1, testInfo)
  await expect(setup.getByText('Auf dem Handy mähst du mit einem Mäher.')).toBeVisible()
  await shot(page, testInfo, 'lawn-mowing-setup')
  await setup.getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.getByTestId('pad-up')).toBeVisible()
  // The computer's steps beside the mower's, inside the screen.
  const stats = page.getByTestId('steps-1')
  await expect(stats).toContainText('Computer: 110 Schritte')
  const box = (await stats.getByText('Computer: 110 Schritte').boundingBox())!
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  await shot(page, testInfo, 'lawn-mowing-start')

  const [start] = await cutterPositions(page)
  const plan = stepsThrough(start!, sweep(lawn1.bounds.minY, lawn1.bounds.maxY))
  const ev = (buttons: number) => ({
    pointerId: 5,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    buttons,
    bubbles: true,
  })
  // The middle of the pad takes the last step back.
  await page.getByTestId(`pad-${await screenDir(page, 'right')}`).dispatchEvent('pointerdown', ev(1))
  await page.getByTestId(`pad-${await screenDir(page, 'right')}`).dispatchEvent('pointerup', ev(0))
  await expect(page.getByTestId('steps-1').locator('strong')).toHaveText('1 Schritt')
  await page.getByTestId('pad-undo').dispatchEvent('pointerdown', ev(1))
  await expect(page.getByTestId('steps-1').locator('strong')).toHaveText('0 Schritte')
  for (const [i, d] of plan.entries()) {
    const pad = page.getByTestId(`pad-${await screenDir(page, d)}`)
    await pad.dispatchEvent('pointerdown', ev(1))
    await pad.dispatchEvent('pointerup', ev(0))
    if (i === 40) await shot(page, testInfo, 'lawn-mowing-playing')
  }
  await expect(page.getByTestId('mowed-percent')).toHaveText(/^100 %/)
  await page.getByRole('button', { name: /Feierabend/ }).click()
  const result = page.getByRole('dialog', { name: 'Feierabend!' })
  await expect(result).toBeVisible({ timeout: 15_000 })
  await expect(
    result.getByText(/mindestens 100 Schritte\. Du hast \d+ gebraucht, der Computer 110\./),
  ).toBeVisible()
  await expect(
    result.getByText('Beispiel – ein kleiner Rasen: So mäht der Computer mit einem Mäher, 46 Schritte.'),
  ).toBeVisible()
  await shot(page, testInfo, 'lawn-mowing-result')
})

test('alone on the laptop: "Bisher" and the computer on the score card, every card on the screen', async ({
  page,
  phone,
}) => {
  test.skip(phone, 'phones show the steps beside the direction pad')
  await page.goto('./#/play/lawn-mowing')
  await chooseTier(page, 'Leicht')
  await expect(page.getByTestId('longest')).toHaveText('Bisher:0 SchritteComputer: 110 Schritte')
  await page.keyboard.press('KeyD')
  await expect(page.getByTestId('longest')).toHaveText('Bisher:2 SchritteComputer: 110 Schritte')
  for (const card of await page.locator('footer > *').all()) {
    const box = (await card.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(1280)
  }
})
