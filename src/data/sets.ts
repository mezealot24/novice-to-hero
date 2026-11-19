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
    memberIds: ['c_moonfur', 'c_alphaclaw', 'c_moonshield', 'c_moonquiver', 'c_moondirk', 'cf_shadowfang'],
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
