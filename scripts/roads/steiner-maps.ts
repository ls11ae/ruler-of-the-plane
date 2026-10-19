import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Vec2 } from '../../src/core/geometry/types'
import { mulberry32 } from '../../src/core/random'
import { formatJson } from '../levels/import'
import { steinerMinimalTree } from './steiner'

/**
 * The maps of "Kreuzungen" (Straßenbau with junctions) and their optima: `npx tsx scripts/roads/steiner-maps.ts`
 * writes `levels/roads/steiner/<n>-<name>.json`, which `npm run levels` imports. The first map is a fork
 * with one junction and a road straight on; the others are patches of a triangular lattice (where
 * junctions save most: 10–13 % against the shortest network without junctions) or of a grid. Every map
 * gets a little seeded jitter, so the maps look less regular and each optimum is unique. The last
 * settlement of each map is a castle (it only looks different). Level units as the random maps: about
 * 6 × 4.
 */

const H = Math.sqrt(3) / 2

/** Lattice points (i, j) → level coordinates: spacing a, shifted by (dx, dy), y down. */
const lattice = (cells: [number, number][], a: number, dx: number, dy: number): Vec2[] =>
  cells.map(([i, j]) => [dx + a * (i + j / 2), dy - a * j * H] as const)

interface MapSpec {
  number: number
  name: string
  points: Vec2[]
  jitter: number
  seed: number
}

const MAPS: MapSpec[] = [
  {
    // A fork and a road straight on: two villages joined at a junction, which leads on to the castle, and
    // from there a road without a junction to a third village (the angle at the castle is wider than 120°).
    // Not the how-to's picture (a castle above two villages, three roads to one junction).
    number: 1,
    name: 'gabel',
    points: [
      [-2.6, -1.3],
      [-2.2, 1.3],
      [2.6, 0.9],
      [0.1, -0.2],
    ],
    jitter: 0.1,
    seed: 1,
  },
  {
    number: 2,
    name: 'viereck',
    points: [
      [-2.2, -1.4],
      [2.2, -1.4],
      [2.2, 1.4],
      [-2.2, 1.4],
    ],
    jitter: 0.12,
    seed: 2,
  },
  {
    number: 3,
    name: 'zickzack',
    points: lattice(
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [0, 1],
        [1, 1],
      ],
      2.2,
      -2.6,
      1.0,
    ),
    jitter: 0.12,
    seed: 3,
  },
  {
    number: 4,
    name: 'leiter',
    points: [
      [-2.4, -1.2],
      [0, -1.2],
      [2.4, -1.2],
      [-2.4, 1.2],
      [0, 1.2],
      [2.4, 1.2],
    ],
    jitter: 0.12,
    seed: 4,
  },
  {
    number: 5,
    name: 'kette',
    points: lattice(
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      1.9,
      -2.8,
      0.8,
    ),
    jitter: 0.12,
    seed: 5,
  },
  {
    number: 6,
    name: 'wabe',
    points: lattice(
      [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [-1, 1],
        [0, -1],
        [1, -1],
      ],
      1.9,
      0,
      0,
    ),
    jitter: 0.12,
    // Most jitters of this patch put a junction right next to the middle village (closer than 0.3, hard to
    // place by hand next to its icon); this one keeps it 0.49 away.
    seed: 36,
  },
]

const dist = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1])
const round = (v: number) => {
  const r = Math.round(v * 1e6) / 1e6
  return r === 0 ? 0 : r
}

function mstLength(points: readonly Vec2[]): number {
  const n = points.length
  const best = new Array<number>(n).fill(Infinity)
  const done = new Array<boolean>(n).fill(false)
  best[0] = 0
  let total = 0
  for (let k = 0; k < n; k++) {
    let v = -1
    for (let i = 0; i < n; i++) if (!done[i] && (v < 0 || best[i]! < best[v]!)) v = i
    done[v] = true
    total += best[v]!
    for (let i = 0; i < n; i++) if (!done[i]) best[i] = Math.min(best[i]!, dist(points[v]!, points[i]!))
  }
  return total
}

const dir = join(import.meta.dirname, '..', '..', 'levels', 'roads', 'steiner')
mkdirSync(dir, { recursive: true })
for (const spec of MAPS) {
  const rng = mulberry32(spec.seed)
  const points = spec.points.map(
    ([x, y]) => [round(x + (rng() * 2 - 1) * spec.jitter), round(y + (rng() * 2 - 1) * spec.jitter)] as const,
  )
  const started = performance.now()
  const tree = steinerMinimalTree(points)
  const mst = mstLength(points)
  const file = {
    name: spec.name,
    villages: points.slice(0, -1),
    castles: points.slice(-1),
    optimum: {
      junctions: tree.junctions.map(([x, y]) => [round(x), round(y)] as const),
      roads: tree.edges,
      length: round(tree.length),
    },
    mstLength: round(mst),
    method:
      'exact: every full Steiner topology, each solved by Smith’s iteration (scripts/roads/steiner.ts, steiner-maps.ts)',
  }
  writeFileSync(join(dir, `${spec.number}-${spec.name}.json`), formatJson(file))
  console.log(
    `${spec.number}-${spec.name}: ${points.length} places, ${tree.junctions.length} junctions, optimum ${tree.length.toFixed(3)}, MST ${mst.toFixed(3)} (+${((mst / tree.length - 1) * 100).toFixed(1)} %), ${Math.round(performance.now() - started)} ms`,
  )
}
