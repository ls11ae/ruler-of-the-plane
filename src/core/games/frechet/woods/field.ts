import type { Path } from '../path'
import { moveDogAlong, movePersonAlong, ropeLength, type Rope } from './rope'
import type { Tree } from './trees'

/**
 * The taut leash at every pair of positions on a grid: the person at n + 1 evenly spaced positions,
 * the dog at m + 1. How the leash lies depends only on the two positions (the leash starts straight and
 * moves continuously, and the walkers only follow their paths), so a rope carried column by column
 * along the paths gives it everywhere: for each person position the dog runs its trail once.
 */
export interface LeashGrid {
  /** Person's positions in metres (i = 0 … n). */
  s: number[]
  /** Dog's positions in metres (j = 0 … m). */
  t: number[]
  /** Leash length at (s[i], t[j]), index i · (m + 1) + j. */
  leash: Float32Array
  /** The trees the leash touches there, as a bit mask (bit k for tree k < 31; bit 31 for the rest). */
  touches: Uint32Array
}

export function leashGrid(
  person: Path,
  dog: Path,
  trees: readonly Tree[],
  start: Rope,
  n: number,
  m: number,
): LeashGrid {
  const s = Array.from({ length: n + 1 }, (_, i) => (i === n ? person.length : (i / n) * person.length))
  const t = Array.from({ length: m + 1 }, (_, j) => (j === m ? dog.length : (j / m) * dog.length))
  const leash = new Float32Array((n + 1) * (m + 1))
  const touches = new Uint32Array((n + 1) * (m + 1))
  let column = start
  for (let i = 0; i <= n; i++) {
    if (i > 0) column = movePersonAlong(column, person, s[i - 1]!, s[i]!, trees)
    let rope = column
    for (let j = 0; j <= m; j++) {
      if (j > 0) rope = moveDogAlong(rope, dog, t[j - 1]!, t[j]!, trees)
      const k = i * (m + 1) + j
      leash[k] = ropeLength(rope, trees)
      let mask = 0
      for (const w of rope.wraps) mask |= 1 << Math.min(w.tree, 31)
      touches[k] = mask >>> 0
    }
  }
  return { s, t, leash, touches }
}
