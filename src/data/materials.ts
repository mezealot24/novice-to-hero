// Crafting materials (design/item-acquisition-v1.md). Two per dungeon: a common one from its normal
// monsters and a boss one from its mini boss / boss. Materials are kept win or lose, like zeny and cards.
// Material ids are save data: never rename or remove one.

export interface Mat { id: string; name: string; icon: string; dungeon: string; boss: boolean }

export const MATS: Mat[] = [
  { id: 'm_d1', name: 'เมือกใส', icon: '💧', dungeon: 'd1', boss: false },
  { id: 'b_d1', name: 'แกนเจลราชา', icon: '🔶', dungeon: 'd1', boss: true },
  { id: 'm_d2', name: 'ขนเงาจันทร์', icon: '🌙', dungeon: 'd2', boss: false },
  { id: 'b_d2', name: 'กรงเล็บจ่าฝูง', icon: '🐾', dungeon: 'd2', boss: true },
  { id: 'm_d3', name: 'เศษเกราะสนิม', icon: '🔩', dungeon: 'd3', boss: false },
  { id: 'b_d3', name: 'ตราผนึกอัศวิน', icon: '🔱', dungeon: 'd3', boss: true },
  { id: 'm_d4', name: 'เกล็ดหนองมรกต', icon: '🟢', dungeon: 'd4', boss: false },
  { id: 'b_d4', name: 'น้ำดีไฮดรา', icon: '🧪', dungeon: 'd4', boss: true },
  { id: 'm_d5', name: 'ผงกระดูกอเวจี', icon: '🦴', dungeon: 'd5', boss: false },
  { id: 'b_d5', name: 'ผลึกวิญญาณลิช', icon: '🔮', dungeon: 'd5', boss: true },
]

export const MAT_RULES = {
  normalRate: 0.3, // a normal monster drops 1 common material this often (no LUK bonus)
  mini: { boss: 1 }, // mini boss / sub boss: sure drop
  boss: { boss: 2, common: 3 }, // dungeon boss: sure drop
}

export const matById = (id: string) => MATS.find((m) => m.id === id)
/** Material id of a dungeon (d1..d5); boss = the boss material. */
export const matOf = (dungeon: string, boss: boolean) => `${boss ? 'b' : 'm'}_${dungeon}`
export const matName = (id: string) => { const m = matById(id); return m ? `${m.icon} ${m.name}` : id }
