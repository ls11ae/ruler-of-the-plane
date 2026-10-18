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
  /** Strength of the computer (the tier); null: the tier the tier screen suggests. */
  aiLevel: AiLevel | null
  castles: CastleCount
}

interface VoronoiPrefs extends Setup {
  seenHowTo: boolean
  /** Whether a game was started here (the tier screen then offers "Weiterspielen"). */
  played: boolean
  /** Maps won against the computer, keyed `<map>/<strength>` (a star each on the tier screen). */
  wins: Partial<Record<string, true>>
  setSetup(setup: Setup): void
  setSeenHowTo(): void
  recordWin(map: MapId, level: AiLevel): void
  reset(): void
}

const initial: Setup & Pick<VoronoiPrefs, 'seenHowTo' | 'played' | 'wins'> = {
  map: MAPS[0],
  opponent: 'computer',
  aiLevel: null,
  castles: 10,
  seenHowTo: false,
  played: false,
  wins: {},
}

export const winKey = (map: MapId, level: AiLevel) => `${map}/${level}`

/** The last game's setup on this device, the maps won per strength, whether "So geht's" was shown. */
export const usePrefs = create<VoronoiPrefs>()(
  persist(
    (set) => ({
      ...initial,
      setSetup: (setup) => set({ ...setup, played: true }),
      setSeenHowTo: () => set({ seenHowTo: true }),
      recordWin: (map, level) => set((s) => ({ wins: { ...s.wins, [winKey(map, level)]: true } })),
      reset: () => set(initial),
    }),
    {
      name: 'rotp-voronoi',
      version: 1,
      storage: persistStorage,
      partialize: ({ map, opponent, aiLevel, castles, seenHowTo, played, wins }) => ({
        map,
        opponent,
        aiLevel,
        castles,
        seenHowTo,
        played,
        wins,
      }),
    },
  ),
)

// The kiosk timeout hands the booth to the next visitor: start again with the defaults.
useUi.subscribe((s, prev) => {
  if (s.attract && !prev.attract) usePrefs.getState().reset()
})
