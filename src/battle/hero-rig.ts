import Phaser from 'phaser'
import type { HeroRigSpec } from '../gfx/hero-visual'

interface LayerPose {
  img: Phaser.GameObjects.Image
  ox: number
  oy: number
  restAngle: number
  tint: number
}

/**
 * 4-layer Container rig for BattleScene's hero.
 * Costumes tint `body` only so Peco-Peco mount, lance/sword, shields, and ground aura stay crisp.
 * Idle and walk tweens animate child layers only — `root` remains free for BattleScene dashes/knockback.
 */
export class HeroRig {
  readonly root: Phaser.GameObjects.Container

  private spec!: HeroRigSpec
  private costumeTint = 0xffffff
  private ko = false
  private walking = false
  private guardOn = false
  private flashTok = 0

  private aura?: Phaser.GameObjects.Image
  private mount?: Phaser.GameObjects.Image
  private body!: Phaser.GameObjects.Image
  private shield?: Phaser.GameObjects.Image
  private weapon?: Phaser.GameObjects.Image
  private guardHalo?: Phaser.GameObjects.Image

  private idleTweens: Phaser.Tweens.Tween[] = []
  private walkTweens: Phaser.Tweens.Tween[] = []
  private actionTweens: Phaser.Tweens.Tween[] = []

  constructor(private scene: Phaser.Scene, x: number, y: number, spec: HeroRigSpec, tint: number) {
    this.root = scene.add.container(x, y).setScale(2).setDepth(y)
    this.setAppearance(spec, tint)
  }

  setAppearance(spec: HeroRigSpec, tint: number) {
    this.spec = spec
    this.costumeTint = tint
    this.ko = false
    this.walking = false
    this.guardOn = false
    this.flashTok++

    this.stopAllChildTweens()
    this.root.removeAll(true)
    this.root.setAngle(0).setAlpha(1).setScale(2)

    this.aura = undefined
    this.mount = undefined
    this.shield = undefined
    this.weapon = undefined
    this.guardHalo = undefined

    if (spec.auraTex && this.scene.textures.exists(spec.auraTex)) {
      this.aura = this.scene.add.image(0, -3, spec.auraTex).setOrigin(0.5, 0.5).setAlpha(0.78)
      if (spec.auraTint) this.aura.setTint(spec.auraTint)
      this.root.add(this.aura)
    }

    if (spec.mountTex && this.scene.textures.exists(spec.mountTex)) {
      this.mount = this.scene.add.image(spec.mountOffset.x, spec.mountOffset.y, spec.mountTex).setOrigin(0.5, 1)
      this.root.add(this.mount)
    }

    const bodyKey = this.scene.textures.exists(spec.bodyTex) ? spec.bodyTex : spec.compositeTex
    this.body = this.scene.add.image(spec.bodyOffset.x, spec.bodyOffset.y, bodyKey).setOrigin(0.5, 1)
    this.root.add(this.body)

    if (spec.shieldTex && this.scene.textures.exists(spec.shieldTex)) {
      this.shield = this.scene.add.image(spec.shieldOffset.x, spec.shieldOffset.y, spec.shieldTex).setOrigin(0.5, 0.5)
      this.root.add(this.shield)
    }

    if (spec.weaponTex && this.scene.textures.exists(spec.weaponTex)) {
      const origin = spec.isMounted ? { x: 0.24, y: 0.55 } : { x: 0.25, y: 0.84 }
      this.weapon = this.scene.add
        .image(spec.weaponOffset.x, spec.weaponOffset.y, spec.weaponTex)
        .setOrigin(origin.x, origin.y)
        .setAngle(spec.weaponRestAngle)
      this.root.add(this.weapon)
    }

    if (this.scene.textures.exists('vfx_hex')) {
      const gx = spec.shieldTex ? spec.shieldOffset.x + 4 : spec.isMounted ? 6 : 6
      const gy = spec.shieldTex ? spec.shieldOffset.y : spec.isMounted ? -27 : -18
      this.guardHalo = this.scene.add
        .image(gx, gy, 'vfx_hex')
        .setOrigin(0.5, 0.5)
        .setScale(0.46)
        .setTint(0x9fe3ff)
        .setAlpha(0.38)
        .setVisible(false)
      this.root.add(this.guardHalo)
    }

    this.restoreTint()
    this.playIdle()
  }

  setCostumeTint(tint: number) {
    this.costumeTint = tint
    this.flashTok++
    this.restoreTint()
  }

  restoreTint() {
    this.body?.clearTint()
    if (this.costumeTint !== 0xffffff) this.body?.setTint(this.costumeTint)
    this.mount?.clearTint()
    this.weapon?.clearTint()
    this.shield?.clearTint()
    if (this.aura) {
      this.aura.clearTint()
      if (this.spec.auraTint) this.aura.setTint(this.spec.auraTint)
    }
  }

  flashFill(color: number, ms: number) {
    const tok = ++this.flashTok
    for (const img of this.colorParts()) img.setTintFill(color)
    this.scene.time.delayedCall(ms, () => {
      if (tok !== this.flashTok || !this.root.active) return
      this.restoreTint()
    })
  }

  flashTint(color: number, ms: number) {
    const tok = ++this.flashTok
    for (const img of this.colorParts()) {
      img.clearTint()
      img.setTint(color)
    }
    this.scene.time.delayedCall(ms, () => {
      if (tok !== this.flashTok || !this.root.active) return
      this.restoreTint()
    })
  }

  setGuardAura(on: boolean) {
    if (this.guardOn === on) return
    this.guardOn = on
    if (!this.guardHalo) return
    this.scene.tweens.killTweensOf(this.guardHalo)
    if (!on) {
      this.guardHalo.setVisible(false).setAlpha(0.38).setScale(0.46)
      return
    }
    this.guardHalo.setVisible(true).setAlpha(0.28).setScale(0.44)
    this.scene.tweens.add({
      targets: this.guardHalo,
      alpha: 0.56,
      scale: 0.52,
      angle: 18,
      duration: 640,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  playIdle() {
    if (this.ko || this.walking) return
    this.stopTweens(this.idleTweens)
    this.resetChildTransforms()

    if (this.aura) {
      this.idleTweens.push(
        this.scene.tweens.add({
          targets: this.aura,
          alpha: 0.45,
          scaleX: 1.07,
          scaleY: 1.07,
          duration: 820,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
      )
    }

    if (this.mount) {
      this.idleTweens.push(
        this.scene.tweens.add({
          targets: this.mount,
          y: this.spec.mountOffset.y - 1.5,
          scaleY: 0.982,
          scaleX: 1.015,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
      )
      this.idleTweens.push(
        this.scene.tweens.add({
          targets: this.body,
          y: this.spec.bodyOffset.y - 2,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
      )
    } else {
      this.idleTweens.push(
        this.scene.tweens.add({
          targets: this.body,
          scaleY: 0.968,
          scaleX: 1.022,
          duration: 620,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
      )
    }

    if (this.shield) {
      this.idleTweens.push(
        this.scene.tweens.add({
          targets: this.shield,
          y: this.spec.shieldOffset.y - 1.4,
          duration: this.mount ? 500 : 620,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
      )
    }

    if (this.weapon) {
      this.idleTweens.push(
        this.scene.tweens.add({
          targets: this.weapon,
          y: this.spec.weaponOffset.y - 1.4,
          angle: this.spec.weaponRestAngle + 2.5,
          duration: 680,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
      )
    }
  }

  startWalk() {
    this.walking = true
    this.stopTweens(this.idleTweens)
    this.stopTweens(this.walkTweens)
    this.resetChildTransforms()

    if (this.mount) {
      this.mount.setAngle(-2)
      this.walkTweens.push(
        this.scene.tweens.add({
          targets: this.mount,
          y: this.spec.mountOffset.y - 4.5,
          angle: 2.5,
          duration: 145,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
      )
      const riders = [this.body, this.shield, this.weapon].filter(Boolean) as Phaser.GameObjects.Image[]
      this.walkTweens.push(
        this.scene.tweens.add({
          targets: riders,
          y: '-=4.5',
          duration: 145,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
      )
    } else {
      const walkers = [this.body, this.shield, this.weapon].filter(Boolean) as Phaser.GameObjects.Image[]
      this.walkTweens.push(
        this.scene.tweens.add({
          targets: walkers,
          y: '-=4',
          duration: 155,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
      )
      this.body.setAngle(-2.5)
      this.walkTweens.push(
        this.scene.tweens.add({
          targets: this.body,
          angle: 2.5,
          duration: 310,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
      )
    }
  }

  stopWalk() {
    this.walking = false
    this.stopTweens(this.walkTweens)
    this.resetChildTransforms()
    this.playIdle()
  }

  /** Anticipation frame right as the hero dashes toward the enemy. Non-blocking. */
  playWindup(thrust = false) {
    if (this.ko) return
    this.stopTweens(this.idleTweens)
    this.stopTweens(this.actionTweens)
    if (!this.weapon) {
      this.actionTweens.push(
        this.scene.tweens.add({
          targets: this.body,
          angle: -8,
          duration: 85,
          ease: 'Quad.easeOut',
        }),
      )
      return
    }
    this.actionTweens.push(
      this.scene.tweens.add({
        targets: this.weapon,
        x: thrust ? this.spec.weaponOffset.x - 8 : this.spec.weaponOffset.x - 2,
        angle: thrust ? this.spec.weaponRestAngle - 12 : this.spec.weaponRestAngle - 46,
        duration: 85,
        ease: 'Quad.easeOut',
      }),
    )
    this.actionTweens.push(
      this.scene.tweens.add({
        targets: this.body,
        angle: -6,
        duration: 85,
        ease: 'Quad.easeOut',
      }),
    )
  }

  /** Snap strike + squash-and-stretch impact, then ease cleanly back to rest stance. */
  playStrike(comboLevel = 1, thrust = false) {
    if (this.ko) return
    this.stopTweens(this.idleTweens)
    this.stopTweens(this.actionTweens)

    const alt = comboLevel % 2 === 0
    const swingAngle =
      comboLevel >= 3
        ? this.spec.weaponRestAngle + 102
        : alt
          ? this.spec.weaponRestAngle - 72
          : this.spec.weaponRestAngle + 84

    const hasWeapon = !!this.weapon
    if (this.weapon) {
      this.actionTweens.push(
        this.scene.tweens.add({
          targets: this.weapon,
          x: thrust ? this.spec.weaponOffset.x + 17 : this.spec.weaponOffset.x + 3,
          y: this.spec.weaponOffset.y + (thrust ? -1 : 2),
          angle: thrust ? this.spec.weaponRestAngle + 6 : swingAngle,
          duration: 65,
          ease: 'Quad.easeOut',
          onComplete: () => {
            if (!this.weapon?.active || this.ko) return
            this.actionTweens.push(
              this.scene.tweens.add({
                targets: this.weapon,
                x: this.spec.weaponOffset.x,
                y: this.spec.weaponOffset.y,
                angle: this.spec.weaponRestAngle,
                duration: 150,
                ease: 'Back.easeOut',
                onComplete: () => this.playIdle(),
              }),
            )
          },
        }),
      )
    }

    const bodyTargets = [this.body, this.mount].filter(Boolean) as Phaser.GameObjects.Image[]
    for (const img of bodyTargets) img.setScale(1.13, 0.89).setAngle(6)
    this.actionTweens.push(
      this.scene.tweens.add({
        targets: bodyTargets,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        duration: 165,
        ease: 'Back.easeOut',
        onComplete: hasWeapon ? undefined : () => this.playIdle(),
      }),
    )
  }

  /** Quick squash on shield/body when Auto Guard or Parry intercepts a hit. */
  playBlock() {
    if (this.ko) return
    this.stopTweens(this.idleTweens)
    this.stopTweens(this.actionTweens)
    const hasShield = !!this.shield
    if (this.shield) {
      this.shield.setTint(0x9fe3ff)
      this.shield.setScale(1.32).setPosition(this.spec.shieldOffset.x + 7, this.spec.shieldOffset.y - 2)
      this.actionTweens.push(
        this.scene.tweens.add({
          targets: this.shield,
          x: this.spec.shieldOffset.x,
          y: this.spec.shieldOffset.y,
          scaleX: 1,
          scaleY: 1,
          duration: 180,
          ease: 'Back.easeOut',
          onComplete: () => {
            if (this.shield?.active) this.shield.clearTint()
            this.playIdle()
          },
        }),
      )
    }
    this.body.setScale(1.1, 0.91)
    this.actionTweens.push(
      this.scene.tweens.add({
        targets: this.body,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Back.easeOut',
        onComplete: hasShield ? undefined : () => this.playIdle(),
      }),
    )
  }

  /** Fading afterimage ghost capturing every currently visible layer and weapon pose. */
  spawnAfterimage(tint: number, dx = 0) {
    if (!this.root.active) return
    const ghost = this.scene.add
      .container(this.root.x, this.root.y)
      .setScale(this.root.scaleX, this.root.scaleY)
      .setAngle(this.root.angle)
      .setAlpha(0.55)
      .setDepth(this.root.depth - 1)

    for (const src of this.colorParts()) {
      const cp = this.scene.add
        .image(src.x, src.y, src.texture.key)
        .setOrigin(src.originX, src.originY)
        .setScale(src.scaleX, src.scaleY)
        .setAngle(src.angle)
        .setFlipX(src.flipX)
        .setTintFill(tint)
      ghost.add(cp)
    }

    this.scene.tweens.add({
      targets: ghost,
      x: ghost.x + dx,
      alpha: 0,
      duration: 260,
      onComplete: () => ghost.destroy(),
    })
  }

  setKnockedOut(dead: boolean) {
    this.ko = dead
    if (dead) {
      this.stopTweens(this.idleTweens)
      this.stopTweens(this.walkTweens)
      this.stopTweens(this.actionTweens)
      this.setGuardAura(false)
      return
    }
    this.resetChildTransforms()
    this.playIdle()
  }

  resetPose(x?: number, y?: number) {
    this.ko = false
    this.walking = false
    if (x !== undefined) this.root.x = x
    if (y !== undefined) this.root.y = y
    this.root.setAngle(0).setAlpha(1).setScale(2)
    this.restoreTint()
    this.stopAllChildTweens()
    this.resetChildTransforms()
    this.playIdle()
  }

  private colorParts(): Phaser.GameObjects.Image[] {
    return [this.mount, this.body, this.shield, this.weapon].filter((p): p is Phaser.GameObjects.Image => !!p && p.active)
  }

  private resetChildTransforms() {
    const entries: LayerPose[] = []
    if (this.aura) {
      this.aura.setPosition(0, -3).setScale(1).setAngle(0).setAlpha(0.78)
    }
    if (this.mount) entries.push({ img: this.mount, ox: this.spec.mountOffset.x, oy: this.spec.mountOffset.y, restAngle: 0, tint: 0xffffff })
    if (this.body) entries.push({ img: this.body, ox: this.spec.bodyOffset.x, oy: this.spec.bodyOffset.y, restAngle: 0, tint: this.costumeTint })
    if (this.shield) entries.push({ img: this.shield, ox: this.spec.shieldOffset.x, oy: this.spec.shieldOffset.y, restAngle: 0, tint: 0xffffff })
    if (this.weapon) {
      entries.push({ img: this.weapon, ox: this.spec.weaponOffset.x, oy: this.spec.weaponOffset.y, restAngle: this.spec.weaponRestAngle, tint: 0xffffff })
    }
    for (const e of entries) {
      e.img.setPosition(e.ox, e.oy).setScale(1).setAngle(e.restAngle)
    }
  }

  private stopTweens(list: Phaser.Tweens.Tween[]) {
    for (const t of list) t.stop()
    list.length = 0
  }

  private stopAllChildTweens() {
    this.stopTweens(this.idleTweens)
    this.stopTweens(this.walkTweens)
    this.stopTweens(this.actionTweens)
  }
}
