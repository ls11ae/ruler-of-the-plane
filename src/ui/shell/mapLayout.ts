import type { CartographyIcon } from '../art/cartography'
import type { Pt } from '../art/sketch'
import type { GameId } from '../games/registry'
import type { Layout } from './useLayout'

/** A place on the start map: one per game, plus the links to the old version and to tsp-boards. */
export type PlaceId = GameId | 'old-version' | 'tsp'

export interface Sprite {
  icon: CartographyIcon
  at: Pt
  size: number
  /** Pennant in a player colour on top of a castle. */
  flag?: 'player-1' | 'player-2'
}

export interface MapLayout {
  width: number
  height: number
  island: Pt[]
  lake: Pt[]
  /** The small island of the old ruins. */
  islet: Pt[]
  compass: { at: Pt; size: number }
  title: Pt
  subtitle: Pt
  controls: Pt
  /** The logo line at the bottom; in landscape the credits button sits next to it. */
  logo: Pt
  /** Whether the credits button joins the controls (language, full screen) instead of the logo line. */
  creditsWithControls: boolean
  /** Label position per place (centre of the label). */
  labels: Record<PlaceId, Pt>
  /** Icons per place, drawn under the label; decorations belong to no place. */
  sprites: Partial<Record<PlaceId, Sprite[]>> & { decoration: Sprite[] }
  /** Dotted walk in the park and dashed roads between villages. */
  walk: Pt[]
  roads: Pt[][]
  waves: Pt[]
}

const landscape: MapLayout = {
  width: 1280,
  height: 800,
  island: [
    [190, 280],
    [330, 258],
    [520, 264],
    [700, 250],
    [880, 262],
    [1040, 268],
    [1122, 302],
    [1152, 365],
    [1148, 450],
    [1118, 518],
    [1080, 556],
    [1058, 612],
    [1018, 680],
    [940, 712],
    [800, 718],
    [640, 712],
    [480, 718],
    [330, 702],
    [250, 674],
    [214, 612],
    [222, 540],
    [198, 470],
    [168, 402],
    [160, 330],
  ],
  lake: [
    [530, 446],
    [546, 420],
    [590, 410],
    [634, 420],
    [645, 447],
    [626, 474],
    [584, 482],
    [544, 472],
  ],
  islet: [
    [64, 706],
    [86, 684],
    [128, 680],
    [162, 694],
    [164, 718],
    [130, 732],
    [84, 730],
  ],
  compass: { at: [95, 108], size: 110 },
  title: [640, 52],
  subtitle: [640, 106],
  controls: [1165, 48],
  logo: [640, 772],
  creditsWithControls: false,
  labels: {
    'art-gallery': [312, 458],
    voronoi: [825, 448],
    frechet: [372, 652],
    'lawn-mowing': [668, 658],
    roads: [940, 606],
    'old-version': [132, 766],
    tsp: [1150, 742],
  },
  sprites: {
    'art-gallery': [{ icon: 'towerWatch', at: [312, 378], size: 92 }],
    voronoi: [
      { icon: 'castle', at: [758, 348], size: 82, flag: 'player-1' },
      { icon: 'castle', at: [886, 376], size: 82, flag: 'player-2' },
    ],
    frechet: [
      { icon: 'fence', at: [380, 600], size: 48 },
      { icon: 'treePines', at: [330, 545], size: 52 },
      { icon: 'treePine', at: [386, 536], size: 30 },
      { icon: 'treePines', at: [432, 550], size: 46 },
    ],
    'lawn-mowing': [
      { icon: 'stable', at: [540, 578], size: 60 },
      { icon: 'textureBricks', at: [600, 584], size: 58 },
      { icon: 'textureBricks', at: [656, 598], size: 52 },
      { icon: 'mill', at: [712, 562], size: 68 },
    ],
    roads: [
      { icon: 'houses', at: [928, 506], size: 56 },
      { icon: 'houseSmall', at: [1024, 548], size: 40 },
      { icon: 'house', at: [1060, 462], size: 42 },
      { icon: 'watchtower', at: [1097, 538], size: 50 },
    ],
    'old-version': [{ icon: 'ruins', at: [108, 696], size: 50 }],
    tsp: [{ icon: 'ship', at: [1158, 668], size: 72 }],
    decoration: [
      { icon: 'rocksMountain', at: [236, 334], size: 62 },
      { icon: 'rocksMountain', at: [372, 306], size: 56 },
      { icon: 'rocks', at: [436, 354], size: 40 },
      { icon: 'treePines', at: [506, 316], size: 48 },
      { icon: 'treePines', at: [580, 342], size: 40 },
      { icon: 'treePines', at: [654, 312], size: 44 },
      { icon: 'treePines', at: [798, 540], size: 40 },
      { icon: 'treePine', at: [1000, 374], size: 26 },
      { icon: 'rocksMountain', at: [1095, 396], size: 46 },
      { icon: 'treePine', at: [252, 556], size: 26 },
    ],
  },
  walk: [
    [296, 610],
    [340, 618],
    [392, 614],
    [436, 604],
  ],
  roads: [
    [
      [948, 518],
      [1004, 541],
    ],
    [
      [1030, 532],
      [1056, 478],
    ],
  ],
  waves: [
    [240, 200],
    [90, 330],
    [1060, 205],
    [1215, 300],
    [80, 515],
    [1225, 575],
    [985, 760],
    [430, 770],
    [820, 778],
  ],
}

const portrait: MapLayout = {
  width: 800,
  height: 1600,
  island: [
    [150, 372],
    [300, 346],
    [470, 356],
    [620, 368],
    [698, 426],
    [714, 544],
    [690, 664],
    [710, 792],
    [720, 930],
    [690, 1070],
    [702, 1200],
    [652, 1326],
    [520, 1386],
    [360, 1392],
    [222, 1366],
    [122, 1298],
    [96, 1170],
    [112, 1040],
    [86, 900],
    [96, 760],
    [122, 640],
    [100, 520],
    [110, 426],
  ],
  lake: [
    [540, 866],
    [560, 836],
    [604, 826],
    [646, 838],
    [656, 868],
    [632, 896],
    [588, 902],
    [552, 892],
  ],
  islet: [
    [74, 1416],
    [100, 1390],
    [150, 1384],
    [196, 1400],
    [198, 1426],
    [158, 1440],
    [100, 1438],
  ],
  compass: { at: [92, 286], size: 96 },
  title: [400, 84],
  subtitle: [400, 166],
  controls: [470, 270],
  logo: [400, 1588],
  creditsWithControls: true,
  labels: {
    'art-gallery': [300, 530],
    voronoi: [500, 718],
    frechet: [300, 912],
    'lawn-mowing': [500, 1106],
    roads: [320, 1296],
    'old-version': [186, 1500],
    tsp: [614, 1500],
  },
  sprites: {
    'art-gallery': [{ icon: 'towerWatch', at: [300, 418], size: 96 }],
    voronoi: [
      { icon: 'castle', at: [530, 612], size: 82, flag: 'player-1' },
      { icon: 'castle', at: [640, 596], size: 82, flag: 'player-2' },
    ],
    frechet: [
      { icon: 'fence', at: [300, 812], size: 50 },
      { icon: 'treePines', at: [212, 800], size: 50 },
      { icon: 'treePines', at: [392, 794], size: 46 },
    ],
    'lawn-mowing': [
      { icon: 'stable', at: [400, 1000], size: 62 },
      { icon: 'textureBricks', at: [470, 1010], size: 56 },
      { icon: 'textureBricks', at: [530, 1016], size: 50 },
      { icon: 'mill', at: [600, 990], size: 70 },
    ],
    roads: [
      { icon: 'houses', at: [220, 1206], size: 56 },
      { icon: 'houseSmall', at: [330, 1222], size: 42 },
      { icon: 'house', at: [440, 1196], size: 44 },
    ],
    'old-version': [{ icon: 'ruins', at: [134, 1410], size: 50 }],
    tsp: [{ icon: 'ship', at: [648, 1414], size: 72 }],
    decoration: [
      { icon: 'rocksMountain', at: [176, 430], size: 60 },
      { icon: 'rocksMountain', at: [470, 420], size: 54 },
      { icon: 'treePines', at: [600, 450], size: 46 },
      { icon: 'rocks', at: [190, 640], size: 44 },
      { icon: 'treePines', at: [180, 1020], size: 46 },
      { icon: 'treePine', at: [620, 1220], size: 30 },
      { icon: 'rocksMountain', at: [560, 1290], size: 48 },
    ],
  },
  walk: [
    [214, 842],
    [262, 850],
    [330, 846],
    [384, 836],
  ],
  roads: [
    [
      [246, 1214],
      [314, 1224],
    ],
    [
      [348, 1218],
      [420, 1202],
    ],
  ],
  waves: [
    [700, 320],
    [40, 560],
    [760, 640],
    [40, 1240],
    [760, 1180],
    [400, 1470],
  ],
}

export const MAP_LAYOUTS: Record<Layout, MapLayout> = { landscape, portrait }
