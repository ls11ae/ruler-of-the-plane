import { describe, expect, it } from 'vitest'
import type { Vec2 } from './types'

describe('toolchain', () => {
  it('runs tests', () => {
    const p: Vec2 = [1, 2]
    expect(p[0] + p[1]).toBe(3)
  })
})
