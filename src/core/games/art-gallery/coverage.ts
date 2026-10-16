import {
  area,
  areaPaths,
  difference,
  EndType,
  FillRule,
  inflatePaths,
  JoinType,
  union,
  type Path64,
  type Paths64,
} from 'clipper2-ts'
import type { Vec2 } from '../../geometry/types'
import { rings, type Dungeon } from './dungeon'

/**
 * Coverage with Clipper2 on integer coordinates: level units × {@link SCALE}, so a level of size 9 spans
 * 9·10⁷ units (products stay below 2⁵³ where Clipper2 uses plain numbers; it switches to BigInt inside).
 */
export const SCALE = 1e7

/**
 * "Fully lit" is judged by thickness, not by area (Kevin, 2026-10-16): the floor counts as lit when the
 * dark region, shrunk by this radius (Clipper2 offset with −r), is empty, i.e. no dark spot is thicker
 * than 2r = 0.06 level units (4–6 px on a laptop). Hairlines left by torches a pixel away from a
 * perfect spot (and rounding slivers) then count as lit, while a half-dark niche does not. Tune in the
 * playtest.
 */
export const LIT_RADIUS = 0.03

export const toPath64 = (ring: readonly Vec2[]): Path64 =>
  ring.map(([x, y]) => ({ x: Math.round(x * SCALE), y: Math.round(y * SCALE) }))

export const fromPaths64 = (paths: Paths64): Vec2[][] =>
  paths.map((path) => path.map((p) => [p.x / SCALE, p.y / SCALE] as const))

export interface Coverage {
  /** Floor area (level units²). */
  floorArea: number
  /** Area not seen by any torch (level units²), including hairlines. */
  darkArea: number
  /** Lit share of the floor, 0–1; exactly 1 when fully lit (the remaining hairlines count as lit). */
  litShare: number
  /** No dark spot thicker than 2 × {@link LIT_RADIUS}. */
  fullyLit: boolean
  /** The dark region as rings in level coordinates (also when fully lit: the hairlines). */
  dark: Vec2[][]
  /** The dark region as Clipper paths (for {@link thickestDarkSpot}). */
  darkPaths: Paths64
}

/** The floor as Clipper paths (outer boundary positive, pillars negative: non-zero fill). */
export function floorPaths(d: Dungeon): Paths64 {
  return rings(d).map(toPath64)
}

/**
 * The region normalised for offsetting: Clipper2's offset takes the orientation of a whole group from
 * the path with the lowest point, so a degenerate dark sliver with a tiny negative area would turn a
 * shrink into nonsense. A union (outer paths positive, holes negative) without zero-area slivers.
 */
function clean(paths: Paths64): Paths64 {
  if (!paths.length) return []
  return union(paths, FillRule.NonZero).filter((p) => Math.abs(area(p)) > 1)
}

/** The region shrunk by r (level units): what remains after removing everything within r of its edge. */
function shrink(region: Paths64, r: number): Paths64 {
  if (!region.length) return []
  return inflatePaths(region, -r * SCALE, JoinType.Round, EndType.Polygon, 2, SCALE * 1e-3)
}

const isEmpty = (paths: Paths64) => !paths.some((p) => Math.abs(area(p)) > 0)

/** Lit and dark parts of the floor for the given visibility polygons. */
export function coverage(
  floor: Paths64,
  visibility: readonly (readonly Vec2[])[],
  litRadius = LIT_RADIUS,
): Coverage {
  const floorArea = areaPaths(floor) / (SCALE * SCALE)
  const lit = visibility.length ? union(visibility.map(toPath64), FillRule.NonZero) : []
  const darkPaths = lit.length ? difference(floor, lit, FillRule.NonZero) : floor
  const darkArea = Math.max(0, areaPaths(darkPaths) / (SCALE * SCALE))
  const fullyLit = darkArea === 0 || isEmpty(shrink(clean(darkPaths), litRadius))
  return {
    floorArea,
    darkArea,
    litShare: fullyLit ? 1 : 1 - darkArea / floorArea,
    fullyLit,
    dark: fromPaths64(darkPaths),
    darkPaths,
  }
}

/**
 * The centre of the thickest dark spot and its radius (the largest r for which the shrunk dark region is
 * not empty, to about 1 %), for the pulsing hint while the floor is not fully lit; null if there is no
 * dark region. A binary search over Clipper2 offsets, about a dozen of them.
 */
export function thickestDarkSpot(darkPaths: Paths64): { at: Vec2; radius: number } | null {
  const region = clean(darkPaths)
  if (isEmpty(region)) return null
  let lo = 0
  let hi = Math.sqrt(Math.abs(areaPaths(region)) / Math.PI) / SCALE // no disc is larger than the area allows
  let best = region
  for (let i = 0; i < 14 && hi - lo > hi * 0.01; i++) {
    const mid = (lo + hi) / 2
    const shrunk = shrink(region, mid)
    if (!isEmpty(shrunk)) {
      lo = mid
      best = shrunk
    } else hi = mid
  }
  const largest = best.reduce((a, b) => (area(b) > area(a) ? b : a))
  const at: Vec2 = [
    largest.reduce((s, p) => s + p.x, 0) / largest.length / SCALE,
    largest.reduce((s, p) => s + p.y, 0) / largest.length / SCALE,
  ]
  return { at, radius: lo }
}
