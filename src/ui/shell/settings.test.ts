// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { useSettings } from './settings'

/** Stores settings as an older version wrote them and loads them again. */
async function loadVersion(version: number, state: object) {
  localStorage.setItem('rotp-settings', JSON.stringify({ state, version }))
  await useSettings.persist.rehydrate()
  return useSettings.getState()
}

describe('settings', () => {
  it('turns the old difficulty of the computer opponents into the tier of "Erobere das Land"', async () => {
    const old = { language: 'en', kiosk: true, disabledGames: ['roads'] }
    expect((await loadVersion(1, { ...old, difficulty: 'hard' })).tierDefaults).toEqual({ voronoi: 'hard' })
    expect((await loadVersion(1, { ...old, difficulty: 'easy' })).tierDefaults).toEqual({ voronoi: 'easy' })
    // "normal" was the default, so it is no choice of the staff.
    const s = await loadVersion(1, { ...old, difficulty: 'normal' })
    expect(s.tierDefaults).toEqual({})
    expect(s).toMatchObject(old)
    expect('difficulty' in s).toBe(false)
  })

  it('sets and clears the tier the staff suggests per game', () => {
    useSettings.getState().setTierDefault('frechet', 'medium')
    expect(useSettings.getState().tierDefaults.frechet).toBe('medium')
    useSettings.getState().setTierDefault('frechet', null)
    expect(useSettings.getState().tierDefaults).not.toHaveProperty('frechet')
  })
})
