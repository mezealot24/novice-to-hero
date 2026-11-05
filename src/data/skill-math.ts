// ===== Skill math: the ONE place hero skill numbers live (BattleScene casts with these, CharacterScene shows them). =====
// BattleScene adds run-only effects on top (relics, run picks, berserk, weaken, monster DEF/flee), so the
// numbers shown in the skill detail panel are "before monster DEF, without run picks".
// พร v2 (Q 2026-11-04, design/skills-v2.md): every hero magic HIT uses magic power Pm = 70% M.ATK + 30% P.ATK
// (LoL feel: physical builds still get something from magic procs). Heals and shields stay on M.ATK.
import { BATTLE, PLAYER, type Stats } from './game-data'
import { CLERIC_KIT, JOBS, MAGE_SPELL, SPELL_VAMP, SWORD_MANA, type JobDef, type JobId } from './jobs'
import type { Skill2Def } from './skill2'

/** Q 2026-11-04 rule: magic damage = 70% M.ATK + 30% P.ATK for ALL hero magic (Mage/Priest class skills too). */
export const MAGIC_MIX = { matk: 0.7, atk: 0.3 }
/** Magic power (Pm): what magic hits, burn stacks, Hellfire and Lightning Wrath scale with. */
export const magicPower = (st: Stats) => st.matk * MAGIC_MIX.matk + st.atk * MAGIC_MIX.atk
/** Magic hit base before the skill multiplier: Pm 0.9–1.1x (a crit uses the top). */
export const magicBase = (st: Stats) => { const pm = magicPower(st); return { lo: pm * 0.9, hi: pm * 1.1 } }
/** Physical hit base: P.ATK minPct–1x (DEX raises the floor; a crit uses the top and skips DEF). */
export const physBase = (st: Stats) => ({ lo: st.atk * st.minPct, hi: st.atk })
export const hitBase = (st: Stats, magic: boolean) => (magic ? magicBase(st) : physBase(st))

/** Class kit multipliers that used to sit inline in BattleScene (SWORD_MANA / MAGE_SPELL / CLERIC_KIT live in jobs.ts). */
export const KIT = {
  archerAuto: 0.9, archerAutoShots: 2, archerVolleyShots: 3, archerUlt: 5,
  mageFire: 2, mageFireStacks: 3, mageIce: 1.6, mageIceChill: 3, mageLightHits: 6, mageLightLo: 0.3, mageLightHi: 1.2,
  clericHealBelow: 0.75, clericSmiteTargets: 2, clericJudge: 2.2, clericJudgeEvery: 3,
  // v58 Priest Ult web (Q 2026-11-04), linear per level: พรคุ้มครอง Lv5 = ult P.ATK +50% · พรอุ่นไอ Lv5 = counter +12.5%, Holy Light 3 -> 8 · เกราะแสง Lv3 = 6% shield per spear volley
  clericUltAtkLv: 0.1, clericWarmCounterLv: 0.025, clericWarmLightLv: 1, clericSpearShieldLv: 0.02,
  spearBase: 0.3, spearMax: 8,
  thiefAuto: 1.6, thiefAutoPoison: 3, thiefUlt: 0.7, thiefUltHits: 4, thiefUltDodge: 2,
}

/** Skill 2 numbers by "+" level (Stats.s2Lv) and ★ (Stats.s2Star). data/skill2.ts texts and BattleScene.castSkill2 read these. */
export const S2N = {
  guardCut: (lv: number) => 0.4 + 0.05 * lv, guardTurns: (star: boolean) => (star ? 3 : 2), guardCounters: (star: boolean) => (star ? 2 : 1),
  bloodVamp: (lv: number) => 0.15 + 0.05 * lv, bloodTurns: 3, bloodAtk: 0.15,
  tauntWeak: (lv: number) => 0.2 + 0.05 * lv, tauntTurns: (star: boolean) => (star ? 3 : 2),
  rainMul: (lv: number) => 0.8 + 0.15 * lv, rainWaves: (star: boolean) => (star ? 2 : 1),
  hawkCrit: (lv: number) => 0.2 + 0.05 * lv, hawkTurns: 3, hawkCritDmg: 0.3,
  trapMul: 0.6, trapPush: (lv: number) => 30 + 10 * lv,
  mshieldTake: (lv: number) => 0.4 + 0.05 * lv, mshieldTurns: (star: boolean) => (star ? 5 : 3),
  novaMul: (lv: number) => 0.8 + 0.15 * lv, novaChill: (star: boolean) => 2 + (star ? 1 : 0), novaPush: 15,
  arcaneMul: (lv: number) => 0.6 + 0.1 * lv, arcaneHits: (star: boolean) => 3 + (star ? 2 : 0),
  renewHeal: (lv: number) => 0.3 + 0.05 * lv, renewTurns: (star: boolean) => (star ? 6 : 4), // heal x M.ATK per turn (Q 2026-11-04: Priest heals scale with M.ATK; was 6% +1%/lv max HP)
  // v69 Q: Priest ทักษะ 2 พรแสง = passive Blessing. root Lv5 = STR/DEX/INT/WIS +10 (2/lv) · "+" Lv3 = VIT +20 · ★ = M.ATK +30%
  blessStat: (lv: number) => 2 * lv, blessVit: (lv: number) => Math.round((20 * lv) / 3), blessMatk: 0.3,
  spearPlus: (lv: number) => 0.03 * lv, spearCount: (star: boolean) => (star ? 4 : 2), // หอกคม: +10%/lv of the 0.3x base
  smokeHeal: (lv: number) => 0.03 * lv, smokeDodges: (star: boolean) => (star ? 2 : 1),
  pickMul: (star: boolean) => (star ? 1.6 : 1), pickRes: (lv: number) => 15 + 5 * lv, pickPoison: 3,
  woundMul: (star: boolean) => (star ? 2 : 1.2), woundPoison: (lv: number) => 4 + lv,
}

// ---------- costs / cooldowns ----------
export const autoCost = (job: JobDef, st: Stats) => Math.max(10, job.auto.cost - st.autoCostCut)
/** Mana the ult costs (Mage, Swordsman); 0 for every other job. */
export const ultCost = (job: JobDef) => (job.resource === 'mana' ? job.ult.cost ?? 0 : 0)
/** Ult cooldown in hero turns before relics (run pick สมาธินิ่ง lowers smashCd for every job). */
export const ultCooldown = (job: JobDef, st: Stats) => {
  const cdCut = Math.round((PLAYER.smashCd - st.smashCd) / BATTLE.msPerTurn)
  return Math.max(2, job.ult.cd + st.mgUltCd - cdCut)
}
export const s2Cooldown = (k: Skill2Def, _st: Stats) => Math.max(1, k.cd)
/** Light spear multiplier x M.ATK (Skill 2 หอกคม adds on top at run start). */
export const spearMul = (st: Stats, s2?: Skill2Def) => KIT.spearBase + st.spearMul + (s2?.id === 'cl_spear' ? S2N.spearPlus(st.s2Lv) : 0)
/** v58 Priest: ult smash multiplier x P.ATK (before ultAmp / pskill), Holy Light count, basic smash x P.ATK. */
export const clericUltSmash = (st: Stats) => CLERIC_KIT.ultAtk * (1 + st.clUltAtk)
export const clericUltLights = (st: Stats) => CLERIC_KIT.ultLights + st.clUltLights
export const clericBasic = () => CLERIC_KIT.basic
export const manaPerTurn = (st: Stats, mul: number) => st.resRegen * mul * (1 - st.resRegenCut)

// ---------- detail rows for the skill screen ----------
export interface InfoRow { label: string; value: string }
const r = Math.round
const pct = (n: number) => `${r(n * 100)}%`
const range = (lo: number, hi: number) => (r(lo) === r(hi) ? `${r(hi)}` : `${r(lo)}–${r(hi)}`)
/** Damage of one hit at `mul`, before monster DEF: "lo–hi (คริ X)". Magic crits only with spellCrit. */
export function hitText(st: Stats, mul: number, magic: boolean) {
  const b = hitBase(st, magic), c = magic ? st.spellCrit : st.crit
  return `${range(b.lo * mul, b.hi * mul)}${c > 0 ? ` (คริ ${r(b.hi * mul * st.critMul)})` : ''}`
}
const heal = (st: Stats, n: number) => r(n * (1 + st.healAmp))
const shield = (st: Stats, n: number) => r(n * (1 + st.shieldAmp))
const resName = (job: JobDef) => (job.resource === 'energy' ? 'Energy' : job.resource === 'rage' ? 'Rage' : 'Mana')

/** ทักษะ 1 (the auto skill) with these stats. */
export function autoInfo(jobId: JobId, st: Stats): InfoRow[] {
  const job = JOBS[jobId], pow = 1 + st.s1Pow
  const out: InfoRow[] = [{ label: 'ใช้', value: `${resName(job)} ${autoCost(job, st)}` }]
  switch (jobId) {
    case 'swordsman': out.push({ label: 'ดาเมจ/ตัว (ทุกตัว)', value: hitText(st, SWORD_MANA.autoMul * pow * (1 + st.pskill), false) }); break
    case 'archer':
      if (st.arAim > 0) out.push({ label: `ศรเล็ง 2 ดอก (คริ +${pct(st.arAimCrit)})`, value: hitText(st, st.arAim * pow, false) })
      else out.push({ label: `${st.arVolley > 0 ? KIT.archerVolleyShots : KIT.archerAutoShots} ดอก ดาเมจ/ดอก`, value: hitText(st, (st.arVolley > 0 ? st.arVolley : KIT.archerAuto) * pow, false) })
      break
    case 'mage':
      out.push({ label: 'ไฟ/ตัว (ทุกตัว)', value: hitText(st, MAGE_SPELL.autoMul * pow, true) })
      if (st.mgOverflow > 0) out.push({ label: 'ตอน Mana ≥ 90% (พลังล้น)', value: hitText(st, MAGE_SPELL.autoMul * pow * st.mgOverflow, true) })
      break
    case 'cleric':
      out.push({ label: 'ตีปกติ ทุบประชิด (P.ATK)', value: hitText(st, clericBasic(), false) })
      out.push({ label: `ฮีล (HP < ${pct(KIT.clericHealBelow - st.healAt)})`, value: `${heal(st, st.matk * CLERIC_KIT.heal * pow)} HP` })
      out.push({ label: `แสงหลังทุบ ${KIT.clericSmiteTargets + st.smiteTargets} ตัวหน้า ดาเมจ/ตัว`, value: hitText(st, CLERIC_KIT.smite * pow * (1 + st.smiteMul), true) })
      if (st.judge > 0) out.push({ label: `พิพากษา (ทุก ${KIT.clericJudgeEvery} ครั้ง)`, value: hitText(st, KIT.clericJudge * pow * (1 + st.smiteMul), true) })
      break
    case 'thief':
      out.push({ label: 'แทง 1 ที', value: hitText(st, KIT.thiefAuto * pow, false) })
      out.push({ label: 'พิษ', value: `+${KIT.thiefAutoPoison} stack (${(st.poisonDmg).toFixed(1)}/stack/เทิร์น)` })
      break
    default: return []
  }
  return out
}

/** Ult with these stats. */
export function ultInfo(jobId: JobId, st: Stats): InfoRow[] {
  const job = JOBS[jobId], pow = 1 + st.ultPow, hitPow = pow * (1 + st.ultAmp)
  const out: InfoRow[] = [{ label: 'คูลดาวน์', value: `${ultCooldown(job, st)} เทิร์น${ultCost(job) ? ` · Mana ${ultCost(job)}` : ''}` }]
  switch (jobId) {
    case 'swordsman':
      out.push({ label: 'ดาเมจ/ตัว (ทุกตัว)', value: hitText(st, (SWORD_MANA.ultMul + st.ultMulAdd) * hitPow * (1 + st.pskill), false) })
      out.push({ label: 'โล่', value: `${shield(st, st.maxHp * Math.max(0, SWORD_MANA.ultShield + st.ultShieldAdd) * pow)}` })
      break
    case 'archer':
      out.push({ label: 'ศรทะลวง (เป้าเดียว)', value: hitText(st, (KIT.archerUlt - st.arUltMulCut) * hitPow, false) })
      if (st.arUltSplash > 0) out.push({ label: 'ทะลุใส่ตัวอื่น', value: hitText(st, st.arUltSplash * hitPow, false) })
      out.push({ label: 'หลบแน่นอน', value: `${1 + st.arUltDodge} ครั้ง` })
      break
    case 'mage': {
      const amp = (x: number) => pow * (1 + st.mgUltAmp + x) * (st.mgDoubleCast > 0 ? st.mgDoubleCast : 1)
      const twice = st.mgDoubleCast > 0 ? ' ×2 รอบ' : ''
      out.push({ label: `⚡ ${KIT.mageLightHits + st.lightHits} ฮิต ดาเมจ/ฮิต${twice}`, value: (() => { const b = magicBase(st), a = amp(st.mgLightAmp); return range(b.lo * KIT.mageLightLo * a, b.hi * KIT.mageLightHi * a) })() })
      out.push({ label: `🔥 ทุกตัว + เผา ${KIT.mageFireStacks + st.mgFireStack} stack${twice}`, value: hitText(st, KIT.mageFire * amp(st.mgFireAmp), true) })
      out.push({ label: `❄️ ทุกตัว + ช้า ${KIT.mageIceChill + st.chillPlus} เทิร์น${twice}`, value: hitText(st, KIT.mageIce * amp(st.mgIceAmp), true) })
      out.push({ label: 'บาเรีย (❄️ ได้เพิ่ม)', value: `${shield(st, st.matk * MAGE_SPELL.barrier * pow * (1 - st.mgBarrierCut))}${st.iceBarrier > 0 ? ` / ❄️ ${shield(st, st.matk * (MAGE_SPELL.barrier + st.iceBarrier) * pow * (1 - st.mgBarrierCut))}` : ''}` })
      break
    }
    case 'cleric':
      out.push({ label: 'ทุบทุกตัว (P.ATK)', value: hitText(st, clericUltSmash(st) * hitPow * (1 + st.pskill), false) })
      out.push({ label: `Holy Light ${clericUltLights(st)} ลูก ตัวสุ่ม (พลังเวท)`, value: hitText(st, CLERIC_KIT.ultLight * hitPow, true) })
      out.push({ label: `โล่ ${CLERIC_KIT.ultShieldTurns} เทิร์น`, value: `${shield(st, st.maxHp * CLERIC_KIT.ultShield)} (รวมไม่เกิน ${r(st.maxHp * CLERIC_KIT.shieldCap)})` })
      if (st.clPurify > 0) out.push({ label: 'ไฟชำระ: ล้างดีบัฟ + ฮีล (M.ATK)', value: `${heal(st, st.matk * CLERIC_KIT.purifyHeal)} HP` })
      if (st.ultHoly > 0) out.push({ label: 'แสงลงทัณฑ์/ตัว', value: hitText(st, st.ultHoly, true) })
      break
    case 'thief':
      out.push({ label: `แทง ${KIT.thiefUltHits + st.ultHits} ที ดาเมจ/ที`, value: hitText(st, KIT.thiefUlt * hitPow * (1 + st.thUltAgi), false) })
      out.push({ label: 'หลบแน่นอน', value: `${KIT.thiefUltDodge + st.ultDodge} ครั้ง` })
      break
    default: return []
  }
  return out
}

/** Skill 2 with these stats (s2Lv / s2Star come from its "+" and ★ nodes). */
export function skill2Info(k: Skill2Def, st: Stats): InfoRow[] {
  const lv = st.s2Lv, star = st.s2Star > 0, job = JOBS[k.job]
  const out: InfoRow[] = [{ label: 'ใช้', value: `${resName(job)} ${k.cost} · คูลดาวน์ ${s2Cooldown(k, st)} เทิร์น` }]
  const add = (label: string, value: string) => out.push({ label, value })
  switch (k.id) {
    case 'sw_guard': add('ดาเมจเข้าลด', `−${pct(S2N.guardCut(lv))} · ${S2N.guardTurns(star)} เทิร์น`); add('สวนกลับแน่นอน', `${S2N.guardCounters(star)} ครั้ง`); break
    case 'sw_blood': add('ดูดเลือด + ดูดเลือดสกิล', `+${pct(S2N.bloodVamp(lv))} · ${S2N.bloodTurns} เทิร์น`); add('ดาเมจสกิล/ult', `−${pct(SPELL_VAMP.bloodCut)}${star ? ` · ATK +${pct(S2N.bloodAtk)}` : ''}`); break
    case 'sw_taunt': add('มอนตีเบาลง', `${pct(S2N.tauntWeak(lv))} · ${S2N.tauntTurns(star)} เทิร์น`); break
    case 'ar_rain': add(`ดาเมจ/ตัว (ทุกตัว ×${S2N.rainWaves(star)} รอบ)`, hitText(st, S2N.rainMul(lv), false)); break
    case 'ar_hawk': add('คริเพิ่ม', `+${pct(S2N.hawkCrit(lv))} → รวม ${pct(st.crit + S2N.hawkCrit(lv))} · ${S2N.hawkTurns} เทิร์น`); if (star) add('ดาเมจคริ', `+${pct(S2N.hawkCritDmg)}`); break
    case 'ar_trap': add(star ? 'ดาเมจ/ตัว (ทุกตัว)' : 'ดาเมจตัวหน้า', hitText(st, S2N.trapMul, false)); add('ผลักเทิร์น', `${S2N.trapPush(lv)}`); break
    case 'mg_mshield': add('Mana รับดาเมจแทน', `${pct(S2N.mshieldTake(lv))} · ${S2N.mshieldTurns(star)} เทิร์น`); break
    case 'mg_nova': add('ดาเมจ/ตัว (ทุกตัว)', hitText(st, S2N.novaMul(lv), true)); add('ช้า', `${S2N.novaChill(star)} เทิร์น${star ? ` · ผลักเทิร์น ${S2N.novaPush}` : ''}`); break
    case 'mg_arcane': add(`${S2N.arcaneHits(star)} ฮิต ดาเมจ/ฮิต`, hitText(st, S2N.arcaneMul(lv), true)); break
    case 'cl_renew': { const turns = S2N.renewTurns(star), h = heal(st, st.matk * S2N.renewHeal(lv)); add('ฮีล/เทิร์น', `${h} HP × ${turns} เทิร์น = ${h * turns} HP`); break }
    case 'cl_bless': add('พรแสง (ติดตัวตลอดไฟต์)', 'ถาวร · ไม่ใช้ Mana'); add('STR/DEX/INT/WIS', `+${S2N.blessStat(st.blessLv)} (ราก Lv${st.blessLv}/5)`); add('VIT', `+${S2N.blessVit(lv)}`); if (star) add('M.ATK', `+${pct(S2N.blessMatk)}`); break
    case 'cl_spear': add(`หอกแสง ${S2N.spearCount(star)} เล่ม ดาเมจ/ตัว`, hitText(st, spearMul(st, k), true)); break
    case 'th_smoke': add('หลบแน่นอน', `${S2N.smokeDodges(star)} ครั้ง`); if (lv) add('ฟื้น HP', `${heal(st, st.maxHp * S2N.smokeHeal(lv))}`); break
    case 'th_pick': add('แทงตัวหน้า', hitText(st, S2N.pickMul(star), false)); add('คืน Energy', `${S2N.pickRes(lv)}`); if (star) add('พิษ', `+${S2N.pickPoison} stack`); break
    case 'th_wound': add('แทงทะลุ DEF', hitText(st, S2N.woundMul(star), false)); add('พิษ', `+${S2N.woundPoison(lv)} stack (${st.poisonDmg.toFixed(1)}/stack/เทิร์น)`); break
  }
  return out
}
