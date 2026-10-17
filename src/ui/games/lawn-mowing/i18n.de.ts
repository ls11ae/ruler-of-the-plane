/** Texts of "Rasenmähen" (German; the source of the dictionary type). */
export const de = {
  title: 'Rasenmähen',
  subtitle: (lawn: number, cutters: number) =>
    `Rasen ${lawn} · ${cutters === 1 ? 'ein Mäher' : 'zwei Mäher'} · nach CG:SHOP 2027`,
  lawns: {
    lawn1: 'Vorgarten',
    lawn2: 'Gemüsegarten',
    lawn3: 'Schlossgarten',
    lawn4: 'Obstwiese',
    lawn5: 'Stadtpark',
  } as Record<string, string>,
  lawnCard: (n: number) => `Rasen ${n}`,
  cells: (n: number) => `${n} Felder`,
  mowed: 'gemäht',
  mowedLabel: 'Gemähter Anteil des Rasens',
  cutter: (i: number) => `Mäher ${i}`,
  steps: (n: number) => `${n} ${n === 1 ? 'Schritt' : 'Schritte'}`,
  home: (n: number) => (n > 0 ? `+${n} zurück` : 'am Start'),
  longestTitle: 'Es zählt die längere Runde:',
  longestTitleOne: 'Deine Runde:',
  target: (n: number) => `Ziel vom Löser: ${n}`,
  targetStrips: (n: number) => `Ziel (Streifen-Strategie): ${n}`,
  targetPending: 'Ziel vom Löser: kommt bald',
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
  setup: {
    title: 'Neues Spiel',
    lawn: 'Rasen',
    cutters: 'Mäher',
    one: 'Allein (1 Mäher)',
    two: 'Zu zweit (2 Mäher)',
    phoneOne: 'Auf dem Handy mähst du mit einem Mäher.',
    start: "Los geht's!",
  },
  undoKey: 'Schritt zurück',
  newGame: 'Neu',
  theoryButton: 'Theorie',
  howTo: (cutters: number) => [
    'Mähe den ganzen Rasen! Ein Mäher mäht 3 × 3 Felder. Teich, Bäume und Beete brauchst du nicht zu mähen.',
    cutters === 1
      ? 'Wenn alles gemäht ist: Feierabend! Der Mäher fährt zurück zum Start.'
      : 'Wenn alles gemäht ist: Feierabend! Alle fahren zurück zum Start. Es zählt die längere Runde.',
    'Je weniger Schritte, desto besser.',
  ],
  howToKeys: { one: 'Mäher 1', two: 'Mäher 2', home: 'Feierabend', undo: 'Schritt zurück' },
  howToAnimation: 'Ein Mäher fährt Streifen ab und mäht dabei drei Felder breit',
  result: {
    title: 'Feierabend!',
    stats: (longest: number, target: string) => `Längste Runde: ${longest} Schritte · ${target}`,
    score: (n: number) => `${n} Schritte`,
  },
  explanation: (bound: number) => [
    'Gesucht sind Runden, die zusammen den ganzen Rasen mähen. Es zählt die längste Runde, denn alle Mäher fahren gleichzeitig los.',
    `Jeder Schritt mäht höchstens 3 neue Felder; darum braucht dieser Rasen mindestens ${bound} Schritte. Die beste Runde zu finden ist trotzdem sehr schwer.`,
    'Der Löser des Lehrstuhls sucht mit cleveren Verfahren lange nach kurzen Runden; die Animation zeigt seine (oder eine einfache) Lösung.',
  ],
  explanationAnimation: 'Die Runden des Lösers auf diesem Rasen',
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
