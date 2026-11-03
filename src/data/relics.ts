// ===== Top-tier skills (สกิลขั้นสูงสุด): won by beating Dungeon 3's 1v1 mini boss. =====
// They last for the rest of that run (like cards, but much stronger). Pick 1 of 3: the two skills
// tied to the mini boss you beat + 1 random from the rest of the pool.
// Design + numbers: design/dungeon-3-miniboss.md. All tunable numbers live in RELIC_RULES.
import type { MonsterKind } from './game-data'

export type RelicId = 'trinity' | 'storm' | 'iceage' | 'hellfire' | 'bloodpact' | 'riposte' | 'haste' | 'harvest'
  | 'purify' | 'executioner' | 'aegis' | 'thornaura' // Dungeon 4-5 mini bosses (design/dungeon-4-5-brutal.md)
export interface RelicDef { id: RelicId; name: string; icon: string; desc: string }

export const RELICS: Record<RelicId, RelicDef> = {
  trinity: { id: 'trinity', name: 'ตรีพลัง', icon: '🔺', desc: 'คริ +15% · ดาเมจคริ +20% · คอมโบ +15% · สวนกลับ +15% · ATK/M.ATK +10%' },
  storm: { id: 'storm', name: 'สายฟ้าพิโรธ', icon: '🌩️', desc: 'ทุกเทิร์นที่ 5 ของเรา (5, 10, 15…) ฟ้าผ่าสุ่ม 8 ครั้ง ครั้งละ 0.75x (เวท ไม่พลาด)' },
  iceage: { id: 'iceage', name: 'ยุคน้ำแข็ง', icon: '🧊', desc: 'เริ่มทุกการต่อสู้: ศัตรูตีเบาลง 30% 5 เทิร์น · โอกาสแช่แข็ง 5% แล้วเพิ่ม x2 ทุกเทิร์น (บอสครึ่งเดียว)' },
  hellfire: { id: 'hellfire', name: 'ไฟโลกันตร์', icon: '🔥', desc: 'ทุก hit ติดไฟ 1 stack ซ้อนไม่จำกัด (ยิ่งเยอะยิ่งเพิ่มน้อยลง) · ตัดฮีลศัตรู 5%/stack สูงสุด 50%' },
  bloodpact: { id: 'bloodpact', name: 'สัญญาเลือด', icon: '🩸', desc: 'ดูดเลือด +15% · ฮีลที่ล้นกลายเป็นโล่ (สูงสุด 30% HP)' },
  riposte: { id: 'riposte', name: 'ปัดป้องไร้ที่ติ', icon: '🤺', desc: 'ทุกการโจมตีครั้งที่ 3 ของศัตรู ปัดทิ้ง 0 ดาเมจ แล้วสวนกลับ 2x' },
  haste: { id: 'haste', name: 'เร่งเวลา', icon: '⏩', desc: 'ความเร็วเทิร์น +25% · ท่าไม้ตายคูลดาวน์ -1 เทิร์น' },
  harvest: { id: 'harvest', name: 'เก็บเกี่ยววิญญาณ', icon: '🐦‍⬛', desc: 'ล้มศัตรู 1 ตัว: ATK/M.ATK +4% (สูงสุด +40%) + ฮีล 8% · บอส HP ลดทุก 20% นับเป็น 1 ตัว' },
  purify: { id: 'purify', name: 'กายบริสุทธิ์', icon: '✨', desc: 'ไม่ติดสถานะผิดปกติจากมอนเลย (พิษ ไฟ สาป เกราะแตก ใบ้ แช่แข็ง) · ฟื้น HP 3% ทุกเทิร์น' },
  executioner: { id: 'executioner', name: 'เพชฌฆาต', icon: '🪓', desc: 'ตีศัตรูที่ HP ต่ำกว่า 35% แรงขึ้น 60% · ล้มศัตรูแล้วท่าไม้ตายคูลดาวน์ -1 เทิร์น' },
  aegis: { id: 'aegis', name: 'โล่อมตะ', icon: '🛡️', desc: 'เริ่มทุกการต่อสู้ได้โล่ 35% HP · ตอนมีโล่ ดาเมจเรา +20%' },
  thornaura: { id: 'thornaura', name: 'เกราะหนามอเวจี', icon: '🌵', desc: 'โดนตีแล้วคนตีโดนสะท้อน 50% ของดาเมจ (เวท ไม่พลาด) · ดาเมจสะท้อนของมอนใส่เราลดครึ่ง' },
}

export const RELIC_RULES = {
  trinity: { crit: 0.15, critMul: 0.2, combo: 0.15, counter: 0.15, atkPct: 0.1 },
  storm: { every: 5, bolts: 8, mul: 0.75 },
  iceage: { turns: 5, atkDown: 0.3, freeze0: 0.05, freezeMul: 2, bossFreezeMul: 0.5 },
  // effective stacks = K * ln(1 + n / K): 10 stacks ~ 6.9, 30 ~ 14.4, 60 ~ 20.8 (normal fire: 1 stack = 1)
  hellfire: { k: 8, dmgPerStack: 0.15, cutPerStack: 0.05, cutMax: 0.5 },
  bloodpact: { lifesteal: 0.15, shieldCap: 0.3 },
  riposte: { every: 3, mul: 2 },
  haste: { speed: 0.25, cd: 1 },
  harvest: { perKill: 0.04, max: 0.4, heal: 0.08, bossStep: 0.2 },
  purify: { regen: 0.03 },
  executioner: { below: 0.35, mul: 0.6, cd: 1 },
  aegis: { shield: 0.35, dmg: 0.2 },
  thornaura: { back: 0.5, reflectCut: 0.5 },
  burnCut: 0.25, // heal cut while a monster burns from normal fire (cards / Mage fire ult)
}

/** Mini boss -> its two signature skills (always offered). The 3rd offer is random from the rest. */
export const MINI_RELICS: Partial<Record<MonsterKind, [RelicId, RelicId]>> = {
  duelist: ['trinity', 'riposte'],
  hunter: ['hellfire', 'bloodpact'],
  gunner: ['storm', 'haste'],
  drainer: ['iceage', 'harvest'],
  venomqueen: ['purify', 'hellfire'],
  frostgiant: ['aegis', 'iceage'],
  mirage: ['thornaura', 'riposte'],
  warlord: ['executioner', 'bloodpact'],
}
/** Dungeon 3's duel pool. Later dungeons name their own (RoomDef.miniPool). */
export const MINI_POOL: MonsterKind[] = ['duelist', 'hunter', 'gunner', 'drainer']

export const hellEff = (n: number) => RELIC_RULES.hellfire.k * Math.log(1 + n / RELIC_RULES.hellfire.k)
