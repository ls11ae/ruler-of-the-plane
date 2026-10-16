import { visibilityPolygon } from '../../../core/games/art-gallery/visibility'
import type { Vec2 } from '../../../core/geometry/types'
import styles from './Animations.module.css'
import { ringPath } from './paths'

/** An L-shaped room (y down): one torch lights most of it, the second one the hidden arm. */
const ROOM: Vec2[] = [
  [20, 20],
  [200, 20],
  [200, 92],
  [282, 92],
  [282, 152],
  [20, 152],
]
const TORCH_1: Vec2 = [62, 58]
const TORCH_2: Vec2 = [250, 128]
const room = { outer: ROOM, holes: [] }
const LIGHT_1 = visibilityPolygon(room, TORCH_1)
const LIGHT_2 = visibilityPolygon(room, TORCH_2)

function MiniTorch({ at, className }: { at: Vec2; className: string | undefined }) {
  return (
    <g className={className}>
      <circle cx={at[0]} cy={at[1]} r={9} fill="var(--light)" stroke="var(--ink)" strokeWidth={2} />
      <path
        d={`M${at[0]},${at[1] - 5.5} c3,3 4.5,5 3.5,7.5 c-1,2.5 -6,2.5 -7,0 c-0.8,-2 1,-3.6 2,-5 c0.6,1.4 1,2 1.5,2.4 c0.6,-1.6 0.4,-3.2 0,-4.9 z`}
        fill="#f07d1f"
        stroke="var(--ink)"
        strokeWidth={0.8}
      />
    </g>
  )
}

/** "So geht's": a dark room, a torch lights what it sees, a second torch lights the rest: 100 %. */
export function HowToAnimation({ doneLabel }: { doneLabel: string }) {
  return (
    <svg viewBox="0 0 302 172" className={`${styles.svg} ${styles.loop}`} role="img" aria-label={doneLabel}>
      <path d={ringPath(ROOM)} fill="var(--dark)" fillOpacity={0.85} />
      <path className={styles.light1} d={ringPath(LIGHT_1)} fill="#ffe7a0" />
      <path className={styles.light2} d={ringPath(LIGHT_2)} fill="#ffe7a0" />
      <path
        d={ringPath(ROOM)}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={4}
        strokeLinejoin="round"
        filter="url(#ink)"
      />
      <MiniTorch at={TORCH_1} className={styles.torch1} />
      <MiniTorch at={TORCH_2} className={styles.torch2} />
      <g className={styles.done}>
        <rect
          x={86}
          y={98}
          width={74}
          height={34}
          rx={8}
          fill="var(--paper)"
          stroke="var(--ink)"
          strokeWidth={2}
        />
        <text
          x={123}
          y={122}
          textAnchor="middle"
          fontSize={20}
          fill="var(--ink)"
          fontFamily="var(--font-text)"
        >
          100 %
        </text>
      </g>
    </svg>
  )
}
