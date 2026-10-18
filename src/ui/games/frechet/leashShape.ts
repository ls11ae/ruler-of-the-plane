import type { Vec2 } from '../../../core/geometry/types'

/** Screen down in board coordinates (the board may be turned by 90° on a phone). */
export const screenDown = (rotation: 0 | 90): Vec2 => (rotation === 90 ? [1, 0] : [0, 1])

/** How hard the leash pulls (0 below 90 % of its length, 1 when taut). */
export const strainOf = (tension: number) => Math.min(1, Math.max(0, (tension - 0.9) / 0.1))

/** The unit vector from a towards b (zero if they coincide). */
export function towards(a: Vec2, b: Vec2): Vec2 {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1])
  return d > 0 ? [(b[0] - a[0]) / d, (b[1] - a[1]) / d] : [0, 0]
}

/** Length of a polyline. */
export function polylineLength(pts: readonly Vec2[]): number {
  let sum = 0
  for (let i = 1; i < pts.length; i++)
    sum += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1])
  return sum
}

/** A cubic Bézier from a to b that hangs by `depth` towards `down`, sampled at n + 1 points. */
function hanging(a: Vec2, b: Vec2, depth: number, down: Vec2, n: number): Vec2[] {
  const cx = b[0] - a[0]
  const cy = b[1] - a[1]
  // The control points spread outwards (along the chord, and sideways by a quarter of the sag), so
  // that a deep sag ends in a round bottom, not a narrow V.
  const side = cx * -down[1] + cy * down[0] >= 0 ? 1 : -1
  const hx = -down[1] * side * 0.25 * depth
  const hy = down[0] * side * 0.25 * depth
  const spread = 0.12
  const p1: Vec2 = [a[0] + down[0] * depth - cx * spread - hx, a[1] + down[1] * depth - cy * spread - hy]
  const p2: Vec2 = [b[0] + down[0] * depth + cx * spread + hx, b[1] + down[1] * depth + cy * spread + hy]
  const out: Vec2[] = []
  for (let k = 0; k <= n; k++) {
    const u = k / n
    const v = 1 - u
    const w0 = v * v * v
    const w1 = 3 * v * v * u
    const w2 = 3 * v * u * u
    const w3 = u * u * u
    out.push([
      w0 * a[0] + w1 * p1[0] + w2 * p2[0] + w3 * b[0],
      w0 * a[1] + w1 * p1[1] + w2 * p2[1] + w3 * b[1],
    ])
  }
  return out
}

/**
 * A slack piece of leash from a to b, drawn with its real length: a curve of about `length` that hangs
 * towards `down` (screen down: a leash held loosely sags), found by halving the sag. Straight when the
 * piece is (nearly) taut.
 */
export function slackPiece(a: Vec2, b: Vec2, length: number, down: Vec2, n = 16): Vec2[] {
  const chord = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (length <= chord * 1.002) return [a, b]
  let lo = 0
  let hi = length
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (polylineLength(hanging(a, b, mid, down, n)) < length) lo = mid
    else hi = mid
  }
  return hanging(a, b, lo, down, n)
}

/**
 * The leash drawn with its real length: `pts` is the taut leash (person, trunk corners, dog), `length`
 * the leash's length. The slack goes into the two end pieces (by their length), which hang towards
 * `down`; pieces between trunk corners stay straight.
 */
export function slackLeash(pts: readonly Vec2[], length: number, down: Vec2): Vec2[] {
  const taut = polylineLength(pts)
  const slack = length - taut
  if (slack <= 1e-6) return pts.slice()
  const n = pts.length - 1
  const piece = (i: number) => Math.hypot(pts[i + 1]![0] - pts[i]![0], pts[i + 1]![1] - pts[i]![1])
  if (n === 1) return slackPiece(pts[0]!, pts[1]!, length, down)
  const first = piece(0)
  const last = piece(n - 1)
  const share = first + last > 0 ? first / (first + last) : 0.5
  return [
    ...slackPiece(pts[0]!, pts[1]!, first + slack * share, down),
    ...pts.slice(2, n),
    ...slackPiece(pts[n - 1]!, pts[n]!, last + slack * (1 - share), down).slice(1),
  ].filter((p, i, all) => i === 0 || p !== all[i - 1])
}

/**
 * A taut leash trembling: points along the straight pieces, pushed sideways by up to `amplitude` in a
 * wave that moves with `phase` (0–1). Zero amplitude keeps the polyline.
 */
export function trembling(pts: readonly Vec2[], amplitude: number, phase: number): Vec2[] {
  if (amplitude <= 0) return pts.slice()
  const out: Vec2[] = [pts[0]!]
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]!
    const [bx, by] = pts[i]!
    const d = Math.hypot(bx - ax, by - ay)
    const k = Math.max(2, Math.round(d / (amplitude * 6)))
    const nx = d > 0 ? -(by - ay) / d : 0
    const ny = d > 0 ? (bx - ax) / d : 0
    for (let j = 1; j <= k; j++) {
      const u = j / k
      // Zero at both ends of each piece (hand, trunk corner, collar).
      const off = j === k ? 0 : amplitude * Math.sin(Math.PI * u) * Math.sin(2 * Math.PI * (3 * u + phase))
      out.push([ax + (bx - ax) * u + nx * off, ay + (by - ay) * u + ny * off])
    }
  }
  return out
}
