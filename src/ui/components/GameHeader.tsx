import type { ReactNode } from 'react'
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

/** Top bar of every game screen: "‹ Karte", title, live status and buttons (see the mockup). */
export function GameHeader({ title, subtitle, status, actions }: GameHeaderProps) {
  const t = useT()
  return (
    <header className={styles.header}>
      <LinkButton href={hrefFor({ name: 'start' })} aria-label={t.game.backLabel}>
        {t.game.back}
      </LinkButton>
      <div className={styles.titles}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
      <div className={styles.status}>{status}</div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}
