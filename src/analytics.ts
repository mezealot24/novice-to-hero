// Anonymous play analytics for the beta go/stop gates (design/analytics-v1.md, market-roadmap-nov2026 §6.3).
// Off unless VITE_POSTHOG_KEY is set, so the plain GitHub Pages build behaves exactly as before.
// PDPA: nothing leaves the device until the player says yes. Events from before the answer wait in memory
// (title screen only) and are dropped on "no". No SDK: small JSON batches go to PostHog's public capture API,
// which keeps the single-file build small. Never send names, emails or save data here: ids + game numbers only.

export type FtueStep = 'title' | 'create_open' | 'char_created' | 'hub_first' | 'run1_start' | 'run1_win' | 'd1_clear' | 'job1' | 'job2' | 'job3'
/** The step order of the first-time funnel (PostHog funnel = these `ftue` events in this order). */
export const FTUE_STEPS: readonly FtueStep[] = ['title', 'create_open', 'char_created', 'hub_first', 'run1_start', 'run1_win', 'd1_clear', 'job1', 'job2', 'job3']

export type PayKind = 'free_gem' | 'paid_gem' | 'iap'
export type Ev =
  | { e: 'app_open' }
  | { e: 'screen'; name: string }
  | { e: 'ftue'; step: FtueStep }
  | { e: 'run_start'; mode: string; dungeon: string }
  | { e: 'run_end'; mode: string; dungeon: string; won: boolean; room: number; zeny: number; xp: number }
  | { e: 'level_up'; kind: 'base' | 'job' | 'job2' | 'job3'; level: number }
  | { e: 'job_change'; tier: 1 | 2; job: string; gems: number }
  | { e: 'shop_open'; shop: 'gem' }
  | { e: 'purchase'; stage: 'tap' | 'ok' | 'fail'; sku: string; price: number; pay: PayKind; reason?: string }
  | { e: 'gacha_roll'; kind: 'option'; lines: number; locked: number; gems: number }
  | { e: 'consent'; granted: boolean }

export type Consent = 'unknown' | 'yes' | 'no'
type Prop = string | number | boolean | null
export type Props = Record<string, Prop>
export interface Wire { event: string; timestamp: string; properties: Record<string, Prop | Props> }

/** Everything the tracker touches, injected so tests run without a browser. */
export interface Deps {
  key: string
  storage: { getItem(k: string): string | null; setItem(k: string, v: string): void }
  send: (body: string) => Promise<boolean>
  now: () => number
  rand: () => number
  search: string
  base: () => Props
}

export const STORE_KEY = 'novice-to-hero.analytics.v1'
export const RULES = { batch: 20, flushMs: 15_000, sessionGapMs: 30 * 60_000, maxPending: 50, maxOutbox: 200 }
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref'] as const

interface Rec { id: string; consent: Consent; ftue: FtueStep[]; utm: Props; first: string }

function readRec(raw: string | null): Rec {
  const r: Rec = { id: '', consent: 'unknown', ftue: [], utm: {}, first: '' }
  try {
    const o: unknown = JSON.parse(raw ?? 'null')
    if (!o || typeof o !== 'object') return r
    const m = o as Record<string, unknown>
    if (typeof m.id === 'string') r.id = m.id
    if (m.consent === 'yes' || m.consent === 'no') r.consent = m.consent
    if (Array.isArray(m.ftue)) r.ftue = m.ftue.filter((x): x is FtueStep => typeof x === 'string' && (FTUE_STEPS as readonly string[]).includes(x))
    if (m.utm && typeof m.utm === 'object') for (const [k, v] of Object.entries(m.utm)) if (typeof v === 'string') r.utm[k] = v.slice(0, 64)
    if (typeof m.first === 'string') r.first = m.first
  } catch { /* corrupt record: start over */ }
  return r
}

/** RFC 4122 v4 from an injected random source (crypto is not available in every test runner). */
function uuid4(rand: () => number): string {
  const h = Array.from({ length: 32 }, () => Math.floor(rand() * 16).toString(16))
  h[12] = '4'; h[16] = ((parseInt(h[16], 16) & 3) | 8).toString(16)
  const s = h.join('')
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`
}
/** UUIDv7 (time-ordered): PostHog sessions expect it. */
function uuid7(ms: number, rand: () => number): string {
  const t = Math.floor(ms).toString(16).padStart(12, '0').slice(-12)
  const r = uuid4(rand).replace(/-/g, '')
  const s = `${t}7${r.slice(13, 16)}${r.slice(16, 32)}`
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`
}

export class Tracker {
  private rec: Rec
  private pending: Wire[] = [] // before consent: memory only
  private outbox: Wire[] = []
  private session = ''
  private lastAt = 0
  private sending = false
  private firstSent = false

  constructor(private d: Deps) {
    this.rec = readRec(d.storage.getItem(STORE_KEY))
    if (!this.rec.first) { // first launch on this device: remember where the player came from (first touch only)
      const q = new URLSearchParams(d.search)
      for (const k of UTM_KEYS) { const v = q.get(k); if (v) this.rec.utm[k] = v.slice(0, 64) }
      this.rec.first = new Date(d.now()).toISOString().slice(0, 10)
      this.save()
    }
  }

  get consent(): Consent { return this.rec.consent }
  get distinctId(): string { return this.rec.id }
  get queued(): number { return this.pending.length + this.outbox.length }
  ftueDone(step: FtueStep): boolean { return this.rec.ftue.includes(step) }

  setConsent(yes: boolean) {
    if (yes) {
      if (!this.rec.id) this.rec.id = uuid4(this.d.rand)
      this.rec.consent = 'yes'
      this.save()
      for (const w of this.pending) w.properties.distinct_id = this.rec.id
      this.outbox.push(...this.pending)
      this.pending = []
      this.track({ e: 'consent', granted: true })
    } else {
      // "no" also forgets the id: turning it back on later starts a new, unlinked one
      this.rec = { ...this.rec, id: '', consent: 'no' }
      this.pending = []; this.outbox = []
      this.save()
    }
  }

  track(ev: Ev) {
    if (this.rec.consent === 'no') return
    const now = this.d.now()
    if (!this.session || now - this.lastAt > RULES.sessionGapMs) this.session = uuid7(now, this.d.rand)
    this.lastAt = now
    const { e, ...rest } = ev
    const props: Record<string, Prop | Props> = { ...this.d.base(), ...(rest as Props), distinct_id: this.rec.id, $session_id: this.session, $lib: 'nth-web', first_day: this.rec.first }
    for (const [k, v] of Object.entries(this.rec.utm)) props[`ch_${k}`] = v // channel of the first launch on every event
    if (!this.firstSent && Object.keys(this.rec.utm).length) { props.$set_once = { ...this.rec.utm }; this.firstSent = true }
    const w: Wire = { event: e, timestamp: new Date(now).toISOString(), properties: props }
    if (this.rec.consent === 'unknown') {
      if (this.pending.length < RULES.maxPending) this.pending.push(w)
      return
    }
    this.outbox.push(w)
    if (this.outbox.length > RULES.maxOutbox) this.outbox.splice(0, this.outbox.length - RULES.maxOutbox)
    if (this.outbox.length >= RULES.batch) void this.flush()
  }

  /** A first-time funnel step: sent once per device, in any order the player reaches them. */
  ftue(step: FtueStep) {
    if (this.rec.consent === 'no' || this.ftueDone(step)) return
    this.rec.ftue.push(step)
    this.save()
    this.track({ e: 'ftue', step })
  }

  async flush(): Promise<boolean> {
    if (this.rec.consent !== 'yes' || this.sending || !this.outbox.length) return true
    const batch = this.outbox.splice(0, RULES.batch)
    this.sending = true
    let ok = false
    try { ok = await this.d.send(JSON.stringify({ api_key: this.d.key, batch })) } catch { ok = false }
    this.sending = false
    if (!ok) { this.outbox.unshift(...batch); if (this.outbox.length > RULES.maxOutbox) this.outbox.length = RULES.maxOutbox } // offline: keep, retry next flush
    return ok
  }

  private save() { try { this.d.storage.setItem(STORE_KEY, JSON.stringify(this.rec)) } catch { /* storage blocked */ } }
}

// ---------- browser singleton ----------
const KEY = import.meta.env?.VITE_POSTHOG_KEY ?? '' // ?.: node tests have no import.meta.env
const HOST = (import.meta.env?.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com').replace(/\/$/, '')
export const analyticsEnabled = !!KEY && typeof window !== 'undefined'

let context: () => Props = () => ({})
/** main.ts hands over a reader of the current save (job, levels) so this file never imports the game. */
export function setAnalyticsContext(fn: () => Props) { context = fn }

function platform(): string {
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor
  return cap?.getPlatform?.() ?? 'web'
}
declare const __APP_VERSION__: string
const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

const memory = new Map<string, string>()
const tracker: Tracker | null = analyticsEnabled ? new Tracker({
  key: KEY,
  storage: {
    getItem: (k) => { try { return localStorage.getItem(k) } catch { return memory.get(k) ?? null } },
    setItem: (k, v) => { try { localStorage.setItem(k, v) } catch { memory.set(k, v) } },
  },
  send: async (body) => (await fetch(`${HOST}/batch/`, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body })).ok,
  now: () => Date.now(),
  rand: () => Math.random(),
  search: location.search,
  base: () => ({ app_version: VERSION, platform: platform(), touch: matchMedia('(pointer: coarse)').matches, ...context() }),
}) : null

let timer = 0
export function initAnalytics() {
  if (!tracker || timer) return
  timer = window.setInterval(() => { void tracker.flush() }, RULES.flushMs)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void tracker.flush() })
  tracker.track({ e: 'app_open' })
}
export const track = (ev: Ev) => tracker?.track(ev)
export const ftue = (step: FtueStep) => tracker?.ftue(step)
export const ftueDone = (step: FtueStep) => tracker?.ftueDone(step) ?? true
/** 'unknown' = ask on the title screen. Analytics off = treated as answered (never ask). */
export const consentState = (): Consent => tracker?.consent ?? 'no'
export function setConsent(yes: boolean) { tracker?.setConsent(yes); if (yes) void tracker?.flush() }
