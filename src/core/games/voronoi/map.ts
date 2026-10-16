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
}

/** Points for all the land together: one point is one percent of the land. */
export const LAND_POINTS = 100

export function prepareMap(level: VoronoiLevel): GameMap {
  const land = level.land.map(toPathD)
  return { level, frame: level.bounds, land, landArea: areaPathsD(land) }
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
