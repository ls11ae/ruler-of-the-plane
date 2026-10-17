import { describe, expect, it } from 'vitest'
import { cornerCount, guaranteedTorches, isOrthogonal, orthogonalTorches, type Dungeon } from './dungeon'
import { ART_GALLERY_LEVELS } from './levels.fixture'

/** An L-shaped room (6 corners), turned by `angle`. */
function lShape(angle: number): Dungeon {
  const ring: [number, number][] = [
    [0, 0],
    [4, 0],
    [4, 1],
    [1, 1],
    [1, 3],
    [0, 3],
  ]
  const [c, s] = [Math.cos(angle), Math.sin(angle)]
  return { outer: ring.map(([x, y]) => [x * c - y * s, x * s + y * c] as const), holes: [] }
}

describe('bounds', () => {
  it('recognises dungeons with only right angles, in any orientation', () => {
    expect(isOrthogonal(lShape(0))).toBe(true)
    expect(isOrthogonal(lShape(Math.PI / 5))).toBe(true)
    const bent = lShape(0)
    expect(
      isOrthogonal({ ...bent, outer: bent.outer.map(([x, y]) => [x + (x === 4 ? y * 0.1 : 0), y] as const) }),
    ).toBe(false)
  })

  it('⌊n/4⌋ only for orthogonal dungeons without pillars: of the shipped ones, agLevel3_2', () => {
    const ortho = ART_GALLERY_LEVELS.filter((l) => orthogonalTorches(l) !== null)
    expect(ortho.map((l) => l.name)).toEqual(['agLevel3_2'])
    const level = ortho[0]!
    expect(cornerCount(level)).toBe(18)
    expect(orthogonalTorches(level)).toBe(4)
    expect(guaranteedTorches(level)).toBe(6)
    // An orthogonal ring as a pillar does not count: the bound is for dungeons without pillars.
    expect(
      orthogonalTorches({
        outer: lShape(0).outer,
        holes: [
          [
            [0.2, 0.2],
            [0.2, 0.6],
            [0.6, 0.6],
            [0.6, 0.2],
          ],
        ],
      }),
    ).toBe(null)
  })
})
