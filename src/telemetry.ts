// Beta telemetry client: anonymous gameplay events -> POST {VITE_API_URL}/telemetry (server/src/telemetry.ts).
// Off unless VITE_API_URL is set (the plain GitHub Pages build sends nothing). No PII: only a random device id.
// Fire-and-forget: it must never throw, block a frame, or change gameplay.
const API = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
const BUILD = (import.meta.env.VITE_BUILD ?? 'dev').slice(0, 24)

export type TelemetryName = 'session_start' | 'run_end' | 'level_up'
export type TelemetryProps = Record<string, string | number | boolean>
interface QueuedEvent { name: TelemetryName; t: number; props: TelemetryProps }

const DID_KEY = 'novice-to-hero.telemetry.did'
const OPT_OUT_KEY = 'novice-to-hero.telemetry.off'
const FLUSH_MS = 15_000
const MAX_QUEUE = 100 // drop the oldest beyond this (offline for a long time)
const MAX_BATCH = 20

export const telemetryAvailable = !!API
export function telemetryEnabled(): boolean {
  try { return !!API && localStorage.getItem(OPT_OUT_KEY) !== '1' } catch { return false }
}
/** For a settings toggle (store policy: players can opt out). */
export function setTelemetryEnabled(on: boolean) {
  try { if (on) localStorage.removeItem(OPT_OUT_KEY); else { localStorage.setItem(OPT_OUT_KEY, '1'); queue.length = 0 } } catch { /* ignore */ }
}

function deviceId(): string {
  try {
    const old = localStorage.getItem(DID_KEY)
    if (old && /^[a-z0-9-]{16,40}$/.test(old)) return old
    const id = crypto.randomUUID()
    localStorage.setItem(DID_KEY, id)
    return id
  } catch { return '' }
}

const queue: QueuedEvent[] = []
let timer: ReturnType<typeof setTimeout> | undefined

export function track(name: TelemetryName, props: TelemetryProps = {}) {
  if (!telemetryEnabled()) return
  queue.push({ name, t: Date.now(), props })
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE)
  timer ??= setTimeout(() => { timer = undefined; void flush() }, FLUSH_MS)
}

/** `beacon` = page is closing: use sendBeacon (survives unload). Events stay queued if the send fails. */
export async function flush(beacon = false): Promise<void> {
  if (!API || !queue.length) return
  const did = deviceId()
  if (!did) return
  const events = queue.splice(0, MAX_BATCH)
  const body = JSON.stringify({ did, build: BUILD, events })
  try {
    if (beacon && navigator.sendBeacon) {
      if (!navigator.sendBeacon(`${API}/telemetry`, new Blob([body], { type: 'text/plain' }))) queue.unshift(...events)
      return
    }
    const res = await fetch(`${API}/telemetry`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
    if (res.status >= 500 || res.status === 429) queue.unshift(...events) // 4xx = bad payload: drop, don't loop forever
  } catch { queue.unshift(...events) }
  if (queue.length && !timer) timer = setTimeout(() => { timer = undefined; void flush() }, FLUSH_MS)
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flush(true) })
}
