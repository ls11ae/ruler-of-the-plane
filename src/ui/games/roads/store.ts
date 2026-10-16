import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RoadsLevelId } from '../../../core/games/roads/levels'
import { persistStorage } from '../../shell/storage'
import { useUi } from '../../shell/ui'

interface RoadsProgress {
  /** Index into the fixed maps; their count means random villages. */
  level: number
  /** How many random maps were played (they grow). */
  round: number
  stars: Partial<Record<RoadsLevelId, number>>
  seenHowTo: boolean
  setLevel(level: number): void
  nextRound(): void
  recordWin(level: RoadsLevelId, stars: number): void
  setSeenHowTo(): void
  reset(): void
}

const initial = { level: 0, round: 0, stars: {}, seenHowTo: false }

/** Progress on this device: current map, stars per map, whether "So geht's" was shown. */
export const useProgress = create<RoadsProgress>()(
  persist(
    (set) => ({
      ...initial,
      setLevel: (level) => set({ level }),
      nextRound: () => set((s) => ({ round: s.round + 1 })),
      recordWin: (level, stars) =>
        set((s) => ({ stars: { ...s.stars, [level]: Math.max(stars, s.stars[level] ?? 0) } })),
      setSeenHowTo: () => set({ seenHowTo: true }),
      reset: () => set(initial),
    }),
    {
      name: 'rotp-roads',
      version: 1,
      storage: persistStorage,
      partialize: ({ level, round, stars, seenHowTo }) => ({ level, round, stars, seenHowTo }),
    },
  ),
)

// The kiosk timeout hands the booth to the next visitor: start again from the first map.
useUi.subscribe((s, prev) => {
  if (s.attract && !prev.attract) useProgress.getState().reset()
})
