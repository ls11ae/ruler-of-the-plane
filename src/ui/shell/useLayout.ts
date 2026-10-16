import { useSyncExternalStore } from 'react'

export type Layout = 'landscape' | 'portrait'

const QUERY = '(max-aspect-ratio: 9/10)'

const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

/** Landscape for laptops and tablets on their side, portrait for phones held upright. */
export function useLayout(): Layout {
  return useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(QUERY).matches ? 'portrait' : 'landscape'),
    () => 'landscape',
  )
}
