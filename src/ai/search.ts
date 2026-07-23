import { Board, Color, Move, applyMove } from '../engine/board'
import { allLegalMoves, getGameStatus } from '../engine/rules'
import { evaluateBoard } from './evaluate'

function opponent(color: Color): Color {
  return color === 'red' ? 'black' : 'red'
}

function minimax(
  board: Board,
  color: Color,
  rootColor: Color,
  depth: number,
  alpha: number,
  beta: number,
): number {
  const status = getGameStatus(board, color)
  if (status === 'checkmate' || status === 'no-moves-loss') {
    return color === rootColor ? -100000 - depth : 100000 + depth
  }
  if (depth === 0) {
    return evaluateBoard(board, rootColor)
  }

  const moves = allLegalMoves(board, color)
  const next = opponent(color)

  if (color === rootColor) {
    let best = -Infinity
    for (const move of moves) {
      const score = minimax(applyMove(board, move), next, rootColor, depth - 1, alpha, beta)
      best = Math.max(best, score)
      alpha = Math.max(alpha, best)
      if (alpha >= beta) break
    }
    return best
  }

  let best = Infinity
  for (const move of moves) {
    const score = minimax(applyMove(board, move), next, rootColor, depth - 1, alpha, beta)
    best = Math.min(best, score)
    beta = Math.min(beta, best)
    if (alpha >= beta) break
  }
  return best
}

export interface SearchOptions {
  maxDepth: number
  timeBudgetMs: number
  randomizeTopN?: number
}

export interface SearchResult {
  move: Move
  depthReached: number
}

export function findBestMove(board: Board, color: Color, options: SearchOptions): SearchResult {
  const moves = allLegalMoves(board, color)
  if (moves.length === 0) throw new Error('No legal moves available')

  const deadline = Date.now() + options.timeBudgetMs
  let bestMove = moves[0]
  let depthReached = 0

  for (let depth = 1; depth <= options.maxDepth; depth++) {
    const scored = moves.map((move) => ({
      move,
      score: minimax(applyMove(board, move), opponent(color), color, depth - 1, -Infinity, Infinity),
    }))
    scored.sort((a, b) => b.score - a.score)

    bestMove = scored[0].move
    depthReached = depth

    if (options.randomizeTopN && options.randomizeTopN > 1) {
      const topCandidates = scored.slice(0, Math.min(options.randomizeTopN, scored.length))
      bestMove = topCandidates[Math.floor(Math.random() * topCandidates.length)].move
    }

    if (Date.now() >= deadline) break
  }

  return { move: bestMove, depthReached }
}
