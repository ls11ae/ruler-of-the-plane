// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_IDS, isImplemented } from '../games/registry'
import { useSettings } from './settings'
import { StartMap } from './StartMap'
import { useUi } from './ui'

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
  // The tests must not depend on the build variables of the machine (the Pages build sets them).
  vi.stubEnv('VITE_TSP_BOARDS_URL', '')
  act(() => {
    useSettings.setState({ language: 'de', disabledGames: [], kiosk: false })
    useUi.setState({ attract: false })
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

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

  it('opens Rundreise in a new tab when VITE_TSP_BOARDS_URL is set', () => {
    vi.stubEnv('VITE_TSP_BOARDS_URL', ' https://ls11ae.github.io/tsp-boards/ ')
    render(<StartMap />)
    const link = screen.getByRole('link', { name: /Rundreise/ })
    expect(link.getAttribute('href')).toBe('https://ls11ae.github.io/tsp-boards/')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener')
  })

  it('keeps kiosk visitors inside the app: Rundreise in a frame, the old version as an address', () => {
    vi.stubEnv('VITE_TSP_BOARDS_URL', 'https://ls11ae.github.io/tsp-boards/')
    act(() => useSettings.setState({ kiosk: true }))
    render(<StartMap />)
    const link = screen.getByRole('link', { name: /Rundreise/ })
    expect(link.getAttribute('href')).toBe('#/tsp')
    expect(link.getAttribute('target')).toBeNull()
    expect(screen.queryByRole('link', { name: /Alte Ruinen/ })).toBeNull()
    expect(screen.getByText('online: kbuchin.github.io/ruler')).toBeTruthy()
  })

  it('links Impressum, privacy notice and accessibility statement in a new tab', () => {
    render(<StartMap />)
    fireEvent.click(screen.getByRole('button', { name: 'Impressum · Datenschutz' }))
    const dialog = screen.getByRole('dialog', { name: 'Impressum und Datenschutz' })
    const links = within(dialog).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      'https://ae.cs.tu-dortmund.de/imprint/',
      'https://ae.cs.tu-dortmund.de/privacy/',
      'https://ae.cs.tu-dortmund.de/accessibility-statement/',
    ])
    for (const a of links) {
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toBe('noopener')
    }
    expect(within(dialog).getByRole('link', { name: /Erklärung zur Barrierefreiheit/ })).toBeTruthy()
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Schließen' }).at(-1)!)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the legal pages in kiosk mode as addresses with QR codes, without leaving the app', () => {
    act(() => useSettings.setState({ kiosk: true }))
    render(<StartMap />)
    fireEvent.click(screen.getByRole('button', { name: 'Impressum · Datenschutz' }))
    const dialog = screen.getByRole('dialog', { name: 'Impressum und Datenschutz' })
    expect(within(dialog).queryAllByRole('link')).toEqual([])
    expect(dialog.textContent).toContain('ae.cs.tu-dortmund.de/imprint')
    expect(
      within(dialog)
        .getAllByRole('img')
        .map((img) => img.getAttribute('aria-label')),
    ).toEqual([
      'QR-Code für ae.cs.tu-dortmund.de/imprint',
      'QR-Code für ae.cs.tu-dortmund.de/privacy',
      'QR-Code für ae.cs.tu-dortmund.de/accessibility-statement',
    ])
    // The kiosk timeout brings back the attract screen: the dialog goes.
    act(() => useUi.getState().showAttract())
    expect(screen.queryByRole('dialog', { name: 'Impressum und Datenschutz' })).toBeNull()
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
