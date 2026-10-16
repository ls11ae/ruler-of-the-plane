// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useSettings } from './settings'
import { StartMap } from './StartMap'

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
  act(() => useSettings.setState({ language: 'de', disabledGames: [] }))
})

afterEach(cleanup)

describe('StartMap', () => {
  it('shows one place per game, dashed while the game is not built', () => {
    render(<StartMap />)
    for (const name of ['Licht ins Verlies', 'Erobere das Land', 'Gassi gehen', 'Rasenmähen', 'Straßenbau']) {
      expect(screen.getByText(name)).toBeTruthy()
    }
    // No game folder exists yet: every game place says "Kommt bald" and is not a link.
    expect(screen.getAllByText('Kommt bald')).toHaveLength(5)
    expect(screen.queryByRole('link', { name: /Licht ins Verlies/ })).toBeNull()
    expect(screen.getByRole('link', { name: /Alte Ruinen/ }).getAttribute('href')).toBe(
      'https://kbuchin.github.io/ruler/',
    )
    expect(screen.queryByText('Rundreise')).toBeNull()
  })

  it('switches the language', () => {
    render(<StartMap />)
    fireEvent.click(screen.getByRole('button', { name: /Switch to English/ }))
    expect(screen.getByText('Light the Dungeon')).toBeTruthy()
    expect(useSettings.getState().language).toBe('en')
  })
})
