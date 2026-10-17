import { useMemo, useState } from 'react'
import type { WoodsWalk } from '../../../../core/games/frechet/woods/levels'
import { coils } from '../../../../core/games/frechet/woods/rope'
import {
  makeWoodsCourse,
  stepWoods,
  woodsPositions,
  woodsStart,
  type WoodsState,
} from '../../../../core/games/frechet/woods/rules'
import { spiral } from '../../../../core/games/frechet/woods/shapes'
import { makeTree } from '../../../../core/games/frechet/woods/trees'
import type { Vec2 } from '../../../../core/geometry/types'
import { useAnimationFrame } from '../../../input/hooks'
import { art, DOG_ASPECT } from '../art'
import { Key } from '../HowToAnimation'
import type { FrechetTexts } from '../i18n.de'
import { drawnRope } from './coil'

const POST: Vec2 = [8, 5]

/**
 * Both walk once and a half round a lamp post, the dog close to it, the person on a wider loop: first
 * the dog runs its loops alone (the leash coils round the post), then the person follows (it uncoils).
 */
const DEMO: WoodsWalk = {
  id: 'lamp',
  person: [[1.2, 8.8], ...spiral(POST, 2.6, 2.6, 150, 5 / 3, 12), [14.8, 8.8]],
  dog: [[1.8, 9.4], ...spiral(POST, 1.2, 1.2, 150, 5 / 3, 12), [14.8, 9.6]],
  trunks: [{ at: POST, radius: 0.12 }],
  trees: [makeTree(POST, 0.12)],
  slack: 1,
  // A long leash: the demo shows the leash coiling, not snapping.
  target: 30,
  computer: [[0, 0]],
  speed: 6,
}

/** Who walks when (seconds of the loop): both, the dog alone round the post, the person alone after it, both. */
const SCRIPT: [until: number, person: boolean, dog: boolean][] = [
  [1, true, true],
  [3.3, false, true],
  [8.2, true, false],
  [9.2, true, true],
  [10.6, false, false],
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
  const caught = state.rope.wraps.length > 0
  const turns = coils(state.rope, DEMO.trees)[0]?.turns ?? 0
  const pts = drawnRope(state.rope, DEMO.trees, 0.16, () => 0.22)
  return (
    <svg viewBox="0 0 16 10" role="img" aria-label={label}>
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
      <line x1={POST[0]} y1={POST[1]} x2={POST[0]} y2={POST[1] - 1.6} stroke="var(--ink)" strokeWidth={0.1} />
      <rect
        x={POST[0] - 0.05}
        y={POST[1] - 2.1}
        width={0.5}
        height={0.55}
        rx={0.1}
        fill="var(--light-soft)"
        stroke="var(--ink)"
        strokeWidth={0.08}
      />
      <circle
        cx={POST[0]}
        cy={POST[1]}
        r={0.22}
        fill="#4a4f57"
        stroke={caught ? 'var(--warn)' : 'var(--ink)'}
        strokeWidth={caught ? 0.12 : 0.08}
      />
      <polyline
        points={poly(pts)}
        fill="none"
        stroke={caught ? 'var(--warn)' : 'var(--ink)'}
        strokeWidth={0.12}
        strokeLinejoin="round"
      />
      {turns !== 0 && (
        <g>
          <rect
            x={POST[0] + 1.4}
            y={POST[1] - 2.4}
            width={1.7}
            height={1.1}
            rx={0.25}
            fill="var(--paper)"
            stroke="var(--warn)"
            strokeWidth={0.1}
          />
          <text
            x={POST[0] + 2.25}
            y={POST[1] - 1.55}
            textAnchor="middle"
            fontSize={0.8}
            fontFamily="var(--font-text)"
            fill="var(--ink)"
          >
            {Math.abs(turns)}×
          </text>
        </g>
      )}
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
