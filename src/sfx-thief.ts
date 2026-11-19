// Thief-line procedural Web Audio SFX: Ragnarok Online (RO) crisp dagger style for Base Thief, Rogue, and Mobster.
// Pure synth (no audio files) using waveshaped zero-attack blade slices + tight flesh cuts from ./sfx-core.
import { audioTimeMs, bladeSlice, canPlay, fleshImpact, fmTone, isAudioReady, noiseBurst, playSample, registerSample, tone } from './sfx-core'
import daggerHitUrl from './assets/sfx/dagger_hit.mp3'
import daggerHit2Url from './assets/sfx/dagger_hit_2.mp3'
import doubleSlashUrl from './assets/sfx/double_slash.mp3'

registerSample('dagger_hit', daggerHitUrl)
registerSample('dagger_hit_2', daggerHit2Url)
registerSample('double_slash', doubleSlashUrl)

export const THIEF_SFX_THROTTLE = {
  daggerSlash: 30,
  daggerHit: 0,
  daggerCrit: 0,
  daggerCritSpark: 55,
  doubleStrike: 35,
  shadowTick: 45,
  shadowForm: 120,
  shadowEvade: 45,
  luckyDodge: 50,
  shadowCounter: 40,
  maliceRelease: 60,
  venomStab: 45,
  smokeBomb: 100,
  sightlessRaid: 60,
  pickpocket: 50,
  stealLoot: 40,
  deepWound: 50,
  bladesEnd: 70,
  shadowDanceStart: 100,
  shadowSlash: 30,
  shadowFinisher: 80,
  poisonTick: 85,
  poisonContaminate: 75,
  poisonSpread: 80,
  poisonOverflow: 75,
  knifeThrow: 35,
  knifeBounce: 40,
  knifeLand: 30,
  voracityPickup: 60,
  backStab: 50,
  knifeStormBuild: 120,
  knifeStormFinale: 100,
  killReset: 70,
  shadowStep: 60,
  tendonCut: 60,
  debtCollectSlash: 100,
  debtPoisonDetonate: 65,
  debtRefund: 90,
  mobsterExecute: 80,
  nextJob: 70,
} as const

export interface BackStabSfxOpts {
  ambush?: boolean
  cp?: number
  shadow?: boolean
}

let lastCutMs = -1000
let cutBurst = 0

/** Reset RO double-attack burst stagger state (for unit tests). */
export function resetThiefSfxForTest(): void {
  lastCutMs = -1000
  cutBurst = 0
}

/** Stagger rapid Thief cuts by 66ms for RO Double-Attack cadence, capped at 3 per burst. */
function nextCutSlot(): { delay: number; pitch: number } | null {
  if (!isAudioReady()) return null
  const now = audioTimeMs()
  if (now - lastCutMs > 38) {
    lastCutMs = now
    cutBurst = 0
  } else if (cutBurst >= 2) {
    return null
  } else {
    cutBurst++
  }
  return { delay: cutBurst * 0.066, pitch: 1 + cutBurst * 0.085 }
}

export const thiefSfx = {
  // ===== Base Thief Core & Passives =====
  /** Pure crisp RO air-cut swing ("ชึ้บ! / ซวับ!"), alternating even/odd pitch (Mobster shifts darker). */
  daggerSlash: (hitN = 0, mobster = false): void => {
    if (!canPlay('daggerSlash', THIEF_SFX_THROTTLE.daggerSlash)) return
    const m = (hitN % 2 === 0 ? 1 : 1.09) * (mobster ? 0.85 : 1)
    bladeSlice({ dur: 0.068, vol: 0.34, f0: 9200 * m, f1: 2100 * m, q: 0.9, edgeFreq: 5400 * m, drive: 2.4 })
  },

  /** Razor-sharp RO dagger cut + meaty flesh impact, auto-staggered 66ms for Double Attack. */
  daggerHit: (mobster = false): void => {
    const slot = nextCutSlot()
    if (!slot) return
    const p = slot.pitch * (mobster ? 0.88 : 1)
    const sampleKey = Math.random() < 0.5 ? 'dagger_hit' : 'dagger_hit_2'
    if (playSample(sampleKey, { vol: 0.8, rate: p, delay: slot.delay, jitterPct: 0.06 })) return
    bladeSlice({ dur: 0.058, vol: 0.46, f0: 6800 * p, f1: 1450 * p, q: 0.9, edgeFreq: 4900 * p, drive: 3.5, delay: slot.delay })
    fleshImpact(0.44, 300 * p, 72, 0.044, slot.delay)
  },

  /** Iconic RO CRITICAL dagger gouge ("ชวิ๊ง-ฉั๊บ!") with tight steel crit glint. */
  daggerCrit: (mobster = false): void => {
    const slot = nextCutSlot()
    if (!slot) return
    const p = slot.pitch * (mobster ? 0.9 : 1)
    bladeSlice({ dur: 0.095, vol: 0.54, f0: 9600 * p, f1: 1600 * p, q: 0.85, edgeFreq: 6400 * p, drive: 4.2, delay: slot.delay })
    fleshImpact(0.5, 340, 58, 0.068, slot.delay)
    fmTone(2800 * p, 2400 * p, 1.5, 650, 0.105, 0.2, slot.delay + 0.004, { jitterPct: 0.04 })
  },

  /** Tight crit punch + crisp flash shimmer under critJuice for Thief line (replaces 8-bit critBoom). */
  daggerCritSpark: (): void => {
    if (!canPlay('daggerCritSpark', THIEF_SFX_THROTTLE.daggerCritSpark)) return
    tone('sine', 148, 42, 0.16, 0.42, 0)
    bladeSlice({ dur: 0.075, vol: 0.28, f0: 10500, f1: 3800, q: 1.5, edgeFreq: 7200, drive: 2.2, delay: 0.008 })
  },

  /** Razor glint accent landing on the 3rd beat (132ms) of Double Attack. */
  doubleStrike: (): void => {
    if (!canPlay('doubleStrike', THIEF_SFX_THROTTLE.doubleStrike)) return
    if (playSample('double_slash', { vol: 0.85, rate: 1, delay: 0.132, jitterPct: 0.05 })) return
    bladeSlice({ dur: 0.06, vol: 0.32, f0: 9800, f1: 2600, q: 1.05, edgeFreq: 6600, drive: 3.0, delay: 0.132 })
    tone('triangle', 2349, 3136, 0.055, 0.14, 0.134)
  },

  /** Subtle ascending shadowy glass chime as Shadow Gauge fills. */
  shadowTick: (gauge: number, max: number): void => {
    if (!canPlay('shadowTick', THIEF_SFX_THROTTLE.shadowTick)) return
    const ratio = Math.min(1, Math.max(0, gauge / Math.max(1, max)))
    const f = 392 * Math.pow(2, ratio * 0.75)
    tone('triangle', f, f * 1.12, 0.11, 0.13, 0, { attack: 0.008 })
    tone('sine', f * 1.5, f * 1.48, 0.12, 0.07, 0.02)
  },

  /** Dramatic Shadow Form activation (sub swell + rising phantom sweep + dark minor-9th chord). */
  shadowForm: (): void => {
    if (!canPlay('shadowForm', THIEF_SFX_THROTTLE.shadowForm)) return
    tone('sine', 95, 48, 0.38, 0.42, 0, { attack: 0.02 })
    noiseBurst(0.32, 0.28, 'bandpass', 420, 3200, 2.6, 0, 0.03)
    const chord = [311, 370, 466, 698]
    chord.forEach((f, i) => {
      tone('triangle', f, f * 1.01, 0.26, 0.12, i * 0.03, { attack: 0.01 })
      fmTone(f * 2, f * 2.02, 2.41, 320, 0.2, 0.07, i * 0.03, { attack: 0.01 })
    })
  },

  /** Sleek assassin sidestep evade whoosh. */
  shadowEvade: (): void => {
    if (!canPlay('shadowEvade', THIEF_SFX_THROTTLE.shadowEvade)) return
    noiseBurst(0.14, 0.24, 'bandpass', 3800, 1200, 1.8, 0, 0.005)
    tone('sine', 780, 420, 0.1, 0.11, 0.01, { jitterPct: 0.07 })
  },

  /** Nimble dodge whoosh + sparkling lucky chime for LUCKY! evade. */
  luckyDodge: (): void => {
    if (!canPlay('luckyDodge', THIEF_SFX_THROTTLE.luckyDodge)) return
    noiseBurst(0.12, 0.2, 'highpass', 3600, 1800, 1.2)
    tone('triangle', 1568, 1568, 0.07, 0.2, 0.01)
    tone('triangle', 2093, 2349, 0.1, 0.22, 0.055)
  },

  /** Counter strike from the shadows (phantom zip + razor blade cut + flesh impact). */
  shadowCounter: (): void => {
    if (!canPlay('shadowCounter', THIEF_SFX_THROTTLE.shadowCounter)) return
    noiseBurst(0.085, 0.22, 'bandpass', 1800, 5200, 2.2)
    bladeSlice({ dur: 0.095, vol: 0.48, f0: 8800, f1: 1500, q: 0.9, edgeFreq: 5800, drive: 3.8, delay: 0.02 })
    fleshImpact(0.46, 300, 62, 0.06, 0.02)
  },

  /** Sharp crimson snap + sub impact when releasing full Malice mark stacks. */
  maliceRelease: (): void => {
    if (!canPlay('maliceRelease', THIEF_SFX_THROTTLE.maliceRelease)) return
    fmTone(1480, 740, 1.414, 1400, 0.14, 0.28, 0)
    tone('sine', 150, 42, 0.24, 0.45, 0.01)
    tone('sawtooth', 880, 440, 0.12, 0.14, 0.02)
  },

  // ===== Base Thief Skill 1, Skill 2, Ult & Poison Ecosystem =====
  /** Skill 1 Venom Stab (RO Envenom): razor pierce + caustic acid hiss + bubbling venom blips. */
  venomStab: (): void => {
    if (!canPlay('venomStab', THIEF_SFX_THROTTLE.venomStab)) return
    bladeSlice({ dur: 0.065, vol: 0.42, f0: 8200, f1: 1700, q: 0.95, edgeFreq: 5400, drive: 3.4 })
    noiseBurst(0.24, 0.25, 'bandpass', 2800, 850, 3.0, 0.035, 0.01)
    tone('sine', 620, 340, 0.06, 0.14, 0.05)
    tone('sine', 510, 840, 0.055, 0.12, 0.1)
    tone('sine', 440, 260, 0.07, 0.11, 0.15)
  },

  /** Skill 2 Smoke Bomb: smoke-pellet pop + billowing lowpass/bandpass cloud. */
  smokeBomb: (): void => {
    if (!canPlay('smokeBomb', THIEF_SFX_THROTTLE.smokeBomb)) return
    tone('sine', 210, 48, 0.16, 0.42, 0)
    noiseBurst(0.42, 0.34, 'lowpass', 2400, 320, 1.4, 0.02, 0.015)
    noiseBurst(0.32, 0.18, 'bandpass', 1400, 480, 2.0, 0.04, 0.02)
  },

  /** Shroud follow-up Sightless Raid: blinding high flash ping + rapid twin ambush cross-cut. */
  sightlessRaid: (): void => {
    if (!canPlay('sightlessRaid', THIEF_SFX_THROTTLE.sightlessRaid)) return
    tone('sine', 2637, 1760, 0.14, 0.18, 0, { attack: 0.004 })
    bladeSlice({ dur: 0.072, vol: 0.46, f0: 8600, f1: 1500, q: 0.9, edgeFreq: 5600, drive: 3.8, delay: 0.01 })
    fleshImpact(0.42, 280, 64, 0.05, 0.012)
    bladeSlice({ dur: 0.075, vol: 0.44, f0: 9400, f1: 1700, q: 0.9, edgeFreq: 6200, drive: 3.8, delay: 0.068 })
    fleshImpact(0.38, 310, 68, 0.048, 0.068)
  },

  /** Skill 2 Pickpocket: sly blade flick + zippy upward snatch + cheeky coin-pouch clink. */
  pickpocket: (): void => {
    if (!canPlay('pickpocket', THIEF_SFX_THROTTLE.pickpocket)) return
    noiseBurst(0.08, 0.22, 'bandpass', 4400, 2000, 2.2)
    tone('triangle', 520, 1180, 0.08, 0.2, 0.02)
    tone('triangle', 2093, 2093, 0.055, 0.2, 0.06)
    tone('triangle', 2637, 2637, 0.07, 0.22, 0.105)
    tone('sine', 3136, 3136, 0.07, 0.14, 0.14)
  },

  /** Staggered nimble stat-steal chime (each stolen stat gets its own throttle slot). */
  stealLoot: (index = 0): void => {
    if (!canPlay(`stealLoot:${index}`, THIEF_SFX_THROTTLE.stealLoot)) return
    const delay = Math.max(0, index) * 0.065
    tone('sine', 1047 + index * 220, 1568 + index * 260, 0.085, 0.17, delay)
    tone('triangle', 1568 + index * 220, 2093 + index * 260, 0.09, 0.15, delay + 0.03)
  },

  /** Skill 2 Deep Wound: brutal low-mid heavy tearing rend + bleed tear + toxic drip. */
  deepWound: (): void => {
    if (!canPlay('deepWound', THIEF_SFX_THROTTLE.deepWound)) return
    bladeSlice({ dur: 0.13, vol: 0.5, f0: 5600, f1: 880, q: 0.85, edgeFreq: 3800, drive: 4.3 })
    fleshImpact(0.48, 250, 54, 0.085)
    tone('sawtooth', 260, 82, 0.14, 0.16, 0.01, { jitterPct: 0.05 })
    tone('sine', 540, 280, 0.08, 0.12, 0.08)
  },

  /** Wound threshold Blade's End finisher: quick unsheathe SHING! + devastating downward execution tear. */
  bladesEnd: (): void => {
    if (!canPlay('bladesEnd', THIEF_SFX_THROTTLE.bladesEnd)) return
    bladeSlice({ dur: 0.055, vol: 0.34, f0: 2400, f1: 8800, q: 1.2, edgeFreq: 6400, drive: 2.6 })
    bladeSlice({ dur: 0.16, vol: 0.54, f0: 8800, f1: 950, q: 0.85, edgeFreq: 5600, drive: 4.5, delay: 0.052 })
    tone('sine', 155, 36, 0.28, 0.5, 0.052)
  },

  /** Thief Ult Shadow Dance intro: ghostly vanish sweep + dark sub drop. */
  shadowDanceStart: (): void => {
    if (!canPlay('shadowDanceStart', THIEF_SFX_THROTTLE.shadowDanceStart)) return
    noiseBurst(0.24, 0.28, 'bandpass', 600, 3800, 2.4, 0, 0.02)
    tone('sine', 140, 52, 0.25, 0.36, 0)
    tone('triangle', 587, 880, 0.18, 0.16, 0.03)
  },

  /** Per-dart Shadow Dance cut (RO Sonic Blow / Grimtooth): phantom zip + rising razor blade slice. */
  shadowSlash: (step = 0, total = 4): void => {
    if (!canPlay('shadowSlash', THIEF_SFX_THROTTLE.shadowSlash)) return
    const ratio = Math.min(1, Math.max(0, step) / Math.max(1, total - 1))
    const semi = Math.min(8, ratio * 6 + step * 0.4)
    const p = Math.pow(2, semi / 12)
    noiseBurst(0.055, 0.18, 'highpass', 3000 * p, 5200, 1.5)
    bladeSlice({ dur: 0.078, vol: 0.46, f0: 7600 * p, f1: 1600 * p, q: 0.9, edgeFreq: 5200 * p, drive: 3.8, delay: 0.008 })
    fleshImpact(0.4, 280, 68, 0.05, 0.008)
  },

  /** Shadow Dance closing finisher stab: twin-X cross-slash + phantom boom + high steel ring. */
  shadowFinisher: (): void => {
    if (!canPlay('shadowFinisher', THIEF_SFX_THROTTLE.shadowFinisher)) return
    bladeSlice({ dur: 0.11, vol: 0.5, f0: 8800, f1: 1250, q: 0.85, edgeFreq: 5800, drive: 4.4, delay: 0 })
    bladeSlice({ dur: 0.13, vol: 0.52, f0: 9400, f1: 1050, q: 0.85, edgeFreq: 6200, drive: 4.4, delay: 0.042 })
    tone('sine', 175, 36, 0.34, 0.52, 0.01)
    fmTone(2637, 1760, 2.41, 900, 0.18, 0.2, 0.03)
  },

  /** Soft caustic sizzle + toxic bubble when poison ticks on a monster. */
  poisonTick: (): void => {
    if (!canPlay('poisonTick', THIEF_SFX_THROTTLE.poisonTick)) return
    noiseBurst(0.11, 0.13, 'bandpass', 2400, 1100, 3.8, 0, 0.01)
    tone('sine', 420, 680, 0.05, 0.09, 0.02, { jitterPct: 0.12 })
  },

  /** Contaminate poison detonation: pressurized pop + caustic blast (+ crystalline crit shimmer). */
  poisonContaminate: (crit = false): void => {
    if (!canPlay('poisonContaminate', THIEF_SFX_THROTTLE.poisonContaminate)) return
    tone('sine', crit ? 190 : 155, 38, crit ? 0.32 : 0.24, crit ? 0.5 : 0.4, 0)
    noiseBurst(0.32, 0.32, 'bandpass', 2600, 520, 2.2, 0.02)
    tone('triangle', 680, 260, 0.1, 0.16, 0.04)
    tone('sine', 920, 440, 0.09, 0.14, 0.08)
    if (crit) fmTone(2093, 1320, 2.41, 1100, 0.18, 0.2, 0.02)
  },

  /** Poison explosion on kill: popping spore rupture + scattering venom spray. */
  poisonSpread: (): void => {
    if (!canPlay('poisonSpread', THIEF_SFX_THROTTLE.poisonSpread)) return
    tone('sine', 240, 75, 0.16, 0.34, 0)
    noiseBurst(0.26, 0.26, 'bandpass', 3200, 900, 2.8, 0.025)
    tone('sine', 520, 960, 0.06, 0.12, 0.05)
    tone('sine', 640, 1120, 0.06, 0.11, 0.095)
  },

  /** Mobster poison overflow burst: snappy overpressure acid pop. */
  poisonOverflow: (): void => {
    if (!canPlay('poisonOverflow', THIEF_SFX_THROTTLE.poisonOverflow)) return
    tone('triangle', 360, 120, 0.12, 0.26, 0, { jitterPct: 0.08 })
    noiseBurst(0.14, 0.22, 'bandpass', 3000, 1000, 3.4, 0.01)
  },

  // ===== 2nd Job 1: Rogue =====
  /** Crisp spinning thrown dagger fwip! */
  knifeThrow: (): void => {
    if (!canPlay('knifeThrow', THIEF_SFX_THROTTLE.knifeThrow)) return
    bladeSlice({ dur: 0.052, vol: 0.3, f0: 7600, f1: 2800, q: 1.5, edgeFreq: 5400, drive: 2.2 })
  },

  /** Ricocheting dagger metallic tink-zip. */
  knifeBounce: (): void => {
    if (!canPlay('knifeBounce', THIEF_SFX_THROTTLE.knifeBounce)) return
    fmTone(3300, 2400, 2.76, 950, 0.07, 0.18, 0, { jitterPct: 0.09 })
    tone('sine', 1800, 3100, 0.05, 0.12, 0.015)
  },

  /** Diving storm dagger arrival glint + light metallic ping. */
  knifeLand: (step = 0, total = 8): void => {
    if (!canPlay('knifeLand', THIEF_SFX_THROTTLE.knifeLand)) return
    const ratio = Math.min(1, Math.max(0, step) / Math.max(1, total - 1))
    const p = 1 + ratio * 0.35
    bladeSlice({ dur: 0.05, vol: 0.32, f0: 8400 * p, f1: 2400 * p, q: 1.2, edgeFreq: 6000 * p, drive: 3.0 })
    fmTone(2200 * p, 1650 * p, 2.41, 450, 0.05, 0.12, 0)
  },

  /** Voracity Mark pickup: upward steel pull-shing + circular Sinister Steel cut + warm gold chime. */
  voracityPickup: (marks = 1): void => {
    if (!canPlay('voracityPickup', THIEF_SFX_THROTTLE.voracityPickup)) return
    const intensity = Math.min(5, Math.max(1, marks))
    bladeSlice({ dur: 0.055, vol: 0.34, f0: 2200 + intensity * 180, f1: 7800 + intensity * 240, q: 1.2, edgeFreq: 5800, drive: 2.8 })
    bladeSlice({ dur: 0.14, vol: 0.48, f0: 7400, f1: 1200, q: 0.9, edgeFreq: 5200, drive: 3.8, delay: 0.048 })
    tone('triangle', 1568, 2093, 0.11, 0.16, 0.07)
  },

  /** Iconic RO Rogue Back Stab (supports Shadow Ambush swell, Combo Point boost, or Living Shadow echo). */
  backStab: (opts?: BackStabSfxOpts): void => {
    if (!canPlay('backStab', THIEF_SFX_THROTTLE.backStab)) return
    const cpBoost = 1 + Math.min(5, Math.max(0, opts?.cp ?? 0)) * 0.045
    if (opts?.ambush) {
      noiseBurst(0.16, 0.26, 'bandpass', 900, 3400, 2.4, 0, 0.01)
      tone('triangle', 294, 440, 0.18, 0.18, 0)
    }
    if (opts?.shadow) {
      bladeSlice({ dur: 0.12, vol: 0.46, f0: 7800, f1: 1350, q: 0.9, edgeFreq: 5400, drive: 3.6, delay: 0.008 })
      tone('triangle', 587, 392, 0.2, 0.16, 0.012)
      tone('sine', 150, 48, 0.22, 0.36, 0.012)
      return
    }
    noiseBurst(0.025, 0.28, 'highpass', 3200, 1800, 1.0, 0, 0)
    bladeSlice({ dur: 0.14, vol: 0.55, f0: 9400 * cpBoost, f1: 1050 * cpBoost, q: 0.82, edgeFreq: 6200 * cpBoost, drive: 4.6 })
    tone('sine', 180, 38, 0.25, 0.52, 0.006)
    fmTone(2960 * cpBoost, 1975 * cpBoost, 2.0, 900, 0.14, 0.22, 0.012)
  },

  /** Whirling knife-ring buildup synced to the storm's collapse duration (seconds). */
  knifeStormBuild: (durSec = 0.75): void => {
    if (!canPlay('knifeStormBuild', THIEF_SFX_THROTTLE.knifeStormBuild)) return
    const d = Math.min(1.8, Math.max(0.25, durSec))
    noiseBurst(d, 0.26, 'bandpass', 500, 4200, 3.2, 0, d * 0.15)
    const count = 6
    for (let k = 0; k < count; k++) {
      const tK = (k / count) * d * 0.85
      fmTone(1100 + k * 240, 1300 + k * 280, 2.76, 700, 0.09, 0.14, tK)
    }
    fmTone(2637, 3520, 2.76, 1400, 0.12, 0.26, Math.max(0.05, d - 0.08))
  },

  /** Final diving knife impact of Knife Storm: massive golden blade-drop tear + sub boom + steel chord. */
  knifeStormFinale: (): void => {
    if (!canPlay('knifeStormFinale', THIEF_SFX_THROTTLE.knifeStormFinale)) return
    bladeSlice({ dur: 0.18, vol: 0.54, f0: 9600, f1: 950, q: 0.85, edgeFreq: 6400, drive: 4.6 })
    tone('sine', 190, 34, 0.42, 0.55, 0)
    fmTone(2093, 1568, 2.41, 1100, 0.24, 0.22, 0.01)
    tone('triangle', 1047, 1047, 0.24, 0.15, 0.02)
    tone('triangle', 1319, 1319, 0.24, 0.13, 0.04)
  },

  /** Crisp assassin refresh double-chime + blade flick on Kill Reset. */
  killReset: (): void => {
    if (!canPlay('killReset', THIEF_SFX_THROTTLE.killReset)) return
    tone('triangle', 1175, 1175, 0.07, 0.2, 0)
    tone('triangle', 1760, 2349, 0.11, 0.24, 0.055)
    fmTone(2800, 2200, 2.76, 700, 0.06, 0.14, 0.04)
  },

  /** Rapid phantom slip for Rogue combo shadow-step dodge stack. */
  shadowStep: (): void => {
    if (!canPlay('shadowStep', THIEF_SFX_THROTTLE.shadowStep)) return
    noiseBurst(0.13, 0.22, 'bandpass', 2200, 4800, 2.4, 0, 0.005)
    tone('sine', 660, 990, 0.09, 0.12, 0.015)
  },

  // ===== 2nd Job 2: Mobster =====
  /** Skill 3 Tendon Cut: heavy chain-snap + brutal dark saturated blade slice + cripple groan. */
  tendonCut: (): void => {
    if (!canPlay('tendonCut', THIEF_SFX_THROTTLE.tendonCut)) return
    fmTone(1950, 1480, 3.14, 1400, 0.07, 0.22, 0)
    fmTone(2550, 1800, 3.14, 1100, 0.06, 0.18, 0.025)
    bladeSlice({ dur: 0.13, vol: 0.5, f0: 5200, f1: 780, q: 0.85, edgeFreq: 3600, drive: 4.4, delay: 0.018 })
    fleshImpact(0.46, 220, 52, 0.08, 0.018)
    tone('triangle', 340, 130, 0.24, 0.2, 0.08)
  },

  /** Mobster Ult Debt Collection AoE sweep: ominous Mafia bell toll + wide sweeping dark blade slice. */
  debtCollectSlash: (): void => {
    if (!canPlay('debtCollectSlash', THIEF_SFX_THROTTLE.debtCollectSlash)) return
    fmTone(294, 290, 2.76, 620, 0.45, 0.26, 0, { attack: 0.008 })
    tone('sine', 147, 55, 0.36, 0.44, 0)
    bladeSlice({ dur: 0.2, vol: 0.5, f0: 6400, f1: 850, q: 0.85, edgeFreq: 4200, drive: 4.2, delay: 0.02 })
  },

  /** Debt Collection purple poison burst per poisoned monster. */
  debtPoisonDetonate: (): void => {
    if (!canPlay('debtPoisonDetonate', THIEF_SFX_THROTTLE.debtPoisonDetonate)) return
    tone('sine', 180, 38, 0.28, 0.44, 0)
    noiseBurst(0.28, 0.3, 'bandpass', 2200, 420, 2.4, 0.02)
    fmTone(880, 320, 1.618, 1100, 0.16, 0.2, 0.03)
  },

  /** Cold ledger-closed coin-bell chord on Debt Collection Ult cooldown refund. */
  debtRefund: (): void => {
    if (!canPlay('debtRefund', THIEF_SFX_THROTTLE.debtRefund)) return
    fmTone(988, 988, 2.76, 480, 0.18, 0.18, 0)
    tone('triangle', 1480, 1480, 0.14, 0.18, 0.06)
    tone('triangle', 1976, 1976, 0.2, 0.2, 0.11)
  },

  /** Mobster Execute: razor guillotine slice + lethal slam + chilling funeral bell. */
  mobsterExecute: (): void => {
    if (!canPlay('mobsterExecute', THIEF_SFX_THROTTLE.mobsterExecute)) return
    bladeSlice({ dur: 0.14, vol: 0.54, f0: 8800, f1: 720, q: 0.85, edgeFreq: 5600, drive: 4.6 })
    tone('sine', 150, 32, 0.38, 0.52, 0.035)
    fmTone(440, 434, 2.756, 900, 0.55, 0.26, 0.045, { attack: 0.004 })
    tone('triangle', 622, 616, 0.42, 0.14, 0.055)
  },

  /** Next Job extra turn: slick double-snap blade-cock + crisp up-sweep. */
  nextJob: (): void => {
    if (!canPlay('nextJob', THIEF_SFX_THROTTLE.nextJob)) return
    fmTone(2100, 2400, 2.76, 700, 0.045, 0.2, 0)
    fmTone(2800, 3300, 2.76, 800, 0.065, 0.22, 0.055)
    tone('triangle', 740, 1175, 0.09, 0.16, 0.05)
  },
}

export type ThiefSfxKey = keyof typeof thiefSfx
export const THIEF_SFX_KEYS = Object.keys(thiefSfx) as ThiefSfxKey[]
