import type { Vec2 } from '../../geometry/types'
import type { Trunk } from './woods/shapes'
import data from './generated.json' with { type: 'json' }

/**
 * The harder walks of "Gassi gehen" (tiers "Mittel" and "Schwer"), generated offline with a fixed
 * seed by `scripts/gassi/generate.ts`, which keeps only hard walks (see there and docs/gassi-walks.md).
 */
export type GeneratedTier = 'medium' | 'hard'

export interface GeneratedPark {
  id: string
  tier: GeneratedTier
  person: Vec2[]
  dog: Vec2[]
  slack: number
}

export interface GeneratedWoods extends GeneratedPark {
  trunks: Trunk[]
}

export interface GeneratedWalks {
  seed: number
  /** Walking speed of these walks, metres per second. */
  speed: number
  park: GeneratedPark[]
  woods: GeneratedWoods[]
}

export const GENERATED = data as unknown as GeneratedWalks
