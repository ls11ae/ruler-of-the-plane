import type { Vec2 } from '../../geometry/types'
import { edgesOf, isOnFloor, type Dungeon } from './dungeon'

/**
 * An independent, approximate check of the lighting (for tests): sample points on a fine grid over the
 * floor and test each against every torch with a plain floating-point segment test. Shares no code with
 * the visibility sweep or the Clipper2 coverage.
 */
export type Walls = readonly (readonly [number, number, number, number])[]

/** The walls as flat segments for {@link seesFloat}. */
export const wallsOf = (d: Dungeon): Walls => edgesOf(d).map(({ a, b }) => [a[0], a[1], b[0], b[1]] as const)

export function rasterCoverage(d: Dungeon, torches: readonly Vec2[], cells = 120) {
  const edges = wallsOf(d)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of d.outer) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  const step = Math.max(maxX - minX, maxY - minY) / cells
  let floor = 0
  let dark = 0
  const darkPoints: Vec2[] = []
  // An irrational offset keeps the samples off the (mostly rational) walls and visibility rays.
  for (let y = minY + step * 0.5137; y < maxY; y += step) {
    for (let x = minX + step * 0.4271; x < maxX; x += step) {
      const p: Vec2 = [x, y]
      if (!isOnFloor(d, p)) continue
      floor++
      if (!torches.some((t) => seesFloat(t, p, edges))) {
        dark++
        darkPoints.push(p)
      }
    }
  }
  return { samples: floor, dark, darkShare: floor ? dark / floor : 0, darkPoints, cellArea: step * step }
}

/** Whether p is visible from t: the segment tp crosses no wall (floating point; grazing counts as blocked). */
export function seesFloat(t: Vec2, p: Vec2, edges: Walls): boolean {
  const [tx, ty] = t
  const [px, py] = p
  for (const [ax, ay, bx, by] of edges) {
    const d1 = (bx - ax) * (ty - ay) - (by - ay) * (tx - ax)
    const d2 = (bx - ax) * (py - ay) - (by - ay) * (px - ax)
    if (d1 * d2 > 0) continue
    const d3 = (px - tx) * (ay - ty) - (py - ty) * (ax - tx)
    const d4 = (px - tx) * (by - ty) - (py - ty) * (bx - tx)
    if (d3 * d4 > 0) continue
    return false
  }
  return true
}
