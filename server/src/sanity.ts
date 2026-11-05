// Anti-cheat level 1: sanity checks on a save blob (PUT /save). LOG-ONLY at first: flags are stored, nothing is
// rejected until the thresholds are tuned against real data (see CAPS). Pure functions, shared rules from src/data/meta.
import { ITEMS, STAT_RULES } from '../../src/data/meta'

export interface BlobLike {
  baseLevel?: unknown; baseXp?: unknown; zeny?: unknown; gems?: unknown
  stats?: unknown; owned?: unknown; statPoints?: unknown
}
export interface Flag { rule: string; detail: string }

/** TUNE: generous on purpose (false positives on real players are worse than missed cheaters at this stage). */
export const CAPS = {
  levelPerHour: 15, levelSlack: 5,
  zenyPerHour: 200_000, zenySlack: 50_000,
  gemsPerHour: 300, gemsSlack: 150,
  statSlack: 30, // race bonus etc.
  minHours: 1 / 12, // treat tiny gaps as 5 min so rapid autosaves don't divide by ~0
}

const KNOWN_ITEMS = new Set(ITEMS.map((i) => i.id))
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN)

export function totalXp(level: number, xp: number): number {
  let t = xp
  for (let l = 1; l < level; l++) t += STAT_RULES.baseXpNeed(l)
  return t
}

/** `prev` = the stored save (null on first upload), `hours` = real time since it was stored. */
export function checkSave(prev: BlobLike | null, next: BlobLike, hours: number): Flag[] {
  const f: Flag[] = []
  const lv = num(next.baseLevel), xp = num(next.baseXp), zeny = num(next.zeny), gems = num(next.gems)
  if (![lv, xp, zeny, gems].every(Number.isFinite)) return [{ rule: 'shape', detail: 'non-numeric level/xp/zeny/gems' }]
  if (lv < 1 || lv > STAT_RULES.maxBaseLevel) f.push({ rule: 'level-range', detail: `Lv ${lv}` })
  if (zeny < 0 || gems < 0 || xp < 0) f.push({ rule: 'negative', detail: `zeny ${zeny} gems ${gems} xp ${xp}` })

  // stat points: everything spent + unspent can't exceed what the level gave
  const stats = next.stats
  if (stats && typeof stats === 'object') {
    const sum = Object.values(stats as Record<string, unknown>).reduce<number>((a, v) => a + (num(v) || 0), 0)
    const left = num(next.statPoints) || 0
    const earned = 7 * STAT_RULES.start + 3 + STAT_RULES.pointsPerLevel * (lv - 1)
    if (sum + left > earned + CAPS.statSlack) f.push({ rule: 'stats', detail: `spent ${sum} + left ${left} > earned ${earned}` })
  }

  if (Array.isArray(next.owned)) {
    const bad = next.owned.filter((id) => typeof id !== 'string' || !KNOWN_ITEMS.has(id))
    if (bad.length) f.push({ rule: 'unknown-item', detail: bad.slice(0, 5).join(',') })
  }

  if (prev) {
    const h = Math.max(hours, CAPS.minHours)
    const pLv = num(prev.baseLevel), pXp = num(prev.baseXp), pZ = num(prev.zeny), pG = num(prev.gems)
    if (lv - pLv > CAPS.levelPerHour * h + CAPS.levelSlack) f.push({ rule: 'level-jump', detail: `${pLv} -> ${lv} in ${h.toFixed(2)}h` })
    if (zeny - pZ > CAPS.zenyPerHour * h + CAPS.zenySlack) f.push({ rule: 'zeny-jump', detail: `${pZ} -> ${zeny} in ${h.toFixed(2)}h` })
    if (gems - pG > CAPS.gemsPerHour * h + CAPS.gemsSlack) f.push({ rule: 'gems-jump', detail: `${pG} -> ${gems} in ${h.toFixed(2)}h` })
    if (Number.isFinite(pLv) && Number.isFinite(pXp) && totalXp(lv, xp) < totalXp(pLv, pXp) - 1) f.push({ rule: 'xp-rollback', detail: 'total xp went down' })
  }
  return f
}
