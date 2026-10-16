import { useEffect, useRef } from 'react'

/** Booth timeout: after this long without input, kiosk mode returns to the attract screen. */
export const KIOSK_IDLE_MS = 90_000

const ACTIVITY = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const

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
    const timer = window.setInterval(() => {
      if (!fired && performance.now() - last >= timeoutMs) {
        fired = true
        callback.current()
      }
    }, 1000)
    return () => {
      for (const type of ACTIVITY) window.removeEventListener(type, poke, { capture: true })
      window.clearInterval(timer)
    }
  }, [timeoutMs, active])
}
