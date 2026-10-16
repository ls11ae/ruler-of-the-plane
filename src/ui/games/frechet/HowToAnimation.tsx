import { useMemo, useState } from 'react'
import type { WalkLevel } from '../../../core/games/frechet/levels'
import { makeCourse, positions, startState, step, type WalkState } from '../../../core/games/frechet/rules'
import type { Vec2 } from '../../../core/geometry/types'
import { useAnimationFrame } from '../../input/hooks'
import { art, DOG_ASPECT } from './art'
import type { FrechetTexts } from './i18n.de'

/** A short walk in metres: the dog sniffs to the side, so the person has to wait for it. */
const DEMO: WalkLevel = {
  id: 'own',
  person: [
    [1.5, 7],
    [14.5, 2],
  ],
  dog: [
    [1.5, 8.2],
    [5, 7.6],
    [6.4, 3.4],
    [8, 7.8],
    [14.5, 3.2],
  ],
  slack: 1.3,
}

/** Who walks when (seconds of the loop): both, then the dog alone while the person waits, then both. */
const SCRIPT: [until: number, person: boolean, dog: boolean][] = [
  [1.6, true, true],
  [4.6, false, true],
  [9, true, true],
  [10.5, false, false],
]
const LOOP_S = SCRIPT[SCRIPT.length - 1]![0]

const poly = (pts: readonly Vec2[]) => pts.map(([x, y]) => `${x},${y}`).join(' ')

function Key({ x, label, down }: { x: number; label: string; down: boolean }) {
  return (
    <g transform={`translate(${x} 0.3)`}>
      <rect
        width={1.6}
        height={1.6}
        rx={0.3}
        y={down ? 0.15 : 0}
        fill={down ? 'var(--light-soft)' : 'var(--paper)'}
        stroke="var(--ink)"
        strokeWidth={0.1}
      />
      <text
        x={0.8}
        y={down ? 1.35 : 1.2}
        textAnchor="middle"
        fontSize={1}
        fontFamily="var(--font-text)"
        fill="var(--ink)"
      >
        {label}
      </text>
    </g>
  )
}

/** "So geht's": person and dog walk to the castle; while the dog sniffs, the person waits (only L held). */
export function HowToAnimation({ label, t }: { label: string; t: FrechetTexts }) {
  const course = useMemo(() => makeCourse(DEMO), [])
  const [frame, setFrame] = useState<{ time: number; state: WalkState }>(() => ({
    time: 0,
    state: startState(course),
  }))
  useAnimationFrame((_, dtMs) => {
    const dt = Math.min(dtMs, 50) / 1000
    setFrame((f) => {
      if (f.time + dt >= LOOP_S) return { time: 0, state: startState(course) }
      const [, person, dog] = SCRIPT.find(([until]) => f.time < until) ?? SCRIPT[0]!
      // Walk slowly, so the eye can follow.
      return { time: f.time + dt, state: step(course, f.state, { person, dog }, dt * 0.7) }
    })
  })
  const { time, state } = frame
  const [, personDown, dogDown] = SCRIPT.find(([until]) => time < until) ?? SCRIPT[0]!
  const { person, dog } = positions(course, state.s, state.t)
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
      <line x1={person[0]} y1={person[1]} x2={dog[0]} y2={dog[1]} stroke="var(--ink)" strokeWidth={0.12} />
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
