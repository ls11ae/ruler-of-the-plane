import { describe, expect, it } from 'vitest'
import { firstOpen, isTier, nextTier, tierPosition, tierStars, type Tier } from './tiers'

const TIERS: Record<Tier, readonly string[]> = { easy: ['a', 'b'], medium: ['c'], hard: ['d', 'e'] }

describe('tiers', () => {
  it('knows its tiers and their order', () => {
    expect(isTier('medium')).toBe(true)
    expect(isTier('normal')).toBe(false)
    expect(nextTier('easy')).toBe('medium')
    expect(nextTier('hard')).toBeUndefined()
  })

  it('finds a level in its tier and the level after it', () => {
    expect(tierPosition(TIERS, 'a')).toEqual({
      tier: 'easy',
      index: 0,
      count: 2,
      next: { level: 'b', tier: 'easy' },
    })
    // The last level of a tier leads to the next tier.
    expect(tierPosition(TIERS, 'b')?.next).toEqual({ level: 'c', tier: 'medium' })
    expect(tierPosition(TIERS, 'c')?.next).toEqual({ level: 'd', tier: 'hard' })
    expect(tierPosition(TIERS, 'e')?.next).toBeUndefined()
    expect(tierPosition(TIERS, 'x')).toBeUndefined()
  })

  it('skips empty tiers', () => {
    expect(tierPosition({ easy: ['a'], medium: [], hard: ['d'] }, 'a')?.next).toEqual({
      level: 'd',
      tier: 'hard',
    })
  })

  it('starts a tier at its first level without a win', () => {
    expect(firstOpen(['a', 'b', 'c'], (l) => l === 'a')).toBe('b')
    expect(firstOpen(['a', 'b'], () => true)).toBe('a')
    expect(firstOpen([], () => false)).toBeUndefined()
  })

  it('counts at most three stars per level', () => {
    expect(tierStars(['a', 'b', 'c'], (l) => (l === 'a' ? 3 : l === 'b' ? 5 : 0))).toEqual({ got: 6, max: 9 })
  })
})
