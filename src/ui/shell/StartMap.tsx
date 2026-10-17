import { useState, type CSSProperties } from 'react'
import { cartography } from '../art/cartography'
import { Button } from '../components/Button'
import { GAME_IDS } from '../games/registry'
import { useT } from '../i18n'
import { usePointerGesture } from '../input/hooks'
import { MapArt } from './MapArt'
import { OLD_VERSION_URL, tspBoardsUrl, useGameStates } from './places'
import { MAP_LAYOUTS, type MapLayout, type PlaceId } from './mapLayout'
import { hrefFor } from './router'
import { useSettings } from './settings'
import styles from './StartMap.module.css'
import { useUi } from './ui'
import { useFullscreen } from './useFullscreen'
import { useLayout } from './useLayout'

/** Hold the compass this long to open the staff menu. */
const STAFF_LONG_PRESS_MS = 3000

function at(layout: MapLayout, [x, y]: readonly [number, number]): CSSProperties {
  return { left: `${(x / layout.width) * 100}%`, top: `${(y / layout.height) * 100}%` }
}

function Compass({ layout }: { layout: MapLayout }) {
  const openStaff = useUi((s) => s.openStaff)
  const [spin, setSpin] = useState(0)
  const gesture = usePointerGesture(
    { onTap: () => setSpin((n) => n + 1), onLongPress: openStaff },
    { dragThreshold: 20, longPressMs: STAFF_LONG_PRESS_MS },
  )
  const size = `${(layout.compass.size / layout.width) * 100}%`
  return (
    <button
      key={spin}
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      className={`${styles.anchored} ${styles.compass} ${spin ? styles.spin : ''}`}
      style={{ ...at(layout, layout.compass.at), width: size, aspectRatio: '1' }}
      onContextMenu={(e) => e.preventDefault()}
      {...gesture}
    >
      <img src={cartography.compass} alt="" draggable={false} />
    </button>
  )
}

/** The start screen: a parchment map of the kingdom with one labelled place per game. */
export function StartMap() {
  const t = useT()
  const layoutName = useLayout()
  const layout = MAP_LAYOUTS[layoutName]
  const states = useGameStates()
  const fullscreen = useFullscreen()
  const language = useSettings((s) => s.language)
  const setLanguage = useSettings((s) => s.setLanguage)
  const kiosk = useSettings((s) => s.kiosk)
  const tspUrl = tspBoardsUrl()

  const hidden = new Set<PlaceId>(tspUrl ? [] : ['tsp'])

  const place = (id: PlaceId) => {
    const texts = t.places[id]
    const style = at(layout, layout.labels[id])
    if (id === 'old-version' && kiosk) {
      // Leaving the app would strand the next visitor (a kiosk browser has no back button and the
      // timeout no longer runs), so the booth shows the address instead of a link.
      return (
        <div key={id} className={`${styles.anchored} ${styles.place} ${styles.external}`} style={style}>
          <span className={styles.name}>{texts.name}</span>
          <span className={styles.tagline}>{t.start.oldVersionAddress}</span>
        </div>
      )
    }
    if (id === 'old-version' || id === 'tsp') {
      if (hidden.has(id)) return null
      // Rundreise: in kiosk mode inside the app (a frame below "‹ Karte"), otherwise in a new tab, so
      // the map stays open.
      const link =
        id === 'old-version'
          ? { href: OLD_VERSION_URL, rel: 'noopener' }
          : kiosk
            ? { href: hrefFor({ name: 'tsp' }) }
            : { href: tspUrl, target: '_blank', rel: 'noopener' }
      return (
        <a
          key={id}
          className={`${styles.anchored} ${styles.place} ${styles.external}`}
          style={style}
          {...link}
        >
          <span className={styles.name}>{texts.name}</span>
          <span className={styles.tagline}>{texts.tagline}</span>
        </a>
      )
    }
    const state = states[id]
    if (state !== 'open') {
      return (
        <div key={id} className={`${styles.anchored} ${styles.place} ${styles.unavailable}`} style={style}>
          <span className={styles.name}>{texts.name}</span>
          <span className={styles.tagline}>{state === 'soon' ? t.start.comingSoon : t.start.closed}</span>
        </div>
      )
    }
    return (
      <a
        key={id}
        className={`${styles.anchored} ${styles.place}`}
        style={style}
        href={hrefFor({ name: 'game', game: id })}
      >
        <span className={styles.name}>{texts.name}</span>
        <span className={styles.tagline}>{texts.tagline}</span>
      </a>
    )
  }

  return (
    <main className={styles.screen}>
      <div className={styles.stage} data-layout={layoutName}>
        <MapArt layout={layout} hidden={hidden} />
        <Compass layout={layout} />
        <h1 className={`${styles.anchored} ${styles.title}`} style={at(layout, layout.title)}>
          {t.start.title}
        </h1>
        <p className={`${styles.anchored} ${styles.subtitle}`} style={at(layout, layout.subtitle)}>
          {t.start.subtitle}
        </p>
        <div className={`${styles.anchored} ${styles.controls}`} style={at(layout, layout.controls)}>
          <Button
            className={styles.languages}
            aria-label={t.language.switch}
            onClick={() => setLanguage(language === 'de' ? 'en' : 'de')}
          >
            <span aria-current={language === 'de'}>DE</span>·<span aria-current={language === 'en'}>EN</span>
          </Button>
          {fullscreen.supported && (
            <Button onClick={fullscreen.toggle}>
              {fullscreen.active ? t.start.exitFullscreen : t.start.fullscreen}
            </Button>
          )}
        </div>
        {[...GAME_IDS, 'old-version' as const, 'tsp' as const].map(place)}
        <span className={`${styles.anchored} ${styles.logo}`} style={at(layout, layout.logo)}>
          {t.start.logo}
        </span>
      </div>
    </main>
  )
}
