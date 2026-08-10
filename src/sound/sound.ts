export type SoundEffect = 'move' | 'capture' | 'check' | 'gameEnd'

const STORAGE_KEY = 'xiangqi:muted'

let audioContext: AudioContext | null = null
let muted = readMuted()

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(next: boolean): void {
  muted = next
  try {
    localStorage.setItem(STORAGE_KEY, String(next))
  } catch {
    // Preference just will not survive a reload.
  }
}

function getAudioContext(): AudioContext | null {
  try {
    if (!audioContext) audioContext = new AudioContext()
    // Browsers start the context suspended until a user gesture; every sound we
    // play follows a click, so resuming here is enough to get audio going.
    if (audioContext.state === 'suspended') void audioContext.resume()
    return audioContext
  } catch {
    return null
  }
}

function playTone(frequency: number, durationMs: number, type: OscillatorType = 'sine'): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.2, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start()
  oscillator.stop(ctx.currentTime + durationMs / 1000)
}

export function playSound(effect: SoundEffect): void {
  if (muted) return

  switch (effect) {
    case 'move':
      playTone(440, 80)
      return
    case 'capture':
      playTone(220, 120, 'square')
      return
    case 'check':
      playTone(660, 150, 'triangle')
      playTone(880, 150, 'triangle')
      return
    case 'gameEnd':
      playTone(330, 300, 'sawtooth')
      return
  }
}
