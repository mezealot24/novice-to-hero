// Screen brightness for night play: a CSS `brightness()` filter on the game stage (#game), switched by a small DOM button
// that sits OUTSIDE the stage (so it is never dimmed, and no scene needs to know about it). Stored under its own
// localStorage key, not in the save: a display preference must survive a wipe / cloud load and never needs a save migration.

/** Brightness steps the button cycles through (1 = untouched). */
export const BRIGHTNESS_STEPS: readonly number[] = [1, 0.8, 0.6, 0.45]
export const BRIGHTNESS_KEY = 'nth_brightness'

const MIN = Math.min(...BRIGHTNESS_STEPS)

/** Raw stored text -> a safe brightness: finite numbers are clamped to [min step, 1], anything else (null, junk) = 1. */
export function parseBrightness(raw: string | null | undefined): number {
  if (raw == null || raw.trim() === '') return 1
  const n = Number(raw)
  return Number.isFinite(n) ? Math.min(1, Math.max(MIN, n)) : 1
}

/** The step after `cur` (wraps back to 1). A value between steps moves to the next dimmer step. */
export function nextBrightness(cur: number): number {
  const next = BRIGHTNESS_STEPS.find((s) => s < cur - 1e-9)
  return next ?? BRIGHTNESS_STEPS[0]
}

/** CSS `filter` text for a brightness ('' when untouched, so the stage costs nothing at 100%). */
export const brightnessFilter = (v: number) => (v >= 1 ? '' : `brightness(${v})`)

const label = (v: number) => (v >= 1 ? '☀️' : `🌙 ${Math.round(v * 100)}%`)

function readStored(): number {
  try { return parseBrightness(localStorage.getItem(BRIGHTNESS_KEY)) } catch { return 1 } // private window / blocked storage
}
function writeStored(v: number) {
  try { localStorage.setItem(BRIGHTNESS_KEY, String(v)) } catch { /* the setting just won't be remembered */ }
}

/** Call once at boot: applies the saved brightness at once (before fonts / assets load) and adds the toggle button. */
export function initDisplay() {
  const stage = document.getElementById('game')
  if (!stage) return
  let value = readStored()
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.title = 'ปรับความสว่างหน้าจอ (กดเพื่อหรี่ทีละขั้น)'
  btn.setAttribute('aria-label', 'ปรับความสว่างหน้าจอ')
  Object.assign(btn.style, {
    position: 'fixed', zIndex: '10', left: 'max(8px, env(safe-area-inset-left))', bottom: 'max(8px, env(safe-area-inset-bottom))',
    minWidth: '40px', height: '34px', padding: '0 10px', borderRadius: '8px', border: '1px solid rgba(246,238,220,0.35)',
    background: 'rgba(20,23,43,0.72)', color: '#f6eedc', font: '600 14px system-ui, sans-serif', cursor: 'pointer', opacity: '0.6',
  } satisfies Partial<CSSStyleDeclaration>)
  btn.onmouseenter = () => { btn.style.opacity = '1' }
  btn.onmouseleave = () => { btn.style.opacity = '0.6' }
  const apply = () => { stage.style.filter = brightnessFilter(value); btn.textContent = label(value) }
  btn.onclick = () => { value = nextBrightness(value); writeStored(value); apply() }
  apply()
  document.body.appendChild(btn)
}
