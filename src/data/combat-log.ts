// v120 (Q 2026-11-08 "ต้องเก็บ log มาวิเคราะห์"): combat log of every hit the hero takes, kept as a ring buffer during a run.
// On a death the last hits + the context that scales them (floor, Hero Power, hero defences, monster numbers, affixes, enrage)
// are saved to localStorage (last DEATHS deaths) so a one-shot can be read back after the fact: death screen recap,
// 📋 copy button, and `nthDeaths()` in the browser console. Pure data + guarded storage: no Phaser, no network.

export type HitOut = 'hit' | 'shield' | 'dodge' | 'lucky' | 'evade' | 'block' | 'taunt' | 'mirror' | 'rod'

/** One hit on the hero. `raw` = incoming before DEF / guard, `taken` = after them (before shields), `hp` = HP lost. */
export interface HitRec {
  turn: number // hero turn in this fight
  floor: number // tower floor (0 = not a tower)
  who: string // monster name ('' = no source: DoT, event, self)
  kind?: string
  tag: string // what hit: โจมตี / คอมโบ / slam name / skill name / 🔥 DoT ...
  magic: boolean
  crit: boolean
  out: HitOut
  raw: number
  taken: number
  shield: number // soaked by shields / Kyrie / Mana Shield
  hp: number // HP actually lost
  hp0: number // HP before
  maxHp: number
  mon?: { lv?: number; dmg: number; matk?: number; mul: number; hell?: string; affix?: string }
}

export interface DeathRec {
  at: string // ISO time
  mode: string
  where: string
  floor: number
  reason: 'dead' | 'timeout'
  hero: { job: string; job2?: string; lv: number; baseLv: number; power: number; offense: number; survival: number;
    maxHp: number; def: number; mdef: number; guard: number; flee: number; luckyDodge: number; autoGuard: number; critDR: number }
  affixes: string[]
  fightTurns: number
  enrage: number
  hits: HitRec[]
}

export const COMBAT_LOG = { keepHits: 30, recap: 3, deaths: 5, key: 'nth.deathlog.v1' }

/** Ring buffer of the run's last hits (oldest dropped). */
export class CombatLog {
  hits: HitRec[] = []
  push(h: HitRec) {
    this.hits.push(h)
    if (this.hits.length > COMBAT_LOG.keepHits) this.hits.splice(0, this.hits.length - COMBAT_LOG.keepHits)
  }
  reset() { this.hits = [] }
}

const round = (n: number) => Math.round(n)
const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0)

/** The hit that took the most HP among the last ones that landed (the "killer" a player asks about). */
export function biggestHit(d: Pick<DeathRec, 'hits'>): HitRec | undefined {
  return d.hits.filter((h) => h.hp > 0).reduce<HitRec | undefined>((a, h) => (!a || h.hp >= a.hp ? h : a), undefined)
}

const OUT_TXT: Record<HitOut, string> = { hit: '', shield: 'โล่รับหมด', dodge: 'หลบ', lucky: 'LUCKY', evade: 'EVADE', block: 'BLOCK', taunt: 'ตัวล่อรับ', mirror: 'สะท้อน', rod: 'Magic Rod' }

/** One line per hit, short enough for the death panel. */
export function hitLine(h: HitRec): string {
  const src = h.who ? `${h.who} · ${h.tag}` : h.tag
  if (h.out !== 'hit' && h.out !== 'shield') return `${src}: ${OUT_TXT[h.out]}`
  const type = `${h.magic ? '🔮เวท' : '⚔️กาย'}${h.crit ? ' 💥คริ' : ''}`
  const sh = h.shield > 0 ? ` · โล่ -${round(h.shield)}` : ''
  return `${src} (${type}): ${round(h.raw)} → ${round(h.taken)}${sh} · HP -${round(h.hp)} (${pct(h.hp, h.maxHp)}% max)`
}

/** Death panel lines: the last few hits, newest last. */
export function recapLines(d: DeathRec): string[] {
  return d.hits.slice(-COMBAT_LOG.recap).map(hitLine)
}

/** Full plain-text report (what the 📋 button copies): context first, then every logged hit. */
export function deathText(d: DeathRec): string {
  const h = d.hero, big = biggestHit(d)
  const head = [
    `☠️ Novice to Hero death log · ${d.at}`,
    `${d.where} · mode ${d.mode}${d.floor ? ` · F${d.floor}` : ''} · ${d.reason === 'timeout' ? 'หมดเวลา' : 'ตาย'} · เทิร์น ${d.fightTurns} · enrage x${d.enrage}`,
    `${h.job}${h.job2 ? '/' + h.job2 : ''} Lv${h.lv} (Base ${h.baseLv}) · ⚡${h.power} (off ${round(h.offense)} / surv ${round(h.survival)})`,
    `HP ${h.maxHp} · DEF ${h.def} · M.DEF ${pct(h.mdef, 1)}% · guard ${pct(h.guard, 1)}% · Flee ${h.flee} · lucky ${pct(h.luckyDodge, 1)}% · Auto Guard ${pct(h.autoGuard, 1)}% · Crit DR ${pct(h.critDR, 1)}%`,
    `affix: ${d.affixes.join(', ') || '-'}`,
    big ? `ดาเมจก้อนใหญ่สุด: ${hitLine(big)}` : 'ไม่มี hit ที่ลด HP',
    '--- hits (เก่า → ใหม่) ---',
  ]
  const rows = d.hits.map((x) => {
    const m = x.mon ? ` [Lv${x.mon.lv ?? '?'} dmg${round(x.mon.dmg)}${x.mon.matk !== undefined ? ` matk${round(x.mon.matk)}` : ''} x${x.mon.mul.toFixed(2)}${x.mon.hell ? ' ' + x.mon.hell : ''}${x.mon.affix ? ' ' + x.mon.affix : ''}]` : ''
    return `T${x.turn}${x.floor ? ` F${x.floor}` : ''} HP${round(x.hp0)}/${x.maxHp} ${hitLine(x)}${m}`
  })
  return [...head, ...rows].join('\n')
}

// ----- storage (guarded like save.ts: private windows / sandboxes keep playing without it) -----
function isDeathRec(v: unknown): v is DeathRec {
  return typeof v === 'object' && v !== null && Array.isArray((v as { hits?: unknown }).hits) && typeof (v as { at?: unknown }).at === 'string'
}

export function loadDeaths(): DeathRec[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(COMBAT_LOG.key) ?? '[]')
    return Array.isArray(raw) ? raw.filter(isDeathRec) : []
  } catch { return [] }
}

/** Newest first, capped at COMBAT_LOG.deaths. */
export function saveDeath(d: DeathRec): void {
  const all = [d, ...loadDeaths()].slice(0, COMBAT_LOG.deaths)
  try { localStorage.setItem(COMBAT_LOG.key, JSON.stringify(all)) } catch { /* quota / private mode */ }
}
