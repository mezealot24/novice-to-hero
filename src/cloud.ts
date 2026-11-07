// Cloud save + social login client (server/ = Better Auth + Neon on a Worker). Off unless VITE_API_URL is set,
// so the plain GitHub Pages build behaves exactly as before (local save only).
// With the cloud on, the cloud save is the truth; localStorage is only the cache the game reads synchronously.
import { createAuthClient } from 'better-auth/client'
import { anonymousClient } from 'better-auth/client/plugins'
import { adopt, localJson, setSaveHooks } from './save'

const API = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
export const cloudEnabled = !!API
export const PROVIDERS = [
  { id: 'google', label: 'Google' }, { id: 'apple', label: 'Apple' },
  { id: 'facebook', label: 'Facebook' }, { id: 'line', label: 'LINE' },
] as const
export type ProviderId = (typeof PROVIDERS)[number]['id']

export type SyncState = 'off' | 'idle' | 'syncing' | 'offline' | 'error'
export interface CloudStatus { state: SyncState; guest: boolean; linked: string[]; paidGems: number; lastSync: number }
export const status: CloudStatus = { state: cloudEnabled ? 'idle' : 'off', guest: true, linked: [], paidGems: 0, lastSync: 0 }
const listeners = new Set<() => void>()
export function onStatus(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
const emit = () => listeners.forEach((f) => f())
const set = (patch: Partial<CloudStatus>) => { Object.assign(status, patch); emit() }

const authClient = API ? createAuthClient({ baseURL: API, plugins: [anonymousClient()], fetchOptions: { credentials: 'include' } }) : null

// ---------- small local record: which user + revision this device last synced ----------
interface Meta { uid: string; rev: number; dirty: boolean; wiped: boolean }
const META_KEY = 'novice-to-hero.cloud.v1'
function readMeta(): Meta {
  try {
    const m: unknown = JSON.parse(localStorage.getItem(META_KEY) ?? 'null')
    if (m && typeof m === 'object') {
      const o = m as Record<string, unknown>
      return { uid: typeof o.uid === 'string' ? o.uid : '', rev: typeof o.rev === 'number' ? o.rev : 0, dirty: o.dirty === true, wiped: o.wiped === true }
    }
  } catch { /* fall through */ }
  return { uid: '', rev: 0, dirty: false, wiped: false }
}
let meta = readMeta()
function patchMeta(p: Partial<Meta>) {
  meta = { ...meta, ...p }
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)) } catch { /* ignore */ }
}

// ---------- tiny typed fetch helpers (responses narrowed, not trusted) ----------
async function api(path: string, init?: RequestInit): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${API}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init })
  const j: unknown = await res.json().catch(() => ({}))
  return { status: res.status, body: j && typeof j === 'object' ? (j as Record<string, unknown>) : {} }
}
const isSave = (d: unknown): d is { v: 1 } => !!d && typeof d === 'object' && (d as { v?: unknown }).v === 1

// ---------- session ----------
let uid = ''
async function ensureSession(): Promise<boolean> {
  if (!authClient) return false
  let { data } = await authClient.getSession()
  if (!data) {
    const r = await authClient.signIn.anonymous()
    if (r.error) return false
    data = (await authClient.getSession()).data
  }
  if (!data) return false
  uid = data.user.id
  const accounts = await authClient.listAccounts()
  const linked = (accounts.data ?? []).map((a) => a.providerId ?? '').filter((p) => p && p !== 'credential')
  set({ guest: linked.length === 0, linked })
  return true
}

// ---------- sync: the cloud is the only source of truth ----------
// localStorage is just the cache the game reads synchronously. There is no "pick a save" prompt any more:
// the cloud copy always wins, except unsynced progress made on top of the latest cloud revision (pushed up),
// and the very first login of an account with no cloud save (the local save is uploaded once).

/** Call on the title screen (before the player picks a save). 'adopted' = this device's save was replaced by the cloud copy. */
export async function syncStart(): Promise<'ok' | 'adopted' | 'offline'> {
  if (!authClient) return 'ok'
  try {
    set({ state: 'syncing' })
    if (!(await ensureSession())) { set({ state: 'offline' }); return 'offline' }
    await refreshWallet()
    const r = await api('/save')
    if (r.status !== 200) { set({ state: 'error' }); return 'ok' }
    const cloud = r.body.data, cloudRev = typeof r.body.rev === 'number' ? r.body.rev : 0
    const local = localJson()
    const sameUser = meta.uid === uid
    if (!isSave(cloud)) { // nothing in the cloud yet: upload this device's save once
      patchMeta({ uid, rev: cloudRev })
      if (local) { patchMeta({ dirty: true }); await push() } else set({ state: 'idle' })
      return 'ok'
    }
    if (!local && meta.wiped && sameUser) { patchMeta({ rev: cloudRev }); set({ state: 'idle' }); return 'ok' } // player chose a new game here
    if (local && (JSON.stringify(cloud) === local || JSON.stringify(cloud) === JSON.stringify(JSON.parse(local)))) {
      patchMeta({ uid, rev: cloudRev, dirty: false }); set({ state: 'idle', lastSync: Date.now() }); return 'ok'
    }
    if (local && sameUser && meta.rev === cloudRev && meta.dirty) { await push(); return 'ok' } // unsynced progress on top of the latest cloud save
    return takeCloud(cloud, cloudRev) ? 'adopted' : 'ok' // anything else: the cloud wins
  } catch { set({ state: 'offline' }); return 'offline' }
}

// The local save a cloud copy replaced, kept so a player can undo "the cloud wins" once (CloudScene restore button).
const BACKUP_KEY = 'novice-to-hero.save.backup'
export interface Backup { name: string; level: number; at: number }
export function backupInfo(): Backup | null {
  try {
    const b: unknown = JSON.parse(localStorage.getItem(BACKUP_KEY) ?? 'null')
    if (!b || typeof b !== 'object') return null
    const o = b as { at?: unknown; data?: { name?: unknown; baseLevel?: unknown } }
    return { name: typeof o.data?.name === 'string' ? o.data.name : '?', level: typeof o.data?.baseLevel === 'number' ? o.data.baseLevel : 0, at: typeof o.at === 'number' ? o.at : 0 }
  } catch { return null }
}
/** Put the backed-up save back and upload it over the cloud copy (the player asked for it). Page reloads on success. */
export async function restoreBackup(): Promise<string | null> {
  if (!authClient || !uid) return 'offline'
  try {
    const b: unknown = JSON.parse(localStorage.getItem(BACKUP_KEY) ?? 'null')
    const data = b && typeof b === 'object' ? (b as { data?: unknown }).data : null
    if (!isSave(data)) return 'no backup'
    const g = await api('/save')
    if (g.status !== 200) return 'offline'
    if (!adopt(data)) return 'failed'
    patchMeta({ uid, rev: typeof g.body.rev === 'number' ? g.body.rev : 0, dirty: true, wiped: false })
    await push()
    if (meta.dirty) return 'failed'
    localStorage.removeItem(BACKUP_KEY)
    location.reload()
    return null
  } catch { return 'offline' }
}

function takeCloud(cloud: unknown, cloudRev: number): boolean {
  const local = localJson()
  if (local && local !== JSON.stringify(cloud)) try { localStorage.setItem(BACKUP_KEY, `{"at":${Date.now()},"data":${local}}`) } catch { /* ignore */ }
  if (!adopt(cloud)) { set({ state: 'error' }); return false }
  patchMeta({ uid, rev: cloudRev, dirty: false, wiped: false })
  set({ state: 'idle', lastSync: Date.now() })
  return true
}

let timer: ReturnType<typeof setTimeout> | undefined
let inFlight = false
async function push(): Promise<void> {
  if (!authClient || inFlight) return
  const body = localJson()
  if (!body || !uid) return
  inFlight = true; set({ state: 'syncing' })
  try {
    const r = await api('/save', { method: 'PUT', body: `{"data":${body},"rev":${meta.rev}}` })
    if (r.status === 200 && typeof r.body.rev === 'number') {
      patchMeta({ rev: r.body.rev, dirty: localJson() !== body })
      set({ state: 'idle', lastSync: Date.now() })
      if (meta.dirty) schedulePush()
    } else if (r.status === 409) { // another device/tab saved first: the cloud wins, reload so every scene sees it
      const g = await api('/save')
      if (isSave(g.body.data) && takeCloud(g.body.data, typeof g.body.rev === 'number' ? g.body.rev : 0)) location.reload()
      else set({ state: 'error' })
    } else if (r.status === 401) { set({ state: 'offline' }) } else set({ state: 'error' })
  } catch { set({ state: 'offline' }) } finally { inFlight = false }
}
function schedulePush() { clearTimeout(timer); timer = setTimeout(() => { void push() }, 4000) }

if (cloudEnabled) {
  setSaveHooks({
    persist: () => { patchMeta({ dirty: true, wiped: false }); schedulePush() },
    wipe: () => patchMeta({ wiped: true }),
  })
  window.addEventListener('online', () => { if (meta.dirty) schedulePush() })
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && meta.dirty) void push() })
}

// ---------- account linking ----------
/** Guest -> real account. linkSocial keeps the same user (and save). If that social account already belongs to someone,
 *  fall back to a normal sign-in: the server moves the guest save over only when that account has none. */
export async function linkProvider(provider: ProviderId): Promise<string | null> {
  if (!authClient) return 'cloud off'
  const callbackURL = location.href.split('#')[0]
  const r = await authClient.linkSocial({ provider, callbackURL })
  if (!r.error) return null
  const s = await authClient.signIn.social({ provider, callbackURL })
  return s.error ? (s.error.message ?? 'login failed') : null
}

// ---------- paid-gem wallet (server only) ----------
export async function refreshWallet(): Promise<number> {
  if (!authClient) return 0
  try {
    const r = await api('/wallet')
    const n = typeof r.body.paidGems === 'number' ? r.body.paidGems : 0
    set({ paidGems: n }); return n
  } catch { return status.paidGems }
}
/** Spend paid gems on a SKU ('supporter' | 'costume:<id>'). The server owns the price. null = ok, else a reason. */
export async function spendPaid(sku: string): Promise<string | null> {
  if (!authClient) return 'cloud off'
  try {
    const r = await api('/wallet/spend', { method: 'POST', body: JSON.stringify({ sku, opId: crypto.randomUUID() }) })
    if (r.status === 200 && typeof r.body.paidGems === 'number') { set({ paidGems: r.body.paidGems }); return null }
    return r.status === 402 ? 'insufficient' : 'failed'
  } catch { return 'offline' }
}
