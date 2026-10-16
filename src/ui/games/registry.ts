import type { ComponentType } from 'react'

/** The games on the start map, in map order. Each lives in `src/ui/games/<id>/` and `src/core/games/<id>/`. */
export const GAME_IDS = ['art-gallery', 'voronoi', 'frechet', 'lawn-mowing', 'roads'] as const
export type GameId = (typeof GAME_IDS)[number]

export function isGameId(id: string): id is GameId {
  return (GAME_IDS as readonly string[]).includes(id)
}

/**
 * A game is a folder `src/ui/games/<id>/` whose `index.tsx` default-exports the game screen. Games are
 * discovered at build time, so adding a game touches no shared file, and each is a separate chunk.
 */
export type GameModule = { default: ComponentType }

const modules = import.meta.glob<GameModule>('./*/index.tsx')

const loaders = new Map<string, () => Promise<GameModule>>(
  Object.entries(modules).map(([path, load]) => [path.split('/')[1]!, load]),
)

/** Whether the game has been built (its folder exists). */
export function isImplemented(id: GameId): boolean {
  return loaders.has(id)
}

export function gameLoader(id: GameId): (() => Promise<GameModule>) | undefined {
  return loaders.get(id)
}

/**
 * Optionally, `src/ui/games/<id>/attract.tsx` default-exports a demo the attract screen of the kiosk mode
 * plays behind its text (e.g. the computer playing against itself). Discovered like the games.
 */
const attractModules = import.meta.glob<GameModule>('./*/attract.tsx')

const attractLoaders = new Map<string, () => Promise<GameModule>>(
  Object.entries(attractModules).map(([path, load]) => [path.split('/')[1]!, load]),
)

export function attractLoader(id: GameId): (() => Promise<GameModule>) | undefined {
  return attractLoaders.get(id)
}
