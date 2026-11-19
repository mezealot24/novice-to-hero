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

export interface BladeSliceOpts {
  dur?: number
  vol?: number
  f0?: number
  f1?: number
  q?: number
  edgeFreq?: number
  drive?: number
  delay?: number
  jitterPct?: number
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let compressor: DynamicsCompressorNode | null = null
let noiseBuf: AudioBuffer | null = null
let muted = false
const lastPlayed = new Map<string, number>()
const driveCurves = new Map<number, Float32Array<ArrayBuffer>>()
const sampleUrls = new Map<string, string>()
const sampleBuffers = new Map<string, AudioBuffer>()
const sampleLoading = new Set<string>()

const safeFreq = (f: number): number => Math.max(20, Math.min(20000, Number.isFinite(f) ? f : 440))
const safeGain = (g: number): number => Math.max(0.0001, Math.min(2, Number.isFinite(g) ? g : 0.1))
const safeDur = (d: number): number => Math.max(0.008, Number.isFinite(d) ? d : 0.05)

/** Return current mute state. */
export function isMuted(): boolean {
  return muted
}

/** Return true when audio context is initialized and unmuted. */
export function isAudioReady(): boolean {
  return !muted && !!ctx && !!master
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
    decodeRegisteredSamples()
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
  sampleBuffers.clear()
  sampleLoading.clear()
}

/** Random pitch multiplier centered on 1 within [1 - pct, 1 + pct]. */
export function jitter(pct = 0.06): number {
  return 1 + (Math.random() * 2 - 1) * pct
}

/** Current audio clock in milliseconds (0 when audio context is inactive). */
export function audioTimeMs(): number {
  return ctx ? ctx.currentTime * 1000 : 0
}

function getDriveCurve(drive: number): Float32Array<ArrayBuffer> {
  const clamped = Math.max(1, Math.min(10, Number.isFinite(drive) ? drive : 2))
  const key = Math.round(clamped * 10)
  const cached = driveCurves.get(key)
  if (cached) return cached
  const d = key / 10
  const norm = Math.tanh(d)
  const curve = new Float32Array(new ArrayBuffer(256 * 4))
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 255 - 1
    curve[i] = Math.tanh(x * d) / norm
  }
  driveCurves.set(key, curve)
  return curve
}

function spawnNoiseSlice(d: number): { src: AudioBufferSourceNode; offset: number } | null {
  if (!ctx || !noiseBuf) return null
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  if (d >= 0.9) {
    src.loop = true
    return { src, offset: 0 }
  }
  const maxOff = Math.max(0.01, noiseBuf.duration - d - 0.02)
  return { src, offset: Math.random() * maxOff }
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
  const slice = spawnNoiseSlice(d)
  if (!slice) return
  const { src, offset } = slice
  const filter = ctx.createBiquadFilter()
  const g = ctx.createGain()

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

/** Crisp RO-style dagger blade slice: zero-attack waveshaped broadband noise sweep + optional razor edge friction. */
export function bladeSlice(opts?: BladeSliceOpts): void {
  if (muted || !ctx || !master || !noiseBuf) return
  const d = safeDur(opts?.dur ?? 0.065)
  const vol = opts?.vol ?? 0.42
  const f0 = opts?.f0 ?? 7800
  const f1 = opts?.f1 ?? 1800
  const q = opts?.q ?? 0.95
  const edgeFreq = opts?.edgeFreq ?? 4800
  const drive = opts?.drive ?? 2.8
  const delay = opts?.delay ?? 0
  const jPct = opts?.jitterPct ?? 0.07
  const j = jPct > 0 ? jitter(jPct) : 1
  const t = ctx.currentTime + Math.max(0, delay)

  const tear = spawnNoiseSlice(d)
  if (tear) {
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = Math.max(0.2, Number.isFinite(q) ? q : 0.95)
    filter.frequency.setValueAtTime(safeFreq(f0 * j), t)
    filter.frequency.exponentialRampToValueAtTime(safeFreq(f1 * j), t + d)

    const g = ctx.createGain()
    g.gain.setValueAtTime(safeGain(vol), t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d)

    tear.src.connect(filter)
    if (drive > 1 && typeof ctx.createWaveShaper === 'function') {
      const shaper = ctx.createWaveShaper()
      shaper.curve = getDriveCurve(drive)
      shaper.oversample = '2x'
      filter.connect(shaper)
      shaper.connect(g)
    } else {
      filter.connect(g)
    }
    g.connect(master)
    tear.src.start(t, tear.offset, d + 0.02)
  }

  if (edgeFreq > 0) {
    const edgeDur = safeDur(Math.min(d * 0.55, 0.034))
    const edge = spawnNoiseSlice(edgeDur)
    if (edge) {
      const ef = ctx.createBiquadFilter()
      ef.type = 'bandpass'
      ef.Q.value = 4.2
      ef.frequency.setValueAtTime(safeFreq(edgeFreq * j), t)
      ef.frequency.exponentialRampToValueAtTime(safeFreq(edgeFreq * 0.72 * j), t + edgeDur)

      const eg = ctx.createGain()
      eg.gain.setValueAtTime(safeGain(vol * 0.45), t)
      eg.gain.exponentialRampToValueAtTime(0.0001, t + edgeDur)

      edge.src.connect(ef)
      ef.connect(eg)
      eg.connect(master)
      edge.src.start(t, edge.offset, edgeDur + 0.02)
    }
  }
}

/** Tight meaty cut impact (no 8-bit square wave) paired under RO dagger hits. */
export function fleshImpact(vol = 0.4, f0 = 280, f1 = 68, dur = 0.048, delay = 0, jitterPct = 0.06): void {
  if (muted || !ctx || !master) return
  tone('triangle', f0, f1, dur, vol, delay, { jitterPct })
  noiseBurst(0.016, vol * 0.65, 'highpass', 1500, 900, 0.8, delay, 0)
}

/** Legacy highpass noise burst helper for existing base SFX. */
export function noise(dur: number, vol = 0.4, hp = 1500): void {
  noiseBurst(dur, vol, 'highpass', hp, undefined, 0.7, 0, 0)
}

function decodeSample(key: string, url: string): void {
  if (!ctx || sampleBuffers.has(key) || sampleLoading.has(key)) return
  if (typeof fetch !== 'function') return
  sampleLoading.add(key)
  const targetCtx = ctx
  void fetch(url)
    .then((r) => r.arrayBuffer())
    .then((buf) => targetCtx.decodeAudioData(buf))
    .then((decoded) => {
      if (ctx === targetCtx) sampleBuffers.set(key, decoded)
    })
    .catch(() => {
      // Ignore decode/fetch errors in headless or restricted environments; synth fallback remains active.
    })
    .finally(() => {
      sampleLoading.delete(key)
    })
}

function decodeRegisteredSamples(): void {
  for (const [key, url] of sampleUrls) decodeSample(key, url)
}

/** Register an audio sample URL (e.g. Vite-inlined .mp3) to be decoded once AudioContext unlocks. */
export function registerSample(key: string, url: string): void {
  sampleUrls.set(key, url)
  if (ctx) decodeSample(key, url)
}

export interface PlaySampleOpts {
  vol?: number
  rate?: number
  delay?: number
  jitterPct?: number
}

/** Play a decoded audio sample; returns true if played, false if still loading/unavailable. */
export function playSample(key: string, opts?: PlaySampleOpts): boolean {
  if (muted || !ctx || !master) return false
  const buf = sampleBuffers.get(key)
  if (!buf) return false
  const t = ctx.currentTime + Math.max(0, opts?.delay ?? 0)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const baseRate = opts?.rate ?? 1
  const j = opts?.jitterPct ? jitter(opts.jitterPct) : 1
  src.playbackRate.value = Math.max(0.25, Math.min(4, baseRate * j))
  const g = ctx.createGain()
  g.gain.setValueAtTime(safeGain(opts?.vol ?? 0.75), t)
  src.connect(g)
  g.connect(master)
  src.start(t)
  return true
}
