// Equipment Set system (2pc / 3pc creative build synergies; zero economy stats).
import type { Stats } from './stats'
import type { Item } from './meta/item-types'
import type { ItemEffectSpec, StatConvert } from './item-effects'

export interface SetBonusTier {
  pieces: number
  label: string
  mod?: Partial<Stats>
  pct?: { maxHp?: number; atk?: number; matk?: number }
  effects?: readonly ItemEffectSpec[]
  conversions?: readonly StatConvert[]
}

export interface ItemSet {
  id: string
  name: string
  icon: string
  desc: string
  memberIds?: readonly string[]
  tiers: readonly SetBonusTier[]
}

export interface ActiveSetSummary {
  set: ItemSet
  count: number
  activeTiers: readonly SetBonusTier[]
  nextTier?: SetBonusTier
}

export interface SetBonusSummary {
  active: ActiveSetSummary[]
  mod: Partial<Stats>
  pct: { maxHp: number; atk: number; matk: number }
  effects: ItemEffectSpec[]
  conversions: StatConvert[]
}

export const ITEM_SETS: readonly ItemSet[] = [
  {
    id: 'jelly_thorn',
    name: 'ชุดเมือกหนาม (Jelly Thorn)',
    icon: '💧',
    desc: 'เซ็ตต้นเกมเน้นเลือดอึด โล่ต้นเวฟ และสะท้อนหนาม',
    memberIds: ['c_jellring', 'c_jellcoat', 'c_jellhood', 'cf_jellthorn'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: HP +60, ฟื้น HP +0.4, โล่ต้นเวฟ +4%', mod: { maxHp: 60, regen: 0.4, waveShield: 0.04 } },
      {
        pieces: 3,
        label: '3 ชิ้น: หนาม +25%, P.DEF +12, คลื่นโล่ 8% Max HP',
        mod: { thorns: 0.25, def: 12 },
        effects: [{ id: 'guardian_pulse', power: 0.08, cd: 3 }],
      },
    ],
  },
  {
    id: 'moonshadow',
    name: 'ชุดเงาจันทร์ (Moonshadow)',
    icon: '🌙',
    desc: 'เซ็ตช่วงต้น-กลางสายพริ้ว หลบ คริ คอมโบ สวนกลับ',
    memberIds: ['c_moonfur', 'c_alphaclaw', 'c_moonshield', 'c_moonquiver', 'c_moondirk', 'c_rustfang', 'cf_shadowfang'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: Flee +10, คริ +5%', mod: { flee: 10, crit: 0.05 } },
      { pieces: 3, label: '3 ชิ้น: คอมโบ +10%, ดาเมจคริ +20%, สวนกลับ +8%', mod: { combo: 0.1, critMul: 0.2, counter: 0.08 } },
    ],
  },
  {
    id: 'venom_emerald',
    name: 'ชุดมรกตพิษ (Venom Emerald)',
    icon: '🧪',
    desc: 'เซ็ตกลางเกมสายพิษสะสมและหลบฟื้นเลือด',
    memberIds: ['c_emeraldmail', 'c_venomgauche', 'cf_plaguecharm'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: พิษ +1 stack, พิษแรง +3, ตีติดพิษ +10%', mod: { poison: 1, poisonDmg: 3, vsPoison: 0.1 } },
      { pieces: 3, label: '3 ชิ้น: พิษครึ่งเพดาน+ แรง +20%, หลบฟื้น +3%, ดาเมจธาตุ +12%', mod: { poisonAmp: 0.2, dodgeHeal: 0.03, elemDmg: 0.12 } },
    ],
  },
  // Q 2026-11-19: Thief-line sets spanning dungeon tiers so every Thief / Rogue / Mafia piece belongs somewhere.
  // Skills crit only with skillCrit (#132/#139): each set has a "crit -> skillCrit" (or combo / poison -> skillCrit) option.
  {
    id: 'night_prowler',
    name: 'ชุดนักย่องราตรี (Night Prowler)',
    icon: '🌒',
    desc: 'เซ็ตโจรโซน D1-D5 · ผสมของหลายดัน + หมวกเมือกใส + ยูนีค คริตีปกติไหลเข้าคริสกิล · ชิ้น D5 มีทั้งของโร้กและมาเฟีย',
    // A piece may count for more than one set (Q 2026-11-19): c_jellhood is also Jelly Thorn; uniques are the chase pieces.
    memberIds: ['c_np_wrap', 'c_np_vest', 'c_np_charm', 'c_jellhood', 'u_glasscrown', 'u_bloodfang', 'u_ghostcloak', 'c_shadowdaggers', 'c_blackledger', 'c_rg_hood', 'c_rg_ring', 'c_mb_fedora', 'c_mb_watch'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: คริ +4%, คริสกิล +3%', mod: { crit: 0.04, skillCrit: 0.03 } },
      {
        pieces: 3,
        label: '3 ชิ้น: แปลง 30% คริตีปกติ → คริสกิล (สูงสุด +8%)',
        conversions: [{ from: 'crit', to: 'skillCrit', ratio: 0.3, cap: 0.08, label: '30% คริตีปกติ → คริสกิล (สูงสุด +8%)' }],
      },
      { pieces: 4, label: '4 ชิ้น: ดาเมจคริ +15%, คอมโบ +6%', mod: { critMul: 0.15, combo: 0.06 } },
    ],
  },
  // Q 2026-11-19: a D1-D5 zone set for every class. Shared all-class pieces (Jelly Thorn, card-forge, uniques) count for
  // their own set AND a class set, so early pieces mix across classes; D5 2nd-job pieces join their class set too.
  {
    id: 'warblood',
    name: 'ชุดเลือดนักรบ (Warblood)',
    icon: '🩸',
    desc: 'เซ็ตนักดาบโซน D1-D5 · เกราะหนามเยลลี่ + โล่เงาจันทร์ + ดาบวีรชน + ยูนีค · ชิ้น D5 มีทั้งของเบอร์เซิร์กเกอร์และอัศวิน',
    memberIds: ['cf_jellthorn', 'c_moonshield', 'c_herosword', 'c_wb_bracer', 'cf_deathplate', 'cf_duelband', 'u_berserkaxe', 'u_bloodfang', 'c_berserkcleaver', 'c_dragonspear', 'c_bz_helm', 'c_bz_fang', 'c_kn_helm', 'c_kn_banner'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: P.ATK +8, HP +60', mod: { atk: 8, maxHp: 60 } },
      {
        pieces: 3,
        label: '3 ชิ้น: ดาเมจสกิลกาย +8%, ดูดเลือด +3%, แปลง 3% Max HP → P.ATK (สูงสุด +25)',
        mod: { pskill: 0.08, lifesteal: 0.03 },
        conversions: [{ from: 'maxHp', to: 'atk', ratio: 0.03, cap: 25, label: '3% Max HP → P.ATK (สูงสุด +25)' }],
      },
      { pieces: 4, label: '4 ชิ้น: คริสกิล +5%, ดาเมจคริ +15%, สวนกลับ +5%', mod: { skillCrit: 0.05, critMul: 0.15, counter: 0.05 } },
    ],
  },
  {
    id: 'dawn_faith',
    name: 'ชุดศรัทธาอรุณ (Dawn Faith)',
    icon: '🕯️',
    desc: 'เซ็ตนักบวชโซน D1-D5 · เสื้อคลุมเยลลี่ + หมวกหมูป่า + คทาแสงอรุณ + ยูนีค · ชิ้น D5 มีทั้งของครูเซเดอร์และมังค์',
    memberIds: ['c_jellcoat', 'cf_boarhelm', 'c_dawnmace', 'c_df_veil', 'c_moonshield', 'u_halo', 'c_paladinblade', 'c_vajraknuckle', 'c_cr_crown', 'c_cr_pendant', 'c_mk_band', 'c_mk_beads'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: ฮีลแรง +10%, HP +50', mod: { healAmp: 0.1, maxHp: 50 } },
      {
        pieces: 3,
        label: '3 ชิ้น: โล่แรง +10%, ฟื้น HP +0.4, แปลง 15% M.ATK → P.ATK (สูงสุด +20)',
        mod: { shieldAmp: 0.1, regen: 0.4 },
        conversions: [{ from: 'matk', to: 'atk', ratio: 0.15, cap: 20, label: '15% M.ATK → P.ATK (สูงสุด +20)' }],
      },
      { pieces: 4, label: '4 ชิ้น: โล่ต้นเวฟ +5%, P.DEF +8, M.DEF +5%', mod: { waveShield: 0.05, def: 8, mdef: 0.05 } },
    ],
  },
  {
    id: 'lich_seal',
    name: 'ชุดผนึกลิช (Lich Seal)',
    icon: '🔮',
    desc: 'เซ็ตนักเวทโซน D1-D5 · หมวกเมือกใส + คทา/ลูกแก้วตราผนึก + ของลิช + ยูนีค · ชิ้น D5 มีทั้งของวิซาร์ดและเซจ',
    memberIds: ['c_jellhood', 'c_sealstaff', 'c_sealorb', 'c_ls_circlet', 'c_lichring', 'cf_lichveil', 'cf_emberring', 'u_soulstaff', 'c_archonstaff', 'c_elementalgrimoire', 'c_wz_hat', 'c_wz_crystal', 'c_sg_cap', 'c_sg_charm'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: M.ATK +10, Max Mana +15', mod: { matk: 10, maxRes: 15 } },
      {
        pieces: 3,
        label: '3 ชิ้น: เวทคริ +5%, ฟื้น Mana +1, แปลง 8% Max Mana → M.ATK (สูงสุด +20)',
        mod: { spellCrit: 0.05, resRegen: 1 },
        conversions: [{ from: 'maxRes', to: 'matk', ratio: 0.08, cap: 20, label: '8% Max Mana → M.ATK (สูงสุด +20)' }],
      },
      { pieces: 4, label: '4 ชิ้น: ดาเมจธาตุ +10%, ดาเมจคริ +15%', mod: { elemDmg: 0.1, critMul: 0.15 } },
    ],
  },
  {
    id: 'wildstalker',
    name: 'ชุดพรานพงไพร (Wildstalker)',
    icon: '🦌',
    desc: 'เซ็ตนักธนูโซน D1-D5 · แหวนเมือกใส + กระบอกธนูเงาจันทร์ + ธนูตราผนึก + ยูนีค · ชิ้น D5 มีทั้งของบีสต์มาสเตอร์และอินโนเวเตอร์',
    memberIds: ['c_jellring', 'c_moonquiver', 'c_sealbow', 'c_ws_vest', 'u_ghostcloak', 'u_hawkeye', 'c_beastlordbow', 'c_clockworkcrossbow', 'c_bm_feather', 'c_bm_tooth', 'c_in_goggles', 'c_in_gear'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: Hit +8, คริ +4%', mod: { hit: 8, crit: 0.04 } },
      {
        pieces: 3,
        label: '3 ชิ้น: ความเร็ว +6%, แปลง 30% คริตีปกติ → คริสกิล (สูงสุด +8%)',
        mod: { aspd: 0.06 },
        conversions: [{ from: 'crit', to: 'skillCrit', ratio: 0.3, cap: 0.08, label: '30% คริตีปกติ → คริสกิล (สูงสุด +8%)' }],
      },
      { pieces: 4, label: '4 ชิ้น: ดาเมจคริ +15%, Flee +8', mod: { critMul: 0.15, flee: 8 } },
    ],
  },
  {
    id: 'twin_shade',
    name: 'ชุดเงาคู่ทวิภพ (Twin Shade)',
    icon: '👥',
    desc: 'เซ็ตสายโจร D6-D10 · สายกลาง โร้ก/มาเฟีย ใส่ได้ทั้งคู่ · คอมโบและคริตีปกติแปลงเป็นคริสกิล',
    memberIds: ['cc_rg_garb', 'cc_d7_frostcloak', 'cc_d9_galeboots', 'cc_d8_ashblade', 'cc_ts_kris', 'cc_mb_trench'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: คริสกิล +5%, Flee +10', mod: { skillCrit: 0.05, flee: 10 } },
      {
        pieces: 3,
        label: '3 ชิ้น: ดาเมจคริ +20%, แปลง 25% คริตีปกติ → คริสกิล (สูงสุด +10%)',
        mod: { critMul: 0.2 },
        conversions: [{ from: 'crit', to: 'skillCrit', ratio: 0.25, cap: 0.1, label: '25% คริตีปกติ → คริสกิล (สูงสุด +10%)' }],
      },
      { pieces: 4, label: '4 ชิ้น: ดาเมจคอมโบ +15%, ความเร็ว +8%', mod: { comboDmg: 0.15, aspd: 0.08 } },
    ],
  },
  {
    id: 'midnight_tribunal',
    name: 'ชุดศาลเตี้ยเที่ยงคืน (Midnight Tribunal)',
    icon: '⚖️',
    desc: 'เซ็ตสายโจร D8-D14 · ชิ้นกลางใส่ได้ทั้งโร้ก/มาเฟีย + อาวุธเฉพาะโร้ก มือรองเฉพาะมาเฟีย · คริสกิลสายสุด',
    memberIds: ['cc_mt_mask', 'cc_mt_coat', 'cc_mt_seal', 'cc_mt_fang', 'cc_mt_writ'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: คริสกิล +6%, ดาเมจคริ +15%', mod: { skillCrit: 0.06, critMul: 0.15 } },
      {
        pieces: 3,
        label: '3 ชิ้น: เจาะเกราะ +8%, แปลง 50% คริตีปกติ → คริสกิล (สูงสุด +15%)',
        mod: { physPen: 0.08 },
        conversions: [{ from: 'crit', to: 'skillCrit', ratio: 0.5, cap: 0.15, label: '50% คริตีปกติ → คริสกิล (สูงสุด +15%)' }],
      },
      { pieces: 4, label: '4 ชิ้น: ดาเมจคริ +25%, คอมโบ +8%', mod: { critMul: 0.25, combo: 0.08 } },
    ],
  },
  {
    id: 'clockwork_chronos',
    name: 'ชุดนาฬิกาโครนอส (Clockwork Chronos)',
    icon: '⏳',
    desc: 'เซ็ต D11 เร่งจังหวะเทิร์น คอมโบ และเบิ้ลโจมตีซ้ำ',
    memberIds: ['ac_chronos_crown', 'ac_echo_sabre', 'cf_chronowatch'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: ความเร็ว +18%, คอมโบ +8%', mod: { aspd: 0.18, combo: 0.08 } },
      {
        pieces: 3,
        label: '3 ชิ้น: เจาะเกราะ กาย/เวท +12%, Echo ตีซ้ำ 70%',
        mod: { physPen: 0.12, magPen: 0.12 },
        effects: [{ id: 'echo_double', power: 0.7, chance: 0.35, cd: 2 }],
      },
    ],
  },
  {
    id: 'abyssal_leviathan',
    name: 'ชุดอเวจีเลเวียธาน (Abyssal Leviathan)',
    icon: '🌊',
    desc: 'เซ็ต D12 เลือดมหาศาล ดูดเลือด และแปลง HP เป็นพลังเวท',
    memberIds: ['ac_abyssal_plate', 'ac_bloodpact_cloak', 'cf_leviathanscale'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: Max HP +350, M.DEF +10%, ดูดเลือด +4%', mod: { maxHp: 350, mdef: 0.1, lifesteal: 0.04 } },
      {
        pieces: 3,
        label: '3 ชิ้น: ฮีลแรง +18%, ดูดสกิล +8%, แปลง 3% HP → M.ATK',
        mod: { healAmp: 0.18, spellVamp: 0.08 },
        conversions: [{ from: 'maxHp', to: 'matk', ratio: 0.03, cap: 180, label: '3% Max HP → M.ATK (สูงสุด +180)' }],
      },
    ],
  },
  {
    id: 'eclipse_seraph',
    name: 'ชุดสุริยคราสเซราฟ (Eclipse Seraph)',
    icon: '🌞',
    desc: 'เซ็ต D13 ดาเมจธาตุสูงสุด เจาะต้านเวท และรัศมีเผาไหม้',
    memberIds: ['ac_radiance_plate', 'ac_seraph_prism', 'cf_seraphhalo'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: ดาเมจธาตุ +22%, เวทคริ +8%', mod: { elemDmg: 0.22, spellCrit: 0.08 } },
      {
        pieces: 3,
        label: '3 ชิ้น: เจาะต้านเวท +18%, ฮีลได้โล่ +20%, Radiance Burn 30%',
        mod: { magPen: 0.18, healShield: 0.2 },
        effects: [{ id: 'radiance_burn', power: 0.3, cd: 1 }],
      },
    ],
  },
  {
    id: 'trinity_spellblade',
    name: 'ชุดตรีเอกานุภาพเวทดาบ (Trinity Spellblade)',
    icon: '⚔️',
    desc: 'เซ็ตผสมกาย-เวท ฟันหลังสกิลทะลุทั้ง P.DEF และ M.DEF',
    memberIds: ['ac_trinity_blade', 'ac_battlesage_tome', 'u_c3_trinity', 'cf_spellcoil'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: P.ATK +36, M.ATK +36, เร็ว +12%', mod: { atk: 36, matk: 36, aspd: 0.12 } },
      {
        pieces: 3,
        label: '3 ชิ้น: เจาะเกราะ กาย/เวท +15%, ธาตุ +15%, Spellblade 90%',
        mod: { physPen: 0.15, magPen: 0.15, elemDmg: 0.15 },
        effects: [{ id: 'spellblade', power: 0.9, cd: 1 }],
      },
    ],
  },
  {
    id: 'void_riftweaver',
    name: 'ชุดทอมิติรอยแยก (Void Riftweaver)',
    icon: '🕳️',
    desc: 'เซ็ต Rift สายมานาล้น เจาะทะลวงสองสายและฉีกเกราะศัตรู',
    memberIds: ['ac_void_bow', 'ac_muramana_staff', 'u_c3_voidprism'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: Max Mana +50, ฟื้น +2, เจาะ กาย/เวท +12%', mod: { maxRes: 50, resRegen: 2, physPen: 0.12, magPen: 0.12 } },
      {
        pieces: 3,
        label: '3 ชิ้น: ธาตุ +25%, ดาเมจคริ +25%, Void Sunder 30%',
        mod: { elemDmg: 0.25, critMul: 0.25 },
        effects: [{ id: 'void_sunder', power: 0.3, cd: 1 }],
      },
    ],
  },
  {
    id: 'mjollnir_tempest',
    name: 'ชุดพายุอัสนี (Tempest Mjollnir)',
    icon: '⚡',
    desc: 'เซ็ตคริสายฟ้าชิ่ง ยิ่งคริถี่ยิ่งระเบิดดาเมจธาตุต่อเนื่อง',
    memberIds: ['ac_mjollnir_hammer', 'ac_collector_blade', 'u_c3_mjollnir'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: ธาตุ +18%, คริ +8%, เวทคริ +8%', mod: { elemDmg: 0.18, crit: 0.08, spellCrit: 0.08 } },
      {
        pieces: 3,
        label: '3 ชิ้น: เร็ว +20%, ดาเมจคริ +30%, สายฟ้าชิ่ง 65%',
        mod: { aspd: 0.2, critMul: 0.3 },
        effects: [{ id: 'chain_lightning', power: 0.65, chance: 0.4 }],
      },
    ],
  },
  {
    id: 'heartsteel_juggernaut',
    name: 'ชุดปราการหัวใจเหล็ก (Heartsteel Juggernaut)',
    icon: '🛡️',
    desc: 'เซ็ตแทงค์สเกลพลังป้องกัน เป็นเลือด โล่ และสวนกลับสุดโหด',
    memberIds: ['ac_heartsteel_shield', 'u_c3_heartsteel', 'cf_frostbulwark'],
    tiers: [
      { pieces: 2, label: '2 ชิ้น: P.DEF +28, ต้านทาน +10%, โล่แรง +15%', mod: { def: 28, tenacity: 0.1, shieldAmp: 0.15 } },
      {
        pieces: 3,
        label: '3 ชิ้น: สวนกลับ +12%, สวนแรง +25%, คลื่นโล่ 20% Max HP',
        mod: { counter: 0.12, counterDmg: 0.25 },
        effects: [{ id: 'guardian_pulse', power: 0.2, cd: 2 }],
      },
    ],
  },
]

const SETS_BY_ID = new Map(ITEM_SETS.map((s) => [s.id, s]))

export const setById = (id: string): ItemSet | undefined => SETS_BY_ID.get(id)

function itemBelongsToSet(it: Item, set: ItemSet): boolean {
  return it.setId === set.id || (!!set.memberIds && set.memberIds.includes(it.id))
}

export function setBonuses(worn: readonly Item[]): SetBonusSummary {
  const uniqueWorn: Item[] = []
  const seenIds = new Set<string>()
  for (const it of worn) {
    if (!it.id || seenIds.has(it.id)) continue
    seenIds.add(it.id)
    uniqueWorn.push(it)
  }

  const active: ActiveSetSummary[] = []
  const mod: Partial<Stats> = {}
  const pct = { maxHp: 0, atk: 0, matk: 0 }
  const effects: ItemEffectSpec[] = []
  const conversions: StatConvert[] = []

  for (const set of ITEM_SETS) {
    let count = 0
    for (const it of uniqueWorn) if (itemBelongsToSet(it, set)) count++
    if (count === 0) continue

    const sortedTiers = [...set.tiers].sort((a, b) => a.pieces - b.pieces)
    const activeTiers = sortedTiers.filter((t) => count >= t.pieces)
    const nextTier = sortedTiers.find((t) => count < t.pieces)
    if (!activeTiers.length && count < 1) continue

    if (activeTiers.length > 0) {
      active.push({ set, count, activeTiers, nextTier })
    }

    for (const t of activeTiers) {
      if (t.mod) {
        for (const [rawKey, v] of Object.entries(t.mod)) {
          const k = rawKey as keyof Stats
          if (typeof v === 'number') mod[k] = (mod[k] ?? 0) + v
        }
      }
      if (t.pct) {
        if (t.pct.maxHp) pct.maxHp += t.pct.maxHp
        if (t.pct.atk) pct.atk += t.pct.atk
        if (t.pct.matk) pct.matk += t.pct.matk
      }
      if (t.effects) for (const e of t.effects) effects.push({ ...e })
      if (t.conversions) for (const c of t.conversions) conversions.push({ ...c })
    }
  }

  return { active, mod, pct, effects, conversions }
}
