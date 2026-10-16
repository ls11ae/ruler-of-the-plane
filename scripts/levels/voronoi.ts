import { areaD, differenceD, FillRule, intersectD, unionD, type PathD, type PathsD } from 'clipper2-ts'
import type { Vec2 } from '../../src/core/geometry/types'
import { LEVEL_SIZE, type VoronoiLevel } from '../../src/core/levels/schema'
import { dedupeRing, normaliser, round } from './convert'
import type { IpePage } from './ipe'

/**
 * Maps of "Erobere das Land" (`levels/voronoi/map<n>-<name>.ipe`), drawn in IPE with straight segments:
 *
 * - layer `frame`: one axis-parallel rectangle, the map sheet;
 * - layer `land`: closed paths, the land (may reach beyond the frame, e.g. a valley filling the sheet);
 * - layer `water`: closed paths, lakes and rivers, cut out of the land;
 * - markers on any layer: `square` city, `cross` gold mine, `disk` forest, `circle` mountains.
 *
 * Normalised like the other IPE levels: the frame is centred on the origin, its larger side scaled to 16,
 * y flipped. The land that scores is computed here with Clipper2 (frame ∩ land − water).
 */
const MARKERS = { square: 'cities', cross: 'mines', disk: 'forests', circle: 'mountains' } as const

/** Decimal places of the clipped rings (as {@link round}). */
const PRECISION = 6

const toPathD = (ring: readonly Vec2[]): PathD => ring.map(([x, y]) => ({ x, y }))
const fromPathsD = (paths: PathsD): Vec2[][] =>
  paths.map((path) => dedupeRing(path.map((p) => [round(p.x), round(p.y)] as const)))

function closedRings(page: IpePage, layer: string): Vec2[][] {
  return page.paths
    .filter((p) => p.layer === layer)
    .map((p) => {
      if (!p.closed) throw new Error(`open path in layer "${layer}"`)
      return dedupeRing(p.vertices)
    })
    .filter((r) => r.length >= 3)
}

/** Converts the page of a map file; `base` holds id, name, number and source. */
export function convertVoronoiMap(
  base: Pick<VoronoiLevel, 'id' | 'name' | 'number' | 'source'>,
  page: IpePage,
): VoronoiLevel {
  const frames = closedRings(page, 'frame')
  const frame = frames[0]
  if (frames.length !== 1 || frame!.length !== 4)
    throw new Error('needs exactly one rectangle in layer "frame"')
  const rect = frame!
  if (!rect.every(([x, y], i) => rect[(i + 1) % 4]![0] === x || rect[(i + 1) % 4]![1] === y)) {
    throw new Error('the frame must be an axis-parallel rectangle')
  }
  const toLevel = normaliser(rect, LEVEL_SIZE.voronoi)
  const sheet = toPathD(rect.map(toLevel))
  const land = closedRings(page, 'land').map((r) => toPathD(r.map(toLevel)))
  const water = closedRings(page, 'water').map((r) => toPathD(r.map(toLevel)))
  if (!land.length) throw new Error('no land (closed paths in layer "land")')

  const outline = intersectD(
    unionD(land, [], FillRule.NonZero, PRECISION),
    [sheet],
    FillRule.NonZero,
    PRECISION,
  )
  const allWater = unionD(water, [], FillRule.NonZero, PRECISION)
  const scoring = differenceD(outline, allWater, FillRule.NonZero, PRECISION).filter(
    (p) => Math.abs(areaD(p)) > 1e-6,
  )
  const inland = intersectD(allWater, outline, FillRule.NonZero, PRECISION).filter(
    (p) => Math.abs(areaD(p)) > 1e-6,
  )

  const lists = { cities: [] as Vec2[], mines: [] as Vec2[], forests: [] as Vec2[], mountains: [] as Vec2[] }
  for (const m of page.markers) {
    const list = MARKERS[m.kind as keyof typeof MARKERS]
    if (!list) throw new Error(`unexpected marker "${m.kind}"`)
    lists[list].push(toLevel(m.at))
  }
  const b = sheet.reduce(
    (acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      minY: Math.min(acc.minY, p.y),
      maxX: Math.max(acc.maxX, p.x),
      maxY: Math.max(acc.maxY, p.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  )
  return {
    id: base.id,
    collection: 'voronoi',
    name: base.name,
    number: base.number,
    source: base.source,
    bounds: b,
    land: fromPathsD(scoring),
    water: fromPathsD(inland),
    ...lists,
  }
}
