import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../geometry/types'
import {
  addRoad,
  anglesAt,
  EMPTY_NETWORK,
  extendTo,
  fullTopologyCount,
  anglesRight,
  anglesRightOtherShape,
  ANGLE_TOLERANCE,
  hasOptimumShape,
  isSolved,
  junctionHint,
  lengthOf,
  mergeInto,
  moveJunction,
  neighboursOf,
  nodesOf,
  placeGroups,
  relax,
  removeRoad,
  splitRoad,
  toDegrees,
  type JunctionNetwork,
  type SteinerOptimum,
} from './junctions'
import { BICHROMATIC_IDS, LEVEL_IDS, setOf, STEINER_HOW_TO, STEINER_IDS } from './levels'
import { BICHROMATIC_LEVELS, STEINER_LEVELS } from './levels.fixture'
import { kruskal, normalise, roadKey, type Road } from './mst'
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
      expect(isSolved(places, net, level.optimum), level.id).toBe(true)
      const nodes = nodesOf(places, net)
      for (let v = places.length; v < nodes.length; v++) {
        expect(neighboursOf(net.roads, v)).toHaveLength(3)
        for (const a of anglesAt(nodes, net.roads, v)) expect(toDegrees(a.size)).toBeCloseTo(120, 0)
      }
      const mst = kruskal(places)
      expect(mst.length).toBeCloseTo(level.mstLength, 5)
      expect(mst.length).toBeGreaterThan(level.optimum.length * 1.04)
      expect(isSolved(places, { junctions: [], roads: mst.roads }, level.optimum)).toBe(false)
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

  it("is solved with the optimum's shape and every angle within 5° of 120°, not further off", () => {
    const level = STEINER_LEVELS[0]!
    const places = placesOf(level)
    const net: JunctionNetwork = { junctions: [...level.optimum.junctions], roads: [...level.optimum.roads] }
    const [x, y] = net.junctions[0]!
    const n = places.length
    const worst = (moved: JunctionNetwork) =>
      Math.max(
        ...anglesAt(nodesOf(places, moved), moved.roads, n).map((a) => Math.abs(toDegrees(a.size) - 120)),
      )
    // Angles 123°, 120°, 117°: solved. Angles 125°, 129°, 106° (0.35 % longer): not, though within 1 %.
    const close = moveJunction(n, net, n, [x + 0.05, y - 0.03])
    expect(worst(close)).toBeLessThan(ANGLE_TOLERANCE)
    expect(isSolved(places, close, level.optimum)).toBe(true)
    const off = moveJunction(n, net, n, [x + 0.25, y])
    expect(worst(off)).toBeGreaterThan(ANGLE_TOLERANCE)
    expect(lengthOf(places, off)).toBeLessThan(level.optimum.length * 1.01)
    expect(isSolved(places, off, level.optimum)).toBe(false)
    expect(isSolved(places, removeRoad(n, net, net.roads[0]!), level.optimum)).toBe(false)
  })

  it('compares shapes: the same junctions joined to the same places and junctions, in any order', () => {
    for (const level of STEINER_LEVELS) {
      const places = placesOf(level)
      const n = places.length
      const k = level.optimum.junctions.length
      // The junctions numbered the other way round, the roads listed backwards and turned.
      const id = (v: number) => (v < n ? v : n + k - 1 - (v - n))
      const turned: JunctionNetwork = {
        junctions: [...level.optimum.junctions].reverse(),
        roads: [...level.optimum.roads].reverse().map(([a, b]) => normalise(id(b), id(a))),
      }
      expect(hasOptimumShape(n, turned, level.optimum), level.id).toBe(true)
      expect(isSolved(places, turned, level.optimum), level.id).toBe(true)
      // A junction joined to another place instead: another shape, wherever the junctions are.
      const [a, b] = level.optimum.roads.find(([a, b]) => a < n && b >= n)!
      const other = (a + 1) % n
      const swapped: JunctionNetwork = {
        junctions: [...level.optimum.junctions],
        roads: level.optimum.roads.map((r) => (r[0] === a && r[1] === b ? normalise(other, b) : r)),
      }
      if (!level.optimum.roads.some((r) => roadKey(r) === roadKey(normalise(other, b))))
        expect(hasOptimumShape(n, swapped, level.optimum), level.id).toBe(false)
    }
  })

  it('says so when every angle is right but the shape is another (a longer local optimum)', () => {
    // Map 1: the junction joins the three villages instead (at their 120° point); the castle hangs on a village.
    const level = STEINER_LEVELS[0]!
    const places = placesOf(level)
    const n = places.length
    const castle = n - 1
    const start: JunctionNetwork = {
      junctions: [[0, 0]],
      roads: [normalise(0, n), normalise(1, n), normalise(2, n), normalise(0, castle)],
    }
    const local: JunctionNetwork = { ...start, junctions: relax(places, start, 2000).at(-1)! }
    expect(anglesRight(places, local)).toBe(true)
    expect(hasOptimumShape(n, local, level.optimum)).toBe(false)
    expect(anglesRightOtherShape(places, local, level.optimum)).toBe(true)
    expect(isSolved(places, local, level.optimum)).toBe(false)
    expect(lengthOf(places, local)).toBeGreaterThan(level.optimum.length * 1.01)
    // Not said of the optimum's shape, nor of a network that does not join every place.
    const optimum: JunctionNetwork = {
      junctions: [...level.optimum.junctions],
      roads: [...level.optimum.roads],
    }
    expect(anglesRightOtherShape(places, optimum, level.optimum)).toBe(false)
    expect(anglesRightOtherShape(places, removeRoad(n, local, normalise(0, castle)), level.optimum)).toBe(
      false,
    )
  })
})

/**
 * Networks with the optimum's shape whose junctions are moved off their best spots in random directions,
 * just so far that the worst angle at a junction is `degrees` off 120°: how far the furthest junction moved,
 * and how much longer the network is.
 */
function offBy(level: (typeof STEINER_LEVELS)[number], degrees: number, samples: number) {
  const places = placesOf(level)
  const { optimum } = level
  const rng = mulberry32(level.number)
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng())
  const worst = (net: JunctionNetwork) => {
    const nodes = nodesOf(places, net)
    return Math.max(
      ...net.junctions.flatMap((_, k) =>
        anglesAt(nodes, net.roads, places.length + k).map((a) => Math.abs(toDegrees(a.size) - 120)),
      ),
    )
  }
  return Array.from({ length: samples }, () => {
    const raw = optimum.junctions.map(() => [gauss(), gauss()] as const)
    const norm = Math.hypot(...raw.flat())
    const at = (t: number): JunctionNetwork => ({
      junctions: optimum.junctions.map(([x, y], k) => [
        x + (t * raw[k]![0]) / norm,
        y + (t * raw[k]![1]) / norm,
      ]),
      roads: [...optimum.roads],
    })
    let [lo, hi] = [0, 1]
    for (let i = 0; i < 50; i++) {
      const t = (lo + hi) / 2
      if (worst(at(t)) < degrees) lo = t
      else hi = t
    }
    const net = at(lo)
    const moved = Math.max(
      ...net.junctions.map(([x, y], k) =>
        Math.hypot(x - optimum.junctions[k]![0], y - optimum.junctions[k]![1]),
      ),
    )
    return { net, moved, over: lengthOf(places, net) / optimum.length - 1 }
  })
}

describe('the angle rule of "Kreuzungen"', () => {
  it('solves networks just inside 5°, so close that settling moves a junction only a little', () => {
    for (const level of STEINER_LEVELS) {
      const places = placesOf(level)
      const inside = offBy(level, ANGLE_TOLERANCE * 0.99, 100)
      for (const { net } of inside) expect(isSolved(places, net, level.optimum), level.id).toBe(true)
      expect(Math.max(...inside.map((c) => c.moved)), level.id).toBeLessThan(0.25)
      expect(Math.max(...inside.map((c) => c.over)), level.id).toBeLessThan(0.002)
      for (const { net } of offBy(level, ANGLE_TOLERANCE * 1.01, 20))
        expect(isSolved(places, net, level.optimum), level.id).toBe(false)
    }
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
        expect(isSolved(places, net, optimum), `${level.id}: ${kinds.join(' ')}`).toBe(true)
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
