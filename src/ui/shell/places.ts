import { GAME_IDS, isImplemented, type GameId } from '../games/registry'
import { useSettings } from './settings'

export const OLD_VERSION_URL = 'https://kbuchin.github.io/ruler/'

/**
 * The tsp-boards gallery for "Rundreise" (build variable `VITE_TSP_BOARDS_URL`, absolute or relative to
 * this page); empty hides the place. Read at call time, so tests can stub it.
 */
export function tspBoardsUrl(): string {
  return import.meta.env.VITE_TSP_BOARDS_URL?.trim() ?? ''
}

/** tsp-boards in its event mode (`#kiosk`: a start screen with three levels, no links out). */
export function tspBoardsKioskUrl(url: string): string {
  return `${url.replace(/#.*$/, '')}#kiosk`
}

/** open: playable; closed: switched off in the staff menu; soon: not built yet. */
export type GameState = 'open' | 'closed' | 'soon'

export function useGameStates(): Record<GameId, GameState> {
  const disabled = useSettings((s) => s.disabledGames)
  return Object.fromEntries(
    GAME_IDS.map((id) => [id, !isImplemented(id) ? 'soon' : disabled.includes(id) ? 'closed' : 'open']),
  ) as Record<GameId, GameState>
}
