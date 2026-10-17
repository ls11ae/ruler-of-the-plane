import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../../geometry/types'
import { mulberry32 } from '../../../random'
import { frechetDistance } from '../frechet'
import { makePath, pointAt } from '../path'
import { moveDogAlong, movePersonAlong, ropeLength, straightRope } from './rope'
import { searchWoods } from './search'
import { makeTree } from './trees'

const randomLine = (rng: () => number, start: Vec2, n: number): Vec2[] => [
  start,
  ...Array.from({ length: n }, (_, i): Vec2 => [
    start[0] + 2 * (i + 1) + rng() * 2,
    start[1] + (rng() - 0.5) * 6,
  ]),
]

describe('search in the woods', () => {
  it('finds the Fréchet distance when no tree is near', () => {
    const rng = mulberry32(5)
    for (let k = 0; k < 6; k++) {
      const person = randomLine(rng, [0, 0], 5)
      const dog = randomLine(rng, [0.5, 0.5], 6)
      const step = 0.05
      const result = searchWoods(person, dog, [makeTree([100, 100])], step)
      // At the samples the walk can only be a little worse than the exact optimum, never much better.
      const exact = frechetDistance(person, dog)
      expect(result.target).toBeGreaterThan(exact - step)
      expect(result.target).toBeLessThan(exact + 2 * step)
    }
  })

  it('meets every pair of positions with the leash lying one way only, and the rope agrees', () => {
    // The dog circles a tree, the person a wider circle around it: the leash winds and unwinds.
    const circle = (r: number, start: Vec2): Vec2[] => [
      start,
      ...Array.from({ length: 13 }, (_, k): Vec2 => {
        const a = -Math.PI / 2 - (2 * Math.PI * k) / 12
        return [10 + r * Math.cos(a), 10 - r * Math.sin(a)]
      }),
      [20, 10],
    ]
    const person = circle(3, [2, 14])
    const dog = circle(1.5, [2.5, 14.5])
    const trees = [makeTree([10, 10], 0.5)]
    const result = searchWoods(person, dog, trees, 0.1)
    expect(result.classesPerPosition).toBe(1)
    // The rope carried along the walk of the search has the search's length at every sample.
    const P = makePath(person)
    const Q = makePath(dog)
    let rope = straightRope(pointAt(P, 0), pointAt(Q, 0))
    let s = 0
    let t = 0
    for (const sample of result.samples) {
      rope = movePersonAlong(rope, P, s, sample.s, trees)
      rope = moveDogAlong(rope, Q, t, sample.t, trees)
      s = sample.s
      t = sample.t
      expect(ropeLength(rope, trees)).toBeCloseTo(sample.leash, 9)
    }
    // Walking round together keeps the leash short; it would wind around the trunk otherwise.
    expect(result.target).toBeLessThan(2)
  })
})
