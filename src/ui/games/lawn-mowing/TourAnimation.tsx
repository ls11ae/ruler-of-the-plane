import { useMemo, useRef, useState } from 'react'
import { Mowing, type Lawn } from '../../../core/games/lawn-mowing/mowing'
import { positionsOf } from '../../../core/games/lawn-mowing/tour'
import type { Vec2 } from '../../../core/geometry/types'
import type { LawnMowingLevel } from '../../../core/levels/schema'
import { Button } from '../../components/Button'
import { useAnimationFrame } from '../../input/hooks'
import { CUTTER_COLOURS } from './art'
import { boardBounds, cutterCentre, ringsPath, runs, simplify } from './geometry'
import styles from './LawnMowing.module.css'

const COLOURS = [...CUTTER_COLOURS, '#2f9e8f']

/**
 * Tours played back on a small picture of the lawn: all cutters drive at once, one step per tick, and the
 * mowed area grows; a cutter that is home waits. `durationMs` is the time for the longest tour.
 */
export function TourAnimation({
  level,
  lawn,
  tours,
  label,
  replay,
  durationMs = 7000,
}: {
  level: LawnMowingLevel
  lawn: Lawn
  tours: readonly (readonly Vec2[])[]
  label: string
  replay: string
  durationMs?: number
}) {
  const walks = useMemo(() => tours.map((t) => positionsOf(t)), [tours])
  const total = Math.max(1, ...walks.map((w) => w.length - 1))
  const [step, setStep] = useState(0)
  const started = useRef<number | null>(null)
  useAnimationFrame((now) => {
    if (started.current === null) started.current = now
    const s = Math.min(total, Math.floor(((now - started.current) / durationMs) * total))
    if (s !== step) setStep(s)
  }, step < total)
  const mowed = useMemo(() => {
    const m = new Mowing(lawn)
    for (const w of walks) for (const p of w.slice(0, step + 1)) m.mowAt(p)
    return lawn.cells.cells().filter(([x, y]) => m.isMowed(x, y))
  }, [lawn, walks, step])
  const b = boardBounds(level, 1.5)
  const at = (w: readonly Vec2[]) => w[Math.min(step, w.length - 1)]!
  return (
    <div>
      <svg
        viewBox={`${b.minX} ${b.minY} ${b.maxX - b.minX} ${b.maxY - b.minY}`}
        className={styles.animationSvg}
        role="img"
        aria-label={label}
      >
        <path d={ringsPath([level.outer, ...level.holes])} fill="#8fca6a" fillRule="evenodd" />
        {runs(mowed).map(([x, y, n]) => (
          <rect key={`${x},${y}`} x={x} y={-(y + 1)} width={n} height={1} fill="#cfeab0" />
        ))}
        <path
          d={ringsPath([level.outer, ...level.holes])}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={0.18}
          strokeLinejoin="round"
        />
        {walks.map((w, i) => {
          const points = simplify(w.slice(0, step + 1).map((p) => cutterCentre(lawn, p)))
          const [cx, cy] = cutterCentre(lawn, at(w))
          return (
            <g key={i}>
              <path
                d={points.map(([x, y], j) => `${j ? 'L' : 'M'}${x},${y}`).join('')}
                fill="none"
                stroke={COLOURS[i % COLOURS.length]}
                strokeWidth={0.28}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle
                cx={cx}
                cy={cy}
                r={0.6}
                fill={COLOURS[i % COLOURS.length]}
                stroke="var(--ink)"
                strokeWidth={0.12}
              />
            </g>
          )
        })}
      </svg>
      <Button
        small
        onClick={() => {
          started.current = null
          setStep(0)
        }}
      >
        {replay}
      </Button>
    </div>
  )
}
