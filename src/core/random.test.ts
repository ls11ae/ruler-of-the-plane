import { describe, expect, it } from 'vitest'
import { mulberry32, randomInt, shuffled } from './random'

describe('seeded random', () => {
  it('is reproducible and in range', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const xs = Array.from({ length: 1000 }, () => a())
    expect(xs).toEqual(Array.from({ length: 1000 }, () => b()))
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
    expect(Math.abs(xs.reduce((s, x) => s + x, 0) / xs.length - 0.5)).toBeLessThan(0.05)
  })

  it('shuffles a permutation', () => {
    const rng = mulberry32(1)
    const items = Array.from({ length: 20 }, (_, i) => i)
    const s = shuffled(items, rng)
    expect([...s].sort((x, y) => x - y)).toEqual(items)
    expect(s).not.toEqual(items)
    expect(new Set(Array.from({ length: 200 }, () => randomInt(rng, 3)))).toEqual(new Set([0, 1, 2]))
  })
})
