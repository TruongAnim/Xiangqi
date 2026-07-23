import { useGame } from '../state/GameProvider'
import { Piece } from './Piece'
import { Square } from './Square'
import { coordToIndex, type Coord } from '../engine/board'
import { playSound } from '../sound/sound'

const CELL = 60
const MARGIN = 40
const COLS = 9
const ROWS = 10

function boardX(col: number, flipped: boolean): number {
  return MARGIN + (flipped ? COLS - 1 - col : col) * CELL
}

function boardY(row: number, flipped: boolean): number {
  return MARGIN + (flipped ? ROWS - 1 - row : row) * CELL
}

export function Board() {
  const { state, dispatch } = useGame()
  const { board, selected, legalTargets, flipped, history } = state

  const width = MARGIN * 2 + (COLS - 1) * CELL
  const height = MARGIN * 2 + (ROWS - 1) * CELL
  const lastMove = history[history.length - 1]?.move

  function handleSquareClick(coord: Coord) {
    const isMove =
      selected !== null && legalTargets.some((t) => t.col === coord.col && t.row === coord.row)
    if (isMove) {
      const captured = board[coordToIndex(coord)]
      playSound(captured ? 'capture' : 'move')
    }
    dispatch({ type: 'SELECT_SQUARE', coord })
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="max-w-full h-auto bg-amber-100 rounded-lg shadow-md"
      role="img"
      aria-label="Xiangqi board"
    >
      {Array.from({ length: ROWS }, (_, row) => (
        <line
          key={`h-${row}`}
          x1={boardX(0, flipped)}
          y1={boardY(row, flipped)}
          x2={boardX(COLS - 1, flipped)}
          y2={boardY(row, flipped)}
          stroke="#78350f"
          strokeWidth={1}
        />
      ))}

      {Array.from({ length: COLS }, (_, col) => (
        <g key={`v-${col}`}>
          <line
            x1={boardX(col, flipped)}
            y1={boardY(0, flipped)}
            x2={boardX(col, flipped)}
            y2={boardY(4, flipped)}
            stroke="#78350f"
            strokeWidth={1}
          />
          <line
            x1={boardX(col, flipped)}
            y1={boardY(5, flipped)}
            x2={boardX(col, flipped)}
            y2={boardY(9, flipped)}
            stroke="#78350f"
            strokeWidth={1}
          />
        </g>
      ))}

      <line x1={boardX(3, flipped)} y1={boardY(0, flipped)} x2={boardX(5, flipped)} y2={boardY(2, flipped)} stroke="#78350f" />
      <line x1={boardX(5, flipped)} y1={boardY(0, flipped)} x2={boardX(3, flipped)} y2={boardY(2, flipped)} stroke="#78350f" />
      <line x1={boardX(3, flipped)} y1={boardY(7, flipped)} x2={boardX(5, flipped)} y2={boardY(9, flipped)} stroke="#78350f" />
      <line x1={boardX(5, flipped)} y1={boardY(7, flipped)} x2={boardX(3, flipped)} y2={boardY(9, flipped)} stroke="#78350f" />

      <text
        x={width / 2}
        y={(boardY(4, flipped) + boardY(5, flipped)) / 2 + 6}
        textAnchor="middle"
        className="fill-amber-800 text-lg tracking-[1em]"
      >
        楚河　　汉界
      </text>

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
        return (
          <Piece
            key={index}
            piece={piece}
            x={boardX(col, flipped)}
            y={boardY(row, flipped)}
            selected={selected?.col === col && selected?.row === row}
            onClick={() => handleSquareClick({ col, row })}
          />
        )
      })}

      {legalTargets.map((target) => (
        <circle
          key={`target-${target.col}-${target.row}`}
          cx={boardX(target.col, flipped)}
          cy={boardY(target.row, flipped)}
          r={8}
          className="fill-emerald-500/70 cursor-pointer"
          onClick={() => handleSquareClick(target)}
        />
      ))}

      {lastMove && (
        <>
          <circle cx={boardX(lastMove.from.col, flipped)} cy={boardY(lastMove.from.row, flipped)} r={4} className="fill-sky-500" />
          <circle cx={boardX(lastMove.to.col, flipped)} cy={boardY(lastMove.to.row, flipped)} r={4} className="fill-sky-500" />
        </>
      )}
    </svg>
  )
}
