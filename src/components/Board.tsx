import { useGame } from '../state/gameContext'
import { findGeneral } from '../engine/rules'
import { Piece } from './Piece'
import { Square } from './Square'
import type { Coord } from '../engine/board'

const CELL = 60
const MARGIN = 44
const COLS = 9
const ROWS = 10

const LINE = '#8a5a2b'
const INK = '#7c4a1e'

/**
 * The board is taller than it is wide (524:556), so the width is capped in vh as
 * well as vw — otherwise a laptop-height window pushes the bottom rank, and the
 * player's own pieces, below the fold.
 */
const BOARD_CLASS =
  'h-auto w-full max-w-[min(92vw,67vh,34rem)] touch-manipulation select-none rounded-xl shadow-lg ring-1 ring-amber-900/20'

function boardX(col: number, flipped: boolean): number {
  return MARGIN + (flipped ? COLS - 1 - col : col) * CELL
}

function boardY(row: number, flipped: boolean): number {
  return MARGIN + (flipped ? ROWS - 1 - row : row) * CELL
}

/**
 * The little corner brackets traditionally printed where the cannons start and
 * where soldiers cross, drawn as four L shapes around a point. Columns at the
 * board edge only get the inward-facing half.
 */
function StationMark({ x, y, col }: { x: number; y: number; col: number }) {
  const gap = 5
  const arm = 11
  const sides = [
    { dx: -1, dy: -1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: 1 },
  ].filter(({ dx }) => (col !== 0 || dx > 0) && (col !== COLS - 1 || dx < 0))

  return (
    <g stroke={LINE} strokeWidth={1.6} fill="none" strokeLinecap="square">
      {sides.map(({ dx, dy }) => (
        <path
          key={`${dx}-${dy}`}
          d={`M ${x + dx * gap} ${y + dy * (gap + arm)} L ${x + dx * gap} ${y + dy * gap} L ${x + dx * (gap + arm)} ${y + dy * gap}`}
        />
      ))}
    </g>
  )
}

const STATION_POINTS: Coord[] = [
  { col: 1, row: 2 },
  { col: 7, row: 2 },
  { col: 1, row: 7 },
  { col: 7, row: 7 },
  { col: 0, row: 3 },
  { col: 2, row: 3 },
  { col: 4, row: 3 },
  { col: 6, row: 3 },
  { col: 8, row: 3 },
  { col: 0, row: 6 },
  { col: 2, row: 6 },
  { col: 4, row: 6 },
  { col: 6, row: 6 },
  { col: 8, row: 6 },
]

export function Board() {
  const { state, dispatch } = useGame()
  const { board, selected, legalTargets, flipped, history, turn, status } = state

  const width = MARGIN * 2 + (COLS - 1) * CELL
  const height = MARGIN * 2 + (ROWS - 1) * CELL
  const lastMove = history[history.length - 1]?.move

  const checkedGeneral =
    status === 'check' || status === 'checkmate' ? findGeneral(board, turn) : null

  function handleSquareClick(coord: Coord) {
    dispatch({ type: 'SELECT_SQUARE', coord })
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={BOARD_CLASS}
      role="img"
      aria-label="Xiangqi board"
    >
      <defs>
        <linearGradient id="board-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdf1d6" />
          <stop offset="100%" stopColor="#f2ddb4" />
        </linearGradient>
      </defs>

      <rect width={width} height={height} fill="url(#board-wood)" />
      <rect
        x={MARGIN - 12}
        y={MARGIN - 12}
        width={width - (MARGIN - 12) * 2}
        height={height - (MARGIN - 12) * 2}
        fill="none"
        stroke={LINE}
        strokeWidth={2.5}
      />

      {Array.from({ length: ROWS }, (_, row) => (
        <line
          key={`h-${row}`}
          x1={boardX(0, flipped)}
          y1={boardY(row, flipped)}
          x2={boardX(COLS - 1, flipped)}
          y2={boardY(row, flipped)}
          stroke={LINE}
          strokeWidth={1}
        />
      ))}

      {Array.from({ length: COLS }, (_, col) => {
        // The river breaks every file except the two at the edges.
        const isEdge = col === 0 || col === COLS - 1
        return isEdge ? (
          <line
            key={`v-${col}`}
            x1={boardX(col, flipped)}
            y1={boardY(0, flipped)}
            x2={boardX(col, flipped)}
            y2={boardY(ROWS - 1, flipped)}
            stroke={LINE}
            strokeWidth={1}
          />
        ) : (
          <g key={`v-${col}`}>
            <line
              x1={boardX(col, flipped)}
              y1={boardY(0, flipped)}
              x2={boardX(col, flipped)}
              y2={boardY(4, flipped)}
              stroke={LINE}
              strokeWidth={1}
            />
            <line
              x1={boardX(col, flipped)}
              y1={boardY(5, flipped)}
              x2={boardX(col, flipped)}
              y2={boardY(9, flipped)}
              stroke={LINE}
              strokeWidth={1}
            />
          </g>
        )
      })}

      <line x1={boardX(3, flipped)} y1={boardY(0, flipped)} x2={boardX(5, flipped)} y2={boardY(2, flipped)} stroke={LINE} />
      <line x1={boardX(5, flipped)} y1={boardY(0, flipped)} x2={boardX(3, flipped)} y2={boardY(2, flipped)} stroke={LINE} />
      <line x1={boardX(3, flipped)} y1={boardY(7, flipped)} x2={boardX(5, flipped)} y2={boardY(9, flipped)} stroke={LINE} />
      <line x1={boardX(5, flipped)} y1={boardY(7, flipped)} x2={boardX(3, flipped)} y2={boardY(9, flipped)} stroke={LINE} />

      {STATION_POINTS.map((point) => (
        <StationMark
          key={`station-${point.col}-${point.row}`}
          x={boardX(point.col, flipped)}
          y={boardY(point.row, flipped)}
          col={point.col}
        />
      ))}

      <text
        x={width / 2}
        y={(boardY(4, flipped) + boardY(5, flipped)) / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={INK}
        fontSize={26}
        letterSpacing={26}
        opacity={0.75}
      >
        楚河　汉界
      </text>

      {lastMove && (
        <g>
          <circle
            cx={boardX(lastMove.from.col, flipped)}
            cy={boardY(lastMove.from.row, flipped)}
            r={24}
            className="fill-sky-500/15 stroke-sky-600/50"
            strokeWidth={1.5}
          />
          <circle
            cx={boardX(lastMove.to.col, flipped)}
            cy={boardY(lastMove.to.row, flipped)}
            r={26}
            className="fill-sky-500/15 stroke-sky-600/60"
            strokeWidth={2}
          />
        </g>
      )}

      {checkedGeneral && (
        <circle
          cx={boardX(checkedGeneral.col, flipped)}
          cy={boardY(checkedGeneral.row, flipped)}
          r={27}
          className="fill-red-500/20 stroke-red-600"
          strokeWidth={2.5}
        />
      )}

      {board.map((piece, index) => {
        if (piece) return null
        const col = index % COLS
        const row = Math.floor(index / COLS)
        return (
          <Square
            key={`empty-${index}`}
            x={boardX(col, flipped)}
            y={boardY(row, flipped)}
            size={CELL}
            onClick={() => handleSquareClick({ col, row })}
          />
        )
      })}

      {board.map((piece, index) => {
        if (!piece) return null
        const col = index % COLS
        const row = Math.floor(index / COLS)
        const isTarget = legalTargets.some((target) => target.col === col && target.row === row)
        return (
          <Piece
            key={index}
            piece={piece}
            x={boardX(col, flipped)}
            y={boardY(row, flipped)}
            selected={selected?.col === col && selected?.row === row}
            capturable={isTarget}
            onClick={() => handleSquareClick({ col, row })}
          />
        )
      })}

      {legalTargets.map((target) => {
        if (board[target.row * COLS + target.col]) return null
        return (
          <circle
            key={`target-${target.col}-${target.row}`}
            cx={boardX(target.col, flipped)}
            cy={boardY(target.row, flipped)}
            r={9}
            className="fill-emerald-600/60 cursor-pointer"
            onClick={() => handleSquareClick(target)}
          />
        )
      })}
    </svg>
  )
}
