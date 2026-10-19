import type { Tier } from '../../tiers'

/**
 * Rules of "Licht ins Verlies": a torch on the floor lights its visibility polygon; the level is won as
 * soon as the whole floor is lit. Stars compare the torches used with the level's number k (the level
 * designer's number, not a proven minimum): at most k three stars, k + 1 two, more one; fewer than k
 * is a record.
 */
export type StarCount = 1 | 2 | 3

export function starsFor(torches: number, k: number): StarCount {
  if (torches <= k) return 3
  if (torches === k + 1) return 2
  return 1
}

export const isRecord = (torches: number, k: number) => torches < k

/** No game limit on torches (more cost stars); this cap only keeps the board readable and fast. */
export const MAX_TORCHES = 30

/**
 * The 14 levels (the 2020 set of "Designing Art Galleries", see docs/legacy-unity-notes.md) re-ordered
 * by difficulty: by the allowed torches k, then by the number of corners and pillars; except that "Mittel"
 * starts with the dungeon whose pillars are smallest (Kevin, 2026-10-19: in a narrow corridor round large
 * pillars, inside and outside are hard to tell apart at first), then the one without pillars, then the
 * corridors round large pillars. The expert set has the levels with 12 or more torches and the
 * spike-box-like agLevel13_4 (spike boxes were the least liked puzzles in the paper's user study; Kevin,
 * 2026-10-16).
 */
export const MAIN_LEVELS = [
  'agLevel3_2', // k 2, 18 corners
  'agLevel1_3', // k 3, 15 corners, spiky
  'agLevel6_3', // k 3, 20 corners
  'agLevel2_3', // k 3, 3 small pillars
  'agLevel4_8', // k 8, 6 pillars, the largest 36 % of the floor (the level of the mockup)
  'agLevel8_4', // k 4, 46 corners with many niches, no pillars
  'agLevel10_4', // k 4, a narrow corridor round 3 large pillars (the largest 53 % of the floor)
  'agLevel5_5', // k 5, corridors round 5 large pillars (58 %)
  'agLevel12_7', // k 7, corridors round 7 large pillars (45 %; planar vertex cover construction)
] as const

export const EXPERT_LEVELS = [
  'agLevel13_4', // k 4, spike box with 33 corners
  'agLevel9_12', // k 12
  'agLevel7_13', // k 13, planar 3SAT construction: 13 torches are necessary
  'agLevel11_14', // k 14
  'agLevel14_17', // k 17
] as const

export type LevelName = (typeof MAIN_LEVELS)[number] | (typeof EXPERT_LEVELS)[number]

export const ALL_LEVELS: readonly LevelName[] = [...MAIN_LEVELS, ...EXPERT_LEVELS]

/**
 * The tiers: the main set split by its order, the dungeons for two or three torches as "Leicht", the
 * others (four to eight torches, mostly with pillars) as "Mittel"; the expert set is "Schwer".
 */
export const TIER_LEVELS: Record<Tier, readonly LevelName[]> = {
  easy: MAIN_LEVELS.slice(0, 4),
  medium: MAIN_LEVELS.slice(4),
  hard: EXPERT_LEVELS,
}

export const levelId = (name: LevelName) => `art-gallery/${name}`

/** Leaderboard score: torches first, then seconds (lower is better). */
export function leaderboardScore(torches: number, seconds: number): number {
  return torches * 1000 + Math.min(999, Math.max(0, Math.round(seconds)))
}

export function splitScore(score: number): { torches: number; seconds: number } {
  return { torches: Math.floor(score / 1000), seconds: score % 1000 }
}
