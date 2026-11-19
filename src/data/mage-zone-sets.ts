// ===== Q 2026-11-19: Mage-line zone sets D6-D10 / D8-D14 (mirrors the Thief sets twin_shade / midnight_tribunal) =====
// Skills (magic too) crit only with skillCrit (#132/#139), spellCrit adds on top, so every set / key piece carries
// skillCrit or a "spellCrit -> skillCrit" conversion option.
// j2 ['wizard', 'sage'] = middle pieces both Mage branches can wear. Boss uniques of the zone join as hunt pieces.
// Item ids are save data: never rename or remove one.
import type { Item } from './meta/item-types'
import type { JobId } from './jobs'
import type { ItemSet } from './sets'

const MG: JobId[] = ['mage']

export const MAGE_ZONE_ITEMS: Item[] = [
  // --- Set B ชุดจตุธาตุ (D6-D10, Wizard | Sage) ---
  { id: 'cc_eq_ring', slot: 'acc', name: 'แหวนจตุธาตุ', icon: '💍', price: 0, slots: 1,
    desc: 'ชุดจตุธาตุ · สายกลาง วิซาร์ด/เซจ ใส่ได้ทั้งคู่: คริเวทไหลเข้าคริสกิล', base: { int: 6, wis: 4, dex: 3 }, mod: { matk: 22, maxRes: 25, spellCrit: 0.06, skillCrit: 0.05 }, jobs: MG, j2: ['wizard', 'sage'],
    conversions: [{ from: 'spellCrit', to: 'skillCrit', ratio: 0.3, cap: 0.1, label: '30% คริเวท → คริสกิล (สูงสุด +10%)' }],
    craft: { dg: 'd10', common: 24, boss: 6, zeny: 6000, bonus: [{ critMul: 0.2 }, { skillCrit: 0.04, elemDmg: 0.06 }] } },
  // --- Set C ชุดดาราวิบัติ (D8-D14, Wizard | Sage + one weapon each) ---
  { id: 'cc_sf_hat', slot: 'head', name: 'หมวกแหลมดาราวิบัติ', icon: '🎩', price: 0, slots: 1,
    desc: 'ชุดดาราวิบัติ · สายกลาง วิซาร์ด/เซจ: Mana เยอะ คริทั้งเวทและสกิล', base: { int: 6, wis: 4 }, mod: { matk: 24, maxRes: 30, spellCrit: 0.05, skillCrit: 0.05 }, jobs: MG, j2: ['wizard', 'sage'],
    craft: { dg: 'd8', common: 22, boss: 5, zeny: 4500, bonus: [{ critMul: 0.15 }, { skillCrit: 0.04, magPen: 0.05 }] } },
  { id: 'cc_sf_staff', wtype: 'staff', slot: 'weapon', name: 'คทาดาวตกวันสิ้นโลก', icon: '🌠', price: 0, slots: 2,
    desc: 'ชุดดาราวิบัติ · เฉพาะวิซาร์ด: Storm Gust / อุกกาบาตแรง คริเวทไหลเข้าสกิลก้อนใหญ่', base: { int: 11, wis: 5, dex: 3 }, mod: { matk: 62, maxRes: 40, spellCrit: 0.1, j2GustMul: 0.2, j2MeteorMul: 0.2 }, jobs: MG, j2: ['wizard'],
    conversions: [{ from: 'spellCrit', to: 'skillCrit', ratio: 0.4, cap: 0.15, label: '40% คริเวท → คริสกิล (สูงสุด +15%)' }],
    craft: { dg: 'd11', common: 20, boss: 5, zeny: 8000, bonus: [{ critMul: 0.2 }, { mgUltAmp: 0.2, skillCrit: 0.04 }] } },
  { id: 'cc_sf_tome', wtype: 'book', slot: 'weapon', name: 'คัมภีร์ดาราจักรบรรจบ', icon: '📕', price: 0, slots: 2,
    desc: 'ชุดดาราวิบัติ · เฉพาะเซจ: ผสานฟันและเวท Auto Spell ถี่ คริกายไหลเข้าคริสกิล', base: { int: 8, str: 7, dex: 4 }, mod: { atk: 34, matk: 40, maxRes: 30, crit: 0.08, aspd: 0.12, j2AutoChance: 0.1 }, jobs: MG, j2: ['sage'],
    conversions: [{ from: 'crit', to: 'skillCrit', ratio: 0.4, cap: 0.15, label: '40% คริตีปกติ → คริสกิล (สูงสุด +15%)' }],
    craft: { dg: 'd12', common: 22, boss: 6, zeny: 9200, bonus: [{ j2EndowAmp: 0.15 }, { j2AutoBolts: 1, critMul: 0.15 }] } },
  { id: 'cc_sf_robe', slot: 'armor', name: 'เสื้อคลุมหอดูดาวมรณะ', icon: '🥻', price: 0, slots: 1,
    desc: 'ชุดดาราวิบัติ · สายกลาง วิซาร์ด/เซจ: ถึกพอตัว Mana ล้น คริสกิลแรง', base: { int: 7, vit: 5 }, mod: { maxHp: 320, def: 20, mdef: 0.08, matk: 30, skillCrit: 0.06, critMul: 0.15 }, jobs: MG, j2: ['wizard', 'sage'],
    craft: { dg: 'd13', common: 24, boss: 6, zeny: 11000, bonus: [{ resRegen: 2 }, { skillCrit: 0.05, critMul: 0.15 }] } },
  { id: 'cc_sf_orb', slot: 'acc', name: 'ลูกแก้วดาวหางพิพากษา', icon: '🔮', price: 0, slots: 1,
    desc: 'ชุดดาราวิบัติ · สายกลาง วิซาร์ด/เซจ: คริแรง เจาะต้านเวท', base: { int: 7, dex: 5 }, mod: { spellCrit: 0.06, skillCrit: 0.06, critMul: 0.22, magPen: 0.08 }, jobs: MG, j2: ['wizard', 'sage'],
    craft: { dg: 'd14', common: 26, boss: 7, zeny: 12500, bonus: [{ magPen: 0.06 }, { skillCrit: 0.05, critMul: 0.15 }] } },
]

export const MAGE_ZONE_SETS: ItemSet[] = [
  {
    id: 'elemental_quartet',
    name: 'ชุดจตุธาตุ (Elemental Quartet)',
    icon: '🌀',
    desc: 'เซ็ตสายจอมเวท D6-D10 · เสื้อแยกวิซาร์ด/เซจ + น้ำแข็ง ไฟ ฟ้า + แหวนสายกลาง + ยูนีคตื่นรู้ · คริเวทแปลงเป็นคริสกิล',
    memberIds: ['cc_wz_robe', 'cc_sg_vestment', 'cc_d7_frosttome', 'cc_d8_pyrostaff', 'cc_d9_skycrown', 'cc_eq_ring', 'u_c3_awakenring'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: คริสกิล +5%, Max Mana +20', mod: { skillCrit: 0.05, maxRes: 20 } },
      {
        pieces: 3,
        label: '3 ชิ้น: ดาเมจคริ +20%, แปลง 25% คริเวท → คริสกิล (สูงสุด +10%)',
        mod: { critMul: 0.2 },
        conversions: [{ from: 'spellCrit', to: 'skillCrit', ratio: 0.25, cap: 0.1, label: '25% คริเวท → คริสกิล (สูงสุด +10%)' }],
      },
      { pieces: 4, label: '4 ชิ้น: ดาเมจธาตุ +15%, ฟื้น Mana +2', mod: { elemDmg: 0.15, resRegen: 2 } },
    ],
  },
  {
    id: 'starfall_arcanum',
    name: 'ชุดดาราวิบัติ (Starfall Arcanum)',
    icon: '🌠',
    desc: 'เซ็ตสายจอมเวท D8-D14 · ชิ้นกลางใส่ได้ทั้งวิซาร์ด/เซจ + ไม้เท้าเฉพาะวิซาร์ด คัมภีร์เฉพาะเซจ + ยูนีคบอส · คริสกิลสายสุด',
    memberIds: ['cc_sf_hat', 'cc_sf_staff', 'cc_sf_tome', 'cc_sf_robe', 'cc_sf_orb', 'u_c3_mjollnir', 'u_c3_trinity'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: คริสกิล +6%, ดาเมจคริ +15%', mod: { skillCrit: 0.06, critMul: 0.15 } },
      {
        pieces: 3,
        label: '3 ชิ้น: เจาะต้านเวท +8%, แปลง 50% คริเวท → คริสกิล (สูงสุด +15%)',
        mod: { magPen: 0.08 },
        conversions: [{ from: 'spellCrit', to: 'skillCrit', ratio: 0.5, cap: 0.15, label: '50% คริเวท → คริสกิล (สูงสุด +15%)' }],
      },
      { pieces: 4, label: '4 ชิ้น: ดาเมจคริ +25%, ดาเมจธาตุ +8%', mod: { critMul: 0.25, elemDmg: 0.08 } },
    ],
  },
]
