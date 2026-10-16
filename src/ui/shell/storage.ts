import { createJSONStorage, type StateStorage } from 'zustand/middleware'

/**
 * localStorage that never throws (private windows, blocked site data): reads return null, writes are
 * dropped. Per-device state only; nothing leaves the browser.
 */
const safeLocalStorage: StateStorage = {
  getItem(name) {
    try {
      return window.localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem(name, value) {
    try {
      window.localStorage.setItem(name, value)
    } catch {
      // Storage full or blocked: keep the state in memory only.
    }
  },
  removeItem(name) {
    try {
      window.localStorage.removeItem(name)
    } catch {
      // Ignore.
    }
  },
}

export const persistStorage = createJSONStorage(() => safeLocalStorage)
