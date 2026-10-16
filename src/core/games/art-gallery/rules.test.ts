import { describe, expect, it } from 'vitest'
import { ALL_LEVELS, EXPERT_LEVELS, isRecord, leaderboardScore, splitScore, starsFor } from './rules'
import { ART_GALLERY_LEVELS } from './levels.fixture'

describe('rules', () => {
  it('gives stars by the number of torches', () => {
    expect([2, 3, 4, 5, 9].map((n) => starsFor(n, 4))).toEqual([3, 3, 3, 2, 1])
    expect(isRecord(3, 4)).toBe(true)
    expect(isRecord(4, 4)).toBe(false)
  })

  it('orders all 14 levels once, the expert set being those with 12 or more torches', () => {
    expect([...ALL_LEVELS].sort()).toEqual(ART_GALLERY_LEVELS.map((l) => l.name).sort())
    expect([...EXPERT_LEVELS].sort()).toEqual(
      ART_GALLERY_LEVELS.filter((l) => l.torches >= 12)
        .map((l) => l.name)
        .sort(),
    )
  })

  it('packs torches and seconds into one leaderboard score', () => {
    expect(leaderboardScore(4, 61.4)).toBe(4061)
    expect(leaderboardScore(4, 5000)).toBe(4999)
    expect(splitScore(4061)).toEqual({ torches: 4, seconds: 61 })
    expect(leaderboardScore(3, 999)).toBeLessThan(leaderboardScore(4, 0))
  })
})
