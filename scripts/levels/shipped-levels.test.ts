import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validatePolygonWithHoles } from '../../src/core/geometry/polygon'
import type { Level, LevelIndex } from '../../src/core/levels/schema'
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
    const fresh = levelFiles(convertAll(join(root, 'legacy', 'levels')))
    expect([...committed.keys()].sort()).toEqual([...fresh.keys()].sort())
    for (const [path, content] of fresh) expect(committed.get(path), path).toBe(content)
  })

  it('contain all 37 Unity levels', () => {
    const counts = Object.fromEntries(Object.entries(index.collections).map(([c, ids]) => [c, ids.length]))
    expect(counts).toEqual({
      'art-gallery': 14,
      'kings-taxes/mst': 4,
      'kings-taxes/spanner': 4,
      'kings-taxes/tsp': 3,
      divide: 9,
      'convex-hull': 3,
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
    const size = { 'art-gallery': 9, 'kings-taxes': 6, divide: 5, 'convex-hull': 6 }
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
})
