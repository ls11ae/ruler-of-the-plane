import type { ReactNode } from 'react'
import { PARK, WALKS, type WalkId } from '../../../core/games/frechet/levels'
import type { Vec2 } from '../../../core/geometry/types'
import { Button } from '../../components/Button'
import { Overlay } from '../../components/Overlay'
import { Stars } from '../../components/Stars'
import styles from './Frechet.module.css'
import type { FrechetTexts } from './i18n.de'
import { useProgress } from './store'

export type Mode = 'walk' | 'guess' | 'sandbox'

const poly = (pts: readonly Vec2[]) => pts.map(([x, y]) => `${x},${y}`).join(' ')

/** Choose a walk, or another mode: "Schätz die Leine" or drawing one's own paths. */
export function WalkPicker({
  t,
  mode,
  onPick,
  onClose,
  extra,
}: {
  t: FrechetTexts
  mode: Mode
  onPick: (walk: WalkId | null, mode: Mode) => void
  onClose: () => void
  /** More walks below the cards (the bonus set "Im Wald"). */
  extra?: ReactNode
}) {
  const { walk: current, best } = useProgress()
  const pickMode = mode === 'sandbox' ? 'walk' : mode
  return (
    <Overlay title={t.pickerTitle} onClose={onClose}>
      <div className={styles.picker}>
        <div className={styles.modes}>
          {(['walk', 'guess'] as const).map((m) => (
            <Button
              key={m}
              selected={pickMode === m}
              aria-pressed={pickMode === m}
              onClick={() => onPick(null, m)}
            >
              {t.modes[m]}
            </Button>
          ))}
          <Button variant="dashed" onClick={() => onPick(null, 'sandbox')}>
            {t.modes.sandbox}
          </Button>
        </div>
        <div className={styles.cards}>
          {WALKS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={styles.card}
              aria-current={w.id === current}
              onClick={() => onPick(w.id, pickMode)}
            >
              <svg viewBox={`${PARK.minX} ${PARK.minY} ${PARK.maxX} ${PARK.maxY}`} aria-hidden="true">
                <polyline
                  points={poly(w.person)}
                  fill="none"
                  stroke="var(--person)"
                  strokeWidth={0.9}
                  strokeLinejoin="round"
                />
                <polyline
                  points={poly(w.dog)}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth={0.5}
                  strokeDasharray="0.6 0.6"
                />
              </svg>
              <span className={styles.cardTitle}>{t.walks[w.id]}</span>
              <Stars count={best[w.id]?.stars ?? 0} size={18} />
              {best[w.id] && <span className={styles.muted}>{t.best(best[w.id]!.longest)}</span>}
            </button>
          ))}
        </div>
        {extra}
      </div>
    </Overlay>
  )
}
