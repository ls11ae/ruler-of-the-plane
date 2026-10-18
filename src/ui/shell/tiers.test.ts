// @vitest-environment jsdom
import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSettings } from './settings'
import { suggestedTier, useTierMemory } from './tiers'
import { useUi } from './ui'

beforeEach(() => {
  act(() => {
    useUi.setState({ attract: false })
    useTierMemory.getState().reset()
    useSettings.setState({ tierDefaults: {} })
  })
})

describe('tiers', () => {
  it('suggests the last tier played, else the staff default, else "Leicht"', () => {
    expect(suggestedTier('hard', 'medium')).toEqual({ tier: 'hard', reason: 'last' })
    expect(suggestedTier(undefined, 'medium')).toEqual({ tier: 'medium', reason: 'staff' })
    expect(suggestedTier(undefined, undefined)).toEqual({ tier: 'easy', reason: null })
  })

  it('forgets the tiers played when the kiosk timeout shows the attract screen', () => {
    act(() => {
      useTierMemory.getState().setLast('roads', 'medium')
      useSettings.getState().setTierDefault('roads', 'hard')
    })
    expect(useTierMemory.getState().last.roads).toBe('medium')
    act(() => useUi.getState().showAttract())
    expect(useTierMemory.getState().last).toEqual({})
    // The staff's default stays for the next visitor.
    expect(useSettings.getState().tierDefaults.roads).toBe('hard')
  })
})
