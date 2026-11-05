// admin.html <-> server/ (src/config.ts). Responses are narrowed, never trusted.
import { createAuthClient } from 'better-auth/client'
import type { Patch } from '../data/tunables'

export const API = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
export const authClient = API ? createAuthClient({ baseURL: API, fetchOptions: { credentials: 'include' } }) : null

type Obj = Record<string, unknown>
const isObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x)
const str = (x: unknown) => (typeof x === 'string' ? x : '')
const strOrNull = (x: unknown) => (typeof x === 'string' ? x : null)
const int = (x: unknown) => (typeof x === 'number' && Number.isSafeInteger(x) ? x : null)

export interface SRow {
  id: number; status: 'draft' | 'live' | 'archived'; hash: string; note: string; entries: number
  createdBy: string; createdAt: string | null; updatedAt: string | null; publishedBy: string | null; publishedAt: string | null
  rollbackOf: number | null; patch?: Patch
}

/** Only number leaves survive (the server already validated; this just keeps the types honest). */
function parsePatch(x: unknown): Patch | undefined {
  if (!isObj(x)) return undefined
  const out: Record<string, Record<string, number>> = {}
  for (const [t, rows] of Object.entries(x)) {
    if (!isObj(rows)) continue
    const o: Record<string, number> = {}
    for (const [p, v] of Object.entries(rows)) if (typeof v === 'number' && Number.isFinite(v)) o[p] = v
    out[t] = o
  }
  return out as Patch
}

export function parseRow(x: unknown): SRow | null {
  if (!isObj(x)) return null
  const id = int(x.id), status = x.status
  if (id === null || (status !== 'draft' && status !== 'live' && status !== 'archived')) return null
  return {
    id, status, hash: str(x.hash), note: str(x.note), entries: int(x.entries) ?? 0, createdBy: str(x.createdBy),
    createdAt: strOrNull(x.createdAt), updatedAt: strOrNull(x.updatedAt), publishedBy: strOrNull(x.publishedBy), publishedAt: strOrNull(x.publishedAt),
    rollbackOf: int(x.rollbackOf), patch: parsePatch(x.patch),
  }
}

export interface Res { status: number; body: Obj }
export async function call(path: string, method: 'GET' | 'PUT' | 'POST' = 'GET', body?: unknown): Promise<Res> {
  try {
    const res = await fetch(`${API}${path}`, {
      method, credentials: 'include', cache: 'no-store',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const j: unknown = await res.json().catch(() => ({}))
    return { status: res.status, body: isObj(j) ? j : {} }
  } catch { return { status: 0, body: { error: 'network' } } }
}

/** Human message for a failed call (validation errors included). */
export function errText(r: Res): string {
  const e = str(r.body.error) || `HTTP ${r.status}`
  const list = [...(Array.isArray(r.body.errors) ? r.body.errors : []), ...(Array.isArray(r.body.skipped) ? r.body.skipped : [])]
    .slice(0, 5).map((x) => (isObj(x) ? `${str(x.table)}.${str(x.path)} ${str(x.msg) || str(x.reason)}` : '')).filter(Boolean)
  return list.length ? `${e}: ${list.join(' · ')}` : e
}
