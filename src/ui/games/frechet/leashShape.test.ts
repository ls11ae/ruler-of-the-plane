import { describe, expect, it } from 'vitest'
import { polylineLength, slackLeash, slackPiece, trembling } from './leashShape'

describe('leash with its real length', () => {
  it('hangs down with the length of the leash, and is straight when taut', () => {
    const down: [number, number] = [0, 1]
    const curve = slackPiece([0, 0], [2, 0], 3, down)
    expect(polylineLength(curve)).toBeCloseTo(3, 2)
    // It sags downwards (y grows down on screen).
    expect(Math.max(...curve.map(([, y]) => y))).toBeGreaterThan(0.5)
    expect(slackPiece([0, 0], [2, 0], 2, down)).toEqual([
      [0, 0],
      [2, 0],
    ])
    // Walkers side by side with a long leash: still the right length.
    expect(polylineLength(slackPiece([0, 0], [0.3, 0.1], 3.4, down))).toBeCloseTo(3.4, 2)
  })

  it('puts the slack into the two end pieces of a leash round a trunk', () => {
    const pts: [number, number][] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [4, 2],
    ]
    const drawn = slackLeash(pts, 7, [0, 1])
    expect(polylineLength(drawn)).toBeCloseTo(7, 2)
    expect(drawn[0]).toEqual([0, 0])
    expect(drawn[drawn.length - 1]).toEqual([4, 2])
    // The corners stay where they are.
    expect(drawn).toContainEqual([2, 0])
    expect(drawn).toContainEqual([2, 2])
  })

  it('trembles sideways but keeps its ends', () => {
    const line = trembling(
      [
        [0, 0],
        [4, 0],
      ],
      0.05,
      0.3,
    )
    expect(line[0]).toEqual([0, 0])
    expect(line[line.length - 1]).toEqual([4, 0])
    expect(Math.max(...line.map(([, y]) => Math.abs(y)))).toBeLessThanOrEqual(0.05)
    expect(Math.max(...line.map(([, y]) => Math.abs(y)))).toBeGreaterThan(0.02)
  })
})
