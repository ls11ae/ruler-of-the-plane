/**
 * Computes the targets of the walks "Im Wald" ("Gassi gehen") and writes them to
 * `src/core/games/frechet/woods/targets.json`: for each walk the shortest leash that allows it and the
 * computer's walk, found by the search over (person's position, dog's position, how the leash lies
 * around the trees) in `src/core/games/frechet/woods/search.ts`, on both paths sampled every 5 cm.
 *
 * Run after changing a walk: `npx tsx scripts/woods-targets.ts` (a few seconds). A unit test fails
 * while the stored targets differ from a fresh search.
 */
import { writeFileSync } from 'node:fs'
import { format, resolveConfig } from 'prettier'
import type { StoredTargets } from '../src/core/games/frechet/woods/levels'
import { SEARCH_STEP, treesOf, WOODS_SHAPES } from '../src/core/games/frechet/woods/shapes'
import { searchWoods } from '../src/core/games/frechet/woods/search'

const out = new URL('../src/core/games/frechet/woods/targets.json', import.meta.url)
const round = (x: number) => Math.round(x * 1e4) / 1e4

const result: StoredTargets = { step: SEARCH_STEP, walks: {} }
for (const shape of WOODS_SHAPES) {
  const started = performance.now()
  const found = searchWoods(shape.person, shape.dog, treesOf(shape), SEARCH_STEP)
  result.walks[shape.id] = {
    target: round(found.target),
    walk: found.walk.map(([s, t]) => [round(s), round(t)]),
  }
  console.log(
    `${shape.id}: target ${found.target.toFixed(3)} m, ${found.walk.length} corners, ` +
      `${found.visited} states, ${(performance.now() - started).toFixed(0)} ms`,
  )
}
const text = JSON.stringify(result)
const config = (await resolveConfig(out.pathname)) ?? {}
writeFileSync(out, await format(text, { ...config, parser: 'json' }))
console.log(`wrote ${out.pathname}`)
