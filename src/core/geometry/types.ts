/** A point or vector in the plane, stored as `[x, y]` (as in the level JSON and d3-delaunay). */
export type Vec2 = readonly [x: number, y: number]

/** Axis-parallel bounding box. */
export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}
