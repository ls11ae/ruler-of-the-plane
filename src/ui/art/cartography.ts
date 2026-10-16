/**
 * Icons of the Kenney Cartography Pack (CC0) used by the app. Import new ones here and list them in
 * CREDITS.md; Vite bundles only imported files.
 */
import castle from '../../../assets/kenney/cartography-pack/castle.png'
import compass from '../../../assets/kenney/cartography-pack/compass.png'
import fence from '../../../assets/kenney/cartography-pack/fence.png'
import house from '../../../assets/kenney/cartography-pack/house.png'
import houseSmall from '../../../assets/kenney/cartography-pack/houseSmall.png'
import houses from '../../../assets/kenney/cartography-pack/houses.png'
import mill from '../../../assets/kenney/cartography-pack/mill.png'
import rocks from '../../../assets/kenney/cartography-pack/rocks.png'
import rocksMountain from '../../../assets/kenney/cartography-pack/rocksMountain.png'
import ruins from '../../../assets/kenney/cartography-pack/ruins.png'
import ship from '../../../assets/kenney/cartography-pack/ship.png'
import stable from '../../../assets/kenney/cartography-pack/stable.png'
import textureBricks from '../../../assets/kenney/cartography-pack/textureBricks.png'
import textureWater from '../../../assets/kenney/cartography-pack/textureWater.png'
import towerWatch from '../../../assets/kenney/cartography-pack/towerWatch.png'
import treePine from '../../../assets/kenney/cartography-pack/treePine.png'
import treePines from '../../../assets/kenney/cartography-pack/treePines.png'
import watchtower from '../../../assets/kenney/cartography-pack/watchtower.png'

export const cartography = {
  castle,
  compass,
  fence,
  house,
  houseSmall,
  houses,
  mill,
  rocks,
  rocksMountain,
  ruins,
  ship,
  stable,
  textureBricks,
  textureWater,
  towerWatch,
  treePine,
  treePines,
  watchtower,
}

export type CartographyIcon = keyof typeof cartography
