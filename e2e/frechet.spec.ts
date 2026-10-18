import { expect, test, type Page } from '@playwright/test'
import { walkById, type WalkId } from '../src/core/games/frechet/levels'
import { advice, makeCourse, startState } from '../src/core/games/frechet/rules'
import { de } from '../src/ui/games/frechet/i18n.de'
import { expectHeaderLaidOut, freshDevice, shot } from './helpers'

freshDevice()

/**
 * Walks the first walk like a careful player: about every 80 ms read where person and dog are (the
 * park's data-walk attribute) and hold what the game's own hint advises. Keys on a laptop; on a phone
 * the two hold buttons, each with its own touch point.
 */
async function walkToTheCastle(
  page: Page,
  touch: boolean,
  until: (s: number, t: number) => boolean,
  id: WalkId = 'avenue',
) {
  const course = makeCourse(walkById(id))
  const keys = { person: 'KeyA', dog: 'KeyL' } as const
  const ids = { person: 11, dog: 12 } as const
  const now = { person: false, dog: false }
  const set = async (who: 'person' | 'dog', down: boolean) => {
    if (now[who] === down) return
    now[who] = down
    if (!touch) {
      await (down ? page.keyboard.down(keys[who]) : page.keyboard.up(keys[who]))
      return
    }
    await page.getByTestId(`hold-${who}`).dispatchEvent(down ? 'pointerdown' : 'pointerup', {
      pointerId: ids[who],
      pointerType: 'touch',
      isPrimary: who === 'person',
      button: 0,
      buttons: down ? 1 : 0,
      bubbles: true,
    })
  }
  for (let i = 0; i < 3000; i++) {
    const [s, t] = (await page.getByTestId('park').getAttribute('data-walk'))!.split(',').map(Number) as [
      number,
      number,
    ]
    if (until(s, t) || (s >= course.person.length - 1e-3 && t >= course.dog.length - 1e-3)) break
    const a = advice(course, { ...startState(course), s, t })
    expect(a, `a way on from ${s}, ${t}`).not.toBeNull()
    await set('person', a !== 'dog')
    await set('dog', a !== 'person')
    await page.waitForTimeout(80)
  }
  await set('person', false)
  await set('dog', false)
}

test('walks the dog to the castle: keys on a laptop, hold buttons on a phone', async ({
  page,
  isMobile,
}, testInfo) => {
  test.setTimeout(120_000)
  await page.goto('./#/play/frechet')
  const howTo = page.getByRole('dialog', { name: "So geht's" })
  await expect(howTo).toBeVisible()
  await shot(page, testInfo, 'frechet-howto')
  await howTo.getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.getByTestId('leash')).toContainText('von 3,6 m Leine')
  if (!isMobile) await expectHeaderLaidOut(page)
  await shot(page, testInfo, 'frechet-start')

  // Half way: a screenshot of the walk under way.
  await walkToTheCastle(page, isMobile, (s) => s > 15)
  await shot(page, testInfo, 'frechet-walking')
  await walkToTheCastle(page, isMobile, () => false)

  const result = page.getByRole('dialog', { name: 'Geschafft!' })
  await expect(result).toBeVisible({ timeout: 10_000 })
  await expect(result.getByText(/kürzeste möglich: 2,2 m/)).toBeVisible()
  await expect(result.getByTestId('diagram-player')).toBeVisible()
  await shot(page, testInfo, 'frechet-result')
  await result.getByRole('button', { name: 'Theorie' }).click()

  // The theory view: the free-space diagram with the walk; pointing at it shows the positions.
  const theory = page.getByRole('complementary', { name: 'Theorie' })
  await expect(theory.getByText('Kürzeste Leine, mit der es geht: 2,2 m')).toBeVisible()
  await expect(theory.getByTestId('theory-verdict')).toHaveText(/führt ein Weg/)
  const diagram = theory.getByRole('img', { name: 'Diagramm der Stellungen von Mensch und Hund' })
  const box = (await diagram.boundingBox())!
  if (!isMobile) await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.6)
  await shot(page, testInfo, 'frechet-theory')
})

test('Kürzere Leine: after a walk, the same walk with a shorter leash', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough for this check')
  test.setTimeout(120_000)
  await page.goto('./#/play/frechet')
  await page.getByRole('dialog', { name: "So geht's" }).getByRole('button', { name: "Los geht's!" }).click()
  await walkToTheCastle(page, false, () => false)
  const result = page.getByRole('dialog', { name: 'Geschafft!' })
  await expect(result.getByText('Geschafft mit 3,6 m – traust du dich mit 3,3 m?')).toBeVisible({
    timeout: 10_000,
  })
  await result.getByTestId('shorter-leash').click()
  await expect(page.getByTestId('leash')).toContainText('von 3,3 m Leine')
})

test('Schätz die Leine: the computer tries a leash, then the answer', async ({ page }, testInfo) => {
  await page.goto('./#/play/frechet')
  await page.getByRole('button', { name: "Los geht's!" }).click()
  await page.getByRole('button', { name: 'Spaziergänge' }).click()
  await page
    .getByRole('dialog', { name: 'Spaziergänge' })
    .getByRole('button', { name: 'Schätz die Leine' })
    .click()
  await page.getByRole('button', { name: "Los geht's!" }).click()
  const slider = page.getByLabel(/Deine Leine/)
  await slider.fill('3')
  await page.getByRole('button', { name: 'Probieren' }).click()
  await expect(page.getByTestId('guess-message')).toHaveText(/3,0 m reicht/, { timeout: 10_000 })
  await slider.fill('1.5')
  await page.getByRole('button', { name: 'Probieren' }).click()
  await expect(page.getByTestId('guess-message')).toHaveText(/1,5 m ist zu kurz/, { timeout: 10_000 })
  await shot(page, testInfo, 'frechet-guess')
  await page.getByRole('button', { name: 'Auflösen' }).click()
  const result = page.getByRole('dialog', { name: 'Geschafft!' })
  await expect(result.getByText(/Deine kürzeste Leine, die reichte: 3,0 m/)).toBeVisible()
})

test('sandbox: draw two paths and see their diagram', async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, 'drawing with the mouse')
  await page.goto('./#/play/frechet')
  await page.getByRole('button', { name: "Los geht's!" }).click()
  await page.getByRole('button', { name: 'Theorie' }).click()
  await page.getByRole('button', { name: 'Eigene Wege zeichnen' }).click()
  const layer = page.getByTestId('draw-layer')
  const box = (await layer.boundingBox())!
  const draw = async (points: [number, number][]) => {
    const at = ([fx, fy]: [number, number]) => [box.x + fx * box.width, box.y + fy * box.height] as const
    await page.mouse.move(...at(points[0]!))
    await page.mouse.down()
    for (const p of points.slice(1)) await page.mouse.move(...at(p), { steps: 8 })
    await page.mouse.up()
  }
  await draw([
    [0.1, 0.8],
    [0.4, 0.5],
    [0.6, 0.6],
    [0.9, 0.2],
  ])
  await expect(page.getByText('Jetzt den Weg des Hundes')).toBeVisible()
  await draw([
    [0.12, 0.85],
    [0.3, 0.3],
    [0.5, 0.75],
    [0.9, 0.25],
  ])
  await expect(page.getByRole('complementary', { name: 'Theorie' })).toBeVisible()
  await expect(page.getByText(/Kürzeste Leine, mit der es geht/)).toBeVisible()
  await shot(page, testInfo, 'frechet-sandbox')
  await page.getByRole('button', { name: 'Ausprobieren' }).click()
  await expect(page.getByTestId('leash')).toBeVisible()
})

test('a walk of "Mittel": picked by its tier, and a careful player gets to the castle', async ({
  page,
  isMobile,
}, testInfo) => {
  test.setTimeout(180_000)
  await page.goto('./#/play/frechet')
  await page.getByRole('button', { name: "Los geht's!" }).click()
  await page.getByRole('button', { name: 'Spaziergänge' }).click()
  const picker = page.getByRole('dialog', { name: 'Spaziergänge' })
  await picker.getByRole('button', { name: 'Mittel', exact: true }).click()
  await expect(picker.getByText(/Einfach mitlaufen klappt hier nicht/)).toBeVisible()
  await shot(page, testInfo, 'frechet-picker-medium')
  await picker.getByRole('button', { name: new RegExp(de.walks.m1) }).click()
  const course = makeCourse(walkById('m1'))
  await expect(page.getByTestId('leash')).toContainText(
    `von ${course.leash.toFixed(1).replace('.', ',')} m Leine`,
  )
  if (!isMobile) {
    await expect(page.getByText(`Schlosspark · Mittel · ${de.walks.m1} · 1 von 4`)).toBeVisible()
    await expectHeaderLaidOut(page)
  }
  await walkToTheCastle(page, isMobile, (s) => s > course.person.length / 2, 'm1')
  await shot(page, testInfo, 'frechet-medium-walking')
  await walkToTheCastle(page, isMobile, () => false, 'm1')
  await expect(page.getByRole('dialog', { name: 'Geschafft!' })).toBeVisible({ timeout: 10_000 })
})
