import { useEffect, useState } from 'react'
import { cartography } from '../art/cartography'
import { VersusCounter } from '../components/VersusCounter'
import { GAME_IDS } from '../games/registry'
import { useT } from '../i18n'
import styles from './AttractScreen.module.css'
import { useGameStates } from './places'
import { useUi } from './ui'

const TEASER_MS = 3500

/**
 * Kiosk attract screen after 90 s without input: title, rotating game teasers, the "Mensch gegen
 * Maschine" tally. Any click, tap or key leads to the start map (on click, not on pointerdown, so the
 * click does not land on the map below).
 */
export function AttractScreen() {
  const t = useT()
  const hide = useUi((s) => s.hideAttract)
  const states = useGameStates()
  const open = GAME_IDS.filter((id) => states[id] === 'open')
  const teasers = open.length ? open : GAME_IDS
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((i) => i + 1), TEASER_MS)
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      hide()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [hide])

  const game = teasers[index % teasers.length]!
  return (
    <div className={styles.screen} role="dialog" aria-label={t.start.title} onClick={hide}>
      <img className={styles.compass} src={cartography.compass} alt="" draggable={false} />
      <h1 className={styles.title}>{t.start.title}</h1>
      <div className={styles.invite}>{t.attract.invite}</div>
      <div key={index} className={styles.teaser}>
        <strong>{t.places[game].name}</strong>
        <br />
        {t.places[game].tagline}
      </div>
      <div className={styles.prompt}>{t.attract.prompt}</div>
      <VersusCounter className={styles.versus} />
    </div>
  )
}
