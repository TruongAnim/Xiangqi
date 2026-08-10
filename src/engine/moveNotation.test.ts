import { describe, expect, it } from 'vitest'
import { createStartBoard, parseFen } from './board'
import { moveToNotation } from './moveNotation'

describe('moveToNotation', () => {
  it('names the classic central cannon opening', () => {
    // Red cannon starts on (7,7), which is red's file 2, and traverses to the
    // centre file 5.
    const board = createStartBoard()
    const notation = moveToNotation(board, { from: { col: 7, row: 7 }, to: { col: 4, row: 7 } })
    expect(notation.vi).toBe('Pháo 2 bình 5')
    expect(notation.en).toBe('C2.5')
  })

  it('numbers files from each side of the board', () => {
    const board = createStartBoard()
    // Black's cannon on (7,2) is on black's file 8, mirroring red's file 2.
    const notation = moveToNotation(board, { from: { col: 7, row: 2 }, to: { col: 4, row: 2 } })
    expect(notation.vi).toBe('Pháo 8 bình 5')
    expect(notation.en).toBe('C8.5')
  })

  it('counts ranks for a straight advance and retreat', () => {
    const board = parseFen('3k5/9/9/9/9/9/9/9/4R4/4K4')
    const advance = moveToNotation(board, { from: { col: 4, row: 8 }, to: { col: 4, row: 3 } })
    expect(advance.vi).toBe('Xe 5 tiến 5')
    expect(advance.en).toBe('R5+5')

    const retreat = moveToNotation(board, { from: { col: 4, row: 8 }, to: { col: 4, row: 9 } })
    expect(retreat.vi).toBe('Xe 5 thoái 1')
    expect(retreat.en).toBe('R5-1')
  })

  it('reverses forward and backward for black', () => {
    const board = parseFen('3k5/9/4r4/9/9/9/9/9/9/4K4')
    const advance = moveToNotation(board, { from: { col: 4, row: 2 }, to: { col: 4, row: 6 } })
    expect(advance.vi).toBe('Xe 5 tiến 4')
    expect(advance.en).toBe('R5+4')
  })

  it('names the destination file for a horse instead of a distance', () => {
    const board = parseFen('3k5/9/9/9/9/9/9/9/9/1N2K4')
    const notation = moveToNotation(board, { from: { col: 1, row: 9 }, to: { col: 2, row: 7 } })
    expect(notation.vi).toBe('Mã 8 tiến 7')
    expect(notation.en).toBe('H8+7')
  })

  it('distinguishes two chariots on the same file as front and rear', () => {
    const board = parseFen('3k5/9/9/9/9/9/4R4/9/4R4/4K4')
    const front = moveToNotation(board, { from: { col: 4, row: 6 }, to: { col: 4, row: 5 } })
    expect(front.vi).toBe('Tiền xe tiến 1')
    expect(front.en).toBe('+R+1')

    const rear = moveToNotation(board, { from: { col: 4, row: 8 }, to: { col: 4, row: 7 } })
    expect(rear.vi).toBe('Hậu xe tiến 1')
    expect(rear.en).toBe('-R+1')
  })

  it('reads front and rear from black perspective too', () => {
    const board = parseFen('3k5/9/4r4/9/4r4/9/9/9/9/4K4')
    // For black the front chariot is the one further down the board.
    const front = moveToNotation(board, { from: { col: 4, row: 4 }, to: { col: 4, row: 5 } })
    expect(front.vi).toBe('Tiền xe tiến 1')
    expect(front.en).toBe('+R+1')
  })

  it('labels three stacked soldiers front, middle and rear', () => {
    const board = parseFen('3k5/9/9/9/9/4P4/4P4/4P4/9/4K4')
    expect(moveToNotation(board, { from: { col: 4, row: 5 }, to: { col: 4, row: 4 } }).vi).toBe(
      'Tiền tốt tiến 1',
    )
    expect(moveToNotation(board, { from: { col: 4, row: 6 }, to: { col: 4, row: 5 } }).vi).toBe(
      'Trung tốt tiến 1',
    )
    expect(moveToNotation(board, { from: { col: 4, row: 7 }, to: { col: 4, row: 6 } }).vi).toBe(
      'Hậu tốt tiến 1',
    )
    expect(moveToNotation(board, { from: { col: 4, row: 5 }, to: { col: 4, row: 4 } }).en).toBe('1P+1')
  })

  it('returns empty strings when the origin square is empty', () => {
    const board = createStartBoard()
    expect(moveToNotation(board, { from: { col: 4, row: 4 }, to: { col: 4, row: 3 } })).toEqual({
      vi: '',
      en: '',
    })
  })
})
