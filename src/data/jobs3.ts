// ===== 3rd jobs "Awakening" (design/awakening-crusader-v1.md, Q 2026-11-08) =====
// Same layering as 2nd jobs: save.job stays the base class, save.job2 the 2nd job, save.job3 rides on top of both.
// Nothing from tier 1 / tier 2 is removed: the 3rd job only adds (signature, Ult evolution 2, Skill 3 variant, ใยชั้น 3).
// Job3 Lv 1..30 has its own web points (job3Points). Base Lv 99 / Job2 Lv 50 stay the final caps (Q 2026-11-08).
//
// P1 = framework only: data, save fields, unlock rule, EXP routing, power hook. No battle effects yet (P3-P6), and the
// unlock also needs the Master Trial win (P2), so no real save can reach a 3rd job until then.
import type { Job2Id } from './jobs2'

export type Job3Id = 'paladin' | 'lordknight' | 'champion' | 'ranger' | 'warlord' | 'professor' | 'stalker' | 'kingpin' | 'highwizard' | 'mechanic' // Crusader -> Paladin · Knight -> Lord Knight · Monk -> Champion · Beastmaster -> Ranger · Berserker -> Warlord · Sage -> Professor · Rogue -> Stalker · Mobster -> Kingpin · Wizard -> High Wizard · Innovator -> Mechanic (docs/design/awakening-last-four-v1.md). One 2nd job at a time.
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
    blurb: 'Knight ที่ตื่นรู้ · คลื่นทะลวงแทงเพิ่ม 2 ฮิต · สกิลหอกบวก HP แรงขึ้น · แต้มในใยเดิมยิ่งเยอะยิ่งแรง',
    focus: 'หอกถึก · Hundred Spear',
    ultName: 'Hundred Spear', ultDesc: 'Pierce of Judgement: คลื่นทะลวงแทงเพิ่ม 2 ฮิต', rootDesc: 'ฮิตที่ชั้น 3 เพิ่ม',
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
  ranger: {
    id: 'ranger', parent: 'beastmaster', sibling: 'innovator', name: 'Ranger', icon: '🪶',
    blurb: 'Beastmaster ที่ตื่นรู้ · ฝูงสัตว์ทรงพลังยิ่งขึ้น · สั่งลุยแตกแขนง 2 สาย · ประสานพรานกับเหยี่ยวและหมาป่าไร้เทียมทาน',
    focus: 'จ้าวฝูงพายุ · Primal Stampede',
    ultName: 'Primal Stampede', ultDesc: 'Primeval Awakening ปลดปล่อยฝูงสัตว์โจมตีประสานตอนเริ่มและจบ Awakening (+1 รอบจาก ★)', rootDesc: 'ฝูงพายุชั้น 3 แรง',
    signature: { icon: '🎭', name: 'Camouflage', desc: 'สัตว์ทุกตัวแรง +15% · คริ +4% · FLEE +12 · เพดาน Blitz Beat +10%' },
    variants: {
      a: { name: 'Arrow Storm', icon: '🌩️', desc: 'สั่งลุยยิงฝนธนูใส่ทุกตัว + เหยี่ยว Blitz Storm แปะ 🏷️ + โล่หมูป่า + เรียกฝูง · แรงขึ้นตามแต้มสาย 🦅 ฟ้า' },
      b: { name: 'Aimed Warg', icon: '🎯', desc: 'สั่งลุยยิงเจาะเกราะ 50% ใส่ตัวหลัก (บอสก่อน) + หมาป่าขย้ำ Bleed + โล่หมูป่า · แรงขึ้นตามแต้มสาย 🐺 เขี้ยว' },
    },
  },
  warlord: {
    id: 'warlord', parent: 'berserker', sibling: 'knight', name: 'Warlord', icon: '🪓',
    blurb: 'Berserker ที่ตื่นรู้ · จิตวิญญาณอมตะ + คลั่งไร้ขีดจำกัด · Rage แปรเป็นคริ/ดาเมจคริ · Ult อมตะไม่ตาย + ฟื้นเลือดจบศึก',
    focus: 'จอมคลั่งอมตะ · Undying Bloodlust',
    ultName: 'Undying Bloodlust', ultDesc: 'เติม Rage +30 + ล้างดีบัฟ 1 อย่าง + ฟาดทุกตัว → อมตะไม่ต่ำกว่า 1 HP นาน 3 เทิร์น (ตีเบิ้ล + คริ) · จบแล้วฟื้น HP ตาม Rage', rootDesc: 'บ้าระห่ำชั้น 3 แรง',
    signature: { icon: '🪓', name: 'Undying Warlord', desc: 'Rage 1 แต้ม = คริ +0.25% และดาเมจคริ +0.25% · Aspect of Carnage ดาเมจ +15% (โดนแรง +10%) · Frenzy สูงสุด +2' },
    variants: {
      a: { name: 'Spinning Guillotine', icon: '⚔️', desc: 'คลื่นดาบเป็นฟันประหาร 2 ฮิต + ยิ่งมอนเลือดน้อยยิ่งแรง (สูงสุด +60%) · แรงขึ้นตามแต้มสาย 🪓 สับ' },
      b: { name: "Warlord's Warcry", icon: '📣', desc: 'คลื่นดาบเป็นคำรามลดดาเมจมอน −25% + เกราะแตก + ผลักเกจ + ฟาดหมู่ + ได้ Rage/โล่ · แรงขึ้นตามแต้มสาย 👹 คลั่ง' },
    },
  },
  professor: {
    id: 'professor', parent: 'sage', sibling: 'wizard', name: 'Professor', icon: '🎓',
    blurb: 'Sage ขั้นตื่นรู้ · ตีแล้วแปะ 🏷️ ตราธาตุ · เมื่อ 2 ธาตุชนกัน = ⚗️ ปฏิกิริยาธาตุระเบิด! · Mana เยอะใช้ร่ายซ้ำอัตโนมัติ',
    focus: 'นักปราชญ์ธาตุผสาน · Soul Burst',
    ultName: 'Soul Burst', ultDesc: 'Dispell ลบบัฟ + ขโมย Mana → เผา Mana ทั้งหมดฟาดตัวหน้า (ยิ่ง Mana เยอะยิ่งแรง) · จุดปฏิกิริยาทุกตัวที่มีตราธาตุพร้อมกัน (ตัวไม่มีตราจะได้ตราธาตุ Endow)', rootDesc: 'Soul Burst ชั้น 3',
    signature: { icon: '🎓', name: 'Double Casting', desc: 'ปลดล็อก 🏷️ ตราธาตุ + ⚗️ ปฏิกิริยา (♨️ ระเหย 🔥❄️ · 💥 โอเวอร์โหลด 🔥⚡ · 🧲 ซูเปอร์คอนดักต์ ⚡❄️) · ธาตุรองแรงขึ้น 65%→85% · Mana > 70%: จ่าย Mana 6 ยิงซ้ำ 50%' },
    variants: {
      a: { name: 'Spell Fist', icon: '👊', desc: 'ใช้ Endow + ตีปกติ 3 ครั้งถัดไปสลับธาตุ 🔥→⚡→❄️ (แปะตราและจุดปฏิกิริยาใส่ตัวเดียวได้เอง เหมาะสู้บอส) · แรงขึ้นตามแต้มสาย 📖 Auto Spell' },
      b: { name: 'Elemental Field', icon: '🌋', desc: 'ใช้ Endow + กางทุ่งธาตุ 3 เทิร์น แปะตราธาตุ Endow ใส่มอนทุกตัวต้นเทิร์น (ปฏิกิริยาหมู่ เคลียร์เวฟไว) · แรงขึ้นตามแต้มสายธาตุที่ Endow' },
    },
  },
  // ----- the last four (docs/design/awakening-last-four-v1.md, Q 2026-11-19 "yolo awakening class"): every 2nd job now has its Awakening -----
  stalker: {
    id: 'stalker', parent: 'rogue', sibling: 'mobster', name: 'Stalker', icon: '🥷',
    blurb: 'Rogue ที่ตื่นรู้ · ตราคมมีดซ้อนได้มากขึ้น · พายุมีดมีระลอก 2 ตามตรา · Back Stab แตกเป็น 2 สาย · แต้มในใยเดิมยิ่งเยอะยิ่งแรง',
    focus: 'เงาพันมีด · Phantom Storm',
    ultName: 'Phantom Storm', ultDesc: 'พายุมีดจบแล้ว เงาปามีดระลอก 2 ใส่ตัวที่มีตราคมมีดมากสุดก่อน', rootDesc: 'มีดระลอก 2 ที่ชั้น 3 เพิ่ม',
    signature: { icon: '🥷', name: 'Preserve', desc: 'ตราคมมีดสูงสุด +2 · ตราอยู่นาน +1 เทิร์น · มีดบินโดนตัวที่ตราเต็ม = Energy +3' },
    variants: {
      a: { name: 'Fan of Knives', icon: '🌀', desc: 'Back Stab เป็นกรีดเงาใส่ทุกตัว คริแน่นอน + ตราคมมีด +1 ทุกตัว (ยังใช้ Combo Point) · แรงขึ้นตามแต้มสาย 🔪 มีด' },
      b: { name: 'Assassinate', icon: '🎯', desc: 'Back Stab เป็นแทงสังหารบอสก่อน ข้าม DEF 50% + เก็บมีด · ฆ่าได้ = คูลดาวน์คืนทันที · แรงขึ้นตามแต้มสาย 💥 คริ' },
    },
  },
  kingpin: {
    id: 'kingpin', parent: 'mobster', sibling: 'rogue', name: 'Kingpin', icon: '🎩',
    blurb: 'Mobster ที่ตื่นรู้ · หนี้ทุกก้อนคิดดอก · ทวงหนี้รอบ 2 ตามจำนวนหนี้ · ตัดเส้นเอ็นแตกเป็น 2 สาย · แต้มในใยเดิมยิ่งเยอะยิ่งแรง',
    focus: 'เจ้าพ่อเงินกู้ · Hostile Takeover',
    ultName: 'Hostile Takeover', ultDesc: 'ทวงหนี้จบแล้ว ฟันซ้ำทุกตัวที่ยังรอด แรงขึ้นต่อหนี้บนตัวมัน แล้วเช็ก Execute อีกรอบ', rootDesc: 'ฟันรอบ 2 ที่ชั้น 3 เพิ่ม',
    signature: { icon: '🎩', name: 'Loan Shark', desc: 'หนี้ 1 ก้อนบนมอน = ดาเมจฮิตใส่ตัวนั้น +3% (สูงสุด 6 ก้อน) · Execute สำเร็จ = Energy +10' },
    variants: {
      a: { name: 'Shakedown', icon: '💰', desc: 'ตัดเส้นเอ็นเป็นฟันกวาดทุกตัว เกราะแตก + ช้าทั้งแถว · แรงขึ้นตามแต้มสาย ⛓️ ดีบัฟ' },
      b: { name: 'Hit Contract', icon: '📜', desc: 'ตัดเส้นเอ็นเป็นสั่งเก็บตัวเดียว (บอสก่อน) หนัก + พิษ +3 stack + อ่อนแรง · แรงขึ้นตามแต้มสาย 🧪 พิษ' },
    },
  },
  highwizard: {
    id: 'highwizard', parent: 'wizard', sibling: 'sage', name: 'High Wizard', icon: '🌌',
    blurb: 'Wizard ที่ตื่นรู้ · ร่ายใหญ่แล้วได้ Amplify · มหาเวทมี Gravitation ตามหลัง · Storm Gust แตกเป็น 2 สาย · แต้มในใยเดิมยิ่งเยอะยิ่งแรง',
    focus: 'จอมเวทแรงโน้มถ่วง · Gravitation Field',
    ultName: 'Gravitation Field', ultDesc: 'มหาเวทธาตุจบแล้ว สนามแรงโน้มถ่วงบดทุกตัวซ้ำ (ข้าม M.DEF บางส่วน + ผลักเกจ)', rootDesc: 'Gravitation ที่ชั้น 3 เพิ่ม',
    signature: { icon: '🌌', name: 'Mystical Amplification', desc: 'ปล่อยเวทที่ชาร์จไว้ = Amplify: เวทถัดไปแรง +20% · ระหว่างชาร์จ ดาเมจเข้าเพิ่มแค่ครึ่งเดียว' },
    variants: {
      a: { name: 'Frost Nova', icon: '❄️', desc: 'Storm Gust +1 ฮิต · ตัวที่ติดช้า/แช่แข็งอยู่แล้วโดนแรงขึ้น · แรงขึ้นตามแต้มสาย ❄️ พายุหิมะ' },
      b: { name: 'Jupitel Thunder', icon: '⚡', desc: 'Storm Gust เป็นลูกบอลสายฟ้ารัวใส่ตัวเดียว (บอสก่อน) ผลักเกจทุกฮิต · แรงขึ้นตามแต้มสาย ⚡ สายฟ้าเทพ' },
    },
  },
  mechanic: {
    id: 'mechanic', parent: 'innovator', sibling: 'beastmaster', name: 'Mechanic', icon: '🤖',
    blurb: 'Innovator ที่ตื่นรู้ · กับดักทำงาน = Overclock · สิ่งประดิษฐ์ปิดด้วยฝนมิสไซล์ · กล่องสุ่มแตกเป็น 2 สาย · แต้มในใยเดิมยิ่งเยอะยิ่งแรง',
    focus: 'วิศวกรสนามรบ · Arm Cannon',
    ultName: 'Arm Cannon', ultDesc: 'สิ่งประดิษฐ์สุดเพี้ยนจบแล้ว ยิงมิสไซล์รัวใส่มอนสุ่ม (ตัวที่เปียก/ช้าโดนแรงขึ้น)', rootDesc: 'มิสไซล์ที่ชั้น 3 เพิ่ม',
    signature: { icon: '🤖', name: 'Overclock', desc: 'ต้นเวฟวางกับดัก +1 · กับดัก/หุ่นจิ๋วแรง +15% · ใช้กล่องสุ่ม = Overclock 2 เทิร์น: ความเร็ว +15%' },
    variants: {
      a: { name: 'Rocket Barrage', icon: '🚀', desc: 'กล่องสุ่มเดิม + ยิงจรวด 3 ลูกใส่มอนสุ่ม · แรงขึ้นตามแต้มสาย 🎲 ประดิษฐ์' },
      b: { name: 'Fortress Mode', icon: '🏰', desc: 'กล่องสุ่มเดิม + กางหุ่นจิ๋ว 1 ตัว + โล่ตาม HP สูงสุด · แรงขึ้นตามแต้มสาย 🤖 ป้อมปืน' },
    },
  },
}
export const JOB3_IDS = Object.keys(JOB3) as Job3Id[]
export const job3Of = (job2: Job2Id): Job3Def | undefined => Object.values(JOB3).find((j) => j.parent === job2)

/** The 3rd job that is ON: it belongs to the current 2nd job. A 2nd job re-pick leaves save.job3 parked (kept, inactive). */
export const activeJob3 = (s: { job2?: Job2Id; job3?: Job3Id }): Job3Id | undefined =>
  s.job3 && s.job2 && JOB3[s.job3]?.parent === s.job2 ? s.job3 : undefined
