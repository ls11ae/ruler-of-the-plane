import { useContext, type ReactNode } from 'react'
import type { BoardSpec } from '../../core/leaderboard'
import { useT } from '../i18n'
import { Button } from './Button'
import { LeaderboardPanel } from './Leaderboard'
import { NextLabel } from './nextLabel'
import { Overlay } from './Overlay'
import styles from './Result.module.css'
import { Stars } from './Stars'

export interface LeaderboardSubmission {
  /** Board key, e.g. `art-gallery/agLevel4_8`. */
  board: string
  spec: BoardSpec
  score: number
  /** How a score is shown, e.g. `(s) => \`${s} Fackeln\``. */
  format: (score: number) => string
}

interface ResultScreenProps {
  outcome: 'won' | 'lost'
  /** Replaces the title of the outcome, e.g. "Unentschieden!" or "Blau gewinnt!" with two players. */
  title?: ReactNode
  /** 0–3 stars, if the game gives stars. */
  stars?: number
  record?: boolean
  /** Numbers of this round (score, steps, time). */
  stats?: ReactNode
  /** "Was steckt dahinter?": three sentences. */
  explanation: ReactNode
  /** Animation of how the computer solves it (or of the guarantee). */
  animation?: ReactNode
  leaderboard?: LeaderboardSubmission
  onAgain: () => void
  onNext?: () => void
  onTheory?: () => void
  onClose?: () => void
}

/**
 * End of a round: outcome and stars, "Was steckt dahinter?" with an animation, buttons, leaderboard.
 * On a laptop (1280 × 800, 1366 × 768) it fits without scrolling: outcome and leaderboard on the left,
 * the explanation on the right, its animation as tall as the screen allows.
 */
export function ResultScreen(props: ResultScreenProps) {
  const t = useT()
  const nextLabel = useContext(NextLabel)
  const { outcome, stars, record, stats, explanation, animation, leaderboard } = props
  return (
    <Overlay
      title={props.title ?? (outcome === 'won' ? t.result.won : t.result.lost)}
      onClose={props.onClose}
      className={styles.card}
      actions={
        <>
          {props.onTheory && <Button onClick={props.onTheory}>{t.game.theory}</Button>}
          <Button onClick={props.onAgain} data-autofocus={props.onNext ? undefined : true}>
            {t.game.again}
          </Button>
          {props.onNext && (
            <Button variant="accent" onClick={props.onNext} data-autofocus>
              {nextLabel ?? t.game.next}
            </Button>
          )}
        </>
      }
    >
      <div className={styles.result}>
        <div className={styles.outcome}>
          {stars !== undefined && <Stars count={stars} size={44} />}
          {record && <span className={styles.record}>{t.result.record}</span>}
          {stats && <div className={styles.stats}>{stats}</div>}
        </div>
        <section className={styles.behind}>
          <h3>{t.result.behind}</h3>
          {animation && <div className={styles.resultAnimation}>{animation}</div>}
          <p>{explanation}</p>
        </section>
        {leaderboard && (
          <div className={styles.board}>
            <LeaderboardPanel submission={leaderboard} />
          </div>
        )}
      </div>
    </Overlay>
  )
}
