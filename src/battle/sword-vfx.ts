import Phaser from 'phaser'
import { BLADE_GOLD, BLOOD_CRIMSON, EXEC_RED, SEAL_BLUE, SOLAR_ORANGE, SPIRAL_CYAN, STEEL_SILVER, loopPfx, playPfx } from '../gfx/pixelfx'

export interface VfxPoint {
  x: number
  y: number
}

function texKey(scene: Phaser.Scene, preferred: string, fallback = 'slash'): string {
  return scene.textures.exists(preferred) ? preferred : fallback
}

function ringPulse(scene: Phaser.Scene, x: number, y: number, r: number, color: number, endScale: number, duration = 240, depth = 9002) {
  const ring = scene.add.circle(x, y, r, color, 0).setStrokeStyle(3, color, 0.95).setDepth(depth)
  scene.tweens.add({
    targets: ring,
    scale: endScale,
    alpha: 0,
    duration,
    ease: 'Quad.easeOut',
    onComplete: () => ring.destroy(),
  })
}

function sparkBurst(scene: Phaser.Scene, x: number, y: number, key: string, tint: number[], count: number, minSpd: number, maxSpd: number, angleMin = 0, angleMax = 360) {
  if (!scene.textures.exists(key)) return
  const p = scene.add
    .particles(x, y, key, {
      speed: { min: minSpd, max: maxSpd },
      angle: { min: angleMin, max: angleMax },
      scale: { start: 0.95, end: 0 },
      rotate: key === 'vfx_feather' ? { min: -120, max: 120 } : undefined,
      lifespan: 380,
      tint,
      quantity: count,
      emitting: false,
    })
    .setDepth(9005)
  p.explode(count)
  scene.time.delayedCall(460, () => p.active && p.destroy())
}

/** Progressive multi-angle melee slash crescent (Hit 1 downward, Hit 2 upward cross, Hit 3+ heavy double cross). */
export function comboSlashFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  comboLevel: number,
  _palette?: [number, number, number],
  tone: 'swordsman' | 'knight' | 'berserker' = 'swordsman',
) {
  const lvl = Math.max(1, comboLevel)
  const palette = tone === 'berserker' ? BLOOD_CRIMSON : lvl >= 3 ? BLADE_GOLD : STEEL_SILVER
  const scale = lvl >= 3 ? 1.85 : lvl === 2 ? 1.6 : 1.45
  playPfx(scene, 'swordSlash', x, y, pf({ scale, speed: 1.65, depth: 9001, palette, flip: lvl === 2 }))
  if (lvl >= 3) {
    playPfx(scene, 'swordSlash', x + 4, y - 4, pf({ scale: scale * 0.95, speed: 1.65, depth: 9002, palette, flip: true }))
    ringPulse(scene, x + 8, y, 8, tone === 'berserker' ? 0xe83842 : 0xf2d24b, 3.2, 200)
  }
}

/** Whirlwind sweep for Swordsman's `ฟันพายุ` and stacked `★ พันดาบ`. */
export function whirlwindFx(scene: Phaser.Scene, x: number, y: number, storm: boolean, _tint = 0x7fd7ff) {
  playPfx(scene, 'spinSlash', x, y, pf({
    scale: storm ? 2.15 : 1.75,
    speed: storm ? 1.55 : 1.4,
    depth: 9002,
    palette: storm ? BLADE_GOLD : STEEL_SILVER,
  }))
}

/** Skill 2 cast signatures: `sw_guard` hex shield dome, `sw_blood` crimson surge, `sw_taunt` shockwave roar. */
export function skill2AuraFx(scene: Phaser.Scene, kind: 'sw_guard' | 'sw_blood' | 'sw_taunt', heroX: number, groundY: number, monSprs: Phaser.GameObjects.Image[] = []) {
  if (kind === 'sw_guard') {
    playPfx(scene, 'guardDome', heroX + 16, groundY - 46, pf({ scale: 1.65, speed: 1.5, depth: 9003 }))
    return
  }

  if (kind === 'sw_blood') {
    playPfx(scene, 'bloodSurge', heroX, groundY, pf({ scale: 1.75, speed: 1.4, depth: 9003 }))
    return
  }

  // sw_taunt: amber sonic roar shockwaves + brief target flinch
  playPfx(scene, 'warCry', heroX + 12, groundY - 48, pf({ scale: 1.75, speed: 1.45, depth: 9002 }))
  for (const s of monSprs) {
    if (!s.active) continue
    scene.tweens.add({ targets: s, y: s.y - 8, duration: 75, yoyo: true, ease: 'Quad.easeOut' })
  }
}

/** Swordsman ult `ดาบพิทักษ์`: heavy vertical guard slash + dropping barrier dome + break/shatter accents. */
export function guardianUltFx(
  scene: Phaser.Scene,
  heroX: number,
  groundY: number,
  impactX: number,
  opts: { armorBreak: boolean; shatteredTargets: VfxPoint[] },
) {
  const slash = scene.add
    .image(impactX, groundY - 55, texKey(scene, 'vfx_crescent'))
    .setDepth(9003)
    .setTint(0xf2d24b)
    .setScale(1.1)
    .setAngle(75)
  scene.tweens.add({
    targets: slash,
    scale: 1.55,
    angle: 105,
    alpha: 0,
    duration: 240,
    ease: 'Quad.easeOut',
    onComplete: () => slash.destroy(),
  })

  const dome = scene.add
    .image(heroX + 4, groundY - 72, texKey(scene, 'vfx_hex'))
    .setDepth(9004)
    .setTint(0x9fe3ff)
    .setScale(1.35)
    .setAlpha(0.95)
  scene.tweens.add({
    targets: dome,
    y: groundY - 46,
    scale: 1.55,
    alpha: 0,
    duration: 380,
    ease: 'Bounce.easeOut',
    onComplete: () => dome.destroy(),
  })

  if (opts.armorBreak) {
    for (let i = -1; i <= 1; i += 2) {
      const crack = scene.add
        .image(impactX + i * 12, groundY - 38, texKey(scene, 'vfx_thrust'))
        .setDepth(9004)
        .setTint(0xe0b07a)
        .setScale(0.7, 0.9)
        .setAngle(i * 35 - 90)
      scene.tweens.add({
        targets: crack,
        x: crack.x + i * 18,
        y: crack.y + 12,
        alpha: 0,
        duration: 240,
        ease: 'Quad.easeOut',
        onComplete: () => crack.destroy(),
      })
    }
  }

  for (const pt of opts.shatteredTargets) {
    for (const deg of [-38, 38]) {
      const xBeam = scene.add
        .image(pt.x, pt.y - 36, texKey(scene, 'vfx_thrust'))
        .setDepth(9005)
        .setTint(0x7fd7ff)
        .setScale(0.85, 0.85)
        .setAngle(deg)
      scene.tweens.add({
        targets: xBeam,
        scaleX: 1.25,
        alpha: 0,
        duration: 240,
        ease: 'Quad.easeOut',
        onComplete: () => xBeam.destroy(),
      })
    }
    ringPulse(scene, pt.x, pt.y - 36, 10, 0x9fe3ff, 4.2, 240)
  }
}

/** Auto Guard / Parry crisp shield barrier flash in front of the hero. */
export function blockShieldFx(scene: Phaser.Scene, heroX: number, groundY: number) {
  playPfx(scene, 'guardDome', heroX + 24, groundY - 46, pf({ scale: 1.35, speed: 1.8, depth: 9004 }))
}

/** Knight Charge Attack / `★ ทะยาน`: speed lines + feather motes exploding forward on opener. */
export function chargeOpenerFx(scene: Phaser.Scene, _heroX: number, targetX: number, groundY: number, isMax: boolean) {
  playPfx(scene, 'chargeDash', targetX - 10, groundY - 36, pf({ scale: isMax ? 2.1 : 1.7, speed: 1.5, depth: 9004 }))
}

/** Wide lance sweep across multiple targets (`Brandish Spear`, `กวาดทวน`) + front push visual. */
export function brandishSweepFx(scene: Phaser.Scene, centerX: number, groundY: number, targets: Phaser.GameObjects.Image[], _tint = 0xf2d24b, pushFront = false) {
  playPfx(scene, 'spinSlash', centerX, groundY - 36, pf({ scale: 2.0, speed: 1.5, palette: BLADE_GOLD, depth: 9003 }))

  if (pushFront && targets[0]?.active) {
    const f = targets[0]
    scene.tweens.add({ targets: f, x: f.x + 22, duration: 90, yoyo: true, ease: 'Quad.easeOut' })
  }
}

/** Knight `Spear Boomerang`: throws a spinning pixel spear out, breaks enemy charge on hit, then spins back. */
export function spearBoomerangFx(
  scene: Phaser.Scene,
  fromX: number,
  fromY: number,
  target: { x: number; y: number },
  onImpact: () => void,
): Promise<void> {
  return new Promise((resolve) => {
    const spear = loopPfx(scene, 'spearSpin', fromX + 26, fromY - 56, pf({ scale: 1.4, speed: 1.2, depth: 9006 }))
    if (!spear) {
      onImpact()
      resolve()
      return
    }

    scene.tweens.add({
      targets: spear,
      x: target.x,
      y: target.y - 36,
      duration: 165,
      ease: 'Quad.easeIn',
      onComplete: () => {
        onImpact()
        playPfx(scene, 'lanceThrust', target.x, target.y - 36, pf({ scale: 1.5, speed: 1.6, depth: 9005 }))
        if (!spear.active) {
          resolve()
          return
        }
        scene.tweens.add({
          targets: spear,
          x: fromX + 12,
          y: fromY - 48,
          duration: 155,
          ease: 'Quad.easeOut',
          onComplete: () => {
            spear.destroy()
            resolve()
          },
        })
      },
    })
  })
}

const PIERCE_OFFSETS = [-16, 10, -4, 18, -10]

/** Multi-thrust lance strike beam: each hit of the Knight 🔱 คลื่นทะลวง (Pierce of Judgement) & Lord Knight `Hundred Spear`. */
export function pierceHitFx(scene: Phaser.Scene, targetX: number, targetY: number, hitIdx: number, isLkExtra: boolean) {
  const dy = PIERCE_OFFSETS[hitIdx % PIERCE_OFFSETS.length]
  playPfx(scene, 'lanceThrust', targetX + 8, targetY - 42 + dy, pf({
    scale: isLkExtra ? 1.85 : 1.6,
    speed: 1.7,
    depth: 9004,
    palette: isLkExtra ? SOLAR_ORANGE : BLADE_GOLD,
  }))
}

// ===== Swordsman rework VFX (Q 2026-11-21): 🤐 ดาบสยบมนตร์ · 🗡️ ดาบพิพากษา (ปลุกดาบ / คลื่นดาบ / ⚖️ execute) =====
// Pixel art from pixelfx (effects in src/gfx/fx/sword, baked by src/gfx/pixelfx.ts, preloaded via SWORD_PFX).
/** Presentation numbers for the rework VFX (scale / speed / depth / timings only, no balance). */
export const SWORD_FX = {
  scale: 2, speed: 1.5, depth: 9003,
  waveMs: 320, // 🌊 คลื่นดาบ crossing time
  spearMs: 420, spearScale: 2.8, spearGhosts: 2, // 🔱 คลื่นทะลวง (Q 2026-11-23 "อลังการหน่อย"): flies the whole field like the wave, big lance + afterimages
  cleaveScale: 1.3, execScale: 1.6, silenceScale: 2, guardSpeed: 2.6, waveScale: 1.5,
}

const pf = (o: Partial<{ scale: number; speed: number; depth: number; flip: boolean; palette: string[]; alpha: number }> = {}) =>
  ({ scale: o.scale ?? SWORD_FX.scale, speed: o.speed ?? SWORD_FX.speed, depth: o.depth ?? SWORD_FX.depth, flip: o.flip, palette: o.palette, alpha: o.alpha })

/** 🤐 ดาบสยบมนตร์ cut: X cut + a rune seal snapping onto the crossing. `second` = ★ ดาบสยบคู่ (gold). */
export function sealCutFx(scene: Phaser.Scene, x: number, y: number, second = false) {
  playPfx(scene, 'sealCut', x, y, pf(second ? { palette: BLADE_GOLD } : {}))
}

/** 🤐 silence on a monster: a rune ring closes over its head, then a muted sign pops. */
export function silenceSealFx(scene: Phaser.Scene, x: number, headY: number) {
  playPfx(scene, 'silenceSeal', x, headY, pf({ scale: SWORD_FX.silenceScale, depth: SWORD_FX.depth + 2 }))
}

/** Cast cut: the monster's spell circle cracks and bursts into shards. */
export function castBreakFx(scene: Phaser.Scene, x: number, y: number) {
  playPfx(scene, 'castBreak', x, y, pf({ depth: SWORD_FX.depth + 1 }))
}

/** Cleanse: a cold ring at the hero's feet, chain links flick off, motes rise (only when CC was actually removed). */
export function cleanseFx(scene: Phaser.Scene, heroX: number, groundY: number) {
  playPfx(scene, 'cleanse', heroX, groundY, pf({ depth: 8995 }))
}

/** 🛡️ web ใจไม่หวั่น: CC guard on the hero (a quick seal-blue rune circle at the feet). */
export function ccGuardFx(scene: Phaser.Scene, heroX: number, groundY: number) {
  playPfx(scene, 'runeCircle', heroX, groundY, pf({ speed: SWORD_FX.guardSpeed, depth: 8994, palette: SEAL_BLUE }))
}

/** ⚔️ ปลุกดาบ cast: a gold light sword plunges into the ground at the hero's feet. */
export function awakenBurstFx(scene: Phaser.Scene, heroX: number, groundY: number) {
  playPfx(scene, 'awakenBurst', heroX, groundY, pf({ depth: 9004 }))
}

/** ⚔️ ปลุกดาบ lasting aura (looping pixel sheet at the hero's feet). Call `.stop()` when it ends. */
export function awakenAuraFx(scene: Phaser.Scene, heroX: number, groundY: number): { stop: () => void } {
  const spr = loopPfx(scene, 'awakenAura', heroX, groundY, pf({ depth: 8990, speed: 1 }))
  return { stop: () => { if (spr?.active) scene.tweens.add({ targets: spr, alpha: 0, duration: 200, onComplete: () => spr.destroy() }) } }
}

/** ⚔️ ปลุกดาบ cleave on the 2nd monster: a quick gold slash. */
export function cleaveFx(scene: Phaser.Scene, x: number, y: number) {
  playPfx(scene, 'shadowSlash', x, y, pf({ scale: SWORD_FX.cleaveScale, palette: BLADE_GOLD, depth: 9002 }))
}

/** 🌊 คลื่นดาบ: the wind crescent flies from the hero across the field. Resolves when it has crossed `toX`. */
export function windWaveFx(scene: Phaser.Scene, fromX: number, toX: number, groundY: number): Promise<void> {
  const spr = loopPfx(scene, 'windWave', fromX, groundY - 56, pf({ depth: 9004, scale: SWORD_FX.waveScale }))
  if (!spr) return Promise.resolve()
  return new Promise((done) => {
    scene.tweens.add({
      targets: spr, x: toX + 60, duration: SWORD_FX.waveMs, ease: 'Quad.easeIn',
      onComplete: () => { scene.tweens.add({ targets: spr, alpha: 0, duration: 120, onComplete: () => spr.destroy() }); done() },
    })
  })
}

/** 🔱 คลื่นทะลวง (Knight Pierce of Judgement, Q 2026-11-23 "ยิงออกไปแบบนักดาบ เอาอลังการหน่อย"): a big lance of light charges at the
 *  hero, then flies across the WHOLE field like the 🌊 wave, afterimages trailing, gold flash + shake. Resolves the moment the tip
 *  reaches the target (the hit lands there, with a big burst); the lance keeps flying off screen and fades. */
export function spearWaveFx(scene: Phaser.Scene, fromX: number, toX: number, y: number): Promise<void> {
  ringPulse(scene, fromX, y, 16, 0xffe8a8, 3.2, 200, 9005) // charge-up at the hero
  sparkBurst(scene, fromX, y, 'dot', [0xf2d24b, 0xffffff], 10, 80, 200, 150, 210)
  const spr = loopPfx(scene, 'spearWave', fromX, y, pf({ depth: 9004, scale: SWORD_FX.spearScale }))
  if (!spr) return Promise.resolve()
  const endX = scene.scale.width + 120 + spr.displayWidth * 0.2, ms = SWORD_FX.spearMs
  const ghosts: Phaser.GameObjects.Sprite[] = []
  for (let i = 1; i <= SWORD_FX.spearGhosts; i++) {
    const g = loopPfx(scene, 'spearWave', fromX, y, pf({ depth: 9003, scale: SWORD_FX.spearScale * (1 - 0.08 * i), alpha: 0.45 / i }))
    if (g) { ghosts.push(g); scene.tweens.add({ targets: g, x: endX, alpha: 0, duration: ms, delay: 45 * i, ease: 'Sine.easeIn', onComplete: () => g.destroy() }) }
  }
  tintFlash(scene, 0xffe28c, 0.28, 160)
  scene.cameras.main.shake(ms, 0.006)
  return new Promise((done) => {
    let hit = false
    scene.tweens.add({
      targets: spr, x: endX, duration: ms, ease: 'Sine.easeIn',
      onUpdate: () => {
        if (hit || spr.x < toX) return
        hit = true
        ringPulse(scene, toX, y, 14, 0xffe8a8, 5.2, 260, 9006)
        ringPulse(scene, toX, y, 8, 0xffffff, 3.4, 180, 9006)
        sparkBurst(scene, toX, y, 'dot', [0xf2d24b, 0xffe8a8, 0xffffff], 22, 160, 420, -60, 60)
        tintFlash(scene, 0xfff4c8, 0.35, 140)
        done()
      },
      onComplete: () => {
        if (!hit) { hit = true; done() }
        scene.tweens.add({ targets: spr, alpha: 0, duration: 120, onComplete: () => spr.destroy() })
      },
    })
  })
}

/** A see-through screen tint (camera.flash starts opaque and would hide the lance). */
function tintFlash(scene: Phaser.Scene, color: number, a: number, ms: number): void {
  const r = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, color, a).setOrigin(0).setDepth(9002).setScrollFactor(0)
  scene.tweens.add({ targets: r, alpha: 0, duration: ms, onComplete: () => r.destroy() })
}

/** ⚖️ execute accent on a low-HP target hit by the wave: a red X cut. */
export function executeMarkFx(scene: Phaser.Scene, x: number, y: number) {
  playPfx(scene, 'daggerCross', x, y, pf({ scale: SWORD_FX.execScale, palette: EXEC_RED, depth: 9006 }))
}

/** Swordsman `🌀 พายุสวนกลับ`: deterministic counter whirlwind around the hero / front line. */
export function helixSpinFx(scene: Phaser.Scene, x: number, groundY: number) {
  playPfx(scene, 'spinSlash', x, groundY - 40, pf({ scale: 2.05, speed: 1.4, palette: STEEL_SILVER, depth: 9003 }))
}

/** Swordsman `🔥 ระเบิดเพลิงแค้น`: fiery solar-orange vengeance surge at the hero's feet. */
export function vengeanceBurstFx(scene: Phaser.Scene, heroX: number, groundY: number) {
  playPfx(scene, 'bloodSurge', heroX, groundY, pf({ scale: 1.85, speed: 1.45, palette: SOLAR_ORANGE, depth: 9004 }))
}

/** Knight S4 `🌀 Spiral Pierce`: cyan drilling spiral lance into the target. */
export function spiralPierceFx(scene: Phaser.Scene, targetX: number, targetY: number, shattered: boolean) {
  playPfx(scene, 'spiralDrill', targetX, targetY, pf({ scale: shattered ? 2.1 : 1.8, speed: 1.45, palette: SPIRAL_CYAN, depth: 9005 }))
}

/** Berserker S3 `🌊 คลื่นดาบ` / Warlord cleave: heavy overhead crescent cleave slamming the ground. */
export function crimsonWaveFx(scene: Phaser.Scene, targetX: number, groundY: number, isWarlord = false) {
  playPfx(scene, 'heavyCleave', targetX, groundY, pf({
    scale: isWarlord ? 2.2 : 1.95,
    speed: 1.45,
    palette: isWarlord ? SOLAR_ORANGE : BLOOD_CRIMSON,
    depth: 9004,
  }))
}

/** Berserker Ult `👹 บ้าระห่ำ` / Warlord `Undying Bloodlust`: crimson rage burst pillar + X-slash. */
export function rampageBurstFx(scene: Phaser.Scene, heroX: number, groundY: number, isWarlord = false) {
  playPfx(scene, 'rampageBurst', heroX, groundY, pf({
    scale: isWarlord ? 2.1 : 1.85,
    speed: 1.35,
    palette: BLOOD_CRIMSON,
    depth: 9004,
  }))
}

/** Berserker `บ้าระห่ำ` lasting crimson aura (looping pixel sheet at the hero's feet). Call `.stop()` when it ends. */
export function rampageAuraFx(scene: Phaser.Scene, heroX: number, groundY: number): { stop: () => void } {
  const spr = loopPfx(scene, 'awakenAura', heroX, groundY, pf({ depth: 8990, speed: 1.15, palette: BLOOD_CRIMSON }))
  return { stop: () => { if (spr?.active) scene.tweens.add({ targets: spr, alpha: 0, duration: 200, onComplete: () => spr.destroy() }) } }
}

/** Berserker `👹 ไม่รู้สึกเจ็บ` (`Ignore Pain`): crimson blood-flame surge when survival triggers. */
export function ignorePainFx(scene: Phaser.Scene, heroX: number, groundY: number) {
  playPfx(scene, 'bloodSurge', heroX, groundY, pf({ scale: 2.0, speed: 1.3, palette: BLOOD_CRIMSON, depth: 9005 }))
}
