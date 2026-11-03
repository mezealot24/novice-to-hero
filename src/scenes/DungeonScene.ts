import Phaser from 'phaser'
import { COLORS, COLS, DUNGEON, FONT_NUM, FONT_UI, H, PERKS, perkDesc, ROWS, RULES, TAGS, TILE, W, type MonsterKind, type Perk } from '../data/game-data'
import { Hero } from '../entities/Hero'
import { Monster } from '../entities/Monster'
import { sfx, unlock } from '../sfx'
import { COSTUMES, FREE_GEMS, heroStats, RESOURCES } from '../data/meta'
import { addXp, persist, save } from '../save'
import { fullscreenButton, go } from '../ui'

const DOOR_COLS = [COLS / 2 - 1, COLS / 2] // two tiles, top centre
type Phase = 'title' | 'play' | 'pick' | 'transition' | 'over'

interface Coin { img: Phaser.GameObjects.Image; magnet: boolean; speed: number }

export class DungeonScene extends Phaser.Scene {
  hero!: Hero
  private monsters: Monster[] = []
  private monsterGroup!: Phaser.Physics.Arcade.Group
  private walls!: Phaser.Physics.Arcade.StaticGroup
  private doors: Phaser.Physics.Arcade.Image[] = []
  private coins: Coin[] = []
  private roomIndex = 0
  private pendingSpawns = 0
  private cleared = false
  private phase: Phase = 'title'
  private zeny = 0
  private kills = 0
  private startedAt = 0
  private xp = 0
  private level = 1
  private pendingLevels = 0

  // input: one button (Smash). Space / click / tap anywhere.
  private keys!: Record<'SPACE', Phaser.Input.Keyboard.Key>
  private smashQueued = false

  // HUD
  private hud!: Phaser.GameObjects.Graphics
  private hpText!: Phaser.GameObjects.Text
  private zenyText!: Phaser.GameObjects.Text
  private roomText!: Phaser.GameObjects.Text
  private bossName!: Phaser.GameObjects.Text
  private coinIcon!: Phaser.GameObjects.Image
  private buildText!: Phaser.GameObjects.Text
  private levelText!: Phaser.GameObjects.Text
  private overlay?: Phaser.GameObjects.Container

  private runXp = 0
  private runGems = 0 // rare drops (LUK)
  private chestHere = false // rare event rolled for this room (LUK)
  private settled = false
  private pauseBtn?: Phaser.GameObjects.Container

  constructor() { super('dungeon') }

  /** The scene object is reused between visits, so reset per-visit state here. */
  init() {
    this.monsters = []; this.coins = []; this.doors = []; this.heroColliders = []
    this.hero = undefined as unknown as Hero
    this.overlay = undefined; this.fsBtn = undefined; this.dashLabel = undefined; this.pauseBtn = undefined
    this.phase = 'title'
    this.time.paused = false
  }

  create() {
    this.buildFloor()
    this.walls = this.physics.add.staticGroup()
    this.monsterGroup = this.physics.add.group()
    this.buildWalls()

    this.physics.add.collider(this.monsterGroup, this.walls)
    this.spawnHero()

    this.setupInput()
    this.buildHud()
    this.cameras.main.fadeIn(200, 20, 23, 43)
    this.startRun()
  }

  // ---------- world ----------
  private buildFloor() {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const v = (c * 7 + r * 13 + ((c * r) % 5)) % 11
        this.add.image(c * TILE + TILE / 2, r * TILE + TILE / 2, `grass${v === 0 ? 3 : v % 3}`).setDepth(-10)
      }
  }

  private buildWalls() {
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++) {
        const edge = r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1
        if (!edge) continue
        const x = c * TILE + TILE / 2, y = r * TILE + TILE / 2
        if (r === 0 && DOOR_COLS.includes(c)) {
          const d = this.physics.add.staticImage(x, y, 'door_closed').setDepth(-5)
          this.walls.add(d)
          this.doors.push(d)
        } else {
          this.walls.add(this.add.image(x, y, 'wall').setDepth(-5))
        }
      }
    this.walls.refresh()
  }

  private setDoors(open: boolean) {
    for (const d of this.doors) {
      d.setTexture(open ? 'door_open' : 'door_closed')
      d.body!.enable = !open
    }
  }

  private heroColliders: Phaser.Physics.Arcade.Collider[] = []

  /** Fresh hero for each run (old sprite and its colliders are thrown away). */
  private spawnHero() {
    this.heroColliders.forEach((c) => c.destroy())
    if (this.hero) { this.hero.sprite.destroy(); this.hero.shadow.destroy() }
    this.hero = new Hero(this, W / 2, H - TILE * 2)
    const s = save()
    this.hero.setBase(heroStats(s))
    this.hero.sprite.setTint((COSTUMES.find((c) => c.id === s.costume) ?? COSTUMES[0]).tint)
    this.heroColliders = [
      this.physics.add.collider(this.hero.sprite, this.walls),
      // touching a monster hurts; a lunging one hurts full, a resting one a bit less
      this.physics.add.overlap(this.hero.sprite, this.monsterGroup, (_h, m) => {
        const mon = (m as Phaser.Physics.Arcade.Sprite).getData('monster') as Monster
        if (!mon.dead) this.hero.hurt(mon.lunging ? mon.def.dmg : Math.ceil(mon.def.dmg * 0.6), mon.x, mon.y)
      }),
    ]
  }

  // ---------- rooms ----------
  private startRun() {
    unlock()
    this.overlay?.destroy(); this.overlay = undefined
    this.monsters.forEach((m) => { m.sprite.destroy(); m.shadow.destroy() })
    this.monsters = []
    this.coins.forEach((c) => c.img.destroy()); this.coins = []
    this.time.removeAllEvents()
    this.spawnHero()
    this.zeny = 0; this.kills = 0; this.startedAt = this.time.now
    this.xp = 0; this.level = 1; this.pendingLevels = 0
    this.runXp = 0; this.runGems = 0; this.settled = false
    this.enterRoom(0)
  }

  private enterRoom(i: number) {
    this.roomIndex = i
    this.cleared = false
    this.setDoors(false)
    this.hero.placeAt(W / 2, H - TILE * 2)
    const room = DUNGEON.rooms[i]
    this.roomText.setText(`${DUNGEON.name} · ${i + 1}/${DUNGEON.rooms.length}`)
    this.banner(room.title, room.boss ? 'เก็บท่าไม้ตายไว้ตอนมันขึ้นวงแดง' : 'โนวิสสู้เอง · แตะจอเพื่อใช้ท่าไม้ตาย')
    this.phase = 'play'
    this.chestHere = !room.boss && Math.random() < this.hero.st.eventChance
    this.pendingSpawns = 0
    let delay = 700
    for (const [kind, n] of room.spawn)
      for (let k = 0; k < n; k++) {
        this.pendingSpawns++
        this.time.delayedCall(delay, () => this.spawnWithMarker(kind))
        delay += 260
      }
  }

  private spawnWithMarker(kind: MonsterKind) {
    let x = 0, y = 0
    for (let tries = 0; tries < 30; tries++) {
      x = Phaser.Math.Between(TILE * 2, W - TILE * 2)
      y = Phaser.Math.Between(TILE * 2, H - TILE * 3)
      if (Phaser.Math.Distance.Between(x, y, this.hero.x, this.hero.y) > 240) break
    }
    if (kind === 'king') { x = W / 2; y = H / 2 - 30 }
    const mark = this.add.ellipse(x, y + 14, 10, 4, COLORS.telegraph, 0.5).setDepth(0)
    this.tweens.add({ targets: mark, width: 60, height: 20, alpha: 0.9, duration: 550, onComplete: () => {
      mark.destroy()
      this.pendingSpawns--
      if (this.phase === 'play') this.spawnAt(kind, x, y)
    } })
  }

  spawnAt(kind: MonsterKind, x: number, y: number) {
    x = Phaser.Math.Clamp(x, TILE * 1.6, W - TILE * 1.6)
    y = Phaser.Math.Clamp(y, TILE * 1.6, H - TILE * 1.6)
    const m = new Monster(this, kind, x, y)
    this.monsterGroup.add(m.sprite)
    this.monsters.push(m)
    const s = m.sprite.scaleX
    m.sprite.setScale(0.2)
    this.tweens.add({ targets: m.sprite, scale: s, duration: 220, ease: 'Back.easeOut' })
    if (kind === 'king') this.bossName.setVisible(true)
  }

  onMonsterDied(m: Monster) {
    this.kills++
    this.runXp += m.def.xp
    if (Math.random() < this.hero.st.dropChance) {
      this.runGems++
      this.floatText(m.x, m.y - 40, '💎 ของหายาก!', '#7fd7ff')
      sfx.coin()
    }
    this.gainXp(m.def.xp)
    this.monsterGroup.remove(m.sprite)
    this.monsters = this.monsters.filter((x) => x !== m)
    if (this.monsters.length === 0 && this.pendingSpawns === 0) this.time.delayedCall(350, () => this.roomCleared())
  }

  private roomCleared() {
    if (this.cleared || this.phase !== 'play' || this.monsters.length) return
    this.cleared = true
    this.bossName.setVisible(false)
    // pull every coin on the floor to the hero so nothing is left behind
    this.coins.forEach((c) => (c.magnet = true))
    if (this.roomIndex === DUNGEON.rooms.length - 1) {
      sfx.win()
      this.time.delayedCall(900, () => this.showWin())
      return
    }
    sfx.door()
    this.hero.heal(Math.round(this.hero.maxHp * RULES.healOnClear))
    this.gainXp(RULES.xpOnClear)
    this.runXp += RULES.xpOnClear
    this.setDoors(true)
    this.callout('เคลียร์ห้อง! ไปห้องถัดไป', W / 2, TILE * 2.2)
    if (this.chestHere) this.openChest()
  }

  /** LUK rare event: a treasure chest pops next to the hero after the room is cleared. */
  private openChest() {
    this.chestHere = false
    const x = this.hero.x + 50, y = this.hero.y
    const g = this.add.graphics({ x, y }).setDepth(y)
    g.fillStyle(0x8d5a2b).fillRoundedRect(-18, -12, 36, 24, 4)
    g.fillStyle(0xb57a3c).fillRect(-18, -12, 36, 8)
    g.fillStyle(0xf2b84b).fillRect(-3, -6, 6, 8)
    this.tweens.add({ targets: g, scaleX: 1.2, scaleY: 0.8, duration: 140, yoyo: true, repeat: 2, onComplete: () => {
      this.burst(x, y, COLORS.gold, 18, 220)
      this.dropCoins(x, y, Phaser.Math.Between(10, 18))
      this.callout('🎁 อีเวนต์หายาก! หีบสมบัติ', W / 2, H / 2 - 60)
      sfx.win()
      this.tweens.add({ targets: g, alpha: 0, delay: 500, duration: 300, onComplete: () => g.destroy() })
    } })
  }

  // ---------- xp / perks ----------
  private gainXp(n: number) {
    if (n <= 0) return
    this.xp += n
    while (this.xp >= RULES.xpNeed(this.level)) {
      this.xp -= RULES.xpNeed(this.level)
      this.level++
      this.pendingLevels++
    }
    if (this.pendingLevels > 0 && this.phase === 'play') this.time.delayedCall(200, () => this.offerPerks())
  }

  private offerPerks() {
    if (this.phase !== 'play' || this.pendingLevels <= 0 || this.hero.dead) return
    this.pendingLevels--
    this.phase = 'pick'
    this.physics.world.pause()
    this.time.paused = true
    this.tweens.pauseAll()
    this.hero.heal(Math.round(this.hero.maxHp * RULES.healOnLevel))
    sfx.win()

    // 3 offers: one from a tag the player already has (so a build can grow), the rest random
    const owned = new Set(this.hero.perks.map((p) => p.id))
    const pool = PERKS.filter((p) => !owned.has(p.id))
    const mine = this.hero.perks.map((p) => p.tag)
    const offers: Perk[] = []
    const take = (list: Perk[]) => {
      const left = list.filter((p) => !offers.includes(p))
      if (!left.length) return
      offers.push(left[Phaser.Math.Between(0, left.length - 1)])
    }
    if (mine.length) take(pool.filter((p) => mine.includes(p.tag)))
    while (offers.length < 3 && offers.length < pool.length) take(pool)
    // LUK: each card may roll legendary = double effect
    const legend = new Set<Perk>()
    offers.forEach((p, i) => {
      if (Math.random() >= this.hero.st.legendChance) return
      const mod: Perk['mod'] = {}
      for (const k of Object.keys(p.mod) as (keyof Perk['mod'])[]) mod[k] = k === 'fireEvery' ? Math.max(1, p.mod[k]! - 1) : p.mod[k]! * 2
      offers[i] = { ...p, name: `✦ ${p.name}`, desc: `${p.desc}\n(ตำนาน: แรง x2)`, mod }
      legend.add(offers[i])
    })

    const c = this.add.container(0, 0).setDepth(30000)
    c.add(this.add.rectangle(W / 2, H / 2, W, H, COLORS.night, 0.8).setInteractive())
    c.add(this.add.text(W / 2, 64, `เลเวล ${this.level}! เลือกพร 1 อย่าง`, { fontFamily: FONT_UI, fontSize: '30px', fontStyle: 'bold', color: '#f2b84b' }).setOrigin(0.5))
    const cw = 272, ch = 250, gap = 24
    const x0 = W / 2 - ((offers.length - 1) * (cw + gap)) / 2
    const pick = (p: Perk) => {
      c.destroy()
      const set = this.hero.addPerk(p)
      this.physics.world.resume()
      this.time.paused = false
      this.tweens.resumeAll()
      this.phase = 'play'
      this.callout(`${TAGS[p.tag].icon} ${p.name}`, this.hero.x, this.hero.y - 50)
      if (set) this.time.delayedCall(600, () => { this.callout(`✨ ${set}`, W / 2, H / 2 - 80); sfx.door() })
      if (this.pendingLevels > 0) this.time.delayedCall(400, () => this.offerPerks())
    }
    offers.forEach((p, i) => {
      const tag = TAGS[p.tag]
      const n = this.hero.tagCount(p.tag)
      const card = this.add.container(x0 + i * (cw + gap), H / 2 + 20)
      const leg = legend.has(p)
      const bg = this.add.rectangle(0, 0, cw, ch, leg ? 0xffe08a : 0xf4e6c8).setStrokeStyle(leg ? 7 : 4, leg ? 0xff8c42 : Phaser.Display.Color.HexStringToColor(tag.color).color)
      if (leg) this.tweens.add({ targets: card, angle: { from: -1.5, to: 1.5 }, duration: 300, yoyo: true, repeat: -1 })
      const icon = this.add.text(0, -ch / 2 + 44, tag.icon, { fontSize: '40px' }).setOrigin(0.5)
      const name = this.add.text(0, -ch / 2 + 96, p.name, { fontFamily: FONT_UI, fontSize: '24px', fontStyle: 'bold', color: '#2b2238' }).setOrigin(0.5)
      const desc = this.add.text(0, -ch / 2 + 128, perkDesc(p.desc), { fontFamily: FONT_UI, fontSize: '16px', color: '#4a3f5c', align: 'center', wordWrap: { width: cw - 36 }, lineSpacing: 4 }).setOrigin(0.5, 0)
      const foot = this.add.text(0, ch / 2 - 22, `สาย${tag.name} ${n}/3${n === 2 ? ' · ครบเซ็ตเมื่อเลือก!' : ''}`, { fontFamily: FONT_UI, fontSize: '14px', color: tag.color, fontStyle: 'bold', stroke: '#2b2238', strokeThickness: 2 }).setOrigin(0.5)
      const key = this.add.text(-cw / 2 + 14, -ch / 2 + 10, `${i + 1}`, { fontFamily: FONT_NUM, fontSize: '16px', color: '#8d7244' })
      card.add([bg, icon, name, desc, foot, key]).setSize(cw, ch).setInteractive({ useHandCursor: true })
      card.on('pointerover', () => card.setScale(1.04))
      card.on('pointerout', () => card.setScale(1))
      card.on('pointerdown', () => pick(p))
      c.add(card)
      this.input.keyboard!.once(`keydown-${['ONE', 'TWO', 'THREE'][i]}`, () => { if (c.active) pick(p) })
    })
  }

  onHeroDied() {
    this.phase = 'over'
    this.time.delayedCall(900, () => this.showGameOver())
  }

  // ---------- fx helpers used by entities ----------
  hitStop(ms: number) {
    this.physics.world.pause()
    this.time.delayedCall(ms, () => this.physics.world.resume())
  }

  slashFx(x: number, y: number, ang: number, k = 1) {
    const s = this.add.image(x + Math.cos(ang) * 22 * k, y + Math.sin(ang) * 22 * k, 'slash').setRotation(ang).setDepth(y + 5).setScale(0.6 * k).setAlpha(0.95)
    this.tweens.add({ targets: s, scale: 0.85 * k, alpha: 0, duration: 160, onComplete: () => s.destroy() })
  }

  boltFx(x: number, y: number, target: Monster, onHit: () => void) {
    const b = this.add.image(x, y, 'dot').setTint(0xff8c42).setScale(2.2).setDepth(9000)
    const trail = this.add.particles(0, 0, 'dot', { follow: b, speed: 10, scale: { start: 0.9, end: 0 }, lifespan: 250, tint: [0xff8c42, 0xf2b84b], frequency: 20 }).setDepth(8999)
    const d = Phaser.Math.Distance.Between(x, y, target.x, target.y)
    this.tweens.add({ targets: b, x: () => target.x, y: () => target.y - 8, duration: Math.max(120, d / 0.9), onComplete: () => { b.destroy(); trail.destroy(); onHit() } })
  }

  smashFx(x: number, y: number) {
    this.cameras.main.shake(200, 0.01)
    const ring = this.add.circle(x, y + 10, 20).setStrokeStyle(8, COLORS.gold, 0.95).setDepth(9000)
    this.tweens.add({ targets: ring, radius: RULES.smashRadius, alpha: 0, duration: 280, onComplete: () => ring.destroy() })
    this.burst(x, y + 10, COLORS.gold, 24, 320)
    this.tweens.add({ targets: this.hero.sprite, y: y - 40, duration: 110, yoyo: true, ease: 'Quad.easeOut' })
  }

  damageNumber(x: number, y: number, n: number, crit: boolean, onHero = false, heal = false, colorOverride?: string) {
    const color = colorOverride ?? (heal ? '#6fd08c' : onHero ? '#ff7a7a' : crit ? '#f2b84b' : '#f6eedc')
    const t = this.add.text(x + Phaser.Math.Between(-8, 8), y, heal ? `+${n}` : crit ? `${n}!` : `${n}`, {
      fontFamily: FONT_NUM, fontSize: crit ? '30px' : '22px', color, stroke: '#14172b', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(9999)
    if (crit) t.setScale(1.6)
    this.tweens.add({ targets: t, y: y - 42, scale: 1, duration: 260, ease: 'Back.easeOut' })
    this.tweens.add({ targets: t, alpha: 0, delay: 420, duration: 260, onComplete: () => t.destroy() })
  }

  /** Short word that pops and fades (MISS, LUCKY!, drops). */
  floatText(x: number, y: number, s: string, color: string) {
    const t = this.add.text(x, y, s, { fontFamily: FONT_UI, fontSize: '18px', fontStyle: 'bold', color, stroke: '#14172b', strokeThickness: 5 }).setOrigin(0.5).setDepth(9999)
    this.tweens.add({ targets: t, y: y - 34, alpha: 0, delay: 250, duration: 600, onComplete: () => t.destroy() })
  }

  burst(x: number, y: number, color: number, n: number, speed: number) {
    const p = this.add.particles(x, y, 'dot', {
      speed: { min: speed * 0.3, max: speed }, angle: { min: 0, max: 360 }, scale: { start: 0.9, end: 0 },
      lifespan: 420, tint: [color, 0xffffff], quantity: n, emitting: false,
    }).setDepth(9000)
    p.explode(n)
    this.time.delayedCall(600, () => p.destroy())
  }

  dropCoins(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const img = this.add.image(x, y, 'coin').setDepth(y)
      const c: Coin = { img, magnet: false, speed: 120 }
      this.coins.push(c)
      this.tweens.add({
        targets: img, x: x + Phaser.Math.Between(-36, 36), y: y + Phaser.Math.Between(-24, 24), duration: 300, ease: 'Quad.easeOut',
        onComplete: () => this.time.delayedCall(250, () => (c.magnet = true)),
      })
    }
  }

  callout(text: string, x: number, y: number) {
    const t = this.add.text(x, y, text, { fontFamily: FONT_UI, fontSize: '22px', fontStyle: 'bold', color: '#f2b84b', stroke: '#14172b', strokeThickness: 6 })
      .setOrigin(0.5).setDepth(9999)
    this.tweens.add({ targets: t, y: y - 20, alpha: 0, delay: 1300, duration: 500, onComplete: () => t.destroy() })
  }

  private banner(title: string, sub: string) {
    const c = this.add.container(W / 2, H / 2 - 40).setDepth(10000)
    const bg = this.add.rectangle(0, 0, W, 92, COLORS.night, 0.72)
    const t1 = this.add.text(0, -14, title, { fontFamily: FONT_UI, fontSize: '32px', fontStyle: 'bold', color: '#f6eedc' }).setOrigin(0.5)
    const t2 = this.add.text(0, 24, sub, { fontFamily: FONT_UI, fontSize: '17px', color: '#a9a6c7' }).setOrigin(0.5)
    c.add([bg, t1, t2]).setAlpha(0)
    this.tweens.add({ targets: c, alpha: 1, duration: 200, yoyo: true, hold: 1100, onComplete: () => c.destroy() })
  }

  // ---------- input ----------
  private setupInput() {
    this.keys = this.input.keyboard!.addKeys({ SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE }) as typeof this.keys
    this.input.addPointer(1)
    // any tap/click on the arena = Smash (buttons on top catch their own pointer events first)
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.phase !== 'play') return
      if (this.fsBtn && this.fsBtn.getBounds().contains(p.x, p.y)) return
      if (this.pauseBtn && this.pauseBtn.getBounds().contains(p.x, p.y)) return
      this.smashQueued = true
    })
  }

  // ---------- HUD ----------
  private buildHud() {
    this.hud = this.add.graphics().setDepth(15000)
    const txt = (x: number, y: number, size: number, color = '#f6eedc') =>
      this.add.text(x, y, '', { fontFamily: FONT_NUM, fontSize: `${size}px`, color, stroke: '#14172b', strokeThickness: 4 }).setDepth(15001)
    this.hpText = txt(22, 13, 16)
    this.zenyText = txt(W - 20, 13, 20, '#f2b84b').setOrigin(1, 0)
    this.coinIcon = this.add.image(W - 60, 25, 'coin').setDepth(15001).setScale(1.2)
    this.roomText = this.add.text(18, 78, '', { fontFamily: FONT_UI, fontSize: '16px', color: '#f6eedc', stroke: '#14172b', strokeThickness: 4 }).setDepth(15001)
    this.levelText = txt(22, 39, 13, '#a9a6c7')
    this.buildText = this.add.text(W / 2, 14, '', { fontFamily: FONT_UI, fontSize: '18px', color: '#f6eedc', stroke: '#14172b', strokeThickness: 4 }).setOrigin(0.5, 0).setDepth(15001)
    this.buildFullscreenButton()
    this.bossName = this.add.text(W / 2, H - 52, 'ราชาเจลล็อป', { fontFamily: FONT_UI, fontSize: '16px', fontStyle: 'bold', color: '#f2b84b', stroke: '#14172b', strokeThickness: 4 }).setOrigin(0.5).setDepth(15001).setVisible(false)
  }

  private fsBtn?: Phaser.GameObjects.Container
  private buildFullscreenButton() {
    this.fsBtn = fullscreenButton(this, W - 30, 66)
    // pause / leave: under the fullscreen button
    const b = this.add.container(W - 30, this.fsBtn ? 110 : 66).setDepth(15003).setSize(44, 44).setInteractive({ useHandCursor: true })
    const g = this.add.graphics()
    g.fillStyle(COLORS.night, 0.7).fillRoundedRect(-17, -17, 34, 34, 6)
    g.fillStyle(COLORS.cream, 0.9).fillRect(-7, -9, 5, 18).fillRect(2, -9, 5, 18)
    b.add(g)
    b.on('pointerup', () => this.showPause())
    this.input.keyboard!.on('keydown-ESC', () => this.showPause())
    this.pauseBtn = b
  }

  private freeze(on: boolean) {
    if (on) { this.physics.world.pause(); this.time.paused = true; this.tweens.pauseAll() }
    else { this.physics.world.resume(); this.time.paused = false; this.tweens.resumeAll() }
  }

  private showPause() {
    if (this.phase !== 'play') return
    this.phase = 'pick'
    this.freeze(true)
    this.panel([
      { text: 'พักก่อน', size: 40, color: '#f2b84b', bold: true },
      { text: `ห้อง ${this.roomIndex + 1}/${DUNGEON.rooms.length} · เก็บได้ ${this.zeny} zeny · ${this.kills} ตัว`, size: 19 },
      { text: 'กลับเมืองตอนนี้ได้ zeny กับ EXP ที่เก็บมาแล้วครบ ไม่หายค่ะ', size: 16, color: '#a9a6c7' },
    ], 'ลุยต่อ', () => {
      this.overlay?.destroy(); this.overlay = undefined
      this.freeze(false)
      this.phase = 'play'
    }, { label: 'กลับเมือง', onGo: () => { this.freeze(false); this.settle(false); go(this, 'hub') } })
  }

  /** Bank this run's zeny / EXP into the save (once). Returns lines for the result panel. */
  private settle(won: boolean): string {
    if (this.settled) return ''
    this.settled = true
    const s = save()
    const lines: string[] = []
    s.zeny += this.zeny
    s.bestRoom = Math.max(s.bestRoom, this.roomIndex + (won ? 1 : 0))
    let gems = 0
    if (won) {
      gems += s.clears === 0 ? FREE_GEMS.firstClear : FREE_GEMS.clear
      s.clears++
    }
    const before = s.gems
    const ups = addXp(this.runXp)
    s.gems += gems + this.runGems
    persist()
    lines.push(`+${this.zeny} zeny · +${this.runXp} EXP${s.gems > before ? ` · +${s.gems - before} เพชร` : ''}`)
    if (ups.base) lines.push(`🎉 Base Lv ${s.baseLevel}! ได้แต้มสถานะเพิ่ม`)
    if (ups.job) lines.push(`✨ Job Lv ${s.jobLevel}! ได้แต้มสกิลเพิ่ม`)
    return lines.join('\n')
  }

  private drawHud() {
    const g = this.hud.clear()
    // hero HP
    const hpW = 200, pct = this.hero.hp / this.hero.maxHp
    g.fillStyle(COLORS.night, 0.8).fillRoundedRect(12, 10, hpW + 8, 26, 6)
    g.fillStyle(COLORS.hpBack).fillRoundedRect(16, 14, hpW, 18, 4)
    g.fillStyle(pct > 0.3 ? COLORS.hp : 0xff9a3c).fillRoundedRect(16, 14, Math.max(0, hpW * pct), 18, 4)
    this.hpText.setText(`HP ${this.hero.hp}/${this.hero.maxHp}`)
    this.zenyText.setText(`${this.zeny}`)
    this.coinIcon.x = this.zenyText.x - this.zenyText.width - 14

    // boss bar along the bottom
    const boss = this.monsters.find((m) => m.def.ai === 'boss')
    if (boss) {
      const bw = W * 0.6, bx = (W - bw) / 2, by = H - 38
      g.fillStyle(COLORS.night, 0.85).fillRoundedRect(bx - 4, by - 4, bw + 8, 22, 6)
      g.fillStyle(COLORS.hpBack).fillRect(bx, by, bw, 14)
      g.fillStyle(COLORS.gold).fillRect(bx, by, bw * Math.max(0, boss.hp / boss.def.hp), 14)
    }

    // small HP bars above damaged monsters
    for (const m of this.monsters) {
      if (m.dead || m.def.ai === 'boss' || m.hp >= m.def.hp) continue
      const w = m.def.radius * 2.2, x = m.x - w / 2, y = m.y - m.def.radius - 16
      g.fillStyle(COLORS.night, 0.8).fillRect(x - 1, y - 1, w + 2, 6)
      g.fillStyle(COLORS.hp).fillRect(x, y, w * (m.hp / m.def.hp), 4)
    }

    // xp bar under HP
    const need = RULES.xpNeed(this.level)
    const res = RESOURCES[this.hero.resType]
    g.fillStyle(COLORS.night, 0.8).fillRoundedRect(12, 38, hpW + 8, 16, 4)
    g.fillStyle(0x1d2140).fillRect(16, 42, hpW, 8)
    g.fillStyle(res.color).fillRect(16, 42, hpW * Math.min(1, this.hero.res / this.hero.st.maxRes), 8)
    g.fillStyle(COLORS.night, 0.8).fillRoundedRect(12, 56, hpW + 8, 14, 4)
    g.fillStyle(0x2a3b6b).fillRect(16, 60, hpW, 6)
    g.fillStyle(0x7fd7ff).fillRect(16, 60, hpW * Math.min(1, this.xp / need), 6)
    this.levelText.setText(`${res.name} ${Math.floor(this.hero.res)}  ·  Lv ${this.level}`).setPosition(hpW + 24, 40)
    this.buildText.setText(this.hero.buildText())

    // Smash: ring that fills as it recharges. Tap anywhere / Space.
    const dx = W - 80, dy = H - 90, r = 40
    const ready = this.hero.canSmash ? 1 : Math.min(this.hero.smashReady, 0.999)
    g.fillStyle(COLORS.night, 0.7).fillCircle(dx, dy, r)
    if (ready >= 1) g.fillStyle(COLORS.gold, 0.25).fillCircle(dx, dy, r - 4)
    g.lineStyle(5, ready >= 1 ? COLORS.gold : 0x6b6f99, 1)
    g.beginPath(); g.arc(dx, dy, r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, ready)); g.strokePath()
    if (!this.dashLabel) this.dashLabel = this.add.text(0, 0, '', { fontFamily: FONT_UI, fontSize: '14px', fontStyle: 'bold', color: '#f6eedc', align: 'center' }).setOrigin(0.5).setDepth(15002)
    const noRes = this.hero.smashReady >= 1 && !this.hero.canSmash
    this.dashLabel.setPosition(dx, dy).setText(ready >= 1 ? 'ทุบ!\nSpace' : noRes ? `${res.name}\nไม่พอ` : `${Math.ceil((1 - this.hero.smashReady) * this.hero.st.smashCd / 1000)}`)
  }
  private dashLabel?: Phaser.GameObjects.Text

  // ---------- overlays ----------
  private panel(lines: { text: string; size: number; color?: string; bold?: boolean }[], button: string, onGo: () => void, alt?: { label: string; onGo: () => void }) {
    this.overlay?.destroy()
    const c = this.add.container(W / 2, H / 2).setDepth(30000)
    const shade = this.add.rectangle(0, 0, W, H, COLORS.night, 0.82).setInteractive()
    c.add(shade)
    let y = -((lines.length * 40) / 2) - 30
    for (const l of lines) {
      const t = this.add.text(0, y, l.text, { fontFamily: l.size > 30 ? FONT_NUM : FONT_UI, fontSize: `${l.size}px`, fontStyle: l.bold ? 'bold' : 'normal', color: l.color ?? '#f6eedc', align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0)
      c.add(t)
      y += t.height + 12
    }
    const btn = this.add.container(alt ? 140 : 0, y + 34)
    const bg = this.add.rectangle(0, 0, 260, 56, COLORS.gold).setStrokeStyle(3, 0x8d6a1f)
    const label = this.add.text(0, 0, button, { fontFamily: FONT_UI, fontSize: '22px', fontStyle: 'bold', color: '#2b2238' }).setOrigin(0.5)
    btn.add([bg, label]).setSize(260, 56).setInteractive({ useHandCursor: true })
    this.tweens.add({ targets: btn, scale: 1.05, duration: 600, yoyo: true, repeat: -1 })
    c.add(btn)
    const go = () => { this.input.keyboard!.off('keydown-ENTER', go); this.input.keyboard!.off('keydown-SPACE', go); onGo() }
    btn.on('pointerdown', () => go())
    if (alt) {
      const b2 = this.add.container(-140, y + 34)
      const bg2 = this.add.rectangle(0, 0, 240, 56, 0x5a5f8a).setStrokeStyle(3, 0x2c2f4a)
      const l2 = this.add.text(0, 0, alt.label, { fontFamily: FONT_UI, fontSize: '22px', fontStyle: 'bold', color: '#f6eedc' }).setOrigin(0.5)
      b2.add([bg2, l2]).setSize(240, 56).setInteractive({ useHandCursor: true })
      b2.on('pointerdown', () => { this.input.keyboard!.off('keydown-ENTER', go); this.input.keyboard!.off('keydown-SPACE', go); alt.onGo() })
      c.add(b2)
    }
    this.input.keyboard!.once('keydown-ENTER', go)
    this.input.keyboard!.once('keydown-SPACE', go)
    this.overlay = c
  }

  private showGameOver() {
    const room = this.roomIndex + 1
    const rewards = this.settle(false)
    this.panel([
      { text: 'ล้มแล้ว...', size: 44, color: '#ff7a7a', bold: true },
      { text: `ไปถึงห้อง ${room}/${DUNGEON.rooms.length} · ล้มมอนไป ${this.kills} ตัว`, size: 19 },
      { text: rewards, size: 19, color: '#f2b84b' },
      { text: 'ของที่เก็บมาไม่หาย! ลองซื้ออาวุธหรือลงแต้มสถานะที่เมือง แล้วมาใหม่นะ', size: 16, color: '#a9a6c7' },
    ], 'ลองอีกครั้ง', () => this.startRun(), { label: 'กลับเมือง', onGo: () => go(this, 'hub') })
  }

  private showWin() {
    this.phase = 'over'
    const secs = Math.round((this.time.now - this.startedAt) / 1000)
    const rewards = this.settle(true)
    this.panel([
      { text: 'เคลียร์ดันแล้ว!', size: 44, color: '#f2b84b', bold: true },
      { text: `ล้มราชาเจลล็อปได้ใน ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} นาที · ${this.kills} ตัว · HP เหลือ ${this.hero.hp}`, size: 19 },
      { text: rewards, size: 19, color: '#f2b84b' },
      { text: `build: ${this.hero.buildText()} · Lv ${this.level}`, size: 16, color: '#a9a6c7' },
    ], 'ลุยอีกรอบ', () => this.startRun(), { label: 'กลับเมือง', onGo: () => go(this, 'hub') })
  }

  // ---------- loop ----------
  update(_t: number, dt: number) {
    dt = Math.min(dt, 50)
    if (this.phase === 'play' || this.phase === 'transition') {
      const smash = this.phase === 'play' && (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || this.smashQueued)
      this.smashQueued = false
      const goal = this.cleared ? { x: W / 2, y: TILE * 0.6 } : undefined
      this.hero.update(dt, smash, this.monsters, goal)
      for (const m of [...this.monsters]) m.update(dt)
      this.updateCoins(dt)
      if (this.cleared && this.phase === 'play' && this.hero.y < TILE * 1.1) this.goNextRoom()
    }
    this.drawHud()
  }

  private updateCoins(dt: number) {
    for (const c of [...this.coins]) {
      if (!c.magnet) continue
      c.speed += dt * 1.2
      const d = Phaser.Math.Distance.Between(c.img.x, c.img.y, this.hero.x, this.hero.y)
      if (d < 18) {
        c.img.destroy()
        this.coins = this.coins.filter((x) => x !== c)
        this.zeny++
        sfx.coin()
        continue
      }
      const step = Math.min(d, (c.speed * dt) / 1000)
      c.img.x += ((this.hero.x - c.img.x) / d) * step
      c.img.y += ((this.hero.y - c.img.y) / d) * step
    }
  }

  private goNextRoom() {
    this.phase = 'transition'
    this.cameras.main.fadeOut(220, 20, 23, 43)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.coins.forEach((c) => c.img.destroy()); this.coins = []
      this.enterRoom(this.roomIndex + 1)
      this.cameras.main.fadeIn(260, 20, 23, 43)
    })
  }
}
