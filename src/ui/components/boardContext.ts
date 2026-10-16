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
  /** 90 if the board is shown turned by 90° (portrait screen, wide board; see `autoRotate`), else 0. */
  rotation: 0 | 90
  /**
   * A `transform` that keeps a symbol at (x, y) upright on screen when the board is turned (icons,
   * text); undefined otherwise.
   */
  upright(x: number, y: number): string | undefined
}

export const BoardContext = createContext<BoardApi | null>(null)

/** The board under the current component (throws outside a {@link Board}). */
export function useBoard(): BoardApi {
  const api = useContext(BoardContext)
  if (!api) throw new Error('useBoard() outside <Board>')
  return api
}
