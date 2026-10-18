/**
 * The "Schwer" walk in the woods where the free start leash is a real trade-off (`ws4`): several start
 * windings work, with clearly different shortest leashes, and the best is not the straight one.
 * Generated with a fixed seed and written into `src/core/games/frechet/generated.json` (the other walks
 * there stay as they are); afterwards run `npx tsx scripts/woods-targets.ts` and
 * `npx tsx scripts/gassi/table.ts`.
 *
 *   npx tsx scripts/gassi/tradeoff.ts        (about five minutes; GASSI_STATS=1 prints only the
 *                                             shortest leash per start of each design, for tuning)
 *
 * Why a round walk: how the leash lies round the gate post at the start fixes how it lies round that
 * post for the whole walk, so two starts differ, at every moment, by at least one turn round the post.
 * Where both walkers are far from the post, at most one of them is short; at the castle, 33 m from the
 * gate, all but one start need some 65 m of leash (as on "Am Tor angebunden" and "Torpfosten"). So
 * this walk starts and ends at a post beside the castle gate and stays near it: the person walks one
 * round about the post, starting close to it and ending further out; the dog stays close to the post
 * and runs two or three laps round it. One lap goes with the person's round, the others are extra:
 * wound against them at the start, the leash is unwound by the dog's first laps while the person still
 * stands at the post (the wound start leash is what costs); straight, the dog must run them at the end,
 * when the person is further away. Starts in between split the extra laps.
 *
 * A walk is kept when, besides the trade-off (the best start is not the straight one; the straight
 * start needs at least 15 % more leash than the best one, a third start at most 1.5 times the best),
 * it passes the checks of the other woods walks (`woods.ts`): with the best start and the tier's leash,
 * every simple strategy snaps and the careful player arrives, winding matters, at least three dead
 * ends, the shortest leash at least 15 % above the Fréchet distance without trees, legible paths.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { format, resolveConfig } from 'prettier'
import { woodsGame } from '../../src/core/games/frechet/assess'
import type { GeneratedWalks, GeneratedWoods } from '../../src/core/games/frechet/generated'
import { freeSpaceReport, samplePositions } from '../../src/core/games/frechet/hardness'
import { pointSegmentDistance } from '../../src/core/games/frechet/path'
import { legibleInWoods } from '../../src/core/games/frechet/pleasant'
import { playCareful, playStrategy, STRATEGIES } from '../../src/core/games/frechet/strategies'
import { leashAt } from '../../src/core/games/frechet/woods/field'
import type { WoodsWalk } from '../../src/core/games/frechet/woods/levels'
import { wrapAlong } from '../../src/core/games/frechet/woods/measures'
import { makeWoodsCourse, woodsAdvice } from '../../src/core/games/frechet/woods/rules'
import { searchWoods } from '../../src/core/games/frechet/woods/search'
import {
  START_WINDINGS,
  startOf,
  treesOf,
  type Trunk,
  type WoodsShape,
} from '../../src/core/games/frechet/woods/shapes'
import { blocked, raysClear } from '../../src/core/games/frechet/woods/trees'
import type { Vec2 } from '../../src/core/geometry/types'
import { mulberry32 } from '../../src/core/random'
import { trunkSpots, WOODS_TIERS } from './woods'

const SEED = 20261109
const TRIES = Number(process.env.GASSI_TRADEOFF ?? 400)
const SPEED = 1.5
const SLACK = WOODS_TIERS.find((t) => t.tier === 'hard')!.slack
/** Sampling of the searches while generating (metres). */
const STEP = 0.15

const out = new URL('../../src/core/games/frechet/generated.json', import.meta.url)
const round = (x: number) => Math.round(x * 100) / 100
const rad = (deg: number) => (deg * Math.PI) / 180
const smooth = (u: number) => u * u * (3 - 2 * u)
const distanceTo = (p: Vec2, line: readonly Vec2[]) =>
  line.slice(1).reduce((best, q, i) => Math.min(best, pointSegmentDistance(p, line[i]!, q)), Infinity)

interface Design {
  n: number
  person: Vec2[]
  dog: Vec2[]
  trunks: Trunk[]
  style: string
}

/**
 * A way round `c`: from angle `a0` (degrees, clockwise on screen), `turns` turns in direction `dir`,
 * the radius given by `r(u)` for the share u of the way, `perTurn` corners per turn.
 */
function around(c: Vec2, a0: number, turns: number, dir: 1 | -1, r: (u: number) => number, perTurn = 16) {
  const n = Math.max(2, Math.round(turns * perTurn))
  return Array.from({ length: n + 1 }, (_, k): Vec2 => {
    const u = k / n
    const a = rad(a0 + dir * 360 * turns * u)
    return [round(c[0] + r(u) * Math.cos(a)), round(c[1] + r(u) * Math.sin(a))]
  })
}

/** An egg round the post, longer towards `towards` (degrees) by the share `e`. */
const egg = (r0: number, e: number, towards: number, a0: number, turns: number, dir: 1 | -1) => (u: number) =>
  r0 * (1 + e * Math.cos(rad(a0 + dir * 360 * turns * u - towards)))

/** A ramp from `from` to the radius `to(u)` over the first share `fIn`, and to `end` over the last `fOut`. */
const ramped =
  (from: number, to: (u: number) => number, end: number, fIn: number, fOut: number) => (u: number) =>
    u < fIn
      ? from + (to(u) - from) * smooth(u / fIn)
      : u > 1 - fOut
        ? to(u) + (end - to(u)) * smooth((u - (1 - fOut)) / fOut)
        : to(u)

/**
 * A round walk about a post beside the castle gate. The person walks one round about the post (an egg,
 * longer away from the castle), starting close to the post and ending further out. The dog stays
 * close to the post and runs two or three laps round it, with runs out to the side: one lap goes with
 * the person's round, the others are extra. Where the dog runs its extra laps decides how the leash
 * must lie at the start: wound against them, they unwind it while the person still stands close to
 * the post; straight, they wind it up at the end, when the person is further away.
 */
function design(seed: number): Design | null {
  const rng = mulberry32(seed)
  const pick = (a: number, b: number) => a + rng() * (b - a)
  const post: Vec2 = [round(pick(28.5, 31.5)), round(pick(5.2, 7.8))]
  const dir = (rng() < 0.5 ? 1 : -1) as 1 | -1
  // Both start on the castle's side of the post.
  const a0 = pick(285, 345)
  // The person: one round, out from close to the post and back to further out.
  const rp = pick(2.4, 4.4)
  const ep = pick(0, 0.35)
  const tp = pick(0.85, 1.0)
  const rStart = pick(0.9, 1.5)
  const rEnd = pick(1.8, 3.2)
  const person = around(
    post,
    a0,
    tp,
    dir,
    ramped(rStart, egg(rp, ep, 135, a0, tp, dir), rEnd, pick(0.12, 0.25), pick(0.12, 0.25)),
  )
  // The dog: laps close to the post, the radius swinging a little, with runs out to the side.
  const laps = rng() < 0.6 ? 2 : 3
  const rd = pick(0.8, 1.2)
  const swing = pick(0, 0.3)
  const runs = Array.from({ length: Math.floor(rng() * 3) }, () => ({
    at: pick(0.1, 0.9),
    width: pick(0.015, 0.04),
    out: pick(0.8, 2.4),
  }))
  const phase = pick(0, 360)
  const dog = around(
    post,
    a0 + pick(-30, 30),
    laps + pick(-0.15, 0.15),
    dir,
    (u) =>
      rd +
      swing * Math.sin(rad(phase + 360 * laps * 1.5 * u)) +
      runs.reduce((sum, r) => sum + r.out * Math.max(0, 1 - Math.abs(u - r.at) / r.width), 0),
    14,
  )
  const trunks: Trunk[] = [{ at: post, radius: round(pick(0.12, 0.16)), kind: 'post' }]
  return {
    n: seed,
    person,
    dog,
    trunks,
    style:
      `${laps} laps r ${rd.toFixed(1)}, ${runs.length} runs, ` +
      `person ${rp.toFixed(1)}/${ep.toFixed(2)} from ${rStart.toFixed(1)} to ${rEnd.toFixed(1)}`,
  }
}

const shapeOf = (d: Design, slack = SLACK): WoodsShape => ({
  id: 'ws4',
  person: d.person,
  dog: d.dog,
  trunks: d.trunks,
  slack,
  speed: SPEED,
  freeStart: { post: 0 },
  round: true,
})

/** The shortest leash per start winding (coarse searches), or null where none is found. */
function startTargets(d: Design): Map<number, number> {
  const shape = shapeOf(d)
  const trees = treesOf(shape)
  const targets = new Map<number, number>()
  for (const k of START_WINDINGS) {
    try {
      targets.set(k, searchWoods(d.person, d.dog, trees, STEP, { start: startOf(shape, trees, k) }).target)
    } catch {
      targets.set(k, Infinity)
    }
  }
  return targets
}

/** The best start (fewer turns on a tie) and whether the starts are a trade-off. */
function tradeOff(targets: Map<number, number>, margin = 0) {
  const best = [...START_WINDINGS].sort(
    (a, b) => targets.get(a)! - targets.get(b)! || Math.abs(a) - Math.abs(b),
  )[0]!
  const t = targets.get(best)!
  const straight = targets.get(0)! / t
  const others = START_WINDINGS.filter((k) => k !== 0 && k !== best).map((k) => targets.get(k)! / t)
  const third = Math.min(...others)
  const ok = best !== 0 && straight >= 1.15 + margin && third <= 1.5 - margin
  return { best, target: t, straight, third, working: others.filter((r) => r <= 1.5).length + 2, ok }
}

/** Thick trees and posts where the leash of the best walk without trees sweeps, outside the round. */
function withTrees(seed: number, d: Design, walk: [number, number][]): Design[] {
  const rng = mulberry32(seed ^ 0x5bd1e995)
  const spots = trunkSpots(rng, d, walk, 1.2)
  const variants: Design[] = [d]
  const trunks = [...d.trunks]
  for (const p of spots) {
    if (trunks.length === 4) break
    if (rng() < 0.3) continue
    if (trunks.some((t) => Math.hypot(t.at[0] - p[0], t.at[1] - p[1]) < 3)) continue
    const thick = rng() < 0.55
    const radius = thick ? round(0.6 + rng() * 0.35) : round(0.1 + rng() * 0.06)
    if (distanceTo(p, d.person) < radius + 0.4 || distanceTo(p, d.dog) < radius + 0.4) continue
    const t: Trunk = {
      at: [round(p[0]), round(p[1])],
      radius,
      ...(thick ? {} : { kind: rng() < 0.5 ? 'post' : 'birch' }),
    }
    const list = [...trunks, t]
    if (!raysClear(treesOf({ ...shapeOf(d), trunks: list }), 0.3)) continue
    trunks.push(t)
    variants.push({ ...d, trunks: [...trunks] })
  }
  return variants
}

interface Rated {
  design: Design
  targets: Map<number, number>
  best: number
  target: number
  plain: number
  straight: number
  third: number
  working: number
  deadEnds: number
  coiling: number
  wrap: number
  score: number
}

function rate(d: Design, why: (s: string) => null): Rated | null {
  const posts = d.trunks.map((t) => t.at)
  if (!legibleInWoods(d.person, d.dog, posts)) return why('legible')
  if (d.trunks.length < 3) return why('fewer than three trunks')
  const shape = shapeOf(d)
  const trees = treesOf(shape)
  if (!raysClear(trees, 0.3)) return why('rays')
  if (
    d.trunks.some(
      (t) => distanceTo(t.at, d.person) < t.radius + 0.3 || distanceTo(t.at, d.dog) < t.radius + 0.3,
    )
  )
    return why('trunk on a path')
  if (blocked(trees, d.person[0]!, d.dog[0]!)) return why('start leash blocked')
  const targets = startTargets(d)
  const trade = tradeOff(targets, 0.03)
  if (!trade.ok)
    return why(
      `trade-off: best ${trade.best}, straight ${trade.straight.toFixed(2)}, third ${trade.third.toFixed(2)}`,
    )
  const plain = searchWoods(d.person, d.dog, [], STEP).target
  if (trade.target < 1.17 * plain) return why(`woods ${trade.target.toFixed(2)} vs ${plain.toFixed(2)}`)
  const found = searchWoods(d.person, d.dog, trees, STEP, { start: startOf(shape, trees, trade.best) })
  const walk: WoodsWalk = { ...shape, trees, target: found.target, computer: found.walk }
  const course = makeWoodsCourse(walk, trade.best)
  const game = woodsGame(course)
  const outcomes = STRATEGIES.map((id) => playStrategy(game, id))
  if (outcomes.some((o) => o.arrived))
    return why(`${STRATEGIES.filter((_, i) => outcomes[i]!.arrived).join(', ')} get through`)
  const coiling = outcomes.filter((o) => o.coil >= 1).length
  const wrap = wrapAlong(course, found.walk, 0.1)
  if (wrap < 1 && coiling < 3) return why(`winding hardly matters (wrap ${wrap.toFixed(2)}, ${coiling} coil)`)
  if (!playCareful(game, (state) => woodsAdvice(course, state)).arrived) return why('careful player fails')
  const raster = leashAt(
    course.person,
    course.dog,
    trees,
    course.start,
    samplePositions(course.person.length, 0.1),
    samplePositions(course.dog.length, 0.1),
  )
  const space = freeSpaceReport(raster, course.leash, course.person, course.dog)
  if (space.deadEnds.length < 3) return why(`${space.deadEnds.length} dead ends`)
  // Rank: a clear trade-off (the straight start well above the best, more starts that work), then
  // how hard the walk is, as in woods.ts.
  const score =
    10 * Math.min(trade.straight - 1, 0.4) +
    3 * trade.working +
    2 * Math.min(space.deadEnds.length, 10) +
    40 * space.deadShare +
    20 * (trade.target / plain - 1) +
    3 * coiling
  return {
    design: d,
    targets,
    best: trade.best,
    target: trade.target,
    plain,
    straight: trade.straight,
    third: trade.third,
    working: trade.working,
    deadEnds: space.deadEnds.length,
    coiling,
    wrap,
    score,
  }
}

const started = performance.now()
const rng = mulberry32(SEED)
const rated: Rated[] = []
const dropped = new Map<string, number>()
for (let n = 0; n < TRIES; n++) {
  const seed = Math.floor(rng() * 2 ** 31)
  const base = design(seed)
  if (!base) continue
  if (process.env.GASSI_STATS) {
    const t = tradeOff(startTargets(base))
    console.log(
      `${base.style}: best ${t.best} ${t.target.toFixed(2)}, straight ×${t.straight.toFixed(2)}, third ×${t.third.toFixed(2)}`,
    )
    continue
  }
  let plainWalk: [number, number][]
  try {
    plainWalk = searchWoods(base.person, base.dog, [], STEP).walk
  } catch {
    continue
  }
  for (const d of withTrees(seed, base, plainWalk)) {
    const r = rate(d, (why) => {
      const key = why.split(':')[0]!
      dropped.set(key, (dropped.get(key) ?? 0) + 1)
      if (process.env.GASSI_DEBUG) console.log(`  #${seed} (${d.trunks.length} trunks): ${why}`)
      return null
    })
    if (!r) continue
    rated.push(r)
    console.log(
      `  #${seed} ${d.style}, ${d.trunks.length} trunks: best ${r.best} ${r.target.toFixed(2)} (plain ${r.plain.toFixed(2)}), ` +
        `straight ×${r.straight.toFixed(2)}, third ×${r.third.toFixed(2)}, ${r.working} starts work, ` +
        `dead ends ${r.deadEnds}, coiling ${r.coiling}, wrap ${r.wrap.toFixed(2)}, score ${r.score.toFixed(1)}`,
    )
  }
  if (n % 20 === 19)
    console.log(
      `${n + 1} tried, ${rated.length} kept, ${((performance.now() - started) / 1000).toFixed(0)} s`,
    )
}
console.log('dropped:', JSON.stringify(Object.fromEntries(dropped)))
const chosen = rated.sort((a, b) => b.score - a.score)[0]
if (!chosen) throw new Error('no walk passed')
const d = chosen.design
console.log(
  `chosen #${d.n} (${d.style}): ${[...chosen.targets].map(([k, t]) => `${k}: ${t.toFixed(2)}`).join(', ')}`,
)

const walk: GeneratedWoods = {
  id: 'ws4',
  tier: 'hard',
  person: d.person,
  dog: d.dog,
  trunks: d.trunks,
  slack: SLACK,
  freeStart: { post: 0 },
  round: true,
}
const data = JSON.parse(readFileSync(out, 'utf8')) as GeneratedWalks
data.woods = [...data.woods.filter((w) => w.id !== 'ws4'), walk].sort((a, b) => a.id.localeCompare(b.id))
const config = (await resolveConfig(out.pathname)) ?? {}
writeFileSync(out, await format(JSON.stringify(data), { ...config, parser: 'json' }))
console.log(`wrote ${out.pathname} in ${((performance.now() - started) / 1000).toFixed(0)} s`)
