import { describe, expect, it } from 'vitest'
import { pointInRing } from '../../geometry/polygon'
import type { Vec2 } from '../../geometry/types'
import { mulberry32, shuffled } from '../../random'
import { coverage, DARK_HINT_FROM, floorPaths, LIT_RADIUS, showsDarkHint, thickestDarkSpot } from './coverage'
import { dungeonBounds, isOnFloor, type Dungeon } from './dungeon'
import { rasterCoverage, seesFloat, wallsOf } from './raster'
import { ART_GALLERY_LEVELS } from './levels.fixture'
import { centroid, triangulate } from './triangulation'
import { visibilityPolygon } from './visibility'

function randomFloorPoint(d: Dungeon, rng: () => number): Vec2 {
  const b = dungeonBounds(d)
  for (;;) {
    const p: Vec2 = [b.minX + rng() * (b.maxX - b.minX), b.minY + rng() * (b.maxY - b.minY)]
    if (isOnFloor(d, p)) return p
  }
}

function ringPerimeter(ring: readonly Vec2[]): number {
  return ring.reduce((s, [x, y], i) => {
    const [x2, y2] = ring[(i + 1) % ring.length]!
    return s + Math.hypot(x2 - x, y2 - y)
  }, 0)
}

/** Inside the dark region (Clipper's rings: an odd number of rings around p). */
const inDark = (dark: Vec2[][], p: Vec2) => dark.filter((ring) => pointInRing(p, ring) === 1).length % 2 === 1

/**
 * Acceptance test of Phase 1: the exact check (visibility sweep + Clipper2) and an independent raster
 * check judge torch placements the same way, up to the raster's resolution.
 */
function compare(level: Dungeon, torches: Vec2[]) {
  const exact = coverage(
    floorPaths(level),
    torches.map((t) => visibilityPolygon(level, t)),
  )
  const raster = rasterCoverage(level, torches)
  // Darkness the raster cannot resolve: a few grid cells.
  const resolution = (4 * raster.cellArea) / exact.floorArea
  const exactDarkShare = exact.darkArea / exact.floorArea
  // A grid misjudges at most the cells along the dark region's boundary: perimeter × cell size.
  const perimeter = exact.dark.reduce((sum, ring) => sum + ringPerimeter(ring), 0)
  const discretisation = (perimeter * Math.sqrt(raster.cellArea)) / exact.floorArea
  expect(Math.abs(exactDarkShare - raster.darkShare)).toBeLessThan(discretisation + resolution)
  // Every dark sample lies in the exact dark region.
  for (const p of raster.darkPoints) expect(inDark(exact.dark, p), `dark sample ${p}`).toBe(true)

  // The thickness verdict, checked independently with plain segment tests.
  const walls = wallsOf(level)
  const litOrOff = (q: Vec2) => !isOnFloor(level, q) || torches.some((t) => seesFloat(t, q, walls))
  const around = (c: Vec2, r: number, n = 24) =>
    Array.from({ length: n }, (_, i): Vec2 => [
      c[0] + r * Math.cos((2 * Math.PI * i) / n),
      c[1] + r * Math.sin((2 * Math.PI * i) / n),
    ])
  if (exact.fullyLit) {
    // Fully lit: every dark sample lies in a hairline, so a lit point (or a wall) is within r of it.
    for (const p of raster.darkPoints) {
      const near = [LIT_RADIUS / 3, (2 * LIT_RADIUS) / 3, LIT_RADIUS * 1.02].flatMap((r) => around(p, r))
      expect(near.some(litOrOff), `hairline sample ${p}`).toBe(true)
    }
  } else {
    // Not lit: a disc of radius r around the thickest dark spot is dark.
    const spot = thickestDarkSpot(exact.darkPaths)!
    expect(spot.radius).toBeGreaterThanOrEqual(LIT_RADIUS * 0.98)
    for (const q of [spot.at, ...around(spot.at, LIT_RADIUS * 0.9)])
      expect(litOrOff(q), `dark disc ${q}`).toBe(false)
  }
  return { exact, raster }
}

describe.each(ART_GALLERY_LEVELS.map((l) => [l.name, l] as const))('%s', (_, level) => {
  const t = triangulate(level)
  const centroids = t.triangles.map((tri) => centroid(t, tri))

  it('is fully lit with a torch in every triangle (exact and raster)', () => {
    const { exact, raster } = compare(level, centroids)
    expect(exact.fullyLit).toBe(true)
    expect(exact.litShare).toBe(1)
    expect(raster.dark).toBe(0)
  })

  it('judges near-solutions (one torch removed) alike', () => {
    const rng = mulberry32(level.number)
    for (const i of shuffled(
      centroids.map((_, i) => i),
      rng,
    ).slice(0, 4)) {
      compare(
        level,
        centroids.filter((_, j) => j !== i),
      )
    }
  })

  it('judges random placements alike', () => {
    const rng = mulberry32(1000 + level.number)
    for (let trial = 0; trial < 6; trial++) {
      const count = level.torches + (trial % 3)
      const torches = Array.from({ length: count }, () => randomFloorPoint(level, rng))
      const { exact } = compare(level, torches)
      expect(exact.litShare).toBeGreaterThan(0)
      expect(exact.litShare).toBeLessThanOrEqual(1)
    }
  })
})

describe('thickness rule', () => {
  const room: Dungeon = {
    outer: [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ],
    holes: [],
  }
  const litUpTo = (y: number): Vec2[] => [
    [0, 0],
    [4, 0],
    [4, y],
    [0, y],
  ]

  it('counts a dark strip thinner than 2r as lit, a thicker one as dark', () => {
    const floor = floorPaths(room)
    const thin = coverage(floor, [litUpTo(4 - 2 * LIT_RADIUS * 0.8)])
    expect(thin.fullyLit).toBe(true)
    expect(thin.litShare).toBe(1)
    expect(thin.darkArea).toBeGreaterThan(0)
    const thick = coverage(floor, [litUpTo(4 - 2 * LIT_RADIUS * 1.3)])
    expect(thick.fullyLit).toBe(false)
    const spot = thickestDarkSpot(thick.darkPaths)!
    expect(spot.radius).toBeCloseTo(LIT_RADIUS * 1.3, 3)
    expect(spot.at[1]).toBeCloseTo(4 - LIT_RADIUS * 1.3, 2)
  })

  it('marks the thickest dark spot only from 95 % lit on', () => {
    expect(DARK_HINT_FROM).toBe(0.95)
    const level = ART_GALLERY_LEVELS.find((l) => l.name === 'agLevel3_2')!
    const floor = floorPaths(level)
    const lit = (torches: Vec2[]) =>
      coverage(
        floor,
        torches.map((t) => visibilityPolygon(level, t)),
      )
    // One torch in a poor spot (67 %), then a good one beside it (97 %), then the second good one (100 %).
    const poor = lit([[-2.5, 3.5]])
    expect(poor.litShare).toBeLessThan(0.95)
    expect(showsDarkHint(poor)).toBe(false)
    const nearly = lit([
      [2.35, -2.79],
      [-2.5, 3.5],
    ])
    expect(nearly.litShare).toBeGreaterThan(0.95)
    expect(showsDarkHint(nearly)).toBe(true)
    const done = lit([
      [2.35, -2.79],
      [1.37, 1.83],
    ])
    expect(done.fullyLit).toBe(true)
    expect(showsDarkHint(done)).toBe(false)
  })

  it("has slack on the first dungeon: Kevin's two torches stay lit when moved by up to 0.05", () => {
    const level = ART_GALLERY_LEVELS.find((l) => l.name === 'agLevel3_2')!
    const floor = floorPaths(level)
    const base: Vec2[] = [
      [2.35, -2.79],
      [1.37, 1.83],
    ]
    for (let a = 0; a < 8; a++) {
      for (const r of [0, 0.05]) {
        const angle = (a * Math.PI) / 4
        const moved = base.map(([x, y], i): Vec2 => [
          x + r * Math.cos(angle * (i + 1)),
          y + r * Math.sin(angle * (i + 1)),
        ])
        const c = coverage(
          floor,
          moved.map((t) => visibilityPolygon(level, t)),
        )
        expect(c.fullyLit, `torches ${moved}`).toBe(true)
      }
    }
  })
})
