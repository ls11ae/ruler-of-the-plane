import type { Vec2 } from '../../geometry/types'

/**
 * Minimum spanning trees for "Straßenbau": villages are points, a road joins two villages, its cost is
 * its length. A network is optimal iff it connects every village and is exactly as long as a minimum
 * spanning tree: lengths are compared, not edge sets, so every optimal tree counts when lengths tie.
 */

/** A road between villages a and b (indices, a < b). */
export type Road = readonly [a: number, b: number]

export const roadKey = ([a, b]: Road) => (a < b ? `${a}-${b}` : `${b}-${a}`)
export const normalise = (a: number, b: number): Road => (a < b ? [a, b] : [b, a])

export const roadLength = (points: readonly Vec2[], [a, b]: Road) =>
  Math.hypot(points[a]![0] - points[b]![0], points[a]![1] - points[b]![1])

export const networkLength = (points: readonly Vec2[], roads: readonly Road[]) =>
  roads.reduce((sum, r) => sum + roadLength(points, r), 0)

/** Union–find with path halving and union by size. */
export class DisjointSets {
  private readonly parent: number[]
  private readonly size: number[]
  count: number

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
    this.size = new Array<number>(n).fill(1)
    this.count = n
  }

  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]!]!
      x = this.parent[x]!
    }
    return x
  }

  /** Joins the sets of a and b; false if they were already one set. */
  union(a: number, b: number): boolean {
    let ra = this.find(a)
    let rb = this.find(b)
    if (ra === rb) return false
    if (this.size[ra]! < this.size[rb]!) [ra, rb] = [rb, ra]
    this.parent[rb] = ra
    this.size[ra]! += this.size[rb]!
    this.count--
    return true
  }
}

/** All possible roads, shortest first (ties by index, so the order is reproducible). */
export function roadsByLength(points: readonly Vec2[]): { road: Road; length: number }[] {
  const all: { road: Road; length: number }[] = []
  for (let a = 0; a < points.length; a++) {
    for (let b = a + 1; b < points.length; b++) all.push({ road: [a, b], length: roadLength(points, [a, b]) })
  }
  return all.sort((x, y) => x.length - y.length || x.road[0] - y.road[0] || x.road[1] - y.road[1])
}

export interface KruskalStep {
  road: Road
  length: number
  /** False if the road would close a ring (both villages already connected). */
  taken: boolean
}

/**
 * Kruskal's algorithm (1956), the teaching animation: take the roads shortest first and skip every
 * road that would close a ring, until all villages are connected. Returns every step up to the last
 * road taken.
 */
export function kruskal(points: readonly Vec2[]): { roads: Road[]; length: number; steps: KruskalStep[] } {
  const sets = new DisjointSets(points.length)
  const steps: KruskalStep[] = []
  const roads: Road[] = []
  let length = 0
  for (const { road, length: l } of roadsByLength(points)) {
    if (sets.count === 1) break
    const taken = sets.union(road[0], road[1])
    steps.push({ road, length: l, taken })
    if (taken) {
      roads.push(road)
      length += l
    }
  }
  return { roads, length, steps }
}

/**
 * The first k Kruskal steps as drawn by the theory view: the roads taken so far, and the k-th road
 * (marked current) even if it was skipped.
 */
export function kruskalSoFar(steps: readonly KruskalStep[], k: number) {
  return steps
    .slice(0, k)
    .flatMap((step, i) =>
      step.taken || i === k - 1 ? [{ road: step.road, taken: step.taken, current: i === k - 1 }] : [],
    )
}

/** Number of separate groups of villages in a network. */
export function componentCount(n: number, roads: readonly Road[]): number {
  const sets = new DisjointSets(n)
  for (const [a, b] of roads) sets.union(a, b)
  return sets.count
}

/** Tolerance for comparing lengths (level coordinates are a few units; rounding errors are far smaller). */
const EPS = 1e-9

/** Every village connected and the network as short as a minimum spanning tree. */
export function isOptimal(points: readonly Vec2[], roads: readonly Road[], mstLength: number): boolean {
  return (
    componentCount(points.length, roads) === 1 &&
    networkLength(points, roads) <= mstLength + EPS * (1 + mstLength)
  )
}

/** How much longer than the optimum a connected network is, as a share (0.12 = 12 %). */
export const overOptimum = (length: number, mstLength: number) => Math.max(0, length / mstLength - 1)

export type Hint =
  | { kind: 'ring'; road: Road }
  | { kind: 'tooLong'; road: Road; instead: Road }
  | { kind: 'build'; road: Road }
  | null

/**
 * A hint for the player's network: (1) a ring: its longest road can go (a ring never helps);
 * (2) a road that no shortest network uses: a shorter road could join the same two groups;
 * (3) otherwise the shortest road that joins two separate groups (Kruskal's next step).
 * Null if the network is optimal.
 */
export function hint(points: readonly Vec2[], roads: readonly Road[], mstLength: number): Hint {
  if (isOptimal(points, roads, mstLength)) return null
  // (1) Rings: add the roads one by one; a road between connected villages closes a ring.
  const sets = new DisjointSets(points.length)
  const adjacency = new Map<number, Road[]>()
  for (const road of roads) {
    if (!sets.union(road[0], road[1])) {
      const ring = [road, ...pathBetween(adjacency, road[0], road[1])]
      return {
        kind: 'ring',
        road: ring.reduce((a, b) => (roadLength(points, b) > roadLength(points, a) ? b : a)),
      }
    }
    for (const v of road) adjacency.set(v, [...(adjacency.get(v) ?? []), road])
  }
  // (2) Cycle property: a road is in no minimum spanning tree if a path of strictly shorter roads joins
  // its villages. Kruskal over all roads shorter than it decides that.
  const sorted = roadsByLength(points)
  for (const road of roads) {
    const length = roadLength(points, road)
    const shorter = new DisjointSets(points.length)
    let instead: Road | null = null
    for (const { road: r, length: l } of sorted) {
      if (l >= length - EPS * (1 + length)) break
      if (shorter.union(r[0], r[1]) && shorter.find(road[0]) === shorter.find(road[1])) {
        instead = r
        break
      }
    }
    if (instead) return { kind: 'tooLong', road, instead }
  }
  // (3) Kruskal's next step on the groups of the player's network.
  for (const { road } of sorted) {
    if (sets.find(road[0]) !== sets.find(road[1])) return { kind: 'build', road }
  }
  return null
}

/** The roads on the path from a to b in a forest (given as adjacency lists), or [] if none. */
function pathBetween(adjacency: Map<number, Road[]>, a: number, b: number): Road[] {
  const back = new Map<number, Road>()
  const queue = [a]
  const seen = new Set([a])
  while (queue.length) {
    const v = queue.shift()!
    if (v === b) break
    for (const road of adjacency.get(v) ?? []) {
      const w = road[0] === v ? road[1] : road[0]
      if (seen.has(w)) continue
      seen.add(w)
      back.set(w, road)
      queue.push(w)
    }
  }
  const path: Road[] = []
  for (let v = b; v !== a && back.has(v);) {
    const road = back.get(v)!
    path.push(road)
    v = road[0] === v ? road[1] : road[0]
  }
  return path
}
