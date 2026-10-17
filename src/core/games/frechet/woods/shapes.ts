import type { Vec2 } from '../../../geometry/types'
import { GENERATED } from '../generated'
import type { Tier } from '../levels'
import { startRope, type Rope } from './rope'
import { makeTree, type Tree } from './trees'

/**
 * The bonus walks of "Gassi gehen" in the woods ("Im Wald"), in the same 36 × 22 m park as the six
 * walks (y down; start at the gate lower left, goal the castle upper right). Trunks are small polygons
 * the leash cannot pass: thick trees it can only bend around, and thin posts and young birches it can
 * wind round several times. In every walk, how the leash lies depends on timing: if one walker gets
 * ahead around a post, the leash coils round it. At the end the leash lies straight however the walk
 * went (no trunk catches it for good, as both only walk forwards).
 *
 * The four hand-made walks are the tier "Leicht"; "Mittel" and "Schwer" are generated offline
 * (`generated.json`, see `scripts/gassi/generate.ts`), with trees that make the shortest leash clearly
 * longer than without them. `levels.ts` adds the target (the shortest leash that allows the walk,
 * found offline by the search in `search.ts`) and the computer's walk, stored in `targets.json`.
 */
export const EASY_WOODS_IDS = ['lamp', 'bakery', 'fetch', 'eight'] as const
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

/**
 * What stands there (only the look differs): an old tree the leash can only bend around, or a thin
 * lamp post, gate post or young birch round which it can wind several times.
 */
export type TrunkKind = 'tree' | 'post' | 'birch'

export interface Trunk {
  at: Vec2
  /** Radius in metres (a regular octagon). */
  radius: number
  /** Default: a post below 0.2 m, else a tree. */
  kind?: TrunkKind
}

export const trunkKind = (t: Trunk): TrunkKind => t.kind ?? (t.radius < 0.2 ? 'post' : 'tree')

export interface WoodsShape {
  id: WoodsId
  person: Vec2[]
  dog: Vec2[]
  /** Trunks: centre and radius in metres. */
  trunks: Trunk[]
  /**
   * The dog's way just before the walk, ending at the start of its trail: the leash lies straight
   * from the person to its first point and is carried along it, e.g. wound round a post the dog was
   * tied to ("Vor dem Bäcker"). Not drawn as part of the trail.
   */
  before?: Vec2[]
  /** Leash length = target × this factor (at least 0.2 m more), rounded up to 0.1 m. */
  slack: number
  /** A leash length chosen by hand instead (e.g. one coil round a post fits, two do not). */
  leash?: number
  /** Where the bakery stands (drawn instead of the gate). */
  bakery?: Vec2
  /** Walking speed of both in metres per second (default `WALK_SPEED`; slower on the hard walks). */
  speed?: number
}

/** How densely the search samples both paths (metres). */
export const SEARCH_STEP = 0.05

/**
 * Corners of a way round a centre: from the angle `from` (degrees; 0 = to the right, 90 = down, so
 * positive angles turn clockwise on screen), `turns` turns (negative: anticlockwise), the radius
 * changing evenly from r0 to r1 (a spiral, so that the loops can be told apart), `perTurn` corners per
 * turn, rounded to 1 cm.
 */
export function spiral(c: Vec2, r0: number, r1: number, from: number, turns: number, perTurn = 8): Vec2[] {
  const n = Math.max(1, Math.round(Math.abs(turns) * perTurn))
  const round = (x: number) => Math.round(x * 100) / 100
  return Array.from({ length: n + 1 }, (_, k): Vec2 => {
    const a = ((from + 360 * turns * (k / n)) * Math.PI) / 180
    const r = r0 + ((r1 - r0) * k) / n
    return [round(c[0] + r * Math.cos(a)), round(c[1] + r * Math.sin(a))]
  })
}

const LAMP: Vec2 = [15, 11.5]
const BAKERY_POST: Vec2 = [6, 17.6]
const EIGHT_A: Vec2 = [12.5, 11.5]
const EIGHT_B: Vec2 = [19.5, 10.5]

/** A figure-eight: anticlockwise round A from its lower right to its bottom, across to B's top, B clockwise. */
const eightPath = (r: number, from: Vec2, to: Vec2): Vec2[] => [
  from,
  ...spiral(EIGHT_A, r, r, 58, -328 / 360),
  ...spiral(EIGHT_B, r, r, 270, 1),
  to,
]

const EASY_SHAPES: readonly WoodsShape[] = [
  {
    // The dog runs two and a half times round a lamp post, the person on a wider loop round it. Keep
    // pace and the leash stays free; fall a loop behind and it coils round the post. The leash allows
    // one coil (the dog a whole loop ahead: from 3.1 m), not two (from 3.7 m).
    id: 'lamp',
    person: [[3, 19], ...spiral(LAMP, 2, 2.2, 135, 2.5), [33, 4]],
    dog: [[3.8, 19.9], ...spiral(LAMP, 0.8, 0.95, 135, 2.5), [33.8, 4.9]],
    trunks: [{ at: LAMP, radius: 0.15 }],
    slack: 1,
    leash: 3.4,
  },
  {
    // The dog was tied to a post in front of the bakery and ran round it twice: the leash starts
    // wound twice round the post. The dog's trail first unwinds it, then both walk on.
    id: 'bakery',
    person: [
      [4.8, 18.4],
      [8, 17.6],
      [12, 14.6],
      [17, 13.6],
      [22, 10.4],
      [27, 8.6],
      [33, 4],
    ],
    dog: [
      ...spiral(BAKERY_POST, 0.9, 0.9, 0, -2),
      [10, 16.2],
      [12.6, 16.8],
      [15.4, 12],
      [18.6, 15],
      [21.6, 9.2],
      [25.6, 11.4],
      [28.2, 6.2],
      [33.8, 4.9],
    ],
    before: spiral(BAKERY_POST, 0.9, 0.9, 0, 2),
    trunks: [{ at: BAKERY_POST, radius: 0.1 }],
    bakery: [3.4, 19.8],
    slack: 1,
    leash: 3.6,
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
    // A figure-eight round a lamp post and a young birch, both the same way: the dog's loops are
    // shorter, so it gets ahead and coils the leash unless it waits. One coil fits, two do not.
    id: 'eight',
    person: eightPath(2.2, [3, 19], [33, 4]),
    dog: eightPath(1, [3.8, 19.9], [33.8, 4.9]),
    trunks: [
      { at: EIGHT_A, radius: 0.12 },
      { at: EIGHT_B, radius: 0.14, kind: 'birch' },
    ],
    slack: 1,
    leash: 3.3,
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

/** The leash at the gate: straight, or as the dog's way before the walk left it. */
export const startOf = (shape: WoodsShape, trees: readonly Tree[] = treesOf(shape)): Rope =>
  startRope(shape.person[0]!, shape.dog[0]!, trees, shape.before)
