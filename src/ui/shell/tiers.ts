import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Tier } from '../../core/tiers'
import type { GameId } from '../games/registry'
import { useSettings } from './settings'
import { persistStorage } from './storage'
import { useUi } from './ui'

interface TierMemory {
  /** The tier each game was last played in on this device. */
  last: Partial<Record<GameId, Tier>>
  setLast(game: GameId, tier: Tier): void
  reset(): void
}

export const useTierMemory = create<TierMemory>()(
  persist(
    (set) => ({
      last: {},
      setLast: (game, tier) =>
        set((s) => (s.last[game] === tier ? s : { last: { ...s.last, [game]: tier } })),
      reset: () => set({ last: {} }),
    }),
    {
      name: 'rotp-tiers',
      version: 1,
      storage: persistStorage,
      partialize: ({ last }) => ({ last }),
    },
  ),
)

// The kiosk timeout hands the booth to the next visitor: forget the tiers played.
useUi.subscribe((s, prev) => {
  if (s.attract && !prev.attract) useTierMemory.getState().reset()
})

/** The tier a game's tier screen marks: the last one played here, else the staff's default. */
export interface SuggestedTier {
  tier: Tier
  /** Why it is marked; null: nothing known, the screen starts with "Leicht" unmarked. */
  reason: 'last' | 'staff' | null
}

export function suggestedTier(last: Tier | undefined, staff: Tier | undefined): SuggestedTier {
  if (last) return { tier: last, reason: 'last' }
  if (staff) return { tier: staff, reason: 'staff' }
  return { tier: 'easy', reason: null }
}

export function useSuggestedTier(game: GameId): SuggestedTier {
  const last = useTierMemory((s) => s.last[game])
  const staff = useSettings((s) => s.tierDefaults[game])
  return suggestedTier(last, staff)
}
