import type { Piece as PieceModel } from '../engine/board'

const LABELS: Record<PieceModel['type'], { red: string; black: string }> = {
  general: { red: '帥', black: '將' },
  advisor: { red: '仕', black: '士' },
  elephant: { red: '相', black: '象' },
  horse: { red: '傌', black: '馬' },
  chariot: { red: '俥', black: '車' },
  cannon: { red: '炮', black: '砲' },
  soldier: { red: '兵', black: '卒' },
}

interface PieceProps {
  piece: PieceModel
  x: number
  y: number
  selected: boolean
  /** True when this piece is a legal capture for the currently selected piece. */
  capturable: boolean
  onClick: () => void
}

export function Piece({ piece, x, y, selected, capturable, onClick }: PieceProps) {
  const label = LABELS[piece.type][piece.color]
  const ink = piece.color === 'red' ? '#b3261e' : '#1f2937'
  const rim = selected ? '#059669' : capturable ? '#dc2626' : ink

  return (
    <g onClick={onClick} className="cursor-pointer">
      <circle cx={x + 1} cy={y + 2} r={24} fill="rgba(80, 50, 20, 0.25)" />
      <circle cx={x} cy={y} r={24} fill="#fdf6e3" stroke={rim} strokeWidth={selected || capturable ? 3 : 1.5} />
      <circle cx={x} cy={y} r={19.5} fill="none" stroke={rim} strokeWidth={selected || capturable ? 1.6 : 1} />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={ink}
        fontSize={25}
        fontWeight={700}
        fontFamily="'PingFang SC', 'Noto Sans CJK SC', 'Songti SC', 'SimSun', serif"
        className="select-none"
      >
        {label}
      </text>
    </g>
  )
}
