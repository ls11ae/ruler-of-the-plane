import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../geometry/types'
import { cutterOffsets, holeKind, rasterize } from './grid'
import { checkTours, lowerBound, makeLawn, Mowing } from './mowing'
import { stripTours } from './strips'
import { cornersOf, positionsOf, tourLength, wayBack } from './tour'

interface PointSequence {
  x: number[]
  y: number[]
}
interface Fixture {
  instance: {
    instance_uid: string
    region_to_cover: { outer_boundary: PointSequence; inner_boundaries: PointSequence[] }
    cutter: PointSequence
    cutter_center: [number, number]
    number_of_cutters: number
  }
  regionCells: number
  cases: {
    name: string
    tours: PointSequence[]
    lengths: number[]
    maxTourLength: number
    uncovered: [number, number][]
  }[]
}

/** Tours checked by the pyutils27 verifier (`scripts/lawns/make_fixtures.py`). */
const FIXTURES = Object.values(
  import.meta.glob<Fixture>('../../../../levels/lawn-mowing/fixtures/*.json', {
    eager: true,
    import: 'default',
  }),
)

/** The booth lawns (one instance per lawn is enough: the variants share the region). */
const INSTANCES = Object.values(
  import.meta.glob<Fixture['instance']>('../../../../levels/lawn-mowing/instances/*_1s3.instance.json', {
    eager: true,
    import: 'default',
  }),
)

const ring = (s: PointSequence): Vec2[] => s.x.map((x, i) => [x, s.y[i]!] as const)
const lawnOf = (inst: Fixture['instance']) =>
  makeLawn(
    ring(inst.region_to_cover.outer_boundary),
    inst.region_to_cover.inner_boundaries.map(ring),
    ring(inst.cutter),
    inst.cutter_center,
  )

describe('agrees with the pyutils27 verifier', () => {
  it('has fixtures for the booth lawns and a competition instance', () => {
    expect(FIXTURES.map((f) => f.instance.instance_uid).sort()).toEqual([
      'lawn1_1s3',
      'lawn3_2s3',
      'lawn5_2s3',
      'smr_882k_481_3s3',
    ])
  })

  describe.each(FIXTURES)('$instance.instance_uid', (fixture) => {
    const lawn = lawnOf(fixture.instance)

    it('rasterizes the region to the same number of cells', () => {
      expect(lawn.cells.count).toBe(fixture.regionCells)
    })

    it.each(fixture.cases)('$name: same uncovered cells and tour lengths', (c) => {
      const result = checkTours(lawn, c.tours.map(ring))
      expect(result.lengths).toEqual(c.lengths)
      expect(result.maxTourLength).toBe(c.maxTourLength)
      // The fixture lists cells sorted by x, then y.
      const sorted = result.uncovered.map(([x, y]) => [x, y]).sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!)
      expect(sorted).toEqual(c.uncovered)
    })
  })
})

describe('grid', () => {
  it('rasterizes a square with a hole', () => {
    const outer: Vec2[] = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ]
    const hole: Vec2[] = [
      [1, 1],
      [1, 3],
      [3, 3],
      [3, 1],
    ]
    const grid = rasterize([outer, hole])
    expect(grid.count).toBe(12)
    expect(grid.has(0, 0)).toBe(true)
    expect(grid.has(1, 1)).toBe(false)
    expect(grid.has(4, 0)).toBe(false)
  })

  it('places a 3 × 3 cutter around its reference point as pyutils27 does', () => {
    const offsets = cutterOffsets(
      [
        [0, 0],
        [3, 0],
        [3, 3],
        [0, 3],
      ],
      [1, 1],
    )
    expect(offsets).toHaveLength(9)
    expect(offsets).toContainEqual([-1, -1])
    expect(offsets).toContainEqual([1, 1])
  })
})

describe('tours', () => {
  it('expand corners to unit steps and back', () => {
    const corners: Vec2[] = [
      [0, 0],
      [3, 0],
      [3, 2],
      [1, 2],
      [1, 1],
      [0, 1],
    ]
    const positions = positionsOf(corners)
    expect(positions).toHaveLength(tourLength(corners) + 1)
    expect(positions[positions.length - 1]).toEqual([0, 0])
    expect(cornersOf(positions)).toEqual(corners)
  })

  it('keep a turn back as a corner and a single point as a tour', () => {
    expect(
      cornersOf([
        [0, 0],
        [1, 0],
        [2, 0],
        [1, 0],
        [0, 0],
      ]),
    ).toEqual([
      [0, 0],
      [2, 0],
    ])
    expect(cornersOf([[5, 5]])).toEqual([[5, 5]])
    expect(tourLength([[5, 5]])).toBe(0)
  })

  it('go home on a shortest way, through more grass if there is a choice', () => {
    const way = wayBack([0, 0], [3, 2])
    expect(way).toHaveLength(5)
    expect(way[0]).toEqual([1, 0])
    expect(way[way.length - 1]).toEqual([3, 2])
    const upFirst = wayBack([0, 0], [3, 2], ([x, y]) => (x === 0 && y > 0 ? 1 : 0))
    expect(upFirst[0]).toEqual([0, 1])
  })
})

describe.each(INSTANCES)('booth lawn $instance_uid', (inst) => {
  const lawn = lawnOf(inst)

  it('is mowed completely by the strip strategy, for one and two cutters', () => {
    for (const k of [1, 2]) {
      const tours = stripTours(lawn, k)
      expect(tours).toHaveLength(k)
      const result = checkTours(lawn, tours)
      expect(result.uncovered).toEqual([])
      expect(result.maxTourLength).toBeGreaterThanOrEqual(lowerBound(lawn, k))
    }
  })

  it('has a lower bound from the cutter width: about a third of the cells per cutter', () => {
    const n = lawn.cells.count
    expect(lowerBound(lawn, 1)).toBeGreaterThanOrEqual((n - 9) / 3)
    expect(lowerBound(lawn, 1) % 2).toBe(0)
    expect(lowerBound(lawn, 2)).toBeLessThan(lowerBound(lawn, 1))
  })

  it('mows step by step and counts only new lawn cells', () => {
    const mowing = new Mowing(lawn)
    const start = lawn.cells.cells()[0]!
    const first = mowing.mowAt(start)
    expect(first).toBeGreaterThan(0)
    expect(mowing.mowAt(start)).toBe(0)
    expect(mowing.count).toBe(first)
    expect(mowing.fresh([start[0] + 1, start[1]])).toBeLessThanOrEqual(lawn.cutterWidth)
  })
})

describe('holes', () => {
  it('are small paved squares, paved paths and terraces by their shape, as drawn in lawns.txt', () => {
    const kinds = (uid: string) => {
      const inst = INSTANCES.find((i) => i.instance_uid === uid)!
      const counts: Record<string, number> = {}
      for (const h of inst.region_to_cover.inner_boundaries.map(ring)) {
        counts[holeKind(h)] = (counts[holeKind(h)] ?? 0) + 1
      }
      return counts
    }
    expect(kinds('lawn1_1s3')).toEqual({ terrace: 1, square: 1 })
    expect(kinds('lawn2_1s3')).toEqual({ path: 6 })
    expect(kinds('lawn3_1s3')).toEqual({ terrace: 1, square: 1, path: 1 })
    expect(kinds('lawn4_1s3')).toEqual({ square: 13 })
    expect(kinds('lawn5_1s3')).toEqual({ terrace: 1, square: 2, path: 2 })
  })
})
