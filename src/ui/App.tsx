import { useEffect } from 'react'
import { InkDefs } from './components/InkDefs'
import { AttractScreen } from './shell/AttractScreen'
import { DemoPage } from './shell/DemoPage'
import { GameRoute } from './shell/GameRoute'
import { KIOSK_IDLE_MS, useIdle } from './shell/idle'
import { navigate, useRoute } from './shell/router'
import { useSettings } from './shell/settings'
import { StaffMenu } from './shell/StaffMenu'
import { StartMap } from './shell/StartMap'
import { useUi } from './shell/ui'
import './styles/global.css'

/** Ctrl+Shift+S opens the staff menu (the other way in is a 3 s press on the compass). */
function useStaffShortcut() {
  const openStaff = useUi((s) => s.openStaff)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyS' && e.ctrlKey && e.shiftKey && !e.altKey) {
        e.preventDefault()
        openStaff()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openStaff])
}

/** Kiosk mode: after 90 s without input, back to the map in German, behind the attract screen. */
function useKiosk() {
  const kiosk = useSettings((s) => s.kiosk)
  const attract = useUi((s) => s.attract)
  useIdle(
    KIOSK_IDLE_MS,
    () => {
      navigate({ name: 'start' })
      useSettings.getState().setLanguage('de')
      useUi.getState().closeStaff()
      useUi.getState().showAttract()
    },
    kiosk && !attract,
  )
}

export function App() {
  const route = useRoute()
  const language = useSettings((s) => s.language)
  const staffOpen = useUi((s) => s.staffOpen)
  const attract = useUi((s) => s.attract)
  useStaffShortcut()
  useKiosk()

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    if (route.name === 'unknown') navigate({ name: 'start' })
  }, [route.name])

  return (
    <>
      <InkDefs />
      {route.name === 'game' ? (
        <GameRoute game={route.game} />
      ) : route.name === 'demo' ? (
        <DemoPage />
      ) : (
        <StartMap />
      )}
      {attract && <AttractScreen />}
      {staffOpen && <StaffMenu />}
    </>
  )
}
