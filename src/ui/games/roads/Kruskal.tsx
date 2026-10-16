import { useMemo, useState } from 'react'
import type { RoadsMap } from '../../../core/games/roads/levels'
import { kruskal } from '../../../core/games/roads/mst'
import { Button } from '../../components/Button'
import { useAnimationFrame } from '../../input/hooks'
import { CASTLE, VILLAGES } from './art'
import styles from './Roads.module.css'
import type { RoadsTexts } from './i18n.de'

const STEP_MS = 650

/**
 * "Was steckt dahinter?": Kruskal on the player's map. The roads come by length, shortest first; a
 * road that would close a ring flashes red and disappears, the others stay.
 */
export function KruskalAnimation({ map, label, replay }: { map: RoadsMap; label: string; replay: string }) {
  const { steps } = useMemo(() => kruskal(map.points), [map])
  const [start, setStart] = useState(() => performance.now())
  const [k, setK] = useState(0)
  useAnimationFrame((now) => setK(Math.min(steps.length, (now - start) / STEP_MS)), k < steps.length)
  const { minX, minY, maxX, maxY } = map.bounds
  const pad = 0.5
  const w = maxX - minX + 2 * pad
  const s = w / 60
  const done = Math.floor(k)
  return (
    <div>
      <svg
        viewBox={`${minX - pad} ${minY - pad} ${w} ${maxY - minY + 2 * pad}`}
        className={styles.animationSvg}
        role="img"
        aria-label={label}
      >
        {steps.map((step, i) => {
          if (i > done || (!step.taken && i < done)) return null
          const [a, b] = step.road
          const current = i === done
          const colour = step.taken ? (current ? 'var(--person)' : 'var(--ink)') : 'var(--warn)'
          return (
            <line
              key={i}
              x1={map.points[a]![0]}
              y1={map.points[a]![1]}
              x2={map.points[b]![0]}
              y2={map.points[b]![1]}
              stroke={colour}
              strokeWidth={s * (current ? 1.4 : 1)}
              strokeDasharray={`${s * 2.4} ${s * 1.6}`}
              strokeLinecap="round"
            />
          )
        })}
        {map.points.map(([x, y], i) => {
          const size = s * 9
          return (
            <image
              key={i}
              href={i >= map.villages ? CASTLE : VILLAGES[i % VILLAGES.length]}
              x={x - size / 2}
              y={y - size / 2}
              width={size}
              height={size}
            />
          )
        })}
      </svg>
      <Button
        small
        onClick={() => {
          setStart(performance.now())
          setK(0)
        }}
      >
        {replay}
      </Button>
    </div>
  )
}

/** Theory beside the map: why a tree, Kruskal step by step on the board, how solutions are checked. */
export function TheoryPanel({
  map,
  step,
  setStep,
  t,
  onClose,
}: {
  map: RoadsMap
  step: number
  setStep: (k: number) => void
  t: RoadsTexts
  onClose: () => void
}) {
  const { steps, length } = useMemo(() => kruskal(map.points), [map])
  const n = map.points.length
  const current = steps[step - 1]
  return (
    <aside className={styles.theory} aria-label={t.theory.title}>
      <div className={styles.theoryHead}>
        <h2>{t.theory.title}</h2>
        <Button small onClick={onClose} aria-label={t.theory.close}>
          ×
        </Button>
      </div>
      <p>{t.theory.tree(n, (n * (n - 1)) / 2)}</p>
      <p>{t.theory.kruskal}</p>
      <div className={styles.toggles}>
        <Button small variant="accent" disabled={step >= steps.length} onClick={() => setStep(step + 1)}>
          {t.theory.step}
        </Button>
        <Button small disabled={step >= steps.length} onClick={() => setStep(steps.length)}>
          {t.theory.all}
        </Button>
        <Button small disabled={step === 0} onClick={() => setStep(0)}>
          {t.theory.reset}
        </Button>
      </div>
      <p data-testid="kruskal-status">
        {step === 0
          ? ''
          : step >= steps.length
            ? t.theory.done(t.km(length))
            : `${t.theory.status(step, steps.length)}: ${current!.taken ? t.theory.taken(t.km(current!.length)) : t.theory.skipped(t.km(current!.length))}`}
      </p>
      <p>{t.theory.check}</p>
    </aside>
  )
}
