import { expect, test, type Page, type TestInfo } from './fixtures'
import { woodsById } from '../src/core/games/frechet/woods/levels'
import { makeWoodsCourse, ropeAt, woodsAdvice, woodsStart } from '../src/core/games/frechet/woods/rules'
import type { WoodsId } from '../src/core/games/frechet/woods/shapes'
import { expectHeaderLaidOut, freshDevice, shot, startGame } from './helpers'

freshDevice()

type Who = 'person' | 'dog'

/** Holds keys on a laptop, the hold buttons (each with its own touch point) on a phone. */
function controls(page: Page, touch: boolean) {
  const keys = { person: 'KeyA', dog: 'KeyL' } as const
  const ids = { person: 11, dog: 12 } as const
  const now = { person: false, dog: false }
  return async (who: Who, down: boolean) => {
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
}

const position = async (page: Page) =>
  (await page.getByTestId('park').getAttribute('data-walk'))!.split(',').map(Number) as [number, number]

/** Walks a woods walk like a careful player: every 80 ms read the positions and hold what the hint advises. */
async function walkThroughTheWoods(
  page: Page,
  id: WoodsId,
  touch: boolean,
  until: (s: number, t: number) => boolean,
) {
  const course = makeWoodsCourse(woodsById(id))
  const set = controls(page, touch)
  for (let i = 0; i < 1500; i++) {
    const [s, t] = await position(page)
    if (until(s, t) || (s >= course.person.length - 1e-3 && t >= course.dog.length - 1e-3)) break
    // The rope depends only on the positions, so the test can rebuild the game's state from them.
    const a = woodsAdvice(course, { ...woodsStart(course), s, t, rope: ropeAt(course, s, t) })
    expect(a, `a way on from ${s}, ${t}`).not.toBeNull()
    await set('person', a !== 'dog')
    await set('dog', a !== 'person')
    await page.waitForTimeout(80)
  }
  await set('person', false)
  await set('dog', false)
}

async function openWoods(page: Page, name: string, testInfo?: TestInfo) {
  await startGame(page, 'frechet')
  await page.getByRole('button', { name: 'Spaziergänge' }).click()
  const woods = page.getByRole('dialog', { name: 'Spaziergänge' }).getByRole('region', { name: 'Im Wald' })
  await woods.scrollIntoViewIfNeeded()
  if (testInfo) await shot(page, testInfo, 'frechet-woods-picker')
  await woods.getByRole('button', { name: new RegExp(name) }).click()
}

test('walks round the oak in the woods: keys on a laptop, hold buttons on a phone', async ({
  page,
  phone,
}, testInfo) => {
  test.setTimeout(150_000)
  await openWoods(page, 'Um die Eiche', testInfo)
  const howTo = page.getByRole('dialog', { name: "So geht's" })
  await expect(howTo.getByText(/bleibt die Leine an den Baumstämmen hängen/)).toBeVisible()
  await shot(page, testInfo, 'frechet-woods-howto')
  await howTo.getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.getByTestId('leash')).toContainText('von 2,7 m Leine')
  if (!phone) {
    await expect(page.getByText('Im Wald · Um die Eiche · Spaziergang 1 von 4')).toBeVisible()
    await expectHeaderLaidOut(page)
  }
  await shot(page, testInfo, 'frechet-woods-start')

  // In the middle of the loop round the oak.
  await walkThroughTheWoods(page, 'oak', phone, (s) => s > 26)
  await shot(page, testInfo, 'frechet-woods-walking')
  await walkThroughTheWoods(page, 'oak', phone, () => false)

  const result = page.getByRole('dialog', { name: 'Geschafft!' })
  await expect(result).toBeVisible({ timeout: 10_000 })
  await expect(result.getByText(/kürzeste möglich: 2,0 m \(ohne Bäume: 2,0 m\)/)).toBeVisible()
  await expect(result.getByText(/homotoper Fréchet-Abstand/)).toBeVisible()
  await expect(result.getByTestId('diagram-player')).toBeVisible()
  await shot(page, testInfo, 'frechet-woods-result')
  await result.getByRole('button', { name: 'Theorie' }).click()

  const theory = page.getByRole('complementary', { name: 'Theorie' })
  await expect(theory.getByText('Kürzeste Leine im Wald: 2,0 m')).toBeVisible()
  await expect(theory.getByTestId('theory-verdict')).toHaveText(/führt ein Weg/)
  const diagram = theory.getByRole('img', { name: 'Diagramm der Stellungen von Mensch und Hund' })
  const box = (await diagram.boundingBox())!
  if (!phone) await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.45)
  await shot(page, testInfo, 'frechet-woods-theory')
})

test('behind the beech: the leash catches on the trunk when the dog runs ahead', async ({
  page,
  phone,
}, testInfo) => {
  test.skip(phone, 'one project is enough for this check')
  test.setTimeout(90_000)
  await openWoods(page, 'Hinterm Baum')
  await page.getByRole('dialog', { name: "So geht's" }).getByRole('button', { name: "Los geht's!" }).click()
  await expect(page.getByTestId('leash')).toContainText('von 6,1 m Leine')
  // Both walk to the beech, then the dog alone fetches the stick behind it: the leash winds round the trunk.
  const set = controls(page, false)
  await set('person', true)
  await set('dog', true)
  // A slow browser walks in slow motion (a frame counts at most 50 ms): give it time (WebKit in CI).
  await expect.poll(async () => (await position(page))[1], { timeout: 40_000 }).toBeGreaterThan(16)
  await set('person', false)
  await expect(page.getByTestId('park')).toHaveAttribute('data-caught', 'true', { timeout: 10_000 })
  await expect(page.locator('[data-touched]')).toHaveCount(1)
  await set('dog', false)
  await shot(page, testInfo, 'frechet-woods-caught')
  // In the theory view the diagram can be switched to the same paths without trees.
  await page.getByRole('button', { name: 'Theorie' }).click()
  const theory = page.getByRole('complementary', { name: 'Theorie' })
  await expect(theory.getByText('Ohne Bäume reichten 3,8 m.')).toBeVisible()
  await theory.getByRole('button', { name: 'Ohne Bäume' }).click()
  await expect(theory.getByRole('button', { name: 'Ohne Bäume' })).toHaveAttribute('aria-pressed', 'true')
  await shot(page, testInfo, 'frechet-woods-without-trees')
})
