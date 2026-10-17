import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { boundsOf } from '../../src/core/geometry/polygon'
import type { Vec2 } from '../../src/core/geometry/types'
import { componentCount, kruskal, networkLength, roadKey, type Road } from '../../src/core/games/roads/mst'
import { crossings, freeTree, greedyPlane, joinsTwoKinds } from '../../src/core/games/roads/plane'
import type { RoadsBichromaticLevel, RoadsSteinerLevel } from '../../src/core/levels/schema'
import { parseLevelName, round } from './convert'

/**
 * The bonus sets of "Straßenbau" from `levels/roads/`: "Kreuzungen" (`steiner/`, Euclidean Steiner trees)
 * and "Zwei Sorten" (`bichromatic/`, minimum plane bichromatic spanning trees). Each source file holds the
 * places and the optimum computed offline (`scripts/roads/steiner-maps.ts`, `scripts/roads/bichromatic.py`);
 * the import checks the optimum's shape and lengths and adds id, number and bounds.
 */
type Steiner = Omit<RoadsSteinerLevel, 'id' | 'collection' | 'number' | 'source' | 'bounds'>
type Bichromatic = Omit<RoadsBichromaticLevel, 'id' | 'collection' | 'number' | 'source' | 'bounds'>

const close = (a: number, b: number) => Math.abs(a - b) <= 1e-5 * (1 + Math.abs(b))

function check(condition: boolean, file: string, what: string) {
  if (!condition) throw new Error(`${file}: ${what}`)
}

/** A spanning tree on `n` nodes with the given length. */
function checkTree(
  file: string,
  nodes: readonly Vec2[],
  roads: readonly Road[],
  length: number,
  what: string,
) {
  check(
    roads.length === nodes.length - 1 && componentCount(nodes.length, roads) === 1,
    file,
    `${what} is no spanning tree`,
  )
  check(close(networkLength(nodes, roads), length), file, `${what}: length differs`)
}

const angleAt = (at: Vec2, a: Vec2, b: Vec2) => {
  const d = Math.abs(Math.atan2(a[1] - at[1], a[0] - at[0]) - Math.atan2(b[1] - at[1], b[0] - at[0]))
  return ((d > Math.PI ? 2 * Math.PI - d : d) * 180) / Math.PI
}

function steiner(file: string, rel: string, s: Steiner): RoadsSteinerLevel {
  const places = [...s.villages, ...s.castles]
  const nodes = [...places, ...s.optimum.junctions]
  checkTree(file, nodes, s.optimum.roads, s.optimum.length, 'optimum')
  s.optimum.junctions.forEach((_, i) => {
    const id = places.length + i
    const others = s.optimum.roads.filter((r) => r.includes(id)).map(([a, b]) => nodes[a === id ? b : a]!)
    check(others.length === 3, file, `junction ${i} has ${others.length} roads`)
    for (const [a, b] of [
      [0, 1],
      [1, 2],
      [0, 2],
    ] as const) {
      check(Math.abs(angleAt(nodes[id]!, others[a]!, others[b]!) - 120) < 1, file, `junction ${i}: not 120°`)
    }
  })
  check(close(kruskal(places).length, s.mstLength), file, 'MST length differs')
  check(s.optimum.length < s.mstLength, file, 'junctions do not help')
  const name = file.replace(/\.json$/, '')
  return {
    id: `roads/steiner/${name}`,
    collection: 'roads/steiner',
    name,
    number: parseLevelName('roads/steiner', name).number,
    source: rel,
    bounds: roundedBounds(places),
    villages: s.villages,
    castles: s.castles,
    optimum: s.optimum,
    mstLength: s.mstLength,
    method: s.method,
  }
}

const sameRoads = (a: readonly Road[], b: readonly Road[]) =>
  a.length === b.length && new Set(a.map(roadKey)).size === new Set([...a, ...b].map(roadKey)).size

function bichromatic(file: string, rel: string, s: Bichromatic): RoadsBichromaticLevel {
  const points = [...s.villages, ...s.castles]
  const v = s.villages.length
  checkTree(file, points, s.optimum.roads, s.optimum.length, 'optimum')
  check(
    s.optimum.roads.every((r) => joinsTwoKinds(r, v)),
    file,
    'optimum joins two places of a kind',
  )
  check(crossings(points, s.optimum.roads).length === 0, file, 'optimum has crossings')
  checkTree(file, points, s.free.roads, s.free.length, 'tree without the crossing rule')
  check(sameRoads(s.free.roads, freeTree(points, v)), file, 'tree without the crossing rule differs')
  check(crossings(points, s.free.roads).length === s.free.crossings, file, 'crossings differ')
  const g = greedyPlane(points, v)
  check(sameRoads(s.greedy.roads, g.roads) && s.greedy.stuck === g.stuck, file, 'greedy network differs')
  check(close(networkLength(points, s.greedy.roads), s.greedy.length), file, 'greedy length differs')
  const name = file.replace(/\.json$/, '')
  return {
    id: `roads/bichromatic/${name}`,
    collection: 'roads/bichromatic',
    name,
    number: parseLevelName('roads/bichromatic', name).number,
    source: rel,
    bounds: roundedBounds(points),
    villages: s.villages,
    castles: s.castles,
    optimum: s.optimum,
    free: s.free,
    greedy: s.greedy,
    method: s.method,
  }
}

function roundedBounds(points: readonly Vec2[]) {
  const b = boundsOf(points)
  return { minX: round(b.minX), minY: round(b.minY), maxX: round(b.maxX), maxY: round(b.maxY) }
}

function read<T>(dir: string, sub: string, convert: (file: string, rel: string, data: T) => unknown) {
  const files = readdirSync(join(dir, sub)).filter((f) => f.endsWith('.json'))
  return files
    .map((f) =>
      convert(f, `levels/roads/${sub}/${f}`, JSON.parse(readFileSync(join(dir, sub, f), 'utf8')) as T),
    )
    .sort((a, b) => (a as { number: number }).number - (b as { number: number }).number)
}

export function convertRoads(dir: string): (RoadsSteinerLevel | RoadsBichromaticLevel)[] {
  return [
    ...(read<Steiner>(dir, 'steiner', steiner) as RoadsSteinerLevel[]),
    ...(read<Bichromatic>(dir, 'bichromatic', bichromatic) as RoadsBichromaticLevel[]),
  ]
}
