import { describe, expect, it } from 'vitest'
import { pointInRing } from '../../geometry/polygon'
import type { Vec2 } from '../../geometry/types'
import { mulberry32, shuffled } from '../../random'
import { coverage, floorPaths } from './coverage'
import { dungeonBounds, isOnFloor, type Dungeon } from './dungeon'
import { rasterCoverage } from './raster'
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
  if (exact.fullyLit) expect(raster.dark, 'exact: fully lit').toBe(0)
  if (exactDarkShare > resolution) expect(raster.dark, 'exact: dark area').toBeGreaterThan(0)
  // Every dark sample lies in the exact dark region.
  for (const p of raster.darkPoints) expect(inDark(exact.dark, p), `dark sample ${p}`).toBe(true)
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
