import { create } from 'zustand'

/** Transient UI state of the shell (not persisted). */
interface UiState {
  staffOpen: boolean
  attract: boolean
  openStaff(): void
  closeStaff(): void
  showAttract(): void
  hideAttract(): void
}

export const useUi = create<UiState>()((set) => ({
  staffOpen: false,
  attract: false,
  openStaff: () => set({ staffOpen: true, attract: false }),
  closeStaff: () => set({ staffOpen: false }),
  showAttract: () => set({ attract: true }),
  hideAttract: () => set({ attract: false }),
}))
