import type { VoronoiTexts } from './i18n.de'

const bonusWords = (cities: number, mines: number) =>
  [cities > 0 && (cities === 1 ? 'town' : 'towns'), mines > 0 && (mines === 1 ? 'mine' : 'mines')]
    .filter(Boolean)
    .join(', ')

export const en: VoronoiTexts = {
  title: 'Conquer the Land',
  subtitle: (computer: boolean, castle: number, total: number) =>
    `${computer ? 'You against the computer' : 'Two players'} · castle ${castle} of ${total}`,
  subtitleOver: (computer: boolean) => `${computer ? 'You against the computer' : 'Two players'} · game over`,
  maps: {
    'map1-island': 'Island',
    'map2-river-valley': 'River Valley',
    'map3-lake-district': 'Lake District',
  },
  mapTaglines: {
    'map1-island': 'An island with a lake',
    'map2-river-valley': 'A river splits the land',
    'map3-lake-district': 'Many lakes, one coast',
  },
  names: { you: 'You', computer: 'Computer', blue: 'Blue', orange: 'Orange' },
  land: (points: number) => `${points} land`,
  bonus: (bonus: number, cities: number, mines: number) =>
    bonus > 0 ? `+${bonus} ${bonusWords(cities, mines)}` : '',
  scoreLabel: (name: string, total: number) => `${name}: ${total} points`,
  turn: {
    yours: 'Your turn',
    computer: 'Computer is thinking …',
    player: (name: string) => `${name}'s turn`,
  },
  hintMouse:
    'Point at the map: the preview shows your new land. Castles only on land and apart from each other.',
  hintTouch: 'Finger on the map, aim, let go: castle built. Only on land and apart from each other.',
  hintHold: 'Keep your finger on the map, aim, then let go.',
  hintOver: 'Game over. “New” starts a new game.',
  hintComputer: 'The computer tries hundreds of building sites …',
  preview: {
    title: 'New castle here:',
    land: (points: number) => `+${points} land`,
    bonus: (bonus: number, cities: number, mines: number) => `+${bonus} ${bonusWords(cities, mines)}`,
    water: 'Only on land!',
    town: 'Too close to a town or mine',
    tooClose: 'Too close to a castle',
  },
  passed: (name: string) => `${name}: no room left for a castle`,
  board: (map: string) => `Map ${map}`,
  setup: {
    title: 'New game',
    map: 'Map',
    opponent: 'Opponent',
    computer: 'Computer',
    friends: 'Two players',
    strength: 'Strength',
    levels: { easy: 'Easy', normal: 'Medium', hard: 'Hard' },
    castles: 'Castles per player',
    start: "Let's go!",
  },
  newGame: 'New',
  theoryButton: 'Theory',
  howTo: [
    'Take turns building castles. Each castle gets the land that is closer to it than to any other castle.',
    'Castles stand only on land and apart from each other. Towns are worth 5 points, the gold mine 10.',
    'Whoever has more points at the end wins!',
  ],
  howToAnimation: 'Two castles share the land; a new castle takes a piece',
  result: {
    won: 'You win!',
    lost: 'The computer wins',
    draw: "It's a draw!",
    playerWins: (name: string) => `${name} wins!`,
    stats: (a: string, pa: number, b: string, pb: number) => `${a} ${pa} : ${pb} ${b}`,
    score: (points: number) => `${points} points`,
  },
  explanation: [
    'Each castle gets all points that are closer to it than to any other castle: its Voronoi region. The borders lie exactly halfway between two castles.',
    'The computer tries hundreds of building sites and counts on a grid of thousands of points how much land and which towns each one brings. On “Hard” it also works out its opponent’s best answer.',
    'Nobody knows a strategy that always wins in the plane: the Voronoi game is an open research topic.',
  ],
  explanationAnimation: 'Circles grow from all castles at the same speed; where they meet are the borders',
  replay: 'Show again',
  theory: {
    title: 'Theory',
    close: 'Close the theory',
    voronoi: 'Voronoi diagram',
    delaunay: 'Delaunay triangles',
    circles: 'Empty circles',
    heat: 'Heat map',
    voronoiText:
      'Voronoi diagram: each castle gets all points that are closer to it than to any other. Every border is a piece of the perpendicular bisector of two castles.',
    delaunayText:
      'Delaunay triangles connect castles whose regions touch. The circumcircle of every triangle is empty: no castle lies inside it, and its centre is a corner of the Voronoi diagram.',
    heatText: (name: string) =>
      `Heat map: how many points a new castle brings at each spot for ${name} (own points plus what the opponent loses). This is how the computer rates its moves. The ring marks the best spot.`,
    heatFor: { you: 'you', computer: 'the computer', blue: 'Blue', orange: 'Orange' },
    heatLoading: 'Computing …',
  },
}
