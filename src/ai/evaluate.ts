import { BOARD_COLS, BOARD_ROWS, Board, Color, Coord, PieceType, indexToCoord } from '../engine/board'
import { hasCrossedRiver, isPalace } from '../engine/pieces'

export const PIECE_VALUES: Record<PieceType, number> = {
  general: 10000,
  advisor: 200,
  elephant: 200,
  horse: 450,
  chariot: 900,
  cannon: 450,
  soldier: 100,
}

/**
 * Piece-square tables, written from red's point of view with row 0 at the top
 * (black's back rank) exactly as the board array is laid out. Black reads the
 * same table mirrored vertically.
 *
 * Values are small next to the material values above: they nudge the engine
 * toward sound development without ever tempting it to shed a piece.
 */
type Table = number[][]

// prettier-ignore
const SOLDIER_TABLE: Table = [
  [ 60,  70,  80,  90, 100,  90,  80,  70,  60],
  [ 60,  70,  80,  90, 100,  90,  80,  70,  60],
  [ 55,  65,  75,  85,  90,  85,  75,  65,  55],
  [ 40,  45,  55,  65,  70,  65,  55,  45,  40],
  [ 25,  30,  35,  40,  45,  40,  35,  30,  25],
  [  5,   0,  10,   0,  12,   0,  10,   0,   5],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0],
  [  0,   0,   0,   0,   0,   0,   0,   0,   0],
]

// prettier-ignore
const HORSE_TABLE: Table = [
  [  0,  -4,   0,   0,   0,   0,   0,  -4,   0],
  [  0,   2,   4,   6,   6,   6,   4,   2,   0],
  [  4,   6,  10,  14,  14,  14,  10,   6,   4],
  [  4,  10,  14,  16,  16,  16,  14,  10,   4],
  [  4,  10,  14,  16,  16,  16,  14,  10,   4],
  [  2,   8,  12,  14,  14,  14,  12,   8,   2],
  [  2,   6,  10,  12,  12,  12,  10,   6,   2],
  [  0,   4,   6,   8,  10,   8,   6,   4,   0],
  [  0,   2,   4,   4,   4,   4,   4,   2,   0],
  [  0,  -4,   0,   0,   0,   0,   0,  -4,   0],
]

// prettier-ignore
const CHARIOT_TABLE: Table = [
  [ 12,  14,  12,  18,  16,  18,  12,  14,  12],
  [ 16,  20,  18,  24,  26,  24,  18,  20,  16],
  [ 12,  16,  14,  20,  22,  20,  14,  16,  12],
  [ 12,  18,  16,  22,  22,  22,  16,  18,  12],
  [ 12,  18,  16,  22,  22,  22,  16,  18,  12],
  [ 12,  16,  14,  20,  20,  20,  14,  16,  12],
  [  6,  10,   8,  14,  14,  14,   8,  10,   6],
  [  4,   8,   6,  14,  12,  14,   6,   8,   4],
  [  8,   4,   8,  16,   8,  16,   8,   4,   8],
  [ -2,  10,   6,  14,  12,  14,   6,  10,  -2],
]

// prettier-ignore
const CANNON_TABLE: Table = [
  [  6,   4,   0,  -8, -12,  -8,   0,   4,   6],
  [  2,   2,   0,  -8, -10,  -8,   0,   2,   2],
  [  2,   2,   0, -10, -14, -10,   0,   2,   2],
  [  0,   0,  -2,   8,  10,   8,  -2,   0,   0],
  [  0,   0,   0,   6,   8,   6,   0,   0,   0],
  [ -2,   0,   4,   6,   8,   6,   4,   0,  -2],
  [  0,   0,   0,   2,   4,   2,   0,   0,   0],
  [  0,   2,   4,   6,   6,   6,   4,   2,   0],
  [  0,   0,   2,   6,   6,   6,   2,   0,   0],
  [  0,   0,   2,   6,   6,   6,   2,   0,   0],
]

const TABLES: Partial<Record<PieceType, Table>> = {
  soldier: SOLDIER_TABLE,
  horse: HORSE_TABLE,
  chariot: CHARIOT_TABLE,
  cannon: CANNON_TABLE,
}

function tableValue(type: PieceType, color: Color, coord: Coord): number {
  const table = TABLES[type]
  if (!table) return 0
  const row = color === 'red' ? coord.row : BOARD_ROWS - 1 - coord.row
  return table[row][coord.col]
}

/** A soldier that has crossed and kept advancing is worth far more than its base value. */
function soldierAdvance(color: Color, coord: Coord): number {
  if (!hasCrossedRiver(coord, color)) return 0
  const ranksBeyondRiver = color === 'red' ? 4 - coord.row : coord.row - 5
  return 30 + ranksBeyondRiver * 15
}

/** Advisors and elephants only do their job at home, guarding the palace. */
function defenderPenalty(type: PieceType, color: Color, coord: Coord): number {
  if (type === 'advisor') return isPalace(coord, color) ? 0 : -60
  if (type === 'elephant') return hasCrossedRiver(coord, color) ? -60 : 0
  return 0
}

export function evaluatePiece(type: PieceType, color: Color, coord: Coord): number {
  let value = PIECE_VALUES[type] + tableValue(type, color, coord)
  if (type === 'soldier') value += soldierAdvance(color, coord)
  value += defenderPenalty(type, color, coord)
  return value
}

export function evaluateBoard(board: Board, colorToMaximize: Color): number {
  let score = 0
  for (let index = 0; index < BOARD_COLS * BOARD_ROWS; index++) {
    const piece = board[index]
    if (!piece) continue
    const value = evaluatePiece(piece.type, piece.color, indexToCoord(index))
    score += piece.color === colorToMaximize ? value : -value
  }
  return score
}
