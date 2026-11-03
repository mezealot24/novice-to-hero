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
  auto: JobSkill & { cost: number }; ult: JobSkill & { cd: number; cost?: number } // ult cost: Mana (Mage only for now)
}

export const JOB_CHANGE = { needClears: 1, classMaxJobLevel: 40 }
export const RES_RULES = {
  rageMax: 100, rageOnHit: 12, rageOnHurt: 8,
  energyMax: 100, energyPerTurn: 25,
  manaPerTurnMul: 3, // resRegen (3 + WIS) x this, per hero turn
}
/** Mage (Q 2026-11-03): no Mana Shield; every spell costs Mana, the basic attack is a weak free magic bolt. */
export const MAGE_SPELL = {
  basicMul: 0.6, // basic attack: magic projectile 0.6x M.ATK, free
  boltPerHit: 2, // card Lightning Bolt: Mana per hit, cast only when Mana covers every hit
  fireBolt: 8, // card ลูกไฟ: Mana per fireball, skipped when Mana is short
}

export const JOBS: Record<JobId, JobDef> = {
  novice: {
    id: 'novice', name: 'โนวิส', icon: '🌱', tex: 'novice', blurb: 'มือใหม่ ทำได้ทุกอย่างนิดหน่อย', focus: 'อะไรก็ได้',
    resource: null, attack: 'melee', tags: ['crit', 'speed', 'guard', 'blood', 'fire', 'venom'], mod: {},
    auto: { name: '-', icon: '', cost: 0, desc: 'ยังไม่มี' }, ult: { name: 'ทุบ', icon: '💢', cd: 4, desc: 'ทุบมอนทุกตัว' },
  },
  swordsman: {
    id: 'swordsman', name: 'นักดาบ', icon: '⚔️', tex: 'hero_swordsman', blurb: 'ยืนหน้า ถึก ฟันโดนหลายตัว', focus: 'STR · VIT',
    resource: 'rage', attack: 'melee', tags: ['guard', 'blood'], mod: { maxHp: 40, def: 6, atk: 3, counter: 0.1 },
    auto: { name: 'ฟันพายุ', icon: '🌪️', cost: 40, desc: 'Rage 40: ฟันมอนทุกตัว 1.3x P.ATK' },
    ult: { name: 'ดาบพิทักษ์', icon: '🛡️', cd: 4, desc: 'ฟันมอนทุกตัว 1.4x + โล่ 25% ของ HP สูงสุด' },
  },
  archer: {
    id: 'archer', name: 'นักธนู', icon: '🏹', tex: 'hero_archer', blurb: 'ยิงจากไกล แม่น เร็ว ATK โตตาม DEX · หลบแล้วได้โล่ (สายพริ้วไหว)', focus: 'DEX · AGI',
    resource: 'energy', attack: 'ranged', tags: ['crit', 'speed'], mod: { hit: 8, aspd: 0.16, maxHp: 15 },
    auto: { name: 'ยิงคู่', icon: '🎯', cost: 40, desc: 'Energy 40: ยิง 2 ดอก ดอกละ 0.9x' },
    ult: { name: 'ศรทะลวง', icon: '🎯', cd: 4, desc: 'กระโดดถอย หลบการโจมตีถัดไปแน่นอน + ยิงเป้าเดียว (บอส/ตัวที่ HP เยอะสุด) 5x' },
  },
  mage: {
    id: 'mage', name: 'จอมเวท', icon: '🔮', tex: 'hero_mage', blurb: 'เวทแรง ตีทั้งกลุ่ม ไม่มีวันพลาด แต่ตัวบาง · ตีปกติเป็นลูกเวทเบาๆ ดาเมจจริงมาจากสกิลที่ต้องใช้ Mana', focus: 'INT · WIS',
    resource: 'mana', attack: 'magic', tags: ['fire', 'storm', 'crit'], mod: { matk: 10, maxRes: 20, maxHp: 15 },
    auto: { name: 'ลูกไฟระเบิด', icon: '🔥', cost: 36, desc: 'Mana 36: ไฟใส่ทุกตัว 1.1x M.ATK (ติดไฟถ้ามีพรเผาไหม้)' },
    ult: { name: 'เวทธาตุ', icon: '☄️', cd: 5, cost: 30, desc: 'Mana 30: เลือกธาตุตอนเริ่มรอบ · ⚡ สายฟ้า เป้าเดียว 6 ฮิต (0.3–1.2x/ฮิต) · 🔥 ไฟ 2x + เผาซ้อน · ❄️ น้ำแข็ง 1.6x + ช้า/แช่แข็ง · ทุกธาตุได้บาเรีย 2x M.ATK' },
  },
  cleric: {
    id: 'cleric', name: 'นักบวช', icon: '✨', tex: 'hero_cleric', blurb: 'ฮีลตัวเอง มีโล่ ยืนนานที่สุด', focus: 'WIS · INT',
    resource: 'mana', attack: 'melee', tags: ['holy', 'guard'], mod: { maxHp: 20, healAmp: 0.15, shieldAmp: 0.15, mdef: 0.05, matk: 4 },
    auto: { name: 'ฮีล / แสงศักดิ์สิทธิ์', icon: '💖', cost: 25, desc: 'Mana 25: HP ต่ำกว่า 75% ฮีล 22% · ไม่งั้นยิงแสงใส่ 2 ตัวหน้า 2x M.ATK' },
    ult: { name: 'พรคุ้มครอง', icon: '🙏', cd: 4, desc: 'โล่ 35% ของ HP สูงสุด + ฮีล 15%' },
  },
  thief: {
    id: 'thief', name: 'โจร', icon: '🗡️', tex: 'hero_thief', blurb: 'เร็ว หลบเก่ง แทงสองที ติดพิษ · เงาบาง: มอนตีโดนอย่างน้อย 70% (อาชีพอื่น 80%)', focus: 'AGI · LUK',
    resource: 'energy', attack: 'melee', tags: ['venom', 'speed'], mod: { flee: 10, aspd: 0.24, poison: 1, fleeFloor: 0.1 },
    auto: { name: 'แทงพิษ', icon: '🧪', cost: 40, desc: 'Energy 40: แทง 1.6x + พิษ 3 stack' },
    ult: { name: 'เงาพริ้ว', icon: '👤', cd: 4, desc: 'หลบ 2 ครั้งถัดไปแน่นอน + แทงสุ่ม 4 ที ทีละ 0.7x' },
  },
}
export const BASE_JOBS: JobId[] = ['swordsman', 'archer', 'mage', 'cleric', 'thief']
/** Class skill level -> power multiplier (+10% per level above 1). */
export const skillPow = (lv: number) => 1 + 0.1 * (Math.max(1, lv) - 1)
