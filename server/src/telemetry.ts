// Beta telemetry: anonymous gameplay events (where players die, quit, how fast they level) so balance is tuned on
// real-player data, not bots. No PII: the client sends a random device id, never an email / name / auth id.
// Public endpoint (works for guests and with cloud save off) => strict allow-list + size + rate limits.
import { z } from 'zod'
import type { Hono } from 'hono'
import type { App } from './index'

export const EVENT_NAMES = ['session_start', 'run_end', 'level_up'] as const
const MAX_BODY = 8 * 1024
const MAX_BATCH = 20
const PER_MINUTE = 60 // events per device id per minute

const Props = z.record(z.string().max(24), z.union([z.string().max(48), z.number().finite(), z.boolean()])).refine((o) => Object.keys(o).length <= 16, 'too many props')
const Event = z.object({ name: z.enum(EVENT_NAMES), t: z.number().int().positive(), props: Props.default({}) })
export const Batch = z.object({
  did: z.string().regex(/^[a-z0-9-]{16,40}$/),
  build: z.string().max(24),
  events: z.array(Event).min(1).max(MAX_BATCH),
})
export type TelemetryBatch = z.infer<typeof Batch>

export function telemetryRoutes(app: Hono<App>) {
  app.post('/telemetry', async (c) => {
    const raw = await c.req.text()
    if (raw.length > MAX_BODY) return c.json({ error: 'too large' }, 413)
    let json: unknown
    try { json = JSON.parse(raw) } catch { return c.json({ error: 'bad json' }, 400) }
    const parsed = Batch.safeParse(json)
    if (!parsed.success) return c.json({ error: 'bad payload' }, 400)
    const { did, build, events } = parsed.data

    const pool = c.get('pool')
    const recent = await pool.query("select count(*)::int as n from telemetry_event where did = $1 and created_at > now() - interval '1 minute'", [did])
    if ((recent.rows[0]?.n ?? 0) + events.length > PER_MINUTE) return c.json({ error: 'rate limited' }, 429)

    // one multi-row insert; client time is kept as a hint only (clamped: server time is the truth)
    const now = Date.now()
    const vals: unknown[] = []
    const rows = events.map((e, i) => {
      const skew = Math.max(-86_400_000, Math.min(0, e.t - now)) // never in the future, at most 1 day old
      vals.push(did, build, e.name, JSON.stringify(e.props), skew)
      const o = i * 5
      return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}::jsonb, now() + ($${o + 5} * interval '1 millisecond'))`
    })
    await pool.query(`insert into telemetry_event (did, build, name, props, created_at) values ${rows.join(', ')}`, vals)
    return c.json({ ok: true, n: events.length })
  })
}
