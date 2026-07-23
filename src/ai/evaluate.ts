import { Board, Color, Coord, PieceType, indexToCoord } from '../engine/board'
import { hasCrossedRiver } from '../engine/pieces'

const PIECE_VALUES: Record<PieceType, number> = {
  general: 10000,
  advisor: 200,
  elephant: 200,
  horse: 450,
  chariot: 900,
  cannon: 450,
  soldier: 100,
}

function centrality(coord: Coord): number {
  return 4 - Math.abs(coord.col - 4)
}

function positionalBonus(type: PieceType, color: Color, coord: Coord): number {
  if (type === 'soldier' && hasCrossedRiver(coord, color)) return 50
  if (type === 'horse' || type === 'cannon') return centrality(coord) * 5
  return 0
}

export function evaluateBoard(board: Board, colorToMaximize: Color): number {
  let score = 0
  board.forEach((piece, index) => {
    if (!piece) return
    const coord = indexToCoord(index)
    const value = PIECE_VALUES[piece.type] + positionalBonus(piece.type, piece.color, coord)
    score += piece.color === colorToMaximize ? value : -value
  })
  return score
}
