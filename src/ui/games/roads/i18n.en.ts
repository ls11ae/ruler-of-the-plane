import type { RoadsTexts } from './i18n.de'

const km = (units: number) => `${units.toFixed(1)} km`

/** Texts of "Straßenbau" in English ("Road Works"). */
export const en: RoadsTexts = {
  title: 'Road Works',
  subtitle: (i: number, n: number, villages: number) => `Map ${i} of ${n} · ${villages} places`,
  setSubtitle: (set: string, i: number, n: number, places: number) =>
    `${set} ${i} of ${n} · ${places} places`,
  randomSubtitle: (villages: number, seed: number) => `Random villages · ${villages} places · no. ${seed}`,
  km,
  length: (units: number) => `Length: ${km(units)}`,
  over: (percent: string) => `+${percent} % above the optimum`,
  optimal: 'Optimal!',
  nearlyOptimal: (percent: string) =>
    `Optimal! Only ${percent} % longer than the shortest network – hardly visible to the eye.`,
  groups: (n: number) => `Still ${n} parts to connect`,
  start: 'Connect all places',
  hintButton: 'Hint',
  theoryButton: 'Theory',
  restart: 'Restart',
  maps: 'Maps',
  board: (n: number) => `Map with ${n} places`,
  hintMouse: 'Drag from place to place: build a road · Click a road: remove it',
  hintTouch: 'Tap two places one after the other, or drag: build a road · Tap a road: remove it',
  hints: {
    ring: 'There is a ring here: the road with the cross can go, all places stay connected.',
    tooLong: 'The road with the cross is too long: shorter roads connect the same places.',
    build: 'Build the road with the plus: the shortest one that joins two separate parts.',
  },
  howTo: [
    'The king wants roads between all places – but roads are expensive.',
    'Drag from place to place to build a road; click a road to remove it.',
    'Can you build the shortest network? At the top you see how much longer yours is.',
  ],
  howToAnimation: 'Roads are built between the places until all are connected',
  stats: (units: number, hints: number, time: string) =>
    `${km(units)} · ${hints === 0 ? 'no hint' : hints === 1 ? '1 hint' : `${hints} hints`} · ${time}`,
  explanation: (n: number) => [
    'The computer takes the roads by length, shortest first, and skips every road that would close a ring (Kruskal, 1956).',
    `This gives the shortest network, a “minimum spanning tree”: ${n} places need exactly ${n - 1} roads.`,
    'It checks your solution by comparing lengths: every network that connects everything and is just as short is right.',
  ],
  kruskalAnimation: 'Kruskal: roads by length, rings are skipped',
  replay: 'Show again',
  score: (time: string) => time,
  theory: {
    title: 'Theory',
    close: 'Close the theory',
    tree: (n: number, roads: number) =>
      `The shortest network has no ring: ${n} places need exactly ${n - 1} roads. ${roads} would be possible.`,
    kruskal:
      'Kruskal: take the roads by length, shortest first. Skip every road whose places are already connected.',
    step: 'Next step',
    all: 'All steps',
    reset: 'From the start',
    status: (k: number, n: number) => `Step ${k} of ${n}`,
    taken: (len: string) => `${len}: built`,
    skipped: (len: string) => `${len}: skipped, closes a ring`,
    done: (len: string) => `Done: the shortest network is ${len} long.`,
    check:
      'This is also how the computer checks your solution: does it connect everything and is it just as short?',
  },
  picker: {
    title: 'Maps',
    random: 'Random villages',
    map: (i: number) => `Map ${i}`,
  },
  /** The tier screen: one sentence per tier (the set's name stands above it). */
  tierTeasers: {
    easy: 'Connect every place with as little road as possible.',
    medium: 'Roads may branch: where does a junction pay off?',
    hard: 'Even researchers do not know yet how close a computer can always get to the best network.',
  },
  resume: (set: string, i: number) => `${set}, map ${i}`,
  sets: {
    mst: 'Place to place',
    steiner: 'Junctions',
    bichromatic: 'Two kinds',
  },
  steiner: {
    hintMouse:
      'Drag from place to place: road · drag onto open land: junction · click a junction, then a place or junction: road · drag a junction: move it · click a road: remove it',
    hintTouch:
      'Tap a place or junction, then a place, junction or open land: road · drag a junction: move it · tap a road: remove it',
    hints: {
      deadEnd: 'The road with the cross ends at a junction where nothing goes on: it can go.',
      bend: 'Only two roads meet at the junction with the cross: without the bend the way would be shorter.',
      missing: 'A junction pays off here: build the road with the plus up to the dashed circle.',
      extra: 'The shortest network does not need the junction with the cross: remove its roads.',
      notOptimal: 'The road with the cross is not part of the shortest network.',
      build: 'Build the road with the plus.',
      angle: 'Move the junction in the green circle: the network is shortest when its roads meet at 120°.',
    },
    howTo: [
      'Now you may build junctions: drag a road from a place onto open land, and a junction appears there.',
      'Drag a junction to move it; it shows the angles between its roads. For a road from a junction, click or tap it, then a place or another junction.',
      'Junctions make the network shorter. When all angles are about right, the junctions slide to their best spots.',
    ],
    howToAnimation: 'Three roads meet at a junction, which slides to the best spot',
    otherShape: 'All angles are right – but joined differently, the network gets even shorter.',
    explanation: (places: number, shapes: number) => [
      'The network is shortest when exactly three roads meet at 120° at every junction (Steiner points).',
      `The computer tries every possible shape of the network – ${shapes === 1 ? 'one shape' : `${shapes} shapes`} for ${places} places – and moves the junctions of each until it is shortest.`,
      'With many places this no longer works: finding the shortest network with junctions is NP-hard.',
    ],
    animation: 'The junctions slide to their best spots until three roads meet at 120° everywhere',
    theory: {
      rule: 'A junction only pays off where three roads meet at 120°. Such points are called Steiner points.',
      check:
        'If your network has the same shape as the shortest one and all angles are right to within 5°, the junctions slide to their best spots: then it is optimal. A network of another shape can have 120° everywhere and still be longer.',
      compare: (mst: string, optimum: string, percent: string) =>
        `Without junctions the shortest network here is ${mst} long, with junctions ${optimum}: without, it is ${percent} % longer.`,
      bound:
        'Gilbert and Pollak conjectured in 1968: without junctions the shortest network is never more than about 15 % longer (15.5 % for the equilateral triangle). To this day it is proven only for a few places.',
      hard: 'Finding the shortest network with junctions is NP-hard. For these small maps the computer tried every possible shape in advance.',
      showMst: 'Without junctions',
      showOptimum: 'Shortest network',
    },
  },
  plane: {
    hintMouse: 'Drag from a castle to a village: build a road · Click a road: remove it',
    hintTouch: 'Tap a castle and a village, or drag: build a road · Tap a road: remove it',
    refused: 'Every road joins a castle and a village – never two castles or two villages.',
    crossing: (n: number) => (n === 1 ? 'Two roads cross' : `${n} crossings`),
    hints: {
      crossing: 'The road with the cross crosses another one: one of the two has to go.',
      notOptimal: 'The road with the cross is not part of the shortest network without crossings.',
      build: 'Build the road with the plus.',
    },
    howTo: [
      'Now there are castles and villages: every road joins a castle and a village.',
      'And no two roads may cross – the king cannot pay for bridges.',
      'Can you build the shortest network? Crossings are circled in red.',
    ],
    howToAnimation: 'Roads between castles and villages; one crosses another and is replaced',
    explanation: (crossings: number) => [
      `Without the ban it is easy: Kruskal with castle–village roads only. But here that network has ${crossings} crossings.`,
      'With the ban the problem is NP-hard (Borgelt and others, 2009). For these maps the computer searched all possibilities cleverly in advance.',
      'And “always the shortest allowed road” does not give the shortest network here.',
    ],
    animation:
      'Kruskal without the ban builds roads that cross; then the shortest network without crossings appears',
    animationFree: (length: string, crossings: number) =>
      `Without the ban: ${length}, ${crossings} crossings`,
    animationBest: (length: string) => `Shortest without crossings: ${length}`,
    theory: {
      freeTitle: 'Without the ban',
      mineTitle: 'Your network',
      free: (length: string, crossings: number) =>
        `Without the ban it is easy: Kruskal with castle–village roads only (${length}). Here that network has ${crossings} crossings.`,
      greedy: (length: string) =>
        `Always building the shortest allowed road gives ${length} here – not the shortest network.`,
      hard: 'With the ban the problem is NP-hard (Borgelt and others, 2009).',
      open: 'How much longer the network without crossings can be is open: proven is “at most O(log n) times as long” for n places (Akitaya, Biniaz, Demaine, Kleist, Stock, Tóth, 2024). Whether a constant factor suffices, nobody knows.',
    },
  },
  time: (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')} min`,
}
