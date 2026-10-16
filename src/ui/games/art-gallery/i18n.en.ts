import type { ArtGalleryTexts } from './i18n.de'

export const en: ArtGalleryTexts = {
  title: 'Light the Dungeon',
  subtitle: (i: number, n: number, k: number, expert: boolean) =>
    `${expert ? 'Expert dungeon' : 'Dungeon'} ${i} of ${n} · ${k} torches allowed`,
  torches: (n: number, k: number) => `Torches: ${n} of ${k}`,
  lit: 'lit',
  litLabel: 'Lit share of the dungeon',
  levels: 'Dungeons',
  restart: 'New',
  hintMouse: 'Click: place a torch · Drag: move it · Drag out of the dungeon: remove it',
  hintTouch: 'Tap: place a torch · Drag: move it · Drag onto the bucket: remove it',
  trash: 'Drag here to remove the torch',
  board: (k: number) => `Dungeon, ${k} torches allowed`,
  howTo: (k: number) => [
    'Place torches in the dungeon until everything is lit.',
    'Each torch lights everything it can see: walls and pillars cast shadows.',
    `Can you do it with ${k} ${k === 1 ? 'torch' : 'torches'}?`,
  ],
  howToKeys: 'Drag: move it; drag it out of the dungeon or onto the bucket: remove it',
  stats: (torches: number, time: string) => `${torches} ${torches === 1 ? 'torch' : 'torches'} · ${time}`,
  score: (torches: number, time: string) => `${torches} torches, ${time}`,
  fisk: (n: number, bound: number, k: number) => [
    `A dungeon without pillars and with ${n} corners can always be lit with ${bound} torches: a third of the corners.`,
    'The proof (Steve Fisk, 1978): cut the dungeon into triangles and colour the corners with three colours so that every triangle has each colour once. Torches at the corners of the rarest colour see every triangle.',
    `Finding the smallest number, however, is very hard (NP-hard); here ${k} are enough.`,
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
    main: 'Dungeons',
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
