import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { applyKioskParameter, useSettings } from './ui/shell/settings'
import { useUi } from './ui/shell/ui'

// `?kiosk` turns booth mode on (the booth start script opens the app with it); it starts on the
// attract screen.
applyKioskParameter(window.location.search)
if (useSettings.getState().kiosk) useUi.getState().showAttract()

const root = document.getElementById('root')
if (!root) throw new Error('#root missing')
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
