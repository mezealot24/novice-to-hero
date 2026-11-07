// Derived stat rows (label, value) shown on the Character screen and the in-battle pause menu.
import { COMBO, type Stats } from './game-data'
import { magicPower } from './skill-math'

export function derivedRows(st: Stats): [string, string][] {
  const pct = (n: number) => `${Math.round(n * 100)}%`
  return [
    ['HP', `${Math.round(st.maxHp)}`],
    ['P.ATK (ต่ำ~สูง)', `${Math.round(st.atk * st.minPct)}~${Math.round(st.atk)}`],
    ['M.ATK / พลังเวท (70%M+30%P)', `${Math.round(st.matk)} / ${Math.round(magicPower(st))}`], // พร v2: magic hits use magic power
    ['ดาเมจสกิลกายภาพ', `+${(st.pskill * 100).toFixed(1)}%`],
    ['P.DEF / M.DEF', `${Math.round(st.def)}(${Math.round(100 - 10000 / (100 + st.def))}%) / ${pct(st.mdef)}`],
    ['Hit / Flee / ต้านทาน', `${Math.round(st.hit)} / ${Math.round(st.flee)} / ${pct(st.tenacity)}`], // v94: ต้านทาน moved here so the crit row can show physical / magic crit
    ['คริ กาย / เวท', `${(st.crit * 100).toFixed(1)}% / ${(st.spellCrit * 100).toFixed(1)}%`], // v94: physical crit (basic, smash, skills) / magic crit (spears, card spells, Dawn Light bonus): see docs/design/crit-mechanic.md
    ['สวนกลับ / คอมโบ', `${pct(st.counter)} / ${pct(st.combo)} ต่อ${COMBO.baseCount + st.comboCount}${st.comboDmg ? ` ดาเมจ+${pct(st.comboDmg)}` : ''}`], // combo rework: chain length + Combo DMG%
    ['ความเร็วเทิร์น', `${(st.aspd / 1.6 * 10).toFixed(1)}`],
    ['ฟื้น HP / ฮีลแรง', `${(st.regen * 1.5).toFixed(2)}%/เทิร์น · +${pct(st.healAmp)}`],
    ['ดูดเลือด / สกิล / หลบฟื้น', `${pct(st.lifesteal)} / ${pct(st.spellVamp)} / ${(st.dodgeHeal * 100).toFixed(1)}%`],
    ['ดาเมจคริ / โล่ต้นเวฟ', `${pct(st.critMul)} / ${pct(st.waveShield)}`],
    ['Max Mana / ฟื้น/เทิร์น', `${Math.round(st.maxRes)} / ${Math.round(st.resRegen * 3)}`],
    ['หลบโชคดี / ดรอปหายาก', `${(st.luckyDodge * 100).toFixed(1)}% / ${(st.dropChance * 100).toFixed(1)}%`],
    ['พรตำนาน / อีเวนต์', `${(st.legendChance * 100).toFixed(1)}% / ${pct(st.eventChance)}`],
  ]
}
