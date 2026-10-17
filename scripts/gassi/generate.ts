/**
 * Generates the harder walks of "Gassi gehen" (tiers "Mittel" and "Schwer", in the park and in the
 * woods) with a fixed seed and writes them to `src/core/games/frechet/generated.json`. Afterwards run
 * `npx tsx scripts/woods-targets.ts` (targets of the woods walks) and `npx tsx scripts/gassi/table.ts`
 * (the table in docs/gassi-walks.md). Takes several minutes.
 *
 * A walk is kept only if it is hard: with its leash, all simple strategies of a visitor fail (both walk
 * all the time, the one behind walks, keep pace by the share of the path, the move that keeps the leash
 * shortest), while a careful player who follows the hint, looking at it every quarter of a second,
 * gets through at the slower walking speed of these tiers. Among those, walks whose free space has
 * many dead ends and spreads over many cells of the diagram, and whose computer's walk changes often
 * between waiting and walking, rank first. In the woods the trees must matter as well: the shortest
 * leash with trees is clearly longer than without, and the computer's best walk without trees snaps
 * the leash in the woods.
 */
import { writeFileSync } from 'node:fs'
import { format, resolveConfig } from 'prettier'
import { parkGame, woodsGame } from '../../src/core/games/frechet/assess'
import type { GeneratedWalks } from '../../src/core/games/frechet/generated'
import {
  freeSpaceReport,
  parkRaster,
  samplePositions,
  type FreeSpaceReport,
} from '../../src/core/games/frechet/hardness'
import { makePath, pointAt, pointSegmentDistance, type Path } from '../../src/core/games/frechet/path'
import { advice, makeCourse } from '../../src/core/games/frechet/rules'
import { playCareful, playStrategy, STRATEGIES } from '../../src/core/games/frechet/strategies'
import { leashAt } from '../../src/core/games/frechet/woods/field'
import { makeWoodsCourse, tightestInWoods, woodsAdvice } from '../../src/core/games/frechet/woods/rules'
import { searchWoods } from '../../src/core/games/frechet/woods/search'
import { makeTree, raysClear, type Tree } from '../../src/core/games/frechet/woods/trees'
import type { Vec2 } from '../../src/core/geometry/types'
import { mulberry32, type Rng } from '../../src/core/random'
import { DOG_ENDS, makePathPoints, PERSON_ENDS, pleasant, type PathStyle } from './paths'

const SEED = 20261107
const CANDIDATES = 1600
/** Walking speed of the harder tiers (metres per second; the easy walks keep 2.2). */
const SPEED = 1.5
const TIERS = [
  { tier: 'medium', slack: 1.15, woodsSlack: 1.12, park: 4, woods: 3 },
  { tier: 'hard', slack: 1.08, woodsSlack: 1.06, park: 4, woods: 3 },
] as const
type Tier = (typeof TIERS)[number]['tier']
/** Trunk radius of the generated trees (metres) and the clearance to the paths. */
const TRUNK = 0.6
const CLEARANCE = 0.45
/** In the woods, the computer's best walk without trees must need this much more than the leash. */
const CAUGHT = 1.05

const out = new URL('../../src/core/games/frechet/generated.json', import.meta.url)
const rng = mulberry32(SEED)
const pick = (a: number, b: number) => a + rng() * (b - a)

interface Candidate {
  n: number
  person: Vec2[]
  dog: Vec2[]
  style: string
}

function style(r: Rng, bend: number, dog: boolean): PathStyle {
  const x = r()
  if (x < 0.4)
    return {
      corners: Math.floor(pick(3, 9)),
      amplitude: dog ? pick(2, 6) : pick(2, 5),
      mode: 'meander',
      bend,
      angle: dog ? pick(35, 90) : pick(60, 90),
    }
  return {
    corners: Math.floor(dog ? pick(7, 20) : pick(5, 14)),
    amplitude: dog ? pick(1.5, 5.5) : pick(0.8, 3.5),
    mode: r() < (dog ? 0.6 : 0.5) ? 'zigzag' : 'wander',
    bend,
  }
}

/** Pairs for the woods: a footpath and a dog's trail with excursions across and beside it. */
function woodsCandidates(count: number, first: number): Candidate[] {
  const list: Candidate[] = []
  for (let n = first; n < first + count; n++) {
    const bend = pick(-4, 4)
    const ps = style(rng, bend, false)
    const side = rng() < 0.5 ? -1 : 1
    const ds: PathStyle = {
      corners: Math.floor(pick(3, 6)),
      amplitude: pick(3.5, 7),
      mode: 'spikes',
      bend: bend + side * pick(0.8, 1.8),
    }
    const person = makePathPoints(rng, PERSON_ENDS, ps)
    const dog = makePathPoints(rng, DOG_ENDS, ds)
    if (pleasant(person, dog)) list.push({ n, person, dog, style: `${ps.mode}/${ds.mode}` })
  }
  return list
}

function candidates(): Candidate[] {
  const list: Candidate[] = []
  for (let n = 0; n < CANDIDATES; n++) {
    const bend = pick(-6, 6)
    const ps = style(rng, bend, false)
    const ds = style(rng, bend + pick(-3, 3), true)
    const person = makePathPoints(rng, PERSON_ENDS, ps)
    const dog = makePathPoints(rng, DOG_ENDS, ds)
    if (pleasant(person, dog)) list.push({ n, person, dog, style: `${ps.mode}/${ds.mode}` })
  }
  return list
}

/** Ranking of hard walks: dead ends, their share, the diagram's complexity, decisions on the way. */
function score(space: FreeSpaceReport, changes = 0): number {
  return (
    2 * Math.min(space.deadEnds.length, 10) +
    40 * space.deadShare +
    10 * (space.freeCells / space.allCells) +
    0.5 * Math.min(changes, 20)
  )
}

interface Rated {
  candidate: Candidate
  tier: Tier
  slack: number
  space: FreeSpaceReport
  score: number
  changes?: number
}

function rateInPark(c: Candidate, tier: Tier, slack: number): Rated | null {
  const course = makeCourse({ id: 'own', person: c.person, dog: c.dog, slack, speed: SPEED })
  const game = parkGame(course)
  if (STRATEGIES.some((id) => playStrategy(game, id).arrived)) return null
  if (!playCareful(game, (state) => advice(course, state)).arrived) return null
  const space = freeSpaceReport(
    parkRaster(course.person, course.dog, 0.1),
    course.leash,
    course.person,
    course.dog,
  )
  if (space.deadEnds.length === 0) return null
  return { candidate: c, tier, slack, space, score: score(space) }
}

/**
 * The best `count` of the rated walks, with at most two of the same pair of path styles. The
 * candidates ranked highest are re-ranked with the number of changes between waiting and walking on
 * the computer's walk (a search, so only for them).
 */
function choose(rated: Rated[], count: number, used: Set<number>): Rated[] {
  const top = [...rated]
    .filter((r) => !used.has(r.candidate.n))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4 * count)
    .map((r) => {
      const changes = searchWoods(r.candidate.person, r.candidate.dog, [], 0.1).walk.length - 2
      return { ...r, changes, score: score(r.space, changes) }
    })
  const chosen: Rated[] = []
  const styles = new Map<string, number>()
  for (const r of top.sort((a, b) => b.score - a.score)) {
    if (chosen.length === count) break
    if (used.has(r.candidate.n) || (styles.get(r.candidate.style) ?? 0) >= 2) continue
    chosen.push(r)
    used.add(r.candidate.n)
    styles.set(r.candidate.style, (styles.get(r.candidate.style) ?? 0) + 1)
  }
  return chosen
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

const distanceTo = (p: Vec2, line: readonly Vec2[]) =>
  line.slice(1).reduce((best, q, i) => Math.min(best, pointSegmentDistance(p, line[i]!, q)), Infinity)

/**
 * Places for trunks that catch the leash of the computer's best walk without trees: points the straight
 * leash sweeps over and back during that walk (the area enclosed by the paths walked so far, the leash
 * and the start leash winds around them at some moment), but which lie outside the area the two whole
 * paths enclose (a trunk there would catch the leash for good). Away from both paths and from the gate
 * and the castle. Sorted by how long the leash is caught there.
 */
function trunkSpots(c: Candidate, P: Path, Q: Path, walk: [number, number][]): Vec2[] {
  const ring = [...c.person, ...[...c.dog].reverse()]
  const grid: { p: Vec2; caught: number }[] = []
  for (let x = 2; x <= 34; x += 0.4) {
    for (let y = 2; y <= 20; y += 0.4) {
      const p: Vec2 = [x, y]
      if (distanceTo(p, c.person) < TRUNK + CLEARANCE || distanceTo(p, c.dog) < TRUNK + CLEARANCE) continue
      if (Math.hypot(x - 3, y - 19.5) < 3 || Math.hypot(x - 33.5, y - 4.5) < 3) continue
      if (winding(ring, p) !== 0) continue
      grid.push({ p, caught: 0 })
    }
  }
  // Positions along the walk, every 0.5 m.
  for (let k = 1; k < walk.length; k++) {
    const [s0, t0] = walk[k - 1]!
    const [s1, t1] = walk[k]!
    const steps = Math.ceil(Math.max(s1 - s0, t1 - t0) / 0.5)
    for (let i = 1; i <= steps; i++) {
      const s = s0 + ((s1 - s0) * i) / steps
      const t = t0 + ((t1 - t0) * i) / steps
      const loop = [...subpathPoints(P, 0, s), ...subpathPoints(Q, 0, t).reverse()]
      for (const g of grid) if (winding(loop, g.p) !== 0) g.caught++
    }
  }
  return grid
    .filter((g) => g.caught > 0)
    .sort((a, b) => b.caught - a.caught)
    .map((g) => g.p)
}

/** The path's points from arc length 0 to s. */
function subpathPoints(path: Path, from: number, to: number): Vec2[] {
  const out: Vec2[] = [pointAt(path, from)]
  for (let i = 1; i < path.points.length && path.cumulative[i]! < to; i++) out.push(path.points[i]!)
  out.push(pointAt(path, to))
  return out
}

interface WoodsRated {
  candidate: Candidate
  trunks: Vec2[]
  tier: Tier
  slack: number
  target: number
  plain: number
  space: FreeSpaceReport
  score: number
}

/** A walk in the woods with these trunks: hard, and do the trees matter? */
function rateInWoods(
  c: Candidate,
  trunks: Vec2[],
  trees: Tree[],
  tier: Tier,
  slack: number,
  plain: number,
  plainWalk: [number, number][],
  found: ReturnType<typeof searchWoods>,
): WoodsRated | null {
  const target = found.target
  const walk = {
    id: 'oak' as const,
    person: c.person,
    dog: c.dog,
    trunks: trunks.map((at) => ({ at, radius: TRUNK })),
    trees,
    slack,
    speed: SPEED,
    target,
    computer: found.walk,
  }
  const course = makeWoodsCourse(walk)
  const debug = (why: string) => {
    if (process.env.GASSI_DEBUG) console.log(`    #${c.n} ${tier}: ${why}`)
    return null
  }
  // The computer's walk without trees must clearly snap the leash in the woods.
  const plainInWoods = tightestInWoods(course, plainWalk).leash
  if (plainInWoods < CAUGHT * course.leash)
    return debug(`walk without trees needs ${plainInWoods.toFixed(2)} in the woods, leash ${course.leash}`)
  const game = woodsGame(course)
  const passing = STRATEGIES.filter((id) => playStrategy(game, id).arrived)
  if (passing.length > 0) return debug(`strategies ${passing.join(', ')} get through`)
  if (!playCareful(game, (state) => woodsAdvice(course, state)).arrived) return debug('careful player fails')
  const s = samplePositions(course.person.length, 0.1)
  const t = samplePositions(course.dog.length, 0.1)
  const raster = leashAt(course.person, course.dog, trees, course.start, s, t)
  const space = freeSpaceReport(raster, course.leash, course.person, course.dog)
  return {
    candidate: c,
    trunks,
    tier,
    slack,
    target,
    plain,
    space,
    score: score(space, found.walk.length - 2) + 20 * (target / plain - 1),
  }
}

/**
 * Trunks for a pair of paths, added greedily: each round the spot that best serves both conditions,
 * the trees lengthen the shortest leash (target in the woods / without) and they catch the computer's
 * walk without trees (its leash in the woods / the target in the woods).
 */
function woodsFor(c: Candidate): WoodsRated[] {
  const P = makePath(c.person)
  const Q = makePath(c.dog)
  const free = searchWoods(c.person, c.dog, [], 0.15)
  const plain = free.target
  const spots = trunkSpots(c, P, Q, free.walk)
  if (spots.length < 3) return []
  const tries: Vec2[] = []
  for (const p of spots) {
    if (tries.length === 8) break
    if (tries.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 2.5)) tries.push(p)
  }
  // Enough for the tighter tier (its leash is about 1.06 × the target plus rounding, and the walk without
  // trees must need 5 % more); the looser one is checked when rating.
  const margin = (target: number, caught: number) => Math.min(target / plain - 1.12, caught / target - 1.13)
  let trunks: Vec2[] = []
  let best = -Infinity
  let bestTarget = plain
  for (let round = 0; round < 3; round++) {
    let gain: { spot: Vec2; value: number; target: number } | null = null
    for (const spot of tries) {
      if (trunks.some((q) => Math.hypot(q[0] - spot[0], q[1] - spot[1]) < 2)) continue
      const next = [...trunks, spot]
      const trees = next.map((at) => makeTree(at, TRUNK))
      if (!raysClear(trees, 0.3)) continue
      let found
      try {
        found = searchWoods(c.person, c.dog, trees, 0.15)
      } catch {
        continue
      }
      const course = makeWoodsCourse({
        id: 'oak',
        person: c.person,
        dog: c.dog,
        trunks: next.map((at) => ({ at, radius: TRUNK })),
        trees,
        slack: 1,
        target: found.target,
        computer: found.walk,
      })
      const value = margin(found.target, tightestInWoods(course, free.walk).leash)
      if (value > (gain ? gain.value : best) + 0.005) gain = { spot, value, target: found.target }
    }
    if (!gain) break
    trunks = [...trunks, gain.spot]
    best = gain.value
    bestTarget = gain.target
  }
  if (process.env.GASSI_DEBUG)
    console.log(
      `  #${c.n}: ${spots.length} spots, trees ${trunks.length}, woods ${bestTarget.toFixed(2)} vs ${plain.toFixed(2)}, margin ${best.toFixed(3)}`,
    )
  if (trunks.length === 0 || best < 0) return []
  const trees = trunks.map((at) => makeTree(at, TRUNK))
  const fine = searchWoods(c.person, c.dog, trees, 0.05)
  const plainFine = searchWoods(c.person, c.dog, [], 0.05)
  const rated: WoodsRated[] = []
  for (const { tier, woodsSlack } of TIERS) {
    const r = rateInWoods(c, trunks, trees, tier, woodsSlack, plainFine.target, plainFine.walk, fine)
    if (!r) continue
    rated.push(r)
    console.log(
      `  #${c.n} ${tier}: woods ${r.target.toFixed(2)} vs ${r.plain.toFixed(2)}, dead ends ${r.space.deadEnds.length}, ` +
        `changes ${fine.walk.length - 2}, score ${r.score.toFixed(1)}`,
    )
  }
  return rated
}

const round1 = (x: number) => Math.round(x * 10) / 10
const started = performance.now()
const all = candidates()
console.log(`${all.length} pleasant candidates of ${CANDIDATES}`)

// The park.
const rated: Rated[] = []
for (const c of all) {
  for (const { tier, slack } of TIERS) {
    const r = rateInPark(c, tier, slack)
    if (r) rated.push(r)
  }
}
console.log(
  `park: ${rated.length} hard (candidate, tier) pairs, ${((performance.now() - started) / 1000).toFixed(0)} s`,
)
const used = new Set<number>()
const result: GeneratedWalks = { seed: SEED, speed: SPEED, park: [], woods: [] }
for (const { tier, park } of [...TIERS].reverse()) {
  const chosen = choose(
    rated.filter((r) => r.tier === tier),
    park,
    used,
  )
  chosen.forEach((r, i) => {
    result.park.push({
      id: `${tier === 'hard' ? 's' : 'm'}${i + 1}`,
      tier,
      person: r.candidate.person,
      dog: r.candidate.dog,
      slack: r.slack,
    })
    console.log(
      `park ${tier} #${r.candidate.n} ${r.candidate.style}: score ${r.score.toFixed(1)}, dead ends ${r.space.deadEnds.length}, ` +
        `dead ${(r.space.deadShare * 100).toFixed(0)} %, cells ${r.space.freeCells}/${r.space.allCells}, changes ${r.changes}`,
    )
  })
}

// The woods: pairs with a dog's trail that runs out across and beside the footpath.
const forWoods = woodsCandidates(Number(process.env.GASSI_WOODS ?? 4000), CANDIDATES)
console.log(`woods: ${forWoods.length} pleasant candidates`)
const woodsRated: WoodsRated[] = []
for (const [i, c] of forWoods.entries()) {
  woodsRated.push(...woodsFor(c))
  if (i % 20 === 19)
    console.log(
      `woods: ${i + 1} pairs tried, ${woodsRated.length} rated, ${((performance.now() - started) / 1000).toFixed(0)} s`,
    )
}
// The tier with fewer walks to choose from first (in the woods that is "Mittel": with the looser leash
// some simple strategy gets through more often).
const poolOf = (tier: Tier) => woodsRated.filter((r) => r.tier === tier)
for (const { tier, woods } of [...TIERS].sort((a, b) => poolOf(a.tier).length - poolOf(b.tier).length)) {
  const pool = poolOf(tier)
  const chosenSet = new Set<number>()
  const chosen: WoodsRated[] = []
  for (const r of [...pool].sort((a, b) => b.score - a.score)) {
    if (chosen.length === woods) break
    if (used.has(r.candidate.n) || chosenSet.has(r.candidate.n)) continue
    chosen.push(r)
    chosenSet.add(r.candidate.n)
    used.add(r.candidate.n)
  }
  chosen.forEach((r, i) => {
    result.woods.push({
      id: `w${tier === 'hard' ? 's' : 'm'}${i + 1}`,
      tier,
      person: r.candidate.person,
      dog: r.candidate.dog,
      trunks: r.trunks.map((at) => ({ at: [round1(at[0]), round1(at[1])] as Vec2, radius: TRUNK })),
      slack: r.slack,
    })
    console.log(
      `woods ${tier} #${r.candidate.n}: ${r.trunks.length} trees, woods ${r.target.toFixed(2)} vs ${r.plain.toFixed(2)}, ` +
        `dead ends ${r.space.deadEnds.length}, score ${r.score.toFixed(1)}`,
    )
  })
}

const config = (await resolveConfig(out.pathname)) ?? {}
writeFileSync(out, await format(JSON.stringify(result), { ...config, parser: 'json' }))
console.log(`wrote ${out.pathname} in ${((performance.now() - started) / 1000).toFixed(0)} s`)
