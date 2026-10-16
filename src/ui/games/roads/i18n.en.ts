import type { RoadsTexts } from './i18n.de'

const km = (units: number) => `${units.toFixed(1)} km`

/** Texts of "Straßenbau" in English ("Road Works"). */
export const en: RoadsTexts = {
  title: 'Road Works',
  subtitle: (i: number, n: number, villages: number) => `Map ${i} of ${n} · ${villages} places`,
  randomSubtitle: (villages: number, seed: number) => `Random villages · ${villages} places · no. ${seed}`,
  km,
  length: (units: number) => `Length: ${km(units)}`,
  over: (percent: string) => `+${percent} % above the optimum`,
  optimal: 'Optimal!',
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
    ring: 'There is a ring here: the red road can go, all places stay connected.',
    tooLong: 'The red road is too long: shorter roads connect the same places.',
    build: 'Build the green road: the shortest one that joins two separate parts.',
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
  },
  time: (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')} min`,
}
