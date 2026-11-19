// Web Audio synth core: master bus with peak compressor, cached noise buffer, variation, and throttling.
// Headless-safe: all functions no-op cleanly when AudioContext is unavailable (e.g. Node unit tests).

export const MASTER_VOL = 0.35

export interface ToneOpts {
  attack?: number
  jitterPct?: number
}

export interface FmToneOpts {
  carrierType?: OscillatorType
  modType?: OscillatorType
  attack?: number
  jitterPct?: number
  modDecay?: number
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let compressor: DynamicsCompressorNode | null = null
let noiseBuf: AudioBuffer | null = null
let muted = false
const lastPlayed = new Map<string, number>()

const safeFreq = (f: number): number => Math.max(20, Math.min(20000, Number.isFinite(f) ? f : 440))
const safeGain = (g: number): number => Math.max(0.0001, Math.min(2, Number.isFinite(g) ? g : 0.1))
const safeDur = (d: number): number => Math.max(0.008, Number.isFinite(d) ? d : 0.05)

/** Return current mute state. */
export function isMuted(): boolean {
  return muted
}

/** Mute or unmute master audio output immediately. */
export function setMuted(m: boolean): void {
  muted = m
  if (master) master.gain.value = m ? 0 : MASTER_VOL
}

/** Initialize or resume the Web Audio graph after a user gesture. */
export function unlock(): void {
  if (ctx) {
    void ctx.resume()
    return
  }
  if (typeof AudioContext === 'undefined') return
  try {
    ctx = new AudioContext()
    master = ctx.createGain()
    compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -10
    compressor.knee.value = 12
    compressor.ratio.value = 8
    compressor.attack.value = 0.003
    compressor.release.value = 0.12
    master.gain.value = muted ? 0 : MASTER_VOL
    master.connect(compressor)
    compressor.connect(ctx.destination)

    const len = Math.max(1, Math.floor(ctx.sampleRate * 1.0))
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const ch = noiseBuf.getChannelData(0)
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1
  } catch {
    ctx = null
    master = null
    compressor = null
    noiseBuf = null
  }
}

/** Reset module audio state for unit tests. */
export function resetAudioForTest(): void {
  ctx = null
  master = null
  compressor = null
  noiseBuf = null
  muted = false
  lastPlayed.clear()
}

/** Random pitch multiplier centered on 1 within [1 - pct, 1 + pct]. */
export function jitter(pct = 0.06): number {
  return 1 + (Math.random() * 2 - 1) * pct
}

/** Rate-limit repeated triggers of the same sound key in audio-clock milliseconds. */
export function canPlay(key: string, minMs: number): boolean {
  if (muted || !ctx || !master) return false
  const nowMs = ctx.currentTime * 1000
  const prev = lastPlayed.get(key)
  if (prev !== undefined && nowMs - prev < minMs) return false
  lastPlayed.set(key, nowMs)
  return true
}

/** Play an oscillator tone with optional attack ramp and pitch jitter. */
export function tone(
  type: OscillatorType,
  f0: number,
  f1: number,
  dur: number,
  vol = 0.5,
  delay = 0,
  opts?: ToneOpts,
): void {
  if (muted || !ctx || !master) return
  const d = safeDur(dur)
  const t = ctx.currentTime + Math.max(0, delay)
  const j = opts?.jitterPct ? jitter(opts.jitterPct) : 1
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(safeFreq(f0 * j), t)
  o.frequency.exponentialRampToValueAtTime(safeFreq(f1 * j), t + d)

  const peak = safeGain(vol)
  const att = opts?.attack ?? 0
  if (att > 0) {
    const attDur = Math.min(att, d * 0.4)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attDur)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  } else {
    g.gain.setValueAtTime(peak, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  }

  o.connect(g)
  g.connect(master)
  o.start(t)
  o.stop(t + d + 0.02)
}

/** Play a 2-operator FM tone for metallic steel rings, clinks, and bells. */
export function fmTone(
  carrier0: number,
  carrier1: number,
  modRatio: number,
  modIndex: number,
  dur: number,
  vol = 0.35,
  delay = 0,
  opts?: FmToneOpts,
): void {
  if (muted || !ctx || !master) return
  const d = safeDur(dur)
  const t = ctx.currentTime + Math.max(0, delay)
  const j = opts?.jitterPct ? jitter(opts.jitterPct) : 1
  const c0 = safeFreq(carrier0 * j)
  const c1 = safeFreq(carrier1 * j)
  const ratio = Number.isFinite(modRatio) && modRatio > 0 ? modRatio : 1

  const carrier = ctx.createOscillator()
  const mod = ctx.createOscillator()
  const modGain = ctx.createGain()
  const outGain = ctx.createGain()

  carrier.type = opts?.carrierType ?? 'sine'
  mod.type = opts?.modType ?? 'sine'
  carrier.frequency.setValueAtTime(c0, t)
  carrier.frequency.exponentialRampToValueAtTime(c1, t + d)
  mod.frequency.setValueAtTime(safeFreq(c0 * ratio), t)
  mod.frequency.exponentialRampToValueAtTime(safeFreq(c1 * ratio), t + d)

  const idx = Math.max(0.01, Number.isFinite(modIndex) ? modIndex : 100)
  const modDecayDur = Math.max(0.004, d * (opts?.modDecay ?? 0.7))
  modGain.gain.setValueAtTime(idx, t)
  modGain.gain.exponentialRampToValueAtTime(0.01, t + modDecayDur)

  const peak = safeGain(vol)
  const att = opts?.attack ?? 0
  if (att > 0) {
    const attDur = Math.min(att, d * 0.4)
    outGain.gain.setValueAtTime(0.0001, t)
    outGain.gain.exponentialRampToValueAtTime(peak, t + attDur)
    outGain.gain.exponentialRampToValueAtTime(0.0001, t + d)
  } else {
    outGain.gain.setValueAtTime(peak, t)
    outGain.gain.exponentialRampToValueAtTime(0.0001, t + d)
  }

  mod.connect(modGain)
  modGain.connect(carrier.frequency)
  carrier.connect(outGain)
  outGain.connect(master)

  carrier.start(t)
  mod.start(t)
  carrier.stop(t + d + 0.02)
  mod.stop(t + d + 0.02)
}

/** Play a filtered noise burst with optional cutoff sweep and attack/decay envelope. */
export function noiseBurst(
  dur: number,
  vol = 0.35,
  filterType: BiquadFilterType = 'highpass',
  f0 = 1500,
  f1?: number,
  q = 1,
  delay = 0,
  attack = 0.003,
): void {
  if (muted || !ctx || !master || !noiseBuf) return
  const d = safeDur(dur)
  const t = ctx.currentTime + Math.max(0, delay)
  const src = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const g = ctx.createGain()

  src.buffer = noiseBuf
  let offset = 0
  if (d >= 0.9) {
    src.loop = true
  } else {
    const maxOff = Math.max(0.01, noiseBuf.duration - d - 0.02)
    offset = Math.random() * maxOff
  }

  filter.type = filterType
  filter.Q.value = Math.max(0.1, Number.isFinite(q) ? q : 1)
  filter.frequency.setValueAtTime(safeFreq(f0), t)
  if (f1 !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(safeFreq(f1), t + d)
  }

  const peak = safeGain(vol)
  if (attack > 0) {
    const attDur = Math.min(attack, d * 0.35)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attDur)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  } else {
    g.gain.setValueAtTime(peak, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  }

  src.connect(filter)
  filter.connect(g)
  g.connect(master)
  src.start(t, offset, d + 0.02)
}

/** Legacy highpass noise burst helper for existing base SFX. */
export function noise(dur: number, vol = 0.4, hp = 1500): void {
  noiseBurst(dur, vol, 'highpass', hp, undefined, 0.7, 0, 0)
}
