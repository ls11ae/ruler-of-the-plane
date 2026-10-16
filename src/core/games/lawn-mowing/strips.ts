import type { Vec2 } from '../../geometry/types'
import type { Lawn } from './mowing'
import { tourLength } from './tour'

/** A strip: the cutter runs along row `y` (or column, transposed) from `from` to `to`. */
interface Strip {
  line: number
  from: number
  to: number
}

const swap = ([x, y]: Vec2): Vec2 => [y, x]

/** Corner points without repeats and without points in the middle of a straight run (turns stay). */
function clean(points: readonly Vec2[]): Vec2[] {
  const out: Vec2[] = []
  for (const p of points) {
    const last = out[out.length - 1]
    if (last && last[0] === p[0] && last[1] === p[1]) continue
    out.push(p)
  }
  while (out.length > 1 && out[0]![0] === out[out.length - 1]![0] && out[0]![1] === out[out.length - 1]![1])
    out.pop()
  const n = out.length
  if (n < 3) return out
  const dir = (a: Vec2, b: Vec2) => `${Math.sign(b[0] - a[0])},${Math.sign(b[1] - a[1])}`
  return out.filter((p, i) => i === 0 || dir(out[i - 1]!, p) !== dir(p, out[(i + 1) % n]!))
}

/** The strips of height `w` over the lawn, starting `offset` rows below its lowest row. */
function stripsOf(cells: readonly Vec2[], offsets: readonly Vec2[], w: number, offset: number): Strip[] {
  const minOy = Math.min(...offsets.map(([, y]) => y))
  const minOx = Math.min(...offsets.map(([x]) => x))
  const maxOx = Math.max(...offsets.map(([x]) => x))
  const ys = cells.map(([, y]) => y)
  const y0 = Math.min(...ys) - offset
  const y1 = Math.max(...ys)
  const strips: Strip[] = []
  for (let b = y0; b <= y1; b += w) {
    const xs = cells.filter(([, y]) => y >= b && y < b + w).map(([x]) => x)
    if (!xs.length) continue
    const from = Math.min(...xs) - minOx
    const to = Math.max(from, Math.max(...xs) - maxOx)
    strips.push({ line: b - minOy, from, to })
  }
  return strips
}

/** One cutter's closed tour back and forth through consecutive strips, the shorter of the two directions. */
function snake(strips: readonly Strip[]): Vec2[] {
  let best: Vec2[] = []
  let bestLength = Infinity
  for (const leftFirst of [true, false]) {
    const points: Vec2[] = []
    strips.forEach((s, i) => {
      const forward = (i % 2 === 0) === leftFirst
      const [a, b] = forward ? [s.from, s.to] : [s.to, s.from]
      const prev = points[points.length - 1]
      // Over to the next strip along the strip just mowed, then up or down.
      if (prev) points.push([a, prev[1]])
      points.push([a, s.line], [b, s.line])
    })
    // Back to the start: along the last strip, then up or down.
    const first = points[0]
    const last = points[points.length - 1]
    if (first && last && first[0] !== last[0] && first[1] !== last[1]) points.push([first[0], last[1]])
    const tour = clean(points)
    const length = tourLength(tour)
    if (length < bestLength) {
      best = tour
      bestLength = length
    }
  }
  return best
}

/**
 * A simple strategy, not the optimum: back-and-forth strips as high as the cutter, in rows or columns and
 * with the best of the possible offsets; with several cutters the strips are split into consecutive groups
 * so that the longest tour is as short as possible. Used until the chair's solver provides tours.
 */
export function stripTours(lawn: Lawn, k: number): Vec2[][] {
  const cells = lawn.cells.cells()
  let best: Vec2[][] = []
  let bestLength = Infinity
  for (const transposed of [false, true]) {
    const c = transposed ? cells.map(swap) : cells
    const o = transposed ? lawn.offsets.map(swap) : lawn.offsets
    const w = Math.max(...o.map(([, y]) => y)) - Math.min(...o.map(([, y]) => y)) + 1
    for (let offset = 0; offset < w; offset++) {
      const strips = stripsOf(c, o, w, offset)
      for (const groups of splits(strips.length, k)) {
        const tours = groups.map(([a, b]) => snake(strips.slice(a, b)))
        const length = Math.max(...tours.map(tourLength))
        if (length < bestLength) {
          bestLength = length
          best = transposed ? tours.map((t) => t.map(swap)) : tours
        }
      }
    }
  }
  return best
}

/** All ways to cut n strips into k consecutive non-empty groups (as [start, end) pairs); k ≤ 3. */
function splits(n: number, k: number): [number, number][][] {
  if (k <= 1 || n < k) return [[[0, n]]]
  const out: [number, number][][] = []
  if (k === 2) {
    for (let a = 1; a < n; a++)
      out.push([
        [0, a],
        [a, n],
      ])
    return out
  }
  for (let a = 1; a < n - 1; a++) {
    for (let b = a + 1; b < n; b++)
      out.push([
        [0, a],
        [a, b],
        [b, n],
      ])
  }
  return out
}
