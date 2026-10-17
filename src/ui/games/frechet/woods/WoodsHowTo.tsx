import { useMemo, useState } from 'react'
import type { WoodsWalk } from '../../../../core/games/frechet/woods/levels'
import { ropePoints } from '../../../../core/games/frechet/woods/rope'
import {
  makeWoodsCourse,
  stepWoods,
  woodsPositions,
  woodsStart,
  type WoodsState,
} from '../../../../core/games/frechet/woods/rules'
import { makeTree } from '../../../../core/games/frechet/woods/trees'
import type { Vec2 } from '../../../../core/geometry/types'
import { useAnimationFrame } from '../../../input/hooks'
import { art, DOG_ASPECT } from '../art'
import { Key } from '../HowToAnimation'
import type { FrechetTexts } from '../i18n.de'
import { woodsArt } from './art'

/** Both paths arch over a tree: first the dog goes over alone (the leash winds round the trunk), then the person follows. */
const DEMO: WoodsWalk = {
  id: 'oak',
  person: [
    [1.5, 8.6],
    [4.8, 7.6],
    [6, 3],
    [10, 3],
    [11.2, 7.6],
    [14.5, 8.6],
  ],
  dog: [
    [2, 9.4],
    [5.6, 8.7],
    [6.9, 4.7],
    [9.1, 4.7],
    [10.4, 8.7],
    [14.5, 9.4],
  ],
  trunks: [{ at: [8, 5.7], radius: 0.5 }],
  trees: [makeTree([8, 5.7], 0.5)],
  slack: 1,
  // A long leash: the demo shows the leash winding, not snapping.
  target: 12,
  computer: [[0, 0]],
}

/** Who walks when (seconds of the loop): both, the dog alone over the tree, the person alone after it, both. */
const SCRIPT: [until: number, person: boolean, dog: boolean][] = [
  [1, true, true],
  [5.2, false, true],
  [9.2, true, false],
  [12.2, true, true],
  [13.4, false, false],
]
const LOOP_S = SCRIPT[SCRIPT.length - 1]![0]

const poly = (pts: readonly Vec2[]) => pts.map(([x, y]) => `${x},${y}`).join(' ')

/** "So geht's" in the woods: the leash winds round a trunk while the dog is ahead, and comes free when the person follows. */
export function WoodsHowToAnimation({ label, t }: { label: string; t: FrechetTexts }) {
  const course = useMemo(() => makeWoodsCourse(DEMO), [])
  const [frame, setFrame] = useState<{ time: number; state: WoodsState }>(() => ({
    time: 0,
    state: woodsStart(course),
  }))
  useAnimationFrame((_, dtMs) => {
    const dt = Math.min(dtMs, 50) / 1000
    setFrame((f) => {
      if (f.time + dt >= LOOP_S) return { time: 0, state: woodsStart(course) }
      const [, person, dog] = SCRIPT.find(([until]) => f.time < until) ?? SCRIPT[0]!
      return { time: f.time + dt, state: stepWoods(course, f.state, { person, dog }, dt) }
    })
  })
  const { time, state } = frame
  const [, personDown, dogDown] = SCRIPT.find(([until]) => time < until) ?? SCRIPT[0]!
  const { person, dog } = woodsPositions(course, state.s, state.t)
  const tree = DEMO.trees[0]!
  const caught = state.rope.wraps.length > 0
  return (
    <svg viewBox="0 0 16 10" role="img" aria-label={label}>
      <image
        href={woodsArt.crown}
        x={6.6}
        y={4.3}
        width={2.8}
        height={2.8}
        opacity={0.8}
        style={{ mixBlendMode: 'multiply' }}
      />
      <polyline
        points={poly(DEMO.person)}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={0.75}
        strokeLinecap="round"
      />
      <polyline
        points={poly(DEMO.person)}
        fill="none"
        stroke="#f3e7c4"
        strokeWidth={0.55}
        strokeLinecap="round"
      />
      <polyline
        points={poly(DEMO.dog)}
        fill="none"
        stroke="var(--ink-soft)"
        strokeWidth={0.12}
        strokeDasharray="0.02 0.3"
        strokeLinecap="round"
      />
      <polygon
        points={poly(tree.trunk)}
        fill="#6e5236"
        stroke={caught ? 'var(--warn)' : 'var(--ink)'}
        strokeWidth={caught ? 0.16 : 0.1}
      />
      <polyline
        points={poly(ropePoints(state.rope, DEMO.trees))}
        fill="none"
        stroke={caught ? 'var(--warn)' : 'var(--ink)'}
        strokeWidth={0.12}
        strokeLinejoin="round"
      />
      <image href={art.person} x={person[0] - 0.6} y={person[1] - 0.6} width={1.2} height={1.2} />
      <image
        href={art.dog}
        x={dog[0] - 0.7}
        y={dog[1] - 0.7 * DOG_ASPECT}
        width={1.4}
        height={1.4 * DOG_ASPECT}
      />
      <Key x={0.6} label="A" down={personDown} />
      <text x={2.5} y={1.5} fontSize={0.8} fontFamily="var(--font-text)" fill="var(--ink)">
        {t.person}
      </text>
      <Key x={6.2} label="L" down={dogDown} />
      <text x={8.1} y={1.5} fontSize={0.8} fontFamily="var(--font-text)" fill="var(--ink)">
        {t.dog}
      </text>
    </svg>
  )
}
