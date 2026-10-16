import { serveAi, type AiRequest, type AiResponse } from '../../../core/games/voronoi/service'

let worker: Worker | null | undefined
let nextId = 1
const pending = new Map<number, { message: AiRequest; resolve: (response: AiResponse) => void }>()

function start(): Worker | null {
  if (worker !== undefined) return worker
  try {
    worker = new Worker(new URL('../../../workers/voronoi-ai.ts', import.meta.url), { type: 'module' })
    worker.addEventListener('message', (e: MessageEvent<AiResponse>) => {
      pending.get(e.data.id)?.resolve(e.data)
      pending.delete(e.data.id)
    })
    worker.addEventListener('error', () => {
      // A broken worker (e.g. an outdated cached chunk): answer here from now on.
      worker = null
      for (const [id, { message, resolve }] of pending) {
        pending.delete(id)
        resolve(serveAi(message))
      }
    })
  } catch {
    worker = null
  }
  return worker
}

/** A request without its id (the client numbers the requests). */
export type Request = AiRequest extends infer R ? (R extends AiRequest ? Omit<R, 'id'> : never) : never

/** Sends a request to the computer player's worker (or answers it here if there is no worker). */
export function askAi<R extends Request>(request: R): Promise<Extract<AiResponse, { kind: R['kind'] }>> {
  const message = { ...request, id: nextId++ } as AiRequest
  const w = start()
  type Answer = Extract<AiResponse, { kind: R['kind'] }>
  if (!w) return Promise.resolve(serveAi(message) as Answer)
  return new Promise((resolve) => {
    pending.set(message.id, { message, resolve: resolve as (response: AiResponse) => void })
    w.postMessage(message)
  })
}
