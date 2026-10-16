import { isOnFloor, type Dungeon } from '../../../core/games/art-gallery/dungeon'
import type { Vec2 } from '../../../core/geometry/types'
import { mulberry32 } from '../../../core/random'

export interface PlacedProp {
  at: Vec2
  size: number
  kind: number
}

/**
 * Decoration: a few props at places where they fit on the floor (seeded by the level, so a dungeon
 * always looks the same). Purely visual; props do not block light.
 */
export function placeProps(d: Dungeon, seed: number, kinds: number, size = 0.62, count = 4): PlacedProp[] {
  const rng = mulberry32(seed)
  const xs = d.outer.map((p) => p[0])
  const ys = d.outer.map((p) => p[1])
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const placed: PlacedProp[] = []
  const r = size * 0.62
  for (let attempt = 0; attempt < 400 && placed.length < count; attempt++) {
    const at: Vec2 = [minX + rng() * (maxX - minX), minY + rng() * (maxY - minY)]
    const ring = Array.from({ length: 8 }, (_, i): Vec2 => {
      const a = (i * Math.PI) / 4
      return [at[0] + r * Math.cos(a), at[1] + r * Math.sin(a)]
    })
    if (!isOnFloor(d, at) || !ring.every((p) => isOnFloor(d, p))) continue
    if (placed.some((p) => Math.hypot(p.at[0] - at[0], p.at[1] - at[1]) < size * 2.2)) continue
    placed.push({ at, size, kind: placed.length % kinds })
  }
  return placed
}
