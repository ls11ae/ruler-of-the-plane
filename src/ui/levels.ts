import { useEffect, useState } from 'react'
import type { Level, LevelIndex } from '../core/levels/schema'

/** URL of a file in `public/levels/` (respects Vite's `base`, e.g. on GitHub Pages). */
export function levelUrl(path: string): string {
  return `${import.meta.env.BASE_URL}levels/${path}`
}

const cache = new Map<string, Promise<unknown>>()

function fetchJson<T>(path: string): Promise<T> {
  let request = cache.get(path)
  if (!request) {
    request = fetch(levelUrl(path)).then((r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`)
      return r.json()
    })
    request.catch(() => cache.delete(path))
    cache.set(path, request)
  }
  return request as Promise<T>
}

export const loadLevelIndex = () => fetchJson<LevelIndex>('index.json')

/** Loads a level by id, e.g. `art-gallery/agLevel4_8`. */
export const loadLevel = <T extends Level = Level>(id: string) => fetchJson<T>(`${id}.json`)

export type Loadable<T> =
  { status: 'loading' } | { status: 'ready'; value: T } | { status: 'error'; error: string }

/** Loads a level; re-renders when it arrives. */
export function useLevel<T extends Level = Level>(id: string): Loadable<T> {
  const [state, setState] = useState<{ id: string; result: Loadable<T> }>({
    id,
    result: { status: 'loading' },
  })
  useEffect(() => {
    let live = true
    loadLevel<T>(id).then(
      (value) => live && setState({ id, result: { status: 'ready', value } }),
      (e: unknown) => live && setState({ id, result: { status: 'error', error: String(e) } }),
    )
    return () => {
      live = false
    }
  }, [id])
  return state.id === id ? state.result : { status: 'loading' }
}
