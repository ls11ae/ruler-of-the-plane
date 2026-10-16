import { createContext, useContext } from 'react'

export interface BoardApi {
  /** Screen position (e.g. `event.clientX/Y`) → board coordinates. */
  toBoard(clientX: number, clientY: number): [number, number]
  /** Screen pixels → board units at the current zoom (e.g. for hit targets of at least 44 px). */
  pxToBoard(px: number): number
  /** Screen pixels per board unit. */
  scale: number
  /**
   * The hand-drawn ink filter for this board, scaled to its zoom (the global `#ink` filter assumes
   * that one unit is about one pixel): use as `filter={board.ink}`.
   */
  ink: string
}

export const BoardContext = createContext<BoardApi | null>(null)

/** The board under the current component (throws outside a {@link Board}). */
export function useBoard(): BoardApi {
  const api = useContext(BoardContext)
  if (!api) throw new Error('useBoard() outside <Board>')
  return api
}
