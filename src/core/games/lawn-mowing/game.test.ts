import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../geometry/types'
import { MowingRound } from './game'
import { checkTours, makeLawn } from './mowing'

const square = (x0: number, y0: number, x1: number, y1: number): Vec2[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
]
const CUTTER = square(0, 0, 3, 3)

describe('a round of mowing', () => {
  // A 6 × 3 lawn: one sweep along the middle row mows it.
  const lawn = makeLawn(square(0, 0, 6, 3), [], CUTTER, [1, 1])

  it('mows the start, counts steps and the way home', () => {
    const round = new MowingRound(lawn, [[1, 1]])
    expect(round.mowing.count).toBe(9)
    for (let i = 0; i < 3; i++) round.step(0, 'right')
    expect(round.mowing.done).toBe(true)
    expect(round.steps(0)).toBe(3)
    expect(round.stepsHome(0)).toBe(3)
    expect(round.longest()).toBe(6)
  })

  it('goes home on a shortest way and yields tours the verifier accepts', () => {
    const round = new MowingRound(lawn, [[1, 1]])
    round.step(0, 'right')
    round.step(0, 'right')
    round.step(0, 'up')
    round.step(0, 'right')
    for (const p of round.wayHome(0)) round.moveTo(0, p)
    expect(round.allHome()).toBe(true)
    const tours = round.tours()
    const check = checkTours(lawn, tours)
    expect(check.uncovered).toEqual([])
    expect(check.maxTourLength).toBe(round.longest())
    expect(round.longest()).toBe(8)
  })

  it('keeps cutters near the lawn', () => {
    const round = new MowingRound(lawn, [[1, 1]])
    let moved = 0
    while (round.step(0, 'left') !== null) moved++
    expect(moved).toBe(3) // from x = 1 to x = −2
  })

  it('counts the longer of two tours', () => {
    const round = new MowingRound(lawn, [
      [1, 1],
      [4, 1],
    ])
    expect(round.mowing.done).toBe(true)
    round.step(1, 'up')
    round.step(1, 'up')
    expect(round.longest()).toBe(4)
    expect(round.tourLength(0)).toBe(0)
  })

  it('takes steps back: only the cells that step alone mowed grow back', () => {
    const round = new MowingRound(lawn, [[1, 1]])
    round.step(0, 'right')
    round.step(0, 'right')
    expect(round.mowing.count).toBe(15)
    expect(round.undo(0)).toBe(3)
    expect(round.cutters[0]!.at).toEqual([2, 1])
    expect(round.steps(0)).toBe(1)
    expect(round.mowing.count).toBe(12)
    // Back and forth: the position stepped back from was mowed before, so nothing grows back.
    round.step(0, 'left')
    expect(round.undo(0)).toBe(0)
    expect(round.mowing.count).toBe(12)
    expect(round.undo(0)).toBe(3)
    expect(round.undo(0)).toBeNull()
    expect(round.mowing.count).toBe(9)
    expect(round.steps(0)).toBe(0)
  })

  it("keeps cells another cutter's footprint covers", () => {
    const round = new MowingRound(lawn, [
      [1, 1],
      [4, 1],
    ])
    round.step(0, 'right')
    round.step(0, 'right')
    expect(round.mowing.done).toBe(true)
    // Every cell the two steps mowed is also covered by cutter 1's start or by cutter 2.
    expect(round.undo(0)).toBe(0)
    expect(round.undo(0)).toBe(0)
    expect(round.mowing.count).toBe(18)
    expect(round.undo(1)).toBeNull()
  })
})
