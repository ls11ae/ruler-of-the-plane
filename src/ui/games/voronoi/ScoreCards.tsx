import type { Player, Score } from '../../../core/games/voronoi/rules'
import type { VoronoiTexts } from './i18n.de'
import { PLAYER_COLOURS } from './drawing'
import styles from './Voronoi.module.css'

/** The two players' points (as in the mockup): name, total, land and bonus; the player to move is marked. */
export function ScoreCards({
  scores,
  names,
  active,
  t,
}: {
  scores: readonly [Score, Score]
  names: readonly [string, string]
  active: Player | null
  t: VoronoiTexts
}) {
  return (
    <div className={styles.scores}>
      {([0, 1] as const).map((p) => {
        const s = scores[p]
        const bonus = t.bonus(s.bonus, s.cities, s.mines)
        return (
          <div
            key={p}
            className={[styles.scoreCard, active === p && styles.active].filter(Boolean).join(' ')}
            data-testid={`score-${p}`}
            aria-label={t.scoreLabel(names[p], s.total)}
            aria-current={active === p || undefined}
          >
            <span className={styles.playerDot} style={{ background: PLAYER_COLOURS[p] }} aria-hidden="true" />
            <span className={styles.scoreMain}>
              <span className={styles.scoreName}>{names[p]}</span>
              <span className={styles.scoreTotal}>{s.total}</span>
            </span>
            <span className={styles.scoreParts} aria-hidden="true">
              <span>{t.land(Math.round(s.land))}</span>
              {bonus && <span>{bonus}</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}
