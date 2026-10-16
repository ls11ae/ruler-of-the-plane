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
import { useUi } from './ui'

/** The nickname (and lucky number) a player chose last, offered first the next time. */
export interface Signature {
  name: string
  number?: number
}

/**
 * Booth data on this device: daily leaderboards (keyed by game and level, e.g. `art-gallery/agLevel4_8`)
 * and the "Mensch gegen Maschine" tally.
 */
interface BoothState {
  boards: Record<string, LeaderboardEntry[]>
  versus?: VersusTally
  /** The last nickname chosen on this device (until the kiosk timeout in kiosk mode). */
  me?: Signature
  /**
   * Adds today's entry and remembers the nickname; returns its rank (null if it did not make the
   * board) and its time stamp.
   */
  addScore(board: string, spec: BoardSpec, me: Signature, score: number): { rank: number | null; at: number }
  forgetMe(): void
  recordVersus(winner: 'human' | 'machine'): void
  resetBoards(): void
  resetVersus(): void
}

export const today = () => dayKey(new Date())

export const useBooth = create<BoothState>()(
  persist(
    (set, get) => ({
      boards: {},
      addScore(board, spec, me, score) {
        const entry: LeaderboardEntry = { name: me.name, score, day: today(), at: Date.now() }
        if (me.number !== undefined) entry.number = me.number
        const { entries, rank } = addEntry(get().boards[board] ?? [], spec, entry)
        set((s) => ({ boards: { ...s.boards, [board]: entries }, me: { ...me } }))
        return { rank, at: entry.at }
      },
      forgetMe: () => set({ me: undefined }),
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
      partialize: ({ boards, versus, me }) => ({ boards, versus, me }),
    },
  ),
)

// The attract screen (kiosk timeout) hands the booth to the next visitor: forget the last nickname.
// Without kiosk mode the device keeps it.
useUi.subscribe((s, prev) => {
  if (s.attract && !prev.attract) useBooth.getState().forgetMe()
})

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
