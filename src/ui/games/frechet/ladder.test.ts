import { describe, expect, it } from 'vitest'
import { WALK_IDS } from '../../../core/games/frechet/levels'
import { WOODS_IDS } from '../../../core/games/frechet/woods/shapes'
import { LADDER, nextStop } from './ladder'

describe('"Nächstes Level"', () => {
  it('climbs from the easy park through the woods to the next tier, and ends after the hard woods', () => {
    expect(LADDER).toHaveLength(WALK_IDS.length + WOODS_IDS.length)
    expect(nextStop({ kind: 'park', id: 'avenue' })).toEqual({ kind: 'park', id: 'sniffing' })
    expect(nextStop({ kind: 'park', id: 'expert' })).toEqual({ kind: 'woods', id: 'lamp' })
    expect(nextStop({ kind: 'woods', id: 'eight' })).toEqual({ kind: 'park', id: 'm1' })
    expect(nextStop({ kind: 'park', id: 'm4' })).toEqual({ kind: 'woods', id: 'wm1' })
    expect(nextStop({ kind: 'woods', id: 'wm3' })).toEqual({ kind: 'park', id: 's1' })
    expect(nextStop({ kind: 'park', id: 's4' })).toEqual({ kind: 'woods', id: 'ws1' })
    expect(nextStop({ kind: 'woods', id: 'ws3' })).toEqual({ kind: 'woods', id: 'ws4' })
    expect(nextStop({ kind: 'woods', id: 'ws4' })).toBeUndefined()
  })
})
