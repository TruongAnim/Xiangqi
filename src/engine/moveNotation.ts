import { Move } from './board'

export function moveToNotation(move: Move): string {
  return `(${move.from.col},${move.from.row})->(${move.to.col},${move.to.row})`
}
