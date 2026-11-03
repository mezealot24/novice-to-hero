import Phaser from 'phaser'
import { COLORS, MONSTERS, type MonsterDef, type MonsterKind } from '../data/game-data'
import type { DungeonScene } from '../scenes/DungeonScene'
import { sfx } from '../sfx'

type State = 'idle' | 'windup' | 'move' | 'stun' | 'slam'

// Every monster tells you what it is about to do (squash, red line, red ring) before it does it.
// That "telegraph" is what turns dodging into a skill instead of luck.
export class Monster {
  readonly def: MonsterDef
  readonly sprite: Phaser.Physics.Arcade.Sprite
  readonly shadow: Phaser.GameObjects.Image
  hp: number
  dead = false
  private state: State = 'idle'
  private timer: number
  private dir = new Phaser.Math.Vector2()
  private tele?: Phaser.GameObjects.Graphics
  private moves = 0
  private enraged = false
  private baseScale = 1
  private poisonStacks = 0
  private poisonDmg = 0
  private burnDps = 0
  private burnLeft = 0
  private dotAcc = 0
  private dotIcon?: Phaser.GameObjects.Text

  constructor(private scene: DungeonScene, readonly kind: MonsterKind, x: number, y: number) {
    this.def = MONSTERS[kind]
    this.hp = this.def.hp
    this.shadow = scene.add.image(x, y, 'shadow')
    this.sprite = scene.physics.add.sprite(x, y, this.def.tex)
    if (kind === 'minijellop') this.baseScale = 0.7
    this.sprite.setScale(this.baseScale)
    const r = this.def.radius / this.baseScale
    this.sprite.setCircle(r, this.sprite.width / 2 - r, this.sprite.height / 2 - r + 2)
    this.sprite.setData('monster', this)
    this.shadow.setScale((this.def.radius * 2.4) / 60, this.baseScale)
    this.timer = Phaser.Math.Between(400, 900)
  }

  get x() { return this.sprite.x }
  get y() { return this.sprite.y }
  /** True while the monster is lunging: contact hurts more and knockback is ignored. */
  get lunging() { return this.state === 'move' }

  update(dt: number) {
    if (this.dead) return
    const hero = this.scene.hero
    this.timer -= dt
    this.tickDots(dt)
    if (this.dead) return
    this.shadow.setPosition(this.x, this.y + this.def.radius * 0.9)
    this.sprite.setDepth(this.y)
    if (this.kind === 'wolf' && this.state !== 'stun') this.sprite.setFlipX(hero.x < this.x)

    switch (this.state) {
      case 'idle': {
        if (this.def.ai === 'dasher') {
          // prowl closer, then commit to a dash
          const d = Phaser.Math.Distance.Between(this.x, this.y, hero.x, hero.y)
          if (d > 200) this.scene.physics.moveTo(this.sprite, hero.x, hero.y, 80)
          else this.sprite.setVelocity(0, 0)
          if (this.timer <= 0 && d < 320) this.startWindup(520)
        } else {
          this.sprite.setVelocity(0, 0)
          if (this.timer <= 0) {
            const slam = this.def.ai === 'boss' && this.moves % 3 === 2
            if (slam) this.startSlam()
            else this.startWindup(this.def.ai === 'boss' ? 420 : 280)
          }
        }
        break
      }
      case 'windup':
        if (this.timer <= 0) this.startMove()
        break
      case 'move':
        if (this.timer <= 0) this.toIdle()
        break
      case 'stun':
        this.sprite.setVelocity(this.sprite.body!.velocity.x * 0.85, this.sprite.body!.velocity.y * 0.85)
        if (this.timer <= 0) this.toIdle()
        break
      case 'slam':
        if (this.timer <= 0) this.doSlam()
        break
    }
  }

  private aimAtHero(spreadDeg: number) {
    const hero = this.scene.hero
    const a = Phaser.Math.Angle.Between(this.x, this.y, hero.x, hero.y) + Phaser.Math.DegToRad(Phaser.Math.Between(-spreadDeg, spreadDeg))
    this.dir.setToPolar(a, 1)
  }

  private startWindup(ms: number) {
    this.state = 'windup'
    this.timer = ms
    this.sprite.setVelocity(0, 0)
    if (this.def.ai === 'dasher') {
      this.aimAtHero(0)
      this.tele = this.scene.add.graphics().setDepth(1)
      const len = (this.def.moveSpeed * 300) / 1000
      this.tele.lineStyle(this.def.radius * 2, COLORS.telegraph, 0.55)
      this.tele.lineBetween(this.x, this.y, this.x + this.dir.x * len, this.y + this.dir.y * len)
      this.scene.tweens.add({ targets: this.tele, alpha: { from: 0.3, to: 1 }, duration: ms })
    } else {
      this.aimAtHero(this.def.ai === 'boss' ? 5 : 20)
    }
    // squash = "about to jump"
    this.scene.tweens.add({ targets: this.sprite, scaleX: this.baseScale * 1.2, scaleY: this.baseScale * 0.75, duration: ms, ease: 'Sine.easeIn' })
  }

  private startMove() {
    this.tele?.destroy(); this.tele = undefined
    this.state = 'move'
    this.timer = this.def.ai === 'dasher' ? 300 : 340
    this.moves++
    this.sprite.setVelocity(this.dir.x * this.def.moveSpeed, this.dir.y * this.def.moveSpeed)
    this.scene.tweens.add({ targets: this.sprite, scaleX: this.baseScale * 0.85, scaleY: this.baseScale * 1.2, duration: 120, yoyo: true })
    if (this.def.ai === 'dasher') sfx.dash()
  }

  private toIdle() {
    this.state = 'idle'
    const [a, b] = this.def.idleMs
    this.timer = Phaser.Math.Between(a, b) * (this.enraged ? 0.6 : 1)
    this.sprite.setVelocity(0, 0)
    this.sprite.setScale(this.baseScale)
  }

  // Boss only: big red ring, then a ground slam that hits everything inside it.
  private startSlam() {
    this.state = 'slam'
    this.timer = 850
    this.sprite.setVelocity(0, 0)
    const R = 150
    this.tele = this.scene.add.graphics().setDepth(1)
    this.tele.fillStyle(COLORS.telegraph, 0.18).fillCircle(this.x, this.y, R)
    this.tele.lineStyle(3, COLORS.telegraph, 0.9).strokeCircle(this.x, this.y, R)
    this.scene.tweens.add({ targets: this.tele, alpha: { from: 0.4, to: 1 }, duration: 850 })
    this.scene.tweens.add({ targets: this.sprite, scaleX: 1.25, scaleY: 0.7, duration: 850, ease: 'Sine.easeIn' })
  }

  private doSlam() {
    this.tele?.destroy(); this.tele = undefined
    this.moves++
    sfx.slam()
    this.scene.cameras.main.shake(220, 0.012)
    this.scene.burst(this.x, this.y + 20, 0x52c46f, 26, 260)
    const ring = this.scene.add.circle(this.x, this.y, 20).setStrokeStyle(6, COLORS.cream, 0.9).setDepth(2)
    this.scene.tweens.add({ targets: ring, radius: 150, alpha: 0, duration: 260, onComplete: () => ring.destroy() })
    const hero = this.scene.hero
    if (Phaser.Math.Distance.Between(this.x, this.y, hero.x, hero.y) < 150 + 12) hero.hurt(this.def.dmg + 8, this.x, this.y, true) // shockwave = magic damage
    this.toIdle()
  }

  // ---------- damage over time (perks) ----------
  addPoison(stacks: number, dmgPerStack: number) {
    this.poisonStacks = Math.min(20, this.poisonStacks + stacks)
    this.poisonDmg = dmgPerStack
    this.showDotIcon()
  }

  addBurn(dps: number, ms: number) {
    this.burnDps = dps
    this.burnLeft = ms
    this.showDotIcon()
  }

  private showDotIcon() {
    if (!this.dotIcon) this.dotIcon = this.scene.add.text(0, 0, '', { fontSize: '14px' }).setOrigin(0.5).setDepth(9000)
    this.dotIcon.setText(`${this.burnLeft > 0 ? '🔥' : ''}${this.poisonStacks > 0 ? '☠️' + this.poisonStacks : ''}`)
  }

  private tickDots(dt: number) {
    if (this.dotIcon) this.dotIcon.setPosition(this.x + this.def.radius + 6, this.y - this.def.radius - 6)
    if (this.poisonStacks === 0 && this.burnLeft <= 0) return
    this.burnLeft -= dt
    this.dotAcc += dt
    if (this.dotAcc < 500) return
    this.dotAcc -= 500
    let dmg = 0
    if (this.poisonStacks > 0) dmg += this.poisonStacks * this.poisonDmg / 2
    if (this.burnLeft > 0) dmg += this.burnDps / 2
    dmg = Math.max(1, Math.round(dmg))
    this.hp -= dmg
    this.scene.damageNumber(this.x, this.y - this.def.radius, dmg, false, false, false, this.burnLeft > 0 ? '#ff8c42' : '#c79bff')
    if (this.burnLeft <= 0 && this.dotIcon) this.showDotIcon()
    if (this.hp <= 0) this.die()
  }

  /** Knock back + brief stun from the hero's Smash. Bosses only flinch. */
  stagger(fromX: number, fromY: number) {
    if (this.dead) return
    this.tele?.destroy(); this.tele = undefined
    if (this.def.ai === 'boss') {
      this.scene.tweens.add({ targets: this.sprite, x: this.x + (this.x > fromX ? 14 : -14), duration: 80, yoyo: true })
      return
    }
    const a = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y)
    this.sprite.setVelocity(Math.cos(a) * 420, Math.sin(a) * 420)
    this.sprite.setScale(this.baseScale)
    this.state = 'stun'
    this.timer = 450
  }

  hurt(dmg: number, fromX: number, fromY: number) {
    if (this.dead) return
    this.hp -= dmg
    this.sprite.setTintFill(0xffffff)
    this.scene.time.delayedCall(70, () => this.sprite.active && this.sprite.clearTint())
    if (this.hp <= 0) return this.die()

    // knockback, except bosses and anything mid-attack (so attacks stay readable)
    if (this.def.ai !== 'boss' && this.state !== 'move') {
      this.tele?.destroy(); this.tele = undefined
      const a = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y)
      this.sprite.setVelocity(Math.cos(a) * 260, Math.sin(a) * 260)
      this.sprite.setScale(this.baseScale)
      this.state = 'stun'
      this.timer = 180
    }
    if (this.def.ai === 'boss' && !this.enraged && this.hp < this.def.hp / 2) {
      this.enraged = true
      this.sprite.setTint(0xffb0a0)
      this.scene.callout('ราชาโกรธแล้ว!', this.x, this.y - 60)
      for (let i = 0; i < 3; i++) this.scene.time.delayedCall(i * 200, () => this.scene.spawnAt('minijellop', this.x + Phaser.Math.Between(-60, 60), this.y + Phaser.Math.Between(-40, 40)))
    }
  }

  private die() {
    this.dead = true
    this.tele?.destroy()
    this.dotIcon?.destroy()
    this.sprite.disableBody(true, false)
    sfx.pop()
    this.scene.burst(this.x, this.y, this.kind === 'wolf' ? 0x9aa0b4 : 0x52c46f, this.def.ai === 'boss' ? 40 : 14, 200)
    const [a, b] = this.def.zeny
    this.scene.dropCoins(this.x, this.y, Phaser.Math.Between(a, b))
    this.scene.tweens.add({ targets: [this.sprite, this.shadow], alpha: 0, scaleX: 1.4, scaleY: 0.2, duration: 180, onComplete: () => { this.sprite.destroy(); this.shadow.destroy() } })
    this.scene.onMonsterDied(this)
  }
}
