/**
 * Local daily leaderboards and the "Mensch gegen Maschine" tally (pure logic; storage is in the UI).
 * Days are local calendar days (`YYYY-MM-DD`); entries from earlier days are dropped.
 */

export interface LeaderboardEntry {
  /** Nickname id from the fixed list (shown in the current language). */
  name: string
  /** Optional lucky number shown after the nickname ("Kluge Eule 7"), 1–99. */
  number?: number
  score: number
  /** Local day, `YYYY-MM-DD`. */
  day: string
  /** Time of the entry (ms since the epoch); earlier entries win ties. */
  at: number
}

export interface BoardSpec {
  /** True if a higher score is better (points), false if lower is better (time, steps, torches). */
  higherIsBetter: boolean
}

/** Entries kept per board and day. */
export const BOARD_SIZE = 10

export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function compareEntries(spec: BoardSpec) {
  return (a: LeaderboardEntry, b: LeaderboardEntry) =>
    (spec.higherIsBetter ? b.score - a.score : a.score - b.score) || a.at - b.at
}

/** Today's entries, best first, at most {@link BOARD_SIZE}. */
export function todaysBoard(
  entries: readonly LeaderboardEntry[],
  spec: BoardSpec,
  today: string,
): LeaderboardEntry[] {
  return entries
    .filter((e) => e.day === today)
    .sort(compareEntries(spec))
    .slice(0, BOARD_SIZE)
}

/** Rank (1-based) a score would get today, or null if it would not make the board. */
export function rankFor(
  entries: readonly LeaderboardEntry[],
  spec: BoardSpec,
  score: number,
  today: string,
): number | null {
  const board = todaysBoard(entries, spec, today)
  const better = board.filter((e) => (spec.higherIsBetter ? e.score >= score : e.score <= score)).length
  return better < BOARD_SIZE ? better + 1 : null
}

/** Lucky numbers go from 1 to 99; no free text, so a booth board needs no moderation. */
export const LUCKY_MAX = 99

/** The lucky number typed so far: digits only, at most two; empty or 0 means none. */
export function parseLucky(text: string): number | undefined {
  const digits = text.replace(/\D/g, '').slice(0, 2)
  const n = Number(digits)
  return digits && n >= 1 ? Math.min(n, LUCKY_MAX) : undefined
}

/** One step up or down through none, 1, 2, …, 99, none, … */
export function stepLucky(n: number | undefined, delta: 1 | -1): number | undefined {
  const next = (n ?? 0) + delta
  if (next > LUCKY_MAX || next === 0) return undefined
  return next < 0 ? LUCKY_MAX : next
}

/** Adds an entry and returns today's board (old days dropped) and the rank of the new entry, if kept. */
export function addEntry(
  entries: readonly LeaderboardEntry[],
  spec: BoardSpec,
  entry: LeaderboardEntry,
): { entries: LeaderboardEntry[]; rank: number | null } {
  const board = todaysBoard([...entries, entry], spec, entry.day)
  const index = board.indexOf(entry)
  return { entries: board, rank: index >= 0 ? index + 1 : null }
}

export interface VersusTally {
  day: string
  human: number
  machine: number
}

/** Counts one game against the computer; the tally starts from 0 : 0 every day. */
export function recordVersus(
  tally: VersusTally | undefined,
  winner: 'human' | 'machine',
  today: string,
): VersusTally {
  const base = tally && tally.day === today ? tally : { day: today, human: 0, machine: 0 }
  return { ...base, [winner]: base[winner] + 1 }
}

export function todaysVersus(tally: VersusTally | undefined, today: string): VersusTally {
  return tally && tally.day === today ? tally : { day: today, human: 0, machine: 0 }
}
