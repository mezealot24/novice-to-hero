import type { Stats } from './stats'

export type Tag = 'crit' | 'speed' | 'guard' | 'blood' | 'fire' | 'venom' | 'holy' | 'storm' | 'common'
export const TAGS: Record<Tag, { name: string; icon: string; color: string }> = {
  crit: { name: 'คริ', icon: '💥', color: '#f2b84b' },
  speed: { name: 'เร็ว', icon: '⚡', color: '#7fd7ff' },
  guard: { name: 'อึด', icon: '🛡️', color: '#5fa8d3' },
  blood: { name: 'เลือด', icon: '🩸', color: '#ff6b7a' },
  fire: { name: 'ไฟ', icon: '🔥', color: '#ff8c42' },
  venom: { name: 'พิษ', icon: '☠️', color: '#a77be0' },
  holy: { name: 'ศักดิ์สิทธิ์', icon: '✨', color: '#f6e27a' },
  storm: { name: 'สายฟ้า', icon: '🌩️', color: '#bfe6ff' },
  common: { name: 'ทั่วไป', icon: '⭐', color: '#c9c9d6' },
}

export interface Perk { id: string; tag: Tag; name: string; desc: string; mod: Partial<Stats> }
/** Perk text names the player's own ult: '{ult}' becomes e.g. 'ท่าไม้ตาย 👤 เงาพริ้ว' (Thief) or 'ท่าไม้ตาย 💢 ทุบ' (Novice). */
export const perkDesc = (desc: string, ult?: { icon: string; name: string }) => desc.split('{ult}').join(ult ? `ท่าไม้ตาย ${ult.icon} ${ult.name}` : 'ท่าไม้ตาย')

// Pick 1 of 3 on every level up. 3 perks of one tag = set bonus (SET_BONUS).
export const PERKS: Perk[] = [
  { id: 'crit1', tag: 'crit', name: 'ตาเหยี่ยว', desc: 'โอกาสคริ +15%', mod: { crit: 0.15 } },
  { id: 'crit2', tag: 'crit', name: 'จุดตาย', desc: 'ดาเมจคริ +60%', mod: { critMul: 0.6 } },
  { id: 'crit3', tag: 'crit', name: 'มีดลับคม', desc: 'ATK +4 และโอกาสคริ +8%', mod: { atk: 4, crit: 0.08 } },
  { id: 'spd1', tag: 'speed', name: 'มือไว', desc: 'ความเร็วโจมตี +25%', mod: { aspd: 0.4 } },
  { id: 'spd2', tag: 'speed', name: 'ฝีเท้าเบา', desc: 'ตีเร็ว +15% · Flee +6', mod: { aspd: 0.24, flee: 6 } },
  { id: 'spd4', tag: 'speed', name: 'ฟันรัว', desc: 'โอกาสคอมโบ (ตีซ้ำ) +12%', mod: { combo: 0.12 } },
  { id: 'spd3', tag: 'speed', name: 'สมาธินิ่ง', desc: '{ult} คูลดาวน์ -1 เทิร์น · Flee +8', mod: { smashCd: -1500, flee: 8 } },
  { id: 'grd1', tag: 'guard', name: 'หนังหนา', desc: 'HP สูงสุด +50 (ฟื้นเท่าที่เพิ่ม)', mod: { maxHp: 50 } },
  { id: 'grd2', tag: 'guard', name: 'โล่ไม้', desc: 'รับดาเมจน้อยลง 15%', mod: { guard: 0.15 } },
  { id: 'grd3', tag: 'guard', name: 'ลมหายใจ', desc: 'ฟื้น HP 1.5% ทุกเทิร์น', mod: { regen: 1 } },
  { id: 'grd4', tag: 'guard', name: 'ท่าสวน', desc: 'โอกาสสวนกลับ +15% เมื่อโดนตี', mod: { counter: 0.15 } },
  { id: 'bld1', tag: 'blood', name: 'ดูดเลือด', desc: 'ตีธรรมดาฟื้น HP 6% ของดาเมจ', mod: { lifesteal: 0.06 } },
  { id: 'bld2', tag: 'blood', name: 'คลั่งเลือด', desc: 'ATK +6', mod: { atk: 6 } },
  { id: 'bld3', tag: 'blood', name: 'บดกระดูก', desc: 'ดาเมจ{ult} x2', mod: { smashMul: 3, ultAmp: 1 } },
  { id: 'fir1', tag: 'fire', name: 'ลูกไฟ', desc: 'ทุกการตีครั้งที่ 3 ยิงลูกไฟใส่ศัตรูที่ไกลที่สุด (x2 M.ATK)', mod: { fireEvery: 3 } },
  { id: 'fir2', tag: 'fire', name: 'เผาไหม้', desc: 'ลูกไฟติดไฟ เผา 6 ดาเมจ/เทิร์น 3 เทิร์น', mod: { burnDps: 6 } },
  { id: 'fir3', tag: 'fire', name: 'ลูกไฟใหญ่', desc: 'ลูกไฟแรงขึ้น +2x M.ATK', mod: { boltMul: 2 } },
  { id: 'stm1', tag: 'storm', name: 'Lightning Bolt', desc: 'ทุกเทิร์นยิงสายฟ้า 3 ฮิต ฮิตละ 0.3x M.ATK สุ่มเป้า (ได้ซ้ำ = เลเวลขึ้น +1 ฮิต สูงสุด Lv5)', mod: { boltHits: 3 } },
  { id: 'stm2', tag: 'storm', name: 'ฟ้าคะนอง', desc: 'Lightning Bolt +2 ฮิต', mod: { boltHits: 2 } },
  { id: 'stm3', tag: 'storm', name: 'ประจุสะสม', desc: 'ทุก 10 ฮิตสายฟ้า ฮิตถัดไปแรง 3x และผลักเทิร์นเป้า', mod: { boltCharge: 1 } },
  { id: 'ven1', tag: 'venom', name: 'เคลือบพิษ', desc: 'ทุก hit ติดพิษ 1 stack (2 ดาเมจ/stack/เทิร์น)', mod: { poison: 1 } },
  { id: 'ven2', tag: 'venom', name: 'พิษเข้มข้น', desc: 'พิษแรงขึ้น +2 ดาเมจ/stack/เทิร์น', mod: { poisonDmg: 2 } },
  { id: 'hol1', tag: 'holy', name: 'แสงอุ่น', desc: 'ฮีลแรง +20%', mod: { healAmp: 0.2 } },
  { id: 'hol2', tag: 'holy', name: 'โล่ศรัทธา', desc: 'โล่แรง +25% · P.DEF +5', mod: { shieldAmp: 0.25, def: 5 } },
  { id: 'hol3', tag: 'holy', name: 'ภาวนา', desc: 'ฟื้น HP 1.5%/เทิร์น · ฟื้น Mana +2/เทิร์น', mod: { regen: 1, resRegen: 0.7 } },
  { id: 'ven3', tag: 'venom', name: 'หนามพิษ', desc: 'ทุก hit ติดพิษเพิ่มอีก 1 stack และ ATK +2', mod: { poison: 1, atk: 2 } },
]

// Common cards: any job can roll them, one is always in the 1-of-3, and they stack (no set bonus).
export const COMMON_PERKS: Perk[] = [
  { id: 'c_hp', tag: 'common', name: 'ร่างกายกำยำ', desc: 'HP สูงสุด +30 และ +2%', mod: { maxHp: 30, pickHpPct: 0.02 } },
  { id: 'c_def', tag: 'common', name: 'ผิวหนา', desc: 'P.DEF +12', mod: { def: 12 } },
  { id: 'c_atk', tag: 'common', name: 'ฝึกฝน', desc: 'P.ATK +3 · M.ATK +3 และ +2%', mod: { atk: 3, matk: 3, pickAtkPct: 0.02, pickMatkPct: 0.02 } },
  { id: 'c_hit', tag: 'common', name: 'สายตาคม', desc: 'Hit +10 · คริ +3%', mod: { hit: 10, crit: 0.03 } },
  { id: 'c_flee', tag: 'common', name: 'ก้าวเบา', desc: 'Flee +10', mod: { flee: 10 } },
  { id: 'c_ctr', tag: 'common', name: 'ไหวพริบ', desc: 'โอกาสสวนกลับ +25% ของค่าเดิม', mod: { counterPct: 0.25 } },
  { id: 'c_mdef', tag: 'common', name: 'จิตนิ่ง', desc: 'M.DEF +8%', mod: { mdef: 0.08 } },
  // one per run: offered only until picked, never doubled by legendary
  { id: 'c_revive', tag: 'common', name: 'ขนนกฟีนิกซ์', desc: 'ล้มครั้งแรกจะลุกขึ้นใหม่ HP 30% (1 ครั้ง/รอบ)', mod: { revive: 1 } },
]

export const SET_BONUS: Partial<Record<Tag, { desc: string; mod: Partial<Stats> }>> = {
  holy: { desc: 'เซ็ตศักดิ์สิทธิ์: ฮีล/โล่แรงอีก +20%', mod: { healAmp: 0.2, shieldAmp: 0.2 } },
  crit: { desc: 'เซ็ตคริ: โอกาสคริ +20%', mod: { crit: 0.2 } },
  speed: { desc: 'เซ็ตเร็ว: ตีเร็ว +30%', mod: { aspd: 0.5 } },
  guard: { desc: 'เซ็ตอึด: รับดาเมจน้อยลงอีก 20%', mod: { guard: 0.2 } },
  blood: { desc: 'เซ็ตเลือด: ดูดเลือด +5% และ ATK +5', mod: { lifesteal: 0.05, atk: 5 } },
  storm: { desc: 'เซ็ตพายุ: สายฟ้าลงเป้าเดิมซ้ำในเทิร์นเดียว แรงขึ้น +10% ต่อครั้ง', mod: { stormSet: 1 } },
  fire: { desc: 'เซ็ตไฟ: ลูกไฟทุกการตีครั้งที่ 2', mod: { fireEvery: -1 } },
  venom: { desc: 'เซ็ตพิษ: พิษ +2 stack ต่อ hit', mod: { poison: 2 } },
}
