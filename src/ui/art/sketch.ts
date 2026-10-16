/** Helpers for hand-drawn looking SVG shapes. */

export type Pt = readonly [number, number]

/** A closed Catmull-Rom spline through the points, as an SVG path of cubic Bézier segments. */
export function smoothClosedPath(points: readonly Pt[]): string {
  const n = points.length
  if (n < 3) return ''
  const p = (i: number) => points[((i % n) + n) % n]!
  let d = `M${fmt(p(0)[0])},${fmt(p(0)[1])}`
  for (let i = 0; i < n; i++) {
    const [x0, y0] = p(i - 1)
    const [x1, y1] = p(i)
    const [x2, y2] = p(i + 1)
    const [x3, y3] = p(i + 2)
    const c1x = x1 + (x2 - x0) / 6
    const c1y = y1 + (y2 - y0) / 6
    const c2x = x2 - (x3 - x1) / 6
    const c2y = y2 - (y3 - y1) / 6
    d += `C${fmt(c1x)},${fmt(c1y)} ${fmt(c2x)},${fmt(c2y)} ${fmt(x2)},${fmt(y2)}`
  }
  return d + 'Z'
}

/** An open Catmull-Rom spline through the points (ends are not extrapolated). */
export function smoothOpenPath(points: readonly Pt[]): string {
  const n = points.length
  if (n < 2) return ''
  const p = (i: number) => points[Math.max(0, Math.min(n - 1, i))]!
  let d = `M${fmt(p(0)[0])},${fmt(p(0)[1])}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = p(i - 1)
    const [x1, y1] = p(i)
    const [x2, y2] = p(i + 1)
    const [x3, y3] = p(i + 2)
    d += `C${fmt(x1 + (x2 - x0) / 6)},${fmt(y1 + (y2 - y0) / 6)} ${fmt(x2 - (x3 - x1) / 6)},${fmt(y2 - (y3 - y1) / 6)} ${fmt(x2)},${fmt(y2)}`
  }
  return d
}

/**
 * Offsets a smooth closed ring by `d` (positive = outwards) along the averaged vertex normals. Good
 * enough for gently curved outlines such as coastlines; not a general polygon offset.
 */
export function offsetRing(points: readonly Pt[], d: number): Pt[] {
  const n = points.length
  let area = 0
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i]!
    const [x2, y2] = points[(i + 1) % n]!
    area += x1 * y2 - x2 * y1
  }
  // For a positive shoelace area (clockwise on screen, y down) the outward normal of (dx, dy) is (dy, -dx).
  const sign = area > 0 ? 1 : -1
  return points.map((p, i) => {
    const prev = points[(i - 1 + n) % n]!
    const next = points[(i + 1) % n]!
    const nx = sign * (next[1] - prev[1])
    const ny = sign * -(next[0] - prev[0])
    const len = Math.hypot(nx, ny) || 1
    return [p[0] + (d * nx) / len, p[1] + (d * ny) / len] as const
  })
}

function fmt(v: number): string {
  return String(Math.round(v * 10) / 10)
}
