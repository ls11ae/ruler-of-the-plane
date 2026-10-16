import { PARK, type WalkLevel } from '../../../core/games/frechet/levels'
import { pointSegmentDistance } from '../../../core/games/frechet/path'
import { pointInRing } from '../../../core/geometry/polygon'
import type { Vec2 } from '../../../core/geometry/types'
import { mulberry32 } from '../../../core/random'

export type PropKind = 'treePines' | 'treePine' | 'rocksA' | 'well' | 'bush'

export interface Prop {
  kind: PropKind
  at: Vec2
  /** Width in metres. */
  size: number
}

/** Size of each prop kind in metres. */
const SIZE: Record<PropKind, number> = { treePines: 2.6, treePine: 1.8, rocksA: 1.6, well: 1.5, bush: 1.4 }

/** Where the walk starts and ends (gate and castle), kept clear of props. */
export const GATE: Vec2 = [2.2, 20.4]
export const CASTLE: Vec2 = [34, 2.4]
/** Where the labels "Start" and "Ziel" stand, also kept clear. */
export const START_LABEL: Vec2 = [2, 17.3]
export const GOAL_LABEL: Vec2 = [30.4, 1.8]

function distanceToPolyline(p: Vec2, line: readonly Vec2[]): number {
  let best = Infinity
  for (let i = 0; i + 1 < line.length; i++)
    best = Math.min(best, pointSegmentDistance(p, line[i]!, line[i + 1]!))
  return best
}

const pointDistance = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1])

/**
 * Trees, rocks and a well scattered over the park (seeded per walk, so a walk always looks the same),
 * away from both paths, the pond, the gate and the castle; bushes where the dog sniffs.
 */
export function sceneryFor(level: WalkLevel): Prop[] {
  const rng = mulberry32(level.id.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7))
  const props: Prop[] = (level.sniff ?? []).map((at) => ({ kind: 'bush', at, size: SIZE.bush }))
  const lines = [level.person, level.dog]
  const clear = (p: Vec2, size: number) =>
    lines.every((l) => distanceToPolyline(p, l) > 1.4 + size / 2) &&
    (!level.pond || distanceToPolyline(p, [...level.pond, level.pond[0]!]) > 1 + size / 2) &&
    (!level.pond || pointInRing(p, level.pond) < 0) &&
    pointDistance(p, GATE) > 3.5 &&
    pointDistance(p, CASTLE) > 4.5 &&
    pointDistance(p, START_LABEL) > 2.6 &&
    pointDistance(p, GOAL_LABEL) > 2.6 &&
    props.every((q) => pointDistance(p, q.at) > (q.size + size) / 2 + 0.6)
  let wellPlaced = false
  for (let y = PARK.minY + 1.6; y < PARK.maxY - 1; y += 2.6) {
    for (let x = PARK.minX + 1.4; x < PARK.maxX - 1; x += 2.8) {
      const at: Vec2 = [x + (rng() - 0.5) * 1.8, y + (rng() - 0.5) * 1.6]
      const r = rng()
      const kind: PropKind =
        !wellPlaced && r < 0.04 ? 'well' : r < 0.5 ? 'treePines' : r < 0.85 ? 'treePine' : 'rocksA'
      // Leave some meadow: not every free spot gets a prop.
      if (rng() < 0.35 || !clear(at, SIZE[kind])) continue
      if (kind === 'well') wellPlaced = true
      props.push({ kind, at, size: SIZE[kind] })
    }
  }
  // Draw from the back (top) to the front, so lower props overlap the ones behind them.
  return props.sort((a, b) => a.at[1] - b.at[1])
}
