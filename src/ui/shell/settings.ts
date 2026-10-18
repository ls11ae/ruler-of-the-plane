import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isTier, type Tier } from '../../core/tiers'
import type { GameId } from '../games/registry'
import type { Language } from '../i18n'
import { persistStorage } from './storage'

export interface Settings {
  language: Language
  /** Booth mode: idle timeout to the attract screen. Off on the public site unless `?kiosk` is given. */
  kiosk: boolean
  /** Games the staff switched off for the booth. */
  disabledGames: GameId[]
  /**
   * The tier the staff suggests per game: the tier screen marks it while the device has no last tier
   * for the game (after the kiosk reset, for the next visitor). In "Erobere das Land" it is the
   * computer's strength.
   */
  tierDefaults: Partial<Record<GameId, Tier>>
  setLanguage(language: Language): void
  setKiosk(kiosk: boolean): void
  setGameEnabled(id: GameId, enabled: boolean): void
  /** null: no suggestion (the tier screen starts with "Leicht"). */
  setTierDefault(id: GameId, tier: Tier | null): void
}

type Stored = Pick<Settings, 'language' | 'kiosk' | 'disabledGames' | 'tierDefaults'>

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      language: 'de',
      kiosk: false,
      disabledGames: [],
      tierDefaults: {},
      setLanguage: (language) => set({ language }),
      setKiosk: (kiosk) => set({ kiosk }),
      setGameEnabled: (id, enabled) =>
        set((s) => ({
          disabledGames: enabled
            ? s.disabledGames.filter((g) => g !== id)
            : [...new Set([...s.disabledGames, id])],
        })),
      setTierDefault: (id, tier) =>
        set((s) => {
          const tierDefaults = { ...s.tierDefaults }
          if (tier) tierDefaults[id] = tier
          else delete tierDefaults[id]
          return { tierDefaults }
        }),
    }),
    {
      name: 'rotp-settings',
      version: 2,
      storage: persistStorage,
      partialize: ({ language, kiosk, disabledGames, tierDefaults }): Stored => ({
        language,
        kiosk,
        disabledGames,
        tierDefaults,
      }),
      // Version 1 had one difficulty for the computer opponents ("normal" by default), used only by
      // "Erobere das Land": "easy" or "hard" (changed by the staff) becomes its suggested tier.
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Partial<Stored> & { difficulty?: unknown }
        const { difficulty, ...rest } = old
        if (version >= 2) return { ...rest, tierDefaults: rest.tierDefaults ?? {} } as Stored
        return {
          ...rest,
          tierDefaults: isTier(difficulty) ? { voronoi: difficulty } : {},
        } as Stored
      },
    },
  ),
)

/** `?kiosk` (or `?kiosk=1`) switches kiosk mode on and keeps it on; `?kiosk=0` switches it off. */
export function applyKioskParameter(search: string): void {
  const value = new URLSearchParams(search).get('kiosk')
  if (value === null) return
  useSettings.getState().setKiosk(value !== '0' && value !== 'false')
}
