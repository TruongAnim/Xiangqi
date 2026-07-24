import { useState } from 'react'
import { useGame } from '../state/GameProvider'
import type { Difficulty } from '../ai/difficulty'

const TIME_PRESETS: { label: string; ms: number | null }[] = [
  { label: '5 min', ms: 5 * 60 * 1000 },
  { label: '10 min', ms: 10 * 60 * 1000 },
  { label: '20 min', ms: 20 * 60 * 1000 },
  { label: 'No limit', ms: null },
]

export function GameSetup() {
  const { dispatch } = useGame()
  const [mode, setMode] = useState<'vs-ai' | 'local'>('vs-ai')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [clockMs, setClockMs] = useState<number | null>(10 * 60 * 1000)

  function startGame() {
    dispatch({ type: 'START_GAME', mode, difficulty: mode === 'vs-ai' ? difficulty : null, clockMs })
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md space-y-4">
      <h1 className="text-2xl font-bold text-center">Xiangqi</h1>

      <div>
        <p className="font-semibold mb-1">Mode</p>
        <div className="flex gap-2">
          <button
            className={`px-3 py-2 rounded-md flex-1 ${mode === 'vs-ai' ? 'bg-red-700 text-white' : 'bg-neutral-200'}`}
            onClick={() => setMode('vs-ai')}
          >
            vs AI
          </button>
          <button
            className={`px-3 py-2 rounded-md flex-1 ${mode === 'local' ? 'bg-red-700 text-white' : 'bg-neutral-200'}`}
            onClick={() => setMode('local')}
          >
            Local Pass & Play
          </button>
        </div>
      </div>

      {mode === 'vs-ai' && (
        <div>
          <p className="font-semibold mb-1">Difficulty</p>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
              <button
                key={level}
                className={`px-3 py-2 rounded-md flex-1 capitalize ${difficulty === level ? 'bg-red-700 text-white' : 'bg-neutral-200'}`}
                onClick={() => setDifficulty(level)}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="font-semibold mb-1">Time Control</p>
        <div className="flex gap-2 flex-wrap">
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset.label}
              className={`px-3 py-2 rounded-md ${clockMs === preset.ms ? 'bg-red-700 text-white' : 'bg-neutral-200'}`}
              onClick={() => setClockMs(preset.ms)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <button className="w-full px-3 py-3 rounded-md bg-emerald-600 text-white font-semibold" onClick={startGame}>
        Start Game
      </button>
    </div>
  )
}
