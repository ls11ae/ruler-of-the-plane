import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../geometry/types'
import { mulberry32, type Rng } from '../../random'
import {
  canFinish,
  criticalValues,
  decide,
  freeInterval,
  frechetDistance,
  optimalWalk,
  walkFor,
  walkLeash,
  withSlack,
} from './frechet'
import { distance, makePath, pointAt, simplify, tailFrom, type Path } from './path'

function randomCurve(rng: Rng, segments: number): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i <= segments; i++) pts.push([rng() * 10, rng() * 10])
  return pts
}

/** Points every h along the path, always including its vertices. */
function sample(path: Path, h: number): Vec2[] {
  const out: Vec2[] = []
  for (let i = 0; i + 1 < path.points.length; i++) {
    const a = path.cumulative[i]!
    const b = path.cumulative[i + 1]!
    const n = Math.max(1, Math.ceil((b - a) / h))
    for (let k = 0; k < n; k++) out.push(pointAt(path, a + ((b - a) * k) / n))
  }
  out.push(path.points[path.points.length - 1]!)
  return out
}

/** Discrete Fréchet distance (Eiter and Mannila), O(nm). */
function discreteFrechet(A: readonly Vec2[], B: readonly Vec2[]): number {
  const m = B.length
  let prev = new Float64Array(m)
  let cur = new Float64Array(m)
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < m; j++) {
      const d = distance(A[i]!, B[j]!)
      if (i === 0 && j === 0) cur[j] = d
      else if (i === 0) cur[j] = Math.max(cur[j - 1]!, d)
      else if (j === 0) cur[j] = Math.max(prev[j]!, d)
      else cur[j] = Math.max(Math.min(prev[j]!, prev[j - 1]!, cur[j - 1]!), d)
    }
    ;[prev, cur] = [cur, prev]
  }
  return prev[m - 1]!
}

describe('freeInterval', () => {
  it('finds the part of a segment within reach of a point', () => {
    expect(freeInterval([5, 1], [0, 0], [10, 0], 2)).toEqual([
      expect.closeTo(0.5 - Math.sqrt(3) / 10, 12),
      expect.closeTo(0.5 + Math.sqrt(3) / 10, 12),
    ])
    expect(freeInterval([5, 3], [0, 0], [10, 0], 2)).toBeNull()
    expect(freeInterval([0, 0], [1, 0], [1, 0], 1)).toEqual([0, 1])
    expect(freeInterval([0, 0], [1, 0], [1, 0], 0.5)).toBeNull()
  })
})

describe('Fréchet distance', () => {
  it('of a segment and itself is 0, of two parallel segments their distance', () => {
    expect(
      frechetDistance(
        [
          [0, 0],
          [4, 0],
        ],
        [
          [0, 0],
          [4, 0],
        ],
      ),
    ).toBeCloseTo(0, 12)
    expect(
      frechetDistance(
        [
          [0, 0],
          [4, 0],
        ],
        [
          [0, 3],
          [4, 3],
        ],
      ),
    ).toBeCloseTo(3, 12)
  })

  it('needs the waiting person: a dog that runs out and back', () => {
    // The dog runs 4 to the right and back while the person stands still and then walks 1.
    const P: Vec2[] = [
      [0, 0],
      [1, 0],
    ]
    const Q: Vec2[] = [
      [0, 0],
      [4, 0],
      [1, 0],
    ]
    // Best: the person walks to 1 while the dog goes out; then the dog's farthest point is 3 away.
    expect(frechetDistance(P, Q)).toBeCloseTo(3, 9)
  })

  it('matches the discrete Fréchet distance of densely sampled random curves', () => {
    const rng = mulberry32(2026)
    for (let trial = 0; trial < 60; trial++) {
      const P = randomCurve(rng, 1 + Math.floor(rng() * 6))
      const Q = randomCurve(rng, 1 + Math.floor(rng() * 6))
      const d = frechetDistance(P, Q)
      const h = 0.04
      const dd = discreteFrechet(sample(makePath(P), h), sample(makePath(Q), h))
      // Sampling with spacing h (vertices included): d ≤ discrete ≤ d + h.
      expect(dd).toBeGreaterThanOrEqual(d - 1e-9)
      expect(dd).toBeLessThanOrEqual(d + h + 1e-9)
    }
  })

  it('is a critical value, and the decision flips exactly there', () => {
    const rng = mulberry32(7)
    for (let trial = 0; trial < 60; trial++) {
      const P = randomCurve(rng, 1 + Math.floor(rng() * 8))
      const Q = randomCurve(rng, 1 + Math.floor(rng() * 8))
      const d = frechetDistance(P, Q)
      expect(criticalValues(P, Q)).toContain(d)
      expect(decide(P, Q, withSlack(d))).toBe(true)
      expect(decide(P, Q, d * (1 - 1e-6) - 1e-9)).toBe(false)
      expect(decide(P, Q, d + 0.5)).toBe(true)
      expect(decide(P, Q, Math.max(0, d - 0.5))).toBe(
        d < 0.5 + 1e-12 ? decide(P, Q, Math.max(0, d - 0.5)) : false,
      )
    }
  })

  it('handles paths with 20 segments quickly', () => {
    const rng = mulberry32(99)
    const P = randomCurve(rng, 20)
    const Q = randomCurve(rng, 20)
    const start = performance.now()
    const d = frechetDistance(P, Q)
    expect(performance.now() - start).toBeLessThan(500)
    const h = 0.05
    expect(discreteFrechet(sample(makePath(P), h), sample(makePath(Q), h))).toBeLessThanOrEqual(d + h + 1e-9)
  })
})

describe('walks', () => {
  it('the optimal walk is monotone, starts and ends right and needs only the Fréchet distance', () => {
    const rng = mulberry32(11)
    for (let trial = 0; trial < 60; trial++) {
      const P = randomCurve(rng, 1 + Math.floor(rng() * 7))
      const Q = randomCurve(rng, 1 + Math.floor(rng() * 7))
      const pathP = makePath(P)
      const pathQ = makePath(Q)
      const { distance: d, walk } = optimalWalk(P, Q)
      expect(walk[0]).toEqual([0, 0])
      const [s, t] = walk[walk.length - 1]!
      expect(s).toBeCloseTo(pathP.length, 9)
      expect(t).toBeCloseTo(pathQ.length, 9)
      for (let k = 1; k < walk.length; k++) {
        expect(walk[k]![0]).toBeGreaterThanOrEqual(walk[k - 1]![0] - 1e-12)
        expect(walk[k]![1]).toBeGreaterThanOrEqual(walk[k - 1]![1] - 1e-12)
      }
      expect(walkLeash(pathP, pathQ, walk)).toBeLessThanOrEqual(d + 1e-6)
    }
  })

  it('copes with ties: vertices on a small grid, repeated points, collinear runs', () => {
    const rng = mulberry32(5)
    for (let trial = 0; trial < 300; trial++) {
      const grid = (n: number): Vec2[] =>
        Array.from({ length: n + 1 }, () => [Math.floor(rng() * 5), Math.floor(rng() * 5)] as const)
      const P = grid(1 + Math.floor(rng() * 10))
      const Q = grid(1 + Math.floor(rng() * 10))
      const { distance: d, walk } = optimalWalk(P, Q)
      expect(walk).not.toBeNull()
      expect(walkLeash(makePath(P), makePath(Q), walk)).toBeLessThanOrEqual(d + 1e-6)
    }
  })

  it('a longer leash allows a walk, a too short one none', () => {
    const P: Vec2[] = [
      [0, 0],
      [5, 0],
      [5, 5],
    ]
    const Q: Vec2[] = [
      [0, 1],
      [3, 4],
      [6, 6],
    ]
    const d = frechetDistance(P, Q)
    expect(walkFor(P, Q, d + 1)).not.toBeNull()
    expect(walkFor(P, Q, d * 0.9)).toBeNull()
  })

  it('knows from which positions the walk can still be finished', () => {
    const P = makePath([
      [0, 0],
      [10, 0],
    ])
    const Q = makePath([
      [0, 1],
      [10, 1],
    ])
    // Leash 2: the person may run at most √3 ahead of the dog.
    expect(canFinish(P, Q, 1.5, 0, 2)).toBe(true)
    expect(canFinish(P, Q, 3, 0, 2)).toBe(false)
    expect(canFinish(P, Q, 10, 10, 2)).toBe(true)
    expect(canFinish(P, Q, 10, 9, 2)).toBe(true)
  })
})

describe('paths', () => {
  it('measures arc length and cuts tails', () => {
    const path = makePath([
      [0, 0],
      [3, 4],
      [3, 10],
    ])
    expect(path.length).toBe(11)
    expect(pointAt(path, 2.5)).toEqual([1.5, 2])
    expect(pointAt(path, 8)).toEqual([3, 7])
    expect(tailFrom(path, 5)).toEqual([
      [3, 4],
      [3, 10],
    ])
    expect(tailFrom(path, 11)).toEqual([
      [3, 10],
      [3, 10],
    ])
  })

  it('simplifies a drawn line to a budget of segments, keeping the corners', () => {
    const drawn: Vec2[] = []
    for (let i = 0; i <= 50; i++) drawn.push([i, 0])
    for (let i = 1; i <= 50; i++) drawn.push([50, i])
    const simple = simplify(drawn, 4)
    expect(simple.length).toBeLessThanOrEqual(5)
    expect(simple).toContainEqual([50, 0])
  })
})
