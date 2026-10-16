import { areaPathsD, FillRule, intersectD, type PathD, type PathsD } from 'clipper2-ts'
import { pointInRing, signedArea, type Ring } from '../../geometry/polygon'
import type { Bounds, Vec2 } from '../../geometry/types'
import type { VoronoiLevel } from '../../levels/schema'

/** Decimal places Clipper2 keeps when clipping cells to the land (map units are about 16 wide). */
export const CLIP_PRECISION = 6

export const toPathD = (ring: readonly Vec2[]): PathD => ring.map(([x, y]) => ({ x, y }))

/** A map of "Erobere das Land", prepared for the rules: the land as Clipper paths and its area. */
export interface GameMap {
  level: VoronoiLevel
  /** The map sheet: castles' cells are clipped to it. */
  frame: Bounds
  /** The land that scores (outer rings positive, lakes negative: non-zero fill). */
  land: PathsD
  /** Area of the land (map units²); it is worth {@link LAND_POINTS} points. */
  landArea: number
  /**
   * The coast as a flat list for fast tests: per ring, its orientation (1 land, −1 lake), the number of
   * edges and then ax, ay, bx, by of every edge.
   */
  coast: Float64Array
}

/** Points for all the land together: one point is one percent of the land. */
export const LAND_POINTS = 100

export function prepareMap(level: VoronoiLevel): GameMap {
  const land = level.land.map(toPathD)
  return {
    level,
    frame: level.bounds,
    land,
    landArea: areaPathsD(land),
    coast: Float64Array.from(
      level.land.flatMap((ring) => [
        Math.sign(signedArea(ring)),
        ring.length,
        ...ring.flatMap(([ax, ay], i) => [ax, ay, ...ring[(i + 1) % ring.length]!]),
      ]),
    ),
  }
}

/** Whether p is on land (the coast counts as land): the signed rings around p add up to a positive count. */
export function isOnLand(map: GameMap, p: Vec2): boolean {
  let count = 0
  for (const ring of map.level.land) {
    const where = pointInRing(p, ring)
    if (where === 0) return true
    if (where === 1) count += Math.sign(signedArea(ring))
  }
  return count > 0
}

/** Distance from p to the nearest coast (any edge of the land, lake shores and river banks included). */
export function distanceToCoast(map: GameMap, [px, py]: Vec2): number {
  let best = Infinity
  for (const ring of map.level.land) {
    for (let i = 0, n = ring.length; i < n; i++) {
      const [ax, ay] = ring[i]!
      const [bx, by] = ring[(i + 1) % n]!
      const dx = bx - ax
      const dy = by - ay
      const len2 = dx * dx + dy * dy
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0
      const d = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2
      if (d < best) best = d
    }
  }
  return Math.sqrt(best)
}

/**
 * How far p lies inside the land: the distance to the nearest coast if p is on land, else −1. One pass
 * over the coast in floating point (crossings and distances together), much faster than
 * {@link isOnLand} and {@link distanceToCoast}; only points within rounding error of a coast could be
 * judged differently, and castles keep a margin from every coast.
 */
export function landClearance(map: GameMap, [px, py]: Vec2): number {
  const c = map.coast
  let best = Infinity
  let winding = 0
  for (let k = 0; k < c.length;) {
    const sign = c[k]!
    const n = c[k + 1]!
    let crossings = 0
    k += 2
    for (const end = k + 4 * n; k < end; k += 4) {
      const ax = c[k]!
      const ay = c[k + 1]!
      const bx = c[k + 2]!
      const by = c[k + 3]!
      if (ay > py !== by > py && ax + ((py - ay) / (by - ay)) * (bx - ax) > px) crossings++
      const dx = bx - ax
      const dy = by - ay
      const len2 = dx * dx + dy * dy
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0
      const ex = px - ax - t * dx
      const ey = py - ay - t * dy
      const d = ex * ex + ey * ey
      if (d < best) best = d
    }
    if (crossings % 2) winding += sign
  }
  return winding > 0 ? Math.sqrt(best) : -1
}

export function insideFrame(map: GameMap, [x, y]: Vec2): boolean {
  const f = map.frame
  return x >= f.minX && x <= f.maxX && y >= f.minY && y <= f.maxY
}

/** Area of land inside a convex cell (a ring as returned by d3-delaunay, closed or not). */
export function landAreaIn(map: GameMap, cell: Ring): number {
  return areaPathsD(intersectD(map.land, [toPathD(cell)], FillRule.NonZero, CLIP_PRECISION))
}

/** The land inside a cell, as rings (for drawing or tests). */
export function landIn(map: GameMap, cell: Ring): Vec2[][] {
  return intersectD(map.land, [toPathD(cell)], FillRule.NonZero, CLIP_PRECISION).map((path) =>
    path.map((p) => [p.x, p.y] as const),
  )
}
