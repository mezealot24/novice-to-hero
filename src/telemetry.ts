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

// v119 (PDPA): opt-IN. Nothing is queued or sent until the player says yes (hub prompt / ⚙️ settings).
const CONSENT_KEY = 'novice-to-hero.telemetry.consent' // 'yes' | 'no'; missing = not asked yet

export const telemetryAvailable = !!API
/** 'yes' / 'no', or null when the player was never asked (an old opt-out counts as 'no'). */
export function telemetryConsent(): 'yes' | 'no' | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY)
    if (v === 'yes' || v === 'no') return v
    return localStorage.getItem(OPT_OUT_KEY) === '1' ? 'no' : null
  } catch { return 'no' }
}
/** The hub should ask once: telemetry is built in and the player has not answered. */
export const needsTelemetryConsent = () => telemetryAvailable && telemetryConsent() === null
export function telemetryEnabled(): boolean { return !!API && telemetryConsent() === 'yes' }
/** Consent prompt / settings toggle. Turning it off drops anything still queued. */
export function setTelemetryEnabled(on: boolean) {
  try { localStorage.setItem(CONSENT_KEY, on ? 'yes' : 'no'); localStorage.removeItem(OPT_OUT_KEY) } catch { /* ignore */ }
  if (!on) queue.length = 0
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

/** v119 consent text (PDPA: say what is sent and why, at the point of asking). Kept short: the confirm box is 260 px tall. */
export const TELEMETRY_ASK = 'ส่งสถิติการเล่นแบบไม่ระบุตัวตน (ดันที่เล่น · ชนะ/แพ้ · เลเวล)\nใช้ปรับความยากเท่านั้น ไม่มีชื่อ อีเมล หรือข้อมูลส่วนตัว\nเปลี่ยนใจได้ทุกเมื่อที่ ⚙️ ตั้งค่า'
