import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sfx, setMuted, unlock } from '../src/sfx'
import { isMuted, jitter, resetAudioForTest } from '../src/sfx-core'
import { THIEF_SFX_KEYS, type ThiefSfxKey } from '../src/sfx-thief'

interface ParamEvent {
  op: 'set' | 'exp'
  value: number
  time: number
}

class FakeAudioParam {
  value: number
  readonly events: ParamEvent[] = []
  private readonly positiveOnly: boolean

  constructor(initial: number, positiveOnly = false) {
    this.value = initial
    this.positiveOnly = positiveOnly
  }

  setValueAtTime(value: number, startTime: number): this {
    assert.ok(Number.isFinite(value), `setValueAtTime value must be finite: ${value}`)
    assert.ok(Number.isFinite(startTime) && startTime >= 0, `setValueAtTime time invalid: ${startTime}`)
    if (this.positiveOnly) assert.ok(value > 0, `param value must be > 0, got ${value}`)
    this.value = value
    this.events.push({ op: 'set', value, time: startTime })
    return this
  }

  exponentialRampToValueAtTime(value: number, endTime: number): this {
    assert.ok(Number.isFinite(value) && value > 0, `exponentialRamp value must be finite > 0: ${value}`)
    assert.ok(Number.isFinite(endTime) && endTime > 0, `exponentialRamp endTime must be finite > 0: ${endTime}`)
    const prev = this.events.at(-1)
    if (prev) {
      assert.ok(endTime > prev.time, `exponentialRamp endTime (${endTime}) must exceed previous (${prev.time})`)
    }
    this.value = value
    this.events.push({ op: 'exp', value, time: endTime })
    return this
  }
}

interface FakeNode {
  readonly kind: string
  readonly connections: FakeNode[]
  connect(dest: FakeNode): FakeNode
}

class BaseFakeNode implements FakeNode {
  readonly kind: string
  readonly connections: FakeNode[] = []

  constructor(kind: string) {
    this.kind = kind
  }

  connect(dest: FakeNode): FakeNode {
    this.connections.push(dest)
    return dest
  }
}

class FakeGainNode extends BaseFakeNode {
  readonly gain = new FakeAudioParam(1, false)
  constructor() {
    super('GainNode')
  }
}

class FakeCompressorNode extends BaseFakeNode {
  readonly threshold = new FakeAudioParam(-24, false)
  readonly knee = new FakeAudioParam(30, false)
  readonly ratio = new FakeAudioParam(12, false)
  readonly attack = new FakeAudioParam(0.003, false)
  readonly release = new FakeAudioParam(0.25, false)
  constructor() {
    super('DynamicsCompressorNode')
  }
}

class FakeOscillatorNode extends BaseFakeNode {
  type: OscillatorType = 'sine'
  readonly frequency = new FakeAudioParam(440, true)
  startedAt: number | null = null
  stoppedAt: number | null = null

  constructor() {
    super('OscillatorNode')
  }

  start(when = 0): void {
    assert.ok(Number.isFinite(when) && when >= 0, `osc.start invalid time: ${when}`)
    this.startedAt = when
  }

  stop(when = 0): void {
    assert.ok(Number.isFinite(when) && when >= 0, `osc.stop invalid time: ${when}`)
    if (this.startedAt !== null) {
      assert.ok(when > this.startedAt, `osc.stop (${when}) must be > start (${this.startedAt})`)
    }
    this.stoppedAt = when
  }
}

class FakeBiquadFilterNode extends BaseFakeNode {
  type: BiquadFilterType = 'lowpass'
  readonly frequency = new FakeAudioParam(350, true)
  readonly Q = new FakeAudioParam(1, false)

  constructor() {
    super('BiquadFilterNode')
  }
}

class FakeAudioBuffer {
  readonly numberOfChannels: number
  readonly length: number
  readonly sampleRate: number
  readonly duration: number
  private readonly data: Float32Array[]

  constructor(channels: number, length: number, sampleRate: number) {
    this.numberOfChannels = channels
    this.length = length
    this.sampleRate = sampleRate
    this.duration = length / sampleRate
    this.data = Array.from({ length: channels }, () => new Float32Array(length))
  }

  getChannelData(channel: number): Float32Array {
    return this.data[channel]
  }
}

class FakeBufferSourceNode extends BaseFakeNode {
  buffer: FakeAudioBuffer | null = null
  loop = false
  startedArgs: { when: number; offset?: number; duration?: number } | null = null

  constructor() {
    super('AudioBufferSourceNode')
  }

  start(when = 0, offset?: number, duration?: number): void {
    assert.ok(Number.isFinite(when) && when >= 0, `bufferSource.start invalid time: ${when}`)
    if (offset !== undefined) {
      assert.ok(Number.isFinite(offset) && offset >= 0, `bufferSource.start invalid offset: ${offset}`)
    }
    if (duration !== undefined) {
      assert.ok(Number.isFinite(duration) && duration > 0, `bufferSource.start invalid duration: ${duration}`)
    }
    if (!this.loop && this.buffer && offset !== undefined && duration !== undefined) {
      assert.ok(
        offset + duration <= this.buffer.duration + 1e-6,
        `buffer slice ${offset} + ${duration} exceeds buffer duration ${this.buffer.duration}`,
      )
    }
    this.startedArgs = { when, offset, duration }
  }
}

class FakeAudioContext {
  currentTime = 1.0
  sampleRate = 48000
  readonly destination = new BaseFakeNode('AudioDestinationNode')
  readonly gains: FakeGainNode[] = []
  readonly compressors: FakeCompressorNode[] = []
  readonly oscillators: FakeOscillatorNode[] = []
  readonly filters: FakeBiquadFilterNode[] = []
  readonly bufferSources: FakeBufferSourceNode[] = []
  resumed = 0

  resume(): Promise<void> {
    this.resumed++
    return Promise.resolve()
  }

  createGain(): FakeGainNode {
    const g = new FakeGainNode()
    this.gains.push(g)
    return g
  }

  createDynamicsCompressor(): FakeCompressorNode {
    const c = new FakeCompressorNode()
    this.compressors.push(c)
    return c
  }

  createOscillator(): FakeOscillatorNode {
    const o = new FakeOscillatorNode()
    this.oscillators.push(o)
    return o
  }

  createBiquadFilter(): FakeBiquadFilterNode {
    const f = new FakeBiquadFilterNode()
    this.filters.push(f)
    return f
  }

  createBuffer(channels: number, length: number, sampleRate: number): FakeAudioBuffer {
    return new FakeAudioBuffer(channels, length, sampleRate)
  }

  createBufferSource(): FakeBufferSourceNode {
    const s = new FakeBufferSourceNode()
    this.bufferSources.push(s)
    return s
  }
}

interface GlobalWithAudio {
  AudioContext?: typeof AudioContext
}

const globalAudio = globalThis as unknown as GlobalWithAudio
const originalAudioContext = globalAudio.AudioContext

function installFakeAudioContext(): FakeAudioContext {
  let instance: FakeAudioContext | null = null
  const Ctor = function MockAudioContext() {
    instance = new FakeAudioContext()
    return instance
  } as unknown as typeof AudioContext
  globalAudio.AudioContext = Ctor
  unlock()
  assert.ok(instance, 'unlock() should instantiate AudioContext')
  return instance
}

afterEach(() => {
  resetAudioForTest()
  if (originalAudioContext === undefined) {
    delete globalAudio.AudioContext
  } else {
    globalAudio.AudioContext = originalAudioContext
  }
})

describe('Thief-line procedural SFX', () => {
  it('is headless-safe when AudioContext is undefined', () => {
    delete globalAudio.AudioContext
    resetAudioForTest()
    unlock()
    for (const key of THIEF_SFX_KEYS) {
      assert.doesNotThrow(() => {
        const fn = sfx[key] as (...args: never[]) => void
        if (key === 'shadowTick') (sfx.shadowTick as (a: number, b: number) => void)(2, 5)
        else fn()
      }, `Headless call failed for ${key}`)
    }
    assert.doesNotThrow(() => {
      sfx.hit()
      sfx.crit()
      sfx.critBoom()
      sfx.swing()
    })
  })

  it('wires master -> DynamicsCompressorNode -> destination on unlock()', () => {
    const ctx = installFakeAudioContext()
    assert.equal(ctx.gains.length, 1)
    assert.equal(ctx.compressors.length, 1)
    const master = ctx.gains[0]
    const comp = ctx.compressors[0]
    assert.ok(master.connections.includes(comp), 'master should connect to compressor')
    assert.ok(comp.connections.includes(ctx.destination), 'compressor should connect to destination')
    assert.equal(comp.threshold.value, -10)
    assert.equal(comp.ratio.value, 8)
    assert.equal(THIEF_SFX_KEYS.length, 37)
  })

  it('emits valid Web Audio nodes for every Thief/Rogue/Mobster SFX and parameter variant', () => {
    const ctx = installFakeAudioContext()

    const countStartedSources = () =>
      ctx.oscillators.filter((o) => o.startedAt !== null && o.stoppedAt !== null).length +
      ctx.bufferSources.filter((b) => b.startedArgs !== null).length

    const invocations: { label: string; key: ThiefSfxKey; run: () => void }[] = [
      { label: 'daggerSlash(0, false)', key: 'daggerSlash', run: () => sfx.daggerSlash(0, false) },
      { label: 'daggerSlash(1, true)', key: 'daggerSlash', run: () => sfx.daggerSlash(1, true) },
      { label: 'doubleStrike', key: 'doubleStrike', run: () => sfx.doubleStrike() },
      { label: 'shadowTick(2, 5)', key: 'shadowTick', run: () => sfx.shadowTick(2, 5) },
      { label: 'shadowForm', key: 'shadowForm', run: () => sfx.shadowForm() },
      { label: 'shadowEvade', key: 'shadowEvade', run: () => sfx.shadowEvade() },
      { label: 'luckyDodge', key: 'luckyDodge', run: () => sfx.luckyDodge() },
      { label: 'shadowCounter', key: 'shadowCounter', run: () => sfx.shadowCounter() },
      { label: 'maliceRelease', key: 'maliceRelease', run: () => sfx.maliceRelease() },
      { label: 'venomStab', key: 'venomStab', run: () => sfx.venomStab() },
      { label: 'smokeBomb', key: 'smokeBomb', run: () => sfx.smokeBomb() },
      { label: 'sightlessRaid', key: 'sightlessRaid', run: () => sfx.sightlessRaid() },
      { label: 'pickpocket', key: 'pickpocket', run: () => sfx.pickpocket() },
      { label: 'stealLoot(0)', key: 'stealLoot', run: () => sfx.stealLoot(0) },
      { label: 'stealLoot(1)', key: 'stealLoot', run: () => sfx.stealLoot(1) },
      { label: 'deepWound', key: 'deepWound', run: () => sfx.deepWound() },
      { label: 'bladesEnd', key: 'bladesEnd', run: () => sfx.bladesEnd() },
      { label: 'shadowDanceStart', key: 'shadowDanceStart', run: () => sfx.shadowDanceStart() },
      { label: 'shadowSlash(2, 5)', key: 'shadowSlash', run: () => sfx.shadowSlash(2, 5) },
      { label: 'shadowFinisher', key: 'shadowFinisher', run: () => sfx.shadowFinisher() },
      { label: 'poisonTick', key: 'poisonTick', run: () => sfx.poisonTick() },
      { label: 'poisonContaminate(false)', key: 'poisonContaminate', run: () => sfx.poisonContaminate(false) },
      { label: 'poisonContaminate(true)', key: 'poisonContaminate', run: () => sfx.poisonContaminate(true) },
      { label: 'poisonSpread', key: 'poisonSpread', run: () => sfx.poisonSpread() },
      { label: 'poisonOverflow', key: 'poisonOverflow', run: () => sfx.poisonOverflow() },
      { label: 'knifeThrow', key: 'knifeThrow', run: () => sfx.knifeThrow() },
      { label: 'knifeBounce', key: 'knifeBounce', run: () => sfx.knifeBounce() },
      { label: 'knifeLand(3, 8)', key: 'knifeLand', run: () => sfx.knifeLand(3, 8) },
      { label: 'voracityPickup(3)', key: 'voracityPickup', run: () => sfx.voracityPickup(3) },
      { label: 'backStab(default)', key: 'backStab', run: () => sfx.backStab() },
      { label: 'backStab(ambush+cp)', key: 'backStab', run: () => sfx.backStab({ ambush: true, cp: 3 }) },
      { label: 'backStab(shadow)', key: 'backStab', run: () => sfx.backStab({ shadow: true }) },
      { label: 'knifeStormBuild(0.6)', key: 'knifeStormBuild', run: () => sfx.knifeStormBuild(0.6) },
      { label: 'knifeStormBuild(1.2)', key: 'knifeStormBuild', run: () => sfx.knifeStormBuild(1.2) },
      { label: 'knifeStormFinale', key: 'knifeStormFinale', run: () => sfx.knifeStormFinale() },
      { label: 'killReset', key: 'killReset', run: () => sfx.killReset() },
      { label: 'shadowStep', key: 'shadowStep', run: () => sfx.shadowStep() },
      { label: 'tendonCut', key: 'tendonCut', run: () => sfx.tendonCut() },
      { label: 'debtCollectSlash', key: 'debtCollectSlash', run: () => sfx.debtCollectSlash() },
      { label: 'debtPoisonDetonate', key: 'debtPoisonDetonate', run: () => sfx.debtPoisonDetonate() },
      { label: 'debtRefund', key: 'debtRefund', run: () => sfx.debtRefund() },
      { label: 'mobsterExecute', key: 'mobsterExecute', run: () => sfx.mobsterExecute() },
      { label: 'nextJob', key: 'nextJob', run: () => sfx.nextJob() },
    ]

    const coveredKeys = new Set<ThiefSfxKey>()
    for (const inv of invocations) {
      coveredKeys.add(inv.key)
      ctx.currentTime += 0.25
      const before = countStartedSources()
      inv.run()
      const after = countStartedSources()
      assert.ok(after > before, `${inv.label} should emit at least one audio source/oscillator`)
    }

    for (const key of THIEF_SFX_KEYS) {
      assert.ok(coveredKeys.has(key), `Missing test coverage for Thief SFX key: ${key}`)
    }
  })

  it('throttles rapid repeated triggers of the same key within minMs', () => {
    const ctx = installFakeAudioContext()
    const totalSources = () => ctx.oscillators.length + ctx.bufferSources.length

    sfx.knifeThrow()
    const afterFirst = totalSources()
    assert.ok(afterFirst > 0, 'first knifeThrow should emit nodes')

    sfx.knifeThrow()
    assert.equal(totalSources(), afterFirst, 'immediate second knifeThrow at same time should be throttled')

    ctx.currentTime += 0.045
    sfx.knifeThrow()
    assert.ok(totalSources() > afterFirst, 'knifeThrow after 45ms (> 35ms throttle) should emit nodes')
  })

  it('suppresses all node creation when muted and resumes when unmuted', () => {
    const ctx = installFakeAudioContext()
    setMuted(true)
    assert.equal(isMuted(), true)
    assert.equal(ctx.gains[0].gain.value, 0)

    const before = ctx.oscillators.length + ctx.bufferSources.length
    sfx.venomStab()
    sfx.backStab()
    assert.equal(ctx.oscillators.length + ctx.bufferSources.length, before, 'muted calls must not allocate nodes')

    setMuted(false)
    assert.equal(isMuted(), false)
    assert.ok(ctx.gains[0].gain.value > 0)
    ctx.currentTime += 0.2
    sfx.venomStab()
    assert.ok(ctx.oscillators.length + ctx.bufferSources.length > before, 'unmuted call should emit nodes')
  })

  it('keeps jitter(0.06) strictly within [0.94, 1.06]', () => {
    for (let i = 0; i < 100; i++) {
      const val = jitter(0.06)
      assert.ok(val >= 0.94 && val <= 1.06, `jitter out of range: ${val}`)
    }
  })
})
