import { describe, expect, test } from 'vitest'
import {
  BOARD_COLS,
  BOARD_ROWS,
  Board,
  Color,
  Coord,
  PieceType,
  coordToIndex,
  createStartBoard,
  indexToCoord,
  parseFen,
} from './board'
import { allPseudoLegalMoves } from './pieces'
import { isSquareAttacked } from './attacks'
import { isInCheck } from './rules'

/**
 * Reference implementation: generate every pseudo-legal move and see whether one
 * lands on the target. Slower, but obviously correct, so `isSquareAttacked` is
 * checked against it over randomly generated positions.
 *
 * The two only agree on squares holding an enemy piece, which is the case that
 * matters for check detection. On empty squares they diverge by design: move
 * generation lets a screenless cannon slide onto an empty square, while
 * `isSquareAttacked` reports capture threats, and a screenless cannon threatens
 * nothing.
 */
function isSquareAttackedByMoveGen(board: Board, targetIndex: number, byColor: Color): boolean {
  return allPseudoLegalMoves(board, byColor).some((move) => coordToIndex(move.to) === targetIndex)
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

const PLACEABLE: PieceType[] = ['advisor', 'elephant', 'horse', 'chariot', 'cannon', 'soldier']

function randomPalaceSquare(random: () => number, color: Color): Coord {
  return {
    col: 3 + Math.floor(random() * 3),
    row: (color === 'red' ? 7 : 0) + Math.floor(random() * 3),
  }
}

/**
 * Generals and advisors are confined to their palace for the whole game, so the
 * generator keeps them there. Positions that put them outside are unreachable,
 * and move generation happens to be lenient about an attacker's own square,
 * which would make the comparison below fail on positions that cannot occur.
 */
function randomBoard(random: () => number): Board {
  const board: Board = new Array(BOARD_COLS * BOARD_ROWS).fill(null)
  board[coordToIndex(randomPalaceSquare(random, 'red'))] = { type: 'general', color: 'red' }
  board[coordToIndex(randomPalaceSquare(random, 'black'))] = { type: 'general', color: 'black' }

  const pieceCount = 6 + Math.floor(random() * 14)
  for (let i = 0; i < pieceCount; i++) {
    const type = PLACEABLE[Math.floor(random() * PLACEABLE.length)]
    const color: Color = random() < 0.5 ? 'red' : 'black'
    const index =
      type === 'advisor'
        ? coordToIndex(randomPalaceSquare(random, color))
        : Math.floor(random() * board.length)
    if (board[index]) continue
    board[index] = { type, color }
  }
  return board
}

describe('isSquareAttacked', () => {
  test('chariot attacks along an open file but not through a blocker', () => {
    const board = parseFen('4k4/9/9/9/9/9/9/9/4R4/4K4')
    expect(isSquareAttacked(board, { col: 4, row: 0 }, 'red')).toBe(true)

    const blocked = parseFen('4k4/4p4/9/9/9/9/9/9/4R4/4K4')
    expect(isSquareAttacked(blocked, { col: 4, row: 0 }, 'red')).toBe(false)
  })

  test('cannon needs exactly one screen', () => {
    const noScreen = parseFen('4k4/9/9/9/9/9/9/9/4C4/4K4')
    expect(isSquareAttacked(noScreen, { col: 4, row: 0 }, 'red')).toBe(false)

    const oneScreen = parseFen('4k4/4p4/9/9/9/9/9/9/4C4/4K4')
    expect(isSquareAttacked(oneScreen, { col: 4, row: 0 }, 'red')).toBe(true)

    const twoScreens = parseFen('4k4/4p4/4p4/9/9/9/9/9/4C4/4K4')
    expect(isSquareAttacked(twoScreens, { col: 4, row: 0 }, 'red')).toBe(false)
  })

  test('horse attack is stopped by a blocked leg', () => {
    const open = parseFen('4k4/9/3N5/9/9/9/9/9/9/4K4')
    expect(isSquareAttacked(open, { col: 4, row: 0 }, 'red')).toBe(true)

    const hobbled = parseFen('4k4/3p5/3N5/9/9/9/9/9/9/4K4')
    expect(isSquareAttacked(hobbled, { col: 4, row: 0 }, 'red')).toBe(false)
  })

  test('soldier attacks forward always and sideways only past the river', () => {
    const forward = parseFen('4k4/4P4/9/9/9/9/9/9/9/4K4')
    expect(isSquareAttacked(forward, { col: 4, row: 0 }, 'red')).toBe(true)

    const sidewaysPastRiver = parseFen('3Pk4/9/9/9/9/9/9/9/9/4K4')
    expect(isSquareAttacked(sidewaysPastRiver, { col: 4, row: 0 }, 'red')).toBe(true)

    const sidewaysOwnHalf = parseFen('4k4/9/9/9/9/9/9/9/9/3PK4')
    expect(isSquareAttacked(sidewaysOwnHalf, { col: 4, row: 9 }, 'red')).toBe(false)
  })

  test('a lone general attacks only adjacent palace squares', () => {
    const board = parseFen('4k4/9/9/9/9/9/9/9/9/4K4')
    expect(isSquareAttacked(board, { col: 4, row: 8 }, 'red')).toBe(true)
    expect(isSquareAttacked(board, { col: 4, row: 7 }, 'red')).toBe(false)
    expect(isSquareAttacked(board, { col: 4, row: 6 }, 'red')).toBe(false)
  })

  test('matches move generation on every occupied square of the starting position', () => {
    const board = createStartBoard()
    let compared = 0
    for (let index = 0; index < board.length; index++) {
      const occupant = board[index]
      if (!occupant) continue
      const attacker: Color = occupant.color === 'red' ? 'black' : 'red'
      expect(isSquareAttacked(board, indexToCoord(index), attacker)).toBe(
        isSquareAttackedByMoveGen(board, index, attacker),
      )
      compared += 1
    }
    expect(compared).toBe(32)
  })

  test('matches move generation across random positions', () => {
    const random = createRandom(20260810)
    let compared = 0
    for (let iteration = 0; iteration < 200; iteration++) {
      const board = randomBoard(random)
      for (let index = 0; index < board.length; index++) {
        const occupant = board[index]
        if (!occupant) continue
        const attacker: Color = occupant.color === 'red' ? 'black' : 'red'
        const expected = isSquareAttackedByMoveGen(board, index, attacker)
        expect(
          isSquareAttacked(board, indexToCoord(index), attacker),
          `iteration ${iteration}, index ${index}, attacked by ${attacker}`,
        ).toBe(expected)
        compared += 1
      }
    }
    expect(compared).toBeGreaterThan(2000)
  })
})

describe('isInCheck', () => {
  test('detects a chariot giving check down an open file', () => {
    expect(isInCheck(parseFen('4k4/9/9/9/9/9/9/9/4R4/4K4'), 'black')).toBe(true)
    expect(isInCheck(parseFen('4k4/4p4/9/9/9/9/9/9/4R4/4K4'), 'black')).toBe(false)
  })

  test('the starting position has neither general in check', () => {
    const board = createStartBoard()
    expect(isInCheck(board, 'red')).toBe(false)
    expect(isInCheck(board, 'black')).toBe(false)
  })
})
