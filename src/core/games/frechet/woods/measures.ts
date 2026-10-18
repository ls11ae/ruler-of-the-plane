import type { Walk } from '../frechet'
import { wrapAngles, type Rope } from './rope'
import { leashOf, ropeAfter, type WoodsCourse } from './rules'
import type { Tree } from './trees'

/**
 * How far the leash wraps round one trunk (see `wrapAngles` in `rope.ts`), in turns (360° = 1), for
 * the trunk it wraps most.
 */
export function wrapTurns(rope: Rope, trees: readonly Tree[]): number {
  const angles = wrapAngles(rope, trees)
  return angles.size === 0 ? 0 : Math.max(...angles.values()) / (2 * Math.PI)
}

/** The most the leash wraps round a trunk anywhere along a walk (sampled every `step` metres). */
export function wrapAlong(course: WoodsCourse, walk: Walk, step = 0.05): number {
  let rope = course.start
  let [s, t] = [0, 0]
  let most = wrapTurns(rope, course.trees)
  for (const [s1, t1] of walk) {
    const n = Math.max(1, Math.ceil(Math.max(s1 - s, t1 - t) / step))
    for (let k = 1; k <= n; k++) {
      const ns = s + ((s1 - s) * k) / n
      const nt = t + ((t1 - t) * k) / n
      rope = ropeAfter(course, rope, s + ((s1 - s) * (k - 1)) / n, t + ((t1 - t) * (k - 1)) / n, ns, nt)
      most = Math.max(most, wrapTurns(rope, course.trees))
    }
    ;[s, t] = [s1, t1]
  }
  return most
}

/** The longest leash along a walk, for comparison with {@link wrapAlong}. */
export function longestAlong(course: WoodsCourse, walk: Walk, step = 0.05): number {
  let rope = course.start
  let [s, t] = [0, 0]
  let most = leashOf(course, rope)
  for (const [s1, t1] of walk) {
    const n = Math.max(1, Math.ceil(Math.max(s1 - s, t1 - t) / step))
    for (let k = 1; k <= n; k++) {
      const ns = s + ((s1 - s) * k) / n
      const nt = t + ((t1 - t) * k) / n
      rope = ropeAfter(course, rope, s + ((s1 - s) * (k - 1)) / n, t + ((t1 - t) * (k - 1)) / n, ns, nt)
      most = Math.max(most, leashOf(course, rope))
    }
    ;[s, t] = [s1, t1]
  }
  return most
}
