import { Board, Color, Move, coordToIndex } from '../engine/board'
import { allLegalMoves, isInCheck } from '../engine/rules'
import { PIECE_VALUES, evaluateBoard } from './evaluate'

const MATE_SCORE = 100000

/** Depth of the capture-only search that runs past the nominal horizon. */
const QUIESCENCE_PLIES = 6

/** Nodes between wall-clock checks; deep enough to keep Date.now() off the hot path. */
const TIME_CHECK_INTERVAL = 2047

/** Beyond this ply, in-check extensions stop so perpetual checks cannot recurse forever. */
const MAX_EXTENSION_PLY = 40

/** Comfortably above the deepest ply extensions and quiescence can reach. */
const MAX_PLY = 128

const BOARD_SIZE = 90

class SearchAborted extends Error {
  constructor() {
    super('search aborted')
    this.name = 'SearchAborted'
  }
}

interface SearchContext {
  deadline: number
  nodes: number
  /** Two quiet moves per ply that most recently caused a beta cutoff. */
  killers: Int32Array
  /** Quiet moves indexed by from/to, scored by how often they caused a cutoff. */
  history: Int32Array
}

function createContext(deadline: number): SearchContext {
  return {
    deadline,
    nodes: 0,
    killers: new Int32Array(2 * MAX_PLY).fill(-1),
    history: new Int32Array(BOARD_SIZE * BOARD_SIZE),
  }
}

function moveKey(move: Move): number {
  return coordToIndex(move.from) * BOARD_SIZE + coordToIndex(move.to)
}

function opponent(color: Color): Color {
  return color === 'red' ? 'black' : 'red'
}

function checkTime(context: SearchContext): void {
  context.nodes += 1
  if ((context.nodes & TIME_CHECK_INTERVAL) === 0 && Date.now() >= context.deadline) {
    throw new SearchAborted()
  }
}

/**
 * Order moves so alpha-beta meets its best candidate first: the previous
 * iteration's best move, then captures by most-valuable-victim/least-valuable
 * -attacker, then the killer moves for this ply, then the history heuristic.
 */
function orderMoves(
  board: Board,
  moves: Move[],
  context: SearchContext,
  ply: number,
  preferredKey: number,
): Move[] {
  const slot = ply < MAX_PLY ? ply * 2 : -1
  const killerA = slot >= 0 ? context.killers[slot] : -1
  const killerB = slot >= 0 ? context.killers[slot + 1] : -1

  const scored = moves.map((move) => {
    const key = moveKey(move)
    let score: number

    if (key === preferredKey) {
      score = 1_000_000_000
    } else {
      const victim = board[coordToIndex(move.to)]
      if (victim) {
        const attacker = board[coordToIndex(move.from)]
        score = 10_000_000 + PIECE_VALUES[victim.type] * 16 - (attacker ? PIECE_VALUES[attacker.type] : 0)
      } else if (key === killerA) {
        score = 9_000_000
      } else if (key === killerB) {
        score = 8_000_000
      } else {
        score = context.history[key]
      }
    }

    return { move, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.map((entry) => entry.move)
}

function recordCutoff(board: Board, move: Move, context: SearchContext, ply: number, depth: number): void {
  if (board[coordToIndex(move.to)]) return // captures are ordered by MVV-LVA already

  const key = moveKey(move)
  if (ply < MAX_PLY) {
    const slot = ply * 2
    if (context.killers[slot] !== key) {
      context.killers[slot + 1] = context.killers[slot]
      context.killers[slot] = key
    }
  }
  context.history[key] += depth * depth
}

/** Plays `move` on `board`, returning the captured piece so it can be taken back. */
function makeMove(board: Board, move: Move) {
  const fromIndex = coordToIndex(move.from)
  const toIndex = coordToIndex(move.to)
  const captured = board[toIndex]
  board[toIndex] = board[fromIndex]
  board[fromIndex] = null
  return { fromIndex, toIndex, captured }
}

function unmakeMove(board: Board, made: ReturnType<typeof makeMove>): void {
  board[made.fromIndex] = board[made.toIndex]
  board[made.toIndex] = made.captured
}

/**
 * Search on past the nominal depth while captures are still available, so the
 * engine is not fooled by a position whose last move hangs a piece. When the
 * side to move is in check, every evasion is searched instead — standing pat
 * there would assume a safety the position does not have.
 */
function quiescence(
  board: Board,
  color: Color,
  alpha: number,
  beta: number,
  ply: number,
  remaining: number,
  context: SearchContext,
): number {
  checkTime(context)

  const inCheck = isInCheck(board, color)
  let best = -Infinity

  if (!inCheck) {
    const standPat = evaluateBoard(board, color)
    if (standPat >= beta) return standPat
    if (standPat > alpha) alpha = standPat
    if (remaining <= 0) return standPat
    best = standPat
  }

  const moves = allLegalMoves(board, color)
  if (moves.length === 0) return -MATE_SCORE + ply

  const candidates = inCheck ? moves : moves.filter((move) => board[coordToIndex(move.to)] !== null)
  if (candidates.length === 0) return best

  for (const move of orderMoves(board, candidates, context, ply, -1)) {
    const made = makeMove(board, move)
    const score = -quiescence(board, opponent(color), -beta, -alpha, ply + 1, remaining - 1, context)
    unmakeMove(board, made)

    if (score > best) best = score
    if (score > alpha) alpha = score
    if (alpha >= beta) break
  }

  return best
}

function negamax(
  board: Board,
  color: Color,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  context: SearchContext,
): number {
  checkTime(context)

  const inCheck = isInCheck(board, color)
  if (inCheck && ply < MAX_EXTENSION_PLY) depth += 1

  if (depth <= 0) {
    return quiescence(board, color, alpha, beta, ply, QUIESCENCE_PLIES, context)
  }

  const moves = allLegalMoves(board, color)
  // Xiangqi has no stalemate draw: a side with no legal move loses.
  if (moves.length === 0) return -MATE_SCORE + ply

  let best = -Infinity

  for (const move of orderMoves(board, moves, context, ply, -1)) {
    const made = makeMove(board, move)
    const score = -negamax(board, opponent(color), depth - 1, -beta, -alpha, ply + 1, context)
    unmakeMove(board, made)

    if (score > best) best = score
    if (score > alpha) alpha = score
    if (alpha >= beta) {
      recordCutoff(board, move, context, ply, depth)
      break
    }
  }

  return best
}

export interface SearchOptions {
  maxDepth: number
  timeBudgetMs: number
  /** Pick at random among this many of the best root moves instead of always the best. */
  randomTopN?: number
  /** ...but never one this many centipawns worse than the best, so it stays sane. */
  randomMaxDrop?: number
}

export interface SearchResult {
  move: Move
  score: number
  depthReached: number
  nodes: number
}

interface ScoredMove {
  move: Move
  score: number
}

function pickRandomised(scored: ScoredMove[], options: SearchOptions): ScoredMove {
  const topN = options.randomTopN ?? 1
  if (topN <= 1) return scored[0]

  const maxDrop = options.randomMaxDrop ?? Infinity
  const pool = scored
    .slice(0, Math.min(topN, scored.length))
    .filter((entry) => scored[0].score - entry.score <= maxDrop)

  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * Iterative deepening. Each pass reorders the root on the previous pass's
 * scores, which is what makes alpha-beta pay off, and the time budget is a hard
 * deadline: a pass that runs out is thrown away and the last completed pass is
 * played.
 */
export function findBestMove(board: Board, color: Color, options: SearchOptions): SearchResult {
  const rootMoves = allLegalMoves(board, color)
  if (rootMoves.length === 0) throw new Error('No legal moves available')

  const context = createContext(Date.now() + options.timeBudgetMs)
  const working = board.slice()

  let scored: ScoredMove[] = rootMoves.map((move) => ({ move, score: 0 }))
  let completed: ScoredMove[] | null = null
  let depthReached = 0

  // Narrowing the root window makes moves that fail low report a bound rather
  // than a real score, which is fine when only the best move is played but not
  // when the difficulty setting picks among the runners-up.
  const needExactRootScores = (options.randomTopN ?? 1) > 1

  for (let depth = 1; depth <= options.maxDepth; depth++) {
    const pass: ScoredMove[] = []
    let alpha = -Infinity

    try {
      for (const { move } of scored) {
        const made = makeMove(working, move)
        const beta = needExactRootScores ? Infinity : -alpha
        const score = -negamax(working, opponent(color), depth - 1, -Infinity, beta, 1, context)
        unmakeMove(working, made)

        pass.push({ move, score })
        if (score > alpha) alpha = score
      }
    } catch (error) {
      if (error instanceof SearchAborted) break
      throw error
    }

    pass.sort((a, b) => b.score - a.score)
    scored = pass
    completed = pass
    depthReached = depth

    // A forced mate is not going to improve with more depth.
    if (Math.abs(pass[0].score) >= MATE_SCORE - MAX_EXTENSION_PLY) break
    if (Date.now() >= context.deadline) break
  }

  const finalScores = completed ?? scored
  const chosen = pickRandomised(finalScores, options)

  return {
    move: chosen.move,
    score: chosen.score,
    depthReached,
    nodes: context.nodes,
  }
}
