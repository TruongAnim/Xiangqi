import { Board, Color, Coord, Move, applyMove, coordToIndex, indexToCoord } from './board'
import { allPseudoLegalMoves, pseudoLegalMoves } from './pieces'

function findGeneral(board: Board, color: Color): Coord {
  const index = board.findIndex((piece) => piece?.type === 'general' && piece.color === color)
  if (index === -1) throw new Error(`No ${color} general on board`)
  return indexToCoord(index)
}

function opponent(color: Color): Color {
  return color === 'red' ? 'black' : 'red'
}

export function isInCheck(board: Board, color: Color): boolean {
  const generalIndex = coordToIndex(findGeneral(board, color))
  const opponentMoves = allPseudoLegalMoves(board, opponent(color))
  return opponentMoves.some((move) => coordToIndex(move.to) === generalIndex)
}

export function generalsFacing(board: Board): boolean {
  const redGeneral = findGeneral(board, 'red')
  const blackGeneral = findGeneral(board, 'black')
  if (redGeneral.col !== blackGeneral.col) return false
  const [top, bottom] =
    redGeneral.row < blackGeneral.row ? [redGeneral, blackGeneral] : [blackGeneral, redGeneral]
  for (let row = top.row + 1; row < bottom.row; row++) {
    if (board[coordToIndex({ col: redGeneral.col, row })]) return false
  }
  return true
}

export function isLegalMove(board: Board, move: Move, color: Color): boolean {
  const next = applyMove(board, move)
  if (isInCheck(next, color)) return false
  if (generalsFacing(next)) return false
  return true
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
