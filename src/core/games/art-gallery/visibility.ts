import { orientation, orientationSign, segmentsIntersect } from '../../geometry/predicates'
import type { Vec2 } from '../../geometry/types'
import { cornersOf, edgesOf, type Corner, type Dungeon, type Edge } from './dungeon'

/**
 * Visibility polygon of a torch at q (strictly inside the floor) by an angular sweep over the corners
 * with exact orientation tests (robust-predicates):
 *
 * - corners sorted by angle around q (exact comparator);
 * - a corner v is visible if no wall that does not end at v meets the segment qv (exact);
 * - if both walls at a visible corner lie on the same side of the ray qv, the ray grazes v and goes on
 *   to the next wall behind it: that hit point is added before or after v, depending on the side;
 * - between two consecutive output points the boundary follows a single wall.
 *
 * O(n²) for n corners, a fraction of a millisecond for the levels (n ≤ 101). The hit points behind
 * grazing corners are computed in floating point; all decisions use exact predicates. If q is
 * collinear with two corners (a degenerate case for the sweep, e.g. a test torch at round
 * coordinates), q is moved by a few 1e-9 units first. The result runs counterclockwise (positive
 * signed area).
 */
export function visibilityPolygon(dungeon: Dungeon, torch: Vec2): Vec2[] {
  const corners = cornersOf(dungeon)
  const edges = edgesOf(dungeon)
  const q = generalPosition(torch, corners)

  const visible = corners.filter((c) => isCornerVisible(q, c, edges))
  visible.sort((a, b) => compareAngle(q, a.p, b.p))

  const out: Vec2[] = []
  for (const c of visible) {
    const sPrev = orientationSign(q, c.p, c.prev)
    const sNext = orientationSign(q, c.p, c.next)
    if (sPrev !== sNext) {
      // The walls at c lie on both sides of the ray: the view ends at c.
      out.push(c.p)
      continue
    }
    const far = hitBehind(q, c, edges)
    // Walls on the counterclockwise side: just before c's angle the sweep sees the far wall, just after
    // it the walls at c. On the clockwise side it is the other way round.
    if (sPrev > 0) out.push(far, c.p)
    else out.push(c.p, far)
  }
  return out
}

/** Exact comparison of the angles of a and b around q, counterclockwise from the positive x axis. */
function compareAngle(q: Vec2, a: Vec2, b: Vec2): number {
  const ha = half(q, a)
  const hb = half(q, b)
  if (ha !== hb) return ha - hb
  return -orientationSign(q, a, b)
}

/** 0 for angles in [0, π), 1 for [π, 2π) (exact: comparisons of coordinates only). */
function half(q: Vec2, p: Vec2): number {
  return p[1] > q[1] || (p[1] === q[1] && p[0] > q[0]) ? 0 : 1
}

function isCornerVisible(q: Vec2, c: Corner, edges: readonly Edge[]): boolean {
  for (const e of edges) {
    if (e.a === c.p || e.b === c.p) continue
    if (segmentsIntersect(q, c.p, e.a, e.b)) return false
  }
  return true
}

/** First wall hit by the ray from q through corner c, behind c. */
function hitBehind(q: Vec2, c: Corner, edges: readonly Edge[]): Vec2 {
  const [qx, qy] = q
  const dx = c.p[0] - qx
  const dy = c.p[1] - qy
  let best = Infinity
  for (const e of edges) {
    if (e.a === c.p || e.b === c.p) continue
    const sa = orientationSign(q, c.p, e.a)
    const sb = orientationSign(q, c.p, e.b)
    if (sa === sb) continue
    const ex = e.b[0] - e.a[0]
    const ey = e.b[1] - e.a[1]
    const denom = dx * ey - dy * ex
    if (denom === 0) continue
    const t = ((e.a[0] - qx) * ey - (e.a[1] - qy) * ex) / denom
    if (t > 1 && t < best) best = t
  }
  if (best === Infinity) throw new Error('visibility ray left the dungeon: torch outside the floor?')
  return [qx + best * dx, qy + best * dy]
}

/** Moves q slightly until no two corners are collinear with it (the sweep assumes this). */
function generalPosition(q: Vec2, corners: readonly Corner[]): Vec2 {
  const points = corners.map((c) => c.p)
  for (let attempt = 0; attempt < 16; attempt++) {
    const angle = attempt * 2.399963 // golden angle: spreads the attempts around q
    const r = attempt === 0 ? 0 : 3e-9 * attempt
    const p: Vec2 = [q[0] + r * Math.cos(angle), q[1] + r * Math.sin(angle)]
    if (!hasCollinearPair(p, points)) return p
  }
  return q
}

function hasCollinearPair(q: Vec2, points: readonly Vec2[]): boolean {
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (orientation(q, points[i]!, points[j]!) === 0) return true
    }
  }
  return false
}
