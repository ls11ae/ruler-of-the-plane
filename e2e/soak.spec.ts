import { expect, test, type Page } from '@playwright/test'
import { chooseTier, freshDevice, shot } from './helpers'
import { serveTspBoards, tspBoardsAddress } from './tsp-boards'

freshDevice()

/**
 * The booth left alone: kiosk mode on the attract screen for a long time, with a fake clock that runs
 * much faster than real time (the computer's moves still take their real time in the worker). Every so
 * often a visitor wakes the booth, opens a place on the map, plays a little and walks away; 90 s later
 * the attract screen must be back. The run fails on any page error, on a demo that stops moving, on a
 * kiosk that does not come back, and on memory or DOM nodes that keep growing.
 *
 * `SOAK_MINUTES` sets the simulated time (default 15, about two minutes in CI). The Phase 6 acceptance run,
 * about 15 minutes, with Rundreise served from a real tsp-boards build (see `tsp-boards.ts`):
 * `VITE_TSP_BOARDS_URL=/tsp-boards/ npm run build`, then
 * `SOAK_MINUTES=120 TSP_BOARDS_DIST=<tsp-boards>/dist npx playwright test soak --project=laptop`.
 */
const MINUTES = Number(process.env.SOAK_MINUTES ?? 15)
/** A visitor comes every so many simulated minutes. */
const VISITOR_EVERY = 7
/** The demo must move on (a step of its story, or the next game) at least this often, in simulated seconds. */
const STUCK_AFTER_S = 60

test.skip(({ isMobile }) => isMobile, 'the booth runs on laptops')
test.setTimeout(Math.max(10, MINUTES * 0.5) * 60_000)

interface Sample {
  minute: number
  heapMB: number
  nodes: number
  listeners: number
}

/** A visitor: wakes the booth, opens the n-th place, does one thing there, and leaves. */
async function visit(page: Page, n: number) {
  const attract = page.getByRole('dialog', { name: 'Ruler of the Plane' })
  await attract.click()
  await expect(attract).toHaveCount(0)
  const places = [
    'Licht ins Verlies',
    'Erobere das Land',
    'Gassi gehen',
    'Rasenmähen',
    'Straßenbau',
    'Mitwirkende',
  ]
  const tsp = page.getByRole('link', { name: /Rundreise/ })
  if (await tsp.count()) places.push('Rundreise')
  const place = places[n % places.length]!
  await page.getByRole('link', { name: new RegExp(place) }).click()
  await expect(page.locator('header h1')).toBeVisible({ timeout: 15_000 })
  // A game opens on its tier screen: one tier after the other, visitor by visitor.
  const tiers = page.getByTestId('tier-screen')
  if (await tiers.count()) await chooseTier(page, ['Leicht', 'Mittel', 'Schwer'][Math.floor(n / 6) % 3])
  // Through a "So geht's" of a harder set, if the game shows one.
  const go = page.getByRole('button', { name: "Los geht's!" })
  if (await go.count()) await go.first().click()
  // One click into the middle of the screen and a key, as a curious visitor would.
  const size = page.viewportSize()!
  await page.mouse.click(size.width / 2, size.height / 2 + 40)
  await page.keyboard.press('KeyA')
  return place
}

async function measure(page: Page, minute: number): Promise<Sample> {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('HeapProfiler.collectGarbage')
  const heap = await cdp.send('Runtime.getHeapUsage')
  const dom = await cdp.send('Memory.getDOMCounters')
  await cdp.detach()
  return {
    minute,
    heapMB: Math.round((heap.usedSize / 2 ** 20) * 10) / 10,
    nodes: dom.nodes,
    listeners: dom.jsEventListeners,
  }
}

test(`the attract mode runs unattended for ${MINUTES} simulated minutes`, async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`page error: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  page.on('crash', () => errors.push('the page crashed'))

  // Rundreise, if the build has it, with tsp-boards served as in tsp-frame.spec.ts.
  const tsp = await tspBoardsAddress(page)
  if (tsp) await serveTspBoards(page.context(), tsp)

  await page.clock.install()
  await page.goto('./?kiosk')
  const attract = page.getByRole('dialog', { name: 'Ruler of the Plane' })
  await expect(attract).toBeVisible()

  // What the demo shows: which game's demo (a new one every 20–30 s) and how far it is (`data-step`).
  const demoState = () =>
    page.evaluate(() => {
      const stage = document.querySelector('[role="dialog"] [data-demo]')
      const step = stage?.querySelector('[data-step]')?.getAttribute('data-step') ?? ''
      return {
        game: stage?.getAttribute('data-demo') ?? '',
        state: `${stage?.getAttribute('data-slot')}:${step}`,
      }
    })

  const samples: Sample[] = []
  const visits: string[] = []
  let lastState = ''
  const demos = new Set<string>()
  let lastChange = 0
  let changes = 0
  let idleSince = 0
  let visitor = 0
  for (let s = 0; s < MINUTES * 60; s++) {
    await page.clock.runFor(1000)
    // Real time for the worker's answer (a move takes a few to some tens of milliseconds).
    await page.waitForTimeout(15)

    if (await attract.count()) {
      const { game, state } = await demoState()
      demos.add(game)
      if (state !== lastState) {
        lastState = state
        lastChange = s
        changes++
      }
      expect(s - lastChange, `the demo stood still from ${lastChange} s on`).toBeLessThan(STUCK_AFTER_S)
    } else {
      // A visitor walked away: the kiosk timeout (90 s) brings the attract screen back. Meanwhile the
      // demo is not shown, so it cannot stand still.
      expect(s - idleSince, 'the attract screen did not come back').toBeLessThan(95)
      lastChange = s
    }

    if (s > 0 && s % (VISITOR_EVERY * 60) === 0 && (await attract.count())) {
      visits.push(await visit(page, visitor++))
      idleSince = s
      lastChange = s
    }
    if (s % 600 === 0 && (await attract.count())) samples.push(await measure(page, s / 60))
    expect(errors).toEqual([])
  }
  samples.push(await measure(page, MINUTES))
  await shot(page, testInfo, 'soak-end')

  const summary = { minutes: MINUTES, demoChanges: changes, demos: [...demos], visits, samples }
  console.log(JSON.stringify(summary))
  await testInfo.attach('soak.json', {
    body: JSON.stringify(summary, null, 2),
    contentType: 'application/json',
  })

  // Every game's demo had its turn.
  expect([...demos].sort()).toEqual(['art-gallery', 'frechet', 'lawn-mowing', 'roads', 'voronoi'])
  // Nothing piles up: compare the end with the first sample after warming up (one round of visits).
  // At least a change of the demo every 30 s on average (several a second while one plays).
  expect(changes).toBeGreaterThan(MINUTES * 2)
  const warm = samples.find((x) => x.minute >= Math.min(MINUTES / 2, VISITOR_EVERY * 6)) ?? samples[0]!
  const end = samples.at(-1)!
  expect(end.heapMB, 'JavaScript heap').toBeLessThan(warm.heapMB * 1.5 + 10)
  expect(end.nodes, 'DOM nodes').toBeLessThan(warm.nodes * 1.5 + 2000)
  expect(end.listeners, 'event listeners').toBeLessThan(warm.listeners * 1.5 + 200)
})
