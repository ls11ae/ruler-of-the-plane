/**
 * Writes docs/texts-de.md: every German UI text for proofreading, by game and screen, with its key.
 * Texts that are functions are called with example values (from their parameter names, see SAMPLES),
 * once per case they distinguish: each boolean both ways, `null` where allowed, and every number they
 * compare a parameter with (`n === 1` gives the singular).
 *
 *   npm run texts
 *
 * Sources: src/ui/i18n/de.ts and every src/ui/games/**\/i18n.de.ts. A test checks that the file is
 * up to date, so a changed text shows up in the next pull request.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { format, resolveConfig } from 'prettier'
import ts from 'typescript'

const root = fileURLToPath(new URL('../../', import.meta.url))
export const TEXTS_FILE = join(root, 'docs', 'texts-de.md')

/** The games in the order of the start map; dictionaries of other folders follow. */
const GAME_ORDER = ['art-gallery', 'voronoi', 'frechet', 'lawn-mowing', 'roads']

type Sample = number | string | boolean | null

/** Example values by parameter name; `name:string` and similar pick by the declared type. */
const SAMPLES: Record<string, Sample> = {
  n: 6,
  m: 2.4,
  i: 2,
  k: 3,
  h: 2,
  longest: 2.6,
  shortest: 1.9,
  best: 2.1,
  plain: 2.2,
  leash: 2.7,
  cm: 240,
  bound: 5,
  quarter: 4,
  third: 6,
  units: 12.4,
  crossings: 2,
  cutters: 2,
  total: 10,
  bonus: 15,
  points: 34,
  cities: 1,
  mines: 1,
  castle: 4,
  pa: 52,
  pb: 48,
  ms: 48,
  torches: 3,
  villages: 7,
  places: 7,
  lawn: 3,
  'lawn:string': 'Vorgarten',
  cells: 412,
  steps: 9,
  seed: 4711,
  hints: 1,
  roads: 6,
  shapes: 945,
  seconds: 83,
  page: 1,
  pages: 3,
  name: 'Kluge Eule',
  time: '1:23',
  length: '12,4 km',
  len: '12,4 km',
  mst: '14,1 km',
  optimum: '12,4 km',
  percent: '4.2',
  tier: 'Mittel',
  target: 'Ziel vom Löser: 48',
  map: 'Insel',
  a: 'Du',
  b: 'Computer',
  who: 'Mensch',
  set: 'Kreuzungen',
  address: 'ae.cs.tu-dortmund.de/imprint',
  version: '0.0.0+abc1234',
}

/**
 * Example values that fit a dictionary ('*') or one of its texts better than the general ones, so that
 * the examples read like the game (no "6 Sterne von 3").
 */
const OVERRIDES: Record<string, Record<string, Record<string, Sample>>> = {
  shell: { 'result.stars': { n: 3 } },
  'art-gallery': {
    fisk: { n: 18, bound: 6, k: 4, quarter: 4 },
    sweep: { bound: 7 },
    'theory.boundNoHoles': { n: 15, bound: 5 },
    'theory.boundHoles': { n: 21, h: 3, bound: 8 },
    'theory.boundOrthogonal': { n: 18, quarter: 4, third: 6 },
    'theory.yours': { n: 4 },
  },
  voronoi: { '*': { name: 'Blau' } },
  frechet: { '*': { name: 'Die Allee' } },
  'frechet/woods': { '*': { name: 'Um die Eiche' } },
  'lawn-mowing': {
    '*': { n: 48, longest: 52, k: 2, bound: 40 },
    lawnCard: { n: 3 },
    cells: { n: 412 },
    home: { n: 6 },
    notDone: { n: 7 },
    'theory.bound': { n: 412, k: 2, bound: 40 },
    'theory.competition': { cells: 1980, k: 3, longest: 236 },
  },
}

/** Titles of dictionaries in sub-folders of a game. */
const SUBTITLES: Record<string, string> = { 'frechet/woods': 'Im Wald' }

interface Param {
  name: string
  type: string
  /** Numbers the function compares this parameter with. */
  specials: number[]
}

/** Parameters of every function in the file's exported objects, by key path ("theory.slider"). */
function functionParams(file: string): Map<string, Param[]> {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const consts = new Map<string, ts.Expression>()
  const out = new Map<string, Param[]>()
  const unwrap = (e: ts.Expression): ts.Expression =>
    ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isParenthesizedExpression(e)
      ? unwrap(e.expression)
      : e
  const describe = (fn: ts.ArrowFunction | ts.FunctionExpression): Param[] => {
    const body = fn.body.getText(source)
    return fn.parameters.map((p) => {
      const name = p.name.getText(source)
      const specials = [
        ...body.matchAll(new RegExp(`\\b${name}\\s*(?:===|!==|>=|<=|>|<)\\s*(\\d+)`, 'g')),
      ].map((m) => +m[1]!)
      return { name, type: p.type?.getText(source) ?? '', specials: [...new Set(specials)] }
    })
  }
  const visit = (e: ts.Expression, path: string) => {
    e = unwrap(e)
    if (ts.isIdentifier(e) && consts.has(e.text)) e = unwrap(consts.get(e.text)!)
    if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) out.set(path, describe(e))
    else if (ts.isObjectLiteralExpression(e)) {
      for (const prop of e.properties) {
        const key =
          prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) ? prop.name.text : null
        if (!key) continue
        const sub = path ? `${path}.${key}` : key
        if (ts.isPropertyAssignment(prop)) visit(prop.initializer, sub)
        else if (ts.isShorthandPropertyAssignment(prop)) visit(prop.name, sub)
      }
    }
  }
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const d of statement.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.initializer) consts.set(d.name.text, d.initializer)
    }
  }
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue
    if (!statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue
    for (const d of statement.declarationList.declarations) if (d.initializer) visit(d.initializer, '')
  }
  return out
}

function sample(param: Param, source: string, key: string): Sample {
  const type = param.type.replace(/\s/g, '')
  if (type === 'boolean') return true
  for (const scope of [key, '*']) {
    const value = OVERRIDES[source]?.[scope]?.[param.name]
    if (value !== undefined) return value
  }
  const typed = SAMPLES[`${param.name}:${type.replace(/\|null$/, '')}`]
  if (typed !== undefined) return typed
  const value = SAMPLES[param.name]
  if (value !== undefined) return value
  return type.startsWith('number') ? 3 : `‹${param.name}›`
}

/** Argument lists: the examples, then one change per case the function distinguishes. */
function variants(params: Param[], source: string, key: string): Sample[][] {
  const base = params.map((p) => sample(p, source, key))
  const all = [base]
  params.forEach((p, i) => {
    const values: Sample[] = []
    if (p.type.replace(/\s/g, '') === 'boolean') values.push(false)
    if (/\|\s*null/.test(p.type)) values.push(null)
    if (/^number/.test(p.type)) values.push(...p.specials)
    for (const v of values) all.push(base.map((b, j) => (j === i ? v : b)))
  })
  const seen = new Set<string>()
  return all.filter((args) => {
    const key = JSON.stringify(args)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const escape = (text: string) => text.replace(/([\\`*_<[\]])/g, '\\$1').replace(/\n/g, ' ')
const show = (value: Sample) => (typeof value === 'string' ? `„${value}“` : String(value))

function entry(
  key: string,
  value: unknown,
  params: Map<string, Param[]>,
  source: string,
  depth: string,
): string[] {
  const label = `${depth}- \`${key}\``
  if (typeof value === 'string') return [`${label}: ${escape(value)}`]
  if (Array.isArray(value)) return [label + ':', ...value.map((v) => `${depth}  - ${escape(String(v))}`)]
  if (typeof value === 'function') {
    const ps = params.get(key) ?? []
    const signature = `${depth}- \`${key}(${ps.map((p) => p.name).join(', ')})\``
    const lines = [signature + ':']
    for (const args of variants(ps, source, key)) {
      let result: unknown
      try {
        result = (value as (...a: Sample[]) => unknown)(...args)
      } catch {
        result = '(kein Beispiel)'
      }
      const given = ps.map((p, i) => `${p.name} = ${show(args[i]!)}`).join(', ')
      const texts = Array.isArray(result) ? result.map(String) : [String(result)]
      if (texts.length === 1)
        lines.push(`${depth}  - ${given ? `${given}: ` : ''}${escape(texts[0]!) || '(leer)'}`)
      else lines.push(`${depth}  - ${given}:`, ...texts.map((t) => `${depth}    - ${escape(t)}`))
    }
    return lines
  }
  return [`${label}: (${typeof value})`]
}

/** The entries of one object, nested objects as sub-lists. */
function entries(
  obj: Record<string, unknown>,
  prefix: string,
  params: Map<string, Param[]>,
  source: string,
): string[] {
  const lines: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      lines.push(...entries(value as Record<string, unknown>, path, params, source))
    } else {
      lines.push(...entry(path, value, params, source, ''))
    }
  }
  return lines
}

function dictionaryFiles(): { source: string; file: string }[] {
  const games = join(root, 'src', 'ui', 'games')
  const found = readdirSync(games, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name === 'i18n.de.ts')
    .map((e) => join(e.parentPath, e.name))
  const source = (file: string) => relative(games, join(file, '..')).split('\\').join('/')
  const rank = (s: string) => {
    const i = GAME_ORDER.indexOf(s.split('/')[0]!)
    return i < 0 ? GAME_ORDER.length : i
  }
  found.sort((a, b) => rank(source(a)) - rank(source(b)) || source(a).localeCompare(source(b)))
  return [
    { source: 'shell', file: join(root, 'src', 'ui', 'i18n', 'de.ts') },
    ...found.map((file) => ({ source: source(file), file })),
  ]
}

export async function textsMarkdown(): Promise<string> {
  const { de: shell } = (await import(pathToFileURL(join(root, 'src/ui/i18n/de.ts')).href)) as {
    de: { places: Record<string, { name: string }> }
  }
  const lines = [
    '# German texts for proofreading',
    '',
    'Generated by `npm run texts` (`scripts/texts/export-de.ts`) from the German dictionaries; do not edit',
    'this file. Corrections go into the file named under each heading (or as comments on a pull request).',
    'Every entry shows its key; texts with numbers or names are shown with example values, once for each',
    'case they distinguish (e.g. singular and plural). Screenshots of every screen at 1280 × 800 are the',
    'workflow artifact "texte-screenshots" (GitHub → Actions → "Texts" → the latest run).',
  ]
  for (const { source, file } of dictionaryFiles()) {
    const module = (await import(pathToFileURL(file).href)) as Record<string, unknown>
    const params = functionParams(file)
    const [game, sub] = source.split('/')
    const title =
      source === 'shell'
        ? 'Shared texts: start map, buttons, result, leaderboard, staff menu'
        : `${shell.places[game!]?.name ?? game}${sub ? ` – ${SUBTITLES[source] ?? sub}` : ''}`
    lines.push('', `## ${title}`, '', `\`${relative(root, file).split('\\').join('/')}\``)
    for (const value of Object.values(module)) {
      if (!value || typeof value !== 'object') continue
      const obj = value as Record<string, unknown>
      const top = Object.entries(obj).filter(([, v]) => !v || typeof v !== 'object' || Array.isArray(v))
      const groups = Object.entries(obj).filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v))
      if (top.length) {
        lines.push('', '### Top level', '')
        for (const [key, v] of top) lines.push(...entry(key, v, params, source, ''))
      }
      for (const [key, v] of groups) {
        lines.push('', `### ${key}`, '')
        lines.push(...entries(v as Record<string, unknown>, key, params, source))
      }
    }
  }
  const text = lines.join('\n') + '\n'
  return format(text, { ...(await resolveConfig(TEXTS_FILE)), filepath: TEXTS_FILE })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(TEXTS_FILE, await textsMarkdown())
  console.log(`wrote ${relative(root, TEXTS_FILE)}`)
}
