import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './ui/App'
import { keyboard } from './ui/input/keyboard'
import { applyKioskParameter, useSettings } from './ui/shell/settings'
import { useUi } from './ui/shell/ui'
import { UPDATE_CHECK_MS, useUpdate } from './ui/shell/update'

// `?kiosk` turns booth mode on (the booth start script opens the app with it); it starts on the
// attract screen.
applyKioskParameter(window.location.search)
keyboard.install()
if (useSettings.getState().kiosk) useUi.getState().showAttract()

// Offline support and updates: a new version installs in the background and waits; the app switches to
// it on the start map or the attract screen (see `useUpdate`).
if (import.meta.env.PROD) {
  const activate = registerSW({
    onNeedRefresh: () => useUpdate.setState({ install: () => void activate() }),
    onRegisteredSW: (_url, registration) => {
      if (!registration) return
      window.setInterval(() => {
        if (navigator.onLine) registration.update().catch(() => {})
      }, UPDATE_CHECK_MS)
    },
  })
}

const root = document.getElementById('root')
if (!root) throw new Error('#root missing')
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
