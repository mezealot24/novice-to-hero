// Tiny WebAudio synth: no audio files needed. Browsers only allow sound after the first tap/key,
// so unlock() is called from the title screen.

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false
const VOL = 0.35

export function setMuted(m: boolean) {
  muted = m
  if (master) master.gain.value = m ? 0 : VOL
}

export function unlock() {
  if (ctx) { void ctx.resume(); return }
  try {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : VOL
    master.connect(ctx.destination)
  } catch { ctx = null }
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol = 0.5, delay = 0) {
  if (!ctx || !master) return
  const t = ctx.currentTime + delay
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.connect(g).connect(master)
  o.start(t); o.stop(t + dur + 0.02)
}

function noise(dur: number, vol = 0.4, hp = 1500) {
  if (!ctx || !master) return
  const t = ctx.currentTime
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol
  src.connect(f).connect(g).connect(master)
  src.start(t)
}

export const sfx = {
  swing: () => noise(0.08, 0.25, 2500),
  hit: () => { tone('square', 220, 90, 0.08, 0.3); noise(0.05, 0.3, 800) },
  crit: () => { tone('square', 440, 120, 0.12, 0.35); noise(0.09, 0.4, 600) },
  hurt: () => tone('sawtooth', 180, 60, 0.2, 0.4),
  dash: () => noise(0.12, 0.3, 3500),
  coin: () => { tone('triangle', 1320, 1320, 0.06, 0.25); tone('triangle', 1760, 1760, 0.08, 0.25, 0.05) },
  pop: () => tone('sine', 300, 900, 0.12, 0.35),
  door: () => { tone('triangle', 392, 392, 0.12, 0.3); tone('triangle', 523, 523, 0.12, 0.3, 0.1); tone('triangle', 784, 784, 0.2, 0.3, 0.2) },
  slam: () => { tone('sine', 120, 40, 0.35, 0.6); noise(0.25, 0.4, 200) },
  die: () => { tone('sawtooth', 300, 40, 0.6, 0.4) },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.25, 0.3, i * 0.12)),
}
