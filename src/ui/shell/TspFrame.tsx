import { useEffect, useRef, useState } from 'react'
import { LinkButton } from '../components/Button'
import { GameHeader } from '../components/GameHeader'
import { useLanguage, useT } from '../i18n'
import { watchFrame } from './idle'
import { tspBoardsKioskUrl, tspBoardsUrl } from './places'
import { hrefFor } from './router'
import styles from './TspFrame.module.css'

/** tsp-boards keeps its language here (same origin on GitHub Pages and in the booth package). */
const TSP_BOARDS_LANGUAGE_KEY = 'tsp-boards.lang'

/**
 * "Rundreise" in kiosk mode: tsp-boards in its event mode inside a full-size frame below "‹ Karte", so
 * visitors cannot get lost in a new tab and the kiosk timeout still returns to the attract screen (input
 * inside a same-origin frame counts). Outside kiosk mode the start map opens tsp-boards in a new tab.
 */
export function TspFrame() {
  const t = useT()
  const language = useLanguage()
  const url = tspBoardsUrl()
  const detach = useRef<() => void>(() => {})

  // Open tsp-boards in the language of the map (before the frame loads).
  useState(() => {
    try {
      localStorage.setItem(TSP_BOARDS_LANGUAGE_KEY, language)
    } catch {
      // Storage blocked: tsp-boards picks its own language.
    }
  })
  useEffect(() => () => detach.current(), [])

  if (!url) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', textAlign: 'center' }}>
        <div>
          <p style={{ fontSize: '1.6rem' }}>{`${t.places.tsp.name}: ${t.game.missing}`}</p>
          <LinkButton href={hrefFor({ name: 'start' })}>{t.game.back}</LinkButton>
        </div>
      </div>
    )
  }
  return (
    <div className={styles.screen}>
      <GameHeader title={t.places.tsp.name} subtitle={t.tsp.subtitle} />
      <iframe
        className={styles.frame}
        title={t.tsp.frame}
        src={tspBoardsKioskUrl(url)}
        allow="fullscreen"
        allowFullScreen
        onLoad={(e) => {
          detach.current()
          detach.current = watchFrame(e.currentTarget)
        }}
      />
    </div>
  )
}
