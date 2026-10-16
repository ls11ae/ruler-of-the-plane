import { orientationSign, pointOnSegment, segmentsIntersect } from './predicates'
import type { Bounds, Vec2 } from './types'

/** A simple polygon as a list of vertices; the closing edge from the last to the first is implicit. */
export type Ring = readonly Vec2[]

/** Signed area by the shoelace formula: positive if the vertices run counterclockwise in a y-up frame. */
export function signedArea(ring: Ring): number {
  let sum = 0
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i]!
    const [x2, y2] = ring[(i + 1) % n]!
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}

export function boundsOf(points: Iterable<Vec2>): Bounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of points) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

function* edges(ring: Ring): Generator<[Vec2, Vec2, number]> {
  for (let i = 0, n = ring.length; i < n; i++) yield [ring[i]!, ring[(i + 1) % n]!, i]
}

/**
 * Whether the ring is a simple polygon: at least three vertices, not all collinear, and no two edges
 * meet except consecutive edges at their shared vertex (exact predicates).
 */
export function isSimple(ring: Ring): boolean {
  const n = ring.length
  if (n < 3) return false
  for (let i = 0; i < n; i++) {
    const a = ring[i]!
    const b = ring[(i + 1) % n]!
    if (a[0] === b[0] && a[1] === b[1]) return false
    for (let j = i + 1; j < n; j++) {
      const c = ring[j]!
      const d = ring[(j + 1) % n]!
      const adjacent = j === i + 1 || (i === 0 && j === n - 1)
      if (adjacent) {
        // Consecutive edges p→q and q→r share q; they must not fold back onto each other.
        const [p, q, r] = j === i + 1 ? [a, b, d] : [c, a, b]
        if (pointOnSegment(r, p, q) || pointOnSegment(p, q, r)) return false
        continue
      }
      if (segmentsIntersect(a, b, c, d)) return false
    }
  }
  return signedArea(ring) !== 0
}

/** Point location relative to a simple polygon: 1 inside, 0 on the boundary, -1 outside (exact). */
export function pointInRing(p: Vec2, ring: Ring): -1 | 0 | 1 {
  let winding = 0
  for (const [a, b] of edges(ring)) {
    if (pointOnSegment(p, a, b)) return 0
    if (a[1] <= p[1]) {
      if (b[1] > p[1] && orientationSign(a, b, p) > 0) winding++
    } else if (b[1] <= p[1] && orientationSign(a, b, p) < 0) {
      winding--
    }
  }
  return winding !== 0 ? 1 : -1
}

/** Whether the boundaries of two rings share a point. */
export function boundariesIntersect(r1: Ring, r2: Ring): boolean {
  for (const [a, b] of edges(r1)) {
    for (const [c, d] of edges(r2)) {
      if (segmentsIntersect(a, b, c, d)) return true
    }
  }
  return false
}

/** Problems with a polygon with holes; an empty list means it is valid. */
export function validatePolygonWithHoles(outer: Ring, holes: readonly Ring[]): string[] {
  const problems: string[] = []
  if (!isSimple(outer)) problems.push('outer boundary is not a simple polygon')
  holes.forEach((hole, i) => {
    if (!isSimple(hole)) problems.push(`hole ${i} is not a simple polygon`)
    if (boundariesIntersect(outer, hole)) problems.push(`hole ${i} touches the outer boundary`)
    else if (pointInRing(hole[0]!, outer) !== 1) problems.push(`hole ${i} is not inside the outer boundary`)
    for (let j = 0; j < i; j++) {
      const other = holes[j]!
      if (boundariesIntersect(hole, other)) problems.push(`holes ${j} and ${i} touch`)
      else if (pointInRing(hole[0]!, other) === 1 || pointInRing(other[0]!, hole) === 1) {
        problems.push(`holes ${j} and ${i} are nested`)
      }
    }
  })
  return problems
}
