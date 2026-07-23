import type { Color, Move } from '../engine/board'
import type { Difficulty } from './difficulty'
import type { WorkerRequest, WorkerResponse } from './worker'

export interface XiangqiEngine {
  requestMove(position: string, color: Color, difficulty: Difficulty): Promise<Move>
}

export class WorkerXiangqiEngine implements XiangqiEngine {
  private worker: Worker

  constructor() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  }

  requestMove(position: string, color: Color, difficulty: Difficulty): Promise<Move> {
    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        cleanup()
        resolve({ from: event.data.from, to: event.data.to })
      }
      const handleError = (error: ErrorEvent) => {
        cleanup()
        reject(error)
      }
      const cleanup = () => {
        this.worker.removeEventListener('message', handleMessage)
        this.worker.removeEventListener('error', handleError)
      }
      this.worker.addEventListener('message', handleMessage)
      this.worker.addEventListener('error', handleError)
      const request: WorkerRequest = { position, color, difficulty }
      this.worker.postMessage(request)
    })
  }

  terminate(): void {
    this.worker.terminate()
  }
}
