import { useId } from 'react'
import styles from './Frechet.module.css'

interface LeashSliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** Special lengths drawn as ticks under the track. */
  ticks?: readonly number[]
  /** One length drawn as a tall tick (the shortest leash, once it is known). */
  mark?: number | null
  /** Lengths that worked (green) or did not (red), e.g. the tries of "Schätz die Leine". */
  good?: readonly number[]
  bad?: readonly number[]
}

/** A leash-length slider (a native range input, so keyboard and screen readers work) with ticks. */
export function LeashSlider({
  label,
  value,
  min,
  max,
  step = 0.05,
  onChange,
  ticks = [],
  mark,
  good = [],
  bad = [],
}: LeashSliderProps) {
  const id = useId()
  const x = (v: number) => ((v - min) / (max - min)) * 100
  const inRange = (v: number) => v >= min && v <= max
  return (
    <div className={styles.slider}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className={styles.ticks} aria-hidden="true">
        {ticks.filter(inRange).map((v, i) => (
          <line
            key={i}
            x1={x(v)}
            x2={x(v)}
            y1={0}
            y2={4}
            stroke="var(--ink-soft)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {good.filter(inRange).map((v, i) => (
          <line
            key={`g${i}`}
            x1={x(v)}
            x2={x(v)}
            y1={0}
            y2={8}
            stroke="var(--person)"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {bad.filter(inRange).map((v, i) => (
          <line
            key={`b${i}`}
            x1={x(v)}
            x2={x(v)}
            y1={0}
            y2={8}
            stroke="var(--warn)"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {mark != null && inRange(mark) && (
          <line
            x1={x(mark)}
            x2={x(mark)}
            y1={0}
            y2={10}
            stroke="var(--ink)"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  )
}
