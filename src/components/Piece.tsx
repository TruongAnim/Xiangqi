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
  onClick: () => void
}

export function Piece({ piece, x, y, selected, onClick }: PieceProps) {
  const label = LABELS[piece.type][piece.color]
  const strokeClass = piece.color === 'red' ? 'stroke-red-700' : 'stroke-neutral-900'
  const fillClass = piece.color === 'red' ? 'fill-red-700' : 'fill-neutral-900'

  return (
    <g onClick={onClick} className="cursor-pointer">
      <circle
        cx={x}
        cy={y}
        r={22}
        strokeWidth={2}
        className={`fill-amber-50 ${selected ? 'stroke-emerald-500' : strokeClass}`}
      />
      <text x={x} y={y + 7} textAnchor="middle" className={`text-xl font-bold select-none ${fillClass}`}>
        {label}
      </text>
    </g>
  )
}
