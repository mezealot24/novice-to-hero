// ===== Jobs (classes). Novice -> one of 5 base classes after beating the first dungeon's boss. =====
// Each job: a stat focus, a resource that drives its automatic skill, a tap-to-use ultimate on a
// turn cooldown, and the card tags it draws at level-up (plus one common card every time).
import type { Resource, Stats, Tag } from './game-data'

export type JobId = 'novice' | 'swordsman' | 'archer' | 'mage' | 'cleric' | 'thief'
export type AttackStyle = 'melee' | 'ranged' | 'magic'

export interface JobSkill { name: string; icon: string; desc: string }
export interface JobDef {
  id: JobId; name: string; icon: string; tex: string; blurb: string; focus: string
  resource: Resource | null; attack: AttackStyle; tags: Tag[]; mod: Partial<Stats>
  auto: JobSkill & { cost: number }; ult: JobSkill & { cd: number; cost?: number } // ult cost: Mana (Mage, Swordsman)
}

/** repickGems (Q 2026-11-04): a class can switch to another base class for gems. Pure respec: Job Lv/EXP stay,
 *  the skill web refunds every point, talents clear (re-place them free). Gems are earnable free, so this stays cheap. */
export const JOB_CHANGE = { needClears: 1, classMaxJobLevel: 40, repickGems: 30 }
export const RES_RULES = {
  rageMax: 100, rageOnHit: 12, rageOnHurt: 8,
  energyMax: 100, energyPerTurn: 25,
  manaPerTurnMul: 3, // resRegen (3 + WIS) x this, per hero turn
}
/** Mage (Q 2026-11-03): no Mana Shield; every spell costs Mana, the basic attack is a weak free magic bolt. */
export const MAGE_SPELL = {
  autoMul: 0.9, // ลูกไฟระเบิด x M.ATK (1.1 until the class rebalance 2026-11-03)
  barrier: 1.5, // ult barrier x M.ATK (2 until the class rebalance)
  basicMul: 0.6, // basic attack: magic projectile 0.6x M.ATK, free
  boltPerHit: 2, // card Lightning Bolt: Mana per hit, cast only when Mana covers every hit
  fireBolt: 8, // card ลูกไฟ: Mana per fireball, skipped when Mana is short
}

/** Swordsman (Q 2026-11-03): Rage is gone, the knight runs on a small Mana pool like RO (design/swordsman-mana-nerf.md).
 *  A STR/VIT build gets only the base pool and regen, so skills are rationed and the basic swing + counters carry the fight. */
export const SWORD_MANA = {
  auto: 20, // ฟันพายุ
  ult: 25, // ดาบพิทักษ์ (plus its turn cooldown; booked ult waits for Mana like the Mage's)
  autoMul: 1.25, // ฟันพายุ x P.ATK (1.3 before the class rebalance 2026-11-03, 1.15 in v40, 1.25 after the lifesteal cut 2026-11-04)
  ultMul: 1.2, // ดาบพิทักษ์ x P.ATK (1.4 until the class rebalance)
  ultShield: 0.15, // ดาบพิทักษ์ (0.1 in v40-v43, back to 0.15 after the lifesteal cut 2026-11-04) shield, share of max HP (0.25 in the Rage era; Q chose the armour trim 2026-11-03)
}

/** Cleric kit numbers (class rebalance 2026-11-03: was heal 22%, ult shield 35% + heal 15%; gear/cards should make up the gap).
 *  v58 melee hybrid (Q 2026-11-04): basic attack = mace/book smash on P.ATK (STR); spells (light, spear, Holy Light, ไฟชำระ) on M.ATK (INT).
 *  Ult: ultAtk x P.ATK to every monster + ultLights Holy Light (ultLight x M.ATK each, random target) + shield ultShield of max HP that lasts ultShieldTurns hero turns.
 *  Q 09:50: every Priest heal = x M.ATK (heal, ฟื้นฟู, ไฟชำระ) then x (1 + ฮีลแรง from WIS); shields = x max HP, last shieldTurns hero turns, total capped at shieldCap of max HP.
 *  Per-level node numbers live in skill-math.ts KIT. */
export const CLERIC_KIT = { heal: 0.7, smite: 1.4, basic: 1.1, ultAtk: 1.5, ultLights: 3, ultLight: 0.8, ultShield: 0.14, ultShieldTurns: 3, purifyHeal: 1, shieldTurns: 3, shieldCap: 0.5, ultMana: 30 } // ultMana: v86 Q 2026-11-06, the ult costs Mana like Mage / Swordsman

/** Spell vamp (Q 2026-11-04): skill lifesteal, its own stat. AoE skills heal 1/3; Skill 2 เลือดเดือด trades skill damage for it. */
export const SPELL_VAMP = { aoe: 1 / 3, bloodCut: 0.3 }

export const JOBS: Record<JobId, JobDef> = {
  novice: {
    id: 'novice', name: 'โนวิส', icon: '🌱', tex: 'novice', blurb: 'มือใหม่ ทำได้ทุกอย่างนิดหน่อย', focus: 'อะไรก็ได้',
    resource: null, attack: 'melee', tags: ['crit', 'speed', 'guard', 'blood', 'fire', 'venom'], mod: {},
    auto: { name: '-', icon: '', cost: 0, desc: 'ยังไม่มี' }, ult: { name: 'ทุบ', icon: '💢', cd: 4, desc: 'ทุบมอนทุกตัว' },
  },
  swordsman: {
    id: 'swordsman', name: 'นักดาบ', icon: '⚔️', tex: 'hero_swordsman', blurb: 'ยืนหน้า ถึก ฟันโดนหลายตัว · Mana น้อย: สกิลออกได้จำกัด ดาเมจหลักมาจากฟันธรรมดา + สวนกลับ', focus: 'STR · VIT',
    resource: 'mana', attack: 'melee', tags: ['guard', 'blood'], mod: { maxHp: 25, def: 3, counter: 0.02 }, // HP/DEF partly back 2026-11-04 after the lifesteal cut
    auto: { name: 'ฟันพายุ', icon: '🌪️', cost: SWORD_MANA.auto, desc: `Mana ${SWORD_MANA.auto}: ฟันมอนทุกตัว ${SWORD_MANA.autoMul}x P.ATK` },
    ult: { name: 'ดาบพิทักษ์', icon: '🛡️', cd: 4, cost: SWORD_MANA.ult, desc: `Mana ${SWORD_MANA.ult}: ฟันมอนทุกตัว ${SWORD_MANA.ultMul}x + โล่ ${SWORD_MANA.ultShield * 100}% ของ HP สูงสุด` },
  },
  archer: {
    id: 'archer', name: 'นักธนู', icon: '🏹', tex: 'hero_archer', blurb: 'ยิงจากไกล แม่น เร็ว ATK โตตาม DEX · หลบแล้วได้โล่ (สายพริ้วไหว)', focus: 'DEX · AGI',
    resource: 'energy', attack: 'ranged', tags: ['crit', 'speed'], mod: { hit: 8, aspd: 0.16, maxHp: 15 },
    auto: { name: 'ยิงคู่', icon: '🎯', cost: 40, desc: 'Energy 40: ยิง 2 ดอก ดอกละ 0.9x' },
    ult: { name: 'ศรทะลวง', icon: '🎯', cd: 4, desc: 'กระโดดถอย หลบการโจมตีถัดไปแน่นอน + ยิงเป้าเดียว (บอส/ตัวที่ HP เยอะสุด) 5x' },
  },
  mage: {
    id: 'mage', name: 'จอมเวท', icon: '🔮', tex: 'hero_mage', blurb: 'เวทแรง ตีทั้งกลุ่ม ไม่มีวันพลาด แต่ตัวบาง · ตีปกติเป็นลูกเวทเบาๆ ดูด Mana · ลูกไฟ/ult ต้องร่าย 1 เทิร์น โดนตีอาจร่ายแตก (DEX ช่วย)', focus: 'INT · WIS',
    resource: 'mana', attack: 'magic', tags: ['fire', 'storm', 'crit'], mod: { maxRes: 20, maxHp: 10 },
    auto: { name: 'ลูกไฟระเบิด', icon: '🔥', cost: 36, desc: 'Mana 36: ปล่อยไฟใส่ทุกตัวทันที (ไม่ต้องร่าย · ไม่แตก) (ติดไฟถ้ามีพรเผาไหม้) · ตัวเลขดูในหน้าสกิล' }, // v85: instant again; numbers in skill-math MAGE_CAST (jobs.ts can't import it)
    ult: { name: 'เวทธาตุ', icon: '☄️', cd: 5, cost: 30, desc: `Mana 30: ร่าย 1 เทิร์น แล้วปล่อยเทิร์นถัดไป (แรงขึ้น · โดนตีแรงระหว่างร่ายอาจแตก: คืน Mana บางส่วน + คูลดาวน์สั้นลง + ร่ายครั้งหน้าไม่แตก) · เลือกธาตุตอนเริ่มรอบ · ⚡ สายฟ้า เป้าเดียว 6 ฮิต (0.3–1.2x/ฮิต) · 🔥 ไฟ 2x + เผาซ้อน · ❄️ น้ำแข็ง 1.6x + ช้า/แช่แข็ง · ทุกธาตุได้บาเรีย ${MAGE_SPELL.barrier}x M.ATK` },
  },
  cleric: {
    id: 'cleric', name: 'นักบวช', icon: '✨', tex: 'hero_cleric', blurb: 'นักบวชสายบู๊: ทุบด้วยกระบอง/คัมภีร์ (STR) ร่ายแสง (INT) ฮีลตัวเอง มีโล่', focus: 'STR · INT · WIS',
    resource: 'mana', attack: 'melee', tags: ['holy', 'guard'], mod: { maxHp: 10, mdef: 0.05 },
    auto: { name: 'ฮีล / แสงศักดิ์สิทธิ์', icon: '💖', cost: 25, desc: `Mana 25 (ร่ายเพิ่มจากการทุบทุกเทิร์น): HP ต่ำกว่า 75% ฮีล ${CLERIC_KIT.heal}x M.ATK ก่อนทุบ · ไม่งั้นทุบแล้วแสงตกจากฟ้าใส่ 2 ตัวหน้า ${CLERIC_KIT.smite}x M.ATK` },
    ult: { name: 'พรคุ้มครอง', icon: '🙏', cd: 4, cost: CLERIC_KIT.ultMana, desc: `Mana ${CLERIC_KIT.ultMana}: ทุบใส่ทุกตัว ${Math.round(CLERIC_KIT.ultAtk * 100)}% P.ATK + Holy Light ${CLERIC_KIT.ultLights} ลูกใส่ตัวสุ่ม (${CLERIC_KIT.ultLight}x M.ATK) + โล่ ${Math.round(CLERIC_KIT.ultShield * 100)}% ของ HP สูงสุด ${CLERIC_KIT.ultShieldTurns} เทิร์น (โล่นักบวชรวมไม่เกิน ${Math.round(CLERIC_KIT.shieldCap * 100)}% HP)` },
  },
  thief: {
    id: 'thief', name: 'โจร', icon: '🗡️', tex: 'hero_thief', blurb: 'เร็ว หลบเก่ง แทงสองที ติดพิษ · Double Strike: มีโอกาสตีเพิ่ม 1 ที · เงาบาง: มอนตีโดนอย่างน้อย 70% (อาชีพอื่น 80%)', focus: 'AGI · LUK',
    resource: 'energy', attack: 'melee', tags: ['venom', 'speed'], mod: { flee: 10, aspd: 0.24, poison: 1, fleeFloor: 0.1 },
    auto: { name: 'แทงพิษ', icon: '🧪', cost: 40, desc: 'Energy 40: แทง 1.6x + พิษ 3 stack (ติด Double Strike ได้)' },
    ult: { name: 'เงาพริ้ว', icon: '👤', cd: 4, desc: 'หลบ 2 ครั้งถัดไปแน่นอน + แทงสุ่ม 4 ที ทีละ 0.7x (+2% ต่อ AGI 1 แต้ม)' },
  },
}
export const BASE_JOBS: JobId[] = ['swordsman', 'archer', 'mage', 'cleric', 'thief']
/** Class skill level -> power multiplier (+10% per level above 1). */
export const skillPow = (lv: number) => 1 + 0.1 * (Math.max(1, lv) - 1)
