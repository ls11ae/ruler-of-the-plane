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
 * between waiting and walking, rank first. The woods' walks, which loop round thin posts, come from
 * `woods.ts` (with their own seed); `GASSI_ONLY=woods` keeps the stored park walks and makes only them.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { format, resolveConfig } from 'prettier'
import { parkGame } from '../../src/core/games/frechet/assess'
import type { GeneratedWalks } from '../../src/core/games/frechet/generated'
import { freeSpaceReport, parkRaster, type FreeSpaceReport } from '../../src/core/games/frechet/hardness'
import { advice, makeCourse } from '../../src/core/games/frechet/rules'
import { playCareful, playStrategy, STRATEGIES } from '../../src/core/games/frechet/strategies'
import { searchWoods } from '../../src/core/games/frechet/woods/search'
import type { Vec2 } from '../../src/core/geometry/types'
import { mulberry32, type Rng } from '../../src/core/random'
import { DOG_ENDS, makePathPoints, PERSON_ENDS, pleasant, type PathStyle } from './paths'
import { generateWoods } from './woods'

const SEED = 20261107
const CANDIDATES = 1600
/** Walking speed of the harder tiers (metres per second; the easy walks keep 2.2). */
const SPEED = 1.5
const TIERS = [
  { tier: 'medium', slack: 1.15, park: 4 },
  { tier: 'hard', slack: 1.08, park: 4 },
] as const
type Tier = (typeof TIERS)[number]['tier']

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

const started = performance.now()
const result: GeneratedWalks = { seed: SEED, speed: SPEED, park: [], woods: [] }

if (process.env.GASSI_ONLY === 'woods') {
  // Keep the park's walks, generate only the woods.
  result.park = (JSON.parse(readFileSync(out, 'utf8')) as GeneratedWalks).park
} else {
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
}

// The woods: walks that loop round thin posts (see woods.ts), with their own seed.
result.woods = generateWoods(SEED + 1)

const config = (await resolveConfig(out.pathname)) ?? {}
writeFileSync(out, await format(JSON.stringify(result), { ...config, parser: 'json' }))
console.log(`wrote ${out.pathname} in ${((performance.now() - started) / 1000).toFixed(0)} s`)
