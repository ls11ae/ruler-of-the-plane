import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AiLevel } from '../../../core/games/voronoi/ai'
import type { CastleCount } from '../../../core/games/voronoi/rules'
import { persistStorage } from '../../shell/storage'
import { useUi } from '../../shell/ui'

/** The maps in the order of the game (ids below `public/levels/`). */
export const MAPS = [
  'voronoi/map1-island',
  'voronoi/map2-river-valley',
  'voronoi/map3-lake-district',
] as const
export type MapId = (typeof MAPS)[number]

export type Opponent = 'computer' | 'friends'

export interface Setup {
  map: MapId
  opponent: Opponent
  /** Strength of the computer; null: the staff's difficulty setting. */
  aiLevel: AiLevel | null
  castles: CastleCount
}

interface VoronoiPrefs extends Setup {
  seenHowTo: boolean
  setSetup(setup: Setup): void
  setSeenHowTo(): void
  reset(): void
}

const initial: Setup & { seenHowTo: boolean } = {
  map: MAPS[0],
  opponent: 'computer',
  aiLevel: null,
  castles: 10,
  seenHowTo: false,
}

/** The last game's setup on this device and whether "So geht's" was shown. */
export const usePrefs = create<VoronoiPrefs>()(
  persist(
    (set) => ({
      ...initial,
      setSetup: (setup) => set(setup),
      setSeenHowTo: () => set({ seenHowTo: true }),
      reset: () => set(initial),
    }),
    {
      name: 'rotp-voronoi',
      version: 1,
      storage: persistStorage,
      partialize: ({ map, opponent, aiLevel, castles, seenHowTo }) => ({
        map,
        opponent,
        aiLevel,
        castles,
        seenHowTo,
      }),
    },
  ),
)

// The kiosk timeout hands the booth to the next visitor: start again with the defaults.
useUi.subscribe((s, prev) => {
  if (s.attract && !prev.attract) usePrefs.getState().reset()
})
