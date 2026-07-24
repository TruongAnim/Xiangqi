import { GameProvider, useGame } from './state/GameProvider'
import { GameSetup } from './components/GameSetup'
import { Board } from './components/Board'
import { Clock } from './components/Clock'
import { MoveHistory } from './components/MoveHistory'
import { Controls } from './components/Controls'
import { StatusBanner } from './components/StatusBanner'

function GameScreen() {
  const { state } = useGame()

  if (state.mode === 'setup') {
    return <GameSetup />
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <StatusBanner />
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex flex-col items-center gap-4">
          <Clock />
          <Board />
          <Controls />
        </div>
        <div className="lg:w-72">
          <MoveHistory />
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <GameProvider>
      <div className="min-h-screen bg-neutral-100">
        <GameScreen />
      </div>
    </GameProvider>
  )
}

export default App
