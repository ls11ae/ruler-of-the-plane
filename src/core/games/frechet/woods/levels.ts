import type { Walk } from '../frechet'
import { treesOf, WOODS_SHAPES, type WoodsId, type WoodsShape } from './shapes'
import stored from './targets.json'
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
}

/** The results of the search, as stored in `targets.json`. */
export interface StoredTargets {
  step: number
  walks: Partial<Record<WoodsId, { target: number; walk: [number, number][] }>>
}

const targets = stored as StoredTargets

export const WOODS: readonly WoodsWalk[] = WOODS_SHAPES.map((shape) => {
  const found = targets.walks[shape.id]
  if (!found) throw new Error(`no stored target for ${shape.id}: run npx tsx scripts/woods-targets.ts`)
  return { ...shape, trees: treesOf(shape), target: found.target, computer: found.walk }
})

export const woodsById = (id: WoodsId): WoodsWalk => WOODS.find((w) => w.id === id)!
