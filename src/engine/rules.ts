import { Board, Color, Coord, Move, coordToIndex, indexToCoord } from './board'
import { allPseudoLegalMoves, pseudoLegalMoves } from './pieces'
import { isSquareAttacked } from './attacks'

function locateGeneral(board: Board, color: Color): Coord | null {
  const index = board.findIndex((piece) => piece?.type === 'general' && piece.color === color)
  return index === -1 ? null : indexToCoord(index)
}

export function findGeneral(board: Board, color: Color): Coord {
  const coord = locateGeneral(board, color)
  if (!coord) throw new Error(`No ${color} general on board`)
  return coord
}

function opponent(color: Color): Color {
  return color === 'red' ? 'black' : 'red'
}

export function isInCheck(board: Board, color: Color): boolean {
  return isSquareAttacked(board, findGeneral(board, color), opponent(color))
}

/**
 * A general can go missing mid-legality-check when the move under test captures
 * it. That only happens in positions that cannot arise from a legal game, but
 * the search must not blow up on one, so a missing general simply means the
 * generals are not facing.
 */
export function generalsFacing(board: Board): boolean {
  const redGeneral = locateGeneral(board, 'red')
  const blackGeneral = locateGeneral(board, 'black')
  if (!redGeneral || !blackGeneral) return false
  if (redGeneral.col !== blackGeneral.col) return false
  const [top, bottom] =
    redGeneral.row < blackGeneral.row ? [redGeneral, blackGeneral] : [blackGeneral, redGeneral]
  for (let row = top.row + 1; row < bottom.row; row++) {
    if (board[coordToIndex({ col: redGeneral.col, row })]) return false
  }
  return true
}

/**
 * Legality is checked for every pseudo-legal move, so the move is played on the
 * caller's board and taken back rather than copying all 90 squares each time.
 * The board is always restored before returning.
 */
export function isLegalMove(board: Board, move: Move, color: Color): boolean {
  const fromIndex = coordToIndex(move.from)
  const toIndex = coordToIndex(move.to)
  const moving = board[fromIndex]
  const captured = board[toIndex]

  board[toIndex] = moving
  board[fromIndex] = null
  try {
    return !isInCheck(board, color) && !generalsFacing(board)
  } finally {
    board[fromIndex] = moving
    board[toIndex] = captured
  }
}

export function legalMovesFrom(board: Board, from: Coord): Move[] {
  const piece = board[coordToIndex(from)]
  if (!piece) return []
  return pseudoLegalMoves(board, from).filter((move) => isLegalMove(board, move, piece.color))
}

export function allLegalMoves(board: Board, color: Color): Move[] {
  return allPseudoLegalMoves(board, color).filter((move) => isLegalMove(board, move, color))
}

export type GameStatus = 'playing' | 'check' | 'checkmate' | 'no-moves-loss'

export function getGameStatus(board: Board, colorToMove: Color): GameStatus {
  const inCheck = isInCheck(board, colorToMove)
  const hasMoves = allLegalMoves(board, colorToMove).length > 0
  if (!hasMoves) return inCheck ? 'checkmate' : 'no-moves-loss'
  return inCheck ? 'check' : 'playing'
}
