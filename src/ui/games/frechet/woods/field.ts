import { leashGrid } from '../../../../core/games/frechet/woods/field'
import type { WoodsCourse } from '../../../../core/games/frechet/woods/rules'
import type { Field } from '../freeSpace'

/**
 * The leash in the woods for the diagram: n × n positions (column = person, row = dog from the top,
 * as `distanceField`), tinted where the leash touches a tree.
 */
export function woodsField(course: WoodsCourse, n = 200): Field {
  const grid = leashGrid(course.person, course.dog, course.trees, course.start, n - 1, n - 1)
  const values = new Float32Array(n * n)
  const tint = new Uint8Array(n * n)
  for (let col = 0; col < n; col++) {
    for (let row = 0; row < n; row++) {
      const k = col * n + (n - 1 - row)
      values[row * n + col] = grid.leash[k]!
      tint[row * n + col] = grid.touches[k] ? 1 : 0
    }
  }
  return { n, values, tint }
}
