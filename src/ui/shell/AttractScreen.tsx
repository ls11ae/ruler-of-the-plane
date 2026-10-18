import { Component, lazy, Suspense, useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { cartography } from '../art/cartography'
import { VersusCounter } from '../components/VersusCounter'
import { attractLoader, GAME_IDS, type AttractProps, type GameId } from '../games/registry'
import { useT } from '../i18n'
import styles from './AttractScreen.module.css'
import { useGameStates } from './places'
import { useUi } from './ui'

/** A demo that does not call `onDone` is cut off after this long. */
const MAX_DEMO_MS = 40_000
/** A game without a demo (or with a failed one) is shown this long, with its name only. */
const NO_DEMO_MS = 6_000

/** The games' attract demos (optional `attract.tsx`), loaded on demand. */
const DEMOS = new Map<GameId, (props: AttractProps) => ReactElement>(
  GAME_IDS.flatMap((id) => {
    const load = attractLoader(id)
    if (!load) return []
    const Demo = lazy(load)
    return [[id, (props: AttractProps) => <Demo {...props} />] as const]
  }),
)

/** A demo that fails just disappears; the attract screen moves on to the next game. */
class Quiet extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override componentDidCatch() {
    this.props.onFail()
  }
  override render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * Kiosk attract screen after 90 s without input: the games' demos in turn (each tells its story in
 * about 20–30 s), with the game's name, "Komm spielen!" and the "Mensch gegen Maschine" tally below.
 * Any click, tap or key leads to the start map (on click, not on pointerdown, so the click does not
 * land on the map below).
 */
export function AttractScreen() {
  const t = useT()
  const hide = useUi((s) => s.hideAttract)
  const states = useGameStates()
  const open = GAME_IDS.filter((id) => states[id] === 'open')
  const shown = open.length ? open : GAME_IDS
  const [slot, setSlot] = useState(0)
  const [failed, setFailed] = useState<number | null>(null)
  const game = shown[slot % shown.length]!
  const round = Math.floor(slot / shown.length)
  const demo = states[game] === 'open' && failed !== slot ? DEMOS.get(game) : undefined
  // Moves on from this slot only (a late call of an earlier demo changes nothing).
  const done = (from: number) => () => setSlot((s) => (s === from ? s + 1 : s))

  useEffect(() => {
    const timer = window.setTimeout(done(slot), demo ? MAX_DEMO_MS : NO_DEMO_MS)
    return () => window.clearTimeout(timer)
  }, [slot, demo])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      hide()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hide])

  return (
    <div className={styles.screen} role="dialog" aria-label={t.start.title} onClick={hide}>
      <div className={styles.stage} aria-hidden="true" data-demo={game} data-slot={slot}>
        {demo ? (
          <Quiet key={slot} onFail={() => setFailed(slot)}>
            <Suspense fallback={null}>{demo({ round, onDone: done(slot) })}</Suspense>
          </Quiet>
        ) : (
          <img className={styles.bigCompass} src={cartography.compass} alt="" draggable={false} />
        )}
      </div>
      <div className={styles.band}>
        <img className={styles.compass} src={cartography.compass} alt="" draggable={false} />
        <div className={styles.names}>
          <h1 className={styles.title}>{t.start.title}</h1>
          <div key={slot} className={styles.game}>
            <strong>{t.places[game].name}</strong>
            <span>{t.places[game].tagline}</span>
          </div>
        </div>
        <div className={styles.call}>
          <div className={styles.come}>{t.attract.come}</div>
          <div className={styles.prompt}>{t.attract.prompt}</div>
        </div>
        <VersusCounter className={styles.versus} />
      </div>
    </div>
  )
}
