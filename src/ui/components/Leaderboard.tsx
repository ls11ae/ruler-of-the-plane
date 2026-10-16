import { useId, useMemo, useState } from 'react'
import { parseLucky, rankFor, stepLucky } from '../../core/leaderboard'
import { mulberry32, shuffled } from '../../core/random'
import { useT } from '../i18n'
import { de, type NicknameId } from '../i18n/de'
import { today, useBoard, useBooth, type Signature } from '../shell/booth'
import { Button } from './Button'
import styles from './Leaderboard.module.css'
import type { LeaderboardSubmission } from './ResultScreen'

const NAMES_SHOWN = 6
const NICKNAMES = Object.keys(de.nicknames) as NicknameId[]

const isNickname = (name: string): name is NicknameId => name in de.nicknames

/** "+" and "−" drawn in SVG (not every glyph is in Patrick Hand). */
function Sign({ plus }: { plus: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width={14} height={14} aria-hidden="true">
      <path
        d={plus ? 'M10 3v14M3 10h14' : 'M3 10h14'}
        stroke="currentColor"
        strokeWidth={2.8}
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Today's board for a submission, with a nickname picker if the score makes the board: the name
 * chosen last on this device first, then pages through all nicknames (in a shuffled order, so the
 * booth does not always offer the same ones first), and an optional lucky number 1–99.
 */
export function LeaderboardPanel({ submission }: { submission: LeaderboardSubmission }) {
  const t = useT()
  const luckyId = useId()
  const { board, spec, score, format } = submission
  const entries = useBoard(board, spec)
  const addScore = useBooth((s) => s.addScore)
  const remembered = useBooth((s) => s.me)
  const [me] = useState(() => (remembered && isNickname(remembered.name) ? remembered : undefined))
  const [state, setState] = useState<{ phase: 'pick' } | { phase: 'done'; at: number | null }>({
    phase: 'pick',
  })
  const [lucky, setLucky] = useState<number | undefined>(me?.number)
  const [luckyText, setLuckyText] = useState(me?.number === undefined ? '' : String(me.number))
  const [page, setPage] = useState(0)
  const [seed] = useState(() => Date.now())
  const others = useMemo(
    () => shuffled(NICKNAMES, mulberry32(seed)).filter((id) => id !== me?.name),
    [seed, me],
  )
  const pages = Math.ceil(others.length / NAMES_SHOWN)
  const choices = others.slice(page * NAMES_SHOWN, (page + 1) * NAMES_SHOWN)
  const qualifies = state.phase === 'pick' && rankFor(entries, spec, score, today()) !== null
  const label = (id: string, number?: number) =>
    `${isNickname(id) ? t.nicknames[id] : id}${number === undefined ? '' : ` ${number}`}`

  const pick = (name: NicknameId) => {
    const signature: Signature = lucky === undefined ? { name } : { name, number: lucky }
    const { rank, at } = addScore(board, spec, signature, score)
    setState({ phase: 'done', at: rank === null ? null : at })
  }
  const setNumber = (n: number | undefined) => {
    setLucky(n)
    setLuckyText(n === undefined ? '' : String(n))
  }

  return (
    <section className={styles.panel}>
      <h3>{t.leaderboard.title}</h3>
      {qualifies && (
        <>
          <div className={styles.pickRow}>
            <span>{t.leaderboard.pickName}</span>
            <span className={styles.lucky}>
              <label htmlFor={luckyId}>{t.leaderboard.lucky}</label>
              <Button
                small
                onClick={() => setNumber(stepLucky(lucky, -1))}
                aria-label={t.leaderboard.luckyLess}
              >
                <Sign plus={false} />
              </Button>
              <input
                id={luckyId}
                className={styles.luckyInput}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                autoComplete="off"
                placeholder={t.leaderboard.luckyNone}
                value={luckyText}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 2)
                  setLuckyText(digits)
                  setLucky(parseLucky(digits))
                }}
                onBlur={() => setNumber(lucky)}
              />
              <Button
                small
                onClick={() => setNumber(stepLucky(lucky, 1))}
                aria-label={t.leaderboard.luckyMore}
              >
                <Sign plus />
              </Button>
            </span>
          </div>
          <div className={styles.names}>
            {me && isNickname(me.name) && (
              <Button
                small
                variant="accent"
                data-testid="nickname"
                onClick={() => pick(me.name as NicknameId)}
                aria-label={t.leaderboard.again(label(me.name, lucky))}
              >
                {label(me.name, lucky)}
              </Button>
            )}
            {choices.map((id) => (
              <Button key={id} small data-testid="nickname" onClick={() => pick(id)}>
                {label(id, lucky)}
              </Button>
            ))}
            <Button small variant="dashed" onClick={() => setPage((p) => (p + 1) % pages)}>
              {t.leaderboard.otherNames}
              <span className={styles.page}>{t.leaderboard.page(page + 1, pages)}</span>
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
              <span className={styles.name}>{label(e.name, e.number)}</span>
              <span>{format(e.score)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
