import { describe, expect, it } from 'vitest'
import { signedArea } from '../../geometry/polygon'
import { cornerCount, dungeonArea } from './dungeon'
import { ART_GALLERY_LEVELS } from './levels.fixture'
import { fisk, threeColour, triangulate } from './triangulation'

describe.each(ART_GALLERY_LEVELS.map((l) => [l.name, l] as const))('%s', (_, level) => {
  it('is triangulated with every corner and the floor area', () => {
    const t = triangulate(level)
    const used = new Set(t.triangles.flat())
    expect(used.size).toBe(cornerCount(level))
    const area = t.triangles.reduce((s, tri) => s + Math.abs(signedArea(tri.map((i) => t.points[i]!))), 0)
    expect(area).toBeCloseTo(dungeonArea(level), 9)
    // n − 2 + 2h triangles
    expect(t.triangles).toHaveLength(cornerCount(level) - 2 + 2 * level.holes.length)
  })

  if (level.holes.length === 0) {
    it('Fisk: three colours, at most ⌊n/3⌋ guards, one guard in every triangle', () => {
      const f = fisk(level)!
      expect(f).not.toBeNull()
      const n = cornerCount(level)
      expect(f.guards.length).toBeLessThanOrEqual(Math.floor(n / 3))
      for (const tri of f.triangulation.triangles) {
        expect(tri.some((p) => f.colours[p] === f.guardColour)).toBe(true)
      }
    })
  }
})

it('Fisk on the hole-free Unity levels 1, 3, 6, 8 and 13 matches the bounds in CLAUDE.md', () => {
  const free = ART_GALLERY_LEVELS.filter((l) => l.holes.length === 0)
  expect(free.map((l) => l.number)).toEqual([1, 3, 6, 8, 13])
  expect(free.map((l) => Math.floor(cornerCount(l) / 3))).toEqual([5, 6, 6, 15, 11])
  expect(free.map((l) => l.torches)).toEqual([3, 2, 3, 4, 4])
  for (const l of free) expect(threeColour(triangulate(l))).not.toBeNull()
})
