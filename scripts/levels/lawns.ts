import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { boundsOf } from '../../src/core/geometry/polygon'
import type { Vec2 } from '../../src/core/geometry/types'
import type { LawnMowingLevel, LawnSolution } from '../../src/core/levels/schema'

/**
 * Lawns of "Rasenmähen" from `levels/lawn-mowing/`: the booth lawns `instances/lawn<n>_<k>s3.instance.json`
 * (k cutters) with their solutions `solutions/<uid>.solution.json` once the chair's solver has computed
 * them, and real competition instances in `competition/` (with an example solution). All in the pyutils27
 * JSON formats; coordinates are kept as they are (integers, y up).
 */
interface PointSequence {
  x: number[]
  y: number[]
}

interface Instance {
  content_type: 'CGSHOP2027_Instance'
  instance_uid: string
  region_to_cover: { outer_boundary: PointSequence; inner_boundaries: PointSequence[] }
  cutter: PointSequence
  cutter_center: [number, number]
  number_of_cutters: number
}

interface Solution {
  content_type: 'CGSHOP2027_Solution'
  instance_uid: string
  tours: PointSequence[]
  meta?: Record<string, unknown>
}

const ring = (s: PointSequence): Vec2[] => {
  if (s.x.length !== s.y.length) throw new Error('x and y lists differ in length')
  return s.x.map((x, i) => [x, s.y[i]!] as const)
}

const length = (tour: readonly Vec2[]) =>
  tour.reduce((sum, [x, y], i) => {
    const [x2, y2] = tour[(i + 1) % tour.length]!
    return sum + Math.abs(x2 - x) + Math.abs(y2 - y)
  }, 0)

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function solutionFor(dir: string, rel: string, instance: Instance): LawnSolution | undefined {
  const path = join(dir, `${instance.instance_uid}.solution.json`)
  if (!existsSync(path)) return undefined
  const s = readJson<Solution>(path)
  if (s.content_type !== 'CGSHOP2027_Solution') throw new Error(`${rel}: not a CG:SHOP 2027 solution`)
  if (s.instance_uid !== instance.instance_uid) throw new Error(`${rel}: solution for ${s.instance_uid}`)
  if (s.tours.length !== instance.number_of_cutters) {
    throw new Error(`${rel}: ${s.tours.length} tours for ${instance.number_of_cutters} cutters`)
  }
  const tours = s.tours.map(ring)
  return {
    tours,
    maxTourLength: Math.max(...tours.map(length)),
    source: rel,
    ...(s.meta && Object.keys(s.meta).length ? { meta: s.meta } : {}),
  }
}

function levelOf(
  name: string,
  number: number,
  instances: { instance: Instance; source: string; solution?: LawnSolution }[],
  competition: boolean,
): LawnMowingLevel {
  const first = instances[0]!.instance
  const shape = (i: Instance) => JSON.stringify([i.region_to_cover, i.cutter, i.cutter_center])
  for (const { instance } of instances) {
    if (instance.content_type !== 'CGSHOP2027_Instance')
      throw new Error(`${instance.instance_uid}: not an instance`)
    if (shape(instance) !== shape(first))
      throw new Error(`${name}: the instances differ in more than the cutters`)
  }
  const outer = ring(first.region_to_cover.outer_boundary)
  return {
    id: `lawn-mowing/${name}`,
    collection: 'lawn-mowing',
    name,
    number,
    source: instances[0]!.source,
    bounds: boundsOf(outer),
    outer,
    holes: first.region_to_cover.inner_boundaries.map(ring),
    cutter: ring(first.cutter),
    cutterCenter: first.cutter_center,
    variants: instances
      .map(({ instance, solution }) => ({
        cutters: instance.number_of_cutters,
        uid: instance.instance_uid,
        ...(solution ? { solution } : {}),
      }))
      .sort((a, b) => a.cutters - b.cutters),
    ...(competition ? { competition: true } : {}),
  }
}

/** Converts the lawns below `dir` (`levels/lawn-mowing`); booth lawns first by number, then competition instances. */
export function convertLawns(dir: string): LawnMowingLevel[] {
  const rel = (sub: string, file: string) => `levels/lawn-mowing/${sub}/${file}`
  const byLawn = new Map<string, { instance: Instance; source: string; solution?: LawnSolution }[]>()
  for (const file of readdirSync(join(dir, 'instances'))
    .filter((f) => f.endsWith('.instance.json'))
    .sort()) {
    const match = /^(lawn\d+)_\d+s\d+\.instance\.json$/.exec(file)
    if (!match) throw new Error(`${rel('instances', file)}: expected lawn<n>_<k>s<w>.instance.json`)
    const instance = readJson<Instance>(join(dir, 'instances', file))
    const solution = solutionFor(
      join(dir, 'solutions'),
      rel('solutions', `${instance.instance_uid}.solution.json`),
      instance,
    )
    const list = byLawn.get(match[1]!) ?? []
    list.push({ instance, source: rel('instances', file), ...(solution ? { solution } : {}) })
    byLawn.set(match[1]!, list)
  }
  const lawns = [...byLawn].map(([name, list]) => levelOf(name, Number(name.slice(4)), list, false))
  lawns.sort((a, b) => a.number - b.number)
  const competition = readdirSync(join(dir, 'competition'))
    .filter((f) => f.endsWith('.instance.json'))
    .sort()
    .map((file, i) => {
      const instance = readJson<Instance>(join(dir, 'competition', file))
      const solution = solutionFor(
        join(dir, 'competition'),
        rel('competition', `${instance.instance_uid}.solution.json`),
        instance,
      )
      const entry = { instance, source: rel('competition', file), ...(solution ? { solution } : {}) }
      return levelOf(instance.instance_uid, lawns.length + i + 1, [entry], true)
    })
  return [...lawns, ...competition]
}
