import type { Bounds, Vec2 } from '../../geometry/types'
import { GENERATED } from './generated'

/**
 * The walks of "Gassi gehen" in the castle park, in metres (y points down, as on screen). Each walk
 * starts at the gate (lower left) and ends at the castle (upper right). Every level is two polylines
 * with at most 20 segments; the leash is a factor above their Fréchet distance (computed, not stored).
 * Three tiers: the six hand-made walks are "Leicht" (the factors shrink from walk to walk); "Mittel" and
 * "Schwer" are generated offline (`generated.json`, see `scripts/gassi/generate.ts`) and played slower.
 */
export interface WalkLevel {
  /** A walk of the game, or `own` for paths drawn in the sandbox. */
  id: WalkId | 'own'
  /** The person's path (a footpath). */
  person: Vec2[]
  /** The dog's trail. */
  dog: Vec2[]
  /** Leash length = Fréchet distance × this factor, rounded up to 0.1 m. */
  slack: number
  /** A pond (outline, smooth when drawn), if the walk passes one. */
  pond?: Vec2[]
  /** Bushes or rocks the dog visits (drawn at these points). */
  sniff?: Vec2[]
  /** Walking speed of both in metres per second (default `WALK_SPEED`; slower on the hard walks). */
  speed?: number
}

/** One of the game's walks (the sandbox's drawn paths have the id `own`). */
export interface GameWalk extends WalkLevel {
  id: WalkId
}

export const PARK: Bounds = { minX: 0, minY: 0, maxX: 36, maxY: 22 }

export const EASY_WALK_IDS = ['avenue', 'sniffing', 'pond', 'fetch', 'braid', 'expert'] as const
export const MEDIUM_WALK_IDS = ['m1', 'm2', 'm3', 'm4'] as const
export const HARD_WALK_IDS = ['s1', 's2', 's3', 's4'] as const
export const WALK_IDS = [...EASY_WALK_IDS, ...MEDIUM_WALK_IDS, ...HARD_WALK_IDS] as const
export type WalkId = (typeof WALK_IDS)[number]

/** Difficulty tiers: "Leicht", "Mittel", "Schwer". */
export const TIERS = ['easy', 'medium', 'hard'] as const
export type Tier = (typeof TIERS)[number]

export const WALKS_BY_TIER: Record<Tier, readonly WalkId[]> = {
  easy: EASY_WALK_IDS,
  medium: MEDIUM_WALK_IDS,
  hard: HARD_WALK_IDS,
}

export const tierOfWalk = (id: WalkId): Tier => TIERS.find((tier) => WALKS_BY_TIER[tier].includes(id))!

const EASY_WALKS: readonly GameWalk[] = [
  {
    // Side by side along the avenue; the dog's trail swings a little.
    id: 'avenue',
    person: [
      [3, 19],
      [12, 15.5],
      [22, 11.5],
      [33, 4],
    ],
    dog: [
      [3.8, 19.9],
      [8, 16.4],
      [12.5, 17.3],
      [17.5, 12.6],
      [22.5, 13.4],
      [26.5, 8.6],
      [30.5, 8.4],
      [33.8, 4.9],
    ],
    slack: 1.6,
  },
  {
    // The dog sniffs left and right of the path: its trail is much longer, so the person waits.
    id: 'sniffing',
    person: [
      [3, 19],
      [14, 13.5],
      [24, 9],
      [33, 4],
    ],
    dog: [
      [3.6, 19.8],
      [5.2, 15.4],
      [8.2, 19],
      [10.4, 13.2],
      [13.6, 16.8],
      [15.6, 10.6],
      [19.2, 13.8],
      [20.8, 8],
      [24.6, 11.6],
      [26, 5.8],
      [29.6, 8.6],
      [33.7, 4.8],
    ],
    slack: 1.4,
  },
  {
    // The dog swims straight through the pond, the person walks around its north end: the dog waits.
    id: 'pond',
    person: [
      [3, 19],
      [9, 16.4],
      [15.2, 13.6],
      [15, 10.8],
      [16.4, 9.4],
      [19.4, 9.4],
      [20.8, 10.8],
      [20.6, 13],
      [27, 8.4],
      [33, 4],
    ],
    dog: [
      [3.7, 19.9],
      [9.6, 17],
      [15.6, 14.2],
      [20.4, 13.8],
      [27.6, 9],
      [33.6, 4.9],
    ],
    pond: [
      [20, 12.7],
      [19.5, 14.2],
      [18.3, 15],
      [16.8, 14.7],
      [15.9, 13.5],
      [15.9, 11.9],
      [16.8, 10.7],
      [18.3, 10.4],
      [19.5, 11.2],
    ],
    slack: 1.3,
  },
  {
    // The dog runs out to two bushes and back: the person must wait twice.
    id: 'fetch',
    person: [
      [3, 19],
      [11, 15],
      [21, 11],
      [33, 4],
    ],
    dog: [
      [3.7, 19.9],
      [9, 16.6],
      [8.4, 12.4],
      [10.4, 15.8],
      [19.2, 12.6],
      [22.2, 15.8],
      [21.8, 11.8],
      [33.7, 4.9],
    ],
    sniff: [
      [8.2, 11.4],
      [22.8, 16.6],
    ],
    slack: 1.25,
  },
  {
    // Person and dog swap sides again and again, on paths of different lengths.
    id: 'braid',
    person: [
      [3, 19],
      [7, 14],
      [12, 17],
      [16, 11],
      [21, 14],
      [24, 7.4],
      [29, 9.4],
      [33, 4],
    ],
    dog: [
      [3.8, 19.9],
      [9, 13],
      [11, 13.6],
      [17, 16],
      [19, 9],
      [25, 12],
      [27, 5.4],
      [33.8, 4.9],
    ],
    slack: 1.15,
  },
  {
    // For experts: a long sniffing trail against a winding path, with a leash barely above the minimum.
    id: 'expert',
    person: [
      [3, 19],
      [6, 13],
      [11, 11.6],
      [13, 16.4],
      [18, 17.6],
      [21, 12],
      [19.6, 7.2],
      [24.4, 4.6],
      [28.6, 7.8],
      [33, 4],
    ],
    dog: [
      [3.8, 19.9],
      [3.6, 15],
      [8.6, 15.2],
      [9, 9.6],
      [14.6, 13.2],
      [15.6, 19.8],
      [22.4, 16.4],
      [17.8, 10.4],
      [23.4, 9],
      [22.6, 3],
      [27.8, 10.2],
      [30.6, 3.4],
      [33.8, 4.9],
    ],
    slack: 1.08,
  },
]

/** The generated walks, in the order of their ids. */
const GENERATED_WALKS: GameWalk[] = [...MEDIUM_WALK_IDS, ...HARD_WALK_IDS].map((id) => {
  const walk = GENERATED.park.find((w) => w.id === id)
  if (!walk) throw new Error(`generated.json has no walk ${id}: run npx tsx scripts/gassi/generate.ts`)
  return { id, person: walk.person, dog: walk.dog, slack: walk.slack, speed: GENERATED.speed }
})

export const WALKS: readonly GameWalk[] = [...EASY_WALKS, ...GENERATED_WALKS]

export const walkById = (id: WalkId): GameWalk => WALKS.find((w) => w.id === id)!
