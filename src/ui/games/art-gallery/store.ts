import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MAIN_LEVELS, type LevelName } from '../../../core/games/art-gallery/rules'
import { useUi } from '../../shell/ui'
import { persistStorage } from '../../shell/storage'

export interface LevelBest {
  torches: number
  stars: number
}

interface ArtGalleryProgress {
  level: LevelName
  best: Partial<Record<LevelName, LevelBest>>
  seenHowTo: boolean
  setLevel(level: LevelName): void
  recordWin(level: LevelName, torches: number, stars: number): void
  setSeenHowTo(): void
  reset(): void
}

const initial = { level: MAIN_LEVELS[0] as LevelName, best: {}, seenHowTo: false }

/** Progress on this device: current level, best result per level, whether "So geht's" was shown. */
export const useProgress = create<ArtGalleryProgress>()(
  persist(
    (set) => ({
      ...initial,
      setLevel: (level) => set({ level }),
      recordWin: (level, torches, stars) =>
        set((s) => {
          const old = s.best[level]
          const best =
            !old || torches < old.torches ? { torches, stars: Math.max(stars, old?.stars ?? 0) } : old
          return { best: { ...s.best, [level]: best } }
        }),
      setSeenHowTo: () => set({ seenHowTo: true }),
      reset: () => set(initial),
    }),
    {
      name: 'rotp-art-gallery',
      version: 1,
      storage: persistStorage,
      partialize: ({ level, best, seenHowTo }) => ({ level, best, seenHowTo }),
    },
  ),
)

// The kiosk timeout hands the booth to the next visitor: start again from the first dungeon.
useUi.subscribe((s, prev) => {
  if (s.attract && !prev.attract) useProgress.getState().reset()
})
