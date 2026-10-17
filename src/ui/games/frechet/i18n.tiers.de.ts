import type { Tier } from '../../../core/games/frechet/levels'

/**
 * Texts of the tier screen of "Gassi gehen" (German; the source of the dictionary type). Kept apart from
 * `i18n.de.ts` while another session works on the walk screens; fold them in later.
 */
export const tiersDe = {
  rules: (touch: boolean) => [
    touch
      ? 'Bring Mensch und Hund zum Schloss: Halte „Mensch“ oder „Hund“ gedrückt, oder beide.'
      : 'Bring Mensch und Hund zum Schloss: Halte A, dann geht der Mensch; halte L, dann läuft der Hund.',
    'Beide sind gleich schnell, aber die Leine ist kurz: Ist einer zu weit vorn, muss er warten.',
    touch
      ? 'Zu zweit macht es mehr Spaß: Jeder hält einen Knopf.'
      : 'Zu zweit: Einer drückt A, die andere L.',
  ],
  teasers: {
    easy: 'Gemütliche Spaziergänge, mit Tipps, wer warten muss.',
    medium: 'Knifflig: Einfach mitlaufen klappt hier nicht. Wer muss wann warten?',
    hard: 'Für Profis: viele Sackgassen und eine knappe Leine.',
  } satisfies Record<Tier, string>,
  resumePark: (tier: string, name: string) => `${tier}, ${name}`,
  resumeWoods: (tier: string, name: string) => `${tier}, im Wald: ${name}`,
}

export type FrechetTierTexts = typeof tiersDe
