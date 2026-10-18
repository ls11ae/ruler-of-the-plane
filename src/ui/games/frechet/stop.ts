import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WoodsId } from '../../../core/games/frechet/woods/shapes'
import { persistStorage } from '../../shell/storage'
import { useUi } from '../../shell/ui'

interface StopState {
  /** The walk in the woods being played, or null in the park (whose walk `store.ts` keeps). */
  woods: WoodsId | null
  setWoods(woods: WoodsId | null): void
  reset(): void
}

/** Where the player is, so "Weiterspielen" on the tier screen also returns into the woods. */
export const useStop = create<StopState>()(
  persist(
    (set) => ({
      woods: null,
      setWoods: (woods) => set({ woods }),
      reset: () => set({ woods: null }),
    }),
    {
      name: 'rotp-frechet-stop',
      version: 1,
      storage: persistStorage,
      partialize: ({ woods }) => ({ woods }),
    },
  ),
)

// The kiosk timeout hands the booth to the next visitor: back to the park.
useUi.subscribe((s, prev) => {
  if (s.attract && !prev.attract) useStop.getState().reset()
})
