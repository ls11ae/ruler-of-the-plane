/** Texts of "Licht ins Verlies" (German; the source of the dictionary type). */
export const de = {
  title: 'Licht ins Verlies',
  subtitle: (tier: string, i: number, n: number, k: number) =>
    `${tier} ${i} von ${n} · Ziel: ${k} ${k === 1 ? 'Fackel' : 'Fackeln'}`,
  torches: (n: number) => `Fackeln: ${n}`,
  lit: 'beleuchtet',
  litLabel: 'Beleuchteter Anteil des Verlieses',
  levels: 'Verliese',
  restart: 'Neu',
  hintMouse: 'Klick: Fackel aufstellen · Ziehen: verschieben · Aus dem Verlies ziehen: wegnehmen',
  hintTouch: 'Tippen: Fackel aufstellen · Ziehen: verschieben · Auf den Eimer ziehen: wegnehmen',
  trash: 'Hierher ziehen: Fackel wegnehmen',
  board: (k: number) => `Verlies, Ziel: ${k} ${k === 1 ? 'Fackel' : 'Fackeln'}`,
  howTo: (k: number) => [
    'Stell Fackeln ins Verlies, bis alles hell ist.',
    'Jede Fackel leuchtet so weit, wie sie sehen kann: Wände und Säulen werfen Schatten.',
    `Schaffst du es mit ${k} ${k === 1 ? 'Fackel' : 'Fackeln'}?`,
  ],
  /** The rules on the tier screen (before a dungeon is chosen). */
  tierRules: [
    'Stell Fackeln ins Verlies, bis alles hell ist.',
    'Jede Fackel leuchtet so weit, wie sie sehen kann: Wände und Säulen werfen Schatten.',
    'Je weniger Fackeln du brauchst, desto mehr Sterne.',
  ],
  tierTeasers: {
    easy: 'Zwei oder drei Fackeln reichen – wo stellst du sie hin?',
    medium: 'Säulen und Nischen werfen Schatten: vier bis acht Fackeln.',
    hard: 'Für Profis: Stachelräume und riesige Verliese mit bis zu 17 Fackeln.',
  },
  resume: (tier: string, i: number) => `${tier}, Verlies ${i}`,
  howToKeys: 'Ziehen: verschieben, aus dem Verlies oder auf den Eimer ziehen: wegnehmen',
  stats: (torches: number, time: string) => `${torches} ${torches === 1 ? 'Fackel' : 'Fackeln'} · ${time}`,
  score: (torches: number, time: string) => `${torches} Fackeln, ${time}`,
  /**
   * `quarter`: ⌊n/4⌋ for a dungeon with only right angles, else null. With it the sentences are tighter,
   * so the result dialog keeps the length that fits a laptop screen.
   */
  fisk: (n: number, bound: number, k: number, quarter: number | null) =>
    quarter === null
      ? [
          `Für ein Verlies ohne Säulen mit ${n} Ecken reichen immer ${bound} Fackeln: ein Drittel der Ecken.`,
          'Der Beweis (Steve Fisk, 1978): Zerlege das Verlies in Dreiecke und färbe die Ecken mit drei Farben, sodass jedes Dreieck jede Farbe einmal hat. Fackeln an den Ecken der seltensten Farbe sehen dann jedes Dreieck.',
          `Die kleinste Zahl zu finden ist dagegen sehr schwer (NP-schwer); hier genügen schon ${k}.`,
        ]
      : [
          `Für ein Verlies ohne Säulen mit ${n} Ecken reichen immer ${bound} Fackeln (ein Drittel), mit nur rechten Winkeln sogar ${quarter} (ein Viertel; Kahn, Klawe, Kleitman).`,
          'Fisks Beweis: Zerlege das Verlies in Dreiecke und färbe die Ecken mit drei Farben, sodass jedes Dreieck jede Farbe hat; Fackeln an der seltensten Farbe sehen alles.',
          `Die kleinste Zahl zu finden ist sehr schwer (NP-schwer); hier genügen schon ${k}.`,
        ],
  sweep: (bound: number) => [
    'So prüft der Computer deine Fackeln: Für jede Fackel schwenkt er einen Strahl einmal im Kreis und merkt sich, wo er an Wände stößt. Das ergibt ihren Sichtbereich.',
    'Dann vereinigt er alle Sichtbereiche und zieht sie vom Verlies ab: Bleibt nichts übrig, ist alles hell.',
    `Mit Säulen reichen immer (Ecken + Säulen) ÷ 3 Fackeln, hier ${bound}; die kleinste Zahl zu finden ist sehr schwer (NP-schwer).`,
  ],
  replay: 'Nochmal zeigen',
  howToAnimation: 'Eine Fackel erhellt, was sie sieht; eine zweite den Rest: 100 %',
  fiskAnimation: 'Fisks Beweis: Dreiecke, drei Farben, Fackeln an der seltensten Farbe',
  sweepAnimation: 'Ein Strahl kreist um die Fackel und zeigt ihren Sichtbereich',
  theoryButton: 'Theorie',
  picker: {
    title: 'Verliese',
    expert: 'Für Profis',
    card: (i: number) => `Verlies ${i}`,
    torches: (k: number) => `${k} Fackeln`,
  },
  theory: {
    title: 'Theorie',
    close: 'Theorie schließen',
    triangles: 'Dreiecke',
    visibility: 'Sichtbereiche',
    colouring: 'Fisk-Färbung',
    corners: 'Ecken',
    pillars: 'Säulen',
    bound: 'reichen immer',
    boundNoHoles: (n: number, bound: number) => `${n} Ecken ÷ 3, abgerundet: ${bound} Fackeln reichen immer.`,
    boundHoles: (n: number, h: number, bound: number) =>
      `(${n} Ecken + ${h} Säulen) ÷ 3, abgerundet: ${bound} Fackeln reichen immer.`,
    boundOrthogonal: (n: number, quarter: number, third: number) =>
      `Nur rechte Winkel: ${n} Ecken ÷ 4, abgerundet: ${quarter} Fackeln reichen immer (Kahn, Klawe, Kleitman, 1983). Mit beliebigen Winkeln ÷ 3: ${third}.`,
    orthogonalText:
      'Ihr Beweis zerlegt das Verlies in Vierecke ohne einspringende Ecke und färbt die Ecken mit vier Farben, sodass jedes Viereck jede Farbe einmal hat. Jede Ecke sieht ihr ganzes Viereck, also reicht die seltenste Farbe.',
    level: (k: number) => `Dieses Verlies schafft man mit ${k}.`,
    yours: (n: number) => `Deine Fackeln: ${n}.`,
    np: 'Die kleinste Zahl zu finden ist NP-schwer: Niemand kennt ein schnelles Verfahren dafür.',
    visibilityText:
      'Jede Fackel sieht ein Vieleck (ihren Sichtbereich). Das Spiel vereinigt alle Sichtbereiche und zieht sie vom Verlies ab; was übrig bleibt, ist dunkel.',
    fiskText:
      'Fisk-Beweis: Jedes Dreieck hat eine Ecke jeder Farbe. Die seltenste Farbe (umrandet) braucht höchstens ein Drittel der Ecken, und ihre Ecken sehen alle Dreiecke.',
    fiskHoles: 'Mit Säulen klappt die Dreifärbung nicht immer; die Schranke gilt trotzdem.',
    colours: ['Rot', 'Grün', 'Blau'],
  },
}

export type ArtGalleryTexts = typeof de
