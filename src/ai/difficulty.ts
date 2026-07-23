export type Difficulty = 'easy' | 'medium' | 'hard'

export interface DifficultySettings {
  maxDepth: number
  timeBudgetMs: number
  randomizeTopN?: number
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: { maxDepth: 2, timeBudgetMs: 300, randomizeTopN: 3 },
  medium: { maxDepth: 3, timeBudgetMs: 800 },
  hard: { maxDepth: 4, timeBudgetMs: 1500 },
}
