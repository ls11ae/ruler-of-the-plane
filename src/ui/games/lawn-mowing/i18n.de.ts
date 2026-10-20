/** Texts of "Rasenmähen" (German; the source of the dictionary type). */
export const de = {
  title: 'Rasenmähen',
  subtitle: (lawn: number, cutters: number) =>
    `Rasen ${lawn} · ${cutters === 1 ? 'ein Mäher' : 'zwei Mäher'} · nach CG:SHOP 2027`,
  lawns: {
    lawn1: 'Vorgarten',
    lawn2: 'Gartenwege',
    lawn3: 'Schlossgarten',
    lawn4: 'Trittsteine',
    lawn5: 'Stadtpark',
  } as Record<string, string>,
  lawnCard: (n: number) => `Rasen ${n}`,
  cells: (n: number) => `${n} Felder`,
  mowed: 'gemäht',
  mowedLabel: 'Gemähter Anteil des Rasens',
  cutter: (i: number) => `Mäher ${i}`,
  steps: (n: number) => `${n} ${n === 1 ? 'Schritt' : 'Schritte'}`,
  home: (n: number) => (n > 0 ? `+${n} zurück` : 'am Start'),
  /** The score card: the round so far with the way home (one mower), or the longer of the two rounds. */
  longestTitle: 'Längerer Mäher:',
  longestTitleOne: 'Bisher:',
  /** The computer's longest round on this lawn (the solver's tours), or the strip strategy's. */
  target: (n: number) => `Computer: ${n} Schritte`,
  targetStrips: (n: number) => `Streifen-Strategie: ${n} Schritte`,
  space: 'Leertaste',
  homeButton: 'Feierabend',
  homeHint: 'alle zurück zum Start',
  homeRunning: 'Alle fahren zurück …',
  notDone: (n: number) => `Da ist noch Gras: ${n} ${n === 1 ? 'Feld' : 'Felder'}!`,
  allMowed: 'Alles gemäht! Jetzt Feierabend: zurück zum Start.',
  hintKeys: 'Halte eine Taste: Der Mäher fährt. Mähe alles und fahr zurück zum Start.',
  hintPad: 'Halte einen Pfeil: Der Mäher fährt. Mähe alles und fahr zurück zum Start.',
  board: (lawn: string) => `Rasen ${lawn}`,
  pad: { up: 'hoch', down: 'runter', left: 'links', right: 'rechts', undo: 'Schritt zurück' },
  tierTeasers: {
    easy: 'Der Vorgarten: klein, mit Terrasse und Steinplatten – zum Üben.',
    medium: 'Gartenwege und Trittsteine: größere Wiesen, mehr zu planen.',
    hard: 'Hier sind einfache Strategien klar schlechter als die Runden des Computers.',
  },
  resume: (lawn: string, cutters: number) => `${lawn}, ${cutters === 1 ? 'allein' : 'zu zweit'}`,
  setup: {
    title: 'Neues Spiel',
    lawn: 'Rasen',
    cutters: 'Mäher',
    one: 'Allein (1 Mäher)',
    two: 'Zu zweit (2 Mäher)',
    phoneOne: 'Auf dem Handy mähst du mit einem Mäher.',
    start: "Los geht's!",
  },
  undoButton: 'Zurück',
  newGame: 'Neu',
  theoryButton: 'Theorie',
  howTo: (cutters: number) => [
    'Mähe den ganzen Rasen! Ein Mäher mäht 3 × 3 Felder. Er darf über den Rand hinausragen und über Steinplatten fahren – mähen musst du nur den Rasen.',
    cutters === 1
      ? 'Wenn alles gemäht ist: Feierabend! Der Mäher fährt zurück zum Start.'
      : 'Wenn alles gemäht ist: Feierabend! Alle fahren zurück zum Start. Es zählt die längere Runde.',
    'Je weniger Schritte, desto besser.',
  ],
  howToKeys: { one: 'Mäher 1', two: 'Mäher 2', home: 'Feierabend', undo: 'Schritt zurück' },
  howToAnimation:
    'Ein Mäher fährt Streifen ab und mäht dabei drei Felder breit; er fährt über eine kleine Terrasse, und der letzte Streifen ragt über den Rand',
  result: {
    title: 'Feierabend!',
    stats: (longest: number, target: string) => `Längste Runde: ${longest} Schritte · ${target}`,
    score: (n: number) => `${n} Schritte`,
  },
  /**
   * After a finished lawn: this lawn's lower bound, the visitor's longest round and the computer's (or the
   * strip strategy's, `solver` false), for one or two mowers.
   */
  explanation: (bound: number, mine: number, reference: number, solver: boolean, cutters: number) => [
    'Gesucht sind Runden, die zusammen den ganzen Rasen mähen. Es zählt die längste Runde, denn alle Mäher fahren gleichzeitig los.',
    `Jeder Schritt mäht höchstens 3 neue Felder, darum braucht dieser Rasen mindestens ${bound} Schritte. ${cutters === 1 ? `Du hast ${mine} gebraucht` : `Eure längere Runde hatte ${mine}`}, ${solver ? 'der Computer' : 'die Streifen-Strategie'} ${reference}.`,
    'Die kürzesten Runden zu finden ist sehr schwer; der Computer sucht lange mit cleveren Verfahren. Die Animation zeigt seine Runden an einem kleinen Beispiel.',
  ],
  explanationAnimation: 'Die Runden des Lösers auf diesem Rasen',
  exampleCaption: (cutters: number, steps: number) =>
    `Beispiel – ein kleiner Rasen: So mäht der Computer ${cutters === 1 ? 'mit einem Mäher' : 'mit zwei Mähern'}, ${steps} Schritte.`,
  exampleAnimation: (cutters: number) =>
    `Beispiel: die Runden des Computers ${cutters === 1 ? 'mit einem Mäher' : 'mit zwei Mähern'} auf einem kleinen Rasen, der keiner der Rasen hier ist`,
  replay: 'Nochmal zeigen',
  theory: {
    title: 'Theorie',
    close: 'Theorie schließen',
    objective:
      'Das Ziel heißt „min-max“: Die längste Runde soll möglichst kurz sein, denn die Arbeit ist erst fertig, wenn der letzte Mäher zurück ist.',
    bound: (n: number, k: number, bound: number) =>
      `Untere Schranke: ${n} Felder, jeder Schritt mäht höchstens 3 neue, jeder Start 9${k > 1 ? `, ${k} Mäher teilen sich die Arbeit` : ''}. Also braucht die längste Runde mindestens ${bound} Schritte (eine Runde hat immer eine gerade Länge).`,
    solver: (n: number) => `Der Löser des Lehrstuhls schafft ${n} Schritte.`,
    solverPending:
      'Die Runden des Lösers kommen bald; bis dahin zeigt die Animation eine einfache Strategie: Streifen hin und her.',
    strips: (n: number) => `Die Streifen-Strategie braucht ${n} Schritte.`,
    play: 'Runden ansehen',
    playing: 'Läuft …',
    competitionTitle: 'Eine echte Wettbewerbsaufgabe',
    competition: (cells: number, k: number, longest: number) =>
      `CG:SHOP 2027 stellt Forschungsteams solche Rasen, viel größer. Diese Aufgabe hat ${cells} Felder und ${k} Mäher; die Beispiellösung schafft ${longest} Schritte.`,
    competitionAnimation: 'Wettbewerbsaufgabe mit drei Mähern und einer Beispiellösung',
  },
}

export type LawnTexts = typeof de
