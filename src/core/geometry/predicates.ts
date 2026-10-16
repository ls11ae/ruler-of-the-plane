import { orient2d } from 'robust-predicates'
import type { Vec2 } from './types'

/**
 * Exact orientation of the triple (a, b, c): positive if c lies to the left of the directed line a→b
 * (counterclockwise in a y-up frame), negative if to the right, zero if collinear.
 *
 * `robust-predicates` uses the opposite sign; this wrapper uses the usual mathematical convention, so
 * that it agrees with the sign of the shoelace area.
 */
export function orientation(a: Vec2, b: Vec2, c: Vec2): number {
  return -orient2d(a[0], a[1], b[0], b[1], c[0], c[1])
}

/** Sign of {@link orientation}: 1, -1 or 0. */
export function orientationSign(a: Vec2, b: Vec2, c: Vec2): -1 | 0 | 1 {
  const o = orientation(a, b, c)
  return o > 0 ? 1 : o < 0 ? -1 : 0
}

/** Whether p lies on the closed segment ab, assuming p, a, b are collinear. */
function onSegmentCollinear(p: Vec2, a: Vec2, b: Vec2): boolean {
  return (
    Math.min(a[0], b[0]) <= p[0] &&
    p[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= p[1] &&
    p[1] <= Math.max(a[1], b[1])
  )
}

/** Whether p lies on the closed segment ab (exact). */
export function pointOnSegment(p: Vec2, a: Vec2, b: Vec2): boolean {
  return orientationSign(a, b, p) === 0 && onSegmentCollinear(p, a, b)
}

/** Whether the closed segments ab and cd share at least one point (exact, including touching). */
export function segmentsIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o1 = orientationSign(a, b, c)
  const o2 = orientationSign(a, b, d)
  const o3 = orientationSign(c, d, a)
  const o4 = orientationSign(c, d, b)
  if (o1 !== o2 && o3 !== o4 && o1 * o2 <= 0 && o3 * o4 <= 0) {
    // Proper crossing, or an endpoint touching the other segment's interior.
    if (o1 !== 0 || o2 !== 0) return true
  }
  if (o1 === 0 && onSegmentCollinear(c, a, b)) return true
  if (o2 === 0 && onSegmentCollinear(d, a, b)) return true
  if (o3 === 0 && onSegmentCollinear(a, c, d)) return true
  if (o4 === 0 && onSegmentCollinear(b, c, d)) return true
  return false
}
