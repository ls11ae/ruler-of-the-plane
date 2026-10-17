import { boundsOf, pointInRing, signedArea, type Ring } from '../../geometry/polygon'
import type { Vec2 } from '../../geometry/types'

/** A dungeon: the outer wall (positive signed area) and pillars (holes, negative signed area). */
export interface Dungeon {
  outer: Ring
  holes: readonly Ring[]
}

export interface Edge {
  a: Vec2
  b: Vec2
}

/** A wall vertex with its neighbours along its ring. */
export interface Corner {
  p: Vec2
  prev: Vec2
  next: Vec2
}

export function rings(d: Dungeon): readonly Ring[] {
  return [d.outer, ...d.holes]
}

export function edgesOf(d: Dungeon): Edge[] {
  return rings(d).flatMap((ring) => ring.map((a, i) => ({ a, b: ring[(i + 1) % ring.length]! })))
}

export function cornersOf(d: Dungeon): Corner[] {
  return rings(d).flatMap((ring) =>
    ring.map((p, i) => ({
      p,
      prev: ring[(i - 1 + ring.length) % ring.length]!,
      next: ring[(i + 1) % ring.length]!,
    })),
  )
}

/** Number of corners n, counting the corners of the pillars too (as in the bound ⌊(n + h)/3⌋). */
export function cornerCount(d: Dungeon): number {
  return rings(d).reduce((n, ring) => n + ring.length, 0)
}

/** Floor area: outer area minus the pillars. */
export function dungeonArea(d: Dungeon): number {
  return signedArea(d.outer) + d.holes.reduce((s, h) => s + signedArea(h), 0)
}

/** Whether p lies strictly inside the floor (not on a wall, not in a pillar): torches may stand there. */
export function isOnFloor(d: Dungeon, p: Vec2): boolean {
  return pointInRing(p, d.outer) === 1 && d.holes.every((h) => pointInRing(p, h) === -1)
}

export function dungeonBounds(d: Dungeon) {
  return boundsOf(d.outer)
}

/**
 * Torches that always suffice: ⌊n/3⌋ without pillars (Chvátal), ⌊(n + h)/3⌋ with h pillars, where n
 * counts all corners including those of the pillars.
 */
export function guaranteedTorches(d: Dungeon): number {
  return Math.floor((cornerCount(d) + d.holes.length) / 3)
}

/** Whether every corner of every wall is a right angle (90° or 270°), in any orientation. */
export function isOrthogonal(d: Dungeon): boolean {
  return rings(d).every((ring) =>
    ring.every((p, i) => {
      const a = ring[(i - 1 + ring.length) % ring.length]!
      const b = ring[(i + 1) % ring.length]!
      const u = [p[0] - a[0], p[1] - a[1]] as const
      const v = [b[0] - p[0], b[1] - p[1]] as const
      // Level coordinates are rounded to 6 decimals, so allow a tiny cosine.
      return Math.abs(u[0] * v[0] + u[1] * v[1]) <= 1e-6 * Math.hypot(...u) * Math.hypot(...v)
    }),
  )
}

/**
 * The stronger bound for dungeons with only right angles and no pillars: ⌊n/4⌋ torches always suffice
 * (Kahn, Klawe, Kleitman 1983); null for other dungeons.
 */
export function orthogonalTorches(d: Dungeon): number | null {
  return d.holes.length === 0 && isOrthogonal(d) ? Math.floor(cornerCount(d) / 4) : null
}
