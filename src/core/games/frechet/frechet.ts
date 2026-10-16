import type { Vec2 } from '../../geometry/types'
import { distance, makePath, pointAt, pointSegmentDistance, tailFrom, toArcLength, type Path } from './path'

/**
 * Fréchet distance of two polylines (Alt and Godau 1995). A person walks along P and a dog along Q,
 * both only forwards; the Fréchet distance is the shortest leash that allows such a walk.
 *
 * Parameter space ("free-space diagram"): x ∈ [0, p] runs along P (vertex i at x = i), y ∈ [0, q]
 * along Q. Cell (i, j) pairs segment i of P with segment j of Q; its free space {|P(x) − Q(y)| ≤ ε} is
 * convex (an ellipse cut by the cell). A leash of length ε allows a walk iff a path that never goes
 * left or down leads from (0, 0) to (p, q) through free space. The decision propagates the reachable
 * parts of the cell boundaries cell by cell, in O(pq).
 */

/** A closed interval within [0, 1] on a cell boundary, or null if empty. */
export type Interval = readonly [lo: number, hi: number] | null

/** Where on segment ab a point within ε of c lies: {t ∈ [0, 1] : |a + t(b − a) − c| ≤ ε}. */
export function freeInterval(c: Vec2, a: Vec2, b: Vec2, eps: number): Interval {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const fx = a[0] - c[0]
  const fy = a[1] - c[1]
  const A = dx * dx + dy * dy
  const C = fx * fx + fy * fy - eps * eps
  if (A === 0) return C <= 0 ? [0, 1] : null
  const B = 2 * (fx * dx + fy * dy)
  const disc = B * B - 4 * A * C
  if (disc < 0) return null
  const root = Math.sqrt(disc)
  const lo = Math.max(0, (-B - root) / (2 * A))
  const hi = Math.min(1, (-B + root) / (2 * A))
  return lo <= hi ? [lo, hi] : null
}

/** The reachable parts of all cell boundaries for one leash length. */
export interface Reachability {
  eps: number
  /** `left[i][j]`: reachable part of the vertical boundary x = i, y ∈ [j, j + 1] (i ≤ p, j < q). */
  left: Interval[][]
  /** `bottom[i][j]`: reachable part of the horizontal boundary y = j, x ∈ [i, i + 1] (i < p, j ≤ q). */
  bottom: Interval[][]
  /** True if the end (p, q) is reachable: a walk with this leash exists. */
  ok: boolean
}

const startsAt0 = (iv: Interval) => iv !== null && iv[0] === 0
const reaches1 = (iv: Interval) => iv !== null && iv[1] === 1
const from = (iv: Interval, lo: number): Interval => (iv && iv[1] >= lo ? [Math.max(iv[0], lo), iv[1]] : null)

/** Propagates reachability through the free-space diagram of P and Q for leash length eps. */
export function reachability(P: readonly Vec2[], Q: readonly Vec2[], eps: number): Reachability {
  const p = P.length - 1
  const q = Q.length - 1
  const left: Interval[][] = Array.from({ length: p + 1 }, () => new Array<Interval>(q).fill(null))
  const bottom: Interval[][] = Array.from({ length: p }, () => new Array<Interval>(q + 1).fill(null))
  const result = { eps, left, bottom, ok: false }
  if (distance(P[0]!, Q[0]!) > eps) return result

  // Along the lower and the left edge of the diagram only one walker moves, from the start.
  for (let j = 0, open = true; j < q && open; j++) {
    const iv = freeInterval(P[0]!, Q[j]!, Q[j + 1]!, eps)
    if (!startsAt0(iv)) break
    left[0]![j] = iv
    open = reaches1(iv)
  }
  for (let i = 0, open = true; i < p && open; i++) {
    const iv = freeInterval(Q[0]!, P[i]!, P[i + 1]!, eps)
    if (!startsAt0(iv)) break
    bottom[i]![0] = iv
    open = reaches1(iv)
  }

  for (let i = 0; i < p; i++) {
    for (let j = 0; j < q; j++) {
      const l = left[i]![j]!
      const b = bottom[i]![j]!
      if (!l && !b) continue
      // Free space in a cell is convex: from a reachable point, every free point up and to the right
      // of it on the cell's boundary is reachable by a straight line.
      const right = freeInterval(P[i + 1]!, Q[j]!, Q[j + 1]!, eps)
      left[i + 1]![j] = b ? right : from(right, l![0])
      const top = freeInterval(Q[j + 1]!, P[i]!, P[i + 1]!, eps)
      bottom[i]![j + 1] = l ? top : from(top, b![0])
    }
  }
  result.ok = distance(P[p]!, Q[q]!) <= eps && (reaches1(left[p]![q - 1]!) || reaches1(bottom[p - 1]![q]!))
  return result
}

/** Is there a walk of P and Q with a leash of length eps? */
export function decide(P: readonly Vec2[], Q: readonly Vec2[], eps: number): boolean {
  return reachability(P, Q, eps).ok
}

/** Slack for deciding at a critical value, where the free space just touches (rounding errors). */
export const withSlack = (eps: number) => eps + 1e-9 * (1 + eps)

/**
 * Candidates for the Fréchet distance (Alt and Godau): (a) the distance of the two starts and of the two
 * ends; (b) a vertex of one path and its distance to a segment of the other (a passage opens on a cell
 * boundary); (c) two vertices of one path and the point of a segment of the other at equal distance
 * from both (a passage opens between two boundaries of a row or column, needed for monotonicity).
 * Sorted, without duplicates, only values ≥ (a).
 */
export function criticalValues(P: readonly Vec2[], Q: readonly Vec2[]): number[] {
  const low = Math.max(distance(P[0]!, Q[0]!), distance(P[P.length - 1]!, Q[Q.length - 1]!))
  const values = [low]
  const add = (v: number) => {
    if (v > low && Number.isFinite(v)) values.push(v)
  }
  for (const [A, B] of [
    [P, Q],
    [Q, P],
  ] as const) {
    for (let j = 0; j + 1 < B.length; j++) {
      const a = B[j]!
      const b = B[j + 1]!
      for (let k = 0; k < A.length; k++) {
        add(pointSegmentDistance(A[k]!, a, b))
        for (let l = k + 1; l < A.length; l++) add(bisectorValue(A[k]!, A[l]!, a, b))
      }
    }
  }
  values.sort((x, y) => x - y)
  return values.filter((v, i) => i === 0 || v - values[i - 1]! > 1e-12)
}

/** Distance to u (and v) of the point on segment ab equidistant from u and v; NaN if there is none. */
function bisectorValue(u: Vec2, v: Vec2, a: Vec2, b: Vec2): number {
  // |a + t(b − a) − u|² = |a + t(b − a) − v|²  ⇔  2t (b − a)·(v − u) = |v|² − |u|² − 2a·(v − u)
  const wx = v[0] - u[0]
  const wy = v[1] - u[1]
  const denom = 2 * ((b[0] - a[0]) * wx + (b[1] - a[1]) * wy)
  if (Math.abs(denom) < 1e-15) return NaN
  const t = (v[0] * v[0] + v[1] * v[1] - u[0] * u[0] - u[1] * u[1] - 2 * (a[0] * wx + a[1] * wy)) / denom
  if (t < 0 || t > 1) return NaN
  return distance([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], u)
}

/**
 * The Fréchet distance: the smallest critical value that allows a walk (binary search over the sorted
 * candidates, a few dozen decisions).
 */
export function frechetDistance(P: readonly Vec2[], Q: readonly Vec2[]): number {
  const values = criticalValues(P, Q)
  let lo = 0
  let hi = values.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (decide(P, Q, withSlack(values[mid]!))) hi = mid
    else lo = mid + 1
  }
  return values[lo]!
}

/** A walk: positions (person, dog) as arc lengths, both never decreasing. */
export type Walk = [s: number, t: number][]

/**
 * A walk with leash at most eps, if there is one: traced back from the end through the reachable
 * boundaries, each step a straight line through one cell. Among the possible steps it takes the one
 * closest to "both walk at the same speed", so the walk looks like what a careful player would do.
 */
export function walkFor(P: readonly Vec2[], Q: readonly Vec2[], eps: number): Walk | null {
  const reach = reachability(P, Q, eps)
  if (!reach.ok) return null
  const pathP = makePath(P)
  const pathQ = makePath(Q)
  const lenP = (i: number) => pathP.cumulative[i + 1]! - pathP.cumulative[i]!
  const lenQ = (j: number) => pathQ.cumulative[j + 1]! - pathQ.cumulative[j]!
  const p = P.length - 1
  const q = Q.length - 1
  const points: [number, number][] = [[p, q]]
  let x = p
  let y = q
  for (let guard = 0; guard < 4 * (p + q) + 8 && (x > 0 || y > 0); guard++) {
    if (x === 0 || y === 0) {
      points.push([0, 0])
      break
    }
    // The cell to step back into: below and to the left of (x, y).
    const i = Math.ceil(x) - 1
    const j = Math.ceil(y) - 1
    const u = x - i
    const v = y - j
    const wP = lenP(i)
    const wQ = lenQ(j)
    const l = reach.left[i]![j]!
    const b = reach.bottom[i]![j]!
    const options: [number, number][] = []
    // Back along the diagonal (both walk) until the left or the bottom boundary, then clamped into the
    // reachable part of that boundary (with a little tolerance: x − i loses the last bits).
    const tol = 1e-9
    if (l && l[0] <= v + tol) {
      const ideal = v - (u * wP) / (wQ || 1)
      options.push([i, j + clamp(ideal, l[0], Math.max(l[0], Math.min(l[1], v)))])
    }
    if (b && b[0] <= u + tol) {
      const ideal = u - (v * wQ) / (wP || 1)
      options.push([i + clamp(ideal, b[0], Math.max(b[0], Math.min(b[1], u))), j])
    }
    if (options.length === 0) return null
    const slope = ([ox, oy]: [number, number]) => {
      const ds = (x - ox) * wP
      const dt = (y - oy) * wQ
      return Math.abs(Math.atan2(dt, ds) - Math.PI / 4)
    }
    options.sort((m, n) => slope(m) - slope(n))
    ;[x, y] = options[0]!
    points.push([x, y])
  }
  points.reverse()
  const walk: Walk = points.map(([px, py]) => [toArcLength(pathP, px), toArcLength(pathQ, py)])
  // Remove the rounding wobble of the tolerance above: never a step back.
  for (let k = 1; k < walk.length; k++) {
    walk[k] = [Math.max(walk[k]![0], walk[k - 1]![0]), Math.max(walk[k]![1], walk[k - 1]![1])]
  }
  return walk
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** The walk of the computer: one that needs only the Fréchet distance as its leash. */
export function optimalWalk(P: readonly Vec2[], Q: readonly Vec2[]): { distance: number; walk: Walk } {
  const d = frechetDistance(P, Q)
  return { distance: d, walk: walkFor(P, Q, withSlack(d))! }
}

/**
 * The longest leash a walk needs. Within one cell the distance along a straight step is convex, so its
 * maximum is at a corner of the step; steps are split at the vertices of both paths.
 */
export function walkLeash(P: Path, Q: Path, walk: Walk): number {
  let worst = 0
  for (const [s, t] of walk) worst = Math.max(worst, distance(pointAt(P, s), pointAt(Q, t)))
  for (let k = 1; k < walk.length; k++) {
    const [s0, t0] = walk[k - 1]!
    const [s1, t1] = walk[k]!
    const cuts = new Set<number>()
    for (const c of P.cumulative) if (c > s0 && c < s1) cuts.add((c - s0) / (s1 - s0))
    for (const c of Q.cumulative) if (c > t0 && c < t1) cuts.add((c - t0) / (t1 - t0))
    for (const f of cuts) {
      worst = Math.max(worst, distance(pointAt(P, s0 + f * (s1 - s0)), pointAt(Q, t0 + f * (t1 - t0))))
    }
  }
  return worst
}

/** Can the walk still be finished from positions (s, t) with a leash of length eps? */
export function canFinish(P: Path, Q: Path, s: number, t: number, eps: number): boolean {
  return decide(tailFrom(P, s), tailFrom(Q, t), eps)
}
