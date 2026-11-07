import { Hono, type Context, type Next } from 'hono'
import { cors } from 'hono/cors'
import { Pool } from '@neondatabase/serverless'
import { createAuth, origins, type Env } from './auth'
import { checkSave, type BlobLike } from './sanity'
import { SKU_PRICE } from './skus'
import { configRoutes } from './config'
import { telemetryRoutes } from './telemetry'

export type App = { Bindings: Env; Variables: { userId: string; pool: Pool; admin: string } }
const app = new Hono<App>()
const MAX_BLOB = 256 * 1024

app.use('*', async (c, next) => {
  const allowed = origins(c.env)
  return cors({ origin: (o) => (allowed.includes(o) ? o : ''), credentials: true, allowHeaders: ['Content-Type'], allowMethods: ['GET', 'PUT', 'POST', 'OPTIONS'] })(c, next)
})

// one pool per request (Workers can't share sockets across requests)
app.use('*', async (c, next) => {
  const pool = new Pool({ connectionString: c.env.DATABASE_URL })
  c.set('pool', pool)
  try { await next() } finally { c.executionCtx.waitUntil(pool.end()) }
})

app.on(['GET', 'POST'], '/api/auth/*', (c) => createAuth(c.env, c.get('pool')).handler(c.req.raw))

async function requireUser(c: Context<App>, next: Next) {
  const session = await createAuth(c.env, c.get('pool')).api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'unauthorized' }, 401)
  c.set('userId', session.user.id)
  await next()
}
configRoutes(app) // GET /config/live (public) + /admin/* (ADMIN_EMAILS)
telemetryRoutes(app) // POST /telemetry (public, anonymous, rate-limited per device id)

app.use('/save', requireUser)
app.use('/wallet', requireUser)
app.use('/wallet/*', requireUser)

app.get('/save', async (c) => {
  const { rows } = await c.get('pool').query('select data, rev, version, updated_at from player_save where user_id = $1', [c.get('userId')])
  if (!rows[0]) return c.json({ data: null, rev: 0 })
  return c.json({ data: rows[0].data, rev: rows[0].rev, version: rows[0].version, updatedAt: rows[0].updated_at })
})

/** Body: { data, rev } where rev = the revision the client last saw (0 = none). 409 + current rev when it moved. */
app.put('/save', async (c) => {
  const raw = await c.req.text()
  if (raw.length > MAX_BLOB) return c.json({ error: 'too large' }, 413)
  let body: { data?: unknown; rev?: unknown }
  try { body = JSON.parse(raw) } catch { return c.json({ error: 'bad json' }, 400) }
  const data = body.data as (BlobLike & { v?: unknown }) | undefined
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.v !== 1 || !Number.isInteger(body.rev)) return c.json({ error: 'bad payload' }, 400)

  const pool = c.get('pool'), uid = c.get('userId'), rev = body.rev as number
  const prev = (await pool.query('select data, rev, updated_at from player_save where user_id = $1', [uid])).rows[0]
  if ((prev?.rev ?? 0) !== rev) return c.json({ error: 'conflict', rev: prev?.rev ?? 0 }, 409)

  // Level 1 anti-cheat: LOG ONLY. Flags are stored, the save is still accepted.
  const hours = prev ? (Date.now() - new Date(prev.updated_at).getTime()) / 3_600_000 : 0
  const flags = checkSave(prev?.data ?? null, data, hours)

  const res = prev
    ? await pool.query('update player_save set data = $1, rev = rev + 1, updated_at = now() where user_id = $2 and rev = $3 returning rev', [JSON.stringify(data), uid, rev])
    : await pool.query('insert into player_save (user_id, data) values ($1, $2) on conflict do nothing returning rev', [uid, JSON.stringify(data)])
  if (!res.rows[0]) return c.json({ error: 'conflict' }, 409) // lost a race between the read and the write
  for (const f of flags) await pool.query('insert into cheat_flag (user_id, rule, detail) values ($1, $2, $3)', [uid, f.rule, f.detail])
  return c.json({ rev: res.rows[0].rev, flagged: flags.length })
})

app.get('/wallet', async (c) => {
  const { rows } = await c.get('pool').query('select paid_gems from wallet where user_id = $1', [c.get('userId')])
  return c.json({ paidGems: rows[0]?.paid_gems ?? 0 })
})

/** Spend paid gems. Price comes from the server's SKU table, never from the client. opId makes a retry idempotent. */
app.post('/wallet/spend', async (c) => {
  const b: { sku?: unknown; opId?: unknown } = await c.req.json().catch(() => ({}))
  const price = typeof b.sku === 'string' ? SKU_PRICE[b.sku] : undefined
  if (!price || typeof b.opId !== 'string' || b.opId.length < 8 || b.opId.length > 64) return c.json({ error: 'bad request' }, 400)
  const pool = c.get('pool'), uid = c.get('userId'), receipt = `spend:${uid}:${b.opId}`
  const db = await pool.connect()
  try {
    await db.query('begin')
    const dup = await db.query('select 1 from wallet_tx where receipt_id = $1', [receipt])
    if (!dup.rows[0]) {
      const upd = await db.query('update wallet set paid_gems = paid_gems - $1, updated_at = now() where user_id = $2 and paid_gems >= $1 returning paid_gems', [price, uid])
      if (!upd.rows[0]) { await db.query('rollback'); return c.json({ error: 'insufficient' }, 402) }
      await db.query("insert into wallet_tx (user_id, kind, delta, sku, receipt_id) values ($1, 'spend', $2, $3, $4)", [uid, -price, b.sku, receipt])
    }
    await db.query('commit')
  } catch (e) { await db.query('rollback').catch(() => {}); throw e } finally { db.release() }
  const { rows } = await pool.query('select paid_gems from wallet where user_id = $1', [uid])
  return c.json({ paidGems: rows[0]?.paid_gems ?? 0 })
})

// Paid gems can only be credited from a verified store receipt / webhook. Not wired until the game ships on a Store
// (Capacitor + Google Play Billing): verify the receipt with the store API, then call creditPurchase().
app.post('/webhook/store', (c) => c.json({ error: 'not implemented' }, 501))

export async function creditPurchase(pool: Pool, userId: string, receiptId: string, gems: number): Promise<boolean> {
  const db = await pool.connect()
  try {
    await db.query('begin')
    const ins = await db.query("insert into wallet_tx (user_id, kind, delta, receipt_id) values ($1, 'purchase', $2, $3) on conflict (receipt_id) do nothing returning id", [userId, gems, receiptId])
    if (ins.rows[0]) await db.query('insert into wallet (user_id, paid_gems) values ($1, $2) on conflict (user_id) do update set paid_gems = wallet.paid_gems + $2, updated_at = now()', [userId, gems])
    await db.query('commit')
    return !!ins.rows[0]
  } catch (e) { await db.query('rollback').catch(() => {}); throw e } finally { db.release() }
}

export default app
