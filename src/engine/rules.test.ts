import { describe, expect, it } from 'vitest'
import { parseFen } from './board'
import { pseudoLegalMoves } from './pieces'
import { generalsFacing, getGameStatus, isInCheck, legalMovesFrom } from './rules'

describe('rules', () => {
  it('detects check from a chariot with a clear line to the general', () => {
    const board = parseFen('4k4/9/9/9/9/4R4/9/9/9/9')
    expect(isInCheck(board, 'black')).toBe(true)
  })

  it('generalsFacing is true when the two generals share an open file', () => {
    const board = parseFen('4k4/9/9/9/9/9/9/9/9/4K4')
    expect(generalsFacing(board)).toBe(true)
  })

  it('generalsFacing is false when a piece stands between the generals', () => {
    const board = parseFen('4k4/9/9/9/4A4/9/9/9/9/4K4')
    expect(generalsFacing(board)).toBe(false)
  })

  it('rejects a move that would remove the only piece screening the two generals', () => {
    // A horse sitting between the generals on file 4 can never stay on that file when it
    // moves (horse moves always change column), so every one of its moves would expose
    // the generals face to face and must be filtered out as illegal.
    const board = parseFen('4k4/9/9/9/4N4/9/9/9/9/4K4')
    const pseudo = pseudoLegalMoves(board, { col: 4, row: 4 })
    expect(pseudo.length).toBeGreaterThan(0)
    const legal = legalMovesFrom(board, { col: 4, row: 4 })
    expect(legal).toHaveLength(0)
  })

  it('a move must resolve an existing check, not just avoid creating a new one', () => {
    // Black chariot already checks the red general along the open file. Moving the
    // unrelated red soldier does nothing to address that check, so it must be illegal.
    const board = parseFen('4r4/9/9/9/9/9/P8/9/9/4K4')
    const moves = legalMovesFrom(board, { col: 0, row: 6 })
    expect(moves).toHaveLength(0)
  })

  it('detects checkmate when the general is boxed into a palace corner', () => {
    // Black general in the corner of its palace. One red chariot checks it directly
    // along file 3; a second red chariot on rank 0 covers the only other escape square.
    const board = parseFen('3k4C/9/9/9/9/3R5/9/9/9/4K4')
    expect(getGameStatus(board, 'black')).toBe('checkmate')
  })

  it('detects a no-legal-moves loss when the general is not in check but has no safe move', () => {
    // Black general has no attacker on its current square, but both red horses cover
    // every one of its three flight squares, and it has no other piece to move.
    const board = parseFen('4k4/9/2N3N2/9/9/9/9/9/9/4K4')
    expect(getGameStatus(board, 'black')).toBe('no-moves-loss')
  })
})
