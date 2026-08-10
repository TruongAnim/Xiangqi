import { describe, expect, it } from 'vitest'
import { parseFen, START_POSITION_FEN } from '../engine/board'
import { PIECE_VALUES, evaluateBoard, evaluatePiece } from './evaluate'

describe('evaluateBoard', () => {
  it('scores the start position equally for both sides', () => {
    const board = parseFen(START_POSITION_FEN)
    expect(evaluateBoard(board, 'red')).toBe(evaluateBoard(board, 'black'))
  })

  it('scores a material advantage as positive for the side ahead', () => {
    const board = parseFen('4k4/9/9/9/9/9/9/9/9/3RK4')
    expect(evaluateBoard(board, 'red')).toBeGreaterThan(evaluateBoard(board, 'black'))
  })

  it('gives a soldier a bonus for having crossed the river', () => {
    const beforeCrossing = parseFen('4k4/9/9/9/9/9/P8/9/9/4K4')
    const afterCrossing = parseFen('4k4/9/9/9/P8/9/9/9/9/4K4')
    expect(evaluateBoard(afterCrossing, 'red')).toBeGreaterThan(evaluateBoard(beforeCrossing, 'red'))
  })

  it('rewards a soldier for each rank past the river', () => {
    const justCrossed = parseFen('4k4/9/9/9/P8/9/9/9/9/4K4')
    const deepInside = parseFen('4k4/P8/9/9/9/9/9/9/9/4K4')
    expect(evaluateBoard(deepInside, 'red')).toBeGreaterThan(evaluateBoard(justCrossed, 'red'))
  })

  it('is symmetric: mirroring the position flips the sign', () => {
    const board = parseFen('4k4/9/9/4c4/9/9/4C4/9/9/4K4')
    expect(evaluateBoard(board, 'red') + evaluateBoard(board, 'black')).toBe(0)
  })

  it('reads the piece-square table mirrored for black', () => {
    const redHorseAdvanced = evaluatePiece('horse', 'red', { col: 4, row: 4 })
    const blackHorseAdvanced = evaluatePiece('horse', 'black', { col: 4, row: 5 })
    expect(redHorseAdvanced).toBe(blackHorseAdvanced)
  })

  it('penalises an advisor dragged out of the palace', () => {
    const home = evaluatePiece('advisor', 'red', { col: 4, row: 8 })
    const stranded = evaluatePiece('advisor', 'red', { col: 0, row: 4 })
    expect(home).toBe(PIECE_VALUES.advisor)
    expect(stranded).toBeLessThan(home)
  })

  it('keeps positional bonuses well below the value of a soldier', () => {
    const board = parseFen(START_POSITION_FEN)
    // Every table value is small enough that no positional swing can pay for material.
    expect(Math.abs(evaluateBoard(board, 'red'))).toBeLessThan(PIECE_VALUES.soldier)
  })
})
