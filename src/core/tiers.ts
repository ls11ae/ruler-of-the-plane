/**
 * Difficulty tiers, the same three in every game: "Leicht", "Mittel", "Schwer". A game maps its levels
 * (or, in "Erobere das Land", the computer's strength) to them; the tier screen at the start of a game
 * and each game's level picker show them in this order.
 */
export const TIERS = ['easy', 'medium', 'hard'] as const
export type Tier = (typeof TIERS)[number]

export const isTier = (value: unknown): value is Tier => (TIERS as readonly unknown[]).includes(value)

/** The tier after this one, if any. */
export const nextTier = (tier: Tier): Tier | undefined => TIERS[TIERS.indexOf(tier) + 1]

/** Where a level stands in its game's tiers. */
export interface TierPosition<L> {
  tier: Tier
  /** Its index in the tier (from 0). */
  index: number
  count: number
  /** The level after it in the same tier, or the first of the next tier with levels. */
  next?: { level: L; tier: Tier }
}

/** The tier of a level and what comes after it; undefined for a level that is in no tier. */
export function tierPosition<L>(tiers: Record<Tier, readonly L[]>, level: L): TierPosition<L> | undefined {
  for (const [t, tier] of TIERS.entries()) {
    const levels = tiers[tier]
    const index = levels.indexOf(level)
    if (index < 0) continue
    let next: TierPosition<L>['next']
    if (index + 1 < levels.length) next = { level: levels[index + 1]!, tier }
    else {
      const later = TIERS.slice(t + 1).find((x) => tiers[x].length > 0)
      if (later) next = { level: tiers[later][0]!, tier: later }
    }
    return { tier, index, count: levels.length, next }
  }
  return undefined
}

/** Where to start a tier: its first level without a win yet, else its first level. */
export function firstOpen<L>(levels: readonly L[], won: (level: L) => boolean): L | undefined {
  return levels.find((l) => !won(l)) ?? levels[0]
}

/** Stars collected in a tier (at most three per level) and how many there are. */
export function tierStars<L>(
  levels: readonly L[],
  stars: (level: L) => number,
): { got: number; max: number } {
  return {
    got: levels.reduce((sum, l) => sum + Math.min(3, Math.max(0, stars(l))), 0),
    max: 3 * levels.length,
  }
}
