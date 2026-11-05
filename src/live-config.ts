// Live balance config: fetch the published patch (server/ GET /config/live) and apply it to src/data BEFORE Phaser starts.
// Never blocks boot past timeoutMs and never patches after the game has started (a late answer is only cached).
import { applyPatch, checkPatch, parseRelease, schemaSupported, type Skip } from './data/patch'
import { PREVIEW } from './preview-kit'
import type { Release } from './data/tunables'

export type CfgSource = 'defaults' | 'live' | 'cache' | 'draft' | 'local'
export interface LiveInfo { source: CfgSource; releaseId: number | null; hash?: string; applied: number; skipped: Skip[]; note?: string }
export const liveInfo: LiveInfo = { source: 'defaults', releaseId: null, applied: 0, skipped: [] }

const API = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
const CACHE_KEY = 'novice-to-hero.cfg.v1'
/** ?cfg=local reads {patch, guards} from here (DEV / PREVIEW builds only): tools/bot.cjs and playtests. */
export const LOCAL_KEY = 'novice-to-hero.cfg.local'
const HARD_TIMEOUT_MS = 15_000

const store = {
  get(k: string): unknown { try { return JSON.parse(localStorage.getItem(k) ?? 'null') } catch { return null } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* quota / private mode */ } },
  del(k: string) { try { localStorage.removeItem(k) } catch { /* ignore */ } },
}

/** Apply a release; true = applied (or it is the "live config off" release). Nothing is written on any error. */
function use(rel: Release, source: CfgSource): boolean {
  if (!schemaSupported(rel.schemaVer)) { liveInfo.note = `schemaVer ${rel.schemaVer} is newer than this game`; return false }
  if (rel.releaseId === null && source !== 'draft' && source !== 'local') return true
  const r = applyPatch(rel.patch, rel.guards)
  if (!r.ok) { liveInfo.note = `rejected: ${r.errors.slice(0, 3).map((e) => `${e.table}.${e.path} ${e.msg}`).join('; ')}`; return false }
  Object.assign(liveInfo, { source, releaseId: rel.releaseId, hash: rel.hash, applied: r.count, skipped: r.skipped })
  return true
}

/** Fetch + shape check. null = unusable answer. */
async function get(path: string, signal: AbortSignal, noStore = false): Promise<Release | null> {
  const res = await fetch(`${API}${path}`, { signal, credentials: noStore ? 'include' : 'omit', cache: noStore ? 'no-store' : 'default' })
  if (!res.ok) return null
  return parseRelease(await res.json())
}

/** A cached release is re-validated against THIS build's registry, so a stale cache can't apply anything invalid. */
function fromCache(): boolean {
  const rel = parseRelease(store.get(CACHE_KEY))
  if (!rel || rel.releaseId === null) return false
  if (use(rel, 'cache')) return true
  store.del(CACHE_KEY)
  return false
}

/** Same ok-check as use() without writing: decides whether a late answer is worth caching. */
const cacheable = (rel: Release) => schemaSupported(rel.schemaVer) && (rel.releaseId === null || checkPatch(rel.patch, rel.guards).ok)

export async function loadLiveConfig(timeoutMs = 1500): Promise<LiveInfo> {
  const mode = new URLSearchParams(location.search).get('cfg')
  if (mode === 'off') { liveInfo.note = '?cfg=off'; return liveInfo }
  if (mode === 'local' && (import.meta.env.DEV || PREVIEW)) {
    const x = store.get(LOCAL_KEY) as { patch?: unknown; guards?: unknown } | null
    const rel = parseRelease({ releaseId: null, schemaVer: 1, patch: x?.patch ?? {}, guards: x?.guards ?? {} })
    if (rel) use(rel, 'local')
    return liveInfo
  }
  if (!API) return liveInfo

  const ctrl = new AbortController(), hard = setTimeout(() => ctrl.abort(), HARD_TIMEOUT_MS)
  if (mode === 'draft') { // admin preview: needs the admin cookie, never cached, never falls back to live
    try { const rel = await get('/admin/draft/preview', ctrl.signal, true); if (rel) use(rel, 'draft'); else liveInfo.note = 'draft preview unavailable (admin login?)' } catch { liveInfo.note = 'draft preview failed' } finally { clearTimeout(hard) }
    return liveInfo
  }

  let late = false
  const req = get('/config/live', ctrl.signal).finally(() => clearTimeout(hard))
  const TIMEOUT = Symbol('timeout')
  const first = await Promise.race([req.catch(() => null), new Promise<typeof TIMEOUT>((r) => setTimeout(() => r(TIMEOUT), timeoutMs))])
  if (first === TIMEOUT) {
    late = true
    void req.then((rel) => { if (rel && late && cacheable(rel)) { if (rel.releaseId === null) store.del(CACHE_KEY); else store.set(CACHE_KEY, rel) } }).catch(() => {})
    if (!fromCache()) liveInfo.note = 'live config timed out'
    return liveInfo
  }
  if (!first) { if (!fromCache()) liveInfo.note = 'live config unavailable'; return liveInfo }
  if (first.releaseId === null) { store.del(CACHE_KEY); liveInfo.note = 'no live release'; return liveInfo }
  if (use(first, 'live')) store.set(CACHE_KEY, first)
  else fromCache()
  return liveInfo
}
