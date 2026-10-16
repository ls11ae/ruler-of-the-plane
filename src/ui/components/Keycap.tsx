import { useT } from '../i18n'
import styles from './Keycap.module.css'
import { keyLabel } from './keyLabel'

const ARROW_ROTATION: Record<string, number> = { ArrowUp: 0, ArrowRight: 90, ArrowDown: 180, ArrowLeft: 270 }

/** Up arrow drawn in SVG (Patrick Hand has no arrow glyphs), rotated for the other directions. */
function Arrow({ rotate, label }: { rotate: number; label: string }) {
  return (
    <svg viewBox="0 0 20 20" className={styles.arrow} role="img" aria-label={label}>
      <g
        transform={`rotate(${rotate} 10 10)`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      >
        <path d="M10 17V4M4.5 9.5 10 4l5.5 5.5" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

/**
 * A keyboard key as in the mockup; `pressed` lights it up (key test, live hints). `label` overrides the
 * text derived from the code (e.g. the layout's own label of a physical key).
 */
export function Keycap({
  code,
  label: override,
  pressed = false,
}: {
  code: string
  label?: string
  pressed?: boolean
}) {
  const t = useT()
  const rotation = ARROW_ROTATION[code]
  const label = rotation === undefined ? (override ?? keyLabel(code, t.keys)) : ''
  const wide = code === 'Space' || label.length > 3
  return (
    <kbd
      className={[styles.keycap, pressed && styles.pressed, wide && styles.wide].filter(Boolean).join(' ')}
    >
      {rotation !== undefined ? <Arrow rotate={rotation} label={t.keys[code] ?? code} /> : label}
    </kbd>
  )
}
