import { describe, expect, it } from 'vitest'
import { hrefFor, parseRoute } from './router'

describe('router', () => {
  it('parses hash routes', () => {
    expect(parseRoute('')).toEqual({ name: 'start' })
    expect(parseRoute('#/')).toEqual({ name: 'start' })
    expect(parseRoute('#/play/voronoi')).toEqual({ name: 'game', game: 'voronoi' })
    expect(parseRoute('#/play/voronoi/')).toEqual({ name: 'game', game: 'voronoi' })
    expect(parseRoute('#/play/chess')).toEqual({ name: 'unknown' })
    expect(parseRoute('#/demo')).toEqual({ name: 'demo' })
  })
  it('round-trips', () => {
    expect(parseRoute(hrefFor({ name: 'game', game: 'frechet' }))).toEqual({ name: 'game', game: 'frechet' })
  })
})
