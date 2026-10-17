import type { Vec2 } from '../../../geometry/types'
import { frechetDistance, type Walk } from '../frechet'
import { makePath, pointAt, type Path } from '../path'
import { roundUp, TAUT_SHARE, WALK_SPEED, type Advice, type Input } from '../rules'
import { leashGrid, type LeashGrid } from './field'
import type { WoodsWalk } from './levels'
import { moveDogAlong, movePersonAlong, ropeLength, straightRope, type Rope } from './rope'
import type { Tree } from './trees'

/**
 * Rules of the walks "Im Wald": as in the park (both walk forwards at the same speed while their key
 * is held; the leash must not get longer than allowed), but the leash is a taut rope around the trunks.
 */

/** Spacing of the grid of positions used for the hints (metres along each path). */
const HINT_GRID = 0.15

export interface WoodsCourse {
  walk: WoodsWalk
  person: Path
  dog: Path
  trees: Tree[]
  /** The leash at the gate: straight. */
  start: Rope
  /** The target: the shortest leash that allows the walk in the woods (from the offline search). */
  shortest: number
  /** The Fréchet distance of the two paths without trees, for comparison. */
  plain: number
  /** The leash of this walk. */
  leash: number
  /** The computer's walk (stored with the walk). */
  computer: Walk
  /** The leash at grid positions, and from which of them the castle can still be reached. */
  hints: Hints
  /** Walking speed of both, metres per second. */
  speed: number
}

interface Hints {
  grid: LeashGrid
  /** Reachable with a little to spare (for advice: following it never snaps the leash). */
  safe: Uint8Array
  /** Reachable at all (no "dead end" banner while this holds). */
  loose: Uint8Array
}

export function makeWoodsCourse(walk: WoodsWalk): WoodsCourse {
  const person = makePath(walk.person)
  const dog = makePath(walk.dog)
  const start = straightRope(pointAt(person, 0), pointAt(dog, 0))
  const leash = roundUp(Math.max(walk.target * walk.slack, walk.target + 0.2))
  const grid = leashGrid(
    person,
    dog,
    walk.trees,
    start,
    Math.ceil(person.length / HINT_GRID),
    Math.ceil(dog.length / HINT_GRID),
  )
  const spacing = Math.max(grid.s[1]!, grid.t[1]!)
  return {
    walk,
    person,
    dog,
    trees: walk.trees,
    start,
    shortest: walk.target,
    plain: frechetDistance(walk.person, walk.dog),
    leash,
    computer: walk.computer,
    hints: { grid, safe: reachable(grid, leash - spacing), loose: reachable(grid, leash) },
    speed: walk.speed ?? WALK_SPEED,
  }
}

/** Grid positions from which a walk with leash at most `limit` (at grid positions) reaches the end. */
function reachable(grid: LeashGrid, limit: number): Uint8Array {
  const n = grid.s.length - 1
  const m = grid.t.length - 1
  const ok = new Uint8Array((n + 1) * (m + 1))
  for (let i = n; i >= 0; i--) {
    for (let j = m; j >= 0; j--) {
      const k = i * (m + 1) + j
      if (grid.leash[k]! > limit) continue
      ok[k] =
        (i === n && j === m) ||
        (i < n && ok[k + m + 1] === 1) ||
        (j < m && ok[k + 1] === 1) ||
        (i < n && j < m && ok[k + m + 2] === 1)
          ? 1
          : 0
    }
  }
  return ok
}

/** Whether the castle can still be reached from (s, t), judged at the next grid position ahead. */
function canFinish(course: WoodsCourse, s: number, t: number, table: Uint8Array): boolean {
  const { grid } = course.hints
  const n = grid.s.length - 1
  const m = grid.t.length - 1
  const i = Math.min(n, Math.ceil((s / course.person.length) * n - 1e-9))
  const j = Math.min(m, Math.ceil((t / course.dog.length) * m - 1e-9))
  return table[i * (m + 1) + j] === 1
}

export interface WoodsState {
  s: number
  t: number
  /** How the leash lies now. */
  rope: Rope
  /** Longest leash needed so far. */
  longest: number
  /** The walk so far, as positions where a walker started or stopped. */
  trace: Walk
  status: 'walking' | 'snapped' | 'arrived'
}

export const woodsStart = (course: WoodsCourse): WoodsState => ({
  s: 0,
  t: 0,
  rope: course.start,
  longest: ropeLength(course.start, course.trees),
  trace: [[0, 0]],
  status: 'walking',
})

/** The rope after both walkers moved on from (s, t) to (s1, t1) along their paths. */
export function ropeAfter(
  course: WoodsCourse,
  rope: Rope,
  s: number,
  t: number,
  s1: number,
  t1: number,
): Rope {
  return moveDogAlong(
    movePersonAlong(rope, course.person, s, s1, course.trees),
    course.dog,
    t,
    t1,
    course.trees,
  )
}

/** The rope at positions (s, t), carried from the gate (it depends only on the positions). */
export const ropeAt = (course: WoodsCourse, s: number, t: number): Rope =>
  ropeAfter(course, course.start, 0, 0, s, t)

export const leashOf = (course: WoodsCourse, rope: Rope) => ropeLength(rope, course.trees)

/**
 * Advances the walk by dt seconds, as `step` in the park: the walk is checked at four points of the
 * frame, and the moment the leash would get too long is found by bisection.
 */
export function stepWoods(course: WoodsCourse, state: WoodsState, input: Input, dt: number): WoodsState {
  if (state.status !== 'walking' || (!input.person && !input.dog) || dt <= 0) return state
  const ds = input.person ? course.speed * dt : 0
  const dt2 = input.dog ? course.speed * dt : 0
  const at = (f: number): [number, number] => [
    Math.min(course.person.length, state.s + f * ds),
    Math.min(course.dog.length, state.t + f * dt2),
  ]
  const samples = 4
  let from = { s: state.s, t: state.t, rope: state.rope }
  let snapped = false
  for (let k = 1; k <= samples; k++) {
    const [s, t] = at(k / samples)
    const rope = ropeAfter(course, from.rope, from.s, from.t, s, t)
    if (leashOf(course, rope) <= course.leash) {
      from = { s, t, rope }
      continue
    }
    let lo = (k - 1) / samples
    let hi = k / samples
    const base = from
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2
      const [ms, mt] = at(mid)
      const r = ropeAfter(course, base.rope, base.s, base.t, ms, mt)
      if (leashOf(course, r) > course.leash) hi = mid
      else {
        lo = mid
        from = { s: ms, t: mt, rope: r }
      }
    }
    snapped = true
    break
  }
  const { s, t, rope } = from
  const longest = Math.max(state.longest, leashOf(course, rope))
  const trace = extendTrace(state.trace, [s, t], [s > state.s, t > state.t])
  const arrived = s >= course.person.length && t >= course.dog.length
  return { s, t, rope, longest, trace, status: snapped ? 'snapped' : arrived ? 'arrived' : 'walking' }
}

/** Adds a position; a straight run (same walkers moving) only moves its last point. */
function extendTrace(trace: Walk, next: [number, number], moved: [boolean, boolean]): Walk {
  const n = trace.length
  if (n >= 2) {
    const [s1, t1] = trace[n - 1]!
    const [s0, t0] = trace[n - 2]!
    if (s1 > s0 === moved[0] && t1 > t0 === moved[1]) return [...trace.slice(0, -1), next]
  }
  return [...trace, next]
}

/** Can the castle still be reached from here with this leash? (False shows the "dead end" banner.) */
export const stillPossibleInWoods = (course: WoodsCourse, state: WoodsState) =>
  canFinish(course, state.s, state.t, course.hints.loose)

/**
 * Who should walk now (as `advice` in the park): while the leash is slack both walk if they can; once
 * it is nearly taut, the one whose step shortens the leash most. A move counts only if the leash stays
 * within its length on the way and the castle can still be reached (with a little to spare).
 */
export function woodsAdvice(course: WoodsCourse, state: WoodsState): Advice {
  const ahead = 0.4
  const leash = leashOf(course, state.rope)
  const moves = (
    [
      ['both', ahead, ahead],
      ['person', ahead, 0],
      ['dog', 0, ahead],
    ] as const
  ).flatMap(([who, ds, dt]) => {
    const s1 = Math.min(course.person.length, state.s + ds)
    const t1 = Math.min(course.dog.length, state.t + dt)
    if (s1 === state.s && t1 === state.t) return []
    let rope = state.rope
    let ok = true
    for (let k = 1, s = state.s, t = state.t; k <= 4 && ok; k++) {
      const s2 = state.s + (k / 4) * (s1 - state.s)
      const t2 = state.t + (k / 4) * (t1 - state.t)
      rope = ropeAfter(course, rope, s, t, s2, t2)
      ok = leashOf(course, rope) <= course.leash
      s = s2
      t = t2
    }
    ok &&= canFinish(course, s1, t1, course.hints.safe)
    return ok ? [{ who, after: leashOf(course, rope) }] : []
  })
  if (moves.length === 0) return null
  if (leash < TAUT_SHARE * course.leash) return moves[0]!.who
  const single = moves.filter((m) => m.who !== 'both' && m.after < leash).sort((a, b) => a.after - b.after)
  return (single[0] ?? moves[0]!).who
}

/**
 * Why the leash snapped: it was caught on a tree, or the walker ahead should have waited (the one
 * whose step would not have shortened it), or someone should have waited earlier.
 */
export function woodsSnapReason(
  course: WoodsCourse,
  state: WoodsState,
): 'tree' | 'dogWait' | 'personWait' | 'earlier' {
  if (state.rope.wraps.length > 0) return 'tree'
  const now = leashOf(course, state.rope)
  const step = 0.1
  const personOn = ropeAfter(
    course,
    state.rope,
    state.s,
    state.t,
    Math.min(course.person.length, state.s + step),
    state.t,
  )
  if (leashOf(course, personOn) < now) return 'dogWait'
  const dogOn = ropeAfter(
    course,
    state.rope,
    state.s,
    state.t,
    state.s,
    Math.min(course.dog.length, state.t + step),
  )
  if (leashOf(course, dogOn) < now) return 'personWait'
  return 'earlier'
}

/** Positions of person and dog for a point of the walk. */
export function woodsPositions(course: WoodsCourse, s: number, t: number): { person: Vec2; dog: Vec2 } {
  return { person: pointAt(course.person, s), dog: pointAt(course.dog, t) }
}

/** Is there a walk with leash length eps (judged on the grid of positions)? For the theory view. */
export function walkExistsInWoods(course: WoodsCourse, eps: number): boolean {
  return reachable(course.hints.grid, eps)[0] === 1
}

/** The longest leash on a walk and where (sampled every 5 cm along the walk, with the rope). */
export function tightestInWoods(course: WoodsCourse, walk: Walk): { leash: number; at: [number, number] } {
  let rope = course.start
  let [s, t] = walk[0]!
  rope = ropeAfter(course, rope, 0, 0, s, t)
  let leash = leashOf(course, rope)
  let at: [number, number] = [s, t]
  for (const [s1, t1] of walk.slice(1)) {
    const steps = Math.max(1, Math.ceil(Math.max(s1 - s, t1 - t) / 0.05))
    for (let k = 1; k <= steps; k++) {
      const ns = s + ((s1 - s) * k) / steps
      const nt = t + ((t1 - t) * k) / steps
      rope = ropeAfter(
        course,
        rope,
        s + ((s1 - s) * (k - 1)) / steps,
        t + ((t1 - t) * (k - 1)) / steps,
        ns,
        nt,
      )
      const l = leashOf(course, rope)
      if (l > leash) {
        leash = l
        at = [ns, nt]
      }
    }
    s = s1
    t = t1
  }
  return { leash, at }
}
