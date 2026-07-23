import { useGame } from '../state/GameProvider'

export function MoveHistory() {
  const { state } = useGame()

  return (
    <div className="border rounded-md p-3 max-h-80 overflow-y-auto bg-white">
      <h2 className="font-semibold mb-2">Move History</h2>
      <ol className="space-y-1 text-sm font-mono">
        {state.history.map((entry, index) => (
          <li key={index}>
            {index % 2 === 0 ? `${index / 2 + 1}. ` : '    '}
            {entry.piece.color === 'red' ? 'R' : 'B'} {entry.notation}
            {entry.captured ? ' x' : ''}
          </li>
        ))}
      </ol>
    </div>
  )
}
