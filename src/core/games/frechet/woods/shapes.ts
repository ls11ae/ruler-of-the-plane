import type { Vec2 } from '../../../geometry/types'
import { GENERATED } from '../generated'
import type { Tier } from '../levels'
import { makeTree, type Tree } from './trees'

/**
 * The bonus walks of "Gassi gehen" in the woods ("Im Wald"), in the same 36 × 22 m park as the six
 * walks (y down; start at the gate lower left, goal the castle upper right). Trunks are small polygons
 * the leash cannot pass. In every walk, how the leash lies depends on timing: if one walker gets ahead
 * around a tree, the leash winds around its trunk. No tree stands inside the area enclosed by the two
 * paths (it would catch the leash for good, as both only walk forwards).
 *
 * The four hand-made walks are the tier "Leicht"; "Mittel" and "Schwer" are generated offline
 * (`generated.json`, see `scripts/gassi/generate.ts`), with trees that make the shortest leash clearly
 * longer than without them. `levels.ts` adds the target (the shortest leash that allows the walk,
 * found offline by the search in `search.ts`) and the computer's walk, stored in `targets.json`.
 */
export const EASY_WOODS_IDS = ['oak', 'slalom', 'fetch', 'thicket'] as const
export const MEDIUM_WOODS_IDS = ['wm1', 'wm2', 'wm3'] as const
export const HARD_WOODS_IDS = ['ws1', 'ws2', 'ws3'] as const
export const WOODS_IDS = [...EASY_WOODS_IDS, ...MEDIUM_WOODS_IDS, ...HARD_WOODS_IDS] as const
export type WoodsId = (typeof WOODS_IDS)[number]

export const WOODS_BY_TIER: Record<Tier, readonly WoodsId[]> = {
  easy: EASY_WOODS_IDS,
  medium: MEDIUM_WOODS_IDS,
  hard: HARD_WOODS_IDS,
}

export const tierOfWoods = (id: WoodsId): Tier =>
  (['easy', 'medium', 'hard'] as const).find((tier) => WOODS_BY_TIER[tier].includes(id))!

export interface WoodsShape {
  id: WoodsId
  person: Vec2[]
  dog: Vec2[]
  /** Trunks: centre and radius in metres (regular octagons). */
  trunks: { at: Vec2; radius: number }[]
  /** Leash length = target × this factor (at least 0.2 m more), rounded up to 0.1 m. */
  slack: number
  /** Walking speed of both in metres per second (default `WALK_SPEED`; slower on the hard walks). */
  speed?: number
}

/** How densely the search samples both paths (metres). */
export const SEARCH_STEP = 0.05

const EASY_SHAPES: readonly WoodsShape[] = [
  {
    // Both go once round an old oak: the dog close to the trunk, the person on a wider circle. If one
    // gets ahead round the oak, the leash winds around the trunk.
    id: 'oak',
    person: [
      [3, 19],
      [10, 15.2],
      [15.9, 13.5],
      [17.5, 13.7],
      [19, 13.1],
      [20.1, 11.8],
      [20.3, 10.1],
      [19.8, 8.5],
      [18.5, 7.4],
      [16.7, 7],
      [15.1, 7.5],
      [13.8, 8.8],
      [13.4, 10.6],
      [13.9, 12.4],
      [15.2, 13.7],
      [21.5, 14.4],
      [27, 8.6],
      [33, 4],
    ],
    dog: [
      [3.8, 19.9],
      [11, 16.2],
      [16.5, 11.9],
      [17.4, 12],
      [18.2, 11.5],
      [18.6, 10.6],
      [18.4, 9.7],
      [17.7, 9],
      [16.7, 8.8],
      [15.8, 9.3],
      [15.3, 10.2],
      [15.4, 11.2],
      [16.1, 12.1],
      [22, 15.4],
      [28, 9.4],
      [33.8, 4.9],
    ],
    trunks: [{ at: [17, 10.5], radius: 0.6 }],
    slack: 1.35,
  },
  {
    // Both weave between six trees, the dog in wider bends: the person waits before each tree, or the
    // leash catches on it.
    id: 'slalom',
    person: [
      [3, 19],
      [6.5, 15.8],
      [10, 17.4],
      [13.5, 13],
      [17, 14.6],
      [20.5, 10.2],
      [24, 11.8],
      [27.5, 7.4],
      [33, 4],
    ],
    dog: [
      [3.8, 19.9],
      [6.6, 13.9],
      [10.2, 19.3],
      [13.6, 11.1],
      [17.2, 16.5],
      [20.6, 8.3],
      [24.2, 13.7],
      [27.6, 5.5],
      [33.8, 4.9],
    ],
    trunks: [
      { at: [6.7, 17.5], radius: 0.45 },
      { at: [10.1, 15.4], radius: 0.45 },
      { at: [13.6, 15.2], radius: 0.45 },
      { at: [17.1, 12.4], radius: 0.45 },
      { at: [20.6, 12.4], radius: 0.45 },
      { at: [24.1, 9.6], radius: 0.45 },
    ],
    slack: 1.25,
  },
  {
    // The dog fetches a stick behind a beech: up its left side and over to the far side. If the person
    // walks past the beech meanwhile, the leash catches on it. Without the tree a shorter leash would do.
    id: 'fetch',
    person: [
      [3, 19],
      [10, 16.5],
      [16, 13.8],
      [24, 9.5],
      [33, 4],
    ],
    dog: [
      [3.8, 19.9],
      [11, 17.5],
      [15.8, 14.6],
      [17, 10.6],
      [17.6, 8.6],
      [19.8, 8.2],
      [17.9, 9.2],
      [16.5, 11],
      [16.9, 14.3],
      [25, 10.6],
      [33.8, 4.9],
    ],
    trunks: [{ at: [18.4, 11], radius: 0.55 }],
    slack: 1.2,
  },
  {
    // For experts, with a short leash: weave past three trees, then once round an oak.
    id: 'thicket',
    person: [
      [3, 19],
      [6.5, 15.8],
      [10, 17.4],
      [13.5, 13],
      [17, 14.6],
      [22.9, 11.6],
      [24.5, 11.8],
      [26, 11.2],
      [27, 9.9],
      [27.3, 8.2],
      [26.7, 6.6],
      [25.4, 5.5],
      [23.8, 5.2],
      [22.1, 5.7],
      [20.9, 7],
      [20.5, 8.7],
      [20.9, 10.4],
      [22.2, 11.7],
      [28.4, 12.6],
      [33, 4],
    ],
    dog: [
      [3.8, 19.9],
      [6.6, 13.9],
      [10.2, 19.3],
      [13.6, 11.1],
      [17.2, 16.5],
      [23.5, 10],
      [24.4, 10.1],
      [25.2, 9.6],
      [25.6, 8.7],
      [25.4, 7.8],
      [24.7, 7.1],
      [23.7, 6.9],
      [22.8, 7.4],
      [22.3, 8.3],
      [22.4, 9.3],
      [23.1, 10.2],
      [29, 13.6],
      [33.8, 4.9],
    ],
    trunks: [
      { at: [6.7, 17.5], radius: 0.45 },
      { at: [10.1, 15.4], radius: 0.45 },
      { at: [13.6, 15.2], radius: 0.45 },
      { at: [24, 8.6], radius: 0.6 },
    ],
    slack: 1.12,
  },
]

/** The generated walks, in the order of their ids. */
const GENERATED_SHAPES: WoodsShape[] = [...MEDIUM_WOODS_IDS, ...HARD_WOODS_IDS].map((id) => {
  const walk = GENERATED.woods.find((w) => w.id === id)
  if (!walk) throw new Error(`generated.json has no walk ${id}: run npx tsx scripts/gassi/generate.ts`)
  return {
    id,
    person: walk.person,
    dog: walk.dog,
    trunks: walk.trunks,
    slack: walk.slack,
    speed: GENERATED.speed,
  }
})

export const WOODS_SHAPES: readonly WoodsShape[] = [...EASY_SHAPES, ...GENERATED_SHAPES]

export const treesOf = (shape: WoodsShape): Tree[] => shape.trunks.map((t) => makeTree(t.at, t.radius))
