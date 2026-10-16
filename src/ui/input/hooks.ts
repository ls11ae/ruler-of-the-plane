import { useEffect, useRef, useSyncExternalStore } from 'react'
import { DEFAULT_GESTURE, GestureTracker, type GestureOptions } from './gesture'
import { keyboard } from './keyboard'
import { KeyRepeater, type RepeatOptions } from './keyState'

const subscribeHeld = (onChange: () => void) => keyboard.subscribe(onChange)
const heldKeys = () => keyboard.held()
const noKeys: string[] = []

/** Codes currently held (keyboard and gamepads), re-rendering on every press and release. */
export function useHeldKeys(): string[] {
  return useSyncExternalStore(subscribeHeld, heldKeys, () => noKeys)
}

/** Keeps the browser from scrolling or clicking on these keys while the component is mounted. */
export function useKeyCapture(codes: readonly string[], active = true): void {
  const key = codes.join(' ')
  useEffect(() => {
    if (!active) return
    return keyboard.capture(key.split(' ').filter(Boolean))
  }, [key, active])
}

/** Calls the handler on every press (and release, with `down: false`) of any key. */
export function useKeyListener(
  handler: (change: { code: string; down: boolean }) => void,
  active = true,
): void {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    if (!active) return
    return keyboard.subscribe((change) => ref.current(change))
  }, [active])
}

/** Runs the callback on every animation frame with the time (ms) and the time since the last frame. */
export function useAnimationFrame(callback: (now: number, dt: number) => void, active = true): void {
  const ref = useRef(callback)
  useEffect(() => {
    ref.current = callback
  })
  useEffect(() => {
    if (!active) return
    let last = performance.now()
    let frame = requestAnimationFrame(function loop(now) {
      ref.current(now, now - last)
      last = now
      frame = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(frame)
  }, [active])
}

/**
 * Fixed-rate repeat: while one of `codes` is held, `onStep(code)` is called on the press and then at a
 * fixed rate (independent of the operating system's key repeat).
 */
export function useKeyRepeat(
  codes: readonly string[],
  onStep: (code: string) => void,
  options: RepeatOptions,
  active = true,
): void {
  const repeater = useRef<KeyRepeater | null>(null)
  const { delay, interval, maxPerUpdate } = options
  useEffect(() => {
    repeater.current = new KeyRepeater({ delay, interval, maxPerUpdate })
  }, [delay, interval, maxPerUpdate])
  useKeyCapture(codes, active)
  useAnimationFrame((now) => {
    for (const code of repeater.current?.update(keyboard.state, codes, now) ?? []) onStep(code)
  }, active)
}

export interface PointerGestureHandlers {
  onTap?: (e: React.PointerEvent) => void
  onDragStart?: (e: React.PointerEvent) => void
  onDragMove?: (e: React.PointerEvent) => void
  onDragEnd?: (e: React.PointerEvent) => void
  onLongPress?: () => void
  /** Called on every press, before the gesture is known (e.g. to pick up a token at once). */
  onPress?: (e: React.PointerEvent) => void
}

/**
 * Pointer Events for mouse, touchpad, pen and touch: returns props for an element that report taps,
 * drags (with pointer capture) and long presses. Only the primary button and the first touch count.
 */
export function usePointerGesture(
  handlers: PointerGestureHandlers,
  options: GestureOptions = DEFAULT_GESTURE,
) {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  })
  const tracker = useRef<{ id: number; gesture: GestureTracker; timer: number } | null>(null)

  const finish = () => {
    if (tracker.current) window.clearTimeout(tracker.current.timer)
    tracker.current = null
  }
  useEffect(() => finish, [])

  const cancel = (e: React.PointerEvent) => {
    const t = tracker.current
    if (!t || t.id !== e.pointerId) return
    const wasDrag = t.gesture.kind === 'drag'
    finish()
    if (wasDrag) ref.current.onDragEnd?.(e)
  }

  return {
    onPointerDown(e: React.PointerEvent) {
      if (tracker.current || (e.pointerType === 'mouse' && e.button !== 0)) return
      e.currentTarget.setPointerCapture?.(e.pointerId)
      const gesture = new GestureTracker(e.clientX, e.clientY, e.timeStamp, options)
      const timer = window.setTimeout(() => {
        if (tracker.current?.gesture.tick(e.timeStamp + options.longPressMs)) ref.current.onLongPress?.()
      }, options.longPressMs)
      tracker.current = { id: e.pointerId, gesture, timer }
      ref.current.onPress?.(e)
    },
    onPointerMove(e: React.PointerEvent) {
      const t = tracker.current
      if (!t || t.id !== e.pointerId) return
      if (t.gesture.move(e.clientX, e.clientY, e.timeStamp)) {
        window.clearTimeout(t.timer)
        ref.current.onDragStart?.(e)
      }
      if (t.gesture.kind === 'drag') ref.current.onDragMove?.(e)
    },
    onPointerUp(e: React.PointerEvent) {
      const t = tracker.current
      if (!t || t.id !== e.pointerId) return
      const kind = t.gesture.end(e.timeStamp)
      finish()
      if (kind === 'tap') ref.current.onTap?.(e)
      else if (kind === 'drag') ref.current.onDragEnd?.(e)
    },
    onPointerCancel: cancel,
    // Capture can be lost without pointerup (e.g. the element re-rendered away); never stay stuck.
    onLostPointerCapture: cancel,
  }
}
