// Battle HUD layout rules (pure, no Phaser): status chips, chip grid, stage pill text, float-text lanes, theme tokens.
// BattleScene draws them; tests/hud-layout.test.ts checks them.

/** Shared look for the battle HUD and the pause menu (glass panels on an 8px grid). */
export const HUD_THEME = {
  glass: 0x0f1226, glassA: 0.78,
  edge: 0xffffff, edgeA: 0.14,
  tile: 0x1e2342, tileHi: 0x2a3060,
  gold: 0xf2b84b, debuff: 0xff6b6b, buff: 0xffd86b,
  hp: 0xe5484d, hpLow: 0xff9a3c, hpBack: 0x2a1220, hpGhost: 0xffe2c4, shield: 0x9fe3ff, xp: 0x7fd7ff,
  text: '#f6eedc', sub: '#a9a6c7', ink: '#14172b',
  r: 10, pad: 8,
} as const

export type ChipKind = 'debuff' | 'buff'
export interface StatusChip { icon: string; n: string; kind: ChipKind; name: string }

/** Hero debuffs (BattleScene.hx). Counts are hero turns, poison / burn are stacks. */
export interface HeroDebuffs { poison: number; burn: number; weaken: number; armorBreak: number; silence: number; web: number; slow: number; thorn: number; venomTurns: number }
/** Hero buffs (Skill 2 buffs, Cleric Grand Cross / Dawn Light / Kyrie). */
export interface HeroBuffs {
  gcLeft?: number; dawn?: { n: number; every: number }; dawnWis: number; bless: number; kyrieHits: number; gloria: boolean
  guard: number; blood: number; hawk: number; mshield: number; renew: number
  s2Icon: string; s2Name: string
}

const DEBUFFS: [keyof HeroDebuffs, string, string][] = [
  ['poison', '☠️', 'พิษ'], ['burn', '🔥', 'ไฟลวก'], ['weaken', '💔', 'อ่อนแรง'], ['armorBreak', '🛡️💥', 'เกราะแตก'], ['silence', '🤐', 'ใบ้ (ใช้สกิลไม่ได้)'],
  ['web', '🕸️', 'ติดใย'], ['slow', '💙', 'ช้าลง'], ['thorn', '❄️', 'หนามน้ำแข็ง'], ['venomTurns', '🕷️', 'พิษแมงมุม'],
]

/** Debuffs first (red frame), then buffs (gold frame); only the ones that are on. */
export function statusChips(hx: HeroDebuffs, b: HeroBuffs): StatusChip[] {
  const out: StatusChip[] = []
  for (const [k, icon, name] of DEBUFFS) if (hx[k] > 0) out.push({ icon, n: String(hx[k]), kind: 'debuff', name })
  const buff = (on: boolean, icon: string, n: number | string, name: string) => { if (on) out.push({ icon, n: String(n), kind: 'buff', name }) }
  buff(b.gcLeft !== undefined, '✝️', b.gcLeft ?? 0, 'Grand Cross')
  if (b.dawn) buff(true, '🌄', `${b.dawn.n}/${b.dawn.every}`, 'รุ่งอรุณ (ตีครบ = แสงรุ่งอรุณ)')
  buff(b.dawnWis > 0, '☀️', b.dawnWis, 'แสงแตก WIS')
  buff(b.bless > 0, b.s2Icon, b.bless, b.s2Name)
  buff(b.kyrieHits > 0, '🛡️', b.kyrieHits, 'Kyrie Eleison (ครั้ง)')
  buff(b.bless > 0 && b.gloria, '✨', '', 'Gloria')
  for (const k of ['guard', 'blood', 'hawk', 'mshield', 'renew'] as const) buff(b[k] > 0, b.s2Icon, b[k], b.s2Name)
  return out
}

/** Positions for `count` chips in rows of up to maxW wide (at most maxRows rows). If they don't fit, the last slot becomes "+N". */
export function chipGrid(count: number, maxW: number, size: number, gap: number, maxRows = 2): { pos: { x: number; y: number }[]; overflow: number } {
  const cols = Math.max(1, Math.floor((maxW + gap) / (size + gap))), cap = cols * maxRows
  const shown = count > cap ? cap - 1 : count
  const slots = count > cap ? cap : count
  const pos = Array.from({ length: slots }, (_, i) => ({ x: (i % cols) * (size + gap), y: Math.floor(i / cols) * (size + gap) }))
  return { pos, overflow: count - shown }
}

export interface StageIn {
  roomLv?: number; hard: boolean; hardK: { hp: number; atk: number }; modIcons: string
  where: string; fighting: boolean; left: number; limit: number
}
/** Top-centre pill: level · hard · affix / corruption icons · where · turns left. warn = 3 or fewer turns left. */
export function stagePill(s: StageIn): { text: string; warn: boolean } {
  const head = s.roomLv !== undefined ? `Lv${s.roomLv}${s.hard ? ' 🔥ยาก' : ''}` : s.hard ? `🔥ยาก HP x${s.hardK.hp.toFixed(1)} ATK x${s.hardK.atk.toFixed(1)}` : ''
  const parts = [head, s.modIcons, s.where, `⏳ ${s.fighting ? `${s.left}/${s.limit}` : '-'}`].filter(Boolean)
  return { text: parts.join(' · '), warn: s.fighting && s.left <= 3 }
}

/** Float text lanes: how many recent texts sit near (x, y), so a new one stacks above them instead of on top. */
export function floatLane(recent: { x: number; y: number; t: number }[], x: number, y: number, now: number, ms = 650, dx = 60, dy = 40): number {
  return recent.filter((r) => now - r.t < ms && Math.abs(r.x - x) <= dx && Math.abs(r.y - y) <= dy).length
}
