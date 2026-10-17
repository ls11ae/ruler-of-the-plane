import { PARK, type Tier } from '../../../../core/games/frechet/levels'
import { WOODS_BY_TIER, WOODS_SHAPES, type WoodsId } from '../../../../core/games/frechet/woods/shapes'
import type { Vec2 } from '../../../../core/geometry/types'
import { Stars } from '../../../components/Stars'
import styles from '../Frechet.module.css'
import type { FrechetTexts } from '../i18n.de'
import type { WoodsTexts } from './i18n.de'
import { useWoodsProgress } from './store'
import woods from './Woods.module.css'

const poly = (pts: readonly Vec2[]) => pts.map(([x, y]) => `${x},${y}`).join(' ')

/** The walks "Im Wald" of a tier in the picker of walks: one card per walk, with its trees. */
export function WoodsCards({
  t,
  w,
  tier,
  current,
  onPick,
}: {
  t: FrechetTexts
  w: WoodsTexts
  tier: Tier
  current: WoodsId | null
  onPick: (walk: WoodsId) => void
}) {
  const best = useWoodsProgress((s) => s.best)
  return (
    <section className={woods.section} aria-label={w.setTitle}>
      <h3>{w.setTitle}</h3>
      <p className={styles.muted}>{tier === 'easy' ? w.setIntro : w.setIntroHarder}</p>
      <div className={styles.cards}>
        {WOODS_SHAPES.filter((walk) => WOODS_BY_TIER[tier].includes(walk.id)).map((walk) => (
          <button
            key={walk.id}
            type="button"
            className={styles.card}
            aria-current={walk.id === current}
            onClick={() => onPick(walk.id)}
          >
            <svg viewBox={`${PARK.minX} ${PARK.minY} ${PARK.maxX} ${PARK.maxY}`} aria-hidden="true">
              {walk.trunks.map((tr, i) => (
                <circle key={i} cx={tr.at[0]} cy={tr.at[1]} r={1.1} fill="#6e5236" />
              ))}
              <polyline
                points={poly(walk.person)}
                fill="none"
                stroke="var(--person)"
                strokeWidth={0.9}
                strokeLinejoin="round"
              />
              <polyline
                points={poly(walk.dog)}
                fill="none"
                stroke="var(--ink)"
                strokeWidth={0.5}
                strokeDasharray="0.6 0.6"
              />
            </svg>
            <span className={styles.cardTitle}>{w.walks[walk.id]}</span>
            <Stars count={best[walk.id]?.stars ?? 0} size={18} />
            {best[walk.id] && <span className={styles.muted}>{t.best(best[walk.id]!.longest)}</span>}
          </button>
        ))}
      </div>
    </section>
  )
}
