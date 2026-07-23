interface SquareProps {
  x: number
  y: number
  size: number
  onClick: () => void
}

export function Square({ x, y, size, onClick }: SquareProps) {
  return (
    <rect
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      fill="transparent"
      onClick={onClick}
    />
  )
}
