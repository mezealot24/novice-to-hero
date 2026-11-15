// Cardforge (v98, design/craft-rules-v2.md 2): turn spare bag cards + dungeon materials + zeny into odd forge-only gear.
// Each piece carries a "signature" (a Stats flag BattleScene already reads for every class) plus a small downside.
// Economy: pure zeny sink. These items have price 0 (not sold, not shown in the shop); nothing here pays zeny out.
// Item ids are save data: never rename or remove one. Only TYPE imports from meta (meta imports this file).
import type { Stats } from './game-data'
import { CRAFT_ITEMS, craftCost, type CraftInfo } from './craft'
import { CLASS_GEAR } from './class-gear'
import { CLASS_CRAFT_ITEMS } from './class-craft'
import { AWAKENED_CRAFT_ITEMS } from './awakened-craft'
import type { Item } from './meta'
import type { SaveData } from '../save'

export const CARDFORGE = {
  zenyMul: 1.5, // x the dearest classic recipe of the same dungeon, rounded to 100
  cardsNeed: { normal: 3, mini: 2, boss: 1 } as Record<'normal' | 'mini' | 'boss', number>,
  idPrefix: 'cf_',
  fallbackZeny: 4500,
}

export const CARDFORGE_ZENY: Record<string, number> = {
  d1: 400,
  d2: 900,
  d3: 1400,
  d4: 2300,
  d5: 3800,
  d6: 4800,
  d7: 5700,
  d8: 6800,
  d9: 7800,
  d10: 10500,
  d11: 12300,
  d12: 14100,
  d13: 16500,
  rift: 18000,
}

const zenyFor = (dg: string) => {
  const prices = [...CRAFT_ITEMS, ...CLASS_CRAFT_ITEMS, ...AWAKENED_CRAFT_ITEMS]
    .filter((i) => i.craft?.dg === dg)
    .map((i) => i.craft!.zeny)
  if (!prices.length) return CARDFORGE_ZENY[dg] ?? CARDFORGE.fallbackZeny
  return Math.round((Math.max(...prices) * CARDFORGE.zenyMul) / 100) * 100
}

type Row = Omit<Item, 'price' | 'slots' | 'craft'> & { dg: string; common: number; boss: number; cards: Record<string, number>; sig: Partial<Stats>; bonus: CraftInfo['bonus'] }
const row = (r: Row): Item => {
  const { dg, common, boss, cards, sig, bonus, ...item } = r
  return { ...item, price: 0, slots: 1, craft: { dg, common, boss, zeny: zenyFor(dg), bonus, cards, sig } }
}

/** The 8 MVP pieces (rules doc 2.3). Wearable by every class (Q 2026-11-07). */
export const CARDFORGE_ITEMS: Item[] = [
  row({ id: 'cf_jellthorn', slot: 'armor', name: 'เกราะหนามเยลลี่', icon: '🌵', desc: 'โล่กันคลื่นแรก + สะท้อนหนาม · ✦ ต้องมีโล่ถึงจะสะท้อน', mod: { maxHp: 50, def: 6, flee: -3 }, dg: 'd1', common: 8, boss: 2, cards: { card_jellop: 3, card_king: 1 }, sig: { waveShield: 0.04, thorns: 0.15 }, bonus: [{ regen: 0.3 }, { thorns: 0.05 }] }),
  row({ id: 'cf_shadowfang', slot: 'acc', name: 'จี้เขี้ยวเงา', icon: '🌑', desc: '✦ หลบได้แล้วตีสวน · เสีย DEF', base: { agi: 2 }, mod: { flee: 5, def: -4 }, dg: 'd2', common: 10, boss: 2, cards: { card_shadowwolf: 3, card_bat: 3 }, sig: { dodgeStrike: 1 }, bonus: [{ dodgeHeal: 0.02 }, { flee: 6 }] }),
  row({ id: 'cf_boarhelm', slot: 'head', name: 'หมวกเขี้ยวหมูป่า', icon: '🐗', desc: '✦ ฆ่าศัตรูแล้วฟื้น 2% HP', mod: { maxHp: 40, def: 5 }, dg: 'd2', common: 10, boss: 2, cards: { card_boar: 3, card_shroom: 3 }, sig: { killHeal: 0.02 }, bonus: [{ tenacity: 0.05 }, { killHeal: 0.01 }] }),
  row({ id: 'cf_duelband', slot: 'acc', name: 'ปลอกแขนนักดวล', icon: '🤺', desc: '✦ สวนกลับโดนศัตรูทุกตัว · เสีย DEF', mod: { counter: 0.05, hit: 4, def: -5 }, dg: 'd3', common: 12, boss: 3, cards: { card_duelist: 2, card_skeleton: 3 }, sig: { ctrAoe: 1 }, bonus: [{ counterDmg: 0.05 }, { counter: 0.04 }] }),
  row({ id: 'cf_deathplate', slot: 'armor', name: 'เกราะอัศวินมรณะ', icon: '💀', desc: '✦ HP ต่ำกว่า 30% ATK +40% ดูดเลือด x2 · ตีช้าลง', mod: { maxHp: 90, def: 8, aspd: -0.1 }, dg: 'd3', common: 12, boss: 3, cards: { card_deathknight: 1, card_gargoyle: 3 }, sig: { berserk: 1 }, bonus: [{ lifesteal: 0.03 }, { maxHp: 40 }] }),
  row({ id: 'cf_plaguecharm', slot: 'acc', name: 'เครื่องรางพิษลาม', icon: '☠️', desc: '✦ ศัตรูตายแล้วพิษลามไปตัวอื่น (มีพิษในตัวเอง) · ฮีลอ่อนลง', mod: { poison: 1, poisonDmg: 1, healAmp: -0.08 }, dg: 'd4', common: 14, boss: 3, cards: { card_toad: 3, card_venomqueen: 2 }, sig: { poisonSpread: 1 }, bonus: [{ vsPoison: 0.04 }, { poisonCap: 2 }] }),
  row({ id: 'cf_lichveil', slot: 'head', name: 'ผ้าคลุมวิญญาณลิช', icon: '👻', desc: '✦ ฮีลเกิน HP เต็มกลายเป็นโล่ · HP สูงสุดลด', mod: { mdef: 0.05, maxRes: 10 }, pct: { maxHp: -0.06 }, dg: 'd5', common: 16, boss: 4, cards: { card_lich: 1, card_wraith: 3 }, sig: { overhealShield: 1 }, bonus: [{ healAmp: 0.06 }, { regen: 0.4 }] }),
  row({ id: 'cf_emberring', slot: 'acc', name: 'แหวนเถ้าอเวจี', icon: '🔥', desc: '✦ ไฟลุกลามไปตัวอื่นเมื่อศัตรูตาย (ต้องมีแหล่งไฟ) · M.DEF ลด', base: { int: 2 }, mod: { vsBurn: 0.04, mdef: -0.03 }, dg: 'd5', common: 16, boss: 4, cards: { card_imp: 3, card_hexwitch: 3 }, sig: { fireSpread: 1 }, bonus: [{ burnDps: 2 }, { vsBurn: 0.04 }] }),
]

/** D6-D13 expansion Cardforge pieces with signatures, effects, conversions, and set links. */
export const CARDFORGE_EXPANSION_ITEMS: Item[] = [
  row({
    id: 'cf_suncenser',
    slot: 'acc',
    name: 'กระถางธูปสุริยะฟาโรห์',
    icon: '☀️',
    desc: '✦ สวนกลับเป็นเวทศักดิ์สิทธิ์ · ฮีลแรงขึ้น · ความเร็วลดเล็กน้อย',
    base: { wis: 4, int: 3 },
    mod: { healAmp: 0.1, aspd: -0.06 },
    dg: 'd6',
    common: 18,
    boss: 4,
    cards: { card_sunpriest: 3, card_pharaoh: 1 },
    sig: { holyCounter: 1, counter: 0.08 },
    bonus: [{ overhealShield: 1 }, { magPen: 0.06 }],
  }),
  row({
    id: 'cf_frostbulwark',
    slot: 'offhand',
    name: 'โล่น้ำแข็งมังกรเหมันต์',
    icon: '🧊',
    setId: 'heartsteel_juggernaut',
    desc: '✦ บาเรียเวทน้ำแข็ง · แปลง 220% P.DEF เป็น Max HP · หลบลดลง',
    base: { vit: 5 },
    mod: { maxHp: 180, def: 18, flee: -8 },
    dg: 'd7',
    common: 18,
    boss: 4,
    cards: { card_icegolem: 3, card_frostwyrm: 1 },
    sig: { iceBarrier: 0.25, chillWeak: 0.1 },
    conversions: [{ from: 'def', to: 'maxHp', ratio: 2.2, cap: 550, label: '220% P.DEF → Max HP (สูงสุด +550)' }],
    bonus: [{ chillSlow: 0.1 }, { thorns: 0.15 }],
  }),
  row({
    id: 'cf_magmaforgering',
    slot: 'acc',
    name: 'แหวนเตาหลอมลาวาไททัน',
    icon: '🌋',
    desc: '✦ ไฟลุกลามเมื่อศัตรูตาย + เผาไหม้รอบตัวทุกเทิร์น · M.DEF ลด',
    base: { str: 4, int: 4 },
    mod: { atk: 18, matk: 18, mdef: -0.05 },
    dg: 'd8',
    common: 20,
    boss: 5,
    cards: { card_flamecaller: 3, card_lavatitan: 1 },
    sig: { fireSpread: 1, burnDps: 20 },
    effects: [{ id: 'radiance_burn', power: 0.2, cd: 1 }],
    bonus: [{ vsBurn: 0.12 }, { elemDmg: 0.1 }],
  }),
  row({
    id: 'cf_spellcoil',
    slot: 'head',
    name: 'คอยล์เวทจักรกลออมนิ',
    icon: '⚡',
    setId: 'trinity_spellblade',
    desc: '✦ ร่าย Ult คืน Mana + คริร่ายเวทเสริม · P.DEF ลดเล็กน้อย',
    base: { int: 5, agi: 4 },
    mod: { maxRes: 35, spellCrit: 0.06, def: -8 },
    dg: 'd9',
    common: 20,
    boss: 5,
    cards: { card_sparkcoil: 3, card_omnicore: 1 },
    sig: { mgUltMana: 20, autoCostCut: 4 },
    effects: [{ id: 'coc_cast', power: 0.75, chance: 0.4, cd: 1 }],
    bonus: [{ elemDmg: 0.12 }, { magPen: 0.08 }],
  }),
  row({
    id: 'cf_starweavershroud',
    slot: 'armor',
    name: 'ผ้าคลุมทอแสงดารา',
    icon: '🌠',
    desc: '✦ หลบแล้วตีสวน + Echo ฟันซ้ำสองจังหวะ · HP สูงสุดลดลง',
    base: { dex: 5, luk: 5 },
    mod: { crit: 0.06, flee: 12, maxHp: -80 },
    dg: 'd10',
    common: 22,
    boss: 5,
    cards: { card_voidstalker: 3, card_starweaver: 1 },
    sig: { ultDodge: 1, dodgeStrike: 1 },
    effects: [{ id: 'echo_double', power: 0.6, chance: 0.35, cd: 2 }],
    bonus: [{ critMul: 0.18 }, { physPen: 0.08 }],
  }),
  row({
    id: 'cf_chronowatch',
    slot: 'acc',
    name: 'นาฬิกาพกโครนอสไททัน',
    icon: '⏳',
    setId: 'clockwork_chronos',
    desc: '✦ คอมโบแรง + Echo เบิ้ลโจมตี · HP สูงสุดลดเล็กน้อย',
    base: { agi: 6, str: 4 },
    mod: { aspd: 0.16, combo: 0.08, maxHp: -90 },
    dg: 'd11',
    common: 22,
    boss: 5,
    cards: { card_cogsentinel: 3, card_chronotitan: 1 },
    sig: { comboDmg: 0.18, smashCd: -1500 },
    effects: [{ id: 'echo_double', power: 0.65, chance: 0.4, cd: 2 }],
    bonus: [{ physPen: 0.08 }, { combo: 0.06 }],
  }),
  row({
    id: 'cf_leviathanscale',
    slot: 'head',
    name: 'เกราะเกล็ดร่องสมุทรเลเวียธาน',
    icon: '🐋',
    setId: 'abyssal_leviathan',
    desc: '✦ ฮีลเกินเป็นโล่ · แปลง 3% Max HP เป็น M.ATK · ความเร็วลดเล็กน้อย',
    base: { vit: 7, int: 5 },
    mod: { maxHp: 320, def: 20, aspd: -0.06 },
    dg: 'd12',
    common: 24,
    boss: 6,
    cards: { card_trenchcrusher: 3, card_leviathan: 1 },
    sig: { overhealShield: 1, waveShield: 0.08 },
    conversions: [{ from: 'maxHp', to: 'matk', ratio: 0.03, cap: 190, label: '3% Max HP → M.ATK (สูงสุด +190)' }],
    bonus: [{ lifesteal: 0.04 }, { mdef: 0.06 }],
  }),
  row({
    id: 'cf_seraphhalo',
    slot: 'head',
    name: 'รัศมีเทวทูตสุริยคราส',
    icon: '😇',
    setId: 'eclipse_seraph',
    desc: '✦ บาเรียต้นเวฟ + มานาล้นปลดพลังเวท +40% · P.DEF ลด',
    base: { int: 7, wis: 7 },
    mod: { matk: 28, elemDmg: 0.18, magPen: 0.12, def: -10 },
    dg: 'd13',
    common: 24,
    boss: 6,
    cards: { card_eclipsewraith: 3, card_seraph: 1 },
    sig: { mgWaveBarrier: 0.6, spellVamp: 0.06 },
    effects: [{ id: 'mana_overload', power: 0.35, threshold: 0.6 }],
    bonus: [{ elemDmg: 0.14 }, { spellCrit: 0.06 }],
  }),
]

export const ALL_CARDFORGE_ITEMS: Item[] = [...CARDFORGE_ITEMS, ...CARDFORGE_EXPANSION_ITEMS]

export interface CardforgeCost { mats: Record<string, number>; zeny: number; cards: Record<string, number> }
export const cardforgeCost = (it: Item): CardforgeCost => ({ ...craftCost(it), cards: { ...(it.craft?.cards ?? {}) } })
/** Cards in the BAG only (a card socketed in a piece of gear is not spent). */
export const bagCards = (s: Pick<SaveData, 'cards'>, id: string) => s.cards?.[id] ?? 0
export const isCardforge = (it: Item) => !!it.craft?.cards

/** What is missing right now (for the chips). ok = can press. Locked / already owned count as not ok with a reason. */
export function canCardforge(s: SaveData, it: Item): { ok: boolean; why?: 'locked' | 'owned' | 'short'; short: string[] } {
  const c = it.craft
  if (!c?.cards) return { ok: false, why: 'locked', short: [] }
  if (!((s.clearsBy?.[c.dg] ?? 0) > 0)) return { ok: false, why: 'locked', short: [] }
  if (s.owned.includes(it.id)) return { ok: false, why: 'owned', short: [] }
  const cost = cardforgeCost(it), short: string[] = []
  for (const [id, n] of Object.entries(cost.cards)) if (bagCards(s, id) < n) short.push(id)
  for (const [id, n] of Object.entries(cost.mats)) if ((s.mats?.[id] ?? 0) < n) short.push(id)
  if (s.zeny < cost.zeny) short.push('zeny')
  return short.length ? { ok: false, why: 'short', short } : { ok: true, short }
}

/** v99 📌: the pinned recipe, if it can be built right now (so the run result can say so). Undefined when nothing is pinned, locked, owned or short. */
export function pinnedReady(s: SaveData): Item | undefined {
  const it = s.forgePin ? [...CRAFT_ITEMS, ...CLASS_GEAR, ...CLASS_CRAFT_ITEMS, ...AWAKENED_CRAFT_ITEMS, ...ALL_CARDFORGE_ITEMS].find((x) => x.id === s.forgePin) : undefined
  if (!it?.craft || s.owned.includes(it.id) || !((s.clearsBy?.[it.craft.dg] ?? 0) > 0)) return undefined
  if (it.req === 'job2' && !s.job2) return undefined
  if (it.req === 'job3' && (!s.job2 || !s.job3)) return undefined
  if (it.craft.cards) return canCardforge(s, it).ok ? it : undefined
  const c = craftCost(it)
  return s.zeny >= c.zeny && Object.entries(c.mats).every(([id, n]) => (s.mats?.[id] ?? 0) >= n) ? it : undefined
}

/** Pay cards + mats + zeny ALL OR NOTHING and add the piece. False (nothing changes) when locked, owned, or short. */
export function cardforge(s: SaveData, it: Item): boolean {
  if (!canCardforge(s, it).ok) return false
  const cost = cardforgeCost(it)
  s.zeny -= cost.zeny
  for (const [id, n] of Object.entries(cost.mats)) { s.mats![id] -= n; if (s.mats![id] <= 0) delete s.mats![id] }
  for (const [id, n] of Object.entries(cost.cards)) { s.cards![id] -= n; if (s.cards![id] <= 0) delete s.cards![id] }
  s.owned.push(it.id)
  return true
}
