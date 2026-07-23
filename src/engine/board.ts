export type Color = 'red' | 'black'

export type PieceType =
  | 'general'
  | 'advisor'
  | 'elephant'
  | 'horse'
  | 'chariot'
  | 'cannon'
  | 'soldier'

export interface Piece {
  type: PieceType
  color: Color
}

export interface Coord {
  col: number // 0-8
  row: number // 0-9, 0 = black back rank, 9 = red back rank
}

export interface Move {
  from: Coord
  to: Coord
}

export type Board = (Piece | null)[] // length 90, index = row * BOARD_COLS + col

export const BOARD_COLS = 9
export const BOARD_ROWS = 10

export function coordToIndex(coord: Coord): number {
  return coord.row * BOARD_COLS + coord.col
}

export function indexToCoord(index: number): Coord {
  return { col: index % BOARD_COLS, row: Math.floor(index / BOARD_COLS) }
}

export function inBounds(coord: Coord): boolean {
  return coord.col >= 0 && coord.col < BOARD_COLS && coord.row >= 0 && coord.row < BOARD_ROWS
}

const FEN_TO_PIECE: Record<string, PieceType> = {
  r: 'chariot',
  n: 'horse',
  b: 'elephant',
  a: 'advisor',
  k: 'general',
  c: 'cannon',
  p: 'soldier',
}

const PIECE_TO_FEN: Record<PieceType, string> = {
  chariot: 'r',
  horse: 'n',
  elephant: 'b',
  advisor: 'a',
  general: 'k',
  cannon: 'c',
  soldier: 'p',
}

export const START_POSITION_FEN =
  'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR'

export function parseFen(fen: string): Board {
  const board: Board = new Array(BOARD_COLS * BOARD_ROWS).fill(null)
  const rows = fen.split('/')
  rows.forEach((rowStr, row) => {
    let col = 0
    for (const ch of rowStr) {
      if (/[0-9]/.test(ch)) {
        col += Number(ch)
      } else {
        const type = FEN_TO_PIECE[ch.toLowerCase()]
        const color: Color = ch === ch.toLowerCase() ? 'black' : 'red'
        board[coordToIndex({ col, row })] = { type, color }
        col += 1
      }
    }
  })
  return board
}

export function boardToFen(board: Board): string {
  const rows: string[] = []
  for (let row = 0; row < BOARD_ROWS; row++) {
    let rowStr = ''
    let empty = 0
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[coordToIndex({ col, row })]
      if (!piece) {
        empty += 1
        continue
      }
      if (empty > 0) {
        rowStr += String(empty)
        empty = 0
      }
      const ch = PIECE_TO_FEN[piece.type]
      rowStr += piece.color === 'red' ? ch.toUpperCase() : ch
    }
    if (empty > 0) rowStr += String(empty)
    rows.push(rowStr)
  }
  return rows.join('/')
}

export function createStartBoard(): Board {
  return parseFen(START_POSITION_FEN)
}

export function applyMove(board: Board, move: Move): Board {
  const next = board.slice()
  const fromIndex = coordToIndex(move.from)
  const toIndex = coordToIndex(move.to)
  next[toIndex] = next[fromIndex]
  next[fromIndex] = null
  return next
}
