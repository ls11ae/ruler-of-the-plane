import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WoodsId } from '../../../../core/games/frechet/woods/shapes'
import { persistStorage } from '../../../shell/storage'
import { useUi } from '../../../shell/ui'
import type { WalkBest } from '../store'

interface WoodsProgress {
  best: Partial<Record<WoodsId, WalkBest>>
  seenHowTo: boolean
  recordWin(walk: WoodsId, longest: number, stars: number): void
  setSeenHowTo(): void
  reset(): void
}

const initial = { best: {}, seenHowTo: false }

/** Progress in the woods on this device: best result per walk, whether the woods' "So geht's" was shown. */
export const useWoodsProgress = create<WoodsProgress>()(
  persist(
    (set) => ({
      ...initial,
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
      name: 'rotp-frechet-woods',
      version: 1,
      storage: persistStorage,
      partialize: ({ best, seenHowTo }) => ({ best, seenHowTo }),
    },
  ),
)

// The kiosk timeout hands the booth to the next visitor.
useUi.subscribe((s, prev) => {
  if (s.attract && !prev.attract) useWoodsProgress.getState().reset()
})
