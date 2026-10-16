/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL of the tsp-boards play mode ("Rundreise"); the place is hidden while empty. */
  readonly VITE_TSP_BOARDS_URL?: string
  /** PIN for the staff menu; empty means no PIN. */
  readonly VITE_STAFF_PIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
