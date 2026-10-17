import type { Vec2 } from '../../../geometry/types'
import { MinHeap } from './heap'
import { blocked, entersTrunk, inverse, segmentWord, type Tree, type Word } from './trees'

/**
 * The taut leash computed from scratch, independently of the rope update in `rope.ts`: the shortest
 * curve from a to b with a given word (homotopy class), found by Dijkstra in the visibility graph of
 * the trunk corners. A shortest curve is a polyline through corners, and its word is the concatenation
 * of its segments' words without cancellation (a taut curve never crosses a ray and straight back), so
 * the search follows only segments whose words continue the given word letter by letter.
 */

/** A segment of the visibility graph: to which corner, how long, which rays it crosses. */
export interface Sight {
  to: number
  length: number
  word: number[]
}

export interface CornerGraph {
  trees: readonly Tree[]
  corners: Vec2[]
  /** The corner as (tree, index in its trunk). */
  owner: [tree: number, corner: number][]
  /** Clear segments between corners. */
  sights: Sight[][]
}

export function cornerGraph(trees: readonly Tree[]): CornerGraph {
  const corners: Vec2[] = []
  const owner: [number, number][] = []
  trees.forEach((tree, k) =>
    tree.trunk.forEach((c, j) => {
      corners.push(c)
      owner.push([k, j])
    }),
  )
  const sights: Sight[][] = corners.map(() => [])
  for (let u = 0; u < corners.length; u++) {
    for (let v = u + 1; v < corners.length; v++) {
      const p = corners[u]!
      const q = corners[v]!
      if (blocked(trees, p, q)) continue
      const word = segmentWord(p, q, trees)
      const length = Math.hypot(q[0] - p[0], q[1] - p[1])
      sights[u]!.push({ to: v, length, word })
      sights[v]!.push({ to: u, length, word: inverse(word) })
    }
  }
  return { trees, corners, owner, sights }
}

/** The clear segments from a free point to every corner it sees. */
export function sightsFrom(graph: CornerGraph, from: Vec2): Sight[] {
  const out: Sight[] = []
  graph.corners.forEach((c, v) => {
    if (graph.trees.some((tree) => entersTrunk(tree, from, c))) return
    out.push({
      to: v,
      length: Math.hypot(c[0] - from[0], c[1] - from[1]),
      word: segmentWord(from, c, graph.trees),
    })
  })
  return out
}

export interface Geodesic {
  length: number
  /** The corners the leash bends around, from a to b (indices into `graph.corners`). */
  corners: number[]
}

/** Whether `part` continues `word` at position k. */
function continues(word: Word, k: number, part: Word): boolean {
  if (k + part.length > word.length) return false
  for (let i = 0; i < part.length; i++) if (word[k + i] !== part[i]) return false
  return true
}

/**
 * The shortest curve from a to b with the given (reduced) word. `fromA` and `fromB` are the sight
 * lines of a and b (from {@link sightsFrom}; passed in so a search can reuse them).
 */
export function geodesic(
  graph: CornerGraph,
  a: Vec2,
  b: Vec2,
  word: Word,
  fromA: Sight[] = sightsFrom(graph, a),
  fromB: Sight[] = sightsFrom(graph, b),
): Geodesic | null {
  // The straight segment, if it is clear and has the right word.
  if (!blocked(graph.trees, a, b)) {
    const w = segmentWord(a, b, graph.trees)
    if (w.length === word.length && continues(word, 0, w)) {
      return { length: Math.hypot(b[0] - a[0], b[1] - a[1]), corners: [] }
    }
  }
  const n = graph.corners.length
  const layers = word.length + 1
  // State (corner v, letters consumed k) at index k * n + v.
  const dist = new Float64Array(n * layers).fill(Infinity)
  const prev = new Int32Array(n * layers).fill(-1)
  const heap = new MinHeap()
  for (const s of fromA) {
    if (continues(word, 0, s.word)) {
      const id = s.word.length * n + s.to
      if (s.length < dist[id]!) {
        dist[id] = s.length
        heap.push(s.length, id)
      }
    }
  }
  // To b: from corner v with k letters consumed, the segment v → b must finish the word.
  const toB: (Sight | undefined)[] = new Array(n)
  for (const s of fromB) toB[s.to] = { to: -1, length: s.length, word: inverse(s.word) }
  let best = Infinity
  let bestId = -1
  while (heap.size > 0) {
    const [d, id] = heap.pop()
    if (d >= best) break
    if (d > dist[id]!) continue
    const v = id % n
    const k = (id - v) / n
    const last = toB[v]
    if (
      last &&
      last.word.length === word.length - k &&
      continues(word, k, last.word) &&
      d + last.length < best
    ) {
      best = d + last.length
      bestId = id
    }
    for (const s of graph.sights[v]!) {
      if (!continues(word, k, s.word)) continue
      const next = (k + s.word.length) * n + s.to
      if (d + s.length < dist[next]!) {
        dist[next] = d + s.length
        prev[next] = id
        heap.push(d + s.length, next)
      }
    }
  }
  if (bestId < 0) return null
  const corners: number[] = []
  for (let id = bestId; id >= 0; id = prev[id]!) corners.push(id % n)
  return { length: best, corners: corners.reverse() }
}
