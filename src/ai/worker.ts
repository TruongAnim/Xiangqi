/// <reference lib="webworker" />
import { parseFen, type Color, type Move } from '../engine/board'
import { DIFFICULTY_SETTINGS, type Difficulty } from './difficulty'
import { findBestMove } from './search'

export interface WorkerRequest {
  id: number
  position: string
  color: Color
  difficulty: Difficulty
}

export interface WorkerResponse {
  id: number
  from: Move['from']
  to: Move['to']
  /** Reported back so the UI can show how deep the engine got. */
  depthReached: number
  score: number
}

declare const self: DedicatedWorkerGlobalScope

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, position, color, difficulty } = event.data
  const board = parseFen(position)
  const result = findBestMove(board, color, DIFFICULTY_SETTINGS[difficulty])

  const response: WorkerResponse = {
    id,
    from: result.move.from,
    to: result.move.to,
    depthReached: result.depthReached,
    score: result.score,
  }
  self.postMessage(response)
}
