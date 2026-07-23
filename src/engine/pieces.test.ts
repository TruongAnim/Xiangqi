import { describe, expect, it } from 'vitest'
import { parseFen } from './board'
import { pseudoLegalMoves } from './pieces'

describe('pieces', () => {
  it('general moves one step orthogonally within the palace', () => {
    const board = parseFen('9/9/9/9/9/9/9/9/9/4K4')
    const moves = pseudoLegalMoves(board, { col: 4, row: 9 })
    expect(moves.map((m) => m.to)).toEqual(
      expect.arrayContaining([
        { col: 4, row: 8 },
        { col: 3, row: 9 },
        { col: 5, row: 9 },
      ]),
    )
    expect(moves).toHaveLength(3)
  })

  it('elephant cannot cross the river', () => {
    const board = parseFen('9/9/9/9/9/4B4/9/9/9/9')
    const moves = pseudoLegalMoves(board, { col: 4, row: 5 })
    expect(moves.some((m) => m.to.row < 5)).toBe(false)
  })

  it('elephant is blocked by an occupied elephant eye', () => {
    const board = parseFen('9/9/9/9/9/9/9/9/1P7/2B6')
    const moves = pseudoLegalMoves(board, { col: 2, row: 9 })
    expect(moves.some((m) => m.to.col === 0 && m.to.row === 7)).toBe(false)
  })

  it('horse is blocked by an occupied leg square', () => {
    const board = parseFen('9/9/9/9/9/9/9/9/4P4/4N4')
    const moves = pseudoLegalMoves(board, { col: 4, row: 9 })
    expect(moves.some((m) => m.to.row === 7)).toBe(false)
  })

  it('horse moves normally when the leg is clear', () => {
    const board = parseFen('9/9/9/9/9/9/9/9/9/4N4')
    const moves = pseudoLegalMoves(board, { col: 4, row: 9 })
    expect(moves.map((m) => m.to)).toEqual(
      expect.arrayContaining([
        { col: 3, row: 7 },
        { col: 5, row: 7 },
        { col: 2, row: 8 },
        { col: 6, row: 8 },
      ]),
    )
  })

  it('cannon must jump exactly one screen piece to capture', () => {
    const board = parseFen('r8/9/9/9/9/p8/9/9/9/C8')
    const moves = pseudoLegalMoves(board, { col: 0, row: 9 })
    expect(moves.some((m) => m.to.col === 0 && m.to.row === 0)).toBe(true)
  })

  it('cannon cannot capture without a screen piece', () => {
    const board = parseFen('r8/9/9/9/9/9/9/9/9/C8')
    const moves = pseudoLegalMoves(board, { col: 0, row: 9 })
    expect(moves.some((m) => m.to.col === 0 && m.to.row === 0)).toBe(false)
  })

  it('soldier moves forward only before crossing the river', () => {
    const board = parseFen('9/9/9/9/9/9/P8/9/9/9')
    const moves = pseudoLegalMoves(board, { col: 0, row: 6 })
    expect(moves).toEqual([{ from: { col: 0, row: 6 }, to: { col: 0, row: 5 } }])
  })

  it('soldier gains sideways moves after crossing the river', () => {
    const board = parseFen('9/9/9/9/1P7/9/9/9/9/9')
    const moves = pseudoLegalMoves(board, { col: 1, row: 4 })
    expect(moves.map((m) => m.to)).toEqual(
      expect.arrayContaining([
        { col: 1, row: 3 },
        { col: 0, row: 4 },
        { col: 2, row: 4 },
      ]),
    )
    expect(moves).toHaveLength(3)
  })
})
