// 🌟 Swordsman Awakening ring (Phase 2): grows when the hero reaches the 3rd job (Lord Knight / Warlord).
// Two outer clusters, each only allocatable while its 3rd job is active (PassiveNode.awaken):
//   🐉 Lord Knight (north, past vanguard / bastion outer wheels) · 🪓 Warlord (south, past fury / warblood outer wheels).
// Each = 3 minors + 2 notables + 1 keystone + 1 💎 jewel socket.
// Only stats already wired in battle: no new battle hooks needed.
// Node IDs are save data (`SaveData.passiveNodes`): never rename or remove a shipped ID.
import type { PassiveNode } from '../passive-tree'

const LK = ['lordknight'] as const
const WL = ['warlord'] as const
const SOCKET_DESC = () => 'ใส่ Jewel 1 เม็ด: ได้ค่าทุกบรรทัดของ Jewel (สร้าง Jewel จากการ์ดที่แท็บการ์ด)'

export const SWORDSMAN_AWAKEN_NODES: readonly PassiveNode[] = [
  // ========== 🐉 LORD KNIGHT CLUSTER (north) ==========
  {
    id: 'aw_lk_m1', job: 'swordsman', kind: 'minor', sector: 'awaken', awaken: LK,
    x: -205, y: -450, edges: ['sw_n_warblade', 'aw_lk_n1'],
    icon: '🐉', name: 'ปราณหอกมังกร',
    desc: () => 'P.ATK +10 · HIT +8',
    mod: () => ({ atk: 10, hit: 8 }),
    tags: ['vanguard'],
  },
  {
    id: 'aw_lk_m2', job: 'swordsman', kind: 'minor', sector: 'awaken', awaken: LK,
    x: 235, y: -455, edges: ['sw_n_citadel', 'aw_lk_n2'],
    icon: '🛡️', name: 'เกราะลอร์ด',
    desc: () => 'Max HP +120 · P.DEF +10',
    mod: () => ({ maxHp: 120, def: 10 }),
    tags: ['bastion'],
  },
  {
    id: 'aw_lk_n1', job: 'swordsman', kind: 'notable', sector: 'awaken', awaken: LK,
    x: -120, y: -525, edges: ['aw_lk_m1', 'aw_lk_m3'],
    icon: '🔱', name: 'ทวนออร่ามังกร',
    desc: () => 'สกิลหอกบวกดาเมจ +1.5% Max HP · เจาะเกราะกายภาพ +6%',
    mod: () => ({ j2HpDmg: 0.015, physPen: 0.06 }),
    tags: ['vanguard', 'bastion'],
  },
  {
    id: 'aw_lk_n2', job: 'swordsman', kind: 'notable', sector: 'awaken', awaken: LK,
    x: 125, y: -525, edges: ['aw_lk_m2', 'aw_lk_m3'],
    icon: '🏰', name: 'ค่ายกลลอร์ดไนท์',
    desc: () => 'Banding ลดดาเมจเข้า +2%/ตัว · Auto Guard +5% · โล่แรงขึ้น +10%',
    mod: () => ({ j3Banding: 0.02, j2Guard: 0.05, shieldAmp: 0.1 }),
    tags: ['bastion'],
  },
  {
    id: 'aw_lk_m3', job: 'swordsman', kind: 'minor', sector: 'awaken', awaken: LK,
    x: 0, y: -580, edges: ['aw_lk_n1', 'aw_lk_n2', 'aw_lk_k', 'aw_lk_sock'],
    icon: '✴️', name: 'แกนลอร์ดตื่นรู้',
    desc: () => 'Hundred Spear (ฮิตตื่นรู้) แรง +12% · Max HP +120',
    mod: () => ({ u3Pow: 0.12, maxHp: 120 }),
    tags: ['vanguard', 'bastion', 'ult'],
  },
  {
    id: 'aw_lk_k', job: 'swordsman', kind: 'keystone', sector: 'awaken', awaken: LK,
    x: 0, y: -665, edges: ['aw_lk_m3'],
    icon: '🐉', name: 'ทวนร้อยมังกร',
    upside: 'Hundred Spear แทงเพิ่ม +2 ฮิต · แรง +15% · ทุกฮิตที่เพิ่มฮีล 2% Max HP',
    downside: 'คูลดาวน์ Ult +1 เทิร์น',
    desc: () => 'Hundred Spear แทงเพิ่ม +2 ฮิต · แรง +15% · ทุกฮิตที่เพิ่มฮีล 2% Max HP | ข้อเสีย: คูลดาวน์ Ult +1 เทิร์น',
    mod: () => ({ j3GospelField: 2, u3Pow: 0.15, j3GospelHeal: 0.02, swUltCdAdd: 1 }),
    tags: ['vanguard', 'bastion', 'ult'],
  },
  {
    id: 'aw_lk_sock', job: 'swordsman', kind: 'socket', sector: 'awaken', awaken: LK,
    x: 0, y: -490, edges: ['aw_lk_m3'],
    icon: '💎', name: 'ช่อง Jewel ตื่นรู้ (Lord Knight)',
    desc: SOCKET_DESC,
    mod: () => ({}),
    tags: ['jewel'],
  },

  // ========== 🪓 WARLORD CLUSTER (south) ==========
  {
    id: 'aw_wl_m1', job: 'swordsman', kind: 'minor', sector: 'awaken', awaken: WL,
    x: 225, y: 450, edges: ['sw_n_reaver', 'aw_wl_n1'],
    icon: '🪓', name: 'ขวานขุนศึก',
    desc: () => 'P.ATK +12 · คริ +3%',
    mod: () => ({ atk: 12, crit: 0.03 }),
    tags: ['fury'],
  },
  {
    id: 'aw_wl_m2', job: 'swordsman', kind: 'minor', sector: 'awaken', awaken: WL,
    x: -195, y: 465, edges: ['sw_n_sanguine_lord', 'aw_wl_n2'],
    icon: '🩸', name: 'สายเลือดขุนศึก',
    desc: () => 'Max HP +110 · ดูดเลือด +2.5%',
    mod: () => ({ maxHp: 110, lifesteal: 0.025 }),
    tags: ['blood'],
  },
  {
    id: 'aw_wl_n1', job: 'swordsman', kind: 'notable', sector: 'awaken', awaken: WL,
    x: 125, y: 525, edges: ['aw_wl_m1', 'aw_wl_m3'],
    icon: '⚡', name: 'พายุคลั่งศึก',
    desc: () => 'Frenzy ทุก 1 ขั้นเพิ่มคริ +1.5% · Frenzy สูงสุด +2',
    mod: () => ({ j3WlBlitz: 0.015, j2FrenzyMax: 2 }),
    tags: ['fury'],
  },
  {
    id: 'aw_wl_n2', job: 'swordsman', kind: 'notable', sector: 'awaken', awaken: WL,
    x: -125, y: 525, edges: ['aw_wl_m2', 'aw_wl_m3'],
    icon: '🌅', name: 'คลื่นศึกไม่รู้จบ',
    desc: () => 'หลังจบ Ult ดาเมจ +12% · ดาเมจคริ +15% · ได้ Rage +15%',
    mod: () => ({ j3AfterBless: 0.12, critMul: 0.15, rageGain: 0.15 }),
    tags: ['fury', 'blood', 'ult'],
  },
  {
    id: 'aw_wl_m3', job: 'swordsman', kind: 'minor', sector: 'awaken', awaken: WL,
    x: 0, y: 580, edges: ['aw_wl_n1', 'aw_wl_n2', 'aw_wl_k', 'aw_wl_sock'],
    icon: '🔥', name: 'แกนขุนศึกตื่นรู้',
    desc: () => 'Undying Bloodlust แรง +12% · เจาะเกราะกายภาพ +5%',
    mod: () => ({ u3Pow: 0.12, physPen: 0.05 }),
    tags: ['fury', 'ult'],
  },
  {
    id: 'aw_wl_k', job: 'swordsman', kind: 'keystone', sector: 'awaken', awaken: WL,
    x: 0, y: 665, edges: ['aw_wl_m3'],
    icon: '👑', name: 'ราชาสงครามอมตะ',
    upside: 'Undying Bloodlust แรง +25% · จบอมตะฟื้น HP เพิ่ม +10% Max HP · Frenzy สูงสุด +2',
    downside: 'คูลดาวน์ Ult +1 เทิร์น',
    desc: () => 'Undying Bloodlust แรง +25% · จบอมตะฟื้น HP เพิ่ม +10% Max HP · Frenzy สูงสุด +2 | ข้อเสีย: คูลดาวน์ Ult +1 เทิร์น',
    mod: () => ({ u3Pow: 0.25, j3GospelHeal: 0.1, j2FrenzyMax: 2, swUltCdAdd: 1 }),
    tags: ['fury', 'blood', 'ult'],
  },
  {
    id: 'aw_wl_sock', job: 'swordsman', kind: 'socket', sector: 'awaken', awaken: WL,
    x: 0, y: 490, edges: ['aw_wl_m3'],
    icon: '💎', name: 'ช่อง Jewel ตื่นรู้ (Warlord)',
    desc: SOCKET_DESC,
    mod: () => ({}),
    tags: ['jewel'],
  },
]
