import type { ArtGalleryLevel } from '../../levels/schema'

/** The shipped art gallery levels, for tests (Vite's glob import; no file system access needed). */
const modules = import.meta.glob<ArtGalleryLevel>('../../../../public/levels/art-gallery/*.json', {
  eager: true,
  import: 'default',
})

export const ART_GALLERY_LEVELS: ArtGalleryLevel[] = Object.values(modules).sort(
  (a, b) => a.number - b.number,
)
