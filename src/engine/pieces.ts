import { Board, Coord, Piece, Color, Move, coordToIndex, inBounds } from './board'

function pieceAt(board: Board, coord: Coord): Piece | null {
  if (!inBounds(coord)) return null
  return board[coordToIndex(coord)]
}

export function isPalace(coord: Coord, color: Color): boolean {
  if (coord.col < 3 || coord.col > 5) return false
  return color === 'black' ? coord.row >= 0 && coord.row <= 2 : coord.row >= 7 && coord.row <= 9
}

export function hasCrossedRiver(coord: Coord, color: Color): boolean {
  return color === 'black' ? coord.row >= 5 : coord.row <= 4
}

function canLandOn(board: Board, coord: Coord, color: Color): boolean {
  if (!inBounds(coord)) return false
  const occupant = pieceAt(board, coord)
  return !occupant || occupant.color !== color
}

function generalMoves(board: Board, from: Coord, color: Color): Coord[] {
  const deltas = [
    { col: 0, row: -1 },
    { col: 0, row: 1 },
    { col: -1, row: 0 },
    { col: 1, row: 0 },
  ]
  return deltas
    .map((d) => ({ col: from.col + d.col, row: from.row + d.row }))
    .filter((to) => isPalace(to, color) && canLandOn(board, to, color))
}

function advisorMoves(board: Board, from: Coord, color: Color): Coord[] {
  const deltas = [
    { col: -1, row: -1 },
    { col: 1, row: -1 },
    { col: -1, row: 1 },
    { col: 1, row: 1 },
  ]
  return deltas
    .map((d) => ({ col: from.col + d.col, row: from.row + d.row }))
    .filter((to) => isPalace(to, color) && canLandOn(board, to, color))
}

function elephantMoves(board: Board, from: Coord, color: Color): Coord[] {
  const deltas = [
    { col: -2, row: -2 },
    { col: 2, row: -2 },
    { col: -2, row: 2 },
    { col: 2, row: 2 },
  ]
  const moves: Coord[] = []
  for (const d of deltas) {
    const to = { col: from.col + d.col, row: from.row + d.row }
    const eye = { col: from.col + d.col / 2, row: from.row + d.row / 2 }
    if (!inBounds(to)) continue
    if (hasCrossedRiver(to, color)) continue
    if (pieceAt(board, eye)) continue
    if (canLandOn(board, to, color)) moves.push(to)
  }
  return moves
}

export const HORSE_MOVES = [
  { d: { col: 1, row: 2 }, leg: { col: 0, row: 1 } },
  { d: { col: -1, row: 2 }, leg: { col: 0, row: 1 } },
  { d: { col: 1, row: -2 }, leg: { col: 0, row: -1 } },
  { d: { col: -1, row: -2 }, leg: { col: 0, row: -1 } },
  { d: { col: 2, row: 1 }, leg: { col: 1, row: 0 } },
  { d: { col: 2, row: -1 }, leg: { col: 1, row: 0 } },
  { d: { col: -2, row: 1 }, leg: { col: -1, row: 0 } },
  { d: { col: -2, row: -1 }, leg: { col: -1, row: 0 } },
]

function horseMoves(board: Board, from: Coord, color: Color): Coord[] {
  const moves: Coord[] = []
  for (const { d, leg } of HORSE_MOVES) {
    const to = { col: from.col + d.col, row: from.row + d.row }
    const legCoord = { col: from.col + leg.col, row: from.row + leg.row }
    if (!inBounds(to)) continue
    if (pieceAt(board, legCoord)) continue
    if (canLandOn(board, to, color)) moves.push(to)
  }
  return moves
}

const ORTHOGONAL_DIRECTIONS = [
  { col: 0, row: -1 },
  { col: 0, row: 1 },
  { col: -1, row: 0 },
  { col: 1, row: 0 },
]

function chariotMoves(board: Board, from: Coord, color: Color): Coord[] {
  const moves: Coord[] = []
  for (const dir of ORTHOGONAL_DIRECTIONS) {
    let to = { col: from.col + dir.col, row: from.row + dir.row }
    while (inBounds(to)) {
      const occupant = pieceAt(board, to)
      if (!occupant) {
        moves.push(to)
      } else {
        if (occupant.color !== color) moves.push(to)
        break
      }
      to = { col: to.col + dir.col, row: to.row + dir.row }
    }
  }
  return moves
}

function cannonMoves(board: Board, from: Coord, color: Color): Coord[] {
  const moves: Coord[] = []
  for (const dir of ORTHOGONAL_DIRECTIONS) {
    let to = { col: from.col + dir.col, row: from.row + dir.row }
    let screenFound = false
    while (inBounds(to)) {
      const occupant = pieceAt(board, to)
      if (!screenFound) {
        if (!occupant) {
          moves.push(to)
        } else {
          screenFound = true
        }
      } else if (occupant) {
        if (occupant.color !== color) moves.push(to)
        break
      }
      to = { col: to.col + dir.col, row: to.row + dir.row }
    }
  }
  return moves
}

function soldierMoves(board: Board, from: Coord, color: Color): Coord[] {
  const forward = color === 'black' ? 1 : -1
  const moves: Coord[] = []
  const forwardCoord = { col: from.col, row: from.row + forward }
  if (canLandOn(board, forwardCoord, color)) moves.push(forwardCoord)
  if (hasCrossedRiver(from, color)) {
    const left = { col: from.col - 1, row: from.row }
    const right = { col: from.col + 1, row: from.row }
    if (canLandOn(board, left, color)) moves.push(left)
    if (canLandOn(board, right, color)) moves.push(right)
  }
  return moves
}

function pseudoDestinations(board: Board, from: Coord, piece: Piece): Coord[] {
  switch (piece.type) {
    case 'general':
      return generalMoves(board, from, piece.color)
    case 'advisor':
      return advisorMoves(board, from, piece.color)
    case 'elephant':
      return elephantMoves(board, from, piece.color)
    case 'horse':
      return horseMoves(board, from, piece.color)
    case 'chariot':
      return chariotMoves(board, from, piece.color)
    case 'cannon':
      return cannonMoves(board, from, piece.color)
    case 'soldier':
      return soldierMoves(board, from, piece.color)
  }
}

export function pseudoLegalMoves(board: Board, from: Coord): Move[] {
  const piece = pieceAt(board, from)
  if (!piece) return []
  return pseudoDestinations(board, from, piece).map((to) => ({ from, to }))
}

export function allPseudoLegalMoves(board: Board, color: Color): Move[] {
  const moves: Move[] = []
  board.forEach((piece, index) => {
    if (piece && piece.color === color) {
      const from = { col: index % 9, row: Math.floor(index / 9) }
      moves.push(...pseudoLegalMoves(board, from))
    }
  })
  return moves
}
