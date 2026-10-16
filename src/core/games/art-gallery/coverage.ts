import { areaPaths, difference, FillRule, union, type Path64, type Paths64 } from 'clipper2-ts'
import type { Vec2 } from '../../geometry/types'
import { rings, type Dungeon } from './dungeon'

/**
 * Coverage with Clipper2 on integer coordinates: level units × {@link SCALE}, so a level of size 9 spans
 * 9·10⁷ units (products stay below 2⁵³ where Clipper2 uses plain numbers; it switches to BigInt inside).
 */
export const SCALE = 1e7

/**
 * Uncovered area below this share of the floor counts as lit: rounding to integers leaves slivers along
 * the walls (each at most half a unit wide).
 */
export const SLIVER_TOLERANCE = 1e-6

export const toPath64 = (ring: readonly Vec2[]): Path64 =>
  ring.map(([x, y]) => ({ x: Math.round(x * SCALE), y: Math.round(y * SCALE) }))

export const fromPaths64 = (paths: Paths64): Vec2[][] =>
  paths.map((path) => path.map((p) => [p.x / SCALE, p.y / SCALE] as const))

export interface Coverage {
  /** Floor area (level units²). */
  floorArea: number
  /** Area not seen by any torch (level units²). */
  darkArea: number
  /** Lit share of the floor, 0–1. */
  litShare: number
  /** Everything is lit (dark area within the sliver tolerance). */
  fullyLit: boolean
  /** The dark region as rings in level coordinates (for drawing). */
  dark: Vec2[][]
}

/** The floor as Clipper paths (outer boundary positive, pillars negative: non-zero fill). */
export function floorPaths(d: Dungeon): Paths64 {
  return rings(d).map(toPath64)
}

/** Lit and dark parts of the floor for the given visibility polygons. */
export function coverage(floor: Paths64, visibility: readonly (readonly Vec2[])[]): Coverage {
  const floorArea = areaPaths(floor) / (SCALE * SCALE)
  const lit = visibility.length ? union(visibility.map(toPath64), FillRule.NonZero) : []
  const darkPaths = lit.length ? difference(floor, lit, FillRule.NonZero) : floor
  const darkArea = Math.max(0, areaPaths(darkPaths) / (SCALE * SCALE))
  const fullyLit = darkArea <= SLIVER_TOLERANCE * floorArea
  return {
    floorArea,
    darkArea,
    litShare: fullyLit ? 1 : 1 - darkArea / floorArea,
    fullyLit,
    dark: fullyLit ? [] : fromPaths64(darkPaths),
  }
}
