/** Texts of "Erobere das Land" (German; the source of the dictionary type). */
const bonusWords = (cities: number, mines: number) =>
  [cities > 0 && (cities === 1 ? 'Stadt' : 'Städte'), mines > 0 && (mines === 1 ? 'Mine' : 'Minen')]
    .filter(Boolean)
    .join(', ')

export const de = {
  title: 'Erobere das Land',
  /** `computer`: the computer's strength, or null for two players. */
  subtitle: (computer: string | null, castle: number, total: number) =>
    `${computer ? `Du gegen den Computer (${computer})` : 'Zwei Spieler'} · Burg ${castle} von ${total}`,
  subtitleOver: (computer: string | null) =>
    `${computer ? `Du gegen den Computer (${computer})` : 'Zwei Spieler'} · Spiel vorbei`,
  maps: {
    'map1-island': 'Insel',
    'map2-river-valley': 'Flusstal',
    'map3-lake-district': 'Seenplatte',
  } as Record<string, string>,
  mapTaglines: {
    'map1-island': 'Eine Insel mit See',
    'map2-river-valley': 'Ein Fluss teilt das Land',
    'map3-lake-district': 'Viele Seen, eine Küste',
  } as Record<string, string>,
  names: { you: 'Du', computer: 'Computer', blue: 'Blau', orange: 'Orange' },
  land: (points: number) => `${points} Land`,
  bonus: (bonus: number, cities: number, mines: number) =>
    bonus > 0 ? `+${bonus} ${bonusWords(cities, mines)}` : '',
  scoreLabel: (name: string, total: number) => `${name}: ${total} Punkte`,
  turn: {
    yours: 'Du bist dran',
    computer: 'Computer überlegt …',
    player: (name: string) => `${name} ist dran`,
  },
  hintMouse: 'Zeig auf die Karte: Die Vorschau zeigt dein neues Gebiet. Burgen nur an Land und mit Abstand.',
  hintTouch: 'Finger auf die Karte, zielen, loslassen: Burg gebaut. Nur an Land und mit Abstand.',
  hintHold: 'Halte den Finger auf der Karte, ziel und lass dann los.',
  hintOver: 'Spiel vorbei. „Neu“ startet ein neues Spiel.',
  hintComputer: 'Der Computer probiert Hunderte Bauplätze aus …',
  preview: {
    title: 'Neue Burg hier:',
    land: (points: number) => `+${points} Land`,
    bonus: (bonus: number, cities: number, mines: number) => `+${bonus} ${bonusWords(cities, mines)}`,
    water: 'Nur an Land!',
    town: 'Zu nah an einer Stadt oder Mine',
    tooClose: 'Zu nah an einer Burg',
  },
  passed: (name: string) => `${name}: kein Platz mehr für eine Burg`,
  board: (map: string) => `Karte ${map}`,
  setup: {
    title: 'Neues Spiel',
    map: 'Karte',
    opponent: 'Gegner',
    computer: 'Computer',
    friends: 'Zu zweit',
    strength: 'Stärke',
    castles: 'Burgen je Spieler',
    won: 'gewonnen',
    start: "Los geht's!",
  },
  newGame: 'Neu',
  theoryButton: 'Theorie',
  howTo: [
    'Baut abwechselnd Burgen. Jede Burg bekommt das Land, das näher an ihr liegt als an jeder anderen Burg.',
    'Burgen stehen nur an Land und mit Abstand. Städte bringen 5 Punkte, die Goldmine 10.',
    'Wer am Ende mehr Punkte hat, gewinnt!',
  ],
  howToAnimation: 'Zwei Burgen teilen das Land; eine neue Burg nimmt sich ein Stück',
  /** The rules on the tier screen, where the tiers are the computer's strength. */
  tierRules: [
    'Baut abwechselnd Burgen. Jede Burg bekommt das Land, das näher an ihr liegt als an jeder anderen Burg.',
    'Burgen stehen nur an Land und mit Abstand. Städte bringen 5 Punkte, die Goldmine 10.',
    'Wer am Ende mehr Punkte hat, gewinnt: Jede Karte, auf der du den Computer schlägst, bringt einen Stern.',
  ],
  tierTeasers: {
    easy: 'Der Computer baut gut, aber nicht immer am besten Platz.',
    medium: 'Der Computer nimmt immer den Platz, der ihm am meisten bringt.',
    hard: 'Der Computer denkt einen Zug voraus: Er rechnet auch deine beste Antwort durch.',
  },
  friends: 'Zu zweit spielen',
  resume: (map: string, who: string) => `${map}, ${who}`,
  result: {
    won: 'Gewonnen!',
    lost: 'Der Computer gewinnt',
    draw: 'Unentschieden!',
    playerWins: (name: string) => `${name} gewinnt!`,
    stats: (a: string, pa: number, b: string, pb: number) => `${a} ${pa} : ${pb} ${b}`,
    score: (points: number) => `${points} Punkte`,
  },
  explanation: [
    'Jede Burg bekommt alle Punkte, die näher an ihr liegen als an jeder anderen Burg: ihre Voronoi-Region. Die Grenzen liegen genau in der Mitte zwischen zwei Burgen.',
    'Der Computer probiert Hunderte Bauplätze aus und zählt auf einem Raster aus Tausenden Punkten, wie viel Land und welche Städte jeder bringt. Auf „Schwer“ rechnet er auch die beste Antwort seines Gegners durch.',
    'Eine Strategie, die immer gewinnt, kennt für die Ebene niemand: Das Voronoi-Spiel ist ein offenes Forschungsthema.',
  ],
  explanationAnimation:
    'Kreise wachsen von allen Burgen gleich schnell; wo sie sich treffen, liegen die Grenzen',
  replay: 'Nochmal zeigen',
  theory: {
    title: 'Theorie',
    close: 'Theorie schließen',
    voronoi: 'Voronoi-Diagramm',
    delaunay: 'Delaunay-Dreiecke',
    circles: 'Leere Umkreise',
    heat: 'Wärmekarte',
    voronoiText:
      'Voronoi-Diagramm: Jede Burg bekommt alle Punkte, die näher an ihr liegen als an jeder anderen. Jede Grenze ist ein Stück der Mittelsenkrechten zwischen zwei Burgen.',
    delaunayText:
      'Delaunay-Dreiecke verbinden Burgen, deren Gebiete aneinanderstoßen. Der Umkreis jedes Dreiecks ist leer: Keine Burg liegt darin, und sein Mittelpunkt ist eine Ecke des Voronoi-Diagramms.',
    heatText: (name: string) =>
      `Wärmekarte: So viele Punkte bringt eine neue Burg an jeder Stelle für ${name} (eigene Punkte plus die, die der Gegner verliert). So bewertet der Computer seine Züge. Der Ring markiert die beste Stelle.`,
    heatFor: { you: 'dich', computer: 'den Computer', blue: 'Blau', orange: 'Orange' },
    thinkTime: (ms: number) => `Rechenzeit für den letzten Zug des Computers: ${ms} ms.`,
    heatLoading: 'Wird berechnet …',
  },
}

export type VoronoiTexts = typeof de
