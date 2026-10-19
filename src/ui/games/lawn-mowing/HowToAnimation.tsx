import { Slabs } from './LawnArt'
import { LAWN } from './art'
import styles from './LawnMowing.module.css'

/** A small terrace of stone slabs in the first strip (columns 4–5, rows 1–2; `Slabs` counts y upwards). */
const TERRACE = [4, 5].flatMap((x) => [1, 2].map((row) => [x, -(row + 1)] as const))

/**
 * "So geht's": a 3 × 3 mower drives a strip, then the next one, and mows three cells wide; it drives
 * straight over the terrace, which needs no mowing.
 */
export function HowToAnimation({ label }: { label: string }) {
  const cols = 10
  const rows = 6
  return (
    <svg
      viewBox={`-0.5 -0.5 ${cols + 1} ${rows + 1}`}
      className={`${styles.animationSvg} ${styles.loop}`}
      role="img"
      aria-label={label}
    >
      <rect x={0} y={0} width={cols} height={rows} fill={LAWN.grass} />
      {Array.from({ length: cols * rows }, (_, i) => (
        <rect
          key={i}
          x={i % cols}
          y={Math.floor(i / cols)}
          width={1}
          height={1}
          fill="none"
          stroke={LAWN.grassLine}
          strokeWidth={0.04}
        />
      ))}
      <rect className={styles.mowTop} x={0} y={0} width={cols} height={3} fill={LAWN.mowed} />
      <rect className={styles.mowBottom} x={0} y={3} width={cols} height={3} fill={LAWN.mowed} />
      <Slabs cells={TERRACE} />
      <rect x={4} y={1} width={2} height={2} fill="none" stroke="var(--ink)" strokeWidth={0.08} />
      <rect x={0} y={0} width={cols} height={rows} fill="none" stroke="var(--ink)" strokeWidth={0.14} />
      <g className={styles.mower}>
        <rect
          x={0}
          y={0}
          width={3}
          height={3}
          fill="var(--cutter-1)"
          fillOpacity={0.18}
          stroke="var(--cutter-1)"
          strokeWidth={0.08}
          strokeDasharray="0.25 0.15"
        />
        <circle cx={1.5} cy={1.5} r={0.5} fill="var(--paper)" stroke="var(--cutter-1)" strokeWidth={0.16} />
        <text
          x={1.5}
          y={1.7}
          textAnchor="middle"
          fontSize={0.6}
          fontFamily="var(--font-text)"
          fill="var(--ink)"
        >
          1
        </text>
      </g>
    </svg>
  )
}
