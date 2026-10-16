// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { de } from '../i18n/de'
import { useBooth } from '../shell/booth'
import { useSettings } from '../shell/settings'
import { useUi } from '../shell/ui'
import { LeaderboardPanel } from './Leaderboard'
import type { LeaderboardSubmission } from './ResultScreen'

const submission = (board: string): LeaderboardSubmission => ({
  board,
  spec: { higherIsBetter: true },
  score: 5,
  format: (s) => `${s} Punkte`,
})

const nameButtons = () =>
  screen
    .getAllByRole('button')
    .map((b) => b.textContent ?? '')
    .filter((text) => Object.values(de.nicknames).some((n) => text.startsWith(n)))

beforeEach(() => {
  act(() => {
    useSettings.setState({ language: 'de' })
    useBooth.setState({ boards: {}, me: undefined })
    useUi.setState({ attract: false })
  })
})

afterEach(cleanup)

describe('LeaderboardPanel', () => {
  it('lets a player reach every nickname by paging', () => {
    render(<LeaderboardPanel submission={submission('test/a')} />)
    const seen = new Set<string>()
    for (let page = 0; page < 10; page++) {
      for (const name of nameButtons()) seen.add(name)
      fireEvent.click(screen.getByRole('button', { name: /Andere Namen/ }))
    }
    expect(seen).toEqual(new Set(Object.values(de.nicknames)))
  })

  it('adds an optional lucky number and offers the same name first next time', () => {
    render(<LeaderboardPanel submission={submission('test/a')} />)
    fireEvent.change(screen.getByLabelText('Glückszahl'), { target: { value: '7' } })
    const first = nameButtons()[0]!
    expect(first).toMatch(/ 7$/)
    fireEvent.click(screen.getByRole('button', { name: first }))
    expect(screen.getByRole('listitem').textContent).toContain(first)
    cleanup()

    render(<LeaderboardPanel submission={submission('test/b')} />)
    const again = screen.getByRole('button', { name: `Wieder als ${first}` })
    expect(nameButtons()[0]).toBe(first)
    expect((screen.getByLabelText('Glückszahl') as HTMLInputElement).value).toBe('7')
    fireEvent.click(again)
    expect(useBooth.getState().boards['test/b']![0]).toMatchObject({ number: 7 })
  })

  it('forgets the name when the attract screen hands the booth to the next visitor', () => {
    act(() => useBooth.setState({ me: { name: 'owl', number: 3 } }))
    act(() => useUi.getState().showAttract())
    expect(useBooth.getState().me).toBeUndefined()
  })
})
