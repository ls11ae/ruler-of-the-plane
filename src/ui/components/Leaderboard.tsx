import { useMemo, useState } from 'react'
import { rankFor } from '../../core/leaderboard'
import { mulberry32, shuffled } from '../../core/random'
import { useT } from '../i18n'
import { de, type NicknameId } from '../i18n/de'
import { today, useBoard, useBooth } from '../shell/booth'
import { Button } from './Button'
import styles from './Leaderboard.module.css'
import type { LeaderboardSubmission } from './ResultScreen'

const NAMES_SHOWN = 6
const NICKNAMES = Object.keys(de.nicknames) as NicknameId[]

/** Today's board for a submission, with a nickname picker if the score makes the board. */
export function LeaderboardPanel({ submission }: { submission: LeaderboardSubmission }) {
  const t = useT()
  const { board, spec, score, format } = submission
  const entries = useBoard(board, spec)
  const addScore = useBooth((s) => s.addScore)
  const [state, setState] = useState<{ phase: 'pick' } | { phase: 'done'; at: number | null }>({
    phase: 'pick',
  })
  const [round, setRound] = useState(0)
  const [seed] = useState(() => Date.now())
  const choices = useMemo(
    () => shuffled(NICKNAMES, mulberry32(seed + round)).slice(0, NAMES_SHOWN),
    [seed, round],
  )
  const qualifies = state.phase === 'pick' && rankFor(entries, spec, score, today()) !== null

  const pick = (name: NicknameId) => {
    const { rank, at } = addScore(board, spec, name, score)
    setState({ phase: 'done', at: rank === null ? null : at })
  }

  return (
    <section className={styles.panel}>
      <h3>{t.leaderboard.title}</h3>
      {qualifies && (
        <>
          <span>{t.leaderboard.pickName}</span>
          <div className={styles.names}>
            {choices.map((id) => (
              <Button key={id} small onClick={() => pick(id)}>
                {t.nicknames[id]}
              </Button>
            ))}
            <Button small variant="dashed" onClick={() => setRound((r) => r + 1)}>
              {t.leaderboard.otherNames}
            </Button>
            <Button small variant="dashed" onClick={() => setState({ phase: 'done', at: null })}>
              {t.leaderboard.skip}
            </Button>
          </div>
        </>
      )}
      {entries.length === 0 ? (
        <span className={styles.empty}>{t.leaderboard.empty}</span>
      ) : (
        <ol className={styles.list}>
          {entries.map((e, i) => (
            <li
              key={`${e.at}-${e.name}`}
              className={state.phase === 'done' && e.at === state.at ? styles.mine : undefined}
            >
              <span className={styles.rank}>{i + 1}.</span>
              <span className={styles.name}>{t.nicknames[e.name as NicknameId] ?? e.name}</span>
              <span>{format(e.score)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
