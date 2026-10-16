import type { VoronoiLevel } from '../../levels/schema'

/** The shipped maps of "Erobere das Land", for tests (Vite's glob import; no file system access needed). */
const modules = import.meta.glob<VoronoiLevel>('../../../../public/levels/voronoi/*.json', {
  eager: true,
  import: 'default',
})

export const VORONOI_MAPS: VoronoiLevel[] = Object.values(modules).sort((a, b) => a.number - b.number)
