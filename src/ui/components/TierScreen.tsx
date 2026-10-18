import { useEffect, useId, useRef, type ReactNode } from 'react'
import type { Tier } from '../../core/tiers'
import { useT } from '../i18n'
import type { SuggestedTier } from '../shell/tiers'
import { Button } from './Button'
import { GameHeader } from './GameHeader'
import type { KeyHint } from './HowToOverlay'
import { Keycap } from './Keycap'
import styles from './TierScreen.module.css'

const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z'

export interface TierChoice {
  tier: Tier
  /** What the tier is called in this game, e.g. "Kreuzungen" (optional). */
  name?: string
  /** One sentence on what is waiting there. */
  teaser: string
  /** Stars collected in the tier on this device, out of `max`; omitted where a game has none. */
  stars?: { got: number; max: number }
}

interface TierScreenProps {
  title: string
  subtitle?: string
  /** The rules, as in "So geht's": two or three sentences, an animation, the keys. */
  rules: { lines: readonly string[]; animation?: ReactNode; keys?: KeyHint[] }
  choices: readonly TierChoice[]
  /** The tier marked (and focused): the last one played here, or the staff's suggestion. */
  suggested: SuggestedTier
  /** "Weiterspielen", when there is progress: what it continues, e.g. "Kreuzungen 3 von 6". */
  resume?: { what: string; onResume: () => void }
  /** Choices that apply to every tier, above the cards (e.g. alone or together). */
  options?: ReactNode
  /** More ways in, beside "Weiterspielen" (e.g. two players without the computer). */
  more?: ReactNode
  onPick: (tier: Tier) => void
}

/** One to three bars: how hard, not only by the word (colour is never the only cue). */
function Bars({ level }: { level: number }) {
  return (
    <svg viewBox="0 0 30 24" className={styles.bars} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={2 + i * 9.5}
          y={16 - i * 6}
          width={7}
          height={6 + i * 6}
          rx={1.5}
          fill={i < level ? 'var(--ink)' : 'none'}
          stroke="var(--ink)"
          strokeWidth={1.6}
          strokeDasharray={i < level ? undefined : '2.5 2'}
        />
      ))}
    </svg>
  )
}

/**
 * The first screen of every game: the rules in a few sentences with their animation, then "Leicht",
 * "Mittel" and "Schwer" as three big cards with a teaser and the stars collected so far, and
 * "Weiterspielen" when there is progress. One click on a card starts that tier, so the rules need no
 * dialog of their own: from the start map, one click to playing.
 */
export function TierScreen(props: TierScreenProps) {
  const t = useT()
  const { rules, choices, suggested, resume } = props
  const cards = useRef<HTMLDivElement>(null)
  const heading = useId()

  useEffect(() => {
    cards.current?.querySelector<HTMLElement>('[data-suggested]')?.focus({ preventScroll: true })
  }, [])

  return (
    <div className={styles.screen} data-testid="tier-screen">
      <GameHeader title={props.title} subtitle={props.subtitle} />
      <main className={rules.animation ? styles.main : `${styles.main} ${styles.noAnimation}`}>
        {/* The rules' paper card: behind animation and text on a laptop, behind the text on a phone. */}
        <div className={styles.rulesCard} aria-hidden="true" />
        {rules.animation && <div className={styles.animation}>{rules.animation}</div>}
        <section className={styles.text} aria-label={t.tiers.rules}>
          {rules.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {rules.keys && rules.keys.length > 0 && (
            <ul className={styles.keys}>
              {rules.keys.map((k, i) => (
                <li key={i}>
                  <span className={styles.caps}>
                    {k.codes.map((c) => (
                      <Keycap key={c} code={c} />
                    ))}
                  </span>
                  <span>{k.label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={styles.choose} aria-labelledby={heading}>
          <div className={styles.chooseHead}>
            <h2 id={heading}>{t.tiers.choose}</h2>
            {props.options}
          </div>
          <div ref={cards} className={styles.cards}>
            {choices.map((c, i) => {
              const marked = suggested.reason !== null && suggested.tier === c.tier
              const focus = suggested.tier === c.tier
              return (
                <button
                  key={c.tier}
                  type="button"
                  className={styles.card}
                  data-tier={c.tier}
                  data-suggested={focus || undefined}
                  aria-current={marked || undefined}
                  onClick={() => props.onPick(c.tier)}
                >
                  <span className={styles.cardHead}>
                    <Bars level={i + 1} />
                    <span className={styles.tierName}>{t.tiers.names[c.tier]}</span>
                  </span>
                  {c.name && <span className={styles.setName}>{c.name}</span>}
                  <span className={styles.teaser}>{c.teaser}</span>
                  {c.stars && (
                    <span className={styles.stars}>
                      <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
                        <path
                          d={STAR}
                          fill={c.stars.got > 0 ? 'var(--light)' : 'none'}
                          stroke="var(--ink)"
                          strokeWidth={1.6}
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span aria-hidden="true">
                        {c.stars.got} / {c.stars.max}
                      </span>
                      <span className="visually-hidden">{t.tiers.stars(c.stars.got, c.stars.max)}</span>
                    </span>
                  )}
                  {marked && (
                    <span className={styles.badge}>
                      {suggested.reason === 'last' ? t.tiers.last : t.tiers.staff}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {(resume || props.more) && (
            <div className={styles.more}>
              {props.more}
              {resume && (
                <Button variant="accent" onClick={resume.onResume}>
                  {t.tiers.resume}: {resume.what}
                </Button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
