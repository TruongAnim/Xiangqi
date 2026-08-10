import {
  Board,
  Color,
  Coord,
  Move,
  Piece,
  applyMove,
  boardToFen,
  coordToIndex,
  createStartBoard,
} from '../engine/board'
import { getGameStatus, legalMovesFrom } from '../engine/rules'
import { moveToNotation, type MoveNotation } from '../engine/moveNotation'
import type { Difficulty } from '../ai/difficulty'

/** A position repeated this many times ends the game. */
const REPETITION_LIMIT = 3

/** Plies (half-moves) without a capture before the game is drawn — 60 moves a side. */
const NO_CAPTURE_PLY_LIMIT = 120

export interface HistoryEntry {
  move: Move
  piece: Piece
  captured: Piece | null
  notation: MoveNotation
  /** Whether this move left the opponent in check — needed to spot perpetual check. */
  gaveCheck: boolean
  /** Position reached after this move, used for repetition detection. */
  positionKey: string
}

export type GameMode = 'setup' | 'vs-ai' | 'local'

export type GameStatus =
  | 'setup'
  | 'playing'
  | 'check'
  | 'checkmate'
  | 'no-moves-loss'
  | 'timeout'
  | 'draw'
  | 'perpetual-check-loss'

export type DrawReason = 'repetition' | 'no-capture'

export interface GameState {
  board: Board
  turn: Color
  history: HistoryEntry[]
  mode: GameMode
  difficulty: Difficulty | null
  clocks: { red: number; black: number } | null
  initialClockMs: number | null
  status: GameStatus
  winner: Color | null
  drawReason: DrawReason | null
  selected: Coord | null
  legalTargets: Coord[]
  flipped: boolean
  /** Set while the engine is searching, so the UI can say so and block input. */
  thinking: boolean
  positionCounts: Record<string, number>
  pliesSinceCapture: number
}

export type GameAction =
  | { type: 'START_GAME'; mode: 'vs-ai' | 'local'; difficulty: Difficulty | null; clockMs: number | null }
  | { type: 'SELECT_SQUARE'; coord: Coord }
  | { type: 'MOVE'; move: Move }
  | { type: 'UNDO' }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'NEW_GAME' }
  | { type: 'FLIP_BOARD' }
  | { type: 'SET_THINKING'; thinking: boolean }
  | { type: 'RESTORE'; state: GameState }

export const initialGameState: GameState = {
  board: createStartBoard(),
  turn: 'red',
  history: [],
  mode: 'setup',
  difficulty: null,
  clocks: null,
  initialClockMs: null,
  status: 'setup',
  winner: null,
  drawReason: null,
  selected: null,
  legalTargets: [],
  flipped: false,
  thinking: false,
  positionCounts: {},
  pliesSinceCapture: 0,
}

/** In vs-AI games the human always plays red and the engine answers as black. */
export const AI_COLOR: Color = 'black'

function opponent(color: Color): Color {
  return color === 'red' ? 'black' : 'red'
}

export function isOngoing(status: GameStatus): boolean {
  return status === 'playing' || status === 'check'
}

export function isGameOver(status: GameStatus): boolean {
  return status !== 'setup' && !isOngoing(status)
}

/** Identifies a position for repetition counting: the layout plus who is to move. */
export function positionKey(board: Board, turn: Color): string {
  return `${boardToFen(board)} ${turn}`
}

/**
 * A repeated position is a draw unless one side brought it about by checking on
 * every one of its moves in the cycle: perpetual check loses the game for the
 * side giving it. (Perpetual chasing, which Asian rules also forbid, needs
 * piece-by-piece threat analysis and is not enforced here.)
 */
function resolveRepetition(
  history: HistoryEntry[],
  key: string,
): { status: GameStatus; winner: Color | null; drawReason: DrawReason | null } {
  const previous = history.findLastIndex((entry, index) => index < history.length - 1 && entry.positionKey === key)
  const cycle = previous === -1 ? history : history.slice(previous + 1)

  const checksBy = (color: Color) => {
    const moves = cycle.filter((entry) => entry.piece.color === color)
    return moves.length > 0 && moves.every((entry) => entry.gaveCheck)
  }

  const redPerpetual = checksBy('red')
  const blackPerpetual = checksBy('black')

  if (redPerpetual && !blackPerpetual) {
    return { status: 'perpetual-check-loss', winner: 'black', drawReason: null }
  }
  if (blackPerpetual && !redPerpetual) {
    return { status: 'perpetual-check-loss', winner: 'red', drawReason: null }
  }
  return { status: 'draw', winner: null, drawReason: 'repetition' }
}

/** The opening position counts as the first occurrence for repetition purposes. */
function initialPositionCounts(): Record<string, number> {
  return { [positionKey(createStartBoard(), 'red')]: 1 }
}

/** Rebuilds the derived position data by replaying a history from the start. */
function replay(history: HistoryEntry[]): Pick<GameState, 'board' | 'positionCounts' | 'pliesSinceCapture'> {
  let board = createStartBoard()
  const positionCounts = initialPositionCounts()
  let pliesSinceCapture = 0

  history.forEach((entry, index) => {
    board = applyMove(board, entry.move)
    pliesSinceCapture = entry.captured ? 0 : pliesSinceCapture + 1
    const key = positionKey(board, index % 2 === 0 ? 'black' : 'red')
    positionCounts[key] = (positionCounts[key] ?? 0) + 1
  })

  return { board, positionCounts, pliesSinceCapture }
}

function applyPlayerMove(state: GameState, move: Move): GameState {
  const piece = state.board[coordToIndex(move.from)]
  if (!piece) return state

  const captured = state.board[coordToIndex(move.to)] ?? null
  const board = applyMove(state.board, move)
  const turn = opponent(state.turn)
  const outcome = getGameStatus(board, turn)

  const key = positionKey(board, turn)
  const positionCounts = { ...state.positionCounts, [key]: (state.positionCounts[key] ?? 0) + 1 }
  const pliesSinceCapture = captured ? 0 : state.pliesSinceCapture + 1

  const entry: HistoryEntry = {
    move,
    piece,
    captured,
    notation: moveToNotation(state.board, move),
    gaveCheck: outcome === 'check' || outcome === 'checkmate',
    positionKey: key,
  }
  const history = [...state.history, entry]

  const conclusion =
    outcome === 'checkmate' || outcome === 'no-moves-loss'
      ? { status: outcome, winner: state.turn, drawReason: null as DrawReason | null }
      : positionCounts[key] >= REPETITION_LIMIT
        ? resolveRepetition(history, key)
        : pliesSinceCapture >= NO_CAPTURE_PLY_LIMIT
          ? { status: 'draw' as GameStatus, winner: null, drawReason: 'no-capture' as DrawReason }
          : { status: outcome as GameStatus, winner: null, drawReason: null as DrawReason | null }

  return {
    ...state,
    board,
    turn,
    history,
    status: conclusion.status,
    winner: conclusion.winner,
    drawReason: conclusion.drawReason,
    selected: null,
    legalTargets: [],
    positionCounts,
    pliesSinceCapture,
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      return {
        ...initialGameState,
        mode: action.mode,
        difficulty: action.difficulty,
        clocks: action.clockMs !== null ? { red: action.clockMs, black: action.clockMs } : null,
        initialClockMs: action.clockMs,
        status: 'playing',
        flipped: state.flipped,
        positionCounts: initialPositionCounts(),
      }
    }

    case 'NEW_GAME': {
      return { ...initialGameState, flipped: state.flipped }
    }

    case 'RESTORE': {
      return { ...action.state, thinking: false, selected: null, legalTargets: [] }
    }

    case 'FLIP_BOARD': {
      return { ...state, flipped: !state.flipped }
    }

    case 'SET_THINKING': {
      return { ...state, thinking: action.thinking }
    }

    case 'SELECT_SQUARE': {
      if (!isOngoing(state.status)) return state
      // The engine owns its own colour; clicking its pieces must do nothing.
      if (state.mode === 'vs-ai' && state.turn === AI_COLOR) return state

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
      if (!isOngoing(state.status)) return state
      return applyPlayerMove(state, action.move)
    }

    case 'UNDO': {
      if (state.history.length === 0) return state
      // Against the engine, rewind to the human's turn: that is one ply while the
      // engine is still thinking, and two once it has replied.
      const plies = state.history.length
      const keep =
        state.mode === 'vs-ai' ? Math.max(0, plies % 2 === 1 ? plies - 1 : plies - 2) : plies - 1
      const history = state.history.slice(0, keep)

      const { board, positionCounts, pliesSinceCapture } = replay(history)
      const turn: Color = keep % 2 === 0 ? 'red' : 'black'

      return {
        ...state,
        board,
        turn,
        history,
        status: getGameStatus(board, turn),
        winner: null,
        drawReason: null,
        selected: null,
        legalTargets: [],
        thinking: false,
        positionCounts,
        pliesSinceCapture,
      }
    }

    case 'TICK': {
      if (!state.clocks || !isOngoing(state.status)) return state
      const remaining = Math.max(0, state.clocks[state.turn] - action.deltaMs)
      const clocks = { ...state.clocks, [state.turn]: remaining }
      if (remaining === 0) {
        return { ...state, clocks, status: 'timeout', winner: opponent(state.turn), thinking: false }
      }
      return { ...state, clocks }
    }

    default:
      return state
  }
}
