import type { Vec2 } from '../../../geometry/types'
import type { Walk } from '../frechet'
import { makePath, pointAt } from '../path'
import { cornerGraph, geodesic, sightsFrom, type Sight } from './geodesic'
import { MinHeap } from './heap'
import { ropePoints, type Rope } from './rope'
import { blocked, concat, inverse, polylineWord, segmentWord, subpath, type Tree, type Word } from './trees'

/**
 * The target of a walk in the woods, computed offline: the shortest leash with which person and dog
 * reach the end, both only walking forwards at the same speed, the leash moving continuously around
 * the trees.
 *
 * Both paths are sampled every `step` metres. A state is (person's sample i, dog's sample j, how the
 * leash lies around the trees: its word); the leash starts straight at the gate. Moves: the person one
 * sample on, the dog one sample on, or both (same speed). When a walker steps over a ray, the word
 * changes accordingly. Each state's leash is the shortest curve with its word, computed from scratch
 * (`geodesic.ts`, not the game's rope update). A bottleneck Dijkstra finds the walk whose longest
 * leash (at the samples) is smallest; that is the target. Its error against the exact value is at most
 * about two steps. The leash starts straight at the gate, or as `start` (e.g. wound round a post the
 * dog was tied to; its ends must be the paths' starts).
 */
export interface WoodsSearch {
  step: number
  /** The longest leash of the best walk (at the samples), in metres. */
  target: number
  /** The best walk: positions (person, dog) in metres where a walker starts or stops. */
  walk: Walk
  /** The best walk at every sample, with the word of each position (for tests). */
  samples: { s: number; t: number; word: Word; leash: number }[]
  /** States visited, and the most leash classes met at one pair of positions. */
  visited: number
  classesPerPosition: number
}

/** Moves in the walk search; a change of move costs as much as this many steps. */
const PERSON = 0
const DOG = 1
const BOTH = 2
const NONE = 3
const TURN = 12

/** Positions 0, step, 2·step, …, and the end. */
function samplesOf(length: number, step: number): number[] {
  const n = Math.max(1, Math.ceil(length / step - 1e-9))
  return Array.from({ length: n + 1 }, (_, i) => Math.min(i * step, length))
}

export interface SearchOptions {
  /** How the leash lies at the gate (default: straight). */
  start?: Rope
  /**
   * Only walks on which the leash is, at some moment, wound at least `turns` times round tree
   * `tree` (the winding number of "along the leash, straight back"; the search then finds the
   * shortest leash that allows a walk with such a coil, e.g. the dog a loop ahead round a post).
   */
  coil?: { tree: number; turns: number }
}

/** How often a leash with this word is wound round tree k (see `turnsAround` in `rope.ts`). */
function windingOf(word: Word, straight: Word, k: number): number {
  let w = 0
  for (const l of word) if (Math.abs(l) === k + 1) w += Math.sign(l)
  for (const l of straight) if (Math.abs(l) === k + 1) w -= Math.sign(l)
  return w
}

export function searchWoods(
  person: readonly Vec2[],
  dog: readonly Vec2[],
  trees: readonly Tree[],
  step = 0.05,
  { start, coil }: SearchOptions = {},
): WoodsSearch {
  const P = makePath(person)
  const Q = makePath(dog)
  const S = samplesOf(P.length, step)
  const T = samplesOf(Q.length, step)
  const n = S.length - 1
  const m = T.length - 1
  const A = S.map((s) => pointAt(P, s))
  const B = T.map((t) => pointAt(Q, t))
  // Rays crossed by each step of a walker (along its path, corners included).
  const stepP = S.slice(0, -1).map((s, i) => polylineWord(subpath(P, s, S[i + 1]!), trees))
  const stepQ = T.slice(0, -1).map((t, j) => polylineWord(subpath(Q, t, T[j + 1]!), trees))
  const graph = cornerGraph(trees)
  const sightsA: (Sight[] | undefined)[] = []
  const sightsB: (Sight[] | undefined)[] = []

  const words: Word[] = []
  const wordIds = new Map<string, number>()
  const wordId = (w: Word) => {
    const key = w.join(',')
    let id = wordIds.get(key)
    if (id === undefined) {
      id = words.length
      words.push(w)
      wordIds.set(key, id)
    }
    return id
  }

  const leash = (i: number, j: number, w: Word): number => {
    const a = A[i]!
    const b = B[j]!
    if (!blocked(trees, a, b)) {
      const sw = segmentWord(a, b, trees)
      if (sw.length === w.length && sw.every((l, k) => l === w[k]))
        return Math.hypot(b[0] - a[0], b[1] - a[1])
    }
    sightsA[i] ??= sightsFrom(graph, a)
    sightsB[j] ??= sightsFrom(graph, b)
    const g = geodesic(graph, a, b, w, sightsA[i], sightsB[j])
    if (!g) throw new Error(`no curve with word ${w.join(',')} at ${i}, ${j}`)
    return g.length
  }

  // States: position (i, j) and word id; found by key (i·(m + 1) + j)·WORDS + word id.
  const WORDS = 4096
  const index = new Map<number, number>()
  const stI: number[] = []
  const stJ: number[] = []
  const stW: number[] = []
  /** Whether the walk to this state has coiled the leash as `coil` asks (always 0 without it). */
  const stF: number[] = []
  const stLeash: number[] = []
  const stValue: number[] = []
  // Second pass: cost and predecessor per (state, last move), at index state · 4 + move.
  const cost: number[] = []
  const from: number[] = []
  const classes = new Map<number, number>()
  const met = new Set<number>()
  const coiled = (i: number, j: number, w: number): boolean =>
    !!coil && Math.abs(windingOf(words[w]!, segmentWord(A[i]!, B[j]!, trees), coil.tree)) >= coil.turns
  const state = (i: number, j: number, w: number, flag = 0): number => {
    if (w >= WORDS) throw new Error('too many leash classes')
    const f = flag || (coiled(i, j, w) ? 1 : 0)
    const key = ((i * (m + 1) + j) * WORDS + w) * 2 + f
    let id = index.get(key)
    if (id === undefined) {
      id = stI.length
      index.set(key, id)
      stI.push(i)
      stJ.push(j)
      stW.push(w)
      stF.push(f)
      stLeash.push(leash(i, j, words[w]!))
      stValue.push(Infinity)
      cost.push(Infinity, Infinity, Infinity, Infinity)
      from.push(-1, -1, -1, -1)
      const pos = i * (m + 1) + j
      if (!met.has(key >> 1)) {
        met.add(key >> 1)
        classes.set(pos, (classes.get(pos) ?? 0) + 1)
      }
    }
    return id
  }
  const done = (id: number) => stI[id] === n && stJ[id] === m && (!coil || stF[id] === 1)

  const a0 = A[0]!
  const b0 = B[0]!
  let first: Word
  if (start) {
    first = polylineWord(ropePoints(start, trees), trees)
  } else {
    if (blocked(trees, a0, b0)) throw new Error('the leash must start clear of the trees')
    first = segmentWord(a0, b0, trees)
  }
  const origin = state(0, 0, wordId(first))
  stValue[origin] = stLeash[origin]!
  // The moves from a state: person, dog, both (as far as the paths go), with the new word.
  const moves = (id: number): [move: number, next: number][] => {
    const i = stI[id]!
    const j = stJ[id]!
    const w = words[stW[id]!]!
    const out: [number, number][] = []
    const personOn = i < n ? (stepP[i]!.length ? concat(inverse(stepP[i]!), w) : w) : null
    const id2 = (nw: Word) => (nw === w ? stW[id]! : wordId(nw))
    const f = stF[id]!
    if (personOn) out.push([PERSON, state(i + 1, j, id2(personOn), f)])
    if (j < m) out.push([DOG, state(i, j + 1, id2(stepQ[j]!.length ? concat(w, stepQ[j]!) : w), f)])
    if (personOn && j < m)
      out.push([BOTH, state(i + 1, j + 1, id2(stepQ[j]!.length ? concat(personOn, stepQ[j]!) : personOn), f)])
    return out
  }

  // 1. Bottleneck Dijkstra: the smallest longest leash of any walk.
  const heap = new MinHeap()
  heap.push(stValue[origin]!, origin)
  let goal = -1
  while (heap.size > 0) {
    const [value, id] = heap.pop()
    if (value > stValue[id]!) continue
    if (done(id)) {
      goal = id
      break
    }
    for (const [, next] of moves(id)) {
      const v = Math.max(value, stLeash[next]!)
      if (v < stValue[next]!) {
        stValue[next] = v
        heap.push(v, next)
      }
    }
  }
  if (goal < 0) throw new Error('no walk')
  const target = stValue[goal]!

  // 2. Among the walks within the target, one where who walks changes as rarely as possible (and both
  // walk together as often as possible): a walk a player could follow.
  const second = new MinHeap()
  const key2 = (id: number, move: number) => id * 4 + move
  cost[key2(origin, NONE)] = 0
  second.push(0, key2(origin, NONE))
  let end = -1
  while (second.size > 0) {
    const [c, k] = second.pop()
    if (c > cost[k]!) continue
    const id = k >> 2
    const last = k & 3
    if (done(id)) {
      end = k
      break
    }
    for (const [move, next] of moves(id)) {
      if (stLeash[next]! > target) continue
      const nk = key2(next, move)
      const nc = c + 1 + (last !== NONE && last !== move ? TURN : 0)
      if (nc < cost[nk]!) {
        cost[nk] = nc
        from[nk] = k
        second.push(nc, nk)
      }
    }
  }
  const path: number[] = []
  for (let k = end; k >= 0; k = from[k]!) path.push(k >> 2)
  path.reverse()
  const samples = path.map((id) => ({
    s: S[stI[id]!]!,
    t: T[stJ[id]!]!,
    word: words[stW[id]!]!,
    leash: stLeash[id]!,
  }))
  return {
    step,
    target,
    walk: compress(path.map((id) => [S[stI[id]!]!, T[stJ[id]!]!] as [number, number])),
    samples,
    visited: stI.length,
    classesPerPosition: [...classes.values()].reduce((a, b) => Math.max(a, b), 0),
  }
}

/** Keeps the positions where the walk changes direction (who is walking). */
function compress(points: [number, number][]): Walk {
  const dir = (p: [number, number], q: [number, number]) =>
    `${Math.sign(q[0] - p[0])},${Math.sign(q[1] - p[1])}`
  const out: Walk = [points[0]!]
  for (let k = 1; k < points.length; k++) {
    const n = out.length
    if (n >= 2 && dir(out[n - 2]!, out[n - 1]!) === dir(out[n - 1]!, points[k]!)) out[n - 1] = points[k]!
    else out.push(points[k]!)
  }
  return out
}
