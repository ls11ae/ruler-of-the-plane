import { useRef } from 'react'
import { Keycap } from '../../components/Keycap'
import { art } from './art'
import styles from './Frechet.module.css'
import { KEYS, type Walker } from './helpers'
import type { FrechetTexts } from './i18n.de'

/**
 * A button that acts like a key while pressed: mouse, pen or a finger (several fingers on several
 * buttons at once). Pointer capture keeps it pressed while the finger slides off.
 */
function HoldButton({
  walker,
  label,
  aria,
  held,
  showKey,
  onHold,
}: {
  walker: Walker
  label: string
  aria: string
  held: boolean
  /** The keycap (on a laptop; phones have no keys). */
  showKey: boolean
  onHold: (walker: Walker, down: boolean) => void
}) {
  const pointers = useRef(new Set<number>())
  const release = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0) onHold(walker, false)
  }
  return (
    <button
      type="button"
      className={styles.hold}
      data-held={held || undefined}
      aria-pressed={held}
      aria-label={aria}
      data-testid={`hold-${walker}`}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        e.preventDefault()
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          // A synthetic pointer (tests): works without capture.
        }
        pointers.current.add(e.pointerId)
        onHold(walker, true)
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {showKey && <Keycap code={KEYS[walker][0]!} pressed={held} />}
      <img src={walker === 'person' ? art.person : art.dog} alt="" />
      <span>{label}</span>
    </button>
  )
}

/**
 * The controls below the park: "A Mensch geht" and "L Hund läuft". On a laptop they show the keys
 * (and can be held with the mouse); on touch screens they are two large hold buttons, left and right.
 */
export function HoldControls({
  t,
  touch,
  held,
  onHold,
}: {
  t: FrechetTexts
  touch: boolean
  held: Record<Walker, boolean>
  onHold: (walker: Walker, down: boolean) => void
}) {
  return (
    <footer className={[styles.controls, touch && styles.touch].filter(Boolean).join(' ')}>
      <HoldButton
        walker="person"
        label={touch ? t.person : t.personWalks}
        aria={t.holdLabel(t.person)}
        held={held.person}
        showKey={!touch}
        onHold={onHold}
      />
      {!touch && <span className={styles.both}>{t.bothWalk}</span>}
      <HoldButton
        walker="dog"
        label={touch ? t.dog : t.dogRuns}
        aria={t.holdLabel(t.dog)}
        held={held.dog}
        showKey={!touch}
        onHold={onHold}
      />
    </footer>
  )
}
