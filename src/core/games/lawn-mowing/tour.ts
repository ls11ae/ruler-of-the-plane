import type { Vec2 } from '../../geometry/types'

/** A unit step: one of the four directions. */
export type Direction = 'up' | 'down' | 'left' | 'right'

/** Direction vectors in the competition's coordinates (y up). */
export const STEP: Record<Direction, Vec2> = { up: [0, 1], down: [0, -1], left: [-1, 0], right: [1, 0] }

const same = (a: Vec2, b: Vec2) => a[0] === b[0] && a[1] === b[1]

/** L1 length of a closed tour given by its corner points (pyutils27 `CutterTour.length`). */
export function tourLength(corners: readonly Vec2[]): number {
  let length = 0
  for (let i = 0; i < corners.length && corners.length > 1; i++) {
    const a = corners[i]!
    const b = corners[(i + 1) % corners.length]!
    length += Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1])
  }
  return length
}

/**
 * The positions of the reference point after every unit step along a closed tour, from the start back to
 * it (pyutils27 `CutterTour.positions`: length + 1 positions). Corners must be axis-parallel neighbours.
 */
export function positionsOf(corners: readonly Vec2[]): Vec2[] {
  if (!corners.length) return []
  let [x, y] = corners[0]!
  const out: Vec2[] = [[x, y]]
  for (let i = 0; i < corners.length && corners.length > 1; i++) {
    const a = corners[i]!
    const b = corners[(i + 1) % corners.length]!
    if (a[0] !== b[0] && a[1] !== b[1]) throw new Error(`edge ${a} → ${b} is not axis-parallel`)
    const dx = Math.sign(b[0] - a[0])
    const dy = Math.sign(b[1] - a[1])
    for (let s = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]); s > 0; s--) {
      x += dx
      y += dy
      out.push([x, y])
    }
  }
  return out
}

/**
 * Corner points of a closed walk given by its positions (unit steps apart, the last one back at the start):
 * the start and every position where the direction changes. As in pyutils27 the closing edge back to the
 * start is implicit, so the final return to the start is left out.
 */
export function cornersOf(positions: readonly Vec2[]): Vec2[] {
  const pts = [...positions]
  while (pts.length > 1 && same(pts[pts.length - 1]!, pts[0]!)) pts.pop()
  if (pts.length < 2) return pts.slice(0, 1)
  const dir = (a: Vec2, b: Vec2) => `${b[0] - a[0]},${b[1] - a[1]}`
  const out: Vec2[] = [pts[0]!]
  for (let i = 1; i < pts.length; i++) {
    const next = pts[i + 1] ?? pts[0]!
    if (dir(pts[i - 1]!, pts[i]!) !== dir(pts[i]!, next)) out.push(pts[i]!)
  }
  return out
}

/**
 * A shortest (L1) way from `from` to `to` as unit steps, one of the two L shapes: the one whose positions
 * score more by `value` (e.g. lawn it would still mow), the horizontal one first on a tie.
 */
export function wayBack(from: Vec2, to: Vec2, value: (p: Vec2) => number = () => 0): Vec2[] {
  const leg = (start: Vec2, horizontalFirst: boolean): Vec2[] => {
    const out: Vec2[] = []
    let [x, y] = start
    const moveX = () => {
      while (x !== to[0]) {
        x += Math.sign(to[0] - x)
        out.push([x, y])
      }
    }
    const moveY = () => {
      while (y !== to[1]) {
        y += Math.sign(to[1] - y)
        out.push([x, y])
      }
    }
    if (horizontalFirst) {
      moveX()
      moveY()
    } else {
      moveY()
      moveX()
    }
    return out
  }
  const a = leg(from, true)
  const b = leg(from, false)
  const score = (path: Vec2[]) => path.reduce((s, p) => s + value(p), 0)
  return score(b) > score(a) ? b : a
}
