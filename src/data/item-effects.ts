// Creative build mechanics: item proc effects, stat conversions, imbue aspects, and Unique Awakening.
// Kept free of runtime circular imports with item-types.ts so data bundles cleanly in any order.
import type { Stats } from './stats'
import type { SaveData } from '../save'
import type { Item, Slot } from './meta/item-types'

export type SaveExt = SaveData & {
  imbue?: Record<string, string>
  awakened?: Record<string, number>
}

export interface StatConvert {
  from: keyof Stats
  to: keyof Stats
  ratio: number
  cap?: number
  label: string
}

export type ItemEffectId =
  | 'spellblade'
  | 'chain_lightning'
  | 'radiance_burn'
  | 'coc_cast'
  | 'execute_cull'
  | 'blood_pact'
  | 'echo_double'
  | 'mana_overload'
  | 'guardian_pulse'
  | 'void_sunder'

export interface ItemEffectSpec {
  id: ItemEffectId
  power: number
  chance?: number
  cd?: number
  threshold?: number
  label?: string
}

export const ASPECT_TUNING = {
  maxPerItem: 1,
  awakenedEffectScale: 1.25,
  awakenedConvertScale: 1.2,
  defaultCdTurns: 1,
} as const

export const UNIQUE_AWAKEN = {
  bossCards: 1,
  bossMats: 6,
  zeny: 5000,
  statScaleBonus: 0.2,
  curseReduction: 0.5,
} as const

const BOSS_CARD_BY_DG: Record<string, string> = {
  d1: 'card_king',
  d2: 'card_alpha',
  d3: 'card_deathknight',
  d4: 'card_hydra',
  d5: 'card_lich',
  d6: 'card_pharaoh',
  d7: 'card_frostwyrm',
  d8: 'card_lavatitan',
  d9: 'card_omnicore',
  d10: 'card_starweaver',
  d11: 'card_chronotitan',
  d12: 'card_leviathan',
  d13: 'card_seraph',
}

export const bossCardOfDungeon = (dg: string): string | undefined => BOSS_CARD_BY_DG[dg]

export type AspectId =
  | 'aspect_spellblade'
  | 'aspect_mjollnir'
  | 'aspect_radiance'
  | 'aspect_coc'
  | 'aspect_collector'
  | 'aspect_bloodpact'
  | 'aspect_echo'
  | 'aspect_manasurge'
  | 'aspect_heartsteel'
  | 'aspect_battlesage'
  | 'aspect_ironreflex'
  | 'aspect_voidsunder'

export interface AspectDef {
  id: AspectId
  name: string
  icon: string
  desc: string
  slots: readonly Slot[]
  mats: Record<string, number>
  zeny: number
  mod?: Partial<Stats>
  effects?: readonly ItemEffectSpec[]
  conversions?: readonly StatConvert[]
}

export const ASPECTS: Record<AspectId, AspectDef> = {
  aspect_spellblade: {
    id: 'aspect_spellblade',
    name: 'ตราเวทคมดาบ (Spellblade)',
    icon: '⚔️',
    desc: 'หลังกดสกิล ตีปกติถัดไปฟาดโบนัสเวท+กายภาพ · สายลูกผสมกาย-เวท',
    slots: ['weapon', 'acc'],
    mats: { m_d10: 6, m_rift: 2 },
    zeny: 3500,
    mod: { atk: 18, matk: 18 },
    effects: [{ id: 'spellblade', power: 0.85, cd: 1 }],
  },
  aspect_mjollnir: {
    id: 'aspect_mjollnir',
    name: 'ตราสายฟ้าชิ่ง (Mjollnir)',
    icon: '⚡',
    desc: 'โจมตีมีโอกาสปล่อยสายฟ้าชิ่งใส่ศัตรูหลายตัว · บูสต์ดาเมจธาตุ',
    slots: ['weapon'],
    mats: { m_d11: 6, m_d10: 4 },
    zeny: 4200,
    mod: { elemDmg: 0.14, aspd: 0.1 },
    effects: [{ id: 'chain_lightning', power: 0.55, chance: 0.35 }],
  },
  aspect_radiance: {
    id: 'aspect_radiance',
    name: 'ตราแสงเผาผลาญ (Radiance)',
    icon: '☀️',
    desc: 'แผ่รัศมีเผาไหม้ทุกเทิร์นและลดความแม่นศัตรู',
    slots: ['armor', 'offhand'],
    mats: { m_d10: 5, m_d13: 4 },
    zeny: 4500,
    mod: { maxHp: 180, def: 12, burnDps: 24 },
    effects: [{ id: 'radiance_burn', power: 0.25, cd: 1 }],
  },
  aspect_coc: {
    id: 'aspect_coc',
    name: 'ตราคริร่ายอัตโนมัติ (Cast on Crit)',
    icon: '☄️',
    desc: 'เมื่อติดคริ มีโอกาสร่ายเวทเสริมใส่เป้าหมายทันที',
    slots: ['weapon', 'head', 'acc'],
    mats: { m_d11: 5, m_rift: 3 },
    zeny: 4800,
    mod: { crit: 0.04, spellCrit: 0.04 },
    effects: [{ id: 'coc_cast', power: 0.9, chance: 0.45, cd: 1 }],
  },
  aspect_collector: {
    id: 'aspect_collector',
    name: 'ตราเพชฌฆาต (Collector)',
    icon: '💀',
    desc: 'สังหารมอนที่ HP ต่ำกว่า 12% ทันทีและเจาะเกราะกายภาพ',
    slots: ['weapon', 'acc'],
    mats: { m_d12: 6, b_rift: 1 },
    zeny: 5200,
    mod: { physPen: 0.12, critMul: 0.15 },
    effects: [{ id: 'execute_cull', power: 1.0, threshold: 0.12 }],
  },
  aspect_bloodpact: {
    id: 'aspect_bloodpact',
    name: 'ตราสัญญาโลหิต (Blood Pact)',
    icon: '🩸',
    desc: 'แปลง HP ส่วนหนึ่งเป็น P.ATK และเสียเลือดเล็กน้อยเพื่อความรุนแรง',
    slots: ['armor', 'acc'],
    mats: { m_d12: 6, m_d10: 4 },
    zeny: 4400,
    mod: { lifesteal: 0.05 },
    effects: [{ id: 'blood_pact', power: 0.22, threshold: 0.04 }],
    conversions: [{ from: 'maxHp', to: 'atk', ratio: 0.035, cap: 180, label: '3.5% Max HP → P.ATK (สูงสุด +180)' }],
  },
  aspect_echo: {
    id: 'aspect_echo',
    name: 'ตราสะท้อนสองจังหวะ (Echo Sabre)',
    icon: '♊',
    desc: 'ตีปกติมีโอกาสเบิ้ลฮิตที่ 2 ตามคูลดาวน์',
    slots: ['weapon', 'offhand'],
    mats: { m_d11: 6, b_rift: 1 },
    zeny: 5000,
    mod: { combo: 0.06, comboDmg: 0.12 },
    effects: [{ id: 'echo_double', power: 0.65, chance: 0.4, cd: 2 }],
  },
  aspect_manasurge: {
    id: 'aspect_manasurge',
    name: 'ตรามานาเอ่อล้น (Mana Overload)',
    icon: '🔷',
    desc: 'แปลง Max Mana เป็น M.ATK และเสริมพลังเวทเมื่อ Mana เต็ม',
    slots: ['head', 'offhand', 'acc'],
    mats: { m_d11: 5, m_d13: 4 },
    zeny: 4600,
    mod: { maxRes: 35, magPen: 0.1 },
    effects: [{ id: 'mana_overload', power: 0.35, threshold: 0.6 }],
    conversions: [{ from: 'maxRes', to: 'matk', ratio: 0.45, cap: 220, label: '45% Max Mana → M.ATK (สูงสุด +220)' }],
  },
  aspect_heartsteel: {
    id: 'aspect_heartsteel',
    name: 'ตราหัวใจเหล็ก (Heartsteel)',
    icon: '🛡️',
    desc: 'สะสมแรงกระแทกแล้วระเบิดคลื่นโล่สเกลตาม Max HP · แปลง P.DEF เป็น HP',
    slots: ['armor', 'offhand'],
    mats: { m_d12: 5, m_d13: 4, m_rift: 2 },
    zeny: 5600,
    mod: { maxHp: 220, shieldAmp: 0.1 },
    effects: [{ id: 'guardian_pulse', power: 0.18, cd: 2 }],
    conversions: [{ from: 'def', to: 'maxHp', ratio: 3.0, cap: 900, label: '300% P.DEF → Max HP (สูงสุด +900)' }],
  },
  aspect_battlesage: {
    id: 'aspect_battlesage',
    name: 'ตราปราชญ์นักรบ (Battle Sage)',
    icon: '📘',
    desc: 'แปลง P.ATK ส่วนหนึ่งเป็น M.ATK สำหรับสายผสมตี-ร่าย',
    slots: ['head', 'weapon', 'acc'],
    mats: { m_d10: 6, m_d11: 4 },
    zeny: 3800,
    mod: { elemDmg: 0.1, aspd: 0.08 },
    effects: [{ id: 'spellblade', power: 0.65, cd: 1 }],
    conversions: [{ from: 'atk', to: 'matk', ratio: 0.4, cap: 190, label: '40% P.ATK → M.ATK (สูงสุด +190)' }],
  },
  aspect_ironreflex: {
    id: 'aspect_ironreflex',
    name: 'ตราสะท้อนพริ้วไหว (Iron Reflex)',
    icon: '🌪️',
    desc: 'แปลง Flee เป็น P.DEF ให้สายหลบยืนชนบอสได้หนาขึ้น',
    slots: ['armor', 'head'],
    mats: { m_d12: 5, m_rift: 2 },
    zeny: 4000,
    mod: { flee: 12, tenacity: 0.05 },
    conversions: [{ from: 'flee', to: 'def', ratio: 0.85, cap: 150, label: '85% Flee → P.DEF (สูงสุด +150)' }],
  },
  aspect_voidsunder: {
    id: 'aspect_voidsunder',
    name: 'ตราสลายเกราะมิติ (Void Sunder)',
    icon: '🕳️',
    desc: 'เจาะทั้ง P.DEF และ M.DEF พร้อมฉีกเกราะเป้าหมายทุกครั้งที่ร่ายสกิล',
    slots: ['weapon', 'head', 'acc'],
    mats: { m_d13: 6, m_rift: 4, b_rift: 2 },
    zeny: 6500,
    mod: { physPen: 0.12, magPen: 0.12, elemDmg: 0.12 },
    effects: [{ id: 'void_sunder', power: 0.25, cd: 1 }],
  },
}

export const ASPECT_LIST: readonly AspectDef[] = Object.values(ASPECTS)

export interface AwakenCheck {
  ok: boolean
  why?: 'not_unique' | 'unowned' | 'tainted' | 'already' | 'no_card' | 'short'
  cardId?: string
  matId?: string
  short: string[]
}

export function canAwakenUnique(s: SaveExt, it: Item): AwakenCheck {
  if (!it.unique) return { ok: false, why: 'not_unique', short: [] }
  if (!s.owned.includes(it.id)) return { ok: false, why: 'unowned', short: [] }
  if (s.taint?.[it.id]) return { ok: false, why: 'tainted', short: [] }
  if (s.awakened?.[it.id]) return { ok: false, why: 'already', short: [] }
  const cardId = bossCardOfDungeon(it.unique.dg)
  if (!cardId) return { ok: false, why: 'no_card', short: [] }
  const matId = `b_${it.unique.dg}`
  const short: string[] = []
  if ((s.cards?.[cardId] ?? 0) < UNIQUE_AWAKEN.bossCards) short.push(cardId)
  if ((s.mats?.[matId] ?? 0) < UNIQUE_AWAKEN.bossMats) short.push(matId)
  if (s.zeny < UNIQUE_AWAKEN.zeny) short.push('zeny')
  return short.length
    ? { ok: false, why: 'short', cardId, matId, short }
    : { ok: true, cardId, matId, short: [] }
}

export function awakenUnique(s: SaveExt, it: Item): boolean {
  const chk = canAwakenUnique(s, it)
  if (!chk.ok || !chk.cardId || !chk.matId) return false
  s.zeny -= UNIQUE_AWAKEN.zeny
  s.mats![chk.matId] -= UNIQUE_AWAKEN.bossMats
  if (s.mats![chk.matId] <= 0) delete s.mats![chk.matId]
  s.cards![chk.cardId] -= UNIQUE_AWAKEN.bossCards
  if (s.cards![chk.cardId] <= 0) delete s.cards![chk.cardId]
  s.awakened = s.awakened ?? {}
  s.awakened[it.id] = 1
  return true
}

export interface ImbueCheck {
  ok: boolean
  why?: 'invalid' | 'unowned' | 'tainted' | 'slot' | 'already' | 'short'
  short: string[]
}

export function canImbueAspect(s: SaveExt, it: Item, id: AspectId): ImbueCheck {
  const asp = ASPECTS[id]
  if (!asp || (it.price === 0 && !it.craft && !it.unique)) return { ok: false, why: 'invalid', short: [] }
  if (!s.owned.includes(it.id)) return { ok: false, why: 'unowned', short: [] }
  if (s.taint?.[it.id]) return { ok: false, why: 'tainted', short: [] }
  if (!asp.slots.includes(it.slot)) return { ok: false, why: 'slot', short: [] }
  if (s.imbue?.[it.id] === id) return { ok: false, why: 'already', short: [] }
  const short: string[] = []
  for (const [m, n] of Object.entries(asp.mats)) if ((s.mats?.[m] ?? 0) < n) short.push(m)
  if (s.zeny < asp.zeny) short.push('zeny')
  return short.length ? { ok: false, why: 'short', short } : { ok: true, short: [] }
}

export function imbueAspect(s: SaveExt, it: Item, id: AspectId): boolean {
  if (!canImbueAspect(s, it, id).ok) return false
  const asp = ASPECTS[id]
  s.zeny -= asp.zeny
  for (const [m, n] of Object.entries(asp.mats)) {
    s.mats![m] -= n
    if (s.mats![m] <= 0) delete s.mats![m]
  }
  s.imbue = s.imbue ?? {}
  s.imbue[it.id] = id
  return true
}

export type ImbueAwakenRef = Pick<SaveExt, 'imbue' | 'awakened'>

function getImbuedAspect(s: ImbueAwakenRef | undefined, it: Item): AspectDef | undefined {
  const raw = s?.imbue?.[it.id]
  if (!raw) return undefined
  return (ASPECTS as Partial<Record<string, AspectDef>>)[raw]
}

export function aspectModOf(s: ImbueAwakenRef | undefined, it: Item): Partial<Stats> | undefined {
  return getImbuedAspect(s, it)?.mod
}

export function itemEffectsOf(s: ImbueAwakenRef | undefined, it: Item): ItemEffectSpec[] {
  const base = it.effects ?? []
  const asp = getImbuedAspect(s, it)?.effects ?? []
  const merged = [...base, ...asp]
  if (!s?.awakened?.[it.id]) return merged.map((e) => ({ ...e }))
  return merged.map((e) => ({
    ...e,
    power: Math.round(e.power * ASPECT_TUNING.awakenedEffectScale * 100) / 100,
  }))
}

export function itemConversionsOf(s: ImbueAwakenRef | undefined, it: Item): StatConvert[] {
  const base = it.conversions ?? []
  const asp = getImbuedAspect(s, it)?.conversions ?? []
  const merged = [...base, ...asp]
  if (!s?.awakened?.[it.id]) return merged.map((c) => ({ ...c }))
  return merged.map((c) => ({
    ...c,
    ratio: Math.round(c.ratio * ASPECT_TUNING.awakenedConvertScale * 1000) / 1000,
  }))
}

const EFFECT_LABEL: Record<ItemEffectId, (e: ItemEffectSpec) => string> = {
  spellblade: (e) => `Spellblade: หลังใช้สกิล ตีปกติถัดไปแรง +${Math.round(e.power * 100)}% (CD ${e.cd ?? 1} เทิร์น)`,
  chain_lightning: (e) => `สายฟ้าชิ่ง ${Math.round((e.chance ?? 1) * 100)}% แรง ${Math.round(e.power * 100)}% ATK/MATK`,
  radiance_burn: (e) => `แผ่รัศมีเผาไหม้ทุกเทิร์น ${Math.round(e.power * 100)}% พลังเวท`,
  coc_cast: (e) => `Cast on Crit ${Math.round((e.chance ?? 1) * 100)}%: ร่ายเวท ${Math.round(e.power * 100)}%`,
  execute_cull: (e) => `ประหารทันทีเมื่อศัตรู HP ต่ำกว่า ${Math.round((e.threshold ?? 0.1) * 100)}%`,
  blood_pact: (e) => `Blood Pact: เสีย HP ${Math.round((e.threshold ?? 0.04) * 100)}%/เทิร์น แลกดาเมจ +${Math.round(e.power * 100)}%`,
  echo_double: (e) => `Echo: โอกาส ${Math.round((e.chance ?? 1) * 100)}% ตีซ้ำ ${Math.round(e.power * 100)}% (CD ${e.cd ?? 2} เทิร์น)`,
  mana_overload: (e) => `Mana ≥ ${Math.round((e.threshold ?? 0.6) * 100)}%: สกิลเวทแรง +${Math.round(e.power * 100)}%`,
  guardian_pulse: (e) => `คลื่นโล่สเกล ${Math.round(e.power * 100)}% Max HP ทุก ${e.cd ?? 2} เทิร์น`,
  void_sunder: (e) => `ฉีกเกราะ P.DEF/M.DEF ศัตรูลง ${Math.round(e.power * 100)}% (CD ${e.cd ?? 1} เทิร์น)`,
}

export function describeItemEffects(
  effects: readonly ItemEffectSpec[] = [],
  conversions: readonly StatConvert[] = [],
): string[] {
  const out: string[] = []
  for (const e of effects) out.push(e.label ?? EFFECT_LABEL[e.id](e))
  for (const c of conversions) out.push(c.label)
  return out
}
