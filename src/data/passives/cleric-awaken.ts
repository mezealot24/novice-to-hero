// 🌟 Cleric Awakening ring (Phase 3): grows when the hero reaches the 3rd job (Champion / Paladin).
// Two outer clusters, each only allocatable while its 3rd job is active (PassiveNode.awaken):
//   🥊 Champion (north, past the fist / ki outer wheels) · ⚜️ Paladin (south, past the aegis / holy outer wheels).
// Each = 3 minors + 2 notables + 1 keystone + 1 💎 jewel socket.
// Only stats already wired in battle: no new battle hooks needed.
// Node IDs are save data (`SaveData.passiveNodes`): never rename or remove a shipped ID.
import type { PassiveNode } from '../passive-tree'

const CH = ['champion'] as const
const PA = ['paladin'] as const
const SOCKET_DESC = () => 'ใส่ Jewel 1 เม็ด: ได้ค่าทุกบรรทัดของ Jewel (สร้าง Jewel จากการ์ดที่แท็บการ์ด)'

export const CLERIC_AWAKEN_NODES: readonly PassiveNode[] = [
  // ========== 🥊 CHAMPION CLUSTER (north) ==========
  {
    id: 'aw_ch_m1', job: 'cleric', kind: 'minor', sector: 'awaken', awaken: CH,
    x: -205, y: -450, edges: ['cl_n_thunder', 'aw_ch_n1'],
    icon: '🥊', name: 'หมัดแชมเปี้ยน',
    desc: () => 'P.ATK +12 · คอมโบ +3%',
    mod: () => ({ atk: 12, combo: 0.03 }),
    tags: ['fist'],
  },
  {
    id: 'aw_ch_m2', job: 'cleric', kind: 'minor', sector: 'awaken', awaken: CH,
    x: 235, y: -455, edges: ['cl_n_spiritwell', 'aw_ch_n2'],
    icon: '🔵', name: 'ปราณแชมเปี้ยน',
    desc: () => 'Max HP +120 · M.DEF +4%',
    mod: () => ({ maxHp: 120, mdef: 0.04 }),
    tags: ['ki'],
  },
  {
    id: 'aw_ch_n1', job: 'cleric', kind: 'notable', sector: 'awaken', awaken: CH,
    x: -120, y: -525, edges: ['aw_ch_m1', 'aw_ch_m3'],
    icon: '🌪️', name: 'คลื่นหมัดทะลวง',
    desc: () => 'Ult ข้าม DEF มอนเพิ่ม +8% · เจาะเกราะกายภาพ +6% · ฮิตคอมโบแรง +10%',
    mod: () => ({ j2Spiral: 0.08, physPen: 0.06, comboDmg: 0.1 }),
    tags: ['fist', 'ult'],
  },
  {
    id: 'aw_ch_n2', job: 'cleric', kind: 'notable', sector: 'awaken', awaken: CH,
    x: 125, y: -525, edges: ['aw_ch_m2', 'aw_ch_m3'],
    icon: '🧘', name: 'กายาวัชระ',
    desc: () => 'Banding ลดดาเมจเข้า +2%/ตัว · Max HP +150 · ตีกายภาพบวก +0.4% Max HP',
    mod: () => ({ j3Banding: 0.02, maxHp: 150, j2HpPunch: 0.004 }),
    tags: ['ki'],
  },
  {
    id: 'aw_ch_m3', job: 'cleric', kind: 'minor', sector: 'awaken', awaken: CH,
    x: 0, y: -580, edges: ['aw_ch_n1', 'aw_ch_n2', 'aw_ch_k', 'aw_ch_sock'],
    icon: '✴️', name: 'แกนแชมเปี้ยนตื่นรู้',
    desc: () => 'Supreme Asura (ฮิตตื่นรู้) แรง +12% · Max Mana +20',
    mod: () => ({ u3Pow: 0.12, maxRes: 20 }),
    tags: ['fist', 'ki', 'ult'],
  },
  {
    id: 'aw_ch_k', job: 'cleric', kind: 'keystone', sector: 'awaken', awaken: CH,
    x: 0, y: -665, edges: ['aw_ch_m3'],
    icon: '👹', name: 'อสุราเหนือฟ้า',
    upside: 'Supreme Asura เพิ่มคลื่นระเบิด +1 ฮิต · แรง +20% · คลื่นกระแทกฮีลเพิ่ม 2% Max HP',
    downside: 'คูลดาวน์ Ult +1 เทิร์น',
    desc: () => 'Supreme Asura เพิ่มคลื่นระเบิด +1 ฮิต · แรง +20% · คลื่นกระแทกฮีลเพิ่ม 2% Max HP | ข้อเสีย: คูลดาวน์ Ult +1 เทิร์น',
    mod: () => ({ j3GospelField: 1, u3Pow: 0.2, j3GospelHeal: 0.02, swUltCdAdd: 1 }),
    tags: ['fist', 'ki', 'ult'],
  },
  {
    id: 'aw_ch_sock', job: 'cleric', kind: 'socket', sector: 'awaken', awaken: CH,
    x: 0, y: -490, edges: ['aw_ch_m3'],
    icon: '💎', name: 'ช่อง Jewel ตื่นรู้ (Champion)',
    desc: SOCKET_DESC,
    mod: () => ({}),
    tags: ['jewel'],
  },

  // ========== ⚜️ PALADIN CLUSTER (south) ==========
  {
    id: 'aw_pa_m1', job: 'cleric', kind: 'minor', sector: 'awaken', awaken: PA,
    x: 225, y: 450, edges: ['cl_n_templar', 'aw_pa_n1'],
    icon: '🛡️', name: 'เกราะพาลาดิน',
    desc: () => 'Max HP +120 · P.DEF +10',
    mod: () => ({ maxHp: 120, def: 10 }),
    tags: ['aegis'],
  },
  {
    id: 'aw_pa_m2', job: 'cleric', kind: 'minor', sector: 'awaken', awaken: PA,
    x: -195, y: 465, edges: ['cl_n_sanctum', 'aw_pa_n2'],
    icon: '✝️', name: 'แสงพาลาดิน',
    desc: () => 'M.ATK +12 · ฮีลแรง +6%',
    mod: () => ({ matk: 12, healAmp: 0.06 }),
    tags: ['holy', 'heal'],
  },
  {
    id: 'aw_pa_n1', job: 'cleric', kind: 'notable', sector: 'awaken', awaken: PA,
    x: 125, y: 525, edges: ['aw_pa_m1', 'aw_pa_m3'],
    icon: '🏰', name: 'ราชองครักษ์แสง',
    desc: () => 'บล็อกได้ฟาดโล่ใส่ตัวที่ตี P.DEF x0.3 · Auto Guard +4% · Banding ลดดาเมจเข้า +2%/ตัว',
    mod: () => ({ j3Press: 0.3, j2Guard: 0.04, j3Banding: 0.02 }),
    tags: ['aegis'],
  },
  {
    id: 'aw_pa_n2', job: 'cleric', kind: 'notable', sector: 'awaken', awaken: PA,
    x: -125, y: 525, edges: ['aw_pa_m2', 'aw_pa_m3'],
    icon: '📜', name: 'บทสวดพระวรสาร',
    desc: () => 'ทุก pulse ฮีลเพิ่ม 1% Max HP ต่อมอนที่โดน · หลังจบ Grand Cross ดาเมจ +10% · Holy Cross / Grand Cross แรง +10%',
    mod: () => ({ j3GospelHeal: 0.01, j3AfterBless: 0.1, j2CrossAdd: 0.1 }),
    tags: ['holy', 'heal', 'ult'],
  },
  {
    id: 'aw_pa_m3', job: 'cleric', kind: 'minor', sector: 'awaken', awaken: PA,
    x: 0, y: 580, edges: ['aw_pa_n1', 'aw_pa_n2', 'aw_pa_k', 'aw_pa_sock'],
    icon: '✴️', name: 'แกนพาลาดินตื่นรู้',
    desc: () => 'Gospel Cross (pulse ตื่นรู้) แรง +12% · Max HP +120',
    mod: () => ({ u3Pow: 0.12, maxHp: 120 }),
    tags: ['aegis', 'holy', 'ult'],
  },
  {
    id: 'aw_pa_k', job: 'cleric', kind: 'keystone', sector: 'awaken', awaken: PA,
    x: 0, y: 665, edges: ['aw_pa_m3'],
    icon: '🌟', name: 'มหากางเขนพระวรสาร',
    upside: 'Gospel Cross pulse +1 ครั้ง · pulse ตื่นรู้แรง +15% · ทุก pulse ได้ศรัทธา +1',
    downside: 'คูลดาวน์ Ult +1 เทิร์น',
    desc: () => 'Gospel Cross pulse +1 ครั้ง · pulse ตื่นรู้แรง +15% · ทุก pulse ได้ศรัทธา +1 | ข้อเสีย: คูลดาวน์ Ult +1 เทิร์น',
    mod: () => ({ j3GospelField: 1, u3Pow: 0.15, j3GospelFaith: 1, swUltCdAdd: 1 }),
    tags: ['aegis', 'holy', 'ult'],
  },
  {
    id: 'aw_pa_sock', job: 'cleric', kind: 'socket', sector: 'awaken', awaken: PA,
    x: 0, y: 490, edges: ['aw_pa_m3'],
    icon: '💎', name: 'ช่อง Jewel ตื่นรู้ (Paladin)',
    desc: SOCKET_DESC,
    mod: () => ({}),
    tags: ['jewel'],
  },
]
