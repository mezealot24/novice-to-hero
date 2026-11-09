import Phaser from 'phaser'

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
export function comboSlashFx(scene: Phaser.Scene, x: number, y: number, comboLevel: number, palette: [number, number, number]) {
  const key = texKey(scene, 'vfx_crescent')
  const lvl = Math.max(1, comboLevel)
  const color = lvl >= 3 ? palette[2] : lvl === 2 ? palette[1] : palette[0]
  const baseScale = lvl >= 3 ? 0.95 : lvl === 2 ? 0.8 : 0.72
  const rot = lvl >= 3 ? -0.45 : lvl === 2 ? 0.42 : -0.55

  const arc = scene.add
    .image(x, y, key)
    .setDepth(9001)
    .setTint(color)
    .setScale(baseScale * 0.85)
    .setRotation(rot)
    .setFlipY(lvl === 2)
  scene.tweens.add({
    targets: arc,
    scale: baseScale * 1.28,
    alpha: 0,
    duration: 185,
    ease: 'Quad.easeOut',
    onComplete: () => arc.destroy(),
  })

  if (lvl >= 3) {
    const cross = scene.add
      .image(x + 4, y - 4, key)
      .setDepth(9002)
      .setTint(palette[1])
      .setScale(baseScale * 0.8)
      .setRotation(0.45)
      .setFlipY(true)
    scene.tweens.add({
      targets: cross,
      scale: baseScale * 1.32,
      alpha: 0,
      duration: 210,
      ease: 'Quad.easeOut',
      onComplete: () => cross.destroy(),
    })
    ringPulse(scene, x + 8, y, 8, palette[2], 3.4, 210)
  }
}

/** Whirlwind sweep for Swordsman's `ฟันพายุ` and stacked `★ พันดาบ`. */
export function whirlwindFx(scene: Phaser.Scene, x: number, y: number, storm: boolean, tint = 0x7fd7ff) {
  const key = texKey(scene, 'vfx_crescent')
  const ring = scene.add.ellipse(x, y + 10, storm ? 120 : 88, storm ? 36 : 26).setStrokeStyle(storm ? 4 : 3, tint, 0.9).setDepth(9001)
  scene.tweens.add({
    targets: ring,
    scaleX: storm ? 1.75 : 1.45,
    scaleY: storm ? 1.55 : 1.3,
    alpha: 0,
    duration: storm ? 280 : 230,
    ease: 'Quad.easeOut',
    onComplete: () => ring.destroy(),
  })

  const sweep = scene.add
    .image(x, y, key)
    .setDepth(9002)
    .setTint(storm ? 0xffd34d : tint)
    .setScale(storm ? 1.08 : 0.88)
    .setAngle(-55)
  scene.tweens.add({
    targets: sweep,
    angle: 75,
    scale: storm ? 1.42 : 1.15,
    alpha: 0,
    duration: storm ? 250 : 200,
    ease: 'Quad.easeOut',
    onComplete: () => sweep.destroy(),
  })

  sparkBurst(scene, x, y, 'dot', [tint, 0xffffff, storm ? 0xffd34d : tint], storm ? 18 : 11, 90, storm ? 280 : 210)
}

/** Skill 2 cast signatures: `sw_guard` hex shield dome, `sw_blood` crimson surge, `sw_taunt` shockwave roar. */
export function skill2AuraFx(scene: Phaser.Scene, kind: 'sw_guard' | 'sw_blood' | 'sw_taunt', heroX: number, groundY: number, monSprs: Phaser.GameObjects.Image[] = []) {
  if (kind === 'sw_guard') {
    const hex = scene.add
      .image(heroX + 18, groundY - 46, texKey(scene, 'vfx_hex'))
      .setDepth(9003)
      .setTint(0x9fe3ff)
      .setScale(0.75)
      .setAlpha(0.95)
    scene.tweens.add({
      targets: hex,
      scale: 1.42,
      angle: 28,
      alpha: 0,
      duration: 360,
      ease: 'Quad.easeOut',
      onComplete: () => hex.destroy(),
    })
    ringPulse(scene, heroX + 10, groundY - 46, 16, 0x7fd7ff, 3.2, 300)
    return
  }

  if (kind === 'sw_blood') {
    sparkBurst(scene, heroX, groundY - 30, 'dot', [0xd9383a, 0xff6b7a], 16, 60, 190, 225, 315)
    ringPulse(scene, heroX, groundY - 12, 12, 0xd9383a, 3.8, 280)
    return
  }

  // sw_taunt: concentric amber roar shockwaves + brief target flinch
  for (let i = 0; i < 2; i++) {
    const wave = scene.add.circle(heroX + 16, groundY - 52, 18 + i * 8).setStrokeStyle(3, 0xf2b84b, 0.9).setDepth(9002)
    scene.tweens.add({
      targets: wave,
      scale: 5.2 + i * 1.4,
      alpha: 0,
      delay: i * 65,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => wave.destroy(),
    })
  }
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
  const hex = scene.add
    .image(heroX + 26, groundY - 46, texKey(scene, 'vfx_hex'))
    .setDepth(9004)
    .setTint(0x9fe3ff)
    .setScale(0.8)
    .setAlpha(0.95)
  scene.tweens.add({
    targets: hex,
    scale: 1.32,
    alpha: 0,
    duration: 220,
    ease: 'Quad.easeOut',
    onComplete: () => hex.destroy(),
  })
  sparkBurst(scene, heroX + 30, groundY - 46, 'dot', [0x9fe3ff, 0xffffff], 8, 90, 210, -70, 70)
}

/** Knight Charge Attack / `★ ทะยาน`: speed lines + Peco feathers exploding forward on opener. */
export function chargeOpenerFx(scene: Phaser.Scene, heroX: number, targetX: number, groundY: number, isMax: boolean) {
  const color = isMax ? 0xf2d24b : 0xffe9a8
  const streakCount = isMax ? 4 : 2
  for (let i = 0; i < streakCount; i++) {
    const sy = groundY - 26 - i * 16
    const line = scene.add.rectangle(heroX + 30, sy, isMax ? 96 : 68, isMax ? 4 : 2.5, color, 0.85).setOrigin(0, 0.5).setDepth(8999)
    scene.tweens.add({
      targets: line,
      x: targetX - 50,
      scaleX: 0.35,
      alpha: 0,
      duration: 220,
      delay: i * 25,
      ease: 'Quad.easeIn',
      onComplete: () => line.destroy(),
    })
  }
  sparkBurst(scene, heroX + 20, groundY - 34, texKey(scene, 'vfx_feather', 'dot'), [0xf5c85c, 0xfff2cf], isMax ? 9 : 5, 80, 230, 125, 235)
  ringPulse(scene, targetX - 18, groundY - 40, isMax ? 14 : 10, color, isMax ? 4.4 : 3.1, 230)
}

/** Wide lance sweep across multiple targets (`Brandish Spear`, `กวาดทวน`) + front push visual. */
export function brandishSweepFx(scene: Phaser.Scene, centerX: number, groundY: number, targets: Phaser.GameObjects.Image[], tint = 0xf2d24b, pushFront = false) {
  const arc = scene.add
    .image(centerX - 12, groundY - 46, texKey(scene, 'vfx_crescent'))
    .setDepth(9003)
    .setTint(tint)
    .setScale(1.15, 0.88)
    .setAngle(-12)
  scene.tweens.add({
    targets: arc,
    x: centerX + 18,
    scaleX: 1.55,
    scaleY: 1.12,
    alpha: 0,
    duration: 230,
    ease: 'Quad.easeOut',
    onComplete: () => arc.destroy(),
  })

  if (pushFront && targets[0]?.active) {
    const f = targets[0]
    scene.tweens.add({ targets: f, x: f.x + 22, duration: 90, yoyo: true, ease: 'Quad.easeOut' })
    sparkBurst(scene, f.x, groundY - 12, 'dot', [tint, 0xffffff], 8, 60, 170, 190, 350)
  }
}

/** Knight `Spear Boomerang`: throws a spinning spear out, breaks enemy charge on hit, then spins back. */
export function spearBoomerangFx(
  scene: Phaser.Scene,
  fromX: number,
  fromY: number,
  target: { x: number; y: number },
  onImpact: () => void,
): Promise<void> {
  return new Promise((resolve) => {
    const spear = scene.add
      .image(fromX + 26, fromY - 56, texKey(scene, 'vfx_spear', 'dot'))
      .setDepth(9006)
      .setScale(1.25)

    const spin = scene.tweens.add({
      targets: spear,
      angle: 360,
      duration: 135,
      repeat: -1,
    })

    scene.tweens.add({
      targets: spear,
      x: target.x,
      y: target.y - 36,
      duration: 165,
      ease: 'Quad.easeIn',
      onComplete: () => {
        onImpact()
        ringPulse(scene, target.x, target.y - 36, 12, 0x9fe3ff, 4.2, 230)
        sparkBurst(scene, target.x, target.y - 36, 'dot', [0x9fe3ff, 0xf2d24b], 10, 90, 240)
        if (!spear.active) {
          spin.stop()
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
            spin.stop()
            spear.destroy()
            resolve()
          },
        })
      },
    })
  })
}

const PIERCE_OFFSETS = [-16, 10, -4, 18, -10]

/** Multi-thrust lance strike beam for Knight `Pierce` & Lord Knight `Hundred Spear`. */
export function pierceHitFx(scene: Phaser.Scene, targetX: number, targetY: number, hitIdx: number, isLkExtra: boolean) {
  const dy = PIERCE_OFFSETS[hitIdx % PIERCE_OFFSETS.length]
  const deg = ((hitIdx % 3) - 1) * 5
  const color = isLkExtra ? 0xff9a6a : 0xf2d24b

  const beam = scene.add
    .image(targetX - 54, targetY - 38 + dy, texKey(scene, 'vfx_thrust'))
    .setDepth(9004)
    .setTint(color)
    .setScale(0.9, isLkExtra ? 1.12 : 0.92)
    .setAngle(deg)
  scene.tweens.add({
    targets: beam,
    x: targetX + 12,
    scaleX: isLkExtra ? 1.35 : 1.15,
    alpha: 0,
    duration: 155,
    ease: 'Quad.easeOut',
    onComplete: () => beam.destroy(),
  })

  if (hitIdx % 2 === 1 || isLkExtra) {
    ringPulse(scene, targetX + 4, targetY - 38 + dy, 8, color, 2.8, 175)
  }
}

/** Knight `Bowling Bash` splash: heavy horizontal shockwave slamming the secondary enemy. */
export function bowlingBashFx(scene: Phaser.Scene, fromX: number, toX: number, groundY: number) {
  const midX = (fromX + toX) * 0.5
  const beam = scene.add
    .image(midX, groundY - 44, texKey(scene, 'vfx_thrust'))
    .setDepth(9005)
    .setTint(0xf2d24b)
    .setScale(Math.max(1.1, Math.abs(toX - fromX) / 80), 1.35)
  scene.tweens.add({
    targets: beam,
    x: toX + 20,
    alpha: 0,
    duration: 240,
    ease: 'Quad.easeOut',
    onComplete: () => beam.destroy(),
  })
  ringPulse(scene, toX, groundY - 44, 14, 0xffd34d, 4.6, 260)
  sparkBurst(scene, toX + 10, groundY - 40, 'dot', [0xf2d24b, 0xff9a6a, 0xffffff], 14, 100, 290)
}
