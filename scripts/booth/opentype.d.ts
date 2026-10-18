// The part of opentype.js (MIT, a dev dependency, no types of its own) that print.ts uses.
declare module 'opentype.js' {
  export interface PathCommand {
    readonly type: 'M' | 'L' | 'Q' | 'C' | 'Z'
    readonly x?: number
    readonly y?: number
    readonly x1?: number
    readonly y1?: number
    readonly x2?: number
    readonly y2?: number
  }
  export interface Path {
    readonly commands: readonly PathCommand[]
  }
  export interface Glyph {
    readonly index: number
  }
  export interface Font {
    readonly unitsPerEm: number
    charToGlyph(char: string): Glyph
    getPath(text: string, x: number, y: number, fontSize: number, options?: { kerning?: boolean }): Path
    getAdvanceWidth(text: string, fontSize: number, options?: { kerning?: boolean }): number
  }
  const opentype: { parse(buffer: ArrayBuffer): Font }
  export default opentype
}
