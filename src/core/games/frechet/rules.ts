import type { Vec2 } from '../../geometry/types'
import { canFinish, optimalWalk, walkLeash, type Walk } from './frechet'
import type { WalkLevel } from './levels'
import { distance, makePath, pointAt, type Path } from './path'

/** Walking speed of person and dog, in metres per second (the same for both). */
export const WALK_SPEED = 2.2

/** From this share of the leash length on, the leash is drawn taut (orange-red) and a hint appears. */
export const TAUT_SHARE = 0.85

/** A prepared level: paths with arc lengths, the Fréchet distance, the leash and the computer's walk. */
export interface Course {
  level: WalkLevel
  person: Path
  dog: Path
  /** Fréchet distance: the shortest leash that allows the walk. */
  shortest: number
  /** The leash of this level. */
  leash: number
  /** A walk that needs only the shortest leash. */
  computer: Walk
}

/** Rounds a leash length up to 0.1 m (shown with one decimal). */
export const roundUp = (metres: number) => Math.ceil(metres * 10 - 1e-9) / 10

export function makeCourse(level: WalkLevel): Course {
  const { distance: shortest, walk } = optimalWalk(level.person, level.dog)
  return {
    level,
    person: makePath(level.person),
    dog: makePath(level.dog),
    shortest,
    // At least 0.2 m above the minimum, so a walk stays possible with human reaction times.
    leash: roundUp(Math.max(shortest * level.slack, shortest + 0.2)),
    computer: walk,
  }
}

/** Positions of person and dog (arc lengths along their paths) and what happened so far. */
export interface WalkState {
  s: number
  t: number
  /** Longest leash needed so far. */
  longest: number
  /** The walk so far, as positions where a walker started or stopped (for the theory view). */
  trace: Walk
  status: 'walking' | 'snapped' | 'arrived'
}

export const startState = (course: Course): WalkState => ({
  s: 0,
  t: 0,
  longest: leashAt(course, 0, 0),
  trace: [[0, 0]],
  status: 'walking',
})

export const leashAt = (course: Course, s: number, t: number) =>
  distance(pointAt(course.person, s), pointAt(course.dog, t))

export interface Input {
  person: boolean
  dog: boolean
}

/**
 * Advances the walk by dt seconds: the person and/or the dog walk forwards while their key is held.
 * If the leash would get longer than allowed, the walk stops at the moment it does (found by
 * bisection) and the leash snaps.
 */
export function step(course: Course, state: WalkState, input: Input, dt: number): WalkState {
  if (state.status !== 'walking' || (!input.person && !input.dog) || dt <= 0) return state
  const ds = input.person ? WALK_SPEED * dt : 0
  const dt2 = input.dog ? WALK_SPEED * dt : 0
  const at = (f: number): [number, number] => [
    Math.min(course.person.length, state.s + f * ds),
    Math.min(course.dog.length, state.t + f * dt2),
  ]
  // Within one frame the leash length is checked at a few points (frames are short; a walker moves a
  // few centimetres), then the first point beyond the limit is narrowed down.
  const samples = 4
  let reached = 1
  let snapped = false
  for (let k = 1; k <= samples; k++) {
    const [s, t] = at(k / samples)
    if (leashAt(course, s, t) > course.leash) {
      let lo = (k - 1) / samples
      let hi = k / samples
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2
        const [ms, mt] = at(mid)
        if (leashAt(course, ms, mt) > course.leash) hi = mid
        else lo = mid
      }
      reached = lo
      snapped = true
      break
    }
  }
  const [s, t] = at(reached)
  const longest = Math.max(state.longest, leashAt(course, s, t))
  const moved: [boolean, boolean] = [s > state.s, t > state.t]
  const trace = extendTrace(state.trace, [s, t], moved)
  const arrived = s >= course.person.length && t >= course.dog.length
  return { s, t, longest, trace, status: snapped ? 'snapped' : arrived ? 'arrived' : 'walking' }
}

/** Adds a position; a straight run (same walkers moving) only moves its last point. */
function extendTrace(trace: Walk, next: [number, number], moved: [boolean, boolean]): Walk {
  const n = trace.length
  if (n >= 2) {
    const [s1, t1] = trace[n - 1]!
    const [s0, t0] = trace[n - 2]!
    const same = s1 > s0 === moved[0] && t1 > t0 === moved[1]
    if (same) return [...trace.slice(0, -1), next]
  }
  return [...trace, next]
}

/** Can the walk still be finished from here with the level's leash? */
export const stillPossible = (course: Course, state: WalkState) =>
  canFinish(course.person, course.dog, state.s, state.t, course.leash)

export type Advice = 'person' | 'dog' | 'both' | null

/**
 * Who should walk now, for the hint when the leash is nearly taut: both if they can, else the person
 * alone or the dog alone; null if no short move keeps the walk possible (a dead end).
 */
export function advice(course: Course, state: WalkState): Advice {
  const step = 0.4
  const ok = (ds: number, dt: number) => {
    const s = Math.min(course.person.length, state.s + ds)
    const t = Math.min(course.dog.length, state.t + dt)
    if (s === state.s && t === state.t) return false
    const move: Walk = [
      [state.s, state.t],
      [s, t],
    ]
    return (
      walkLeash(course.person, course.dog, move) <= course.leash &&
      canFinish(course.person, course.dog, s, t, course.leash)
    )
  }
  if (ok(step, step)) return 'both'
  const person = ok(step, 0)
  const dog = ok(0, step)
  if (person && dog) {
    // Either works: the one that shortens the leash.
    return leashAt(course, state.s + step, state.t) <= leashAt(course, state.s, state.t + step)
      ? 'person'
      : 'dog'
  }
  return person ? 'person' : dog ? 'dog' : null
}

/** Stars for an arrival: 3 if the longest leash was within 10 % of the shortest possible, 2 within 25 %. */
export function starsFor(longest: number, shortest: number): number {
  const ratio = longest / Math.max(shortest, 1e-9)
  return ratio <= 1.1 ? 3 : ratio <= 1.25 ? 2 : 1
}

/** Leaderboard score: the longest leash needed, in centimetres (lower is better). */
export const leaderboardScore = (longest: number) => Math.round(longest * 100)

/** Position of person and dog for a point of the walk. */
export function positions(course: Course, s: number, t: number): { person: Vec2; dog: Vec2 } {
  return { person: pointAt(course.person, s), dog: pointAt(course.dog, t) }
}
