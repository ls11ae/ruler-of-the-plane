import { useSyncExternalStore } from 'react'
import { isGameId, type GameId } from '../games/registry'

/**
 * Hash routes (work on GitHub Pages and from a local build without server rewrites):
 * `#/` start map, `#/play/<game>` a game, `#/tsp` tsp-boards in a frame (kiosk mode), `#/demo` the shared
 * UI components.
 */
export type Route =
  | { name: 'start' }
  | { name: 'game'; game: GameId }
  | { name: 'tsp' }
  | { name: 'demo' }
  | { name: 'unknown' }

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/'
  if (path === '/' || path === '') return { name: 'start' }
  if (path === '/demo') return { name: 'demo' }
  if (path === '/tsp') return { name: 'tsp' }
  const game = /^\/play\/([\w-]+)$/.exec(path)?.[1]
  if (game && isGameId(game)) return { name: 'game', game }
  return { name: 'unknown' }
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'game':
      return `#/play/${route.game}`
    case 'tsp':
      return '#/tsp'
    case 'demo':
      return '#/demo'
    default:
      return '#/'
  }
}

export function navigate(route: Route): void {
  const href = hrefFor(route)
  if (window.location.hash !== href) window.location.hash = href
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  )
  return parseRoute(hash)
}
