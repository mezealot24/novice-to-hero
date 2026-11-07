// Small juice helpers for menu scenes (forge anvil, design/forge-ux-v1.md 5 + 6.1). Light on purpose: tweens, one timer, no particle emitters.
// Lifetime rules:
//  - every tween / timer is created on the scene, so Phaser drops them when the scene shuts down;
//  - the one piece of state that OUTLIVES a tween (tweens.timeScale in hitStop) is restored on SHUTDOWN too;
//  - every helper checks `.active` before touching a game object, so a late callback after destroy() is a no-op.
import Phaser from 'phaser'
import { FONT_NUM, FONT_UI } from './data/game-data'

type Scaled = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform

/** Squash-and-pop a game object: scale up, then settle back to its resting scale. Safe to spam: only the previous PUNCH tween is stopped
 * (other tweens on the target are untouched), and the resting scale is read fresh unless a punch is mid-flight. */
export function punch(scene: Phaser.Scene, target: Scaled, o: { by?: number; ms?: number } = {}) {
  if (!target.active) return
  const prevTween: unknown = target.getData('fx:punch')
  const prevBase: unknown = target.getData('fx:base')
  let base = target.scaleX
  if (prevTween instanceof Phaser.Tweens.Tween) {
    if (prevTween.isPlaying() && typeof prevBase === 'number') base = prevBase // mid-punch: the live scale is inflated, use the remembered rest scale
    prevTween.remove()
    target.setScale(base)
  }
  target.setData('fx:base', base)
  const k = o.by ?? 1.18
  const tw = scene.tweens.add({
    targets: target, scaleX: base * k, scaleY: base * k, duration: (o.ms ?? 110) / 2, yoyo: true, ease: 'Quad.easeOut',
    onComplete: () => { if (target.active) { target.setScale(base); target.setData('fx:punch', null); target.setData('fx:base', null) } },
  })
  target.setData('fx:punch', tw)
}

// ---------- hitStop ----------
interface Hold { prev: number; timer: Phaser.Time.TimerEvent; onShutdown: () => void }
const holds = new WeakMap<Phaser.Scene, Hold>()

function endHold(scene: Phaser.Scene) {
  const h = holds.get(scene)
  if (!h) return
  holds.delete(scene)
  h.timer.remove(false)
  scene.events.off(Phaser.Scenes.Events.SHUTDOWN, h.onShutdown)
  scene.tweens.timeScale = h.prev // always restored: by the timer, or by SHUTDOWN if the scene closes mid-freeze
}

/** Freeze the scene's tweens for a few ms (the "hit" frame). Overlapping calls extend the freeze and still restore the ORIGINAL time scale. */
export function hitStop(scene: Phaser.Scene, ms = 70) {
  const old = holds.get(scene)
  const prev = old ? old.prev : scene.tweens.timeScale
  let wait = Math.max(1, ms)
  if (old) { wait = Math.max(wait, old.timer.getRemaining()); old.timer.remove(false); scene.events.off(Phaser.Scenes.Events.SHUTDOWN, old.onShutdown) } // never shorten a running freeze
  const onShutdown = () => endHold(scene)
  const timer = scene.time.delayedCall(wait, () => endHold(scene)) // scene.time is not slowed by tweens.timeScale
  holds.set(scene, { prev, timer, onShutdown })
  scene.tweens.timeScale = 0
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown)
}

/** A number / word that rises and fades ("+1", "พัง!"). Returns the text (already self-destroying). */
export function floatNum(scene: Phaser.Scene, x: number, y: number, s: string, o: { color?: string; size?: number; rise?: number; ms?: number; ui?: boolean } = {}) {
  const t = scene.add.text(x, y, s, {
    fontFamily: o.ui ? FONT_UI : FONT_NUM, fontSize: `${o.size ?? 26}px`, fontStyle: 'bold', color: o.color ?? '#f2b84b', stroke: '#14172b', strokeThickness: 5, align: 'center',
  }).setOrigin(0.5).setDepth(45000)
  scene.tweens.add({
    targets: t, y: y - (o.rise ?? 46), duration: o.ms ?? 800, ease: 'Cubic.easeOut',
    onComplete: () => t.destroy(),
  })
  scene.tweens.add({ targets: t, alpha: 0, delay: (o.ms ?? 800) * 0.55, duration: (o.ms ?? 800) * 0.45 })
  return t
}

/** Crack lines that grow out of (x, y) and fade (a broken item). Pure Graphics, no emitter. Returns the graphics (self-destroying). */
export function crack(scene: Phaser.Scene, x: number, y: number, size = 90, o: { color?: number; ms?: number } = {}) {
  const g = scene.add.graphics({ x, y }).setDepth(44000)
  const branches: { x: number; y: number }[][] = []
  const rays = 5 + Phaser.Math.Between(0, 2)
  for (let i = 0; i < rays; i++) {
    let a = (i / rays) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3), px = 0, py = 0
    const pts = [{ x: 0, y: 0 }]
    for (let k = 0; k < 3; k++) {
      a += Phaser.Math.FloatBetween(-0.5, 0.5)
      const len = (size / 2) * Phaser.Math.FloatBetween(0.25, 0.4)
      px += Math.cos(a) * len; py += Math.sin(a) * len
      pts.push({ x: px, y: py })
    }
    branches.push(pts)
  }
  const prog = { v: 0 }
  const draw = () => {
    if (!g.active) return
    g.clear().lineStyle(3, o.color ?? 0xffffff, 1)
    for (const pts of branches) {
      const n = Math.max(1, Math.ceil(prog.v * (pts.length - 1)))
      g.beginPath().moveTo(pts[0].x, pts[0].y)
      for (let k = 1; k <= n; k++) g.lineTo(pts[k].x, pts[k].y)
      g.strokePath()
    }
  }
  scene.tweens.add({
    targets: prog, v: 1, duration: 140, ease: 'Quad.easeOut', onUpdate: draw,
    onComplete: () => scene.tweens.add({ targets: g, alpha: 0, delay: o.ms ?? 500, duration: 300, onComplete: () => g.destroy() }),
  })
  return g
}

/** Slot-machine reveal: `target` flickers through scrambled text, then lands on `finalText`. Digits are re-rolled by default; pass `scramble` for words.
 * Returns skip(): jump straight to the final text (tap-to-skip, fast mode).
 * onDone fires exactly once on every path (finish, skip, target destroyed) EXCEPT scene shutdown, which drops the timer silently. */
export function spinText(scene: Phaser.Scene, target: Phaser.GameObjects.Text, finalText: string, o: { ms?: number; tick?: number; scramble?: () => string; onDone?: () => void } = {}) {
  const tick = o.tick ?? 60, steps = Math.max(1, Math.round((o.ms ?? 500) / tick))
  const scramble = o.scramble ?? (() => finalText.replace(/\d/g, () => `${Phaser.Math.Between(0, 9)}`))
  let n = 0, done = false
  const stop = () => { done = true; timer.remove(false) }
  const land = () => {
    if (done) return
    stop()
    if (target.active) target.setText(finalText)
    o.onDone?.()
  }
  const timer = scene.time.addEvent({
    delay: tick, loop: true,
    callback: () => {
      if (!target.active) { land(); return } // target destroyed mid-spin: still finish (onDone fires once)
      if (++n >= steps) land()
      else target.setText(scramble())
    },
  })
  return land
}
