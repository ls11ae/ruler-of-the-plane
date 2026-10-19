import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../geometry/types'
import {
  addRoad,
  anglesAt,
  EMPTY_NETWORK,
  extendTo,
  fullTopologyCount,
  isNearlyOptimal,
  isSettleClose,
  junctionHint,
  lengthOf,
  mergeInto,
  moveJunction,
  neighboursOf,
  nodesOf,
  placeGroups,
  relax,
  removeRoad,
  SETTLE_TOLERANCE,
  splitRoad,
  toDegrees,
  TOLERANCE,
  type JunctionNetwork,
  type SteinerOptimum,
} from './junctions'
import { BICHROMATIC_IDS, LEVEL_IDS, setOf, STEINER_HOW_TO, STEINER_IDS } from './levels'
import { BICHROMATIC_LEVELS, STEINER_LEVELS } from './levels.fixture'
import { kruskal, roadKey, type Road } from './mst'
import { mulberry32 } from '../../random'

const TRIANGLE: Vec2[] = [
  [0, 0],
  [2, 0],
  [1, Math.sqrt(3)],
]
const CENTRE: Vec2 = [1, Math.sqrt(3) / 3]

const placesOf = (level: (typeof STEINER_LEVELS)[number]) => [...level.villages, ...level.castles]
const optimumOf = (level: (typeof STEINER_LEVELS)[number]): SteinerOptimum => level.optimum

describe('editing a network with junctions', () => {
  it('builds a junction, bends a road, merges and prunes', () => {
    let net = extendTo(3, EMPTY_NETWORK, 0, [1, 0.5])
    expect(net).toEqual({ junctions: [[1, 0.5]], roads: [[0, 3]] })
    net = addRoad(addRoad(net, [1, 3]), [3, 2])
    expect(addRoad(net, [3, 1])).toBe(net)
    expect(placeGroups(3, net)).toBe(1)
    // The junction with three roads, then a bend in one of them.
    const bent = splitRoad(3, net, [2, 3], [1, 1.2])
    expect(bent.junction).toBe(4)
    expect(bent.net.roads.map(roadKey).sort()).toEqual(['0-3', '1-3', '2-4', '3-4'])
    // Dropping the bend onto the first junction takes it back.
    expect(mergeInto(3, bent.net, 4, 3).roads.map(roadKey).sort()).toEqual(['0-3', '1-3', '2-3'])
    // Dropping the first junction onto village 0: roads 0–1 and 0–4 (the loop 0–0 disappears).
    const onPlace = mergeInto(3, bent.net, 3, 0)
    expect(onPlace.junctions).toEqual([[1, 1.2]])
    expect(onPlace.roads.map(roadKey).sort()).toEqual(['0-1', '0-3', '2-3'])
    // Removing a junction's last road removes the junction and renumbers the others.
    let lone = removeRoad(3, removeRoad(3, removeRoad(3, bent.net, [0, 3]), [1, 3]), [3, 4])
    expect(lone).toEqual({ junctions: [[1, 1.2]], roads: [[2, 3]] })
    lone = moveJunction(3, lone, 3, [1, 1])
    expect(lone.junctions).toEqual([[1, 1]])
    expect(placeGroups(3, lone)).toBe(3)
  })

  it('counts the shapes of a network: (2n − 5)!! full topologies', () => {
    expect([3, 4, 5, 6, 7, 8].map(fullTopologyCount)).toEqual([1, 3, 15, 105, 945, 10395])
  })

  it('measures the angles around a node', () => {
    const net: JunctionNetwork = {
      junctions: [CENTRE],
      roads: [
        [0, 3],
        [1, 3],
        [2, 3],
      ],
    }
    const angles = anglesAt(nodesOf(TRIANGLE, net), net.roads, 3)
    expect(angles.map((a) => toDegrees(a.size))).toEqual([
      expect.closeTo(120, 9),
      expect.closeTo(120, 9),
      expect.closeTo(120, 9),
    ])
    expect(anglesAt(TRIANGLE, [[0, 1]], 0)).toEqual([])
    // Two roads: the angle and the reflex angle.
    const two = anglesAt(
      TRIANGLE,
      [
        [0, 1],
        [0, 2],
      ],
      0,
    )
    expect(two.map((a) => Math.round(toDegrees(a.size))).sort()).toEqual([300, 60])
  })

  it('relaxes junctions to 120°: the equilateral triangle and the square', () => {
    const start: JunctionNetwork = {
      junctions: [[0.3, 0.2]],
      roads: [
        [0, 3],
        [1, 3],
        [2, 3],
      ],
    }
    const frames = relax(TRIANGLE, start, 200)
    expect(frames.at(-1)![0]![0]).toBeCloseTo(CENTRE[0], 6)
    expect(frames.at(-1)![0]![1]).toBeCloseTo(CENTRE[1], 6)
    const square: Vec2[] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]
    const net: JunctionNetwork = {
      junctions: [
        [0.4, 0.5],
        [0.6, 0.5],
      ],
      roads: [
        [0, 4],
        [3, 4],
        [4, 5],
        [1, 5],
        [2, 5],
      ],
    }
    const end = relax(square, net, 2000).at(-1)!
    expect(lengthOf(square, { ...net, junctions: end })).toBeCloseTo(1 + Math.sqrt(3), 6)
  })
})

describe('the shipped maps of "Kreuzungen"', () => {
  it('has 6 maps, each optimum with 120° at every junction, shorter than without junctions', () => {
    expect(STEINER_LEVELS.map((l) => l.number)).toEqual([1, 2, 3, 4, 5, 6])
    for (const level of STEINER_LEVELS) {
      const places = placesOf(level)
      const net: JunctionNetwork = {
        junctions: [...level.optimum.junctions],
        roads: [...level.optimum.roads],
      }
      expect(isNearlyOptimal(places, net, level.optimum.length), level.id).toBe(true)
      const nodes = nodesOf(places, net)
      for (let v = places.length; v < nodes.length; v++) {
        expect(neighboursOf(net.roads, v)).toHaveLength(3)
        for (const a of anglesAt(nodes, net.roads, v)) expect(toDegrees(a.size)).toBeCloseTo(120, 0)
      }
      const mst = kruskal(places)
      expect(mst.length).toBeCloseTo(level.mstLength, 5)
      expect(mst.length).toBeGreaterThan(level.optimum.length * (1 + 4 * TOLERANCE))
      expect(isNearlyOptimal(places, { junctions: [], roads: mst.roads }, level.optimum.length)).toBe(false)
    }
  })

  it("starts with a map that is not the how-to's picture: a fork and a road straight on", () => {
    const level = STEINER_LEVELS[0]!
    const n = placesOf(level).length
    expect(n).toBeGreaterThan(STEINER_HOW_TO.points.length)
    expect(level.optimum.junctions).toHaveLength(1)
    expect(level.optimum.roads.filter(([a, b]) => a < n && b < n)).toHaveLength(1)
    // Easy: the junction far from every place (easy to grab), and worth building.
    const [x, y] = level.optimum.junctions[0]!
    for (const [px, py] of placesOf(level)) expect(Math.hypot(px - x, py - y)).toBeGreaterThan(1)
    expect(level.mstLength / level.optimum.length).toBeGreaterThan(1.06)
  })

  it('counts a network within 1 % as optimal, not one further off', () => {
    const level = STEINER_LEVELS[0]!
    const places = placesOf(level)
    const net: JunctionNetwork = { junctions: [...level.optimum.junctions], roads: [...level.optimum.roads] }
    const [x, y] = net.junctions[0]!
    const n = places.length
    expect(isNearlyOptimal(places, moveJunction(n, net, n, [x + 0.2, y]), level.optimum.length)).toBe(true)
    expect(isNearlyOptimal(places, moveJunction(n, net, n, [x + 0.6, y]), level.optimum.length)).toBe(false)
    expect(isNearlyOptimal(places, removeRoad(n, net, net.roads[0]!), level.optimum.length)).toBe(false)
  })
})

/**
 * Networks with the optimum's roads whose junctions are moved off their best spots in random directions
 * (all at once, as a player places them by hand), each just so far that the network is `excess` longer than
 * the optimum: the worst angle at a junction (degrees from 120°) and the furthest junction from its spot.
 */
function offBy(level: (typeof STEINER_LEVELS)[number], excess: number, samples: number) {
  const places = placesOf(level)
  const { optimum } = level
  const rng = mulberry32(level.number)
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng())
  return Array.from({ length: samples }, () => {
    const dirs = optimum.junctions.map(() => [gauss(), gauss()] as const)
    const at = (t: number): JunctionNetwork => ({
      junctions: optimum.junctions.map(([x, y], k) => [x + t * dirs[k]![0], y + t * dirs[k]![1]]),
      roads: [...optimum.roads],
    })
    let [lo, hi] = [0, 1]
    for (let i = 0; i < 50; i++) {
      const t = (lo + hi) / 2
      if (lengthOf(places, at(t)) < optimum.length * (1 + excess)) lo = t
      else hi = t
    }
    const net = at(lo)
    const nodes = nodesOf(places, net)
    const junctions = net.junctions.map((_, k) => places.length + k)
    const angle = Math.max(
      ...junctions.flatMap((v) =>
        anglesAt(nodes, net.roads, v).map((a) => Math.abs(toDegrees(a.size) - 120)),
      ),
    )
    const moved = Math.max(
      ...net.junctions.map(([x, y], k) =>
        Math.hypot(x - optimum.junctions[k]![0], y - optimum.junctions[k]![1]),
      ),
    )
    return { net, angle, moved }
  })
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!

describe('settling on a win in "Kreuzungen"', () => {
  it('settles only networks whose angles are within about 5° of 120°, and moves junctions only a little', () => {
    for (const level of STEINER_LEVELS) {
      const places = placesOf(level)
      const close = offBy(level, SETTLE_TOLERANCE * 0.999, 200)
      for (const { net } of close) expect(isSettleClose(places, net, level.optimum.length)).toBe(true)
      expect(median(close.map((c) => c.angle)), level.id).toBeLessThanOrEqual(5.5)
      expect(Math.max(...close.map((c) => c.angle)), level.id).toBeLessThanOrEqual(8.5)
      expect(Math.max(...close.map((c) => c.moved)), level.id).toBeLessThan(0.12)
      // At 0.2 % (Kevin's starting value) the angles can still be far off: that looked like snapping.
      expect(median(offBy(level, 0.002, 200).map((c) => c.angle)), level.id).toBeGreaterThan(9)
    }
  })

  it('counts a network between the two thresholds as optimal, without settling it', () => {
    for (const level of STEINER_LEVELS) {
      const places = placesOf(level)
      for (const { net } of offBy(level, (SETTLE_TOLERANCE + TOLERANCE) / 2, 20)) {
        expect(isNearlyOptimal(places, net, level.optimum.length)).toBe(true)
        expect(isSettleClose(places, net, level.optimum.length)).toBe(false)
      }
    }
    const level = STEINER_LEVELS[0]!
    const places = placesOf(level)
    const net: JunctionNetwork = { junctions: [...level.optimum.junctions], roads: [...level.optimum.roads] }
    expect(isSettleClose(places, removeRoad(places.length, net, net.roads[0]!), level.optimum.length)).toBe(
      false,
    )
  })
})

/**
 * Plays a map by the hints alone, as a player who does what each hint says: remove a marked road, take
 * back a marked junction's roads, build a ghost junction or road, move a junction to its best spot.
 */
function followHints(places: Vec2[], optimum: SteinerOptimum, start: JunctionNetwork) {
  let net = start
  const kinds: string[] = []
  for (let i = 0; i < 100; i++) {
    const h = junctionHint(places, net, optimum)
    if (!h) return { net, kinds }
    kinds.push(h.kind)
    switch (h.kind) {
      case 'deadEnd':
      case 'notOptimal':
        net = removeRoad(places.length, net, h.road)
        break
      case 'bend':
      case 'extra':
        for (const v of neighboursOf(net.roads, h.junction))
          net = removeRoad(places.length, net, [v, h.junction])
        break
      case 'missing':
        net = extendTo(places.length, net, h.from, h.at)
        break
      case 'build':
        net = addRoad(net, h.road)
        break
      case 'angle': {
        const end = relax(places, net, 50).at(-1)!
        net = moveJunction(places.length, net, h.junction, end[h.junction - places.length]!)
        break
      }
    }
  }
  throw new Error(`hints do not lead to the optimum: ${kinds.join(' ')}`)
}

describe('hints of "Kreuzungen"', () => {
  it('lead from no roads, from the network without junctions and from a wrong one to the optimum', () => {
    for (const level of STEINER_LEVELS) {
      const places = placesOf(level)
      const optimum = optimumOf(level)
      const mst: JunctionNetwork = { junctions: [], roads: kruskal(places).roads }
      // A wrong start: a junction with two roads, one with one road, both far from the optimum's.
      let wrong = extendTo(places.length, mst, 0, [places[0]![0] + 0.3, places[0]![1] + 1.2])
      wrong = addRoad(wrong, [1, places.length])
      wrong = extendTo(places.length, wrong, 2, [places[2]![0] - 0.4, places[2]![1] - 0.9])
      for (const start of [EMPTY_NETWORK, mst, wrong]) {
        const { net, kinds } = followHints(places, optimum, start)
        expect(isNearlyOptimal(places, net, optimum.length), `${level.id}: ${kinds.join(' ')}`).toBe(true)
      }
    }
  })

  it('names a junction with two roads, a dead end, and an off-centre junction', () => {
    const optimum: SteinerOptimum = {
      junctions: [CENTRE],
      roads: [
        [0, 3],
        [1, 3],
        [2, 3],
      ],
      length: Math.sqrt(3) * 2,
    }
    // Far from the centre, so it matches no junction of the optimum.
    const bend: JunctionNetwork = {
      junctions: [[1, -1]],
      roads: [
        [0, 3],
        [1, 3],
      ],
    }
    expect(junctionHint(TRIANGLE, bend, optimum)).toEqual({ kind: 'bend', junction: 3 })
    const deadEnd = extendTo(3, { junctions: [], roads: [[0, 1]] }, 2, [1, 3])
    expect(junctionHint(TRIANGLE, deadEnd, optimum)).toEqual({ kind: 'deadEnd', road: [2, 3] satisfies Road })
    expect(junctionHint(TRIANGLE, EMPTY_NETWORK, optimum)).toMatchObject({ kind: 'missing', at: CENTRE })
    const off: JunctionNetwork = { ...optimum, junctions: [[1.3, 0.3]], roads: [...optimum.roads] }
    expect(junctionHint(TRIANGLE, off, optimum)).toEqual({ kind: 'angle', junction: 3 })
    expect(junctionHint(TRIANGLE, { ...off, junctions: [CENTRE] }, optimum)).toBeNull()
  })
})

describe('the sets of "Straßenbau"', () => {
  it('lists every shipped map of the new sets, in order', () => {
    expect(STEINER_IDS).toEqual(STEINER_LEVELS.map((l) => l.id))
    expect(BICHROMATIC_IDS).toEqual(BICHROMATIC_LEVELS.map((l) => l.id))
    expect(setOf(0)).toEqual({ set: 'mst', index: 0, count: 8 })
    expect(setOf(8)).toEqual({ set: 'steiner', index: 0, count: 6 })
    expect(setOf(19)).toEqual({ set: 'bichromatic', index: 5, count: 6 })
    expect(LEVEL_IDS).toHaveLength(20)
  })
})
