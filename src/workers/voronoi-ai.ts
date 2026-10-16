/** Web Worker of "Erobere das Land": the computer's moves and the heat map, off the main thread. */
import { serveAi, type AiRequest } from '../core/games/voronoi/service'

self.addEventListener('message', (e: MessageEvent<AiRequest>) => {
  self.postMessage(serveAi(e.data))
})
