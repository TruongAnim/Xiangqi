import { Board, Color, Coord, coordToIndex, inBounds } from './board'
import { HORSE_MOVES, hasCrossedRiver, isPalace } from './pieces'

/**
 * Attack detection that scans outward from the target square instead of
 * generating every move the attacker could make. Check detection runs once per
 * candidate move during legality filtering, so this is the hottest path in both
 * the UI and the AI search.
 *
 * Note the general is treated as attacking only the four squares adjacent to it
 * inside its own palace. The flying-general rule is handled separately by
 * `generalsFacing` in rules.ts, matching how move legality is filtered.
 *
 * Whatever occupies `target` is ignored, so a square holding one of `byColor`'s
 * own pieces counts as attacked (i.e. defended) rather than unreachable.
 */

const ORTHOGONAL_DIRECTIONS = [
  { col: 0, row: -1 },
  { col: 0, row: 1 },
  { col: -1, row: 0 },
  { col: 1, row: 0 },
]

const DIAGONAL_DIRECTIONS = [
  { col: -1, row: -1 },
  { col: 1, row: -1 },
  { col: -1, row: 1 },
  { col: 1, row: 1 },
]

const ELEPHANT_DIRECTIONS = [
  { col: -2, row: -2 },
  { col: 2, row: -2 },
  { col: -2, row: 2 },
  { col: 2, row: 2 },
]

export function isSquareAttacked(board: Board, target: Coord, byColor: Color): boolean {
  // Chariots, cannons and an adjacent general all travel along ranks and files:
  // the first piece on a ray can be a chariot or a stepping general, and the
  // first piece *behind* that screen can be a cannon.
  for (const dir of ORTHOGONAL_DIRECTIONS) {
    let col = target.col + dir.col
    let row = target.row + dir.row
    let steps = 1
    let screen: boolean = false

    while (inBounds({ col, row })) {
      const piece = board[coordToIndex({ col, row })]
      if (piece) {
        if (piece.color === byColor) {
          if (!screen) {
            if (piece.type === 'chariot') return true
            if (piece.type === 'general' && steps === 1 && isPalace(target, byColor)) return true
          } else if (piece.type === 'cannon') {
            return true
          }
        }
        if (screen) break
        screen = true
      }
      col += dir.col
      row += dir.row
      steps += 1
    }
  }

  // A horse reaches `target` from `target - delta`, blocked by its own leg.
  for (const { d, leg } of HORSE_MOVES) {
    const from = { col: target.col - d.col, row: target.row - d.row }
    if (!inBounds(from)) continue
    const piece = board[coordToIndex(from)]
    if (!piece || piece.color !== byColor || piece.type !== 'horse') continue
    const legCoord = { col: from.col + leg.col, row: from.row + leg.row }
    if (!board[coordToIndex(legCoord)]) return true
  }

  // Soldiers step forward always, and sideways once they have crossed the river.
  const forward = byColor === 'black' ? 1 : -1
  const soldierOrigins: Coord[] = [
    { col: target.col, row: target.row - forward },
    { col: target.col - 1, row: target.row },
    { col: target.col + 1, row: target.row },
  ]
  for (let i = 0; i < soldierOrigins.length; i++) {
    const from = soldierOrigins[i]
    if (!inBounds(from)) continue
    const piece = board[coordToIndex(from)]
    if (!piece || piece.color !== byColor || piece.type !== 'soldier') continue
    if (i === 0) return true
    if (hasCrossedRiver(from, byColor)) return true
  }

  // Advisors and elephants can never reach the enemy general, but this stays a
  // general-purpose "is this square attacked" check, so cover them too.
  if (isPalace(target, byColor)) {
    for (const dir of DIAGONAL_DIRECTIONS) {
      const from = { col: target.col + dir.col, row: target.row + dir.row }
      if (!isPalace(from, byColor)) continue
      const piece = board[coordToIndex(from)]
      if (piece && piece.color === byColor && piece.type === 'advisor') return true
    }
  }

  if (!hasCrossedRiver(target, byColor)) {
    for (const dir of ELEPHANT_DIRECTIONS) {
      const from = { col: target.col + dir.col, row: target.row + dir.row }
      if (!inBounds(from)) continue
      const piece = board[coordToIndex(from)]
      if (!piece || piece.color !== byColor || piece.type !== 'elephant') continue
      const eye = { col: (target.col + from.col) / 2, row: (target.row + from.row) / 2 }
      if (!board[coordToIndex(eye)]) return true
    }
  }

  return false
}
