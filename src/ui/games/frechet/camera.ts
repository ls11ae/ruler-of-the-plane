import { PARK } from '../../../core/games/frechet/levels'
import { pointAt, type Path } from '../../../core/games/frechet/path'
import type { Vec2 } from '../../../core/geometry/types'

/** Margin around the park (metres), as the board without camera. */
export const PAD = 0.6

const PARK_W = PARK.maxX - PARK.minX + 2 * PAD
const PARK_H = PARK.maxY - PARK.minY + 2 * PAD

/**
 * How far the camera zooms in (pixels per metre) for a viewport of this size and this leash: the leash
 * about 220 px long, while the view still spans 2.4 leashes plus 3 m across (measured as the geometric
 * mean of its sides, so that a tall phone screen still zooms in): both walkers, the leash and the next
 * stretch of both paths. At least 1.3 times the zoom at which the whole park fits; null when that
 * would hardly differ from the whole park (then no camera).
 */
export function cameraZoom(width: number, height: number, leash: number): number | null {
  if (!(width > 0 && height > 0)) return null
  const fit = Math.min(width / PARK_W, height / PARK_H)
  const want = 220 / leash
  const room = Math.sqrt(width * height) / (2.4 * leash + 3)
  const zoom = Math.min(90, Math.max(1.3 * fit, Math.min(want, room)))
  return zoom > 1.15 * fit ? zoom : null
}

/**
 * Where the camera looks (the centre of the view, metres): at both walkers and the next stretch of both
 * paths (a few metres ahead), keeping both walkers well inside the view and the view inside the park
 * where it is smaller than the park.
 */
export function cameraTarget(
  view: { w: number; h: number },
  person: Path,
  dog: Path,
  s: number,
  t: number,
): Vec2 {
  const ahead = Math.min(6, Math.max(2, 0.3 * Math.min(view.w, view.h)))
  const p = pointAt(person, s)
  const d = pointAt(dog, t)
  const pts = [p, d, pointAt(person, s + ahead), pointAt(dog, t + ahead)]
  const xs = pts.map((q) => q[0])
  const ys = pts.map((q) => q[1])
  let cx = (Math.min(...xs) + Math.max(...xs)) / 2
  let cy = (Math.min(...ys) + Math.max(...ys)) / 2
  // The walkers stay inside the view, at least a fifth of it from its edges (clear of the overview map).
  const mx = view.w / 2 - view.w / 5
  const my = view.h / 2 - view.h / 5
  for (const [x, y] of [p, d]) {
    cx = Math.min(Math.max(cx, x - mx), x + mx)
    cy = Math.min(Math.max(cy, y - my), y + my)
  }
  return clampToPark([cx, cy], view)
}

/** The view's centre moved so that the view stays inside the park (or centred on it, if larger). */
export function clampToPark([cx, cy]: Vec2, view: { w: number; h: number }): Vec2 {
  const clamp = (c: number, lo: number, hi: number, size: number) =>
    size >= hi - lo ? (lo + hi) / 2 : Math.min(Math.max(c, lo + size / 2), hi - size / 2)
  return [
    clamp(cx, PARK.minX - PAD, PARK.maxX + PAD, view.w),
    clamp(cy, PARK.minY - PAD, PARK.maxY + PAD, view.h),
  ]
}

/** The camera moved a step towards its target: smoothly, as if on a spring (time constant `tau`). */
export function follow(at: Vec2, target: Vec2, dt: number, tau = 0.4): Vec2 {
  const f = 1 - Math.exp(-Math.max(0, dt) / tau)
  return [at[0] + (target[0] - at[0]) * f, at[1] + (target[1] - at[1]) * f]
}
