import type { Vec2 } from '../../src/core/geometry/types'
export { pleasant } from '../../src/core/games/frechet/pleasant'
import type { Rng } from '../../src/core/random'

/** Where every walk starts and ends (as the six walks): gate lower left, castle upper right. */
export const PERSON_ENDS: [Vec2, Vec2] = [
  [3, 19],
  [33, 4],
]
export const DOG_ENDS: [Vec2, Vec2] = [
  [3.8, 19.9],
  [33.8, 4.9],
]

export interface PathStyle {
  /** Inner corners (for a meander: the number of legs across). */
  corners: number
  /** Sideways swing of the corners (metres; for a meander half the length of a leg). */
  amplitude: number
  /**
   * Zigzag (corners on alternating sides), wander (a random walk sideways), or meander (legs across
   * the way joined by short steps along it, with right-angle turns, like a path through a hedge maze).
   */
  mode: 'zigzag' | 'wander' | 'meander' | 'snake' | 'spikes'
  /** A wide bend of the whole path (metres, sideways at the middle). */
  bend: number
  /** Meander only: the angle of the legs against the way (degrees; 90 = straight across). */
  angle?: number
}

const round = (x: number) => Math.round(x * 10) / 10

/** A path from `from` to `to` with corners swinging sideways around a gently bent line. */
export function makePathPoints(rng: Rng, [from, to]: [Vec2, Vec2], style: PathStyle): Vec2[] {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.hypot(dx, dy)
  const nx = -dy / len
  const ny = dx / len
  const pts: Vec2[] = [from]
  if (style.mode === 'meander') return meander(rng, from, to, style)
  if (style.mode === 'snake') return snake(rng, from, to, style)
  if (style.mode === 'spikes') return spikes(rng, from, to, style)
  let offset = 0
  const side = rng() < 0.5 ? -1 : 1
  for (let i = 1; i <= style.corners; i++) {
    const u = (i + (rng() - 0.5) * 0.7) / (style.corners + 1)
    if (style.mode === 'zigzag')
      offset = (i % 2 === 0 ? 1 : -1) * side * style.amplitude * (0.35 + 0.65 * rng())
    else offset = 0.55 * offset + (rng() - 0.5) * 2 * style.amplitude
    const o = offset + style.bend * Math.sin(Math.PI * u)
    pts.push([round(from[0] + u * dx + o * nx), round(from[1] + u * dy + o * ny)])
  }
  pts.push(to)
  return pts
}

/**
 * Legs across the way, joined by steps along it at alternating sides (a square wave, or slanted legs
 * when `angle` < 90°); the path walks onto the first leg from the start and off the last to the end.
 */
function meander(rng: Rng, from: Vec2, to: Vec2, style: PathStyle): Vec2[] {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.hypot(dx, dy)
  const [ux, uy] = [dx / len, dy / len]
  const [nx, ny] = [-uy, ux]
  const at = (u: number, o: number): Vec2 => {
    const off = o + style.bend * Math.sin(Math.PI * Math.min(1, Math.max(0, u / len)))
    return [round(from[0] + u * ux + off * nx), round(from[1] + u * uy + off * ny)]
  }
  const legs = style.corners
  const lead = len * (0.06 + 0.06 * rng())
  const pitch = (len - 2 * lead) / legs
  const slant = 1 / Math.tan(((style.angle ?? 90) * Math.PI) / 180)
  const pts: Vec2[] = [from]
  let side = rng() < 0.5 ? -1 : 1
  for (let k = 0; k < legs; k++) {
    const a = style.amplitude * (0.6 + 0.4 * rng())
    const u = lead + pitch * k
    pts.push(at(u, side * a), at(u + Math.min(2 * a * slant, 0.7 * pitch), -side * a))
    side = -side
  }
  pts.push(to)
  return pts
}

/**
 * A snake across the park: legs up and down (screen y) at increasing x, joined by short steps along x,
 * between a lower and an upper line that rise from the gate to the castle; `amplitude` is half the
 * height of a leg, `bend` shifts the legs sideways (x) by up to that much, `angle` is unused.
 */
function snake(rng: Rng, from: Vec2, to: Vec2, style: PathStyle): Vec2[] {
  const legs = style.corners
  const pts: Vec2[] = [from]
  const x0 = from[0] + 1.5 + rng() * 1.5
  const x1 = to[0] - 1.5 - rng() * 1.5
  const pitch = (x1 - x0) / Math.max(1, legs - 1)
  let down = rng() < 0.5
  for (let k = 0; k < legs; k++) {
    const x = x0 + pitch * k + style.bend * 0.15 * (rng() - 0.5)
    const f = (x - from[0]) / (to[0] - from[0])
    const mid = from[1] + f * (to[1] - from[1])
    const a = style.amplitude * (0.7 + 0.3 * rng())
    const step = Math.min(0.45 * pitch, 1 + rng() * 1.5)
    const [ya, yb] = down ? [mid - a, mid + a] : [mid + a, mid - a]
    pts.push([round(x), round(ya)], [round(x + step), round(yb)])
    down = !down
  }
  pts.push(to)
  return pts
}

/**
 * A dog's trail with excursions: along a line beside the way (offset `bend`), with `corners` runs out
 * to one side and back (length up to `amplitude`, leaning forwards or backwards), like a dog fetching
 * sticks on both sides of the path.
 */
function spikes(rng: Rng, from: Vec2, to: Vec2, style: PathStyle): Vec2[] {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.hypot(dx, dy)
  const [ux, uy] = [dx / len, dy / len]
  const [nx, ny] = [-uy, ux]
  const at = (u: number, o: number): Vec2 => [
    round(from[0] + u * ux + o * nx),
    round(from[1] + u * uy + o * ny),
  ]
  const pts: Vec2[] = [from]
  const runs = style.corners
  for (let k = 0; k < runs; k++) {
    const u = (len * (k + 0.6 + 0.6 * (rng() - 0.5))) / (runs + 0.2)
    const side = rng() < 0.65 ? -Math.sign(style.bend || 1) : Math.sign(style.bend || 1)
    const out = side * style.amplitude * (0.55 + 0.45 * rng())
    const lean = (rng() - 0.5) * 5
    pts.push(
      at(u, style.bend),
      at(u + lean, style.bend + out),
      at(u + 0.8 + rng(), style.bend + 0.3 * Math.sign(out)),
    )
  }
  pts.push(to)
  return pts
}
