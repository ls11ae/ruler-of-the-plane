import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isSimple, pointInRing, validatePolygonWithHoles } from '../../src/core/geometry/polygon'
import type { Level, LevelIndex } from '../../src/core/levels/schema'
import { checkTours, makeLawn } from '../../src/core/games/lawn-mowing/mowing'
import { parseLevelName } from './convert'
import { convertAll, levelFiles } from './import'

const root = join(import.meta.dirname, '..', '..')
const levelsDir = join(root, 'public', 'levels')

function committedFiles(): Map<string, string> {
  const files = new Map<string, string>()
  for (const e of readdirSync(levelsDir, { recursive: true, withFileTypes: true })) {
    if (!e.isFile()) continue
    const path = relative(levelsDir, join(e.parentPath, e.name)).split('\\').join('/')
    files.set(path, readFileSync(join(levelsDir, path), 'utf8'))
  }
  return files
}

const committed = committedFiles()
const index = JSON.parse(committed.get('index.json') ?? '{}') as LevelIndex
const levels: Level[] = Object.values(index.collections ?? {})
  .flat()
  .map((id) => JSON.parse(committed.get(`${id}.json`) ?? 'null') as Level)

describe('shipped levels (public/levels)', () => {
  it('match a fresh import (run `npm run levels` after changing the importer)', () => {
    const fresh = levelFiles(convertAll(join(root, 'legacy', 'levels'), join(root, 'levels')))
    expect([...committed.keys()].sort()).toEqual([...fresh.keys()].sort())
    for (const [path, content] of fresh) expect(committed.get(path), path).toBe(content)
  })

  it('contain all 37 Unity levels and the new maps', () => {
    const counts = Object.fromEntries(Object.entries(index.collections).map(([c, ids]) => [c, ids.length]))
    expect(counts).toEqual({
      'art-gallery': 14,
      'kings-taxes/mst': 4,
      'kings-taxes/spanner': 4,
      'kings-taxes/tsp': 3,
      divide: 9,
      'convex-hull': 3,
      voronoi: 3,
      'lawn-mowing': 6,
    })
    expect(levels.every((l) => l !== null)).toBe(true)
  })

  it('list the levels in Unity order', () => {
    for (const ids of Object.values(index.collections)) {
      const numbers = ids.map((id) => levels.find((l) => l.id === id)!.number)
      expect(numbers).toEqual(numbers.map((_, i) => i + 1))
    }
  })

  it('carry the parameters of their file names', () => {
    for (const level of levels) {
      if (level.collection === 'lawn-mowing' && level.competition) continue
      const { number, param } = parseLevelName(level.collection, level.name)
      expect(level.number).toBe(number)
      if (level.collection === 'art-gallery') expect(level.torches).toBe(param)
      if (level.collection === 'kings-taxes/spanner') expect(level.ratio).toBe(param)
      if (level.collection === 'divide') expect(level.swaps).toBe(param)
    }
  })

  describe.each(levels.filter((l) => l.collection === 'art-gallery'))('$id', (level) => {
    it('is a valid polygon with holes, outer boundary positive, holes negative', () => {
      expect(validatePolygonWithHoles(level.outer, level.holes)).toEqual([])
      const area = (ring: readonly (readonly [number, number])[]) =>
        ring.reduce((s, [x1, y1], i) => {
          const [x2, y2] = ring[(i + 1) % ring.length]!
          return s + x1 * y2 - x2 * y1
        }, 0)
      expect(area(level.outer)).toBeGreaterThan(0)
      for (const hole of level.holes) expect(area(hole)).toBeLessThan(0)
    })
  })

  it('have holes exactly in art gallery levels 2, 4, 5, 7, 9, 10, 11, 12 and 14', () => {
    const withHoles = levels.flatMap((l) =>
      l.collection === 'art-gallery' && l.holes.length ? [l.number] : [],
    )
    expect(withHoles).toEqual([2, 4, 5, 7, 9, 10, 11, 12, 14])
  })

  it('give Divide levels an even number of each kind of soldier', () => {
    for (const level of levels) {
      if (level.collection !== 'divide') continue
      for (const kind of [level.spearmen, level.archers, level.mages])
        expect(kind.length % 2, level.id).toBe(0)
    }
  })

  it('normalise IPE levels to the Unity size and keep Unity assets as they are', () => {
    const size = { 'art-gallery': 9, 'kings-taxes': 6, divide: 5, 'convex-hull': 6, voronoi: 16 }
    for (const level of levels) {
      const { minX, minY, maxX, maxY } = level.bounds
      const extent = Math.max(maxX - minX, maxY - minY)
      if (level.source.endsWith('.ipe')) {
        const expected = size[level.collection.split('/')[0] as keyof typeof size]
        expect(extent, level.id).toBeCloseTo(expected, 5)
        expect(minX + maxX, level.id).toBeCloseTo(0, 5)
        expect(minY + maxY, level.id).toBeCloseTo(0, 5)
      }
    }
    const div1 = levels.find((l) => l.id === 'divide/divLevel1_0')!
    expect(div1.bounds.maxX - div1.bounds.minX).toBeCloseTo(3.7, 5)
    expect(div1.bounds.maxY - div1.bounds.minY).toBeCloseTo(2.755475, 5)
    const hull2 = levels.find((l) => l.id === 'convex-hull/hullLevel2')!
    expect([hull2.bounds.maxX - hull2.bounds.minX, hull2.bounds.maxY - hull2.bounds.minY]).toEqual([3, 6])
  })

  describe.each(levels.filter((l) => l.collection === 'voronoi'))('$id', (level) => {
    it('has simple land rings, land positive and lakes negative, and places on land', () => {
      const area = (ring: readonly (readonly [number, number])[]) =>
        ring.reduce((s, [x1, y1], i) => {
          const [x2, y2] = ring[(i + 1) % ring.length]!
          return s + x1 * y2 - x2 * y1
        }, 0)
      for (const ring of [...level.land, ...level.water]) expect(isSimple(ring)).toBe(true)
      expect(level.land.some((r) => area(r) > 0)).toBe(true)
      const onLand = (p: readonly [number, number]) =>
        level.land.reduce((w, r) => w + (pointInRing(p, r) === 1 ? Math.sign(area(r)) : 0), 0) > 0
      for (const p of [...level.cities, ...level.mines, ...level.forests, ...level.mountains]) {
        expect(onLand(p), `${p.join(', ')}`).toBe(true)
      }
      expect(level.cities.length).toBeGreaterThanOrEqual(3)
      expect(level.mines.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe.each(levels.filter((l) => l.collection === 'lawn-mowing'))('$id', (level) => {
    const lawn = makeLawn(level.outer, level.holes, level.cutter, level.cutterCenter)

    it('is a lawn of 300 to 500 cells with a 3 × 3 cutter for 1 and 2 cutters (booth lawns)', () => {
      if (level.competition) return
      expect(lawn.cells.count).toBeGreaterThanOrEqual(300)
      expect(lawn.cells.count).toBeLessThanOrEqual(500)
      expect(lawn.offsets).toHaveLength(9)
      expect(level.variants.map((v) => v.cutters)).toEqual([1, 2])
      expect(level.holes.length).toBeGreaterThan(0)
    })

    it('has solutions that mow everything, with the stated longest tour', () => {
      for (const v of level.variants) {
        if (!v.solution) continue
        const result = checkTours(lawn, v.solution.tours)
        expect(result.uncovered, v.uid).toEqual([])
        expect(result.maxTourLength).toBe(v.solution.maxTourLength)
        expect(v.solution.tours).toHaveLength(v.cutters)
      }
    })
  })
})
