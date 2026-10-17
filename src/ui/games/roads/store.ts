import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RoadsLevelId, RoadsSet } from '../../../core/games/roads/levels'
import { persistStorage } from '../../shell/storage'
import { useUi } from '../../shell/ui'

interface RoadsProgress {
  /** Index into the fixed maps (all sets in order); their count means random villages. */
  level: number
  /** How many random maps were played (they grow). */
  round: number
  stars: Partial<Record<RoadsLevelId, number>>
  /** Whether "So geht's" was shown, per set (the rules change from set to set). */
  seenHowTo: Partial<Record<RoadsSet, boolean>>
  setLevel(level: number): void
  nextRound(): void
  recordWin(level: RoadsLevelId, stars: number): void
  setSeenHowTo(set: RoadsSet): void
  reset(): void
}

const initial = { level: 0, round: 0, stars: {}, seenHowTo: {} }

/** Progress on this device: current map, stars per map, whether "So geht's" was shown. */
export const useProgress = create<RoadsProgress>()(
  persist(
    (set) => ({
      ...initial,
      setLevel: (level) => set({ level }),
      nextRound: () => set((s) => ({ round: s.round + 1 })),
      recordWin: (level, stars) =>
        set((s) => ({ stars: { ...s.stars, [level]: Math.max(stars, s.stars[level] ?? 0) } })),
      setSeenHowTo: (key) => set((s) => ({ seenHowTo: { ...s.seenHowTo, [key]: true } })),
      reset: () => set(initial),
    }),
    {
      name: 'rotp-roads',
      version: 2,
      storage: persistStorage,
      partialize: ({ level, round, stars, seenHowTo }) => ({ level, round, stars, seenHowTo }),
      // Version 1 had one "So geht's" flag, and random villages right after the eight maps of the first set:
      // whoever was there continues with the first map of "Kreuzungen" (the same index now).
      migrate: (persisted, version) => {
        const old = persisted as Omit<Partial<RoadsProgress>, 'seenHowTo'> & { seenHowTo?: unknown }
        if (version >= 2) return old as RoadsProgress
        return { ...old, seenHowTo: old.seenHowTo === true ? { mst: true } : {} } as RoadsProgress
      },
    },
  ),
)

// The kiosk timeout hands the booth to the next visitor: start again from the first map.
useUi.subscribe((s, prev) => {
  if (s.attract && !prev.attract) useProgress.getState().reset()
})
