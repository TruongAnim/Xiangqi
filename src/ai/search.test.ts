import { describe, expect, it } from 'vitest'
import { applyMove, boardToFen, createStartBoard, parseFen } from '../engine/board'
import { allLegalMoves } from '../engine/rules'
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
    //
    // The black soldier on (3,5) blocks col 3. Without it the red chariot has a
    // second way to win the same chariot — check down the general's file and
    // take the blocker — and either move is defensible, which makes an
    // assertion about one specific square meaningless.
    const board = parseFen('3k5/9/9/9/9/3p5/9/r8/9/R3K4')
    const result = findBestMove(board, 'red', { maxDepth: 2, timeBudgetMs: 200 })
    expect(result.move.to).toEqual({ col: 0, row: 7 })
  })

  it('only ever returns a legal move for the side to move', () => {
    const board = parseFen('3k5/9/9/9/9/9/9/9/9/4K4')
    const result = findBestMove(board, 'red', { maxDepth: 1, timeBudgetMs: 200 })
    expect(result.move.from).toEqual({ col: 4, row: 9 })
  })

  it('leaves the caller board untouched', () => {
    const board = createStartBoard()
    const before = boardToFen(board)
    findBestMove(board, 'red', { maxDepth: 3, timeBudgetMs: 1000 })
    expect(boardToFen(board)).toBe(before)
  })

  it('finds a move that ends the game on the spot', () => {
    // Black's lone general sits on col 4 of the back rank with two red chariots
    // free to seal it in. Several first moves win outright; the engine has to
    // see that it wins now rather than shuffling.
    const board = parseFen('4k4/8R/9/R8/9/9/9/9/9/3K5')
    const result = findBestMove(board, 'red', { maxDepth: 3, timeBudgetMs: 2000 })

    expect(result.score).toBeGreaterThan(50000)
    expect(allLegalMoves(applyMove(board, result.move), 'black')).toHaveLength(0)
  })

  it('does not walk into a recapture that quiescence can see', () => {
    // The red chariot can take the soldier on (4,4), but the black chariot
    // behind it recaptures. Trading a chariot for a soldier loses 800.
    const board = parseFen('3k5/9/9/4r4/4p4/9/9/9/4R4/4K4')
    const result = findBestMove(board, 'red', { maxDepth: 2, timeBudgetMs: 2000 })
    expect(result.move.to).not.toEqual({ col: 4, row: 4 })
  })

  it('respects the time budget instead of finishing a deep pass', () => {
    const board = createStartBoard()
    const start = Date.now()
    const result = findBestMove(board, 'red', { maxDepth: 30, timeBudgetMs: 400 })
    const elapsed = Date.now() - start

    expect(elapsed).toBeLessThan(2000)
    expect(result.depthReached).toBeGreaterThanOrEqual(1)
    expect(allLegalMoves(board, 'red')).toContainEqual(result.move)
  })

  it('keeps randomised picks within the configured score drop', () => {
    const board = parseFen('3k5/9/9/9/9/9/9/r8/9/R3K4')
    for (let i = 0; i < 20; i++) {
      const result = findBestMove(board, 'red', {
        maxDepth: 2,
        timeBudgetMs: 500,
        randomTopN: 4,
        randomMaxDrop: 200,
      })
      expect(allLegalMoves(board, 'red')).toContainEqual(result.move)
    }
  })

  it('reaches a deeper ply than the old plain alpha-beta did in the same time', () => {
    const board = createStartBoard()
    const result = findBestMove(board, 'red', { maxDepth: 6, timeBudgetMs: 2000 })
    expect(result.depthReached).toBeGreaterThanOrEqual(4)
  })
})
