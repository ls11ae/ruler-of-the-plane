import { describe, expect, it } from 'vitest'
import { pointInRing, signedArea } from '../../geometry/polygon'
import { segmentsIntersect } from '../../geometry/predicates'
import type { Vec2 } from '../../geometry/types'
import { mulberry32, type Rng } from '../../random'
import { dungeonArea, dungeonBounds, edgesOf, isOnFloor, type Dungeon } from './dungeon'
import { ART_GALLERY_LEVELS } from './levels.fixture'
import { visibilityPolygon } from './visibility'

/** A random point strictly on the floor. */
export function randomFloorPoint(d: Dungeon, rng: Rng): Vec2 {
  const b = dungeonBounds(d)
  for (;;) {
    const p: Vec2 = [b.minX + rng() * (b.maxX - b.minX), b.minY + rng() * (b.maxY - b.minY)]
    if (isOnFloor(d, p)) return p
  }
}

/** Brute force: p is visible from q if the segment qp meets no wall (exact). */
function seesExact(d: Dungeon, q: Vec2, p: Vec2): boolean {
  return edgesOf(d).every((e) => !segmentsIntersect(q, p, e.a, e.b))
}

function distanceToRing(p: Vec2, ring: readonly Vec2[]): number {
  let best = Infinity
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!
    const b = ring[(i + 1) % ring.length]!
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len2 = dx * dx + dy * dy
    const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0
    best = Math.min(best, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy))
  }
  return best
}

describe('visibilityPolygon', () => {
  it('sees a convex room completely', () => {
    const room: Dungeon = {
      outer: [
        [0, 0],
        [4, 0],
        [4, 3],
        [0, 3],
      ],
      holes: [],
    }
    const vis = visibilityPolygon(room, [1, 1])
    expect(signedArea(vis)).toBeCloseTo(12, 9)
  })

  it('handles a pillar and grazing rays, also from round coordinates', () => {
    const room: Dungeon = {
      outer: [
        [0, 0],
        [6, 0],
        [6, 6],
        [0, 6],
      ],
      holes: [
        [
          [2, 2],
          [2, 4],
          [4, 4],
          [4, 2],
        ],
      ],
    }
    // From (1, 3) the rays through the pillar's near corners (2, 2) and (2, 4) have slopes ∓1 and meet
    // the walls at x = 4. Shadow: for x in [2, 4] the band between y = 4 − x and y = x + 2 (area 8), for
    // x in [4, 6] the full height (area 12), minus the pillar itself (area 4): 16. Corners of the
    // pillar and of the room are collinear with the torch, which exercises the perturbation.
    const vis = visibilityPolygon(room, [1, 3])
    const shadow = 36 - 4 - signedArea(vis)
    expect(shadow).toBeCloseTo(16, 6)
  })

  describe.each(ART_GALLERY_LEVELS.map((l) => [l.name, l] as const))('%s', (_, level) => {
    it('agrees with brute-force visibility on random points', () => {
      const rng = mulberry32(level.number * 7919)
      const area = dungeonArea(level)
      for (let trial = 0; trial < 6; trial++) {
        const q = randomFloorPoint(level, rng)
        const vis = visibilityPolygon(level, q)
        expect(signedArea(vis)).toBeGreaterThan(0)
        expect(signedArea(vis)).toBeLessThanOrEqual(area * (1 + 1e-9))
        expect(pointInRing(q, vis)).toBe(1)
        let mismatches = 0
        for (let i = 0; i < 400; i++) {
          const p = randomFloorPoint(level, rng)
          const inside = pointInRing(p, vis) === 1
          if (inside !== seesExact(level, q, p) && distanceToRing(p, vis) > 1e-7) mismatches++
        }
        expect(mismatches, `torch at ${q}`).toBe(0)
      }
    })
  })
})
