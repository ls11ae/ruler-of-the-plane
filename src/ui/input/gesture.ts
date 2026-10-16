/**
 * Classifies a pointer interaction (mouse, pen or touch, via Pointer Events) as a tap, a drag or a long
 * press. Pure logic: feed it positions in screen pixels and times in ms.
 */
export interface GestureOptions {
  /** Movement (px) after which a press becomes a drag. */
  dragThreshold: number
  /** Time (ms) after which a press that has not moved becomes a long press. */
  longPressMs: number
}

export const DEFAULT_GESTURE: GestureOptions = { dragThreshold: 8, longPressMs: 600 }

export type GestureKind = 'pending' | 'drag' | 'longpress'

export class GestureTracker {
  kind: GestureKind = 'pending'
  private readonly x0: number
  private readonly y0: number
  private readonly t0: number

  constructor(
    x: number,
    y: number,
    t: number,
    private readonly options: GestureOptions = DEFAULT_GESTURE,
  ) {
    this.x0 = x
    this.y0 = y
    this.t0 = t
  }

  /** Updates with a move; returns true if this move turned the press into a drag. */
  move(x: number, y: number, t: number): boolean {
    this.tick(t)
    if (this.kind !== 'pending') return false
    if (Math.hypot(x - this.x0, y - this.y0) >= this.options.dragThreshold) {
      this.kind = 'drag'
      return true
    }
    return false
  }

  /** Advances time; returns true if the press just became a long press. */
  tick(t: number): boolean {
    if (this.kind === 'pending' && t - this.t0 >= this.options.longPressMs) {
      this.kind = 'longpress'
      return true
    }
    return false
  }

  /** Classification at release: a press that neither moved nor lasted long is a tap. */
  end(t: number): 'tap' | 'drag' | 'longpress' {
    this.tick(t)
    return this.kind === 'pending' ? 'tap' : this.kind
  }
}
