import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { LAWNS, type LawnId } from '../../../core/games/lawn-mowing/rules'
import { persistStorage } from '../../shell/storage'
import { useUi } from '../../shell/ui'

export interface Setup {
  lawn: LawnId
  cutters: 1 | 2
}

interface LawnPrefs extends Setup {
  seenHowTo: boolean
  /** Whether a round was started here (the tier screen then offers "Weiterspielen"). */
  played: boolean
  /** Best stars per lawn and number of mowers, keyed `<lawn>/<mowers>`. */
  stars: Partial<Record<string, number>>
  setSetup(setup: Setup): void
  setSeenHowTo(): void
  recordStars(lawn: LawnId, cutters: 1 | 2, stars: number): void
  reset(): void
}

const initial: Setup & Pick<LawnPrefs, 'seenHowTo' | 'played' | 'stars'> = {
  lawn: LAWNS[0],
  cutters: 1,
  seenHowTo: false,
  played: false,
  stars: {},
}

export const starsKey = (lawn: LawnId, cutters: 1 | 2) => `${lawn}/${cutters}`

/** The last setup on this device, the best stars per lawn, whether "So geht's" was shown. */
export const usePrefs = create<LawnPrefs>()(
  persist(
    (set) => ({
      ...initial,
      setSetup: (setup) => set({ ...setup, played: true }),
      setSeenHowTo: () => set({ seenHowTo: true }),
      recordStars: (lawn, cutters, stars) =>
        set((s) => {
          const key = starsKey(lawn, cutters)
          return { stars: { ...s.stars, [key]: Math.max(stars, s.stars[key] ?? 0) } }
        }),
      reset: () => set(initial),
    }),
    {
      name: 'rotp-lawn-mowing',
      version: 1,
      storage: persistStorage,
      partialize: ({ lawn, cutters, seenHowTo, played, stars }) => ({
        lawn,
        cutters,
        seenHowTo,
        played,
        stars,
      }),
    },
  ),
)

// The kiosk timeout hands the booth to the next visitor: start again with the defaults.
useUi.subscribe((s, prev) => {
  if (s.attract && !prev.attract) usePrefs.getState().reset()
})
