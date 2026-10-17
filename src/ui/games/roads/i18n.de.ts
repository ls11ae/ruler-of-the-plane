import type { Hint } from '../../../core/games/roads/mst'

const km = (units: number) => `${units.toFixed(1).replace('.', ',')} km`

/** Texts of "Straßenbau" (German; the source of the dictionary type). */
export const de = {
  title: 'Straßenbau',
  subtitle: (i: number, n: number, villages: number) => `Karte ${i} von ${n} · ${villages} Orte`,
  randomSubtitle: (villages: number, seed: number) => `Zufallsdörfer · ${villages} Orte · Nr. ${seed}`,
  km,
  length: (units: number) => `Länge: ${km(units)}`,
  over: (percent: string) => `+${percent.replace('.', ',')} % über dem Optimum`,
  optimal: 'Optimal!',
  groups: (n: number) => (n === 2 ? 'Noch 2 Teile verbinden' : `Noch ${n} Teile verbinden`),
  start: 'Verbinde alle Orte',
  hintButton: 'Tipp',
  theoryButton: 'Theorie',
  restart: 'Neu',
  maps: 'Karten',
  board: (n: number) => `Karte mit ${n} Orten`,
  hintMouse: 'Von Ort zu Ort ziehen: Straße bauen · Straße anklicken: abreißen',
  hintTouch: 'Zwei Orte nacheinander antippen oder ziehen: Straße bauen · Straße antippen: abreißen',
  hints: {
    ring: 'Hier ist ein Ring: Die Straße mit dem Kreuz kann weg, alle Orte bleiben verbunden.',
    tooLong: 'Die Straße mit dem Kreuz ist zu lang: Kürzere Straßen verbinden dieselben Orte.',
    build: 'Bau die Straße mit dem Plus: die kürzeste, die zwei getrennte Teile verbindet.',
  } satisfies Record<NonNullable<Hint>['kind'], string>,
  howTo: [
    'Der König will alle Orte mit Straßen verbinden – aber Straßen sind teuer.',
    'Zieh von Ort zu Ort, um eine Straße zu bauen; klick eine Straße an, um sie abzureißen.',
    'Schaffst du das kürzeste Straßennetz? Oben siehst du, wie viel länger deins ist.',
  ],
  howToAnimation: 'Straßen werden zwischen den Orten gebaut, bis alle verbunden sind',
  stats: (units: number, hints: number, time: string) =>
    `${km(units)} · ${hints === 0 ? 'ohne Tipp' : hints === 1 ? '1 Tipp' : `${hints} Tipps`} · ${time}`,
  explanation: (n: number) => [
    'Der Computer nimmt die Straßen der Länge nach, die kürzeste zuerst, und überspringt jede, die einen Ring schließen würde (Kruskal, 1956).',
    `So entsteht das kürzeste Netz, ein „minimaler Spannbaum“: Für ${n} Orte braucht man genau ${n - 1} Straßen.`,
    'Deine Lösung prüft er, indem er die Längen vergleicht: Jedes Netz, das alles verbindet und so kurz ist, ist richtig.',
  ],
  kruskalAnimation: 'Kruskal: Straßen der Länge nach, Ringe werden übersprungen',
  replay: 'Nochmal zeigen',
  score: (time: string) => time,
  theory: {
    title: 'Theorie',
    close: 'Theorie schließen',
    tree: (n: number, roads: number) =>
      `Das kürzeste Netz hat keinen Ring: ${n} Orte brauchen genau ${n - 1} Straßen. Möglich wären ${roads}.`,
    kruskal:
      'Kruskal: Nimm die Straßen der Länge nach, die kürzeste zuerst. Überspringe jede, deren Orte schon verbunden sind.',
    step: 'Nächster Schritt',
    all: 'Alle Schritte',
    reset: 'Von vorn',
    status: (k: number, n: number) => `Schritt ${k} von ${n}`,
    taken: (len: string) => `${len}: gebaut`,
    skipped: (len: string) => `${len}: übersprungen, schließt einen Ring`,
    done: (len: string) => `Fertig: Das kürzeste Netz ist ${len} lang.`,
    check: 'So prüft der Computer auch deine Lösung: Verbindet sie alles und ist sie genauso kurz?',
  },
  picker: {
    title: 'Karten',
    random: 'Zufallsdörfer',
  },
  time: (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')} min`,
}

export type RoadsTexts = typeof de
