import { describe, expect, it } from 'vitest'
import { moveToNotation } from './moveNotation'

describe('moveToNotation', () => {
  it('formats a move as (col,row)->(col,row)', () => {
    const notation = moveToNotation({ from: { col: 1, row: 7 }, to: { col: 1, row: 4 } })
    expect(notation).toBe('(1,7)->(1,4)')
  })
})
