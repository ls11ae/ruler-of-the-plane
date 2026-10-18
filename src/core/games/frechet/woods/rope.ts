import { orientationSign } from '../../../geometry/predicates'
import type { Vec2 } from '../../../geometry/types'
import type { Path } from '../path'
import { subpath, type Tree } from './trees'

/**
 * The leash in the woods as a taut rope: from the person around trunk corners to the dog. The rope is
 * the shortest curve in its homotopy class, a polyline whose inner points are trunk corners; at each
 * one it turns towards the trunk. When a walker moves, the rope is updated like a real rope: it catches
 * on the corners its moving end sweeps over and comes free of corners it no longer bends around.
 */
export interface Wrap {
  tree: number
  corner: number
  /** Turn of the rope at this corner (orientation sign of before, corner, after): the trunk's side. */
  turn: 1 | -1
}

export interface Rope {
  /** The person's end. */
  a: Vec2
  /** The dog's end. */
  b: Vec2
  /** The trunk corners the rope bends around, from the person to the dog. */
  wraps: readonly Wrap[]
}

/** A rope that touches no trunk (the start: the segment between person and dog must be clear). */
export const straightRope = (a: Vec2, b: Vec2): Rope => ({ a, b, wraps: [] })

/**
 * The leash at the gate: straight from the person to the start of the dog's `before` (a short way
 * the dog ran before the walk, e.g. round a post it was tied to), then carried along it to its end.
 * Without `before` (or with a single point), straight from the person to `dog`.
 */
export function startRope(person: Vec2, dog: Vec2, trees: readonly Tree[], before?: readonly Vec2[]): Rope {
  if (!before || before.length < 2) return straightRope(person, dog)
  let rope = straightRope(person, before[0]!)
  for (const p of before.slice(1)) rope = moveDog(rope, p, trees)
  return rope
}

/**
 * A way round a post: from `from` on a circle about `centre`, `turns` full turns (positive: the
 * positive orientation of `orientation`, clockwise on screen) and back to `from`, with `perTurn`
 * corners per turn.
 */
export function loopsAround(centre: Vec2, from: Vec2, turns: number, perTurn = 12): Vec2[] {
  const r = Math.hypot(from[0] - centre[0], from[1] - centre[1])
  const a0 = Math.atan2(from[1] - centre[1], from[0] - centre[0])
  const n = Math.abs(turns) * perTurn
  const out: Vec2[] = [from]
  for (let k = 1; k < n; k++) {
    const a = a0 + (Math.sign(turns) * 2 * Math.PI * k) / perTurn
    out.push([centre[0] + r * Math.cos(a), centre[1] + r * Math.sin(a)])
  }
  if (n > 0) out.push(from)
  return out
}

const corner = (trees: readonly Tree[], w: Wrap) => trees[w.tree]!.trunk[w.corner]!

/** The rope as a polyline: the person, the corners, the dog. */
export function ropePoints(rope: Rope, trees: readonly Tree[]): Vec2[] {
  return [rope.a, ...rope.wraps.map((w) => corner(trees, w)), rope.b]
}

export function ropeLength(rope: Rope, trees: readonly Tree[]): number {
  let sum = 0
  let [x, y] = rope.a
  for (const w of rope.wraps) {
    const [cx, cy] = corner(trees, w)
    sum += Math.hypot(cx - x, cy - y)
    x = cx
    y = cy
  }
  return sum + Math.hypot(rope.b[0] - x, rope.b[1] - y)
}

/** A point of the rope during an update: an end, a corner it bends around, or a corner to release. */
interface Node {
  p: Vec2
  wrap: Wrap | null
}

/**
 * The person moves in a straight line to `to` (the segment must not enter a trunk): the rope becomes
 * to → old end → rest, pulled taut.
 */
export function movePerson(rope: Rope, to: Vec2, trees: readonly Tree[]): Rope {
  if (to[0] === rope.a[0] && to[1] === rope.a[1]) return rope
  const { wraps } = rope
  const first = wraps.length > 0 ? corner(trees, wraps[0]!) : rope.b
  // Usually nothing happens: the rope's first leg sweeps past no trunk, and the first bend stays.
  if (
    clearOfTrunks(to, rope.a, first, trees) &&
    (wraps.length === 0 ||
      quickTurn(to, first, wraps.length > 1 ? corner(trees, wraps[1]!) : rope.b) === wraps[0]!.turn)
  ) {
    return { a: to, b: rope.b, wraps }
  }
  const nodes: Node[] = [
    { p: to, wrap: null },
    { p: rope.a, wrap: null },
    ...rope.wraps.map((w) => ({ p: corner(trees, w), wrap: w })),
    { p: rope.b, wrap: null },
  ]
  return fromNodes(tighten(nodes, trees, 1))
}

/** The dog moves in a straight line to `to`; the mirror image of {@link movePerson}. */
export function moveDog(rope: Rope, to: Vec2, trees: readonly Tree[]): Rope {
  if (to[0] === rope.b[0] && to[1] === rope.b[1]) return rope
  const { wraps } = rope
  const n = wraps.length
  const last = n > 0 ? corner(trees, wraps[n - 1]!) : rope.a
  if (
    clearOfTrunks(last, rope.b, to, trees) &&
    (n === 0 || quickTurn(n > 1 ? corner(trees, wraps[n - 2]!) : rope.a, last, to) === wraps[n - 1]!.turn)
  ) {
    return { a: rope.a, b: to, wraps }
  }
  const nodes: Node[] = [
    { p: rope.a, wrap: null },
    ...rope.wraps.map((w) => ({ p: corner(trees, w), wrap: w })),
    { p: rope.b, wrap: null },
    { p: to, wrap: null },
  ]
  return fromNodes(tighten(nodes, trees, nodes.length - 2))
}

/**
 * Whether no trunk corner lies in or near the triangle (p, q, r) (a quick test in floating point; when
 * it fails, the exact update decides).
 */
function clearOfTrunks(p: Vec2, q: Vec2, r: Vec2, trees: readonly Tree[]): boolean {
  const minX = Math.min(p[0], q[0], r[0])
  const maxX = Math.max(p[0], q[0], r[0])
  const minY = Math.min(p[1], q[1], r[1])
  const maxY = Math.max(p[1], q[1], r[1])
  const area = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  const sign = area >= 0 ? 1 : -1
  for (const tree of trees) {
    const rad = tree.reach
    const [cx, cy] = tree.centre
    if (cx + rad <= minX || cx - rad >= maxX || cy + rad <= minY || cy - rad >= maxY) continue
    for (const [x, y] of tree.trunk) {
      // A corner of the triangle itself (the rope's last bend) is not caught.
      if ((x === p[0] && y === p[1]) || (x === q[0] && y === q[1]) || (x === r[0] && y === r[1])) continue
      // Signed distances (times edge length) to the three sides; all clearly negative = outside.
      const a = sign * ((q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]))
      const b = sign * ((r[0] - q[0]) * (y - q[1]) - (r[1] - q[1]) * (x - q[0]))
      const c = sign * ((p[0] - r[0]) * (y - r[1]) - (p[1] - r[1]) * (x - r[0]))
      if (a > -NEAR && b > -NEAR && c > -NEAR) return false
    }
  }
  return true
}

/** Tolerance of the quick tests (square metres). */
const NEAR = 1e-9

/** The turn p → q → r in floating point, or 0 when too close to call (the exact update decides then). */
function quickTurn(p: Vec2, q: Vec2, r: Vec2): -1 | 0 | 1 {
  const o = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  return o > NEAR ? 1 : o < -NEAR ? -1 : 0
}

function fromNodes(nodes: Node[]): Rope {
  return { a: nodes[0]!.p, b: nodes[nodes.length - 1]!.p, wraps: nodes.slice(1, -1).map((n) => n.wrap!) }
}

/**
 * Pulls the polyline taut in its homotopy class. An inner point that is not a corner (the old end), or
 * a corner the rope no longer turns around, is cut off: the rope then sweeps over the triangle of that
 * point and its neighbours and catches on the trunk corners inside it, which become new bends (the
 * convex chain of those corners, bulging towards the cut point). Repeated until every inner point is a
 * corner the rope turns around. Every cut shortens the rope, so this ends.
 */
function tighten(nodes: Node[], trees: readonly Tree[], from: number): Node[] {
  let i = Math.max(1, from)
  while (i < nodes.length - 1) {
    const prev = nodes[i - 1]!
    const node = nodes[i]!
    const next = nodes[i + 1]!
    const turn = orientationSign(prev.p, node.p, next.p)
    if (node.wrap && turn === node.wrap.turn) {
      i++
      continue
    }
    nodes.splice(i, 1, ...caught(prev.p, node.p, next.p, turn, trees))
    i = Math.max(1, i - 1)
  }
  return nodes
}

/**
 * The shortest way from p to q homotopic to p → c → q (both legs clear of trunks): the convex chain of
 * the trunk corners strictly inside the triangle (p, c, q), bulging towards c. Each bend turns like
 * p → c → q (`turn`).
 */
function caught(p: Vec2, c: Vec2, q: Vec2, turn: -1 | 0 | 1, trees: readonly Tree[]): Node[] {
  if (turn === 0) return []
  const minX = Math.min(p[0], c[0], q[0])
  const maxX = Math.max(p[0], c[0], q[0])
  const minY = Math.min(p[1], c[1], q[1])
  const maxY = Math.max(p[1], c[1], q[1])
  const inside: Node[] = []
  for (let k = 0; k < trees.length; k++) {
    const trunk = trees[k]!.trunk
    for (let j = 0; j < trunk.length; j++) {
      const x = trunk[j]!
      if (x[0] <= minX || x[0] >= maxX || x[1] <= minY || x[1] >= maxY) continue
      if (
        orientationSign(p, c, x) === turn &&
        orientationSign(c, q, x) === turn &&
        orientationSign(q, p, x) === turn
      ) {
        inside.push({ p: x, wrap: { tree: k, corner: j, turn } })
      }
    }
  }
  return inside.length === 0 ? [] : hull(p, q, inside, -turn as -1 | 1)
}

/** QuickHull: the convex chain from p to q through the points on side `side` of p → q (exclusive). */
function hull(p: Vec2, q: Vec2, points: Node[], side: -1 | 1): Node[] {
  let far: Node | null = null
  let best = 0
  for (const n of points) {
    if (orientationSign(p, q, n.p) !== side) continue
    const d = Math.abs((q[0] - p[0]) * (n.p[1] - p[1]) - (q[1] - p[1]) * (n.p[0] - p[0]))
    if (d > best) {
      best = d
      far = n
    }
  }
  if (!far) return []
  return [...hull(p, far.p, points, side), far, ...hull(far.p, q, points, side)]
}

/** The person walks along their path from arc length s0 to s1 (corner by corner). */
export function movePersonAlong(
  rope: Rope,
  path: Path,
  s0: number,
  s1: number,
  trees: readonly Tree[],
): Rope {
  if (s1 === s0) return rope
  for (const p of subpath(path, s0, s1).slice(1)) rope = movePerson(rope, p, trees)
  return rope
}

/** The dog runs along its trail from arc length t0 to t1. */
export function moveDogAlong(rope: Rope, path: Path, t0: number, t1: number, trees: readonly Tree[]): Rope {
  if (t1 === t0) return rope
  for (const p of subpath(path, t0, t1).slice(1)) rope = moveDog(rope, p, trees)
  return rope
}

/**
 * The signed angle (radians) that a polyline sweeps around the point c: positive where it turns
 * like the positive orientation of `orientation` (counter-clockwise with y up, clockwise on screen).
 */
export function sweepAround(points: readonly Vec2[], [cx, cy]: Vec2): number {
  let sum = 0
  for (let i = 0; i + 1 < points.length; i++) {
    const ax = points[i]![0] - cx
    const ay = points[i]![1] - cy
    const bx = points[i + 1]![0] - cx
    const by = points[i + 1]![1] - cy
    sum += Math.atan2(ax * by - ay * bx, ax * bx + ay * by)
  }
  return sum
}

/**
 * How often the leash is wound round tree k: the winding number, around the tree's centre, of the
 * loop "along the leash from the person to the dog, then straight back" (an integer; its sign is the
 * direction, as in {@link sweepAround}). A leash that only bends around a trunk has 0 turns; a dog
 * that circles a post three times from a straight leash winds it three times.
 */
export function turnsAround(rope: Rope, trees: readonly Tree[], k: number): number {
  const c = trees[k]!.centre
  const along = sweepAround(ropePoints(rope, trees), c)
  const back = sweepAround([rope.b, rope.a], c)
  return Math.round((along + back) / (2 * Math.PI))
}

/**
 * How far the leash wraps round each trunk it touches: the angle it turns through at that trunk's
 * corners (radians; a leash that only bends round a trunk turns a little, one coiled once round a
 * post about 360°, less what its straight legs to person and dog cover).
 */
export function wrapAngles(rope: Rope, trees: readonly Tree[]): Map<number, number> {
  const per = new Map<number, number>()
  if (rope.wraps.length === 0) return per
  const pts = ropePoints(rope, trees)
  rope.wraps.forEach((w, i) => {
    const [ax, ay] = pts[i]!
    const [bx, by] = pts[i + 1]!
    const [cx, cy] = pts[i + 2]!
    const ux = bx - ax
    const uy = by - ay
    const vx = cx - bx
    const vy = cy - by
    per.set(w.tree, (per.get(w.tree) ?? 0) + Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)))
  })
  return per
}

/**
 * The trunks the leash is coiled round, with the number of turns (signed, see {@link turnsAround}):
 * those it is wound round at least once and wraps at least half way round. (A leash that only bends
 * round the far side of a thick trunk, or just past a post, is wound once by the count but not coiled.)
 */
export function coils(rope: Rope, trees: readonly Tree[]): { tree: number; turns: number }[] {
  const wrapped = wrapAngles(rope, trees)
  return [...wrapped.keys()]
    .sort((a, b) => a - b)
    .filter((tree) => wrapped.get(tree)! >= Math.PI)
    .map((tree) => ({ tree, turns: turnsAround(rope, trees, tree) }))
    .filter((c) => c.turns !== 0)
}
