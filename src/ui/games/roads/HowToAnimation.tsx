import { CASTLE, VILLAGES } from './art'
import styles from './Roads.module.css'

/** Four places; three dashed roads are drawn one after the other, then "Optimal!" (a 6 s loop). */
const PLACES: [number, number][] = [
  [50, 120],
  [140, 50],
  [200, 130],
  [290, 70],
]
const ROADS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
]

export function HowToAnimation({ label, done }: { label: string; done: string }) {
  return (
    <svg
      viewBox="0 0 340 170"
      className={`${styles.animationSvg} ${styles.loop}`}
      role="img"
      aria-label={label}
    >
      {ROADS.map(([a, b], i) => {
        const [x1, y1] = PLACES[a]!
        const [x2, y2] = PLACES[b]!
        return (
          <line
            key={i}
            className={styles[`road${i + 1}`]}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--ink)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray="10 7"
          />
        )
      })}
      {PLACES.map(([x, y], i) => (
        <image key={i} href={i === 3 ? CASTLE : VILLAGES[i]} x={x - 22} y={y - 22} width={44} height={44} />
      ))}
      <g className={styles.done}>
        <rect
          x={120}
          y={140}
          width={100}
          height={26}
          rx={8}
          fill="var(--paper)"
          stroke="var(--ink)"
          strokeWidth={2}
        />
        <text
          x={170}
          y={159}
          textAnchor="middle"
          fontSize={17}
          fontFamily="var(--font-text)"
          fill="var(--ink)"
        >
          {done}
        </text>
      </g>
    </svg>
  )
}
