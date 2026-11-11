// ===== 3rd jobs "Awakening" (design/awakening-crusader-v1.md, Q 2026-11-08) =====
// Same layering as 2nd jobs: save.job stays the base class, save.job2 the 2nd job, save.job3 rides on top of both.
// Nothing from tier 1 / tier 2 is removed: the 3rd job only adds (signature, Ult evolution 2, Skill 3 variant, ใยชั้น 3).
// Job3 Lv 1..30 has its own web points (job3Points). Base Lv 99 / Job2 Lv 50 stay the final caps (Q 2026-11-08).
//
// P1 = framework only: data, save fields, unlock rule, EXP routing, power hook. No battle effects yet (P3-P6), and the
// unlock also needs the Master Trial win (P2), so no real save can reach a 3rd job until then.
import type { Job2Id } from './jobs2'

export type Job3Id = 'paladin' | 'lordknight' | 'champion' // Crusader -> Paladin · Knight -> Lord Knight · Monk -> Champion. One 2nd job at a time.
export type Job3Path = 'pure' | 'hybrid' // pure: own ใยชั้น 3 to the top · hybrid: tier 1-2 of it + tier 1-2 of the sibling 2nd job's web
export type Job3Variant = 'a' | 'b' // which Skill 3 variant is on (picked in town, free)

export interface Job3Def {
  id: Job3Id; parent: Job2Id; name: string; icon: string; blurb: string; focus: string
  /** the sibling 2nd job whose ใยชั้น 2 tier 1-2 the hybrid path opens */
  sibling: Job2Id
  variants: Record<Job3Variant, { name: string; icon: string; desc: string }>
  ultName: string; ultDesc: string; rootDesc: string; signature: { icon: string; name: string; desc: string }
}

export const JOB3_RULES = {
  unlockJob2Lv: 50, unlockClear: 'd10', maxJobLevel: 30,
  // ⚔️ Master Trial MVP: clear ดัน 10 in 🔥 hard (Hero Power matched) with the 2nd job at Job2 Lv 50. The shadow duel of the doc = later polish.
  trialDungeon: 'd10',
  pathSwapGems: 30, freeSwapDays: 7, // path swap: free once a week, after that 💎 (convenience only, design §2)
}

export const JOB3: Record<Job3Id, Job3Def> = {
  paladin: {
    id: 'paladin', parent: 'crusader', sibling: 'monk', name: 'Paladin', icon: '⚜️',
    blurb: 'Crusader ที่ตื่นรู้ · Grand Cross ยิงเพิ่ม · บล็อกแล้วได้ศรัทธา · แต้มในใยเดิมยิ่งเยอะยิ่งแรง',
    focus: 'แทงค์ศักดิ์สิทธิ์ · Grand Cross',
    ultName: 'Gospel Cross', ultDesc: 'Grand Cross ยิงเพิ่ม 1 pulse · pulse ที่โดน ≥ 3 ตัวได้ศรัทธา', rootDesc: 'pulse ที่ชั้น 3 เพิ่ม',
    signature: { icon: '⚜️', name: 'Prestige', desc: 'เพดาน Auto Guard 40% → 50% · ผลบล็อกจากใยชั้น 2 แรง +25% · บล็อกได้ = ศรัทธา +1' },
    variants: {
      a: { name: 'Shield Chain', icon: '🔗', desc: 'Holy Cross 3 ฮิตเด้งไปตัวอื่น (P.ATK + P.DEF) · ต้องมีโล่ · แรงขึ้นตามแต้มสาย 🛡️ โล่' },
      b: { name: 'Pressure', icon: '⚖️', desc: 'Holy Cross 1 ฮิตหนักข้าม DEF (+4% HP สูงสุด) · ตาบอด +1 เทิร์น · แรงขึ้นตามแต้มสาย 🙏 อุทิศ' },
    },
  },
  lordknight: {
    id: 'lordknight', parent: 'knight', sibling: 'berserker', name: 'Lord Knight', icon: '🐉',
    blurb: 'Knight ที่ตื่นรู้ · Pierce แทงเพิ่ม 2 ฮิต · สกิลหอกบวก HP แรงขึ้น · แต้มในใยเดิมยิ่งเยอะยิ่งแรง',
    focus: 'หอกถึก · Hundred Spear',
    ultName: 'Hundred Spear', ultDesc: 'Pierce แทงเพิ่ม 2 ฮิต (ต่อจาก Bowling Bash เดิม)', rootDesc: 'ฮิตที่ชั้น 3 เพิ่ม',
    signature: { icon: '🐉', name: 'Aura Blade', desc: 'สกิลหอกบวกดาเมจ HP สูงสุดอีก +1.5% · HP สูงสุด +5%' },
    variants: {
      a: { name: 'Dragon Breath', icon: '🐉', desc: 'Brandish Spear เป็นไฟมังกรใส่ทุกตัว + ติดไฟ 2 เทิร์น · แรงขึ้นตามแต้มสาย 🌀 กวาดทวน' },
      b: { name: 'Joint Beat', icon: '💥', desc: 'Brandish Spear เป็นแทงหนัก 1 ตัว (บอสก่อน) ข้าม DEF 50% · แรงขึ้นตามแต้มสาย 🗡️ หอกทะลวง' },
    },
  },
  champion: {
    id: 'champion', parent: 'monk', sibling: 'crusader', name: 'Champion', icon: '🥊',
    blurb: 'Monk ที่ตื่นรู้ · ปราณจิตระเบิดพลัง · หมัดคอมโบต่อเนื่อง · อาชูร่าคลื่นกระแทก · แต้มในใยเดิมยิ่งเยอะยิ่งแรง',
    focus: 'คอมโบสะท้าน · Supreme Asura',
    ultName: 'Supreme Asura', ultDesc: 'Asura / Tempest Bell เพิ่มคลื่นกระแทก AoE ทะลวงเกราะ', rootDesc: 'คลื่นพลังที่ชั้น 3 เพิ่ม',
    signature: { icon: '🧘', name: 'Ki Translation', desc: 'ลูกพลังสูงสุด +2 ลูก · ตีคอมโบฟื้น Mana +25% · ขณะถือแรงฮึด M.DEF +10%' },
    variants: {
      a: { name: 'Tiger Knuckle', icon: '🐅', desc: 'Falling Thunder เป็นพุ่งต่อยเดี่ยว (บอสก่อน) สตั๊น 1 เทิร์น · แรงขึ้นตามแต้มสาย 👊 คอมโบ' },
      b: { name: 'Chain Crush', icon: '💥', desc: 'Falling Thunder เป็นพายุหมัดคลื่นลมปราณใส่ทุกตัว True Dmg · แรงขึ้นตามแต้มสาย 🥊 หมัดแค้น' },
    },
  },
}
export const JOB3_IDS = Object.keys(JOB3) as Job3Id[]
export const job3Of = (job2: Job2Id): Job3Def | undefined => Object.values(JOB3).find((j) => j.parent === job2)

/** The 3rd job that is ON: it belongs to the current 2nd job. A 2nd job re-pick leaves save.job3 parked (kept, inactive). */
export const activeJob3 = (s: { job2?: Job2Id; job3?: Job3Id }): Job3Id | undefined =>
  s.job3 && s.job2 && JOB3[s.job3]?.parent === s.job2 ? s.job3 : undefined
