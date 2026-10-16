import { diffCodes, gamepadCodes } from './gamepad'
import { KeyState } from './keyState'

type Listener = (change: { code: string; down: boolean }) => void

/**
 * The app-wide keyboard (and gamepad) state. One set of window listeners feeds a {@link KeyState};
 * games read it per animation frame or subscribe to presses and releases.
 */
class Keyboard {
  readonly state = new KeyState()
  private readonly listeners = new Set<Listener>()
  private readonly captured = new Map<string, number>()
  private installed = false
  private padCodes = new Set<string>()
  private padFrame = 0
  private snapshot: { version: number; held: string[] } = { version: -1, held: [] }
  private version = 0

  install(): void {
    if (this.installed || typeof window === 'undefined') return
    this.installed = true
    window.addEventListener('keydown', this.onKeyDown, { capture: true })
    window.addEventListener('keyup', this.onKeyUp, { capture: true })
    window.addEventListener('blur', this.releaseAll)
    document.addEventListener('visibilitychange', this.releaseAll)
    window.addEventListener('gamepadconnected', this.startGamepads)
  }

  /** Subscribes to presses and releases (after the state has changed). */
  subscribe(listener: Listener): () => void {
    this.install()
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Prevents the browser's default action (scrolling, button activation) for these codes while
   * captured; returns the release function. Captures are counted, so nested users are fine.
   */
  capture(codes: readonly string[]): () => void {
    this.install()
    for (const c of codes) this.captured.set(c, (this.captured.get(c) ?? 0) + 1)
    return () => {
      for (const c of codes) {
        const n = (this.captured.get(c) ?? 1) - 1
        if (n > 0) this.captured.set(c, n)
        else this.captured.delete(c)
      }
    }
  }

  isDown(code: string): boolean {
    this.install()
    return this.state.isDown(code)
  }

  /** Held codes; the same array until the next press or release (for `useSyncExternalStore`). */
  held(): string[] {
    if (this.snapshot.version !== this.version) {
      this.snapshot = { version: this.version, held: this.state.held() }
    }
    return this.snapshot.held
  }

  private emit(code: string, down: boolean) {
    this.version++
    for (const l of this.listeners) l({ code, down })
  }

  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (this.captured.has(e.code) && !isTextInput(e.target)) e.preventDefault()
    if (!e.code) return
    if (this.state.press(e.code, e.timeStamp || performance.now())) this.emit(e.code, true)
  }

  private readonly onKeyUp = (e: KeyboardEvent) => {
    if (this.captured.has(e.code) && !isTextInput(e.target)) e.preventDefault()
    if (this.state.release(e.code)) this.emit(e.code, false)
  }

  private readonly releaseAll = () => {
    for (const code of this.state.releaseAll()) this.emit(code, false)
    this.padCodes.clear()
  }

  private readonly startGamepads = () => {
    if (this.padFrame) return
    const poll = () => {
      const pads = navigator.getGamepads?.() ?? []
      const now = new Set<string>()
      let connected = 0
      for (const pad of pads) {
        if (!pad) continue
        connected++
        for (const c of gamepadCodes(pad)) now.add(c)
      }
      const { pressed, released } = diffCodes(this.padCodes, now)
      this.padCodes = now
      const t = performance.now()
      for (const c of released) if (this.state.release(c)) this.emit(c, false)
      for (const c of pressed) if (this.state.press(c, t)) this.emit(c, true)
      this.padFrame = connected ? requestAnimationFrame(poll) : 0
    }
    this.padFrame = requestAnimationFrame(poll)
  }
}

function isTextInput(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
  )
}

export const keyboard = new Keyboard()
