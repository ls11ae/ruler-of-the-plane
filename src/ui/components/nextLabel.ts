import { createContext } from 'react'

/**
 * The label of the result screen's "Nächstes Level" button. A game's entry sets it around the screen
 * of a tier's last level, where the next level starts the next tier ("Weiter mit „Mittel“"), so the
 * screens themselves need not know the tiers.
 */
export const NextLabel = createContext<string | null>(null)
