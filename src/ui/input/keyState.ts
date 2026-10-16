/**
 * Key-state tracking by `KeyboardEvent.code` (layout-independent, so QWERTZ and QWERTY agree), without
 * relying on the operating system's auto-repeat. Pure logic: the DOM wiring is in `keyboard.ts`.
 *
 * Codes from gamepads use the same state with virtual codes such as `Pad0Left` (see `gamepad.ts`).
 */
export class KeyState {
  /** Held codes → time of the press (ms), in the order they were pressed. */
  private readonly down = new Map<string, number>()

  /** Records a press; returns false if the key was already held (OS auto-repeat). */
  press(code: string, time: number): boolean {
    if (this.down.has(code)) return false
    this.down.set(code, time)
    return true
  }

  /** Records a release; returns false if the key was not held. */
  release(code: string): boolean {
    return this.down.delete(code)
  }

  /** Releases every key (window lost focus: keyup events would never arrive). */
  releaseAll(): string[] {
    const codes = [...this.down.keys()]
    this.down.clear()
    return codes
  }

  isDown(code: string): boolean {
    return this.down.has(code)
  }

  pressedAt(code: string): number | undefined {
    return this.down.get(code)
  }

  /** Held codes in the order they were pressed. */
  held(): string[] {
    return [...this.down.keys()]
  }

  get size(): number {
    return this.down.size
  }
}

export interface RepeatOptions {
  /** Time from the press to the second step (ms); the first step happens on the press. */
  delay: number
  /** Time between further steps (ms). */
  interval: number
  /** At most this many steps per update, so a stalled frame does not make a cutter jump. */
  maxPerUpdate?: number
}

/** Number of steps due `elapsed` ms after a press: one at once, then after `delay`, then every `interval`. */
export function stepsDue(elapsed: number, { delay, interval }: RepeatOptions): number {
  if (elapsed < 0) return 0
  if (elapsed < delay) return 1
  return 2 + Math.floor((elapsed - delay) / interval)
}

/**
 * Fixed-rate repeat for held keys: call {@link update} once per animation frame; it returns the codes
 * whose steps are due, each repeated as often as steps are due (in the order the keys were pressed).
 */
export class KeyRepeater {
  private readonly emitted = new Map<string, number>()

  constructor(private readonly options: RepeatOptions) {}

  update(state: KeyState, codes: Iterable<string>, now: number): string[] {
    const steps: string[] = []
    const watched = new Set(codes)
    for (const code of [...this.emitted.keys()]) {
      if (!state.isDown(code) || !watched.has(code)) this.emitted.delete(code)
    }
    for (const code of state.held()) {
      if (!watched.has(code)) continue
      const due = stepsDue(now - state.pressedAt(code)!, this.options)
      const done = this.emitted.get(code) ?? 0
      const n = Math.min(due - done, this.options.maxPerUpdate ?? Infinity)
      for (let i = 0; i < n; i++) steps.push(code)
      // Skip steps beyond the cap instead of catching up later.
      if (due > done) this.emitted.set(code, due)
    }
    return steps
  }

  reset(): void {
    this.emitted.clear()
  }
}
