import type { JunctionHint } from '../../../core/games/roads/junctions'
import type { Hint } from '../../../core/games/roads/mst'
import type { PlaneHint } from '../../../core/games/roads/plane'

const km = (units: number) => `${units.toFixed(1).replace('.', ',')} km`

/** Texts of "Straßenbau" (German; the source of the dictionary type). */
export const de = {
  title: 'Straßenbau',
  subtitle: (i: number, n: number, villages: number) => `Karte ${i} von ${n} · ${villages} Orte`,
  setSubtitle: (set: string, i: number, n: number, places: number) => `${set} ${i} von ${n} · ${places} Orte`,
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
    map: (i: number) => `Karte ${i}`,
  },
  /** The three sets of maps (the picker's sections). */
  sets: {
    mst: 'Von Ort zu Ort',
    steiner: 'Kreuzungen',
    bichromatic: 'Zwei Sorten',
  },
  /** "Kreuzungen": roads may branch at junctions (Steiner tree). */
  steiner: {
    hintMouse:
      'Von Ort zu Ort ziehen: Straße · aufs freie Land ziehen: Kreuzung · Kreuzung ziehen: verschieben · Straße anklicken: abreißen',
    hintTouch:
      'Ort antippen, dann Ort oder freies Land: Straße · Kreuzung ziehen: verschieben · Straße antippen: abreißen',
    hints: {
      deadEnd: 'Die Straße mit dem Kreuz endet an einer Kreuzung, von der nichts weitergeht: Sie kann weg.',
      bend: 'An der Kreuzung mit dem Kreuz treffen sich nur zwei Straßen: Ohne den Knick wäre der Weg kürzer.',
      missing: 'Hier lohnt sich eine Kreuzung: Bau die Straße mit dem Plus bis zum gestrichelten Kreis.',
      extra: 'Die Kreuzung mit dem Kreuz braucht das kürzeste Netz nicht: Reiß ihre Straßen ab.',
      notOptimal: 'Die Straße mit dem Kreuz gehört nicht zum kürzesten Netz.',
      build: 'Bau die Straße mit dem Plus.',
      angle:
        'Schieb die Kreuzung im grünen Kreis: Am kürzesten wird es, wenn sich ihre Straßen unter 120° treffen.',
    } satisfies Record<NonNullable<JunctionHint>['kind'], string>,
    howTo: [
      'Jetzt darfst du Kreuzungen bauen: Zieh eine Straße von einem Ort aufs freie Land, dort entsteht eine Kreuzung.',
      'Zieh eine Kreuzung, um sie zu verschieben; an ihr siehst du die Winkel zwischen den Straßen.',
      'Mit Kreuzungen wird das Netz kürzer. Bis 1 % über dem Optimum zählt als optimal.',
    ],
    howToAnimation: 'Drei Straßen treffen sich an einer Kreuzung, die an den besten Platz rutscht',
    explanation: (places: number, shapes: number) => [
      'Am kürzesten wird das Netz, wenn sich an jeder Kreuzung genau drei Straßen unter 120° treffen (Steinerpunkte).',
      `Der Computer probiert jede mögliche Form des Netzes aus – bei ${places} Orten ${shapes === 1 ? 'eine Form' : `${shapes} Formen`} – und schiebt bei jeder die Kreuzungen, bis das Netz am kürzesten ist.`,
      'Bei vielen Orten geht das nicht mehr: Das kürzeste Netz mit Kreuzungen zu finden ist NP-schwer.',
    ],
    animation:
      'Die Kreuzungen rutschen an ihre besten Plätze, bis sich überall drei Straßen unter 120° treffen',
    theory: {
      rule: 'Eine Kreuzung lohnt sich nur, wenn sich dort drei Straßen unter 120° treffen. Solche Punkte heißen Steinerpunkte.',
      compare: (mst: string, optimum: string, percent: string) =>
        `Ohne Kreuzungen ist das kürzeste Netz hier ${mst} lang, mit Kreuzungen ${optimum}: Ohne ist es ${percent.replace('.', ',')} % länger.`,
      bound:
        'Gilbert und Pollak vermuteten 1968: Ohne Kreuzungen ist das kürzeste Netz nie mehr als etwa 15 % länger (beim gleichseitigen Dreieck sind es 15,5 %). Bewiesen ist das bis heute nur für wenige Orte.',
      hard: 'Das kürzeste Netz mit Kreuzungen zu finden ist NP-schwer. Für diese kleinen Karten hat der Computer vorab jede mögliche Form durchprobiert.',
      showMst: 'Ohne Kreuzungen',
      showOptimum: 'Kürzestes Netz',
    },
  },
  /** "Zwei Sorten": every road joins a castle and a village, and no two roads cross. */
  plane: {
    hintMouse: 'Von einer Burg zu einem Dorf ziehen: Straße bauen · Straße anklicken: abreißen',
    hintTouch: 'Burg und Dorf nacheinander antippen oder ziehen: Straße bauen · Straße antippen: abreißen',
    refused: 'Jede Straße verbindet eine Burg mit einem Dorf – nie zwei Burgen oder zwei Dörfer.',
    crossing: (n: number) => (n === 1 ? 'Zwei Straßen schneiden sich' : `${n} Schnittpunkte`),
    hints: {
      crossing: 'Die Straße mit dem Kreuz schneidet eine andere: Eine von beiden muss weg.',
      notOptimal: 'Die Straße mit dem Kreuz gehört nicht zum kürzesten Netz ohne Schnittpunkte.',
      build: 'Bau die Straße mit dem Plus.',
    } satisfies Record<NonNullable<PlaneHint>['kind'], string>,
    howTo: [
      'Jetzt gibt es Burgen und Dörfer: Jede Straße verbindet eine Burg mit einem Dorf.',
      'Und keine zwei Straßen dürfen sich schneiden – Brücken kann der König nicht bezahlen.',
      'Schaffst du das kürzeste Netz? Schnittpunkte werden rot eingekreist.',
    ],
    howToAnimation: 'Straßen zwischen Burgen und Dörfern; eine schneidet eine andere und wird ersetzt',
    explanation: (crossings: number) => [
      `Ohne das Verbot ist es leicht: Kruskal nur mit Straßen zwischen Burg und Dorf. Doch dieses Netz hat hier ${crossings} Schnittpunkte.`,
      'Mit dem Verbot ist die Aufgabe NP-schwer (Borgelt und andere, 2009). Für diese Karten hat der Computer vorab alle Möglichkeiten geschickt durchsucht.',
      'Und „immer die kürzeste erlaubte Straße“ führt hier nicht zum kürzesten Netz.',
    ],
    animation:
      'Kruskal ohne Verbot baut Straßen mit Schnittpunkten; dann erscheint das kürzeste Netz ohne Schnittpunkte',
    animationFree: (length: string, crossings: number) =>
      `Ohne Verbot: ${length}, ${crossings} Schnittpunkte`,
    animationBest: (length: string) => `Ohne Schnittpunkte am kürzesten: ${length}`,
    theory: {
      freeTitle: 'Ohne Verbot',
      mineTitle: 'Dein Netz',
      free: (length: string, crossings: number) =>
        `Ohne das Verbot ist es leicht: Kruskal nur mit Straßen zwischen Burg und Dorf (${length}). Hier hat dieses Netz ${crossings} Schnittpunkte.`,
      greedy: (length: string) =>
        `Immer die kürzeste erlaubte Straße bauen ergibt hier ${length} – das ist nicht das kürzeste Netz.`,
      hard: 'Mit dem Verbot ist die Aufgabe NP-schwer (Borgelt und andere, 2009).',
      open: 'Wie viel länger das Netz ohne Schnittpunkte höchstens sein kann, ist offen: Bewiesen ist „höchstens O(log n)-mal so lang“ bei n Orten (Akitaya, Biniaz, Demaine, Kleist, Stock, Tóth, 2024). Ob ein fester Faktor reicht, weiß niemand.',
    },
  },
  time: (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')} min`,
}

export type RoadsTexts = typeof de
