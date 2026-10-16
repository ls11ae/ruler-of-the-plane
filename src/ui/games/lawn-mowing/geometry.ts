import type { Lawn } from '../../../core/games/lawn-mowing/mowing'
import type { Bounds, Vec2 } from '../../../core/geometry/types'
import type { LawnMowingLevel } from '../../../core/levels/schema'

/** The competition's coordinates have y up; the board's y points down. */
export const toBoard = ([x, y]: Vec2): Vec2 => [x, -y]

/** SVG path of rings given in the competition's coordinates. */
export const ringsPath = (rings: readonly (readonly Vec2[])[]) =>
  rings.map((r) => `M${r.map((p) => toBoard(p).join(',')).join('L')}Z`).join('')

/** The board region: the lawn and a margin around it, in board coordinates. */
export function boardBounds(level: LawnMowingLevel, margin: number): Bounds {
  const b = level.bounds
  return { minX: b.minX - margin, minY: -b.maxY - margin, maxX: b.maxX + margin, maxY: -b.minY + margin }
}

/** Where to draw a cutter whose reference point is at p: the centre of its footprint (board coordinates). */
export function cutterCentre(lawn: Lawn, p: Vec2): Vec2 {
  const xs = lawn.offsets.map(([x]) => x)
  const ys = lawn.offsets.map(([, y]) => y)
  const cx = (Math.min(...xs) + Math.max(...xs) + 1) / 2
  const cy = (Math.min(...ys) + Math.max(...ys) + 1) / 2
  return toBoard([p[0] + cx, p[1] + cy])
}

/** The footprint's bounding box at p, in board coordinates. */
export function footprintBox(lawn: Lawn, p: Vec2): Bounds {
  const xs = lawn.offsets.map(([x]) => x + p[0])
  const ys = lawn.offsets.map(([, y]) => y + p[1])
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs) + 1,
    minY: -(Math.max(...ys) + 1),
    maxY: -Math.min(...ys),
  }
}

/** Runs of cells per row (`[x, y, length]`), to draw many cells as few rectangles. */
export function runs(cells: readonly Vec2[]): [number, number, number][] {
  const sorted = [...cells].sort((a, b) => a[1] - b[1] || a[0] - b[0])
  const out: [number, number, number][] = []
  for (const [x, y] of sorted) {
    const last = out[out.length - 1]
    if (last && last[1] === y && last[0] + last[2] === x) last[2]++
    else out.push([x, y, 1])
  }
  return out
}

/** A polyline through points with the inner points of straight runs left out. */
export function simplify(points: readonly Vec2[]): Vec2[] {
  const out: Vec2[] = []
  for (const p of points) {
    const n = out.length
    if (n && out[n - 1]![0] === p[0] && out[n - 1]![1] === p[1]) continue
    if (n >= 2) {
      const a = out[n - 2]!
      const b = out[n - 1]!
      const straight = (a[0] === b[0] && b[0] === p[0]) || (a[1] === b[1] && b[1] === p[1])
      const forward =
        Math.sign(b[0] - a[0]) === Math.sign(p[0] - b[0]) && Math.sign(b[1] - a[1]) === Math.sign(p[1] - b[1])
      if (straight && forward) out[n - 1] = p
      else out.push(p)
    } else out.push(p)
  }
  return out
}
