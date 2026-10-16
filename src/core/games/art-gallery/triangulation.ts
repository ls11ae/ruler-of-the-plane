import earcut from 'earcut'
import { pointOnSegment } from '../../geometry/predicates'
import type { Vec2 } from '../../geometry/types'
import { rings, type Dungeon } from './dungeon'

export type Triangle = readonly [number, number, number]

/** A triangulation of the floor: corners of all rings (outer first, then the pillars) and triangles. */
export interface Triangulation {
  points: readonly Vec2[]
  triangles: Triangle[]
}

/**
 * Triangulates the floor with earcut. Earcut drops corners where the wall runs straight on (collinear
 * neighbours) and, with pillars, may leave a corner on the side of another triangle. Fisk's proof needs
 * every corner in a proper triangulation, so each triangle with a corner on one of its sides is split
 * there. The result has n − 2 + 2h triangles.
 */
export function triangulate(d: Dungeon): Triangulation {
  const points = rings(d).flat()
  const holeIndices: number[] = []
  let start = d.outer.length
  for (const hole of d.holes) {
    holeIndices.push(start)
    start += hole.length
  }
  const flat = points.flatMap(([x, y]) => [x, y])
  const ids = earcut(flat, holeIndices)
  const triangles: Triangle[] = []
  for (let i = 0; i < ids.length; i += 3) triangles.push([ids[i]!, ids[i + 1]!, ids[i + 2]!])

  // Split every triangle that has a corner on one of its sides (a T-junction), until none is left.
  for (let v = 0; v < points.length; v++) {
    for (let t = 0; t < triangles.length; t++) {
      const tri = triangles[t]!
      if (tri.includes(v)) continue
      const side = ([0, 1, 2] as const).find((k) =>
        onSide(points[v]!, points[tri[k]!]!, points[tri[(k + 1) % 3]!]!),
      )
      if (side === undefined) continue
      const a = tri[side]!
      const b = tri[(side + 1) % 3]!
      const c = tri[(side + 2) % 3]!
      triangles.splice(t, 1, [a, v, c], [v, b, c])
      t-- // the first part may need a further split at another corner
    }
  }
  return { points, triangles }
}

/**
 * Whether corner p lies on the side ab (strictly between a and b). Exactly, or within 10⁻¹² of the side's
 * length: the level coordinates are rounded to 6 decimals, which can move a corner that lay on a
 * diagonal (level 14) by 10⁻¹⁷. Only used for this drawing and explanation triangulation.
 */
function onSide(p: Vec2, a: Vec2, b: Vec2): boolean {
  if (pointOnSegment(p, a, b)) return p !== a && p !== b
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  const s = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2
  if (s <= 0 || s >= 1) return false
  const cross = (p[0] - a[0]) * dy - (p[1] - a[1]) * dx
  return Math.abs(cross) <= 1e-12 * len2
}

/**
 * Three-colours the corners so that every triangle has all three colours, by walking the dual graph
 * (triangles sharing a side). This always works for a floor without pillars (the dual graph is a tree);
 * returns null if it fails (with pillars it may).
 */
export function threeColour(t: Triangulation): number[] | null {
  const colour: number[] = new Array<number>(t.points.length).fill(-1)
  const bySide = new Map<string, number[]>()
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)
  t.triangles.forEach((tri, i) => {
    for (let k = 0; k < 3; k++) {
      const k2 = key(tri[k]!, tri[(k + 1) % 3]!)
      bySide.set(k2, [...(bySide.get(k2) ?? []), i])
    }
  })
  if (!t.triangles.length) return null
  const seen = new Set<number>([0])
  const queue = [0]
  const first = t.triangles[0]!
  first.forEach((p, k) => (colour[p] = k))
  while (queue.length) {
    const i = queue.shift()!
    const tri = t.triangles[i]!
    for (let k = 0; k < 3; k++) {
      for (const j of bySide.get(key(tri[k]!, tri[(k + 1) % 3]!)) ?? []) {
        if (seen.has(j)) continue
        seen.add(j)
        queue.push(j)
        const other = t.triangles[j]!
        const known = other.filter((p) => colour[p]! >= 0)
        const free = other.filter((p) => colour[p]! < 0)
        for (const p of free) colour[p] = 3 - known.reduce((s, q) => s + colour[q]!, 0)
      }
    }
  }
  const valid = t.triangles.every((tri) => new Set(tri.map((p) => colour[p])).size === 3)
  return valid && colour.every((c) => c >= 0 && c <= 2) ? colour : null
}

/**
 * Fisk's proof for a floor without pillars: triangulate, three-colour the corners, and take the
 * smallest colour class. Every triangle has a corner of that colour and a triangle is convex, so these
 * corners see everything; there are at most ⌊n/3⌋ of them.
 */
export function fisk(d: Dungeon) {
  const triangulation = triangulate(d)
  const colours = threeColour(triangulation)
  if (!colours) return null
  const classes = [0, 1, 2].map((c) => colours.flatMap((col, i) => (col === c ? [i] : [])))
  const smallest = classes.reduce((best, cls) => (cls.length < best.length ? cls : best))
  return { triangulation, colours, classes, guards: smallest, guardColour: classes.indexOf(smallest) }
}

export function centroid(t: Triangulation, tri: Triangle): Vec2 {
  const [a, b, c] = tri.map((i) => t.points[i]!) as [Vec2, Vec2, Vec2]
  return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3]
}
