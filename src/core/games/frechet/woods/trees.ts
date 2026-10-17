import type { Vec2 } from '../../../geometry/types'
import { locate, type Path } from '../path'

/**
 * Trees of "Im Wald": each trunk is a small convex polygon that the leash cannot pass, so the leash
 * wraps around trunks like a taut rope (homotopic Fréchet distance; Chambers, Colin de Verdière,
 * Erickson, Lazard, Lazarus and Thite, "Walking your dog in the woods in polynomial time").
 *
 * How the leash lies around the trees (its homotopy class) is recorded by a word: from the centre of
 * every trunk a ray goes straight up (towards y = −∞) to the edge of the world, and a curve's word lists
 * the rays it crosses, in order: +(k + 1) for crossing the ray of tree k from left to right, −(k + 1)
 * from right to left, with a crossing and its immediate reverse cancelled. Cut along the rays, the
 * plane minus the trunks is simply connected, so two curves between the same points can be deformed
 * into each other around the trees iff their words agree.
 */
export interface Tree {
  centre: Vec2
  /**
   * Corners of the trunk, a convex polygon, with positive orientation (see `orientation` in
   * `geometry/predicates.ts`). No corner lies straight above the centre: the ray leaves the trunk
   * through the middle of an edge.
   */
  trunk: Vec2[]
  /** Largest distance of a corner from the centre (a bounding circle). */
  reach: number
}

/** A regular polygon with `sides` corners around the centre, its top edge horizontal. */
export function makeTree(centre: Vec2, radius = 0.45, sides = 8): Tree {
  const trunk: Vec2[] = []
  for (let k = 0; k < sides; k++) {
    // Corners at −90° ± 180°/sides … : the direction straight up hits the middle of an edge.
    const angle = -Math.PI / 2 + Math.PI / sides + (2 * Math.PI * k) / sides
    trunk.push([centre[0] + radius * Math.cos(angle), centre[1] + radius * Math.sin(angle)])
  }
  return { centre, trunk, reach: radius }
}

/** A homotopy class of curves between two points: the reduced list of ray crossings (see above). */
export type Word = readonly number[]

/** Appends a crossing to a word in place, cancelling it against its reverse. */
export function pushLetter(word: number[], letter: number): void {
  if (word.length > 0 && word[word.length - 1] === -letter) word.pop()
  else word.push(letter)
}

/** The reduced concatenation of words. */
export function concat(...words: Word[]): number[] {
  const out: number[] = []
  for (const w of words) for (const letter of w) pushLetter(out, letter)
  return out
}

/** The word of the reversed curve. */
export const inverse = (word: Word): number[] => word.map((l) => -l).reverse()

export const sameWord = (a: Word, b: Word) => a.length === b.length && a.every((l, i) => l === b[i])

/**
 * The rays crossed by the segment p→q, in order along it (not reduced). A point counts as right of a
 * ray when x ≥ the ray's x, so the words of consecutive segments add up without double counting.
 */
export function segmentWord(p: Vec2, q: Vec2, trees: readonly Tree[]): number[] {
  const hits: [u: number, letter: number][] = []
  for (let k = 0; k < trees.length; k++) {
    const [cx, cy] = trees[k]!.centre
    const leftP = p[0] < cx
    const leftQ = q[0] < cx
    if (leftP === leftQ) continue
    const u = (cx - p[0]) / (q[0] - p[0])
    const y = p[1] + u * (q[1] - p[1])
    if (y < cy) hits.push([u, leftP ? k + 1 : -(k + 1)])
  }
  if (hits.length > 1) hits.sort((a, b) => a[0] - b[0])
  return hits.map(([, letter]) => letter)
}

/** The word of a polyline (reduced). */
export function polylineWord(points: readonly Vec2[], trees: readonly Tree[]): number[] {
  const out: number[] = []
  for (let i = 0; i + 1 < points.length; i++)
    for (const letter of segmentWord(points[i]!, points[i + 1]!, trees)) pushLetter(out, letter)
  return out
}

/** The points of a path from arc length s0 to s1 ≥ s0: the two positions and the corners between. */
export function subpath(path: Path, s0: number, s1: number): Vec2[] {
  const a = locate(path, s0)
  const b = locate(path, s1)
  const out: Vec2[] = [at(path, a)]
  for (let i = a.segment + 1; i <= b.segment; i++) {
    const c = path.cumulative[i]!
    if (c > s0 && c < s1) out.push(path.points[i]!)
  }
  out.push(at(path, b))
  return out
}

function at(path: Path, { segment, t }: { segment: number; t: number }): Vec2 {
  const [x0, y0] = path.points[segment]!
  const [x1, y1] = path.points[segment + 1]!
  return [x0 + t * (x1 - x0), y0 + t * (y1 - y0)]
}

/** Slack for touching a trunk (metres): a segment along an edge or through a corner does not enter it. */
const TOUCH = 1e-9

/**
 * Whether the segment p→q passes through the inside of the trunk (touching its boundary is allowed).
 * Clips the segment to the convex trunk and tests the middle of the clipped part.
 */
export function entersTrunk(tree: Tree, p: Vec2, q: Vec2): boolean {
  const { trunk } = tree
  let t0 = 0
  let t1 = 1
  const dx = q[0] - p[0]
  const dy = q[1] - p[1]
  const n = trunk.length
  for (let k = 0; k < n; k++) {
    const [ax, ay] = trunk[k]!
    const [bx, by] = trunk[(k + 1) % n]!
    // Inside is left of each edge (positive orientation): cross(b − a, x − a) ≥ 0.
    const ex = bx - ax
    const ey = by - ay
    const f0 = ex * (p[1] - ay) - ey * (p[0] - ax)
    const df = ex * dy - ey * dx
    if (Math.abs(df) < 1e-15) {
      if (f0 < TOUCH) return false
      continue
    }
    const t = -f0 / df
    if (df > 0) t0 = Math.max(t0, t)
    else t1 = Math.min(t1, t)
    if (t0 >= t1) return false
  }
  const tm = (t0 + t1) / 2
  const mx = p[0] + tm * dx
  const my = p[1] + tm * dy
  return insideBy(tree, [mx, my]) > TOUCH
}

/** How far inside the trunk a point lies (negative outside): the smallest distance to an edge line. */
export function insideBy(tree: Tree, [x, y]: Vec2): number {
  const { trunk } = tree
  let least = Infinity
  for (let k = 0, n = trunk.length; k < n; k++) {
    const [ax, ay] = trunk[k]!
    const [bx, by] = trunk[(k + 1) % n]!
    const len = Math.hypot(bx - ax, by - ay)
    least = Math.min(least, ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / len)
  }
  return least
}

/** Whether the segment p→q passes through the inside of any trunk. */
export const blocked = (trees: readonly Tree[], p: Vec2, q: Vec2) =>
  trees.some((tree) => entersTrunk(tree, p, q))

/**
 * Whether the trees fit the word bookkeeping: trunks pairwise apart and no ray passing another trunk
 * (with `margin` metres to spare).
 */
export function raysClear(trees: readonly Tree[], margin = 0.1): boolean {
  const radius = (t: Tree) => t.reach
  return trees.every((a, i) =>
    trees.every((b, j) => {
      if (i === j) return true
      const apart =
        Math.hypot(a.centre[0] - b.centre[0], a.centre[1] - b.centre[1]) > radius(a) + radius(b) + margin
      // The ray of a (straight up from its centre) keeps away from b.
      const rayHits = b.centre[1] < a.centre[1] && Math.abs(b.centre[0] - a.centre[0]) < radius(b) + margin
      return apart && !rayHits
    }),
  )
}
