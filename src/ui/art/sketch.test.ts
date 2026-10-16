import { describe, expect, it } from 'vitest'
import { offsetRing, smoothClosedPath } from './sketch'

describe('sketch helpers', () => {
  const square = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ] as const

  it('offsets outwards for both orientations', () => {
    const out = offsetRing(square, 1)
    expect(out[0]![0]).toBeLessThan(0)
    expect(out[0]![1]).toBeLessThan(0)
    const outReversed = offsetRing([...square].reverse(), 1)
    expect(outReversed[3]![0]).toBeLessThan(0)
    expect(outReversed[3]![1]).toBeLessThan(0)
  })

  it('draws a closed path through the points', () => {
    const d = smoothClosedPath(square)
    expect(d.startsWith('M0,0C')).toBe(true)
    expect(d.endsWith('0,0Z')).toBe(true)
    expect(d.match(/C/g)).toHaveLength(4)
  })
})
