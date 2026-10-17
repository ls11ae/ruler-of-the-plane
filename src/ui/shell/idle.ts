import { useEffect, useRef } from 'react'

/** Booth timeout: after this long without input, kiosk mode returns to the attract screen. */
export const KIOSK_IDLE_MS = 90_000

const ACTIVITY = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const

/** The running idle timers; input they cannot hear themselves (inside a frame) is reported to them. */
const timers = new Set<() => void>()

/** Counts as input for every idle timer (e.g. input inside a frame, which the window does not see). */
export function reportActivity(): void {
  for (const poke of timers) poke()
}

/**
 * Lets input inside a frame reset the idle timers; call it on every load of the frame and call the
 * returned function before the next one. A same-origin frame is watched like the window. A cross-origin
 * frame cannot be: then only focus moving into it counts.
 */
export function watchFrame(frame: HTMLIFrameElement): () => void {
  let inner: Window | null
  try {
    inner = frame.contentWindow
    // Throws for a cross-origin frame.
    void inner?.document.body
  } catch {
    inner = null
  }
  if (inner) {
    const win = inner
    for (const type of ACTIVITY) win.addEventListener(type, reportActivity, { capture: true, passive: true })
    return () => {
      for (const type of ACTIVITY) win.removeEventListener(type, reportActivity, { capture: true })
    }
  }
  const onBlur = () => {
    if (document.activeElement === frame) reportActivity()
  }
  window.addEventListener('blur', onBlur)
  return () => window.removeEventListener('blur', onBlur)
}

/**
 * Calls `onIdle` once after `timeoutMs` without pointer, touch or key input, then again only after new
 * input and another full timeout.
 */
export function useIdle(timeoutMs: number, onIdle: () => void, active: boolean): void {
  const callback = useRef(onIdle)
  useEffect(() => {
    callback.current = onIdle
  })
  useEffect(() => {
    if (!active) return
    let last = performance.now()
    let fired = false
    const poke = () => {
      last = performance.now()
      fired = false
    }
    for (const type of ACTIVITY) window.addEventListener(type, poke, { capture: true, passive: true })
    timers.add(poke)
    const timer = window.setInterval(() => {
      if (!fired && performance.now() - last >= timeoutMs) {
        fired = true
        callback.current()
      }
    }, 1000)
    return () => {
      for (const type of ACTIVITY) window.removeEventListener(type, poke, { capture: true })
      timers.delete(poke)
      window.clearInterval(timer)
    }
  }, [timeoutMs, active])
}
