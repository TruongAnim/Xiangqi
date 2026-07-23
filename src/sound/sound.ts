export type SoundEffect = 'move' | 'capture' | 'check' | 'gameEnd'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext()
  return audioContext
}

function playTone(frequency: number, durationMs: number, type: OscillatorType = 'sine'): void {
  const ctx = getAudioContext()
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
