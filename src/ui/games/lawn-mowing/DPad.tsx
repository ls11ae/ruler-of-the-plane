import { useState } from 'react'
import type { ScreenDirection } from './controls'
import type { LawnTexts } from './i18n.de'
import styles from './LawnMowing.module.css'

const ROTATE: Record<ScreenDirection, number> = { up: 0, right: 90, down: 180, left: 270 }

function Arrow({ direction }: { direction: ScreenDirection }) {
  return (
    <svg viewBox="0 0 20 20" width={30} height={30} aria-hidden="true">
      <g
        transform={`rotate(${ROTATE[direction]} 10 10)`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 17V4M4.5 9.5 10 4l5.5 5.5" />
      </g>
    </svg>
  )
}

/**
 * The direction pad for phones: holding a button steers cutter 1 like holding a key (same fixed rate).
 * Pointer capture keeps the hold while the finger slides a little.
 */
export function DPad({
  onHold,
  t,
}: {
  /** A direction pressed (`down`) or released. */
  onHold: (direction: ScreenDirection, down: boolean) => void
  t: LawnTexts
}) {
  const [held, setHeld] = useState<ScreenDirection | null>(null)
  const release = (direction: ScreenDirection) => {
    onHold(direction, false)
    setHeld((h) => (h === direction ? null : h))
  }
  return (
    <div className={styles.dpad} role="group" aria-label={t.cutter(1)}>
      {(['up', 'left', 'right', 'down'] as const).map((d) => (
        <button
          key={d}
          type="button"
          className={[styles.padButton, styles[d], held === d && styles.held].filter(Boolean).join(' ')}
          aria-label={t.pad[d]}
          data-testid={`pad-${d}`}
          onPointerDown={(e) => {
            e.preventDefault()
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {
              // Synthetic pointers have nothing to capture.
            }
            onHold(d, true)
            setHeld(d)
          }}
          onPointerUp={() => release(d)}
          onPointerCancel={() => release(d)}
          onLostPointerCapture={() => release(d)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Arrow direction={d} />
        </button>
      ))}
    </div>
  )
}
