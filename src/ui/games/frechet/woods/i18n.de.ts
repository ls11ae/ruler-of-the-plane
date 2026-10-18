import type { WoodsId } from '../../../../core/games/frechet/woods/shapes'

const metres = (m: number) => `${m.toFixed(1).replace('.', ',')} m`

/** Texts of the bonus walks "Im Wald" (German; the source of the dictionary type). */
export const woodsDe = {
  setTitle: 'Im Wald',
  setIntro: 'Bonus: Hier wickelt sich die Leine um Bäume und Laternenpfähle.',
  setIntroHarder: 'Noch kniffliger: Hier wickelt sich die Leine um Bäume und Pfähle.',
  subtitle: (i: number, n: number, name: string) => `Im Wald · ${name} · Spaziergang ${i} von ${n}`,
  subtitleTier: (tier: string, i: number, n: number, name: string) =>
    `Im Wald · ${tier} · ${name} · ${i} von ${n}`,
  walks: {
    lamp: 'Laternenpfahl',
    bakery: 'Vor dem Bäcker',
    fetch: 'Hinterm Baum',
    eight: 'Achterbahn',
    wm1: 'Laternengasse',
    wm2: 'Stöckchen am Pfahl',
    wm3: 'Waldrunde',
    ws1: 'Am Tor angebunden',
    ws2: 'Torpfosten',
    ws3: 'Fuchsbau',
    ws4: 'Schlossrunde',
  } satisfies Record<WoodsId, string>,
  board: (leash: number) => `Wald: zwei Wege zum Schloss zwischen Bäumen, Leine ${metres(leash)}`,
  round: 'Start und Ziel',
  caught: 'Die Leine hängt am Baum.',
  caughtPost: 'Die Leine hängt am Pfahl.',
  coiledTitle: (n: number) => `Leine ${n}× aufgewickelt!`,
  coiled: (n: number) => `Die Leine ist ${n}× um den Pfahl gewickelt.`,
  tied: 'Der Hund hat die Leine 2× um den Pfahl gewickelt: erst abwickeln, dann los!',
  howTo: (leash: number, touch: boolean) => [
    'Im Wald bleibt die Leine an Stämmen und Pfählen hängen. Läuft einer um einen dünnen Pfahl, wickelt sie sich auf – jede Runde kostet Leine.',
    'Wer vorne ist, wartet, bis der andere hinterherkommt und die Leine wieder abwickelt.',
    touch
      ? `Halte „Mensch“ oder „Hund“ gedrückt; die Leine ist ${metres(leash)} lang.`
      : `A: Mensch geht, L: Hund läuft; die Leine ist ${metres(leash)} lang.`,
  ],
  howToAnimation:
    'Der Hund läuft um einen Laternenpfahl, die Leine wickelt sich auf; der Mensch folgt, die Leine wird frei',
  snappedTree:
    'Die Leine hing an einem Baum. Wer zurück war, hätte früher nachkommen müssen – oder der andere warten.',
  snappedPost:
    'Die Leine hing an einem Pfahl. Wer zurück war, hätte früher nachkommen müssen – oder der andere warten.',
  snappedCoil: (n: number) =>
    `Die Leine war ${n}× um einen Pfahl gewickelt. Wer vorne war, hätte warten müssen, bis der andere hinterherkommt.`,
  stats: (longest: number, shortest: number, plain: number) =>
    `Deine längste Leine: ${metres(longest)} · kürzeste möglich: ${metres(shortest)} (ohne Bäume: ${metres(plain)})`,
  explanation: (shortest: number, longest: number) => [
    'Im Wald legt sich die Leine wie ein straffes Seil um die Stämme: Wie sie liegt, hängt davon ab, wer zuerst an welchem Baum vorbei ist.',
    'Der Computer hat alle Stellungen im Abstand von 5 cm durchprobiert; im Diagramm ist grün gepunktet, wo die Leine an einem Baum hängt.',
    `Die kürzeste Leine, mit der es klappt, heißt homotoper Fréchet-Abstand: hier ${metres(shortest)}, du brauchtest ${metres(longest)}.`,
  ],
  explanationAnimation: 'Diagramm der Stellungen im Wald, mit deinem Weg und dem Weg des Computers',
  start: {
    label: 'Wie liegt die Leine am Start?',
    clockwise: 'Eine Runde mehr im Uhrzeigersinn um den Pfosten',
    anticlockwise: 'Eine Runde mehr gegen den Uhrzeigersinn um den Pfosten',
    value: (k: number) =>
      k === 0
        ? 'gerade'
        : `${Math.abs(k)}× ${k > 0 ? 'im Uhrzeigersinn' : 'gegen den Uhrzeigersinn'} um den Pfosten`,
    short: (k: number) =>
      k === 0 ? 'gerade' : `${Math.abs(k)}× ${k > 0 ? 'im' : 'gegen den'} Uhrzeigersinn`,
    length: (m: number) => `Leine am Start: ${metres(m)}`,
    howTo:
      'Hier wählst du vor dem ersten Schritt, wie die Leine um den Pfosten am Tor liegt. Schau dir den Weg des Hundes an!',
    howToRound:
      'Hier wählst du vor dem ersten Schritt, wie die Leine um den Pfosten am Schloss liegt. Schau dir an, wo der Hund seine Runden dreht!',
    explanation: (k: number) =>
      `Wie die Leine am Start liegt, durftest du wählen. Der homotope Fréchet-Abstand ist die kürzeste Leine über alle Arten, wie sie liegen kann – hier mit der Leine ${k === 0 ? 'gerade' : `${Math.abs(k)}× ${k > 0 ? 'im' : 'gegen den'} Uhrzeigersinn um den Pfosten`} am Start.`,
  },
  chart: {
    title: 'Kürzeste Leine je Startlage',
    best: 'beste',
    yours: 'deine',
    leash: (m: number) => `die Leine des Spaziergangs: ${metres(m)}`,
    summary: (list: string, k: number) =>
      `Kürzeste Leine je Startlage: ${list}. Am besten: ${k === 0 ? 'gerade' : `${Math.abs(k)}× ${k > 0 ? 'im' : 'gegen den'} Uhrzeigersinn`}.`,
    text: 'Für jede Startlage hat der Computer die kürzeste Leine gesucht. Der homotope Fréchet-Abstand ist die kürzeste von allen.',
  },
  theory: {
    intro:
      'Jeder Punkt ist eine Stellung: Nach rechts läuft der Mensch, nach oben der Hund. Hell ist, wo die Leine reicht – gemessen als Seil um die Bäume.',
    wrapped: 'Leine hängt am Baum',
    shortest: (m: number) => `Kürzeste Leine im Wald: ${metres(m)}`,
    plain: (m: number) => `Ohne Bäume reichten ${metres(m)}.`,
    method:
      'Wie die Leine liegt, hängt nur davon ab, wo Mensch und Hund sind: Sie startet gerade und springt nie. Darum gibt es auch hier ein Diagramm. Der Computer hat alle Stellungen im Abstand von 5 cm durchprobiert.',
    withTrees: 'Mit Bäumen',
    withoutTrees: 'Ohne Bäume',
    treesLabel: 'Diagramm mit oder ohne Bäume',
  },
}

export type WoodsTexts = typeof woodsDe
