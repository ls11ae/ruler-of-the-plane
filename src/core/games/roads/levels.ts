import type { Bounds, Vec2 } from '../../geometry/types'
import type { KingsTaxesLevel } from '../../levels/schema'
import { mulberry32 } from '../../random'

/**
 * Levels of "Straßenbau": the four Unity MST levels (five settlements each), then the larger point sets
 * of Unity's spanner and TSP levels (9 to 19 settlements, used here for the MST), then random villages.
 */
export const LEVEL_IDS = [
  'kings-taxes/mst/ktLevel1',
  'kings-taxes/mst/ktLevel2',
  'kings-taxes/mst/ktLevel3',
  'kings-taxes/mst/ktLevel4',
  'kings-taxes/spanner/ktLevel2_1.7',
  'kings-taxes/tsp/ktLevel2',
  'kings-taxes/spanner/ktLevel3_2',
  'kings-taxes/tsp/ktLevel3',
] as const
export type RoadsLevelId = (typeof LEVEL_IDS)[number]

/** A map to connect: settlements (villages first, then castles; they differ only in look). */
export interface RoadsMap {
  points: Vec2[]
  /** Number of villages; the points after them are castles. */
  villages: number
  bounds: Bounds
}

export function mapOf(level: KingsTaxesLevel): RoadsMap {
  return {
    points: [...level.villages, ...level.castles],
    villages: level.villages.length,
    bounds: level.bounds,
  }
}

/** Size of the random maps (level units, as the Unity levels: the larger side is 6). */
export const RANDOM_BOUNDS: Bounds = { minX: -3, minY: -2, maxX: 3, maxY: 2 }
/** Settlements of a random map keep this distance (Unity's settlement radius is 0.6). */
const MIN_SPACING = 0.75

/** Random villages (seeded, so a map can be reproduced from its seed), one of them a castle. */
export function randomMap(seed: number, n: number): RoadsMap {
  const rng = mulberry32(seed)
  const { minX, minY, maxX, maxY } = RANDOM_BOUNDS
  const points: Vec2[] = []
  for (let tries = 0; points.length < n && tries < 20000; tries++) {
    const p: Vec2 = [minX + rng() * (maxX - minX), minY + rng() * (maxY - minY)]
    if (points.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) >= MIN_SPACING)) points.push(p)
  }
  return { points, villages: points.length - 1, bounds: RANDOM_BOUNDS }
}

/** Settlements on the random maps, growing with each new map. */
export const randomSize = (round: number) => Math.min(14, 8 + round)
