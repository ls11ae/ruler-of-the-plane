import type { Vec2 } from '../../geometry/types'
import stored from './demoTorches.json'
import type { LevelName } from './rules'

/**
 * The dungeons of the attract demo, one per round, and torches that light each fully (at most the
 * level's number k), found offline by `scripts/art-gallery/demo-torches.ts`.
 */
export const DEMO_LEVELS = [
  'agLevel6_3',
  'agLevel10_4',
  'agLevel5_5',
  'agLevel4_8',
] as const satisfies readonly LevelName[]

export const DEMO_TORCHES = stored as unknown as Record<(typeof DEMO_LEVELS)[number], readonly Vec2[]>
