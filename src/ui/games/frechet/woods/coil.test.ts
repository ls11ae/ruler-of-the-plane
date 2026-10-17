import { describe, expect, it } from 'vitest'
import { moveDog, straightRope } from '../../../../core/games/frechet/woods/rope'
import { makeTree } from '../../../../core/games/frechet/woods/trees'
import { drawnRope } from './coil'

describe('drawn rope', () => {
  it('lies a little further out with every turn round a post', () => {
    const post = makeTree([5, 5], 0.1)
    let rope = straightRope([2, 5], [5, 6])
    for (let k = 1; k <= 2 * 16; k++) {
      const a = Math.PI / 2 + (2 * Math.PI * k) / 16
      rope = moveDog(rope, [5 + Math.cos(a), 5 + Math.sin(a)], [post])
    }
    const pts = drawnRope(rope, [post], 0.05, () => 0.2)
    const radii = pts.slice(1, -1).map(([x, y]) => Math.hypot(x - 5, y - 5))
    // From the drawn radius outwards, by 0.05 per turn: after one turn of corners about 0.25.
    expect(radii[0]).toBeCloseTo(0.2, 9)
    for (let i = 1; i < radii.length; i++) expect(radii[i]!).toBeGreaterThan(radii[i - 1]!)
    expect(radii[8]).toBeCloseTo(0.25, 9)
    expect(pts[0]).toEqual([2, 5])
    expect(pts[pts.length - 1]).toEqual(rope.b)
  })
})
