import type { WoodsTexts } from './i18n.de'

const metres = (m: number) => `${m.toFixed(1)} m`

/** Texts of the bonus walks "In the Woods" in English. */
export const woodsEn: WoodsTexts = {
  setTitle: 'In the woods',
  setIntro: 'Bonus: here the leash catches on trees.',
  subtitle: (i: number, n: number, name: string) => `In the woods · ${name} · walk ${i} of ${n}`,
  walks: {
    oak: 'Round the oak',
    slalom: 'Slalom',
    fetch: 'Behind the tree',
    thicket: 'Thicket',
  },
  board: (leash: number) => `Woods: two paths to the castle between trees, leash ${metres(leash)}`,
  caught: 'The leash is caught on a tree.',
  howTo: (leash: number, touch: boolean) => [
    'In the woods the leash catches on the tree trunks and winds around them – then it gets longer.',
    'Whoever goes round a tree first must wait for the other until the leash is free again.',
    touch
      ? `Hold “Person” or “Dog”; the leash is ${metres(leash)} long.`
      : `A: the person walks, L: the dog runs; the leash is ${metres(leash)} long.`,
  ],
  howToAnimation:
    'The dog runs round a tree and the leash winds around it; the person follows and the leash comes free',
  snappedTree:
    'The leash was caught on a tree. The one behind should have caught up earlier – or the other should have waited.',
  stats: (longest: number, shortest: number, plain: number) =>
    `Your longest leash: ${metres(longest)} · shortest possible: ${metres(shortest)} (without trees: ${metres(plain)})`,
  explanation: (shortest: number, longest: number) => [
    'In the woods the leash lies around the trunks like a taut rope: how it lies depends on who passes which tree first.',
    'The computer tried every position, 5 cm apart; green in the diagram is where the leash is caught on a tree.',
    `The shortest leash that works is called the homotopic Fréchet distance: here ${metres(shortest)}, you needed ${metres(longest)}.`,
  ],
  explanationAnimation: 'Diagram of the positions in the woods, with your walk and the computer’s walk',
  theory: {
    intro:
      'Every point is a position: to the right the person walks, upwards the dog. It is light where the leash is long enough – measured as a rope around the trees.',
    wrapped: 'leash caught on a tree',
    shortest: (m: number) => `Shortest leash in the woods: ${metres(m)}`,
    plain: (m: number) => `Without trees ${metres(m)} would do.`,
    method:
      'How the leash lies depends only on where the person and the dog are: it starts straight and never jumps. That is why there is a diagram here too. The computer tried every position, 5 cm apart.',
    withTrees: 'With trees',
    withoutTrees: 'Without trees',
    treesLabel: 'Diagram with or without trees',
  },
}
