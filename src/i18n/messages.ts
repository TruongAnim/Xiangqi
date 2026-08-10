export type Language = 'vi' | 'en'

export const LANGUAGES: Language[] = ['vi', 'en']

export const LANGUAGE_LABELS: Record<Language, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
}

const vi = {
  appTitle: 'Cờ Tướng',
  appSubtitle: 'Đấu với máy ngay trên trình duyệt',

  mode: 'Chế độ',
  modeVsAi: 'Đấu với máy',
  modeLocal: 'Hai người một máy',

  difficulty: 'Độ khó',
  difficultyEasy: 'Dễ',
  difficultyMedium: 'Vừa',
  difficultyHard: 'Khó',

  timeControl: 'Thời gian',
  timeNoLimit: 'Không giới hạn',
  timeMinutes: (minutes: number) => `${minutes} phút`,

  startGame: 'Bắt đầu',
  resumeGame: 'Chơi tiếp ván đang dở',

  red: 'Đỏ',
  black: 'Đen',
  you: 'Bạn',
  computer: 'Máy',

  undo: 'Đi lại',
  flipBoard: 'Xoay bàn',
  newGame: 'Ván mới',
  soundOn: 'Tắt âm',
  soundOff: 'Bật âm',

  moveHistory: 'Biên bản',
  noMovesYet: 'Chưa có nước nào',
  captured: 'Quân đã ăn',
  nothingCaptured: 'Chưa ăn quân nào',

  thinking: 'Máy đang nghĩ…',
  yourTurn: 'Đến lượt bạn',
  turnOf: (side: string) => `Lượt ${side}`,

  check: 'Chiếu tướng!',
  checkmate: 'Hết cờ!',
  noMoves: 'Hết nước đi!',
  timeout: 'Hết giờ!',
  drawRepetition: 'Hòa — lặp lại nước đi ba lần',
  drawNoCapture: 'Hòa — 60 nước không ăn quân',
  perpetualCheck: 'Chiếu lặp liên tục — bên chiếu bị xử thua',
  winner: (side: string) => `${side} thắng.`,

  language: 'Ngôn ngữ',
}

/**
 * Vietnamese is the source of truth for the message shape: every other
 * dictionary is typed against it, so a missing or misspelled key is a build
 * error rather than a blank label at runtime.
 */
type Messages = typeof vi

const en: Messages = {
  appTitle: 'Xiangqi',
  appSubtitle: 'Play Chinese chess against the computer',

  mode: 'Mode',
  modeVsAi: 'vs Computer',
  modeLocal: 'Two players',

  difficulty: 'Difficulty',
  difficultyEasy: 'Easy',
  difficultyMedium: 'Medium',
  difficultyHard: 'Hard',

  timeControl: 'Time control',
  timeNoLimit: 'No limit',
  timeMinutes: (minutes: number) => `${minutes} min`,

  startGame: 'Start game',
  resumeGame: 'Resume saved game',

  red: 'Red',
  black: 'Black',
  you: 'You',
  computer: 'Computer',

  undo: 'Undo',
  flipBoard: 'Flip board',
  newGame: 'New game',
  soundOn: 'Mute',
  soundOff: 'Unmute',

  moveHistory: 'Moves',
  noMovesYet: 'No moves yet',
  captured: 'Captured',
  nothingCaptured: 'Nothing captured yet',

  thinking: 'Computer is thinking…',
  yourTurn: 'Your turn',
  turnOf: (side: string) => `${side} to move`,

  check: 'Check!',
  checkmate: 'Checkmate!',
  noMoves: 'No legal moves!',
  timeout: 'Out of time!',
  drawRepetition: 'Draw — threefold repetition',
  drawNoCapture: 'Draw — 60 moves without a capture',
  perpetualCheck: 'Perpetual check — the checking side loses',
  winner: (side: string) => `${side} wins.`,

  language: 'Language',
}

export const MESSAGES: Record<Language, Messages> = { vi, en }

export type { Messages }
