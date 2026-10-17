import { ropePoints, sweepAround, type Rope } from '../../../../core/games/frechet/woods/rope'
import type { Tree } from '../../../../core/games/frechet/woods/trees'
import type { Vec2 } from '../../../../core/geometry/types'

/** Thin posts are drawn at least this large (pixels), so that they and the rope round them show. */
const MIN_RADIUS_PX = 5

/** The radius a trunk is drawn with (board units; `px` is one pixel in board units). */
export const drawnRadius = (tree: Tree, px: number) => Math.max(tree.reach, MIN_RADIUS_PX * px)

/**
 * How the rope is drawn: like the rope itself (the person, trunk corners, the dog), but where it winds
 * round a trunk more than once, each turn lies a little further out (a small spiral), so that two or
 * three turns round a thin post can be seen and counted. Trunks drawn larger than they are (a post
 * of 0.1 m would be a dot on a laptop screen) are drawn with `radiusOf(tree)`, and the rope's corners
 * on them with it.
 */
export function drawnRope(
  rope: Rope,
  trees: readonly Tree[],
  /** Extra distance from the trunk per full turn (board units). */
  perTurn: number,
  /** The radius a trunk is drawn with (board units). */
  radiusOf: (tree: Tree) => number,
): Vec2[] {
  const pts = ropePoints(rope, trees)
  const out = pts.slice()
  // Per trunk: the angle swept around its centre since the rope's first corner on it, and where that
  // was last measured (point index).
  const swept = new Map<number, { angle: number; at: number }>()
  rope.wraps.forEach((w, i) => {
    const tree = trees[w.tree]!
    const k = i + 1
    const before = swept.get(w.tree)
    const angle = before ? before.angle + sweepAround(pts.slice(before.at, k + 1), tree.centre) : 0
    swept.set(w.tree, { angle, at: k })
    const scale = (radiusOf(tree) + (perTurn * Math.abs(angle)) / (2 * Math.PI)) / tree.reach
    const [cx, cy] = tree.centre
    out[k] = [cx + (pts[k]![0] - cx) * scale, cy + (pts[k]![1] - cy) * scale]
  })
  return out
}
