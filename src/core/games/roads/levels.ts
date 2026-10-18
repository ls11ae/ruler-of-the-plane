import type { Bounds, Vec2 } from '../../geometry/types'
import type { KingsTaxesLevel, RoadsBichromaticLevel, RoadsSteinerLevel } from '../../levels/schema'
import { mulberry32 } from '../../random'
import type { Tier } from '../../tiers'

/**
 * Levels of "Straßenbau", in three sets and then random villages. "Ohne Kreuzungen" (minimum spanning
 * tree): the four Unity MST levels (five settlements each), then the larger point sets of Unity's spanner
 * and TSP levels (9 to 19 settlements). "Kreuzungen" (Steiner tree): roads may branch at junctions.
 * "Zwei Sorten" (plane bichromatic spanning tree): every road joins a castle and a village, none cross.
 */
export const MST_IDS = [
  'kings-taxes/mst/ktLevel1',
  'kings-taxes/mst/ktLevel2',
  'kings-taxes/mst/ktLevel3',
  'kings-taxes/mst/ktLevel4',
  'kings-taxes/spanner/ktLevel2_1.7',
  'kings-taxes/tsp/ktLevel2',
  'kings-taxes/spanner/ktLevel3_2',
  'kings-taxes/tsp/ktLevel3',
] as const
export const STEINER_IDS = [
  'roads/steiner/1-dreieck',
  'roads/steiner/2-viereck',
  'roads/steiner/3-zickzack',
  'roads/steiner/4-leiter',
  'roads/steiner/5-kette',
  'roads/steiner/6-wabe',
] as const
export const BICHROMATIC_IDS = [
  'roads/bichromatic/1-burgen',
  'roads/bichromatic/2-weiler',
  'roads/bichromatic/3-mark',
  'roads/bichromatic/4-grafschaft',
  'roads/bichromatic/5-herzogtum',
  'roads/bichromatic/6-koenigreich',
] as const

export type RoadsSet = 'mst' | 'steiner' | 'bichromatic'
export const SETS: { set: RoadsSet; ids: readonly RoadsLevelId[] }[] = [
  { set: 'mst', ids: MST_IDS },
  { set: 'steiner', ids: STEINER_IDS },
  { set: 'bichromatic', ids: BICHROMATIC_IDS },
]

/** The tiers of the game: one set each ("Leicht", "Mittel", "Schwer"); random villages count as "Leicht". */
export const SET_OF_TIER: Record<Tier, RoadsSet> = { easy: 'mst', medium: 'steiner', hard: 'bichromatic' }
export const TIER_OF_SET: Record<RoadsSet, Tier> = { mst: 'easy', steiner: 'medium', bichromatic: 'hard' }
export const TIER_LEVELS: Record<Tier, readonly RoadsLevelId[]> = {
  easy: MST_IDS,
  medium: STEINER_IDS,
  hard: BICHROMATIC_IDS,
}

/** Every fixed map in playing order; the index after the last one means random villages. */
export const LEVEL_IDS = [...MST_IDS, ...STEINER_IDS, ...BICHROMATIC_IDS] as const
export type RoadsLevelId =
  (typeof MST_IDS)[number] | (typeof STEINER_IDS)[number] | (typeof BICHROMATIC_IDS)[number]

/** The set of a fixed map and its number in the set (from 0). */
export function setOf(index: number): { set: RoadsSet; index: number; count: number } {
  let i = index
  for (const { set, ids } of SETS) {
    if (i < ids.length) return { set, index: i, count: ids.length }
    i -= ids.length
  }
  throw new Error(`no fixed map ${index}`)
}

/** The tier of a map index (random villages, after the fixed maps, count as "Leicht"). */
export const tierOfIndex = (index: number): Tier =>
  index >= LEVEL_IDS.length ? 'easy' : TIER_OF_SET[setOf(index).set]

/** A map to connect: settlements (villages first, then castles; they differ only in look). */
export interface RoadsMap {
  points: Vec2[]
  /** Number of villages; the points after them are castles. */
  villages: number
  bounds: Bounds
}

export function mapOf(level: KingsTaxesLevel | RoadsSteinerLevel | RoadsBichromaticLevel): RoadsMap {
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
