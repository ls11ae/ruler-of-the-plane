// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettings } from './settings'
import { StaffMenu } from './StaffMenu'
import { useUi } from './ui'

/** Renders the menu only while it is open, as the app does. */
function Harness() {
  const open = useUi((s) => s.staffOpen)
  return open ? <StaffMenu /> : null
}

const unlock = (pin: string) => {
  fireEvent.change(screen.getByLabelText(/PIN/), { target: { value: pin } })
  fireEvent.click(screen.getByRole('button', { name: 'Öffnen' }))
}

beforeEach(() => {
  vi.stubEnv('VITE_STAFF_PIN', '4711')
  act(() => useUi.setState({ staffOpen: false, attract: false }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe('StaffMenu', () => {
  it('asks for the PIN and rejects a wrong one', () => {
    render(<Harness />)
    act(() => useUi.getState().openStaff())
    unlock('0000')
    expect(screen.getByRole('alert').textContent).toBe('Falsche PIN')
    unlock('4711')
    expect(screen.getByRole('heading', { name: 'Spiele' })).toBeTruthy()
  })

  it('locks again when the menu closes', () => {
    render(<Harness />)
    act(() => useUi.getState().openStaff())
    unlock('4711')
    expect(screen.getByRole('heading', { name: 'Spiele' })).toBeTruthy()
    act(() => useUi.getState().closeStaff())
    act(() => useUi.getState().openStaff())
    expect(screen.queryByRole('heading', { name: 'Spiele' })).toBeNull()
    expect(screen.getByLabelText(/PIN/)).toBeTruthy()
  })

  it('opens without a PIN when none is set', () => {
    vi.stubEnv('VITE_STAFF_PIN', '')
    render(<Harness />)
    act(() => useUi.getState().openStaff())
    expect(screen.getByRole('heading', { name: 'Spiele' })).toBeTruthy()
  })

  it('suggests a tier per game; a second click takes the suggestion back', () => {
    vi.stubEnv('VITE_STAFF_PIN', '')
    act(() => useSettings.setState({ tierDefaults: {} }))
    render(<Harness />)
    act(() => useUi.getState().openStaff())
    const roads = screen.getByRole('group', { name: 'Schwierigkeit beim Start: Straßenbau' })
    const medium = within(roads).getByRole('button', { name: 'Mittel' })
    fireEvent.click(medium)
    expect(useSettings.getState().tierDefaults).toEqual({ roads: 'medium' })
    expect(medium.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(medium)
    expect(useSettings.getState().tierDefaults).toEqual({})
  })
})
