import type { Walk } from '../frechet'
import { treesOf, WOODS_SHAPES, type WoodsId, type WoodsShape } from './shapes'
import stored from './targets.json' with { type: 'json' }
import type { Tree } from './trees'

/**
 * The walks "Im Wald" with their targets: the geometry from `shapes.ts`, the shortest leash and the
 * computer's walk from `targets.json`, which `npx tsx scripts/woods-targets.ts` writes with the search
 * of `search.ts`. A test checks that the stored values match a fresh search.
 */
export interface WoodsWalk extends WoodsShape {
  trees: Tree[]
  /** The shortest leash that allows the walk (at samples every `step` metres), from the search. */
  target: number
  /** The computer's walk with that leash: positions (person, dog) in metres where a walker starts or stops. */
  computer: Walk
  /**
   * Free start only: for each start winding, the shortest leash and the computer's walk with that
   * start; `target` and `computer` are those of the best start, `bestStart`.
   */
  starts?: Partial<Record<number, { target: number; computer: Walk }>>
  bestStart?: number
}

/** The result of one search, as stored in `targets.json`. */
export interface StoredSearch {
  target: number
  walk: [number, number][]
  /** How densely this search sampled the paths, if not `step` (the other starts of a free start). */
  step?: number
}

/** The results of the search, as stored in `targets.json` (free starts: per winding, and the best). */
export interface StoredTargets {
  step: number
  walks: Partial<Record<WoodsId, StoredSearch & { starts?: Record<string, StoredSearch>; best?: number }>>
}

const targets = stored as unknown as StoredTargets

export const WOODS: readonly WoodsWalk[] = WOODS_SHAPES.map((shape) => {
  const found = targets.walks[shape.id]
  if (!found) throw new Error(`no stored target for ${shape.id}: run npx tsx scripts/woods-targets.ts`)
  const starts = found.starts
    ? Object.fromEntries(
        Object.entries(found.starts).map(([k, v]) => [Number(k), { target: v.target, computer: v.walk }]),
      )
    : undefined
  return {
    ...shape,
    trees: treesOf(shape),
    target: found.target,
    computer: found.walk,
    starts,
    bestStart: found.best,
  }
})

export const woodsById = (id: WoodsId): WoodsWalk => WOODS.find((w) => w.id === id)!
