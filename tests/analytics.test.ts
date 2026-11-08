import test from 'node:test'
import assert from 'node:assert/strict'
import { RULES, STORE_KEY, Tracker, type Deps } from '../src/analytics'

interface Sent { api_key: string; batch: { event: string; properties: Record<string, unknown> }[] }

function rig(o: { search?: string; stored?: string; online?: boolean } = {}) {
  const mem = new Map<string, string>()
  if (o.stored) mem.set(STORE_KEY, o.stored)
  const sent: Sent[] = []
  let t = Date.UTC(2026, 10, 8, 5, 0, 0), seed = 1
  const d: Deps = {
    key: 'phc_test',
    storage: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => { mem.set(k, v) } },
    send: async (body) => { if (o.online === false) return false; sent.push(JSON.parse(body) as Sent); return true },
    now: () => t,
    rand: () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 },
    search: o.search ?? '',
    base: () => ({ app_version: 't', base_lv: 3 }),
  }
  return { tr: new Tracker(d), sent, mem, tick: (ms: number) => { t += ms } }
}
const events = (sent: Sent[]) => sent.flatMap((b) => b.batch.map((w) => w.event))

test('nothing is sent before consent; "yes" releases the waiting events with the new id', async () => {
  const { tr, sent } = rig()
  tr.track({ e: 'app_open' }); tr.track({ e: 'screen', name: 'title' })
  assert.equal(await tr.flush(), true)
  assert.equal(sent.length, 0, 'no network before the answer')
  tr.setConsent(true)
  await tr.flush()
  assert.deepEqual(events(sent), ['app_open', 'screen', 'consent'])
  const id = tr.distinctId
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  assert.ok(sent[0].batch.every((w) => w.properties.distinct_id === id))
  assert.equal(sent[0].api_key, 'phc_test')
})

test('"no" drops the queue, forgets the id and stays silent', async () => {
  const { tr, sent, mem } = rig()
  tr.track({ e: 'app_open' })
  tr.setConsent(false)
  tr.track({ e: 'screen', name: 'hub' }); tr.ftue('hub_first')
  await tr.flush()
  assert.equal(sent.length, 0)
  assert.equal(tr.queued, 0)
  assert.equal(tr.distinctId, '')
  assert.match(mem.get(STORE_KEY) ?? '', /"consent":"no"/)
})

test('first-touch UTM is kept and tagged on every event; later links do not overwrite it', async () => {
  const { tr, sent, mem } = rig({ search: '?utm_source=openchat&utm_campaign=beta1&x=1' })
  tr.setConsent(true); tr.track({ e: 'app_open' })
  await tr.flush()
  const p = sent[0].batch[0].properties
  assert.equal(p.ch_utm_source, 'openchat'); assert.equal(p.ch_utm_campaign, 'beta1')
  assert.deepEqual(p.$set_once, { utm_source: 'openchat', utm_campaign: 'beta1' })
  const again = rig({ search: '?utm_source=meta', stored: mem.get(STORE_KEY) })
  again.tr.track({ e: 'app_open' }); await again.tr.flush()
  assert.equal(again.sent[0].batch[0].properties.ch_utm_source, 'openchat')
})

test('each FTUE step is sent once per device, even across launches', async () => {
  const { tr, sent, mem } = rig()
  tr.setConsent(true)
  tr.ftue('run1_start'); tr.ftue('run1_start')
  await tr.flush()
  const next = rig({ stored: mem.get(STORE_KEY) })
  next.tr.ftue('run1_start'); next.tr.ftue('run1_win')
  await next.tr.flush()
  const steps = [...sent, ...next.sent].flatMap((b) => b.batch.filter((w) => w.event === 'ftue').map((w) => w.properties.step))
  assert.deepEqual(steps, ['run1_start', 'run1_win'])
})

test('offline batches are kept for the next flush; a new session starts after 30 min idle', async () => {
  const off = rig({ online: false })
  off.tr.setConsent(true); off.tr.track({ e: 'app_open' })
  assert.equal(await off.tr.flush(), false)
  assert.equal(off.tr.queued, 2, 'consent + app_open still waiting')

  const { tr, sent, tick } = rig()
  tr.setConsent(true)
  tr.track({ e: 'screen', name: 'hub' }); tick(RULES.sessionGapMs + 1); tr.track({ e: 'screen', name: 'hub' })
  await tr.flush()
  const s = sent[0].batch.map((w) => w.properties.$session_id)
  assert.equal(s[0], s[1], 'consent + first screen share a session')
  assert.notEqual(s[1], s[2], 'idle gap = new session')
  assert.match(String(s[2]), /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, 'UUIDv7')
})

test('a full batch flushes by itself and keeps the game props on each event', async () => {
  const { tr, sent } = rig()
  tr.setConsent(true)
  for (let i = 0; i < RULES.batch; i++) tr.track({ e: 'run_end', mode: 'dungeon', dungeon: 'd1', won: true, room: 3, zeny: 10, xp: 5 })
  await new Promise((r) => setTimeout(r, 0))
  assert.equal(sent.length, 1)
  assert.equal(sent[0].batch.length, RULES.batch)
  assert.equal(sent[0].batch[1].properties.base_lv, 3)
  assert.equal(sent[0].batch[1].properties.won, true)
})
