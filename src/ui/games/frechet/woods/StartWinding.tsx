import { START_WINDINGS } from '../../../../core/games/frechet/woods/shapes'
import { Button } from '../../../components/Button'
import type { FrechetTexts } from '../i18n.de'
import type { WoodsTexts } from './i18n.de'
import woods from './Woods.module.css'

const MIN = START_WINDINGS[0]
const MAX = START_WINDINGS[START_WINDINGS.length - 1]!

/** A round arrow (Patrick Hand has no arrow glyphs): clockwise on screen, or anticlockwise. */
export function TurnArrow({ clockwise }: { clockwise: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
      <g transform={clockwise ? undefined : 'translate(24 0) scale(-1 1)'}>
        <path
          d="M12 4a8 8 0 1 1-7.4 5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
        />
        <path
          d="M12 4 8.5 1.5M12 4 8.8 7"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}

/**
 * The free start leash (an expert puzzle): before the first step the player chooses how the leash
 * lies at the gate, wound up to three times round the gate post either way, and sees how long the
 * leash is then.
 */
export function StartWinding({
  winding,
  length,
  onChange,
  t,
  w,
}: {
  winding: number
  /** The leash at the gate, around the post (metres). */
  length: number
  onChange: (winding: number) => void
  t: FrechetTexts
  w: WoodsTexts
}) {
  return (
    <div className={woods.startPanel} role="group" aria-label={w.start.label} data-testid="start-winding">
      <strong>{w.start.label}</strong>
      <div className={woods.startRow}>
        <Button
          small
          onClick={() => onChange(Math.max(MIN, winding - 1))}
          disabled={winding <= MIN}
          aria-label={w.start.anticlockwise}
          title={w.start.anticlockwise}
        >
          <TurnArrow clockwise={false} />
        </Button>
        <span className={woods.startValue} data-testid="start-value">
          {w.start.value(winding)}
          <small>{w.start.length(t.metres(length))}</small>
        </span>
        <Button
          small
          onClick={() => onChange(Math.min(MAX, winding + 1))}
          disabled={winding >= MAX}
          aria-label={w.start.clockwise}
          title={w.start.clockwise}
        >
          <TurnArrow clockwise />
        </Button>
      </div>
    </div>
  )
}
