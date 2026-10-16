import { describe, expect, it } from 'vitest'
import {
  addEntry,
  BOARD_SIZE,
  dayKey,
  parseLucky,
  rankFor,
  recordVersus,
  stepLucky,
  todaysBoard,
  todaysVersus,
  type LeaderboardEntry,
} from './leaderboard'

const e = (name: string, score: number, at: number, day = '2026-11-07'): LeaderboardEntry => ({
  name,
  score,
  at,
  day,
})

describe('leaderboard', () => {
  it('formats local days', () => {
    expect(dayKey(new Date(2026, 10, 7, 23, 59))).toBe('2026-11-07')
    expect(dayKey(new Date(2026, 0, 1))).toBe('2026-01-01')
  })

  it('sorts by score, ties by time, and drops other days', () => {
    const entries = [e('owl', 5, 3), e('fox', 7, 2), e('cat', 5, 1), e('old', 99, 0, '2026-11-06')]
    expect(todaysBoard(entries, { higherIsBetter: true }, '2026-11-07').map((x) => x.name)).toEqual([
      'fox',
      'cat',
      'owl',
    ])
    expect(todaysBoard(entries, { higherIsBetter: false }, '2026-11-07').map((x) => x.name)).toEqual([
      'cat',
      'owl',
      'fox',
    ])
  })

  it('adds entries and reports their rank', () => {
    const spec = { higherIsBetter: false }
    let entries: LeaderboardEntry[] = [e('old', 1, 0, '2026-11-06')]
    for (let i = 0; i < BOARD_SIZE; i++) entries = addEntry(entries, spec, e(`p${i}`, 10 + i, i)).entries
    expect(entries).toHaveLength(BOARD_SIZE)
    expect(entries.some((x) => x.day !== '2026-11-07')).toBe(false)
    expect(rankFor(entries, spec, 9, '2026-11-07')).toBe(1)
    expect(rankFor(entries, spec, 12, '2026-11-07')).toBe(4)
    expect(rankFor(entries, spec, 30, '2026-11-07')).toBeNull()
    const added = addEntry(entries, spec, e('new', 12, 100))
    expect(added.rank).toBe(4)
    expect(added.entries[3]!.name).toBe('new')
    expect(addEntry(entries, spec, e('slow', 30, 101)).rank).toBeNull()
  })

  it('counts humans against the machine per day', () => {
    let t = recordVersus(undefined, 'human', '2026-11-07')
    t = recordVersus(t, 'machine', '2026-11-07')
    t = recordVersus(t, 'human', '2026-11-07')
    expect(t).toEqual({ day: '2026-11-07', human: 2, machine: 1 })
    expect(todaysVersus(t, '2026-11-08')).toEqual({ day: '2026-11-08', human: 0, machine: 0 })
    expect(recordVersus(t, 'machine', '2026-11-08')).toEqual({ day: '2026-11-08', human: 0, machine: 1 })
  })
})

describe('lucky numbers', () => {
  it('accept 1 to 99 typed as digits, nothing else', () => {
    expect(parseLucky('7')).toBe(7)
    expect(parseLucky('99')).toBe(99)
    expect(parseLucky('0')).toBeUndefined()
    expect(parseLucky('')).toBeUndefined()
    expect(parseLucky('4a2')).toBe(42)
    expect(parseLucky('123')).toBe(12)
  })

  it('step through none, 1 … 99 and back to none', () => {
    expect(stepLucky(undefined, 1)).toBe(1)
    expect(stepLucky(98, 1)).toBe(99)
    expect(stepLucky(99, 1)).toBeUndefined()
    expect(stepLucky(undefined, -1)).toBe(99)
    expect(stepLucky(1, -1)).toBeUndefined()
  })
})
