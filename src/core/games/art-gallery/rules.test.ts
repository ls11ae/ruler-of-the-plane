import { describe, expect, it } from 'vitest'
import {
  ALL_LEVELS,
  EXPERT_LEVELS,
  isRecord,
  leaderboardScore,
  MAIN_LEVELS,
  splitScore,
  starsFor,
  TIER_LEVELS,
} from './rules'
import { ART_GALLERY_LEVELS } from './levels.fixture'

describe('rules', () => {
  it('gives stars by the number of torches', () => {
    expect([2, 3, 4, 5, 9].map((n) => starsFor(n, 4))).toEqual([3, 3, 3, 2, 1])
    expect(isRecord(3, 4)).toBe(true)
    expect(isRecord(4, 4)).toBe(false)
  })

  it('orders all 14 levels once; experts get the spike box and the levels with 12 or more torches', () => {
    expect([...ALL_LEVELS].sort()).toEqual(ART_GALLERY_LEVELS.map((l) => l.name).sort())
    expect([...EXPERT_LEVELS].sort()).toEqual(
      ART_GALLERY_LEVELS.filter((l) => l.torches >= 12 || l.name === 'agLevel13_4')
        .map((l) => l.name)
        .sort(),
    )
    expect(MAIN_LEVELS).toHaveLength(9)
  })

  it('starts "Mittel" with the dungeon whose pillars are smallest; large pillars come later', () => {
    const area = (ring: readonly (readonly [number, number])[]) =>
      Math.abs(
        ring.reduce(
          (s, [x, y], i) => s + x * ring[(i + 1) % ring.length]![1] - ring[(i + 1) % ring.length]![0] * y,
          0,
        ),
      ) / 2
    // The largest pillar as a share of the floor.
    const largest = (name: string) => {
      const level = ART_GALLERY_LEVELS.find((l) => l.name === name)!
      const holes = level.holes.map(area)
      return holes.length ? Math.max(...holes) / (area(level.outer) - holes.reduce((s, a) => s + a, 0)) : 0
    }
    const [first, ...rest] = TIER_LEVELS.medium
    expect(largest(first!)).toBeGreaterThan(0)
    for (const name of rest.filter((n) => largest(n) > 0))
      expect(largest(name)).toBeGreaterThan(largest(first!))
  })

  it('packs torches and seconds into one leaderboard score', () => {
    expect(leaderboardScore(4, 61.4)).toBe(4061)
    expect(leaderboardScore(4, 5000)).toBe(4999)
    expect(splitScore(4061)).toEqual({ torches: 4, seconds: 61 })
    expect(leaderboardScore(3, 999)).toBeLessThan(leaderboardScore(4, 0))
  })
})
