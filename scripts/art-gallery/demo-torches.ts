/**
 * Finds torch placements for the attract demo of "Licht ins Verlies" and writes them to
 * `src/core/games/art-gallery/demoTorches.json`: for each demo dungeon at most k torches (the level's
 * number) that light it fully by the game's own exact check. A greedy set cover on a raster of floor
 * points, with random restarts, then the exact check; a dark spot it missed becomes a raster point too.
 *
 * Run after changing a demo dungeon: `npx tsx scripts/art-gallery/demo-torches.ts` (under a minute). A
 * unit test checks the stored torches with the exact check.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { format, resolveConfig } from 'prettier'
import { coverage, floorPaths, thickestDarkSpot } from '../../src/core/games/art-gallery/coverage'
import { isOnFloor, type Dungeon } from '../../src/core/games/art-gallery/dungeon'
import { DEMO_LEVELS } from '../../src/core/games/art-gallery/demo'
import { visibilityPolygon } from '../../src/core/games/art-gallery/visibility'
import { pointInRing } from '../../src/core/geometry/polygon'
import type { Vec2 } from '../../src/core/geometry/types'
import type { ArtGalleryLevel } from '../../src/core/levels/schema'
import { mulberry32 } from '../../src/core/random'

const out = new URL('../../src/core/games/art-gallery/demoTorches.json', import.meta.url)
const round = (x: number) => Math.round(x * 1000) / 1000

function grid(d: Dungeon, level: ArtGalleryLevel, step: number): Vec2[] {
  const { minX, minY, maxX, maxY } = level.bounds
  const points: Vec2[] = []
  for (let y = minY + step / 2; y < maxY; y += step) {
    for (let x = minX + step / 2; x < maxX; x += step) {
      const p: Vec2 = [round(x), round(y)]
      if (isOnFloor(d, p)) points.push(p)
    }
  }
  return points
}

/** Points just inside every corner (on the bisector, both ways): good torches often stand there. */
function nearCorners(d: Dungeon): Vec2[] {
  const points: Vec2[] = []
  for (const ring of [d.outer, ...d.holes]) {
    ring.forEach((v, i) => {
      const a = ring[(i + ring.length - 1) % ring.length]!
      const b = ring[(i + 1) % ring.length]!
      const ua = [a[0] - v[0], a[1] - v[1]]
      const ub = [b[0] - v[0], b[1] - v[1]]
      const la = Math.hypot(ua[0]!, ua[1]!)
      const lb = Math.hypot(ub[0]!, ub[1]!)
      const bis = [ua[0]! / la + ub[0]! / lb, ua[1]! / la + ub[1]! / lb]
      const lbis = Math.hypot(bis[0]!, bis[1]!) || 1
      for (const sign of [1, -1]) {
        const p: Vec2 = [
          round(v[0] + (sign * 0.08 * bis[0]!) / lbis),
          round(v[1] + (sign * 0.08 * bis[1]!) / lbis),
        ]
        if (isOnFloor(d, p)) points.push(p)
      }
    })
  }
  return points
}

/**
 * Replaces two torches by one while some candidate lights everything the other torches leave dark
 * (on the raster), as long as that works.
 */
function improve(chosen: number[], sees: boolean[][], samples: number) {
  for (let changed = true; changed;) {
    changed = false
    search: for (let a = 0; a < chosen.length; a++) {
      for (let b = a + 1; b < chosen.length; b++) {
        const rest = chosen.filter((_, i) => i !== a && i !== b)
        const dark: number[] = []
        for (let j = 0; j < samples; j++) if (!rest.some((c) => sees[c]![j])) dark.push(j)
        const one = sees.findIndex((row) => dark.every((j) => row[j]))
        if (one < 0) continue
        chosen.splice(0, chosen.length, ...rest, one)
        changed = true
        break search
      }
    }
  }
}

function solve(level: ArtGalleryLevel): Vec2[] {
  const d: Dungeon = { outer: level.outer, holes: level.holes }
  const floor = floorPaths(d)
  const candidates = [...grid(d, level, 0.25), ...nearCorners(d)]
  const vis = candidates.map((c) => visibilityPolygon(d, c))
  const samples = grid(d, level, 0.12)
  const rng = mulberry32(level.number * 7919)
  // sees[i][j]: candidate i lights sample j (a column is added for every dark spot found later).
  const sees = vis.map((v) => samples.map((p) => pointInRing(p, v) >= 0))
  const addSample = (p: Vec2) => {
    samples.push(p)
    vis.forEach((v, i) => sees[i]!.push(pointInRing(p, v) >= 0))
  }
  let best: Vec2[] | null = null
  for (let attempt = 0; attempt < 600 && !(best && best.length <= level.torches); attempt++) {
    const covered = new Uint8Array(samples.length)
    let left = samples.length
    const chosen: number[] = []
    while (left > 0 && chosen.length < 3 * level.torches) {
      const gains = sees.map((row) => row.reduce((n, lit, j) => n + (lit && !covered[j] ? 1 : 0), 0))
      const order = gains.map((g, i) => [g, i] as const).sort((a, b) => b[0] - a[0])
      // Mostly the best candidate, sometimes one of the next few: different restarts, different covers.
      const pick = order[Math.min(order.length - 1, Math.floor(rng() ** 3 * 4))]![1]
      chosen.push(pick)
      sees[pick]!.forEach((lit, j) => {
        if (lit && !covered[j]) {
          covered[j] = 1
          left--
        }
      })
    }
    if (left > 0) continue
    improve(chosen, sees, samples.length)
    const light = coverage(
      floor,
      chosen.map((i) => vis[i]!),
    )
    if (!light.fullyLit) {
      // A dark spot between the raster points: sample it from now on.
      const spot = thickestDarkSpot(light.darkPaths)
      if (spot) addSample(spot.at)
      continue
    }
    const torches = chosen.map((i) => candidates[i]!)
    if (!best || torches.length < best.length) best = torches
  }
  if (!best) throw new Error(`no full light found for ${level.name}`)
  return best
}

const result: Record<string, Vec2[]> = {}
for (const name of DEMO_LEVELS) {
  const level = JSON.parse(
    readFileSync(new URL(`../../public/levels/art-gallery/${name}.json`, import.meta.url), 'utf8'),
  ) as ArtGalleryLevel
  const torches = solve(level)
  console.log(`${name}: ${torches.length} torches (k = ${level.torches})`)
  result[name] = torches
}
const options = await resolveConfig(out.pathname)
writeFileSync(out, await format(JSON.stringify(result), { ...options, parser: 'json' }))
