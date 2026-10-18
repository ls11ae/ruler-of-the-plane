import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { isOnFloor } from '../src/core/games/art-gallery/dungeon'
import { woodsById } from '../src/core/games/frechet/woods/levels'
import { makeWoodsCourse, ropeAt, woodsAdvice, woodsStart } from '../src/core/games/frechet/woods/rules'
import { mapOf } from '../src/core/games/roads/levels'
import { prepareMap } from '../src/core/games/voronoi/map'
import { minDistance, placementProblem, type Castle } from '../src/core/games/voronoi/rules'
import { serveAi } from '../src/core/games/voronoi/service'
import { kruskal } from '../src/core/games/roads/mst'
import type { ArtGalleryLevel, KingsTaxesLevel, VoronoiLevel } from '../src/core/levels/schema'
import { woodsDe } from '../src/ui/games/frechet/woods/i18n.de'
import { expect, test, type Page } from './fixtures'
import { startGame } from './helpers'

/**
 * Frame times of the heaviest scenes under Chromium's CPU throttling (a stand-in for weak booth laptops),
 * printed as a table. Opt-in, since the numbers depend on the machine:
 * `npm run build && BENCH=1 npx playwright test bench --project=laptop --workers=1`
 * (`BENCH_RATES=1,4,6` sets the throttling rates, `BENCH_TRACE_DIR=<dir>` keeps the traces,
 * `BENCH_PROFILE=<file>` saves a CPU profile of the torch drag, and `BENCH_DIST=<dir>` names the build that
 * an already running `vite preview` serves, e.g. an older version to compare with).
 *
 * Two numbers per scene. "fps" is what this machine shows; in a cloud session or CI there is no GPU, so
 * Chromium rasterises in software, which CPU throttling does not slow down, and which a laptop's GPU does
 * much faster. "main" is the main thread's work per frame (scripts, style, layout, paint recording, but
 * not the wait for the rasteriser), which throttling slows down as a slow CPU would: under 33 ms it
 * leaves room for 30 frames per second.
 */
const RATES = (process.env.BENCH_RATES ?? '1,4,6').split(',').map(Number)

test.skip(({ phone }) => phone, 'laptops (phones are measured by hand)')
test.skip(!process.env.BENCH, 'set BENCH=1 to run the benchmarks')
test.setTimeout(4 * 60_000)

type Pt = { x: number; y: number }

interface Measured {
  frames: number
  fps: number
  median: number
  p95: number
  worst: number
  /** Main-thread work per frame (ms), without waiting for the rasteriser. */
  main: number
}

const rows: string[] = []
const fmt = (v: number, w: number) => v.toFixed(0).padStart(w)
function report(scene: string, rate: number, m: Measured, extra = '') {
  const row =
    `${scene.padEnd(40)} ${`${rate}×`.padStart(3)}  ${fmt(m.fps, 3)} fps  frame median ${fmt(m.median, 3)} ms` +
    `  p95 ${fmt(m.p95, 3)} ms  worst ${fmt(m.worst, 4)} ms  main ${fmt(m.main, 3)} ms/frame${extra}`
  rows.push(row)
  console.log(row)
}
test.afterAll(() => {
  if (rows.length) console.log(`\nFrame times under CPU throttling:\n${rows.join('\n')}`)
})

async function throttle(page: Page, rate: number) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
}

const seed = (page: Page, state: Record<string, unknown>) =>
  page.addInitScript((state) => {
    for (const [key, value] of Object.entries(state)) localStorage.setItem(key, JSON.stringify(value))
  }, state)

/** Starts a light trace (main-thread tasks and the waits for the compositor) and a frame recorder. */
async function startMeasure(page: Page) {
  await page
    .context()
    .browser()!
    .startTracing(page, { categories: ['toplevel', 'devtools.timeline', 'cc'] })
  await page.evaluate(() => {
    const w = window as unknown as { benchFrames: number[]; benchOn: boolean }
    w.benchFrames = []
    w.benchOn = true
    requestAnimationFrame(function loop(t) {
      w.benchFrames.push(t)
      if (w.benchOn) requestAnimationFrame(loop)
    })
  })
}

interface TraceEvent {
  ph: string
  name: string
  pid: number
  tid: number
  ts: number
  dur?: number
  args?: { name?: string }
}

async function stopMeasure(page: Page, name: string): Promise<Measured> {
  const times = await page.evaluate(() => {
    const w = window as unknown as { benchFrames: number[]; benchOn: boolean }
    w.benchOn = false
    return w.benchFrames
  })
  const buffer = await page.context().browser()!.stopTracing()
  if (process.env.BENCH_TRACE_DIR) writeFileSync(`${process.env.BENCH_TRACE_DIR}/${name}.json`, buffer)
  const events = (JSON.parse(buffer.toString()) as { traceEvents: TraceEvent[] }).traceEvents
  // The page's main thread: the renderer main thread that ran the most animation frames.
  const threadName = new Map<string, string>()
  for (const e of events) {
    if (e.ph === 'M' && e.name === 'thread_name') threadName.set(`${e.pid}:${e.tid}`, e.args?.name ?? '')
  }
  const frameCount = new Map<string, number>()
  for (const e of events) {
    const key = `${e.pid}:${e.tid}`
    if (e.name === 'FireAnimationFrame' && threadName.get(key) === 'CrRendererMain') {
      frameCount.set(key, (frameCount.get(key) ?? 0) + 1)
    }
  }
  const main = [...frameCount].sort((a, b) => b[1] - a[1])[0]?.[0]
  let busy = 0
  let wait = 0
  let end = -Infinity
  for (const e of events
    .filter((e) => e.ph === 'X' && `${e.pid}:${e.tid}` === main)
    .sort((a, b) => a.ts - b.ts)) {
    if (e.name === 'LayerTreeHost::WaitForCommitCompletion') wait += e.dur ?? 0
    if (e.name === 'ThreadControllerImpl::RunTask' && e.ts >= end) {
      busy += e.dur ?? 0
      end = e.ts + (e.dur ?? 0)
    }
  }
  const frames = times.slice(1)
  const gaps = frames.slice(1).map((t, i) => t - frames[i]!)
  const sorted = [...gaps].sort((a, b) => a - b)
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0
  return {
    frames: gaps.length,
    fps: (gaps.length / (frames.at(-1)! - frames[0]!)) * 1000,
    median: at(0.5),
    p95: at(0.95),
    worst: at(1),
    main: (busy - wait) / 1000 / Math.max(1, gaps.length),
  }
}

/**
 * A drag as a mouse makes it: pointerdown on `selector`, then one pointermove per animation frame
 * through `path` (browsers deliver mouse moves once per frame), then pointerup.
 */
async function dragPerFrame(page: Page, selector: string, path: Pt[]) {
  await page.evaluate(
    ([selector, path]) =>
      new Promise<void>((resolve) => {
        const el = document.querySelector(selector)!
        const ev = (type: string, p: { x: number; y: number }, buttons: number) =>
          el.dispatchEvent(
            new PointerEvent(type, {
              pointerId: 9,
              pointerType: 'mouse',
              isPrimary: true,
              clientX: p.x,
              clientY: p.y,
              button: 0,
              buttons,
              bubbles: true,
            }),
          )
        ev('pointerdown', path[0]!, 1)
        let i = 1
        requestAnimationFrame(function step() {
          if (i < path.length) {
            ev('pointermove', path[i++]!, 1)
            requestAnimationFrame(step)
          } else {
            ev('pointerup', path.at(-1)!, 0)
            requestAnimationFrame(() => resolve())
          }
        })
      }),
    [selector, path] as const,
  )
}

/** A mouse moving over `selector` without a button, one pointer move per animation frame. */
async function hoverPerFrame(page: Page, selector: string, path: Pt[]) {
  await page.evaluate(
    ([selector, path]) =>
      new Promise<void>((resolve) => {
        const el = document.querySelector(selector)!
        let i = 0
        requestAnimationFrame(function step() {
          if (i < path.length) {
            const p = path[i++]!
            el.dispatchEvent(
              new PointerEvent('pointermove', {
                pointerId: 1,
                pointerType: 'mouse',
                isPrimary: true,
                clientX: p.x,
                clientY: p.y,
                bubbles: true,
              }),
            )
            requestAnimationFrame(step)
          } else resolve()
        })
      }),
    [selector, path] as const,
  )
}

/** Screen position of a point in level coordinates (through the board's transformation). */
async function toScreen(page: Page, x: number, y: number): Promise<Pt> {
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

/** Seeded random numbers (mulberry32), so every run does the same. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The computer's requests in a game of 10 castles each against "Schwer" (the player at random spots). */
function schwerGame(level: VoronoiLevel) {
  const map = prepareMap(level)
  const minDist = minDistance(map, 10)
  const rnd = random(5)
  const { minX, minY, maxX, maxY } = level.bounds
  const castles: Castle[] = []
  const requests = []
  for (let round = 0; round < 10; round++) {
    for (;;) {
      const p: [number, number] = [minX + rnd() * (maxX - minX), minY + rnd() * (maxY - minY)]
      if (placementProblem(map, castles, p, minDist) !== null) continue
      castles.push({ at: p, owner: 0 })
      break
    }
    const move = {
      castles: [...castles],
      player: 1 as const,
      minDist,
      opponentMovesLeft: round < 9,
      level: 'hard' as const,
    }
    requests.push({ level, move, seed: 100 + round })
    const answer = serveAi({ kind: 'move', id: 0, level, move, seed: 100 + round })
    if (answer.kind === 'move' && answer.at) castles.push({ at: answer.at, owner: 1 })
  }
  return requests
}

/** Every game opens on its tier screen; "Weiterspielen" enters the level or setup stored on the device. */
const resume = (page: Page) => page.getByRole('button', { name: /^Weiterspielen/ }).click()

const json = <T>(path: string) => JSON.parse(readFileSync(`public/levels/${path}.json`, 'utf8')) as T

for (const rate of RATES) {
  test(`Licht ins Verlies: drag a torch among 17 on the largest dungeon, ${rate}×`, async ({ page }) => {
    const level = json<ArtGalleryLevel>('art-gallery/agLevel14_17')
    await seed(page, {
      'rotp-art-gallery': { state: { level: 'agLevel14_17', best: {}, seenHowTo: true }, version: 1 },
    })
    await page.goto('./#/play/art-gallery')
    await resume(page)
    await expect(page.getByText('Fackeln: 0', { exact: true })).toBeVisible()
    // 17 torches at seeded random spots on the floor, at least 0.5 apart; the first one has a straight
    // corridor of 1.5 units to slide along (the floor is narrow: no circle of 0.3 units fits anywhere).
    const rnd = random(17)
    const { minX, minY, maxX, maxY } = level.bounds
    const clear = (a: [number, number], b: [number, number]) =>
      Array.from({ length: 31 }, (_, i) => i / 30).every((f) =>
        isOnFloor(level, [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])]),
      )
    const spots: [number, number][] = []
    let slide: [number, number] = [0, 0]
    for (let tries = 0; spots.length < 17; tries++) {
      expect(tries).toBeLessThan(100_000)
      const p: [number, number] = [minX + rnd() * (maxX - minX), minY + rnd() * (maxY - minY)]
      if (!isOnFloor(level, p) || spots.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.5)) continue
      if (spots.length === 0) {
        const a = rnd() * 2 * Math.PI
        slide = [p[0] + 1.5 * Math.cos(a), p[1] + 1.5 * Math.sin(a)]
        if (!clear(p, slide)) continue
      }
      spots.push(p)
    }
    for (const [x, y] of spots) {
      const p = await toScreen(page, x, y)
      await page.mouse.click(p.x, p.y)
    }
    await expect(page.getByText('Fackeln: 17', { exact: true })).toBeVisible()
    await page.mouse.move(0, 0)
    // Slide the first torch to the end of its corridor and back, three times, one move per frame.
    const from = await toScreen(page, ...spots[0]!)
    const to = await toScreen(page, ...slide)
    const path = Array.from({ length: 181 }, (_, i) => {
      const f = (1 - Math.cos((i / 60) * 2 * Math.PI)) / 2
      return { x: from.x + f * (to.x - from.x), y: from.y + f * (to.y - from.y) }
    })
    await throttle(page, rate)
    const cdp = process.env.BENCH_PROFILE ? await page.context().newCDPSession(page) : null
    if (cdp) {
      await cdp.send('Profiler.enable')
      await cdp.send('Profiler.start')
    }
    await startMeasure(page)
    await dragPerFrame(page, 'svg[role=img] rect[fill="transparent"]', path)
    if (cdp)
      writeFileSync(process.env.BENCH_PROFILE!, JSON.stringify((await cdp.send('Profiler.stop')).profile))
    report('Licht ins Verlies: drag, 17 torches', rate, await stopMeasure(page, `art-gallery-${rate}x`))
  })

  test(`Gassi gehen: a walk in the woods, ${rate}×`, async ({ page }) => {
    // "Stöckchen am Pfahl" ("Mittel"): six posts, the most of the walks without a free start.
    const id = 'wm2'
    const course = makeWoodsCourse(woodsById(id))
    await startGame(page, 'frechet')
    await page.getByRole('button', { name: 'Spaziergänge' }).click()
    const picker = page.getByRole('dialog', { name: 'Spaziergänge' })
    await picker.getByRole('button', { name: 'Mittel', exact: true }).click()
    const woods = picker.getByRole('region', { name: 'Im Wald' })
    await woods.scrollIntoViewIfNeeded()
    await woods.getByRole('button', { name: new RegExp(woodsDe.walks[id]) }).click()
    await page.getByRole('dialog', { name: "So geht's" }).getByRole('button', { name: "Los geht's!" }).click()
    await expect(page.getByTestId('trunks')).toBeVisible()
    await throttle(page, rate)
    await startMeasure(page)
    // Walk like a careful player for 8 s: read the positions and hold what the hint advises.
    const held = { person: false, dog: false }
    const keys = { person: 'KeyA', dog: 'KeyL' } as const
    const set = async (who: 'person' | 'dog', down: boolean) => {
      if (held[who] === down) return
      held[who] = down
      await (down ? page.keyboard.down(keys[who]) : page.keyboard.up(keys[who]))
    }
    const until = Date.now() + 8000
    while (Date.now() < until) {
      const [s, t] = (await page.getByTestId('park').getAttribute('data-walk'))!.split(',').map(Number) as [
        number,
        number,
      ]
      const a = woodsAdvice(course, { ...woodsStart(course), s, t, rope: ropeAt(course, s, t) })
      if (!a) break
      await set('person', a !== 'dog')
      await set('dog', a !== 'person')
      await page.waitForTimeout(100)
    }
    await set('person', false)
    await set('dog', false)
    report(
      'Gassi gehen: walk in the woods (Stöckchen am Pfahl)',
      rate,
      await stopMeasure(page, `frechet-woods-${rate}x`),
    )
  })

  test(`Rasenmähen: two mowers on the largest lawn, ${rate}×`, async ({ page }) => {
    await seed(page, {
      'rotp-lawn-mowing': {
        state: { lawn: 'lawn-mowing/lawn5', cutters: 2, seenHowTo: true, played: true, stars: {} },
        version: 1,
      },
    })
    await page.goto('./#/play/lawn-mowing')
    await resume(page)
    await expect(page.getByTestId('steps-2')).toBeVisible()
    await throttle(page, rate)
    await startMeasure(page)
    // Both mowers drive at once, a key held per leg, as two players would.
    for (const [one, two, ms] of [
      ['KeyD', 'ArrowLeft', 2500],
      ['KeyS', 'ArrowUp', 1200],
      ['KeyA', 'ArrowRight', 2500],
      ['KeyS', 'ArrowUp', 1200],
    ] as const) {
      await page.keyboard.down(one)
      await page.keyboard.down(two)
      await page.waitForTimeout(ms)
      await page.keyboard.up(one)
      await page.keyboard.up(two)
    }
    const steps = await page.getByTestId('steps-1').locator('strong').textContent()
    report(
      'Rasenmähen: two mowers, largest lawn',
      rate,
      await stopMeasure(page, `lawn-${rate}x`),
      `  (${steps})`,
    )
  })

  test(`Straßenbau: build the shortest network on the largest map, ${rate}×`, async ({ page }) => {
    // The largest fixed map: Unity's TSP point set with 19 villages, the last map of the first set.
    const level = json<KingsTaxesLevel>('kings-taxes/tsp/ktLevel3')
    const map = mapOf(level)
    await seed(page, {
      'rotp-roads': { state: { level: 7, round: 0, stars: {}, seenHowTo: { mst: true } }, version: 2 },
    })
    await page.goto('./#/play/roads')
    await resume(page)
    await expect(page.getByTestId('roads-input')).toBeVisible()
    const paths: Pt[][] = []
    for (const [a, b] of kruskal(map.points).roads) {
      const p = await toScreen(page, ...map.points[a]!)
      const q = await toScreen(page, ...map.points[b]!)
      paths.push(
        Array.from({ length: 21 }, (_, i) => ({
          x: p.x + (i / 20) * (q.x - p.x),
          y: p.y + (i / 20) * (q.y - p.y),
        })),
      )
    }
    await throttle(page, rate)
    await startMeasure(page)
    // Every road of the shortest network but the last: one drag each, one move per frame.
    for (const path of paths.slice(0, -1)) await dragPerFrame(page, '[data-testid="roads-input"]', path)
    report('Straßenbau: build roads, 19 villages', rate, await stopMeasure(page, `roads-${rate}x`))
  })

  test(`Erobere das Land: aiming with the mouse in a game of two, ${rate}×`, async ({ page }) => {
    await seed(page, {
      'rotp-voronoi': {
        state: {
          map: 'voronoi/map2-river-valley',
          opponent: 'friends',
          aiLevel: null,
          castles: 10,
          seenHowTo: true,
          played: true,
          wins: {},
        },
        version: 1,
      },
    })
    await page.goto('./#/play/voronoi')
    await resume(page)
    const game = page.locator('[data-castles]')
    await expect(game).toHaveAttribute('data-turn', '0')
    // Twelve castles at seeded random spots (the game refuses water and spots too close), then the
    // ghost castle follows the mouse across the map: its cell and its points change in every frame.
    const { minX, minY, maxX, maxY } = json<{ bounds: Record<'minX' | 'minY' | 'maxX' | 'maxY', number> }>(
      'voronoi/map2-river-valley',
    ).bounds
    const rnd = random(9)
    for (let tries = 0; Number(await game.getAttribute('data-castles')) < 12; tries++) {
      expect(tries).toBeLessThan(500)
      const p = await toScreen(page, minX + rnd() * (maxX - minX), minY + rnd() * (maxY - minY))
      await page.mouse.click(p.x, p.y)
    }
    const corners = await Promise.all(
      [
        [minX + 1, minY + 1],
        [maxX - 1, maxY - 1],
        [maxX - 1, minY + 1],
        [minX + 1, maxY - 1],
      ].map(([x, y]) => toScreen(page, x!, y!)),
    )
    const path = Array.from({ length: 180 }, (_, i) => {
      const leg = Math.floor(i / 60)
      const f = (i % 60) / 59
      const a = corners[leg]!
      const b = corners[leg + 1]!
      return { x: a.x + f * (b.x - a.x), y: a.y + f * (b.y - a.y) }
    })
    await throttle(page, rate)
    await startMeasure(page)
    await hoverPerFrame(page, 'svg[role=img] rect[fill="transparent"]', path)
    report('Erobere das Land: aim, 12 castles', rate, await stopMeasure(page, `voronoi-aim-${rate}x`))
  })

  test(`Erobere das Land: "Schwer" moves with 10 castles each, ${rate}×`, async ({ page }) => {
    // A fixed game on the largest map: the player builds at seeded random spots, the computer answers
    // with "Schwer". Its ten requests are replayed in the app's own worker (the built chunk), so every
    // run and every version times the same moves.
    const level = json<VoronoiLevel>('voronoi/map2-river-valley')
    const requests = schwerGame(level)
    const worker = readdirSync(`${process.env.BENCH_DIST ?? 'dist'}/assets`).find((f) =>
      /^voronoi-ai-.*\.js$/.test(f),
    )!
    await page.goto('./')
    await throttle(page, rate)
    const ms = await page.evaluate(
      async ([url, requests]) => {
        let w = new Worker(url, { type: 'module' })
        const ask = (request: unknown) =>
          new Promise<number>((resolve, reject) => {
            w.onmessage = (e: MessageEvent<{ ms: number }>) => resolve(e.data.ms)
            w.onerror = (e) => reject(new Error(e.message))
            w.postMessage(request)
          })
        // As in the game: the worker prepares the map while the player places the first castle. Builds
        // from before 2026-10-18 have no warm-up: their first move starts cold, as it did in the game.
        await ask({ kind: 'warm', id: 0, level: requests[0]!.level }).catch(() => {
          w.terminate()
          w = new Worker(url, { type: 'module' })
        })
        const out: number[] = []
        for (const [i, request] of requests.entries())
          out.push(await ask({ kind: 'move', id: i + 1, ...request }))
        w.terminate()
        return out
      },
      [`assets/${worker}`, requests] as const,
    )
    const median = [...ms].sort((a, b) => a - b)[Math.floor(ms.length / 2)]!
    const row =
      `${'Erobere das Land: "Schwer" move'.padEnd(40)} ${`${rate}×`.padStart(3)}  slowest ${fmt(Math.max(...ms), 4)} ms` +
      `  median ${fmt(median, 4)} ms  (${ms.join(', ')})`
    rows.push(row)
    console.log(row)
  })
}

test('first visit on a phone: the start map on slow 3G', async ({ page }) => {
  test.setTimeout(5 * 60_000)
  // Chromium's "Slow 3G" profile: 2 s latency, 50 kB/s each way.
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 2000,
    downloadThroughput: 50_000,
    uploadThroughput: 50_000,
  })
  await page.goto('./', { waitUntil: 'commit', timeout: 120_000 })
  await expect(page.getByRole('heading', { name: 'Ruler of the Plane' })).toBeVisible({ timeout: 120_000 })
  // The map is complete when its fonts, the parchment and every picture on it have arrived.
  await page.waitForFunction(
    () =>
      document.fonts.status === 'loaded' &&
      [...document.images].every((i) => i.complete) &&
      performance.getEntriesByType('resource').some((r) => r.name.includes('parchment')),
    undefined,
    { timeout: 120_000, polling: 100 },
  )
  const map = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const kb = (list: PerformanceResourceTiming[]) =>
      Math.round(list.reduce((sum, r) => sum + r.encodedBodySize, nav.encodedBodySize) / 1000)
    return {
      ready: Math.max(...resources.map((r) => r.responseEnd), performance.now() - 100),
      domContentLoaded: nav.domContentLoadedEventEnd,
      kb: kb(resources),
      largest: resources
        .sort((a, b) => b.encodedBodySize - a.encodedBodySize)
        .slice(0, 4)
        .map((r) => `${r.name.split('/').pop()} ${Math.round(r.encodedBodySize / 1000)} kB`),
    }
  })
  // Then the service worker precaches the rest for offline use (its requests are not throttled, so
  // only their size is reported).
  const dist = process.env.BENCH_DIST ?? 'dist'
  const precached = [...readFileSync(`${dist}/sw.js`, 'utf8').matchAll(/url:"([^"]+)"/g)].map((m) => m[1]!)
  const precacheKb = Math.round(
    [...new Set(precached)].reduce((sum, url) => sum + statSync(`${dist}/${url}`).size, 0) / 1000,
  )
  const row =
    `${'First visit, slow 3G'.padEnd(40)}  start map ${(map.ready / 1000).toFixed(1)} s (${map.kb} kB; ` +
    `HTML parsed ${(map.domContentLoaded / 1000).toFixed(1)} s)  precache ${precacheKb} kB` +
    `  largest: ${map.largest.join(', ')}`
  rows.push(row)
  console.log(row)
})
