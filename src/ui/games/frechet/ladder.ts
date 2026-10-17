import { TIERS, WALKS_BY_TIER, type Tier, type WalkId } from '../../../core/games/frechet/levels'
import { WOODS_BY_TIER, type WoodsId } from '../../../core/games/frechet/woods/shapes'

/** A walk of the game: in the park or in the woods. */
export type Stop = { kind: 'park'; id: WalkId } | { kind: 'woods'; id: WoodsId }

/**
 * The order of all walks for "Nächstes Level": by tier ("Leicht", "Mittel", "Schwer"), in each first
 * the park, then the woods.
 */
export const LADDER: readonly Stop[] = TIERS.flatMap((tier: Tier): Stop[] => [
  ...WALKS_BY_TIER[tier].map((id): Stop => ({ kind: 'park', id })),
  ...WOODS_BY_TIER[tier].map((id): Stop => ({ kind: 'woods', id })),
])

/** The walk after this one, if any. */
export function nextStop(stop: Stop): Stop | undefined {
  const i = LADDER.findIndex((s) => s.kind === stop.kind && s.id === stop.id)
  return LADDER[i + 1]
}
