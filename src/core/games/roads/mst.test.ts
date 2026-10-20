import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../geometry/types'
import { mulberry32 } from '../../random'
import { mapOf, MST_IDS, randomMap } from './levels'
import {
  componentCount,
  hint,
  isOptimal,
  kruskal,
  NEAR_OPTIMAL,
  overOptimum,
  networkLength,
  normalise,
  roadLength,
  roadsByLength,
  type Road,
} from './mst'
import { leaderboardScore, percentOver, starsFor } from './rules'
import { KINGS_TAXES_LEVELS } from './levels.fixture'

/** Every spanning tree of the complete graph, by trying all sets of n − 1 roads (small n only). */
function spanningTrees(points: readonly Vec2[]): Road[][] {
  const all = roadsByLength(points).map((r) => r.road)
  const n = points.length
  const trees: Road[][] = []
  const pick: Road[] = []
  const go = (from: number) => {
    if (pick.length === n - 1) {
      if (componentCount(n, pick) === 1) trees.push([...pick])
      return
    }
    for (let i = from; i <= all.length - (n - 1 - pick.length); i++) {
      pick.push(all[i]!)
      go(i + 1)
      pick.pop()
    }
  }
  go(0)
  return trees
}

const randomPoints = (rng: () => number, n: number): Vec2[] =>
  Array.from({ length: n }, () => [rng() * 6 - 3, rng() * 4 - 2] as const)

describe('Kruskal', () => {
  it('finds the shortest spanning tree (brute force, n ≤ 7)', () => {
    const rng = mulberry32(3)
    for (let trial = 0; trial < 25; trial++) {
      const points = randomPoints(rng, 3 + (trial % 5))
      const best = spanningTrees(points).reduce((m, t) => Math.min(m, networkLength(points, t)), Infinity)
      const mst = kruskal(points)
      expect(mst.length).toBeCloseTo(best, 12)
      expect(mst.roads).toHaveLength(points.length - 1)
      expect(componentCount(points.length, mst.roads)).toBe(1)
    }
  })

  it('finds the shortest spanning tree for 8 villages', () => {
    const points = randomPoints(mulberry32(8), 8)
    const best = spanningTrees(points).reduce((m, t) => Math.min(m, networkLength(points, t)), Infinity)
    expect(kruskal(points).length).toBeCloseTo(best, 12)
  })

  it('takes roads shortest first and skips those that close a ring', () => {
    const points: Vec2[] = [
      [0, 0],
      [1, 0],
      [0.5, 0.8],
      [3, 0],
    ]
    const { steps, roads } = kruskal(points)
    expect(steps.map((s) => s.length)).toEqual([...steps.map((s) => s.length)].sort((a, b) => a - b))
    expect(steps.filter((s) => !s.taken).length).toBeGreaterThan(0)
    expect(roads).toHaveLength(3)
  })
})

describe('optimal networks', () => {
  it('accepts every optimal tree, also with ties (villages on a grid)', () => {
    const grid: Vec2[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ]
    const mst = kruskal(grid).length
    const trees = spanningTrees(grid)
    const optimal = trees.filter((t) => Math.abs(networkLength(grid, t) - mst) < 1e-9)
    expect(optimal.length).toBeGreaterThan(10)
    for (const t of optimal) expect(isOptimal(grid, t, mst)).toBe(true)
    for (const t of trees.filter((t) => networkLength(grid, t) > mst + 1e-9))
      expect(isOptimal(grid, t, mst)).toBe(false)
  })

  it('rejects networks that miss a village or carry an extra road', () => {
    const points = randomPoints(mulberry32(5), 6)
    const { roads, length } = kruskal(points)
    expect(isOptimal(points, roads.slice(1), length)).toBe(false)
    const extra = roadsByLength(points).find(
      (r) => !roads.some((m) => m[0] === r.road[0] && m[1] === r.road[1]),
    )!
    expect(isOptimal(points, [...roads, extra.road], length)).toBe(false)
  })

  it("accepts map 6's other shortest networks, which differ from Kruskal's only by rounding", () => {
    const level = KINGS_TAXES_LEVELS.find((l) => l.id === 'kings-taxes/tsp/ktLevel2')!
    const { points } = mapOf(level)
    const { roads, length } = kruskal(points)
    const swap = (from: readonly Road[], out: Road, into: Road) => [
      ...from.filter((r) => r[0] !== out[0] || r[1] !== out[1]),
      into,
    ]
    const one = swap(roads, [5, 6], [5, 7])
    const other = swap(roads, [7, 9], [6, 7])
    for (const net of [one, other, swap(one, [7, 9], [6, 7])]) {
      expect(componentCount(points.length, net)).toBe(1)
      const over = networkLength(points, net) / length - 1
      // Longer in floating point (a few 1e-8), but as short on the map: optimal, no hint, never "+0,1 %".
      expect(over).toBeGreaterThan(1e-8)
      expect(over).toBeLessThan(1e-7)
      expect(isOptimal(points, net, length)).toBe(true)
      expect(hint(points, net, length)).toBeNull()
      expect(overOptimum(networkLength(points, net), length)).toBe(0)
    }
  })

  it('on every map, a tree one road away from the shortest is as short up to rounding or clearly longer', () => {
    for (const level of KINGS_TAXES_LEVELS) {
      const { points } = mapOf(level)
      const { roads, length } = kruskal(points)
      for (const { road: into } of roadsByLength(points)) {
        if (roads.some((r) => r[0] === into[0] && r[1] === into[1])) continue
        for (const out of roads) {
          const net = [...roads.filter((r) => r !== out), into]
          if (componentCount(points.length, net) !== 1) continue
          const over = networkLength(points, net) / length - 1
          expect(over < 1e-7 || over > 0.002, `${level.id}: ${out} → ${into}: ${over}`).toBe(true)
          expect(isOptimal(points, net, length)).toBe(over < 1e-7)
        }
      }
    }
  })

  it('counts a network at most 0.5 % longer as optimal in the game (maps 5–8: the next-best networks)', () => {
    let near = 0
    for (const id of MST_IDS.slice(4)) {
      const { points } = mapOf(KINGS_TAXES_LEVELS.find((l) => l.id === id)!)
      const { roads, length } = kruskal(points)
      for (const { road: into } of roadsByLength(points)) {
        for (const out of roads) {
          const net = [...roads.filter((r) => r !== out), into]
          if (componentCount(points.length, net) !== 1) continue
          const over = overOptimum(networkLength(points, net), length)
          if (over === 0) continue
          expect(isOptimal(points, net, length)).toBe(false)
          expect(isOptimal(points, net, length, NEAR_OPTIMAL), `${id}: +${over}`).toBe(over <= 0.005)
          if (over <= 0.005) near++
        }
      }
    }
    expect(NEAR_OPTIMAL).toBe(0.005)
    expect(near).toBeGreaterThan(0)
  })

  it('accepts the optimum on every Unity map', () => {
    for (const level of KINGS_TAXES_LEVELS) {
      const { points } = mapOf(level)
      const { roads, length } = kruskal(points)
      expect(isOptimal(points, roads, length), level.id).toBe(true)
    }
  })
})

describe('hints', () => {
  const points: Vec2[] = [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 3],
  ]
  const mst = kruskal(points).length

  it('names the longest road of a ring first', () => {
    const roads: Road[] = [normalise(0, 1), normalise(1, 2), normalise(0, 2), normalise(1, 3)]
    expect(hint(points, roads, mst)).toEqual({ kind: 'ring', road: [0, 2] })
  })

  it('names a road no shortest network uses', () => {
    const roads: Road[] = [normalise(0, 2), normalise(1, 3)]
    expect(hint(points, roads, mst)).toMatchObject({ kind: 'tooLong', road: [0, 2] })
  })

  it('suggests the shortest road between two groups', () => {
    expect(hint(points, [normalise(0, 1)], mst)).toEqual({ kind: 'build', road: [1, 2] })
    expect(hint(points, kruskal(points).roads, mst)).toBeNull()
  })

  it('lead a player who follows them to the optimum', () => {
    const rng = mulberry32(17)
    for (let trial = 0; trial < 30; trial++) {
      const ps = randomPoints(rng, 4 + (trial % 8))
      const best = kruskal(ps).length
      // Start from a random tangle of roads.
      let roads: Road[] = roadsByLength(ps)
        .filter(() => rng() < 0.3)
        .map((r) => r.road)
      for (let i = 0; i < 200; i++) {
        const h = hint(ps, roads, best)
        if (!h) break
        roads =
          h.kind === 'build'
            ? [...roads, h.road]
            : roads.filter((r) => !(r[0] === h.road[0] && r[1] === h.road[1]))
      }
      expect(isOptimal(ps, roads, best)).toBe(true)
    }
  })
})

describe('maps and scoring', () => {
  it('random maps are reproducible and keep the villages apart', () => {
    const a = randomMap(42, 12)
    expect(randomMap(42, 12)).toEqual(a)
    expect(a.points).toHaveLength(12)
    for (let i = 0; i < a.points.length; i++)
      for (let j = i + 1; j < a.points.length; j++)
        expect(roadLength(a.points, [i, j])).toBeGreaterThanOrEqual(0.75)
  })

  it('scores', () => {
    expect([0, 1, 2, 5].map(starsFor)).toEqual([3, 2, 1, 1])
    expect(leaderboardScore(41.4, 1)).toBe(61)
    expect(percentOver(0.0004)).toBe('0.1')
    expect(percentOver(0.123)).toBe('12')
  })
})
