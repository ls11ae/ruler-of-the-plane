import type { Tier, WalkId } from '../../../core/games/frechet/levels'
import type { Advice } from '../../../core/games/frechet/rules'

const metres = (m: number) => `${m.toFixed(1).replace('.', ',')} m`

/** Texts of "Gassi gehen" (German; the source of the dictionary type). */
export const de = {
  title: 'Gassi gehen',
  subtitle: (i: number, n: number, name: string) => `Schlosspark · ${name} · Spaziergang ${i} von ${n}`,
  subtitleTier: (tier: string, i: number, n: number, name: string) =>
    `Schlosspark · ${tier} · ${name} · ${i} von ${n}`,
  sandboxSubtitle: 'Schlosspark · eigene Wege',
  walks: {
    avenue: 'Die Allee',
    sniffing: 'Schnüffelspur',
    pond: 'Am Teich',
    fetch: 'Stöckchen holen',
    braid: 'Kreuz und quer',
    expert: 'Für Profis',
    m1: 'Taubenjagd',
    m2: 'Hasenspur',
    m3: 'Hin und her',
    m4: 'Auf und ab',
    s1: 'Zickzack',
    s2: 'Treppauf',
    s3: 'Wellen',
    s4: 'Sägezahn',
  } satisfies Record<WalkId, string>,
  tiers: { easy: 'Leicht', medium: 'Mittel', hard: 'Schwer' } satisfies Record<Tier, string>,
  tierLabel: 'Schwierigkeit',
  tierIntro: {
    easy: '',
    medium:
      'Knifflig: Einfach mitlaufen klappt hier nicht. Beide gehen langsamer, damit du Zeit zum Überlegen hast.',
    hard: 'Für Profis: viele Sackgassen und eine knappe Leine. Beide gehen langsamer.',
  } satisfies Record<Tier, string>,
  metres,
  leashOf: (m: number) => `von ${metres(m)} Leine`,
  leashLabel: 'Wie straff die Leine ist',
  restart: 'Neu',
  picker: 'Spaziergänge',
  theoryButton: 'Theorie',
  person: 'Mensch',
  dog: 'Hund',
  personWalks: 'Mensch geht',
  dogRuns: 'Hund läuft',
  bothWalk: 'Beide Tasten: beide laufen',
  holdLabel: (who: string) => `${who}: gedrückt halten zum Laufen`,
  start: 'Start',
  goal: 'Ziel',
  board: (leash: number) => `Schlosspark: zwei Wege zum Schloss, Leine ${metres(leash)}`,
  taut: 'Leine fast straff!',
  advice: {
    person: 'Halte nur A, bis der Mensch aufholt.',
    dog: 'Halte nur L, bis der Hund aufholt.',
  } as Record<Exclude<Advice, 'both' | null>, string>,
  adviceTouch: {
    person: 'Halte nur „Mensch“, bis der Mensch aufholt.',
    dog: 'Halte nur „Hund“, bis der Hund aufholt.',
  } as Record<Exclude<Advice, 'both' | null>, string>,
  deadEnd: 'Sackgasse: Von hier aus reicht die Leine nicht mehr bis zum Schloss.',
  snappedTitle: 'Leine zu straff!',
  snapped: {
    dogWait: 'Der Hund war zu weit vorn. Lass ihn warten, bis der Mensch aufholt.',
    personWait: 'Der Mensch war zu weit vorn. Lass ihn warten, bis der Hund aufholt.',
    earlier: 'Hier ging es nicht mehr weiter: Einer hätte schon früher warten müssen.',
  },
  howTo: (leash: number, touch: boolean) => [
    touch
      ? 'Bring Mensch und Hund zum Schloss: Halte „Mensch“ oder „Hund“ gedrückt, oder beide.'
      : 'Bring Mensch und Hund zum Schloss: Halte A, dann geht der Mensch; halte L, dann läuft der Hund.',
    `Beide sind gleich schnell, aber die Leine ist nur ${metres(leash)} lang. Ist einer zu weit vorn, muss er warten.`,
    touch
      ? 'Zu zweit macht es mehr Spaß: Jeder hält einen Knopf.'
      : 'Zu zweit: Einer drückt A, die andere L.',
  ],
  howToKeys: { person: 'Mensch geht', dog: 'Hund läuft' },
  howToAnimation: 'Mensch und Hund laufen; der Hund wartet, bis der Mensch aufholt',
  stats: (longest: number, shortest: number) =>
    `Deine längste Leine: ${metres(longest)} · kürzeste möglich: ${metres(shortest)}`,
  explanation: (shortest: number, longest: number) => [
    'Der Computer zeichnet alle Stellungen in ein Diagramm: Nach rechts läuft der Mensch, nach oben der Hund; hell ist, wo die Leine reicht.',
    'Jeder Spaziergang ist ein Weg von unten links nach oben rechts, der nie zurückgeht – deiner ist grün, der des Computers gestrichelt.',
    `Die kürzeste Leine, mit der es noch einen hellen Weg gibt, heißt Fréchet-Abstand: hier ${metres(shortest)}, du brauchtest ${metres(longest)}.`,
  ],
  explanationAnimation: 'Diagramm der Stellungen mit deinem Weg und dem Weg des Computers',
  replay: 'Nochmal zeigen',
  theory: {
    title: 'Theorie',
    close: 'Theorie schließen',
    intro:
      'Jeder Punkt ist eine Stellung: Nach rechts läuft der Mensch, nach oben der Hund. Im hellen Bereich reicht die Leine.',
    diagram: 'Diagramm der Stellungen von Mensch und Hund',
    yours: 'dein Weg',
    computer: 'Weg des Computers',
    slider: (m: number) => `Leine im Bild: ${metres(m)}`,
    shortest: (m: number) => `Kürzeste Leine, mit der es geht: ${metres(m)}`,
    walkExists: 'Mit dieser Leine führt ein Weg durchs Helle bis oben rechts.',
    noWalk: 'Mit dieser Leine kommt kein Weg ganz durchs Helle.',
    critical: (n: number, steps: number) =>
      `Der Computer probiert nur besondere Längen (Striche am Regler), bei denen sich ein Durchgang öffnet. Davon gibt es hier ${n}; die kürzeste passende findet er durch Halbieren in ${steps} Schritten.`,
    previous: 'Vorige besondere Länge',
    next: 'Nächste besondere Länge',
    probe: 'Zeig auf das Diagramm: Mensch und Hund erscheinen an diesen Stellen im Park.',
    sandbox: 'Eigene Wege zeichnen',
    narrowest: 'engste Stelle',
  },
  sandbox: {
    drawPerson: 'Zeichne den Weg des Menschen: drücken und ziehen.',
    drawDog: 'Jetzt den Weg des Hundes, vom Start aus.',
    ready: 'Fertig! Das Diagramm zeigt deine Wege.',
    tryIt: 'Ausprobieren',
    redraw: 'Neu zeichnen',
    back: 'Zurück zum Park',
  },
  guess: {
    title: 'Schätz die Leine',
    intro:
      'Wie kurz darf die Leine sein, damit beide ans Schloss kommen? Stell eine Länge ein und lass den Computer probieren.',
    slider: (m: number) => `Deine Leine: ${metres(m)}`,
    check: 'Probieren',
    checking: 'Der Computer läuft …',
    works: (m: number) => `${metres(m)} reicht! Geht es noch kürzer?`,
    fails: (m: number) => `${metres(m)} ist zu kurz: Wo die beiden stehen bleiben, wird die Leine zu straff.`,
    reveal: 'Auflösen',
    tries: (n: number) => (n === 1 ? '1 Versuch' : `${n} Versuche`),
    stats: (best: number | null, shortest: number) =>
      best === null
        ? `Kürzeste Leine: ${metres(shortest)}`
        : `Deine kürzeste Leine, die reichte: ${metres(best)} · kürzeste: ${metres(shortest)}`,
    explanation: (shortest: number) => [
      'Genau so macht es der Computer: Er probiert eine Länge und prüft im Diagramm, ob ein Weg durchs Helle führt; dann halbiert er den Bereich, in dem die Antwort liegt.',
      'Er muss nur besondere Längen probieren, bei denen sich im Diagramm ein Durchgang öffnet.',
      `So findet er in wenigen Schritten den Fréchet-Abstand: ${metres(shortest)}.`,
    ],
  },
  challenge: {
    offer: (now: number, next: number) =>
      `Geschafft mit ${metres(now)} – traust du dich mit ${metres(next)}?`,
    button: (m: number) => `Mit ${metres(m)} Leine`,
    badge: 'Leinen-Profi!',
    done: 'Kürzer geht es kaum: Du kamst mit fast der kürzesten Leine ans Ziel.',
  },
  pickerTitle: 'Spaziergänge',
  modes: { walk: 'Spazieren', guess: 'Schätz die Leine', sandbox: 'Eigene Wege zeichnen' },
  best: (m: number) => `beste Leine ${metres(m)}`,
  score: (cm: number) => metres(cm / 100),
}

export type FrechetTexts = typeof de
