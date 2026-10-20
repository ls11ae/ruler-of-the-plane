import type { Vec2 } from '../../geometry/types'
import { DisjointSets, networkLength, normalise, roadKey, roadLength, type Road } from './mst'

/**
 * "Kreuzungen": the road network may branch at junctions anywhere on the land (Euclidean Steiner tree).
 * Nodes are the places (villages, then castles: indices 0…n−1) and then the player's junctions; a road
 * joins two nodes. In a shortest network every junction has three roads meeting at 120° (Steiner points).
 * Junctions are placed by hand, so a map counts as solved when the network has the optimum's shape and every
 * angle at a junction is about 120°; then the junctions slide to their best spots (Kevin, 2026-10-20).
 */

/** The player's network: junctions (nodes after the places) and roads between nodes. */
export interface JunctionNetwork {
  junctions: Vec2[]
  roads: Road[]
}

export const EMPTY_NETWORK: JunctionNetwork = { junctions: [], roads: [] }

/** The stored optimum of a map (its junctions are numbered after the places, as the player's). */
export interface SteinerOptimum {
  junctions: readonly Vec2[]
  roads: readonly Road[]
  length: number
}

/**
 * The angles at a junction count as right within this many degrees of 120° (Kevin, 2026-10-20; tune in the
 * playtest, also with a finger on a phone). On the six maps, a junction may then lie 0.03–0.08 units from
 * its best spot in its tightest direction (median 0.04–0.10; a map is about 6 units wide, some 130 px on a
 * laptop and 70 px on a phone per unit), and the network is at most 0.16 % longer than the optimum (median
 * 0.02–0.05 %).
 */
export const ANGLE_TOLERANCE = 5

export const nodesOf = (places: readonly Vec2[], net: JunctionNetwork): Vec2[] => [
  ...places,
  ...net.junctions,
]

export const lengthOf = (places: readonly Vec2[], net: JunctionNetwork) =>
  networkLength(nodesOf(places, net), net.roads)

/** Number of separate groups the places form (junctions only link them). */
export function placeGroups(places: number, net: JunctionNetwork): number {
  const sets = new DisjointSets(places + net.junctions.length)
  for (const [a, b] of net.roads) sets.union(a, b)
  return new Set(Array.from({ length: places }, (_, i) => sets.find(i))).size
}

/**
 * Every junction has three roads, and every angle between them is within {@link ANGLE_TOLERANCE} of 120°
 * (false for a network without junctions).
 */
export function anglesRight(places: readonly Vec2[], net: JunctionNetwork): boolean {
  if (!net.junctions.length) return false
  const nodes = nodesOf(places, net)
  const degree = degrees(nodes.length, net.roads)
  return net.junctions.every((_, k) => {
    const v = places.length + k
    return degree[v] === 3 && angleError(nodes, net.roads, v) <= ANGLE_TOLERANCE
  })
}

/** Every order of 0…k−1 (k ≤ 4 junctions on the maps: at most 24). */
function permutations(k: number): number[][] {
  if (k === 0) return [[]]
  return permutations(k - 1).flatMap((p) =>
    Array.from({ length: k }, (_, i) => [...p.slice(0, i), k - 1, ...p.slice(i)]),
  )
}

/**
 * Whether the network has the optimum's shape: as many junctions as the optimum, and a numbering of them
 * under which its roads are exactly the optimum's (each junction joined to the same places and to the same
 * junctions). Where the junctions lie does not matter.
 */
export function hasOptimumShape(places: number, net: JunctionNetwork, optimum: SteinerOptimum): boolean {
  const k = optimum.junctions.length
  if (net.junctions.length !== k || net.roads.length !== optimum.roads.length) return false
  const wanted = new Set(optimum.roads.map(roadKey))
  return permutations(k).some((order) => {
    const id = (v: number) => (v < places ? v : places + order[v - places]!)
    return net.roads.every(([a, b]) => wanted.has(roadKey(normalise(id(a), id(b)))))
  })
}

/** The map is solved: the optimum's shape, and every angle at a junction about 120°. */
export const isSolved = (places: readonly Vec2[], net: JunctionNetwork, optimum: SteinerOptimum) =>
  hasOptimumShape(places.length, net, optimum) && anglesRight(places, net)

/**
 * Every place connected and every angle about 120°, but not the optimum's shape: joining the places
 * differently gives a shorter network (a local optimum, worth saying).
 */
export const anglesRightOtherShape = (
  places: readonly Vec2[],
  net: JunctionNetwork,
  optimum: SteinerOptimum,
) =>
  placeGroups(places.length, net) === 1 &&
  anglesRight(places, net) &&
  !hasOptimumShape(places.length, net, optimum)

/** Roads per node. */
export function degrees(nodes: number, roads: readonly Road[]): number[] {
  const out = new Array<number>(nodes).fill(0)
  for (const [a, b] of roads) {
    out[a]!++
    out[b]!++
  }
  return out
}

/** Drops the junctions that no road touches any more and numbers the others again. */
export function prune(places: number, net: JunctionNetwork): JunctionNetwork {
  const used = degrees(places + net.junctions.length, net.roads)
  const index: number[] = []
  const junctions: Vec2[] = []
  net.junctions.forEach((j, k) => {
    if (used[places + k]! > 0) {
      index[places + k] = places + junctions.length
      junctions.push(j)
    }
  })
  const id = (v: number) => (v < places ? v : index[v]!)
  return { junctions, roads: net.roads.map(([a, b]) => normalise(id(a), id(b))) }
}

/** Adds a road between two nodes (nothing if it exists or joins a node to itself). */
export function addRoad(net: JunctionNetwork, [a, b]: Road): JunctionNetwork {
  if (a === b || net.roads.some((r) => roadKey(r) === roadKey([a, b]))) return net
  return { ...net, roads: [...net.roads, normalise(a, b)] }
}

/** Removes a road; a junction left without roads disappears. */
export function removeRoad(places: number, net: JunctionNetwork, road: Road): JunctionNetwork {
  return prune(places, { ...net, roads: net.roads.filter((r) => roadKey(r) !== roadKey(road)) })
}

/** A new junction at `at` with a road to it from node `from`. */
export function extendTo(places: number, net: JunctionNetwork, from: number, at: Vec2): JunctionNetwork {
  const j = places + net.junctions.length
  return { junctions: [...net.junctions, at], roads: [...net.roads, normalise(from, j)] }
}

/** Bends a road: a new junction at `at` takes the road's place, joined to both of its ends. */
export function splitRoad(
  places: number,
  net: JunctionNetwork,
  road: Road,
  at: Vec2,
): { net: JunctionNetwork; junction: number } {
  const j = places + net.junctions.length
  const roads = net.roads.filter((r) => roadKey(r) !== roadKey(road))
  return {
    net: {
      junctions: [...net.junctions, at],
      roads: [...roads, normalise(road[0], j), normalise(road[1], j)],
    },
    junction: j,
  }
}

export function moveJunction(places: number, net: JunctionNetwork, node: number, at: Vec2): JunctionNetwork {
  return { ...net, junctions: net.junctions.map((j, k) => (places + k === node ? at : j)) }
}

/**
 * Drops junction `node` onto node `into` (a place or another junction): its roads end there instead;
 * roads that would join `into` to itself or repeat a road disappear, and so does the junction.
 */
export function mergeInto(places: number, net: JunctionNetwork, node: number, into: number): JunctionNetwork {
  if (node === into || node < places) return net
  let merged: JunctionNetwork = { ...net, roads: net.roads.filter((r) => r[0] !== node && r[1] !== node) }
  for (const [a, b] of net.roads) {
    if (a === node) merged = addRoad(merged, [into, b])
    else if (b === node) merged = addRoad(merged, [a, into])
  }
  return prune(places, merged)
}

/** The neighbours of a node in the network. */
export const neighboursOf = (roads: readonly Road[], node: number) =>
  roads.flatMap(([a, b]) => (a === node ? [b] : b === node ? [a] : []))

/** An angle between two consecutive roads around a node: the first road's direction and the size (radians). */
export interface Angle {
  from: number
  size: number
}

/** The angles between consecutive roads around a node (sorted by direction; they sum to 360°). */
export function anglesAt(nodes: readonly Vec2[], roads: readonly Road[], node: number): Angle[] {
  const [x, y] = nodes[node]!
  const dirs = neighboursOf(roads, node)
    .map((v) => Math.atan2(nodes[v]![1] - y, nodes[v]![0] - x))
    .sort((a, b) => a - b)
  if (dirs.length < 2) return []
  return dirs.map((d, i) => ({
    from: d,
    size: (i + 1 < dirs.length ? dirs[i + 1]! : dirs[0]! + 2 * Math.PI) - d,
  }))
}

export const toDegrees = (radians: number) => (radians * 180) / Math.PI

/** Number of full Steiner topologies on n ≥ 3 places, (2n − 5)!!: the "shapes" the exact search tries. */
export function fullTopologyCount(n: number): number {
  let count = 1
  for (let k = 2 * n - 5; k > 1; k -= 2) count *= k
  return count
}

/** How far the worst angle at a node is from 120° (degrees). */
const angleError = (nodes: readonly Vec2[], roads: readonly Road[], node: number) =>
  Math.max(0, ...anglesAt(nodes, roads, node).map((a) => Math.abs(toDegrees(a.size) - 120)))

/**
 * Moves every junction, again and again, to the point with the least distance sum to its neighbours
 * (one Weiszfeld step each: the mean of the neighbours weighted by 1/distance). For a fixed layout of
 * roads this converges to the shortest network, where every junction of three roads has angles of 120°;
 * the result screen animates it. Returns the junctions after each round.
 */
export function relax(places: readonly Vec2[], net: JunctionNetwork, rounds: number): Vec2[][] {
  const nodes = nodesOf(places, net)
  const frames: Vec2[][] = []
  for (let r = 0; r < rounds; r++) {
    for (let k = 0; k < net.junctions.length; k++) {
      const v = places.length + k
      let [sx, sy, sw] = [0, 0, 0]
      for (const u of neighboursOf(net.roads, v)) {
        const w = 1 / Math.max(1e-9, Math.hypot(nodes[u]![0] - nodes[v]![0], nodes[u]![1] - nodes[v]![1]))
        sx += w * nodes[u]![0]
        sy += w * nodes[u]![1]
        sw += w
      }
      if (sw > 0) nodes[v] = [sx / sw, sy / sw]
    }
    frames.push(nodes.slice(places.length))
  }
  return frames
}

/** Optimum junctions are matched to the player's within this distance (level units; a map is about 6 wide). */
const MATCH_RADIUS = 0.8

/**
 * Pairs the optimum's junctions with the player's, nearest pairs first, each at most once: optimum
 * junction k → the player's node, or null.
 */
function matchJunctions(places: number, net: JunctionNetwork, optimum: SteinerOptimum): (number | null)[] {
  const pairs: { k: number; j: number; d: number }[] = []
  optimum.junctions.forEach((o, k) =>
    net.junctions.forEach((p, j) => {
      const d = Math.hypot(o[0] - p[0], o[1] - p[1])
      if (d <= MATCH_RADIUS) pairs.push({ k, j, d })
    }),
  )
  pairs.sort((a, b) => a.d - b.d)
  const match: (number | null)[] = optimum.junctions.map(() => null)
  const taken = new Set<number>()
  for (const { k, j } of pairs) {
    if (match[k] !== null || taken.has(j)) continue
    match[k] = places + j
    taken.add(j)
  }
  return match
}

export type JunctionHint =
  /** A junction with one road: the road leads nowhere. */
  | { kind: 'deadEnd'; road: Road }
  /** A junction with two roads that the optimum does not have: a straight road is shorter. */
  | { kind: 'bend'; junction: number }
  /** A junction worth building: at `at`, with a road to it from node `from`. */
  | { kind: 'missing'; at: Vec2; from: number }
  /** A junction (three roads or more) that the optimum does not have. */
  | { kind: 'extra'; junction: number }
  | { kind: 'notOptimal'; road: Road }
  | { kind: 'build'; road: Road }
  /** All roads are right, but this junction is not where its roads meet at 120°. */
  | { kind: 'angle'; junction: number }
  | null

/**
 * A hint towards the stored optimum. The optimum's junctions are matched to the player's (nearest first);
 * then, in this order: a junction the optimum has no match for, with one or two roads; a missing junction
 * (as a ghost with a road to it from a node it joins in the optimum); another junction without a match; a
 * road the optimum does not have; a road of the optimum not built yet (shortest first); the junction
 * whose angles are furthest from 120°. Null if the map is solved.
 */
export function junctionHint(
  places: readonly Vec2[],
  net: JunctionNetwork,
  optimum: SteinerOptimum,
): JunctionHint {
  if (isSolved(places, net, optimum)) return null
  const n = places.length
  const nodes = nodesOf(places, net)
  const degree = degrees(nodes.length, net.roads)
  const match = matchJunctions(n, net, optimum)
  const matched = new Set(match.filter((m) => m !== null))
  const unmatched = net.junctions.map((_, k) => n + k).filter((v) => !matched.has(v))

  for (const v of unmatched) {
    if (degree[v] === 1) return { kind: 'deadEnd', road: net.roads.find((r) => r[0] === v || r[1] === v)! }
    if (degree[v] === 2) return { kind: 'bend', junction: v }
  }
  // The optimum's nodes as the player's: places are themselves, junctions their match.
  const mapped = (v: number) => (v < n ? v : match[v - n]!)
  // A missing junction next to a node the player has (there always is one: the optimum is a tree).
  const optimumNodes = [...places, ...optimum.junctions]
  const missing = optimum.roads
    .flatMap(([a, b]): Road[] => [
      [a, b],
      [b, a],
    ])
    .filter(([j, from]) => j >= n && match[j - n] === null && mapped(from) !== null)
    .sort((r, s) => roadLength(optimumNodes, r) - roadLength(optimumNodes, s))[0]
  if (missing) return { kind: 'missing', at: optimumNodes[missing[0]]!, from: mapped(missing[1])! }
  if (unmatched.length) return { kind: 'extra', junction: unmatched[0]! }

  const wanted = optimum.roads.map(([a, b]) => normalise(mapped(a)!, mapped(b)!))
  const keys = new Set(wanted.map(roadKey))
  const extra = net.roads.find((r) => !keys.has(roadKey(r)))
  if (extra) return { kind: 'notOptimal', road: extra }
  const built = new Set(net.roads.map(roadKey))
  const build = wanted
    .filter((r) => !built.has(roadKey(r)))
    .sort((a, b) => roadLength(nodes, a) - roadLength(nodes, b))[0]
  if (build) return { kind: 'build', road: build }

  const worst = [...matched].sort(
    (a, b) => angleError(nodes, net.roads, b) - angleError(nodes, net.roads, a),
  )[0]
  return worst === undefined ? null : { kind: 'angle', junction: worst }
}
