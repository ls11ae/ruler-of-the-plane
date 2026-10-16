// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GAME_IDS, isImplemented } from '../games/registry'
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
    // Built games are links, the others are dashed with "Kommt bald".
    const built = GAME_IDS.filter(isImplemented)
    expect(built).toContain('art-gallery')
    expect(screen.queryAllByText('Kommt bald')).toHaveLength(GAME_IDS.length - built.length)
    expect(screen.getByRole('link', { name: /Licht ins Verlies/ }).getAttribute('href')).toBe(
      '#/play/art-gallery',
    )
    expect(screen.getByRole('link', { name: /Alte Ruinen/ }).getAttribute('href')).toBe(
      'https://kbuchin.github.io/ruler/',
    )
    expect(screen.queryByText('Rundreise')).toBeNull()
  })

  it('marks a built game switched off by the staff as closed today', () => {
    act(() => useSettings.getState().setGameEnabled('art-gallery', false))
    render(<StartMap />)
    expect(screen.getByText('Heute geschlossen')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Licht ins Verlies/ })).toBeNull()
  })

  it('switches the language', () => {
    render(<StartMap />)
    fireEvent.click(screen.getByRole('button', { name: /Switch to English/ }))
    expect(screen.getByText('Light the Dungeon')).toBeTruthy()
    expect(useSettings.getState().language).toBe('en')
  })
})
