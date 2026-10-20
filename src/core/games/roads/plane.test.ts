import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../geometry/types'
import { BICHROMATIC_LEVELS } from './levels.fixture'
import { componentCount, NEAR_OPTIMAL, networkLength, roadKey, type Road } from './mst'
import {
  crossings,
  freeTree,
  greedyPlane,
  isPlaneOptimal,
  joinsTwoKinds,
  planeHint,
  roadsCross,
  twoKindRoads,
} from './plane'

/** The shortest crossing-free castle–village spanning tree by trying every set of n − 1 roads. */
function bruteForce(points: readonly Vec2[], villages: number): number {
  const all = twoKindRoads(points, villages).map((r) => r.road)
  const n = points.length
  let best = Infinity
  const pick: Road[] = []
  const go = (from: number) => {
    if (pick.length === n - 1) {
      if (componentCount(n, pick) === 1 && crossings(points, pick).length === 0) {
        best = Math.min(best, networkLength(points, pick))
      }
      return
    }
    for (let i = from; i <= all.length - (n - 1 - pick.length); i++) {
      // A road that crosses one already picked can never be in the same network.
      if (pick.some((r) => roadsCross(points, r, all[i]!))) continue
      pick.push(all[i]!)
      go(i + 1)
      pick.pop()
    }
  }
  go(0)
  return best
}

describe('Zwei Sorten', () => {
  it('crossings: roads that meet at a place do not cross', () => {
    const points: Vec2[] = [
      [0, 0],
      [2, 2],
      [0, 2],
      [2, 0],
      [1, -1],
    ]
    expect(roadsCross(points, [0, 1], [2, 3])).toBe(true)
    expect(roadsCross(points, [0, 1], [0, 3])).toBe(false)
    expect(roadsCross(points, [0, 4], [2, 3])).toBe(false)
    expect(
      crossings(points, [
        [0, 1],
        [2, 3],
      ])[0]!.at,
    ).toEqual([1, 1])
    expect(joinsTwoKinds([0, 3], 2)).toBe(true)
    expect(joinsTwoKinds([0, 1], 2)).toBe(false)
  })

  it('six maps; the crossing rule matters and the greedy strategy falls short on each', () => {
    expect(BICHROMATIC_LEVELS.map((l) => l.number)).toEqual([1, 2, 3, 4, 5, 6])
    for (const level of BICHROMATIC_LEVELS) {
      const points = [...level.villages, ...level.castles]
      const v = level.villages.length
      expect(isPlaneOptimal(points, v, level.optimum.roads, level.optimum.length)).toBe(true)
      const free = freeTree(points, v)
      expect(crossings(points, free).length).toBeGreaterThanOrEqual(2)
      expect(networkLength(points, free)).toBeLessThan(level.optimum.length)
      const greedy = greedyPlane(points, v)
      expect(greedy.stuck || networkLength(points, greedy.roads) > level.optimum.length * 1.03).toBe(true)
      // Neither of them counts as optimal.
      expect(isPlaneOptimal(points, v, free, level.optimum.length)).toBe(false)
      expect(isPlaneOptimal(points, v, greedy.roads, level.optimum.length)).toBe(false)
    }
  })

  it('counts a plane network at most 0.5 % longer than the optimum as optimal in the game', () => {
    const counted = (id: string) => {
      const level = BICHROMATIC_LEVELS.find((l) => l.id === id)!
      const points = [...level.villages, ...level.castles]
      const v = level.villages.length
      const tree = level.optimum.roads as Road[]
      // The shortest plane network one road away from the optimum.
      let best: { roads: Road[]; over: number } | null = null
      for (let a = 0; a < v; a++) {
        for (let b = v; b < points.length; b++) {
          if (tree.some((r) => roadKey(r) === roadKey([a, b]))) continue
          for (const out of tree) {
            const roads = [...tree.filter((r) => r !== out), [a, b] as Road]
            if (componentCount(points.length, roads) !== 1 || crossings(points, roads).length) continue
            const over = networkLength(points, roads) / level.optimum.length - 1
            if (!best || over < best.over) best = { roads, over }
          }
        }
      }
      return {
        over: best!.over,
        exact: isPlaneOptimal(points, v, best!.roads, level.optimum.length),
        near: isPlaneOptimal(points, v, best!.roads, level.optimum.length, NEAR_OPTIMAL),
      }
    }
    // "Mark": 0.42 % longer, counts; "Königreich": 0.84 % longer, does not.
    expect(counted('roads/bichromatic/3-mark')).toMatchObject({ exact: false, near: true })
    expect(counted('roads/bichromatic/3-mark').over).toBeCloseTo(0.0042, 4)
    expect(counted('roads/bichromatic/6-koenigreich')).toMatchObject({ exact: false, near: false })
  })

  it('the stored optimum of the small maps (up to 8 places) agrees with brute force', () => {
    const small = BICHROMATIC_LEVELS.filter((l) => l.villages.length + l.castles.length <= 8)
    expect(small.length).toBeGreaterThanOrEqual(3)
    for (const level of small) {
      const points = [...level.villages, ...level.castles]
      expect(bruteForce(points, level.villages.length)).toBeCloseTo(level.optimum.length, 6)
    }
  })

  it('following the hints from the greedy network ends at the optimum', () => {
    for (const level of BICHROMATIC_LEVELS) {
      const points = [...level.villages, ...level.castles]
      const v = level.villages.length
      let roads: Road[] = greedyPlane(points, v).roads
      for (let step = 0; step < 40 && !isPlaneOptimal(points, v, roads, level.optimum.length); step++) {
        const h = planeHint(points, roads, level.optimum.roads)!
        roads = h.kind === 'build' ? [...roads, h.road] : roads.filter((r) => roadKey(r) !== roadKey(h.road))
      }
      expect(isPlaneOptimal(points, v, roads, level.optimum.length)).toBe(true)
    }
  })
})
