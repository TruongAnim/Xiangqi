import {
  Board,
  Color,
  Coord,
  Move,
  Piece,
  applyMove,
  coordToIndex,
  createStartBoard,
} from '../engine/board'
import { getGameStatus, legalMovesFrom } from '../engine/rules'
import { moveToNotation } from '../engine/moveNotation'
import type { Difficulty } from '../ai/difficulty'

export interface HistoryEntry {
  move: Move
  piece: Piece
  captured: Piece | null
  notation: string
}

export type GameMode = 'setup' | 'vs-ai' | 'local'
export type GameStatus = 'setup' | 'playing' | 'check' | 'checkmate' | 'no-moves-loss' | 'timeout'

export interface GameState {
  board: Board
  turn: Color
  history: HistoryEntry[]
  mode: GameMode
  difficulty: Difficulty | null
  clocks: { red: number; black: number } | null
  status: GameStatus
  winner: Color | null
  selected: Coord | null
  legalTargets: Coord[]
  flipped: boolean
}

export type GameAction =
  | { type: 'START_GAME'; mode: 'vs-ai' | 'local'; difficulty: Difficulty | null; clockMs: number | null }
  | { type: 'SELECT_SQUARE'; coord: Coord }
  | { type: 'MOVE'; move: Move }
  | { type: 'UNDO' }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'NEW_GAME' }
  | { type: 'FLIP_BOARD' }

export const initialGameState: GameState = {
  board: createStartBoard(),
  turn: 'red',
  history: [],
  mode: 'setup',
  difficulty: null,
  clocks: null,
  status: 'setup',
  winner: null,
  selected: null,
  legalTargets: [],
  flipped: false,
}

function opponent(color: Color): Color {
  return color === 'red' ? 'black' : 'red'
}

function isOngoing(status: GameStatus): boolean {
  return status === 'playing' || status === 'check'
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      return {
        ...initialGameState,
        mode: action.mode,
        difficulty: action.difficulty,
        clocks: action.clockMs !== null ? { red: action.clockMs, black: action.clockMs } : null,
        status: 'playing',
      }
    }

    case 'NEW_GAME': {
      return { ...initialGameState }
    }

    case 'FLIP_BOARD': {
      return { ...state, flipped: !state.flipped }
    }

    case 'SELECT_SQUARE': {
      if (!isOngoing(state.status)) return state

      if (state.selected) {
        const isTarget = state.legalTargets.some(
          (target) => target.col === action.coord.col && target.row === action.coord.row,
        )
        if (isTarget) {
          return gameReducer(state, { type: 'MOVE', move: { from: state.selected, to: action.coord } })
        }
      }

      const piece = state.board[coordToIndex(action.coord)]
      if (piece && piece.color === state.turn) {
        const legalTargets = legalMovesFrom(state.board, action.coord).map((move) => move.to)
        return { ...state, selected: action.coord, legalTargets }
      }

      return { ...state, selected: null, legalTargets: [] }
    }

    case 'MOVE': {
      const piece = state.board[coordToIndex(action.move.from)]
      if (!piece) return state

      const captured = state.board[coordToIndex(action.move.to)]
      const board = applyMove(state.board, action.move)
      const nextTurn = opponent(state.turn)
      const status = getGameStatus(board, nextTurn)
      const entry: HistoryEntry = {
        move: action.move,
        piece,
        captured,
        notation: moveToNotation(action.move),
      }

      return {
        ...state,
        board,
        turn: nextTurn,
        history: [...state.history, entry],
        status,
        winner: status === 'checkmate' || status === 'no-moves-loss' ? state.turn : null,
        selected: null,
        legalTargets: [],
      }
    }

    case 'UNDO': {
      if (state.history.length === 0) return state
      if (state.mode === 'vs-ai' && state.turn !== 'red') return state
      const pliesToUndo = state.mode === 'vs-ai' ? 2 : 1
      const keep = Math.max(0, state.history.length - pliesToUndo)

      let board = createStartBoard()
      for (let i = 0; i < keep; i++) {
        board = applyMove(board, state.history[i].move)
      }
      const turn: Color = keep % 2 === 0 ? 'red' : 'black'
      const status = getGameStatus(board, turn)

      return {
        ...state,
        board,
        turn,
        history: state.history.slice(0, keep),
        status,
        winner: null,
        selected: null,
        legalTargets: [],
      }
    }

    case 'TICK': {
      if (!state.clocks || !isOngoing(state.status)) return state
      const remaining = Math.max(0, state.clocks[state.turn] - action.deltaMs)
      const clocks = { ...state.clocks, [state.turn]: remaining }
      if (remaining === 0) {
        return { ...state, clocks, status: 'timeout', winner: opponent(state.turn) }
      }
      return { ...state, clocks }
    }

    default:
      return state
  }
}
