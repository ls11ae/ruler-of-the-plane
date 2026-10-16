import type { Vec2 } from '../../geometry/types'
import { Mowing, type Lawn } from './mowing'
import { cornersOf, STEP, wayBack, type Direction } from './tour'

/** How far (in cells) cutters may drive beyond the lawn's bounding box. */
export const MARGIN = 2

export interface Cutter {
  start: Vec2
  at: Vec2
  /** Every position so far, from the start (unit steps apart). */
  walk: Vec2[]
}

/** A round of lawn mowing: the cutters' walks and what they have mowed. Mutable; the UI copies on change. */
export class MowingRound {
  readonly mowing: Mowing
  readonly cutters: Cutter[]
  private readonly box: { minX: number; minY: number; maxX: number; maxY: number }

  constructor(
    readonly lawn: Lawn,
    starts: readonly Vec2[],
  ) {
    this.mowing = new Mowing(lawn)
    this.cutters = starts.map((s) => ({ start: s, at: s, walk: [s] }))
    for (const s of starts) this.mowing.mowAt(s)
    const g = lawn.cells
    this.box = {
      minX: g.x0 - MARGIN,
      minY: g.y0 - MARGIN,
      maxX: g.x0 + g.width + MARGIN,
      maxY: g.y0 + g.height + MARGIN,
    }
  }

  /** Whether a cutter may stand at p (anywhere on and around the lawn, holes included). */
  inside([x, y]: Vec2): boolean {
    const b = this.box
    return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY
  }

  /** Moves cutter i one step; returns the newly mowed cells, or null if the step would leave the area. */
  step(i: number, direction: Direction): number | null {
    const c = this.cutters[i]!
    const [dx, dy] = STEP[direction]
    const next: Vec2 = [c.at[0] + dx, c.at[1] + dy]
    if (!this.inside(next)) return null
    return this.moveTo(i, next)
  }

  /** Moves cutter i to a neighbouring lattice point (used for the way home). */
  moveTo(i: number, next: Vec2): number {
    const c = this.cutters[i]!
    c.at = next
    c.walk.push(next)
    return this.mowing.mowAt(next)
  }

  /** Steps walked by cutter i so far. */
  steps(i: number): number {
    return this.cutters[i]!.walk.length - 1
  }

  /** Steps from cutter i's position back to its start (the shortest way: L1). */
  stepsHome(i: number): number {
    const c = this.cutters[i]!
    return Math.abs(c.at[0] - c.start[0]) + Math.abs(c.at[1] - c.start[1])
  }

  /** Cutter i's tour if it went home now: steps so far plus the way back. */
  tourLength(i: number): number {
    return this.steps(i) + this.stepsHome(i)
  }

  /** The longest tour (if all went home now): the score, lower is better. */
  longest(): number {
    return Math.max(0, ...this.cutters.map((_, i) => this.tourLength(i)))
  }

  /** The way home for cutter i, through as much unmowed lawn as the two shortest L shapes allow. */
  wayHome(i: number): Vec2[] {
    const c = this.cutters[i]!
    return wayBack(c.at, c.start, (p) => this.mowing.fresh(p))
  }

  allHome(): boolean {
    return this.cutters.every((c) => c.at[0] === c.start[0] && c.at[1] === c.start[1])
  }

  /** The tours so far as pyutils27 corner points (closed implicitly; complete once all are home). */
  tours(): Vec2[][] {
    return this.cutters.map((c) => cornersOf(c.walk))
  }
}
