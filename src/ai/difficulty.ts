export type Difficulty = 'easy' | 'medium' | 'hard'

export interface DifficultySettings {
  maxDepth: number
  timeBudgetMs: number
  randomTopN?: number
  randomMaxDrop?: number
}

/**
 * `timeBudgetMs` is a hard ceiling, not a target: iterative deepening stops at
 * whatever depth it finished, so these are the worst case a player waits.
 * Easy plays a shallow search and picks among the plausible moves rather than
 * the best one, which loses games without hanging pieces for no reason.
 */
export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: { maxDepth: 2, timeBudgetMs: 500, randomTopN: 4, randomMaxDrop: 200 },
  medium: { maxDepth: 4, timeBudgetMs: 1200 },
  hard: { maxDepth: 6, timeBudgetMs: 2200 },
}
