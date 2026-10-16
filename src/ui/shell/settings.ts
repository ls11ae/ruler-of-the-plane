import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GameId } from '../games/registry'
import type { Language } from '../i18n'
import { persistStorage } from './storage'

export type Difficulty = 'easy' | 'normal' | 'hard'

export interface Settings {
  language: Language
  /** Booth mode: idle timeout to the attract screen. Off on the public site unless `?kiosk` is given. */
  kiosk: boolean
  /** Games the staff switched off for the booth. */
  disabledGames: GameId[]
  /** Default difficulty for games with a computer opponent. */
  difficulty: Difficulty
  setLanguage(language: Language): void
  setKiosk(kiosk: boolean): void
  setGameEnabled(id: GameId, enabled: boolean): void
  setDifficulty(difficulty: Difficulty): void
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      language: 'de',
      kiosk: false,
      disabledGames: [],
      difficulty: 'normal',
      setLanguage: (language) => set({ language }),
      setKiosk: (kiosk) => set({ kiosk }),
      setGameEnabled: (id, enabled) =>
        set((s) => ({
          disabledGames: enabled
            ? s.disabledGames.filter((g) => g !== id)
            : [...new Set([...s.disabledGames, id])],
        })),
      setDifficulty: (difficulty) => set({ difficulty }),
    }),
    {
      name: 'rotp-settings',
      version: 1,
      storage: persistStorage,
      partialize: ({ language, kiosk, disabledGames, difficulty }) => ({
        language,
        kiosk,
        disabledGames,
        difficulty,
      }),
    },
  ),
)

/** `?kiosk` (or `?kiosk=1`) switches kiosk mode on and keeps it on; `?kiosk=0` switches it off. */
export function applyKioskParameter(search: string): void {
  const value = new URLSearchParams(search).get('kiosk')
  if (value === null) return
  useSettings.getState().setKiosk(value !== '0' && value !== 'false')
}
