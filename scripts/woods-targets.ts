/**
 * Computes the targets of the walks "Im Wald" ("Gassi gehen") and writes them to
 * `src/core/games/frechet/woods/targets.json`: for each walk the shortest leash that allows it and the
 * computer's walk, found by the search over (person's position, dog's position, how the leash lies
 * around the trees) in `src/core/games/frechet/woods/search.ts`, on both paths sampled every 5 cm.
 *
 * Walks with a free start leash get one search per start winding (−3 … 3, every 15 cm; the best one
 * again every 5 cm). Run after changing a walk: `npx tsx scripts/woods-targets.ts` (a few minutes). A
 * unit test fails while the stored targets differ from a fresh search.
 */
import { writeFileSync } from 'node:fs'
import { format, resolveConfig } from 'prettier'
import type { StoredSearch, StoredTargets } from '../src/core/games/frechet/woods/levels'
import {
  SEARCH_STEP,
  START_WINDINGS,
  startOf,
  treesOf,
  WOODS_SHAPES,
} from '../src/core/games/frechet/woods/shapes'
import { searchWoods } from '../src/core/games/frechet/woods/search'

const out = new URL('../src/core/games/frechet/woods/targets.json', import.meta.url)
const round = (x: number) => Math.round(x * 1e4) / 1e4
/** Sampling of the searches for the other starts of a free start leash (metres). */
const COARSE_STEP = 0.15

const result: StoredTargets = { step: SEARCH_STEP, walks: {} }
for (const shape of WOODS_SHAPES) {
  const trees = treesOf(shape)
  const search = (winding: number, step = SEARCH_STEP): StoredSearch => {
    const started = performance.now()
    const start = startOf(shape, trees, winding)
    const found = searchWoods(shape.person, shape.dog, trees, step, { start })
    console.log(
      `${shape.id}${shape.freeStart ? ` (start ${winding})` : ''}: target ${found.target.toFixed(3)} m, ` +
        `${found.walk.length} corners, ${found.visited} states, ${(performance.now() - started).toFixed(0)} ms`,
    )
    return {
      target: round(found.target),
      walk: found.walk.map(([s, t]) => [round(s), round(t)]),
      ...(step !== SEARCH_STEP ? { step } : {}),
    }
  }
  if (!shape.freeStart) {
    result.walks[shape.id] = search(0)
    continue
  }
  // A free start: one search per winding, every 15 cm (with a wrong start the leash stays wound round
  // the gate post and the search meets every state); the best of them (fewer turns on a tie) again every
  // 5 cm: that is the target.
  const starts: Record<string, StoredSearch> = {}
  for (const k of START_WINDINGS) starts[k] = search(k, COARSE_STEP)
  const best = [...START_WINDINGS].sort(
    (a, b) => starts[a]!.target - starts[b]!.target || Math.abs(a) - Math.abs(b),
  )[0]!
  starts[best] = search(best)
  result.walks[shape.id] = { ...starts[best]!, starts, best }
}
const text = JSON.stringify(result)
const config = (await resolveConfig(out.pathname)) ?? {}
writeFileSync(out, await format(text, { ...config, parser: 'json' }))
console.log(`wrote ${out.pathname}`)
