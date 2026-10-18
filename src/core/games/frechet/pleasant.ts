import type { Vec2 } from '../../geometry/types'

/**
 * Whether a pair of generated paths is pleasant to look at (the harder walks of "Gassi gehen" are
 * generated, see `scripts/gassi/generate.ts`; a test checks the stored ones).
 */

const cross = (a: Vec2, b: Vec2, c: Vec2) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

function segmentsCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const d1 = cross(c, d, a)
  const d2 = cross(c, d, b)
  const d3 = cross(a, b, c)
  const d4 = cross(a, b, d)
  return d1 * d2 < 0 && d3 * d4 < 0
}

/** How often a polyline crosses itself (non-adjacent segments). */
export function selfCrossings(pts: readonly Vec2[]): number {
  let count = 0
  for (let i = 0; i + 1 < pts.length; i++)
    for (let j = i + 2; j + 1 < pts.length; j++)
      if (segmentsCross(pts[i]!, pts[i + 1]!, pts[j]!, pts[j + 1]!)) count++
  return count
}

/** The sharpest turn of a polyline, in degrees (180 = turning back). */
export function sharpestTurn(pts: readonly Vec2[]): number {
  let worst = 0
  for (let i = 1; i + 1 < pts.length; i++) {
    const [ax, ay] = [pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]]
    const [bx, by] = [pts[i + 1]![0] - pts[i]![0], pts[i + 1]![1] - pts[i]![1]]
    const cos = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by))
    worst = Math.max(worst, (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI)
  }
  return worst
}

export const pathLength = (pts: readonly Vec2[]) =>
  pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1]), 0)

export const shortestSegment = (pts: readonly Vec2[]) =>
  Math.min(...pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1])))

/** Inside the 36 × 22 m park with a margin of 1.2 m. */
export const insidePark = (pts: readonly Vec2[]) =>
  pts.every(([x, y]) => x >= 1.2 && x <= 34.8 && y >= 1.2 && y <= 20.8)

/**
 * Pleasant to look at: inside the park, at most 20 segments, no very short segments, the person's
 * footpath without self-crossings and without turning back sharply, the dog's trail crossing itself at
 * most once.
 */
export function pleasant(person: readonly Vec2[], dog: readonly Vec2[]): boolean {
  return (
    insidePark(person) &&
    insidePark(dog) &&
    person.length <= 21 &&
    dog.length <= 21 &&
    shortestSegment(person) >= 1 &&
    shortestSegment(dog) >= 0.8 &&
    selfCrossings(person) === 0 &&
    selfCrossings(dog) <= 1 &&
    sharpestTurn(person) <= 115 &&
    pathLength(person) <= 65 &&
    pathLength(dog) <= 85
  )
}

/** Inside the 36 × 22 m park with a margin of `margin` metres. */
const insideBy = (pts: readonly Vec2[], margin: number) =>
  pts.every(([x, y]) => x >= margin && x <= 36 - margin && y >= margin && y <= 22 - margin)

/** Where two segments cross (proper crossings only), or null. */
function crossingPoint(a: Vec2, b: Vec2, c: Vec2, d: Vec2): Vec2 | null {
  if (!segmentsCross(a, b, c, d)) return null
  const d1 = cross(c, d, a)
  const d2 = cross(c, d, b)
  const u = d1 / (d1 - d2)
  return [a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])]
}

/** How often a polyline crosses itself farther than `radius` from all the given points. */
export function crossingsAway(pts: readonly Vec2[], centres: readonly Vec2[], radius: number): number {
  let count = 0
  for (let i = 0; i + 1 < pts.length; i++)
    for (let j = i + 2; j + 1 < pts.length; j++) {
      const p = crossingPoint(pts[i]!, pts[i + 1]!, pts[j]!, pts[j + 1]!)
      if (p && centres.every((c) => Math.hypot(p[0] - c[0], p[1] - c[1]) > radius)) count++
    }
  return count
}

/**
 * Legible paths for the walks in the woods, which loop round posts by design: inside the park (0.7 m
 * from its edge, so that the dog can run round a post at the gate), no segment shorter than 0.3 m,
 * the footpath without turns sharper than 120°, loops only where designed (away from the posts the
 * footpath does not cross itself and the dog's trail at most once), at most 80 segments each.
 */
export function legibleInWoods(
  person: readonly Vec2[],
  dog: readonly Vec2[],
  posts: readonly Vec2[],
): boolean {
  return (
    insideBy(person, 0.7) &&
    insideBy(dog, 0.7) &&
    person.length <= 81 &&
    dog.length <= 81 &&
    shortestSegment(person) >= 0.3 &&
    shortestSegment(dog) >= 0.3 &&
    sharpestTurn(person) <= 120 &&
    crossingsAway(person, posts, 3) === 0 &&
    crossingsAway(dog, posts, 3) <= 1 &&
    pathLength(person) <= 110 &&
    pathLength(dog) <= 140
  )
}
