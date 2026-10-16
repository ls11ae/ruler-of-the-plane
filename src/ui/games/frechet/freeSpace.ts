import { pointAt, type Path } from '../../../core/games/frechet/path'

/**
 * The leash length for every position in the diagram, on an n × n grid: `values[row * n + col]` for
 * the person at column col (left to right) and the dog at row (top = end of the dog's trail, as the
 * diagram is drawn with the dog going up). Computed once per walk; thresholding it for a leash length
 * is a single pass, fast enough for a slider.
 */
export interface Field {
  n: number
  values: Float32Array
}

export function distanceField(person: Path, dog: Path, n: number): Field {
  const px = new Float64Array(n)
  const py = new Float64Array(n)
  const dx = new Float64Array(n)
  const dy = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pointAt(person, ((i + 0.5) / n) * person.length)
    px[i] = ax
    py[i] = ay
    const [bx, by] = pointAt(dog, ((n - 1 - i + 0.5) / n) * dog.length)
    dx[i] = bx
    dy[i] = by
  }
  const values = new Float32Array(n * n)
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++)
      values[row * n + col] = Math.hypot(px[col]! - dx[row]!, py[col]! - dy[row]!)
  }
  return { n, values }
}

const FREE = [255, 252, 242]
const BLOCKED = [226, 211, 176]
const HATCH = [184, 162, 120]
const EDGE = [91, 79, 69]

/** Paints the field for leash length eps: light where it reaches, hatched where not, ink at the border. */
export function paintField(image: ImageData, field: Field, eps: number): void {
  const { n, values } = field
  const data = image.data
  const free = (row: number, col: number) => values[row * n + col]! <= eps
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const k = (row * n + col) * 4
      let c: number[]
      if (free(row, col)) {
        const edge =
          (col > 0 && !free(row, col - 1)) ||
          (col < n - 1 && !free(row, col + 1)) ||
          (row > 0 && !free(row - 1, col)) ||
          (row < n - 1 && !free(row + 1, col))
        c = edge ? EDGE : FREE
      } else {
        c = (col + row) % 9 < 1.5 ? HATCH : BLOCKED
      }
      data[k] = c[0]!
      data[k + 1] = c[1]!
      data[k + 2] = c[2]!
      data[k + 3] = 255
    }
  }
}
