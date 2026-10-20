import { segmentsIntersect } from '../../geometry/predicates'
import type { Vec2 } from '../../geometry/types'
import { atMost, componentCount, DisjointSets, networkLength, roadKey, roadLength, type Road } from './mst'

/**
 * "Zwei Sorten": castles and villages, every road joins a castle and a village, and roads must not cross
 * (a minimum plane bichromatic spanning tree). Places are villages first, then castles, as in every
 * "Straßenbau" map. Without the crossing rule the shortest network is Kruskal on the castle–village roads;
 * with it the problem is NP-hard (Borgelt et al. 2009), so the maps carry their optimum (CP-SAT, offline).
 */

/** Whether a road joins a village (index below `villages`) and a castle. */
export const joinsTwoKinds = ([a, b]: Road, villages: number) => a < villages !== b < villages

/** Whether two roads cross (roads that meet at a place do not; no three places of a map are on a line). */
export function roadsCross(points: readonly Vec2[], [a, b]: Road, [c, d]: Road): boolean {
  if (a === c || a === d || b === c || b === d) return false
  return segmentsIntersect(points[a]!, points[b]!, points[c]!, points[d]!)
}

/** Every pair of crossing roads, and where they cross. */
export function crossings(
  points: readonly Vec2[],
  roads: readonly Road[],
): { roads: [Road, Road]; at: Vec2 }[] {
  const out: { roads: [Road, Road]; at: Vec2 }[] = []
  for (let i = 0; i < roads.length; i++) {
    for (let j = i + 1; j < roads.length; j++) {
      const [r, s] = [roads[i]!, roads[j]!]
      if (roadsCross(points, r, s)) out.push({ roads: [r, s], at: intersection(points, r, s) })
    }
  }
  return out
}

function intersection(points: readonly Vec2[], [a, b]: Road, [c, d]: Road): Vec2 {
  const [p, q, r, s] = [points[a]!, points[b]!, points[c]!, points[d]!]
  const d1: Vec2 = [q[0] - p[0], q[1] - p[1]]
  const d2: Vec2 = [s[0] - r[0], s[1] - r[1]]
  const t = ((r[0] - p[0]) * d2[1] - (r[1] - p[1]) * d2[0]) / (d1[0] * d2[1] - d1[1] * d2[0])
  return [p[0] + t * d1[0], p[1] + t * d1[1]]
}

/** All castle–village roads, shortest first (ties by index). */
export function twoKindRoads(points: readonly Vec2[], villages: number): { road: Road; length: number }[] {
  const all: { road: Road; length: number }[] = []
  for (let v = 0; v < villages; v++) {
    for (let c = villages; c < points.length; c++)
      all.push({ road: [v, c], length: roadLength(points, [v, c]) })
  }
  return all.sort((x, y) => x.length - y.length || x.road[0] - y.road[0] || x.road[1] - y.road[1])
}

/** The shortest castle–village network without the crossing rule: Kruskal on the castle–village roads. */
export function freeTree(points: readonly Vec2[], villages: number): Road[] {
  const sets = new DisjointSets(points.length)
  return twoKindRoads(points, villages)
    .filter(({ road }) => sets.union(road[0], road[1]))
    .map(({ road }) => road)
}

/**
 * The greedy strategy: again and again the shortest castle–village road that joins two separate groups and
 * crosses no chosen road. It can end longer than the optimum, or stuck with groups that no allowed road
 * can join any more.
 */
export function greedyPlane(points: readonly Vec2[], villages: number): { roads: Road[]; stuck: boolean } {
  const sets = new DisjointSets(points.length)
  const roads: Road[] = []
  for (const { road } of twoKindRoads(points, villages)) {
    if (sets.find(road[0]) === sets.find(road[1])) continue
    if (roads.some((r) => roadsCross(points, road, r))) continue
    sets.union(road[0], road[1])
    roads.push(road)
  }
  return { roads, stuck: sets.count > 1 }
}

/** Every place connected, only castle–village roads, no crossings, and as short as the optimum. */
export function isPlaneOptimal(
  points: readonly Vec2[],
  villages: number,
  roads: readonly Road[],
  optimum: number,
): boolean {
  return (
    componentCount(points.length, roads) === 1 &&
    roads.every((r) => joinsTwoKinds(r, villages)) &&
    crossings(points, roads).length === 0 &&
    atMost(networkLength(points, roads), optimum)
  )
}

export type PlaneHint =
  { kind: 'crossing'; road: Road } | { kind: 'notOptimal'; road: Road } | { kind: 'build'; road: Road } | null

/**
 * A hint towards the stored optimal network: first a road that crosses another (the longer of the two),
 * then a built road the optimum does not use, then the shortest road of the optimum not built yet.
 */
export function planeHint(
  points: readonly Vec2[],
  roads: readonly Road[],
  optimal: readonly Road[],
): PlaneHint {
  const crossing = crossings(points, roads)[0]
  if (crossing) {
    const [r, s] = crossing.roads
    return { kind: 'crossing', road: roadLength(points, r) >= roadLength(points, s) ? r : s }
  }
  const keys = new Set(optimal.map(roadKey))
  const extra = roads.find((r) => !keys.has(roadKey(r)))
  if (extra) return { kind: 'notOptimal', road: extra }
  const built = new Set(roads.map(roadKey))
  const missing = optimal
    .filter((r) => !built.has(roadKey(r)))
    .sort((a, b) => roadLength(points, a) - roadLength(points, b))[0]
  return missing ? { kind: 'build', road: missing } : null
}
