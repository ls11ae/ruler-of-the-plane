import type { KingsTaxesLevel } from '../../levels/schema'

/** The shipped Kings Taxes levels (MST, spanner, TSP), for tests (Vite's glob import). */
const modules = import.meta.glob<KingsTaxesLevel>('../../../../public/levels/kings-taxes/*/*.json', {
  eager: true,
  import: 'default',
})

export const KINGS_TAXES_LEVELS: KingsTaxesLevel[] = Object.values(modules)
