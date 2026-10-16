import { pointAt, type Path } from '../../../core/games/frechet/path'
import type { Vec2 } from '../../../core/geometry/types'

export type Walker = 'person' | 'dog'

/** Keys for each walker: the laptop keys far apart, and the two sides of a gamepad. */
export const KEYS: Record<Walker, readonly string[]> = {
  person: ['KeyA', 'Pad0Left', 'Pad0X'],
  dog: ['KeyL', 'Pad0Right', 'Pad0B'],
}

/** Largest leash on the sliders: room above the level's leash and the shortest one. */
export const sliderMax = (shortest: number, leash: number) =>
  Math.max(2, Math.ceil(Math.max(leash * 1.5, shortest * 2) * 2) / 2)

/** The part of a path from its start to arc length s. */
export function walkedPart(path: Path, s: number): Vec2[] {
  const out: Vec2[] = [path.points[0]!]
  for (let i = 1; i < path.points.length && path.cumulative[i]! < s; i++) out.push(path.points[i]!)
  out.push(pointAt(path, s))
  return out
}
