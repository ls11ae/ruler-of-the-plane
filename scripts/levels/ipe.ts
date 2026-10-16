import { XMLParser } from 'fast-xml-parser'
import type { Vec2 } from '../../src/core/geometry/types'
import { parseNumber, parseNumbers } from './numbers'

/** Affine IPE matrix `a b c d e f`: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Matrix = readonly [a: number, b: number, c: number, d: number, e: number, f: number]

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

export function applyMatrix(m: Matrix, [x, y]: Vec2): Vec2 {
  const [a, b, c, d, e, f] = m
  return [a * x + c * y + e, b * x + d * y + f]
}

/** The matrix of "first apply `inner`, then `outer`". */
export function composeMatrices(outer: Matrix, inner: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = outer
  const [a2, b2, c2, d2, e2, f2] = inner
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ]
}

export function parseMatrix(text: string): Matrix {
  const m = parseNumbers(text, 'matrix')
  if (m.length !== 6) throw new Error(`matrix needs 6 numbers: "${text}"`)
  return m as unknown as Matrix
}

/** Content of an IPE page in IPE coordinates (y up), with all matrices applied. */
export interface IpePage {
  /** Closed or open polylines, one per subpath, with at least one vertex each. */
  paths: { vertices: Vec2[]; closed: boolean; layer?: string }[]
  /** Markers (`<use name="mark/disk(sx)">`): kind is the part between `mark/` and `(`. */
  markers: { kind: string; at: Vec2; layer?: string }[]
}

type XmlNode = Record<string, unknown> & { ':@'?: Record<string, string> }

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: false,
})

function tagOf(node: XmlNode): string | undefined {
  return Object.keys(node).find((k) => k !== ':@')
}

function textOf(children: XmlNode[]): string {
  return children.map((c) => (typeof c['#text'] === 'string' ? c['#text'] : '')).join('')
}

/** Parses the path data of an IPE `<path>` (only `m`, `l` and `h` are supported). */
export function parsePathData(data: string, matrix: Matrix): IpePage['paths'] {
  const tokens = data.trim().split(/\s+/).filter(Boolean)
  const paths: IpePage['paths'] = []
  let current: Vec2[] | undefined
  let operands: number[] = []
  for (const token of tokens) {
    if (/^[a-z]+$/.test(token)) {
      if (token === 'm') {
        if (operands.length !== 2) throw new Error(`"m" needs 2 operands`)
        current = [applyMatrix(matrix, [operands[0]!, operands[1]!])]
        paths.push({ vertices: current, closed: false })
      } else if (token === 'l') {
        if (operands.length !== 2 || !current) throw new Error(`"l" needs a current point and 2 operands`)
        current.push(applyMatrix(matrix, [operands[0]!, operands[1]!]))
      } else if (token === 'h') {
        if (operands.length !== 0 || !current) throw new Error(`"h" without a current subpath`)
        paths[paths.length - 1]!.closed = true
        current = undefined
      } else {
        throw new Error(`unsupported IPE path operator "${token}" (only straight segments: m, l, h)`)
      }
      operands = []
    } else {
      operands.push(parseNumber(token, 'path coordinate'))
    }
  }
  if (operands.length) throw new Error('path data ends with operands but no operator')
  return paths
}

/**
 * Layer bookkeeping: an object on the page without a `layer` attribute is in the layer of the object
 * before it (IPE's file format); objects inside a group are in the group's layer.
 */
interface LayerState {
  current: string | undefined
  /** Set inside a group: the group's layer, for all its children. */
  fixed?: string | undefined
}

function walk(nodes: XmlNode[], matrix: Matrix, page: IpePage, layers: LayerState): void {
  for (const node of nodes) {
    const tag = tagOf(node)
    if (!tag || tag === '#text' || tag === 'layer' || tag === 'view') continue
    const attrs = node[':@'] ?? {}
    const own = attrs.matrix ? composeMatrices(matrix, parseMatrix(attrs.matrix)) : matrix
    const children = (node[tag] as XmlNode[] | undefined) ?? []
    const layer = 'fixed' in layers ? layers.fixed : (attrs.layer ?? layers.current)
    if (!('fixed' in layers)) layers.current = layer
    const tagged = layer === undefined ? {} : { layer }
    if (tag === 'path') {
      page.paths.push(...parsePathData(textOf(children), own).map((p) => ({ ...p, ...tagged })))
    } else if (tag === 'use') {
      const name = attrs.name ?? ''
      const match = /^mark\/([a-z]+)/.exec(name)
      if (!match) throw new Error(`unsupported symbol "${name}" (only markers mark/...)`)
      if (!attrs.pos) throw new Error(`marker "${name}" without pos`)
      const [x, y] = parseNumbers(attrs.pos, 'marker position')
      if (x === undefined || y === undefined) throw new Error(`marker "${name}" with invalid pos`)
      page.markers.push({ kind: match[1]!, at: applyMatrix(own, [x, y]), ...tagged })
    } else if (tag === 'group') {
      walk(children, own, page, { current: layer, fixed: layer })
    }
    // <layer>, <view>, <text> and other page content carry no level geometry.
  }
}

/**
 * Reads the first `<page>` of an IPE XML file. Only paths and markers inside the page count (the style
 * sheet's symbol definitions are ignored); matrices of paths, markers and groups are applied, and each
 * path and marker carries its layer.
 */
export function readIpePage(xml: string): IpePage {
  const doc = parser.parse(xml) as XmlNode[]
  const ipe = doc.find((n) => tagOf(n) === 'ipe')
  if (!ipe) throw new Error('no <ipe> element')
  const page = (ipe.ipe as XmlNode[]).find((n) => tagOf(n) === 'page')
  if (!page) throw new Error('no <page> element')
  const content = page.page as XmlNode[]
  // Objects before the first `layer` attribute are in the page's first layer.
  const firstLayer = content.find((n) => tagOf(n) === 'layer')?.[':@']?.name
  const result: IpePage = { paths: [], markers: [] }
  walk(content, IDENTITY, result, { current: firstLayer })
  return result
}
