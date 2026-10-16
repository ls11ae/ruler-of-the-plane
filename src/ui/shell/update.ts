import { create } from 'zustand'

/** How often a page that stays open (the booth) asks the server for a new version. */
export const UPDATE_CHECK_MS = 60 * 60 * 1000

/**
 * A new version of the app: its service worker is installed and waits. The page keeps running the old
 * version (still served by the old service worker, so no file of it goes missing) until the app
 * switches over where a reload loses nothing: on the start map or the attract screen, never in a game.
 */
interface UpdateState {
  /** Activates the waiting version and reloads the page; null while no new version waits. */
  install: (() => void) | null
}

export const useUpdate = create<UpdateState>()(() => ({ install: null }))

/** Where a reload loses nothing: the start map or the attract screen, with the staff menu closed. */
export function canReloadNow(screen: { onStartMap: boolean; attract: boolean; staffOpen: boolean }): boolean {
  return (screen.onStartMap || screen.attract) && !screen.staffOpen
}
