import { Button } from '../../components/Button'
import { lastStep, nextLeash } from './challenge'
import styles from './Frechet.module.css'
import type { FrechetTexts } from './i18n.de'

/**
 * "Kürzere Leine" (proposed), below the numbers of a finished walk: the same walk again with a
 * shorter leash, in steps down to just above the shortest leash; a badge when that is done.
 */
export function ShorterLeash({
  leash,
  shortest,
  onTry,
  t,
}: {
  /** The leash of the walk just finished. */
  leash: number
  shortest: number
  onTry: (leash: number) => void
  t: FrechetTexts
}) {
  const next = nextLeash(leash, shortest)
  if (next === null) {
    return leash <= lastStep(shortest) + 1e-9 ? (
      <p className={styles.badge} data-testid="leash-badge">
        <strong>{t.challenge.badge}</strong> {t.challenge.done}
      </p>
    ) : null
  }
  return (
    <div className={styles.challenge}>
      <p>{t.challenge.offer(leash, next)}</p>
      <Button small onClick={() => onTry(next)} data-testid="shorter-leash">
        {t.challenge.button(next)}
      </Button>
    </div>
  )
}
