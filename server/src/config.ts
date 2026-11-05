// Live balance config: public GET /config/live for the game, /admin/* for admin.html (ADMIN_EMAILS only).
// The server is the authority: every patch is re-validated here with the SAME src/data/patch.ts the game uses,
// and guards are computed here from this build (never taken from the client).
import type { Context, Hono, Next } from 'hono'
import type { Pool } from '@neondatabase/serverless'
import { canonicalJson, checkPatch, guardsFor, type CheckResult } from '../../src/data/patch'
import { CONFIG_SCHEMA, type Guards, type Patch, type Release } from '../../src/data/tunables'
import { createAuth, origins } from './auth'
import type { App } from './index'

const MAX_BODY = 512 * 1024
const MAX_NOTE = 500
const NO_LIVE: Release = { releaseId: null, schemaVer: CONFIG_SCHEMA, patch: {}, guards: {} }

type Obj = Record<string, unknown>
const isObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x)
const toInt = (x: unknown): number | null => {
  const n = typeof x === 'string' ? Number(x) : x
  return typeof n === 'number' && Number.isSafeInteger(n) ? n : null
}
const toIso = (x: unknown): string | null => (x instanceof Date ? x.toISOString() : typeof x === 'string' ? x : null)
const str = (x: unknown): string => (typeof x === 'string' ? x : '')
const countEntries = (p: unknown) => (isObj(p) ? Object.values(p).reduce<number>((n, t) => n + (isObj(t) ? Object.keys(t).length : 0), 0) : 0)

export const adminEmails = (raw: string | undefined) => new Set((raw ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
const releaseHash = (schemaVer: number, patch: Patch, guards: Guards) => sha256(canonicalJson({ schemaVer, patch, guards }))

/** Copy of a validated patch: plain objects, number leaves only, empty tables dropped. */
function normalize(patch: Obj): Patch {
  const out: Record<string, Record<string, number>> = {}
  for (const t of Object.keys(patch)) {
    const rows = patch[t]
    if (!isObj(rows)) continue
    const o: Record<string, number> = {}
    for (const p of Object.keys(rows)) { const v = rows[p]; if (typeof v === 'number') o[p] = v }
    if (Object.keys(o).length) out[t] = o
  }
  return out as Patch
}

const brief = (r: CheckResult) => ({ errors: r.errors.slice(0, 50), skipped: r.skipped.slice(0, 50), count: r.count })

// ---------- rows ----------
const COLS = 'id, status, schema_ver, patch, guards, hash, note, created_by, created_at, updated_at, published_by, published_at, rollback_of'
interface Row {
  id: number; status: string; schemaVer: number; patch: Patch; guards: Guards; hash: string; note: string
  createdBy: string; createdAt: string | null; updatedAt: string | null; publishedBy: string | null; publishedAt: string | null
  rollbackOf: number | null; entries: number
}
function toRow(x: unknown): Row | null {
  if (!isObj(x)) return null
  const id = toInt(x.id), schemaVer = toInt(x.schema_ver)
  if (id === null || schemaVer === null || !isObj(x.patch)) return null
  return {
    id, status: str(x.status), schemaVer, patch: x.patch as Patch, guards: (isObj(x.guards) ? x.guards : {}) as Guards,
    hash: str(x.hash), note: str(x.note), createdBy: str(x.created_by), createdAt: toIso(x.created_at), updatedAt: toIso(x.updated_at),
    publishedBy: typeof x.published_by === 'string' ? x.published_by : null, publishedAt: toIso(x.published_at),
    rollbackOf: toInt(x.rollback_of), entries: countEntries(x.patch),
  }
}
const toRelease = (r: Row): Release => ({ releaseId: r.id, schemaVer: r.schemaVer, hash: r.hash, patch: r.patch, guards: r.guards })
async function one(pool: Pool | { query: Pool['query'] }, sql: string, params: unknown[] = []): Promise<Row | null> {
  const { rows } = await pool.query(sql, params)
  return toRow(rows[0])
}

/** JSON body with a hard size cap. */
async function readBody(c: Context<App>): Promise<Obj | Response> {
  const len = Number(c.req.header('Content-Length') ?? '0')
  if (len > MAX_BODY) return c.json({ error: 'too large' }, 413)
  const raw = await c.req.text()
  if (raw.length > MAX_BODY) return c.json({ error: 'too large' }, 413)
  try {
    const j: unknown = JSON.parse(raw)
    return isObj(j) ? j : c.json({ error: 'bad json' }, 400)
  } catch { return c.json({ error: 'bad json' }, 400) }
}
const noteOf = (x: unknown) => (typeof x === 'string' ? x.trim().slice(0, MAX_NOTE) : '')

// ---------- RBAC ----------
/** Admin = signed-in, non-anonymous, verified email in ADMIN_EMAILS, with a linked Google account. Writes also need an allowed Origin. */
async function requireAdmin(c: Context<App>, next: Next) {
  const auth = createAuth(c.env, c.get('pool'))
  const headers = c.req.raw.headers
  const session: unknown = await auth.api.getSession({ headers })
  const user = isObj(session) && isObj(session.user) ? session.user : null
  if (!user) return c.json({ error: 'unauthorized' }, 401)
  const email = str(user.email).toLowerCase()
  if (user.isAnonymous === true || user.emailVerified !== true || !email || !adminEmails(c.env.ADMIN_EMAILS).has(email)) {
    return c.json({ error: 'forbidden', email: user.isAnonymous === true ? '' : email }, 403)
  }
  const accounts: unknown = await auth.api.listUserAccounts({ headers })
  if (!Array.isArray(accounts) || !accounts.some((a) => isObj(a) && a.providerId === 'google')) return c.json({ error: 'forbidden', email, reason: 'google account required' }, 403)
  if (c.req.method !== 'GET') { // CSRF: cookies are SameSite=None, so writes must come from our own pages as JSON
    if (!origins(c.env).includes(c.req.header('Origin') ?? '')) return c.json({ error: 'bad origin' }, 403)
    if (!(c.req.header('Content-Type') ?? '').startsWith('application/json')) return c.json({ error: 'json only' }, 415)
  }
  c.set('admin', email)
  c.header('Cache-Control', 'no-store')
  await next()
}

const log = (event: string, data: Obj) => console.log(JSON.stringify({ event, at: new Date().toISOString(), ...data }))

export function configRoutes(app: Hono<App>) {
  // ---------- public: the game ----------
  app.get('/config/live', async (c) => {
    let rel = NO_LIVE
    try {
      const r = await one(c.get('pool'), `select ${COLS} from config_release where status = 'live' limit 1`)
      if (r) rel = toRelease(r)
    } catch { return c.json({ error: 'unavailable' }, 503, { 'Cache-Control': 'no-store' }) }
    const etag = `"${rel.releaseId ?? 0}-${(rel.hash ?? 'none').slice(0, 16)}"`
    const h = { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=600', ETag: etag }
    if ((c.req.header('If-None-Match') ?? '').split(',').map((s) => s.trim()).includes(etag)) return c.body(null, 304, h)
    return c.json(rel, 200, h)
  })

  // ---------- admin ----------
  app.use('/admin/*', requireAdmin)

  app.get('/admin/state', async (c) => {
    const pool = c.get('pool')
    const [draft, live] = await Promise.all([
      one(pool, `select ${COLS} from config_release where status = 'draft' limit 1`),
      one(pool, `select ${COLS} from config_release where status = 'live' limit 1`),
    ])
    return c.json({ me: c.get('admin'), schemaVer: CONFIG_SCHEMA, draft, live })
  })

  /** ?cfg=draft in the game (src/live-config.ts): the draft as a Release. */
  app.get('/admin/draft/preview', async (c) => {
    const r = await one(c.get('pool'), `select ${COLS} from config_release where status = 'draft' limit 1`)
    return r ? c.json(toRelease(r)) : c.json({ error: 'no draft' }, 404)
  })

  /** Body: { patch, note? }. Rejects any error or skipped path: a draft must fully apply on this build. */
  app.put('/admin/draft', async (c) => {
    const body = await readBody(c)
    if (body instanceof Response) return body
    const first = checkPatch(body.patch)
    if (!first.ok) return c.json({ error: 'invalid', ...brief(first) }, 400)
    const patch = normalize(body.patch as Obj), guards = guardsFor(patch), res = checkPatch(patch, guards)
    if (!res.ok || res.skipped.length) return c.json({ error: 'invalid', ...brief(res) }, 400)
    const hash = await releaseHash(CONFIG_SCHEMA, patch, guards), note = noteOf(body.note), by = c.get('admin')
    const pool = c.get('pool'), args = [JSON.stringify(patch), JSON.stringify(guards), hash, note, CONFIG_SCHEMA, by]
    const upd = `update config_release set patch = $1, guards = $2, hash = $3, note = $4, schema_ver = $5, created_by = $6, updated_at = now() where status = 'draft' returning ${COLS}`
    let r = await one(pool, upd, args)
    if (!r) r = await one(pool, `insert into config_release (patch, guards, hash, note, schema_ver, created_by, status) values ($1, $2, $3, $4, $5, $6, 'draft') on conflict do nothing returning ${COLS}`, args)
    if (!r) r = await one(pool, upd, args) // lost an insert race: the other draft exists now
    if (!r) return c.json({ error: 'conflict' }, 409)
    return c.json({ draft: r, check: brief(res) })
  })

  app.post('/admin/draft/discard', async (c) => {
    await c.get('pool').query("delete from config_release where status = 'draft'")
    return c.json({ ok: true })
  })

  /** Body: { draftId, note? }. draftId must be the draft the admin is looking at. */
  app.post('/admin/publish', async (c) => {
    const body = await readBody(c)
    if (body instanceof Response) return body
    const draftId = toInt(body.draftId)
    if (draftId === null) return c.json({ error: 'bad request' }, 400)
    const by = c.get('admin'), note = noteOf(body.note)
    const db = await c.get('pool').connect()
    try {
      await db.query('begin')
      const d = await one(db, `select ${COLS} from config_release where status = 'draft' for update`)
      if (!d) { await db.query('rollback'); return c.json({ error: 'no draft' }, 404) }
      if (d.id !== draftId) { await db.query('rollback'); return c.json({ error: 'draft changed', draftId: d.id }, 409) }
      const res = checkPatch(d.patch, d.guards) // re-check: the Worker may have been redeployed since the save
      if (!res.ok || d.schemaVer > CONFIG_SCHEMA) { await db.query('rollback'); return c.json({ error: 'invalid', ...brief(res) }, 400) }
      await db.query("update config_release set status = 'archived' where status = 'live'")
      const r = await one(db, `update config_release set status = 'live', published_by = $2, published_at = now(), note = case when $3 = '' then note else $3 end where id = $1 returning ${COLS}`, [d.id, by, note])
      await db.query('commit')
      log('config.publish', { id: d.id, by, hash: d.hash, entries: d.entries, note })
      return c.json({ live: r, check: brief(res) })
    } catch (e) { await db.query('rollback').catch(() => {}); throw e } finally { db.release() }
  })

  /** Body: { id, note? }. Makes a NEW live row with the patch of an older release (draft untouched). */
  app.post('/admin/rollback', async (c) => {
    const body = await readBody(c)
    if (body instanceof Response) return body
    const id = toInt(body.id)
    if (id === null || id < 1) return c.json({ error: 'bad request' }, 400)
    const by = c.get('admin'), note = noteOf(body.note)
    const db = await c.get('pool').connect()
    try {
      await db.query('begin')
      const src = await one(db, `select ${COLS} from config_release where id = $1 and status <> 'draft'`, [id])
      if (!src) { await db.query('rollback'); return c.json({ error: 'not found' }, 404) }
      if (src.status === 'live') { await db.query('rollback'); return c.json({ error: 'already live' }, 409) }
      const res = checkPatch(src.patch, src.guards) // ranges may have tightened since: the game would reject the whole release
      if (!res.ok || src.schemaVer > CONFIG_SCHEMA) { await db.query('rollback'); return c.json({ error: 'invalid', ...brief(res) }, 400) }
      await db.query("update config_release set status = 'archived' where status = 'live'")
      const r = await one(db, `insert into config_release (schema_ver, patch, guards, hash, note, status, created_by, published_by, published_at, rollback_of)
        values ($1, $2, $3, $4, $5, 'live', $6, $6, now(), $7) returning ${COLS}`,
      [src.schemaVer, JSON.stringify(src.patch), JSON.stringify(src.guards), src.hash, `rollback → #${src.id}${note ? `: ${note}` : ''}`.slice(0, MAX_NOTE), by, src.id])
      await db.query('commit')
      log('config.rollback', { id: r?.id, to: src.id, by, hash: src.hash })
      return c.json({ live: r, check: brief(res) })
    } catch (e) { await db.query('rollback').catch(() => {}); throw e } finally { db.release() }
  })

  /** Live config off: the game plays the build's defaults. */
  app.post('/admin/unpublish', async (c) => {
    const { rows } = await c.get('pool').query("update config_release set status = 'archived' where status = 'live' returning id")
    const id = toInt(isObj(rows[0]) ? rows[0].id : null)
    log('config.unpublish', { id, by: c.get('admin') })
    return c.json({ ok: true, archived: id })
  })

  app.get('/admin/releases', async (c) => {
    const limit = Math.min(Math.max(toInt(c.req.query('limit')) ?? 30, 1), 100)
    const { rows } = await c.get('pool').query(`select ${COLS} from config_release where status <> 'draft' order by id desc limit $1`, [limit])
    const list = rows.map(toRow).filter((r): r is Row => r !== null).map(({ patch: _p, guards: _g, ...rest }) => rest)
    return c.json({ releases: list })
  })

  app.get('/admin/release/:id', async (c) => {
    const id = toInt(c.req.param('id'))
    if (id === null || id < 1) return c.json({ error: 'bad request' }, 400)
    const r = await one(c.get('pool'), `select ${COLS} from config_release where id = $1`, [id])
    return r ? c.json({ release: r }) : c.json({ error: 'not found' }, 404)
  })
}
