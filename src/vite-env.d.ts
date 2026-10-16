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

/** Version and commit of the build (set in vite.config.ts), shown in the staff menu. */
declare const __APP_VERSION__: string
/** Build time (UTC, minutes). */
declare const __BUILD_TIME__: string
