import { GameProvider } from './state/GameProvider'
import { useGame } from './state/gameContext'
import { LanguageProvider } from './i18n/LanguageProvider'
import { useLanguage } from './i18n/languageContext'
import { GameSetup } from './components/GameSetup'
import { Board } from './components/Board'
import { Clock } from './components/Clock'
import { MoveHistory } from './components/MoveHistory'
import { CapturedPieces } from './components/CapturedPieces'
import { Controls } from './components/Controls'
import { StatusBanner } from './components/StatusBanner'
import { LanguageToggle } from './components/LanguageToggle'

function GameScreen() {
  const { state } = useGame()
  const { t } = useLanguage()

  if (state.mode === 'setup') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <GameSetup />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3 p-3 sm:p-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-neutral-900 sm:text-xl">{t.appTitle}</h1>
        <LanguageToggle />
      </header>

      <StatusBanner />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-col items-center gap-3">
          <Clock />
          <Board />
          <Controls />
        </div>

        <aside className="flex w-full flex-col gap-3 lg:w-80">
          <CapturedPieces />
          <MoveHistory />
        </aside>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <GameProvider>
        <div className="min-h-screen bg-neutral-100 text-neutral-900">
          <GameScreen />
        </div>
      </GameProvider>
    </LanguageProvider>
  )
}
