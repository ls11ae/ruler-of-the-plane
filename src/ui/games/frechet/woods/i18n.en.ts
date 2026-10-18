import type { WoodsTexts } from './i18n.de'

const metres = (m: number) => `${m.toFixed(1)} m`

/** Texts of the bonus walks "In the Woods" in English. */
export const woodsEn: WoodsTexts = {
  setTitle: 'In the woods',
  setIntro: 'Bonus: here the leash winds round trees and lamp posts.',
  setIntroHarder: 'Even trickier: here the leash winds round trees and posts.',
  subtitle: (i: number, n: number, name: string) => `In the woods · ${name} · walk ${i} of ${n}`,
  subtitleTier: (tier: string, i: number, n: number, name: string) =>
    `In the woods · ${tier} · ${name} · ${i} of ${n}`,
  walks: {
    lamp: 'Lamp post',
    bakery: 'Outside the bakery',
    fetch: 'Behind the tree',
    eight: 'Figure of eight',
    wm1: 'Lamp lane',
    wm2: 'Stick by the post',
    wm3: 'Woodland loop',
    ws1: 'Tied at the gate',
    ws2: 'The gate post',
    ws3: 'Fox den',
  },
  board: (leash: number) => `Woods: two paths to the castle between trees, leash ${metres(leash)}`,
  caught: 'The leash is caught on a tree.',
  caughtPost: 'The leash is caught on a post.',
  coiledTitle: (n: number) => `Leash wound up ${n}×!`,
  coiled: (n: number) => `The leash is wound ${n}× round the post.`,
  tied: 'The dog has wound the leash twice round the post: unwind it first, then off you go!',
  howTo: (leash: number, touch: boolean) => [
    'In the woods the leash catches on trunks and posts. If one of them runs round a thin post, it winds up – every turn costs leash.',
    'Whoever is ahead waits until the other one follows and unwinds the leash again.',
    touch
      ? `Hold “Person” or “Dog”; the leash is ${metres(leash)} long.`
      : `A: the person walks, L: the dog runs; the leash is ${metres(leash)} long.`,
  ],
  howToAnimation:
    'The dog runs round a lamp post and the leash winds up; the person follows and the leash comes free',
  snappedTree:
    'The leash was caught on a tree. The one behind should have caught up earlier – or the other should have waited.',
  snappedPost:
    'The leash was caught on a post. The one behind should have caught up earlier – or the other should have waited.',
  snappedCoil: (n: number) =>
    `The leash was wound ${n}× round a post. Whoever was ahead should have waited for the other to follow.`,
  stats: (longest: number, shortest: number, plain: number) =>
    `Your longest leash: ${metres(longest)} · shortest possible: ${metres(shortest)} (without trees: ${metres(plain)})`,
  explanation: (shortest: number, longest: number) => [
    'In the woods the leash lies around the trunks like a taut rope: how it lies depends on who passes which tree first.',
    'The computer tried every position, 5 cm apart; dotted green in the diagram is where the leash is caught on a tree.',
    `The shortest leash that works is called the homotopic Fréchet distance: here ${metres(shortest)}, you needed ${metres(longest)}.`,
  ],
  explanationAnimation: 'Diagram of the positions in the woods, with your walk and the computer’s walk',
  start: {
    label: 'How does the leash lie at the start?',
    clockwise: 'One more turn clockwise round the post',
    anticlockwise: 'One more turn anticlockwise round the post',
    value: (k: number) =>
      k === 0 ? 'straight' : `${Math.abs(k)}× ${k > 0 ? 'clockwise' : 'anticlockwise'} round the post`,
    short: (k: number) => (k === 0 ? 'straight' : `${Math.abs(k)}× ${k > 0 ? 'clockwise' : 'anticlockwise'}`),
    length: (m: number) => `Leash at the start: ${metres(m)}`,
    howTo:
      'Here you choose before the first step how the leash lies round the post at the gate. Look at the dog’s path!',
    explanation: (k: number) =>
      `You could choose how the leash lies at the start. The homotopic Fréchet distance is the shortest leash over all the ways it can lie – here with the leash ${k === 0 ? 'straight' : `wound ${Math.abs(k)}× ${k > 0 ? 'clockwise' : 'anticlockwise'} round the post`} at the start.`,
  },
  chart: {
    title: 'Shortest leash for each start',
    best: 'best',
    yours: 'yours',
    leash: (m: number) => `the walk’s leash: ${metres(m)}`,
    summary: (list: string, k: number) =>
      `Shortest leash for each start: ${list}. Best: ${k === 0 ? 'straight' : `${Math.abs(k)}× ${k > 0 ? 'clockwise' : 'anticlockwise'}`}.`,
    text: 'For each way the leash can lie at the start, the computer searched for the shortest leash. The homotopic Fréchet distance is the shortest of them all.',
  },
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
