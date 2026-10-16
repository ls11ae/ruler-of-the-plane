import { boundsOf, signedArea } from '../../src/core/geometry/polygon'
import type { Bounds, Vec2 } from '../../src/core/geometry/types'
import {
  LEVEL_SIZE,
  type ArtGalleryLevel,
  type Collection,
  type ConvexHullLevel,
  type DivideLevel,
  type KingsTaxesLevel,
  type Level,
} from '../../src/core/levels/schema'
import { readIpePage, type IpePage } from './ipe'
import { parseNumber } from './numbers'
import { readUnityAsset, type UnityAsset } from './unity-asset'
import { convertVoronoiMap } from './voronoi'

/** Legacy folder (below `legacy/levels/`) → collection. */
export const FOLDERS: Record<string, Collection> = {
  ArtGallery: 'art-gallery',
  'KingsTaxes/MST': 'kings-taxes/mst',
  'KingsTaxes/Spanner': 'kings-taxes/spanner',
  'KingsTaxes/TSP': 'kings-taxes/tsp',
  Divide: 'divide',
  ConvexHull: 'convex-hull',
}

/** Folder below `levels/` (new level sources, made for this edition) → collection. */
export const NEW_FOLDERS: Record<string, Collection> = {
  voronoi: 'voronoi',
}

const NAME_PATTERNS: Record<Collection, RegExp> = {
  'art-gallery': /^agLevel(\d+)_(\d+)$/,
  'kings-taxes/mst': /^ktLevel(\d+)$/,
  'kings-taxes/spanner': /^ktLevel(\d+)_([\d.]+)$/,
  'kings-taxes/tsp': /^ktLevel(\d+)$/,
  divide: /^divLevel(\d+)_(\d+)$/,
  'convex-hull': /^hullLevel(\d+)$/,
  voronoi: /^map(\d+)-[a-z-]+$/,
}

/** Splits a level file name into the level number and the optional parameter after `_`. */
export function parseLevelName(collection: Collection, name: string): { number: number; param?: number } {
  const match = NAME_PATTERNS[collection].exec(name)
  if (!match) throw new Error(`unexpected file name "${name}" for ${collection}`)
  const number = parseNumber(match[1]!, 'level number')
  return match[2] === undefined ? { number } : { number, param: parseNumber(match[2], 'level parameter') }
}

/** Rounds to 6 decimals (diff-friendly JSON) and turns -0 into 0. */
export function round(v: number): number {
  const r = Math.round(v * 1e6) / 1e6
  return r === 0 ? 0 : r
}

const roundPoint = ([x, y]: Vec2): Vec2 => [round(x), round(y)]

/**
 * Maps IPE coordinates (y up) to level coordinates: centre the bounding box of all given points on the
 * origin, scale its larger side to `size`, flip y.
 */
export function normaliser(points: Iterable<Vec2>, size: number): (p: Vec2) => Vec2 {
  const b = boundsOf(points)
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  const extent = Math.max(b.maxX - b.minX, b.maxY - b.minY)
  if (!(extent > 0)) throw new Error('level has no extent')
  const s = size / extent
  return ([x, y]) => roundPoint([(x - cx) * s, -(y - cy) * s])
}

/** Unity units with y up → level coordinates (y down), without scaling. */
const flipY = ([x, y]: Vec2): Vec2 => roundPoint([x, -y])

function roundedBounds(points: Iterable<Vec2>): Bounds {
  const b = boundsOf(points)
  return { minX: round(b.minX), minY: round(b.minY), maxX: round(b.maxX), maxY: round(b.maxY) }
}

/** Removes repeated consecutive vertices (including a repeated first vertex at the end). */
export function dedupeRing(ring: readonly Vec2[]): Vec2[] {
  const out: Vec2[] = []
  for (const p of ring) {
    const last = out[out.length - 1]
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p)
  }
  while (out.length > 1 && out[0]![0] === out[out.length - 1]![0] && out[0]![1] === out[out.length - 1]![1]) {
    out.pop()
  }
  return out
}

function orient(ring: Vec2[], positive: boolean): Vec2[] {
  return signedArea(ring) > 0 === positive ? ring : [...ring].reverse()
}

interface Source {
  collection: Collection
  name: string
  /** Path relative to the repository root. */
  source: string
}

function base(src: Source, number: number, bounds: Bounds) {
  return {
    id: `${src.collection}/${src.name}`,
    collection: src.collection,
    name: src.name,
    number,
    source: src.source,
    bounds,
  }
}

function markersOf(page: IpePage, kinds: Record<string, string>, src: Source): Record<string, Vec2[]> {
  const out: Record<string, Vec2[]> = Object.fromEntries(Object.values(kinds).map((k) => [k, []]))
  for (const m of page.markers) {
    const key = kinds[m.kind]
    if (!key) throw new Error(`${src.source}: unexpected marker "${m.kind}"`)
    out[key]!.push(m.at)
  }
  if (page.paths.length) throw new Error(`${src.source}: unexpected paths in a marker level`)
  return out
}

function artGallery(src: Source, page: IpePage, torches: number): ArtGalleryLevel {
  if (page.markers.length) throw new Error(`${src.source}: unexpected markers in an art gallery level`)
  // Paths with fewer than 3 distinct vertices are drawing leftovers (agLevel14_17 has one with 2).
  const rings = page.paths.map((p) => dedupeRing(p.vertices)).filter((r) => r.length >= 3)
  if (!rings.length) throw new Error(`${src.source}: no polygon`)
  const largest = rings.reduce((best, r) => (Math.abs(signedArea(r)) > Math.abs(signedArea(best)) ? r : best))
  const toLevel = normaliser(largest, LEVEL_SIZE[src.collection])
  // Orient after the y flip, which reverses the orientation.
  const outer = orient(dedupeRing(largest.map(toLevel)), true)
  const holes = rings.filter((r) => r !== largest).map((r) => orient(dedupeRing(r.map(toLevel)), false))
  return { ...base(src, 0, roundedBounds(outer)), collection: 'art-gallery', torches, outer, holes }
}

function kingsTaxes(src: Source, page: IpePage, ratio: number | undefined): KingsTaxesLevel {
  const { villages = [], castles = [] } = markersOf(page, { disk: 'villages', square: 'castles' }, src)
  const toLevel = normaliser([...villages, ...castles], LEVEL_SIZE[src.collection])
  const v = villages.map(toLevel)
  const c = castles.map(toLevel)
  return {
    ...base(src, 0, roundedBounds([...v, ...c])),
    collection: src.collection as KingsTaxesLevel['collection'],
    ...(ratio !== undefined ? { ratio } : {}),
    villages: v,
    castles: c,
  }
}

function divide(
  src: Source,
  swaps: number,
  kinds: Record<'spearmen' | 'archers' | 'mages', Vec2[]>,
): DivideLevel {
  const all = [...kinds.spearmen, ...kinds.archers, ...kinds.mages]
  return {
    ...base(src, 0, roundedBounds(all)),
    collection: 'divide',
    swaps,
    spearmen: kinds.spearmen,
    archers: kinds.archers,
    mages: kinds.mages,
  }
}

function convexHull(src: Source, points: Vec2[]): ConvexHullLevel {
  return { ...base(src, 0, roundedBounds(points)), collection: 'convex-hull', points }
}

function fromIpe(src: Source, xml: string, param: number | undefined): Level {
  const page = readIpePage(xml)
  switch (src.collection) {
    case 'art-gallery':
      return artGallery(src, page, param!)
    case 'kings-taxes/mst':
    case 'kings-taxes/tsp':
    case 'kings-taxes/spanner':
      return kingsTaxes(src, page, param)
    case 'divide': {
      const kinds = markersOf(page, { disk: 'spearmen', square: 'archers', cross: 'mages' }, src)
      const toLevel = normaliser(Object.values(kinds).flat(), LEVEL_SIZE.divide)
      return divide(src, param ?? 0, {
        spearmen: kinds.spearmen!.map(toLevel),
        archers: kinds.archers!.map(toLevel),
        mages: kinds.mages!.map(toLevel),
      })
    }
    case 'convex-hull': {
      const { points = [] } = markersOf(page, { disk: 'points' }, src)
      return convexHull(src, points.map(normaliser(points, LEVEL_SIZE['convex-hull'])))
    }
    case 'voronoi':
      return convertVoronoiMap(
        { id: `${src.collection}/${src.name}`, name: src.name, number: 0, source: src.source },
        page,
      )
  }
}

function fromUnityAsset(src: Source, asset: UnityAsset): Level {
  const list = (key: string) => {
    const points = asset.pointLists[key]
    if (!points) throw new Error(`${src.source}: missing list ${key}`)
    return points.map(flipY)
  }
  switch (src.collection) {
    case 'divide':
      return divide(src, parseNumber(asset.scalars.NumberOfSwaps ?? '0', 'NumberOfSwaps'), {
        spearmen: list('Spearmen'),
        archers: list('Archers'),
        mages: list('Mages'),
      })
    case 'convex-hull':
      return convexHull(src, list('Points'))
    default:
      throw new Error(`${src.source}: Unity assets are only expected for Divide and convex hull levels`)
  }
}

/**
 * Converts one level file. `folder` is the folder below `legacy/levels/` (e.g. `KingsTaxes/MST`) or, with
 * `fresh`, below `levels/` (e.g. `voronoi`); `fileName` includes the extension (`.ipe` or `.asset`).
 */
export function convertLevel(folder: string, fileName: string, content: string, fresh = false): Level {
  const collection = (fresh ? NEW_FOLDERS : FOLDERS)[folder]
  if (!collection) throw new Error(`unknown level folder "${folder}"`)
  const ext = /\.(ipe|asset)$/.exec(fileName)?.[1]
  if (!ext) throw new Error(`unsupported level file "${fileName}"`)
  const name = fileName.slice(0, -(ext.length + 1))
  const src: Source = {
    collection,
    name,
    source: `${fresh ? 'levels' : 'legacy/levels'}/${folder}/${fileName}`,
  }
  const { number, param } = parseLevelName(collection, name)
  try {
    const level = ext === 'ipe' ? fromIpe(src, content, param) : fromUnityAsset(src, readUnityAsset(content))
    if (ext === 'asset' && collection === 'divide' && param !== (level as DivideLevel).swaps) {
      throw new Error(`swaps in the file differ from the file name`)
    }
    return { ...level, number }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    throw new Error(message.startsWith(src.source) ? message : `${src.source}: ${message}`, { cause: e })
  }
}
