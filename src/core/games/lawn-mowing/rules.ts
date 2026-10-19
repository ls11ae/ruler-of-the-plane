import type { Tier } from '../../tiers'

/** The booth lawns in the order of the game (ids below `public/levels/`). */
export const LAWNS = [
  'lawn-mowing/lawn1',
  'lawn-mowing/lawn2',
  'lawn-mowing/lawn3',
  'lawn-mowing/lawn4',
  'lawn-mowing/lawn5',
] as const
export type LawnId = (typeof LAWNS)[number]

/**
 * The tiers, for one mower and for two (chosen beside them): "Leicht" and "Mittel" by the size of the
 * lawn (304, then 345 and 426 cells), "Schwer" the two lawns where the best simple strategy is clearly
 * worse than the best tour both alone and with two mowers (at least 13.5 % above it; see
 * `levels/lawn-mowing/README.md`).
 */
export const TIER_LAWNS: Record<Tier, readonly LawnId[]> = {
  easy: ['lawn-mowing/lawn1'],
  medium: ['lawn-mowing/lawn2', 'lawn-mowing/lawn4'],
  hard: ['lawn-mowing/lawn3', 'lawn-mowing/lawn5'],
}

/** The competition instance shown in the theory view. */
export const COMPETITION = 'lawn-mowing/smr_882k_481_3s3'

/**
 * The small lawn whose good tours the explanation after a finished lawn plays (for one or two mowers, as
 * the visitor played): none of the booth lawns, so it does not show a level's solution (Kevin, 2026-10-19).
 */
export const EXAMPLE_LAWN = 'lawn-mowing/example'

/** Holding a key: one step at once, the next after `delay`, then one every `interval` (ms). */
export const STEP_REPEAT = { delay: 220, interval: 115, maxPerUpdate: 2 } as const
/** Pace of the drive home after "Feierabend" (ms per step). */
export const HOME_STEP_MS = 70

/**
 * Stars for the longest tour. With the solver's target: three stars up to 10 % above it, two up to 30 %
 * above, a record below it. Until the solver's tours arrive the strip strategy is the reference: three
 * stars for matching or beating it, two up to 20 % above.
 */
export function starsFor(
  longest: number,
  target: { length: number; solver: boolean },
): { stars: number; record: boolean } {
  const { length, solver } = target
  const three = solver ? length * 1.1 : length
  const two = solver ? length * 1.3 : length * 1.2
  return {
    stars: longest <= three ? 3 : longest <= two ? 2 : 1,
    record: solver && longest < length,
  }
}
