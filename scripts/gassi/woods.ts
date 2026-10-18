/**
 * The walks "Im Wald" of the tiers "Mittel" and "Schwer" (used by `generate.ts`, which writes them to
 * `src/core/games/frechet/generated.json`; `GASSI_ONLY=woods` keeps the park's walks). Winding is the
 * heart of them: both paths loop round thin posts (the dog close to the post, the person on a wider
 * loop, the same way round), and on most "Schwer" walks the dog first runs round a post at the gate,
 * so the leash must be wound the other way at the start (the free start leash). Thick trees stand where
 * the leash of the best walk without trees would sweep over them.
 *
 * A walk is kept when: the shortest leash in the woods is at least 15 % above the Fréchet distance
 * without trees; winding matters (the computer's walk wraps the leash a full turn round a post, or at
 * least three of the four simple strategies coil it round a post before they snap); every simple
 * strategy snaps the leash, the careful player gets through; the free space has dead ends; the paths
 * are legible (loops only where designed, no trunk on a path); with a free start, the straight start
 * needs at least 30 % more leash than the best one.
 */
import { woodsGame } from '../../src/core/games/frechet/assess'
import type { GeneratedTier, GeneratedWoods } from '../../src/core/games/frechet/generated'
import { freeSpaceReport, samplePositions, type FreeSpaceReport } from '../../src/core/games/frechet/hardness'
import { makePath, pointAt, pointSegmentDistance, type Path } from '../../src/core/games/frechet/path'
import {
  legibleInWoods,
  crossingsAway,
  sharpestTurn,
  shortestSegment,
} from '../../src/core/games/frechet/pleasant'
import { playCareful, playStrategy, STRATEGIES } from '../../src/core/games/frechet/strategies'
import { leashAt } from '../../src/core/games/frechet/woods/field'
import type { WoodsWalk } from '../../src/core/games/frechet/woods/levels'
import { wrapAlong } from '../../src/core/games/frechet/woods/measures'
import {
  moveDogAlong,
  movePersonAlong,
  ropeLength,
  startRope,
  turnsAround,
} from '../../src/core/games/frechet/woods/rope'
import { makeWoodsCourse, woodsAdvice } from '../../src/core/games/frechet/woods/rules'
import { searchWoods } from '../../src/core/games/frechet/woods/search'
import {
  spiral,
  startOf,
  treesOf,
  type Trunk,
  type WoodsShape,
} from '../../src/core/games/frechet/woods/shapes'
import { raysClear } from '../../src/core/games/frechet/woods/trees'
import type { Vec2 } from '../../src/core/geometry/types'
import { mulberry32, type Rng } from '../../src/core/random'
import { DOG_ENDS, PERSON_ENDS } from './paths'

export const WOODS_TIERS = [
  { tier: 'medium', slack: 1.12, count: 3, freeStarts: 0, maxTurns: 1 },
  { tier: 'hard', slack: 1.06, count: 3, freeStarts: 2, maxTurns: 2 },
] as const

/** A designed walk: paths, trunks, how often each path loops (for legibility), the free start. */
interface Design {
  n: number
  person: Vec2[]
  dog: Vec2[]
  trunks: Trunk[]
  turns: { person: number; dog: number }
  /** Free start: the trunk at the gate and the start winding that unwinds the dog's loops round it. */
  freeStart?: { post: number; best: number }
  style: string
}

const round = (x: number) => Math.round(x * 100) / 100
const angleOf = (c: Vec2, p: Vec2) => (Math.atan2(p[1] - c[1], p[0] - c[0]) * 180) / Math.PI
const distanceTo = (p: Vec2, line: readonly Vec2[]) =>
  line.slice(1).reduce((best, q, i) => Math.min(best, pointSegmentDistance(p, line[i]!, q)), Infinity)

/**
 * A loop round c from the direction of `from` to the direction of `to`: `turns` full turns plus the
 * part of a turn between the two directions, going `dir` (1 clockwise on screen, −1 anticlockwise),
 * the radius changing from r0 to r1.
 */
function loop(c: Vec2, r0: number, r1: number, from: Vec2, to: Vec2, turns: number, dir: 1 | -1): Vec2[] {
  const a = angleOf(c, from)
  const b = angleOf(c, to)
  const part = (((dir * (b - a)) % 360) + 360) % 360
  return spiral(c, r0, r1, a, (dir * (turns * 360 + part)) / 360, 12)
}

/** A point between a and b at share u, moved sideways by `off` metres. */
function along(a: Vec2, b: Vec2, u: number, off: number): Vec2 {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  return [round(a[0] + u * dx - (dy / len) * off), round(a[1] + u * dy + (dx / len) * off)]
}

/**
 * A walk with one or two sites round thin posts and a dog's trail with runs to the sides:
 * - shared: both loop round the post the same way, the dog close to it, the person on a wider loop
 *   (keep pace, or the leash coils);
 * - fetch: the post stands beside the footpath; the dog runs round it, fetches something behind it
 *   and runs back round it the other way (the leash is coiled round the post in between, whatever
 *   the timing: the post makes the shortest leash longer).
 * With `freeStart`, the dog first runs two or three times round a post at the gate. Everything random
 * comes from `seed`; `runs` scales how far the dog runs to the sides (so that a design can be tuned
 * until the runs need about as much leash as the coils).
 */
export function design(seed: number, freeStart: boolean, maxTurns: number, runs = 1): Design | null {
  const rng = mulberry32(seed)
  const pick = (a: number, b: number) => a + rng() * (b - a)
  const [p0, p1] = PERSON_ENDS
  const [d0, d1] = DOG_ENDS
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1])
  const normal: Vec2 = [-(p1[1] - p0[1]) / len, (p1[0] - p0[0]) / len]
  const count = rng() < 0.5 ? 1 : 2
  const us = count === 1 ? [pick(0.35, 0.65)] : [pick(0.25, 0.42), pick(0.6, 0.78)]
  const dir = (rng() < 0.5 ? 1 : -1) as 1 | -1
  const sites = us.map((u, i) => {
    // At least one fetch, unless the gate post already catches the leash.
    const fetch = (!freeStart && i === 0) || rng() < 0.5
    const line = along(p0, p1, u, pick(-2.5, 2.5))
    const side = rng() < 0.5 ? -1 : 1
    const offset = pick(1.9, 2.5)
    // A fetch post stands beside the footpath, at `offset` to its `side`.
    const centre: Vec2 = fetch
      ? [round(line[0] + normal[0] * side * offset), round(line[1] + normal[1] * side * offset)]
      : line
    return {
      kind: fetch ? ('fetch' as const) : ('shared' as const),
      centre,
      line,
      side,
      turns: fetch ? 1 : 1 + Math.floor(rng() * maxTurns),
      dir: (rng() < 0.8 ? dir : -dir) as 1 | -1,
      rp: [pick(1.7, 2.2), pick(1.9, 2.5)] as const,
      rd: [pick(0.7, 0.85), pick(0.8, 1.0)] as const,
      stick: pick(1.4, 2.2),
      radius: round(pick(0.12, 0.18)),
      kindOfPost: (rng() < 0.6 ? 'post' : 'birch') as 'post' | 'birch',
    }
  })
  if (sites.some(({ centre: [x, y] }) => x < 5 || x > 31 || y < 4.2 || y > 17.8)) return null
  // The person: gate, a wander point before, between and after the sites, castle; loops at shared
  // sites, past the fetch posts.
  const anchors: Vec2[] = [p0]
  const stops = [p0, ...sites.map((x) => x.line), p1]
  for (let k = 1; k < stops.length; k++) {
    anchors.push(along(stops[k - 1]!, stops[k]!, pick(0.35, 0.65), pick(-2, 2)))
    if (k < stops.length - 1) anchors.push(stops[k]!)
  }
  anchors.push(p1)
  const person: Vec2[] = [p0]
  for (let k = 1; k < anchors.length; k++) {
    const site = sites.find((x) => x.line === anchors[k])
    if (!site || site.kind === 'fetch') {
      person.push(anchors[k]!)
      continue
    }
    person.push(
      ...loop(site.centre, site.rp[0], site.rp[1], anchors[k - 1]!, anchors[k + 1]!, site.turns, site.dir),
    )
  }
  const trunks: Trunk[] = sites.map((x) => ({ at: x.centre, radius: x.radius, kind: x.kindOfPost }))
  // The dog: maybe round the gate post first, then runs to the sides, and the sites.
  const dog: Vec2[] = [d0]
  let gate: { post: number; best: number } | undefined
  let dogTurns = 0
  const g: Vec2 = [round(d0[0] + pick(0.5, 0.9)), round(d0[1] - pick(0.75, 1.0))]
  const gateTurns = rng() < 0.7 ? 2 : 3
  const gdir = (rng() < 0.5 ? 1 : -1) as 1 | -1
  const gateNext = along(d0, sites[0]!.centre, 0.35, pick(-1, 1))
  if (freeStart) {
    const r = Math.hypot(d0[0] - g[0], d0[1] - g[1])
    const a = angleOf(g, d0)
    const b = angleOf(g, gateNext)
    const part = (((gdir * (b - a)) % 360) + 360) % 360
    // Outwards a little with every turn, so that the loops do not lie on each other.
    dog.push(...spiral(g, r, r + 0.15 * gateTurns, a, (gdir * (gateTurns * 360 + part)) / 360, 12).slice(1))
    trunks.push({ at: g, radius: 0.12, kind: 'post' })
    gate = { post: trunks.length - 1, best: 0 }
    dogTurns += gateTurns
  }
  const dstops = [dog[dog.length - 1]!, ...sites.map((x) => x.centre), d1]
  // One or two runs per stretch, out to alternating sides and leaning forwards or backwards (so that
  // walking whoever is behind does not keep them in step).
  const sides = dstops.map(() =>
    Array.from({ length: rng() < 0.5 ? 1 : 2 }, () => ({
      side: rng() < 0.5 ? -1 : 1,
      inner: pick(0.5, 1),
      outer: pick(1.5, 3),
      lean: pick(-0.2, 0.2),
    })),
  )
  const shifts = dstops.map(() => pick(-1, 1))
  for (let k = 1; k < dstops.length; k++) {
    const a = dstops[k - 1]!
    const b = dstops[k]!
    const list = sides[k]!
    list.forEach(({ side, inner, outer, lean }, r) => {
      const u = (r + 0.6) / (list.length + 0.2)
      dog.push(
        along(a, b, u - 0.12, -side * inner * Math.min(1, runs)),
        along(a, b, u + lean * runs, side * outer * runs),
      )
    })
    const shift = shifts[k]!
    if (k === dstops.length - 1) {
      dog.push(b)
      continue
    }
    const site = sites[k - 1]!
    const after = along(b, dstops[k + 1]!, 0.3, shift)
    const from = dog[dog.length - 1]!
    if (site.kind === 'shared') {
      dog.push(...loop(b, site.rd[0], site.rd[1], from, after, site.turns, site.dir))
      dogTurns += site.turns
      continue
    }
    // Fetch: round the post, out to the stick behind it (away from the footpath), back round the other way.
    const stick: Vec2 = [
      round(b[0] + normal[0] * site.side * site.stick),
      round(b[1] + normal[1] * site.side * site.stick),
    ]
    const turned = (p: Vec2, deg: number): Vec2 => {
      const a2 = ((angleOf(b, p) + deg) * Math.PI) / 180
      const r = Math.hypot(p[0] - b[0], p[1] - b[1])
      return [b[0] + r * Math.cos(a2), b[1] + r * Math.sin(a2)]
    }
    dog.push(...loop(b, site.rd[0], site.rd[0] + 0.1, from, stick, site.turns, site.dir))
    dog.push(stick)
    dog.push(
      ...loop(
        b,
        site.rd[1] + 0.1,
        site.rd[1] + 0.2,
        turned(stick, site.dir * 25),
        after,
        site.turns,
        -site.dir as 1 | -1,
      ),
    )
    dogTurns += 2 * site.turns + 1
  }
  const personTurns = sites.reduce((sum, x) => sum + (x.kind === 'shared' ? x.turns : 0), 0)
  if (gate) {
    // The start that leaves the leash free at the castle: with a straight start, the leash ends wound
    // some turns round the gate post (carried along both whole paths; how it lies depends only on
    // where both are); winding numbers add up, so the start must be wound as often the other way.
    const trees = treesOf({ id: 'ws1', person, dog, trunks, slack: 1 })
    let rope = startRope(person[0]!, dog[0]!, trees)
    rope = movePersonAlong(rope, makePath(person), 0, makePath(person).length, trees)
    rope = moveDogAlong(rope, makePath(dog), 0, makePath(dog).length, trees)
    gate.best = -turnsAround(rope, trees, gate.post)
  }
  return {
    n: seed,
    person,
    dog: dog.map(([x, y]): Vec2 => [round(x), round(y)]),
    trunks,
    turns: { person: personTurns, dog: dogTurns },
    freeStart: gate,
    style: `${sites.map((x) => x.kind).join('+')}${freeStart ? '+gate' : ''}`,
  }
}

/** Which condition of `legibleInWoods` a design misses (for the generator's log). */
export function legibilityProblem(d: Design): string {
  if (![...d.person, ...d.dog].every(([x, y]) => x >= 0.7 && x <= 35.3 && y >= 0.7 && y <= 21.3))
    return 'legible: outside the park'
  if (shortestSegment(d.person) < 0.3 || shortestSegment(d.dog) < 0.3) return 'legible: short segment'
  if (sharpestTurn(d.person) > 120) return 'legible: sharp turn'
  const posts = d.trunks.map((t) => t.at)
  if (crossingsAway(d.person, posts, 3) > 0) return 'legible: person crosses'
  if (crossingsAway(d.dog, posts, 3) > 1) return 'legible: dog crosses'
  return 'legible: long'
}

function winding(ring: readonly Vec2[], [px, py]: Vec2): number {
  let w = 0
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i]!
    const [bx, by] = ring[(i + 1) % ring.length]!
    const c = (bx - ax) * (py - ay) - (px - ax) * (by - ay)
    if (ay <= py) {
      if (by > py && c > 0) w++
    } else if (by <= py && c < 0) w--
  }
  return w
}

function subpathPoints(path: Path, to: number): Vec2[] {
  const out: Vec2[] = [pointAt(path, 0)]
  for (let i = 1; i < path.points.length && path.cumulative[i]! < to; i++) out.push(path.points[i]!)
  out.push(pointAt(path, to))
  return out
}

/**
 * Places for trunks that catch the leash of the computer's best walk without trees: points the straight
 * leash sweeps over and back during that walk, outside the area the two whole paths enclose, clear of
 * both paths, the gate, the castle and the posts. Sorted by how long the leash is caught there.
 */
export function trunkSpots(rng: Rng, d: Design, walk: [number, number][], clearance: number): Vec2[] {
  const P = makePath(d.person)
  const Q = makePath(d.dog)
  const ring = [...d.person, ...[...d.dog].reverse()]
  const grid: { p: Vec2; caught: number }[] = []
  for (let x = 2.5; x <= 33.5; x += 0.6) {
    for (let y = 2.5; y <= 19.5; y += 0.6) {
      const p: Vec2 = [x, y]
      if (distanceTo(p, d.person) < clearance || distanceTo(p, d.dog) < clearance) continue
      if (Math.hypot(x - 3, y - 19.5) < 3 || Math.hypot(x - 33.5, y - 4.5) < 3) continue
      if (d.trunks.some((t) => Math.hypot(t.at[0] - x, t.at[1] - y) < 2.5)) continue
      if (winding(ring, p) !== 0) continue
      grid.push({ p, caught: 0 })
    }
  }
  for (let k = 1; k < walk.length; k++) {
    const [s0, t0] = walk[k - 1]!
    const [s1, t1] = walk[k]!
    const steps = Math.ceil(Math.max(s1 - s0, t1 - t0) / 1)
    for (let i = 1; i <= steps; i++) {
      const loopRing = [
        ...subpathPoints(P, s0 + ((s1 - s0) * i) / steps),
        ...subpathPoints(Q, t0 + ((t1 - t0) * i) / steps).reverse(),
      ]
      for (const g of grid) if (winding(loopRing, g.p) !== 0) g.caught++
    }
  }
  // Then, in random order, places outside the enclosed area within 2.5 m of a path (beside a bend or
  // a run of the dog, where a leash out of step catches).
  const near = grid
    .filter((g) => g.caught === 0 && Math.min(distanceTo(g.p, d.person), distanceTo(g.p, d.dog)) < 2.5)
    .map((g) => ({ p: g.p, key: rng() }))
    .sort((a, b) => a.key - b.key)
    .map((g) => g.p)
  return [
    ...grid
      .filter((g) => g.caught > 0)
      .sort((a, b) => b.caught - a.caught)
      .map((g) => g.p),
    ...near,
  ]
}

export interface WoodsRated {
  design: Design
  tier: GeneratedTier
  slack: number
  target: number
  plain: number
  space: FreeSpaceReport
  /** The most the computer's walk wraps the leash round a trunk (turns of contact). */
  wrap: number
  /** How many of the four strategies coil the leash round a trunk before they snap. */
  coiling: number
  changes: number
  score: number
}

const SPEED = 1.5

/** Rates a design for a tier; null when it misses one of the conditions. */
function rate(d: Design, tier: GeneratedTier, slack: number, plain: number): WoodsRated | null {
  const debug = (why: string) => {
    if (process.env.GASSI_DEBUG) console.log(`    #${d.n} ${tier}: ${why}`)
    return null
  }
  const shape: WoodsShape = {
    id: 'ws1',
    person: d.person,
    dog: d.dog,
    trunks: d.trunks,
    slack,
    speed: SPEED,
    ...(d.freeStart ? { freeStart: { post: d.freeStart.post } } : {}),
  }
  const trees = treesOf(shape)
  const best = d.freeStart?.best ?? 0
  let found
  try {
    found = searchWoods(d.person, d.dog, trees, 0.15, { start: startOf(shape, trees, best) })
  } catch (e) {
    return debug(`search: ${(e as Error).message}`)
  }
  const target = found.target
  if (target < 1.16 * plain) return debug(`woods ${target.toFixed(2)} vs ${plain.toFixed(2)} without trees`)
  const walk: WoodsWalk = { ...shape, trees, target, computer: found.walk }
  const course = makeWoodsCourse(walk, best)
  const game = woodsGame(course)
  const outcomes = STRATEGIES.map((id) => playStrategy(game, id))
  if (outcomes.some((o) => o.arrived))
    return debug(`${STRATEGIES.filter((_, i) => outcomes[i]!.arrived).join(', ')} get through`)
  const coiling = outcomes.filter((o) => o.coil >= 1).length
  const wrap = wrapAlong(course, found.walk, 0.1)
  if (wrap < 1 && coiling < 3)
    return debug(`winding hardly matters (wrap ${wrap.toFixed(2)}, ${coiling} coil)`)
  if (!playCareful(game, (state) => woodsAdvice(course, state)).arrived) return debug('careful player fails')
  const raster = leashAt(
    course.person,
    course.dog,
    trees,
    course.start,
    samplePositions(course.person.length, 0.1),
    samplePositions(course.dog.length, 0.1),
  )
  const space = freeSpaceReport(raster, course.leash, course.person, course.dog)
  if (space.deadEnds.length < 3) return debug(`${space.deadEnds.length} dead ends`)
  if (d.freeStart) {
    // The straight start must be clearly worse than the best one.
    const straight = searchWoods(d.person, d.dog, trees, 0.15, { start: startOf(shape, trees, 0) }).target
    if (straight < 1.3 * target) return debug(`straight start ${straight.toFixed(2)} vs ${target.toFixed(2)}`)
  }
  const changes = found.walk.length - 2
  const score =
    2 * Math.min(space.deadEnds.length, 10) +
    40 * space.deadShare +
    10 * (space.freeCells / space.allCells) +
    0.5 * Math.min(changes, 20) +
    20 * (target / plain - 1) +
    3 * coiling +
    5 * Math.min(wrap, 2)
  return { design: d, tier, slack, target, plain, space, wrap, coiling, changes, score }
}

/** Adds thick trees and a few more thin posts where the leash of the walk without trees would catch. */
function withTrees(rng: Rng, d: Design, walk: [number, number][]): Design | null {
  const spots = trunkSpots(rng, d, walk, 1.3)
  const thick = 1 + Math.floor(rng() * 3)
  const thin = Math.max(Math.floor(rng() * 3), 3 - thick - d.trunks.length)
  const trunks = [...d.trunks]
  const added = () => trunks.length - d.trunks.length
  const clear = (list: Trunk[]) =>
    raysClear(treesOf({ id: 'ws1', person: d.person, dog: d.dog, trunks: list, slack: 1 }), 0.3)
  for (const p of spots) {
    if (added() === thick + thin || trunks.length === 8) break
    if (rng() < 0.35) continue
    if (trunks.some((t) => Math.hypot(t.at[0] - p[0], t.at[1] - p[1]) < 3.5)) continue
    const isThick = trunks.filter((t) => t.radius > 0.3).length < thick
    const radius = isThick ? round(0.6 + rng() * 0.35) : round(0.1 + rng() * 0.05)
    if (distanceTo(p, d.person) < radius + 0.4 || distanceTo(p, d.dog) < radius + 0.4) continue
    const t: Trunk = {
      at: [round(p[0]), round(p[1])],
      radius,
      ...(isThick ? {} : { kind: rng() < 0.5 ? 'post' : 'birch' }),
    }
    if (clear([...trunks, t])) trunks.push(t)
  }
  if (added() === 0 || trunks.length < 3) return null
  return { ...d, trunks }
}

/** Generates the woods walks of both tiers (seeded), the best first, each design used once. */
export function generateWoods(
  seed: number,
  tries = Number(process.env.GASSI_WOODS ?? 600),
): GeneratedWoods[] {
  const rng = mulberry32(seed)
  const started = performance.now()
  const rated: WoodsRated[] = []
  const dropped = new Map<string, number>()
  const drop = (why: string) => dropped.set(why, (dropped.get(why) ?? 0) + 1)
  /** A design with this factor for the dog's runs, if it is legible and its posts stand clear. */
  const candidate = (seed: number, freeStart: boolean, maxTurns: number, runs: number) => {
    const d = design(seed, freeStart, maxTurns, runs)
    if (!d) return 'outside'
    if (
      !legibleInWoods(
        d.person,
        d.dog,
        d.trunks.map((t) => t.at),
      )
    )
      return legibilityProblem(d)
    if (!raysClear(treesOf({ id: 'ws1', person: d.person, dog: d.dog, trunks: d.trunks, slack: 1 }), 0.3))
      return 'rays'
    if (
      d.trunks.some(
        (t) => distanceTo(t.at, d.person) < t.radius + 0.3 || distanceTo(t.at, d.dog) < t.radius + 0.3,
      )
    )
      return 'post on a path'
    return d
  }
  for (let n = 0; n < tries; n++) {
    const seedN = Math.floor(rng() * 2 ** 31)
    const freeStart = rng() < 0.55
    const maxTurns = freeStart || rng() < 0.5 ? 2 : 1
    // Tune how far the dog runs to the sides: with a free start, as far as the rest of the walk needs
    // at most a little more leash than the wound start; otherwise as far as the posts still make the
    // shortest leash 16 % longer than without trees. Then the coils and the runs are both tight.
    let base: Design | null = null
    let open: ReturnType<typeof searchWoods> | null = null
    let why = 'no factor'
    for (const runs of [0.6, 0.85, 1.1, 1.4, 1.8, 2.3]) {
      const c = candidate(seedN, freeStart, maxTurns, runs)
      if (typeof c === 'string') {
        why = c
        continue
      }
      const shape: WoodsShape = {
        id: 'ws1',
        person: c.person,
        dog: c.dog,
        trunks: c.trunks,
        slack: 1,
        ...(c.freeStart ? { freeStart: { post: c.freeStart.post } } : {}),
      }
      const trees = treesOf(shape)
      const start = startOf(shape, trees, c.freeStart?.best ?? 0)
      let target: number
      try {
        target = searchWoods(c.person, c.dog, trees, 0.15, { start }).target
      } catch {
        continue
      }
      const plain = searchWoods(c.person, c.dog, [], 0.15)
      if (c.freeStart) {
        // The largest factor at which the rest needs at most a little more than the wound start, while
        // the trees still make the shortest leash 16 % longer than without them.
        if (target > 1.03 * ropeLength(start, trees)) break
        if (target >= 1.16 * plain.target) {
          base = c
          open = plain
        }
      } else if (target >= 1.16 * plain.target) {
        base = c
        open = plain
      } else if (base) break
    }
    if (!base || !open) {
      drop(why)
      continue
    }
    const d = withTrees(rng, base, open.walk)
    if (!d) {
      drop('trees')
      continue
    }
    for (const { tier, slack } of WOODS_TIERS) {
      if (tier === 'medium' && d.freeStart) continue
      const r = rate(d, tier, slack, open.target)
      if (!r) continue
      rated.push(r)
      console.log(
        `  woods #${n} ${tier} (${d.style}, ${d.trunks.length} trunks): woods ${r.target.toFixed(2)} vs ${r.plain.toFixed(2)}, ` +
          `wrap ${r.wrap.toFixed(2)}, coiling ${r.coiling}, dead ends ${r.space.deadEnds.length}, score ${r.score.toFixed(1)}`,
      )
    }
    if (n % 20 === 19)
      console.log(
        `woods: ${n + 1} tried, ${rated.length} rated, ${((performance.now() - started) / 1000).toFixed(0)} s`,
      )
  }
  if (process.env.GASSI_DEBUG) console.log('dropped:', JSON.stringify(Object.fromEntries(dropped)))
  const out: GeneratedWoods[] = []
  const used = new Set<number>()
  for (const { tier, count, freeStarts } of [...WOODS_TIERS].reverse()) {
    const pool = rated.filter((r) => r.tier === tier).sort((a, b) => b.score - a.score)
    const chosen: WoodsRated[] = []
    // "Schwer": first the walks with a free start, then the others.
    for (const want of [true, false]) {
      const limit = want ? freeStarts : count - chosen.length
      for (const r of pool) {
        if (chosen.length === count || chosen.filter((c) => !!c.design.freeStart === want).length >= limit)
          break
        if (!!r.design.freeStart !== want || used.has(r.design.n)) continue
        chosen.push(r)
        used.add(r.design.n)
      }
    }
    chosen.forEach((r, i) => {
      out.push({
        id: `w${tier === 'hard' ? 's' : 'm'}${i + 1}`,
        tier,
        person: r.design.person,
        dog: r.design.dog,
        trunks: r.design.trunks,
        slack: r.slack,
        ...(r.design.freeStart ? { freeStart: { post: r.design.freeStart.post } } : {}),
      })
      console.log(
        `woods ${tier} #${r.design.n} (${r.design.style}): ${r.design.trunks.length} trunks, woods ${r.target.toFixed(2)} vs ` +
          `${r.plain.toFixed(2)}, wrap ${r.wrap.toFixed(2)}, coiling ${r.coiling}, dead ends ${r.space.deadEnds.length}`,
      )
    })
  }
  return out.sort((a, b) => a.id.localeCompare(b.id))
}
