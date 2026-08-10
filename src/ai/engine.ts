import type { Color, Move } from '../engine/board'
import type { Difficulty } from './difficulty'
import type { WorkerRequest, WorkerResponse } from './worker'

export interface EngineMove {
  move: Move
  depthReached: number
  score: number
}

export interface XiangqiEngine {
  requestMove(position: string, color: Color, difficulty: Difficulty): Promise<EngineMove>
  cancel(): void
  terminate(): void
}

/** Thrown at a caller whose request was abandoned; not an error worth surfacing. */
export class EngineCancelled extends Error {
  constructor() {
    super('engine request cancelled')
    this.name = 'EngineCancelled'
  }
}

interface PendingRequest {
  resolve: (result: EngineMove) => void
  reject: (error: Error) => void
}

/**
 * The search runs synchronously inside the worker, so there is no way to ask it
 * to stop early: cancelling replaces the worker outright. That keeps a take-back
 * or a new game from waiting on a search whose answer nobody wants, and stray
 * results from an old worker can never be mistaken for the current position's.
 */
export class WorkerXiangqiEngine implements XiangqiEngine {
  private worker: Worker
  private nextRequestId = 1
  private pending: PendingRequest | null = null
  private pendingId = 0

  constructor() {
    this.worker = this.spawnWorker()
  }

  private spawnWorker(): Worker {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.addEventListener('message', this.handleMessage)
    worker.addEventListener('error', this.handleError)
    return worker
  }

  private handleMessage = (event: MessageEvent<WorkerResponse>) => {
    const { id, from, to, depthReached, score } = event.data
    if (!this.pending || id !== this.pendingId) return

    const pending = this.pending
    this.pending = null
    pending.resolve({ move: { from, to }, depthReached, score })
  }

  private handleError = (event: ErrorEvent) => {
    const pending = this.pending
    this.pending = null
    pending?.reject(new Error(event.message || 'engine worker failed'))
  }

  requestMove(position: string, color: Color, difficulty: Difficulty): Promise<EngineMove> {
    this.cancel()

    const id = this.nextRequestId++
    this.pendingId = id

    return new Promise<EngineMove>((resolve, reject) => {
      this.pending = { resolve, reject }
      const request: WorkerRequest = { id, position, color, difficulty }
      this.worker.postMessage(request)
    })
  }

  cancel(): void {
    if (!this.pending) return

    const pending = this.pending
    this.pending = null

    this.worker.removeEventListener('message', this.handleMessage)
    this.worker.removeEventListener('error', this.handleError)
    this.worker.terminate()
    this.worker = this.spawnWorker()

    pending.reject(new EngineCancelled())
  }

  terminate(): void {
    this.worker.removeEventListener('message', this.handleMessage)
    this.worker.removeEventListener('error', this.handleError)
    this.worker.terminate()

    const pending = this.pending
    this.pending = null
    pending?.reject(new EngineCancelled())
  }
}
