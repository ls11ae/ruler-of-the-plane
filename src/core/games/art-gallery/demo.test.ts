import { describe, expect, it } from 'vitest'
import { coverage, floorPaths } from './coverage'
import { DEMO_LEVELS, DEMO_TORCHES } from './demo'
import { isOnFloor } from './dungeon'
import { ART_GALLERY_LEVELS } from './levels.fixture'
import { visibilityPolygon } from './visibility'

describe('the torches of the attract demo', () => {
  for (const name of DEMO_LEVELS) {
    it(`light ${name} fully with at most its number of torches`, () => {
      const level = ART_GALLERY_LEVELS.find((l) => l.name === name)!
      const torches = DEMO_TORCHES[name]
      expect(torches.length).toBeGreaterThan(0)
      expect(torches.length).toBeLessThanOrEqual(level.torches)
      for (const t of torches) expect(isOnFloor(level, t)).toBe(true)
      const light = coverage(
        floorPaths(level),
        torches.map((t) => visibilityPolygon(level, t)),
      )
      expect(light.fullyLit).toBe(true)
    })
  }
})
