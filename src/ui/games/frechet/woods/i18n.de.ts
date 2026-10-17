import type { WoodsId } from '../../../../core/games/frechet/woods/shapes'

const metres = (m: number) => `${m.toFixed(1).replace('.', ',')} m`

/** Texts of the bonus walks "Im Wald" (German; the source of the dictionary type). */
export const woodsDe = {
  setTitle: 'Im Wald',
  setIntro: 'Bonus: Hier bleibt die Leine an Bäumen hängen.',
  subtitle: (i: number, n: number, name: string) => `Im Wald · ${name} · Spaziergang ${i} von ${n}`,
  walks: {
    oak: 'Um die Eiche',
    slalom: 'Slalom',
    fetch: 'Hinterm Baum',
    thicket: 'Dickicht',
  } satisfies Record<WoodsId, string>,
  board: (leash: number) => `Wald: zwei Wege zum Schloss zwischen Bäumen, Leine ${metres(leash)}`,
  caught: 'Die Leine hängt am Baum.',
  howTo: (leash: number, touch: boolean) => [
    'Im Wald bleibt die Leine an den Baumstämmen hängen und wickelt sich darum – dann wird sie länger.',
    'Wer zuerst um einen Baum läuft, muss auf den anderen warten, bis die Leine wieder frei ist.',
    touch
      ? `Halte „Mensch“ oder „Hund“ gedrückt; die Leine ist ${metres(leash)} lang.`
      : `A: Mensch geht, L: Hund läuft; die Leine ist ${metres(leash)} lang.`,
  ],
  howToAnimation:
    'Der Hund läuft um einen Baum, die Leine wickelt sich darum; der Mensch folgt, die Leine wird frei',
  snappedTree:
    'Die Leine hing an einem Baum. Wer zurück war, hätte früher nachkommen müssen – oder der andere warten.',
  stats: (longest: number, shortest: number, plain: number) =>
    `Deine längste Leine: ${metres(longest)} · kürzeste möglich: ${metres(shortest)} (ohne Bäume: ${metres(plain)})`,
  explanation: (shortest: number, longest: number) => [
    'Im Wald legt sich die Leine wie ein straffes Seil um die Stämme: Wie sie liegt, hängt davon ab, wer zuerst an welchem Baum vorbei ist.',
    'Der Computer hat alle Stellungen im Abstand von 5 cm durchprobiert; im Diagramm ist grün, wo die Leine an einem Baum hängt.',
    `Die kürzeste Leine, mit der es klappt, heißt homotoper Fréchet-Abstand: hier ${metres(shortest)}, du brauchtest ${metres(longest)}.`,
  ],
  explanationAnimation: 'Diagramm der Stellungen im Wald, mit deinem Weg und dem Weg des Computers',
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
