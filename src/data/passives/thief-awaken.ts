// 🌟 Thief Awakening ring (Q 2026-11-21, option A): the passive tree grows when the hero reaches the 3rd job.
// Two outer clusters, each only allocatable while its 3rd job is active (PassiveNode.awaken):
//   🥷 Stalker (north, past the blade / shadow outer wheels) · 🎩 Kingpin (south, past the venom / alchemy outer wheels).
// Each = 3 minors + 2 notables + 1 keystone + 1 💎 jewel socket. Job3 points went J3/6 -> J3/3 (+5, Max 35) to pay for it.
// Only stats already wired in battle (j2KnifeAdd, u3Pow, j3GospelField, j3KpDebtAmp, thUltCdAdd): no new battle hooks.
// Node IDs are save data (`SaveData.passiveNodes`): never rename or remove a shipped ID.
import type { PassiveNode } from '../passive-tree'

const SK = ['stalker'] as const
const KP = ['kingpin'] as const
const SOCKET_DESC = () => 'ใส่ Jewel 1 เม็ด: ได้ค่าทุกบรรทัดของ Jewel (สร้าง Jewel จากการ์ดที่แท็บการ์ด)'

export const THIEF_AWAKEN_NODES: readonly PassiveNode[] = [
  // ========== 🥷 STALKER CLUSTER (north) ==========
  {
    id: 'aw_sk_m1', job: 'thief', kind: 'minor', sector: 'awaken', awaken: SK,
    x: -205, y: -450, edges: ['th_n_assassin', 'aw_sk_n1'],
    icon: '⚔️', name: 'เงาตื่นรู้',
    desc: () => 'P.ATK +8 · คริ +3%',
    mod: () => ({ atk: 8, crit: 0.03 }),
    tags: ['blade', 'crit'],
  },
  {
    id: 'aw_sk_m2', job: 'thief', kind: 'minor', sector: 'awaken', awaken: SK,
    x: 235, y: -455, edges: ['th_n_phantom', 'aw_sk_n2'],
    icon: '👣', name: 'ฝีเท้าพันเงา',
    desc: () => 'FLEE +8 · ความเร็วโจมตี +0.05',
    mod: () => ({ flee: 8, aspd: 0.05 }),
    tags: ['shadow'],
  },
  {
    id: 'aw_sk_n1', job: 'thief', kind: 'notable', sector: 'awaken', awaken: SK,
    x: -120, y: -525, edges: ['aw_sk_m1', 'aw_sk_m3'],
    icon: '🔪', name: 'มีดซ้อนตรา',
    desc: () => 'มีดบิน +1 เล่มต่อการปา (รวมพายุมีด) · คริ +3%',
    mod: () => ({ j2KnifeAdd: 1, crit: 0.03 }),
    tags: ['blade', 'crit'],
  },
  {
    id: 'aw_sk_n2', job: 'thief', kind: 'notable', sector: 'awaken', awaken: SK,
    x: 125, y: -525, edges: ['aw_sk_m2', 'aw_sk_m3'],
    icon: '🌑', name: 'เงาหลอนสังหาร',
    desc: () => 'Phantom Storm แรง +12% · สกิลคริ +4%',
    mod: () => ({ u3Pow: 0.12, skillCrit: 0.04 }),
    tags: ['shadow', 'crit', 'ult'],
  },
  {
    id: 'aw_sk_m3', job: 'thief', kind: 'minor', sector: 'awaken', awaken: SK,
    x: 0, y: -580, edges: ['aw_sk_n1', 'aw_sk_n2', 'aw_sk_k', 'aw_sk_sock'],
    icon: '✴️', name: 'แกนเงาตื่นรู้',
    desc: () => 'ดาเมจคริ +8% · เจาะเกราะกายภาพ +4%',
    mod: () => ({ critMul: 0.08, physPen: 0.04 }),
    tags: ['blade', 'shadow', 'crit'],
  },
  {
    id: 'aw_sk_k', job: 'thief', kind: 'keystone', sector: 'awaken', awaken: SK,
    x: 0, y: -665, edges: ['aw_sk_m3'],
    icon: '🌪️', name: 'กองทัพเงา',
    upside: 'Phantom Storm ปามีดเพิ่ม +3 เล่ม · แรง +10%',
    downside: 'คูลดาวน์ Ult +1 เทิร์น',
    desc: () => 'Phantom Storm ปามีดเพิ่ม +3 เล่ม · แรง +10% | ข้อเสีย: คูลดาวน์ Ult +1 เทิร์น',
    mod: () => ({ j3GospelField: 3, u3Pow: 0.1, thUltCdAdd: 1 }),
    tags: ['blade', 'shadow', 'ult'],
  },
  {
    id: 'aw_sk_sock', job: 'thief', kind: 'socket', sector: 'awaken', awaken: SK,
    x: 0, y: -490, edges: ['aw_sk_m3'],
    icon: '💎', name: 'ช่อง Jewel ตื่นรู้ (Stalker)',
    desc: SOCKET_DESC,
    mod: () => ({}),
    tags: ['jewel'],
  },

  // ========== 🎩 KINGPIN CLUSTER (south) ==========
  {
    id: 'aw_kp_m1', job: 'thief', kind: 'minor', sector: 'awaken', awaken: KP,
    x: 225, y: 450, edges: ['th_n_corrode', 'aw_kp_n1'],
    icon: '💰', name: 'ดอกเบี้ยทบต้น',
    desc: () => 'ดาเมจพิษ +1/stack · P.ATK +8',
    mod: () => ({ poisonDmg: 1, atk: 8 }),
    tags: ['poison'],
  },
  {
    id: 'aw_kp_m2', job: 'thief', kind: 'minor', sector: 'awaken', awaken: KP,
    x: -195, y: 465, edges: ['th_n_sanguine', 'aw_kp_n2'],
    icon: '🎩', name: 'อิทธิพลมืด',
    desc: () => 'HP สูงสุด +80 · กันเวท (M.DEF) +4%',
    mod: () => ({ maxHp: 80, mdef: 0.04 }),
    tags: ['offmeta'],
  },
  {
    id: 'aw_kp_n1', job: 'thief', kind: 'notable', sector: 'awaken', awaken: KP,
    x: 125, y: 525, edges: ['aw_kp_m1', 'aw_kp_m3'],
    icon: '📈', name: 'หนี้ท่วมหัว',
    desc: () => 'Loan Shark: ดาเมจต่อหนี้ +1%/ก้อน · ดาเมจคริ +10%',
    mod: () => ({ j3KpDebtAmp: 0.01, critMul: 0.1 }),
    tags: ['poison', 'crit'],
  },
  {
    id: 'aw_kp_n2', job: 'thief', kind: 'notable', sector: 'awaken', awaken: KP,
    x: -125, y: 525, edges: ['aw_kp_m2', 'aw_kp_m3'],
    icon: '⛓️', name: 'ขาใหญ่คุมเมือง',
    desc: () => 'ดาเมจพิษ +2/stack · เจาะเกราะกายภาพ +6% · ฆ่าได้ฟื้น 2% HP สูงสุด',
    mod: () => ({ poisonDmg: 2, physPen: 0.06, killHeal: 0.02 }),
    tags: ['poison', 'offmeta'],
  },
  {
    id: 'aw_kp_m3', job: 'thief', kind: 'minor', sector: 'awaken', awaken: KP,
    x: 0, y: 580, edges: ['aw_kp_n1', 'aw_kp_n2', 'aw_kp_k', 'aw_kp_sock'],
    icon: '💼', name: 'แกนเจ้าพ่อ',
    desc: () => 'P.ATK +10 · HIT +8',
    mod: () => ({ atk: 10, hit: 8 }),
    tags: ['poison'],
  },
  {
    id: 'aw_kp_k', job: 'thief', kind: 'keystone', sector: 'awaken', awaken: KP,
    x: 0, y: 665, edges: ['aw_kp_m3'],
    icon: '🏦', name: 'ยึดกิจการ',
    upside: 'Hostile Takeover ฟันซ้ำเพิ่ม +1 รอบ · Loan Shark ต่อหนี้ +1%/ก้อน',
    downside: 'คูลดาวน์ Ult +1 เทิร์น',
    desc: () => 'Hostile Takeover ฟันซ้ำเพิ่ม +1 รอบ · Loan Shark ต่อหนี้ +1%/ก้อน | ข้อเสีย: คูลดาวน์ Ult +1 เทิร์น',
    mod: () => ({ j3GospelField: 1, j3KpDebtAmp: 0.01, thUltCdAdd: 1 }),
    tags: ['poison', 'ult'],
  },
  {
    id: 'aw_kp_sock', job: 'thief', kind: 'socket', sector: 'awaken', awaken: KP,
    x: 0, y: 490, edges: ['aw_kp_m3'],
    icon: '💎', name: 'ช่อง Jewel ตื่นรู้ (Kingpin)',
    desc: SOCKET_DESC,
    mod: () => ({}),
    tags: ['jewel'],
  },
]
