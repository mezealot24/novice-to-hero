// Tiny WebAudio synth: no audio files needed. Browsers only allow sound after the first tap/key,
// so unlock() is called from the title screen.
import { canPlay, noise, setMuted, tone, unlock } from './sfx-core'
import { thiefSfx } from './sfx-thief'

export { setMuted, unlock }

const baseSfx = {
  swing: (): void => noise(0.08, 0.25, 2500),
  hit: (): void => {
    if (!canPlay('base:hit', 25)) return
    tone('square', 220, 90, 0.08, 0.3, 0, { jitterPct: 0.05 })
    noise(0.05, 0.3, 800)
  },
  crit: (): void => {
    if (!canPlay('base:crit', 25)) return
    tone('square', 440, 120, 0.12, 0.35, 0, { jitterPct: 0.05 })
    noise(0.09, 0.4, 600)
  },
  critBoom: (): void => {
    if (!canPlay('base:critBoom', 60)) return
    tone('sine', 160, 45, 0.22, 0.5, 0, { jitterPct: 0.05 })
    tone('triangle', 1200, 600, 0.1, 0.18, 0.02, { jitterPct: 0.05 })
  }, // low thump + glint under the crit hit
  combo: (k: number): void => {
    const f = 440 * Math.pow(2, ((k - 2) * 4) / 12)
    tone('triangle', f, f * 1.5, 0.09, 0.28)
  }, // climbs a major third per hit
  clang: (): void => {
    tone('square', 1480, 1320, 0.14, 0.2)
    tone('square', 2217, 1975, 0.12, 0.12)
    noise(0.06, 0.35, 3000)
  }, // metal on metal
  evade: (): void => noise(0.16, 0.22, 4500),
  hurt: (): void => tone('sawtooth', 180, 60, 0.2, 0.4),
  dash: (): void => noise(0.12, 0.3, 3500),
  coin: (): void => {
    tone('triangle', 1320, 1320, 0.06, 0.25)
    tone('triangle', 1760, 1760, 0.08, 0.25, 0.05)
  },
  coinDrop: (): void => {
    tone('square', 2637, 2637, 0.03, 0.07)
    tone('triangle', 2093, 2093, 0.05, 0.22)
    tone('triangle', 3136, 3136, 0.06, 0.16, 0.035)
  }, // one short clink per kill (~0.1 s)
  coinGet: (): void => tone('sine', 1568, 2349, 0.07, 0.2), // a quick blip when the last coin reaches the counter
  pop: (): void => tone('sine', 300, 900, 0.12, 0.35),
  door: (): void => {
    tone('triangle', 392, 392, 0.12, 0.3)
    tone('triangle', 523, 523, 0.12, 0.3, 0.1)
    tone('triangle', 784, 784, 0.2, 0.3, 0.2)
  },
  slam: (): void => {
    tone('sine', 120, 40, 0.35, 0.6)
    noise(0.25, 0.4, 200)
  },
  die: (): void => tone('sawtooth', 300, 40, 0.6, 0.4),
  win: (): void => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.25, 0.3, i * 0.12)),
}

export const sfx = {
  ...baseSfx,
  ...thiefSfx,
}
