import type { ReactNode } from 'react'
import { Button } from '../../components/Button'
import { Keycap } from '../../components/Keycap'
import { useHeldKeys } from '../../input/hooks'
import { CUTTER_COLOURS } from './art'
import { UNDO_KEYS } from './controls'
import { UndoIcon } from './DPad'
import type { LawnTexts } from './i18n.de'
import styles from './LawnMowing.module.css'

const KEY_ROWS = [
  [['KeyW'], ['KeyA', 'KeyS', 'KeyD']],
  [['ArrowUp'], ['ArrowLeft', 'ArrowDown', 'ArrowRight']],
] as const

export interface CutterStats {
  steps: number
  home: number
}

/**
 * The step back of a cutter: a button "↶ Zurück" with its key (Q, or Backspace for cutter 2), for the
 * mouse as well as the key (Kevin, 2026-10-19: the key alone with a small arrow was not recognised). It
 * does not take the focus, so the space bar stays "Feierabend".
 */
function UndoButton({
  cutter,
  disabled,
  onUndo,
  t,
}: {
  cutter: 0 | 1
  disabled: boolean
  onUndo: () => void
  t: LawnTexts
}) {
  const held = useHeldKeys()
  const code = UNDO_KEYS[cutter]![0]!
  return (
    <Button
      small
      className={styles.undoButton}
      disabled={disabled}
      data-testid={`undo-${cutter + 1}`}
      onPointerDown={(e) => e.preventDefault()}
      onClick={onUndo}
    >
      <UndoIcon size={18} />
      {t.undoButton}
      <Keycap code={code} pressed={held.includes(code)} />
    </Button>
  )
}

/**
 * Keycaps of a cutter, lit while held (as in the mockup: W over A S D, the arrows alike), and the button
 * for a step back to the left of the top row (where Q sits beside W on the keyboard).
 */
function Keys({ cutter, undo }: { cutter: 0 | 1; undo: ReactNode }) {
  const held = useHeldKeys()
  return (
    <span className={styles.keys}>
      {KEY_ROWS[cutter].map((row, r) => (
        <span key={r} className={styles.keyRow}>
          {r === 0 && undo}
          <span className={styles.keyRow} aria-hidden="true">
            {row.map((code) => (
              <Keycap key={code} code={code} pressed={held.includes(code)} />
            ))}
          </span>
        </span>
      ))}
    </span>
  )
}

/** A card per cutter: colour, steps so far and the way back, its keys and the step back (on a keyboard). */
export function CutterCard({
  index,
  stats,
  keys,
  canUndo,
  onUndo,
  t,
}: {
  index: 0 | 1
  stats: CutterStats
  keys: boolean
  canUndo: boolean
  /** Takes back a step of cutter `index`. */
  onUndo: (cutter: number) => void
  t: LawnTexts
}) {
  return (
    <div className={styles.card} data-testid={`steps-${index + 1}`}>
      <span className={styles.token} style={{ background: CUTTER_COLOURS[index] }} aria-hidden="true" />
      <span className={styles.cardText}>
        <span>{t.cutter(index + 1)}</span>
        <strong className={styles.big}>{t.steps(stats.steps)}</strong>
        <small>{t.home(stats.home)}</small>
      </span>
      {keys && (
        <Keys
          cutter={index}
          undo={<UndoButton cutter={index} disabled={!canUndo} onUndo={() => onUndo(index)} t={t} />}
        />
      )}
    </div>
  )
}

/** The score: the longest tour (with the way home) and the target. */
export function LongestCard({
  longest,
  single,
  target,
  t,
}: {
  longest: number
  single: boolean
  target: string
  t: LawnTexts
}) {
  return (
    <div className={styles.card} data-testid="longest">
      <span className={styles.cardText}>
        <span>{single ? t.longestTitleOne : t.longestTitle}</span>
        <strong className={styles.big}>{t.steps(longest)}</strong>
        <small>{target}</small>
      </span>
    </div>
  )
}

/** "Feierabend": a button (and the space bar on a keyboard). */
export function HomeCard({
  onHome,
  keys,
  urgent,
  disabled,
  t,
}: {
  onHome: () => void
  keys: boolean
  urgent: boolean
  disabled: boolean
  t: LawnTexts
}) {
  const held = useHeldKeys()
  return (
    <button
      type="button"
      className={[styles.card, styles.homeButton, urgent && styles.urgent].filter(Boolean).join(' ')}
      onClick={onHome}
      disabled={disabled}
    >
      {keys && <Keycap code="Space" pressed={held.includes('Space')} />}
      <span className={styles.cardText}>
        <strong>{t.homeButton}</strong>
        <small>{t.homeHint}</small>
      </span>
    </button>
  )
}

/** On a phone (one cutter): steps, the way back and the target in one compact block. */
export function PhoneStats({ stats, target, t }: { stats: CutterStats; target: string; t: LawnTexts }) {
  return (
    <div className={styles.phoneStats} data-testid="steps-1">
      <span className={styles.phoneLine}>
        <span className={styles.token} style={{ background: CUTTER_COLOURS[0] }} aria-hidden="true" />
        <strong className={styles.big}>{t.steps(stats.steps)}</strong>
        <small>{t.home(stats.home)}</small>
      </span>
      <small>{target}</small>
    </div>
  )
}
