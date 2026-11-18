// ===== v127 🔥 hard escalation (Q 2026-11-19 "ในดันมอน มินิบอส ให้มันโหดขึ้นในแต่ละเวฟ แต่ละวัน") =====
// A 🔥 hard (and 😈 hell) dungeon run gets harder as it goes, on top of the +50% hard stat points and the corruption roll:
//   every room      all stat points +10% per room already passed (room 1 = +0%, room 5 = +40% ...)
//   ☀️ day 2        every monster rolls 3 random perks (MON_PERKS) + HP +30%
//   ☀️ day 3+       5 random perks + 1 🟡 yellow blessing (MON_BLESS_YELLOW), HP +30% stays
//   😈 hell MVP     the final boss: HP +50%, all stat points +50%, + 1 🔴 red blessing (MON_BLESS_RED)
// D1 has no days: only the per-room stat climb. Pure data + pure functions; BattleScene.statDef calls them.
import type { MonsterDef } from './game-data'

export const HARD_ESC = {
  statPerRoom: 0.1, // x stat points per room index (pointsMul)
  days: [ // by day (index 0 = day 1); days past the list use the last entry
    { perks: 0, hp: 1, yellow: 0 },
    { perks: 3, hp: 1.3, yellow: 0 },
    { perks: 5, hp: 1.3, yellow: 1 },
  ],
  hellMvp: { hp: 1.5, stat: 1.5, red: 1 },
}

export interface MonPerk { id: string; icon: string; name: string; apply: (d: MonsterDef) => void; noBoss?: boolean }
const fx = (d: MonsterDef, k: keyof NonNullable<MonsterDef['onHit']>, n: number) => { d.onHit = { ...(d.onHit ?? {}), [k]: (d.onHit?.[k] ?? 0) + n } }
const phase = (d: MonsterDef, p: NonNullable<MonsterDef['phases']>[number]) => { d.phases = [...(d.phases ?? []), p].sort((a, b) => b.at - a.at) }
const skill = (d: MonsterDef, s: NonNullable<MonsterDef['skills']>[number]) => { d.skills = [...(d.skills ?? []), s] }
const mulAtk = (d: MonsterDef, k: number) => { d.dmg *= k; if (d.matk !== undefined) d.matk *= k }

/** Small perks: one stat or one effect each (hard passives / hell traits / tower affixes, monster-side). */
export const MON_PERKS: MonPerk[] = [
  { id: 'leech', icon: '🩸', name: 'ดูดเลือด', apply: (d) => { d.lifesteal = (d.lifesteal ?? 0) + 0.12 } },
  { id: 'thorns', icon: '🌵', name: 'หนาม', apply: (d) => { d.reflect = (d.reflect ?? 0) + 0.05 } },
  { id: 'swift', icon: '💨', name: 'ว่องไว', apply: (d) => { d.speed = (d.speed ?? 10) * 1.15 } },
  { id: 'venom', icon: '🐍', name: 'พิษติดตัว', apply: (d) => fx(d, 'poison', 1) },
  { id: 'flame', icon: '🔥', name: 'ไฟติดตัว', apply: (d) => fx(d, 'burn', 1) },
  { id: 'crush', icon: '💔', name: 'ทุบเกราะ', apply: (d) => fx(d, 'armorBreak', 1) },
  { id: 'sap', icon: '😰', name: 'ตีอ่อนแรง', apply: (d) => fx(d, 'weaken', 1) },
  { id: 'enrage', icon: '😡', name: 'คลั่ง', apply: (d) => phase(d, { at: 0.35, name: '😡 คลั่ง!', dmg: 1.3, speed: 1.15 }) },
  { id: 'iron', icon: '⛰️', name: 'ผิวเหล็ก', apply: (d) => { d.def = (d.def ?? 0) + 25 } },
  { id: 'eye', icon: '🎯', name: 'ตาเหยี่ยว', apply: (d) => { d.trueSight ??= { after: 2, turns: 3 } } },
  { id: 'blast', icon: '💥', name: 'ระเบิดตาย', apply: (d) => { d.deathBlast = Math.max(d.deathBlast ?? 0, 0.8) }, noBoss: true },
  { id: 'keen', icon: '🗡️', name: 'คมกริบ', apply: (d) => { d.crit = Math.min(1, (d.crit ?? 0) + 0.1) } },
  { id: 'flurry', icon: '🔁', name: 'รัวหมัด', apply: (d) => { d.combo = (d.combo ?? 0) + 0.12 } },
  { id: 'riposte', icon: '↩️', name: 'สวนกลับ', apply: (d) => { d.counter = (d.counter ?? 0) + 0.12 } },
  { id: 'bulk', icon: '🫀', name: 'ร่างใหญ่', apply: (d) => { d.hp = Math.round(d.hp * 1.15) } },
  { id: 'might', icon: '⚔️', name: 'แรงช้าง', apply: (d) => mulAtk(d, 1.12) },
]

/** 🟡 yellow blessings: one package of mechanics (a phase / a skill / several stats). */
export const MON_BLESS_YELLOW: MonPerk[] = [
  { id: 'y_fury', icon: '🟡', name: 'โทสะทอง', apply: (d) => phase(d, { at: 0.5, name: '🟡 โทสะทอง! แรงและเร็วขึ้น', dmg: 1.25, speed: 1.2, cleanse: true }) },
  { id: 'y_aegis', icon: '🟡', name: 'เกราะสวรรค์', apply: (d) => { d.def = (d.def ?? 0) + 40; skill(d, { kind: 'shield', every: 3, pow: 0.12, self: true, name: '🟡 เกราะสวรรค์' }) } },
  { id: 'y_storm', icon: '🟡', name: 'พายุเวท', apply: (d) => skill(d, { kind: 'bolt', every: 3, hits: 2, pow: 0.8, name: '🟡 พายุเวท' }) },
  { id: 'y_undying', icon: '🟡', name: 'ไม่ยอมตาย', apply: (d) => phase(d, { at: 0.3, name: '🟡 ไม่ยอมตาย! ฟื้นพลัง', heal: 0.25, cleanse: true }) },
  { id: 'y_reaper', icon: '🟡', name: 'เพชฌฆาต', apply: (d) => { d.crit = Math.min(1, (d.crit ?? 0) + 0.15); d.combo = (d.combo ?? 0) + 0.15 } },
]

/** 🔴 red blessings: 😈 hell MVP add-on, a second wind or a hard rule on the hero. */
export const MON_BLESS_RED: MonPerk[] = [
  { id: 'r_rebirth', icon: '🔴', name: 'คืนชีพนรก', apply: (d) => phase(d, { at: 0.2, name: '🔴 คืนชีพนรก! ฟื้น 50% + แรงขึ้น', heal: 0.5, dmg: 1.3, cleanse: true }) },
  { id: 'r_tyrant', icon: '🔴', name: 'จ้าวทรราช', apply: (d) => { fx(d, 'burn', 2); fx(d, 'weaken', 1); d.lifesteal = (d.lifesteal ?? 0) + 0.2 } },
  { id: 'r_mirror', icon: '🔴', name: 'กระจกนิรันดร์', apply: (d) => { d.reflect = (d.reflect ?? 0) + 0.15; d.trueSight = { after: 1, turns: 3 } } },
  { id: 'r_chrono', icon: '🔴', name: 'กาลเวลาเร่ง', apply: (d) => { d.speed = (d.speed ?? 10) * 1.3; d.chargeEvery = Math.max(2, (d.chargeEvery ?? 3) - 1) } },
]

/** What the run adds at this room: points x, HP x, perk / blessing counts. day = 1 when the dungeon has no days. */
export function escalationAt(roomIdx: number, day: number, hellMvp: boolean) {
  const D = HARD_ESC.days[Math.min(HARD_ESC.days.length - 1, Math.max(0, day - 1))]
  const H = HARD_ESC.hellMvp
  return {
    pointsMul: (1 + HARD_ESC.statPerRoom * Math.max(0, roomIdx)) * (hellMvp ? H.stat : 1),
    hp: D.hp * (hellMvp ? H.hp : 1),
    perks: D.perks, yellow: D.yellow, red: hellMvp ? H.red : 0,
  }
}

/** Draw n distinct entries of `pool` (rand in [0,1)). */
function draw(pool: MonPerk[], n: number, rand: () => number): MonPerk[] {
  const left = [...pool], out: MonPerk[] = []
  while (out.length < n && left.length) out.push(left.splice(Math.floor(rand() * left.length), 1)[0])
  return out
}

/** Applies the HP part + the rolled perks / blessings to a built monster (a copy). Returns the label to show ('' = none). */
export function escalate(d: MonsterDef, e: ReturnType<typeof escalationAt>, rand: () => number = Math.random): { def: MonsterDef; tag: string; names: string } {
  if (d.passive) return { def: d, tag: '', names: '' }
  const out: MonsterDef = { ...d, onHit: { ...(d.onHit ?? {}) } }
  if (e.hp !== 1) out.hp = Math.max(1, Math.round(out.hp * e.hp))
  const boss = d.ai === 'boss'
  const got = [
    ...draw(MON_BLESS_RED, e.red, rand),
    ...draw(MON_BLESS_YELLOW, e.yellow, rand),
    ...draw(MON_PERKS.filter((p) => !(boss && p.noBoss)), e.perks, rand),
  ]
  for (const p of got) p.apply(out)
  return { def: out, tag: got.map((p) => p.icon).join(''), names: got.map((p) => `${p.icon} ${p.name}`).join(' · ') }
}
