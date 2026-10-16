import { GAME_IDS, isImplemented, type GameId } from '../games/registry'
import { useSettings } from './settings'

export const OLD_VERSION_URL = 'https://kbuchin.github.io/ruler/'
export const TSP_BOARDS_URL = import.meta.env.VITE_TSP_BOARDS_URL?.trim() ?? ''

/** open: playable; closed: switched off in the staff menu; soon: not built yet. */
export type GameState = 'open' | 'closed' | 'soon'

export function useGameStates(): Record<GameId, GameState> {
  const disabled = useSettings((s) => s.disabledGames)
  return Object.fromEntries(
    GAME_IDS.map((id) => [id, !isImplemented(id) ? 'soon' : disabled.includes(id) ? 'closed' : 'open']),
  ) as Record<GameId, GameState>
}
