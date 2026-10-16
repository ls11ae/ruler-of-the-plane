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
 * The 14 Unity levels re-ordered by difficulty: by the allowed torches k, then by the number of corners
 * and pillars. Levels with 12 or more torches form the expert set.
 */
export const MAIN_LEVELS = [
  'agLevel3_2', // k 2, 18 corners
  'agLevel1_3', // k 3, 15 corners, spiky
  'agLevel6_3', // k 3, 20 corners
  'agLevel2_3', // k 3, 3 pillars
  'agLevel13_4', // k 4, star with 33 corners
  'agLevel10_4', // k 4, 3 pillars
  'agLevel8_4', // k 4, 46 corners with many niches
  'agLevel5_5', // k 5, 5 pillars
  'agLevel12_7', // k 7, 7 pillars
  'agLevel4_8', // k 8, 6 pillars (the level of the mockup)
] as const

export const EXPERT_LEVELS = ['agLevel9_12', 'agLevel7_13', 'agLevel11_14', 'agLevel14_17'] as const

export type LevelName = (typeof MAIN_LEVELS)[number] | (typeof EXPERT_LEVELS)[number]

export const ALL_LEVELS: readonly LevelName[] = [...MAIN_LEVELS, ...EXPERT_LEVELS]

export const levelId = (name: LevelName) => `art-gallery/${name}`

/** Leaderboard score: torches first, then seconds (lower is better). */
export function leaderboardScore(torches: number, seconds: number): number {
  return torches * 1000 + Math.min(999, Math.max(0, Math.round(seconds)))
}

export function splitScore(score: number): { torches: number; seconds: number } {
  return { torches: Math.floor(score / 1000), seconds: score % 1000 }
}
