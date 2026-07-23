import { describe, expect, it } from 'vitest'
import {
  applyMove,
  boardToFen,
  coordToIndex,
  createStartBoard,
  indexToCoord,
  parseFen,
  START_POSITION_FEN,
} from './board'

describe('board', () => {
  it('parses the start position FEN into 32 pieces', () => {
    const board = createStartBoard()
    const pieceCount = board.filter((square) => square !== null).length
    expect(pieceCount).toBe(32)
  })

  it('round-trips the start position through boardToFen', () => {
    const board = createStartBoard()
    expect(boardToFen(board)).toBe(START_POSITION_FEN)
  })

  it('places the red general at (4,9) and black general at (4,0)', () => {
    const board = createStartBoard()
    expect(board[coordToIndex({ col: 4, row: 9 })]).toEqual({ type: 'general', color: 'red' })
    expect(board[coordToIndex({ col: 4, row: 0 })]).toEqual({ type: 'general', color: 'black' })
  })

  it('converts between coord and index consistently', () => {
    const coord = { col: 3, row: 7 }
    expect(indexToCoord(coordToIndex(coord))).toEqual(coord)
  })

  it('applyMove moves a piece and clears the origin square', () => {
    const board = createStartBoard()
    const from = { col: 0, row: 6 } // red soldier
    const to = { col: 0, row: 5 }
    const next = applyMove(board, { from, to })
    expect(next[coordToIndex(from)]).toBeNull()
    expect(next[coordToIndex(to)]).toEqual({ type: 'soldier', color: 'red' })
  })

  it('parseFen of an all-empty board produces no pieces', () => {
    const board = parseFen('9/9/9/9/9/9/9/9/9/9')
    expect(board.every((square) => square === null)).toBe(true)
  })
})
