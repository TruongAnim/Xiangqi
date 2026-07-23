import { useGame } from '../state/GameProvider'

export function Controls() {
  const { dispatch } = useGame()

  return (
    <div className="flex gap-2">
      <button className="px-3 py-2 rounded-md bg-neutral-800 text-white" onClick={() => dispatch({ type: 'UNDO' })}>
        Undo
      </button>
      <button className="px-3 py-2 rounded-md bg-neutral-800 text-white" onClick={() => dispatch({ type: 'FLIP_BOARD' })}>
        Flip Board
      </button>
      <button className="px-3 py-2 rounded-md bg-red-700 text-white" onClick={() => dispatch({ type: 'NEW_GAME' })}>
        New Game
      </button>
    </div>
  )
}
