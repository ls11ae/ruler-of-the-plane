import { useEffect } from 'react'
import { InkDefs } from './components/InkDefs'
import { AttractScreen } from './shell/AttractScreen'
import { Credits } from './shell/Credits'
import { DemoPage } from './shell/DemoPage'
import { GameRoute } from './shell/GameRoute'
import { KIOSK_IDLE_MS, useIdle } from './shell/idle'
import { navigate, useRoute } from './shell/router'
import { useSettings } from './shell/settings'
import { StaffMenu } from './shell/StaffMenu'
import { StartMap } from './shell/StartMap'
// Loaded with the shell (not only with a game), so the kiosk start and timeout always forget the tiers.
import './shell/tiers'
import { TspFrame } from './shell/TspFrame'
import { useUi } from './shell/ui'
import { canReloadNow, useUpdate } from './shell/update'
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

/** A new version waits: switch to it as soon as a reload loses nothing (start map, attract screen). */
function useUpdateWhenIdle(safe: boolean) {
  const install = useUpdate((s) => s.install)
  useEffect(() => {
    if (!install || !safe) return
    useUpdate.setState({ install: null })
    install()
  }, [install, safe])
}

export function App() {
  const route = useRoute()
  const language = useSettings((s) => s.language)
  const staffOpen = useUi((s) => s.staffOpen)
  const attract = useUi((s) => s.attract)
  useStaffShortcut()
  useKiosk()
  useUpdateWhenIdle(canReloadNow({ onStartMap: route.name === 'start', attract, staffOpen }))

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
      ) : route.name === 'tsp' ? (
        <TspFrame />
      ) : route.name === 'credits' ? (
        <Credits />
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
