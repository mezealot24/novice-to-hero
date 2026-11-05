// ===== 2nd jobs (design/second-jobs-v1.md, Q 2026-11-04/05) =====
// A base class at Job Lv 40 that has cleared ดัน 5 picks one of its two 2nd jobs. save.job stays the BASE class
// (every `job === 'swordsman'` check keeps working); save.job2 rides on top and adds:
//   signature passive · ทักษะ 3 (casts itself, like ทักษะ 2) · Ult วิวัฒน์ (replaces the base ult) · ใยชั้น 2 (data/trees2/)
// Job2 Lv 1..50 has its own web points (job2Points). Numbers live in skill-math.ts KIT2.
import type { Resource, Stats } from './game-data'
import type { JobId, JobSkill } from './jobs'
import { KIT2 } from './skill-math'

export type Job2Id = 'berserker' | 'knight' // Phase 1 (Swordsman). Next: rogue/mobster, crusader/monk, beastmaster/innovator, wizard/sage
export type WeaponType = 'sword' | 'twohand' | 'spear' | 'dagger' | 'bow' | 'staff' | 'mace' | 'fist' | 'book'

export interface Job2Def {
  id: Job2Id; parent: JobId; name: string; icon: string; blurb: string; focus: string
  resource?: Resource // overrides the base class resource (Berserker: Rage)
  autoCost?: number // ทักษะ 1 cost in that resource
  mod: Partial<Stats>
  pct?: { maxHp?: number; aspd?: number } // % on top of the derived stats
  mastery: { weapon: string; ok: (it: { twoHand?: boolean; wtype?: WeaponType }) => boolean; mod: Partial<Stats>; pct?: { atk?: number } }
  signature: JobSkill
  skill3: JobSkill & { cost: number; cd: number }
  ult: JobSkill & { cd: number; cost?: number }
}

export const JOB2_RULES = { unlockJobLv: 40, unlockClear: 'd5', maxJobLevel: 50, repickGems: 30 }

const B = KIT2.berserker, K = KIT2.knight
const pc = (n: number) => `${Math.round(n * 100)}%`

export const JOB2: Record<Job2Id, Job2Def> = {
  berserker: {
    id: 'berserker', parent: 'swordsman', name: 'เบอร์เซิร์กเกอร์', icon: '🪓', focus: 'STR · AGI · LUK',
    blurb: `อาวุธ 2 มือ สับคริหน้าแหก · Rage กลับมา: ตี/โดนตีแล้วเดือด (ฟันพายุ Rage ${B.stormCost}) · ยิ่งคริยิ่งเร็ว เก่งดวลบอส`,
    resource: 'rage', autoCost: B.stormCost, mod: { crit: 0.05 },
    mastery: { weapon: 'อาวุธ 2 มือ', ok: (it) => !!it.twoHand, mod: { crit: B.mastery.crit }, pct: { atk: B.mastery.atkPct } },
    signature: { name: 'คลั่งเลือด', icon: '🔥', desc: `คริ 1 ครั้ง = Frenzy +1 (สูงสุด ${B.frenzyMax}): ความเร็ว +${pc(B.frenzyAspd)} · ดาเมจคริ +${pc(B.frenzyCritDmg)} ต่อ stack · ไม่คริ ${B.frenzyKeep} เทิร์นติด stack หาย` },
    skill3: { name: 'คลื่นดาบ', icon: '🌊', cost: B.waveCost, cd: B.waveCd, desc: `Rage ${B.waveCost} · คูลดาวน์ ${B.waveCd}: คลื่นพุ่งทะลุแถว ตัวหน้า ${B.waveFront}x ตัวหลัง ${B.waveBack}x P.ATK · คริ +${pc(B.waveCrit)} (ไม่ใช่อาวุธ 2 มือ แรง ${pc(B.waveOffWeapon)})` },
    ult: { name: 'บ้าระห่ำ', icon: '👹', cd: 4, desc: `ฟันทุกตัว ${B.ultMul}x แล้ว ${B.ultTurns} เทิร์น: ตีธรรมดาเป็น 2 ฮิต · คริ +${pc(B.ultCrit)} · ดาเมจเข้า +${pc(B.ultTaken)}` },
  },
  knight: {
    id: 'knight', parent: 'swordsman', name: 'อัศวิน', icon: '🐴', focus: 'STR · VIT',
    blurb: 'สายหอกขี่เปโกแบบ RO · ถึกเป็นแรง: สกิลหอกบวกดาเมจตาม HP สูงสุด · หอก 1 มือใส่โล่ได้ หอก 2 มือแรงกว่า',
    mod: {}, pct: { maxHp: K.hpPct, aspd: K.aspdPct },
    mastery: { weapon: 'หอก', ok: (it) => it.wtype === 'spear', mod: { hit: K.mastery.hit }, pct: { atk: K.mastery.atkPct } },
    signature: { name: 'ขี่เปโก', icon: '🐦', desc: `HP สูงสุด +${pc(K.hpPct)} · ความเร็ว +${pc(K.aspdPct)} · ถึกเป็นแรง: ฟันพายุ / Brandish / Pierce บวกดาเมจ ${pc(K.hpDmg)} ของ HP สูงสุด` },
    skill3: { name: 'Brandish Spear', icon: '🌀', cost: K.brandCost, cd: K.brandCd, desc: `Mana ${K.brandCost} · คูลดาวน์ ${K.brandCd}: กวาดหอก ${K.brandTargets} ตัวหน้า ${K.brandMul}x P.ATK + ${pc(K.hpDmg)} HP สูงสุด · ผลักตัวหน้าถอย` },
    ult: { name: 'Pierce + Bowling Bash', icon: '🎯', cd: 4, cost: 25, desc: `Mana 25: แทงเป้าเดียว ${K.pierceHits} ฮิต (บอส/มินิ ${K.pierceBigHits}) ฮิตละ ${K.pierceMul}x + HP สูงสุด แล้วกระแทกตัวถัดไป ${K.bashMul}x · โล่แบบดาบพิทักษ์` },
  },
}
export const JOB2_LIST = Object.values(JOB2)
export const job2Of = (job: JobId) => JOB2_LIST.filter((j) => j.parent === job)
