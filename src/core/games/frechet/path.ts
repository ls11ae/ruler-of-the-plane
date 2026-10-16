import type { Vec2 } from '../../geometry/types'

/**
 * A polyline with its arc-length parametrisation: position `s` (0 … `length`) is the point reached
 * after walking `s` units from the first vertex.
 */
export interface Path {
  points: readonly Vec2[]
  /** `cumulative[i]`: arc length from the start to vertex i (`cumulative[0] = 0`). */
  cumulative: readonly number[]
  length: number
}

export function makePath(points: readonly Vec2[]): Path {
  if (points.length < 2) throw new Error('a path needs at least two points')
  const cumulative = [0]
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]!
    const [x1, y1] = points[i]!
    cumulative.push(cumulative[i - 1]! + Math.hypot(x1 - x0, y1 - y0))
  }
  return { points, cumulative, length: cumulative[cumulative.length - 1]! }
}

export const segmentCount = (path: Path) => path.points.length - 1

/** The segment containing arc length s (the last one for s = length) and the position on it in [0, 1]. */
export function locate(path: Path, s: number): { segment: number; t: number } {
  const { cumulative } = path
  const n = segmentCount(path)
  const clamped = Math.min(Math.max(s, 0), path.length)
  let lo = 0
  let hi = n - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (cumulative[mid]! <= clamped) lo = mid
    else hi = mid - 1
  }
  const len = cumulative[lo + 1]! - cumulative[lo]!
  return { segment: lo, t: len > 0 ? Math.min(1, (clamped - cumulative[lo]!) / len) : 0 }
}

/** The point at arc length s (clamped to the path). */
export function pointAt(path: Path, s: number): Vec2 {
  const { segment, t } = locate(path, s)
  const [x0, y0] = path.points[segment]!
  const [x1, y1] = path.points[segment + 1]!
  return [x0 + t * (x1 - x0), y0 + t * (y1 - y0)]
}

/** Direction of walking at arc length s (unit vector of its segment). */
export function directionAt(path: Path, s: number): Vec2 {
  const { segment } = locate(path, s)
  const [x0, y0] = path.points[segment]!
  const [x1, y1] = path.points[segment + 1]!
  const len = Math.hypot(x1 - x0, y1 - y0) || 1
  return [(x1 - x0) / len, (y1 - y0) / len]
}

/** The part of the path from arc length s to the end (at the end: a segment of length 0). */
export function tailFrom(path: Path, s: number): Vec2[] {
  const { segment } = locate(path, s)
  return [pointAt(path, s), ...path.points.slice(segment + 1)]
}

/** Arc length → index parameter (vertex i at i, linear on each segment). */
export function toIndex(path: Path, s: number): number {
  const { segment, t } = locate(path, s)
  return segment + t
}

/** Index parameter → arc length. */
export function toArcLength(path: Path, x: number): number {
  const n = segmentCount(path)
  const i = Math.min(Math.max(Math.floor(x), 0), n - 1)
  const t = Math.min(Math.max(x - i, 0), 1)
  return path.cumulative[i]! + t * (path.cumulative[i + 1]! - path.cumulative[i]!)
}

export const distance = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1])

/**
 * Douglas–Peucker simplification for drawn paths: at most `maxSegments` segments, and no corner that
 * deviates less than `tolerance` from the simplified line.
 */
export function simplify(points: readonly Vec2[], maxSegments: number, tolerance = 0): Vec2[] {
  // Keep the vertices with the largest deviation, one by one, until the budget is used.
  const keep = new Set([0, points.length - 1])
  while (keep.size < maxSegments + 1) {
    const sorted = [...keep].sort((a, b) => a - b)
    let best = -1
    let bestIndex = -1
    for (let k = 0; k + 1 < sorted.length; k++) {
      const a = sorted[k]!
      const b = sorted[k + 1]!
      for (let i = a + 1; i < b; i++) {
        const d = pointSegmentDistance(points[i]!, points[a]!, points[b]!)
        if (d > best) {
          best = d
          bestIndex = i
        }
      }
    }
    if (bestIndex < 0 || best <= tolerance) break
    keep.add(bestIndex)
  }
  return [...keep].sort((a, b) => a - b).map((i) => points[i]!)
}

export function pointSegmentDistance(c: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  const t = len2 > 0 ? Math.min(1, Math.max(0, ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / len2)) : 0
  return Math.hypot(a[0] + t * dx - c[0], a[1] + t * dy - c[1])
}
