import type { Vec2 } from '../../src/core/geometry/types'

/**
 * Exact Euclidean Steiner minimal trees for the small maps of "Kreuzungen" (offline, `npm run
 * roads-maps`): every Steiner minimal tree is a full Steiner topology on the terminals with some edges
 * shrunk to length zero, and for a fixed topology the shortest tree is a convex problem. So the optimum
 * is the minimum, over all (2n − 5)!! full topologies, of each topology's shortest tree, found by Smith's
 * iteration (W. D. Smith, "How to find Steiner minimal trees in Euclidean d-space", Algorithmica 1992).
 * Fine up to 8 terminals (10,395 topologies).
 */

/** A Steiner tree: junctions (Steiner points) and edges between nodes: terminals 0…n−1, then junctions. */
export interface SteinerTree {
  junctions: Vec2[]
  edges: [number, number][]
  length: number
}

/** Every full Steiner topology on n ≥ 3 terminals: n − 2 Steiner points (nodes n…2n − 3), each of degree 3. */
export function* fullTopologies(n: number): Generator<[number, number][]> {
  function* grow(edges: [number, number][], k: number): Generator<[number, number][]> {
    if (k === n) {
      yield edges
      return
    }
    // Terminal k joins the tree through a new Steiner point on one of the edges.
    const s = n + k - 2
    for (let e = 0; e < edges.length; e++) {
      const [u, v] = edges[e]!
      const next = edges.slice()
      next[e] = [u, s]
      next.push([s, v], [k, s])
      yield* grow(next, k + 1)
    }
  }
  if (n >= 3) {
    yield* grow(
      [
        [0, n],
        [1, n],
        [2, n],
      ],
      3,
    )
  }
}

const dist = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** Solves A x = b in place for a small symmetric positive definite A (Gaussian elimination). */
function solve(a: number[][], b: number[]): number[] {
  const m = b.length
  for (let c = 0; c < m; c++) {
    let p = c
    for (let r = c + 1; r < m; r++) if (Math.abs(a[r]![c]!) > Math.abs(a[p]![c]!)) p = r
    ;[a[c], a[p]] = [a[p]!, a[c]!]
    ;[b[c], b[p]] = [b[p]!, b[c]!]
    for (let r = c + 1; r < m; r++) {
      const f = a[r]![c]! / a[c]![c]!
      if (f === 0) continue
      for (let k = c; k < m; k++) a[r]![k]! -= f * a[c]![k]!
      b[r]! -= f * b[c]!
    }
  }
  const x = new Array<number>(m).fill(0)
  for (let r = m - 1; r >= 0; r--) {
    let s = b[r]!
    for (let k = r + 1; k < m; k++) s -= a[r]![k]! * x[k]!
    x[r] = s / a[r]![r]!
  }
  return x
}

/**
 * The shortest tree of one topology (terminals fixed, the junctions free; by default the n − 2 Steiner
 * points of a full topology): Smith's iteration. Each round weights every edge by 1/length and solves the
 * linear system that puts every junction at the weighted mean of its neighbours; the length never grows
 * and converges to the minimum.
 */
export function shortestForTopology(
  terminals: readonly Vec2[],
  edges: readonly (readonly [number, number])[],
  {
    junctions: m = Math.max(0, terminals.length - 2),
    start,
    maxRounds = 4000,
    tolerance = 1e-12,
  }: { junctions?: number; start?: readonly Vec2[]; maxRounds?: number; tolerance?: number } = {},
): { junctions: Vec2[]; length: number } {
  const n = terminals.length
  const cx = terminals.reduce((s, p) => s + p[0], 0) / n
  const cy = terminals.reduce((s, p) => s + p[1], 0) / n
  // Start near the centroid, the points slightly apart (equal points would get infinite weights).
  let xs = Array.from({ length: m }, (_, i) => start?.[i]?.[0] ?? cx + 1e-3 * Math.cos(i * 2.399))
  let ys = Array.from({ length: m }, (_, i) => start?.[i]?.[1] ?? cy + 1e-3 * Math.sin(i * 2.399))
  const at = (i: number): Vec2 => (i < n ? terminals[i]! : [xs[i - n]!, ys[i - n]!])
  const total = () => edges.reduce((s, [u, v]) => s + dist(at(u), at(v)), 0)
  let length = total()
  for (let round = 0; round < maxRounds; round++) {
    const a = Array.from({ length: m }, () => new Array<number>(m).fill(0))
    const bx = new Array<number>(m).fill(0)
    const by = new Array<number>(m).fill(0)
    for (const [u, v] of edges) {
      const w = 1 / Math.max(dist(at(u), at(v)), 1e-12)
      for (const [p, q] of [
        [u, v],
        [v, u],
      ] as const) {
        if (p < n) continue
        a[p - n]![p - n]! += w
        if (q < n) {
          bx[p - n]! += w * terminals[q]![0]
          by[p - n]! += w * terminals[q]![1]
        } else a[p - n]![q - n]! -= w
      }
    }
    xs = solve(
      a.map((r) => r.slice()),
      bx,
    )
    ys = solve(a, by)
    const next = total()
    const done = length - next <= tolerance * next
    length = Math.min(length, next)
    if (done) break
  }
  return { junctions: xs.map((x, i) => [x, ys[i]!] as const), length }
}

/**
 * Removes what an optimum on a degenerate topology leaves over: junctions that sit on a terminal or on
 * another junction are merged into it (their zero-length edges disappear). Such junctions converge slowly,
 * so "sit on" means closer than `tolerance` (0.01 level units, less than a pixel on the board); the
 * merged tree is placed once more afterwards.
 */
export function simplify(terminals: readonly Vec2[], tree: SteinerTree, tolerance = 1e-2): SteinerTree {
  const n = terminals.length
  const nodes: Vec2[] = [...terminals, ...tree.junctions]
  // Union nodes closer than the tolerance, keeping a terminal as the representative.
  const parent = nodes.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)))
  for (const [u, v] of tree.edges) {
    if (dist(nodes[u]!, nodes[v]!) > tolerance) continue
    const [ru, rv] = [find(u), find(v)]
    if (ru === rv) continue
    if (ru < n && rv < n) throw new Error('two terminals coincide')
    if (rv < n) parent[ru] = rv
    else parent[rv] = ru
  }
  const junctionIndex = new Map<number, number>()
  const junctions: Vec2[] = []
  const id = (i: number) => {
    const r = find(i)
    if (r < n) return r
    if (!junctionIndex.has(r)) {
      junctionIndex.set(r, n + junctions.length)
      junctions.push(nodes[r]!)
    }
    return junctionIndex.get(r)!
  }
  const edges: [number, number][] = []
  for (const [u, v] of tree.edges) {
    const [a, b] = [id(u), id(v)]
    if (a !== b) edges.push(a < b ? [a, b] : [b, a])
  }
  const all: Vec2[] = [...terminals, ...junctions]
  return { junctions, edges, length: edges.reduce((s, [u, v]) => s + dist(all[u]!, all[v]!), 0) }
}

/**
 * The Steiner minimal tree of 2 to 8 terminals. Every full topology is solved to a few thousand rounds;
 * those within 0.1 % of the best are refined to convergence (degenerate topologies, whose junctions run
 * into terminals or into each other, converge slowly); the winner's merged junctions are then placed once
 * more on its simplified tree.
 */
export function steinerMinimalTree(terminals: readonly Vec2[]): SteinerTree {
  const n = terminals.length
  if (n < 2) return { junctions: [], edges: [], length: 0 }
  if (n === 2) return { junctions: [], edges: [[0, 1]], length: dist(terminals[0]!, terminals[1]!) }
  if (n > 8) throw new Error('too many terminals for the exact search')
  const candidates: SteinerTree[] = []
  for (const edges of fullTopologies(n)) {
    const { junctions, length } = shortestForTopology(terminals, edges)
    candidates.push({ junctions, edges: edges.map((e) => [...e]), length })
  }
  const first = Math.min(...candidates.map((c) => c.length))
  let best: SteinerTree | null = null
  for (const c of candidates) {
    if (c.length > first * 1.001) continue
    const refined = shortestForTopology(terminals, c.edges, {
      start: c.junctions,
      maxRounds: 200000,
      tolerance: 1e-15,
    })
    if (!best || refined.length < best.length) best = { ...c, ...refined }
  }
  const simple = simplify(terminals, best!)
  const placed = shortestForTopology(terminals, simple.edges, {
    junctions: simple.junctions.length,
    start: simple.junctions,
    maxRounds: 200000,
    tolerance: 1e-15,
  })
  return placed.length <= simple.length ? { ...simple, ...placed } : simple
}

/** The angles (degrees) between consecutive edges at a node, around it. */
export function anglesAt(at: Vec2, neighbours: readonly Vec2[]): number[] {
  const dirs = neighbours.map(([x, y]) => Math.atan2(y - at[1], x - at[0])).sort((a, b) => a - b)
  return dirs.map((d, i) => {
    const next = i + 1 < dirs.length ? dirs[i + 1]! : dirs[0]! + 2 * Math.PI
    return ((next - d) * 180) / Math.PI
  })
}
