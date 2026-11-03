import Phaser from 'phaser'
import { afterDef, hitChance, PLAYER, RULES, SET_BONUS, TAGS, type Perk, type Resource, type Stats, type Tag } from '../data/game-data'
import type { DungeonScene } from '../scenes/DungeonScene'
import type { Monster } from './Monster'
import { sfx } from '../sfx'

// Capybara Go style: the hero walks to the nearest monster and swings by itself.
// The player's job is the build (perk picks) and timing one manual skill: Smash.
export class Hero {
  readonly sprite: Phaser.Physics.Arcade.Sprite
  readonly shadow: Phaser.GameObjects.Image
  st: Stats = { ...PLAYER }
  hp = PLAYER.maxHp
  dead = false
  perks: Perk[] = []
  private attackCd = 0
  private smashCdLeft = 0
  private iframes = 0
  private knock = 0 // ms of knockback where the hero can't walk
  private bob = 0
  private hits = 0 // swing counter for the fire bolt
  private regenAcc = 0
  /** Class resource: Novice uses Mana. Warriors will use Rage, rogues Energy (job change). */
  resType: Resource = 'mana'
  res = PLAYER.maxRes
  private sinceCombat = 0

  constructor(private scene: DungeonScene, x: number, y: number) {
    this.shadow = scene.add.image(x, y, 'shadow').setScale(0.55, 0.8)
    this.sprite = scene.physics.add.sprite(x, y, 'novice')
    this.sprite.setCircle(13, 20 - 13, 30 - 13)
    this.sprite.setCollideWorldBounds(true)
  }

  get x() { return this.sprite.x }
  get y() { return this.sprite.y }
  get maxHp() { return this.st.maxHp }
  /** 0..1, used by the HUD ring on the Smash button */
  get smashReady() { return 1 - Math.max(0, this.smashCdLeft) / this.st.smashCd }
  get canSmash() { return this.smashCdLeft <= 0 && this.res >= this.st.smashCost }
  get invulnerable() { return this.iframes > 0 }

  /** Starting stats for this run (base stats + gear + skills from the save). */
  setBase(st: Stats, resType: Resource = 'mana') {
    this.st = { ...st }
    this.hp = st.maxHp
    this.resType = resType
    this.res = resType === 'rage' ? 0 : st.maxRes
  }

  private gainRes(n: number) { this.res = Math.min(this.st.maxRes, this.res + n) }

  placeAt(x: number, y: number) {
    this.sprite.setPosition(x, y).setVelocity(0, 0)
  }

  // ---------- build ----------
  tagCount(tag: Tag) { return this.perks.filter((p) => p.tag === tag).length }

  addPerk(p: Perk): string | null {
    this.perks.push(p)
    this.applyMod(p.mod)
    const set = SET_BONUS[p.tag]
    if (set && this.tagCount(p.tag) === 3) {
      this.applyMod(set.mod)
      return set.desc
    }
    return null
  }

  private applyMod(mod: Partial<Stats>) {
    for (const k of Object.keys(mod) as (keyof Stats)[]) {
      const v = mod[k]!
      if (k === 'maxHp') { this.st.maxHp += v; this.hp += v; continue }
      if (k === 'fireEvery') { this.st.fireEvery = this.st.fireEvery === 0 ? Math.max(1, v) : Math.max(1, this.st.fireEvery + v); continue }
      this.st[k] += v
    }
    this.st.smashCd = Math.max(2500, this.st.smashCd)
  }

  // ---------- per frame ----------
  update(dt: number, wantSmash: boolean, monsters: Monster[], goal?: { x: number; y: number }) {
    if (this.dead) return
    this.attackCd -= dt
    this.smashCdLeft -= dt
    this.iframes -= dt
    this.knock -= dt

    if (this.st.regen > 0) {
      this.regenAcc += (this.st.maxHp * this.st.regen / 100) * (1 + this.st.healAmp) * dt / 1000
      if (this.regenAcc >= 1) { this.heal(Math.floor(this.regenAcc), true, true); this.regenAcc %= 1 }
    }

    // resource: Mana / Energy refill over time, Rage drains after 2s out of combat
    this.sinceCombat += dt
    if (this.resType === 'rage') { if (this.sinceCombat > 2000) this.res = Math.max(0, this.res - 4 * dt / 1000) }
    else this.gainRes(this.st.resRegen * (this.resType === 'energy' ? 3 : 1) * dt / 1000)

    if (wantSmash && this.canSmash) this.smash(monsters)

    const target = this.nearest(monsters)
    if (this.knock > 0) {
      // being pushed back after a hit: no walking this frame
    } else if (target && target.dist > this.st.range * 0.85) {
      const a = Phaser.Math.Angle.Between(this.x, this.y, target.m.x, target.m.y)
      this.sprite.setVelocity(Math.cos(a) * this.st.speed, Math.sin(a) * this.st.speed)
      this.sprite.setFlipX(Math.cos(a) < 0)
      this.bob += dt * 0.018
    } else if (!target && goal && Phaser.Math.Distance.Between(this.x, this.y, goal.x, goal.y) > 6) {
      // room cleared: stroll to the open door
      const a = Phaser.Math.Angle.Between(this.x, this.y, goal.x, goal.y)
      this.sprite.setVelocity(Math.cos(a) * this.st.speed, Math.sin(a) * this.st.speed)
      this.bob += dt * 0.018
    } else {
      this.sprite.setVelocity(0, 0)
      this.bob = 0
      if (target) this.tryAttack(target.m, monsters)
    }

    this.sprite.setScale(1, 1 + Math.sin(this.bob) * 0.05)
    this.sprite.setAlpha(this.iframes > 0 ? (Math.floor(this.iframes / 70) % 2 ? 0.35 : 1) : 1)
    this.shadow.setPosition(this.x, this.y + 20)
    this.sprite.setDepth(this.y)
  }

  private nearest(monsters: Monster[]): { m: Monster; dist: number } | null {
    let best: Monster | null = null, bestD = Infinity
    for (const m of monsters) {
      if (m.dead) continue
      const d = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y) - m.def.radius
      if (d < bestD) { best = m; bestD = d }
    }
    return best ? { m: best, dist: bestD } : null
  }

  /** Physical: rolls between P.ATK min (DEX) and max (STR). Magic: M.ATK ±10%. */
  private rollDamage(mul = 1, magic = false): { dmg: number; crit: boolean } {
    const crit = Math.random() < this.st.crit
    const base = magic ? this.st.matk * Phaser.Math.FloatBetween(0.9, 1.1) : this.st.atk * Phaser.Math.FloatBetween(this.st.minPct, 1)
    return { dmg: Math.max(1, Math.round(base * mul * (crit ? this.st.critMul : 1))), crit }
  }

  private dealDamage(m: Monster, dmg: number, crit: boolean) {
    this.scene.damageNumber(m.x, m.y - m.def.radius, dmg, crit)
    if (this.st.poison > 0) m.addPoison(this.st.poison, this.st.poisonDmg)
    if (this.st.lifesteal > 0) this.heal(Math.round(dmg * this.st.lifesteal), true)
    m.hurt(dmg, this.x, this.y)
  }

  private tryAttack(best: Monster, monsters: Monster[]) {
    if (this.attackCd > 0) return
    this.attackCd = 1000 / this.st.aspd
    const ang = Phaser.Math.Angle.Between(this.x, this.y, best.x, best.y)
    this.sprite.setFlipX(Math.cos(ang) < 0)
    this.scene.slashFx(this.x, this.y, ang, Math.min(1.4, this.st.range / PLAYER.range))
    sfx.swing()

    // everything inside the swing cone gets hit, so grouped enemies take more total damage
    const half = Phaser.Math.DegToRad(RULES.arcDeg / 2)
    let anyCrit = false
    for (const m of monsters) {
      if (m.dead) continue
      const d = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y) - m.def.radius
      const a = Math.abs(Phaser.Math.Angle.Wrap(Phaser.Math.Angle.Between(this.x, this.y, m.x, m.y) - ang))
      if (d > this.st.range || (a > half && m !== best)) continue
      if (Math.random() > hitChance(this.st.hit, m.def.flee ?? 5)) { this.scene.floatText(m.x, m.y - m.def.radius, 'MISS', '#a9a6c7'); continue }
      const r = this.rollDamage()
      anyCrit ||= r.crit
      this.dealDamage(m, r.dmg, r.crit)
    }
    this.sinceCombat = 0
    if (this.resType === 'rage') this.gainRes(5)
    if (anyCrit) sfx.crit(); else sfx.hit()
    this.scene.hitStop(anyCrit ? 70 : 40)

    this.hits++
    if (this.st.fireEvery > 0 && this.hits % this.st.fireEvery === 0) this.fireBolt(monsters)
  }

  private fireBolt(monsters: Monster[]) {
    let far: Monster | null = null, farD = -1
    for (const m of monsters) {
      if (m.dead) continue
      const d = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y)
      if (d > farD) { far = m; farD = d }
    }
    if (!far) return
    const target = far
    this.scene.boltFx(this.x, this.y - 10, target, () => {
      if (target.dead) return
      const r = this.rollDamage(this.st.boltMul, true)
      this.dealDamage(target, r.dmg, r.crit)
      this.scene.burst(target.x, target.y, 0xff8c42, 10, 160)
      if (this.st.burnDps > 0) target.addBurn(this.st.burnDps, 3000)
    })
  }

  private smash(monsters: Monster[]) {
    this.smashCdLeft = this.st.smashCd
    this.res -= this.st.smashCost
    this.sinceCombat = 0
    this.scene.smashFx(this.x, this.y)
    sfx.slam()
    let hit = 0
    for (const m of monsters) {
      if (m.dead) continue
      if (Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y) - m.def.radius > RULES.smashRadius) continue
      const r = this.rollDamage(this.st.smashMul * (1 + this.st.pskill))
      this.dealDamage(m, r.dmg, true)
      m.stagger(this.x, this.y)
      hit++
    }
    this.scene.hitStop(hit ? 90 : 30)
  }

  hurt(dmg: number, fromX: number, fromY: number, magic = false) {
    if (this.dead || this.invulnerable) return
    if (Math.random() < this.st.luckyDodge) {
      this.iframes = RULES.hurtIframesMs * 0.5
      this.scene.floatText(this.x, this.y - 30, 'LUCKY!', '#6fd08c')
      return
    }
    // DEF (VIT) is flat off every hit; M.DEF (WIS) is % off magic hits; guard (perks) is % off everything
    const raw = magic ? dmg * (1 - this.st.mdef) : afterDef(dmg, this.st.def)
    dmg = Math.max(1, Math.round(raw * (1 - this.st.guard)))
    this.sinceCombat = 0
    if (this.resType === 'rage') this.gainRes(8)
    this.hp = Math.max(0, this.hp - dmg)
    this.iframes = RULES.hurtIframesMs
    sfx.hurt()
    this.scene.damageNumber(this.x, this.y - 30, dmg, false, true)
    this.scene.cameras.main.shake(120, 0.008)
    this.scene.cameras.main.flash(90, 120, 20, 30)
    const a = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y)
    this.sprite.setVelocity(Math.cos(a) * 320, Math.sin(a) * 320)
    this.knock = 140 * (1 - this.st.tenacity)
    if (this.hp <= 0) {
      this.dead = true
      this.sprite.setVelocity(0, 0)
      sfx.die()
      this.scene.tweens.add({ targets: this.sprite, angle: 90, alpha: 0.6, duration: 400 })
      this.scene.onHeroDied()
    }
  }

  heal(n: number, quiet = false, amped = false) {
    if (!amped) n = n * (1 + this.st.healAmp) // WIS
    const before = this.hp
    this.hp = Math.min(this.st.maxHp, Math.round(this.hp + n))
    if (this.hp > before && !quiet) this.scene.damageNumber(this.x, this.y - 30, this.hp - before, false, false, true)
  }

  /** Short text of the current build, for the HUD. */
  buildText() {
    const counts = (Object.keys(TAGS) as Tag[]).map((t) => [t, this.tagCount(t)] as const).filter(([, n]) => n > 0)
    return counts.map(([t, n]) => `${TAGS[t].icon}${n}`).join(' ')
  }
}
