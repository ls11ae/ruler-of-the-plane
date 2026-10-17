/** A binary min-heap of integer items with numeric keys (duplicates allowed; stale entries are skipped by the caller). */
export class MinHeap {
  private keys: number[] = []
  private items: number[] = []

  get size(): number {
    return this.items.length
  }

  push(key: number, item: number): void {
    const { keys, items } = this
    let i = items.length
    keys.push(key)
    items.push(item)
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (keys[parent]! <= key) break
      keys[i] = keys[parent]!
      items[i] = items[parent]!
      i = parent
    }
    keys[i] = key
    items[i] = item
  }

  /** Removes the item with the smallest key; returns [key, item]. */
  pop(): [number, number] {
    const { keys, items } = this
    const top: [number, number] = [keys[0]!, items[0]!]
    const key = keys.pop()!
    const item = items.pop()!
    const n = items.length
    if (n > 0) {
      let i = 0
      for (;;) {
        let child = 2 * i + 1
        if (child >= n) break
        if (child + 1 < n && keys[child + 1]! < keys[child]!) child++
        if (keys[child]! >= key) break
        keys[i] = keys[child]!
        items[i] = items[child]!
        i = child
      }
      keys[i] = key
      items[i] = item
    }
    return top
  }
}
