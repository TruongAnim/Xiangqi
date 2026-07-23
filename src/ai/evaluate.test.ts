import { describe, expect, it } from 'vitest'
import { parseFen, START_POSITION_FEN } from '../engine/board'
import { evaluateBoard } from './evaluate'

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
})
