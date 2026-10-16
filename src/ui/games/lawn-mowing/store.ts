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
  setSetup(setup: Setup): void
  setSeenHowTo(): void
  reset(): void
}

const initial: Setup & { seenHowTo: boolean } = { lawn: LAWNS[0], cutters: 1, seenHowTo: false }

/** The last setup on this device and whether "So geht's" was shown. */
export const usePrefs = create<LawnPrefs>()(
  persist(
    (set) => ({
      ...initial,
      setSetup: (setup) => set(setup),
      setSeenHowTo: () => set({ seenHowTo: true }),
      reset: () => set(initial),
    }),
    {
      name: 'rotp-lawn-mowing',
      version: 1,
      storage: persistStorage,
      partialize: ({ lawn, cutters, seenHowTo }) => ({ lawn, cutters, seenHowTo }),
    },
  ),
)

// The kiosk timeout hands the booth to the next visitor: start again with the defaults.
useUi.subscribe((s, prev) => {
  if (s.attract && !prev.attract) usePrefs.getState().reset()
})
