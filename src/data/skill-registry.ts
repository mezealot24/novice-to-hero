// Skill registry: which numbers each class's ทักษะ 1 / ทักษะ 2 / Ult shows in admin.html "⚔️ สกิลอาชีพ" (design/skill-admin-engine-v1.md).
// It is a MAP, not a second copy of the numbers: a ref points at a path of the `kit` table (already whitelisted) or of the
// new `skills` table (tunables.ts builds its whitelist from the refs below). Adding a skill number = add one ref here.
// Round 1: the 5 base classes (skill 1 / 2 / Ult). Round 2: 2nd-job classes + skill 3.
// Import rule: type-only imports from ./tunables (tunables imports this file), values only from jobs / skill2 / skill-math.
import { JOBS, MAGE_SPELL, SWORD_MANA, SWORD_S1 } from './jobs'
import { JOB2, type Job2Id } from './jobs2'
import type { Skill2Id } from './skill2'
import { SKILL2 } from './skill2'
import { KIT2, KIT3, S2N, S2P } from './skill-math'
import type { FieldDef } from './tunables'

export const SKILL_CLASSES = ['swordsman', 'archer', 'mage', 'cleric', 'thief'] as const
export type SkillClass = (typeof SKILL_CLASSES)[number]
/** Slots that carry a crit switch. Skill 3 exists only for 2nd-job classes (round 2). */
export const CRIT_SLOTS = ['s1', 's2', 'ult'] as const
export type CritSlot = (typeof CRIT_SLOTS)[number]

/** Per-skill crit power (Q 2026-11-08): 1 = the skill's own hits crit as today (every skill), 0 = they never roll a crit,
 *  in between (0.5) = they still roll the crit but only that share of the crit BONUS lands: x = 1 + (critMul - 1) * power.
 *  A sure crit (forceCrit: Swordsman ★ พันดาบ ...) and on-hit procs (zap / fire / ice / spear / light ...) are not governed by it.
 *  Tunable as skills `crit.<class>.<slot>` (kept the old 0/1 switch's path: a published 0 or 1 means the same). */
export const SKILL_CRIT: Record<SkillClass, Record<CritSlot, number>> = {
  swordsman: { s1: 1, s2: 1, ult: 1 }, archer: { s1: 1, s2: 1, ult: 1 }, mage: { s1: 1, s2: 1, ult: 1 },
  cleric: { s1: 1, s2: 1, ult: 1 }, thief: { s1: 1, s2: 1, ult: 1 },
}
const critRow = (job: string) => (SKILL_CRIT as Partial<Record<string, Record<CritSlot, number>>>)[job]
/** false only when the admin switched this class's slot off (power 0). Jobs without an entry (novice, 2nd-job slots not covered yet) = allowed. */
export function canRollCrit(job: string, slot: CritSlot): boolean {
  return critRow(job)?.[slot] !== 0
}
/** Share (0..1) of the crit bonus this class's slot keeps; 1 for jobs without an entry. */
export function critPower(job: string, slot: CritSlot): number {
  const v = critRow(job)?.[slot]
  return typeof v === 'number' ? Math.min(1, Math.max(0, v)) : 1
}
/** The crit multiplier a skill hit really gets: only `power` of the bonus above x1 (power 1 = the full critMul). */
export const scaleCritMul = (critMul: number, power: number): number => 1 + (critMul - 1) * power

// ---------- field refs ----------
export interface SkillRef { table: 'kit' | 'skills'; path: string; label: string }
/** A `skills`-table ref carries its own range (tunables.ts builds the whitelist from these). */
export interface SkillOwnRef extends SkillRef { table: 'skills'; def: FieldDef }
export interface ClassLayout {
  s1: SkillRef[]
  /** The three Skill 2 choices of the class; each also gets its cost / cooldown refs (see skill2Refs). */
  s2: { id: Skill2Id; refs: SkillRef[] }[]
  ult: SkillRef[]
  /** v107 round 2: skill-tree node numbers of the class web (shown as its own column). */
  tree?: SkillRef[]
}

const num = (min: number, max: number): FieldDef => ({ kind: 'num', min, max })
const int = (min: number, max: number): FieldDef => ({ kind: 'int', min, max })
const COST = int(0, 200), CD = int(1, 30), MUL = num(0, 20), FRAC = num(0, 1), COEF = num(0, 200)

const kit = (path: string, label: string): SkillRef => ({ table: 'kit', path, label })
const sk = (path: string, label: string, def: FieldDef): SkillOwnRef => ({ table: 'skills', path, label, def })
/** Skill 2 "+" node: value = base + per x level (S2P). */
const lin = (key: keyof typeof S2P, what: string): SkillOwnRef[] => [
  sk(`s2p.${key}.base`, `${what} · ฐาน`, COEF), sk(`s2p.${key}.per`, `${what} · เพิ่มต่อเลเวล "+"`, COEF),
]
const s2cost = (id: Skill2Id): SkillOwnRef[] => [sk(`skill2.${id}.cost`, 'ค่าร่าย', COST), sk(`skill2.${id}.cd`, 'คูลดาวน์ (เทิร์น)', CD)]
const s2 = (id: Skill2Id, ...more: SkillRef[]) => ({ id, refs: [...s2cost(id), ...more] })
/** Q 2026-11-24: one ref per skill Lv of a number list (Swordsman ดาบสยบมนตร์ / ปลุกดาบ tables, class-1 cap 15 = SWORD_S1 / SWORD_MANA lengths). */
export const CLASS1_LVS = 15
const perLv = (path: string, what: string, def: FieldDef): SkillOwnRef[] => Array.from({ length: CLASS1_LVS }, (_, i) => sk(`${path}.${i}`, `${what} · Lv ${i + 1}`, def))

export const SKILL_LAYOUT: Record<SkillClass, ClassLayout> = {
  swordsman: {
    s1: [sk('swordS1.mana', '⚔️ ดาบสยบมนตร์ ค่า Mana (ทุก Lv)', COST), sk('swordS1.cd', '⚔️ ดาบสยบมนตร์ คูลดาวน์ (เทิร์น)', CD), sk('swordS1.silenceTurns', '⚔️ ดาบสยบมนตร์ ใบ้ (เทิร์นมอน)', int(0, 10)),
      sk('swordS1.baseLvSoft', '⚔️ ดาบสยบมนตร์ Base Lv จุดเริ่มชะลอ', int(1, 99)),
      sk('swordS1.baseLvAfterScale', '⚔️ ดาบสยบมนตร์ สเกลหลังจุดชะลอ', FRAC),
      sk('swordS1.skillCritAdd', '⚔️ ดาบสยบมนตร์ โอกาสคริสกิลเพิ่ม', FRAC),
      // Q 2026-11-24: the damage table per skill Lv (P.ATK x atkPct + STR x str + base x Base Lv)
      ...perLv('swordS1.atkPct', '⚔️ ดาบสยบมนตร์ × P.ATK', num(0, 20)), ...perLv('swordS1.str', '⚔️ ดาบสยบมนตร์ × STR', num(0, 20)), ...perLv('swordS1.base', '⚔️ ดาบสยบมนตร์ ดาเมจฐาน × Base Lv', num(0, 2000))],
    s2: [
      s2('sw_guard', ...lin('guardCut', 'ดาเมจเข้าลด'), ...lin('guardDefPct', 'P.DEF เพิ่มระหว่างตั้งการ์ด'), ...lin('guardThorn', '🦔 เกราะหนามสะท้อน × P.DEF'), ...lin('guardDef', 'สวน × P.DEF'), sk('s2n.guardAutoBlockShare', 'Auto Guard เติม guardPool', FRAC)),
      s2('sw_blood', ...lin('bloodVamp', 'ดูดเลือดสกิล'), sk('s2n.bloodTurns', 'นาน (เทิร์น)', int(0, 20)), sk('s2n.bloodAtk', 'ATK เพิ่ม', FRAC), sk('s2n.bloodTaken', 'โดนตีแรงขึ้น (ข้อเสีย)', FRAC)),
      s2('sw_taunt', ...lin('tauntVuln', 'มอนโดนกายภาพแรงขึ้น'), sk('s2n.tauntEnrage', 'มอนคลั่งตีแรงขึ้น (ข้อเสีย)', FRAC), sk('s2n.tauntHelixMult', 'ตัวคูณฮิตพายุสวนกลับ', int(1, 5)), sk('s2n.tauntCtrAmp', 'สวนกลับใส่มอนติดท้าทายแรงขึ้น', FRAC), sk('s2n.tauntStarShield', '★ ท้าซ้ำ: โล่ % HP', FRAC)),
    ],
    ult: [sk('sword.ult', 'ค่า Mana', COST), sk('job.swordsman.ult.cd', 'คูลดาวน์ (เทิร์น)', CD), sk('sword.ultMul', '🌊 คลื่นดาบ × P.ATK (ทุกตัว)', MUL),
      sk('sword.execMax', '⚖️ คำพิพากษา: แรงเพิ่มสูงสุด', num(0, 5)), sk('sword.execCapMiss', '⚖️ HP หายเท่านี้ = ตัน', FRAC), sk('sword.execLow', '🌊 คลื่นดาบออกเองเมื่อ HP มอนต่ำกว่า', FRAC), sk('sword.execBigShare', '⚖️ บอส/มินิ ได้สัดส่วนโบนัส', FRAC), sk('sword.execLineShare', '⚖️ Ult job2/3 ได้สัดส่วนโบนัส', FRAC),
      sk('sword.awakenTurns', '⚔️ ปลุกดาบ นาน (เทิร์น)', int(1, 10)), sk('sword.awakenAtk', '⚔️ ปลุกดาบ P.ATK เพิ่ม (Q 2026-11-22: 0)', FRAC), sk('sword.awakenHpPct', '✨ เคลือบดาบสวรรค์ % HP ที่เหลือ/ฮิต', FRAC), sk('sword.awakenBigShare', '✨ เคลือบดาบสวรรค์ บอส/มินิ ×', FRAC), sk('sword.coatAtkCap', '✨ เคลือบดาบสวรรค์ เพดานต่อฮิต (× P.ATK)', num(0, 10)), sk('sword.coatMultiShare', '✨ เคลือบดาบสวรรค์ สัดส่วนเพดานท่าหลายฮิต', FRAC), sk('sword.cleaveShare', '⚔️ ปลุกดาบ ตีปกติฟันตัวถัดไป ×', num(0, 3)),
      // Q 2026-11-24: ✨ coat growth + ⚔️ ปลุกดาบ STR per Ult Lv
      sk('sword.awakenHpLv', '✨ เคลือบดาบสวรรค์ +% ต่อ Lv (Lv 2-5)', FRAC), sk('sword.awakenHpLvHi', '✨ เคลือบดาบสวรรค์ +% ต่อ Lv (Lv 6-15)', FRAC),
      sk('sword.awakenStrStep', '✨ เคลือบดาบสวรรค์ ทุกกี่ STR', int(1, 500)), sk('sword.awakenStrPct', '✨ เคลือบดาบสวรรค์ +% ต่อขั้น STR', FRAC),
      ...perLv('sword.awakenStr', '⚔️ ปลุกดาบ STR เพิ่ม', int(0, 1000))],
    tree: [ // PoE Passive Tree Phase 2 (Swordsman-Line Constellation)
      kit('swordS1CdCut', 'ตราพิพากษา: ลดคูลดาวน์ดาบสยบมนตร์ (เทิร์น)'),
      kit('swordS3BreakTurns', 'ทลายเกราะศึก: เกราะแตกจาก S1/S3 (เทิร์น)'),
      kit('swordIronDr', 'ป้อมเหล็กไร้พ่าย: ลดดาเมจเข้าทั้งหมด'),
      kit('swordIronAspdCut', 'ป้อมเหล็กไร้พ่าย: ข้อเสียลดความเร็วโจมตี (ASPD)'),
      kit('swordCounterDefMul', 'เกราะสะท้อนคม: ดาเมจสวนกลับคงที่ × P.DEF'),
      kit('swordCleaveTaken', 'คมดาบผ่าทัพ: ข้อเสียรับดาเมจแรงขึ้น'),
      kit('swordExecBonus', 'ตราพิพากษา: โบนัสเพดาน Execute สายนักดาบ'),
      kit('swordBloodFuryAt', 'สัญญาคลั่งเลือด: เกณฑ์ HP ทำงาน (% Max HP)'),
      kit('swordBloodFuryDmg', 'สัญญาคลั่งเลือด: โบนัสดาเมจกายภาพ'),
      kit('swordBloodFurySelf', 'สัญญาคลั่งเลือด: ข้อเสียจ่าย % HP ปัจจุบันต่อสกิล'),
      // Q 2026-11-24: the Swordsman web nodes (data/trees/swordsman.ts), per OLD Lv (max 3, stretched)
      kit('swordCore.vitPer', '🪨 กายเหล็ก: VIT ต่อ Lv เดิม'), kit('swordCore.defPer', '🪨 กายเหล็ก: P.DEF ต่อ Lv เดิม'), kit('swordCore.hpPctPer', '🪨 กายเหล็ก: Max HP % ต่อ Lv เดิม'),
      kit('swordCore.mdefPer', '💠 เกราะจิตอึด: M.DEF % ต่อ Lv เดิม'), kit('swordCore.tenacityPer', '💠 เกราะจิตอึด: ต้านทานต่อ Lv เดิม'),
      kit('swordCore.vitToMdefPer', '💠 เกราะจิตอึด: VIT 1 แต้ม → M.DEF % ต่อ Lv เดิม'), kit('swordCore.vitToMdefCap', '💠 เกราะจิตอึด: เพดาน M.DEF จาก VIT'),
      kit('swordCore.regenPer', '❤️‍🩹 ฟื้นฟูนักรบ: ฟื้น HP ต่อ Lv เดิม'), kit('swordCore.healAmpPer', '❤️‍🩹 ฟื้นฟูนักรบ: ฮีลแรงขึ้นต่อ Lv เดิม'),
      kit('swordCore.lowHpAt', '❤️‍🩹 ฟื้นฟูนักรบ: เลือดต่ำกว่า (% Max HP)'), kit('swordCore.lowHpRegenPer', '❤️‍🩹 ฟื้นฟูนักรบ: ฟื้นเพิ่มตอนเลือดต่ำต่อ Lv เดิม'),
      kit('swordS1Tree.shield', '🌀 พายุสวนกลับ: โล่ % HP ต่อ Lv เดิม'), kit('swordS1Tree.helixHits', '🌀 พายุสวนกลับ: จำนวนฮิตที่โดนก่อนหมุน'), kit('swordS1Tree.helixMul', '🌀 พายุสวนกลับ: ตัวคูณ P.ATK ต่อ Lv เดิม'),
      kit('swordS1Tree.tenacity', '🛡️ เกราะไม่สะทก: ต้านทานต่อ Lv เดิม'), kit('swordS1Tree.guardTurns', '🛡️ เกราะไม่สะทก: กัน CC (เทิร์น)'), kit('swordS1Tree.multiDr', '🛡️ เกราะไม่สะทก: ลดดาเมจฮิตซ้ำต่อ Lv เดิม'), kit('swordS1Tree.multiDrCap', '🛡️ เกราะไม่สะทก: เพดานลดดาเมจฮิตซ้ำ'),
      kit('swordS1Tree.muteWeak', '⚔️ คมสะท้อน: มอนติดใบ้ตีเบาลงต่อ Lv เดิม'), kit('swordS1Tree.helixAmp', '⚔️ คมสะท้อน: เพิ่มแรงพายุสวนกลับต่อ Lv เดิม'), kit('swordS1Tree.helixDef', '⚔️ คมสะท้อน: โบนัสดาเมจตาม P.DEF ต่อ Lv เดิม'),
      kit('swordS1Tree.helixHitsStar', '🌪️ ★ จักรผันสะท้าน: จำนวนฮิตก่อนหมุน'), kit('swordS1Tree.helixStarShield', '🌪️ ★ จักรผันสะท้าน: โล่ % HP เมื่อหมุน'), kit('swordS1Tree.helixStarMana', '🌪️ ★ จักรผันสะท้าน: คืน Mana เมื่อหมุน'), kit('swordS1Tree.counters', '🌪️ ★ จักรผันสะท้าน: สวนกลับแน่นอน (ครั้ง)'), kit('swordS1Tree.ctrDmg', '🌪️ ★ จักรผันสะท้าน: ดาเมจสวนกลับเพิ่ม'),
      kit('swordS1Tree.vsMute', '🎯 เจาะจังหวะ: ตีตัวร่าย/ติดใบ้แรงขึ้นต่อ Lv เดิม'), kit('swordS1Tree.refund', '⏳ ตัดจังหวะ: คืน Mana ต่อ Lv เดิม'),
      kit('swordS1Tree.splash', '🌀 ฟันเฉือน: เฉือนตัวอื่น % ของฮิตต่อ Lv เดิม'), kit('swordS1Tree.starHit', '⚔️ ★ ดาบสยบคู่: ฟันซ้ำ % ของฮิต'),
      kit('swordUltTree.dr', '🛡️ ใจเหล็กกล้า: ปลุกดาบแล้วโดนเบาลงต่อ Lv เดิม'), kit('swordUltTree.vengRate', '🛡️ ใจเหล็กกล้า: สะสมเพลิงแค้นต่อ Lv เดิม'), kit('swordUltTree.vengCap', '🛡️ ใจเหล็กกล้า: เพดานเพลิงแค้น (% Max HP)'), kit('swordUltTree.vengDmg', '🛡️ ใจเหล็กกล้า: ดาเมจระเบิดเพลิงแค้น'), kit('swordUltTree.vengShield', '🛡️ ใจเหล็กกล้า: โล่จากเพลิงแค้น'),
      kit('swordUltTree.leech', '🩸 ดาบกระหายเลือด: ดูดเลือดต่อ Lv เดิม'),
      kit('swordUltTree.ctr', '🔁 ตื่นสวนสะท้าน: สวนกลับต่อ Lv เดิม'), kit('swordUltTree.cullAdd', '🔁 ตื่นสวนสะท้าน: เกณฑ์ดาบผ่าชีพเพิ่มต่อ Lv เดิม'),
      kit('swordUltTree.waveShield', '🪓 ★ ดาบผ่าชีพ: โล่ % ของดาเมจคลื่น'), kit('swordUltTree.waveShieldCap', '🪓 ★ ดาบผ่าชีพ: เพดานโล่ (% Max HP)'), kit('swordUltTree.rampageWaveShield', '🪓 ★ ดาบผ่าชีพ: โล่ % จาก S3 คลื่นดาบระหว่างบ้าระห่ำ'),
      kit('swordUltTree.cullPct', '🪓 ★ ดาบผ่าชีพ: เกณฑ์ประหารมอนทั่วไป (% HP)'), kit('swordUltTree.cullBossPct', '🪓 ★ ดาบผ่าชีพ: เกณฑ์ประหารบอส/มินิ (% HP)'), kit('swordUltTree.cullBonusAt', '🪓 ★ ดาบผ่าชีพ: เกณฑ์ผ่าเกราะบอส/มินิ (% HP)'), kit('swordUltTree.cullBonusMul', '🪓 ★ ดาบผ่าชีพ: ตัวคูณ P.ATK ผ่าเกราะบอส'),
      kit('swordUltTree.cullMana', '🪓 ★ ดาบผ่าชีพ: คืน Mana เมื่อประหารสำเร็จ'), kit('swordUltTree.cullCdCut', '🪓 ★ ดาบผ่าชีพ: ลด Ult CD เมื่อประหารสำเร็จ'), kit('swordUltTree.cullAtk', '🪓 ★ ดาบผ่าชีพ: บัฟ P.ATK เพลิงชัยชนะ'), kit('swordUltTree.cullDef', '🪓 ★ ดาบผ่าชีพ: บัฟ P.DEF เพลิงชัยชนะ'), kit('swordUltTree.cullBuffTurns', '🪓 ★ ดาบผ่าชีพ: ระยะเวลาเพลิงชัยชนะ (เทิร์น)'),
      kit('swordUltTree.execAdd', '⚖️ คมพิพากษา: execute สูงสุดเพิ่มต่อ Lv เดิม'), kit('swordUltTree.reChance', '🌊 คลื่นซ้ำ: โอกาสต่อ Lv เดิม'), kit('swordUltTree.waveAmp', '🌊 คลื่นซ้ำ: คลื่นดาบ/ทะลวงแรงขึ้นต่อ Lv เดิม'),
      kit('swordUltTree.cleave', '⚔️ ฟันกวาดตื่น: ฟันตัวถัดไปเพิ่มต่อ Lv เดิม'), kit('swordUltTree.awAtk', '⚔️ ★ ดาบตื่นเต็มพลัง: P.ATK เพิ่มระหว่างปลุกดาบ'), kit('swordUltTree.awStrPct', '⚔️ ★ ดาบตื่นเต็มพลัง: Bonus STR % ระหว่างปลุกดาบ'),
    ],
  },
  archer: {
    s1: [sk('job.archer.auto.cost', 'ค่า Energy', COST), kit('archerAuto', 'ดาเมจต่อดอก ×'), kit('archerAutoShots', 'จำนวนดอก'), kit('archerVolleyShots', 'จำนวนดอก (ศรสาด)')],
    s2: [
      s2('ar_rain', ...lin('rainMul', 'ดาเมจฝนธนู ×')),
      s2('ar_hawk', ...lin('hawkCrit', 'คริเพิ่ม'), sk('s2n.hawkTurns', 'นาน (เทิร์น)', int(0, 20)), sk('s2n.hawkCritDmg', 'ดาเมจคริเพิ่ม', num(0, 2))),
      s2('ar_trap', sk('s2n.trapMul', 'ดาเมจกับดัก ×', MUL), ...lin('trapPush', 'ผลักเทิร์น')),
    ],
    ult: [sk('job.archer.ult.cd', 'คูลดาวน์ (เทิร์น)', CD), kit('archerUlt', 'ดาเมจศรทะลวง ×')],
  },
  mage: {
    s1: [sk('job.mage.auto.cost', 'ค่า Mana', COST), kit('cast.fireMul', 'ดาเมจลูกไฟ × M.ATK')],
    s2: [
      s2('mg_mshield', ...lin('mshieldTake', 'Mana รับดาเมจแทน')),
      s2('mg_nova', ...lin('novaMul', 'ดาเมจวงน้ำแข็ง ×'), sk('s2n.novaPush', 'ผลักเทิร์น', COEF)),
      s2('mg_arcane', ...lin('arcaneMul', 'ดาเมจต่อฮิต ×')),
    ],
    ult: [
      sk('job.mage.ult.cost', 'ค่า Mana', COST), sk('job.mage.ult.cd', 'คูลดาวน์ (เทิร์น)', CD), kit('cast.ultMul', 'พลังตอนปล่อย × (ทุกธาตุ)'), kit('cast.brokenUltCd', 'คูลดาวน์เมื่อร่ายแตก (เทิร์น)'),
      sk('mage.barrier', 'บาเรีย × M.ATK', MUL),
      kit('mageFire', '🔥 ไฟ ×'), kit('mageFireStacks', '🔥 เผาซ้อน (stack)'), kit('mageIce', '❄️ น้ำแข็ง ×'), kit('mageIceChill', '❄️ ช้า (เทิร์น)'),
      kit('mageLightHits', '⚡ จำนวนฮิต'), kit('mageLightLo', '⚡ ต่ำสุดต่อฮิต ×'), kit('mageLightHi', '⚡ สูงสุดต่อฮิต ×'),
    ],
  },
  cleric: {
    s1: [sk('job.cleric.auto.cost', 'ค่า Mana', COST), kit('cleric.heal', 'ฮีล × M.ATK'), kit('clericHealBelow', 'ฮีลเมื่อ HP ต่ำกว่า'), kit('cleric.smite', 'หอกแสง (ทักษะ 1) × M.ATK'), kit('clericSmiteTargets', 'หอกแสงทักษะ 1 กี่ตัว')],
    s2: [
      s2('cl_renew', ...lin('renewHeal', 'ฮีลต่อเทิร์น × M.ATK'), ...lin('renewLight', 'แสงใส่ตัวหน้าต่อเทิร์น × พลังเวท')),
      s2('cl_bless', sk('s2n.blessTurns', 'นาน (เทิร์น)', int(0, 20)), sk('s2n.blessStat', 'STR/DEX/INT/WIS +', int(0, 200)), sk('s2n.blessCleanse', 'ล้างดีบัฟ (อย่าง)', int(0, 10)),
        sk('s2n.kyrieHits', 'Kyrie แตกหลังโดน (ครั้ง)', int(0, 20)), sk('s2n.gloriaLuk', 'Gloria LUK +', int(0, 200)), ...lin('kyrieHp', 'Kyrie บาเรีย % HP')),
      s2('cl_spear', ...lin('spearPlus', 'หอกแรงเพิ่ม'), sk('s2n.spearN', 'หอกต่อการร่าย (เล่ม)', int(0, 20)), sk('s2n.spearStarN', '★ หอกต่อการร่าย (เล่ม)', int(0, 20)), kit('spearBase', 'ดาเมจหอกพื้นฐาน × M.ATK'), kit('spearMax', 'หอกสูงสุด (เล่ม)')),
    ],
    tree: [ // v107: numbers the Cleric web nodes read at run time (kit `clericTree.*`)
      kit('cleric.ultManaLv', '🙏 ราก: Mana Ult เพิ่มต่อ Lv (เหนือ Lv1 · 0 = คงที่)'), kit('clericUltAtkLv', '🙏 ราก: Ult ทุบแรง × P.ATK ต่อ Lv'), kit('clericUltPowLv', '🙏 ราก: Ult แรง (ultPow) ต่อ Lv · ไม่รวมทุบ'),
      kit('clericCalmAt', '🧘 ใจนิ่ง: เลื่อนเส้นฮีล (คงที่)'), kit('clericCalmLight', '🧘 ใจนิ่ง: แสง/พิพากษาแรง ต่อ Lv'), kit('clericCalmHeal', '🧘 ใจนิ่ง: ฮีลแรง ต่อ Lv'), kit('clericGroupLight', '⚖️ ตัดสินหมู่: แสง/พิพากษาแรง ต่อ Lv'), kit('clericGroupAt2', '⚖️ ตัดสินหมู่: Lv ที่แสงยิงเพิ่มตัวที่ 2'), kit('clericMiracleSkill1', '🍀 ปาฏิหาริย์ R1: คริสกิล (แสง)'), kit('clericMiracleSkill2', '🍀 ปาฏิหาริย์ R2: คริสกิล (แสง)'),
      kit('clericMiracleSpell1', '🍀 ปาฏิหาริย์ R1: คริเวท (หอก/ศรัทธา)'), kit('clericMiracleSpell2', '🍀 ปาฏิหาริย์ R2: คริเวท (หอก/ศรัทธา)'),
kit('clericTree.dawn.every', '🌄 passive: ทุกกี่ฮิต (ตีธรรมดา/คอมโบ)'),
      kit('clericTree.dawn.share', '🌄 โบนัส: share ต่อ Lv เดิม (× STR+WIS+M.ATK)'), kit('clericTree.dawn.matk', '🌄 โบนัส: × M.ATK ในฐาน'),
      kit('clericTree.dawn.heal', '💛 สมานแผล: ฮีลต่อ Lv เดิม'), kit('clericTree.dawn.weak', '💛 สมานแผล: มอนธรรมดา ×'),
      kit('clericTree.dawn.wis.0', '☀️ แสงแตก Lv1: WIS = × ดาเมจ'), kit('clericTree.dawn.wis.1', '☀️ แสงแตก Lv2: WIS = × ดาเมจ'), kit('clericTree.dawn.wis.2', '☀️ แสงแตก Lv3: WIS = × ดาเมจ'),
      kit('clericTree.dawn.wisTurns.0', '☀️ แสงแตก Lv1: เทิร์น'), kit('clericTree.dawn.wisTurns.1', '☀️ แสงแตก Lv2: เทิร์น'), kit('clericTree.dawn.wisTurns.2', '☀️ แสงแตก Lv3: เทิร์น'),
      kit('clericTree.dawn.crit', '★ อรุณพิทักษ์: ดาเมจคริเพิ่ม'),
      kit('clericTree.core.base', '🧘 จิตสงบ: STR/WIS ต่อ Lv เดิม'), kit('clericTree.core.regen', '🧘 จิตสงบ: ฟื้น Mana ต่อ Lv เดิม (หน่วย /3 ต่อเทิร์น)'),
      kit('clericTree.core.intPer.0', '💪 ศรัทธาสู่กาย Lv1: ทุกกี่แต้ม'), kit('clericTree.core.intPer.1', '💪 ศรัทธาสู่กาย Lv2: ทุกกี่แต้ม'), kit('clericTree.core.intPer.2', '💪 ศรัทธาสู่กาย Lv3: ทุกกี่แต้ม'),
      kit('clericTree.core.guard', '💠 มานาพิทักษ์: Mana จากดาเมจต่อ Lv เดิม'), kit('clericTree.core.wisAmp', '💠 มานาพิทักษ์: ขยายต่อ WIS'),
      kit('clericTree.core.heal', '💠 มานาพิทักษ์: ใช้ Mana คืน HP'), kit('clericTree.core.shield', '💠 มานาพิทักษ์: โล่ต้นเวฟต่อ Lv เดิม × Max Mana'),
    ],
    ult: [
      kit('cleric.ultMana', 'ค่า Mana'), sk('job.cleric.ult.cd', 'คูลดาวน์ (เทิร์น)', CD), kit('cleric.ultAtk', 'ทุบทุกตัว × P.ATK'),
      kit('cleric.ultLights', 'หอกแสง Ult (เล่ม)'), kit('cleric.ultLight', 'หอกแสง Ult ต่อเล่ม × M.ATK'), kit('cleric.ultShield', 'โล่ % HP สูงสุด'), kit('cleric.ultShieldTurns', 'โล่นาน (เทิร์น)'), kit('cleric.purifyHeal', 'ไฟชำระฮีล × M.ATK'),
    ],
  },
  thief: {
    s1: [sk('job.thief.auto.cost', 'ค่า Energy', COST), kit('thiefAuto', 'ดาเมจแทง ×'), kit('thiefAutoPoison', 'พิษ (stack)'),
      kit('thiefAutoMinCost', 'แทงพิษ: Energy ต่ำสุดหลังลด'), kit('thiefStrikeRes', 'D.Strike ติด: คืน Energy'), kit('thiefStrikeLs', 'D.Strike: สัดส่วนดูดเลือด'),
      kit('thiefVenomBasicShare', 'แทงฉาบอาคม: ตีปกติได้กี่ส่วนของแทงพิษ')],
    s2: [
      s2('th_smoke', ...lin('smokeHeal', 'ฟื้น % HP'), ...lin('smokeRes', 'ควันหอม: คืน Energy'),
        sk('s2n.smokeTurns', 'Shroud: นาน (เทิร์น)', int(0, 20)), sk('s2n.smokeFlee', 'Shroud: FLEE +% (คูณ)', num(0, 5)),
        sk('s2n.smokeSkillCrit', 'Shroud: skillCrit +', FRAC), sk('s2n.smokeCritDmg', 'Shroud ★: ดาเมจคริ + (B3)', num(0, 5)),
        sk('s2n.raidMul', 'Sightless Raid: × P.ATK', MUL), sk('s2n.exposedPct', 'Exposed: รับดาเมจเพิ่ม (B1)', FRAC),
        sk('s2n.exposedStar', 'Exposed ★: รับดาเมจเพิ่ม', FRAC), sk('s2n.exposedTurns', 'Exposed: นาน (เทิร์นมอน)', int(0, 20)),
        sk('s2n.smokeBlindTurns', 'Blind: นาน (เทิร์นมอน · ตัด Hit = KIT2.crusader.blindHit)', int(0, 20))),
      s2('th_pick', ...lin('pickRes', 'คืน Energy'), sk('s2n.pickPoison', 'พิษ (stack)', int(0, 20))),
      s2('th_wound', ...lin('woundMax', 'แผลฉีก: Wound สูงสุด'),
        sk('s2n.woundStacks', 'Wound ต่อการแทง', int(0, 20)), sk('s2n.woundStarStacks', 'แผลมรณะ: Wound ต่อการแทง', int(0, 20)),
        sk('s2n.woundTurns', 'Wound นาน (เทิร์นฮีโร่)', int(0, 20)), sk('s2n.woundStrikeChance', 'D.Strike แปะ Wound (โอกาส)', FRAC),
        sk('s2n.bladeAt', "Blade's End: Wound ขั้นต่ำ", int(1, 20)), sk('s2n.bladeMul', "Blade's End: × P.ATK", MUL),
        sk('s2n.bladeHealCut', "Blade's End: ตัดฮีลมอน", FRAC), sk('s2n.bladeCutTurns', "Blade's End: ตัดฮีลนาน (เทิร์นมอน)", int(0, 20)),
        sk('s2n.woundPriv', 'Privileged: รับดาเมจเพิ่ม (B1)', FRAC)),
    ],
    ult: [sk('job.thief.ult.cd', 'คูลดาวน์ (เทิร์น)', CD), kit('thiefUlt', 'ดาเมจต่อทีแทง ×'), kit('thiefUltHits', 'จำนวนทีแทง'), kit('thiefUltAgiK', 'AGI ลงเต็มสัดส่วน → แรง +×'), kit('thiefUltAgiShareCap', 'เพดานสัดส่วน AGI'), kit('thiefUltAgiPoolMin', 'แต้มขั้นต่ำที่ใช้หาร AGI'),kit('thiefUltDodge', 'หลบแน่นอน (ครั้ง)'),
      // P2'c: thief_u / th_t3* (budget: tests/thief-p2c.test.ts)
      kit('thiefUltCondCap', 'เงาพริ้ว: ดาเมจคริเงื่อนไขของ Ult รวมสูงสุด'), kit('thiefUltKindsMax', 'เงาจุดตาย: นับดีบัฟสูงสุด (ชนิด)'),
      kit('thiefExecBelow', 'เพชฌฆาตเงา: HP เป้าต่ำกว่า'), kit('thiefUltExecBelow', 'เงาสังหาร: HP เป้าต่ำกว่า'),
      kit('thiefOnHitBase', 'On-Hit: สัดส่วนฐาน'), kit('thiefOnHitCap', 'On-Hit: สัดส่วนสูงสุด'),
      kit('thiefFinisherAt', 'เงาพันคม: คริกี่ครั้งได้ทีปิด'), kit('thiefFinisherMul', 'เงาพันคม: ทีปิด × ทีปกติ'), kit('thiefUltCritResCap', 'เพชฌฆาตเงา: Energy จากคริสูงสุด/ครั้ง'),
      kit('thiefUltCdCutCap', 'ลด CD Ult สูงสุด/เทิร์น (รวมทุกแหล่ง)'), kit('thiefUltCdFloor', 'CD Ult ต่ำสุดในเทิร์นที่เพิ่งกด')],
    tree: [ // P2'a: numbers the Thief web core column / talents read at run time
      kit('thiefKindsAt', '"ดีบัฟหลายชนิด" = กี่ชนิดขึ้นไป'),
      kit('thiefCondLeechMulti', 'คมเลือด: × เมื่อดีบัฟหลายชนิด'),
      kit('thiefKillRes', 'กระหายเลือด: ฆ่าได้ Energy'),
      kit('thiefKillPoisonHeal', 'กระหายเลือด: ฮีลต่อพิษบนศพ'),
      kit('thiefKillPoisonHealCap', 'กระหายเลือด: ฮีลโบนัสสูงสุด'),
      kit('thiefBossCritLeech', 'กระหายเลือด: คริบอส ฮีลกี่ส่วน'),
      kit('thiefBossCritRes', 'กระหายเลือด: คริบอส Energy'),
      kit('thiefBloodKingBelow', 'ราชันย์โลหิต: HP ต่ำกว่า'),
      kit('thiefBloodKingMul', 'ราชันย์โลหิต: ดูดเลือด ×'),
      kit('thiefBloodKingStrikeLs', 'ราชันย์โลหิต: D.Strike ดูดเลือด'),
      kit('thiefStackCritTalMax', 'จุดบอดซ้อนพิษ: stack สูงสุด'),
      kit('thiefTakenCap', 'B1: ดาเมจที่มอนรับเพิ่ม สูงสุด'),
      kit('thiefPrivShare', 'สถานะทับซ้อน: พิษขั้นต่ำ (สัดส่วนเพดานพิษ)'),
      kit('thiefPoisonAmpShare', 'กัดกร่อน (ของใส่/การ์ด): พิษขั้นต่ำ (สัดส่วนเพดานพิษ)'),
      kit('thiefStackHpMax', 'กายต้านพิษ: นับ stack สูงสุด'),
      kit('thiefCondCritDmgCap', 'B3: ดาเมจคริจากเงื่อนไข รวมสูงสุด'),
      kit('thiefShadowShieldHpCap', 'หายใจในเงา: โล่ร่างเงาสูงสุด (% HP)'),
      kit('thiefDodgeFleeTurns', 'ก้าวเงา: Flee หลังหลบ นาน (เทิร์น)'),
      kit('thiefOpenCritDmg', 'เปิดฉากซุ่มโจมตี R2: ดาเมจคริ + (B3)'),
      kit('thiefDetAtShare', 'ระเบิดสารพิษ: พิษขั้นต่ำ (สัดส่วนเพดานพิษ)'),
      kit('thiefDetShare', 'ระเบิดสารพิษ: ใช้พิษกี่ส่วน'),
      kit('thiefDetMin', 'ระเบิดสารพิษ: ใช้พิษอย่างน้อย (stack)'),
      kit('thiefDetPoisonBase', 'ระเบิดสารพิษ: × ดาเมจพิษ (ฐาน)'),
      kit('thiefDetPoisonLv', 'ระเบิดสารพิษ: × ดาเมจพิษ (ต่อ Lv เดิม)'),
      kit('thiefDetSplash', 'ระเบิดสารพิษ: สาดตัวอื่นกี่ส่วน'),
      kit('thiefDetLeechShare', 'ระเบิดสารพิษ: เลือดพิษได้กี่ส่วน (ไม่มี ★)'),
      kit('thiefLeechLv', 'เลือดพิษ: อัตราฐานต่อ Lv เดิม'),
      kit('thiefLeechInt', 'เลือดพิษ: ขยายต่อ 1 INT'),
      kit('thiefLeechCap', 'เลือดพิษ: อัตราสูงสุด'),
      kit('thiefLeechTurnCap', 'เลือดพิษ: ฮีลสูงสุด/เทิร์น (% HP)'),
      kit('thiefDetBossRefund', '★ นักเล่นแร่พิษ: คืนพิษใส่บอส'),
      kit('thiefAgonyFrom', 'วิถีพิษคริ: นับ critMul ที่เกิน'),
      kit('thiefAgonyCap', 'B5 วิถีพิษคริ + vsPoison: โบนัสพิษสูงสุด'),
      kit('thiefAgonyHitCut', 'วิถีพิษคริ: ฮิตกายภาพไม่คริเบาลง'),
      kit('thiefWardPer', 'Shadow Ward: ลดดาเมจเวท/ตาเหยี่ยว ต่อ WIS'),
      kit('thiefWardCap', 'Shadow Ward: ลดดาเมจสูงสุด'),
      kit('thiefLuckyRes', "Gambler's Edge: LUCKY! → Energy"),
      // PoE Passive Tree Phase 1 (Thief-Line Constellation)
      kit('thiefDeathMarkTurns', 'ตราความตาย (Death Mark): เก็บดาเมจนาน (เทิร์นฮีโร่)'),
      kit('thiefDeathMarkAt', 'ตราความตาย (Death Mark): เกณฑ์ระเบิดก่อนกำหนด (% HP)'),
      kit('thiefDeathMarkEcho', 'ตราความตาย (Death Mark): สัดส่วนสะท้อน True Dmg'),
      kit('thiefMistDr', 'หมอกลวงตา (Mistwalker): ลดดาเมจเวท/ตาเหยี่ยว/ตีโดนแน่'),
      kit('thiefMistDefCut', 'หมอกลวงตา (Mistwalker): ข้อเสียลด P.DEF & โล่'),
      kit('thiefFlurryDmgCut', 'คมมีดประสาน (Blade Flurry): ข้อเสียลดดาเมจต่อที Ult'),
      kit('thiefMobFlurryMul', 'คมมีดประสาน (Mobster): ตัวคูณฟันเพิ่มทวงหนี้'),
      kit('thiefOverhealCap', 'สัญญาเล่นแร่ (Eldritch Venom): เพดานโล่จากฮีลเกินพิษ (% HP)'),
      kit('thiefEldritchMatkShare', 'สัญญาเล่นแร่ (Eldritch Venom): โบนัส M.ATK เสริมพิษ (สัดส่วนของ matkPer)'),
      kit('thiefPhysLeechCut', 'สัญญาเล่นแร่ (Eldritch Venom): ข้อเสียลดดูดเลือดกายภาพ'),
      kit('thiefLuckyPoison', 'มือแห่งโชคชะตา (Lucky Reprisal): พิษที่ Mobster แปะเมื่อ LUCKY!'),
    ],
  },
}

// ---------- v107 round 2: 2nd jobs (KIT2 + JOB2 skill 3 / Ult วิวัฒน์) ----------
export const JOB2_IDS = Object.keys(JOB2) as Job2Id[]
export interface Job2Layout {
  s3: SkillRef[]; ult: SkillRef[]; other: SkillRef[]
  /** Q 2026-11-24: the job's own Skill 1 cost (Berserker Rage), [] when it uses the parent's. */
  s1: SkillRef[]
  /** Q 2026-11-24: Skill 4 (KIT2.<id>.s4: Knight 🌀 Spiral Pierce), [] when the job has none. */
  s4: SkillRef[]
  /** Q 2026-11-24: the Awakening (KIT3) numbers of this 2nd job's line, [] when not wired yet (Swordsman line first). */
  j3: SkillRef[]
}
/** Hand-written Thai labels for every 2nd-job KIT2 number. */
const J2_LABEL: Record<string, string> = {
  // 🪓 Berserker
  'berserker.frenzyMax': '🔥 Frenzy สูงสุด (stack)', 'berserker.frenzyAspd': '🔥 ความเร็วเพิ่มต่อ 1 Frenzy',
  'berserker.frenzyCritDmg': '🔥 ดาเมจคริเพิ่มต่อ 1 Frenzy', 'berserker.frenzyKeep': '🔥 เทิร์นไม่คริก่อน stack หาย',
  'berserker.stormFrenzyAmp': '⚔️ ดาบสยบมนตร์ (Frenzy): แรงขึ้นเมื่อ Frenzy ถึงเกณฑ์', 'berserker.stormFrenzyAt': '⚔️ ดาบสยบมนตร์ (Frenzy): เกณฑ์ Frenzy ขั้นต่ำ (stack)',
  'berserker.waveCdJ2': '🌊 คลื่นดาบ: คูลดาวน์ Job2 (เทิร์น · Warlord ใช้ 3)', 'berserker.waveHits': '🌊 คลื่นดาบ: จำนวนฮิต',
  'berserker.waveFront': '🌊 คลื่นดาบ: ดาเมจตัวหน้า × P.ATK', 'berserker.waveBack': '🌊 คลื่นดาบ: ดาเมจตัวหลัง × P.ATK',
  'berserker.waveCrit': '🌊 คลื่นดาบ: โอกาสคริเพิ่ม', 'berserker.waveOffWeapon': '🌊 ตัวคูณเมื่อไม่ได้ถืออาวุธ 2 มือ',
  'berserker.waveGoreAtk': '🌊 คลื่นดาบ: เลือดไหล (Gore) ต่อเทิร์น × P.ATK', 'berserker.waveGoreTurns': '🌊 คลื่นดาบ: เลือดไหล (Gore) นาน (เทิร์น)',
  'berserker.waveMultiRage': '🌊 คลื่นดาบ: คืน Rage เมื่อโดนหลายตัว', 'berserker.waveMultiAt': '🌊 คลื่นดาบ: จำนวนเป้าขั้นต่ำที่คืน Rage',
  'berserker.ultMul': '👹 บ้าระห่ำ: ฟันทุกตัว × P.ATK', 'berserker.ultTurns': '👹 บ้าระห่ำ: นาน (เทิร์น)',
  'berserker.ultCrit': '👹 บ้าระห่ำ: โอกาสคริเพิ่ม', 'berserker.ultTaken': '👹 บ้าระห่ำ: โดนตีแรงขึ้นระหว่างคลั่ง',
  'berserker.ultRageGain': '👹 บ้าระห่ำ: ได้ Rage ทันทีตอนกด',
  'berserker.mastery.atkPct': 'ชำนาญอาวุธ 2 มือ: P.ATK +%', 'berserker.mastery.crit': 'ชำนาญอาวุธ 2 มือ: คริ +', 'berserker.mastery.skillCrit': 'ชำนาญอาวุธ 2 มือ: สกิลคริ +',
  'berserker.ignorePainTurns': '★ ไม่รู้สึกเจ็บ: อมตะ 1 HP (เทิร์น)', 'berserker.ignorePainRegenTurns': '★ ไม่รู้สึกเจ็บ: ฟื้นตัวหลังจบ (เทิร์น)',
  'berserker.ignorePainRegenPct': '★ ไม่รู้สึกเจ็บ: ฟื้นจากดาเมจที่ทำ (%)',
  // 🐴 Knight
  'knight.hpPct': '🐦 ขี่เปโก: HP สูงสุด +%', 'knight.aspdPct': '🐦 ขี่เปโก: ความเร็ว +%',
  'knight.hpDmg': '🔱 ถึกเป็นแรง: บวก % Max HP เข้าสกิลหอก', 'knight.brandMul': '🌀 Brandish: ดาเมจกวาด × P.ATK',
  'knight.brandTargets': '🌀 Brandish: จำนวนเป้าหน้าสุด', 'knight.brandPush': '🌀 Brandish: ผลักเกจมอนตัวหน้า',
  'knight.brandPushOther': '🌀 Brandish: ผลักเกจมอนตัวรอง', 'knight.brandCritAdd': '🌀 Brandish: โอกาสคริสกิลเพิ่ม',
  'knight.brandLowTargetAmp': '🌀 Brandish: ตัวหน้าแรงขึ้นเมื่อเป้า ≤ 2 ตัว',
  'knight.pierceHits': '🎯 Pierce: จำนวนฮิต (มอนปกติ)', 'knight.pierceBigHits': '🎯 Pierce: จำนวนฮิต (บอส/มินิ)',
  'knight.pierceMul': '🎯 Pierce: ดาเมจต่อฮิต × P.ATK', 'knight.waveMul': '🔱 คลื่นทะลวง: แทงเดียว × P.ATK', 'knight.ultMana': '🔱 Pierce of Judgement: ค่า Mana',
  'knight.boomerang': '↩️ Spear Boomerang: ดาเมจ × P.ATK', 'knight.boomerangTurns': '↩️ Spear Boomerang: คูลดาวน์ (เทิร์น)',
  'knight.spiralS3S4Pierce': '🌀 ★ ทะลวงเกลียว: ข้าม DEF เพิ่มให้ Brandish & Spiral',
  'knight.chargeFirst': '🚀 ★ ทะยาน: ตัวคูณฟันแรก',
  'knight.guardShieldless': '🛡️ Auto Guard เมื่อไม่ถือโล่ (ตัวคูณ)',
  'knight.chargeFirstGauge': '🚀 ★ ทะยาน: เติมเกจฮีโร่ต้นไฟต์', 'knight.chargeFirstRes': '🚀 ★ ทะยาน: Mana ต้นไฟต์',
  // Q 2026-11-24 Skill 4 🌀 Spiral Pierce
  'knight.s4.cost': '🌀 Spiral Pierce: ค่า Mana', 'knight.s4.cd': '🌀 Spiral Pierce: คูลดาวน์ (เทิร์น)', 'knight.s4.unlockLv': '🌀 Spiral Pierce: ปลดที่ Job2 Lv',
  'knight.s4.mul': '🌀 Spiral Pierce: แทง × P.ATK', 'knight.s4.shatterAmp': '🛡️ ทุบโล่ได้: แทงแรงขึ้น', 'knight.s4.defPierce': '🌀 Spiral Pierce: ข้าม DEF',
  'knight.s4.critAdd': '🌀 Spiral Pierce: โอกาสคริสกิลเพิ่ม', 'knight.s4.spBreakAmp': '⛓️ Break: Knight ตีกายภาพแรงขึ้นใส่เป้าติด Break',
  'knight.s4.bossShield': '🛡️ โล่บอสหาย (สัดส่วน)',
  'knight.s4.bossGauge': '💫 บอสโดนตัดร่าย: ผลักเกจ', 'knight.s4.fang': '🐍 เขี้ยวงู: ตีโล่มอนแรงขึ้น (ติดตัว)', 'knight.s4.breakTurns': '⛓️ Break: ปิด passive มอน (เทิร์น)',
  'knight.s4.lkHits': '🐉 Lord Knight: จำนวนแทง', 'knight.s4.lkMul': '🐉 Lord Knight: ต่อแทง × P.ATK', 'knight.s4.lkPierce': '🐉 Lord Knight: แทงสุดท้ายข้าม DEF',
  'knight.mastery.atkPct': 'ชำนาญหอก: P.ATK +%', 'knight.mastery.hit': 'ชำนาญหอก: Hit +',
  'knight.tree.banner': '🚩 ปักธง: โล่ต้นเวฟ (% HP ต่อ Lv เดิม)', 'knight.tree.provokeAt': '😤 ข่มขวัญ: ทำงานเต็มเมื่อ HP มอนต่ำกว่า',
  'knight.tree.provoke': '😤 ข่มขวัญ: มอนตีเบาลงเมื่อ HP ต่ำ (ทันทีครึ่งหนึ่ง)', 'knight.tree.bannerKill': '🎖️ ธงชัย: โล่เมื่อฆ่า (% HP ต่อ Lv เดิม)',
  'knight.tree.auraHeal': '🏳️ ★ ธงอมตะ: ฮีล % HP เมื่อบล็อก', 'knight.tree.auraRes': '🏳️ ★ ธงอมตะ: ฟื้น Mana/Rage เมื่อบล็อก',
  'knight.tree.auraGuard': '🏳️ ★ ธงอมตะ: โอกาสบล็อกเพิ่ม', 'knight.tree.sweepEvery': '🌀 ทวนวน: ออกอัตโนมัติทุก N เทิร์น',
  'knight.tree.sweep': '🌀 ทวนวน: ดาเมจ × P.ATK (ต่อ Lv เดิม)', 'knight.tree.sweepCritAdd': '🌀 ทวนวน: โอกาสคริสกิลเพิ่ม', 'knight.tree.sweepPush': '💨 เหวี่ยง: ผลักเกจมอน (ต่อ Lv เดิม)',
  'knight.tree.sweepGauge': '⚡ ทวนเร็ว: เติมเกจฮีโร่ต่อตัวที่ตาย', 'knight.tree.sweepRes': '⚡ ทวนเร็ว: ฟื้น Mana ต่อครั้งที่กวาด', 'knight.tree.sweepBreak': '🌪️ ★ พายุทวน: เกราะแตก (เทิร์น)',
  'knight.tree.sweepStun': '🌪️ ★ พายุทวน: โอกาสมึน / ผลักเกจ',
  // 🔪 Rogue
  'rogue.knifeMul': '🔪 มีดบิน: ดาเมจต่อเล่ม × P.ATK', 'rogue.knifePerCombo': '🔪 มีดบิน: จำนวนมีดต่อฮิตคอมโบ',
  'rogue.dualKnife': '🔪 มีดมือรอง: มีดบินเพิ่ม (เล่ม)', 'rogue.stabMul': '🗡️ Back Stab: ดาเมจ × P.ATK (คริแน่)', 'rogue.stabCpMax': '🔁 Combo Point: แต้มสูงสุด', 'rogue.stabCpPer': '🔁 Back Stab: แรงขึ้นต่อ Combo Point',
  'rogue.ultKnives': '🌪️ พายุมีด: จำนวนมีดบินที่โปรย', 'rogue.ultKnifeMul': '🌪️ พายุมีด: ดาเมจต่อเล่ม × P.ATK',
  'rogue.ultKnifeJ2Share': '🌪️ พายุมีด: ได้โบนัสมีดบิน (มีดคม/ใบมีดลับคม) กี่ส่วน',
  'rogue.mastery.atkPct': 'ชำนาญมีด: P.ATK +%', 'rogue.mastery.skillCrit': 'ชำนาญมีด: สกิลคริ +',
  'rogue.knifePskillShare': '🔪 มีดบิน: ได้ pskill (STR) กี่ส่วน', 'rogue.markMax': '🔪 ตราคมมีด: Mark สูงสุดต่อตัว', 'rogue.markTurns': '🔪 ตราคมมีด: อยู่นาน (เทิร์นมอน)',
  'rogue.markFocus': '🔪 มีดบิน: โอกาสเล็งตัวที่ Mark ยังไม่เต็ม', 'rogue.markSteelMul': '🔪 เก็บมีด: วงสวิง × P.ATK ต่อ Mark', 'rogue.markSteelSplash': '🔪 เก็บมีด: ตัวอื่นโดนกี่ส่วน',
  'rogue.markRes': '🔪 เก็บมีด: Energy ต่อ Mark', 'rogue.markCp': '🔪 เก็บมีด: Combo Point ต่อครั้ง', 'rogue.markKillKnives': '🔪 Kill Reset: มีดฟรี (เล่ม)',
  'rogue.stabPickupAt': '🗡️ เก็บ Mark กี่อัน ลด CD Back Stab', 'rogue.stabPickupCdCut': '🗡️ เก็บ Mark: ลด CD Back Stab (เทิร์น)',
  'rogue.stabMarkAmp': '🗡️ Backstab Mark: รับดาเมจฮิตเพิ่ม (B1)', 'rogue.stabMarkTurns': '🗡️ Backstab Mark: นาน (เทิร์นมอน)',
  'rogue.stabStrip': '🗡️ Strip Armor: ลด P.DEF', 'rogue.stabStripTurns': '🗡️ Strip Armor: นาน (เทิร์นมอน)',
  'rogue.stabAmbushMul': '🗡️ Shadow Ambush: แรงเพิ่ม (B4)', 'rogue.stabAmbushRes': '🗡️ Shadow Ambush: Energy', 'rogue.stabAmpCap': '🗡️ Back Stab: โบนัสเงื่อนไขรวมสูงสุด (ไม่รวม Combo Point)',
  'rogue.knifeBounce': '🔪 มีดชิ่ง: ความแรงฐาน', 'rogue.knifeBounceAt': '🔪 มีดชิ่ง: Mark ขั้นต่ำ',
  'rogue.comboTempoMax': '⚡ จังหวะเร่ง: Tempo สูงสุด/เวฟ', 'rogue.comboDebuffMax': '💢 แทงรัวซ้ำแผล: นับดีบัฟสูงสุด',
  'rogue.comboDodgeEvery': '💨 เงาพริ้วสลับร่าง: ทุกกี่ฮิตคอมโบ', 'rogue.comboDodgeIcdTurns': '💨 เงาพริ้วสลับร่าง: ICD (เทิร์น)',
  'rogue.comboShadowMul': '👥 เงาเลียนแบบ: แรงกี่ส่วนของ Back Stab', 'rogue.comboShadowAt': '👥 เงาเลียนแบบ: คอมโบขั้นต่ำ (ฮิต)',
  'rogue.critAmbushHi': '🎯 จุดตายเป้าอ่อน: HP ตั้งแต่', 'rogue.critAmbushLo': '🎯 จุดตายเป้าอ่อน: HP ต่ำกว่า',
  'rogue.critLeechResMax': '🧛 ดูดเลือดจากคมคริ: Energy สูงสุด/เทิร์น', 'rogue.critKnifeMul': '✨ คริเป็นมีด: มีดคริ × P.ATK',
  // 🕴️ Mobster
  'mobster.execBase': '📒 สมุดหนี้: เกณฑ์ Execute พื้นฐาน (% HP)', 'mobster.execPer': '📒 สมุดหนี้: เกณฑ์เพิ่มต่อ 1 หนี้',
  'mobster.bossExecMul': '📒 สมุดหนี้: ตัวคูณใส่บอส/มินิแทน Execute', 'mobster.cutTurns': '⛓️ ตัดเส้นเอ็น: ช้า + เกราะแตก (เทิร์น)',
  'mobster.cutMul': '⛓️ ตัดเส้นเอ็น: ดาเมจ × P.ATK', 'mobster.armorBrk': '⛓️ เกราะแตก: ลด DEF มอน (%)',
  'mobster.ultSlash': '💀 ทวงหนี้: ฟันทุกตัว × P.ATK', 'mobster.burstTurns': '💀 ทวงหนี้: คิดระเบิดพิษกี่เทิร์น',
  'mobster.burstMul': '💀 ทวงหนี้: ตัวคูณระเบิดพิษ', 'mobster.ultCdRefund': '💀 ทวงหนี้: คืนคูลดาวน์เมื่อ Execute (เทิร์น)',
  'mobster.mastery.atkPct': 'ชำนาญมีด: P.ATK +%', 'mobster.mastery.poisonDmg': 'ชำนาญมีด: พิษแรง +ต่อ stack',
  // ✝️ Crusader
  'crusader.guard': '🛡️ Auto Guard: บล็อก', 'crusader.guardVit': '🛡️ บล็อกเพิ่มต่อ VIT', 'crusader.guardCap': '🛡️ บล็อกสูงสุด', 'crusader.guardOverMul': '🛡️ บล็อกเกิน Cap: โล่/ฮีลบล็อก × ต่อ 1', 'crusader.holyVs': 'ศรัทธา: แรงใส่อันเดด/ปีศาจ',
  'crusader.crossHits': '✝️ จำนวนฮิต', 'crusader.crossMul': '✝️ ต่อฮิต × (P.ATK + Pm)', 'crusader.blindTurns': '🙈 ตาบอด (เทิร์น)', 'crusader.blindHit': '🙈 Hit มอนลด',
  'crusader.gcPay': '✨ จ่าย HP % ปัจจุบัน', 'crusader.gcPm': '✨ ต่อ pulse × พลังเวท', 'crusader.gcAtk': '✨ ต่อ pulse × P.ATK', 'crusader.gcStr': '✨ ต่อ pulse × STR (flat)', 'crusader.gcPulses.0': '✨ pulse ที่ Lv0', 'crusader.gcPulses.1': '✨ pulse ที่ Lv1', 'crusader.gcPulses.2': '✨ pulse ที่ Lv2', 'crusader.gcPulses.3': '✨ pulse ที่ Lv3', 'crusader.gcPulses.4': '✨ pulse ที่ Lv4', 'crusader.gcPulses.5': '✨ pulse ที่ Lv5', 'crusader.gcRefund': '✨ คืน HP % ของที่จ่าย',
  'crusader.gcRefundAt': '✨ คืน HP เมื่อโดนกี่ตัวขึ้นไป', 'crusader.gcBurn': '🔥 โบนัส × (Mana ที่เผา + HP ที่จ่าย)', 'crusader.angelCap': '🪽 Guardian Angel ลดดาเมจสูงสุด', 'crusader.hcVit': '✝️ Holy Cross VIT ต่อ stack', 'crusader.hcVitGrace': '✝️ VIT อยู่ต่อหลังคูลดาวน์หมด (เทิร์น)',
  'crusader.martyrShield': '★ ผู้พลีชีพ: โล่ % HP', 'crusader.mastery.atkPct': 'ชำนาญอาวุธ: ATK %', 'crusader.mastery.def': 'ชำนาญอาวุธ: DEF',
  // 👊 Monk
  'monk.combo': '👊 หมัดกระแส: โอกาสคอมโบเพิ่ม', 'monk.chargeMax': '🔵 ลูกพลังสูงสุด (ลูก)',
  'monk.chargePerSwing': '🔵 ลูกพลังต่อการตีธรรมดา', 'monk.chargePerCombo': '🔵 ลูกพลังต่อฮิตคอมโบ',
  'monk.thunderMin': '⚡ Falling Thunder: ลูกพลังขั้นต่ำ', 'monk.thunderPm': '⚡ ดาเมจพื้นฐาน × พลังเวท',
  'monk.thunderPer': '⚡ แรงเพิ่มต่อ 1 ลูกพลัง',
  'monk.comboThunderHits': '⚡ ฟ้าฟาดคอมโบ: คอมโบขั้นต่ำ (ฮิต)', 'monk.comboThunderMul': '⚡ ฟ้าฟาดคอมโบ: ตัวคูณ vs Falling Thunder',
  'monk.comboFinishMul': '🌪️ ★ ปิดฉากคอมโบ: ดาเมจฐาน × P.ATK', 'monk.comboFinishPerHit': '🌪️ ★ ปิดฉากคอมโบ: +ต่อฮิตในเชน',
  'monk.comboFinishBreakTurns': '🌪️ ★ ปิดฉากคอมโบ: เกราะแตก (เทิร์น)', 'monk.comboFinishStunChance': '🌪️ ★ ปิดฉากคอมโบ: โอกาสมึน',
  'monk.comboFinishPush': '🌪️ ★ ปิดฉากคอมโบ: ผลักเกจบอส/มินิ', 'monk.comboFinishCdCut': '🌪️ ★ ปิดฉากคอมโบ: ลดคูลดาวน์ S3/Ult',
  'monk.bellHp': '🔔 Tempest Bell: เลือด (% Max HP ฮีโร่)', 'monk.bellTaunt': '🔔 โอกาสระฆังรับตีแทนฮีโร่',
  'monk.bellTurns': '🔔 ระฆังอยู่นาน (เทิร์น)', 'monk.bellRing': '🔔 สั่นทุกฮิต: ดาเมจทุกตัว × พลังเวท',
  'monk.bellBoom': '🔔 ระเบิดเมื่อระฆังแตก × พลังเวท',
  'monk.haymakerAt': '🥊 หมัดแค้น: เกณฑ์ปล่อย (% Max HP)', 'monk.haymakerCap': '🥊 หมัดแค้น: เพดานแรงฮึด (% Max HP)',
  'monk.haymakerShield': '🥊 หมัดแค้น: โล่ (% ของแรงฮึด)', 'monk.haymakerGritMul': '🥊 หมัดแค้น: True Dmg × แรงฮึด',
  'monk.haymakerMdefHp': '🥊 หมัดแค้น: โบนัส M.DEF × Max HP', 'monk.haymakerStarAt': '🔥 ★ หมัดพิพากษา: เกณฑ์ปล่อยเร็วขึ้น (% Max HP)',
  'monk.haymakerStarCap': '🔥 ★ หมัดพิพากษา: เพดานแรงฮึดสูงขึ้น (% Max HP)', 'monk.haymakerStarShield': '🔥 ★ หมัดพิพากษา: โล่ (% ของแรงฮึด)',
  'monk.haymakerStarGritMul': '🔥 ★ หมัดพิพากษา: True Dmg × แรงฮึด', 'monk.haymakerStarMdefHp': '🔥 ★ หมัดพิพากษา: โบนัส M.DEF × Max HP',
  'monk.haymakerSplash': '🔥 ★ หมัดพิพากษา: True Dmg สะบัดใส่ตัวอื่น', 'monk.haymakerPush': '🔥 ★ หมัดพิพากษา: ผลักเกจบอส/มินิ',
  'monk.haymakerDr': '🔥 ★ หมัดพิพากษา: ลดดาเมจเข้าขณะถือแรงฮึด',
  'monk.asuraMinAt': '💥 ★ อาชูร่า: ลูกพลังขั้นต่ำ (ลูก)', 'monk.asuraAtk': '💥 ★ อาชูร่า: ดาเมจฐาน × P.ATK',
  'monk.asuraPerCharge': '💥 ★ อาชูร่า: +× P.ATK ต่อ 1 ลูกพลัง', 'monk.asuraMana': '💥 ★ อาชูร่า: ดาเมจเพิ่มต่อ 1 Mana ที่เผา',
  'monk.asuraMdefHp': '💥 ★ อาชูร่า: โบนัส × (M.DEF × Max HP)', 'monk.asuraExhaustTurns': '😵 ง่อยแดก: นาน (เทิร์น)',
  'monk.asuraSlow': '😵 ง่อยแดก: ความเร็วลดลง', 'monk.asuraWeak': '😵 ง่อยแดก: ตีธรรมดาเบาลง',
  'monk.instillMul': '🌩️ ★ Instill: สายฟ้า × พลังเวท', 'monk.chillTurns': '❄️ ฝ่ามือธาตุ: ติดช้านาน (เทิร์น)',
  'monk.noLightMul': '🖤 ★ ไร้แสง: ฮีลเกินเป็นโล่มืด ×', 'monk.darkCap': '🌑 เพดานโล่มืด (% Max HP)',
  'monk.mastery.atkPct': 'ชำนาญสนับมือ/พลอง: P.ATK +%', 'monk.mastery.combo': 'ชำนาญสนับมือ/พลอง: คอมโบ +',
  // 🌩️ Wizard
  'wizard.castTaken': '🔮 ร่ายใหญ่: โดนตีแรงขึ้นระหว่างชาร์จ', 'wizard.quickMana': '🌀 ★ Quagmire: Mana ≥ % นี้ร่ายทันที',
  'wizard.gustHits': '❄️ Storm Gust: จำนวนฮิต (ฮิต 3 แช่แข็ง)', 'wizard.gustMul': '❄️ Storm Gust: ดาเมจต่อฮิต × พลังเวท',
  'wizard.gustChill': '❄️ Storm Gust: ช้าบอส/มินิ (เทิร์น)', 'wizard.gustPush': '❄️ Storm Gust: ผลักเกจบอส/มินิ',
  'wizard.meteors': '☄️ Meteor Storm: จำนวนอุกกาบาต', 'wizard.meteorMul': '☄️ Meteor Storm: ดาเมจต่อลูก × พลังเวท',
  'wizard.meteorBurn': '☄️ Meteor Storm: เผาซ้อน (stack)', 'wizard.lovHits': '⚡ LoV: จำนวนฮิตทุกตัว',
  'wizard.lovMul': '⚡ LoV: ดาเมจต่อฮิต × พลังเวท', 'wizard.lovStun': '⚡ LoV: โอกาสมึนต่อฮิต',
  'wizard.lovPush': '⚡ LoV: ผลักเกจบอส/มินิ', 'wizard.iceBarrier': '❄️ บาเรียน้ำแข็งเพิ่ม × M.ATK',
  'wizard.mastery.matk': 'ชำนาญไม้เท้า: M.ATK +', 'wizard.mastery.spellCrit': 'ชำนาญไม้เท้า: เวทคริ +',
  // 📖 Sage
  'sage.basicMul': '📖 ตีธรรมดาประชิด × P.ATK', 'sage.s1InfuseBonus': '📖 ทักษะ 1 (ติดตัว): โบนัสดาเมจตีประชิดเมื่อจ่าย Mana',
  'sage.autoChance': '📖 Auto Spell: โอกาสพื้นฐาน', 'sage.autoInt': '📖 Auto Spell: โอกาสเพิ่มต่อ 1 INT',
  'sage.autoCap': '📖 Auto Spell: เพดานโอกาสสูงสุด', 'sage.autoMul': '📖 Auto Spell: ดาเมจ Bolt × พลังเวท',
  'sage.endowTurns': '🗡️ Endow: นาน (เทิร์น)', 'sage.endowAmp': '🗡️ Endow: เพิ่มแรงตี/Auto/Perk',
  'sage.endowPerkChance': '🗡️ Endow: โอกาส Auto/Perk +', 'sage.ultAtk': '🚫 Spell Breaker: ฟาด × P.ATK',
  'sage.ultPm': '🚫 Spell Breaker: ฟาด × พลังเวท', 'sage.ultMana': '🚫 Dispell: ขโมย Mana เมื่อร่าย',
  'sage.ultBreakTurns': '🚫 Spell Breaker: ทำลายเกราะ (เทิร์น)',
  'sage.rodBlockMana': '🌀 ★ Magic Rod: Mana ที่ได้เมื่อกันเวทแรก', 'sage.rodVitMana': '🔮 Magic Rod: Mana เพิ่มต่อ VIT', 'sage.rodVitShield': '🔮 Magic Rod: โล่ต่อ VIT',
  'sage.dexSkillCrit': '🎯 Sage DEX: สกิลคริ +/แต้ม', 'sage.dexSkillCritCap': '🎯 Sage DEX: เพดานสกิลคริ',
  'sage.dexCombo': '🎯 Sage DEX: คอมโบ +/แต้ม', 'sage.dexComboCap': '🎯 Sage DEX: เพดานคอมโบ',
  'sage.wisElemDmg': '💧 Sage WIS: ดาเมจธาตุ +/แต้ม', 'sage.wisElemCap': '💧 Sage WIS: เพดานดาเมจธาตุ',
  'sage.lukProcCritMul': '🍀 Sage LUK: ดาเมจคริ On-Hit +/แต้ม', 'sage.lukProcCritCap': '🍀 Sage LUK: เพดานคริ On-Hit',
  'sage.perk.offMul': '🔮 Perk นอกธาตุหลัก: สัดส่วนพลัง',
  'sage.perk.fireChance': '🔥 Fire Bolt: โอกาสพื้นฐาน', 'sage.perk.fireMul': '🔥 Fire Bolt: ดาเมจ × พลังเวท', 'sage.perk.fireMaxBolts': '🔥 Fire Bolt: สูงสุดต่อเทิร์น (ลูก)',
  'sage.perk.lightChance': '⚡ Chain Lightning: โอกาสพื้นฐาน', 'sage.perk.lightMul': '⚡ Chain Lightning: ดาเมจ × พลังเวท', 'sage.perk.lightDecay': '⚡ Chain Lightning: ดาเมจลดต่อชิ่ง',
  'sage.perk.iceChance': '❄️ Permafrost: โอกาสซ้อนพื้นฐาน', 'sage.perk.iceMax': '❄️ Permafrost: สแตกครบแตก', 'sage.perk.iceMul': '❄️ Permafrost: ดาเมจแตก × พลังเวท',
  'sage.mastery.atkPct': 'ชำนาญหนังสือ/ไม้เท้า: P.ATK +%', 'sage.mastery.matk': 'ชำนาญหนังสือ/ไม้เท้า: M.ATK +',
  // 🐺 Beastmaster
  'beastmaster.packPow': '🐾 ฝูง 3 ตัว: พลังสัตว์แต่ละตัว ×', 'beastmaster.hawkChance': '🦅 Blitz Beat: โอกาสพื้นฐาน',
  'beastmaster.hawkLuk': '🦅 Blitz Beat: โอกาสเพิ่มต่อ 1 LUK', 'beastmaster.hawkCap': '🦅 Blitz Beat: เพดานโอกาสสูงสุด',
  'beastmaster.hawkMul': '🦅 เหยี่ยว: ดาเมจต่อเป้า × P.ATK', 'beastmaster.hawkHits': '🦅 เหยี่ยว: จำนวนเป้าขั้นต่ำ',
  'beastmaster.hawkHitsMax': '🦅 เหยี่ยว: จำนวนเป้าสูงสุด', 'beastmaster.hawkEvoMul': '✨ เหยี่ยวทอง: ดาเมจเพิ่ม ×',
  'beastmaster.hawkEvoHits': '✨ เหยี่ยวทอง: จำนวนเป้าเพิ่ม',
  'beastmaster.preyMark': '🏷️ Prey Mark: ดาเมจที่ได้รับ +', 'beastmaster.preyTurns': '🏷️ Prey Mark: นาน (เทิร์นมอน)',
  'beastmaster.gustEvery': '🪶 Razor Gust: ทุก Blitz Beat ครั้งที่ N', 'beastmaster.gustBlind': '🪶 Razor Gust: ตาบอดนาน (เทิร์น)',
  'beastmaster.blindHit': '🙈 Razor Gust: ตาบอดลดค่า Hit ศัตรู',
  'beastmaster.spotCrit': '👁️ ★ ตาทิพย์: คริฮีโร่ +', 'beastmaster.boarHp': '🐗 หมูป่า: HP (% Max HP ฮีโร่)',
  'beastmaster.boarShare': '🐗 หมูป่า: รับดาเมจแทนฮีโร่ (สัดส่วน)', 'beastmaster.boarCut': '🐗 หมูป่า: ลดดาเมจที่ตัวเองรับ',
  'beastmaster.boarRageK': '🐗 หมูป่า: เกจโกรธต่อ (ดาเมจรับ / HP หมูป่า)', 'beastmaster.boarRecoverTurns': '🐗 หมูป่า: พักฟื้น (เทิร์นฮีโร่)', 'beastmaster.boarDown': '🐗 หมูป่า: พักฟื้น (สำรอง)',
  'beastmaster.boarEvoShare': '🐗 หมูป่าเกราะ: รับแทนเพิ่ม', 'beastmaster.boarEvoDown': '🐗 หมูป่าเกราะ: พักฟื้น (เทิร์น)',
  'beastmaster.boarReviveShield': '🐗 หมูป่าเกราะ: โล่ให้ฮีโร่เมื่อตื่น (% HP)', 'beastmaster.boarGuardHpPct': '🛡️ ปราการพิทักษ์: เกณฑ์ HP หมูป่า',
  'beastmaster.boarEvery': '🐗 หมูป่า: พุ่งชนมึนทุก N เทิร์น',
  'beastmaster.boarMul': '🐗 หมูป่า: ดาเมจพุ่งชน × P.ATK', 'beastmaster.boarPush': '🐗 หมูป่า: ผลักเกจบอส/มินิ (ทุกสกิลชน)',
  'beastmaster.boarEvoHp': '🐗 หมูป่าเกราะ: HP เพิ่ม (% Max HP)', 'beastmaster.boarEvoEvery': '🐗 หมูป่าเกราะ: พุ่งชนทุก N เทิร์น',
  'beastmaster.wolfSpeed': '🐺 หมาป่า: ความเร็ว × ความเร็วฮีโร่', 'beastmaster.wolfMul': '🐺 หมาป่า: ดาเมจกัด × P.ATK',
  'beastmaster.wolfBleed': '🐺 หมาป่า: เลือดไหล (poison stack)', 'beastmaster.wolfEvoMul': '👑 ราชาหมาป่า: ดาเมจเพิ่ม ×',
  'beastmaster.wolfEvoSpeed': '👑 ราชาหมาป่า: ความเร็วเพิ่ม ×',
  'beastmaster.frenzyCap': '🩸 คลั่งเลือด: นับเลือดไหลสูงสุด (stack)', 'beastmaster.frenzySpd': '🩸 คลั่งเลือด: ความเร็ว +ต่อ stack ต่อ Lv',
  'beastmaster.crunchEvery': '🦷 ★ ขย้ำปลิดชีพ: ทุกการกัดครั้งที่ N', 'beastmaster.crunchLow': '🦷 ★ ขย้ำปลิดชีพ: HP ศัตรูต่ำกว่า',
  'beastmaster.crunchHeal': '🦷 ★ ขย้ำปลิดชีพ: ฮีลฮีโร่+หมูป่า (สัดส่วนดาเมจ)', 'beastmaster.harmonyWolf': '🤝 ★ Harmony: หมาป่าตีเป้า 🏷️ แรง +',
  'beastmaster.harmonyBoarHeal': '🤝 ★ Harmony: ฮีลหมูป่า (% Max HP หมูป่า)', 'beastmaster.wolfBleedCap': '🐺 ทาเลนต์ IV: เพดานเลือดไหล %HP (× P.ATK)',
  'beastmaster.cmdHawkHits': '📯 สั่งลุยเหยี่ยว: จำนวนครั้งที่ฟาด',
  'beastmaster.cmdBoarShield': '📯 สั่งลุยหมูป่า: โล่ให้ฮีโร่ (% HP)', 'beastmaster.cmdPack': '📯 สั่งลุยหมาป่า: จำนวนฝูงที่เรียก',
  'beastmaster.cmdPackTurns': '📯 สั่งลุยหมาป่า: ฝูงอยู่นาน (เทิร์น)', 'beastmaster.cmdPackPow': '📯 สั่งลุยหมาป่า: พลังตัวในฝูง ×',
  'beastmaster.ultAwakenTurns': '🐾 Awakening: ระยะเวลา (เทิร์นฮีโร่)', 'beastmaster.ultBoarShare': '🐾 Awakening 🐗: หมูป่ารับดาเมจแทน',
  'beastmaster.ultReflect': '🐾 Awakening 🐗: สะท้อนคลื่นกระแทก (สัดส่วนที่รับ)', 'beastmaster.ultEndShield': '🐾 Awakening จบ: โล่ฮีโร่ (สัดส่วนดาเมจที่หมูป่ารับ)',
  'beastmaster.ultEndShieldMin': '🐾 Awakening จบ: โล่ขั้นต่ำ (% Max HP ฮีโร่)',
  'beastmaster.petHealLowHp': '🩹 เยียวยาพงไพร: เกณฑ์ HP ฮีโร่ฮีล x2', 'beastmaster.roarWeakenTurns': '🐺 เสียงขู่พงไพร: ลด P.ATK นาน (เทิร์นมอน)',
  'beastmaster.mastery.atkPct': 'ชำนาญธนู: P.ATK +%', 'beastmaster.mastery.hit': 'ชำนาญธนู: Hit +',
  'beastmaster.tree.hawkChance': '🦅 ตาเหยี่ยว: โอกาส +/Lv', 'beastmaster.tree.hawkHit': '🦅 ตาเหยี่ยว: HIT +/Lv', 'beastmaster.tree.markPierceFlee': '🦅 ตาเหยี่ยว: เมิน Flee เป้า 🏷️/Lv',
  'beastmaster.tree.hawkMul': '🪶 กรงเล็บเหล็ก: เหยี่ยวแรง +/Lv', 'beastmaster.tree.hawkIntAdd': '🪶 กรงเล็บเหล็ก: +INT ต่อฮิต/Lv', 'beastmaster.tree.preyMarkAdd': '🏷️ Mark แรง +/Lv', 'beastmaster.tree.preyTurnsAtLv': '🏷️ Mark นานขึ้นที่ Lv เดิม',
  'beastmaster.tree.boarHp': '🐗 พันธะศิลา: HP หมูป่า +/Lv', 'beastmaster.tree.boarShare': '🐗 พันธะศิลา: แบ่งรับ +/Lv', 'beastmaster.tree.boarCut': '🐗 พันธะศิลา: ลดดาเมจหมูป่า +/Lv',
  'beastmaster.tree.boarMul': '💥 เขี้ยวงัดพายุ: พุ่งชนแรง +/Lv', 'beastmaster.tree.boarRageK': '💢 แรงฮึด: เกจโกรธ +/Lv', 'beastmaster.tree.boarShield': '🛡️ ปราการพิทักษ์: โล่ +/Lv', 'beastmaster.tree.boarGuardDr': '🛡️ ปราการพิทักษ์: ลดดาเมจเข้า +/Lv', 'beastmaster.tree.boarDownCut': '🐗 หมูป่าเกราะ: ลดเทิร์นพักฟื้น',
  'beastmaster.tree.wolfMul': '🐺 คมเขี้ยวฉีกเนื้อ: กัดแรง +/Lv', 'beastmaster.tree.wolfPierceBleed': '🐺 คมเขี้ยว: เมิน DEF เป้า Bleed/Lv', 'beastmaster.tree.wolfBleed': '🩸 แผลลึก: Bleed +/Lv', 'beastmaster.tree.bleedDmg': '🩸 แผลลึก: Bleed DoT +/Lv', 'beastmaster.tree.wolfSpeed': '💨 ฝีเท้าคลั่ง: เร็ว +/Lv',
  'beastmaster.tree.petPow': '🐾 ใจเดียวกัน: สัตว์แรง + (ต่อ Lv เดิม)', 'beastmaster.tree.petStatScale': '🐾 ใจเดียวกัน: สเกลสเตตัสสูงสุด +/Lv',
  'beastmaster.tree.petRes': '🔋 ประสานล่า: Energy ต่อครั้งสัตว์ตี', 'beastmaster.tree.wolfRallyStep': '🔋 ประสานล่า: ตีปกติเร่งเกจหมาป่า +/Lv',
  'beastmaster.tree.cmdCut': '📯 คำสั่งจ่าฝูง: ลดค่า Energy สั่งลุย', 'beastmaster.tree.cmdHawkLv': '📯 คำสั่งจ่าฝูง: เหยี่ยวโฉบ +1 ครั้งที่ Lv เดิม',
  'beastmaster.tree.pack3Pow': '🦁 ★ ฝูงพันธมิตร: สัตว์ทุกตัวแรง +',
  'beastmaster.tree.packLead': '🎯 กลิ่นอายจ่าฝูง: ฮีโร่แรง +ต่อสัตว์ที่อยู่', 'beastmaster.tree.petHeal': '🩹 เยียวยาพงไพร: ฮีล % HP ต่อสัตว์ลงมือ', 'beastmaster.tree.petHealLow': '🩹 เยียวยาพงไพร: ตัวคูณเมื่อเลือด < 35%',
  'beastmaster.tree.roar': '🐺 เสียงขู่พงไพร: ลดเกจมอนต้นเวฟ', 'beastmaster.tree.roarWeaken': '🐺 เสียงขู่พงไพร: ลด P.ATK มอน +/Lv',
  // 🔧 Innovator
  'innovator.traps': '🧰 กล่องเครื่องมือ: กับดักต้นเวฟ (อัน)', 'innovator.mineMul': '💣 Land Mine: ดาเมจ × P.ATK',
  'innovator.snarePush': '🕳️ Ankle Snare: ผลักเกจบอส/มินิ', 'innovator.freezeMul': '❄️ Freezing Trap: ดาเมจ × P.ATK',
  'innovator.freezeChill': '❄️ Freezing Trap: ติดช้านาน (เทิร์น)', 'innovator.rareLuk': '🍀 กล่องสุ่ม: น้ำหนักของหายากต่อ LUK',
  'innovator.rareLukCap': '🍀 กล่องสุ่ม: เพดานโบนัส LUK ของหายาก', 'innovator.chickenSoaks': '🐔 ไก่ยาง: รับตีแทนได้กี่ครั้ง',
  'innovator.rocketMul': '🚀 จรวดขวด: ดาเมจตัวหน้า × P.ATK', 'innovator.turretMul': '🤖 หุ่นจิ๋ว: ยิง × P.ATK',
  'innovator.turretTurns': '🤖 หุ่นจิ๋ว: อยู่นาน (เทิร์น)', 'innovator.magnetZeny': '🧲 แม่เหล็ก: Zeny เวฟนี้เพิ่ม (%)',
  'innovator.mirrorCap': '🔁 กระจก: สะท้อนฮิตถัดไป (% ดาเมจ)', 'innovator.colaMul': '🥤 โคล่าระเบิด: ดาเมจทุกตัว × P.ATK',
  'innovator.colaChill': '🥤 โคล่าระเบิด: ติดช้านาน (เทิร์น)', 'innovator.wetTurns': '☁️ เมฆฝน: เปียกนาน (เทิร์น)',
  'innovator.wetAmp': '☁️ เมฆฝน: มอนโดนฮีโร่ตีแรงขึ้น (%)', 'innovator.ultBoxes': '🛠️ สิ่งประดิษฐ์สุดเพี้ยน: สุ่มกล่อง (ครั้ง)',
  'innovator.mastery.atkPct': 'ชำนาญธนู: P.ATK +%', 'innovator.mastery.crit': 'ชำนาญธนู: คริ +',
}
/** Which column a KIT2 key goes to. Skill 3 Mana / cooldown are NOT here: jobs2.ts copies them at import, so they are tuned on JOB2 (job2.<id>.skill3.cost / cd). */
const J2_COL: Partial<Record<Job2Id, { s3: RegExp; ult: RegExp }>> = {
  berserker: { s3: /^wave/, ult: /^ult/ },
  knight: { s3: /^brand/, ult: /^(pierce|bash)/ },
  rogue: { s3: /^stab/, ult: /^ult/ },
  mobster: { s3: /^(cut|armorBrk)/, ult: /^(ult|burst)/ },
  crusader: { s3: /^(cross|blind)/, ult: /^gc/ },
  monk: { s3: /^(thunder|comboThunder)/, ult: /^(bell|asura)/ },
  wizard: { s3: /^gust/, ult: /^(meteor|lov|iceBarrier)/ },
  sage: { s3: /^endow/, ult: /^ult/ },
  beastmaster: { s3: /^cmd/, ult: /^ult/ },
  innovator: { s3: /^(rare|chicken|rocket|turret|magnet|mirror|cola|wet)/, ult: /^ult/ },
}
const INTISH = /(Turns|Hits|Max|Keep|At|Stacks|Every|Boxes|Knives|Count|CdCut|Per(Swing|Combo))$/
/** Ranges that the generic rule (0..10x the default) gets wrong. */
const J2_DEF: Record<string, FieldDef> = {
  'knight.s4.cost': COST, 'knight.s4.cd': CD, 'knight.s4.unlockLv': int(1, 70), 'knight.s4.lkHits': int(1, 10), 'knight.s4.bossGauge': int(0, 200),
  'knight.s4.defPierce': FRAC, 'knight.s4.critAdd': FRAC, 'knight.s4.spBreakAmp': num(0, 5),
  'knight.boomerangTurns': CD, 'knight.brandPushOther': int(0, 200), 'knight.brandCritAdd': FRAC, 'knight.spiralS3S4Pierce': FRAC,
  'knight.tree.sweepCritAdd': FRAC, 'knight.tree.sweepRes': int(0, 100),
  'berserker.mastery.skillCrit': FRAC, 'berserker.waveCdJ2': CD, 'berserker.waveHits': int(1, 10),
  'berserker.waveMultiRage': int(0, 100), 'berserker.ultRageGain': int(0, 100),
}
function j2Leaves(id: Job2Id): SkillOwnRef[] {
  const out: SkillOwnRef[] = []
  const walk = (o: Record<string, unknown>, pre: string) => {
    for (const [k, v] of Object.entries(o)) {
      const key = pre ? `${pre}.${k}` : k
      if (typeof v === 'number') {
        if (/(Cost|Cd)$/.test(k)) continue // copied into JOB2 at import (see above)
        const hi = Math.max(10, Math.ceil(Math.abs(v) * 10))
        out.push(sk(`kit2.${id}.${key}`, J2_LABEL[`${id}.${key}`] ?? key, J2_DEF[`${id}.${key}`] ?? (INTISH.test(k) && Number.isInteger(v) ? int(0, hi) : num(0, hi))))
      } else if (Array.isArray(v) && v.every((x) => typeof x === 'number')) { // v109: number lists (Grand Cross pulses per Lv)
        v.forEach((x: number, i: number) => out.push(sk(`kit2.${id}.${key}.${i}`, J2_LABEL[`${id}.${key}.${i}`] ?? `${key}[${i}]`, Number.isInteger(x) ? int(0, Math.max(10, x * 10)) : num(0, Math.max(10, Math.ceil(x * 10))))))
      } else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v as Record<string, unknown>, key)
    }
  }
  walk(KIT2[id] as unknown as Record<string, unknown>, '')
  return out
}
export function job2Layout(id: Job2Id): Job2Layout {
  const col = J2_COL[id], leaves = j2Leaves(id), key = (r: SkillRef) => r.path.split('.').slice(2).join('.')
  const s4 = leaves.filter((r) => key(r).startsWith('s4.'))
  const s3 = leaves.filter((r) => !s4.includes(r) && col?.s3.test(key(r))), ult = leaves.filter((r) => !s4.includes(r) && col?.ult.test(key(r)))
  const j3 = J3_OF[id]
  return {
    s1: JOB2[id].autoCost !== undefined ? [sk(`job2.${id}.autoCost`, `ค่าร่ายทักษะ 1 (${JOB2[id].resource === 'rage' ? 'Rage' : JOB2[id].resource === 'energy' ? 'Energy' : 'Mana'})`, COST)] : [],
    s3: [sk(`job2.${id}.skill3.cost`, 'ค่าร่าย', COST), sk(`job2.${id}.skill3.cd`, 'คูลดาวน์ (เทิร์น)', CD), ...s3],
    ult: [sk(`job2.${id}.ult.cd`, 'คูลดาวน์ (เทิร์น)', CD), ...ult],
    s4,
    j3: j3 ? j3Leaves(j3) : [],
    other: leaves.filter((r) => !s3.includes(r) && !ult.includes(r) && !s4.includes(r)),
  }
}

/** Q 2026-11-24: which Awakening's KIT3 numbers show under a 2nd job (Swordsman line first; add a line = add its labels to J3_LABEL). */
type J3Shown = 'lordknight' | 'warlord' | 'paladin' | 'champion'
export const J3_OF: Partial<Record<Job2Id, J3Shown>> = { knight: 'lordknight', berserker: 'warlord', crusader: 'paladin', monk: 'champion' } // M3: + Cleric line
const J3_NAME: Record<J3Shown, string> = { lordknight: '🐉 Lord Knight', warlord: '🪓 Warlord', paladin: '⚜️ Paladin', champion: '🥊 Champion' }
const VAR_LABEL = (v: 'A' | 'B', name: string, branch: string): Record<string, string> => ({
  [`var${v}.per`]: `${name}: แรงขึ้นต่อแต้มในสาย ${branch}`, [`var${v}.cap`]: `${name}: เพดานโบนัสจากแต้มสาย`,
})
/** Hand-written Thai labels for the KIT3 numbers J3_OF exposes (keys = path under KIT3.<id>). */
const J3_LABEL: Record<J3Shown, Record<string, string>> = {
  paladin: {
    capAdd: '⚜️ Prestige: เพดาน Auto Guard เพิ่ม', blockAmp: '⚜️ Prestige: โล่/ฮีลจากบล็อก ×', blockFaith: '⚜️ Prestige: บล็อกแล้วได้ศรัทธา',
    gospelPulse: '✨ Gospel Cross: pulse เพิ่ม', gospelAt: '✨ Gospel Cross: โดนกี่ตัวขึ้นไปได้ศรัทธา', gospelFaith: '✨ Gospel Cross: ศรัทธาที่ได้', gospelHealMax: '✨ Gospel Cross: ฮีลสูงสุด (ครั้ง)',
    'varA.hits': '🔗 Shield Chain: จำนวนฮิต', 'varA.atk': '🔗 Shield Chain: ต่อฮิต × P.ATK', 'varA.def': '🔗 Shield Chain: ต่อฮิต × P.DEF', 'varA.noShield': '🔗 Shield Chain: ไม่มีโล่ ×',
    ...VAR_LABEL('A', '🔗 Shield Chain', 'โล่'),
    'varB.atk': '⚖️ Pressure: ดาเมจ × P.ATK', 'varB.hp': '⚖️ Pressure: บวก % Max HP', 'varB.blindAdd': '⚖️ Pressure: ตาบอดเพิ่ม (เทิร์น)',
    ...VAR_LABEL('B', '⚖️ Pressure', 'อุทิศ'),
    'leg.crossCap': '🧬 มรดก: เพดานโบนัสสกิล', 'leg.guardCap': '🧬 มรดก: เพดานโบนัส Auto Guard', 'leg.hpCap': '🧬 มรดก: เพดานโบนัส Max HP', heirNeed: '👑 ทายาท: แต้มในสายที่ต้องมี',
  },
  champion: {
    chargeMaxAdd: '🧘 Ki Translation: ลูกพลังสูงสุดเพิ่ม', comboManaBonus: '🧘 Ki Translation: คอมโบได้ Mana เพิ่ม', gritMdefBonus: '🧘 Ki Translation: แรงฮึดจาก M.DEF',
    extraHits: '✨ Supreme Asura / Bell: คลื่นเพิ่ม', earthDrivePer: '🌋 Earth Drive: × P.DEF ต่อ Lv', thunderShare: '🔵 ร่างแปลงสกิล 3: สัดส่วน j2ThunderPer ที่นับต่อลูก',
    'varA.mul': '🐅 Tiger Knuckle: ดาเมจ × P.ATK', 'varA.hp': '🐅 Tiger Knuckle: บวก % Max HP', 'varA.stunTurns': '🐅 Tiger Knuckle: สตัน (เทิร์น)', 'varA.chargePer': '🐅 Tiger Knuckle: แรงขึ้นต่อลูกพลังที่ใช้',
    ...VAR_LABEL('A', '🐅 Tiger Knuckle', 'คอมโบ'),
    'varB.mul': '💥 Chain Crush: ดาเมจ × P.ATK', 'varB.mdefHp': '💥 Chain Crush: × M.DEF × Max HP', 'varB.chargePer': '💥 Chain Crush: แรงขึ้นต่อลูกพลังที่ใช้',
    ...VAR_LABEL('B', '💥 Chain Crush', 'หมัดแค้น'),
    'leg.crossCap': '🧬 มรดก: เพดานโบนัสสกิล', 'leg.guardCap': '🧬 มรดก: เพดานโบนัสป้องกัน', 'leg.hpCap': '🧬 มรดก: เพดานโบนัส Max HP', heirNeed: '👑 ทายาท: แต้มในสายที่ต้องมี',
  },
  lordknight: {
    hpDmgAdd: '🐉 Aura Blade: สกิลหอกบวก % Max HP เพิ่ม', hpPct: '🐉 Aura Blade: Max HP +%', extraHits: '✨ Hundred Spear: Pierce ฮิตเพิ่ม',
    'varA.mul': '🐉 Dragon Breath: ดาเมจทุกตัว × P.ATK', 'varA.hp': '🐉 Dragon Breath: บวก % Max HP', 'varA.burn': '🐉 Dragon Breath: เผานาน (เทิร์น)', 'varA.burnAtk': '🐉 Dragon Breath: เผาต่อเทิร์น × P.ATK',
    ...VAR_LABEL('A', '🐉 Dragon Breath', 'กวาดทวน'),
    'varB.mul': '💥 Joint Beat: ดาเมจ × P.ATK', 'varB.hp': '💥 Joint Beat: บวก % Max HP', 'varB.pierce': '💥 Joint Beat: ข้าม DEF',
    ...VAR_LABEL('B', '💥 Joint Beat', 'หอกทะลวง'),
    'leg.crossCap': '🧬 มรดก: เพดานโบนัสสกิล', 'leg.guardCap': '🧬 มรดก: เพดานโบนัส Auto Guard', 'leg.hpCap': '🧬 มรดก: เพดานโบนัส Max HP', heirNeed: '👑 ทายาท: แต้มในสายที่ต้องมี',
  },
  warlord: {
    frenzyMaxAdd: '🪓 Undying Warlord: Frenzy สูงสุดเพิ่ม', rageCritPer: '🪓 Undying Warlord: คริต่อ 1 Rage', rageCritDmgPer: '🪓 Undying Warlord: ดาเมจคริต่อ 1 Rage',
    carnageDmg: '🪓 Aspect of Carnage: ดาเมจทั้งหมด +', carnageTaken: '🪓 Aspect of Carnage: ข้อเสียโดนตีแรงขึ้น',
    ultRageGain: '🩸 Undying Bloodlust: ได้ Rage ตอนกด', ultUndyingTurns: '🩸 Undying Bloodlust: อมตะ (เทิร์น)', ultBloodHealBase: '🩸 Undying Bloodlust: ฮีลฐาน (% Max HP)',
    ultBloodHealPerRage: '🩸 Undying Bloodlust: ฮีลเพิ่มต่อ 1 Rage', ultFuryCritRage: '🔥 Bloodlust: คริแล้วได้ Rage', ultFuryCritHeal: '🔥 Bloodlust: คริแล้วฮีล (% Max HP)',
    'varA.hits': '⚔️ Spinning Guillotine: จำนวนฮิต', 'varA.mul': '⚔️ Spinning Guillotine: ต่อฮิต × P.ATK', 'varA.critAdd': '⚔️ Spinning Guillotine: คริเพิ่ม',
    'varA.execMax': '⚔️ Spinning Guillotine: execute สูงสุด', 'varA.splashShare': '⚔️ Spinning Guillotine: กระเด็นใส่ตัวอื่น (สัดส่วน)',
    ...VAR_LABEL('A', '⚔️ Spinning Guillotine', '💥 สับ'),
    'varB.mul': "📣 Warlord's Warcry: ดาเมจ × P.ATK", 'varB.weakPct': "📣 Warcry: มอนอ่อนแรง (%)", 'varB.weakTurns': '📣 Warcry: อ่อนแรงนาน (เทิร์น)', 'varB.breakTurns': '📣 Warcry: เกราะแตก (เทิร์น)',
    'varB.push': '📣 Warcry: ผลักเกจมอน', 'varB.rage': '📣 Warcry: ได้ Rage', 'varB.shield': '📣 Warcry: โล่ (% Max HP)', 'varB.heirPush': '📣 Warcry: ผลักเกจเพิ่ม (ทายาท)',
    ...VAR_LABEL('B', "📣 Warlord's Warcry", '🩸 คลั่ง'),
    'leg.crossCap': '🧬 มรดก: เพดานโบนัสสกิล', 'leg.guardCap': '🧬 มรดก: เพดานโบนัสป้องกัน', 'leg.hpCap': '🧬 มรดก: เพดานโบนัส Max HP', heirNeed: '👑 ทายาท: แต้มในสายที่ต้องมี',
    warcryRage: '📣 คำรามทลายทัพ: ได้ Rage ต้นไฟต์',
  },
}
const J3_INT = /(Hits|Turns|Need|Gain|Rage|MaxAdd|push|Push|rage|hits|burn|Faith|Pulse|At|HealMax|blindAdd)$/
function j3Leaves(id: J3Shown): SkillOwnRef[] {
  const out: SkillOwnRef[] = []
  const walk = (o: Record<string, unknown>, pre: string) => {
    for (const [k, v] of Object.entries(o)) {
      const key = pre ? `${pre}.${k}` : k
      if (typeof v === 'number') {
        const hi = Math.max(10, Math.ceil(Math.abs(v) * 10))
        out.push(sk(`kit3.${id}.${key}`, `${J3_NAME[id]} · ${J3_LABEL[id][key] ?? key}`, Number.isInteger(v) && J3_INT.test(k) ? int(0, Math.max(hi, 100)) : num(0, hi)))
      } else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v as Record<string, unknown>, key)
    }
  }
  walk(KIT3[id] as unknown as Record<string, unknown>, '')
  return out
}

/** The crit-power ref of one slot (always shown first in its column). */
export const critRef = (c: SkillClass, slot: CritSlot): SkillOwnRef => sk(`crit.${c}.${slot}`, 'ความแรงคริ (1 = ปกติ · 0.5 = โบนัสคริเหลือครึ่ง · 0 = ไม่คริ)', num(0, 1))

/** Every `skills` ref (incl. crit switches), de-duplicated by path: tunables.ts turns these into the table's whitelist. */
export function skillTableFields(): [string, FieldDef][] {
  const out = new Map<string, FieldDef>()
  const add = (r: SkillRef) => { if (r.table === 'skills' && 'def' in r && !out.has(r.path)) out.set(r.path, (r as SkillOwnRef).def) }
  for (const c of SKILL_CLASSES) {
    const l = SKILL_LAYOUT[c]
    for (const slot of CRIT_SLOTS) add(critRef(c, slot))
    l.s1.forEach(add); l.ult.forEach(add); l.s2.forEach((x) => x.refs.forEach(add)); l.tree?.forEach(add)
  }
  for (const id of JOB2_IDS) { const l = job2Layout(id); [...l.s1, ...l.s3, ...l.ult, ...l.s4, ...l.j3, ...l.other].forEach(add) }
  return [...out.entries()]
}

let root: object | null = null
/** The object the `skills` table patches in place: refs to the real consts, so writes reach the game's data. Built on first use (module cycles). */
export function skillRoot(): object {
  return (root ??= {
    job: JOBS, sword: SWORD_MANA, swordS1: SWORD_S1, mage: MAGE_SPELL, s2p: S2P, s2n: S2N, crit: SKILL_CRIT, job2: JOB2, kit2: KIT2, kit3: KIT3, // v107: 2nd jobs · Q 2026-11-24: Awakening numbers
    skill2: Object.fromEntries(SKILL2.map((s) => [s.id, s])), // keyed by id: a patch path never depends on array order
  })
}
