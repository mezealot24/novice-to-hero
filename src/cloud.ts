// Cloud save + social login client (server/ = Better Auth + Neon on a Worker). Off unless VITE_API_URL is set,
// so the plain GitHub Pages build behaves exactly as before. localStorage stays the cache and the offline fallback.
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

export type SyncState = 'off' | 'idle' | 'syncing' | 'offline' | 'conflict' | 'error'
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

// ---------- sync ----------
export interface Conflict { cloud: unknown; cloudRev: number }
let pending: Conflict | null = null
export const conflict = () => pending

/** Call once on the title screen (before the player picks a save). Resolves when local and cloud agree, or a conflict is pending. */
export async function syncStart(): Promise<'ok' | 'conflict' | 'offline'> {
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
    if (!isSave(cloud)) { // nothing in the cloud yet: first login uploads the existing local save
      if (!sameUser) patchMeta({ uid, rev: 0 })
      if (local) { patchMeta({ dirty: true }); await push() } else set({ state: 'idle' })
      return 'ok'
    }
    if (!local) { // fresh device (or deleted on purpose): take the cloud copy unless the player just wiped it
      if (meta.wiped && sameUser) { patchMeta({ rev: cloudRev }); set({ state: 'idle' }); return 'ok' }
      if (adopt(cloud)) { patchMeta({ uid, rev: cloudRev, dirty: false, wiped: false }); set({ state: 'idle', lastSync: Date.now() }) }
      return 'ok'
    }
    if (JSON.stringify(cloud) === local || JSON.stringify(cloud) === JSON.stringify(JSON.parse(local))) { patchMeta({ uid, rev: cloudRev, dirty: false }); set({ state: 'idle', lastSync: Date.now() }); return 'ok' }
    if (sameUser && meta.rev === cloudRev && meta.dirty) { await push(); return 'ok' } // only this device changed
    if (sameUser && meta.rev !== cloudRev && !meta.dirty) { // only the cloud changed: take it
      if (adopt(cloud)) patchMeta({ rev: cloudRev, dirty: false })
      set({ state: 'idle', lastSync: Date.now() }); return 'ok'
    }
    pending = { cloud, cloudRev }; set({ state: 'conflict' }); return 'conflict' // both changed, or a different account
  } catch { set({ state: 'offline' }); return 'offline' }
}

let timer: ReturnType<typeof setTimeout> | undefined
let inFlight = false
async function push(): Promise<void> {
  if (!authClient || pending || inFlight) return
  const body = localJson()
  if (!body || !uid) return
  inFlight = true; set({ state: 'syncing' })
  try {
    const r = await api('/save', { method: 'PUT', body: `{"data":${body},"rev":${meta.rev}}` })
    if (r.status === 200 && typeof r.body.rev === 'number') {
      patchMeta({ rev: r.body.rev, dirty: localJson() !== body })
      set({ state: 'idle', lastSync: Date.now() })
      if (meta.dirty) schedulePush()
    } else if (r.status === 409) {
      const g = await api('/save')
      pending = { cloud: g.body.data, cloudRev: typeof g.body.rev === 'number' ? g.body.rev : 0 }
      set({ state: 'conflict' })
    } else if (r.status === 401) { set({ state: 'offline' }) } else set({ state: 'error' })
  } catch { set({ state: 'offline' }) } finally { inFlight = false }
}
function schedulePush() { clearTimeout(timer); timer = setTimeout(() => { void push() }, 4000) }

/** Player's choice for a pending conflict. 'cloud' replaces this device's save (page reloads so every scene sees it). */
export async function resolve(choice: 'cloud' | 'local'): Promise<void> {
  const c = pending
  if (!c) return
  pending = null
  if (choice === 'cloud') {
    if (adopt(c.cloud)) { patchMeta({ uid, rev: c.cloudRev, dirty: false, wiped: false }); set({ state: 'idle', lastSync: Date.now() }); location.reload() }
    else set({ state: 'error' })
  } else {
    patchMeta({ uid, rev: c.cloudRev, dirty: true })
    await push()
  }
}

if (cloudEnabled) {
  setSaveHooks({
    persist: () => { patchMeta({ dirty: true, wiped: false }); if (status.state !== 'conflict') schedulePush() },
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
