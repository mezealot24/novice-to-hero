import Phaser from 'phaser'
import { afterDef, BATTLE, COLORS, COMMON_PERKS, hitChance, DUNGEONS, FONT_NUM, FONT_UI, H, MONSTERS, PERKS, perkDesc, PLAYER, RULES, SET_BONUS, TAGS, W, type BossPhase, type DungeonDef, type HitFx, type MonSkill, type MonsterDef, type MonsterKind, type Perk, type Stats, type Tag } from '../data/game-data'
import { EVENT_RULES, rollEvent, type EventDef } from '../data/events'
import { COSTUMES, FREE_GEMS, heroStats, PER_POINT, RESOURCES, totalBase } from '../data/meta'
import { cardById, cardName, cardPityMax, cardRate, cardsOfMonster } from '../data/cards'
import { JOBS, MAGE_SPELL, RES_RULES, SWORD_MANA, type JobDef } from '../data/jobs'
import { skill2Picked } from '../data/tree'
import type { Skill2Def } from '../data/skill2'
import { addCard, addXp, persist, save } from '../save'
import { hellEff, MINI_POOL, MINI_RELICS, RELIC_RULES, RELICS, type RelicId } from '../data/relics'
import { sfx, unlock } from '../sfx'
import { button, fullscreenButton, go, type Btn } from '../ui'

// Side-scroll, turn-based (Capybara Go-like): the hero walks right, meets a group, and everyone
// takes turns by speed (AGI). The player's job: the build (1-of-3 cards) and when to fire Smash.

const GROUND = 430 // feet line
const HERO_X = 220
const SLOT_X = [560, 660, 760, 850] // monster formation, front first
const FACES_RIGHT: MonsterKind[] = ['wolf', 'shadowwolf', 'boar', 'alpha', 'hunter'] // textures drawn facing right; flip to face the hero

interface Mon {
  kind: MonsterKind; def: MonsterDef; spr: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image
  hp: number; gauge: number; dead: boolean; slot: number; turns: number; charging: boolean; summoned: boolean
  chargeDmg: number // damage taken during the current charge (BREAK check)
  burnStacks: number; burnStackTurns: number // Mage fire ult: stacking burn
  chill: number; frozen: boolean // Mage ice ult: chill = slowed turns left, frozen = skips its next turn
  burn: number; burnTurns: number; poison: number; poisonDmg: number; dotTxt?: Phaser.GameObjects.Text
  marked?: number // Cleric ★ judgement: turns of +15% damage taken
  parry: boolean // duelist stance: the next hero hit is parried
  ice: number; iceChance: number; iced: boolean // Ice Age: turns left, freeze chance this turn, attack is weakened this turn
  hell: number // Hellfire stacks (no cap)
  harvestMark: number // Soul Harvest: boss HP steps already counted
  // ----- Dungeon 4-5: skills, phases (design/dungeon-4-5-brutal.md) -----
  shield: number // absorbs hero damage first
  atkUp: number; atkUpTurns: number // warcry: + damage share for its own next N turns
  phase: number // boss phases entered so far
  speedMul: number; dmgMul: number; reflect: number; chargeEvery: number
  skills: MonSkill[]; onHit?: HitFx; slamFx?: HitFx
  revived: boolean // came back once (necro): can't be raised again
  weakTurns: number; weakPct: number // hero Skill 2 ท้าทาย: hits weaker for its next N turns
}
type Element = 'lightning' | 'fire' | 'ice'
const BOLT_MAX_LV = 5 // Lightning Bolt card: Lv1 + 4 repeats (design/skill-tree-mage.md)
const ELEMENTS: Record<Element, { icon: string; name: string; sub: string }> = {
  lightning: { icon: '⚡', name: 'สายฟ้า', sub: 'เป้าเดียว ฟาด 6 ฮิต (0.3–1.2x ต่อฮิต) ฆ่าบอส' },
  fire: { icon: '🔥', name: 'ไฟ', sub: 'ดาเมจกลาง 2x + เผาซ้อน (ลดฮีลศัตรู)' },
  ice: { icon: '❄️', name: 'น้ำแข็ง', sub: 'ดาเมจ 1.6x + ช้าลง · โดนซ้ำแช่แข็ง' },
}
type Actor = { hero: true } | { hero: false; m: Mon }
const MINI_HINT: Record<string, string> = {
  duelist: 'ตั้งท่าปัดเมื่อไหร่ ตีครั้งแรกจะโดนปัด+สวน · อย่าใช้ท่าไม้ตายตอนนั้น',
  hunter: 'ดูดเลือดทุกครั้งที่กัด · HP ต่ำกว่าครึ่งจะคลั่ง เร็วขึ้น · ไฟตัดฮีลได้',
  gunner: 'ยิงรัว 3 นัด (Flee ช่วยหลบทีละนัด) · ชาร์จจรวดยักษ์ = ต้อง BREAK หรือกัน',
  drainer: 'เวทดูดชีวิต · ต่ำกว่าครึ่งฟื้น HP ทุกเทิร์น · ชาร์จแล้ว BREAK ให้ทัน',
  venomqueen: 'กัดติดพิษ · พ่นใยทำให้ใช้ท่าไม้ตายไม่ได้ 2 เทิร์น · ชาร์จห่อใย = โดนมัดเสียเทิร์น · ครึ่งเลือดฟักลูก',
  frostgiant: 'P.DEF สูงมาก (คริ/เวททะลุ) · ทุกทีเกราะเราแตก · ชาร์จทุก 3 เทิร์น ทุบแล้วแข็ง · 40% ได้เกราะน้ำแข็ง',
  mirage: 'สะท้อนดาเมจ 30% (ตีแรงเจ็บเอง) · ตีทีเราอ่อนแรง · ครึ่งเลือดแตกเศษกระจกที่ระเบิดได้',
  warlord: 'ทุก 3 เทิร์นคลั่งเลือดแรงขึ้นสะสม! ต้องจบไว · ดูดเลือด · ต่ำกว่า 30% เร็วมาก',
}
const FX_ICON: Record<keyof HitFx, string> = { poison: '☠️', burn: '🔥', weaken: '💔', armorBreak: '🛡️💥', silence: '🤐', freeze: '❄️' }

export class BattleScene extends Phaser.Scene {
  // hero
  private st!: Stats
  private hp = 0
  private smashCdLeft = 0 // hero turns until Smash is ready (Novice: cooldown, no resource)
  private heroGauge = 0
  private heroSpr!: Phaser.GameObjects.Image
  private perks: Perk[] = []
  private hits = 0
  // run
  private mons: Mon[] = []
  private room = 0
  private level = 1
  private xp = 0
  private zeny = 0
  private kills = 0
  private runXp = 0
  private runGems = 0
  private runCards: string[] = [] // equipment cards found this run (kept win or lose)
  private cardLuck = 1 // LUK bonus on card drops (same curve as rare drops)
  private settled = false
  private over = false
  private paused = false
  private smashQueued = false
  private runId = 0
  private startedAt = 0
  // view
  private far!: Phaser.GameObjects.TileSprite
  private mid!: Phaser.GameObjects.TileSprite
  private ground!: Phaser.GameObjects.TileSprite
  private hud!: Phaser.GameObjects.Graphics
  private hudTxt!: Record<'hp' | 'res' | 'lv' | 'zeny' | 'room' | 'build', Phaser.GameObjects.Text>
  private queueIcons: Phaser.GameObjects.Image[] = []
  private smashBtn!: Btn
  private speedBtn!: Btn
  private overlay?: Phaser.GameObjects.Container
  private fast = false

  constructor() { super('battle') }

  private dg: DungeonDef = DUNGEONS[0]
  /** Bot / test hook: the open choice (event or card) picks option i. */
  pendingPick?: (i: number) => void
  eventLog: string[] = []
  /** Playtest counters (bots read these). */
  breakCount = 0
  counterCount = 0
  /** Hero turns used in the current fight, and the fight's limit (Q: no endless tank stalling). */
  fightTurns = 0
  turnLimit = 20
  timedOut = false
  turnsLog: number[] = [] // hero turns per fight this run (bots read it)
  peakTurns = 0 // most hero turns any fight in this run took (bots read it)
  comboCount = 0
  /** Mage: ultimate element, picked at the start of each run. */
  element: Element = 'fire'
  /** Mage: the element picked at run start; the card pool follows it (the วงล้อธาตุ talent only rotates the ult). */
  runElement: Element | null = null
  revivedCount = 0
  /** Dungeon 3: top-tier skill won from the mini boss this run, and which mini boss was drawn. */
  relic: RelicId | null = null
  miniKind: MonsterKind | null = null
  miniWon = false
  testRelic?: RelicId
  minHpPct = 1 // playtest: lowest HP share this run
  parryCount = 0
  freezeCount = 0
  private enemyAttacks = 0
  private harvest = 0
  /** Dungeon 4-5 debuffs on the hero (counts are hero turns, poison = stacks). */
  hx = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0 }
  debuffCount = 0 // playtest: debuffs that landed this run
  resistCount = 0
  private roomStart = 0
  private debuffTxt?: Phaser.GameObjects.Text

  init(data?: { d?: number }) {
    this.dg = DUNGEONS[data?.d ?? 0] ?? DUNGEONS[0]
    this.mons = []; this.queueIcons = []; this.overlay = undefined; this.paused = false; this.over = false
    this.time.paused = false
  }

  create() {
    this.makeBackdrop()
    this.heroSpr = this.add.image(HERO_X, GROUND, 'novice').setOrigin(0.5, 1).setScale(2).setDepth(GROUND)
    this.add.image(HERO_X, GROUND + 2, 'shadow').setScale(1, 1.2).setDepth(GROUND - 1)
    this.buildHud()
    this.cameras.main.fadeIn(200, 20, 23, 43)
    this.input.keyboard!.on('keydown-SPACE', () => this.queueSmash())
    this.input.keyboard!.on('keydown-ESC', () => this.showPause())
    ;(window as unknown as { __battle: BattleScene }).__battle = this
    this.startRun()
  }

  // ---------- backdrop ----------
  private makeBackdrop() {
    if (!this.textures.exists('bg_far')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false)
      g.fillStyle(0x3a4a7a).fillTriangle(0, 200, 160, 40, 320, 200).fillTriangle(220, 200, 420, 70, 640, 200)
      g.fillStyle(0x2f3d68).fillTriangle(480, 200, 640, 90, 800, 200)
      g.generateTexture('bg_far', 640, 200); g.clear()
      for (let i = 0; i < 8; i++) {
        const x = i * 60 + 20, h = 70 + ((i * 37) % 40)
        g.fillStyle(0x5a3a2a).fillRect(x + 12, 160 - 30, 8, 30)
        g.fillStyle(i % 2 ? 0x2f6a44 : 0x3a7a4e).fillCircle(x + 16, 160 - h * 0.6, h * 0.45)
      }
      g.generateTexture('bg_mid', 480, 160); g.destroy()
    }
    const sky = this.add.graphics().setDepth(-100)
    const [top, bottom] = this.dg.sky
    sky.fillGradientStyle(top, top, bottom, bottom, 1).fillRect(0, 0, W, GROUND - 40)
    this.far = this.add.tileSprite(0, GROUND - 230, W, 200, 'bg_far').setOrigin(0).setDepth(-90).setAlpha(0.9).setTint(this.dg.hills)
    this.mid = this.add.tileSprite(0, GROUND - 170, W, 160, 'bg_mid').setOrigin(0).setDepth(-80).setTint(this.dg.hills)
    this.ground = this.add.tileSprite(0, GROUND - 20, W, H - GROUND + 20, 'grass0').setOrigin(0).setDepth(-70)
    if (this.dg.tier > 1) this.ground.setTint(0x9a90c0)
    this.add.rectangle(0, GROUND - 22, W, 6, 0x3d6e4c).setOrigin(0).setDepth(-69)
  }

  private scroll(px: number) {
    this.far.tilePositionX += px * 0.15
    this.mid.tilePositionX += px * 0.45
    this.ground.tilePositionX += px
  }

  // ---------- run flow ----------
  private async startRun() {
    unlock()
    const id = ++this.runId
    this.overlay?.destroy(); this.overlay = undefined
    this.mons.forEach((m) => this.removeMon(m)); this.mons = []
    const s = save()
    this.st = heroStats(s)
    this.hp = this.st.maxHp; this.smashCdLeft = 0; this.heroGauge = 0; this.zapCount = 0; this.emergencyUsed = false; this.firstOffer = true
    this.job = JOBS[s.job ?? 'novice']
    this.s2 = this.job.id === 'novice' ? undefined : skill2Picked(s.jobTree, this.job.id); this.s2Cd = 0
    this.buf = { guard: 0, blood: 0, hawk: 0, mshield: 0, renew: 0 }; this.s2Count = 0
    if (this.s2?.id === 'cl_spear') this.st.spearMul += 0.03 * this.st.s2Lv // หอกคม: +10%/lv of the 0.3x base
    this.res = this.job.resource === 'rage' ? 0 : this.resMax()
    this.shield = 0; this.dodgeCharges = 0; this.ctrCharges = 0
    this.heroSpr.setTexture(this.job.tex).setTint((COSTUMES.find((c) => c.id === s.costume) ?? COSTUMES[0]).tint).setAngle(0).setAlpha(1)
    this.perks = []; this.hits = 0
    this.level = 1; this.xp = 0; this.zeny = 0; this.kills = 0; this.runXp = 0; this.runGems = 0; this.runCards = []
    this.cardLuck = 1 + Math.min(PER_POINT.luk.dropCap, PER_POINT.luk.dropPct * totalBase(s).luk)
    this.settled = false; this.over = false; this.smashQueued = false
    this.startedAt = this.time.now
    this.eventLog = []; this.lockTarget = undefined; this.lockStacks = 0; this.hawkTurn = 0; this.breakCount = 0; this.revivedCount = 0; this.spears = 0; this.spearAcc = 0; this.ultRegenTurns = 0; this.smiteCount = 0; this.counterCount = 0; this.comboCount = 0; this.comboLevel = 0; this.lowShake = !!save().lowShake; this.peakTurns = 0; this.turnsLog = []
    this.minHpPct = 1; this.relic = null; this.miniKind = null; this.miniWon = false; this.parryCount = 0; this.freezeCount = 0; this.harvest = 0; this.enemyAttacks = 0
    this.hx = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0 }; this.debuffCount = 0; this.resistCount = 0
    const rooms = this.dg.rooms
    this.runElement = null
    if (this.job.id === 'mage') {
      const els = Object.keys(ELEMENTS) as Element[]
      const c = await this.choose({ id: 'camp', name: 'เลือกธาตุท่าไม้ตาย', icon: '🔮', desc: 'รอบนี้ "เวทธาตุ" จะใช้ธาตุไหน?', weight: 0, rare: false },
        els.map((e) => ({ label: `${ELEMENTS[e].icon} ${ELEMENTS[e].name}`, sub: ELEMENTS[e].sub })))
      if (id !== this.runId) return
      this.element = els[c]
      this.runElement = this.element
    }
    for (let i = 0; i < rooms.length; i++) {
      this.room = i
      await this.walk(i === 0 ? 700 : 1100)
      if (id !== this.runId) return
      await this.spawnRoom(i)
      const won = await this.fight(id)
      if (id !== this.runId) return
      if (!won) { this.over = true; await this.wait(700); this.showGameOver(); return }
      this.heal(this.st.maxHp * RULES.healOnClear)
      this.gainXp(RULES.xpOnClear); this.runXp += RULES.xpOnClear
      await this.levelUps()
      // the 1v1 mini boss gives a top-tier skill instead of an event; other waves (not the boss) lead to one event
      if (rooms[i].mini) { this.miniWon = true; await this.offerRelic(); if (id !== this.runId) return }
      else if (i < rooms.length - 1) { await this.postWaveEvent(); if (id !== this.runId) return }
    }
    this.over = true
    sfx.win()
    await this.wait(600)
    this.showWin()
  }

  private wait(ms: number) { return new Promise<void>((r) => this.time.delayedCall(ms, r)) }
  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig) { return new Promise<void>((r) => this.tweens.add({ ...cfg, onComplete: () => r() })) }

  /** Hero walks: the world scrolls past. */
  private async walk(ms: number) {
    const bob = this.tweens.add({ targets: this.heroSpr, y: GROUND - 8, duration: 160, yoyo: true, repeat: -1 })
    const ev = this.time.addEvent({ delay: 16, loop: true, callback: () => this.scroll(4) })
    await this.wait(ms)
    ev.remove(); bob.stop(); this.heroSpr.y = GROUND
  }

  private async spawnRoom(i: number) {
    if (this.job.resource === 'rage') this.res = Math.min(RES_RULES.rageMax, this.st.startRage) // talent: เลือดร้อน
    else if (this.st.startRage > 0) this.gainRes(this.st.startRage) // Swordsman on Mana: the same talent refills Mana at wave start
    const room = this.dg.rooms[i]
    const kinds: MonsterKind[] = []
    this.roomStart = this.mons.length
    if (room.mini) {
      const pool = room.miniPool ?? MINI_POOL
      this.miniKind = pool[Phaser.Math.Between(0, pool.length - 1)]
      const d = MONSTERS[this.miniKind]
      this.banner(`⚔️ ดวล 1-1 · ${d.name} ${d.title ?? ''}`, MINI_HINT[d.mini!])
      kinds.push(this.miniKind)
    } else {
      this.banner(room.title, room.boss ? 'บอสชาร์จพลัง = ตาเรา! ตีแรงพอจะ BREAK ยกเลิกท่า หรือกันด้วยท่าไม้ตาย' : 'ผลัดกันตีตามความเร็ว (AGI) · แตะปุ่มทุบเมื่อพร้อม')
      for (const [k, n] of room.spawn) for (let j = 0; j < n; j++) kinds.push(k)
    }
    kinds.slice(0, SLOT_X.length).forEach((k, j) => this.addMon(k, j))
    if (this.job.id === 'archer') { // archer talents: ก้าวถอย / สมาธิพราน
      if (this.st.arWaveDodge > 0) this.dodgeCharges = Math.max(this.dodgeCharges, this.st.arWaveDodge)
      if (this.st.arStartFull > 0) this.res = this.resMax()
    }
    if (this.st.mgWaveBarrier > 0) this.addShield(this.st.matk * this.st.mgWaveBarrier, true) // mage talent ลูกศิษย์น้ำแข็ง
    if (this.st.waveDodge > 0) this.dodgeCharges = Math.max(this.dodgeCharges, this.st.waveDodge) // Thief talent: ม่านควัน
    if (this.st.bossShield > 0 && this.mons.some((m) => !m.dead && m.def.ai === 'boss')) this.addShield(this.st.maxHp * this.st.bossShield) // cleric talent: ร่างพร
    if (this.st.spearStart > 0) this.spears += this.st.spearStart // cleric talent: หอกเปิดศึก
    if (this.st.waveShield > 0) { // gear: tops the shield up (never stacks) at every wave start
      const target = Math.round(this.st.maxHp * this.st.waveShield * (1 + this.st.shieldAmp))
      if (this.shield < target) { this.shield = target; this.floatText(HERO_X, GROUND - 100, `🛡️ โล่ ${target}`, '#9fe3ff') }
    }
    await this.wait(900)
  }

  private addMon(kind: MonsterKind, slot: number, gauge?: number) {
    const def = MONSTERS[kind]
    const big = def.ai === 'boss'
    const x = big ? 720 : SLOT_X[slot]
    const y = GROUND + (slot % 2 ? 14 : -4)
    const shadow = this.add.image(W + 80, y + 2, 'shadow').setScale((def.radius * 2.4) / 60 * 1.4, 1.2).setDepth(y - 1)
    const spr = this.add.image(W + 80, y, def.tex).setOrigin(0.5, 1).setScale(kind === 'minijellop' ? 1.1 : big ? 1.6 : 1.5).setDepth(y)
    if (FACES_RIGHT.includes(kind)) spr.setFlipX(true)
    const m: Mon = { kind, def, spr, shadow, hp: def.hp, gauge: gauge ?? Phaser.Math.Between(0, 40), dead: false, slot, turns: 0, charging: false, summoned: false, chargeDmg: 0, burnStacks: 0, burnStackTurns: 0, chill: 0, frozen: false, burn: 0, burnTurns: 0, poison: 0, poisonDmg: 0, parry: false, ice: 0, iceChance: 0, iced: false, hell: 0, harvestMark: 0,
      shield: 0, atkUp: 0, atkUpTurns: 0, phase: 0, speedMul: 1, dmgMul: 1, reflect: def.reflect ?? 0, chargeEvery: def.chargeEvery ?? BATTLE.slamEvery, skills: def.skills ?? [], onHit: def.onHit, slamFx: def.slamFx, revived: false, weakTurns: 0, weakPct: 0 }
    this.mons.push(m)
    this.tweens.add({ targets: [spr, shadow], x, duration: 600, ease: 'Quad.easeOut', delay: slot * 90 })
    return m
  }

  private removeMon(m: Mon) { m.spr.destroy(); m.shadow.destroy(); m.dotTxt?.destroy() }
  private alive() { return this.mons.filter((m) => !m.dead) }
  private smashTurns() { return Math.max(2, Math.round(this.st.smashCd / BATTLE.msPerTurn)) }
  private heroSpeed() { return BATTLE.heroSpeed * (this.st.aspd / PLAYER.aspd) * (this.relic === 'haste' ? 1 + RELIC_RULES.haste.speed : 1) }

  /** Who acts next: fill gauges until someone reaches 100 (ties go to the hero). */
  private nextActor(): Actor {
    const live = this.alive()
    for (;;) {
      if (this.heroGauge >= 100) { this.heroGauge -= 100; return { hero: true } }
      const m = live.filter((x) => x.gauge >= 100).sort((a, b) => b.gauge - a.gauge)[0]
      if (m) { m.gauge -= 100; return { hero: false, m } }
      this.heroGauge += this.heroSpeed()
      for (const x of live) x.gauge += this.monSpeed(x)
    }
  }

  private monSpeed(m: Mon) {
    const frenzy = m.def.mini === 'hunter' && m.hp < m.def.hp * BATTLE.frenzyAt ? BATTLE.frenzySpeed : 1
    return BATTLE.monSpeed[m.kind] * (m.chill > 0 ? Math.max(0.3, 0.6 - this.st.chillSlow) : 1) * frenzy * m.speedMul
  }

  /** Preview the next N turns for the queue strip (pure simulation on copies). */
  private previewQueue(n: number): (Mon | null)[] {
    const live = this.alive()
    let hg = this.heroGauge
    const g = new Map(live.map((m) => [m, m.gauge]))
    const out: (Mon | null)[] = []
    while (out.length < n && live.length) {
      if (hg >= 100) { hg -= 100; out.push(null); continue }
      const m = live.filter((x) => g.get(x)! >= 100).sort((a, b) => g.get(b)! - g.get(a)!)[0]
      if (m) { g.set(m, g.get(m)! - 100); out.push(m); continue }
      hg += this.heroSpeed()
      for (const x of live) g.set(x, g.get(x)! + this.monSpeed(x))
    }
    return out
  }

  private async fight(id: number): Promise<boolean> {
    this.fightTurns = 0; this.timedOut = false
    const room = this.dg.rooms[this.room]
    this.turnLimit = room?.turnLimit ?? (room?.boss ? BATTLE.bossTurnLimit : BATTLE.turnLimit)
    if (this.relic === 'iceage') this.castIceAge()
    if (this.relic === 'aegis') { // โล่อมตะ: shield at every fight start (tops up, never stacks)
      const want = Math.round(this.st.maxHp * RELIC_RULES.aegis.shield * (1 + this.st.shieldAmp))
      if (this.shield < want) { this.shield = want; this.floatText(HERO_X, GROUND - 100, `🛡️ โล่อมตะ ${want}`, '#9fe3ff') }
    }
    while (this.alive().length && this.hp > 0) {
      const a = this.nextActor()
      if (a.hero) {
        if (this.fightTurns >= this.turnLimit) { await this.timeUp(); return false }
        this.fightTurns++
        this.peakTurns = Math.max(this.peakTurns, this.fightTurns)
        const left = this.turnLimit - this.fightTurns
        if (left === 3 || left === 1) this.callout(`⏳ เหลืออีก ${left} เทิร์น!`, W / 2, 150)
        await this.heroTurn()
      } else await this.monTurn(a.m)
      if (id !== this.runId) return false
      await this.levelUps()
      await this.wait(90)
    }
    this.turnsLog.push(this.fightTurns)
    this.hx = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0 } // debuffs end with the fight
    return this.hp > 0
  }

  // ---------- hero turn ----------
  /** Dungeon 4-5: debuffs tick before the hero acts and count down after. */
  private async heroTurn() {
    const X = this.hx
    if (this.relic === 'purify') this.heal(this.st.maxHp * RELIC_RULES.purify.regen, true)
    if (X.poison > 0) { this.dotHurt(this.st.maxHp * BATTLE.poisonPct * X.poison, '☠️', '#b48aff'); X.poison-- }
    if (X.burn > 0 && this.hp > 0) this.dotHurt(this.st.maxHp * BATTLE.burnPct, '🔥', '#ff8c42')
    if (this.hp <= 0) return
    await this.heroAct()
    if (X.burn > 0) X.burn--
    if (X.weaken > 0) X.weaken--
    if (X.armorBreak > 0) X.armorBreak--
    if (X.silence > 0) X.silence--
    if (this.job.id !== 'cleric') return
    if (this.ultRegenTurns > 0) { this.ultRegenTurns--; this.heal(this.st.maxHp * this.st.ultRegen) } // cleric talent: พรยืนยาว
    this.spearAcc += this.st.spearRate
    while (this.spearAcc >= 1) { this.spearAcc--; this.spears++ }
    await this.fireSpears()
  }

  // ---------- Cleric: light spears (design/skill-tree-priest.md 3.1) ----------
  private spears = 0
  private spearAcc = 0
  private ultRegenTurns = 0
  private smiteCount = 0
  private async fireSpears() {
    const n = Math.min(8, this.spears); this.spears = 0
    if (!n || !this.alive().length || this.hp <= 0) return
    this.floatText(HERO_X + 30, GROUND - 140, `🔱 x${n}`, '#f6e27a')
    this.burst(700, GROUND - 40, 0xf6e27a, 10 + n * 2, 200)
    for (let i = 0; i < n; i++) {
      for (const m of this.alive()) this.strike(m, 0.3 + this.st.spearMul, true, '#f6e27a')
      if (this.st.spearHeal > 0) this.heal(this.st.maxHp * this.st.spearHeal, true)
    }
    await this.wait(BATTLE.stepMs * 0.3)
  }
  /** Skill heal (auto / ult): talents/tree turn it into shield and damage too. */
  private skillHeal(n: number) {
    const eff = n * (1 + this.st.healAmp)
    this.heal(n)
    if (this.st.healShield > 0) this.addShield(eff * this.st.healShield, true)
    const f = this.front()[0]
    if (this.st.atone > 0 && f) this.damageMon(f, Math.max(1, Math.round(eff * this.st.atone)), false, '#ffe08a') // tree ★A: ไฟชำระ
  }

  private async heroAct() {
    if (this.st.regen > 0) this.heal(this.st.maxHp * this.st.regen * BATTLE.regenPerTurn / 100, true)
    if (this.smashCdLeft > 0) this.smashCdLeft--
    if (this.relic === 'storm' && this.fightTurns % RELIC_RULES.storm.every === 0) { await this.lightningWrath(); if (!this.alive().length) return }
    // resource tick
    if (this.job.resource === 'mana') this.res = Math.min(this.resMax(), this.res + this.st.resRegen * RES_RULES.manaPerTurnMul * (1 - this.st.resRegenCut))
    this.overflow = this.st.mgOverflow > 0 && this.job.resource === 'mana' && this.res >= this.resMax() * 0.9 // mage talent พลังล้น
    if (this.st.boltHits > 0 && this.alive().length) await this.lightningBolt() // storm card: Lightning Bolt
    if (this.job.resource === 'energy') this.res = Math.min(this.resMax(), this.res + RES_RULES.energyPerTurn + this.st.arTurnRes)
    await this.skill2Turn()
    if (!this.alive().length || this.hp <= 0) return
    if (this.st.arHawk > 0 && ++this.hawkTurn % 3 === 0) { const t = this.alive(); if (t.length) { const m = t[Phaser.Math.Between(0, t.length - 1)]; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 20, '🦅', '#f2d24b'); this.strike(m, this.st.arHawk, true, '#f2d24b') } } // archer talent เหยี่ยวคู่ใจ
    if (this.smashQueued && this.smashCdLeft <= 0 && this.hx.silence > 0) this.floatText(HERO_X, GROUND - 140, `🤐 ใบ้! อีก ${this.hx.silence} เทิร์น`, '#c9a8ff')
    const ultCost = this.ultCost()
    const ultWaiting = this.smashQueued && this.smashCdLeft <= 0 && this.hx.silence <= 0 // ult ready and booked
    if (ultWaiting && this.res >= ultCost) {
      this.smashQueued = false
      this.smashCdLeft = this.ultTurns()
      this.res -= ultCost
      await (this.job.id === 'novice' ? this.smash() : this.ultimate())
      return
    }
    if (ultWaiting) this.floatText(HERO_X, GROUND - 140, `🔷 Mana ไม่พอ ult (${Math.floor(this.res)}/${ultCost})`, '#5aa0ff') // keep it booked, save Mana for it
    const autoCost = Math.max(10, this.job.auto.cost - this.st.autoCostCut)
    if (this.job.resource && !ultWaiting && this.res >= autoCost && this.alive().length) {
      this.res -= autoCost
      await this.autoSkill()
      return
    }
    await this.basicAttack()
  }

  private job: JobDef = JOBS.novice
  // ----- skill web v1: Skill 2 (data/skill2.ts, design/skill-web-v1.md) -----
  private s2?: Skill2Def
  private s2Cd = 0 // hero turns until Skill 2 can cast again
  private buf = { guard: 0, blood: 0, hawk: 0, mshield: 0, renew: 0 } // hero turns left on Skill 2 buffs
  private s2Count = 0 // casts this run (bot/debug)
  private s2Txt?: Phaser.GameObjects.Text // HUD line above the ult button
  private res = 0
  private shield = 0
  private dodgeCharges = 0
  private ctrCharges = 0 // Swordsman talent ท่าสวนพร้อม: sure counters left
  /** Mana the ult costs (Mage, Swordsman); 0 for every other job. */
  private ultCost() { return this.job.resource === 'mana' ? this.job.ult.cost ?? 0 : 0 }
  private resMax() { return this.job.resource === 'rage' ? RES_RULES.rageMax : this.job.resource === 'energy' ? RES_RULES.energyMax : this.st.maxRes }
  private ultTurns() {
    const cdCut = Math.round((PLAYER.smashCd - this.st.smashCd) / BATTLE.msPerTurn) // run pick สมาธินิ่ง: every job's ult, not just Novice Smash
    const t = this.job.id === 'novice' ? this.smashTurns() : Math.max(2, this.job.ult.cd + this.st.mgUltCd - cdCut)
    return this.relic === 'haste' ? Math.max(2, t - RELIC_RULES.haste.cd) : t
  }
  private overflow = false
  private zapCount = 0 // lightning hits this run (ประจุสะสม)
  private zapTurn = new Map<Mon, number>() // storm set: hits per target this turn
  private emergencyUsed = false
  private firstOffer = true
  private front() { return this.alive().sort((a, b) => a.slot - b.slot) }
  private gainRage(n: number) { if (this.job.resource === 'rage') this.res = Math.min(RES_RULES.rageMax, this.res + n * (1 + this.st.rageGain)) }
  /** Flat resource gain for Mana/Energy jobs (talents that used to give Rage). */
  private gainRes(n: number) { if (this.job.resource && this.job.resource !== 'rage') this.res = Math.min(this.resMax(), this.res + n) }
  private poisonMax() { return 12 + this.st.poisonCap }
  private burnMax() { return 10 + this.st.burnCap }
  private berserking() { return this.st.berserk > 0 && this.hp < this.st.maxHp * 0.3 }
  private lockTarget?: Mon
  private lockStacks = 0
  private hawkTurn = 0
  private ultFiring = false // archer: ult damage counts extra toward BREAK

  /** One physical/magic hit. RO-style crit: physical only, rolled first; a crit always hits (skips flee) and ignores DEF.
   *  Magic never misses and never crits. Returns damage dealt. */
  private strike(m: Mon, mul: number, magic = false, color?: string, pierce = 0): number {
    if (m.dead || this.hp <= 0) return 0
    const crit = Math.random() < (magic ? this.st.spellCrit : this.st.crit + (this.buf.hawk > 0 ? 0.2 + 0.05 * this.st.s2Lv : 0)) // magic crits only with spellCrit (talent/item/card) · Skill 2 ตาเหยี่ยว
    if (!magic && !crit && Math.random() > hitChance(this.st.hit, m.def.flee ?? 5)) { this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 6, 'MISS', '#a9a6c7'); return 0 }
    if (m.parry) { this.parried(m); return 0 }
    if (m.chill > 0 && this.st.brittle > 0) mul *= 1 + this.st.brittle // tree: ice "เปราะ"
    if (this.st.arLowHpBonus > 0 && m.hp < m.def.hp * 0.5) mul *= 1 + this.st.arLowHpBonus // archer talent เก็บตัวเปราะ r2
    if (crit && this.st.arCritRes > 0 && this.job.resource === 'energy') this.res = Math.min(this.resMax(), this.res + this.st.arCritRes) // archer talent ลมหายใจนักล่า
    const r = this.roll(mul, magic, crit)
    if (!magic && !crit) r.dmg = m.def.def ? Math.max(1, Math.round(afterDef(r.dmg, m.def.def * (1 - Math.min(1, pierce))))) : r.dmg
    this.damageMon(m, r.dmg, r.crit, color)
    if (!magic && this.st.poison > 0 && !m.dead) { m.poison = Math.min(this.poisonMax(), m.poison + this.st.poison); m.poisonDmg = this.st.poisonDmg; this.dotIcon(m) }
    if (this.relic === 'hellfire' && !m.dead) { m.hell++; this.dotIcon(m) }
    const ls = this.st.lifesteal + (this.buf.blood > 0 ? 0.15 + 0.05 * this.st.s2Lv : 0) // Skill 2 เลือดเดือด
    if (ls > 0) this.heal(r.dmg * ls * (this.berserking() ? 2 : 1), true)
    if (r.crit) sfx.crit(); else sfx.hit()
    this.gainRage(RES_RULES.rageOnHit)
    return r.dmg
  }

  private async lunge(m: Mon, fn: () => void) {
    const step = BATTLE.stepMs
    await this.tween({ targets: this.heroSpr, x: m.spr.x - 70, duration: step * 0.35, ease: 'Quad.easeIn' })
    this.slashFx(m.spr.x - 20, GROUND - 40)
    sfx.swing()
    fn()
    this.shake(60, 0.004)
    await this.tween({ targets: this.heroSpr, x: HERO_X, duration: step * 0.35, ease: 'Quad.easeOut' })
  }

  private async shoot(m: Mon, color: number, fn: () => void) {
    const b = this.add.image(HERO_X + 30, GROUND - 50, 'dot').setTint(color).setScale(2.2, 1.2).setDepth(9000)
    this.tweens.add({ targets: this.heroSpr, x: HERO_X - 8, duration: 80, yoyo: true })
    sfx.swing()
    await this.tween({ targets: b, x: m.spr.x, y: m.spr.y - 30, duration: 200 })
    b.destroy()
    fn()
  }

  /** Basic attack, then AGI combo: each success chains one more (up to BATTLE.comboMax). */
  private async basicAttack() {
    this.comboSum = { on: true, per: new Map() } // RO-style: each hit shows its own white number, the chain total pops big + yellow at the end
    await this.basicOnce()
    let hits = 1
    for (let n = 0; n < BATTLE.comboMax && this.alive().length && Math.random() < this.st.combo; n++) {
      this.comboCount++
      this.comboLevel = n + 2
      sfx.combo(n + 2)
      await this.basicOnce()
      hits++
    }
    this.comboLevel = 0
    this.comboSum.on = false
    let best: { dmg: number, x: number, y: number } | undefined // total for the monster that took the most (cleave splash shows only its own numbers)
    for (const v of this.comboSum.per.values()) if (!best || v.dmg > best.dmg) best = v
    if (hits >= 2 && best) this.comboTotal(best.x, best.y, best.dmg, hits)
  }

  private async basicOnce() {
    const live = this.front()
    let f = live[0]
    if (!f) return
    const kind = this.job.id
    if (kind === 'archer') {
      if (this.st.arSnipeLow > 0) { const low = live.slice().sort((a, b) => a.hp - b.hp)[0]; if (low) f = low } // talent เก็บตัวเปราะ
      let mul = 1
      if (this.st.lockOn > 0) { // tree: "ล็อกเป้า"
        this.lockStacks = this.lockTarget === f ? Math.min(5, this.lockStacks + 1) : 0
        this.lockTarget = f; mul += 0.08 * this.lockStacks
      }
      await this.shoot(f, 0xf6eedc, () => this.strike(f, mul))
    }
    else if (kind === 'mage') await this.shoot(f, 0x9f7bff, () => this.strike(f, MAGE_SPELL.basicMul, true, '#c9a8ff')) // weak free magic bolt; real damage = Mana spells
    else if (kind === 'thief') await this.lunge(f, () => { this.strike(f, 0.6); this.strike(f, 0.6) })
    else if (kind === 'cleric') await this.lunge(f, () => { this.strike(f, 1); this.strike(f, 0.9, true, '#f6e27a') }) // mace + holy spark (M.ATK); 0.6 -> 0.9 so Cleric beats the boss turn limit
    else await this.lunge(f, () => { const cl = BATTLE.cleave + this.st.cleaveAdd; if (live[1]) { this.strike(f, 1); this.strike(live[1], cl) } else this.strike(f, 1 + (kind === 'swordsman' ? cl : 0)) }) // novice, swordsman: cleave (+talent ฟันกวาด) · swordsman alone vs 1 monster: the cleave lands on it too
    this.hits++
    if (this.st.fireEvery > 0 && this.hits % this.st.fireEvery === 0) {
      if (this.job.id !== 'mage') await this.fireBolt()
      else if (this.res >= MAGE_SPELL.fireBolt) { this.res -= MAGE_SPELL.fireBolt; await this.fireBolt() } // Mage: card spells cost Mana
    }
  }

  /** Skill 2: buffs tick down, then it casts by itself (free extra action) when ready, paid for and useful. */
  private async skill2Turn() {
    const B = this.buf
    if (B.renew > 0) { B.renew--; this.heal(this.st.maxHp * (0.06 + 0.01 * this.st.s2Lv)) }
    for (const k of ['guard', 'blood', 'hawk', 'mshield'] as const) if (B[k] > 0) B[k]--
    const k = this.s2
    if (!k || this.hx.silence > 0 || !this.alive().length) return
    if (this.s2Cd > 0) { this.s2Cd--; return }
    if (this.res < k.cost) return
    if (this.smashQueued && this.smashCdLeft <= 0 && this.res - k.cost < this.ultCost()) return // keep Mana for the booked ult
    if (k.id === 'mg_mshield' && B.mshield > 0) return
    if (k.id === 'cl_renew' && (B.renew > 0 || this.hp >= this.st.maxHp * 0.9)) return
    if (k.id === 'sw_guard' && B.guard > 0) return
    this.res -= k.cost
    this.s2Cd = Math.max(1, k.cd - (k.id === 'cl_bless' && this.st.s2Star ? 1 : 0))
    this.s2Count++
    await this.castSkill2(k)
  }

  private async castSkill2(k: Skill2Def) {
    const lv = this.st.s2Lv, star = this.st.s2Star > 0, B = this.buf
    this.floatText(HERO_X, GROUND - 160, `${k.icon} ${k.name}`, '#7fd7ff')
    const front = () => this.front()[0]
    const bossFirst = () => this.alive().find((m) => m.def.ai === 'boss') ?? this.alive().sort((x, y) => y.hp - x.hp)[0]
    switch (k.id) {
      case 'sw_guard': B.guard = star ? 3 : 2; this.ctrCharges = Math.max(this.ctrCharges, star ? 2 : 1); this.floatText(HERO_X, GROUND - 100, '🛡️ ตั้งการ์ด', '#9fe3ff'); break
      case 'sw_blood': B.blood = 3; this.burst(HERO_X, GROUND - 40, 0xc0392b, 14, 160); break
      case 'sw_taunt':
        for (const m of this.alive()) { m.weakTurns = star ? 3 : 2; m.weakPct = 0.2 + 0.05 * lv; this.dotIcon(m) }
        if (star) this.gainRage(15)
        this.cameras.main.shake(80, 0.004)
        break
      case 'ar_rain':
        for (let w = 0; w < (star ? 2 : 1); w++) {
          this.burst(700, GROUND - 60, 0xf6eedc, 20, 240)
          for (const m of this.alive()) this.strike(m, 0.8 + 0.15 * lv)
          await this.wait(BATTLE.stepMs * 0.3)
        }
        break
      case 'ar_hawk': B.hawk = 3; break
      case 'ar_trap':
        for (const m of star ? this.alive() : [front()].filter(Boolean) as Mon[]) { this.strike(m, 0.6); m.gauge -= 30 + 10 * lv; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 20, '🪤', '#c9c9d6') }
        break
      case 'mg_mshield': B.mshield = star ? 5 : 3; this.floatText(HERO_X, GROUND - 100, '🔷 Mana Shield', '#5aa0ff'); break
      case 'mg_nova':
        this.burst(700, GROUND - 20, 0x9fe3ff, 30, 300)
        for (const m of this.alive()) {
          this.strike(m, 0.8 + 0.15 * lv, true, '#9fe3ff')
          if (m.dead) continue
          m.chill = Math.max(m.chill, 2 + (star ? 1 : 0)); if (star) m.gauge -= 15
          if (!m.charging) m.spr.setTint(0x9fe3ff); this.dotIcon(m)
        }
        await this.wait(BATTLE.stepMs * 0.3)
        break
      case 'mg_arcane': {
        let t = bossFirst()
        for (let i = 0; i < 3 + (star ? 2 : 0); i++) {
          if (!t || t.dead) { t = bossFirst(); if (!t) break }
          const m = t
          await this.shoot(m, 0xc9a8ff, () => this.strike(m, 0.6 + 0.1 * lv, true, '#c9a8ff'))
        }
        break
      }
      case 'cl_renew': B.renew = star ? 6 : 4; this.burst(HERO_X, GROUND - 40, 0x6fd08c, 14, 160); break
      case 'cl_bless': this.addShield(this.st.maxHp * (0.2 + 0.04 * lv)); break
      case 'cl_spear': this.spears += star ? 4 : 2; break // "+" node: spearMul set at run start
      case 'th_smoke':
        this.dodgeCharges = Math.max(this.dodgeCharges, star ? 2 : 1)
        if (lv > 0) this.heal(this.st.maxHp * 0.03 * lv)
        this.burst(HERO_X, GROUND - 40, 0xc9c9d6, 16, 180)
        break
      case 'th_pick': {
        const m = front(); if (!m) break
        await this.lunge(m, () => {
          this.strike(m, star ? 1.6 : 1)
          if (star && !m.dead) { m.poison = Math.min(this.poisonMax(), m.poison + 3); m.poisonDmg = Math.max(m.poisonDmg, this.st.poisonDmg); this.dotIcon(m) }
        })
        this.res = Math.min(this.resMax(), this.res + 15 + 5 * lv)
        break
      }
      case 'th_wound': {
        const m = front(); if (!m) break
        await this.lunge(m, () => {
          this.strike(m, star ? 2 : 1.2, false, '#ff7a7a', 1)
          if (!m.dead) { m.poison = Math.min(this.poisonMax(), m.poison + 4 + lv); m.poisonDmg = Math.max(m.poisonDmg, this.st.poisonDmg); this.dotIcon(m) }
        })
        break
      }
    }
  }

  private async skillName(sk: { name: string; icon: string }) {
    this.floatText(HERO_X, GROUND - 130, `${sk.icon} ${sk.name}`, '#f2b84b')
    await this.wait(150)
  }

  private async autoSkill() {
    const pow = 1 + this.st.s1Pow // skill web: ทักษะ 1 +power node
    await this.skillName(this.job.auto)
    const live = this.front()
    switch (this.job.id) {
      case 'swordsman':
        await this.lunge(live[0], () => live.forEach((m) => { const d = this.strike(m, 1.3 * pow * (1 + this.st.pskill)); if (this.st.autoLifesteal > 0) this.heal(d * this.st.autoLifesteal, true) })) // talent: พายุโลหิต
        break
      case 'archer':
        if (this.st.arAim > 0) { // talent ศรเล็ง: 2 aimed shots at the front, + crit
          this.st.crit += this.st.arAimCrit
          for (let i = 0; i < 2; i++) { const m = this.front()[0]; if (!m) break; await this.shoot(m, 0xf2b84b, () => this.strike(m, this.st.arAim * pow)) }
          this.st.crit -= this.st.arAimCrit
        } else {
          const shots = this.st.arVolley > 0 ? 3 : 2, mul = this.st.arVolley > 0 ? this.st.arVolley : 0.9 // talent ศรสามดอก
          const lock = this.st.lockOn > 0 && this.lockTarget && !this.lockTarget.dead ? this.lockTarget : undefined // ★ ล็อกเป้า: ยิงคู่ยิงตัวที่ล็อก
          for (let i = 0; i < shots; i++) { const t = this.alive(); if (!t.length) break; const m = lock && !lock.dead ? lock : t[Phaser.Math.Between(0, t.length - 1)]; await this.shoot(m, 0xf2b84b, () => this.strike(m, mul * pow)) }
        }
        break
      case 'mage':
        this.burst(700, GROUND - 30, 0xff8c42, 30, 300)
        for (const m of live) {
          this.strike(m, 1.1 * pow * (this.overflow ? this.st.mgOverflow : 1), true, '#ff8c42')
          if (this.st.burnDps > 0 && !m.dead) { m.burn = this.st.burnDps; m.burnTurns = 3; this.dotIcon(m) }
          if (this.st.autoBurn > 0 && this.element === 'fire' && !m.dead) { m.burnStacks = Math.min(this.burnMax(), m.burnStacks + this.st.autoBurn); m.burnStackTurns = 3; this.dotIcon(m) } // tree
        }
        await this.wait(BATTLE.stepMs * 0.6)
        break
      case 'cleric':
        if (this.hp < this.st.maxHp * (0.75 - this.st.healAt)) { this.skillHeal(this.st.maxHp * 0.22 * pow); this.burst(HERO_X, GROUND - 40, 0x6fd08c, 18, 160) }
        else if (this.st.judge > 0 && ++this.smiteCount % 3 === 0) { // tree ★B: วันพิพากษา
          this.callout('⚖️ พิพากษา!', W / 2, 170); this.burst(700, GROUND - 30, 0xf6e27a, 30, 320)
          for (const m of live) { const d = this.strike(m, 2.2 * pow * (1 + this.st.smiteMul), true, '#f6e27a'); if (!m.dead) m.marked = 2; if (this.st.smiteVamp > 0) this.heal(d * this.st.smiteVamp, true) }
        } else for (const m of live.slice(0, 2 + this.st.smiteTargets)) await this.shoot(m, 0xf6e27a, () => { const d = this.strike(m, 2 * pow * (1 + this.st.smiteMul), true, '#f6e27a'); if (this.st.smiteVamp > 0) this.heal(d * this.st.smiteVamp, true) })
        await this.wait(BATTLE.stepMs * 0.4)
        break
      case 'thief':
        await this.lunge(live[0], () => { const m = live[0]; this.strike(m, 1.6 * pow); if (!m.dead) { m.poison = Math.min(this.poisonMax(), m.poison + 3); m.poisonDmg = Math.max(m.poisonDmg, this.st.poisonDmg); this.dotIcon(m) } })
        break
    }
  }

  private async ultimate() {
    const pow = 1 + this.st.ultPow // skill web: Ult +power node
    const hitPow = pow * (1 + this.st.ultAmp) // run pick บดกระดูก: damage only, shields/heals stay
    await this.skillName(this.job.ult)
    sfx.slam()
    const live = this.front()
    switch (this.job.id) {
      case 'swordsman':
        await this.lunge(live[0], () => live.forEach((m) => this.strike(m, (1.4 + this.st.ultMulAdd) * hitPow * (1 + this.st.pskill) * (m.charging ? 1 + this.st.ultVsCharge : 1)))) // talents: ปราการ / ฟันทลาย
        this.addShield(this.st.maxHp * Math.max(0, SWORD_MANA.ultShield + this.st.ultShieldAdd) * pow)
        if (this.st.ultCounters > 0) this.ctrCharges = this.st.ultCounters // talent: ท่าสวนพร้อม
        this.cameras.main.flash(120, 140, 170, 220)
        break
      case 'archer': {
        this.dodgeCharges = Math.max(this.dodgeCharges, 1 + this.st.arUltDodge) // talent ถอยยาว
        this.floatText(HERO_X, GROUND - 100, '💨 ถอยหลบ!', '#c9c9d6')
        const t = this.alive().find((m) => m.def.ai === 'boss') ?? this.alive().sort((x, y) => y.hp - x.hp)[0]
        if (t) {
          this.tweens.add({ targets: this.heroSpr, x: HERO_X - 40, duration: 120, yoyo: true })
          this.ultFiring = true
          await this.shoot(t, 0xfff3a0, () => {
            this.strike(t, (5 - this.st.arUltMulCut) * hitPow, false, undefined, this.st.pierce); this.burst(t.spr.x, t.spr.y - 30, 0xfff3a0, 20, 260)
            if (this.st.arUltSplash > 0) for (const o of this.alive()) if (o !== t) this.strike(o, this.st.arUltSplash * hitPow, false, undefined, this.st.pierce) // talent ศรเจาะทะลุ
          })
          this.ultFiring = false
          this.shake(160, 0.012)
        }
        await this.wait(200)
        break
      }
      case 'mage': {
        const el = this.element
        const amp = 1 + this.st.mgUltAmp + (el === 'lightning' ? this.st.mgLightAmp : el === 'fire' ? this.st.mgFireAmp : this.st.mgIceAmp)
        if (this.st.mgDoubleCast > 0) { await this.mageUlt(el, pow * amp * this.st.mgDoubleCast); await this.mageUlt(el, pow * amp * this.st.mgDoubleCast, true) } // talent ร่ายคู่
        else await this.mageUlt(el, pow * amp)
        if (this.st.mgUltMana > 0) this.res = Math.min(this.resMax(), this.res + this.st.mgUltMana)
        if (this.st.elemWheel > 0) { const els = Object.keys(ELEMENTS) as Element[]; this.element = els[(els.indexOf(el) + 1) % els.length]; this.floatText(HERO_X, GROUND - 180, `🔄 ถัดไป ${ELEMENTS[this.element].icon}`, '#c9a8ff') } // talent วงล้อธาตุ
        break
      }
      case 'cleric':
        this.addShield(this.st.maxHp * 0.35 * pow * (this.alive().some((m) => m.charging) ? 1 + this.st.ultChargeShield : 1)) // talent: ใต้ปีกเทพ
        this.skillHeal(this.st.maxHp * 0.15 * pow)
        this.burst(HERO_X, GROUND - 50, 0xf6e27a, 24, 200)
        if (this.st.ultHoly > 0) for (const m of this.alive()) this.strike(m, this.st.ultHoly, true, '#f6e27a') // talent: แสงลงทัณฑ์
        if (this.st.ultRegen > 0) this.ultRegenTurns = 3 // talent: พรยืนยาว
        this.spears += 2 // every cleric: the ult calls 2 light spears
        await this.wait(BATTLE.stepMs)
        break
      case 'thief':
        this.dodgeCharges = 2 + this.st.ultDodge // talent: เงาซ้อน
        for (let i = 0; i < 4 + this.st.ultHits; i++) { // talent: พายุมีด
          const t = this.alive(); if (!t.length) break
          const m = t[Phaser.Math.Between(0, t.length - 1)]
          this.heroSpr.setAlpha(0.4)
          await this.lunge(m, () => {
            this.strike(m, 0.7 * hitPow)
            if (this.st.ultPoison > 0 && !m.dead) { m.poison = Math.min(this.poisonMax(), m.poison + this.st.ultPoison); m.poisonDmg = Math.max(m.poisonDmg, this.st.poisonDmg); this.dotIcon(m) } // talent: มีดอาบพิษ
          })
        }
        this.heroSpr.setAlpha(1)
        break
    }
  }

  private async mageUlt(el: Element, pow: number, noBarrier = false) {
    const live = this.front()
    const col = el === 'lightning' ? 0xbfe6ff : el === 'fire' ? 0xff8c42 : 0x9fe3ff
    const txt = el === 'lightning' ? '#bfe6ff' : el === 'fire' ? '#ff8c42' : '#9fe3ff'
    this.floatText(HERO_X, GROUND - 150, `${ELEMENTS[el].icon} ${ELEMENTS[el].name}`, txt)
    if (el === 'lightning') this.cameras.main.flash(140, 200, 230, 255)
    else {
      const orb = this.add.circle(W - 60, 40, 30, col).setDepth(9000)
      await this.tween({ targets: orb, x: 700, y: GROUND - 30, duration: 380, ease: 'Quad.easeIn' })
      orb.destroy()
    }
    this.shake(260, 0.016)
    this.burst(700, GROUND - 20, col, 36, 400)
    let froze = false
    if (el === 'lightning') await this.lightningStorm(pow, txt) // single target, many hits (Q 2026-11-03)
    for (const m of el === 'lightning' ? [] : live) {
      if (el === 'fire') {
        this.strike(m, 2 * pow, true, txt)
        if (!m.dead && this.relic === 'hellfire') { m.hell += 3 + this.st.mgFireStack; this.dotIcon(m) } // Hellfire: no cap, never expires
        else if (!m.dead) { m.burnStacks = Math.min(this.burnMax(), m.burnStacks + 3 + this.st.mgFireStack); m.burnStackTurns = 3; this.dotIcon(m) }
      } else {
        this.strike(m, 1.6 * pow, true, txt)
        if (m.dead) continue
        if (m.chill > 0 && m.def.ai !== 'boss') { m.frozen = true; froze = true; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 20, 'แช่แข็ง!', '#9fe3ff') }
        m.chill = 3 + this.st.chillPlus; m.gauge -= 25; if (!m.charging) m.spr.setTint(0x9fe3ff); this.dotIcon(m)
      }
    }
    if (froze && this.st.shatter > 0) { // tree ice ★ "ผลึกแตก"
      this.callout('❄️ ผลึกแตก!', W / 2, 170)
      for (const m of this.alive()) this.strike(m, m.frozen ? 1.5 : 0.75, true, '#9fe3ff')
    }
    if (!noBarrier) this.addShield(this.st.matk * (2 + (el === 'ice' ? this.st.iceBarrier : 0)) * pow * (1 - this.st.mgBarrierCut))
    await this.wait(300)
  }

  /** One lightning hit (ult, Bolt): storm set ramp, ประจุสะสม, and the tree fork on lightning runs. */
  private zap(m: Mon, mul: number, txt = '#bfe6ff', fork = true) {
    const bolt = this.add.rectangle(m.spr.x, (m.spr.y - 40) / 2, 6, Math.max(10, m.spr.y - 40), 0xbfe6ff).setDepth(9000)
    this.tweens.add({ targets: bolt, alpha: 0, duration: 140, onComplete: () => bolt.destroy() })
    const n = this.zapTurn.get(m) ?? 0
    this.zapTurn.set(m, n + 1)
    if (this.st.stormSet > 0) mul *= 1 + 0.1 * n
    this.zapCount++
    const charged = this.st.boltCharge > 0 && this.zapCount % 10 === 0
    if (charged) { mul *= 3; m.gauge -= 15; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '🔋 ประจุ!', txt) }
    this.strike(m, mul, true, txt)
    if (fork && this.element === 'lightning' && this.st.lightChain > 0 && Math.random() < this.st.lightChain) { // tree "ฟ้าแตกแขนง": never chains again
      const l = this.alive(); if (l.length) this.zap(l[Phaser.Math.Between(0, l.length - 1)], mul, txt, false)
    }
  }

  /** Storm card Lightning Bolt: N hits at 0.3x M.ATK, random targets, at the start of the hero's turn. */
  private async lightningBolt() {
    if (this.job.id === 'mage') { // Mage: card spells cost Mana (all hits or nothing)
      const cost = this.st.boltHits * MAGE_SPELL.boltPerHit
      if (this.res < cost) return
      this.res -= cost
    }
    this.zapTurn.clear()
    for (let i = 0; i < this.st.boltHits; i++) {
      const l = this.alive(); if (!l.length) break
      this.zap(l[Phaser.Math.Between(0, l.length - 1)], 0.3)
      await this.wait(50)
    }
  }

  /** Mage lightning ult: 6+ hits on one target (boss, else highest HP), 0.3–1.2x each; leftovers jump if it dies. */
  private async lightningStorm(pow: number, txt: string) {
    const pick = () => this.alive().find((m) => m.def.ai === 'boss') ?? this.alive().sort((x, y) => y.hp - x.hp)[0]
    this.zapTurn.clear()
    let t = pick()
    const hits = 6 + this.st.lightHits
    for (let i = 0; i < hits; i++) {
      if (!t || t.dead) { const l = this.alive(); if (!l.length) break; t = l[Phaser.Math.Between(0, l.length - 1)] }
      let r = Phaser.Math.FloatBetween(0.3, 1.2)
      if (this.st.lightLuck > 0) r = Math.max(r, Phaser.Math.FloatBetween(0.3, 1.2)) // tree ★ ฟ้าลิขิต
      this.zap(t, r * pow, txt)
      if (r >= 1 && this.st.overload > 0 && this.job.resource === 'mana') this.res = Math.min(this.resMax(), this.res + this.st.overload)
      await this.wait(70)
    }
  }

  private addShield(n: number, quiet = false) {
    this.shield += Math.round(n * (1 + this.st.shieldAmp))
    if (!quiet) this.floatText(HERO_X, GROUND - 100, `🛡️ โล่ ${Math.round(this.shield)}`, '#9fe3ff')
  }

  /** RO-style crit: physical only, uses max ATK (no low roll) x critMul (base 1.4 + crit-damage bonuses). Caller skips DEF on a crit. */
  private roll(mul = 1, magic = false, crit = Math.random() < (magic ? this.st.spellCrit : this.st.crit)) { // magic crit: spellCrit only, max M.ATK roll
    const base = (magic ? this.st.matk * (crit ? 1.1 : Phaser.Math.FloatBetween(0.9, 1.1)) : this.st.atk * (crit ? 1 : Phaser.Math.FloatBetween(this.st.minPct, 1))) * (this.berserking() ? 1.4 : 1) * this.atkMul()
    return { dmg: Math.max(1, Math.round(base * mul * (crit ? this.st.critMul + (this.buf.hawk > 0 && this.st.s2Star ? 0.3 : 0) : 1))), crit } // Skill 2 ★ เล็งจุดตาย
  }

  /** Monster P.DEF (stat spec v1 formula). Magic skips this. */
  private armor(m: Mon, dmg: number) { return m.def.def ? Math.max(1, Math.round(afterDef(dmg, m.def.def))) : dmg }

  private async fireBolt() {
    const live = this.alive()
    if (!live.length) return
    const m = live[Phaser.Math.Between(0, live.length - 1)]
    const b = this.add.image(HERO_X + 20, GROUND - 50, 'dot').setTint(0xff8c42).setScale(2.4).setDepth(9000)
    await this.tween({ targets: b, x: m.spr.x, y: m.spr.y - 30, duration: 260 })
    b.destroy()
    if (m.dead) return
    const r = this.roll(this.st.boltMul, true)
    this.damageMon(m, r.dmg, r.crit, '#ff8c42')
    this.burst(m.spr.x, m.spr.y - 30, 0xff8c42, 10, 160)
    if (this.st.burnDps > 0 && !m.dead) { m.burn = this.st.burnDps; m.burnTurns = 3; this.dotIcon(m) }
  }

  private async smash() {
    this.smashCdLeft = this.smashTurns()
    sfx.slam()
    await this.tween({ targets: this.heroSpr, x: HERO_X + 140, y: GROUND - 90, duration: 220, ease: 'Quad.easeOut' })
    await this.tween({ targets: this.heroSpr, y: GROUND, duration: 140, ease: 'Quad.easeIn' })
    this.shake(260, 0.014)
    const ring = this.add.ellipse(HERO_X + 140, GROUND, 40, 14).setStrokeStyle(8, COLORS.gold).setDepth(9000)
    this.tweens.add({ targets: ring, width: 900, height: 120, alpha: 0, duration: 380, onComplete: () => ring.destroy() })
    this.burst(HERO_X + 140, GROUND, COLORS.gold, 26, 360)
    for (const m of this.alive()) {
      const r = this.roll(this.st.smashMul * (1 + this.st.pskill))
      this.damageMon(m, r.crit ? r.dmg : this.armor(m, r.dmg), true)
      if (!m.dead) { m.gauge = Math.max(0, m.gauge - 40); this.tweens.add({ targets: m.spr, x: m.spr.x + 30, duration: 90, yoyo: true }) }
    }
    await this.wait(250)
    await this.tween({ targets: this.heroSpr, x: HERO_X, duration: 200 })
  }

  /** dot = damage over time / reflected damage: no executioner bonus and never reflected back. */
  private damageMon(m: Mon, dmg: number, crit: boolean, color?: string, dot = false) {
    if (m.dead) return
    if ((m.marked ?? 0) > 0) dmg = Math.round(dmg * 1.15) // cleric ★B: ตราบาป
    if (this.st.lateDmg > 0 && this.fightTurns >= 12) dmg = Math.round(dmg * (1 + this.st.lateDmg)) // cleric talent: อรุณรุ่ง
    if (this.st.poisonAmp > 0 && m.poison >= 10) dmg = Math.round(dmg * (1 + this.st.poisonAmp)) // Thief talent: กัดกร่อน
    if (!dot && this.relic === 'executioner' && m.hp < m.def.hp * RELIC_RULES.executioner.below) dmg = Math.round(dmg * (1 + RELIC_RULES.executioner.mul))
    if (!dot && m.reflect > 0 && dmg > 0 && this.hp > 0) this.reflectHurt(m, dmg * m.reflect)
    if (m.shield > 0) { // monster shield (turtle wall, ice armor, bone shield) soaks first
      const a = Math.min(m.shield, dmg)
      m.shield -= a; dmg -= a
      this.floatText(m.spr.x + 30, m.spr.y - m.spr.displayHeight - 20, `🛡️-${Math.round(a)}`, '#9fe3ff')
      if (m.shield <= 0) { m.shield = 0; this.dotIcon(m) }
      if (dmg <= 0) return
    }
    m.hp -= dmg
    if (m.charging && m.def.breakPct && m.hp > 0) {
      m.chargeDmg += dmg * (m.chill > 0 && this.st.shatter > 0 ? 1.5 : 1) * (this.ultFiring ? 1 + this.st.arUltBreak : 1) // tree ice ★: chilled boss breaks faster · archer ult: ทะลวงเกราะ / ศรบั่น
      if (m.chargeDmg >= m.def.hp * m.def.breakPct) this.breakCharge(m)
    }
    this.damageNumber(m.spr.x, m.spr.y - m.spr.displayHeight, dmg, crit, color)
    if (this.comboSum.on && !dot) { const e = this.comboSum.per.get(m) ?? { dmg: 0, x: 0, y: 0 }; e.dmg += dmg; e.x = m.spr.x; e.y = m.spr.y - m.spr.displayHeight; this.comboSum.per.set(m, e) }
    if (crit && !dot) this.critJuice(m)
    else if (this.comboLevel >= 2 && !dot) { this.hitStop(20 + 12 * this.comboLevel); this.shake(60, 0.002 + 0.0015 * this.comboLevel) }
    m.spr.setTintFill(0xffffff)
    this.time.delayedCall(80, () => m.spr.active && m.spr.clearTint())
    if (this.relic === 'harvest' && m.def.ai === 'boss' && m.hp > 0) {
      const steps = Math.floor((1 - m.hp / m.def.hp) / RELIC_RULES.harvest.bossStep)
      while (m.harvestMark < steps) { m.harvestMark++; this.harvestSoul() }
    }
    if (m.hp <= 0) this.killMon(m)
    else while (m.def.phases && m.phase < m.def.phases.length && m.hp < m.def.hp * m.def.phases[m.phase].at) this.enterPhase(m, m.def.phases[m.phase++])
  }

  /** BREAK: enough damage during a charge cancels the big attack and staggers the boss. */
  private breakCharge(m: Mon) {
    m.charging = false; m.chargeDmg = 0
    m.gauge -= BATTLE.breakStagger
    this.breakCount++
    this.time.delayedCall(90, () => m.spr.active && m.spr.clearTint())
    this.callout('⚡ BREAK! ขัดท่าสำเร็จ', W / 2, 150)
    this.cameras.main.flash(120, 255, 240, 160)
    this.tweens.add({ targets: m.spr, angle: -8, duration: 90, yoyo: true, repeat: 1 })
    sfx.door()
  }

  /** Equipment card drop (design/equipment-cards.md): base rate x LUK, guaranteed after `pity` kills of that monster. */
  private rollCard(m: Mon) {
    if (m.revived) return
    const pity = (save().cardPity ??= {})
    for (const cd of cardsOfMonster(m.kind)) {
      const n = (pity[cd.id] ?? 0) + 1
      if (Math.random() < cardRate(cd) * this.cardLuck || n >= cardPityMax(cd)) {
        pity[cd.id] = 0
        this.runCards.push(cd.id)
        this.callout(`🃏 ได้${cardName(cd)}!`, m.spr.x, m.spr.y - 130 - (cd.v2 ? 40 : 0))
        sfx.coin()
      } else pity[cd.id] = n
    }
  }

  private killMon(m: Mon) {
    m.dead = true
    if (this.st.lockOn > 0 && this.lockTarget === m && this.dodgeCharges < 1) { this.dodgeCharges = 1; this.floatText(HERO_X, GROUND - 100, '💨 ถอยตั้งหลัก', '#c9c9d6') } // archer ★ ล็อกเป้า: kill the locked target -> 1 sure dodge
    const others = this.alive()
    if (this.st.fireSpread > 0 && m.burnStacks > 0) for (const o of others) { o.burnStacks = Math.min(this.burnMax(), o.burnStacks + Math.ceil(m.burnStacks / 2)); o.burnStackTurns = 3; this.dotIcon(o) } // tree
    if (this.st.poisonSpread > 0 && m.poison > 0) for (const o of others) { o.poison = Math.min(this.poisonMax(), o.poison + Math.ceil(m.poison / 2)); o.poisonDmg = Math.max(o.poisonDmg, m.poisonDmg); this.dotIcon(o) } // tree
    this.kills++
    if (this.relic === 'harvest') this.harvestSoul()
    if (this.relic === 'executioner' && this.smashCdLeft > 0) { this.smashCdLeft = Math.max(0, this.smashCdLeft - RELIC_RULES.executioner.cd); this.floatText(HERO_X, GROUND - 150, '🪓 ท่าไม้ตายเร็วขึ้น', '#f2b84b') }
    if (m.def.deathBlast && this.hp > 0) { // bloater / imp / mirror shard: blows up when it dies
      this.callout(`💥 ${m.def.name}ระเบิด!`, m.spr.x, m.spr.y - 120)
      this.burst(m.spr.x, m.spr.y - 20, 0xffb347, 22, 300)
      this.shake(180, 0.012)
      sfx.slam()
      this.hurtHero(m.def.dmg * BATTLE.monDmgMul * m.def.deathBlast, true, m.def.hit ?? 15)
    }
    this.runXp += m.def.xp
    this.gainXp(m.def.xp)
    const [a, b] = m.def.zeny
    this.coinsFly(m.spr.x, m.spr.y - 20, Phaser.Math.Between(a, b))
    this.rollCard(m)
    if (Math.random() < this.st.dropChance) { this.runGems++; this.floatText(m.spr.x, m.spr.y - 80, '💎 ของหายาก!', '#7fd7ff'); sfx.coin() }
    sfx.pop()
    m.dotTxt?.destroy()
    this.tweens.add({ targets: [m.spr, m.shadow], alpha: 0, duration: 260, onComplete: () => this.removeMon(m) })
    this.tweens.add({ targets: m.spr, scaleY: 0.2, duration: 260 })
    // close ranks: survivors step forward
    this.time.delayedCall(280, () => {
      this.alive().sort((x, y) => x.slot - y.slot).forEach((x, i) => {
        if (x.def.ai === 'boss') return
        x.slot = i
        this.tweens.add({ targets: [x.spr, x.shadow], x: SLOT_X[i], duration: 260 })
      })
    })
  }

  // ---------- monster turn ----------
  private async monTurn(m: Mon) {
    m.turns++
    if (m.atkUpTurns > 0 && --m.atkUpTurns === 0) { m.atkUp = 0; this.dotIcon(m) }
    if (m.weakTurns > 0 && --m.weakTurns === 0) this.dotIcon(m)
    if ((m.marked ?? 0) > 0) m.marked!--
    // damage over time first
    if (m.burnTurns > 0) { m.burnTurns--; this.damageMon(m, m.burn, false, '#ff8c42', true); if (!m.burnTurns) this.dotIcon(m) }
    if (!m.dead && m.poison > 0) this.damageMon(m, m.poison * m.poisonDmg, false, '#a77be0', true)
    if (!m.dead && m.burnStackTurns > 0) {
      m.burnStackTurns--
      this.damageMon(m, Math.round(m.burnStacks * this.st.matk * (0.12 + this.st.burnTick)), false, '#ff8c42', true)
      if (!m.burnStackTurns) m.burnStacks = 0
      this.dotIcon(m)
    }
    if (!m.dead && m.hell > 0) this.damageMon(m, Math.max(1, Math.round(hellEff(m.hell) * RELIC_RULES.hellfire.dmgPerStack * this.bestAtk())), false, '#ff5a2a', true)
    if (!m.dead && m.def.mini === 'drainer' && m.hp < m.def.hp * BATTLE.demonAt) this.healMon(m, m.def.hp * BATTLE.demonRegen, true)
    m.parry = false
    if (!m.dead && m.chill > 0) { m.chill--; if (!m.chill && !m.charging) m.spr.clearTint(); this.dotIcon(m) }
    if (!m.dead && m.frozen) { m.frozen = false; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10, '❄️ แข็งอยู่', '#9fe3ff'); await this.wait(250); return }
    if (m.dead) { await this.wait(200); return }
    m.iced = m.ice > 0
    if (m.iced) { // Ice Age: weaker hits for N turns, freeze chance doubles every turn
      m.ice--
      const chance = m.iceChance * (m.def.ai === 'boss' ? RELIC_RULES.iceage.bossFreezeMul : 1)
      m.iceChance *= RELIC_RULES.iceage.freezeMul
      if (!m.ice) { m.spr.clearTint(); this.dotIcon(m) }
      if (Math.random() < chance) {
        this.freezeCount++
        m.spr.setTint(0x9fe3ff)
        this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10, `🧊 แช่แข็ง! (${Math.round(chance * 100)}%)`, '#9fe3ff')
        await this.wait(300); return
      }
    }
    if (m.def.mini === 'duelist' && m.turns % BATTLE.parryEvery === 0) { // stance instead of attacking
      m.parry = true
      m.spr.setTint(0xc9e0ff)
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10, '🤺 ตั้งท่าปัด! (อย่าเพิ่งใช้ท่าไม้ตาย)', '#c9e0ff')
      await this.wait(BATTLE.stepMs); return
    }

    if (!m.charging && await this.useSkill(m)) return

    if (m.def.ai === 'boss') {
      if (!m.summoned && m.def.summon && m.hp < m.def.hp / 2) {
        m.summoned = true
        this.callout(`${m.def.name}เรียกลูกน้อง!`, W / 2, 150)
        this.tweens.add({ targets: m.spr, scaleY: m.spr.scaleY * 1.2, duration: 150, yoyo: true })
        this.addMon(m.def.summon, 0, 0); this.addMon(m.def.summon, 1, 0) // adds start at gauge 0: one breath to react
        await this.wait(700)
        return
      }
      if (m.charging) { m.charging = false; m.spr.clearTint(); await this.slam(m); return }
      if (m.def.breakPct && m.turns % m.chargeEvery === 0) {
        m.charging = true; m.chargeDmg = 0
        m.spr.setTint(0xff8080)
        this.heroGauge = Math.max(this.heroGauge, 100) // the hero always gets one turn to answer the charge
        this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10, `⚠️ ${m.def.slamName ?? 'ชาร์จพลัง!'}`, '#ff7a7a')
        this.tweens.add({ targets: m.spr, scaleX: m.spr.scaleX * 1.1, duration: 200, yoyo: true, repeat: 1 })
        await this.wait(BATTLE.stepMs)
        return
      }
    }
    const home = m.spr.x
    await this.tween({ targets: [m.spr, m.shadow], x: HERO_X + 70, duration: BATTLE.stepMs * 0.35, ease: 'Quad.easeIn' })
    if (m.def.magic) this.burst(HERO_X, GROUND - 40, m.def.mini === 'drainer' ? 0xc03050 : 0xb48aff, 10, 140) // spores / dark bolt
    const shots = m.def.shots ?? 1
    for (let i = 0; i < shots && this.hp > 0 && !m.dead; i++) {
      if (this.riposte(m)) continue
      const landed = this.hurtHero(m.def.dmg * BATTLE.monDmgMul * this.monMul(m), !!m.def.magic, m.def.hit ?? 15, m)
      if (landed) { this.monLeech(m); if (m.onHit) this.applyFx(m.onHit, m); await this.tryCounter(m) }
    }
    await this.tween({ targets: [m.spr, m.shadow], x: home, duration: BATTLE.stepMs * 0.35, ease: 'Quad.easeOut' })
  }

  /** Counter: when a hit lands, sometimes strike back at the attacker right away (basic attack x counterMul).
   *  Q 2026-11-03: shown as an action: melee dashes into the attacker and knocks it back, ranged/magic fire point blank. */
  private async tryCounter(m: Mon) {
    if (this.hp <= 0 || m.dead) return
    if (this.ctrCharges > 0) this.ctrCharges-- // talent: ท่าสวนพร้อม (sure counter)
    else if (Math.random() >= this.st.counter) return
    this.counterCount++
    if (this.st.counterRage > 0) { this.gainRage(this.st.counterRage); this.gainRes(this.st.counterRage) } // talent: เหล็กกล้า (Rage or Mana)
    if (this.st.counterShield > 0) this.addShield(this.st.maxHp * this.st.counterShield, true)
    this.counterJuice()
    const magic = this.job.attack === 'magic' || this.st.holyCounter > 0 // tree: "ศรัทธาสวน"
    const hit = () => {
      this.strike(m, BATTLE.counterMul, magic, magic ? '#c9a8ff' : undefined)
      if (this.st.ctrAoe > 0) for (const o of this.alive()) if (o !== m) this.strike(o, 0.5, magic) // tree: "สวนพายุ"
    }
    if (this.job.attack !== 'melee') { await this.shoot(m, magic ? 0x9f7bff : 0xf6eedc, hit); return }
    const step = BATTLE.stepMs
    await this.tween({ targets: this.heroSpr, x: m.spr.x - 40, duration: step * 0.2, ease: 'Quad.easeIn' })
    this.slashFx(m.spr.x - 10, GROUND - 40)
    sfx.swing()
    hit()
    this.shake(70, 0.005)
    if (!m.dead) this.tweens.add({ targets: [m.spr, m.shadow], x: m.spr.x + 40, duration: step * 0.2, ease: 'Quad.easeOut' })
    await this.tween({ targets: this.heroSpr, x: HERO_X, duration: step * 0.3, ease: 'Quad.easeOut' })
  }

  /** Out of turns: the monsters win this fight (the run ends like a knock-out). */
  private async timeUp() {
    this.timedOut = true
    this.callout('⌛ หมดเวลา! มอนหนีไปได้...', W / 2, 150)
    sfx.die()
    this.tweens.add({ targets: this.heroSpr, angle: -90, alpha: 0.6, duration: 400 })
    await this.wait(900)
  }

  private async slam(m: Mon) {
    await this.tween({ targets: m.spr, y: m.spr.y - 120, duration: 220, ease: 'Quad.easeOut' })
    await this.tween({ targets: m.spr, y: GROUND, duration: 150, ease: 'Quad.easeIn' })
    this.shake(300, 0.02)
    this.burst(m.spr.x, GROUND, COLORS.telegraph, 24, 320)
    sfx.slam()
    if (this.riposte(m)) { await this.wait(300); return }
    const hit = this.hurtHero((m.def.dmg + 8) * BATTLE.monDmgMul * (m.def.slamMul ?? 1.6) * this.monMul(m), !!m.def.slamMagic, 999, m) // slam can't be fled, only lucky-dodged / BREAK-ed
    if (hit) {
      this.monLeech(m, m.def.mini === 'hunter' || m.def.mini === 'drainer' ? 1 : undefined) // the big drain heals all of it
      if (m.slamFx) this.applyFx(m.slamFx, m)
      await this.tryCounter(m)
      const lost = BATTLE.slamStun * (1 - this.st.tenacity)
      this.heroGauge = Math.max(-100, this.heroGauge - lost)
      if (lost >= 10) this.floatText(HERO_X, GROUND - 120, 'มึน!', '#f2b84b')
    }
    await this.wait(300)
  }

  /** Returns false when the hit was dodged. */
  /** Order (stat spec v1): lucky dodge -> hit/flee -> DEF. Returns false when the hit didn't land. */
  private hurtHero(dmg: number, magic: boolean, monHit: number, src?: Mon): boolean {
    this.lastHurt = 0
    const dodged = (label: string, color: string) => {
      this.evadeJuice(label, color)
      if (this.st.dodgeStrike > 0 && src && !src.dead) { this.floatText(HERO_X + 40, GROUND - 130, 'สวนจากเงา!', '#c9c9d6'); this.counterCount++; this.strike(src, BATTLE.counterMul, this.job.attack === 'magic') } // tree
      if (this.st.dodgeHeal > 0) this.heal(this.st.maxHp * this.st.dodgeHeal) // gear: dodging heals a little (Thief)
      if (this.st.arDodgeShield > 0 && this.shield < this.st.maxHp * this.st.arDodgeShield * 3) this.addShield(Math.min(this.st.maxHp * this.st.arDodgeShield, this.st.maxHp * this.st.arDodgeShield * 3 - this.shield)) // archer tree โล่ลม
      if (this.st.arDodgeRes > 0 && this.job.resource === 'energy') this.res = Math.min(this.resMax(), this.res + this.st.arDodgeRes) // archer ★ ยิงถอย
      if (this.st.dodgeEnergy > 0 && this.job.resource === 'energy') this.res = Math.min(this.resMax(), this.res + this.st.dodgeEnergy) // Thief talent: ขโมยจังหวะ
      return false
    }
    if (this.dodgeCharges > 0) { this.dodgeCharges--; return dodged('เงาพริ้ว!', '#c9c9d6') }
    if (Math.random() < this.st.luckyDodge) return dodged('LUCKY!', '#6fd08c')
    if (Math.random() > hitChance(monHit, this.st.flee, 0.8 - this.st.fleeFloor)) return dodged('EVADE!', '#9fe3ff') // Thief เงาบาง lowers the floor
    const ab = this.hx.armorBreak > 0 ? BATTLE.armorBreakMul : 1 // เกราะแตก: P.DEF / M.DEF count half
    const raw = magic ? dmg * (1 - this.st.mdef * ab) : afterDef(dmg, this.st.def * ab)
    let n = Math.max(1, Math.round(raw * (1 - this.st.guard) * (this.buf.guard > 0 ? 1 - (0.4 + 0.05 * this.st.s2Lv) : 1))) // Skill 2 ตั้งการ์ด
    this.lastHurt = n
    if (this.relic === 'thornaura' && src && !src.dead) { this.damageMon(src, Math.max(1, Math.round(n * RELIC_RULES.thornaura.back)), false, '#7fd08c', true); this.floatText(src.spr.x, src.spr.y - src.spr.displayHeight - 30, '🌵 หนาม!', '#7fd08c') }
    this.gainRage(RES_RULES.rageOnHurt + this.st.rageOnHurtAdd) // talent: แค้นฝังใจ
    if (this.st.rageOnHurtAdd > 0) this.gainRes(this.st.rageOnHurtAdd) // same talent on a Mana job: Mana when hit
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, n)
      this.shield -= absorbed; n -= absorbed
      this.floatText(HERO_X, GROUND - 110, `🛡️ -${absorbed}`, '#9fe3ff')
      if (this.shield <= 0 && this.st.barrierBoom > 0) { // mage talent บาเรียระเบิด
        this.callout('💥 บาเรียระเบิด!', HERO_X + 120, GROUND - 160)
        for (const m of this.alive()) { this.strike(m, this.st.barrierBoom, true, '#c9a8ff'); if (this.st.barrierBoom >= 1.6) m.gauge -= 20 }
      }
      if (this.st.thorns > 0 && src && !src.dead) this.damageMon(src, Math.max(1, Math.round(absorbed * this.st.thorns)), false, '#9fe3ff', true) // tree: "โล่หนาม"
      if (n <= 0) return true
    }
    if (this.buf.mshield > 0 && this.job.resource === 'mana' && this.res > 0) { // Skill 2 Mana Shield (active, v27)
      const paid = Math.min(Math.floor(this.res), Math.round(n * (0.4 + 0.05 * this.st.s2Lv)))
      this.res -= paid; n -= paid
      if (paid > 0) this.floatText(HERO_X, GROUND - 110, `🔷 -${paid}`, '#5aa0ff')
      if (n <= 0) return true
    }
    this.hp = Math.max(0, this.hp - n)
    if (this.st.mgEmergency > 0 && !this.emergencyUsed && this.hp > 0 && this.hp < this.st.maxHp * 0.3) { // mage talent มานาฉุกเฉิน
      this.emergencyUsed = true; this.res = this.resMax()
      if (this.st.mgEmergency >= 2) this.addShield(this.st.matk * 2, true)
      this.callout('🔷 มานาฉุกเฉิน!', HERO_X + 120, GROUND - 150)
    }
    this.minHpPct = Math.min(this.minHpPct, this.hp / this.st.maxHp)
    this.damageNumber(HERO_X, GROUND - 70, n, false, '#ff7a7a')
    if (this.hp <= 0 && this.st.revive > 0) {
      this.st.revive--; this.revivedCount++
      this.hp = Math.round(this.st.maxHp * Math.max(BATTLE.reviveHp, this.st.reviveHp))
      this.callout('🪶 ขนนกฟีนิกซ์! ลุกขึ้นอีกครั้ง', HERO_X + 120, GROUND - 150)
      this.burst(HERO_X, GROUND - 40, 0xffb347, 24, 220)
      sfx.win()
      return true
    }
    sfx.hurt()
    this.heroSpr.setTintFill(0xff6060)
    this.time.delayedCall(90, () => this.heroSpr.setTint((COSTUMES.find((c) => c.id === save().costume) ?? COSTUMES[0]).tint))
    this.tweens.add({ targets: this.heroSpr, x: HERO_X - 14, duration: 70, yoyo: true })
    if (this.hp <= 0) { sfx.die(); this.tweens.add({ targets: this.heroSpr, angle: -90, alpha: 0.6, duration: 400 }) }
    return true
  }

  private heal(n: number, quiet = false) {
    const before = this.hp
    if (this.hx.burn > 0) n *= 1 - BATTLE.burnHealCut // burning: healing on the hero is cut
    const want = Math.round(this.hp + n * (1 + this.st.healAmp))
    if (this.st.overhealShield > 0 && want > this.st.maxHp) this.shield = Math.min(this.st.maxHp * 0.5, this.shield + want - this.st.maxHp) // tree: "ไฟชำระ" (cap 50% max HP)
    this.hp = Math.min(this.st.maxHp, want)
    if (this.relic === 'bloodpact' && want > this.st.maxHp) { // Blood Pact: overheal becomes shield (capped)
      const cap = Math.round(this.st.maxHp * RELIC_RULES.bloodpact.shieldCap)
      this.shield = Math.max(this.shield, Math.min(cap, this.shield + want - this.st.maxHp))
    }
    if (this.hp > before && !quiet) this.damageNumber(HERO_X, GROUND - 70, this.hp - before, false, '#6fd08c', true)
  }

  private dotIcon(m: Mon) {
    if (!m.dotTxt) m.dotTxt = this.add.text(0, 0, '', { fontSize: '14px' }).setOrigin(0.5).setDepth(9500)
    m.dotTxt.setText(`${m.burnTurns > 0 ? '🔥' : ''}${m.burnStacks > 0 ? '🔥' + m.burnStacks : ''}${m.hell > 0 ? '♨️' + m.hell : ''}${m.poison > 0 ? '☠️' + m.poison : ''}${m.chill > 0 ? '❄️' : ''}${m.ice > 0 ? '🧊' + m.ice : ''}${m.shield > 0 ? '🛡️' : ''}${m.atkUpTurns > 0 ? '💢' : ''}${m.weakTurns > 0 ? '😰' : ''}${m.reflect > 0 ? '🪞' : ''}`)
  }

  // ---------- xp / perks ----------
  private pendingLevels = 0
  private gainXp(n: number) {
    this.xp += n
    while (this.xp >= RULES.xpNeed(this.level)) { this.xp -= RULES.xpNeed(this.level); this.level++; this.pendingLevels++ }
  }

  private async levelUps() {
    while (this.pendingLevels > 0 && this.hp > 0) {
      this.pendingLevels--
      this.heal(this.st.maxHp * RULES.healOnLevel)
      sfx.win()
      await this.offerPerks()
    }
  }

  private tagCount(t: Tag) { return this.perks.filter((p) => p.tag === t).length }

  private applyMod(mod: Partial<Stats>) {
    for (const k of Object.keys(mod) as (keyof Stats)[]) {
      const v = mod[k]!
      if (k === 'maxHp') { this.st.maxHp += v; this.hp += v; continue }
      if (k === 'fireEvery') { this.st.fireEvery = this.st.fireEvery === 0 ? Math.max(1, v) : Math.max(1, this.st.fireEvery + v); continue }
      this.st[k] += v
      if (k === 'crit') this.st.spellCrit += v // card/relic crit also counts for magic (Q rule)
    }
    this.st.smashCost = Math.max(6, this.st.smashCost)
  }

  private offerPerks(allLegend = false) {
    return new Promise<void>((done) => {
      // 2 cards from this job's tags (one from a tag already owned, so builds grow) + 1 common card, always
      const owned = new Set(this.perks.map((p) => p.id))
      const boltLv = this.perks.filter((p) => p.id === 'stm1').length
      // Mage: card lines follow the run's element (⚡ → storm only, 🔥 → fire only; ❄️ has no card line, so it keeps both)
      const banned: Tag[] = this.runElement === 'lightning' ? ['fire'] : this.runElement === 'fire' ? ['storm'] : []
      const pool = PERKS.filter((p) => (p.id === 'stm1' ? boltLv < BOLT_MAX_LV : !owned.has(p.id)) && this.job.tags.includes(p.tag) && !banned.includes(p.tag) && (!['stm2', 'stm3'].includes(p.id) || boltLv > 0))
        .map((p) => (p.id === 'stm1' && boltLv > 0 ? { ...p, name: `Lightning Bolt Lv${boltLv + 1}`, desc: 'Lightning Bolt +1 ฮิต', mod: { boltHits: 1 } } : p))
      const mine = this.perks.map((p) => p.tag)
      const offers: Perk[] = []
      const take = (list: Perk[]) => { const left = list.filter((p) => !offers.includes(p)); if (left.length) offers.push(left[Phaser.Math.Between(0, left.length - 1)]) }
      if (this.firstOffer && this.st.mgFirstCard > 0) { const f = pool.find((p) => p.id === (this.st.mgFirstCard === 1 ? 'stm1' : 'fir1')); if (f) offers.push(f) } // mage talent row 1
      this.firstOffer = false
      if (mine.length) take(pool.filter((p) => mine.includes(p.tag)))
      while (offers.length < 2 && offers.length < pool.length) take(pool)
      const commons = COMMON_PERKS.filter((p) => !(p.mod.revive && owned.has(p.id)))
      while (offers.length < 3) take(commons)
      if (!offers.length) { done(); return }
      const legend = new Set<Perk>()
      offers.forEach((p, i) => {
        if (!allLegend && Math.random() >= this.st.legendChance) return
        const mod: Perk['mod'] = {}
        for (const k of Object.keys(p.mod) as (keyof Perk['mod'])[]) mod[k] = k === 'fireEvery' ? Math.max(1, p.mod[k]! - 1) : k === 'revive' ? 1 : p.mod[k]! * 2
        offers[i] = { ...p, name: `✦ ${p.name}`, desc: `${p.desc}\n(ตำนาน: แรง x2)`, mod }
        legend.add(offers[i])
      })
      this.time.paused = true
      const c = this.add.container(0, 0).setDepth(30000)
      c.add(this.add.rectangle(W / 2, H / 2, W, H, COLORS.night, 0.8).setInteractive())
      c.add(this.add.text(W / 2, 64, `เลเวล ${this.level}! เลือกพร 1 อย่าง`, { fontFamily: FONT_UI, fontSize: '30px', fontStyle: 'bold', color: '#f2b84b' }).setOrigin(0.5))
      const cw = 272, ch = 250, gap = 24
      const x0 = W / 2 - ((offers.length - 1) * (cw + gap)) / 2
      const keys: string[] = []
      const pick = (p: Perk) => {
        if (!c.active) return
        keys.forEach((k) => this.input.keyboard!.removeAllListeners(k))
        this.pendingPick = undefined
        c.destroy()
        this.time.paused = false
        this.perks.push(p)
        this.applyMod(p.mod)
        this.callout(`${TAGS[p.tag].icon} ${p.name}`, HERO_X, GROUND - 140)
        const set = SET_BONUS[p.tag]
        if (set && this.tagCount(p.tag) === 3) { this.applyMod(set.mod); this.callout(`✨ ${set.desc}`, W / 2, 190); sfx.door() }
        done()
      }
      offers.forEach((p, i) => {
        const tag = TAGS[p.tag], n = this.tagCount(p.tag), leg = legend.has(p)
        const card = this.add.container(x0 + i * (cw + gap), H / 2 + 20)
        const bg = this.add.rectangle(0, 0, cw, ch, leg ? 0xffe08a : 0xf4e6c8).setStrokeStyle(leg ? 7 : 4, leg ? 0xff8c42 : Phaser.Display.Color.HexStringToColor(tag.color).color)
        const icon = this.add.text(0, -ch / 2 + 44, tag.icon, { fontSize: '40px' }).setOrigin(0.5)
        const name = this.add.text(0, -ch / 2 + 96, p.name, { fontFamily: FONT_UI, fontSize: '24px', fontStyle: 'bold', color: '#2b2238' }).setOrigin(0.5)
        const desc = this.add.text(0, -ch / 2 + 128, perkDesc(p.desc, this.job.ult), { fontFamily: FONT_UI, fontSize: '16px', color: '#4a3f5c', align: 'center', wordWrap: { width: cw - 36 }, lineSpacing: 4 }).setOrigin(0.5, 0)
        const foot = this.add.text(0, ch / 2 - 22, p.tag === 'common' ? 'พรทั่วไป · เลือกซ้ำได้' : `${p.id === 'stm1' ? `Lv ${boltLv + 1}/${BOLT_MAX_LV} · ` : ''}สาย${tag.name} ${n >= 3 ? '3/3 ✓ ครบเซ็ตแล้ว' : `${n}/3${n === 2 && SET_BONUS[p.tag] ? ' · ครบเซ็ตเมื่อเลือก!' : ''}`}`, { fontFamily: FONT_UI, fontSize: '14px', color: tag.color, fontStyle: 'bold', stroke: '#2b2238', strokeThickness: 2 }).setOrigin(0.5)
        const key = this.add.text(-cw / 2 + 14, -ch / 2 + 10, `${i + 1}`, { fontFamily: FONT_NUM, fontSize: '16px', color: '#8d7244' })
        card.add([bg, icon, name, desc, foot, key]).setSize(cw, ch).setInteractive({ useHandCursor: true })
        card.on('pointerover', () => card.setScale(1.04))
        card.on('pointerout', () => card.setScale(1))
        card.on('pointerup', () => pick(p))
        c.add(card)
        const k = `keydown-${['ONE', 'TWO', 'THREE'][i]}`
        keys.push(k)
        this.input.keyboard!.once(k, () => pick(p))
      })
      this.pendingPick = (i) => pick(offers[Math.min(i, offers.length - 1)])
    })
  }

  // ---------- post-wave events (data/events.ts) ----------
  private async postWaveEvent() {
    await this.walk(500)
    const R = EVENT_RULES, t = this.dg.tier
    const potion = R.potionCost * t, card = R.cardCost * t
    const ev = rollEvent(this.st.eventChance, this.zeny >= potion)
    this.eventLog.push(ev.id)
    if (ev.rare) { sfx.win(); this.cameras.main.flash(200, 255, 230, 150) } else sfx.door()
    switch (ev.id) {
      case 'camp': {
        const c = await this.choose(ev, [
          { label: `🔥 พักฟื้น HP ${R.campHeal * 100}%`, sub: `ตอนนี้ HP ${Math.round(this.hp)}/${Math.round(this.st.maxHp)}` },
          { label: `⚔️ ซ้อมดาบ EXP +${R.campXp}`, sub: 'ได้พรครั้งถัดไปเร็วขึ้น' },
        ])
        if (c === 0) { this.heal(this.st.maxHp * R.campHeal); this.burst(HERO_X, GROUND - 40, 0xff8c42, 14, 140) }
        else { this.gainXp(R.campXp); this.runXp += R.campXp; this.floatText(HERO_X, GROUND - 110, `EXP +${R.campXp}`, '#7fd7ff') }
        break
      }
      case 'chest': {
        await this.choose(ev, [{ label: '🔓 เปิดหีบ', sub: 'zeny + ลุ้นเพชร (ดรอปหายาก)' }])
        this.coinsFly(HERO_X + 80, GROUND - 40, Phaser.Math.Between(R.chestZeny[0] * t, R.chestZeny[1] * t))
        if (Math.random() < this.st.dropChance * R.chestGemChance) { this.runGems++; this.floatText(HERO_X + 80, GROUND - 110, '💎 เจอเพชร!', '#7fd7ff') }
        break
      }
      case 'shrine': {
        const pool = Phaser.Utils.Array.Shuffle([...COMMON_PERKS]).slice(0, 2)
        const c = await this.choose(ev, pool.map((p) => ({ label: `${TAGS.common.icon} ${p.name}`, sub: p.desc })))
        this.applyMod(pool[c].mod)
        this.callout(`⛩️ ได้พร: ${pool[c].name}`, HERO_X + 60, GROUND - 140)
        break
      }
      case 'merchant': {
        const c = await this.choose(ev, [
          { label: `🧪 ยาฟื้น HP ${R.potionHeal * 100}%`, sub: `${potion} zeny`, off: this.zeny < potion },
          { label: '🙏 พร 1 ใน 3', sub: `${card} zeny`, off: this.zeny < card },
          { label: '👋 ไม่ซื้อ', sub: `มี ${this.zeny} zeny` },
        ])
        if (c === 0) { this.zeny -= potion; this.heal(this.st.maxHp * R.potionHeal); sfx.coin() }
        if (c === 1) { this.zeny -= card; sfx.coin(); await this.offerPerks() }
        break
      }
      case 'spring': {
        const good = Math.min(0.9, R.springGood + this.st.eventChance)
        const c = await this.choose(ev, [
          { label: '🥤 ดื่ม!', sub: `โชคดี ${Math.round(good * 100)}%: ฮีล ${R.springHeal * 100}% + ATK +${R.springAtk}` },
          { label: '🚶 เดินผ่าน', sub: 'ไม่เสี่ยงดีกว่า' },
        ])
        if (c === 1) break
        if (Math.random() < good) {
          this.heal(this.st.maxHp * R.springHeal); this.applyMod({ atk: R.springAtk, matk: R.springAtk })
          this.callout(`✨ สดชื่น! ATK +${R.springAtk}`, HERO_X + 60, GROUND - 140)
        } else {
          const n = Math.min(this.hp - 1, Math.round(this.st.maxHp * R.springHurt))
          this.hp -= n; sfx.hurt()
          this.damageNumber(HERO_X, GROUND - 70, n, false, '#b48aff')
          this.callout('🤢 ท้องเสีย...', HERO_X + 60, GROUND - 140)
        }
        break
      }
      case 'goldchest': {
        await this.choose(ev, [{ label: '🔓 เปิดหีบทอง', sub: `zeny ก้อนใหญ่ + เพชร ${R.goldGems}` }])
        this.coinsFly(HERO_X + 80, GROUND - 40, Phaser.Math.Between(R.goldZeny[0] * t, R.goldZeny[1] * t))
        this.runGems += R.goldGems
        this.burst(HERO_X + 80, GROUND - 40, COLORS.gold, 30, 260)
        this.floatText(HERO_X + 80, GROUND - 120, `💎 +${R.goldGems}`, '#7fd7ff')
        break
      }
      case 'fairy': {
        await this.choose(ev, [{ label: '🧚 รับพร', sub: 'เลือกพรตำนาน (แรง x2) 1 ใน 3' }])
        await this.offerPerks(true)
        break
      }
    }
    await this.wait(500)
    await this.levelUps()
  }

  // ---------- Dungeon 3: mini boss mechanics + top-tier skills (data/relics.ts) ----------
  private lastHurt = 0
  private bestAtk() { return Math.max(this.st.atk, this.st.matk) * this.atkMul() }
  private atkMul() {
    return (this.relic === 'trinity' ? 1 + RELIC_RULES.trinity.atkPct : 1) * (1 + this.harvest * RELIC_RULES.harvest.perKill) * (this.buf.blood > 0 && this.st.s2Star ? 1.15 : 1)
      * (this.hx.weaken > 0 ? BATTLE.weakenMul : 1) * (this.relic === 'aegis' && this.shield > 0 ? 1 + RELIC_RULES.aegis.dmg : 1)
  }

  /** Monster hit multiplier: Ice Age weakens it, the hunter smells blood when the hero is low. */
  private monMul(m: Mon) {
    let k = m.iced ? 1 - RELIC_RULES.iceage.atkDown : 1
    if (m.def.mini === 'hunter' && this.hp < this.st.maxHp * 0.5) k *= 1.2
    return k * m.dmgMul * (m.atkUpTurns > 0 ? 1 + m.atkUp : 1) * (m.weakTurns > 0 ? 1 - m.weakPct : 1)
  }

  /** Heal cut on a monster: Hellfire 5%/stack (max 50%), otherwise 25% while any normal burn is on it. */
  private healCut(m: Mon) {
    const H = RELIC_RULES.hellfire
    if (m.hell > 0) return Math.min(H.cutMax, m.hell * H.cutPerStack)
    return m.burnTurns > 0 || m.burnStackTurns > 0 ? RELIC_RULES.burnCut : 0
  }

  private healMon(m: Mon, n: number, quiet = false) {
    if (m.dead || n <= 0) return
    const cut = this.healCut(m)
    const got = Math.round(Math.min(m.def.hp - m.hp, n * (1 - cut)))
    if (got <= 0) return
    m.hp += got
    if (!quiet || cut > 0) this.damageNumber(m.spr.x, m.spr.y - m.spr.displayHeight, got, false, '#6fd08c', true)
    if (cut > 0) this.floatText(m.spr.x + 40, m.spr.y - m.spr.displayHeight - 24, `ตัดฮีล ${Math.round(cut * 100)}%`, '#ff8c42')
  }

  /** Lifesteal monsters heal from the damage that just landed on the hero (pre-shield). */
  private monLeech(m: Mon, share?: number) {
    let ls = share ?? m.def.lifesteal ?? 0
    if (m.def.mini === 'hunter' && share === undefined && m.hp < m.def.hp * BATTLE.frenzyAt) ls = BATTLE.frenzyLifesteal
    if (ls > 0 && this.lastHurt > 0) this.healMon(m, this.lastHurt * ls)
  }

  /** Duelist stance: the hero's hit is parried and answered with a riposte. */
  private parried(m: Mon) {
    m.parry = false; this.parryCount++
    m.spr.clearTint()
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 6, 'ปัด!', '#c9e0ff')
    this.slashFx(HERO_X + 40, GROUND - 50)
    sfx.door()
    const landed = this.hurtHero(m.def.dmg * BATTLE.monDmgMul * BATTLE.parryMul * this.monMul(m), false, 999)
    if (landed) this.floatText(HERO_X, GROUND - 130, 'โดนสวน!', '#ff7a7a')
  }

  /** Perfect Riposte skill: every Nth enemy attack is parried and countered. */
  private riposte(m: Mon) {
    if (this.relic !== 'riposte') return false
    if (++this.enemyAttacks % RELIC_RULES.riposte.every) return false
    this.counterCount++
    this.floatText(HERO_X, GROUND - 120, '🤺 ปัดป้อง!', '#c9e0ff')
    this.slashFx(m.spr.x - 20, GROUND - 40)
    this.strike(m, RELIC_RULES.riposte.mul, this.job.attack === 'magic', this.job.attack === 'magic' ? '#c9a8ff' : undefined)
    return true
  }

  private castIceAge() {
    const I = RELIC_RULES.iceage
    for (const m of this.alive()) { m.ice = I.turns; m.iceChance = I.freeze0; m.spr.setTint(0xcfefff); this.dotIcon(m) }
    this.cameras.main.flash(160, 190, 230, 255)
    this.callout('🧊 ยุคน้ำแข็ง!', W / 2, 150)
  }

  private async lightningWrath() {
    const S = RELIC_RULES.storm
    this.callout('🌩️ สายฟ้าพิโรธ!', W / 2, 150)
    this.cameras.main.flash(140, 200, 230, 255)
    for (let i = 0; i < S.bolts; i++) {
      const t = this.alive(); if (!t.length) break
      const m = t[Phaser.Math.Between(0, t.length - 1)]
      const bolt = this.add.rectangle(m.spr.x, GROUND - 200, 6, 220, 0xbfe6ff).setOrigin(0.5, 0).setDepth(9000)
      this.tweens.add({ targets: bolt, alpha: 0, duration: 160, onComplete: () => bolt.destroy() })
      this.damageMon(m, Math.max(1, Math.round(this.bestAtk() * Phaser.Math.FloatBetween(0.9, 1.1) * S.mul)), false, '#bfe6ff') // magic: no crit (RO rule)
      sfx.hit()
      await this.wait(70)
    }
    this.shake(160, 0.01)
  }

  private harvestSoul() {
    const H = RELIC_RULES.harvest
    if (this.harvest < H.max / H.perKill) this.harvest++
    this.heal(this.st.maxHp * H.heal, true)
    this.floatText(HERO_X, GROUND - 140, `🐦‍⬛ วิญญาณ +${Math.round(this.harvest * H.perKill * 100)}%`, '#c9a8ff')
  }

  // ---------- Dungeon 4-5: monster skills, hero debuffs, boss phases (design/dungeon-4-5-brutal.md) ----------
  /** Puts a hit effect on the hero. Purify (relic) ignores all of it; debuffRes rolls once per effect. */
  private applyFx(fx: HitFx, src?: Mon) {
    if (this.hp <= 0) return
    const X = this.hx
    for (const k of Object.keys(fx) as (keyof HitFx)[]) {
      const v = fx[k]!
      if (!v) continue
      if (this.relic === 'purify' || Math.random() < this.st.debuffRes) { this.resistCount++; this.floatText(HERO_X - 40, GROUND - 160, `${FX_ICON[k]} ต้านทาน!`, '#9fe3ff'); continue }
      this.debuffCount++
      if (k === 'poison') X.poison = Math.min(BATTLE.poisonCap, X.poison + v)
      else if (k === 'freeze') {
        const lost = v * (1 - this.st.tenacity)
        this.heroGauge = Math.max(-150, this.heroGauge - lost)
        this.floatText(HERO_X, GROUND - 150, '❄️ แข็ง! เสียเทิร์น', '#9fe3ff')
        this.heroSpr.setTint(0x9fe3ff); this.time.delayedCall(500, () => this.heroSpr.setTint((COSTUMES.find((c) => c.id === save().costume) ?? COSTUMES[0]).tint))
      } else X[k] = Math.max(X[k], v)
      if (k !== 'freeze' && src) this.floatText(HERO_X + 30, GROUND - 150, `${FX_ICON[k]} ${({ poison: 'พิษ', burn: 'ไฟลุก', weaken: 'อ่อนแรง', armorBreak: 'เกราะแตก', silence: 'ใบ้' } as Record<string, string>)[k]}`, '#ffb0e0')
    }
  }

  /** Poison / burn tick on the hero: shields soak it, it can't be dodged, and it can knock the hero out. */
  private dotHurt(dmg: number, icon: string, color: string) {
    let n = Math.max(1, Math.round(dmg))
    if (this.shield > 0) { const a = Math.min(this.shield, n); this.shield -= a; n -= a; if (n <= 0) return }
    this.hp = Math.max(0, this.hp - n)
    this.minHpPct = Math.min(this.minHpPct, this.hp / this.st.maxHp)
    this.damageNumber(HERO_X, GROUND - 70, n, false, color)
    this.floatText(HERO_X - 30, GROUND - 120, icon, color)
    this.knockedOut()
  }

  /** Reflected damage from a mirror monster: magic, never misses. Thorn Aura halves it. */
  private reflectHurt(m: Mon, dmg: number) {
    let n = Math.round(dmg * (1 - this.st.mdef * (this.hx.armorBreak > 0 ? BATTLE.armorBreakMul : 1)) * (this.relic === 'thornaura' ? 1 - RELIC_RULES.thornaura.reflectCut : 1))
    if (n <= 0) return
    if (this.shield > 0) { const a = Math.min(this.shield, n); this.shield -= a; n -= a; if (n <= 0) return }
    this.hp = Math.max(0, this.hp - n)
    this.minHpPct = Math.min(this.minHpPct, this.hp / this.st.maxHp)
    this.damageNumber(HERO_X, GROUND - 70, n, false, '#c9e0ff')
    if (Math.random() < 0.3) this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '🪞 สะท้อน!', '#c9e0ff')
    this.knockedOut()
  }

  /** Shared knock-out check for damage that skips hurtHero (Phoenix revive still works). */
  private knockedOut() {
    if (this.hp > 0) return
    if (this.st.revive > 0) {
      this.st.revive--; this.revivedCount++
      this.hp = Math.round(this.st.maxHp * Math.max(BATTLE.reviveHp, this.st.reviveHp))
      this.callout('🪶 ขนนกฟีนิกซ์! ลุกขึ้นอีกครั้ง', HERO_X + 120, GROUND - 150)
      return
    }
    sfx.die(); this.tweens.add({ targets: this.heroSpr, angle: -90, alpha: 0.6, duration: 400 })
  }

  /** Free formation slots for adds (bosses stand in the back, so only the two front slots then). */
  private freeSlots() {
    const live = this.alive()
    const used = new Set(live.filter((x) => x.def.ai !== 'boss').map((x) => x.slot))
    const max = live.some((x) => x.def.ai === 'boss') ? 2 : SLOT_X.length
    return [...Array(max).keys()].filter((i) => !used.has(i))
  }

  private summonAdds(kind: MonsterKind, n: number) {
    const free = this.freeSlots().slice(0, n)
    for (const sl of free) this.addMon(kind, sl, 0).summoned = true // adds start at gauge 0: one breath to react
    return free.length
  }

  /** A skill instead of an attack, on every `every`-th turn when it has a use. Returns true if one was used. */
  private async useSkill(m: Mon) {
    for (const sk of m.skills) {
      if (m.turns % sk.every) continue
      const allies = this.alive()
      let done = false
      if (sk.kind === 'heal') {
        const t = sk.self ? m : allies.filter((a) => a.hp < a.def.hp * 0.8).sort((a, b) => a.hp / a.def.hp - b.hp / b.def.hp)[0]
        if (t && t.hp < t.def.hp * 0.8) { this.healMon(t, t.def.hp * (sk.pow ?? 0.15)); done = true }
      } else if (sk.kind === 'shield') {
        for (const t of sk.self ? [m] : allies) { t.shield = Math.max(t.shield, Math.round(t.def.hp * (sk.pow ?? 0.1))); this.dotIcon(t) }
        done = true
      } else if (sk.kind === 'warcry') {
        if (sk.self) { m.atkUp += sk.pow ?? 0.2; m.atkUpTurns = sk.turns ?? 3 }
        else for (const t of allies) { t.atkUp = Math.max(t.atkUp, sk.pow ?? 0.2); t.atkUpTurns = Math.max(t.atkUpTurns, (sk.turns ?? 3) + (t === m ? 1 : 0)); this.dotIcon(t) }
        this.dotIcon(m); done = true
      } else if (sk.kind === 'haste') { for (const t of allies) if (t !== m) t.gauge += sk.pow ?? 30; done = true }
      else if (sk.kind === 'curse' && sk.fx) { this.applyFx(sk.fx, m); done = true }
      else if (sk.kind === 'summon' && sk.summon) done = this.summonAdds(sk.summon[0], sk.summon[1]) > 0
      else if (sk.kind === 'revive') {
        const corpse = this.mons.slice(this.roomStart).find((x) => x.dead && !x.revived && x.def.ai !== 'boss' && x !== m)
        const slot = this.freeSlots()[0]
        if (corpse && slot !== undefined) {
          corpse.revived = true
          const r = this.addMon(corpse.kind, slot, 0)
          r.revived = true; r.hp = Math.round(r.def.hp * (sk.pow ?? 0.5))
          done = true
        }
      }
      if (!done) continue
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10, `✦ ${sk.name}`, sk.kind === 'curse' ? '#ffb0e0' : '#b0ffc8')
      this.tweens.add({ targets: m.spr, scaleY: m.spr.scaleY * 1.12, duration: 140, yoyo: true })
      this.burst(m.spr.x, m.spr.y - 40, sk.kind === 'curse' ? 0xc03070 : 0x6fd08c, 12, 140)
      await this.wait(BATTLE.stepMs)
      return true
    }
    return false
  }

  /** Boss phase: heal / shield / adds on entering, then faster, harder, new tricks. */
  private enterPhase(m: Mon, p: BossPhase) {
    this.callout(`⚠️ ${m.def.name}: ${p.name}`, W / 2, 190)
    this.cameras.main.flash(200, 255, 80, 80)
    this.shake(220, 0.012)
    sfx.slam()
    this.tweens.add({ targets: m.spr, scaleX: m.spr.scaleX * 1.15, scaleY: m.spr.scaleY * 1.15, duration: 180, yoyo: true })
    if (p.cleanse) { m.burn = 0; m.burnTurns = 0; m.burnStacks = 0; m.burnStackTurns = 0; m.poison = 0; m.chill = 0; m.frozen = false }
    if (p.speed) m.speedMul *= p.speed
    if (p.dmg) m.dmgMul *= p.dmg
    if (p.chargeEvery) m.chargeEvery = p.chargeEvery
    if (p.reflect !== undefined) m.reflect = p.reflect
    if (p.skills) m.skills = p.skills
    if (p.onHit) m.onHit = p.onHit
    if (p.slamFx) m.slamFx = p.slamFx
    if (p.heal) this.healMon(m, m.def.hp * p.heal)
    if (p.shield) m.shield = Math.max(m.shield, Math.round(m.def.hp * p.shield))
    if (p.summon) this.summonAdds(p.summon[0], p.summon[1])
    this.dotIcon(m)
  }

  /** After the duel: pick 1 of 3 top-tier skills (the mini boss's two + one random). */
  private async offerRelic() {
    const sig = MINI_RELICS[this.miniKind ?? 'duelist'] ?? ['trinity', 'storm']
    const rest = (Object.keys(RELICS) as RelicId[]).filter((r) => !sig.includes(r))
    let ids: RelicId[] = [...sig, rest[Phaser.Math.Between(0, rest.length - 1)]]
    if (this.testRelic) ids = [this.testRelic, ...ids.filter((x) => x !== this.testRelic)].slice(0, 3) // bot hook
    sfx.win(); this.cameras.main.flash(220, 255, 230, 150)
    const c = await this.choose({ id: 'fairy', name: 'สกิลขั้นสูงสุด!', icon: '👑', desc: `ชนะ ${MONSTERS[this.miniKind ?? 'duelist'].name}! เลือกพลัง 1 อย่าง ติดตัวจนจบรอบนี้`, weight: 0, rare: true },
      ids.map((r) => ({ label: `${RELICS[r].icon} ${RELICS[r].name}`, sub: RELICS[r].desc })))
    const r = ids[c]
    this.relic = r
    if (r === 'trinity') {
      const T = RELIC_RULES.trinity
      this.applyMod({ crit: T.crit, critMul: T.critMul, combo: T.combo, counter: T.counter })
      this.st.combo = Math.min(0.5, this.st.combo); this.st.counter = Math.min(0.6, this.st.counter)
    }
    if (r === 'bloodpact') { this.st.lifesteal = Math.min(0.55, this.st.lifesteal + RELIC_RULES.bloodpact.lifesteal) }
    if (r === 'haste') this.smashCdLeft = Math.max(0, this.smashCdLeft - RELIC_RULES.haste.cd)
    this.callout(`👑 ${RELICS[r].icon} ${RELICS[r].name}`, W / 2, 190)
    await this.wait(400)
  }

  /** Event panel: icon, name, text and 1-3 option buttons. Resolves with the picked index. */
  private choose(ev: EventDef, opts: { label: string; sub: string; off?: boolean }[]) {
    return new Promise<number>((done) => {
      this.time.paused = true
      const c = this.add.container(0, 0).setDepth(30000)
      c.add(this.add.rectangle(W / 2, H / 2, W, H, COLORS.night, 0.78).setInteractive())
      const box = this.add.rectangle(W / 2, H / 2, 620, 380, ev.rare ? 0x3a2f1a : 0x22284a, 0.96).setStrokeStyle(4, ev.rare ? COLORS.gold : 0x5a5f8a)
      c.add(box)
      c.add(this.add.text(W / 2, H / 2 - 150, ev.icon, { fontSize: '52px' }).setOrigin(0.5))
      c.add(this.add.text(W / 2, H / 2 - 98, ev.name, { fontFamily: FONT_UI, fontSize: '28px', fontStyle: 'bold', color: ev.rare ? '#f2b84b' : '#f6eedc' }).setOrigin(0.5))
      c.add(this.add.text(W / 2, H / 2 - 64, ev.desc, { fontFamily: FONT_UI, fontSize: '16px', color: '#a9a6c7', align: 'center', wordWrap: { width: 560 } }).setOrigin(0.5, 0))
      const keys: string[] = []
      const finish = (i: number) => {
        if (!c.active || !opts[i] || opts[i].off) return
        keys.forEach((k) => this.input.keyboard!.removeAllListeners(k))
        this.pendingPick = undefined
        c.destroy()
        this.time.paused = false
        done(i)
      }
      const bw = opts.length === 1 ? 300 : opts.length === 2 ? 270 : 186, gap = 14
      const x0 = W / 2 - ((opts.length - 1) * (bw + gap)) / 2
      opts.forEach((o, i) => {
        const x = x0 + i * (bw + gap), y = H / 2 + 70
        const b = button(this, x, y, bw, 70, o.label, () => finish(i), { size: 17, fill: o.off ? 0x4a4e6e : COLORS.gold, color: o.off ? '#8a87a8' : undefined })
        c.add(b)
        c.add(this.add.text(x, y + 50, o.sub, { fontFamily: FONT_UI, fontSize: '13px', color: o.off ? '#8a87a8' : '#d8d4f0', align: 'center', wordWrap: { width: bw } }).setOrigin(0.5, 0))
        const k = `keydown-${['ONE', 'TWO', 'THREE'][i]}`
        keys.push(k)
        this.input.keyboard!.on(k, () => finish(i))
      })
      this.pendingPick = finish
    })
  }

  // ---------- smash / pause / speed ----------
  private queueSmash() {
    if (this.over || this.paused) return
    this.smashQueued = !this.smashQueued
    if (this.smashQueued) sfx.pop()
  }

  private setFast(on: boolean) {
    this.fast = on
    this.stopToken++ // a running hit-stop must not restore the old speed
    this.time.timeScale = on ? 2 : 1
    this.tweens.timeScale = on ? 2 : 1
    this.speedBtn.setLabel(on ? '▶▶ x2' : '▶ x1')
  }

  private showPause() {
    if (this.over || this.paused || this.overlay) return
    this.paused = true
    this.time.paused = true
    this.tweens.pauseAll()
    this.panel([
      { text: 'พักก่อน', size: 40, color: '#f2b84b', bold: true },
      { text: `${this.dg.name} · ด่าน ${this.room + 1}/${this.dg.rooms.length} · เก็บได้ ${this.zeny} zeny · ${this.kills} ตัว`, size: 19 },
      { text: 'กลับเมืองตอนนี้ได้ zeny กับ EXP ที่เก็บมาแล้วครบ ไม่หายค่ะ', size: 16, color: '#a9a6c7' },
    ], 'ลุยต่อ', () => { this.unpause() }, { label: 'กลับเมือง', onGo: () => { this.unpause(); this.runId++; this.settle(false); go(this, 'hub') } })
  }

  private unpause() {
    this.overlay?.destroy(); this.overlay = undefined
    this.paused = false
    this.time.paused = false
    this.tweens.resumeAll()
  }

  // ---------- results ----------
  private settle(won: boolean): string {
    if (this.settled) return ''
    this.settled = true
    const s = save()
    s.zeny += this.zeny
    if (this.dg.id === 'd1') s.bestRoom = Math.max(s.bestRoom, this.room + (won ? 1 : 0))
    let gems = 0
    if (won) {
      const by = (s.clearsBy ??= { d1: s.clears })
      gems += (by[this.dg.id] ?? 0) === 0 ? FREE_GEMS.firstClear : FREE_GEMS.clear
      by[this.dg.id] = (by[this.dg.id] ?? 0) + 1
      s.clears++
    }
    const before = s.gems
    const ups = addXp(this.runXp)
    s.gems += gems + this.runGems
    for (const id of this.runCards) addCard(s, id)
    persist()
    const lines = [`+${this.zeny} zeny · +${this.runXp} EXP${s.gems > before ? ` · +${s.gems - before} เพชร` : ''}`]
    if (ups.base) lines.push(`🎉 Base Lv ${s.baseLevel}! ได้แต้มสถานะเพิ่ม`)
    if (ups.job) lines.push(`✨ Job Lv ${s.jobLevel}! ได้แต้มสกิลเพิ่ม`)
    if (this.runCards.length) lines.push(`🃏 ได้การ์ด: ${this.runCards.map((id) => cardName(cardById(id)!)).join(', ')} (ใส่ได้ที่หน้าตัวละคร)`)
    return lines.join('\n')
  }

  private buildText() {
    const r = this.relic ? `${RELICS[this.relic].icon}${RELICS[this.relic].name}  ` : ''
    return r + (Object.keys(TAGS) as Tag[]).map((t) => [t, this.tagCount(t)] as const).filter(([, n]) => n > 0).map(([t, n]) => `${TAGS[t].icon}${n}`).join(' ')
  }

  private showGameOver() {
    const rewards = this.settle(false)
    this.panel([
      { text: this.timedOut ? 'หมดเวลา!' : 'ล้มแล้ว...', size: 44, color: '#ff7a7a', bold: true },
      ...(this.timedOut ? [{ text: `เกิน ${this.turnLimit} เทิร์นในการสู้ครั้งนี้ · ลองเพิ่มดาเมจ (ATK, คริ, พรสายโจมตี) ดูนะคะ`, size: 16, color: '#ffb0b0' }] : []),
      { text: `${this.dg.name} · ไปถึงด่าน ${this.room + 1}/${this.dg.rooms.length} · ล้มมอนไป ${this.kills} ตัว`, size: 19 },
      { text: rewards, size: 19, color: '#f2b84b' },
      { text: 'ของที่เก็บมาไม่หาย! ลองซื้ออาวุธหรือลงแต้มสถานะที่เมือง แล้วมาใหม่นะ', size: 16, color: '#a9a6c7' },
    ], 'ลองอีกครั้ง', () => { void this.startRun() }, { label: 'กลับเมือง', onGo: () => go(this, 'hub') })
  }

  private showWin() {
    const secs = Math.round((this.time.now - this.startedAt) / 1000)
    const rewards = this.settle(true)
    this.panel([
      { text: 'เคลียร์ดันแล้ว!', size: 44, color: '#f2b84b', bold: true },
      { text: `ล้ม${this.dg.boss}ได้ใน ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} นาที · ${this.kills} ตัว · HP เหลือ ${this.hp}`, size: 19 },
      { text: rewards, size: 19, color: '#f2b84b' },
      { text: `build: ${this.buildText() || '-'} · Lv ${this.level}`, size: 16, color: '#a9a6c7' },
    ], 'ลุยอีกรอบ', () => { void this.startRun() }, { label: 'กลับเมือง', onGo: () => go(this, 'hub') })
  }

  private panel(lines: { text: string; size: number; color?: string; bold?: boolean }[], label: string, onGo: () => void, alt: { label: string; onGo: () => void }) {
    this.overlay?.destroy()
    const c = this.add.container(W / 2, H / 2).setDepth(30000)
    c.add(this.add.rectangle(0, 0, W, H, COLORS.night, 0.82).setInteractive())
    let y = -((lines.length * 40) / 2) - 30
    for (const l of lines) {
      const t = this.add.text(0, y, l.text, { fontFamily: FONT_UI, fontSize: `${l.size}px`, fontStyle: l.bold ? 'bold' : 'normal', color: l.color ?? '#f6eedc', align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0)
      c.add(t)
      y += t.height + 12
    }
    c.add(button(this, 140, y + 34, 240, 56, label, () => onGo(), { size: 22 }))
    c.add(button(this, -140, y + 34, 240, 56, alt.label, () => alt.onGo(), { size: 22, fill: 0x5a5f8a, color: '#f6eedc' }))
    this.overlay = c
  }

  // ---------- HUD ----------
  private buildHud() {
    this.hud = this.add.graphics().setDepth(15000)
    const t = (x: number, y: number, size: number, color = '#f6eedc', font = FONT_NUM) =>
      this.add.text(x, y, '', { fontFamily: font, fontSize: `${size}px`, color, stroke: '#14172b', strokeThickness: 4 }).setDepth(15001)
    this.hudTxt = {
      hp: t(22, 13, 16), res: t(22, 40, 13), lv: t(232, 40, 13, '#a9a6c7'),
      zeny: t(W - 20, 13, 20, '#f2b84b').setOrigin(1, 0), room: t(18, 78, 16, '#f6eedc', FONT_UI), build: t(W / 2, 100, 18, '#f6eedc', FONT_UI).setOrigin(0.5, 0),
    }
    this.add.image(W - 70, 25, 'coin').setDepth(15001).setScale(1.2)
    fullscreenButton(this, W - 30, 66)
    button(this, W - 30, 110, 38, 38, 'II', () => this.showPause(), { size: 16, fill: 0x2a2e50, color: '#f6eedc' }).setDepth(15003)
    this.speedBtn = button(this, W - 90, 110, 70, 38, '▶ x1', () => this.setFast(!this.fast), { size: 15, fill: 0x2a2e50, color: '#f6eedc' }).setDepth(15003) as Btn
    this.smashBtn = button(this, W - 100, H - 70, 160, 84, 'ทุบ!', () => this.queueSmash(), { size: 22 }).setDepth(15003) as Btn
    this.s2Txt = this.add.text(W - 100, H - 124, '', { fontSize: '13px', color: '#7fd7ff', fontStyle: 'bold', stroke: '#14172b', strokeThickness: 3 }).setOrigin(0.5).setDepth(15003)
    this.debuffTxt = this.add.text(22, 98, '', { fontFamily: FONT_UI, fontSize: '15px', color: '#ffb0e0', stroke: '#14172b', strokeThickness: 4 }).setDepth(15001)
    this.setFast(false)
  }

  update() {
    if (!this.st) return
    const g = this.hud.clear()
    const hpW = 200
    g.fillStyle(COLORS.night, 0.8).fillRoundedRect(12, 10, hpW + 8, 26, 6)
    g.fillStyle(COLORS.hpBack).fillRoundedRect(16, 14, hpW, 18, 4)
    g.fillStyle(this.hp / this.st.maxHp > 0.3 ? COLORS.hp : 0xff9a3c).fillRoundedRect(16, 14, Math.max(0, hpW * this.hp / this.st.maxHp), 18, 4)
    this.hudTxt.hp.setText(`HP ${Math.round(this.hp)}/${Math.round(this.st.maxHp)}`)
    g.fillStyle(COLORS.night, 0.8).fillRoundedRect(12, 38, hpW + 8, 10, 3)
    g.fillStyle(0x7fd7ff).fillRect(16, 41, hpW * Math.min(1, this.xp / RULES.xpNeed(this.level)), 4)
    // shield over the HP bar
    if (this.shield > 0) g.fillStyle(0x9fe3ff, 0.75).fillRoundedRect(16, 14, Math.min(hpW, hpW * this.shield / this.st.maxHp), 6, 2)
    // job resource
    if (this.job.resource) {
      const r = RESOURCES[this.job.resource], max = this.resMax()
      g.fillStyle(COLORS.night, 0.8).fillRoundedRect(12, 50, hpW + 8, 14, 4)
      g.fillStyle(0x1d2140).fillRect(16, 53, hpW, 8)
      g.fillStyle(r.color).fillRect(16, 53, hpW * Math.min(1, this.res / max), 8)
      this.hudTxt.res.setText(`${r.name} ${Math.floor(this.res)}/${Math.round(max)}`).setPosition(hpW + 24, 48)
    } else this.hudTxt.res.setText('')
    this.hudTxt.lv.setText(`Lv ${this.level}`).setPosition(hpW + 24, 12)
    this.hudTxt.zeny.setText(`${this.zeny}`)
    const left = this.turnLimit - this.fightTurns
    this.hudTxt.room.setText(`${this.dg.name} · ด่าน ${this.room + 1}/${this.dg.rooms.length} · ⏳ ${this.alive().length ? `${left}/${this.turnLimit} เทิร์น` : '-'}`).setColor(this.alive().length && left <= 3 ? '#ff7a7a' : '#f6eedc').setPosition(18, this.job.resource ? 68 : 54)
    this.hudTxt.build.setText(this.buildText()).setY(14)
    const X = this.hx
    this.debuffTxt?.setText([X.poison > 0 ? `☠️${X.poison}` : '', X.burn > 0 ? `🔥${X.burn}` : '', X.weaken > 0 ? `💔${X.weaken}` : '', X.armorBreak > 0 ? `🛡️💥${X.armorBreak}` : '', X.silence > 0 ? `🤐${X.silence}` : ''].filter(Boolean).join(' ')).setY(this.job.resource ? 92 : 78)

    // monster HP bars + boss charge
    for (const m of this.mons) {
      if (m.dead || !m.spr.active) continue
      const w = Math.max(40, m.spr.displayWidth * 0.8), x = m.spr.x - w / 2, y = m.spr.y - m.spr.displayHeight - 12
      g.fillStyle(COLORS.night, 0.85).fillRect(x - 1, y - 1, w + 2, 8)
      g.fillStyle(m.def.ai === 'boss' ? COLORS.gold : COLORS.hp).fillRect(x, y, w * Math.max(0, m.hp / m.def.hp), 6)
      if (m.charging && m.def.breakPct) { // BREAK meter: fill it before the boss acts to cancel the attack
        const need = m.def.hp * m.def.breakPct
        g.fillStyle(COLORS.night, 0.85).fillRect(x - 1, y + 8, w + 2, 7)
        g.fillStyle(0x7fd7ff).fillRect(x, y + 9, w * Math.min(1, m.chargeDmg / need), 5)
      }
      m.dotTxt?.setPosition(m.spr.x, y - 12)
    }

    // turn queue strip (top centre): who acts next, left to right
    const q = this.over ? [] : this.previewQueue(7)
    while (this.queueIcons.length < 7) this.queueIcons.push(this.add.image(0, 0, 'novice').setDepth(15002))
    const qx = W / 2 - 3 * 46, qy = 66
    g.fillStyle(COLORS.night, q.length ? 0.6 : 0).fillRoundedRect(qx - 30, qy - 24, 7 * 46 + 14, 48, 10)
    this.queueIcons.forEach((ic, i) => {
      const a = q[i]
      if (a === undefined) { ic.setVisible(false); return }
      ic.setVisible(true).setPosition(qx + i * 46, qy).setTexture(a ? a.def.tex : this.job.tex).clearTint()
      const s = a ? (a.def.ai === 'boss' ? 0.36 : 0.75) : 0.75
      ic.setScale(i === 0 ? s * 1.25 : s).setFlipX(!!a && FACES_RIGHT.includes(a.kind))
      if (!a) ic.setTint((COSTUMES.find((c) => c.id === save().costume) ?? COSTUMES[0]).tint)
      if (i === 0) g.lineStyle(2, COLORS.gold).strokeRoundedRect(qx - 21, qy - 21, 42, 42, 8)
    })

    // smash button state
    const k2 = this.s2
    this.s2Txt?.setText(k2 ? `${k2.icon} ${k2.name} ${this.s2Cd > 0 ? `อีก ${this.s2Cd}` : this.res < k2.cost ? `รอ ${k2.cost}` : 'พร้อม'}` : '')
    const ready = this.smashCdLeft <= 0
    const u = this.job.ult
    const cost = this.ultCost(), short = cost > 0 && this.res < cost
    const tag = cost > 0 ? ` · 🔷${cost}` : ''
    this.smashBtn.setLabel(this.smashQueued ? (ready ? (short ? `รอ Mana\n${Math.floor(this.res)}/${cost}` : `${u.icon} ตาหน้า!\n(แตะยกเลิก)`) : `จองไว้แล้ว\nอีก ${this.smashCdLeft} เทิร์น`) : ready ? `${u.icon} ${u.name}\n${short ? `Mana ไม่พอ${tag}` : `พร้อม${tag}`}` : `${u.name}\nอีก ${this.smashCdLeft} เทิร์น`)
    this.smashBtn.setAlpha(ready || this.smashQueued ? 1 : 0.6)
  }

  // ---------- fx ----------
  private slashFx(x: number, y: number) {
    const s = this.add.image(x, y, 'slash').setDepth(9000).setScale(0.7)
    this.tweens.add({ targets: s, scale: 1, alpha: 0, duration: 180, onComplete: () => s.destroy() })
  }

  // ---------- hit feel (game-feel skill): small = evade · combo grows · medium = counter · large = crit ----------
  private comboLevel = 0
  private stopToken = 0
  private lastStop = 0
  private lowShake = false

  /** Camera shake; the "ลดจอสั่น" setting cuts it to a third. */
  private shake(ms: number, intensity: number) { this.cameras.main.shake(ms, this.lowShake ? intensity / 3 : intensity) }

  /** Hit-stop: freeze tweens + timers for a real-time moment, then put back the x1/x2 speed.
   *  Skipped when a bot runs the game fast, and at most one per 120 ms so multi-hits don't stall. */
  private hitStop(ms: number) {
    if (this.over || this.tweens.timeScale > 2) return
    const now = performance.now()
    if (now - this.lastStop < 120) return
    this.lastStop = now
    const tok = ++this.stopToken
    this.tweens.timeScale = 0.05; this.time.timeScale = 0.05
    window.setTimeout(() => {
      if (tok !== this.stopToken || !this.sys.isActive() && !this.sys.isPaused()) return
      const sp = this.fast ? 2 : 1
      this.tweens.timeScale = sp; this.time.timeScale = sp
    }, ms / (this.fast ? 2 : 1))
  }

  /** Big word that pops in with overshoot (EVADE / COUNTER / 3 HIT). */
  private popWord(x: number, y: number, s: string, color: string, size = 24, from = 1.7) {
    const t = this.add.text(x, y, s, { fontFamily: FONT_NUM, fontSize: `${size}px`, color, stroke: '#14172b', strokeThickness: 6 }).setOrigin(0.5).setDepth(10000).setScale(from)
    this.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' })
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, delay: 520, duration: 360, onComplete: () => t.destroy() })
  }

  private heroTint() { this.heroSpr.setTint((COSTUMES.find((c) => c.id === save().costume) ?? COSTUMES[0]).tint) }

  private comboSum = { on: false, per: new Map<Mon, { dmg: number, x: number, y: number }>() }

  /** RO double-attack style: after a combo chain, the summed damage pops big and yellow above the last target and hangs ~1.3 s. */
  private comboTotal(x: number, y: number, total: number, hits: number) {
    const ty = y - 62
    const tag = this.add.text(x, ty - 30, `${hits} HIT`, { fontFamily: FONT_NUM, fontSize: '16px', color: '#ffe9a8', stroke: '#14172b', strokeThickness: 5 }).setOrigin(0.5).setDepth(10001)
    const t = this.add.text(x, ty, `${total}`, { fontFamily: FONT_NUM, fontSize: `${36 + Math.min(3, hits - 2) * 6}px`, color: '#ffd34d', stroke: '#14172b', strokeThickness: 7 }).setOrigin(0.5).setDepth(10001).setScale(1.9)
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' })
    this.tweens.add({ targets: [t, tag], y: '-=18', alpha: 0, delay: 1300, duration: 400, onComplete: () => { t.destroy(); tag.destroy() } })
  }

  /** Counter: clang + spark, hero flashes white, short freeze, then the strike back. */
  private counterJuice() {
    this.popWord(HERO_X + 40, GROUND - 140, 'COUNTER!', '#ff9f43', 26)
    sfx.clang()
    this.burst(HERO_X + 36, GROUND - 50, 0xffd27a, 14, 260, true)
    this.heroSpr.setTintFill(0xffffff)
    this.time.delayedCall(90, () => this.heroTint())
    this.hitStop(60)
  }

  /** Crit: freeze, star burst, shake (the monster's white flash and big number come from damageMon). */
  private critJuice(m: Mon) {
    const y = m.spr.y - m.spr.displayHeight / 2
    this.burst(m.spr.x, y, 0xffe08a, 18, 320, true)
    const ring = this.add.circle(m.spr.x, y, 10).setStrokeStyle(4, 0xffe08a).setDepth(9001)
    this.tweens.add({ targets: ring, scale: 6, alpha: 0, duration: 260, ease: 'Quad.easeOut', onComplete: () => ring.destroy() })
    this.popWord(m.spr.x, m.spr.y - m.spr.displayHeight - 80, 'CRITICAL', '#ffd34d', 18, 2)
    this.shake(110, 0.008)
    sfx.critBoom()
    this.hitStop(80)
  }

  /** Evade: sidestep with an afterimage + whoosh; no shake (small tier). */
  private evadeJuice(label: string, color: string) {
    this.popWord(HERO_X, GROUND - 100, label, color, 22, 1.4)
    sfx.evade()
    const ghost = this.add.image(this.heroSpr.x, this.heroSpr.y, this.heroSpr.texture.key).setOrigin(0.5, 1).setScale(this.heroSpr.scaleX, this.heroSpr.scaleY)
      .setFlipX(this.heroSpr.flipX).setTintFill(0x9fe3ff).setAlpha(0.55).setDepth(this.heroSpr.depth - 1)
    this.tweens.add({ targets: ghost, x: ghost.x + 26, alpha: 0, duration: 260, onComplete: () => ghost.destroy() })
    this.tweens.add({ targets: this.heroSpr, x: HERO_X - 34, duration: 90, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { this.heroSpr.x = HERO_X } })
  }

  private damageNumber(x: number, y: number, n: number, crit: boolean, color?: string, heal = false) {
    const t = this.add.text(x + Phaser.Math.Between(-10, 10), y, heal ? `+${n}` : crit ? `${n}!` : `${n}`, {
      fontFamily: FONT_NUM, fontSize: crit ? '40px' : '24px', color: color ?? (crit ? '#ffd34d' : '#f6eedc'), stroke: '#14172b', strokeThickness: crit ? 7 : 5,
    }).setOrigin(0.5).setDepth(9999)
    if (crit) { t.setScale(1.8); this.tweens.add({ targets: t, scale: 1, duration: 240, ease: 'Back.easeOut' }) }
    this.tweens.add({ targets: t, y: y - 44, duration: 300, ease: 'Back.easeOut' })
    this.tweens.add({ targets: t, alpha: 0, delay: 500, duration: 260, onComplete: () => t.destroy() })
  }

  floatText(x: number, y: number, s: string, color: string) {
    const t = this.add.text(x, y, s, { fontFamily: FONT_UI, fontSize: '18px', fontStyle: 'bold', color, stroke: '#14172b', strokeThickness: 5 }).setOrigin(0.5).setDepth(9999)
    this.tweens.add({ targets: t, y: y - 34, alpha: 0, delay: 400, duration: 700, onComplete: () => t.destroy() })
  }

  private burst(x: number, y: number, color: number, n: number, speed: number, star = false) {
    const p = this.add.particles(x, y, 'dot', {
      speed: { min: speed * 0.3, max: speed }, angle: { min: star ? 0 : 180, max: 360 }, scale: { start: 0.9, end: 0 },
      lifespan: 420, tint: [color, 0xffffff], quantity: n, emitting: false,
    }).setDepth(9000)
    p.explode(n)
    this.time.delayedCall(600, () => p.destroy())
  }

  /** Coins pop out and fly to the zeny counter. */
  private coinsFly(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const c = this.add.image(x, y, 'coin').setDepth(9800)
      this.tweens.add({ targets: c, x: x + Phaser.Math.Between(-40, 40), y: y - Phaser.Math.Between(20, 60), duration: 220, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: c, x: W - 70, y: 25, duration: 380, delay: i * 30, ease: 'Quad.easeIn', onComplete: () => { c.destroy(); this.zeny++; sfx.coin() } }) })
    }
  }

  private callout(text: string, x: number, y: number) {
    const t = this.add.text(x, y, text, { fontFamily: FONT_UI, fontSize: '22px', fontStyle: 'bold', color: '#f2b84b', stroke: '#14172b', strokeThickness: 6 }).setOrigin(0.5).setDepth(9999)
    this.tweens.add({ targets: t, y: y - 20, alpha: 0, delay: 1300, duration: 500, onComplete: () => t.destroy() })
  }

  private banner(title: string, sub: string) {
    const c = this.add.container(W / 2, 190).setDepth(10000)
    c.add([this.add.rectangle(0, 0, W, 84, COLORS.night, 0.72),
      this.add.text(0, -14, title, { fontFamily: FONT_UI, fontSize: '30px', fontStyle: 'bold', color: '#f6eedc' }).setOrigin(0.5),
      this.add.text(0, 22, sub, { fontFamily: FONT_UI, fontSize: '16px', color: '#a9a6c7' }).setOrigin(0.5)]).setAlpha(0)
    this.tweens.add({ targets: c, alpha: 1, duration: 200, yoyo: true, hold: 1200, onComplete: () => c.destroy() })
  }
}
