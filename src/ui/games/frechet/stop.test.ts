// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { useStop } from './stop'

/** Stores the stop as an earlier build wrote it and loads it again. */
async function load(woods: string | null) {
  localStorage.setItem('rotp-frechet-stop', JSON.stringify({ state: { woods }, version: 1 }))
  await useStop.persist.rehydrate()
  return useStop.getState().woods
}

describe('stop', () => {
  it('returns into the woods, but to the park from a walk an update removed', async () => {
    expect(await load('lamp')).toBe('lamp')
    expect(await load('ws1')).toBe('ws1')
    expect(await load(null)).toBeNull()
    expect(await load('oak')).toBeNull()
  })
})
