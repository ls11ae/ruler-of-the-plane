import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useT } from '../i18n'
import { Button } from './Button'
import styles from './Overlay.module.css'

interface OverlayProps {
  title: ReactNode
  children: ReactNode
  /** Buttons at the bottom right. */
  actions?: ReactNode
  /** Closing by Escape, the × button or a click on the backdrop; omit for overlays that must be answered. */
  onClose?: () => void
  className?: string
}

/** A modal paper card over a dimmed screen. The first button (or the card) gets the focus. */
export function Overlay({ title, children, actions, onClose, className }: OverlayProps) {
  const t = useT()
  const titleId = useId()
  const card = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = card.current
    const first = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el
    first?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (!onClose) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className={styles.backdrop}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[styles.card, className].filter(Boolean).join(' ')}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {onClose && (
          <Button small className={styles.close} onClick={onClose} aria-label={t.game.close}>
            ×
          </Button>
        )}
        {children}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  )
}
