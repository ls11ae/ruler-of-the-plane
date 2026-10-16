import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import { hrefFor } from '../shell/router'
import { LinkButton } from './Button'
import styles from './GameHeader.module.css'

interface GameHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Live status in the middle (counters, progress bar). */
  status?: ReactNode
  /** Buttons on the right ("So geht's", "Neu", "Theorie"). */
  actions?: ReactNode
}

/** Natural width of the header's parts in one line, from their unshrunk content. */
function oneLineWidth(header: HTMLElement): number {
  const style = getComputedStyle(header)
  const gap = parseFloat(style.columnGap) || 0
  let width = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
  let parts = 0
  for (const part of header.querySelectorAll<HTMLElement>(':scope > [data-part]')) {
    let w = 0
    if (part.dataset.part === 'titles') {
      for (const line of part.children) w = Math.max(w, (line as HTMLElement).scrollWidth)
    } else if (part.dataset.part === 'actions') {
      const buttons = [...part.children] as HTMLElement[]
      w = buttons.reduce((sum, b) => sum + b.offsetWidth, 0)
      w += Math.max(0, buttons.length - 1) * (parseFloat(getComputedStyle(part).columnGap) || 0)
    } else {
      w = (part.firstElementChild as HTMLElement | null)?.offsetWidth ?? part.offsetWidth
    }
    if (w > 0) {
      width += w
      parts++
    }
  }
  return width + Math.max(0, parts - 1) * gap
}

/**
 * Top bar of every game screen: "‹ Karte", title, live status and buttons (see the mockup). When the
 * parts do not fit in one line (narrow windows, long statuses), the status moves to a line of its own
 * and the buttons wrap, instead of drawing over each other.
 */
export function GameHeader({ title, subtitle, status, actions }: GameHeaderProps) {
  const t = useT()
  const header = useRef<HTMLElement>(null)
  const [wrapped, setWrapped] = useState(false)

  useLayoutEffect(() => {
    const el = header.current
    if (!el) return
    const measure = () => setWrapped(oneLineWidth(el) > el.clientWidth + 0.5)
    measure()
    // Re-measure when the window or a part's content changes size (e.g. a counter gets a digit).
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    for (const part of el.querySelectorAll(':scope > [data-part] > *')) observer.observe(part)
    return () => observer.disconnect()
  }, [status, actions, title, subtitle])

  return (
    <header ref={header} className={styles.header} data-wrapped={wrapped || undefined}>
      <LinkButton
        href={hrefFor({ name: 'start' })}
        aria-label={t.game.backLabel}
        className={styles.back}
        data-part="back"
      >
        {t.game.back}
      </LinkButton>
      <div className={styles.titles} data-part="titles">
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
      <div className={styles.status} data-part="status">
        {status && (
          <div className={styles.statusContent} data-testid="header-status">
            {status}
          </div>
        )}
      </div>
      {actions && (
        <div className={styles.actions} data-part="actions">
          {actions}
        </div>
      )}
    </header>
  )
}
