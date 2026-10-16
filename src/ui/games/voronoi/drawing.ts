import { EndType, FillRule, inflatePathsD, intersectD, JoinType } from 'clipper2-ts'
import type { Delaunay } from 'd3-delaunay'
import { CLIP_PRECISION, isOnLand, toPathD, type GameMap } from '../../../core/games/voronoi/map'
import type { Vec2 } from '../../../core/geometry/types'
import { mulberry32 } from '../../../core/random'

/** The players' colours: blue starts, orange is the friend or the computer. */
export const PLAYER_COLOURS = ['var(--player-1)', 'var(--player-2)'] as const

/** SVG path of closed rings (fill with even-odd for holes). */
export const ringsPath = (rings: readonly (readonly Vec2[])[]) =>
  rings
    .filter((r) => r.length >= 3)
    .map((r) => `M${r.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join('L')}Z`)
    .join('')

/** SVG path of a closed ring. */
export const ringPath = (ring: readonly Vec2[]) => ringsPath([ring])

const fmt = (v: number) => String(Math.round(v * 1000) / 1000)

/** Contour lines off the coast (on the water side): distance in map units and opacity. */
const COAST_LINES: [number, number][] = [
  [0.4, 0.15],
  [0.26, 0.22],
  [0.14, 0.32],
]

export interface MapDrawing {
  /** The land (lakes as holes). */
  land: string
  /** Lakes and rivers. */
  water: string
  /** Contour lines along every coast, on the water side, with their opacity. */
  coastLines: { d: string; opacity: number }[]
  /** Where to draw wave marks on the open sea. */
  waves: Vec2[]
}

/** Everything static to draw a map, computed once per map. */
export function mapDrawing(map: GameMap): MapDrawing {
  const f = map.frame
  const sheet = [
    toPathD([
      [f.minX, f.minY],
      [f.maxX, f.minY],
      [f.maxX, f.maxY],
      [f.minX, f.maxY],
    ]),
  ]
  const coastLines = COAST_LINES.map(([d, opacity]) => {
    const grown = inflatePathsD(map.land, d, JoinType.Round, EndType.Polygon, 2, CLIP_PRECISION, 0.01)
    const clipped = intersectD(grown, sheet, FillRule.NonZero, CLIP_PRECISION)
    return { d: ringsPath(clipped.map((p) => p.map((q) => [q.x, q.y] as const))), opacity }
  })
  const rng = mulberry32(map.level.number * 7919)
  const waves: Vec2[] = []
  const step = 1.7
  const clear = 0.75
  for (let y = f.minY + step / 2; y < f.maxY; y += step) {
    for (let x = f.minX + step / 2; x < f.maxX; x += step) {
      const p: Vec2 = [x + (rng() - 0.5) * step * 0.7, y + (rng() - 0.5) * step * 0.7]
      const free = [0, 1, 2, 3, 4, 5, 6, 7].every((k) => {
        const a = (k * Math.PI) / 4
        const q: Vec2 = [p[0] + clear * Math.cos(a), p[1] + clear * Math.sin(a)]
        return !isOnLand(map, q)
      })
      if (free && !isOnLand(map, p) && rng() < 0.55) waves.push(p)
    }
  }
  return { land: ringsPath(map.level.land), water: ringsPath(map.level.water), coastLines, waves }
}

/** Circumcircles of the Delaunay triangles: centre and radius. */
export function circumcircles(delaunay: Delaunay<Delaunay.Point>): { x: number; y: number; r: number }[] {
  const { points, triangles } = delaunay
  const out: { x: number; y: number; r: number }[] = []
  for (let t = 0; t < triangles.length; t += 3) {
    const [a, b, c] = [triangles[t]!, triangles[t + 1]!, triangles[t + 2]!]
    const ax = points[2 * a]!
    const ay = points[2 * a + 1]!
    const bx = points[2 * b]! - ax
    const by = points[2 * b + 1]! - ay
    const cx = points[2 * c]! - ax
    const cy = points[2 * c + 1]! - ay
    const d = 2 * (bx * cy - by * cx)
    if (Math.abs(d) < 1e-12) continue
    const ux = (cy * (bx * bx + by * by) - by * (cx * cx + cy * cy)) / d
    const uy = (bx * (cx * cx + cy * cy) - cx * (bx * bx + by * by)) / d
    out.push({ x: ax + ux, y: ay + uy, r: Math.hypot(ux, uy) })
  }
  return out
}
