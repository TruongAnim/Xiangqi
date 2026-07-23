import { describe, expect, it } from 'vitest'
import { parseFen } from '../engine/board'
import { findBestMove } from './search'

describe('findBestMove', () => {
  it('captures a hanging chariot when it is clearly the best move available', () => {
    // Note: the brief's original FEN ('4k4/.../R3K4') put both generals on the
    // open column 4 with nothing between them, which is an illegal "flying
    // generals" position under the already-committed generalsFacing rule
    // (see src/engine/rules.test.ts). That made every non-general move
    // illegal, including the intended chariot capture. Moving the black
    // general to col 3 here removes that incidental illegality while keeping
    // the intended scenario (and expected `.to`) unchanged.
    const board = parseFen('3k5/9/9/9/9/9/9/r8/9/R3K4')
    const result = findBestMove(board, 'red', { maxDepth: 2, timeBudgetMs: 200 })
    expect(result.move.to).toEqual({ col: 0, row: 7 })
  })

  it('only ever returns a legal move for the side to move', () => {
    const board = parseFen('3k5/9/9/9/9/9/9/9/9/4K4')
    const result = findBestMove(board, 'red', { maxDepth: 1, timeBudgetMs: 200 })
    expect(result.move.from).toEqual({ col: 4, row: 9 })
  })
})
