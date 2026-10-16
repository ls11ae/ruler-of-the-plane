import { describe, expect, it } from 'vitest'
import { convertLevel } from './convert'
import { applyMatrix, composeMatrices, readIpePage, type Matrix } from './ipe'
import { parseNumber } from './numbers'
import { readUnityAsset } from './unity-asset'

const ipe = (page: string) => `<?xml version="1.0"?>
<!DOCTYPE ipe SYSTEM "ipe.dtd">
<ipe version="70206" creator="Ipe 7.2.7">
<ipestyle name="basic">
<symbol name="mark/disk(sx)" transformations="translations">
<path fill="sym-stroke">
0.6 0 0 0.6 0 0 e
</path>
</symbol>
</ipestyle>
<page>
<layer name="alpha"/>
<view layers="alpha" active="alpha"/>
${page}
</page>
</ipe>`

describe('numbers', () => {
  it('parses culture-invariantly', () => {
    expect(parseNumber('28.1853')).toBe(28.1853)
    expect(parseNumber('-83.8147')).toBe(-83.8147)
    expect(parseNumber('1e3')).toBe(1000)
    expect(() => parseNumber('28,1853')).toThrow()
    expect(() => parseNumber('1.5.2')).toThrow()
    expect(() => parseNumber('')).toThrow()
  })
})

describe('IPE matrices', () => {
  it('applies x′ = a·x + c·y + e, y′ = b·x + d·y + f', () => {
    const rotate: Matrix = [0, 1, -1, 0, 10, 20] // 90° counterclockwise, then translate
    expect(applyMatrix(rotate, [3, 4])).toEqual([10 - 4, 20 + 3])
    const shear: Matrix = [1, 0, 2, 1, 0, 0]
    expect(applyMatrix(shear, [1, 1])).toEqual([3, 1])
  })

  it('composes outer after inner', () => {
    const scale: Matrix = [2, 0, 0, 2, 0, 0]
    const move: Matrix = [1, 0, 0, 1, 5, 0]
    expect(applyMatrix(composeMatrices(scale, move), [1, 1])).toEqual([12, 2])
    expect(applyMatrix(composeMatrices(move, scale), [1, 1])).toEqual([7, 2])
  })

  it('applies the matrices of paths, markers and groups', () => {
    const page = readIpePage(
      ipe(`<path stroke="black" matrix="0 1 -1 0 10 20">
1 0 m
2 0 l
2 1 l
h
</path>
<use name="mark/disk(sx)" pos="1 2" size="normal" matrix="1 0 0 1 -4 0"/>
<group matrix="1 0 0 1 100 0"><use name="mark/square(sx)" pos="1 2" matrix="2 0 0 2 0 0"/></group>`),
    )
    expect(page.paths).toEqual([
      {
        vertices: [
          [10, 21],
          [10, 22],
          [9, 22],
        ],
        closed: true,
      },
    ])
    expect(page.markers).toEqual([
      { kind: 'disk', at: [-3, 2] },
      { kind: 'square', at: [102, 4] },
    ])
  })

  it('ignores symbol definitions outside the page and rejects curves', () => {
    expect(readIpePage(ipe('')).paths).toEqual([])
    expect(() => readIpePage(ipe('<path>0 0 m 1 1 2 2 3 3 c</path>'))).toThrow(
      /unsupported IPE path operator "c"/,
    )
  })
})

describe('convertLevel', () => {
  const square = (x: number, y: number, s: number, matrix = '') =>
    `<path stroke="black"${matrix ? ` matrix="${matrix}"` : ''}>
${x} ${y} m
${x + s} ${y} l
${x + s} ${y + s} l
${x} ${y + s} l
h
</path>`

  it('normalises art gallery levels, orients rings and drops short paths', () => {
    const xml = ipe(
      square(0, 0, 100) +
        square(10, 10, 10, '1 0 0 1 50 0') +
        `<path stroke="black" cap="1">
30 30 m
30 30 l
</path>`,
    )
    const level = convertLevel('ArtGallery', 'agLevel99_2.ipe', xml)
    if (level.collection !== 'art-gallery') throw new Error('wrong collection')
    expect(level.number).toBe(99)
    expect(level.torches).toBe(2)
    expect(level.bounds).toEqual({ minX: -4.5, minY: -4.5, maxX: 4.5, maxY: 4.5 })
    expect(level.holes).toHaveLength(1)
    // The hole spans x 60..70 and y 10..20 in IPE units (y up) → level units (y down, size 9).
    const xs = level.holes[0]!.map((p) => p[0])
    const ys = level.holes[0]!.map((p) => p[1])
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([0.9, 1.8])
    expect([Math.min(...ys), Math.max(...ys)]).toEqual([2.7, 3.6])
  })

  it('keys Kings Taxes levels by folder and reads the spanner ratio', () => {
    const xml = ipe('<use name="mark/disk(sx)" pos="0 0"/><use name="mark/square(sx)" pos="10 0"/>')
    const level = convertLevel('KingsTaxes/Spanner', 'ktLevel3_1.5.ipe', xml)
    expect(level).toMatchObject({ id: 'kings-taxes/spanner/ktLevel3_1.5', ratio: 1.5, number: 3 })
    expect(convertLevel('KingsTaxes/MST', 'ktLevel3.ipe', xml).id).toBe('kings-taxes/mst/ktLevel3')
  })

  it('reads Unity assets without scaling, flipping y', () => {
    const asset = `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!114 &11400000
MonoBehaviour:
  m_ObjectHideFlags: 0
  m_Script: {fileID: 11500000, guid: d46ea38d231ceef4d955bc70b8ffa4fc, type: 3}
  m_Name: divLevel1_0
  m_EditorClassIdentifier: 
  NumberOfSwaps: 2
  Spearmen:
  - {x: -1.5, y: 0.6}
  - {x: -1.3, y: -1.56}
  Archers: []
  Mages:
  - {x: 1.5, y: -0.8245986}
`
    const parsed = readUnityAsset(asset)
    expect(parsed.scalars.NumberOfSwaps).toBe('2')
    expect(parsed.pointLists.Spearmen).toEqual([
      [-1.5, 0.6],
      [-1.3, -1.56],
    ])
    expect(() => convertLevel('Divide', 'divLevel1_0.asset', asset)).toThrow(/differ from the file name/)
  })
})
