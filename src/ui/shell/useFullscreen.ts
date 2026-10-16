import { useCallback, useSyncExternalStore } from 'react'

const subscribe = (onChange: () => void) => {
  document.addEventListener('fullscreenchange', onChange)
  return () => document.removeEventListener('fullscreenchange', onChange)
}

/** Fullscreen via the Fullscreen API; `supported` is false where it does not exist (e.g. iPhone Safari). */
export function useFullscreen() {
  const active = useSyncExternalStore(
    subscribe,
    () => document.fullscreenElement !== null,
    () => false,
  )
  const supported = typeof document !== 'undefined' && document.fullscreenEnabled === true
  const toggle = useCallback(() => {
    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    request.catch(() => {
      // Refused (no user gesture, or not allowed): nothing to do.
    })
  }, [])
  return { supported, active, toggle }
}
