// Thief-line procedural Web Audio SFX: Base Thief, Rogue, and Mobster.
// Pure synth (no audio files) using headroom-safe primitives from ./sfx-core.
import { canPlay, fmTone, noiseBurst, tone } from './sfx-core'

export const THIEF_SFX_THROTTLE = {
  daggerSlash: 35,
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

export const thiefSfx = {
  // ===== Base Thief Core & Passives =====
  /** Twin-blade slash matching Thief's 2-hit basic & daggerCrossFx (Mobster shifts darker). */
  daggerSlash: (hitN = 0, mobster = false): void => {
    if (!canPlay('daggerSlash', THIEF_SFX_THROTTLE.daggerSlash)) return
    const alt = hitN % 2 === 0 ? 1 : 1.07
    const baseMul = mobster ? 0.84 : 1
    const m = alt * baseMul
    noiseBurst(0.065, 0.22, 'bandpass', 5200 * baseMul, 1500 * baseMul, 2.2, 0)
    fmTone(1650 * m, 920 * m, 2.76, 900, 0.055, 0.16, 0, { jitterPct: 0.06 })
    noiseBurst(0.06, 0.2, 'bandpass', 6000 * baseMul, 1800 * baseMul, 2.4, 0.042)
    fmTone(1980 * m, 1180 * m, 2.76, 1000, 0.05, 0.15, 0.042, { jitterPct: 0.06 })
  },

  /** Snappy ascending steel twin-glint for DOUBLE! Strike. */
  doubleStrike: (): void => {
    if (!canPlay('doubleStrike', THIEF_SFX_THROTTLE.doubleStrike)) return
    fmTone(1760, 2349, 2.41, 750, 0.065, 0.2, 0, { jitterPct: 0.05 })
    fmTone(2349, 3136, 2.41, 850, 0.08, 0.22, 0.045, { jitterPct: 0.05 })
    noiseBurst(0.05, 0.18, 'highpass', 4200, 2000, 1.0, 0.01)
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

  /** Counter strike from the shadows (phantom zip + razor slash + thump). */
  shadowCounter: (): void => {
    if (!canPlay('shadowCounter', THIEF_SFX_THROTTLE.shadowCounter)) return
    noiseBurst(0.1, 0.26, 'bandpass', 1800, 5200, 2.2)
    fmTone(2100, 1050, 2.76, 1300, 0.11, 0.26, 0.025, { jitterPct: 0.05 })
    tone('sine', 180, 70, 0.12, 0.28, 0.02)
  },

  /** Sharp crimson snap + sub impact when releasing full Malice mark stacks. */
  maliceRelease: (): void => {
    if (!canPlay('maliceRelease', THIEF_SFX_THROTTLE.maliceRelease)) return
    fmTone(1480, 740, 1.414, 1400, 0.14, 0.28, 0)
    tone('sine', 150, 42, 0.24, 0.45, 0.01)
    tone('sawtooth', 880, 440, 0.12, 0.14, 0.02)
  },

  // ===== Base Thief Skill 1, Skill 2, Ult & Poison Ecosystem =====
  /** Skill 1 Venom Stab: steel thrust + caustic acid hiss + bubbling venom blips. */
  venomStab: (): void => {
    if (!canPlay('venomStab', THIEF_SFX_THROTTLE.venomStab)) return
    fmTone(1850, 820, 2.76, 1100, 0.07, 0.24, 0, { jitterPct: 0.05 })
    noiseBurst(0.24, 0.26, 'bandpass', 2800, 900, 3.2, 0.04, 0.01)
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

  /** Shroud follow-up Sightless Raid: blinding high flash ping + sudden twin ambush cut. */
  sightlessRaid: (): void => {
    if (!canPlay('sightlessRaid', THIEF_SFX_THROTTLE.sightlessRaid)) return
    tone('sine', 2637, 1760, 0.16, 0.18, 0, { attack: 0.004 })
    fmTone(2200, 1100, 2.76, 1300, 0.09, 0.24, 0.015)
    noiseBurst(0.12, 0.28, 'bandpass', 5000, 1100, 2.0, 0.01)
    tone('sine', 160, 58, 0.16, 0.32, 0.02)
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

  /** Skill 2 Deep Wound: gritty armor-piercing rend + tearing noise + toxic drip. */
  deepWound: (): void => {
    if (!canPlay('deepWound', THIEF_SFX_THROTTLE.deepWound)) return
    tone('sawtooth', 320, 95, 0.16, 0.26, 0, { jitterPct: 0.05 })
    fmTone(1550, 620, 1.73, 1500, 0.13, 0.26, 0)
    noiseBurst(0.18, 0.3, 'bandpass', 2400, 650, 2.6, 0.015)
    tone('sine', 540, 280, 0.08, 0.13, 0.08)
  },

  /** Wound threshold Blade's End finisher: steel draw SHING + visceral execution slash. */
  bladesEnd: (): void => {
    if (!canPlay('bladesEnd', THIEF_SFX_THROTTLE.bladesEnd)) return
    fmTone(2400, 3200, 2.76, 1200, 0.08, 0.2, 0)
    tone('sine', 155, 38, 0.28, 0.5, 0.055)
    noiseBurst(0.18, 0.32, 'bandpass', 3600, 700, 2.0, 0.055)
    fmTone(1320, 520, 1.414, 1600, 0.2, 0.26, 0.06)
  },

  /** Thief Ult Shadow Dance intro: ghostly vanish sweep + dark sub drop. */
  shadowDanceStart: (): void => {
    if (!canPlay('shadowDanceStart', THIEF_SFX_THROTTLE.shadowDanceStart)) return
    noiseBurst(0.24, 0.28, 'bandpass', 600, 3800, 2.4, 0, 0.02)
    tone('sine', 140, 52, 0.25, 0.36, 0)
    tone('triangle', 587, 880, 0.18, 0.16, 0.03)
  },

  /** Per-dart Shadow Dance cut climbing in pitch across the sequence. */
  shadowSlash: (step = 0, total = 4): void => {
    if (!canPlay('shadowSlash', THIEF_SFX_THROTTLE.shadowSlash)) return
    const ratio = Math.min(1, Math.max(0, step) / Math.max(1, total - 1))
    const semi = Math.min(8, ratio * 6 + step * 0.4)
    const p = Math.pow(2, semi / 12)
    noiseBurst(0.065, 0.2, 'highpass', 3000 * p, 5200, 1.5)
    fmTone(1450 * p, 780 * p, 2.76, 1100, 0.095, 0.23, 0.01, { jitterPct: 0.04 })
    tone('sine', 150, 62, 0.09, 0.22, 0.01)
  },

  /** Shadow Dance closing finisher stab: phantom boom + piercing twin steel ring. */
  shadowFinisher: (): void => {
    if (!canPlay('shadowFinisher', THIEF_SFX_THROTTLE.shadowFinisher)) return
    tone('sine', 175, 36, 0.34, 0.52, 0)
    fmTone(2217, 1320, 2.76, 1700, 0.24, 0.28, 0.01)
    fmTone(3136, 1975, 2.76, 1100, 0.2, 0.18, 0.045)
    noiseBurst(0.2, 0.3, 'bandpass', 4800, 900, 1.8, 0.01)
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
  /** Spinning flying dagger throw: fast bandpass air-cut + steel whistle. */
  knifeThrow: (): void => {
    if (!canPlay('knifeThrow', THIEF_SFX_THROTTLE.knifeThrow)) return
    noiseBurst(0.075, 0.2, 'bandpass', 4600, 2200, 3.0, 0, 0.004)
    fmTone(2600, 1950, 2.76, 650, 0.055, 0.14, 0, { jitterPct: 0.1 })
  },

  /** Ricocheting dagger metallic tink-zip. */
  knifeBounce: (): void => {
    if (!canPlay('knifeBounce', THIEF_SFX_THROTTLE.knifeBounce)) return
    fmTone(3300, 2400, 2.76, 950, 0.07, 0.18, 0, { jitterPct: 0.09 })
    tone('sine', 1800, 3100, 0.05, 0.12, 0.015)
  },

  /** Diving storm dagger impact climbing in pitch across the barrage. */
  knifeLand: (step = 0, total = 8): void => {
    if (!canPlay('knifeLand', THIEF_SFX_THROTTLE.knifeLand)) return
    const ratio = Math.min(1, Math.max(0, step) / Math.max(1, total - 1))
    const p = 1 + ratio * 0.35
    fmTone(1900 * p, 980 * p, 2.76, 1050, 0.075, 0.2, 0, { jitterPct: 0.06 })
    tone('sine', 165, 68, 0.07, 0.22, 0)
  },

  /** Voracity Mark pickup + Sinister Steel circular sweep. */
  voracityPickup: (marks = 1): void => {
    if (!canPlay('voracityPickup', THIEF_SFX_THROTTLE.voracityPickup)) return
    const intensity = Math.min(5, Math.max(1, marks))
    fmTone(1320 + intensity * 140, 2640 + intensity * 180, 2.76, 900, 0.08, 0.2, 0)
    noiseBurst(0.18, 0.28, 'bandpass', 4800, 1200, 2.0, 0.05)
    fmTone(1760, 1047, 2.41, 1300, 0.16, 0.24, 0.055)
    tone('triangle', 1568, 2093, 0.12, 0.18, 0.08)
  },

  /** Iconic Rogue Back Stab (supports Shadow Ambush swell, Combo Point pitch boost, or Living Shadow echo). */
  backStab: (opts?: BackStabSfxOpts): void => {
    if (!canPlay('backStab', THIEF_SFX_THROTTLE.backStab)) return
    const cpBoost = 1 + Math.min(5, Math.max(0, opts?.cp ?? 0)) * 0.045
    if (opts?.ambush) {
      noiseBurst(0.16, 0.26, 'bandpass', 900, 3400, 2.4, 0, 0.01)
      tone('triangle', 294, 440, 0.18, 0.18, 0)
    }
    if (opts?.shadow) {
      tone('triangle', 587, 392, 0.22, 0.18, 0.01)
      fmTone(2400, 1600, 2.76, 1200, 0.16, 0.22, 0.015)
      tone('sine', 150, 48, 0.22, 0.36, 0.015)
      return
    }
    fmTone(2349 * cpBoost, 1175 * cpBoost, 2.76, 1800, 0.16, 0.3, 0)
    fmTone(3520 * cpBoost, 2093 * cpBoost, 2.41, 1000, 0.12, 0.18, 0.025)
    tone('sine', 185, 40, 0.28, 0.5, 0.008)
    noiseBurst(0.14, 0.3, 'highpass', 2600, 900, 1.4, 0.005)
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

  /** Final diving knife impact of Knife Storm (thunderous boom + golden triumphant steel ring). */
  knifeStormFinale: (): void => {
    if (!canPlay('knifeStormFinale', THIEF_SFX_THROTTLE.knifeStormFinale)) return
    tone('sine', 190, 34, 0.42, 0.55, 0)
    fmTone(2093, 1568, 2.76, 1900, 0.32, 0.28, 0.01)
    fmTone(3136, 2637, 2.41, 1100, 0.28, 0.2, 0.03)
    tone('triangle', 1047, 1047, 0.26, 0.16, 0.02)
    tone('triangle', 1319, 1319, 0.26, 0.14, 0.04)
    noiseBurst(0.22, 0.3, 'bandpass', 4200, 800, 1.6, 0)
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
  /** Skill 3 Tendon Cut: metallic chain-snap + heavy lilac slash + cripple groan. */
  tendonCut: (): void => {
    if (!canPlay('tendonCut', THIEF_SFX_THROTTLE.tendonCut)) return
    fmTone(1950, 1480, 3.14, 1500, 0.08, 0.24, 0)
    fmTone(2550, 1800, 3.14, 1200, 0.07, 0.2, 0.03)
    noiseBurst(0.16, 0.3, 'bandpass', 2800, 750, 2.0, 0.02)
    tone('sawtooth', 260, 85, 0.18, 0.25, 0.03)
    tone('triangle', 340, 130, 0.24, 0.2, 0.08)
  },

  /** Mobster Ult Debt Collection AoE sweep: ominous Mafia bell toll + wide sweeping blade. */
  debtCollectSlash: (): void => {
    if (!canPlay('debtCollectSlash', THIEF_SFX_THROTTLE.debtCollectSlash)) return
    fmTone(294, 290, 2.76, 620, 0.45, 0.26, 0, { attack: 0.008 })
    tone('sine', 147, 55, 0.36, 0.44, 0)
    noiseBurst(0.24, 0.32, 'bandpass', 3600, 620, 1.8, 0.02)
    fmTone(1480, 680, 1.73, 1400, 0.18, 0.24, 0.03)
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

  /** Mobster Execute: guillotine blade drop + lethal slam + chilling funeral bell. */
  mobsterExecute: (): void => {
    if (!canPlay('mobsterExecute', THIEF_SFX_THROTTLE.mobsterExecute)) return
    noiseBurst(0.11, 0.28, 'bandpass', 5400, 900, 2.4, 0)
    tone('sine', 150, 32, 0.38, 0.52, 0.04)
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
