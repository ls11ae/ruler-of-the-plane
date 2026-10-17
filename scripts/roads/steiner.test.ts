import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../src/core/geometry/types'
import { mulberry32 } from '../../src/core/random'
import { anglesAt, fullTopologies, steinerMinimalTree, type SteinerTree } from './steiner'

const dist = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** Length of a minimum spanning tree (Prim). */
function mstLength(points: readonly Vec2[]): number {
  const n = points.length
  const best = new Array<number>(n).fill(Infinity)
  const done = new Array<boolean>(n).fill(false)
  best[0] = 0
  let total = 0
  for (let k = 0; k < n; k++) {
    let v = -1
    for (let i = 0; i < n; i++) if (!done[i] && (v < 0 || best[i]! < best[v]!)) v = i
    done[v] = true
    total += best[v]!
    for (let i = 0; i < n; i++) if (!done[i]) best[i] = Math.min(best[i]!, dist(points[v]!, points[i]!))
  }
  return total
}

/** Checks a Steiner minimal tree's shape: a tree, every junction of degree 3 with three 120° angles. */
function expectSteinerShape(terminals: readonly Vec2[], tree: SteinerTree) {
  const nodes = [...terminals, ...tree.junctions]
  expect(tree.edges).toHaveLength(nodes.length - 1)
  const seen = new Set([0])
  for (let changed = true; changed;) {
    changed = false
    for (const [u, v] of tree.edges) {
      if (seen.has(u) !== seen.has(v)) {
        seen.add(u).add(v)
        changed = true
      }
    }
  }
  expect(seen.size).toBe(nodes.length)
  tree.junctions.forEach((j, i) => {
    const id = terminals.length + i
    const neighbours = tree.edges.filter((e) => e.includes(id)).map(([u, v]) => nodes[u === id ? v : u]!)
    expect(neighbours).toHaveLength(3)
    for (const angle of anglesAt(j, neighbours)) expect(Math.abs(angle - 120)).toBeLessThan(0.5)
  })
  const length = tree.edges.reduce((s, [u, v]) => s + dist(nodes[u]!, nodes[v]!), 0)
  expect(tree.length).toBeCloseTo(length, 9)
}

/** A heuristic for comparison: k junctions placed by random restarts and pattern search, then the MST. */
function heuristic(terminals: readonly Vec2[], seed: number): number {
  const rng = mulberry32(seed)
  const xs = terminals.map((p) => p[0])
  const ys = terminals.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  let best = mstLength(terminals)
  for (let k = 1; k <= terminals.length - 2; k++) {
    for (let restart = 0; restart < 12; restart++) {
      const js: Vec2[] = Array.from({ length: k }, () => [x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0)])
      let value = mstLength([...terminals, ...js])
      for (let step = 0.5; step > 1e-4; step /= 2) {
        for (let improved = true; improved;) {
          improved = false
          for (let i = 0; i < k; i++) {
            for (const [dx, dy] of [
              [step, 0],
              [-step, 0],
              [0, step],
              [0, -step],
            ] as const) {
              const moved = js.slice()
              moved[i] = [js[i]![0] + dx, js[i]![1] + dy]
              const v = mstLength([...terminals, ...moved])
              if (v < value - 1e-12) {
                js.splice(0, k, ...moved)
                value = v
                improved = true
              }
            }
          }
        }
      }
      best = Math.min(best, value)
    }
  }
  return best
}

describe('Steiner minimal trees', () => {
  it('enumerates the (2n − 5)!! full topologies', () => {
    expect([3, 4, 5, 6, 7].map((n) => [...fullTopologies(n)].length)).toEqual([1, 3, 15, 105, 945])
  })

  it('equilateral triangle: one junction in the middle, 13.4 % shorter than the MST', () => {
    const t: Vec2[] = [
      [0, 0],
      [1, 0],
      [0.5, Math.sqrt(3) / 2],
    ]
    const tree = steinerMinimalTree(t)
    expect(tree.length).toBeCloseTo(Math.sqrt(3), 8)
    expect(tree.junctions).toHaveLength(1)
    expect(tree.junctions[0]![0]).toBeCloseTo(0.5, 6)
    expect(tree.junctions[0]![1]).toBeCloseTo(Math.sqrt(3) / 6, 6)
    expect(1 - tree.length / mstLength(t)).toBeCloseTo(0.134, 3)
    expectSteinerShape(t, tree)
  })

  it('square: two junctions, length 1 + √3', () => {
    const t: Vec2[] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]
    const tree = steinerMinimalTree(t)
    expect(tree.length).toBeCloseTo(1 + Math.sqrt(3), 8)
    expect(tree.junctions).toHaveLength(2)
    expectSteinerShape(t, tree)
  })

  it('a triangle with an angle of 120° or more needs no junction', () => {
    const t: Vec2[] = [
      [0, 0],
      [2, 0],
      [1, 0.4],
    ]
    const tree = steinerMinimalTree(t)
    expect(tree.junctions).toHaveLength(0)
    expect(tree.length).toBeCloseTo(mstLength(t), 9)
  })

  it('random villages: between √3/2 of the MST and the MST, never longer than a heuristic', () => {
    const rng = mulberry32(2027)
    for (let trial = 0; trial < 12; trial++) {
      const n = 4 + (trial % 3)
      const t: Vec2[] = Array.from({ length: n }, () => [rng() * 6 - 3, rng() * 4 - 2])
      const tree = steinerMinimalTree(t)
      const mst = mstLength(t)
      expect(tree.length).toBeLessThanOrEqual(mst + 1e-9)
      // Gilbert–Pollak's ratio, proven for up to 6 points.
      expect(tree.length).toBeGreaterThanOrEqual((Math.sqrt(3) / 2) * mst - 1e-9)
      expectSteinerShape(t, tree)
      if (trial < 6) expect(tree.length).toBeLessThanOrEqual(heuristic(t, trial) + 1e-6)
    }
  })
})
