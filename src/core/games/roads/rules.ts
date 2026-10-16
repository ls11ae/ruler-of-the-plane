/** Scoring of "Straßenbau". */

/** Stars by hints used: none three, one two, more one. */
export const starsFor = (hints: number) => (hints === 0 ? 3 : hints === 1 ? 2 : 1)

/** Each hint adds this many seconds to the leaderboard time. */
export const HINT_PENALTY_S = 20

/** Leaderboard score: seconds to the optimal network plus the hint penalty (lower is better). */
export const leaderboardScore = (seconds: number, hints: number) =>
  Math.min(5999, Math.round(seconds) + hints * HINT_PENALTY_S)

/** "+x %" with one decimal below 10 %, so a slightly long network never reads "+0 %". */
export function percentOver(share: number): string {
  const p = share * 100
  if (p < 10) return (Math.ceil(p * 10) / 10).toFixed(1)
  return String(Math.round(p))
}
