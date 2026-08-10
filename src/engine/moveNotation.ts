import { Board, Color, Move, PieceType, coordToIndex } from './board'

export type NotationLanguage = 'vi' | 'en'

/** Both renderings are stored per move so switching language re-labels history instantly. */
export interface MoveNotation {
  vi: string
  en: string
}

const NAMES_VI: Record<PieceType, string> = {
  general: 'Tướng',
  advisor: 'Sĩ',
  elephant: 'Tượng',
  horse: 'Mã',
  chariot: 'Xe',
  cannon: 'Pháo',
  soldier: 'Tốt',
}

const LETTERS_EN: Record<PieceType, string> = {
  general: 'K',
  advisor: 'A',
  elephant: 'E',
  horse: 'H',
  chariot: 'R',
  cannon: 'C',
  soldier: 'P',
}

/**
 * Horse, advisor and elephant always change file when they move, so their
 * notation names the destination file. Everything else moves in a straight
 * line, and a forward or backward move names how many ranks it travelled.
 */
const DIAGONAL_MOVERS: ReadonlySet<PieceType> = new Set<PieceType>(['horse', 'advisor', 'elephant'])

const RANK_PREFIXES_VI: Record<number, string[]> = {
  2: ['Tiền', 'Hậu'],
  3: ['Tiền', 'Trung', 'Hậu'],
  4: ['Nhất', 'Nhị', 'Tam', 'Tứ'],
  5: ['Nhất', 'Nhị', 'Tam', 'Tứ', 'Ngũ'],
}

/** Files are numbered 1-9 from each player's own right-hand side. */
function fileNumber(col: number, color: Color): number {
  return color === 'red' ? 9 - col : col + 1
}

/** Pieces of the same type sharing a file, ordered from the one nearest the enemy. */
function stackedPeers(board: Board, move: Move, type: PieceType, color: Color): number[] {
  const rows: number[] = []
  for (let row = 0; row < 10; row++) {
    const piece = board[coordToIndex({ col: move.from.col, row })]
    if (piece && piece.type === type && piece.color === color) rows.push(row)
  }
  return color === 'red' ? rows : rows.reverse()
}

function prefixVi(index: number, count: number): string {
  return RANK_PREFIXES_VI[count]?.[index] ?? String(index + 1)
}

function prefixEn(index: number, count: number): string {
  if (count === 2) return index === 0 ? '+' : '-'
  return String(index + 1)
}

export function moveToNotation(board: Board, move: Move): MoveNotation {
  const piece = board[coordToIndex(move.from)]
  if (!piece) return { vi: '', en: '' }

  const { type, color } = piece
  const forward = color === 'red' ? -1 : 1
  const rankChange = (move.to.row - move.from.row) * forward

  const peers = stackedPeers(board, move, type, color)
  const stacked = peers.length > 1
  const index = stacked ? peers.indexOf(move.from.row) : 0

  const originVi = stacked ? prefixVi(index, peers.length) : String(fileNumber(move.from.col, color))
  const originEn = stacked ? prefixEn(index, peers.length) : String(fileNumber(move.from.col, color))

  const destinationFile = String(fileNumber(move.to.col, color))
  const usesDestinationFile = rankChange === 0 || DIAGONAL_MOVERS.has(type)
  const target = usesDestinationFile ? destinationFile : String(Math.abs(rankChange))

  const directionVi = rankChange === 0 ? 'bình' : rankChange > 0 ? 'tiến' : 'thoái'
  const directionEn = rankChange === 0 ? '.' : rankChange > 0 ? '+' : '-'

  const nameVi = NAMES_VI[type]
  const vi = stacked
    ? `${originVi} ${nameVi.toLowerCase()} ${directionVi} ${target}`
    : `${nameVi} ${originVi} ${directionVi} ${target}`

  const letterEn = LETTERS_EN[type]
  const en = stacked
    ? `${originEn}${letterEn}${directionEn}${target}`
    : `${letterEn}${originEn}${directionEn}${target}`

  return { vi, en }
}
