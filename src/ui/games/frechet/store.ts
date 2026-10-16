import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { WALK_IDS, type WalkId } from '../../../core/games/frechet/levels'
import { persistStorage } from '../../shell/storage'
import { useUi } from '../../shell/ui'

export interface WalkBest {
  /** Longest leash the walk needed, in metres (lower is better). */
  longest: number
  stars: number
}

interface FrechetProgress {
  walk: WalkId
  best: Partial<Record<WalkId, WalkBest>>
  seenHowTo: boolean
  setWalk(walk: WalkId): void
  recordWin(walk: WalkId, longest: number, stars: number): void
  setSeenHowTo(): void
  reset(): void
}

const initial = { walk: WALK_IDS[0] as WalkId, best: {}, seenHowTo: false }

/** Progress on this device: current walk, best result per walk, whether "So geht's" was shown. */
export const useProgress = create<FrechetProgress>()(
  persist(
    (set) => ({
      ...initial,
      setWalk: (walk) => set({ walk }),
      recordWin: (walk, longest, stars) =>
        set((s) => {
          const old = s.best[walk]
          const best =
            !old || longest < old.longest ? { longest, stars: Math.max(stars, old?.stars ?? 0) } : old
          return { best: { ...s.best, [walk]: best } }
        }),
      setSeenHowTo: () => set({ seenHowTo: true }),
      reset: () => set(initial),
    }),
    {
      name: 'rotp-frechet',
      version: 1,
      storage: persistStorage,
      partialize: ({ walk, best, seenHowTo }) => ({ walk, best, seenHowTo }),
    },
  ),
)

// The kiosk timeout hands the booth to the next visitor: start again from the first walk.
useUi.subscribe((s, prev) => {
  if (s.attract && !prev.attract) useProgress.getState().reset()
})
