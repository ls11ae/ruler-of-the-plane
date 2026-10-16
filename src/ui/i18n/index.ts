import { useSettings } from '../shell/settings'
import { de, type ShellTexts } from './de'
import { en } from './en'

export type Language = 'de' | 'en'
export const LANGUAGES: readonly Language[] = ['de', 'en']

const shell: Record<Language, ShellTexts> = { de, en }

/** The shared texts in the current language. */
export function useT(): ShellTexts {
  return shell[useSettings((s) => s.language)]
}

/** Picks a game's dictionary for the current language: `useLocalized({ de: gameDe, en: gameEn })`. */
export function useLocalized<T>(dictionaries: Record<Language, T>): T {
  return dictionaries[useSettings((s) => s.language)]
}

export function useLanguage(): Language {
  return useSettings((s) => s.language)
}

export type { ShellTexts }
