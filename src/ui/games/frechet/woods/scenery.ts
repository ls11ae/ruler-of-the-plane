import { PARK } from '../../../../core/games/frechet/levels'
import { pointSegmentDistance } from '../../../../core/games/frechet/path'
import type { WoodsShape } from '../../../../core/games/frechet/woods/shapes'
import type { Vec2 } from '../../../../core/geometry/types'
import { mulberry32 } from '../../../../core/random'
import { CASTLE, GATE, GOAL_LABEL, START_LABEL } from '../scenery'

export type ForestKind = 'treePines' | 'treePine' | 'treePineLarge' | 'treePinesSmall'

export interface ForestProp {
  kind: ForestKind
  at: Vec2
  /** Width in metres. */
  size: number
}

const SIZE: Record<ForestKind, number> = {
  treePines: 2.6,
  treePine: 1.8,
  treePineLarge: 2.2,
  treePinesSmall: 2.4,
}

const distanceToPolyline = (p: Vec2, line: readonly Vec2[]) =>
  line.slice(1).reduce((best, q, i) => Math.min(best, pointSegmentDistance(p, line[i]!, q)), Infinity)

const pointDistance = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1])

/**
 * The forest around the walk (seeded per walk): pines everywhere the leash can never reach. A point of
 * the leash is at most half the leash's length away from the person or the dog, so pines keep more
 * than that from both paths: only the drawn trunks can catch the leash.
 */
export function forestFor(walk: WoodsShape, leash: number): ForestProp[] {
  const rng = mulberry32(walk.id.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11))
  const reach = leash / 2 + 0.8
  const props: ForestProp[] = []
  const clear = (p: Vec2, size: number) =>
    distanceToPolyline(p, walk.person) > reach + size / 2 &&
    distanceToPolyline(p, walk.dog) > reach + size / 2 &&
    walk.trunks.every((t) => pointDistance(p, t.at) > 2 + size / 2) &&
    pointDistance(p, walk.bakery ?? GATE) > 3.5 &&
    pointDistance(p, CASTLE) > 4.5 &&
    pointDistance(p, START_LABEL) > 2.6 &&
    pointDistance(p, GOAL_LABEL) > 2.6 &&
    props.every((q) => pointDistance(p, q.at) > (q.size + size) / 2 + 0.2)
  for (let y = PARK.minY + 1.4; y < PARK.maxY - 0.8; y += 2.1) {
    for (let x = PARK.minX + 1.2; x < PARK.maxX - 0.8; x += 2.2) {
      const at: Vec2 = [x + (rng() - 0.5) * 1.4, y + (rng() - 0.5) * 1.2]
      const r = rng()
      const kind: ForestKind =
        r < 0.35 ? 'treePines' : r < 0.6 ? 'treePine' : r < 0.85 ? 'treePineLarge' : 'treePinesSmall'
      if (rng() < 0.12 || !clear(at, SIZE[kind])) continue
      props.push({ kind, at, size: SIZE[kind] })
    }
  }
  return props.sort((a, b) => a.at[1] - b.at[1])
}
