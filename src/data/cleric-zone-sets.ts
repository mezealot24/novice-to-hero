// ===== Q 2026-11-19: Cleric-line zone set pieces (data/sets.ts twin_seraph D6-D10 / thunder_cathedral D8-D14) =====
// Mirrors the Thief sets (twin_shade / midnight_tribunal): skills crit only with skillCrit (#132/#139), so pieces carry
// skillCrit or a "stat -> skillCrit" option. j2 ['crusader', 'monk'] = middle pieces both Cleric branches can wear.
// Spread into CRAFT_ITEMS (data/craft.ts). Item ids are save data: never rename or remove one.
import type { JobId } from './jobs'
import type { Item } from './meta'

const CL: JobId[] = ['cleric']
const BOTH = ['crusader', 'monk'] as const

export const CLERIC_ZONE_ITEMS: Item[] = [
  // --- 🪽 ชุดเทวทูตสองปีก (D6-D10): the one new piece; the rest are existing D6-D9 Cleric crafts + u_mirrorshield ---
  { id: 'cc_sr_crown', slot: 'head', name: 'มงกุฎเทวทูตสองปีก', icon: '🪽', price: 0, slots: 1,
    desc: 'ชุดเทวทูตสองปีก · สายกลาง ครูเซเดอร์/มังค์ ใส่ได้ทั้งคู่: ถึก กันเวท ฮีลแรง คริสกิลติดมือ', base: { wis: 7, vit: 5 }, mod: { maxHp: 200, def: 14, mdef: 0.06, healAmp: 0.12, skillCrit: 0.04 }, jobs: CL, j2: [...BOTH],
    craft: { dg: 'd10', common: 24, boss: 6, zeny: 6000, bonus: [{ shieldAmp: 0.1 }, { skillCrit: 0.04, ultAmp: 0.12 }] } },
  // --- 🔔 ชุดวิหารฟ้าคำราม (D8-D14): middle head / armor / acc + Monk weapon + Crusader shield ---
  { id: 'cc_tc_mitre', slot: 'head', name: 'หมวกนักบวชฟ้าคำราม', icon: '⛪', price: 0, slots: 1,
    desc: 'ชุดวิหารฟ้าคำราม · สายกลาง ครูเซเดอร์/มังค์: ฮีลแรง กันเวท คริสกิล', base: { wis: 6, vit: 4 }, mod: { maxHp: 150, mdef: 0.06, healAmp: 0.1, skillCrit: 0.05 }, jobs: CL, j2: [...BOTH],
    craft: { dg: 'd8', common: 22, boss: 5, zeny: 4500, bonus: [{ shieldAmp: 0.1 }, { skillCrit: 0.04, magPen: 0.05 }] } },
  { id: 'cc_tc_knuckle', wtype: 'fist', slot: 'weapon', name: 'สนับมืออัสนีพิพากษา', icon: '⚡', price: 0, slots: 2,
    desc: 'ชุดวิหารฟ้าคำราม · เฉพาะมังค์: ต่อยไว สายฟ้าแรงตามลูกพลัง คริตีปกติไหลเข้าสกิลก้อนใหญ่', base: { agi: 8, str: 5, wis: 5 }, mod: { atk: 40, matk: 20, aspd: 0.12, combo: 0.1, crit: 0.08, j2ThunderPer: 0.15 }, jobs: CL, j2: ['monk'],
    conversions: [{ from: 'crit', to: 'skillCrit', ratio: 0.4, cap: 0.15, label: '40% คริตีปกติ → คริสกิล (สูงสุด +15%)' }],
    craft: { dg: 'd11', common: 20, boss: 5, zeny: 8000, bonus: [{ critMul: 0.2 }, { j2ChargeMax: 1, skillCrit: 0.04 }] } },
  { id: 'cc_tc_bulwark', slot: 'offhand', name: 'โล่กางเขนฟ้าคำราม', icon: '🔔', price: 0, slots: 1,
    desc: 'ชุดวิหารฟ้าคำราม · เฉพาะครูเซเดอร์: กางเขนแรง บล็อกแล้วได้โล่ · เกราะยิ่งหนายิ่งคริสกิล', base: { vit: 7, wis: 5, str: 3 }, mod: { maxHp: 260, def: 26, j2CrossAdd: 0.15, j2BlockShield: 0.04, skillCrit: 0.06 }, jobs: CL, j2: ['crusader'],
    conversions: [{ from: 'def', to: 'skillCrit', ratio: 0.001, cap: 0.1, label: 'P.DEF ทุก 10 → คริสกิล +1% (สูงสุด +10%)' }],
    craft: { dg: 'd12', common: 22, boss: 6, zeny: 9200, bonus: [{ j2Guard: 0.04 }, { j2BlockHeal: 0.02, critMul: 0.15 }] } },
  { id: 'cc_tc_vestment', slot: 'armor', name: 'อาภรณ์วิหารฟ้าคำราม', icon: '🥻', price: 0, slots: 1,
    desc: 'ชุดวิหารฟ้าคำราม · สายกลาง ครูเซเดอร์/มังค์: ถึก กันเวท ฮีลแรง คริสกิลแรง', base: { wis: 7, vit: 5 }, mod: { maxHp: 380, def: 24, mdef: 0.08, healAmp: 0.12, skillCrit: 0.06 }, jobs: CL, j2: [...BOTH],
    craft: { dg: 'd13', common: 24, boss: 6, zeny: 11000, bonus: [{ waveShield: 0.05 }, { skillCrit: 0.05, critMul: 0.15 }] } },
  { id: 'cc_tc_bell', slot: 'acc', name: 'ระฆังพิพากษาฟ้าคำราม', icon: '🛎️', price: 0, slots: 1,
    desc: 'ชุดวิหารฟ้าคำราม · สายกลาง ครูเซเดอร์/มังค์: คริแรง เจาะเกราะเวท ฮีลแรง', base: { wis: 7, luk: 5 }, mod: { healAmp: 0.12, skillCrit: 0.06, critMul: 0.22, magPen: 0.08 }, jobs: CL, j2: [...BOTH],
    craft: { dg: 'd14', common: 26, boss: 7, zeny: 12500, bonus: [{ physPen: 0.06 }, { skillCrit: 0.05, critMul: 0.15 }] } },
]
