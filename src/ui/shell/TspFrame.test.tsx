// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIdle } from './idle'
import { useSettings } from './settings'
import { TspFrame } from './TspFrame'

/** The frame screen with a kiosk idle timer, as in the app. */
function Harness({ onIdle }: { onIdle: () => void }) {
  useIdle(90_000, onIdle, true)
  return <TspFrame />
}

beforeEach(() => {
  // jsdom has no ResizeObserver (the game header measures itself with one).
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  vi.useFakeTimers()
  vi.stubEnv('VITE_TSP_BOARDS_URL', 'https://ls11ae.github.io/tsp-boards/')
  act(() => useSettings.setState({ language: 'en' }))
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('TspFrame', () => {
  it('shows tsp-boards in its event mode below "‹ Karte", in the language of the map', () => {
    render(<TspFrame />)
    const frame = screen.getByTitle('Round Trip: the TSP game tsp-boards') as HTMLIFrameElement
    expect(frame.getAttribute('src')).toBe('https://ls11ae.github.io/tsp-boards/#kiosk')
    expect(frame.getAttribute('allow')).toBe('fullscreen')
    expect(screen.getByRole('link', { name: 'Back to the map' }).getAttribute('href')).toBe('#/')
    expect(localStorage.getItem('tsp-boards.lang')).toBe('en')
  })

  it('counts input inside a same-origin frame for the kiosk timeout', () => {
    const onIdle = vi.fn()
    render(<Harness onIdle={onIdle} />)
    const frame = screen.getByTitle(/tsp-boards/) as HTMLIFrameElement
    // jsdom does not load the URL; its empty document is same-origin, like tsp-boards on GitHub Pages.
    fireEvent.load(frame)
    const inner = frame.contentWindow!
    for (let s = 0; s < 120; s += 30) {
      act(() => vi.advanceTimersByTime(30_000))
      inner.dispatchEvent(new Event('pointerdown'))
    }
    expect(onIdle).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(91_000))
    expect(onIdle).toHaveBeenCalledTimes(1)
  })

  it('says so when no URL is set', () => {
    vi.stubEnv('VITE_TSP_BOARDS_URL', '')
    render(<TspFrame />)
    expect(screen.queryByTitle(/tsp-boards/)).toBeNull()
    expect(screen.getByText(/Round Trip/)).toBeTruthy()
  })
})
