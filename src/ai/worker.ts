import { parseFen, type Color, type Move } from '../engine/board'
import { DIFFICULTY_SETTINGS, type Difficulty } from './difficulty'
import { findBestMove } from './search'

export interface WorkerRequest {
  position: string
  color: Color
  difficulty: Difficulty
}

export interface WorkerResponse {
  from: Move['from']
  to: Move['to']
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { position, color, difficulty } = event.data
  const board = parseFen(position)
  const settings = DIFFICULTY_SETTINGS[difficulty]
  const result = findBestMove(board, color, settings)
  const response: WorkerResponse = { from: result.move.from, to: result.move.to }
  ;(self as unknown as Worker).postMessage(response)
}
