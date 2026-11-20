// Derived stat rows (label, value) shown on the Character screen and the in-battle pause menu.
import { BATTLE, COMBO, comboExtra, doubleAtkChance, PLAYER, STAT_CAPS, type Stats } from './game-data'
import type { JobId } from './jobs'
import type { Job2Id } from './jobs2'
import { KIT2, magicPower } from './skill-math'

export interface HitsPerTurnEst {
  baseHitsPerSwing: number
  avgHitsPerSwing: number
  maxHitsPerSwing: number
  avgSwings: number
  maxSwings: number
  avgHits: number
  maxHits: number
}

export const turnSpeedOf = (st: Stats): number => BATTLE.heroSpeed * (st.aspd / PLAYER.aspd)
export const turnRatioVsRef = (st: Stats, refSpeed = BATTLE.heroSpeed): number => turnSpeedOf(st) / Math.max(1, refSpeed)

export function estimateHitsPerTurn(st: Stats, job: JobId = 'novice', job2?: Job2Id): HitsPerTurnEst {
  const baseHitsPerSwing = job === 'thief' ? 2 : 1
  const dbl = doubleAtkChance(st.doubleAtk)
  const venomHit = job === 'thief' && st.thS1Matk > 0 && st.matk > 0 ? 1 : 0
  const avgHitsPerSwing = baseHitsPerSwing + dbl + venomHit
  const maxHitsPerSwing = baseHitsPerSwing + (st.doubleAtk > 0 ? 1 : 0) + venomHit
  const maxChain = COMBO.baseCount + st.comboCount
  const effCombo = Math.max(0, Math.min(1, st.combo))
  const avgSwings = 1 + comboExtra(effCombo, maxChain)
  const maxSwings = effCombo > 0 ? 1 + maxChain : 1
  const rogueKnives = job2 === 'rogue' ? KIT2.rogue.knifePerCombo + Math.max(0, st.j2KnifeAdd) : 0
  const shadowFinisher = job2 === 'rogue' && st.j2LivingShadow > 0 && maxSwings >= KIT2.rogue.comboShadowAt ? 1 : 0
  const avgHits = avgSwings * avgHitsPerSwing + (avgSwings - 1) * rogueKnives
  const maxHits = maxSwings * maxHitsPerSwing + (maxSwings - 1) * rogueKnives + shadowFinisher
  return { baseHitsPerSwing, avgHitsPerSwing, maxHitsPerSwing, avgSwings, maxSwings, avgHits, maxHits }
}

export function derivedRows(st: Stats, job: JobId = 'novice', job2?: Job2Id): [string, string][] {
  const pct = (n: number) => `${Math.round(n * 100)}%`
  const physPen = Math.min(STAT_CAPS.physPen, Math.max(0, st.physPen))
  const magPen = Math.min(STAT_CAPS.magPen, Math.max(0, st.magPen))
  const elemDmg = Math.min(STAT_CAPS.elemDmg, Math.max(0, st.elemDmg))
  const hpt = estimateHitsPerTurn(st, job, job2)
  const spd = turnSpeedOf(st)
  const ratio = turnRatioVsRef(st)
  return [
    ['HP', `${Math.round(st.maxHp)}`],
    ['P.ATK (ต่ำ~สูง)', `${Math.round(st.atk * st.minPct)}~${Math.round(st.atk)}`],
    ['M.ATK / พลังเวท (70%M+30%P)', `${Math.round(st.matk)} / ${Math.round(magicPower(st))}`], // พร v2: magic hits use magic power
    ['ดาเมจสกิลกายภาพ / ธาตุ', `+${(st.pskill * 100).toFixed(1)}% / +${pct(elemDmg)} (สูงสุด +${pct(STAT_CAPS.elemDmg)})`],
    ['เจาะเกราะ กาย / เวท', `${pct(physPen)} / ${pct(magPen)} (สูงสุด ${pct(STAT_CAPS.physPen)})`],
    ['P.DEF / M.DEF', `${Math.round(st.def)}(${Math.round(100 - 10000 / (100 + st.def))}%) / ${pct(st.mdef)}`],
    ['Hit / Flee / ต้านทาน', `${Math.round(st.hit)} / ${Math.round(st.flee)} / ${pct(st.tenacity)}`], // v94: ต้านทาน moved here so the crit row can show physical / magic crit
    ['คริ ตี / สกิล / เวท', `${(st.crit * 100).toFixed(1)}% / ${(st.skillCrit * 100).toFixed(1)}% / ${(st.spellCrit * 100).toFixed(1)}%`], // Sage rework v1: basic / skill (skillCrit, CRIT_RULES) / proc+magic. v94: physical crit (basic, smash, skills) / magic crit (spears, card spells, Dawn Light bonus): see docs/design/crit-mechanic.md
    ['สวนกลับ / คอมโบ', `${pct(st.counter)} / ${pct(st.combo)} ต่อ${COMBO.baseCount + st.comboCount}${st.comboDmg ? ` ดาเมจ+${pct(st.comboDmg)}` : ''}`], // combo rework: chain length + Combo DMG%
    ['Hits / เทิร์น (ตีปกติ)', `เฉลี่ย ${hpt.avgHits.toFixed(1)} · สูงสุด ${hpt.maxHits} ฮิต`],
    ['ความเร็วเทิร์น (เกจ 100)', `${spd.toFixed(1)} (~${ratio.toFixed(2)}x มอน)`],
    ['ฟื้น HP / ฮีลแรง', `${(st.regen * 1.5).toFixed(2)}%/เทิร์น · +${pct(st.healAmp)}`],
    ['ดูดเลือด / สกิล / หลบฟื้น', `${pct(st.lifesteal)} / ${pct(st.spellVamp)} / ${(st.dodgeHeal * 100).toFixed(1)}%`],
    ['ดาเมจคริ / โล่ต้นเวฟ', `${pct(st.critMul)} / ${pct(st.waveShield)}`],
    ['Max Mana / ฟื้น/เทิร์น', `${Math.round(st.maxRes)} / ${Math.round(st.resRegen * 3)}${st.strManaMiss > 0 ? ` +${Math.round(st.strManaMiss * 100)}% ที่หาย` : ''}`],
    ['หลบโชคดี / ดรอปหายาก', `${(st.luckyDodge * 100).toFixed(1)}% / ${(st.dropChance * 100).toFixed(1)}%`],
    ['พรตำนาน / อีเวนต์', `${(st.legendChance * 100).toFixed(1)}% / ${pct(st.eventChance)}`],
  ]
}
