import type { KingsTaxesLevel, RoadsBichromaticLevel, RoadsSteinerLevel } from '../../levels/schema'

/** The shipped Kings Taxes levels (MST, spanner, TSP), for tests (Vite's glob import). */
const modules = import.meta.glob<KingsTaxesLevel>('../../../../public/levels/kings-taxes/*/*.json', {
  eager: true,
  import: 'default',
})

export const KINGS_TAXES_LEVELS: KingsTaxesLevel[] = Object.values(modules)

const steiner = import.meta.glob<RoadsSteinerLevel>('../../../../public/levels/roads/steiner/*.json', {
  eager: true,
  import: 'default',
})
const bichromatic = import.meta.glob<RoadsBichromaticLevel>(
  '../../../../public/levels/roads/bichromatic/*.json',
  {
    eager: true,
    import: 'default',
  },
)

/** The shipped maps of "Kreuzungen" and "Zwei Sorten", in order. */
export const STEINER_LEVELS = Object.values(steiner).sort((a, b) => a.number - b.number)
export const BICHROMATIC_LEVELS = Object.values(bichromatic).sort((a, b) => a.number - b.number)
