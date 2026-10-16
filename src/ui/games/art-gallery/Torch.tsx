import type { Vec2 } from '../../../core/geometry/types'
import { useBoard } from '../../components/boardContext'
import { torchToken } from './art'

/** Flame in a unit box centred on the origin (drawn in SVG; the fonts have no flame glyph). */
const FLAME =
  'M0,-0.62 C0.22,-0.34 0.42,-0.14 0.38,0.14 C0.35,0.4 0.17,0.56 0,0.56 C-0.2,0.56 -0.38,0.4 -0.38,0.14 C-0.38,-0.06 -0.24,-0.18 -0.14,-0.34 C-0.06,-0.18 0.02,-0.12 0.06,-0.04 C0.12,-0.24 0.04,-0.44 0,-0.62 Z'

export type TorchState = 'idle' | 'active' | 'invalid' | 'trash'

/** Share of the token image covered by its disc (measured: 85 of 128 px). */
const TOKEN_DISC = 0.664

/** A torch: the yellow Scribble token with a flame, upright also on a turned board. */
export function Torch({ at, radius, state = 'idle' }: { at: Vec2; radius: number; state?: TorchState }) {
  const board = useBoard()
  const [x, y] = at
  const r = radius
  const faded = state === 'invalid' || state === 'trash'
  return (
    <g transform={board.upright(x, y)} opacity={faded ? 0.55 : 1} pointerEvents="none">
      {state !== 'idle' && (
        <circle
          cx={x}
          cy={y}
          r={r * 1.35}
          fill="none"
          stroke={faded ? 'var(--warn)' : 'var(--ink)'}
          strokeWidth={r * 0.12}
          strokeDasharray={faded ? `${r * 0.3} ${r * 0.2}` : undefined}
        />
      )}
      {/* The token's disc fills about two thirds of its image: scale so the disc has radius r. */}
      <image
        href={torchToken}
        x={x - r / TOKEN_DISC}
        y={y - r / TOKEN_DISC}
        width={(2 * r) / TOKEN_DISC}
        height={(2 * r) / TOKEN_DISC}
      />
      <g transform={`translate(${x} ${y + r * 0.04}) scale(${r * 0.8})`}>
        <path d={FLAME} fill="#f07d1f" stroke="var(--ink)" strokeWidth={0.06} strokeLinejoin="round" />
        <path d={FLAME} transform="translate(0 0.18) scale(0.5)" fill="#ffd84a" />
      </g>
    </g>
  )
}
