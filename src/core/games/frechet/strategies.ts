import { pointAt, type Path } from './path'
import type { Advice, Input } from './rules'

/**
 * Simple strategies a visitor might use, played with the game's own step function (in the park or in
 * the woods), to judge how hard a walk is: a walk is hard when all of them snap the leash. A careful
 * player who follows the game's hint with a human reaction time must still get through.
 */
export interface Playable<S> {
  person: Path
  dog: Path
  /** Walking speed, metres per second. */
  speed: number
  start: S
  step(state: S, input: Input, dt: number): S
  where(state: S): { s: number; t: number; status: 'walking' | 'snapped' | 'arrived' }
  leash(state: S): number
  /** How far the leash wraps round a trunk (turns; in the woods), recorded while playing. */
  wrap?(state: S): number
  /** How often the leash is wound round a trunk (the most turns of any trunk; in the woods). */
  coil?(state: S): number
}

export const STRATEGIES = ['both', 'behind', 'share', 'greedy'] as const
export type StrategyId = (typeof STRATEGIES)[number]

export interface Outcome {
  arrived: boolean
  /** Where the walk ended (positions in metres); the leash snapped there unless it arrived. */
  at: [number, number]
  /** In the woods: the most the leash wrapped round a trunk on the way (turns of contact, 1 = 360°). */
  wrap: number
  /** In the woods: the most times the leash was wound round one trunk on the way (as the badge counts). */
  coil: number
}

const BOTH: Input = { person: true, dog: true }
const PERSON: Input = { person: true, dog: false }
const DOG: Input = { person: false, dog: true }

/** A walker at the end of its path cannot walk on; the other one walks. */
function feasible<S>(game: Playable<S>, state: S, input: Input): Input {
  const { s, t } = game.where(state)
  const personDone = s >= game.person.length
  const dogDone = t >= game.dog.length
  if (personDone && dogDone) return input
  if (personDone) return DOG
  if (dogDone) return PERSON
  return input
}

/**
 * The strategies: `both` walk all the time; the one `behind` (further from the castle along the line
 * from the gate to the castle) walks alone, both when level; keep pace by the `share` of the path walked;
 * `greedy` takes the move (both, person, dog) after which the leash is shortest.
 */
export function strategy<S>(game: Playable<S>, id: StrategyId): (state: S) => Input {
  const start = pointAt(game.person, 0)
  const end = pointAt(game.person, game.person.length)
  const len = Math.hypot(end[0] - start[0], end[1] - start[1]) || 1
  const dir = [(end[0] - start[0]) / len, (end[1] - start[1]) / len] as const
  const along = (p: readonly [number, number]) => (p[0] - start[0]) * dir[0] + (p[1] - start[1]) * dir[1]
  const level = 0.25
  switch (id) {
    case 'both':
      return () => BOTH
    case 'behind':
      return (state) => {
        const { s, t } = game.where(state)
        const a = along(pointAt(game.person, s))
        const b = along(pointAt(game.dog, t))
        return Math.abs(a - b) < level ? BOTH : a < b ? PERSON : DOG
      }
    case 'share':
      return (state) => {
        const { s, t } = game.where(state)
        // Compare in metres of the dog's trail: where the dog would be at the person's share.
        const due = (s / game.person.length) * game.dog.length
        return Math.abs(due - t) < level ? BOTH : due > t ? DOG : PERSON
      }
    case 'greedy':
      return (state) => {
        const probe = 0.1 / game.speed
        let best = BOTH
        let shortest = Infinity
        for (const input of [BOTH, PERSON, DOG]) {
          const next = game.step(state, feasible(game, state, input), probe)
          const leash = game.where(next).status === 'snapped' ? Infinity : game.leash(next)
          if (leash < shortest - 1e-9) {
            shortest = leash
            best = input
          }
        }
        return best
      }
  }
}

/** Plays a policy at 60 frames per second until the walk arrives or the leash snaps. */
export function play<S>(game: Playable<S>, policy: (state: S) => Input | null, reaction = 0): Outcome {
  const frame = 1 / 60
  let state = game.start
  let input: Input | null = null
  let held = Infinity
  const limit = (4 * (game.person.length + game.dog.length)) / game.speed / frame
  let wrap = game.wrap?.(state) ?? 0
  let coil = game.coil?.(state) ?? 0
  for (let k = 0; k < limit; k++) {
    const where = game.where(state)
    if (where.status !== 'walking') break
    if (held >= reaction) {
      input = policy(state)
      held = 0
    }
    if (!input) break
    state = game.step(state, feasible(game, state, input), frame)
    held += frame
    if (game.wrap) wrap = Math.max(wrap, game.wrap(state))
    if (game.coil) coil = Math.max(coil, game.coil(state))
  }
  const { s, t, status } = game.where(state)
  return { arrived: status === 'arrived', at: [s, t], wrap, coil }
}

/** Plays one of the simple strategies. */
export const playStrategy = <S>(game: Playable<S>, id: StrategyId) => play(game, strategy(game, id))

/**
 * A careful player: follows the game's hint (who should walk), but looks at it only every `reaction`
 * seconds and keeps the keys as they are in between.
 */
export function playCareful<S>(game: Playable<S>, advise: (state: S) => Advice, reaction = 0.25): Outcome {
  return play(
    game,
    (state) => {
      const a = advise(state)
      return a === null ? null : a === 'both' ? BOTH : a === 'person' ? PERSON : DOG
    },
    reaction,
  )
}
