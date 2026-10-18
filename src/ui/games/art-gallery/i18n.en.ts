import type { ArtGalleryTexts } from './i18n.de'

export const en: ArtGalleryTexts = {
  title: 'Light the Dungeon',
  subtitle: (tier: string, i: number, n: number, k: number) =>
    `${tier} ${i} of ${n} · goal: ${k} ${k === 1 ? 'torch' : 'torches'}`,
  torches: (n: number) => `Torches: ${n}`,
  lit: 'lit',
  litLabel: 'Lit share of the dungeon',
  levels: 'Dungeons',
  restart: 'New',
  hintMouse: 'Click: place a torch · Drag: move it · Drag out of the dungeon: remove it',
  hintTouch: 'Tap: place a torch · Drag: move it · Drag onto the bucket: remove it',
  trash: 'Drag here to remove the torch',
  board: (k: number) => `Dungeon, goal: ${k} ${k === 1 ? 'torch' : 'torches'}`,
  howTo: (k: number) => [
    'Place torches in the dungeon until everything is lit.',
    'Each torch lights everything it can see: walls and pillars cast shadows.',
    `Can you do it with ${k} ${k === 1 ? 'torch' : 'torches'}?`,
  ],
  tierRules: [
    'Put torches into the dungeon until everything is lit.',
    'Each torch lights as far as it can see: walls and pillars cast shadows.',
    'The fewer torches you need, the more stars.',
  ],
  tierTeasers: {
    easy: 'Two or three torches are enough – where do they go?',
    medium: 'Pillars and niches cast shadows: four to eight torches.',
    hard: 'For experts: spiky rooms and huge dungeons with up to 17 torches.',
  },
  resume: (tier: string, i: number) => `${tier}, dungeon ${i}`,
  howToKeys: 'Drag: move it; drag it out of the dungeon or onto the bucket: remove it',
  stats: (torches: number, time: string) => `${torches} ${torches === 1 ? 'torch' : 'torches'} · ${time}`,
  score: (torches: number, time: string) => `${torches} torches, ${time}`,
  fisk: (n: number, bound: number, k: number, quarter: number | null) =>
    quarter === null
      ? [
          `A dungeon without pillars and with ${n} corners can always be lit with ${bound} torches: a third of the corners.`,
          'The proof (Steve Fisk, 1978): cut the dungeon into triangles and colour the corners with three colours so that every triangle has each colour once. Torches at the corners of the rarest colour see every triangle.',
          `Finding the smallest number, however, is very hard (NP-hard); here ${k} are enough.`,
        ]
      : [
          `A dungeon without pillars and with ${n} corners can always be lit with ${bound} torches (a third), with only right angles even with ${quarter} (a quarter; Kahn, Klawe, Kleitman).`,
          'Fisk’s proof: cut the dungeon into triangles and colour the corners with three colours so that every triangle has each colour; torches at the rarest colour see everything.',
          `Finding the smallest number is very hard (NP-hard); here ${k} are enough.`,
        ],
  sweep: (bound: number) => [
    'This is how the computer checks your torches: for each torch it sweeps a ray once around and notes where it hits walls. That gives the torch’s visibility region.',
    'Then it unites all visibility regions and subtracts them from the dungeon: if nothing is left, everything is lit.',
    `With pillars, (corners + pillars) ÷ 3 torches always suffice, here ${bound}; finding the smallest number is very hard (NP-hard).`,
  ],
  replay: 'Show again',
  howToAnimation: 'One torch lights what it sees, a second one the rest: 100 %',
  fiskAnimation: "Fisk's proof: triangles, three colours, torches at the rarest colour",
  sweepAnimation: 'A ray turns around the torch and reveals its visibility region',
  theoryButton: 'Theory',
  picker: {
    title: 'Dungeons',
    expert: 'For experts',
    card: (i: number) => `Dungeon ${i}`,
    torches: (k: number) => `${k} torches`,
  },
  theory: {
    title: 'Theory',
    close: 'Close theory',
    triangles: 'Triangles',
    visibility: 'Visibility regions',
    colouring: 'Fisk colouring',
    corners: 'corners',
    pillars: 'pillars',
    bound: 'always suffice',
    boundNoHoles: (n: number, bound: number) =>
      `${n} corners ÷ 3, rounded down: ${bound} torches always suffice.`,
    boundHoles: (n: number, h: number, bound: number) =>
      `(${n} corners + ${h} pillars) ÷ 3, rounded down: ${bound} torches always suffice.`,
    boundOrthogonal: (n: number, quarter: number, third: number) =>
      `Only right angles: ${n} corners ÷ 4, rounded down: ${quarter} torches always suffice (Kahn, Klawe, Kleitman, 1983). With any angles ÷ 3: ${third}.`,
    orthogonalText:
      'Their proof cuts the dungeon into quadrilaterals without a reflex corner and colours the corners with four colours so that every quadrilateral has each colour once. Every corner sees its whole quadrilateral, so the rarest colour suffices.',
    level: (k: number) => `This dungeon can be done with ${k}.`,
    yours: (n: number) => `Your torches: ${n}.`,
    np: 'Finding the smallest number is NP-hard: nobody knows a fast method for it.',
    visibilityText:
      'Each torch sees a polygon (its visibility region). The game unites all of them and subtracts them from the dungeon; whatever is left stays dark.',
    fiskText:
      "Fisk's proof: every triangle has one corner of each colour. The rarest colour (outlined) needs at most a third of the corners, and its corners see all triangles.",
    fiskHoles: 'With pillars the three-colouring does not always work; the bound holds anyway.',
    colours: ['Red', 'Green', 'Blue'],
  },
}
