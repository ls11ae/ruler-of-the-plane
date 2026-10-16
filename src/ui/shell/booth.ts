import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  addEntry,
  dayKey,
  recordVersus,
  todaysBoard,
  todaysVersus,
  type BoardSpec,
  type LeaderboardEntry,
  type VersusTally,
} from '../../core/leaderboard'
import { persistStorage } from './storage'

/**
 * Booth data on this device: daily leaderboards (keyed by game and level, e.g. `art-gallery/agLevel4_8`)
 * and the "Mensch gegen Maschine" tally.
 */
interface BoothState {
  boards: Record<string, LeaderboardEntry[]>
  versus?: VersusTally
  /** Adds today's entry; returns its rank (null if it did not make the board) and its time stamp. */
  addScore(board: string, spec: BoardSpec, name: string, score: number): { rank: number | null; at: number }
  recordVersus(winner: 'human' | 'machine'): void
  resetBoards(): void
  resetVersus(): void
}

export const today = () => dayKey(new Date())

export const useBooth = create<BoothState>()(
  persist(
    (set, get) => ({
      boards: {},
      addScore(board, spec, name, score) {
        const entry: LeaderboardEntry = { name, score, day: today(), at: Date.now() }
        const { entries, rank } = addEntry(get().boards[board] ?? [], spec, entry)
        set((s) => ({ boards: { ...s.boards, [board]: entries } }))
        return { rank, at: entry.at }
      },
      recordVersus(winner) {
        set((s) => ({ versus: recordVersus(s.versus, winner, today()) }))
      },
      resetBoards: () => set({ boards: {} }),
      resetVersus: () => set({ versus: undefined }),
    }),
    {
      name: 'rotp-booth',
      version: 1,
      storage: persistStorage,
      partialize: ({ boards, versus }) => ({ boards, versus }),
    },
  ),
)

export function useBoard(board: string, spec: BoardSpec): LeaderboardEntry[] {
  const entries = useBooth((s) => s.boards[board])
  return todaysBoard(entries ?? [], spec, today())
}

export function useVersus(): VersusTally {
  return todaysVersus(
    useBooth((s) => s.versus),
    today(),
  )
}
