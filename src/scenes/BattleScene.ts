import Phaser from 'phaser'
import { afterDef, BATTLE, hasFx, COMBO, doubleAtkChance, COLORS, hitChance, DUNGEONS, FONT_NUM, HARD, HARD_PASSIVES, HARD_SKILLS, hardGap, FONT_UI, H, MONSTERS, perkDesc, PLAYER, RULES, W, type BossPhase, type DungeonDef, type HitFx, type MonSkill, type MonsterDef, type MonsterKind, type Stats } from '../data/game-data'
import { ELEM_SRC, FOCUS_RULES, GENERAL_PERKS, IMMORTAL_RULES, IMMORTALS, JOB_LINES, levelDelta, LINES, MAGE_SKIP, newPerkStats, PERKS_V2, OFFER_RULES, OUTSIDE_CAP, overflowShare, PROC_POW, PROC_RULES, type Effect, type ImmortalId, type Line, type OutsideKey, type PerkDef, type PerkStats, type Proc, type Src, type Trigger } from '../data/perks'
import { EVENT_RULES, FORTUNE, type EventId } from '../data/events'
import { newFlags, runPostWaveEvent, type Curse, type EventHost, type Opt, type Panel, type RunFlags } from './battle-events'
import { blessBase, COSTUMES, FREE_GEMS, heroStats, itemById, PER_POINT, RESOURCES, splitStatLine, totalBase, type BaseStat } from '../data/meta'
import { cardById, cardName, cardPityMax, cardRate, cardsOfMonster, EQUIP_CARDS } from '../data/cards'
import { CLERIC_KIT, JOBS, SPELL_VAMP, MAGE_SPELL, RES_RULES, SWORD_MANA, type JobDef } from '../data/jobs'
import { JOB2, PET_IDS, type Job2Def, type PetId } from '../data/jobs2'
import { skill2Picked } from '../data/tree'
import { ALLIES, fillAllies, gadgetById, hawkMul, hurtAlly, liveAllies, makeAlly, rollGadget, tauntTarget, tickAllies, TRAP_IDS, useAlly, wolfMul, type Ally, type AllyCtx, type GadgetId } from '../battle/allies'
import type { Skill2Def } from '../data/skill2'
import { hotkeySlot, mayCast, resourceIcon, skillButtonState, slotCenter, sweepAngles, tapAction, type SkillBtnIn, type SkillBtnOut, type SkillSlot } from '../battle/skill-hud'
import { autoCost, breakChance, breakRefundMana, breaksOn, castUsesTurn, clericBasic, clericUltLights, clericUltSmash, dawnMul, hitBase, KIT, KIT2, MAGE_CAST, magicPower, S2N, s2Cooldown, ultCooldown, ultCost } from '../data/skill-math'
import { addCard, addMat, addXp, persist, save, ultMode } from '../save'
import { MAT_RULES, matName, matOf, taintDrop } from '../data/materials'
import { TAINT_MAT } from '../data/taint'
import { rollUniqueDrop, UNIQUE } from '../data/uniques'
import { hellEff, MINI_POOL, MINI_RELICS, RELIC_RULES, RELICS, type RelicId } from '../data/relics'
import { sfx, unlock } from '../sfx'
import { HARD_POWER, matchScale, overpowerMul, TOWER_POWER } from '../data/power'
import { legacyLevel, levelDropMul, roomLevel, scaleOf, skillAtLv, skillMul, slamScaleOf, statMonster, statNative, withStats } from '../data/mon-stats'
import { foldAffixes } from '../data/affixes'
import { PACKS } from '../data/dungeons'
import { buildRun, MODES, payTowerSkip, recordTowerCheckpoint, towerFloorLoot, towerSkipGems, type ModeArgs, type RunConfig, type RunRoom } from '../data/modes'
import { button, fullscreenButton, go, type Btn } from '../ui'

// Side-scroll, turn-based (Capybara Go-like): the hero walks right, meets a group, and everyone
// takes turns by speed (AGI). The player's job: the build (1-of-3 cards) and when to fire Smash.

const GROUND = 430 // feet line
const HERO_X = 220
const SLOT_X = [560, 660, 760, 850] // monster formation, front first
/** v86 skill-button view: one circle of the bottom-right cluster (redrawn only when its signature changes). */
interface SkillBtnView {
  slot: SkillSlot; r: number; sig: string
  c: Phaser.GameObjects.Container
  base: Phaser.GameObjects.Graphics; sweep: Phaser.GameObjects.Graphics; ring: Phaser.GameObjects.Graphics; bookRing: Phaser.GameObjects.Graphics
  spin?: Phaser.GameObjects.Graphics; flash: Phaser.GameObjects.Graphics
  icon: Phaser.GameObjects.Text; cd: Phaser.GameObjects.Text; cost: Phaser.GameObjects.Text; tag: Phaser.GameObjects.Text
}
const MIX_X = [530, 615, 730, 865] // tower mixed fight (floor 20+): 2 adds in front, bosses / minis behind
const FACES_RIGHT: MonsterKind[] = ['wolf', 'shadowwolf', 'boar', 'alpha', 'hunter'] // textures drawn facing right; flip to face the hero

interface Mon {
  kind: MonsterKind; def: MonsterDef; spr: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image
  hp: number; gauge: number; dead: boolean; slot: number; turns: number; charging: boolean; summoned: boolean
  burnStacks: number; burnStackTurns: number // Mage fire ult: stacking burn
  chill: number; frozen: boolean // Mage ice ult: chill = slowed turns left, frozen = skips its next turn
  burn: number; burnTurns: number; poison: number; poisonDmg: number; dotTxt?: Phaser.GameObjects.Text
  marked?: number // Cleric ★ judgement: turns of +15% damage taken
  parry: boolean // duelist Riposte stance: immortal until her next turn, every blocked hit is riposted
  riposteLeft?: number; bulletCd?: number; maiden?: Mon; maidenDone?: boolean; drainStats?: number; vengTurns?: number; vengCd?: number; bulletDone?: boolean; duelHeal?: number; duelHealTurns?: number; espadaNext?: number; espadaArmed?: boolean // duelist kit (Q 2026-11-04)
  ice: number; iceChance: number; iced: boolean // Ice Age: turns left, freeze chance this turn, attack is weakened this turn
  hell: number // Hellfire stacks (no cap)
  harvestMark: number // Soul Harvest: boss HP steps already counted
  // ----- Dungeon 4-5: skills, phases (design/dungeon-4-5-brutal.md) -----
  shield: number // absorbs hero damage first
  atkUp: number; atkUpTurns: number // warcry: + damage share for its own next N turns
  phase: number // boss phases entered so far
  speedMul: number; dmgMul: number; affix?: string; reflect: number; absorb: number; stored: number; chargeEvery: number
  skills: MonSkill[]; onHit?: HitFx; slamFx?: HitFx
  revived: boolean // came back once (necro): can't be raised again
  clone?: boolean; evaded?: number; trueTurns?: number // v56 trueSight: hero evades counted, then 🎯 its physical hits always land
  weakTurns: number; weakPct: number // hero Skill 2 ท้าทาย: hits weaker for its next N turns
  armorBrk: number // Mobster ตัดเส้นเอ็น: turns of DEF -KIT2.mobster.armorBrk
  blind: number // Crusader Holy Cross: turns of Hit -KIT2.crusader.blindHit
  wet: number // Innovator ☁️ เมฆฝน: turns of +KIT2.innovator.wetAmp damage taken
  huntMark: number // v82 Archer หมายหัว: turns of +st.arMark damage taken (ticks with its turns)
}
type Element = 'lightning' | 'fire' | 'ice'
/** v78 / v85 chant entry: `paid` = Mana spent (partly refunded on a break) · `safe` = the steady pity chant (can't break). */
type Cast = { kind: 'gust' | 'ult'; pow: number; hit: number; paid: number; safe?: boolean }
const ELEMENTS: Record<Element, { icon: string; name: string; sub: string }> = {
  lightning: { icon: '⚡', name: 'สายฟ้า', sub: 'เป้าเดียว ฟาด 6 ฮิต (0.3–1.2x ต่อฮิต) ฆ่าบอส' },
  fire: { icon: '🔥', name: 'ไฟ', sub: 'ดาเมจกลาง 2x + เผาซ้อน (ลดฮีลศัตรู)' },
  ice: { icon: '❄️', name: 'น้ำแข็ง', sub: 'ดาเมจ 1.6x + ช้าลง · โดนซ้ำแช่แข็ง' },
}
type Actor = { hero: true } | { hero: false; m: Mon }
const MINI_HINT: Record<string, string> = {
  duelist: 'ทุก 3 เทิร์นแทงจุดตาย (ดาเมจจริง) · ตั้งท่า Riposte = อมตะ ตีเข้าไปโดนสวน 80% · อย่าใช้ท่าไม้ตายตอนนั้น · ต่ำกว่า 40% เปิดจุดตายแล้วพุ่งแทง 4 ครั้ง',
  hunter: 'ดูดเลือดทุกครั้งที่กัด + Blood Razor ตามเลือดที่เราเหลือ · เราเลือดต่ำกว่าครึ่ง มันเร็วขึ้น 75% คอมโบถี่ · ไฟตัดฮีลได้',
  gunner: 'HP ต่ำกว่า 25% นับถอยหลัง 3 เทิร์นแล้วระดมยิง 25 นัด รีบปิดเกมหรือเปิดโล่ · ยิงรัว 3 นัด (Flee ช่วยหลบทีละนัด) · ชาร์จจรวดยักษ์ = เตรียมกันด้วยท่าไม้ตาย · ครึ่งเลือดยิงติดไฟ',
  drainer: 'HP ต่ำกว่าครึ่งเรียกเมเดน (อมตะจนกว่าเมเดนจะตาย · เมเดนหลบ 50% ทุกครั้ง · เผาทุกเทิร์น) · เวทดูดชีวิต · ต่ำกว่าครึ่งฟื้น HP ทุกเทิร์น · ท่าชาร์จดูดเลือดเต็ม · ทุก 4 เทิร์นปิดปาก 1 เทิร์น',
  venomqueen: 'ผิวพิษ: ตีโดน = ติดพิษ, คริเบา · พ่นใยมัดตัว = หลบไม่ได้ + AGI ครึ่ง 2 เทิร์น · เหล็กในทุก 2 เทิร์น · Venom Strike = พิษทวีคูณ 4 เทิร์น · ครึ่งเลือดฟักลูก',
  frostgiant: 'P.DEF สูงมาก (คริ/เวททะลุ) · ตีโดนเรา = หนามน้ำแข็ง DMG -15% · Frozen Heart ATK Speed -50% · ชาร์จทุบแล้วแข็ง · 40% ได้เกราะน้ำแข็ง',
  mirage: 'เก็บดาเมจที่โดน 30% (🔮) แล้วชาร์จยิงคืนเป็นโซลสไตรค์ 5 ลูก · เตรียมโล่/หลบตอนชาร์จ · ตีทีเราอ่อนแรง · ครึ่งเลือดเก็บ 40% + เศษกระจก',
  warlord: 'ทุก 3 เทิร์นคลั่งเลือดแรงขึ้นสะสม! ต้องจบไว · ดูดเลือด · ต่ำกว่า 30% เร็วมาก',
  sphinx: 'สายเวท มี M.DEF สูง (สายกายภาพได้เปรียบ) · ลำแสง 3 ลูกทุก 3 เทิร์น · ชาร์จปริศนา = ใบ้ + อ่อนแรง · ครึ่งเลือดได้โล่และแรงขึ้น',
  jackallord: 'AGI สูง หลบเก่ง ตีรัว + สวนกลับ · หลบได้ 2 ครั้งแล้วตาเหยี่ยวโดนแน่ · ครึ่งเลือดเรียกหมาไน 2 ตัว',
  ...Object.assign({}, ...PACKS.map((p) => p.miniHints)), // D7-D10 (v78, data/dungeons/dN.ts)
}
const FX_ICON: Record<keyof HitFx, string> = { poison: '☠️', burn: '🔥', weaken: '💔', armorBreak: '🛡️💥', silence: '🤐', freeze: '❄️', web: '🕸️', slow: '💙' }

export class BattleScene extends Phaser.Scene {
  // hero
  private st!: Stats
  private hp = 0
  private smashCdLeft = 0 // hero turns until Smash is ready (Novice: cooldown, no resource)
  private heroGauge = 0
  private heroSpr!: Phaser.GameObjects.Image
  private perks: { def: PerkDef; lv: number }[] = [] // พร v2 cards this run (lv 2 = "+")
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
  private runMats: Record<string, number> = {} // forge materials found this run (kept win or lose)
  private runUniques: string[] = [] // v88 unique items dropped by the final boss this run (added to the bag in settle)
  private runDupeMats: Record<string, number> = {} // v88 boss mats paid for a duplicate unique (never zeny; added after the hard-mode scaling)
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
  private autoBtn?: Btn
  private speedBtn!: Btn
  private overlay?: Phaser.GameObjects.Container
  private fast = false

  constructor() { super('battle') }

  private dg: DungeonDef = DUNGEONS[0]
  /** Hard mode (v47): replay of a cleared dungeon, monsters scale with Base Lv (data/game-data.ts HARD). gap = levels above the dungeon's recLv. */
  hard = false
  hardGap = 0
  /** v59: hard-mode monster multiplier from Hero Power (HUD shows it), normal-dungeon drop share when over-geared. */
  hardK = { hp: 1, atk: 1 }
  dropMul = 1
  /** v59 tower: affixes live on the current floor (folded), monsters enraged this fight (bots read enrageCount). */
  private aff = foldAffixes([])
  enrageCount = 0
  /** Bot / test hook: the open choice (event or card) picks option i. */
  pendingPick?: (i: number) => void
  /** Bot / debug: what the open level-up offer holds (PICK=smart in tools/bot.cjs). */
  pendingOffers?: { id: string; legend: boolean; up: boolean; own: boolean; general: boolean }[]
  eventLog: string[] = []
  /** Playtest counters (bots read these). */
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
  testEvent?: EventId // bot hook: every post-wave event is this one
  minHpPct = 1 // playtest: lowest HP share this run
  parryCount = 0
  freezeCount = 0
  private enemyAttacks = 0
  private harvest = 0
  /** Dungeon 4-5 debuffs on the hero (counts are hero turns, poison = stacks). */
  hx = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0, web: 0, slow: 0, thorn: 0, venom: 0, venomTurns: 0 }
  debuffCount = 0 // playtest: debuffs that landed this run
  resistCount = 0
  private roomStart = 0
  private debuffTxt?: Phaser.GameObjects.Text
  private buffTxt?: Phaser.GameObjects.Text // hero Skill 2 buffs (v77), right of the debuff line
  /** Event v2 (scenes/battle-events.ts): per-run flags, the HP an event fight can't push the hero below, 777 crit wave */
  flags: RunFlags = newFlags()
  private hpFloor = 0
  private starsOn = false
  private sayN = 0
  private fortuneTxt?: Phaser.GameObjects.Text

  /** Game mode of this run (data/modes.ts, design/game-modes-v1.md): rooms, scaling, mutators, HUD text. */
  run!: RunConfig
  private modeArgs: ModeArgs = {}
  /** Endless Tower: floors cleared this run, the floor bank (kept in full on leaving, half on falling), bot hook: auto-climb to this floor then leave. */
  towerFloor = 0
  private bank: { zeny: number; mats: Record<string, number> } = { zeny: 0, mats: {} }
  private leftTower = false
  autoTower?: number
  /** v87 tower floor skip: level / relic the hero starts with after paying for a skip (null = normal start). */
  private skipCatch: { lv: number; relic: boolean; est: boolean } | null = null
  private skipNote = ''
  private sky?: Phaser.GameObjects.Graphics

  init(data?: ModeArgs) {
    this.modeArgs = { ...(data ?? {}) }
    this.run = buildRun(save(), this.modeArgs)
    this.dg = this.run.themeAt(0)
    this.hard = this.run.modeId === 'hard'
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
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.skillHotkey(e)) // v86: 1/2/3 book Skill 1-3, 4 books the ult (manual mode)
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
    this.sky = this.add.graphics().setDepth(-100)
    this.paintSky()
    this.far = this.add.tileSprite(0, GROUND - 230, W, 200, 'bg_far').setOrigin(0).setDepth(-90).setAlpha(0.9).setTint(this.dg.hills)
    this.mid = this.add.tileSprite(0, GROUND - 170, W, 160, 'bg_mid').setOrigin(0).setDepth(-80).setTint(this.dg.hills)
    this.ground = this.add.tileSprite(0, GROUND - 20, W, H - GROUND + 20, 'grass0').setOrigin(0).setDepth(-70)
    if (this.dg.tier > 1) this.ground.setTint(0x9a90c0)
    this.add.rectangle(0, GROUND - 22, W, 6, 0x3d6e4c).setOrigin(0).setDepth(-69)
  }

  private paintSky() {
    const [top, bottom] = this.dg.sky
    this.sky?.clear().fillGradientStyle(top, top, bottom, bottom, 1).fillRect(0, 0, W, GROUND - 40)
  }
  /** Tower: a new theme every 10 floors repaints the sky and hills. */
  private retheme(dg: DungeonDef) {
    if (dg === this.dg) return
    this.dg = dg
    this.paintSky(); this.far.setTint(dg.hills); this.mid.setTint(dg.hills)
    if (dg.tier > 1) this.ground.setTint(0x9a90c0)
  }
  private roomDef(i: number): RunRoom | null { return this.run.roomAt(i) }

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
    this.skipCatch = null; this.skipNote = ''
    if (this.modeArgs.mode === 'tower' && this.modeArgs.skipTo) { // v87: pay the gems now (every run start, a retry pays again); short -> floor 1
      const S = this.modeArgs.skipTo, got = payTowerSkip(s, S)
      if (got) { this.skipCatch = got; this.modeArgs.startFloor = S + 1; persist(); this.skipNote = `⏭️ ข้ามไปชั้น ${S + 1} (-💎${towerSkipGems(S)})` }
      else { this.modeArgs.skipTo = undefined; this.modeArgs.startFloor = undefined; this.skipNote = '💎 เพชรไม่พอข้ามชั้น: เริ่มที่ชั้น 1' }
    }
    this.run = buildRun(s, this.modeArgs) // a retry rebuilds the run (new tower floors, same daily seed)
    this.retheme(this.run.themeAt(0))
    const mut = this.run.mut
    this.drained = 0; this.drainDelta = undefined
    this.st = heroStats(mut.lukMul !== 1 ? { ...s, stats: { ...s.stats, luk: Math.round(s.stats.luk * mut.lukMul) } } : s) // mutator ดวงพุ่ง
    this.st.maxHp = Math.round(this.st.maxHp * mut.heroMul.maxHp); this.st.atk *= mut.heroMul.atk; this.st.matk *= mut.heroMul.matk
    this.towerFloor = 0; this.bank = { zeny: 0, mats: {} }; this.leftTower = false
    this.hardGap = this.hard && !this.dg.level ? hardGap(this.dg.id, s.baseLevel) : 0
    if (this.hard && !this.dg.level) { const m = matchScale(this.run.pp, this.dg.id); this.hardK = { hp: m.hp * HARD_POWER.target, atk: m.atk * HARD_POWER.target } }
    else this.hardK = this.hard ? { hp: HARD_POWER.target, atk: HARD_POWER.target } : { hp: 1, atk: 1 } // D6+ fixed level: reward = HARD.reward x corruption
    this.dropMul = this.run.modeId === 'dungeon' ? (this.dg.level ? levelDropMul(s.baseLevel, this.dg.level) : overpowerMul(this.run.power, this.dg.id)) : 1
    this.aff = foldAffixes(this.run.corrupt?.affixes ?? []); this.enrageCount = 0
    this.hp = this.st.maxHp; this.smashCdLeft = 0; this.heroGauge = 0; this.zapCount = 0; this.emergencyUsed = false; this.firstOffer = true
    this.job = JOBS[s.job ?? 'novice']
    this.j2 = s.job2 && JOB2[s.job2]?.parent === this.job.id ? JOB2[s.job2] : undefined // 2nd job (design/second-jobs-v1.md)
    if (this.j2) this.job = { ...this.job, resource: this.j2.resource ?? this.job.resource, auto: { ...this.job.auto, cost: this.j2.autoCost ?? this.job.auto.cost }, ult: { ...this.job.ult, ...this.j2.ult } } // Berserker: Rage · Ult วิวัฒน์
    if (this.j2?.id === 'sage') this.job = { ...this.job, attack: 'melee' } // 📖 Sage: melee basic + counters (P.ATK)
    this.sageInt = totalBase(s).int; this.heroDex = totalBase(s).dex; this.heroWis = totalBase(s).wis; this.casts = []; this.steady = false; this.endow = 0 // Phase 5 Mage · v78 DEX lowers the chant break
    this.heroLuk = totalBase(s).luk; this.pet = s.pet ?? 'hawk' // Phase 4 Archer: hawk / gadget odds read base LUK
    { const wpn = itemById(s.equipped.weapon ?? ''); this.j2Weapon = !!this.j2?.mastery.ok(wpn); this.hasShield = !wpn.twoHand && !!s.equipped.offhand && s.equipped.offhand !== 'none_off'; this.dualKnife = this.hasShield && itemById(s.equipped.offhand ?? '').wtype === 'dagger' }
    this.frenzy = 0; this.frenzyAt = 0; this.s3Cd = 0; this.rampage = 0; this.charges = 0; this.allies = []; this.allyTxt.clear(); this.chargeTxt = undefined
    this.s2 = this.job.id === 'novice' ? undefined : skill2Picked(s.jobTree, this.job.id); this.s2Cd = 0
    this.buf = { guard: 0, blood: 0, hawk: 0, mshield: 0, renew: 0, bless: 0 }; this.s2Count = 0
    this.blessOn = false; this.blessDelta = undefined; this.kyrie = { hp: 0, hits: 0 } // v77 พรแสง
    if (this.s2?.id === 'cl_spear') this.st.spearMul += S2N.spearPlus(this.st.s2Lv) // หอกคม: +10%/lv of the 0.3x base
    this.res = this.job.resource === 'rage' ? 0 : this.resMax()
    this.shield = 0; this.dodgeCharges = 0; this.ctrCharges = 0
    this.heroSpr.setTexture(this.job.tex).setTint((COSTUMES.find((c) => c.id === s.costume) ?? COSTUMES[0]).tint).setAngle(0).setAlpha(1)
    this.perks = []; this.hits = 0; this.procHits = {}; this.pk = newPerkStats(); this.masteries = []; this.src = 'other'; this.immortal = null; this.eggN = 0; this.eggDef = 0
    this.level = 1; this.xp = 0; this.zeny = 0; this.kills = 0; this.runXp = 0; this.runGems = 0; this.runCards = []; this.runMats = {}; this.runUniques = []; this.runDupeMats = {}; this.pendingLevels = 0
    this.cardLuck = 1 + Math.min(PER_POINT.luk.dropCap, PER_POINT.luk.dropPct * totalBase(s).luk)
    this.settled = false; this.over = false; this.smashQueued = false; this.clearBookings()
    this.buildSkillHud() // v86: job / 2nd job / Skill 2 are known now
    this.startedAt = this.time.now
    this.eventLog = []; this.lockTarget = undefined; this.lockStacks = 0; this.hawkTurn = 0; this.revivedCount = 0; this.spears = 0; this.spearAcc = 0; this.ultRegenTurns = 0; this.shieldLayers = []; this.smiteCount = 0; this.counterCount = 0; this.comboCount = 0; this.comboLevel = 0; this.lowShake = !!save().lowShake; this.autoUlt = ultMode() === 'auto'; this.autoSkip = false; this.ultHeld = 0; this.peakTurns = 0; this.turnsLog = []
    this.flow = 0; this.faith = 0; this.wardTurns = 0; this.holyRevived = false // v84 webs: momentum / Faith / ม่านพร / ★ คืนชีพ (1 per run)
    this.minHpPct = 1; this.relic = null; this.miniKind = null; this.miniWon = false; this.parryCount = 0; this.freezeCount = 0; this.harvest = 0; this.enemyAttacks = 0
    this.hx = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0, web: 0, slow: 0, thorn: 0, venom: 0, venomTurns: 0 }; this.webOn = false; this.webDelta = undefined; this.debuffCount = 0; this.resistCount = 0
    this.flags = newFlags(); this.hpFloor = 0; this.starsOn = false
    if (Object.keys(mut.hero).length) this.applyMod(mut.hero)
    this.runElement = null
    if (this.job.id === 'mage') {
      const els = Object.keys(ELEMENTS) as Element[]
      const c = await this.choose({ name: 'เลือกธาตุท่าไม้ตาย', icon: '🔮', desc: 'รอบนี้ "เวทธาตุ" จะใช้ธาตุไหน?' },
        els.map((e) => ({ label: `${ELEMENTS[e].icon} ${ELEMENTS[e].name}`, sub: ELEMENTS[e].sub })))
      if (id !== this.runId) return
      this.element = els[c]
      this.runElement = this.element
    }
    if (this.run.mutators.length) { // daily: show the day's rules before the first wave
      this.banner(`${this.run.corrupt ? `☠️ Corruption (รางวัล x${this.run.corrupt.reward.toFixed(2)})` : "🎲 กฎวันนี้"}: ${this.run.mutators.map((m) => `${m.icon} ${m.name}`).join(' · ')}`, this.run.mutators.map((m) => m.desc).join(' · '))
      await this.wait(1600)
      if (id !== this.runId) return
    }
    if (this.skipCatch) { // v87: the level + relic the checkpoint had, picked up front (no fights yet)
      const c = this.skipCatch
      this.banner(this.skipNote, `เริ่ม Lv ${c.lv} · เลือกการ์ด ${c.lv - 1} ใบ${c.relic ? ' + พรเทพ 1 ใบ' : ''}${c.est ? ' (ประมาณจากชั้น: ยังไม่เคยมีบันทึก)' : ''}`)
      await this.wait(1200)
      if (id !== this.runId) return
      this.level = c.lv; this.pendingLevels = c.lv - 1
      await this.levelUps()
      if (id !== this.runId) return
      if (c.relic) { await this.offerRelic(true); if (id !== this.runId) return }
    } else if (this.skipNote) { this.banner(this.skipNote, ''); await this.wait(1000); if (id !== this.runId) return }
    for (let i = 0; ; i++) {
      const room = this.roomDef(i)
      if (!room) break
      this.room = i
      this.retheme(this.run.themeAt(i))
      await this.walk(i === 0 ? 700 : 1100)
      if (id !== this.runId) return
      await this.spawnRoom(i)
      const won = await this.fight(id)
      if (id !== this.runId) return
      if (!won) { this.over = true; await this.wait(700); this.showGameOver(); return }
      this.heal(this.st.maxHp * RULES.healOnClear * this.run.mut.waveHeal)
      if (this.immortal === 'egg' && this.eggN < IMMORTAL_RULES.eggMax) { this.eggN++; this.st.def += this.eggDef * IMMORTAL_RULES.eggStep; this.floatText(HERO_X, GROUND - 150, `🥚 ไข่ทองคำ +${Math.round(this.eggN * IMMORTAL_RULES.eggStep * 100)}%`, '#ffd86b') }
      if (this.flags.eliteReward) this.eliteReward()
      this.gainXp(RULES.xpOnClear); this.runXp += RULES.xpOnClear
      await this.levelUps()
      // the 1v1 mini boss gives a top-tier skill instead of an event; other waves (not the boss) lead to one event
      if (room.mini) { this.miniWon = true; if (this.run.relicAfter(room, !!this.relic)) { await this.offerRelic(); if (id !== this.runId) return } }
      for (let e = this.run.eventsAfter(i, room); e > 0; e--) { await this.postWaveEvent(); if (id !== this.runId) return }
      if (this.run.endless && room.floorEnd && !(await this.floorCleared(room.floor ?? i + 1))) {
        if (id !== this.runId) return
        this.over = true; sfx.win(); await this.wait(400); this.showTowerLeave(); return
      }
      if (id !== this.runId) return
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
    const room = this.roomDef(i)!
    const kinds: MonsterKind[] = []
    this.roomStart = this.mons.length
    if (this.run.affixesAt) { // v59 tower: one more floor rule every 10 floors
      const next = foldAffixes(this.run.affixesAt(room)), fresh = next.defs.filter((a) => !this.aff.defs.includes(a))
      this.aff = next
      if (fresh.length) { this.banner(`🗼 กฎใหม่ของหอคอย: ${fresh.map((a) => `${a.icon} ${a.name}`).join(' · ')}`, fresh.map((a) => a.desc).join(' · ')); await this.wait(1400) }
    }
    if (room.mini) {
      const pool = room.miniPool ?? MINI_POOL
      this.miniKind = pool[Phaser.Math.Between(0, pool.length - 1)]
      const d = MONSTERS[this.miniKind]
      this.banner(`⚔️ ดวล 1-1 · ${d.name} ${d.title ?? ''}`, MINI_HINT[d.mini!])
      kinds.push(this.miniKind)
    } else {
      this.banner(room.title, room.boss ? 'บอสชาร์จพลัง = ตาเรา! เตรียมกันด้วยท่าไม้ตาย หรือรีบตีให้จบ' : 'ผลัดกันตีตามความเร็ว (AGI) · ' + (this.autoUlt ? 'ท่าไม้ตายออกเองอัตโนมัติ' : 'แตะปุ่มทุบเมื่อพร้อม'))
      for (const [k, n] of room.spawn) for (let j = 0; j < n; j++) kinds.push(k)
    }
    kinds.slice(0, SLOT_X.length).forEach((k, j) => this.addMon(k, j))
    if (this.flags.elite && !room.mini && !room.boss) { // event ทางแยก: this wave is elite
      const E = EVENT_RULES.forkElite
      this.flags.elite = false; this.flags.eliteReward = true
      for (const m of this.mons.slice(this.roomStart)) { m.def = { ...m.def, hp: Math.round(m.def.hp * E.hp), dmg: m.def.dmg * E.dmg }; m.hp = m.def.hp; m.spr.setTint(0xff9a8a) }
      this.callout('🔥 ทางอันตราย: มอนแกร่งขึ้น!', W / 2, 250)
    }
    if (this.job.id === 'archer') { // archer talents: ก้าวถอย / สมาธิพราน
      if (this.st.arWaveDodge > 0) this.dodgeCharges = Math.max(this.dodgeCharges, this.st.arWaveDodge)
      if (this.st.arStartFull > 0) this.res = this.resMax()
    }
    if (this.st.mgWaveBarrier > 0) this.addShield(this.st.matk * this.st.mgWaveBarrier, true) // mage talent ลูกศิษย์น้ำแข็ง
    if (this.st.waveDodge > 0) this.dodgeCharges = Math.max(this.dodgeCharges, this.st.waveDodge) // Thief talent: ม่านควัน
    if (this.st.bossShield > 0 && this.mons.some((m) => !m.dead && m.def.ai === 'boss')) this.addShield(this.st.maxHp * this.st.bossShield) // cleric talent: ร่างพร
    if (this.st.spearStart > 0) this.spears += this.st.spearStart // cleric talent: หอกเปิดศึก
    if (this.st.clManaShield > 0) this.addShield(this.st.maxRes * this.st.clManaShield, true) // v86 💠 มานาพิทักษ์: wave-start shield from Max Mana
    if (this.st.waveShield > 0) { // gear: tops the shield up (never stacks) at every wave start
      const target = Math.round(this.st.maxHp * this.st.waveShield * (1 + this.st.shieldAmp))
      if (this.shield < target) { this.shield = target; this.floatText(HERO_X, GROUND - 100, `🛡️ โล่ ${target}`, '#9fe3ff') }
    }
    await this.wait(900)
  }

  private addMon(kind: MonsterKind, slot: number, gauge?: number) {
    const def = statNative(kind) && this.dg.level ? this.statDef(MONSTERS[kind]) : this.hardDef(this.modeDef(this.buffDef(this.legacyStats(kind)), kind))
    const big = def.ai === 'boss'
    const x = this.roomDef(this.room)?.mixed ? MIX_X[slot] ?? SLOT_X[slot] : big ? 720 : SLOT_X[slot] // tower mixed fight: adds in front, big ones behind
    const y = GROUND + (slot % 2 ? 14 : -4)
    const shadow = this.add.image(W + 80, y + 2, 'shadow').setScale((def.radius * 2.4) / 60 * 1.4, 1.2).setDepth(y - 1)
    const spr = this.add.image(W + 80, y, def.tex).setOrigin(0.5, 1).setScale(kind === 'minijellop' ? 1.1 : big ? 1.6 : 1.5).setDepth(y)
    if (FACES_RIGHT.includes(kind)) spr.setFlipX(true)
    if (this.hard) spr.setTint(HARD.tint)
    else if (this.run.tint) spr.setTint(this.run.tint)
    else if (this.run.affix && def.ai === 'boss') spr.setTint(HARD.tint)
    const affix = (this.hard || this.run.affix) && def.ai === 'boss' ? this.lastAffix : undefined
    const m: Mon = { kind, def, spr, shadow, hp: def.hp, gauge: gauge ?? Phaser.Math.Between(0, 40), dead: false, slot, turns: 0, charging: false, summoned: false, burnStacks: 0, burnStackTurns: 0, chill: 0, frozen: false, burn: 0, burnTurns: 0, poison: 0, poisonDmg: 0, parry: false, ice: 0, iceChance: 0, iced: false, hell: 0, harvestMark: 0, huntMark: 0,
      shield: 0, atkUp: 0, atkUpTurns: 0, phase: 0, speedMul: 1, dmgMul: 1, reflect: def.reflect ?? 0, absorb: def.absorb ?? 0, stored: 0, chargeEvery: def.chargeEvery ?? BATTLE.slamEvery, skills: def.skills ?? [], onHit: def.onHit, slamFx: def.slamFx, revived: false, weakTurns: 0, weakPct: 0, armorBrk: 0, blind: 0, wet: 0, affix }
    if (affix) m.speedMul = this.lastSpeed
    m.speedMul *= this.modeSpeed
    if (affix) this.time.delayedCall(700, () => this.callout(`🔥 ${def.name}: ${affix}`, W / 2, 205))
    this.mons.push(m)
    this.tweens.add({ targets: [spr, shadow], x, duration: 600, ease: 'Quad.easeOut', delay: slot * 90 })
    return m
  }

  /** D6+ level dungeon: numbers from the monster's 7 stats at the room's level (data/mon-stats.ts). No Hero Power scaling;
   * 🔥 hard = +50% stat points on every tier, boss / mini affixes, and the run's corruption (affixes + stat boosts). */
  private statDef(base: MonsterDef): MonsterDef {
    const lv = this.roomDef(this.room)?.lv ?? roomLevel(this.dg.level!, this.dg.rooms, this.room)
    const out = statMonster(base, lv, { hard: this.hard, statMul: this.run.corrupt?.statMul })
    const mut = this.run.mut
    if (mut.monHp !== 1) out.hp = Math.round(out.hp * mut.monHp)
    if (mut.monAtk !== 1) { out.dmg *= mut.monAtk; out.matk = (out.matk ?? out.dmg) * mut.monAtk }
    this.modeSpeed = mut.monSpeed * this.aff.speed
    if (this.hard && out.ai === 'boss' && !out.passive) { this.hardAffix(out); if (this.run.corrupt?.tyrant) this.hardAffix(out) }
    if (!out.passive) this.aff.mon(out) // corruption: tower affixes reused
    return out
  }

  /** v68: 7 stats on an old monster at its home dungeon's level (numbers stay as tuned; see mon-stats withStats). */
  private legacyStats(kind: MonsterKind): MonsterDef {
    const d = MONSTERS[kind], src = this.dg
    return withStats(d, kind, legacyLevel(kind, d, src), { hard: this.hard, statMul: this.run.corrupt?.statMul })
  }

  /** v56 global monster buff by dungeon tier (BATTLE.monBuff): HP, ATK and M.ATK. */
  private buffDef(def: MonsterDef): MonsterDef {
    const t = Math.max(0, Math.min(4, this.dg.tier - 1)), hp = BATTLE.monBuff.hp[t], dmg = BATTLE.monBuff.dmg[t]
    return { ...def, hp: Math.round(def.hp * hp), dmg: def.dmg * dmg, ...(def.matk ? { matk: def.matk * dmg } : {}) }
  }

  /** Tower / daily (RunConfig.scale): level + floor + mutator multipliers; tower bosses also roll the hard-mode affixes. */
  private modeDef(def: MonsterDef, kind?: MonsterKind): MonsterDef {
    const room = this.roomDef(this.room), k = room ? this.run.scale(room, kind) : null
    this.modeSpeed = (k?.speed ?? 1) * this.aff.speed
    if (!k) return def
    const out: MonsterDef = { ...def, hp: Math.round(def.hp * k.hp), dmg: def.dmg * k.atk, ...(def.matk ? { matk: def.matk * k.atk } : {}), hit: (def.hit ?? 15) + k.hit }
    if (this.run.affix && !this.hard && def.ai === 'boss' && !def.passive) this.hardAffix(out)
    if (!def.passive) this.aff.mon(out) // v59 tower floor affixes
    return out
  }
  private modeSpeed = 1

  /** Hard mode: HP / ATK / M.ATK / Hit scaled by the hero's Base Lv over the dungeon's recLv. */
  private hardDef(def: MonsterDef): MonsterDef {
    if (!this.hard) return def
    // v59: HP x hero offense, ATK x hero survival, both over the dungeon's reference build, x target (power.ts matchScale)
    const k = this.hardK
    const out: MonsterDef = { ...def, hp: Math.round(def.hp * k.hp), dmg: def.dmg * k.atk, ...(def.matk ? { matk: def.matk * k.atk } : {}), hit: (def.hit ?? 15) + HARD.hitPerLv * Math.min(25, this.hardGap) }
    if (def.ai === 'boss' && !def.passive) this.hardAffix(out)
    return out
  }

  /** Hard mode: a mini boss / boss rolls 1 extra skill + 1 passive (final bosses of dungeon 3+: 2 passives). */
  private hardAffix(d: MonsterDef) {
    const pick = <T,>(a: T[]) => a[Phaser.Math.Between(0, a.length - 1)]
    const sk = pick(HARD_SKILLS.filter((x) => !(d.skills ?? []).some((y) => y.kind === x.kind && JSON.stringify(y.fx) === JSON.stringify(x.fx))))
    d.skills = [...(d.skills ?? []), sk] // own skills keep priority
    d.trueSight = HARD_POWER.bossSight // v59 anti-evasion (Q: Flee 159 Thief made bosses useless): 1 dodge -> sure hits for 3 turns
    if (d.phases) d.phases = d.phases.map((p) => (p.skills ? { ...p, skills: [...p.skills, sk] } : p))
    const pool = HARD_PASSIVES.filter((p) => !(p.onHit && hasFx(d.onHit)) && !(p.reflect && (d.reflect || d.absorb)) && !(p.lifesteal && d.lifesteal))
    const n = !d.mini && this.dg.tier >= 3 ? 2 : 1
    const got: string[] = []
    this.lastSpeed = 1
    for (let i = 0; i < n && pool.length; i++) {
      const p = pool.splice(Phaser.Math.Between(0, pool.length - 1), 1)[0]
      got.push(p.name)
      if (p.lifesteal) d.lifesteal = (d.lifesteal ?? 0) + p.lifesteal
      if (p.reflect) d.reflect = (d.reflect ?? 0) + p.reflect
      if (p.onHit) d.onHit = p.onHit
      if (p.def) d.def = (d.def ?? 0) + p.def
      if (p.speed) this.lastSpeed = p.speed
      if (p.enrage) d.phases = [...(d.phases ?? []), { at: 0.35, name: p.name, dmg: p.enrage, speed: 1.15 }].sort((a, b) => b.at - a.at)
    }
    this.lastAffix = `${sk.name} · ${got.join(' · ')}`
  }
  private lastAffix = ''
  private lastSpeed = 1

  private removeMon(m: Mon) { m.spr.destroy(); m.shadow.destroy(); m.dotTxt?.destroy(); m.dotTxt = undefined }
  private alive() { return this.mons.filter((m) => !m.dead) }
  private smashTurns() { return Math.max(2, Math.round(this.st.smashCd / BATTLE.msPerTurn)) }
  private heroSpeed() { return BATTLE.heroSpeed * (this.st.aspd / PLAYER.aspd) * (1 + this.frenzy * KIT2.berserker.frenzyAspd) * (this.hx.slow > 0 ? BATTLE.frozenHeart : 1) * (this.relic === 'haste' ? 1 + RELIC_RULES.haste.speed : 1) }

  /** Who acts next: fill gauges until someone reaches 100 (ties go to the hero). */
  private nextActor(): Actor {
    const live = this.alive()
    for (;;) {
      if (this.heroGauge >= 100) { this.heroGauge -= 100; return { hero: true } }
      const m = live.filter((x) => x.gauge >= 100).sort((a, b) => b.gauge - a.gauge)[0]
      if (m) { m.gauge -= 100; return { hero: false, m } }
      const hs = this.heroSpeed()
      this.heroGauge += hs
      if (this.allies.length) fillAllies(this.allies, this.st, hs) // own-turn allies (wolf) share the queue
      for (const x of live) x.gauge += this.monSpeed(x)
    }
  }

  private monSpeed(m: Mon) {
    const frenzy = m.def.mini === 'hunter' && m.hp < m.def.hp * BATTLE.frenzyAt ? BATTLE.frenzySpeed : 1
    const scent = this.scent(m) ? BATTLE.scentSpeed : 1 // hunter กลิ่นเลือด: the hero is low
    return (m.def.speed ?? BATTLE.monSpeed[m.kind] ?? 10) * (m.chill > 0 ? Math.max(0.3, 0.6 - this.st.chillSlow) : 1) * Math.max(frenzy, scent) * m.speedMul
  }
  private scent(m: Mon) { return m.def.mini === 'hunter' && this.hp > 0 && this.hp < this.st.maxHp * BATTLE.scentAt }
  /** hunter Blood Razor: a landed normal hit adds magic damage from the hero's current HP. */
  private razor(m: Mon) {
    if (!m.def.razor || this.hp <= 0 || m.dead) return
    const n = this.hp * m.def.razor
    if (n >= 1 && this.hurtHero(n, true, 999, m)) this.floatText(HERO_X + 30, GROUND - 150, '🩸 Blood Razor', '#ff7a9a')
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
    this.undrain()
    this.fightTurns = 0; this.timedOut = false
    this.frenzy = 0; this.boomUsed = false; this.firstSwing = true; this.rampage = 0
    this.martyrUsed = false; this.j2Hurt = false; this.clearAllies() // Crusader ★ ผู้พลีชีพ once per wave · allies last one wave
    this.clearBookings() // v86: booked Skill 1-3 do not carry into the next wave (the ult booking does)
    this.zenyWave = 0; this.mirror = false; this.waveAllies() // Phase 4 Archer: pets / traps every wave
    this.casts = []; this.castFx(false); this.zenTurns = 0; this.endow = 0; this.rodUsed = false // Phase 5 Mage: a charge never carries into the next wave
    if (this.st.j2ChargeFirst > 0) this.heroGauge = Math.max(this.heroGauge, 100) // Knight ★ ทะยาน: the hero acts first
    this.flow = 0; this.clEmerUsed = false; this.sweepTurn = 0 // v84: momentum and ฉุกเฉิน are per wave, the sweep counts this wave's hero turns
    if (this.st.j2Banner > 0) { // v84 Knight ปักธง: tops the shield up at every wave start (never stacks)
      const want = Math.round(this.st.maxHp * this.st.j2Banner * (1 + this.st.shieldAmp))
      if (this.shield < want) { this.shield = want; this.floatText(HERO_X, GROUND - 100, `🚩 ปักธง: โล่ ${want}`, '#9fe3ff') }
    }
    this.lowHpDone = false; this.demonOn = false; this.demonDone = false; this.comboAtkN = 0; this.fightUlts = 0; this.lowRegen = { turns: 0, amt: 0 }
    const room = this.roomDef(this.room)
    this.turnLimit = room?.turnLimit ?? (room?.boss ? BATTLE.bossTurnLimit : BATTLE.turnLimit)
    this.turnLimit = Math.round(this.turnLimit * BATTLE.monBuff.turns[Math.max(0, Math.min(4, this.dg.tier - 1))])
    if (this.hard) this.turnLimit = Math.round(this.turnLimit * HARD.turnMul)
    if (room) this.turnLimit = Math.max(5, Math.round(this.turnLimit * this.run.turnMul(room))) // tower floors / daily ⏳ รีบเร่ง
    if (this.relic === 'iceage') this.castIceAge()
    if (this.relic === 'aegis') { // โล่อมตะ: shield at every fight start (tops up, never stacks)
      const want = Math.round(this.st.maxHp * RELIC_RULES.aegis.shield * (1 + this.st.shieldAmp))
      if (this.shield < want) { this.shield = want; this.floatText(HERO_X, GROUND - 100, `🛡️ โล่อมตะ ${want}`, '#9fe3ff') }
    }
    if (Object.keys(this.flags.pendingFx).length) { this.applyFx(this.flags.pendingFx); this.flags.pendingFx = {} } // event trap / runes
    if (this.flags.stars) { this.flags.stars = false; this.starsOn = true; this.applyMod({ crit: 1 }); this.callout('🌠 777! คริทุกฮิต', W / 2, 250) }
    if (this.procs('fightStart') > 0) await this.wait(350) // พร v2: fight-start cards
    while (this.alive().length && this.hp > 0) {
      const a = this.nextActor()
      if (this.allies.length) { await this.allyTurns(); if (!this.alive().length || this.hp <= 0) break }
      if (a.hero) {
        if (this.fightTurns >= this.turnLimit) { await this.timeUp(); return false }
        this.fightTurns++
        this.peakTurns = Math.max(this.peakTurns, this.fightTurns)
        this.enrageTick(room)
        const left = this.turnLimit - this.fightTurns
        if (left === 3 || left === 1) this.callout(`⏳ เหลืออีก ${left} เทิร์น!`, W / 2, 150)
        await this.heroTurn()
      } else await this.monTurn(a.m)
      if (id !== this.runId) return false
      await this.levelUps()
      await this.wait(90)
    }
    this.turnsLog.push(this.fightTurns)
    this.demonOn = false
    this.hx = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0, web: 0, slow: 0, thorn: 0, venom: 0, venomTurns: 0 }; this.syncWeb() // debuffs end with the fight
    if (this.starsOn) { this.starsOn = false; this.applyMod({ crit: -1 }) }
    return this.hp > 0
  }

  /** v59 tower: a fight that drags past N hero turns enrages every monster (+x damage per hero turn, stacking). */
  private enrageTick(room: RunRoom | null) {
    const after = room && this.run.enrageAfter ? this.run.enrageAfter(room) : 0
    if (!after || this.fightTurns <= after) return
    for (const m of this.alive()) m.dmgMul *= 1 + TOWER_POWER.enragePer
    this.enrageCount++
    if (this.fightTurns === after + 1) this.callout(`😡 มอนคลั่ง! แรงขึ้น ${Math.round(TOWER_POWER.enragePer * 100)}% ทุกเทิร์น`, W / 2, 175, '#ff7a7a')
  }

  // ---------- hero turn ----------
  /** Dungeon 4-5: debuffs tick before the hero acts and count down after. */
  private async heroTurn() {
    const X = this.hx
    if (this.relic === 'purify') this.heal(this.st.maxHp * RELIC_RULES.purify.regen, true)
    if (X.poison > 0) { this.dotHurt(this.st.maxHp * BATTLE.poisonPct * X.poison, '☠️', '#b48aff'); X.poison-- }
    if (X.burn > 0 && this.hp > 0) this.dotHurt(this.st.maxHp * BATTLE.burnPct, '🔥', '#ff8c42')
    if (X.venomTurns > 0 && this.hp > 0) { this.dotHurt(X.venom * (1 - this.st.mdef), '🕷️', '#9be35a'); X.venom *= 2; if (--X.venomTurns === 0) X.venom = 0 } // Venom Strike: magic DoT that doubles every turn
    if (this.hp <= 0) return
    if (this.job.id === 'cleric') this.tickShieldLayers()
    if (this.frenzy > 0 && this.fightTurns - this.frenzyAt > KIT2.berserker.frenzyKeep) { this.frenzy = 0; this.floatText(HERO_X, GROUND - 150, '🔥 Frenzy หมด', '#c9c9d6') }
    if (this.st.j2Es > 0 && !this.j2Hurt) this.addShield(this.st.maxHp * this.st.j2Es, true) // Monk Invoker Energy Shield (Meditate)
    if (this.st.j2Dark > 0) this.addShield(this.st.maxHp * this.st.j2Dark, true) // Monk Chayula Darkness
    this.j2Hurt = false
    await this.heroAct()
    if (this.allies.length) await this.alliesOnTurn() // boar charge / robot turret
    if (this.st.j2Sweep > 0 && ++this.sweepTurn % KIT2.knight.tree.sweepEvery === 0 && this.alive().length && this.hp > 0) await this.spearSweep() // v84 Knight ทวนวน
    if (this.wardTurns > 0) this.wardTurns-- // v84 Priest ม่านพร
    for (const a of tickAllies(this.allies)) { this.floatText(HERO_X + 70, GROUND - 120, `${a.def.icon} หมดเวลา`, '#c9c9d6'); this.syncAlly(a) }
    this.allies = liveAllies(this.allies)
    if (this.rampage > 0) this.rampage--
    if (this.endow > 0 && !this.st.j2EndowWave) this.endow-- // Sage Endow (★ อาวุธธาตุ: whole wave)
    if (this.st.j2RageTurn > 0 && this.job.resource === 'rage' && this.res >= RES_RULES.rageMax && this.alive().length && this.hp > 0) { // Berserker ★ ไม่รู้สึกเจ็บ
      this.res = 0; this.callout('👹 ไม่รู้สึกเจ็บ! ฟันอีกรอบ', W / 2, 170); await this.basicAttack()
    }
    if (this.job.id === 'cleric') this.syncShieldLayers()
    if (X.burn > 0) X.burn--
    if (X.weaken > 0) X.weaken--
    if (X.armorBreak > 0) X.armorBreak--
    if (X.silence > 0) X.silence--
    if (X.slow > 0) X.slow--
    if (X.thorn > 0) X.thorn--
    if (X.web > 0 && --X.web === 0) this.syncWeb()
    if (this.job.id === 'cleric') {
      if (this.ultRegenTurns > 0) { this.ultRegenTurns--; this.heal(this.st.maxHp * this.st.ultRegen) } // cleric talent: พรยืนยาว
      this.spearAcc += this.st.spearRate
      if (Math.random() < this.st.spearLuck) { this.spears++; this.floatText(HERO_X + 30, GROUND - 170, '🍀 หอกแสง!', '#f6e27a') } // v37 Q: LUK calls light spears
      while (this.spearAcc >= 1) { this.spearAcc--; this.spears++ }
    }
    await this.fireSpears() // พร v2: ✨ cards give every job light spears
  }

  // ---------- Cleric: light spears (design/skill-tree-priest.md 3.1) ----------
  private spears = 0
  private spearAcc = 0
  private ultRegenTurns = 0
  /** v58 Q: Priest shields last CLERIC_KIT.shieldTurns hero turns and the total never goes past shieldCap of max HP.
   *  Layers are bookkeeping only: this.shield stays the one number every hit path reads; hits eat the oldest layer first. */
  private shieldLayers: { amt: number; turns: number }[] = []
  private syncShieldLayers() {
    const cap = Math.round(this.st.maxHp * CLERIC_KIT.shieldCap)
    if (this.shield > cap) this.shield = cap
    let sum = this.shieldLayers.reduce((a, l) => a + l.amt, 0)
    if (this.shield > sum) { this.shieldLayers.push({ amt: this.shield - sum, turns: CLERIC_KIT.shieldTurns }); sum = this.shield } // shield from any other path (gear, overheal...)
    let eaten = sum - this.shield
    for (const l of this.shieldLayers) { const a = Math.min(l.amt, eaten); l.amt -= a; eaten -= a }
    this.shieldLayers = this.shieldLayers.filter((l) => l.amt > 0)
  }
  /** Start of each Priest turn: layers age; a layer that hits 0 turns fades. */
  private tickShieldLayers() {
    this.syncShieldLayers()
    let gone = 0
    for (const l of this.shieldLayers) if (--l.turns <= 0) gone += l.amt
    this.shieldLayers = this.shieldLayers.filter((l) => l.turns > 0)
    if (gone > 0) { this.shield = Math.max(0, this.shield - gone); this.floatText(HERO_X, GROUND - 100, `🛡️ โล่หมดเวลา −${Math.round(gone)}`, '#9fe3ff') }
  }
  private smiteCount = 0
  private async fireSpears() {
    const n = Math.min(KIT.spearMax, this.spears); this.spears = 0
    if (!n || !this.alive().length || this.hp <= 0) return
    this.floatText(HERO_X + 30, GROUND - 140, `🔱 x${n}`, '#f6e27a')
    this.burst(700, GROUND - 40, 0xf6e27a, 10 + n * 2, 200)
    const mul = (KIT.spearBase + this.st.spearMul) * (this.relic === 'magicspear' ? RELIC_RULES.magicspear.mul : 1) // mythic หอกเวท
    this.withSrc('spear', () => {
      for (let i = 0; i < n; i++) {
        for (const m of this.alive()) { this.strike(m, mul, true, '#f6e27a'); if (this.pk.spearBurn > 0) this.addBurn(m, this.pk.spearBurn, false) } // legend หอกเพลิง
        if (this.st.spearHeal > 0) this.heal(this.st.maxHp * this.st.spearHeal, true)
        if (this.px('spearShield') > 0 && Math.random() < this.px('spearShield')) this.addShield(this.st.maxHp * PROC_RULES.spearShield, true) // หอกคุ้มกาย
      }
    })
    if (this.relic === 'magicspear') this.withSrc('fire', () => { for (const m of this.alive()) { this.strike(m, PROC_POW.firewave!, true, '#ff8c42'); this.addBurn(m, 1) } })
    if (this.st.clSpearShield > 0) this.addShield(this.st.maxHp * this.st.clSpearShield) // v58 Ult web: เกราะแสง
    await this.wait(BATTLE.stepMs * 0.3)
  }
  /** Skill heal (auto / ult): talents/tree turn it into shield and damage too. */
  private skillHeal(n: number) {
    const eff = n * (1 + this.st.healAmp)
    this.heal(n)
    this.addFaith(KIT.clericTree.faithHeal) // v84 สวดภาวนา
    if (this.st.healShield > 0) this.addShield(eff * this.st.healShield, true)
    const f = this.front()[0]
    if (this.st.atone > 0 && f) this.damageMon(f, Math.max(1, Math.round(eff * this.st.atone)), false, '#ffe08a') // tree ★A: ไฟชำระ
  }

  private async heroAct() {
    this.execTurnUsed = false; this.critPetUsed = false
    if (this.st.regen > 0) this.heal(this.st.maxHp * this.st.regen * BATTLE.regenPerTurn / 100, true)
    if (this.lowRegen.turns > 0) { this.lowRegen.turns--; this.heal(this.st.maxHp * this.lowRegen.amt) } // ฟื้นยามคับขัน
    const rt = this.px('resTurn'); if (rt > 0) { const left = this.resGain(rt); if (left > 0 && this.pk.prayHeal > 0) this.heal(this.st.maxHp * this.pk.prayHeal * left, true) } // ภาวนา (v78: the share that didn't fit / Novice -> heal)
    if (this.zenTurns > 0) this.zenTurns--
    if (this.smashCdLeft > 0) this.smashCdLeft--
    if (this.relic === 'storm' && this.fightTurns % RELIC_RULES.storm.every === 0) { await this.lightningWrath(); if (!this.alive().length) return }
    // resource tick
    if (this.job.resource === 'mana') this.res = Math.min(this.resMax(), this.res + this.st.resRegen * RES_RULES.manaPerTurnMul * (1 - this.st.resRegenCut))
    this.overflow = this.st.mgOverflow > 0 && this.job.resource === 'mana' && this.res >= this.resMax() * 0.9 // mage talent พลังล้น
    if (this.alive().length && this.procs('turn') + this.procs('every2') > 0) { await this.wait(160); if (!this.alive().length) return } // พร v2: every-turn cards
    if (this.job.resource === 'energy') this.res = Math.min(this.resMax(), this.res + (RES_RULES.energyPerTurn + this.st.arTurnRes) * (1 - this.st.resRegenCut))
    const chantDone = this.casts.length > 0 && castUsesTurn(this.j2?.id) // v78: a Mage / Sage chant landing IS this turn's action (Wizard: free)
    if (this.casts.length) { await this.releaseCasts(); if (!this.alive().length || this.hp <= 0) return } // 🔮 last turn's chant goes off (before the silence check)
    await this.skill2Turn()
    if (this.j2 && this.alive().length && this.hp > 0) await this.skill3Turn()
    if (!this.alive().length || this.hp <= 0) return
    if (this.st.arHawk > 0 && ++this.hawkTurn % 3 === 0) { const t = this.alive(); if (t.length) { const m = t[Phaser.Math.Between(0, t.length - 1)]; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 20, '🦅', '#f2d24b'); this.strike(m, this.st.arHawk, true, '#f2d24b') } } // archer talent เหยี่ยวคู่ใจ
    this.autoUltTurn()
    if (chantDone) return // free actions above still ran; no Skill 1 / ult / basic this turn
    if (this.smashQueued && this.smashCdLeft <= 0 && this.hx.silence > 0) this.floatText(HERO_X, GROUND - 140, `🤐 ใบ้! อีก ${this.hx.silence} เทิร์น`, '#c9a8ff')
    const ultCost = this.ultCost()
    const ultWaiting = this.smashQueued && this.smashCdLeft <= 0 && this.hx.silence <= 0 // ult ready and booked
    if (ultWaiting && this.res >= ultCost) {
      this.smashQueued = false
      this.smashCdLeft = this.ultTurns()
      this.spendRes(ultCost)
      this.ultOpen = 1 + this.pk.ultBoost // legend เปิดฉากเต็มแรง (v78: every ult)
      this.fightUlts++
      this.popSkill('ult')
      await this.asSkill(() => (this.job.id === 'novice' ? this.smash() : this.ultimate()), 'ult')
      if (!this.casts.some((c) => c.kind === 'ult')) await this.afterUlt() // a chanted ult runs these when it lands
      await this.faithBurst() // v84 ศรัทธา: an ult heal can fill Faith too
      return
    }
    if (ultWaiting) this.floatText(HERO_X, GROUND - 140, `🔷 Mana ไม่พอ ult (${Math.floor(this.res)}/${ultCost})`, '#5aa0ff') // keep it booked, save Mana for it
    const cost = autoCost(this.job, this.st)
    const s1Ok = mayCast(!this.autoUlt, this.book.s1) // v86: manual mode only casts Skill 1 when it is booked, otherwise a basic attack (saves Mana for the ult)
    const castS1 = async () => { this.spendRes(cost); this.book.s1 = false; this.popSkill('s1'); await this.asSkill(() => this.autoSkill(), 'skill') }
    if (this.job.id === 'cleric') { // v59 Q: the Priest smashes EVERY turn; Skill 1 rides along (heal first when low, holy light after the smash)
      const castable = () => s1Ok && !ultWaiting && this.res >= cost && this.alive().length > 0 && this.hp > 0
      const low = this.hp < this.st.maxHp * (KIT.clericHealBelow - this.st.healAt)
      if (low && castable()) await castS1()
      if (this.alive().length) await this.basicAttack()
      if (!low && castable()) await castS1()
      await this.faithBurst() // v84 ศรัทธา: full Faith bursts after the turn's actions
      return
    }
    if (this.job.resource && s1Ok && !ultWaiting && this.res >= cost && this.alive().length) {
      await castS1()
      return
    }
    await this.basicAttack()
  }

  private job: JobDef = JOBS.novice
  // ----- skill web v1: Skill 2 (data/skill2.ts, design/skill-web-v1.md) -----
  private s2?: Skill2Def
  private s2Cd = 0 // hero turns until Skill 2 can cast again
  private buf = { guard: 0, blood: 0, hawk: 0, mshield: 0, renew: 0, bless: 0 } // hero turns left on Skill 2 buffs
  private kyrie = { hp: 0, hits: 0 } // v77 พรแสง "+" Kyrie Eleison: barrier HP + hits left (gone with the blessing)
  private s2Count = 0 // casts this run (bot/debug)
  private book = { s1: false, s2: false, s3: false } // v86 manual mode: skills the player booked (the ult uses smashQueued)
  private skillBtns: SkillBtnView[] = [] // v86 MOBA-style cluster (everything but the Novice)
  private skillTip?: Phaser.GameObjects.Text
  private res = 0
  private shield = 0
  private dodgeCharges = 0
  private ctrCharges = 0 // Swordsman talent ท่าสวนพร้อม: sure counters left
  /** Mana the ult costs (Mage, Swordsman); 0 for every other job. */
  private ultCost() { return ultCost(this.job) }
  private resMax() { return this.job.resource === 'rage' ? RES_RULES.rageMax : this.job.resource === 'energy' ? RES_RULES.energyMax : this.st.maxRes }
  private ultTurns() {
    const t = this.job.id === 'novice' ? this.smashTurns() : ultCooldown(this.job, this.st) // gear smashCd cuts every job's ult
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
  /** Pay Mana / Energy / Rage; v86 💠 มานาพิทักษ์ heals a share of the Mana spent. */
  private spendRes(n: number) {
    if (n <= 0) return
    this.res -= n
    if (this.st.clManaHeal > 0 && this.job.resource === 'mana' && this.hp > 0) this.heal(n * this.st.clManaHeal, true)
  }
  private gainRes(n: number) { if (this.job.resource && this.job.resource !== 'rage') this.res = Math.min(this.resMax(), this.res + n) }
  /** v78 focus: resource gain for any job; returns the share (0..1) that didn't fit (no resource = all of it). */
  private resGain(n: number) {
    const r = this.job.resource
    if (!r) return overflowShare(n, 0, false)
    const add = r === 'rage' ? n * (1 + this.st.rageGain) : n, room = this.resMax() - this.res
    this.res = Math.min(this.resMax(), this.res + add)
    return overflowShare(add, room)
  }
  private poisonMax() { return 12 + this.st.poisonCap }
  private burnMax() { return 10 + this.st.burnCap }
  private berserking() { return this.st.berserk > 0 && this.hp < this.st.maxHp * 0.3 }
  private lockTarget?: Mon
  private lockStacks = 0
  private hawkTurn = 0
  private ultFiring = false // archer: ult hits a charging boss harder (ทะลวงเกราะ / ศรบั่น)

  /** One physical/magic hit. RO-style crit: physical only, rolled first; a crit always hits (skips flee) and ignores DEF.
   *  Magic never misses and never crits. Returns damage dealt. */
  private strike(m: Mon, mul: number, magic = false, color?: string, pierce = 0): number {
    if (m.dead || this.hp <= 0) return 0
    const crit = this.forceCrit || Math.random() < (magic ? this.st.spellCrit : this.st.crit + (this.buf.hawk > 0 ? S2N.hawkCrit(this.st.s2Lv) : 0) + this.critAdd + (this.rampage > 0 ? KIT2.berserker.ultCrit : 0)) // magic crits only with spellCrit (talent/item/card) · Skill 2 ตาเหยี่ยว · 2nd job
    if (!magic && !crit && !this.sureHit && this.zenTurns <= 0 && Math.random() > hitChance(this.st.hit, m.def.flee ?? 5)) { this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 6, 'MISS', '#a9a6c7'); return 0 }
    if (!magic && m.def.luckyDodge && Math.random() < m.def.luckyDodge) { this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 6, '🍀 หลบ!', '#a9a6c7'); return 0 } // D6+ stat monsters: LUK lucky dodge (even vs crits, like the hero's)
    if (m.def.fixedFlee && Math.random() < m.def.fixedFlee) { this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 6, 'MISS 👻', '#e0a8ff'); return 0 } // Maiden: always 50%
    if (this.skillHits) mul *= 1 - this.skillCut() // spell vamp drawbacks: skill / ult damage cut
    if (this.j2) mul *= this.j2Mul(m, crit, magic)
    const brittle = Math.max(this.st.brittle, this.px('vsChill')) // tree: ice "เปราะ" · card เปราะน้ำแข็ง + gear/cards (the higher one)
    if (m.chill > 0 && brittle > 0) mul *= 1 + brittle
    if (this.ultFiring && m.charging && this.st.arUltBreak > 0) mul *= 1 + this.st.arUltBreak // archer tree/talent: ult vs a charging boss
    if (this.st.arLowHpBonus > 0 && m.hp < m.def.hp * 0.5) mul *= 1 + this.st.arLowHpBonus // archer talent เก็บตัวเปราะ r2
    if (crit && this.st.thExecute > 0 && m.hp < m.def.hp * 0.3) mul *= 1.5 // Thief ★ เพชฌฆาต
    if (crit && this.st.arCritRes > 0 && this.job.resource === 'energy') this.res = Math.min(this.resMax(), this.res + this.st.arCritRes) // archer talent ลมหายใจนักล่า
    const r = this.roll(mul, magic, crit), up = this.src === 'ult' ? this.st.ultPierce : 0 // v78 บดกระดูก: ult pierce
    if (!magic && !crit) r.dmg = m.def.def ? Math.max(1, Math.round(afterDef(r.dmg, m.def.def * (1 - Math.min(1, pierce + up)) * (m.armorBrk > 0 ? 1 - KIT2.mobster.armorBrk : 1)))) : r.dmg // Mobster เกราะแตก
    if (magic && m.def.mdef) r.dmg = Math.max(1, Math.round(r.dmg * (1 - m.def.mdef * (1 - Math.min(1, up))))) // D6+ stat monsters: WIS M.DEF
    if (r.crit && m.def.statDef?.critDR) r.dmg = Math.max(1, Math.round(r.dmg * Math.max(1 / (this.st.critMul || 1), 1 - m.def.statDef.critDR))) // LUK crit DR, never below a normal hit
    if (m.def.toxicSkin) { // venomqueen Toxic Skin: crit bonus halved, -5% damage
      const T = BATTLE.toxicSkin, cm = this.st.critMul || 1
      if (r.crit && cm > 1) r.dmg = r.dmg * (1 + (cm - 1) * (1 - T.critCut)) / cm
      r.dmg = Math.max(1, Math.round(r.dmg * (1 - T.dr)))
    }
    const broken = m.armorBrk > 0
    this.damageMon(m, r.dmg, r.crit, color)
    if (broken && this.st.swBreakLeech > 0 && this.hp > 0) this.heal(r.dmg * this.st.swBreakLeech, true) // v84 Swordsman ซ้ำรอย
    if (m.def.toxicSkin && this.hp > 0) this.applyFx({ poison: BATTLE.toxicSkin.poison }) // every landed hit poisons the hero
    if (m.def.iceSkin && this.hp > 0) { if (!this.hx.thorn) this.floatText(HERO_X + 30, GROUND - 150, '❄️ หนามน้ำแข็ง! DMG -15%', '#9fe3ff'); this.hx.thorn = BATTLE.iceSkin.turns }
    if (this.skillHits) { this.skillHits.dmg += r.dmg; this.skillHits.mons.add(m) }
    if (!magic && this.st.poison > 0 && !m.dead) { m.poison = Math.min(this.poisonMax(), m.poison + this.st.poison); m.poisonDmg = this.st.poisonDmg; this.dotIcon(m) }
    if (this.relic === 'hellfire' && !m.dead) { m.hell++; this.dotIcon(m) }
    const ls = this.st.lifesteal + (this.buf.blood > 0 ? S2N.bloodVamp(this.st.s2Lv) : 0) // Skill 2 เลือดเดือด
    if (ls > 0 && this.lsMul > 0) this.heal(r.dmg * ls * this.lsMul * (this.berserking() ? 2 : 1) * (this.st.bloodKing > 0 && this.hp < this.st.maxHp * 0.4 ? 2 : 1), true) // Thief ★ ราชันย์โลหิต
    if (r.crit) sfx.crit(); else sfx.hit()
    this.gainRage(RES_RULES.rageOnHit)
    if (r.crit && !magic && this.j2?.id === 'berserker') { // คลั่งเลือด: crits stack Frenzy
      const max = KIT2.berserker.frenzyMax + this.st.j2FrenzyMax
      this.frenzyAt = this.fightTurns
      if (this.frenzy < max) { this.frenzy++; this.floatText(HERO_X, GROUND - 165, `🔥 Frenzy ${this.frenzy}`, '#ff8c42') }
    }
    if (r.crit && !magic && this.st.j2KnifeCrit > 0 && this.j2?.id === 'rogue' && (this.src === 'basic' || this.src === 'combo')) this.critKnives++ // Rogue ★ คริเป็นมีด
    if (this.j2?.id === 'mobster') this.mobExec(m)
    if (r.crit && this.st.j2CritPet > 0 && !this.allyHitting && !this.critPetUsed && this.hp > 0) this.critPet() // v82 Beastmaster ★ พรานแห่งป่า
    return r.dmg
  }

  // ===== 2nd jobs (design/second-jobs-v1.md, data/jobs2.ts, numbers skill-math KIT2) =====
  private j2?: Job2Def
  private j2Weapon = false // wielding the 2nd job's mastery weapon (Berserker 2-hand, Knight spear)
  private hasShield = false // an off-hand is worn (Knight Auto Guard full strength)
  private frenzy = 0 // Berserker Frenzy stacks
  private frenzyAt = 0 // fightTurns of the last crit
  private s3Cd = 0 // hero turns until ทักษะ 3 can cast again
  private rampage = 0 // Berserker บ้าระห่ำ turns left
  private boomUsed = false // Knight Spear Boomerang used this wave
  private firstSwing = false // Knight Charge Attack: first basic swing of the wave
  private forceCrit = false
  // ----- v92 Cleric web 🌄 แสงรุ่งอรุณ (KIT.clericTree.dawn): the Ult smash adds bonus magic damage (STR + WIS + matk x M.ATK) -----
  /** Bonus magic hit on every Ult smash target (x hitPow like the rest of the ult); ★ = sure crit + crit dmg; heals a share of the front hit. */
  private dawnBonus(targets: Mon[], hitPow: number) {
    const D = KIT.clericTree.dawn, st = this.st, s = save()
    if (st.clDawn <= 0 || this.job.id !== 'cleric' || !targets.length) return
    const b = totalBase(s), bl = this.buf.bless > 0 ? blessBase(s) ?? {} : {} // พรแสง adds STR / WIS while it lasts
    const mul = dawnMul(st, b.str + (bl.str ?? 0), b.wis + (bl.wis ?? 0)) * hitPow
    const sure = st.clDawnUlt > 0, add = sure ? st.clDawnCrit : 0, wasCrit = this.forceCrit
    this.forceCrit = wasCrit || sure; st.critMul += add
    let front = 0
    try { targets.forEach((m, i) => { const d = this.strike(m, mul, true, '#ffd36e'); if (i === 0) front = d }) } finally { st.critMul -= add; this.forceCrit = wasCrit }
    this.burst(targets[0].spr.x, targets[0].spr.y - 30, 0xffd36e, 14, 170)
    if (front <= 0 || this.hp <= 0 || st.clDawnHeal <= 0) return
    const big = targets[0].def.ai === 'boss' || !!targets[0].def.mini
    const amt = front * st.clDawnHeal * (big ? 1 : D.weak)
    if (amt > 0) { this.heal(amt, true); this.floatText(HERO_X, GROUND - 150, `🌄 +${Math.round(amt * (1 + st.healAmp))}`, '#7fe39a') }
  }
  private critAdd = 0 // temporary crit chance (คลื่นดาบ)
  private dualKnife = false // Rogue: a dagger in the off-hand (+KIT2.rogue.dualKnife flying knives)
  private critKnives = 0 // Rogue ★: knives owed by basic / combo crits, thrown after the swing
  private execTurnUsed = false // Mobster ★ งานต่อไป: one extra turn per hero turn
  private martyrUsed = false // Crusader ★ ผู้พลีชีพ used this wave
  private j2Hurt = false // a hit landed on the hero since its last turn (Monk Energy Shield)
  private charges = 0 // Monk 🔵 power charges
  private chargeTxt?: Phaser.GameObjects.Text
  private allies: Ally[] = [] // battle/allies.ts (Monk Tempest Bell)
  private allyTxt = new Map<Ally, Phaser.GameObjects.Text>()
  private chargeMax() { return KIT2.monk.chargeMax + this.st.j2ChargeMax }
  /** Monk: gain / spend power charges, shown above the hero. */
  private addCharges(n: number) {
    const v = Math.max(0, Math.min(this.chargeMax(), this.charges + n))
    if (v === this.charges) return
    this.charges = v
    if (!this.chargeTxt?.active) this.chargeTxt = this.add.text(HERO_X, GROUND - 190, '', { fontSize: '14px' }).setOrigin(0.5).setDepth(9500)
    this.chargeTxt.setText('🔵'.repeat(this.charges))
  }
  /** Crusader Auto Guard landed: ★ ป้อมศรัทธา shield + บล็อกฟื้นฟู heal. */
  private onBlock() {
    if (this.st.j2BlockShield > 0) this.addShield(this.st.maxHp * this.st.j2BlockShield, true)
    if (this.st.j2BlockHeal > 0) this.heal(this.st.maxHp * this.st.j2BlockHeal, true)
    if (this.st.j2BannerAura > 0) { // v84 Knight ★ ธงอมตะ
      const T = KIT2.knight.tree
      this.heal(this.st.maxHp * T.auraHeal, true); this.gainRage(T.auraRes); this.gainRes(T.auraRes)
      this.floatText(HERO_X, GROUND - 150, '🏳️ ธงอมตะ', '#f6eedc')
    }
  }
  /** Ally context for battle/allies.ts: hits use the hero's strike as magic / physical 'other' (no lifesteal, no combo). */
  private allyCtx(a: Ally, combo = false, foe?: Mon): AllyCtx {
    const front = () => (foe && !foe.dead ? foe : this.front()[0])
    const run = (fn: () => void) => { // v82: "the ally did something" + its hits count as ally hits (ผู้นำฝูง / พรานแห่งป่า skip them)
      this.allyActed = true
      const p = this.allyHitting; this.allyHitting = true
      try { this.withSrc('other', fn) } finally { this.allyHitting = p }
    }
    return {
      ally: a, st: this.st, luk: this.heroLuk, combo,
      hitAll: (mul, magic, color) => run(() => { for (const m of this.alive()) this.strike(m, mul, magic, color) }),
      hitOne: (mul, magic, color, sure) => {
        const t = this.alive(); if (!t.length) return
        const p = this.sureHit; this.sureHit = p || !!sure
        try { run(() => this.strike(t[Phaser.Math.Between(0, t.length - 1)], mul, magic, color)) } finally { this.sureHit = p }
      },
      hitFront: (mul, color, bleed = 0) => { const m = this.front()[0]; if (!m) return; run(() => this.strike(m, mul, false, color)); if (bleed > 0) this.addPoison(m, bleed) },
      hitFoe: (mul, color) => { const m = front(); if (m) run(() => this.strike(m, mul, false, color)) },
      stun: (all) => { for (const m of all ? this.alive() : [front()]) if (m) this.stunMon(m) },
      chill: (turns, all) => { for (const m of all ? this.alive() : [front()]) if (m && !m.dead) { m.chill = Math.max(m.chill, turns); this.dotIcon(m) } },
      shield: (share) => { this.allyActed = true; this.addShield(this.st.maxHp * share) },
      say: (text, color) => this.floatText(HERO_X + 70, GROUND - 150, text, color),
    }
  }
  /** One ally act: wiggle its icon, use up a trap. */
  private allyAct(a: Ally, combo = false, foe?: Mon) {
    this.allyActed = false
    a.def.act(this.allyCtx(a, combo, foe))
    if (this.allyActed && a.def.kind === 'pet') this.petPerks()
    this.tweens.add({ targets: this.allyTxt.get(a), angle: 12, duration: 60, yoyo: true })
    if (a.def.uses && useAlly(a)) { this.syncAlly(a); this.allies = liveAllies(this.allies) }
  }
  /** Loses its next turn (Ankle Snare / banana / boar charge); boss / mini: gauge push instead. */
  private stunMon(m: Mon) {
    if (m.dead) return
    if (m.def.ai === 'boss') { m.gauge -= KIT2.innovator.snarePush; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '⏪ ช้าลง', '#e0b07a'); return }
    m.frozen = true; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '💫 เสียเทิร์น', '#e0b07a')
  }
  /** Own-turn allies (wolf, wolf pack) whose gauge is full act now. */
  private async allyTurns() {
    for (const a of liveAllies(this.allies)) {
      while (a.def.trigger === 'ownTurn' && !a.dead && a.gauge >= 100 && this.alive().length && this.hp > 0) { a.gauge -= 100; this.allyAct(a); await this.wait(140) }
    }
  }
  /** End of a hero turn: 'heroTurn' allies act (boar charge, robot turret). */
  private async alliesOnTurn() {
    let n = 0
    for (const a of liveAllies(this.allies)) if (a.def.trigger === 'heroTurn' && this.alive().length && this.hp > 0) { this.allyAct(a); n++ }
    if (n) await this.wait(120)
  }
  /** A monster starts its action: the first live trap goes off on it. True when one did. */
  private trapOnAct(m: Mon): boolean {
    const a = liveAllies(this.allies).find((x) => x.def.trigger === 'monsterAct')
    if (!a) return false
    this.allyAct(a, false, m)
    return true
  }
  // ===== Phase 4 Archer: 🐺 Beastmaster / 🔧 Innovator (numbers KIT2.beastmaster / KIT2.innovator, allies battle/allies.ts) =====
  private heroLuk = 0
  private pet: PetId = 'hawk'
  private pets: { id: PetId; pow: number }[] = [] // this wave's pet lineup (main + ★★ second)
  private sureHit = false // Blitz Beat: skips Flee
  private zenyWave = 0 // 🧲 แม่เหล็ก: + zeny share this wave
  private mirror = false // 🪞 กระจก: the next landed monster hit is bounced back
  /** Wave start: Beastmaster pets, Innovator traps (+ ★ ป้อมถาวร free turret). */
  private waveAllies() {
    this.pets = []
    if (this.j2?.id === 'beastmaster') {
      const st = this.st, evo: Record<PetId, number> = { hawk: st.j2HawkEvo, boar: st.j2BoarEvo, wolf: st.j2WolfEvo }, k = 1 + st.j2PetPow // v82 ใจเดียวกัน
      this.pets.push({ id: this.pet, pow: k })
      const stars = PET_IDS.filter((p) => evo[p] > 0)
      if (st.j2Pack3 > 0) { for (const p of PET_IDS) if (p !== this.pet) this.pets.push({ id: p, pow: KIT2.beastmaster.tree.pack3Pow * k }) } // v82 ★ ฝูงพันธมิตร (replaces the 2 ★ second pet)
      else if (stars.length >= 2) this.pets.push({ id: stars.find((p) => p !== this.pet) ?? stars[0], pow: KIT2.beastmaster.secondPow * k }) // 2 ★ = a second pet
      for (const p of this.pets) this.spawnAlly(makeAlly(ALLIES[p.id], st, p.pow))
      if (st.j2Roar > 0 && this.alive().length) { for (const m of this.alive()) m.gauge -= st.j2Roar; this.floatText(HERO_X + 70, GROUND - 160, '🐺 ขู่คำราม!', '#c9c9d6') } // v82 ขู่คำราม
    }
    if (this.j2?.id === 'innovator') {
      for (let i = 0; i < KIT2.innovator.traps + this.st.j2Traps; i++) this.layTrap(TRAP_IDS[Phaser.Math.Between(0, TRAP_IDS.length - 1)])
      if (this.st.j2TurretWave > 0) this.spawnTurret(1)
    }
  }
  private layTrap(id: typeof TRAP_IDS[number], pow = 1) { this.spawnAlly(makeAlly(ALLIES[id], this.st, pow)) }
  private spawnTurret(pow: number) {
    const I = KIT2.innovator
    this.spawnAlly(makeAlly(ALLIES.turret, this.st, pow, this.st.j2TurretWave > 0 ? Infinity : I.turretTurns + this.st.j2TurretTurns))
  }
  // ----- v82 ใยชั้น 2 ผูกพัน / สัญชาตญาณ (numbers KIT2.beastmaster.tree) -----
  private allyActed = false // set by an AllyCtx hit / shield: the ally really did something this act
  private allyHitting = false // an ally hit is running (no ผู้นำฝูง bonus, no ★ พรานแห่งป่า)
  private critPetUsed = false // ★ พรานแห่งป่า: once per hero turn (reset in heroAct)
  private livePets() { return liveAllies(this.allies).filter((a) => a.def.kind === 'pet').length }
  /** A pet acted: ประสานล่า Energy · เลียแผล heal. */
  private petPerks() {
    if (this.st.j2PetRes > 0) this.gainRes(this.st.j2PetRes)
    if (this.st.j2PetHeal > 0 && this.hp > 0) this.heal(this.st.maxHp * this.st.j2PetHeal, true)
  }
  /** ★ พรานแห่งป่า: a hero crit sends the main pet in again now (hawk 1 sure hit · boar charge hit, no stun · wolf bite). */
  private critPet() {
    const a = liveAllies(this.allies).find((x) => x.def.id === this.pet)
    if (!a || !this.alive().length) return
    this.critPetUsed = true
    const c = this.allyCtx(a), B = KIT2.beastmaster
    c.say('🏹 พรานแห่งป่า!', '#9fe08a')
    if (a.def.id === 'hawk') c.hitOne(hawkMul(this.st) * a.pow, false, '#f2d24b', true)
    else if (a.def.id === 'boar') c.hitFront((B.boarMul + this.st.j2BoarMul) * a.pow, '#e0b07a')
    else c.hitFront(wolfMul(this.st) * a.pow, '#c9c9d6', B.wolfBleed + this.st.j2WolfBleed)
    this.petPerks()
    this.tweens.add({ targets: this.allyTxt.get(a), angle: 12, duration: 60, yoyo: true })
  }
  /** 📯 สั่งลุย: every pet in the lineup does its special move. */
  private async petCommand(pow: number) {
    const B = KIT2.beastmaster
    for (const p of this.pets) {
      if (!this.alive().length) return
      const k = pow * p.pow
      if (p.id === 'hawk') {
        this.floatText(HERO_X + 70, GROUND - 160, '🦅 ฟาด!', '#f2d24b')
        const c = this.allyCtx(makeAlly(ALLIES.hawk, this.st, k))
        for (let i = 0; i < B.cmdHawkHits; i++) c.hitOne(hawkMul(this.st) * k, false, '#f2d24b', true)
      } else if (p.id === 'boar') this.addShield(this.st.maxHp * B.cmdBoarShield * k)
      else {
        this.floatText(HERO_X + 70, GROUND - 160, '🐺 อู้ววว! เรียกฝูง', '#c9c9d6')
        for (let i = 0; i < B.cmdPack; i++) { const w = makeAlly(ALLIES.pack, this.st, B.cmdPackPow * k); w.gauge = 50; this.spawnAlly(w) }
      }
      await this.wait(BATTLE.stepMs * 0.2)
    }
  }
  /** 🐾 Stampede: hawk, boar and wolf all hit once. */
  private async stampede(h2: number) {
    const B = KIT2.beastmaster
    this.cameras.main.flash(120, 230, 200, 140)
    this.sureHit = true
    try { this.withSrc('other', () => { for (const m of this.alive()) this.strike(m, B.ultHawk * h2, false, '#f2d24b') }) } finally { this.sureHit = false }
    this.floatText(HERO_X + 70, GROUND - 160, '🦅🐗🐺 Stampede!', '#f2d24b')
    await this.wait(BATTLE.stepMs * 0.25)
    for (const m of this.alive()) { this.strike(m, B.ultBoar * h2 * (1 + this.st.pskill), false, '#e0b07a'); if (!m.dead) { m.gauge -= B.boarPush; this.tweens.add({ targets: m.spr, x: m.spr.x + 30, duration: 90, yoyo: true }) } }
    this.shake(120, 0.008)
    await this.wait(BATTLE.stepMs * 0.25)
    const f = this.front()[0]
    if (f) { this.strike(f, B.ultWolf * h2 * (1 + this.st.pskill), false, '#c9c9d6'); this.addPoison(f, B.wolfBleed + this.st.j2WolfBleed) }
  }
  /** 🎲 กล่องสุ่มประหลาด: one gadget (💥 jackpot = all of them). */
  private async gadget(id: GadgetId, pow: number) {
    const I = KIT2.innovator, g = gadgetById(id), k = pow * (1 + this.st.j2BoxMul), all = id === 'jackpot'
    const on = (x: GadgetId) => all || id === x
    this.callout(`${g.rare ? '⭐ ' : ''}${g.icon} ${g.name}!`, W / 2, 170, g.rare ? '#f2d24b' : '#f6eedc')
    if (all) this.cameras.main.flash(160, 255, 220, 120)
    if (on('chicken')) { for (const a of this.allies) if (a.def.id === 'chicken') { a.dead = true; this.syncAlly(a) } this.allies = liveAllies(this.allies); this.spawnAlly(makeAlly(ALLIES.chicken, this.st)) }
    if (on('banana')) { const t = this.front()[0]; if (t) this.stunMon(t) }
    if (on('rocket')) { const t = this.alive(); if (t.length) { const m = t[Phaser.Math.Between(0, t.length - 1)]; await this.shoot(m, 0xff8c42, () => { this.strike(m, I.rocketMul * k * (1 + this.st.pskill), false, '#ff8c42'); this.burst(m.spr.x, m.spr.y - 30, 0xff8c42, 14, 200) }) } }
    if (on('robot')) this.spawnTurret(k)
    if (on('magnet')) { this.zenyWave = Math.max(this.zenyWave, I.magnetZeny); this.floatText(HERO_X, GROUND - 170, `🧲 zeny +${Math.round(I.magnetZeny * 100)}% เวฟนี้`, '#f2b84b') }
    if (on('mirror')) { this.mirror = true; this.floatText(HERO_X, GROUND - 150, '🪞 สะท้อนฮิตถัดไป', '#c9e0ff') }
    if (on('cola')) { for (const m of this.alive()) { this.strike(m, I.colaMul * k * (1 + this.st.pskill), false, '#c98a4a'); if (!m.dead) { m.chill = Math.max(m.chill, I.colaChill); this.dotIcon(m) } } this.burst(700, GROUND - 40, 0xc98a4a, 16, 200) }
    if (on('balloon')) { this.dodgeCharges++; this.floatText(HERO_X, GROUND - 130, '🎈 หลบ 1 ครั้ง', '#ff9ac9') }
    if (on('cloud')) for (const m of this.alive()) { m.wet = Math.max(m.wet, I.wetTurns); this.dotIcon(m) }
    await this.wait(BATTLE.stepMs * 0.3)
  }
  private spawnAlly(a: Ally) {
    this.allies.push(a)
    const i = this.allies.length - 1
    this.allyTxt.set(a, this.add.text(HERO_X + 70 + i * 34, GROUND - 40, '', { fontSize: '28px', align: 'center' }).setOrigin(0.5, 1).setDepth(9000))
    this.syncAlly(a)
  }
  private syncAlly(a: Ally) {
    const t = this.allyTxt.get(a); if (!t?.active) return
    if (a.dead) { t.destroy(); this.allyTxt.delete(a); return }
    t.setText(`${a.def.icon}\n${a.def.hp ? `${a.hp}` : ''}`).setFontSize(a.def.hp ? 18 : 28)
  }
  private clearAllies() { for (const a of this.allies) { a.dead = true; this.syncAlly(a) } this.allies = [] }
  /** Hero basic / combo swing: allies with trigger 'heroBasic' act (Tempest Bell rings). */
  private alliesOnSwing() {
    const combo = this.comboLevel >= 2
    for (const a of liveAllies(this.allies)) if ((a.def.trigger === 'heroBasic' || (combo && a.def.comboFollow)) && this.alive().length) this.allyAct(a, combo) // wolf: bites along with hero combo hits
  }
  /** A monster attack goes to a taunting ally instead of the hero (raw damage, no DEF); true = the ally took it. */
  private allyTaunt(dmg: number): boolean {
    const a = tauntTarget(this.allies); if (!a) return false
    const broke = hurtAlly(a, dmg)
    this.damageNumber(HERO_X + 70, GROUND - 90, Math.max(1, Math.round(dmg)), false, '#bfe6ff')
    if (broke) a.def.onBreak?.(this.allyCtx(a))
    this.syncAlly(a)
    return true
  }
  /** Rogue มีดบิน: n knives at random monsters (one left = same one). Thrown outside basicOnce, so lsMul is 0: no lifesteal (Q). */
  private throwKnives(n: number, mul = KIT2.rogue.knifeMul + this.st.j2KnifeMul) {
    for (let i = 0; i < n; i++) {
      const t = this.alive(); if (!t.length) return
      const m = t[Phaser.Math.Between(0, t.length - 1)]
      this.floatText(m.spr.x - 20, m.spr.y - m.spr.displayHeight - 34, '🔪', '#e0e0f0')
      this.withSrc('other', () => this.strike(m, mul, false, '#e0e0f0'))
    }
  }
  /** Rogue: knives per combo hit (+ crit knives owed). */
  private comboKnives(comboHit: boolean) {
    if (this.j2?.id !== 'rogue') return
    const R = KIT2.rogue
    const n = (comboHit ? R.knifePerCombo + (this.dualKnife ? R.dualKnife : 0) + this.st.j2KnifeAdd : 0) + this.critKnives
    this.critKnives = 0
    if (n > 0) this.throwKnives(n)
  }
  /** Mobster สมุดหนี้: debuff kinds on a monster (★ ดอกเบี้ยทบต้น x2). */
  private debt(m: Mon) {
    const n = (m.poison > 0 ? 1 : 0) + (m.burnTurns > 0 || m.burnStacks > 0 || m.hell > 0 ? 1 : 0) + (m.chill > 0 ? 1 : 0) + (m.weakTurns > 0 ? 1 : 0) + ((m.marked ?? 0) > 0 ? 1 : 0) + (m.armorBrk > 0 ? 1 : 0)
    return n * (this.st.j2DebtX2 > 0 ? 2 : 1)
  }
  private execLine(m: Mon) { const M = KIT2.mobster; return M.execBase + M.execPer * this.debt(m) + this.st.j2ExecAdd }
  /** Mobster Execute: a normal monster under the debt line dies at once (bosses / minis take x bossExecMul in j2Mul instead). */
  private mobExec(m: Mon) {
    if (m.dead || m.def.ai === 'boss' || this.hp <= 0 || m.hp >= m.def.hp * this.execLine(m)) return false
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '⚰️ เก็บงาน!', '#c9a8ff')
    this.damageMon(m, m.hp + m.shield, false, '#c9a8ff')
    if (!m.dead) return false
    if (this.st.j2ExecTurn > 0 && !this.execTurnUsed && this.alive().length) { // ★ งานต่อไป
      this.execTurnUsed = true
      this.heroGauge = Math.max(this.heroGauge, 100)
      this.floatText(HERO_X, GROUND - 160, '🕴️ งานต่อไป!', '#c9a8ff')
    }
    return true
  }
  /** Monk หมัดกระแส: every swing / combo hit builds charges · ฝ่ามือธาตุ chill · ★ Instill bolt at full charges. */
  private monkSwing(f: Mon) {
    const O = KIT2.monk
    if (this.st.j2Chill > 0 && !f.dead && Math.random() < this.st.j2Chill) { f.chill = Math.max(f.chill, O.chillTurns); this.dotIcon(f) }
    if (this.st.j2Instill > 0 && this.charges >= this.chargeMax()) {
      const t = this.alive()
      if (t.length) { const m = t[Phaser.Math.Between(0, t.length - 1)]; this.floatText(m.spr.x + 20, m.spr.y - m.spr.displayHeight - 34, '⚡', '#bfe6ff'); this.withSrc('other', () => this.strike(m, O.instillMul, true, '#bfe6ff')) }
    }
    this.addCharges(this.comboLevel >= 2 ? O.chargePerCombo : O.chargePerSwing)
  }
  /** 2nd-job damage multiplier on every hero hit. */
  private j2Mul(m: Mon, crit: boolean, magic: boolean) {
    let k = 1
    const big = m.def.ai === 'boss' // bosses + mini bosses
    if (crit && !magic && this.frenzy > 0) k *= 1 + this.frenzy * KIT2.berserker.frenzyCritDmg
    if (crit && big && this.st.j2BossCrit > 0) k *= 1 + this.st.j2BossCrit // ★ หน้าแหก
    if (this.st.j2Duel > 0 && (this.alive().length === 1 || m.def.ai === 'boss')) k *= 1 + this.st.j2Duel // ดวล
    if (this.st.j2DuelExec > 0 && big && m.hp < m.def.hp * 0.3) k *= 1 + this.st.j2DuelExec // ★ ดวลตาย
    if (this.st.j2LowHp > 0) k *= 1 + this.st.j2LowHp * Math.max(0, 1 - this.hp / this.st.maxHp) // คลั่ง
    if (big && this.j2?.id === 'mobster' && m.hp < m.def.hp * this.execLine(m)) k *= KIT2.mobster.bossExecMul // สมุดหนี้ vs boss / mini
    if (this.j2?.id === 'crusader' && KIT2.crusader.holyFoes.includes(m.kind)) k *= 1 + KIT2.crusader.holyVs // ศรัทธา vs undead / demons
    if (this.endow > 0 && (this.autoSpelling || this.src === 'basic' || this.src === 'combo')) k *= 1 + KIT2.sage.endowAmp + this.st.j2EndowAmp // Sage Endow
    if (m.wet > 0) k *= 1 + KIT2.innovator.wetAmp // Innovator ☁️ เมฆฝน
    if (this.st.j2PackLead > 0 && !this.allyHitting) k *= 1 + this.st.j2PackLead * this.livePets() // v82 Beastmaster ผู้นำฝูง (hero hits only)
    return k
  }
  /** Knight ถึกเป็นแรง: spear skills add a share of max HP, as a P.ATK multiplier. */
  private hpMul() { return this.j2?.id === 'knight' ? (KIT2.knight.hpDmg + this.st.j2HpDmg) * this.st.maxHp / Math.max(1, this.st.atk) : 0 }
  /** Knight Charge Attack / ★ ทะยาน: the first basic swing of each wave. */
  private chargeMul() {
    if (!this.firstSwing) return 1
    this.firstSwing = false
    if (this.st.j2ChargeFirst > 0) { this.floatText(HERO_X + 40, GROUND - 150, '🚀 ทะยาน!', '#f2d24b'); return KIT2.knight.chargeFirst }
    return 1 + this.st.j2Charge
  }
  /** ทักษะ 3: casts by itself (free extra action) at the start of the hero's turn when ready and paid for; Spear Boomerang answers a charge. */
  private async skill3Turn() {
    const j2 = this.j2!, K = KIT2.knight
    if (this.st.j2Boomerang > 0 && !this.boomUsed) {
      const ch = this.alive().find((m) => m.charging)
      if (ch) {
        this.boomUsed = true
        await this.skillName({ name: 'Spear Boomerang', icon: '🪃' })
        await this.shoot(ch, 0xd8d8e8, () => { this.withSrc('skill', () => this.strike(ch, K.boomerang + this.hpMul())); if (!ch.dead) { ch.charging = false; ch.spr.clearTint(); this.floatText(ch.spr.x, ch.spr.y - ch.spr.displayHeight - 24, '❌ ขัดชาร์จ!', '#9fe3ff') } })
        if (!this.alive().length) return
      }
    }
    if (this.hx.silence > 0) return
    if (this.s3Cd > 0) { this.s3Cd--; return }
    if (!mayCast(!this.autoUlt, this.book.s3)) return // v86: manual mode waits for the booking
    if (j2.id === 'monk' && this.charges < KIT2.monk.thunderMin) return // Falling Thunder needs charges
    const cost = this.s3Cost()
    if (this.res < cost) return
    this.spendRes(cost)
    this.s3Cd = j2.skill3.cd
    this.book.s3 = false; this.popSkill('s3')
    const pow = 1 + this.st.s3Pow
    if (j2.id === 'wizard' && this.charge({ kind: 'gust', pow, hit: pow, paid: 0 }, this.res + cost)) return // Storm Gust charges a turn
    await this.asSkill(async () => {
      await this.skillName(j2.skill3)
      const live = this.front()
      if (j2.id === 'wizard' || j2.id === 'sage') { await this.mageSkill3(pow); return } // Phase 5 Mage
      if (j2.id === 'beastmaster') { await this.petCommand(pow); return } // 📯 สั่งลุย
      if (j2.id === 'innovator') { await this.gadget(rollGadget(this.st, this.heroLuk), pow); return } // 🎲 กล่องสุ่มประหลาด
      if (j2.id === 'crusader') { // ✝️ Holy Cross: front monster, each hit P.ATK + Pm, then blind · Shield Boomerang
        const C = KIT2.crusader, t = live[0], k = C.crossMul * pow * (1 + this.st.j2CrossAdd)
        if (t) await this.maceSmash(t, () => {
          for (let i = 0; i < C.crossHits && !t.dead; i++) { this.strike(t, k * (1 + this.st.pskill), false, '#ffe08a'); this.strike(t, k, true, '#fff3a0') }
          if (!t.dead) { t.blind = Math.max(t.blind, C.blindTurns + this.st.j2BlindAdd); this.dotIcon(t); this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 30, '✝️ 🙈 ตาบอด', '#ffe08a') }
          this.cameras.main.flash(80, 255, 240, 170)
        })
        const o = this.alive()
        if (this.st.j2ShieldBoom > 0 && this.hasShield && o.length) {
          const m = o[Phaser.Math.Between(0, o.length - 1)]
          await this.shoot(m, 0xd8d8e8, () => this.strike(m, this.st.j2ShieldBoom * this.st.def / Math.max(1, this.st.atk)))
        }
      } else if (j2.id === 'monk') { // ⚡ Falling Thunder: spend every charge, lightning on all
        const O = KIT2.monk, n = this.charges
        this.addCharges(-n)
        this.cameras.main.flash(90, 191, 230, 255)
        for (const m of this.alive()) { this.burst(m.spr.x, m.spr.y - 30, 0xbfe6ff, 8, 160); this.strike(m, O.thunderPm * (1 + (O.thunderPer + this.st.j2ThunderPer) * n) * pow, true, '#bfe6ff') }
        this.floatText(HERO_X, GROUND - 170, `⚡ x${n}`, '#bfe6ff')
        await this.wait(BATTLE.stepMs * 0.3)
      } else if (j2.id === 'rogue') { // 🗡️ Back Stab: sure crit on the highest-HP monster
        const t = this.alive().sort((a, b) => b.hp - a.hp)[0]
        if (t) { this.forceCrit = true; await this.lunge(t, () => this.strike(t, KIT2.rogue.stabMul * pow * (1 + this.st.pskill), false, '#ffd36b')); this.forceCrit = false }
      } else if (j2.id === 'mobster') { // ⛓️ ตัดเส้นเอ็น: boss first, DEF break + chill
        const M = KIT2.mobster, t = this.alive().find((m) => m.def.ai === 'boss') ?? live[0], turns = M.cutTurns + this.st.j2DebuffTurns
        if (t) await this.lunge(t, () => {
          this.strike(t, M.cutMul * pow * (1 + this.st.pskill), false, '#c9a8ff')
          if (t.dead) return
          t.armorBrk = Math.max(t.armorBrk, turns); t.chill = Math.max(t.chill, turns); this.dotIcon(t)
          this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 30, '⛓️ เกราะแตก + ช้า', '#c9a8ff')
          this.mobExec(t)
        })
      } else if (j2.id === 'berserker') {
        const B = KIT2.berserker, w = this.j2Weapon ? 1 : B.waveOffWeapon
        this.critAdd = B.waveCrit
        this.cameras.main.flash(80, 160, 210, 255)
        await this.lunge(live[0], () => live.forEach((m, i) => this.strike(m, (i === 0 ? B.waveFront : B.waveBack) * pow * w * (1 + this.st.pskill), false, '#9fe3ff')))
        this.critAdd = 0
      } else {
        await this.lunge(live[0], () => live.slice(0, K.brandTargets).forEach((m, i) => { this.strike(m, K.brandMul * pow * (1 + this.st.pskill) + this.hpMul()); if (i === 0 && !m.dead) m.gauge -= K.brandPush }))
      }
    }, 'skill')
  }
  /** Ult วิวัฒน์: replaces the base class ult (keeps ultPow + ult-web Stats where they fit). */
  private async ult2(live: Mon[], pow: number, hitPow: number) {
    const p2 = pow * (1 + this.st.ult2Pow), h2 = hitPow * (1 + this.st.ult2Pow)
    if (this.j2!.id === 'wizard' || this.j2!.id === 'sage') { await this.mageUlt2(live, p2, h2); return } // Phase 5 Mage
    if (this.j2!.id === 'beastmaster') { await this.stampede(h2); await this.archerPierce(h2); return } // 🐾 Stampede + the base pierce shot
    if (this.j2!.id === 'innovator') { // 🛠️ สิ่งประดิษฐ์สุดเพี้ยน: 3 boxes + every trap + the base pierce shot
      for (let i = 0; i < KIT2.innovator.ultBoxes && this.alive().length; i++) await this.gadget(rollGadget(this.st, this.heroLuk), p2)
      for (const t of TRAP_IDS) this.layTrap(t, p2)
      await this.archerPierce(h2)
      return
    }
    if (this.j2!.id === 'berserker') {
      const B = KIT2.berserker
      await this.lunge(live[0], () => live.forEach((m) => this.strike(m, (B.ultMul + this.st.ultMulAdd) * h2 * (1 + this.st.pskill) * (m.charging ? 1 + this.st.ultVsCharge : 1))))
      this.rampage = B.ultTurns + 1 // ticks down after this turn
      this.callout(`👹 บ้าระห่ำ ${B.ultTurns} เทิร์น!`, W / 2, 170)
      this.cameras.main.flash(140, 255, 90, 78)
      return
    }
    if (this.j2!.id === 'rogue') { // 🌪️ พายุมีด: shadow dance + a knife storm
      await this.shadowDance(h2)
      const R = KIT2.rogue
      this.throwKnives(R.ultKnives + this.st.j2KnifeAdd, R.ultKnifeMul * h2)
      this.cameras.main.flash(100, 220, 220, 240)
      await this.wait(BATTLE.stepMs * 0.3)
      return
    }
    if (this.j2!.id === 'mobster') { // 💀 ทวงหนี้: slash all, burst every poison stack, then collect
      const M = KIT2.mobster
      if (live[0]) await this.lunge(live[0], () => live.forEach((m) => this.strike(m, M.ultSlash * h2 * (1 + this.st.pskill), false, '#c9a8ff')))
      let kills = 0
      for (const m of live) {
        if (!m.dead && m.poison > 0) {
          const dmg = Math.max(1, Math.round(m.poison * m.poisonDmg * M.burstTurns * M.burstMul * h2 * this.dotMul()))
          this.burst(m.spr.x, m.spr.y - 30, 0xa77be0, 14, 200)
          this.withSrc('poison', () => this.damageMon(m, dmg, false, '#a77be0', true))
          m.poison = 0; this.dotIcon(m)
        }
        if (m.dead || this.mobExec(m)) kills++
      }
      if (kills > 0) { this.smashCdLeft = Math.max(0, this.smashCdLeft - M.ultCdRefund); this.floatText(HERO_X, GROUND - 170, `💀 ทวงครบ! ult -${M.ultCdRefund}`, '#c9a8ff') }
      this.cameras.main.flash(120, 167, 123, 224)
      await this.wait(BATTLE.stepMs * 0.4)
      return
    }
    if (this.j2!.id === 'crusader') { // ✨ Grand Cross: pay HP, holy cross on every monster (★ twice, 2nd free), keeps the Priest ult shield
      const C = KIT2.crusader, k = h2 * (1 + this.st.j2CrossAdd)
      for (let cast = 0; cast < (this.st.j2GcTwice > 0 ? 2 : 1) && this.alive().length; cast++) {
        const paid = cast === 0 ? Math.min(this.hp - 1, Math.floor(this.hp * C.gcPay * Math.max(0, 1 - this.st.j2PayCut))) : 0
        if (paid > 0) { this.hp -= paid; this.damageNumber(HERO_X, GROUND - 70, paid, false, '#ff9a9a') }
        const all = this.alive()
        this.cameras.main.flash(140, 255, 243, 160)
        for (const m of all) {
          const cross = this.add.text(m.spr.x, m.spr.y - m.spr.displayHeight / 2, '✝️', { fontSize: '44px' }).setOrigin(0.5).setDepth(9000)
          this.tweens.add({ targets: cross, scale: 1.6, alpha: 0, duration: 380, onComplete: () => cross.destroy() })
          this.strike(m, C.gcPm * k, true, '#fff3a0'); this.strike(m, C.gcAtk * k * (1 + this.st.pskill), false, '#ffe08a')
        }
        if (paid > 0 && all.length >= C.gcRefundAt) { this.hp = Math.min(this.st.maxHp, this.hp + Math.round(paid * C.gcRefund)); this.floatText(HERO_X, GROUND - 160, `✨ คืน HP ${Math.round(paid * C.gcRefund)}`, '#6fd08c') }
        await this.wait(BATTLE.stepMs * 0.35)
      }
      this.addShield(this.st.maxHp * CLERIC_KIT.ultShield * p2)
      return
    }
    if (this.j2!.id === 'monk') { // 🔔 Tempest Bell: an Ally object that soaks hits, rings on swings, bursts when broken
      const old = this.allies.find((a) => a.def.id === ALLIES.tempestBell.id && !a.dead)
      if (old) { old.dead = true; this.syncAlly(old); this.allies = liveAllies(this.allies) } // one bell at a time
      this.spawnAlly(makeAlly(ALLIES.tempestBell, this.st, h2))
      this.callout(`🔔 Tempest Bell ${KIT2.monk.bellTurns} เทิร์น!`, W / 2, 170)
      this.burst(HERO_X + 70, GROUND - 40, 0xbfe6ff, 16, 180)
      await this.wait(BATTLE.stepMs * 0.3)
      return
    }
    const K = KIT2.knight
    const t = this.alive().find((m) => m.def.ai === 'boss') ?? this.front()[0] // boss / mini boss first
    if (t) {
      const hits = (t.def.ai === 'boss' ? K.pierceBigHits : K.pierceHits) + this.st.j2PierceHits
      this.stayIn = true
      for (let i = 0; i < hits && !t.dead; i++) await this.lunge(t, () => this.strike(t, (K.pierceMul + this.st.ultMulAdd) * h2 * (1 + this.st.pskill) * (t.charging ? 1 + this.st.ultVsCharge : 1) + this.hpMul(), false, '#f2d24b', this.st.j2Spiral))
      this.stayIn = false
      const next = this.front().find((m) => m !== t)
      if (next) { this.strike(next, K.bashMul * h2 * (1 + this.st.pskill) + this.hpMul()); this.tweens.add({ targets: [next.spr, next.shadow], x: next.spr.x + 60, duration: 160, yoyo: true }) }
      await this.goHome()
      this.shake(140, 0.01)
    }
    this.addShield(this.st.maxHp * Math.max(0, SWORD_MANA.ultShield + this.st.ultShieldAdd) * p2)
    if (this.st.ultCounters > 0) this.ctrCharges = this.st.ultCounters // talent: ท่าสวนพร้อม
  }

  // ===== Phase 5 Mage: 🌩️ Wizard / 📖 Sage (numbers KIT2.wizard / KIT2.sage) =====
  /** v78 cast queue (was Wizard-only): Wizard ร่ายใหญ่ (Storm Gust / ult) · base Mage its element ult (v85: ลูกไฟระเบิด is instant again).
   *  Paid on charge, released at the start of the next hero turn. Wizard never breaks (takes +15% instead); a Mage chant can (castBreak).
   *  `paid` = Mana spent on it (refunded in part when it breaks) · `safe` = the pity chant after a break: can't break. */
  private casts: Cast[] = []
  private steady = false // v85: the last chant broke, so the NEXT one can't
  private castRing?: Phaser.GameObjects.Ellipse // magic circle under the hero while a big spell charges
  private endow = 0 // Sage Endow turns left
  private autoSpelling = false // a Sage Auto Spell bolt is landing (Endow applies)
  private rodUsed = false // Sage ★ Magic Rod: the wave's spell already absorbed
  private sageInt = 0 // total INT (Auto Spell chance)
  private heroDex = 0 // total DEX (v78 chant break)
  private heroWis = 0 // total WIS (v86 💠 มานาพิทักษ์)
  private zenTurns = 0 // v78 เปิดฉากเต็มแรง: hero turns of Zen left (no miss, crit damage +)
  /** Start charging a spell (true), or cast it now (false): Wizard ★ Quagmire at high Mana. `mana` = Mana before paying. */
  private charge(c: Cast, mana: number) {
    const wz = this.j2?.id === 'wizard'
    if (wz && this.st.j2QuickCast > 0 && mana >= this.resMax() * KIT2.wizard.quickMana) { this.floatText(HERO_X, GROUND - 165, '🌀 Quagmire: ร่ายด่วน!', '#c9a8ff'); return false }
    if (!wz && this.steady) { c.safe = true; this.steady = false; this.floatText(HERO_X, GROUND - 175, '🧘 ตั้งสติ (ร่ายนี้ไม่แตก)', '#9fe3ff') }
    this.casts.push(c)
    this.castFx(true)
    if (wz) this.floatText(HERO_X, GROUND - 150, `🔮 ร่าย${c.kind === 'gust' ? ' Storm Gust' : 'มหาเวท'}... (ดาเมจเข้า +${Math.round(KIT2.wizard.castTaken * 100)}%)`, '#c9a8ff')
    else this.floatText(HERO_X, GROUND - 150, `🔮 ร่าย${this.job.ult.name}... ${c.safe ? '' : '(โดนตีแรงอาจแตก)'}`, '#c9a8ff')
    return true
  }
  private async releaseCasts() {
    const casts = this.casts
    this.casts = []; this.castFx(false)
    for (const c of casts) {
      if (!this.alive().length || this.hp <= 0) return
      if (c.kind === 'gust') await this.asSkill(async () => { await this.skillName(this.j2!.skill3); await this.stormGust(c.pow) }, 'skill')
      else {
        await this.asSkill(async () => { await this.skillName(this.job.ult); if (this.j2?.id === 'wizard') await this.wizUlt(c.pow, c.hit); else { sfx.slam(); await this.ultNow(c.pow, c.hit) } }, 'ult')
        await this.afterUlt()
      }
    }
  }
  /** v78 / v85: a hit that reached HP (dmg after shields, >= breakMinHp of max HP; never a DoT tick) may break a Mage chant: queue gone,
   *  breakRefund of the Mana paid comes back, a broken ult is back in brokenUltCd turns, and the next chant is steady (can't break). */
  private castBreak(dmg: number) {
    if (!this.casts.length || this.j2?.id === 'wizard' || this.casts.every((c) => c.safe) || !breaksOn(dmg, this.st.maxHp)) return
    if (Math.random() >= breakChance(this.heroDex, this.st.tenacity, this.st.poise > 0)) return
    if (this.casts.some((c) => c.kind === 'ult')) this.smashCdLeft = Math.min(this.smashCdLeft, MAGE_CAST.brokenUltCd)
    const back = breakRefundMana(this.casts.reduce((a, c) => a + c.paid, 0))
    this.res = Math.min(this.resMax(), this.res + back)
    this.steady = true
    this.casts = []; this.castFx(false)
    this.floatText(HERO_X, GROUND - 150, `💔 ร่ายแตก! คืน Mana +${back}`, '#ff7a7a')
  }
  /** After an ult lands: เปิดฉากเต็มแรง Zen + after-ult cards. */
  private async afterUlt() {
    if (this.pk.zen > 0) { this.zenTurns = FOCUS_RULES.zenTurns + 1; this.floatText(HERO_X, GROUND - 185, `🧘 Zen ${FOCUS_RULES.zenTurns} เทิร์น: ไม่พลาด + คริแรง`, '#ff6b7a') } // +1: this turn's tick
    if (this.alive().length && this.procs('ult') > 0) await this.wait(220) // พร v2: after-ult cards
  }
  /** Magic circle under the hero, pulsing like a boss charge. */
  private castFx(on: boolean) {
    if (this.castRing) { this.tweens.killTweensOf(this.castRing); this.castRing.destroy(); this.castRing = undefined }
    if (!on) return
    this.castRing = this.add.ellipse(HERO_X, GROUND - 2, 130, 36).setStrokeStyle(3, 0xb48aff).setDepth(GROUND - 0.5)
    this.tweens.add({ targets: this.castRing, alpha: 0.35, scaleX: 1.15, scaleY: 1.15, duration: 360, yoyo: true, repeat: -1 })
  }
  /** ทักษะ 3 of the Mage 2nd jobs: Wizard Storm Gust (no charge: ★ Quagmire) · Sage Endow. */
  private async mageSkill3(pow: number) {
    if (this.j2!.id === 'wizard') { await this.stormGust(pow); return }
    const S = KIT2.sage
    this.endow = Math.max(this.endow, S.endowTurns + this.st.j2EndowTurns)
    this.burst(HERO_X, GROUND - 40, 0xc9a8ff, 18, 160)
    this.floatText(HERO_X, GROUND - 160, `🗡️ Endow ${ELEMENTS[this.element].icon} +${Math.round((S.endowAmp + this.st.j2EndowAmp) * 100)}%`, '#c9a8ff')
    await this.wait(BATTLE.stepMs * 0.3)
  }
  /** ❄️ Storm Gust: every monster, N hits x Pm; the last hit freezes (boss / mini: chill + gauge push). */
  private async stormGust(pow: number) {
    const Z = KIT2.wizard, mul = (Z.gustMul + this.st.j2GustMul) * pow
    this.callout('❄️ Storm Gust!', W / 2, 170)
    this.cameras.main.flash(120, 159, 227, 255)
    for (let h = 0; h < Z.gustHits; h++) {
      this.burst(700, GROUND - 40, 0x9fe3ff, 24, 300)
      for (const m of this.alive()) {
        this.strike(m, mul, true, '#9fe3ff')
        if (h < Z.gustHits - 1 || m.dead) continue
        m.chill = Math.max(m.chill, Z.gustChill + this.st.chillPlus)
        if (m.def.ai === 'boss') m.gauge -= Z.gustPush
        else if (!m.frozen) { m.frozen = true; this.freezeCount++; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 20, 'แช่แข็ง!', '#9fe3ff') }
        if (!m.charging) m.spr.setTint(0x9fe3ff)
        this.dotIcon(m)
      }
      await this.wait(140)
    }
  }
  /** Ult วิวัฒน์ of the Mage 2nd jobs. Wizard charges a turn first (ร่ายใหญ่). */
  private async mageUlt2(live: Mon[], p2: number, h2: number) {
    if (this.j2!.id === 'wizard') { if (!this.charge({ kind: 'ult', pow: p2, hit: h2, paid: 0 }, this.res + this.ultCost())) await this.wizUlt(p2, h2); return }
    // 🚫 Dispell + Spell Breaker: strip every monster, steal Mana, smash the caster (charging one first)
    const S = KIT2.sage, t = this.alive().find((m) => m.charging) ?? live[0]
    let n = 0
    for (const m of this.alive()) n += this.dispell(m)
    this.callout(n > 0 ? `🚫 Dispell! ลบ ${n} อย่าง` : '🚫 Dispell!', W / 2, 170)
    this.cameras.main.flash(120, 201, 168, 255)
    this.gainRes(S.ultMana); this.floatText(HERO_X, GROUND - 165, `🔷 Mana +${S.ultMana}`, '#5aa0ff')
    if (t && !t.dead) await this.lunge(t, () => { this.strike(t, (S.ultAtk + this.st.ultMulAdd) * h2 * (1 + this.st.pskill)); this.strike(t, S.ultPm * h2, true, '#c9a8ff') })
  }
  /** Sage Dispell on one monster: shield, war cry, reflect / absorb, vengeance, a charge. Returns how many it stripped. */
  private dispell(m: Mon) {
    let n = 0
    if (m.shield > 0) { m.shield = 0; n++ }
    if (m.atkUpTurns > 0) { m.atkUp = 0; m.atkUpTurns = 0; n++ }
    if (m.reflect > 0 || m.absorb > 0 || m.stored > 0) { m.reflect = 0; m.absorb = 0; m.stored = 0; n++ }
    if (m.vengTurns) { m.vengTurns = 0; m.vengCd = BATTLE.vengeance.cd; n++ }
    if (m.charging) { m.charging = false; m.spr.clearTint(); n++; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 24, '❌ ขัดชาร์จ!', '#9fe3ff') }
    if (n > 0) this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 40, '🚫', '#c9a8ff')
    this.dotIcon(m)
    return n
  }
  /** Wizard big blast by the run element (+ base Mage ult amps, ร่ายคู่, Mana back, วงล้อธาตุ). */
  private async wizUlt(p2: number, h2: number) {
    const Z = KIT2.wizard, el = this.element
    const amp = 1 + this.st.mgUltAmp + (el === 'lightning' ? this.st.mgLightAmp : el === 'fire' ? this.st.mgFireAmp : this.st.mgIceAmp)
    const dbl = this.st.mgDoubleCast > 0
    for (let c = 0; c < (dbl ? 2 : 1) && this.alive().length; c++) await this.wizBlast(el, h2 * amp * (dbl ? this.st.mgDoubleCast : 1))
    this.addShield(this.st.matk * (MAGE_SPELL.barrier + (el === 'ice' ? this.st.iceBarrier : 0)) * p2 * (el === 'ice' ? Z.iceBarrier : 1) * (1 - this.st.mgBarrierCut))
    if (this.st.mgUltMana > 0) this.res = Math.min(this.resMax(), this.res + this.st.mgUltMana)
    if (this.st.elemWheel > 0) { const els = Object.keys(ELEMENTS) as Element[]; this.element = els[(els.indexOf(el) + 1) % els.length]; this.floatText(HERO_X, GROUND - 180, `🔄 ถัดไป ${ELEMENTS[this.element].icon}`, '#c9a8ff') }
  }
  private async wizBlast(el: Element, pow: number) {
    const Z = KIT2.wizard
    this.shake(260, 0.016)
    if (el === 'ice') { await this.stormGust(pow); return } // ❄️ a free Storm Gust
    if (el === 'fire') { // ☄️ Meteor Storm
      this.callout('☄️ Meteor Storm!', W / 2, 170)
      for (let i = 0; i < Z.meteors + this.st.j2Meteors; i++) {
        const l = this.alive(); if (!l.length) break
        const t = l[Phaser.Math.Between(0, l.length - 1)]
        const orb = this.add.circle(t.spr.x + 90, 20, 16, 0xff8c42).setDepth(9000)
        await this.tween({ targets: orb, x: t.spr.x, y: t.spr.y - 30, duration: 170, ease: 'Quad.easeIn' })
        orb.destroy()
        this.burst(t.spr.x, t.spr.y - 30, 0xff8c42, 16, 220)
        this.strike(t, (Z.meteorMul + this.st.j2MeteorMul) * pow, true, '#ff8c42')
        if (!t.dead) { t.burnStacks = Math.min(this.burnMax(), t.burnStacks + Z.meteorBurn + this.st.mgFireStack); t.burnStackTurns = 3; this.dotIcon(t) }
      }
      return
    }
    // ⚡ Lord of Vermilion: every monster, N hits, stun chance (boss / mini: gauge push)
    this.callout('⚡ Lord of Vermilion!', W / 2, 170)
    this.zapTurn.clear()
    for (let h = 0; h < Z.lovHits + this.st.j2LovHits; h++) {
      this.cameras.main.flash(80, 200, 230, 255)
      for (const m of this.alive()) {
        this.zap(m, (Z.lovMul + this.st.j2LovMul) * pow, '#bfe6ff', false)
        if (m.dead || Math.random() >= Z.lovStun + this.st.j2LovStun) continue
        if (m.def.ai === 'boss') m.gauge -= Z.lovPush
        else m.frozen = true
        this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 24, '💫 มึน!', '#f2d24b')
      }
      await this.wait(110)
    }
  }
  /** 📖 Sage Auto Spell: a basic swing (★ Hindsight: combo hits, counters) may cast a free run-element bolt. No lifesteal. */
  private sageSpell(target?: Mon) {
    if (this.j2?.id !== 'sage' || this.hp <= 0) return
    const S = KIT2.sage
    if (Math.random() >= Math.min(S.autoCap, S.autoChance + S.autoInt * this.sageInt) + this.st.j2AutoChance) return
    const el = this.element
    this.floatText(HERO_X, GROUND - 150, `📖 Auto Spell ${ELEMENTS[el].icon}`, '#c9a8ff')
    this.autoSpelling = true
    for (let i = 0; i < 1 + this.st.j2AutoBolts; i++) {
      const t = target && !target.dead ? target : this.front()[0]
      if (!t) break
      if (el === 'lightning') this.withSrc('other', () => this.zap(t, S.autoMul, '#bfe6ff', false))
      else this.withSrc('other', () => this.strike(t, S.autoMul, true, el === 'fire' ? '#ff8c42' : '#9fe3ff'))
      if (t.dead) continue
      if (el === 'fire') { t.burnStacks = Math.min(this.burnMax(), t.burnStacks + 1); t.burnStackTurns = 3 }
      else if (el === 'ice') { t.chill = Math.max(t.chill, 1); if (!t.charging) t.spr.setTint(0x9fe3ff) }
      this.dotIcon(t)
    }
    this.autoSpelling = false
  }

  /** Q 2026-11-03: lifesteal works only on basic attacks + combo hits (1), the D.Strike extra hit (0.33); skills, actives and passives 0. */
  private lsMul = 0
  /** Spell vamp (Q 2026-11-04): skill hits are collected while a skill runs, then healed once; hitting several monsters heals 1/3. */
  private skillHits: { dmg: number; mons: Set<Mon> } | null = null
  private skillCut() { return Math.min(0.9, this.st.skillDmgCut + (this.buf.blood > 0 ? SPELL_VAMP.bloodCut : 0) + (this.relic === 'bloodpact' ? RELIC_RULES.bloodpact.skillCut : 0)) }
  private spellVamp() { return Math.min(0.4, this.st.spellVamp + (this.buf.blood > 0 ? S2N.bloodVamp(this.st.s2Lv) : 0) + (this.relic === 'bloodpact' ? RELIC_RULES.bloodpact.spellVamp : 0)) }
  /** relic สัญญาเลือด: burn / poison / hellfire ticks are weaker too (Q 2026-11-04) */
  private dotMul() { return this.relic === 'bloodpact' ? 1 - RELIC_RULES.bloodpact.dotCut : 1 }
  private async asSkill(fn: () => Promise<void>, src: Src) {
    this.skillHits = { dmg: 0, mons: new Set() }
    const prev = this.src
    this.src = src
    try { await fn() } finally {
      this.src = prev
      const h = this.skillHits; this.skillHits = null
      const v = this.spellVamp()
      if (v > 0 && h.dmg > 0 && this.hp > 0) this.heal(h.dmg * v * (h.mons.size > 1 ? SPELL_VAMP.aoe : 1) * (this.berserking() ? 2 : 1), true)
    }
  }

  /** Thief passive Double Strike: chance of +1 hit (Q: unlike RO, it can crit; lifesteals at 33%). */
  private doubleAttack(m: Mon, mul: number) {
    if (this.st.doubleAtk <= 0 || m.dead || Math.random() >= doubleAtkChance(this.st.doubleAtk)) return
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 22, 'DOUBLE!', '#ffd36b')
    const prev = this.lsMul
    this.lsMul = 0.33
    this.strike(m, mul)
    this.lsMul = prev
  }

  /** While true, melee hits stay at the monster (combo chain, Thief ult) and the hero walks home once at the end via goHome(). */
  private stayIn = false

  private async lunge(m: Mon, fn: () => void) {
    const step = BATTLE.stepMs, tx = m.spr.x - 70
    if (Math.abs(this.heroSpr.x - tx) < 6) { // already in front of it: short pull-back jab instead of a full dash
      await this.tween({ targets: this.heroSpr, x: tx - 14, duration: step * 0.1, ease: 'Quad.easeOut' })
      await this.tween({ targets: this.heroSpr, x: tx, duration: step * 0.1, ease: 'Quad.easeIn' })
    } else await this.tween({ targets: this.heroSpr, x: tx, duration: step * 0.35, ease: 'Quad.easeIn' })
    this.slashFx(m.spr.x - 20, GROUND - 40)
    sfx.swing()
    fn()
    this.shake(60, 0.004)
    if (!this.stayIn) await this.goHome()
  }

  /** v58 Priest: dash in, hop, slam the mace/book down (gold ring). */
  private async maceSmash(m: Mon, fn: () => void) {
    const step = BATTLE.stepMs, tx = m.spr.x - 70, y0 = this.heroSpr.y
    if (Math.abs(this.heroSpr.x - tx) >= 6) await this.tween({ targets: this.heroSpr, x: tx, duration: step * 0.3, ease: 'Quad.easeIn' })
    await this.tween({ targets: this.heroSpr, y: y0 - 22, angle: -12, duration: step * 0.1, ease: 'Quad.easeOut' })
    await this.tween({ targets: this.heroSpr, y: y0, angle: 8, duration: step * 0.08, ease: 'Quad.easeIn' })
    this.heroSpr.setAngle(0)
    const ring = this.add.circle(m.spr.x - 10, GROUND - 6, 10, 0xf6e27a, 0).setStrokeStyle(3, 0xf6e27a).setDepth(9000)
    this.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 260, onComplete: () => ring.destroy() })
    this.slashFx(m.spr.x - 20, GROUND - 30)
    sfx.swing()
    fn()
    this.shake(80, 0.006)
    if (!this.stayIn) await this.goHome()
  }

  /** v58 Priest ult: a beam of Holy Light falls on one monster (magic, M.ATK). */
  private async holyLight(m: Mon, mul: number, color = 0xfff3a0) {
    const beam = this.add.rectangle(m.spr.x, GROUND - 160, 26, 320, color, 0.85).setDepth(9000)
    this.tweens.add({ targets: beam, scaleX: 0.2, alpha: 0, duration: 260, onComplete: () => beam.destroy() })
    const d = this.strike(m, mul, true, '#fff3a0')
    this.burst(m.spr.x, m.spr.y - 20, color, 8, 160)
    await this.wait(BATTLE.stepMs * 0.12)
    return d
  }

  private async goHome() {
    if (Math.abs(this.heroSpr.x - HERO_X) > 1) await this.tween({ targets: this.heroSpr, x: HERO_X, duration: BATTLE.stepMs * 0.35, ease: 'Quad.easeOut' })
  }

  private async shoot(m: Mon, color: number, fn: () => void) {
    const b = this.add.image(HERO_X + 30, GROUND - 50, 'dot').setTint(color).setScale(2.2, 1.2).setDepth(9000)
    this.tweens.add({ targets: this.heroSpr, x: HERO_X - 8, duration: 80, yoyo: true })
    sfx.swing()
    await this.tween({ targets: b, x: m.spr.x, y: m.spr.y - 30, duration: 200 })
    b.destroy()
    fn()
  }

  /** Basic attack, then combo: each success chains one more (COMBO.baseCount + st.comboCount). */
  private async basicAttack() {
    const target = this.front()[0]
    this.comboSum = { on: true, per: new Map() } // RO-style: each hit shows its own white number, the chain total pops big + yellow at the end
    let extra = 0 // roll the chain first (same odds as before) so the hero knows to stay at the monster between hits
    const rate = this.comboChance() - (target ? this.monCombo(target).ignore : 0), count = COMBO.baseCount + this.st.comboCount + (this.relic === 'wolf' ? RELIC_RULES.wolf.comboCount : 0)
    while (extra < count && Math.random() < rate) extra++ // Capybara-style: each extra hit rolls (rate - Ignore Combo), stop on a miss
    this.stayIn = extra > 0 || this.rampage > 0
    await this.basicOnce()
    this.comboKnives(false) // Rogue ★: crit knives from the first swing
    this.sageSpell() // 📖 Sage Auto Spell
    if (this.rampage > 0 && this.alive().length) { this.floatText(HERO_X, GROUND - 150, '👹', '#ff5a4e'); await this.basicOnce() } // Berserker บ้าระห่ำ: every swing hits twice
    if (this.alive().length && this.procs('basic') > 0) await this.wait(120) // พร v2: on-basic-attack cards
    if (this.immortal === 'angel' && this.fightTurns <= IMMORTAL_RULES.angelTurns && this.hp > 0) { // 🌈 พรนางฟ้า
      const t = this.front()[0]
      if (t) { this.withSrc('light', () => this.strike(t, IMMORTAL_RULES.angelMul, true, '#fff3a0')); this.burst(t.spr.x, t.spr.y - 30, 0xfff3a0, 8, 140) }
      this.heal(this.st.maxHp * IMMORTAL_RULES.angelHeal, true)
    }
    let hits = 1
    for (let n = 0; n < extra && this.alive().length; n++) {
      this.comboCount++
      if (this.pk.comboAtk > 0) this.comboAtkN++ // legend เชี่ยวชาญคอมโบ
      this.comboLevel = n + 2
      sfx.combo(n + 2)
      await this.basicOnce()
      this.comboKnives(true) // Rogue มีดบิน
      if (this.st.j2Hindsight > 0) this.sageSpell() // Sage ★ Hindsight
      hits++
    }
    this.comboLevel = 0
    this.comboSum.on = false
    let best: { dmg: number, x: number, y: number } | undefined // total for the monster that took the most (cleave splash shows only its own numbers)
    for (const v of this.comboSum.per.values()) if (!best || v.dmg > best.dmg) best = v
    if (hits >= 2 && best) this.comboTotal(best.x, best.y, best.dmg, hits)
    await this.monCounter(target) // v49: the target may strike back
    this.stayIn = false
    await this.goHome()
  }

  private async basicOnce() {
    const live = this.front()
    let f = live[0]
    if (!f) return
    const kind = this.job.id
    this.lsMul = 1 // basic hit + combo: full lifesteal (reset below, before card procs)
    const prevSrc = this.src
    this.src = this.comboLevel >= 2 ? 'combo' : 'basic'
    if (kind === 'archer') {
      if (this.st.arSnipeLow > 0) { const low = live.slice().sort((a, b) => a.hp - b.hp)[0]; if (low) f = low } // talent เก็บตัวเปราะ
      let mul = 1
      if (this.st.lockOn > 0) { // tree: "ล็อกเป้า"
        this.lockStacks = this.lockTarget === f ? Math.min(5, this.lockStacks + 1) : 0
        this.lockTarget = f; mul += 0.08 * this.lockStacks
      }
      await this.shoot(f, 0xf6eedc, () => this.strike(f, mul))
    }
    else if (kind === 'mage' && this.j2?.id === 'sage') await this.lunge(f, () => { this.strike(f, KIT2.sage.basicMul) }) // 📖 Sage: melee x P.ATK
    else if (kind === 'mage') await this.shoot(f, 0x9f7bff, () => { if (this.strike(f, MAGE_SPELL.basicMul, true, '#c9a8ff') > 0) this.gainRes(MAGE_CAST.boltMana) }) // weak free magic bolt (v78: + Mana on hit); real damage = Mana spells
    else if (kind === 'thief') await this.lunge(f, () => { this.strike(f, 0.6); this.strike(f, 0.6); this.doubleAttack(f, 0.6) })
    else if (kind === 'cleric') await this.maceSmash(f, () => this.strike(f, clericBasic())) // v58 Q: melee mace/book smash, P.ATK (STR) only; spells carry M.ATK
    else await this.lunge(f, () => { const cl = BATTLE.cleave + this.st.cleaveAdd, fs = this.chargeMul(); if (live[1]) { this.strike(f, fs); this.strike(live[1], cl) } else this.strike(f, fs + (kind === 'swordsman' ? cl : 0)) }) // novice, swordsman: cleave (+talent ฟันกวาด) · swordsman alone vs 1 monster: the cleave lands on it too
    this.lsMul = 0
    if (this.j2?.id === 'monk') this.monkSwing(f)
    if (this.allies.length) this.alliesOnSwing()
    if (this.demonOn && !f.dead) this.addPoison(f, IMMORTAL_RULES.demonPoison) // 🌈 เงาปีศาจ
    this.src = prevSrc
    this.hits++
    if (this.alive().length && this.procs('hits') > 0) await this.wait(100) // พร v2: every-N-hits cards
  }

  /** Skill 2: buffs tick down, then it casts by itself (free extra action) when ready, paid for and useful. */
  private async skill2Turn() {
    const B = this.buf
    if (B.renew > 0) { B.renew--; this.heal(this.st.matk * S2N.renewHeal(this.st.s2Lv)) } // Priest heals = x M.ATK
    for (const k of ['guard', 'blood', 'hawk', 'mshield'] as const) if (B[k] > 0) B[k]--
    if (B.bless > 0 && --B.bless === 0) this.syncBless()
    const k = this.s2
    if (!k || this.hx.silence > 0 || !this.alive().length) return
    if (this.s2Cd > 0) { this.s2Cd--; return }
    if (!mayCast(!this.autoUlt, this.book.s2)) return // v86: manual mode waits for the booking
    if (this.res < k.cost) return
    if (this.smashQueued && this.smashCdLeft <= 0 && this.res - k.cost < this.ultCost()) return // keep Mana for the booked ult
    if (k.id === 'mg_mshield' && B.mshield > 0) return
    if (k.id === 'cl_renew' && (B.renew > 0 || this.hp >= this.st.maxHp)) return
    if (k.id === 'sw_guard' && B.guard > 0) return
    if (k.id === 'cl_bless' && B.bless > 0) return
    this.spendRes(k.cost)
    this.s2Cd = s2Cooldown(k, this.st)
    this.s2Count++
    this.book.s2 = false; this.popSkill('s2')
    await this.asSkill(() => this.castSkill2(k), 'skill')
  }

  private async castSkill2(k: Skill2Def) {
    const lv = this.st.s2Lv, star = this.st.s2Star > 0, B = this.buf
    this.floatText(HERO_X, GROUND - 160, `${k.icon} ${k.name}`, '#7fd7ff')
    const front = () => this.front()[0]
    const bossFirst = () => this.alive().find((m) => m.def.ai === 'boss') ?? this.alive().sort((x, y) => y.hp - x.hp)[0]
    switch (k.id) {
      case 'sw_guard': B.guard = S2N.guardTurns(star); this.ctrCharges = Math.max(this.ctrCharges, S2N.guardCounters(star)); this.floatText(HERO_X, GROUND - 100, '🛡️ ตั้งการ์ด', '#9fe3ff'); break
      case 'sw_blood': B.blood = S2N.bloodTurns; this.burst(HERO_X, GROUND - 40, 0xc0392b, 14, 160); break
      case 'sw_taunt':
        for (const m of this.alive()) { m.weakTurns = S2N.tauntTurns(star); m.weakPct = S2N.tauntWeak(lv); this.dotIcon(m) }
        if (star) this.gainRage(15)
        this.cameras.main.shake(80, 0.004)
        break
      case 'ar_rain':
        for (let w = 0; w < S2N.rainWaves(star); w++) {
          this.burst(700, GROUND - 60, 0xf6eedc, 20, 240)
          for (const m of this.alive()) { this.strike(m, S2N.rainMul(lv)); if (this.st.arPoisonS2 > 0) this.addPoison(m, KIT.archerTree.poisonArrowStacks) } // v82 ★ หมอกพิษ
          await this.wait(BATTLE.stepMs * 0.3)
        }
        break
      case 'ar_hawk': B.hawk = S2N.hawkTurns; break
      case 'ar_trap':
        for (const m of star ? this.alive() : [front()].filter(Boolean) as Mon[]) { this.strike(m, S2N.trapMul); if (this.st.arPoisonS2 > 0) this.addPoison(m, KIT.archerTree.poisonArrowStacks); m.gauge -= S2N.trapPush(lv); this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 20, '🪤', '#c9c9d6') }
        break
      case 'mg_mshield': B.mshield = S2N.mshieldTurns(star); this.floatText(HERO_X, GROUND - 100, '🔷 Mana Shield', '#5aa0ff'); break
      case 'mg_nova':
        this.burst(700, GROUND - 20, 0x9fe3ff, 30, 300)
        for (const m of this.alive()) {
          this.strike(m, S2N.novaMul(lv), true, '#9fe3ff')
          if (m.dead) continue
          m.chill = Math.max(m.chill, S2N.novaChill(star)); if (star) m.gauge -= S2N.novaPush
          if (!m.charging) m.spr.setTint(0x9fe3ff); this.dotIcon(m)
        }
        await this.wait(BATTLE.stepMs * 0.3)
        break
      case 'mg_arcane': {
        let t = bossFirst()
        for (let i = 0; i < S2N.arcaneHits(star); i++) {
          if (!t || t.dead) { t = bossFirst(); if (!t) break }
          const m = t
          await this.shoot(m, 0xc9a8ff, () => this.strike(m, S2N.arcaneMul(lv), true, '#c9a8ff'))
        }
        break
      }
      case 'cl_renew': B.renew = S2N.renewTurns(star); this.burst(HERO_X, GROUND - 40, 0x6fd08c, 14, 160); break
      case 'cl_bless': { // v77 Q 2026-11-06: active Blessing (+ Kyrie Eleison barrier, ★ Gloria LUK)
        B.bless = S2N.blessTurns; this.syncBless()
        for (let i = 0; i < S2N.blessCleanse; i++) this.cleanseOne()
        if (lv > 0) {
          this.kyrie = { hp: Math.round(this.st.maxHp * S2N.kyrieHp(lv) * (1 + this.st.shieldAmp)), hits: S2N.kyrieHits }
          this.floatText(HERO_X, GROUND - 100, `🛡️ Kyrie Eleison ${this.kyrie.hp}`, '#9fe3ff')
        }
        if (star) this.floatText(HERO_X, GROUND - 130, `✨ Gloria LUK +${S2N.gloriaLuk}`, '#ffe08a')
        this.burst(HERO_X, GROUND - 40, 0xffe08a, 16, 180)
        break
      }
      case 'cl_spear': this.spears += S2N.spearCount(star); break // "+" node: spearMul set at run start
      case 'th_smoke':
        this.dodgeCharges = Math.max(this.dodgeCharges, S2N.smokeDodges(star))
        if (lv > 0) this.heal(this.st.maxHp * S2N.smokeHeal(lv))
        this.burst(HERO_X, GROUND - 40, 0xc9c9d6, 16, 180)
        break
      case 'th_pick': {
        const m = front(); if (!m) break
        await this.lunge(m, () => {
          this.strike(m, S2N.pickMul(star))
          if (star && !m.dead) { m.poison = Math.min(this.poisonMax(), m.poison + S2N.pickPoison); m.poisonDmg = Math.max(m.poisonDmg, this.st.poisonDmg); this.dotIcon(m) }
        })
        this.res = Math.min(this.resMax(), this.res + S2N.pickRes(lv))
        break
      }
      case 'th_wound': {
        const m = front(); if (!m) break
        await this.lunge(m, () => {
          this.strike(m, S2N.woundMul(star), false, '#ff7a7a', 1)
          if (!m.dead) { m.poison = Math.min(this.poisonMax(), m.poison + S2N.woundPoison(lv)); m.poisonDmg = Math.max(m.poisonDmg, this.st.poisonDmg); this.dotIcon(m) }
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
      case 'swordsman': { // v84 จังหวะดาบ: momentum stacks (this.flow) add damage / crit / Mana · ★ พันดาบ at max stacks
        const T = KIT.swordTree, storm = this.st.swFlowStar > 0 && this.flow >= T.flowMax
        const k = 1 + this.flow * this.st.swFlow, crit = this.flow * this.st.swFlowCrit
        this.critAdd += crit; this.forceCrit = storm
        if (storm) this.callout('⚔️ พันดาบ!', W / 2, 170)
        try {
          await this.lunge(live[0], () => { for (let i = 0; i < (storm ? T.stormHits : 1); i++) live.forEach((m) => { this.strike(m, SWORD_MANA.autoMul * pow * (1 + this.st.pskill) * k + this.hpMul()) }) }) // Knight: + max HP share
        } finally { this.critAdd -= crit; this.forceCrit = false }
        if (this.flow > 0 && this.st.swFlowMana > 0) this.resGain(this.flow * this.st.swFlowMana)
        if (storm) this.flow = 0
        else if (this.st.swFlow > 0 && this.flow < T.flowMax) { this.flow++; this.floatText(HERO_X, GROUND - 165, `🌊 จังหวะ ${this.flow}/${T.flowMax}`, '#9fe3ff') }
        break
      }
      case 'archer':
        if (this.st.arAim > 0) { // talent ศรเล็ง: 2 aimed shots at the front, + crit
          this.st.crit += this.st.arAimCrit
          for (let i = 0; i < 2; i++) { const m = this.front()[0]; if (!m) break; await this.arrow(m, this.st.arAim * pow, pow) }
          this.st.crit -= this.st.arAimCrit
        } else {
          const shots = this.st.arVolley > 0 ? KIT.archerVolleyShots : KIT.archerAutoShots, mul = this.st.arVolley > 0 ? this.st.arVolley : KIT.archerAuto // talent ศรสามดอก
          const lock = this.st.lockOn > 0 && this.lockTarget && !this.lockTarget.dead ? this.lockTarget : undefined // ★ ล็อกเป้า: ยิงคู่ยิงตัวที่ล็อก
          for (let i = 0; i < shots; i++) { const t = this.alive(); if (!t.length) break; const m = lock && !lock.dead ? lock : t[Phaser.Math.Between(0, t.length - 1)]; await this.arrow(m, mul * pow, pow) }
        }
        break
      case 'mage':
        await this.mageFire(pow, this.j2?.id === 'wizard' ? MAGE_SPELL.autoMul : MAGE_CAST.fireMul) // v85: instant for every Mage (Mage / Sage MAGE_CAST.fireMul · Wizard MAGE_SPELL.autoMul)
        break
      case 'cleric':
        if (this.hp < this.st.maxHp * (KIT.clericHealBelow - this.st.healAt)) { this.skillHeal(this.st.matk * CLERIC_KIT.heal * pow); this.burst(HERO_X, GROUND - 40, 0x6fd08c, 18, 160) }
        else if (this.st.judge > 0 && ++this.smiteCount % KIT.clericJudgeEvery === 0) { // tree ★B: วันพิพากษา
          this.callout('⚖️ พิพากษา!', W / 2, 170); this.burst(700, GROUND - 30, 0xf6e27a, 30, 320)
          for (const m of live) { const d = this.strike(m, KIT.clericJudge * pow * (1 + this.st.smiteMul), true, '#f6e27a'); if (!m.dead) m.marked = 2; if (this.st.smiteVamp > 0) this.heal(d * this.st.smiteVamp, true) }
        } else for (const m of live.slice(0, KIT.clericSmiteTargets + this.st.smiteTargets)) { // v59 Q: light falls from the sky after the smash (no more ranged orb)
          if (m.dead) continue
          const d = await this.holyLight(m, CLERIC_KIT.smite * pow * (1 + this.st.smiteMul), 0xf6e27a)
          if (this.st.smiteVamp > 0) this.heal(d * this.st.smiteVamp, true)
        }
        this.addFaith(KIT.clericTree.faithCast) // v84 สวดภาวนา
        await this.wait(BATTLE.stepMs * 0.4)
        break
      case 'thief':
        await this.lunge(live[0], () => { const m = live[0]; this.strike(m, KIT.thiefAuto * pow); this.doubleAttack(m, KIT.thiefAuto * pow); if (!m.dead) { m.poison = Math.min(this.poisonMax(), m.poison + KIT.thiefAutoPoison); m.poisonDmg = Math.max(m.poisonDmg, this.st.poisonDmg); this.dotIcon(m) } })
        break
    }
  }

  /** ลูกไฟระเบิด: fire on every monster at `mul` x Pm (Mage / Sage: MAGE_CAST.fireMul · Wizard: MAGE_SPELL.autoMul). */
  private async mageFire(pow: number, mul: number) {
    this.burst(700, GROUND - 30, 0xff8c42, 30, 300)
    for (const m of this.front()) {
      this.strike(m, mul * pow * (this.overflow ? this.st.mgOverflow : 1), true, '#ff8c42')
      if (this.st.burnDps > 0 && !m.dead) { m.burn = this.st.burnDps; m.burnTurns = 3; this.dotIcon(m) }
      if (this.st.autoBurn > 0 && this.element === 'fire' && !m.dead) { m.burnStacks = Math.min(this.burnMax(), m.burnStacks + this.st.autoBurn); m.burnStackTurns = 3; this.dotIcon(m) } // tree
    }
    await this.wait(BATTLE.stepMs * 0.6)
  }

  private async ultimate() {
    const pow = 1 + this.st.ultPow // skill web: Ult +power node
    const hitPow = pow * (1 + this.st.ultAmp) // run pick บดกระดูก: damage only, shields/heals stay
    await this.skillName(this.job.ult)
    if (this.job.id === 'mage' && !this.j2) { this.charge({ kind: 'ult', pow: pow * MAGE_CAST.ultMul, hit: hitPow * MAGE_CAST.ultMul, paid: this.ultCost() }, this.res + this.ultCost()); return } // v78: the element ult chants 1 turn
    sfx.slam()
    await this.ultNow(pow, hitPow)
    this.ultWebAfter()
  }
  /** v84 webs, after any Swordsman / Priest ult (their 2nd jobs too): ★ หักท่า · ทุบเกราะ · ม่านพร · ชุบชีวา. */
  private ultWebAfter() {
    const S = KIT.swordTree, C = KIT.clericTree, st = this.st
    if (st.swShatter > 0) for (const m of this.alive()) if (m.charging) {
      m.charging = false; m.spr.clearTint(); m.gauge -= S.shatterPush
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 24, '⚡ หักท่า! ขัดชาร์จ', '#9fe3ff')
    }
    if (st.swBreak > 0 && this.alive().length) {
      for (const m of this.alive()) { m.armorBrk = Math.max(m.armorBrk, S.breakTurns); this.dotIcon(m) }
      this.floatText(W / 2 + 120, GROUND - 190, '🔨 ทุบเกราะ!', '#e0b07a')
    }
    if (st.clUltWard > 0) { this.wardTurns = C.wardTurns + 1; this.floatText(HERO_X, GROUND - 175, `🕯️ ม่านพร −${Math.round(st.clUltWard * 100)}% ${C.wardTurns} เทิร์น`, '#fff3a0') } // +1: this turn's tick
    if (st.clUltMend > 0 && this.hp > 0 && this.hp < st.maxHp) this.skillHeal((st.maxHp - this.hp) * st.clUltMend)
  }
  private async ultNow(pow: number, hitPow: number) {
    const live = this.front()
    if (this.j2) { await this.ult2(live, pow, hitPow); return }
    switch (this.job.id) {
      case 'swordsman':
        await this.lunge(live[0], () => live.forEach((m) => this.strike(m, (SWORD_MANA.ultMul + this.st.ultMulAdd) * hitPow * (1 + this.st.pskill) * (m.charging ? 1 + this.st.ultVsCharge : 1)))) // talents: ปราการ / ฟันทลาย
        this.addShield(this.st.maxHp * Math.max(0, SWORD_MANA.ultShield + this.st.ultShieldAdd) * pow)
        if (this.st.ultCounters > 0) this.ctrCharges = this.st.ultCounters // talent: ท่าสวนพร้อม
        this.cameras.main.flash(120, 140, 170, 220)
        break
      case 'archer':
        await this.archerPierce(hitPow)
        break
      case 'mage': {
        const el = this.element
        const amp = 1 + this.st.mgUltAmp + (el === 'lightning' ? this.st.mgLightAmp : el === 'fire' ? this.st.mgFireAmp : this.st.mgIceAmp)
        const dc = this.st.mgDoubleCast > 0 ? this.st.mgDoubleCast : 1 // talent ร่ายคู่
        await this.mageUlt(el, hitPow * amp * dc, pow * amp * dc) // v78 fix: damage on hitPow (ultAmp / บดกระดูก), barrier stays on pow
        if (this.st.mgDoubleCast > 0) await this.mageUlt(el, hitPow * amp * dc, 0)
        if (this.st.mgUltMana > 0) this.res = Math.min(this.resMax(), this.res + this.st.mgUltMana)
        if (this.st.elemWheel > 0) { const els = Object.keys(ELEMENTS) as Element[]; this.element = els[(els.indexOf(el) + 1) % els.length]; this.floatText(HERO_X, GROUND - 180, `🔄 ถัดไป ${ELEMENTS[this.element].icon}`, '#c9a8ff') } // talent วงล้อธาตุ
        break
      }
      case 'cleric': { // v58 melee hybrid (Q 2026-11-04): smash all (P.ATK) + Holy Light on random monsters (M.ATK) + timed shield
        const charging = this.alive().some((m) => m.charging)
        if (live[0]) await this.maceSmash(live[0], () => { live.forEach((m) => this.strike(m, clericUltSmash(this.st) * hitPow * (1 + this.st.pskill))); this.cameras.main.flash(120, 255, 240, 170) })
        this.dawnBonus(live.filter((m) => !m.dead), hitPow) // v92 🌄 แสงรุ่งอรุณ: bonus magic hit on every smash target still standing
        for (let i = 0; i < clericUltLights(this.st); i++) { const t = this.alive(); if (!t.length) break; await this.holyLight(t[Phaser.Math.Between(0, t.length - 1)], CLERIC_KIT.ultLight * hitPow) }
        this.addShield(this.st.maxHp * CLERIC_KIT.ultShield * pow * (charging ? 1 + this.st.ultChargeShield : 1)) // talent: ใต้ปีกเทพ · lasts shieldTurns, capped
        if (this.st.clPurify > 0) { // Ult web ★: ไฟชำระ
          const X = this.hx, n = X.poison + X.burn + X.weaken + X.armorBreak + X.silence + X.web + X.slow + X.thorn + X.venomTurns
          this.hx = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0, web: 0, slow: 0, thorn: 0, venom: 0, venomTurns: 0 }; this.syncWeb()
          this.skillHeal(this.st.matk * CLERIC_KIT.purifyHeal)
          this.floatText(HERO_X, GROUND - 160, n > 0 ? '🔆 ไฟชำระ: ล้างดีบัฟ!' : '🔆 ไฟชำระ', '#ffe08a')
        }
        this.burst(HERO_X, GROUND - 50, 0xf6e27a, 24, 200)
        if (this.st.ultHoly > 0) for (const m of this.alive()) this.strike(m, this.st.ultHoly, true, '#f6e27a') // talent: แสงลงทัณฑ์
        if (this.st.ultRegen > 0) this.ultRegenTurns = 3 // talent: พรยืนยาว
        await this.wait(BATTLE.stepMs * 0.5)
        break
      }
      case 'thief':
        await this.shadowDance(hitPow)
        break
    }
  }

  /** Archer ult ศรทะลวง: dodge back + a piercing shot at the boss / biggest HP (Beastmaster / Innovator ults end with it). */
  private async archerPierce(hitPow: number) {
    this.dodgeCharges = Math.max(this.dodgeCharges, 1 + this.st.arUltDodge) // talent ถอยยาว
    this.floatText(HERO_X, GROUND - 100, '💨 ถอยหลบ!', '#c9c9d6')
    const t = this.alive().find((m) => m.def.ai === 'boss') ?? this.alive().sort((x, y) => y.hp - x.hp)[0]
    if (t) {
      this.tweens.add({ targets: this.heroSpr, x: HERO_X - 40, duration: 120, yoyo: true })
      this.ultFiring = true
      await this.shoot(t, 0xfff3a0, () => {
        const A = KIT.archerTree, low = this.st.arExecute > 0 && t.hp < t.def.hp * A.execBelow // v82 ★ ศรประหาร
        if (low && t.def.ai !== 'boss') this.execute(t)
        else this.strike(t, (KIT.archerUlt - this.st.arUltMulCut) * hitPow * (low ? 1 + A.execBig : 1), false, undefined, this.st.pierce)
        this.burst(t.spr.x, t.spr.y - 30, 0xfff3a0, 20, 260)
        if (this.st.arMark > 0 && !t.dead) { t.huntMark = A.markTurns; this.dotIcon(t); this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 40, '🏷️ หมายหัว', '#f2b84b') } // v82 หมายหัว
        if (this.st.arUltSplash > 0) for (const o of this.alive()) if (o !== t) this.strike(o, this.st.arUltSplash * hitPow, false, undefined, this.st.pierce) // talent ศรเจาะทะลุ
      })
      this.ultFiring = false
      this.shake(160, 0.012)
    }
    await this.wait(200)
  }

  // ----- v82 archer web: 🧪 ศรพิษ / 🏷️ ล่าหัว (numbers KIT.archerTree) -----
  /** One ยิงคู่ arrow: ศรอาบพิษ may poison · a kill fires ศรเด้ง at the front (a ricochet never ricochets again). */
  private async arrow(m: Mon, mul: number, pow: number) {
    const was = !m.dead
    await this.shoot(m, 0xf2b84b, () => { if (this.strike(m, mul) > 0) this.poisonArrow(m) })
    if (!was || !m.dead || this.st.arRicochet <= 0) return
    const n = this.front()[0]
    if (!n) return
    this.floatText(n.spr.x, n.spr.y - n.spr.displayHeight - 40, '🪶 ศรเด้ง!', '#c9f2a0')
    await this.shoot(n, 0xc9f2a0, () => { if (this.strike(n, this.st.arRicochet * pow) > 0) this.poisonArrow(n) })
  }
  private poisonArrow(m: Mon) { if (this.st.arPoisonArrow > 0 && Math.random() < this.st.arPoisonArrow) this.addPoison(m, KIT.archerTree.poisonArrowStacks) }
  /** ★ ศรประหาร on a normal monster: finish it through the normal kill path (on-kill effects still run). */
  private execute(m: Mon) {
    if (m.dead) return
    const d = Math.max(1, Math.ceil(m.hp))
    m.shield = 0; m.hp = 0
    this.damageNumber(m.spr.x, m.spr.y - m.spr.displayHeight, d, true, '#ff5a5a')
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 40, '💀 ประหาร!', '#ff5a5a')
    this.killMon(m)
  }
  /** Kill hook: ไล่ล่า (the marked one died: Energy + the mark jumps to the front) · ล่าต่อ (chance ult cooldown −1). */
  private archerKill(m: Mon, others: Mon[]) {
    const A = KIT.archerTree
    if (m.huntMark > 0 && this.st.arMarkJump > 0) {
      m.huntMark = 0
      this.gainRes(this.st.arMarkJump)
      const f = others.filter((o) => !o.dead).sort((a, b) => a.slot - b.slot)[0]
      if (f) { f.huntMark = A.markTurns; this.dotIcon(f); this.floatText(f.spr.x, f.spr.y - f.spr.displayHeight - 40, '🏷️ ไล่ล่า!', '#f2b84b') }
    }
    if (this.st.arKillCd > 0 && this.smashCdLeft > 0 && Math.random() < this.st.arKillCd) { this.smashCdLeft = Math.max(0, this.smashCdLeft - A.killCdCut); this.floatText(HERO_X, GROUND - 170, `⏳ ult −${A.killCdCut}`, '#f2b84b') }
  }

  // ----- v84 webs: ⚔️ จังหวะดาบ / 🔨 ทลายเกราะ (KIT.swordTree) · 🙏 ศรัทธา / ⛪ ฟื้นคืน (KIT.clericTree) · 🚩 ธงศึก / 🌀 กวาดทวน (KIT2.knight.tree) -----
  private flow = 0 // Swordsman momentum stacks (this wave)
  private faith = 0 // Priest Faith stacks (this run)
  private overBursting = false // ★ แสงล้นฟ้า running (its kill heals can't chain another burst)
  private wardTurns = 0 // ม่านพร: hero turns of less damage taken left
  private clEmerUsed = false // ฉุกเฉิน used this wave
  private holyRevived = false // ★ คืนชีพ used this run
  private sweepTurn = 0 // Knight ทวนวน: hero turns this wave
  private addFaith(n: number) {
    const T = KIT.clericTree
    if (this.st.clFaith <= 0 || n <= 0 || this.faith >= T.faithMax) return
    this.faith = Math.min(T.faithMax, this.faith + n)
    this.floatText(HERO_X - 40, GROUND - 175, `🙏 ศรัทธา ${this.faith}/${T.faithMax}`, '#fff3a0')
  }
  /** Full Faith: holy light on every monster (x Pm) + พรเกื้อ heal per stack. */
  private async faithBurst() {
    const T = KIT.clericTree, n = this.faith
    if (this.st.clFaith <= 0 || n < T.faithMax || !this.alive().length || this.hp <= 0) return
    this.faith = 0
    this.callout('🙏 ศรัทธาระเบิด!', W / 2, 170, '#fff3a0')
    this.cameras.main.flash(120, 255, 243, 170)
    this.withSrc('light', () => { for (const m of this.alive()) { this.strike(m, this.st.clFaith * (1 + this.st.s1Pow), true, '#fff3a0'); this.burst(m.spr.x, m.spr.y - 30, 0xfff3a0, 8, 160) } })
    if (this.st.clFaithHeal > 0) this.heal(this.st.maxHp * this.st.clFaithHeal * n)
    await this.wait(BATTLE.stepMs * 0.3)
  }
  /** Overheal (amount past max HP): ล้นศรัทธา may give Faith · ★ แสงล้นฟ้า hits the front monster with it. */
  private overFaith(over: number) {
    const T = KIT.clericTree
    if (this.st.clFaithOver > 0 && over >= this.st.maxHp * T.overMin && Math.random() < this.st.clFaithOver) this.addFaith(1)
    const f = this.front()[0]
    if (this.st.clOverBurst <= 0 || this.overBursting || !f) return
    this.overBursting = true
    try { this.withSrc('light', () => this.damageMon(f, Math.max(1, Math.round(Math.min(over, this.st.maxHp * T.overCap) * T.overBurst)), false, '#fff3a0')) } finally { this.overBursting = false }
  }
  /** ★ คืนชีพ: once per run, a knock-out leaves the Priest at reviveHp + shield, debuffs cleared. */
  private holyRevive(): boolean {
    if (this.hp > 0 || this.st.clRevive <= 0 || this.holyRevived) return false
    const T = KIT.clericTree
    this.holyRevived = true; this.revivedCount++
    this.hp = Math.round(this.st.maxHp * T.reviveHp)
    this.hx = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0, web: 0, slow: 0, thorn: 0, venom: 0, venomTurns: 0 }; this.syncWeb()
    this.addShield(this.st.maxHp * T.reviveShield, true)
    this.heroSpr.setAngle(0).setAlpha(1)
    this.cameras.main.flash(300, 255, 243, 170)
    this.burst(HERO_X, GROUND - 40, 0xfff3a0, 32, 280, true)
    this.callout('✨ คืนชีพ! แสงศักดิ์สิทธิ์ดึงกลับมา', W / 2, 200, '#fff3a0')
    sfx.win()
    return true
  }
  /** Knight ทวนวน: a free spear sweep on every monster (+ max HP share) · เหวี่ยง gauge push · ทวนเร็ว gauge per kill · ★ พายุทวน break + stun. */
  private async spearSweep() {
    const T = KIT2.knight.tree, st = this.st, live = this.front()
    if (!live.length) return
    this.floatText(HERO_X, GROUND - 130, '🌀 กวาดทวน', '#f2b84b')
    let kills = 0
    await this.lunge(live[0], () => this.withSrc('skill', () => {
      for (const m of live) {
        this.strike(m, st.j2Sweep * (1 + st.pskill) + this.hpMul())
        if (m.dead) { kills++; continue }
        if (st.j2SweepPush > 0) m.gauge -= st.j2SweepPush
        if (st.j2SweepStar > 0) { m.armorBrk = Math.max(m.armorBrk, T.sweepBreak); this.dotIcon(m); if (Math.random() < T.sweepStun) this.stunMon(m) }
      }
    }))
    if (kills > 0 && st.j2SweepGauge > 0) { this.heroGauge = Math.min(100, this.heroGauge + st.j2SweepGauge * kills); this.floatText(HERO_X, GROUND - 160, '⚡ ทวนเร็ว', '#f2b84b') }
  }

  /** Thief ult เงาพริ้ว (Rogue พายุมีด reuses it). */
  private async shadowDance(hitPow: number) {
    this.dodgeCharges = KIT.thiefUltDodge + this.st.ultDodge // talent: เงาซ้อน
    this.stayIn = true // dart from monster to monster, walk home once at the end
    for (let i = 0; i < KIT.thiefUltHits + this.st.ultHits; i++) { // talent: พายุมีด
      const t = this.alive(); if (!t.length) break
      const m = t[Phaser.Math.Between(0, t.length - 1)]
      this.heroSpr.setAlpha(0.4)
      await this.lunge(m, () => {
        this.strike(m, KIT.thiefUlt * hitPow * (1 + this.st.thUltAgi)) // Q: scales with AGI
        if (this.st.ultPoison > 0 && !m.dead) { m.poison = Math.min(this.poisonMax(), m.poison + this.st.ultPoison); m.poisonDmg = Math.max(m.poisonDmg, this.st.poisonDmg); this.dotIcon(m) } // talent: มีดอาบพิษ
      })
    }
    this.stayIn = false
    this.heroSpr.setAlpha(1)
    await this.goHome()
  }

  /** `pow` = damage power (with ultAmp) · `bpow` = barrier power (0 = no barrier). */
  private async mageUlt(el: Element, pow: number, bpow: number) {
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
        this.strike(m, KIT.mageFire * pow, true, txt)
        if (!m.dead && this.relic === 'hellfire') { m.hell += KIT.mageFireStacks + this.st.mgFireStack; this.dotIcon(m) } // Hellfire: no cap, never expires
        else if (!m.dead) { m.burnStacks = Math.min(this.burnMax(), m.burnStacks + KIT.mageFireStacks + this.st.mgFireStack); m.burnStackTurns = 3; this.dotIcon(m) }
      } else {
        this.strike(m, KIT.mageIce * pow, true, txt)
        if (m.dead) continue
        if (m.chill > 0 && m.def.ai !== 'boss') { m.frozen = true; froze = true; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 20, 'แช่แข็ง!', '#9fe3ff') }
        m.chill = KIT.mageIceChill + this.st.chillPlus; m.gauge -= 25; if (!m.charging) m.spr.setTint(0x9fe3ff); this.dotIcon(m)
      }
    }
    if (froze && this.st.shatter > 0) { // tree ice ★ "ผลึกแตก"
      this.callout('❄️ ผลึกแตก!', W / 2, 170)
      for (const m of this.alive()) this.strike(m, m.frozen ? 1.5 : 0.75, true, '#9fe3ff')
    }
    if (bpow > 0) this.addShield(this.st.matk * (MAGE_SPELL.barrier + (el === 'ice' ? this.st.iceBarrier : 0)) * bpow * (1 - this.st.mgBarrierCut))
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
    const every = this.pk.zapCharge || (this.st.boltCharge > 0 ? 10 : 0) // legend ประจุสะสม
    const charged = every > 0 && this.zapCount % every === 0
    if (charged) { mul *= 3; m.gauge -= 15; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '🔋 ประจุ!', txt) }
    const proc = this.src === 'zap' // card lightning (not the Mage ult)
    if (proc && fork && this.relic === 'superbolt' && Math.random() < RELIC_RULES.superbolt.chance) { // mythic อสนีเทพ
      mul *= RELIC_RULES.superbolt.mul
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 46, '⚡ อสนีเทพ!', '#fff07a')
      for (const o of this.alive().filter((x) => x !== m).slice(0, 2)) this.strike(o, RELIC_RULES.superbolt.splash, true, txt)
    }
    this.strike(m, mul, true, txt)
    if (proc && fork && this.pk.chain > 0 && Math.random() < this.pk.chain) { // legend ฟ้าแตกแขนง: never chains again
      const l = this.alive(); if (l.length) this.zap(l[Phaser.Math.Between(0, l.length - 1)], mul, txt, false)
    } else if (fork && this.element === 'lightning' && this.st.lightChain > 0 && Math.random() < this.st.lightChain) { // tree "ฟ้าแตกแขนง": never chains again
      const l = this.alive(); if (l.length) this.zap(l[Phaser.Math.Between(0, l.length - 1)], mul, txt, false)
    }
  }

  /** Mage lightning ult: 6+ hits on one target (boss, else highest HP), 0.3–1.2x each; leftovers jump if it dies. */
  private async lightningStorm(pow: number, txt: string) {
    const pick = () => this.alive().find((m) => m.def.ai === 'boss') ?? this.alive().sort((x, y) => y.hp - x.hp)[0]
    this.zapTurn.clear()
    let t = pick()
    const hits = KIT.mageLightHits + this.st.lightHits
    for (let i = 0; i < hits; i++) {
      if (!t || t.dead) { const l = this.alive(); if (!l.length) break; t = l[Phaser.Math.Between(0, l.length - 1)] }
      let r = Phaser.Math.FloatBetween(KIT.mageLightLo, KIT.mageLightHi)
      if (this.st.lightLuck > 0) r = Math.max(r, Phaser.Math.FloatBetween(KIT.mageLightLo, KIT.mageLightHi)) // tree ★ ฟ้าลิขิต
      this.zap(t, r * pow, txt)
      if (r >= 1 && this.st.overload > 0 && this.job.resource === 'mana') this.res = Math.min(this.resMax(), this.res + this.st.overload)
      await this.wait(70)
    }
  }

  private addShield(n: number, quiet = false) {
    if (this.job.id === 'cleric') this.syncShieldLayers() // book older shield before the new layer
    this.shield += Math.round(n * (1 + this.st.shieldAmp))
    if (this.job.id === 'cleric') this.syncShieldLayers() // new layer (shieldTurns) + 50% max HP cap
    if (!quiet) this.floatText(HERO_X, GROUND - 100, `🛡️ โล่ ${Math.round(this.shield)}`, '#9fe3ff')
  }

  /** RO-style crit: physical only, uses max ATK (no low roll) x critMul (base 1.4 + crit-damage bonuses). Caller skips DEF on a crit. */
  private roll(mul = 1, magic = false, crit = Math.random() < (magic ? this.st.spellCrit : this.st.crit)) { // magic crit: spellCrit only, max M.ATK roll
    const hb = hitBase(this.st, magic) // data/skill-math.ts: the one place the hit base (and the coming 70/30 magic rule) lives
    const base = (crit ? hb.hi : Phaser.Math.FloatBetween(hb.lo, hb.hi)) * (this.berserking() ? 1.4 : 1) * this.atkMul()
    return { dmg: Math.max(1, Math.round(base * mul * (crit ? this.st.critMul + (this.buf.hawk > 0 && this.st.s2Star ? S2N.hawkCritDmg : 0) + (this.zenTurns > 0 ? FOCUS_RULES.zenCritDmg : 0) : 1))), crit } // Skill 2 ★ เล็งจุดตาย · v78 Zen
  }

  /** Monster P.DEF (stat spec v1 formula). Magic skips this. */
  private armor(m: Mon, dmg: number, pierce = 0) { return m.def.def ? Math.max(1, Math.round(afterDef(dmg, m.def.def * (1 - Math.min(1, pierce))))) : dmg }

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
      this.damageMon(m, r.crit ? r.dmg : this.armor(m, r.dmg, this.st.ultPierce), true) // v78 บดกระดูก pierce
      if (!m.dead) { m.gauge = Math.max(0, m.gauge - 40); this.tweens.add({ targets: m.spr, x: m.spr.x + 30, duration: 90, yoyo: true }) }
    }
    await this.wait(250)
    await this.tween({ targets: this.heroSpr, x: HERO_X, duration: 200 })
  }

  /** dot = damage over time / reflected damage: no executioner bonus and never reflected back. */
  private damageMon(m: Mon, dmg: number, crit: boolean, color?: string, dot = false) {
    if (m.dead) return
    dmg = Math.ceil(dmg * this.srcMul(m, dot)) // พร v2 tags (masteries, style switches) · whole numbers only (Q: round up), so shown == applied
    if ((m.marked ?? 0) > 0) dmg = Math.ceil(dmg * 1.15) // cleric ★B: ตราบาป
    if (!dot && m.huntMark > 0 && this.st.arMark > 0) dmg = Math.ceil(dmg * (1 + this.st.arMark)) // v82 archer หมายหัว (hits only)
    if (!dot && m.armorBrk > 0 && this.st.swBreak > 0) dmg = Math.ceil(dmg * (1 + this.st.swBreak)) // v84 Swordsman ทุบเกราะ (hits only)
    if (this.st.lateDmg > 0 && this.fightTurns >= 12) dmg = Math.ceil(dmg * (1 + this.st.lateDmg)) // cleric talent: อรุณรุ่ง
    if (this.st.poisonAmp > 0 && m.poison >= 10) dmg = Math.ceil(dmg * (1 + this.st.poisonAmp)) // Thief talent: กัดกร่อน
    if (!dot && this.relic === 'executioner' && m.hp < m.def.hp * RELIC_RULES.executioner.below) dmg = Math.ceil(dmg * (1 + RELIC_RULES.executioner.mul))
    if (m.maiden && !m.maiden.dead && dmg > 0) { this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 6, 'อมตะ! (ฆ่าเมเดนก่อน)', '#e0a8ff'); return }
    if ((m.parry || m.espadaArmed) && dmg > 0) { // duelist: Riposte stance / Grandado Espada mark turn = immortal
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 6, m.parry ? 'ปัด!' : 'อมตะ!', '#c9e0ff')
      if (m.parry && !dot && this.hp > 0) this.riposteHit(m, dmg)
      return
    }
    if (!dot && m.reflect > 0 && dmg > 0 && this.hp > 0) this.reflectHurt(m, dmg * m.reflect)
    if (!dot && m.absorb > 0 && dmg > 0) { m.stored += dmg * m.absorb; this.dotIcon(m) } // Mirage: stores it for the Soul Strike
    if (m.shield > 0) { // monster shield (turtle wall, ice armor, bone shield) soaks first
      const a = Math.min(Math.ceil(m.shield), dmg)
      m.shield = Math.max(0, m.shield - a); dmg -= a
      this.floatText(m.spr.x + 30, m.spr.y - m.spr.displayHeight - 20, `🛡️-${Math.round(a)}`, '#9fe3ff')
      if (m.shield <= 0) { m.shield = 0; this.dotIcon(m) }
      if (dmg <= 0) return
    }
    m.hp -= dmg
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
    if (m.def.mini === 'drainer' && !m.maidenDone && m.hp > 0 && m.hp < m.def.hp * BATTLE.maiden.at) this.summonMaiden(m)
    if (m.hp <= 0) this.killMon(m)
    else while (m.def.phases && m.phase < m.def.phases.length && m.hp < m.def.hp * m.def.phases[m.phase].at) this.enterPhase(m, m.def.phases[m.phase++])
  }

  /** Equipment card drop (design/equipment-cards.md): base rate x LUK, guaranteed after `pity` kills of that monster. */
  private rollCard(m: Mon) {
    if (m.revived) return
    const pity = (save().cardPity ??= {})
    for (const cd of cardsOfMonster(m.kind)) {
      const n = (pity[cd.id] ?? 0) + 1
      if (Math.random() < cardRate(cd) * this.cardLuck * this.dropMul || n >= cardPityMax(cd)) {
        pity[cd.id] = 0
        this.runCards.push(cd.id)
        this.callout(`🃏 ได้${cardName(cd)}!`, m.spr.x, m.spr.y - 130 - (cd.v2 ? 40 : 0))
        sfx.coin()
      } else pity[cd.id] = n
    }
  }

  /** Forge materials (design/item-acquisition-v1.md): this dungeon's common one from normal monsters, its boss one from minis / bosses. Summons (no card) drop nothing. */
  private rollMat(m: Mon) {
    if (m.revived || !cardsOfMonster(m.kind).length) return
    const dg = this.dg.id, got: [string, number][] = []
    if (m.def.ai === 'boss' && !m.def.mini) {
      got.push([matOf(dg, true), MAT_RULES.boss.boss], [matOf(dg, false), MAT_RULES.boss.common])
      if ((this.run.modeId === 'dungeon' || this.run.modeId === 'hard') && this.roomDef(this.room)?.boss && taintDrop(dg)) got.push([TAINT_MAT, taintDrop(dg)]) // v89 ผลึกโลกันตร์: D6+ final boss only
    }
    else if (m.def.ai === 'boss') got.push([matOf(dg, true), MAT_RULES.mini.boss])
    else if (Math.random() < MAT_RULES.normalRate * this.dropMul) got.push([matOf(dg, false), 1])
    got.forEach(([id, n], i) => {
      this.runMats[id] = (this.runMats[id] ?? 0) + n
      this.floatText(m.spr.x + 40, m.spr.y - 40 - i * 24, `${matName(id)} +${n}`, '#e8d9a8')
    })
  }

  /** v88 unique item (design/unique-taint-tower-skip-v1.md §2): only the final boss of a dungeon / hard run can drop one.
   * A duplicate (already owned, or already dropped this run) pays that dungeon's boss materials instead. Never zeny. */
  private rollUnique(m: Mon) {
    if ((this.run.modeId !== 'dungeon' && this.run.modeId !== 'hard') || m.revived || m.def.ai !== 'boss' || m.def.mini || !cardsOfMonster(m.kind).length || !this.roomDef(this.room)?.boss) return
    const got = rollUniqueDrop(this.dg.id, this.hard, [...save().owned, ...this.runUniques])
    if (got.kind === 'none') return
    const it = itemById(got.id)
    if (got.kind === 'new') this.runUniques.push(got.id)
    else for (const [id, n] of Object.entries(got.mats)) this.runDupeMats[id] = (this.runDupeMats[id] ?? 0) + n
    this.callout(got.kind === 'new' ? `💎 ของยูนีค! ${it.icon} ${it.name}` : `💎 ${it.icon} ${it.name} (ซ้ำ → วัตถุดิบ)`, m.spr.x, m.spr.y - 170, '#ffd86b')
    sfx.win()
  }

  private killMon(m: Mon) {
    m.dead = true
    if (this.st.killHeal > 0 && this.hp > 0) this.heal(this.st.maxHp * this.st.killHeal) // Thief กระหายเลือด
    if (this.st.lockOn > 0 && this.lockTarget === m && this.dodgeCharges < 1) { this.dodgeCharges = 1; this.floatText(HERO_X, GROUND - 100, '💨 ถอยตั้งหลัก', '#c9c9d6') } // archer ★ ล็อกเป้า: kill the locked target -> 1 sure dodge
    const others = this.alive()
    if (this.st.fireSpread > 0 && m.burnStacks > 0) for (const o of others) { o.burnStacks = Math.min(this.burnMax(), o.burnStacks + Math.ceil(m.burnStacks / 2)); o.burnStackTurns = 3; this.dotIcon(o) } // tree
    if (this.st.poisonSpread > 0 && m.poison > 0) for (const o of others) { o.poison = Math.min(this.poisonMax(), o.poison + Math.ceil(m.poison / 2)); o.poisonDmg = Math.max(o.poisonDmg, m.poisonDmg); this.dotIcon(o) } // tree
    this.archerKill(m, others)
    if (m.armorBrk > 0 && this.st.swBreakSpread > 0 && others.length) { // v84 Swordsman ร้าวลาม
      for (const o of others) { o.armorBrk = Math.max(o.armorBrk, KIT.swordTree.breakTurns); this.dotIcon(o) }
      this.resGain(this.st.swBreakSpread)
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 40, '💥 ร้าวลาม!', '#e0b07a')
    }
    if (this.st.j2BannerKill > 0 && this.hp > 0) this.addShield(this.st.maxHp * this.st.j2BannerKill, true) // v84 Knight ธงชัย
    this.kills++
    this.procs('kill', m) // พร v2: on-kill cards
    if (this.relic === 'glass' && this.hp > 0) this.heal(this.st.maxHp * RELIC_RULES.glass.killHeal, true) // mythic แก้วร้าว
    if (this.relic === 'harvest') this.harvestSoul()
    if (this.relic === 'executioner' && this.smashCdLeft > 0) { this.smashCdLeft = Math.max(0, this.smashCdLeft - RELIC_RULES.executioner.cd); this.floatText(HERO_X, GROUND - 150, '🪓 ท่าไม้ตายเร็วขึ้น', '#f2b84b') }
    if (m.def.deathBlast && this.hp > 0) { // bloater / imp / mirror shard: blows up when it dies
      this.callout(`💥 ${m.def.name}ระเบิด!`, m.spr.x, m.spr.y - 120)
      this.burst(m.spr.x, m.spr.y - 20, 0xffb347, 22, 300)
      this.shake(180, 0.012)
      sfx.slam()
      this.hurtHero(m.def.dmg * BATTLE.monDmgMul * m.def.deathBlast, true, m.def.hit ?? 15)
    }
    if (this.aff.split > 0 && !m.clone && !m.summoned && m.def.ai !== 'boss' && this.hp > 0) { // tower affix แยกร่าง
      const sl = this.freeSlots().find((x) => x !== m.slot) ?? this.freeSlots()[0]
      if (sl != null) { // right away, so the fight can't end before the copy arrives; the copy drops nothing (revived)
        const c = this.addMon(m.kind, sl, 0), hp = Math.max(1, Math.round(c.def.hp * this.aff.split))
        c.clone = true; c.revived = true; c.def = { ...c.def, hp }; c.hp = hp; c.spr.setAlpha(0.75)
        this.callout(`🧬 ${m.def.name}แยกร่าง!`, SLOT_X[sl] ?? W / 2, GROUND - 140)
      }
    }
    this.runXp += m.def.xp
    this.gainXp(m.def.xp)
    const [a, b] = m.def.zeny
    this.coinsFly(m.spr.x, m.spr.y - 20, Math.round(Phaser.Math.Between(a, b) * (1 + this.zenyWave))) // Innovator 🧲 แม่เหล็ก
    this.rollCard(m)
    this.rollMat(m)
    this.rollUnique(m)
    if (Math.random() < this.st.dropChance) { this.runGems++; this.floatText(m.spr.x, m.spr.y - 80, '💎 ของหายาก!', '#7fd7ff'); sfx.coin() }
    sfx.pop()
    m.dotTxt?.destroy(); m.dotTxt = undefined
    this.tweens.add({ targets: [m.spr, m.shadow], alpha: 0, duration: 260, onComplete: () => this.removeMon(m) })
    this.tweens.add({ targets: m.spr, scaleY: 0.2, duration: 260 })
    // close ranks: survivors step forward
    this.time.delayedCall(280, () => {
      this.alive().sort((x, y) => x.slot - y.slot).forEach((x, i) => {
        if (x.def.ai === 'boss') return
        if (SLOT_X[i] === undefined || !x.spr?.active) return // a summon past the last slot: stay put (undefined x crashed the tween)
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
    if ((m.trueTurns ?? 0) > 0 && --m.trueTurns! === 0) this.dotIcon(m)
    if ((m.marked ?? 0) > 0) m.marked!--
    if (m.huntMark > 0 && --m.huntMark === 0) this.dotIcon(m)
    if (m.armorBrk > 0 && --m.armorBrk === 0) this.dotIcon(m)
    if (m.blind > 0 && --m.blind === 0) this.dotIcon(m)
    if (m.wet > 0 && --m.wet === 0) this.dotIcon(m)
    if (m.def.toxicSkin) { // Toxic Skin tenacity: debuffs on it wear off twice as fast
      if (m.chill > 0) m.chill--; if (m.burnTurns > 0) m.burnTurns--; if (m.burnStackTurns > 0) m.burnStackTurns--; if (m.poison > 0) m.poison--
      if (m.weakTurns > 0 && --m.weakTurns === 0) this.dotIcon(m); if ((m.marked ?? 0) > 0) m.marked!--; if (m.huntMark > 0 && --m.huntMark === 0) this.dotIcon(m); if (m.armorBrk > 0 && --m.armorBrk === 0) this.dotIcon(m)
    }
    if (m.drainStats && !m.dead && this.hp > 0) this.deathRealm(m, m.drainStats)
    if (m.vengCd) m.vengCd--
    if (m.vengTurns && !m.dead) {
      const V = BATTLE.vengeance
      if (m.shield > 0 && this.hp > 0 && this.hurtHero(this.st.maxHp * V.dotPct + this.monMatk(m) * V.dotMatk, true, 999)) this.floatText(HERO_X, GROUND - 150, '🖤 ความแค้นกัดกิน', '#c9a8ff')
      if (--m.vengTurns === 0) { m.shield = 0; m.vengCd = V.cd; this.dotIcon(m) }
    }
    // damage over time first
    if (m.burnTurns > 0) { m.burnTurns--; this.withSrc('fire', () => this.damageMon(m, Math.max(1, Math.round(m.burn * this.dotMul())), false, '#ff8c42', true)); if (!m.burnTurns) this.dotIcon(m) }
    if (!m.dead && m.poison > 0) { this.withSrc('poison', () => this.damageMon(m, Math.max(1, Math.round(m.poison * m.poisonDmg * this.dotMul())), false, '#a77be0', true)); if (this.st.poisonLeech > 0) this.heal(m.poison * m.poisonDmg * this.st.poisonLeech, true) } // Thief เลือดพิษ
    if (!m.dead && m.burnStackTurns > 0) { // ไฟลุก: stacks x magic power (พร v2: 70% M.ATK + 30% P.ATK)
      m.burnStackTurns--
      this.withSrc('fire', () => this.damageMon(m, Math.max(1, Math.round(m.burnStacks * magicPower(this.st) * (0.12 + this.st.burnTick) * this.dotMul())), false, '#ff8c42', true))
      if (!m.burnStackTurns) m.burnStacks = 0
      this.dotIcon(m)
    }
    if (!m.dead && m.hell > 0) this.withSrc('fire', () => this.damageMon(m, Math.max(1, Math.round(hellEff(m.hell) * RELIC_RULES.hellfire.dmgPerStack * this.magicPow() * this.dotMul())), false, '#ff5a2a', true))
    if (!m.dead && m.def.mini === 'drainer' && m.hp < m.def.hp * BATTLE.demonAt) this.healMon(m, m.def.hp * BATTLE.demonRegen, true)
    m.parry = false
    if (!m.dead && (m.duelHealTurns ?? 0) > 0) { m.duelHealTurns!--; this.healMon(m, m.duelHeal ?? 0) }
    if (!m.dead && m.chill > 0) { m.chill--; if (!m.chill && !m.charging) m.spr.clearTint(); this.dotIcon(m) }
    if (!m.dead && m.frozen) { m.frozen = false; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10, '❄️ แข็งอยู่', '#9fe3ff'); await this.wait(250); return }
    if (m.dead) { await this.wait(200); return }
    if (m.def.passive) { this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10, '💨 วิ่งวน!', '#f2c94c'); await this.wait(200); return } // event เจลล็อปทองคำ
    if (this.allies.length && this.trapOnAct(m)) { // Innovator trap: goes off as it moves · snared / frozen = this turn is lost
      await this.wait(250)
      if (m.dead || !this.alive().length) return
      if (m.frozen) { m.frozen = false; await this.wait(150); return }
    }
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
    if (m.def.mini === 'duelist' && await this.duelTurn(m)) return
    if (m.def.mini === 'gunner' && await this.bulletTime(m)) return

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
      if (m.def.charge && m.turns % m.chargeEvery === 0) {
        m.charging = true
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
      const cr = this.monCrit(m)
      const landed = this.hurtHero((m.def.magic ? this.monMatk(m) : m.def.dmg) * BATTLE.monDmgMul * this.monMul(m) * cr, !!m.def.magic, cr > 1 ? 999 : m.def.hit ?? 15, m)
      if (landed) { this.monLeech(m); this.razor(m); if (m.onHit) this.applyFx(m.onHit, m); if (this.procs('hurt', m) > 0) await this.wait(90); await this.tryCounter(m) }
    }
    if (m.def.combo) { // v49 monster combo: chain extra hits like the hero (same cap)
      let extra = 0
      while (extra < BATTLE.comboMax && Math.random() < m.def.combo + (this.scent(m) ? BATTLE.scentCombo : 0) - this.st.ignoreCombo) extra++ // hero Ignore Combo (AGI / gear)
      for (let i = 0; i < extra && this.hp > 0 && !m.dead; i++) {
        this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10 - i * 22, `คอมโบ x${i + 2}!`, '#ffb070')
        this.tweens.add({ targets: m.spr, x: m.spr.x - 14, duration: 70, yoyo: true })
        await this.wait(160)
        const cr = this.monCrit(m)
        const landed = this.hurtHero((m.def.magic ? this.monMatk(m) : m.def.dmg) * BATTLE.monDmgMul * this.monMul(m) * BATTLE.monComboMul * (1 - this.st.comboDR) * cr, !!m.def.magic, cr > 1 ? 999 : m.def.hit ?? 15, m)
        if (landed) { this.monLeech(m); this.razor(m) }
      }
    }
    await this.tween({ targets: [m.spr, m.shadow], x: home, duration: BATTLE.stepMs * 0.35, ease: 'Quad.easeOut' })
  }

  /** Counter: when a hit lands, sometimes strike back at the attacker right away (basic attack x counterMul).
   *  Q 2026-11-03: shown as an action: melee dashes into the attacker and knocks it back, ranged/magic fire point blank. */
  private async tryCounter(m: Mon) {
    if (this.hp <= 0 || m.dead) return
    if (this.ctrCharges > 0) this.ctrCharges-- // talent: ท่าสวนพร้อม (sure counter)
    else if (Math.random() >= this.counterChance() - this.monCombo(m).ignoreCounter) return // Capybara-style: rate - Ignore Counter
    this.counterCount++
    this.procs('counter', m) // พร v2: on-counter cards (spears)
    if (this.st.counterRage > 0) { this.gainRage(this.st.counterRage); this.gainRes(this.st.counterRage) } // talent: เหล็กกล้า (Rage or Mana)
    if (this.st.counterShield > 0) this.addShield(this.st.maxHp * this.st.counterShield, true)
    this.counterJuice()
    const magic = this.job.attack === 'magic' || this.st.holyCounter > 0 // tree: "ศรัทธาสวน"
    const hit = () => this.withSrc('counter', () => {
      this.forceCrit = this.st.j2CounterCrit > 0 && !magic // Knight ★ Counter Attack
      this.strike(m, BATTLE.counterMul, magic, magic ? '#c9a8ff' : undefined)
      this.forceCrit = false
      if (this.st.j2Hindsight > 0) this.sageSpell(m) // Sage ★ Hindsight
      if (this.st.ctrAoe > 0) for (const o of this.alive()) if (o !== m) this.strike(o, 0.5, magic) // tree: "สวนพายุ"
    })
    if (this.job.attack !== 'melee') { await this.shoot(m, magic ? 0x9f7bff : 0xf6eedc, hit); return }
    // melee: wind back, dash in with an afterimage, knock the attacker back and chase it a little, then walk home
    const step = BATTLE.stepMs
    await this.tween({ targets: this.heroSpr, x: HERO_X - 18, duration: step * 0.1, ease: 'Quad.easeOut' })
    this.afterimage(0xffd27a)
    sfx.dash()
    await this.tween({ targets: this.heroSpr, x: m.spr.x - 40, duration: step * 0.14, ease: 'Quad.easeIn' })
    this.slashFx(m.spr.x - 10, GROUND - 40)
    sfx.swing()
    hit()
    this.shake(70, 0.005)
    if (!m.dead) this.tweens.add({ targets: [m.spr, m.shadow], x: m.spr.x + 110, duration: step * 0.25, ease: 'Quad.easeOut' })
    await this.tween({ targets: this.heroSpr, x: this.heroSpr.x + 50, duration: step * 0.15, ease: 'Quad.easeOut' })
    await this.tween({ targets: this.heroSpr, x: HERO_X, duration: step * 0.3, ease: 'Quad.easeOut' })
  }

  /** Fire-and-forget melee dash for counters that happen inside a sync hit check (dodge → strike back). */
  private dashStrike(m: Mon) {
    const step = BATTLE.stepMs
    this.time.delayedCall(200, () => { // let the evade sidestep (90 ms yoyo) finish first
      if (m.dead || this.hp <= 0) return
      this.afterimage(0xc9c9d6)
      sfx.dash()
      this.tweens.add({ targets: this.heroSpr, x: m.spr.x - 40, duration: step * 0.14, ease: 'Quad.easeIn', onComplete: () => {
        if (!m.dead) { this.slashFx(m.spr.x - 10, GROUND - 40); sfx.swing(); this.withSrc('counter', () => this.strike(m, BATTLE.counterMul)); this.shake(60, 0.004) }
        this.tweens.add({ targets: this.heroSpr, x: HERO_X, duration: step * 0.3, ease: 'Quad.easeOut' })
      } })
    })
  }

  /** Fading copy of the hero (dash / evade trail). */
  private afterimage(tint: number, dx = 0) {
    const g = this.add.image(this.heroSpr.x, this.heroSpr.y, this.heroSpr.texture.key).setOrigin(0.5, 1).setScale(this.heroSpr.scaleX, this.heroSpr.scaleY)
      .setFlipX(this.heroSpr.flipX).setTintFill(tint).setAlpha(0.55).setDepth(this.heroSpr.depth - 1)
    this.tweens.add({ targets: g, x: g.x + dx, alpha: 0, duration: 260, onComplete: () => g.destroy() })
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
    const home = m.spr.x
    await this.slamMotion(m)
    if (this.riposte(m)) { await this.wait(300); if (!m.dead) await this.tween({ targets: [m.spr, m.shadow], x: home, duration: 260 }); m.spr.setAngle(0); return }
    const hit = this.hurtHero(((m.def.slamMagic ? this.monMatk(m) + (m.def.venom ? m.def.venom.dex * this.matkScale(m) : 0) : m.def.dmg) + 8) * BATTLE.monDmgMul * (m.def.slamMul ?? 1.6) * skillMul(m.def, slamScaleOf(m.def)) * this.monMul(m), !!m.def.slamMagic, 999, m) // slam can't be fled, only lucky-dodged / shielded
    if (m.stored > 0) await this.soulStrike(m)
    if (hit) {
      this.monLeech(m, m.def.mini === 'hunter' || m.def.mini === 'drainer' ? 1 : undefined) // the big drain heals all of it
      if (m.slamFx) this.applyFx(m.slamFx, m)
      if (m.def.venom) this.venomStrike(m)
      await this.tryCounter(m)
      const lost = this.st.poise > 0 ? 0 : BATTLE.slamStun * (1 - this.st.tenacity) // v78 🧘 Poise: no slam stun
      this.heroGauge = Math.max(-100, this.heroGauge - lost)
      if (lost >= 10) this.floatText(HERO_X, GROUND - 120, 'มึน!', '#f2b84b')
    }
    if (!m.dead && Math.abs(m.spr.x - home) > 4) await this.tween({ targets: [m.spr, m.shadow], x: home, duration: 260, ease: 'Quad.easeOut' })
    m.spr.setAngle(0)
    await this.wait(300)
  }

  /** The charged attack's look, per boss (MonsterDef.slamAnim). Ends where the hit lands; slam() walks it home after. */
  private async slamMotion(m: Mon) {
    const c = m.def.slamColor ?? COLORS.telegraph
    const sx = m.spr.scaleX, sy = m.spr.scaleY
    switch (m.def.slamAnim ?? 'stomp') {
      case 'pounce': { // crouch, leap in an arc onto the hero, claws
        await this.tween({ targets: m.spr, scaleY: sy * 0.8, scaleX: sx * 1.1, duration: 140, yoyo: true })
        this.tweens.add({ targets: [m.spr, m.shadow], x: HERO_X + 70, duration: 320, ease: 'Sine.easeIn' })
        await this.tween({ targets: m.spr, y: GROUND - 110, duration: 160, ease: 'Quad.easeOut' })
        await this.tween({ targets: m.spr, y: GROUND, duration: 160, ease: 'Quad.easeIn' })
        this.slashFx(HERO_X + 10, GROUND - 50); this.slashFx(HERO_X - 10, GROUND - 70)
        this.burst(HERO_X, GROUND - 50, c, 16, 220)
        this.shake(200, 0.012); sfx.swing()
        break
      }
      case 'cleave': { // march in, raise the blade, one huge sweep
        await this.tween({ targets: [m.spr, m.shadow], x: HERO_X + 90, duration: 280, ease: 'Quad.easeIn' })
        await this.tween({ targets: m.spr, angle: 18, duration: 220, ease: 'Back.easeIn' })
        await this.tween({ targets: m.spr, angle: -28, duration: 90, ease: 'Quad.easeOut' })
        const s = this.add.image(HERO_X + 10, GROUND - 60, 'slash').setDepth(9000).setScale(1.4).setTint(c)
        this.tweens.add({ targets: s, scale: 2, alpha: 0, duration: 260, onComplete: () => s.destroy() })
        this.burst(HERO_X, GROUND - 50, c, 18, 260)
        this.shake(260, 0.016); sfx.slam()
        break
      }
      case 'shot': { // recoil and fire one big projectile
        this.tweens.add({ targets: m.spr, x: m.spr.x + 24, duration: 90, yoyo: true })
        const b = this.add.image(m.spr.x - 30, m.spr.y - m.spr.displayHeight * 0.5, 'dot').setTint(c).setScale(4.5, 3).setDepth(9000)
        sfx.swing()
        await this.tween({ targets: b, x: HERO_X + 10, y: GROUND - 50, duration: 260, ease: 'Quad.easeIn' })
        b.destroy()
        this.burst(HERO_X, GROUND - 50, c, 26, 320)
        this.cameras.main.flash(90, 255, 200, 140)
        this.shake(260, 0.016); sfx.slam()
        break
      }
      case 'cast': { // rise, glow, and loose a spell orb (Mirage's Soul Strike bolts follow on their own)
        await this.tween({ targets: [m.spr], y: GROUND - 30, duration: 220, ease: 'Sine.easeOut' })
        m.spr.setTint(c)
        this.burst(m.spr.x, m.spr.y - m.spr.displayHeight * 0.6, c, 14, 120, true)
        await this.wait(160)
        const o = this.add.image(m.spr.x - 20, m.spr.y - m.spr.displayHeight * 0.6, 'dot').setTint(c).setScale(3.5).setDepth(9000)
        this.tweens.add({ targets: o, angle: 360, duration: 300 })
        await this.tween({ targets: o, x: HERO_X, y: GROUND - 50, scale: 5, duration: 300, ease: 'Quad.easeIn' })
        o.destroy()
        m.spr.clearTint()
        this.burst(HERO_X, GROUND - 50, c, 22, 260, true)
        this.cameras.main.flash(110, 200, 160, 255)
        this.tweens.add({ targets: m.spr, y: GROUND, duration: 200 })
        this.shake(220, 0.012); sfx.slam()
        break
      }
      case 'bite': { // lunge with three snapping bites
        await this.tween({ targets: [m.spr, m.shadow], x: HERO_X + 110, duration: 240, ease: 'Quad.easeIn' })
        for (let i = 0; i < 3; i++) {
          await this.tween({ targets: m.spr, x: HERO_X + 70, angle: -10, duration: 70, yoyo: true })
          this.burst(HERO_X + 10, GROUND - 40 - i * 18, c, 8, 160)
          sfx.hit(); this.shake(90, 0.008)
        }
        break
      }
      default: { // stomp: big jump and a ground slam
        await this.tween({ targets: m.spr, y: m.spr.y - 120, duration: 220, ease: 'Quad.easeOut' })
        await this.tween({ targets: m.spr, y: GROUND, duration: 150, ease: 'Quad.easeIn' })
        this.shake(300, 0.02)
        this.burst(m.spr.x, GROUND, c, 24, 320)
        sfx.slam()
      }
    }
  }

  /** Mirage Soul Strike (Q 2026-11-03, RO style): the damage it stored fires back as magic bolts.
   *  Telegraphed by the charge; each bolt can't be fled but lucky dodge, dodge charges, shields and M.DEF work. */
  private async soulStrike(m: Mon) {
    const total = Math.min(m.stored, this.st.maxHp * BATTLE.soulCap) * (this.relic === 'thornaura' ? 1 - RELIC_RULES.thornaura.reflectCut : 1)
    m.stored = 0; this.dotIcon(m)
    if (m.dead || this.hp <= 0 || total <= 0) return
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, `🔮 โซลสไตรค์ ${Math.round(total)}!`, '#c9a8ff')
    for (let i = 0; i < BATTLE.soulBolts && this.hp > 0; i++) {
      const b = this.add.image(m.spr.x - 20, m.spr.y - 60 - i * 8, 'dot').setTint(0xc9a8ff).setScale(1.8).setDepth(9000)
      await this.tween({ targets: b, x: HERO_X, y: GROUND - 50, duration: 110 })
      b.destroy()
      this.hurtHero(total / BATTLE.soulBolts, true, 999, m)
    }
  }

  /** Returns false when the hit was dodged. */
  /** Order (stat spec v1): lucky dodge -> hit/flee -> DEF. Returns false when the hit didn't land. */
  private hurtHero(dmg: number, magic: boolean, monHit: number, src?: Mon): boolean {
    this.lastHurt = 0
    const dodged = (label: string, color: string) => {
      this.evadeJuice(label, color)
      if (src && !src.dead && src.def.trueSight && !(src.trueTurns ?? 0) && (src.evaded = (src.evaded ?? 0) + 1) >= src.def.trueSight.after) { // anti-AGI: it reads the hero's footwork
        src.evaded = 0; src.trueTurns = src.def.trueSight.turns + 1; this.dotIcon(src)
        this.time.delayedCall(350, () => this.callout(`🎯 ${src.def.name}: ตาเหยี่ยว! ตีโดนแน่นอน ${src.def.trueSight!.turns} เทิร์น`, W / 2, 205))
      }
      if (this.st.dodgeStrike > 0 && src && !src.dead) { // tree ★: strike back from the shadows (melee dashes in after the sidestep)
        this.floatText(HERO_X + 40, GROUND - 130, 'สวนจากเงา!', '#c9c9d6'); this.counterCount++
        if (this.job.attack === 'melee') this.dashStrike(src)
        else this.withSrc('counter', () => this.strike(src, BATTLE.counterMul, this.job.attack === 'magic'))
      }
      if (this.st.dodgeHeal > 0) this.heal(this.st.maxHp * this.st.dodgeHeal) // gear: dodging heals a little (Thief)
      if (this.st.arDodgeShield > 0 && this.shield < this.st.maxHp * this.st.arDodgeShield * 3) this.addShield(Math.min(this.st.maxHp * this.st.arDodgeShield, this.st.maxHp * this.st.arDodgeShield * 3 - this.shield)) // archer tree โล่ลม
      if (this.st.arDodgeRes > 0 && this.job.resource === 'energy') this.res = Math.min(this.resMax(), this.res + this.st.arDodgeRes) // archer ★ ยิงถอย
      if (this.st.dodgeEnergy > 0 && this.job.resource === 'energy') this.res = Math.min(this.resMax(), this.res + this.st.dodgeEnergy) // Thief talent: ขโมยจังหวะ
      return false
    }
    if (this.dodgeCharges > 0) { this.dodgeCharges--; return dodged('เงาพริ้ว!', '#c9c9d6') }
    if (src && this.allies.length && this.allyTaunt(dmg)) return false // Ally taunt (Monk Tempest Bell) takes the attack
    if (src && src.blind > 0) monHit *= 1 - KIT2.crusader.blindHit // Crusader Holy Cross 🙈
    const sure =this.hx.web > 0 || (!magic && (src?.trueTurns ?? 0) > 0) // 🕸️ webbed: Can't Evade · 🎯 ตาเหยี่ยว: physical hits skip Flee + lucky dodge
    if (!sure && Math.random() < this.st.luckyDodge) return dodged('LUCKY!', '#6fd08c')
    if (!sure && Math.random() > hitChance(monHit, this.st.flee, 0.8 - this.st.fleeFloor)) return dodged('EVADE!', '#9fe3ff') // Thief เงาบาง lowers the floor
    if (!magic && this.st.j2Guard > 0 && Math.random() < this.st.j2Guard * (this.hasShield ? 1 : KIT2.knight.guardShieldless)) { this.floatText(HERO_X, GROUND - 120, '🛡️ BLOCK!', '#9fe3ff'); sfx.hit(); this.onBlock(); return false } // Knight / Crusader Auto Guard
    if (magic && this.j2?.id === 'sage') { // 🛡️ Sage Magic Rod
      if (this.st.j2RodBlock > 0 && !this.rodUsed) { this.rodUsed = true; this.gainRes(KIT2.sage.rodBlockMana); this.floatText(HERO_X, GROUND - 120, '🪄 Magic Rod! ดูดเวท', '#c9a8ff'); return false }
      if (this.st.j2MagicRod > 0) this.gainRes(this.st.j2MagicRod)
    }
    const ab = this.hx.armorBreak > 0 ? BATTLE.armorBreakMul : 1 // เกราะแตก: P.DEF / M.DEF count half
    const raw = magic ? dmg * (1 - this.st.mdef * ab) : afterDef(dmg, this.st.def * ab)
    let n = Math.max(1, Math.ceil(raw * (1 - this.st.guard) * (this.buf.guard > 0 ? 1 - S2N.guardCut(this.st.s2Lv) : 1) * this.takenMul())) // Skill 2 ตั้งการ์ด · พร v2
    if (src && this.st.j2Provoke > 0 && src.hp < src.def.hp * KIT2.knight.tree.provokeAt) n = Math.max(1, Math.ceil(n * (1 - this.st.j2Provoke))) // v84 Knight ข่มขวัญ
    if (this.mirror && src && !src.dead) { // Innovator 🪞 กระจก: the hit bounces back, capped like every reflect (BATTLE.reflectCap)
      this.mirror = false; this.floatText(HERO_X, GROUND - 120, '🪞 สะท้อน!', '#c9e0ff')
      this.damageMon(src, Math.max(1, Math.round(Math.min(n * KIT2.innovator.mirrorCap, this.st.maxHp * BATTLE.reflectCap))), false, '#c9e0ff', true)
      return false
    }
    this.lastHurt = n; this.j2Hurt = true
    if (this.st.clManaGuard > 0 && this.job.resource === 'mana') this.gainRes(n * this.st.clManaGuard * (1 + this.heroWis * KIT.clericTree.core.wisAmp)) // v86 💠 มานาพิทักษ์ (before shields)
    if (!magic && this.st.j2Reflect > 0 && src && !src.dead) this.damageMon(src, Math.max(1, Math.round(Math.min(n * this.st.j2Reflect, this.st.maxHp * BATTLE.reflectCap))), false, '#c9e0ff', true) // Crusader Reflect Shield
    if (src?.def.vengeance && n > 0 && !src.dead && !src.vengTurns && !src.vengCd) { // death knight โล่แห่งความแค้น
      src.shield += n * BATTLE.vengeance.share; src.vengTurns = BATTLE.vengeance.turns; this.dotIcon(src)
      this.floatText(src.spr.x, src.spr.y - src.spr.displayHeight - 30, `🛡️ โล่แห่งความแค้น +${Math.round(n * BATTLE.vengeance.share)}`, '#c9a8ff')
    }
    if (this.relic === 'thornaura' && src && !src.dead) { this.damageMon(src, Math.max(1, Math.round(n * RELIC_RULES.thornaura.back)), false, '#7fd08c', true); this.floatText(src.spr.x, src.spr.y - src.spr.displayHeight - 30, '🌵 หนาม!', '#7fd08c') }
    this.gainRage(RES_RULES.rageOnHurt + this.st.rageOnHurtAdd) // talent: แค้นฝังใจ
    if (this.st.rageOnHurtAdd > 0) this.gainRes(this.st.rageOnHurtAdd) // same talent on a Mana job: Mana when hit
    if (this.kyrie.hits > 0 && this.kyrie.hp > 0) { // v77 Kyrie Eleison: breaks on its HP or after N hits, whichever first
      const absorbed = Math.min(this.kyrie.hp, n)
      this.kyrie.hp -= absorbed; this.kyrie.hits--; n -= absorbed
      this.floatText(HERO_X, GROUND - 110, `🛡️ -${absorbed}`, '#9fe3ff')
      if (this.kyrie.hp <= 0 || this.kyrie.hits <= 0) { this.kyrie = { hp: 0, hits: 0 }; this.floatText(HERO_X, GROUND - 140, '🛡️ Kyrie แตก', '#c9c9d6') }
      if (n <= 0) return true
    }
    if (this.shield > 0) {
      const absorbed = Math.min(Math.ceil(this.shield), n)
      this.shield = Math.max(0, this.shield - absorbed); n -= absorbed
      this.floatText(HERO_X, GROUND - 110, `🛡️ -${absorbed}`, '#9fe3ff')
      if (this.shield <= 0 && this.st.barrierBoom > 0) { // mage talent บาเรียระเบิด
        this.callout('💥 บาเรียระเบิด!', HERO_X + 120, GROUND - 160)
        for (const m of this.alive()) { this.strike(m, this.st.barrierBoom, true, '#c9a8ff'); if (this.st.barrierBoom >= 1.6) m.gauge -= 20 }
      }
      if (this.st.thorns > 0 && src && !src.dead) this.damageMon(src, Math.max(1, Math.round(absorbed * this.st.thorns)), false, '#9fe3ff', true) // tree: "โล่หนาม"
      if (n <= 0) return true
    }
    if (this.buf.mshield > 0 && this.job.resource === 'mana' && this.res > 0) { // Skill 2 Mana Shield (active, v27)
      const paid = Math.min(Math.floor(this.res), Math.ceil(n * S2N.mshieldTake(this.st.s2Lv)))
      this.res -= paid; n -= paid
      if (paid > 0) this.floatText(HERO_X, GROUND - 110, `🔷 -${paid}`, '#5aa0ff')
      if (n <= 0) return true
    }
    if (this.st.j2Martyr > 0 && !this.martyrUsed && this.hp - n <= 0 && this.hp > 1) { // Crusader ★ ผู้พลีชีพ
      this.martyrUsed = true; n = this.hp - 1
      this.addShield(this.st.maxHp * KIT2.crusader.martyrShield, true)
      this.callout('🕊️ ผู้พลีชีพ! ยังไม่ล้ม', HERO_X + 120, GROUND - 150)
    }
    this.castBreak(n) // v78: only a hit that got past every shield (v85: and big enough)
    this.hp = Math.max(this.hpFloor, this.hp - n)
    if (this.flow > 0 && n >= this.st.maxHp * KIT.swordTree.flowBreak) { this.flow = 0; this.floatText(HERO_X, GROUND - 165, '💢 เสียจังหวะ', '#c9c9d6') } // v84 ไหลลื่น
    if (this.hp > 0) this.lowHpCheck()
    if (this.st.mgEmergency > 0 && !this.emergencyUsed && this.hp > 0 && this.hp < this.st.maxHp * 0.3) { // mage talent มานาฉุกเฉิน
      this.emergencyUsed = true; this.res = this.resMax()
      if (this.st.mgEmergency >= 2) this.addShield(this.st.matk * 2, true)
      this.callout('🔷 มานาฉุกเฉิน!', HERO_X + 120, GROUND - 150)
    }
    this.minHpPct = Math.min(this.minHpPct, this.hp / this.st.maxHp)
    this.damageNumber(HERO_X, GROUND - 70, n, false, '#ff7a7a')
    if (this.holyRevive()) return true // v84 Priest ★ คืนชีพ (before the Phoenix feather)
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
    n *= this.run.mut.healMul * this.aff.healMul // daily mutator แผลเรื้อรัง · tower affix แผลลึก
    const want = Math.ceil(this.hp + n * (1 + this.st.healAmp))
    if (this.st.j2NoLight > 0 && want > this.st.maxHp) { const cap = Math.ceil(this.st.maxHp * KIT2.monk.darkCap); if (this.shield < cap) this.shield = Math.min(cap, this.shield + (want - this.st.maxHp) * KIT2.monk.noLightMul) } // Monk ★ ไร้แสง
    else if (this.st.overhealShield > 0 && want > this.st.maxHp) this.shield = Math.min(Math.ceil(this.st.maxHp * 0.5), this.shield + want - this.st.maxHp) // tree: "ไฟชำระ" (cap 50% max HP)
    else if (this.pk.overheal > 0 && want > this.st.maxHp) { const cap = Math.ceil(this.st.maxHp * this.pk.overheal); if (this.shield < cap) this.shield = Math.min(cap, this.shield + want - this.st.maxHp) } // legend ฮีลล้นเป็นโล่
    this.hp = Math.min(this.st.maxHp, want)
    if (want > this.st.maxHp && this.hp > 0) this.overFaith(want - this.st.maxHp) // v84 ล้นศรัทธา / ★ แสงล้นฟ้า
    if (this.relic === 'bloodpact' && want > this.st.maxHp) { // Blood Pact: overheal becomes shield (capped)
      const cap = Math.round(this.st.maxHp * RELIC_RULES.bloodpact.shieldCap)
      this.shield = Math.max(this.shield, Math.min(cap, this.shield + want - this.st.maxHp))
    }
    if (this.hp > before && !quiet) this.damageNumber(HERO_X, GROUND - 70, this.hp - before, false, '#6fd08c', true)
  }

  private dotIcon(m: Mon) {
    if (m.dead || !m.spr.active) return // a DoT tick or card can land after the kill: its icon text is already gone (page error 'drawImage' of null)
    if (!m.dotTxt) m.dotTxt = this.add.text(0, 0, '', { fontSize: '14px' }).setOrigin(0.5).setDepth(9500)
    m.dotTxt.setText(`${m.burnTurns > 0 ? '🔥' : ''}${m.burnStacks > 0 ? '🔥' + m.burnStacks : ''}${m.hell > 0 ? '♨️' + m.hell : ''}${m.poison > 0 ? '☠️' + m.poison : ''}${m.chill > 0 ? '❄️' : ''}${m.ice > 0 ? '🧊' + m.ice : ''}${m.shield > 0 ? '🛡️' : ''}${m.atkUpTurns > 0 ? '💢' : ''}${m.weakTurns > 0 ? '😰' : ''}${m.armorBrk > 0 ? '🦴' : ''}${m.blind > 0 ? '🙈' : ''}${m.wet > 0 ? '💧' : ''}${(m.trueTurns ?? 0) > 0 ? '🎯' : ''}${m.huntMark > 0 ? '🏷️' : ''}${m.reflect > 0 ? '🪞' : ''}${m.stored > 0 ? '🔮' + Math.round(m.stored) : ''}`)
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

  private applyMod(mod: Partial<Stats>) {
    for (const k of Object.keys(mod) as (keyof Stats)[]) {
      const v = mod[k]!
      if (k === 'maxHp') { this.st.maxHp += v; this.hp += v; continue }
      if (k === 'fireEvery') { this.st.fireEvery = this.st.fireEvery === 0 ? Math.max(1, v) : Math.max(1, this.st.fireEvery + v); continue }
      this.st[k] += v
      if (k === 'crit') this.st.spellCrit += v // card/relic crit also counts for magic (Q rule)
      if (k === 'lifesteal') this.st.lifesteal = Math.min(0.4, this.st.lifesteal) // Q: lifesteal cap 40%
    }
    this.st.smashCost = Math.max(6, this.st.smashCost)
  }

  /** พร v2 level-up pick (design/skills-v2.md §1.4): 3 cards from every line (owned + not yet maxed ones come back as "+"),
   *  each slot may roll 🟠 legendary (only for lines the hero already has), then 1 ⭐ general card. `forceLegend` (events) tries legendary in every slot. */
  private offerPerks(forceLegend = false) {
    return new Promise<void>((done) => {
      const lv = (id: string) => this.perkLv(id)
      // Mage: the run's element bans a line (⚡ → no 🔥, 🔥 → no ⚡; ❄️ keeps both). Mage's magic basic can't use on-hit poison / lifesteal.
      const banned: Line[] = this.runElement === 'lightning' ? ['fire'] : this.runElement === 'fire' ? ['storm'] : []
      const ok = (p: PerkDef) => lv(p.id) < p.max && !banned.includes(p.line) && !(this.job.id === 'mage' && MAGE_SKIP.has(p.id)) && !(p.needsRes && !this.job.resource)
      const lines = new Set(this.perks.filter((o) => o.def.rarity === 'common' && o.def.line !== 'common').map((o) => o.def.line))
      const commons = PERKS_V2.filter((p) => p.rarity === 'common' && ok(p))
      const legends = PERKS_V2.filter((p) => p.rarity === 'legend' && ok(p) && lines.has(p.line))
      const generals = GENERAL_PERKS.filter(ok)
      const offers: PerkDef[] = []
      const take = (list: PerkDef[]) => { const left = list.filter((p) => !offers.includes(p)); if (left.length) { offers.push(left[Phaser.Math.Between(0, left.length - 1)]); return true } return false }
      const want = (id: string) => { const p = PERKS_V2.find((x) => x.id === id); if (p && ok(p) && !offers.includes(p) && (p.rarity === 'common' || lines.has(p.line))) offers.push(p) }
      for (const id of this.testPerk ?? []) if (!offers.length && !lv(id)) want(id) // bot hook: a card not owned yet first, so a list covers every card
      for (const id of this.testPerk ?? []) if (!offers.length) want(id) // ... then "+" levels
      if (this.firstOffer && this.st.mgFirstCard > 0) want(this.st.mgFirstCard === 1 ? 'stm_roar' : 'fir_ball') // mage talent row 1
      this.firstOffer = false
      const own = JOB_LINES[this.job.id] ?? []
      let lean = lines.size > 0 && Math.random() < OFFER_RULES.lean // one slot leans to a line already owned so builds still grow
      while (offers.length < 3) {
        if ((forceLegend || this.flags.allLegend || Math.random() < this.st.legendChance) && take(legends)) continue
        if (lean) { lean = false; if (take(commons.filter((p) => lines.has(p.line)))) continue }
        if (Math.random() < OFFER_RULES.ownLine && take(commons.filter((p) => own.includes(p.line)))) continue // own lines weigh more; other lines still show up (🌀)
        if (!take(commons) && !take(legends) && !take(generals)) break
      }
      while (offers.length < 4 && take(generals)) { /* always ends with a general card */ }
      if (!offers.length) { done(); return }
      this.time.paused = true
      const c = this.add.container(0, 0).setDepth(30000)
      c.add(this.add.rectangle(W / 2, H / 2, W, H, COLORS.night, 0.8).setInteractive())
      c.add(this.add.text(W / 2, 44, `เลเวล ${this.level}! เลือกพร 1 อย่าง`, { fontFamily: FONT_UI, fontSize: '28px', fontStyle: 'bold', color: '#f2b84b' }).setOrigin(0.5))
      const cw = 680, ch = 104, gap = 10 // v48: one column of 4 rows
      const y0 = H / 2 + 26 - ((offers.length - 1) * (ch + gap)) / 2
      const keys: string[] = []
      const pick = (p: PerkDef) => {
        if (!c.active) return
        keys.forEach((k) => this.input.keyboard!.removeAllListeners(k))
        this.pendingPick = undefined
        this.pendingOffers = undefined
        c.destroy()
        this.time.paused = false
        this.takePerk(p)
        done()
      }
      offers.forEach((p, i) => {
        const line = LINES[p.line], have = lv(p.id), up = have > 0 && p.max === 2, leg = p.rarity === 'legend', gen = p.line === 'common'
        const alien = !gen && !own.includes(p.line)
        const card = this.add.container(W / 2, y0 + i * (ch + gap))
        const bg = this.add.rectangle(0, 0, cw, ch, leg ? 0xffe08a : up ? 0xe2f4dc : alien ? 0xe6e0f4 : 0xf4e6c8).setStrokeStyle(leg ? 6 : 4, leg ? 0xff8c42 : Phaser.Display.Color.HexStringToColor(line.color).color)
        const icon = this.add.text(-cw / 2 + 52, 0, p.icon, { fontSize: '40px' }).setOrigin(0.5)
        const name = this.add.text(-cw / 2 + 100, -ch / 2 + 12, `${p.name}${up ? '+' : ''}`, { fontFamily: FONT_UI, fontSize: '22px', fontStyle: 'bold', color: leg ? '#a8420f' : '#2b2238' })
        const desc = this.add.text(-cw / 2 + 100, -ch / 2 + 44, perkDesc(p.desc[up ? 1 : 0] || p.desc[0], this.job.ult), { fontFamily: FONT_UI, fontSize: '15px', color: '#4a3f5c', wordWrap: { width: cw - 120 }, lineSpacing: 2 })
        const tag = gen ? 'พรทั่วไป · เลือกซ้ำได้' : `${leg ? '🟠 ตำนาน · ' : alien ? '🌀 พรต่างสาย · ' : ''}${line.icon} สาย${line.name}${up ? ' · ขั้น + (อัปจากที่มี)' : p.max === 2 ? ' · เลือกซ้ำ = +' : ''}`
        const foot = this.add.text(cw / 2 - 14, -ch / 2 + 14, tag, { fontFamily: FONT_UI, fontSize: '14px', color: leg ? '#ff8c42' : line.color, fontStyle: 'bold', stroke: '#2b2238', strokeThickness: 2 }).setOrigin(1, 0)
        const key = this.add.text(-cw / 2 + 10, -ch / 2 + 6, `${i + 1}`, { fontFamily: FONT_NUM, fontSize: '16px', color: '#8d7244' })
        card.add([bg, icon, name, desc, foot, key]).setSize(cw, ch).setInteractive({ useHandCursor: true })
        card.on('pointerover', () => card.setScale(1.02))
        card.on('pointerout', () => card.setScale(1))
        card.on('pointerup', () => pick(p))
        c.add(card)
        const k = `keydown-${['ONE', 'TWO', 'THREE', 'FOUR'][i]}`
        keys.push(k)
        this.input.keyboard!.once(k, () => pick(p))
      })
      this.pendingPick = (i) => pick(offers[Math.min(i, offers.length - 1)])
      this.pendingOffers = offers.map((p) => ({ id: p.id, legend: p.rarity === 'legend', up: lv(p.id) > 0, own: own.includes(p.line), general: p.line === 'common' }))
    })
  }

  /** Own a card, or take it to "+": apply its stat / run-stat delta for that level. */
  private takePerk(p: PerkDef) {
    let o = this.perks.find((x) => x.def.id === p.id)
    if (o) o.lv++
    else { o = { def: p, lv: 1 }; this.perks.push(o) }
    const repeat = p.max > 2
    this.applyMod(levelDelta(p.mod, o.lv, repeat))
    const d = levelDelta(p.pk, o.lv, repeat)
    for (const k of Object.keys(d) as (keyof PerkStats)[]) this.pk[k] += d[k] ?? 0
    if (p.mastery) {
      const i = Math.min(o.lv, 2) - 1, ms = this.masteries.find((x) => x.id === p.id)
      if (ms) { ms.amp = p.mastery.amp[i]; ms.cut = p.mastery.cut[i] } else this.masteries.push({ id: p.id, src: p.mastery.src, amp: p.mastery.amp[i], cut: p.mastery.cut[i] })
    }
    this.callout(`${p.rarity === 'legend' ? '🟠 ' : ''}${p.icon} ${p.name}${o.lv >= 2 && p.max === 2 ? '+' : ''}`, HERO_X, GROUND - 140)
    if (p.rarity === 'legend') sfx.door()
  }

  // ---------- พร v2: Trigger x Effect (data/perks.ts) ----------
  private pk: PerkStats = newPerkStats()
  private masteries: { id: string; src: Src; amp: number; cut: number }[] = []
  /** Damage source tag of whatever the hero is doing right now (basic / combo / counter / skill / ult / zap / fire ...). */
  private src: Src = 'other'
  private immortal: ImmortalId | null = null
  private eggN = 0
  private eggDef = 0
  private lowHpDone = false
  private demonOn = false
  private demonDone = false
  private comboAtkN = 0
  private fightUlts = 0
  private ultOpen = 1
  private lowRegen = { turns: 0, amt: 0 }
  private procDepth = 0
  /** Bot hook (PERK=id,id): the first of these cards still open goes into slot 1 of every level-up offer. */
  testPerk?: string[]
  /** Bot / debug: how many times each card's trigger fired this run. */
  procHits: Record<string, number> = {}
  /** Bot / debug: card ids with level, e.g. "stm_roar+ grd_open". */
  perkList() { return this.perks.map((o) => `${o.def.id}${o.lv >= 2 && o.def.max === 2 ? '+' : o.lv > 1 ? `x${o.lv}` : ''}`).join(' ') }

  private withSrc<T>(src: Src, fn: () => T): T { const p = this.src; this.src = src; try { return fn() } finally { this.src = p } }
  private perkLv(id: string) { return this.perks.find((o) => o.def.id === id)?.lv ?? 0 }
  /** Monster combo defence by tier (COMBO), harder in hard mode / tower. */
  private monCombo(m: Mon) {
    const t = m.def.mini ? 'mini' : m.def.ai === 'boss' ? 'boss' : 'normal', add = this.hard || this.run.endless ? COMBO.hardAdd : 0
    const a = t === 'normal' ? 0 : add
    const sd = m.def.statDef // D6+ stat monsters: AGI / DEX / VIT like the hero (x/(x+400))
    return { ignore: COMBO.ignore[t] + a + (sd?.ignoreCombo ?? 0), basicDR: COMBO.basicDR[t], comboDR: COMBO.comboDR[t] + a + (sd?.comboDR ?? 0), ignoreCounter: COMBO.ignoreCounter[t] + a + (sd?.ignoreCounter ?? 0), counterDR: COMBO.counterDR[t] + a + (sd?.counterDR ?? 0) }
  }
  private comboChance() { return (this.st.combo + (this.relic === 'wolf' ? RELIC_RULES.wolf.combo : 0)) * (this.relic === 'wizard' ? RELIC_RULES.wizard.chanceMul : 1) }
  /** พร v2 number in a run: card + gear lines / monster cards, capped (perks.ts OUTSIDE_CAP). */
  private px(k: OutsideKey) { return Math.min(OUTSIDE_CAP[k], this.pk[k] + this.st[k]) }
  private counterChance() { return this.st.counter * (this.relic === 'wizard' ? RELIC_RULES.wizard.chanceMul : 1) }

  /** Damage multiplier by source tag: masteries, style-switch mythics, card mods, glass, demon form, open-strong ult. */
  private srcMul(m: Mon, dot: boolean) {
    const src = this.src, rel = this.relic
    let k = 1
    for (const ms of this.masteries) k *= ms.src === src ? 1 + ms.amp : 1 - ms.cut
    const basic = src === 'basic' || src === 'combo', skill = src === 'skill' || src === 'ult'
    if (basic) { const d = this.monCombo(m), c = src === 'combo'; k *= Math.max(COMBO.dmgFloor, 1 + this.px('basicDmg') + (c ? this.st.comboDmg : 0) - d.basicDR - (c ? d.comboDR : 0)) } // Capybara-style additive bracket
    if (src === 'counter') { const d = this.monCombo(m); k *= Math.max(COMBO.dmgFloor, 1 + this.px('basicDmg') + this.px('counterDmg') - d.basicDR - d.counterDR) } // same bracket as combo
    if (rel === 'wolf') k *= src === 'combo' || src === 'counter' ? 1 + RELIC_RULES.wolf.comboCounter : skill ? 1 - RELIC_RULES.wolf.skillCut : 1
    if (rel === 'wizard' && skill) k *= 1 + RELIC_RULES.wizard.skill
    if (rel === 'queen') k *= ELEM_SRC.has(src) ? 1 + RELIC_RULES.queen.elem : basic ? 1 - RELIC_RULES.queen.basicCut : 1
    if (!dot && this.px('vsBurn') > 0 && (m.burnStackTurns > 0 || m.burnTurns > 0 || m.hell > 0)) k *= 1 + this.px('vsBurn')
    if (!dot && m.poison > 0) k *= 1 + this.px('vsPoison')
    if (rel === 'glass' && this.hp < this.st.maxHp * RELIC_RULES.glass.below) k *= 1 + RELIC_RULES.glass.dmg
    if (this.demonOn) k *= 1 + IMMORTAL_RULES.demonDmg
    if (src === 'ult') k *= this.ultOpen
    return k
  }
  /** Hero damage-taken multiplier from cards / mythics. */
  private takenMul() {
    const G = RELIC_RULES.glass
    return (1 - Math.min(this.pk.hardenCap, this.pk.harden * this.fightTurns)) * (this.relic === 'glass' && this.hp < this.st.maxHp * G.below ? 1 + G.taken : 1) * (this.rampage > 0 ? 1 + KIT2.berserker.ultTaken : 1) * (this.j2?.id === 'wizard' && this.casts.length ? 1 + KIT2.wizard.castTaken : 1) * (this.wardTurns > 0 ? 1 - this.st.clUltWard : 1) // v84 ม่านพร
  }
  /** First drop under 30% HP this fight (lowHp cards), and 🌈 เงาปีศาจ under 50%. */
  private lowHpCheck() {
    if (!this.lowHpDone && this.hp < this.st.maxHp * PROC_RULES.lowHpAt) { this.lowHpDone = true; this.procs('lowHp') }
    if (this.st.clEmergency > 0 && !this.clEmerUsed && this.hp < this.st.maxHp * KIT.clericTree.emergencyAt) { // v84 Priest ฉุกเฉิน (1 per wave)
      this.clEmerUsed = true; this.heal(this.st.maxHp * this.st.clEmergency)
      this.callout('🚑 ฮีลฉุกเฉิน!', HERO_X + 120, GROUND - 150, '#6fd08c')
    }
    if (this.immortal === 'demon' && !this.demonDone && this.hp < this.st.maxHp * IMMORTAL_RULES.demonAt) {
      this.demonDone = true; this.demonOn = true
      this.callout('😈 ร่างปีศาจ! ดาเมจ +50%', HERO_X + 120, GROUND - 160, '#ff6b9a')
      this.burst(HERO_X, GROUND - 40, 0x9a2a5a, 20, 200)
    }
  }

  /** Fire every owned card whose trigger is `on` (sync, so hit / kill / counter hooks can call it). Returns how many fired. */
  private procs(on: Trigger, target?: Mon): number {
    if (this.hp <= 0 || this.procDepth > 1 || !this.perks.length) return 0
    let fired = 0
    this.procDepth++
    try {
      for (const o of this.perks) {
        const p = o.def.proc
        if (!p) continue
        const i = Math.min(o.lv, 2) - 1
        if ((o.lv >= 2 && p.on2 ? p.on2 : p.on) !== on) continue
        if (on === 'every2' && this.fightTurns % 2) continue
        if (on === 'hits' && (!p.every || this.hits % p.every[i] !== 0)) continue
        if (p.chance && Math.random() >= p.chance[i]) continue
        if (this.runFx(o.def, p, i, target)) { fired++; this.procHits[o.def.id] = (this.procHits[o.def.id] ?? 0) + 1 }
      }
    } finally { this.procDepth-- }
    return fired
  }

  /** Mana a Mage pays for a magic card effect (spec default: Mage still pays for card spells). */
  private procCost(fx: Effect, n: number) {
    if (this.job.id !== 'mage') return 0
    const R = PROC_RULES
    return fx === 'zap' ? R.mageZap * n : fx === 'fireball' || fx === 'firewave' || fx === 'icewave' ? R.mageFire * n : fx === 'icespike' ? R.mageIce * n : 0
  }

  private runFx(def: PerkDef, p: Proc, i: number, target?: Mon): boolean {
    const n = (p.count?.[i] ?? 1) + (def.id === 'stm_roar' ? this.st.boltHits : 0) // mage talent ลูกศิษย์สายฟ้า r2: Bolt +1 hit
    const amt = p.amt?.[i] ?? 0, pow = p.pow ?? PROC_POW[p.fx] ?? 1
    const hits = p.fx === 'zap' || p.fx === 'fireball' || p.fx === 'firewave' || p.fx === 'icespike' || p.fx === 'icewave' || p.fx === 'poison'
    if (hits && !this.alive().length) return false
    const cost = this.procCost(p.fx, n)
    if (cost > 0) { if (this.res < cost) return false; this.spendRes(cost) }
    const pickT = () => { if (target && !target.dead) return target; const l = this.alive(); return l.length ? l[Phaser.Math.Between(0, l.length - 1)] : undefined }
    switch (p.fx) {
      case 'zap':
        this.zapTurn.clear()
        for (let k = 0; k < n; k++) { const l = this.alive(); if (!l.length) break; this.withSrc('zap', () => this.zap(l[Phaser.Math.Between(0, l.length - 1)], pow)) }
        break
      case 'fireball':
        for (let k = 0; k < n; k++) {
          const t = pickT(); if (!t) break
          this.fireballFx(t)
          this.withSrc('fire', () => this.strike(t, pow, true, '#ff8c42'))
          this.addBurn(t, p.burn?.[i] ?? 1)
        }
        break
      case 'firewave':
        for (let k = 0; k < n; k++) {
          this.burst(700, GROUND - 20, 0xff8c42, 18, 260)
          for (const m of this.alive()) { this.withSrc('fire', () => this.strike(m, pow, true, '#ff8c42')); this.addBurn(m, p.burn?.[i] ?? 1) }
        }
        break
      case 'icespike': { const t = pickT(); if (t) this.iceHit(t, pow, false); break }
      case 'icewave':
        this.burst(700, GROUND - 20, 0x9fe3ff, 16, 240)
        for (const m of this.alive()) this.iceHit(m, pow, !!p.freeze2 && i === 1)
        break
      case 'spear': this.spears += n; this.floatText(HERO_X + 30, GROUND - 170, `🔱 +${n}`, '#f6e27a'); break
      case 'poison': for (const m of target && !target.dead ? [target] : this.alive()) this.addPoison(m, n); break
      case 'shield': this.addShield(this.st.maxHp * amt); break
      case 'heal': this.heal(this.st.maxHp * amt); break
      case 'regen': this.lowRegen = { turns: PROC_RULES.regenTurns, amt }; this.floatText(HERO_X, GROUND - 150, `🌱 ฟื้น ${Math.round(amt * 100)}%/เทิร์น`, '#6fd08c'); break
      case 'res': { const left = this.resGain(amt); if (left > 0 && this.pk.wakeShield > 0) this.addShield(this.st.maxHp * this.pk.wakeShield * left); break } // ปลุกพลัง (v78: the share that didn't fit / Novice -> shield)
    }
    return true
  }

  /** ไฟลุก stacks (Mage fire ult system). Fire cards add at least ไฟสามชั้น's count; Hellfire turns them into ♨️ stacks. */
  private addBurn(m: Mon, stacks: number, fireCard = true) {
    if (m.dead || stacks <= 0) return
    const n = fireCard ? Math.max(stacks, this.pk.fireStacks) : stacks
    if (this.relic === 'hellfire') m.hell += n
    else { m.burnStacks = Math.min(this.burnMax(), m.burnStacks + n); m.burnStackTurns = PROC_RULES.burnTurns }
    this.dotIcon(m)
  }
  private addPoison(m: Mon, n: number) {
    if (m.dead || n <= 0) return
    m.poison = Math.min(this.poisonMax(), m.poison + n); m.poisonDmg = Math.max(m.poisonDmg, this.st.poisonDmg); this.dotIcon(m)
  }
  /** Ice spike: chill 2 turns; a chilled normal monster may freeze (10%, หนาวลึก higher); สัมผัสมรณะ may execute one under 30%. */
  private iceHit(m: Mon, pow: number, sureFreeze: boolean) {
    if (m.dead) return
    const wasChill = m.chill > 0, boss = m.def.ai === 'boss'
    if (!boss && this.pk.execute > 0 && m.hp < m.def.hp * 0.3 && Math.random() < this.pk.execute) {
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '☠️ ประหาร!', '#9fe3ff')
      this.withSrc('ice', () => this.damageMon(m, m.hp + m.shield, false, '#9fe3ff'))
      return
    }
    this.withSrc('ice', () => this.strike(m, pow, true, '#9fe3ff'))
    this.burst(m.spr.x, m.spr.y - 30, 0x9fe3ff, 6, 120)
    if (m.dead) return
    if (wasChill && !boss && !m.frozen && (sureFreeze || Math.random() < (this.pk.freeze || PROC_RULES.freezeBase))) {
      m.frozen = true; this.freezeCount++
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 20, 'แช่แข็ง!', '#9fe3ff')
    }
    m.chill = Math.max(m.chill, PROC_RULES.chillTurns + this.st.chillPlus + this.pk.chillExtra)
    if (!m.charging) m.spr.setTint(0x9fe3ff)
    this.dotIcon(m)
  }
  private fireballFx(m: Mon) {
    const b = this.add.image(HERO_X + 20, GROUND - 50, 'dot').setTint(0xff8c42).setScale(2.4).setDepth(9000)
    this.tweens.add({ targets: b, x: m.spr.x, y: m.spr.y - 30, duration: 200, onComplete: () => { b.destroy(); this.burst(m.spr.x, m.spr.y - 30, 0xff8c42, 10, 160) } })
  }

  // ---------- post-wave events v2 (logic: scenes/battle-events.ts, numbers: data/events.ts) ----------
  private async postWaveEvent() {
    await this.walk(500)
    await runPostWaveEvent(this.eventHost())
    await this.wait(500)
    await this.levelUps()
  }

  /** What the event handlers may touch: a narrow view of this scene. */
  private eventHost(): EventHost {
    const self = this
    return {
      tier: this.dg.tier, st: this.st, flags: this.flags,
      stat: (k: BaseStat) => totalBase(save())[k],
      hp: () => this.hp,
      zeny: () => this.zeny,
      nextIsWave: () => { const r = this.roomDef(this.room + 1); return !!r && !r.mini && !r.boss },
      miniPool: () => this.dg.rooms.find((r) => r.mini)?.miniPool ?? MINI_POOL,
      log: (id) => { this.eventLog.push(id) },
      forced: () => this.testEvent,
      choose: (p, o) => this.choose(p, o),
      roll: (label, chance) => this.rollCheck(label, chance),
      reveal: (text, color) => this.reveal(text, color),
      perks: (legend) => this.offerPerks(!!legend),
      immortal: () => this.immortal,
      grantImmortal: (id) => {
        if (this.immortal) return
        this.immortal = id
        if (id === 'demon') { const cut = Math.round(this.st.maxHp * IMMORTAL_RULES.demonHpCost); this.st.maxHp -= cut; this.hp = Math.min(this.hp, this.st.maxHp) }
        if (id === 'egg') this.eggDef = this.st.def
        this.callout(`🌈 พรอมตะ: ${IMMORTALS[id].icon} ${IMMORTALS[id].name}`, W / 2, 190)
        this.cameras.main.flash(260, 255, 220, 255); sfx.win()
      },
      applyMod: (mod) => this.applyMod(mod),
      heal: (share) => { this.heal(this.st.maxHp * share); this.burst(HERO_X, GROUND - 40, 0x6fd08c, 14, 140) },
      hurt: (share) => {
        const n = Math.min(this.hp - 1, Math.round(this.st.maxHp * share))
        if (n <= 0) return
        this.hp -= n; sfx.hurt()
        this.minHpPct = Math.min(this.minHpPct, this.hp / this.st.maxHp)
        this.damageNumber(HERO_X, GROUND - 70, n, false, '#ff7a7a')
      },
      gainZeny: (n) => { if (n > 0) this.coinsFly(HERO_X + 80, GROUND - 40, n) },
      spend: (n) => { this.zeny = Math.max(0, this.zeny - n); sfx.coin() },
      gainXp: (n) => { this.gainXp(n); this.runXp += n },
      gems: (n) => {
        const give = Math.max(0, Math.min(n, EVENT_RULES.gemCap - this.flags.gems))
        this.flags.gems += give; this.runGems += give
        return give
      },
      card: (kind) => {
        const pool = EQUIP_CARDS.filter((c) => (kind ? c.monster === kind : c.dungeon === this.dg.id))
        if (!pool.length) return undefined
        const cd = pool[Phaser.Math.Between(0, pool.length - 1)]
        this.runCards.push(cd.id); sfx.coin()
        return cardName(cd)
      },
      mat: (boss, n) => {
        const id = matOf(this.dg.id, boss)
        this.runMats[id] = (this.runMats[id] ?? 0) + n
        this.floatText(HERO_X + 60, GROUND - 120, `${matName(id)} +${n}`, '#e8d9a8')
      },
      fortune: () => save().fortune ?? 0,
      setFortune: (n) => { save().fortune = n; persist() },
      addFortune: (n, why) => {
        if (this.dg.tier < FORTUNE.minTier) return
        const s = save(), before = s.fortune ?? 0
        s.fortune = Math.min(FORTUNE.max, Math.round(before + n))
        if (s.fortune > before) this.floatText(W - 170, 70, `🍀 +${s.fortune - before}${why ? ` ${why}` : ''}`, '#8fe08a')
      },
      curse: (c: Curse) => this.addCurse(c),
      cleanse: () => {
        if (this.flags.curseHp > 0) { this.st.maxHp += this.flags.curseHp; this.hp += this.flags.curseHp }
        this.flags.curseHp = 0; this.flags.curseDmg = 0; this.flags.curses = []
        this.say('🕯️ ล้างคำสาปแล้ว!', '#9fe3ff')
      },
      shieldShare: (share) => { this.shield = Math.max(this.shield, Math.round(this.st.maxHp * share)); this.floatText(HERO_X, GROUND - 100, `🛡️ โล่ ${this.shield}`, '#9fe3ff') },
      fight: (kind, o) => this.eventFight(kind, o),
      say: (text, color) => this.say(text, color),
      sound: (k) => { sfx[k]() },
      flash: (big) => {
        this.cameras.main.flash(big ? 450 : 200, 255, 230, 150)
        if (big) { this.burst(W / 2, H / 2, COLORS.gold, 40, 420, true); self.shake(250, 0.01) }
      },
    }
  }

  private say(text: string, color?: string) {
    this.callout(text, HERO_X + 120, GROUND - 150 - (this.sayN++ % 3) * 32, color)
  }

  private addCurse(c: Curse) {
    const R = EVENT_RULES
    this.flags.curses.push(c)
    if (c === 'frail') {
      const n = Math.round(this.st.maxHp * R.curseHpCut)
      this.st.maxHp -= n; this.hp = Math.max(1, Math.min(this.hp, this.st.maxHp)); this.flags.curseHp += n
      this.say(`💀 คำสาปร่างเปราะ: Max HP -${n}`, '#b48aff')
    } else {
      this.flags.curseDmg += R.curseMonDmg
      this.say(`💀 คำสาปถูกล่า: มอนตีแรง +${Math.round(R.curseMonDmg * 100)}%`, '#b48aff')
    }
    sfx.hurt()
  }

  /** Event ทางแยก: the elite wave was cleared. */
  private eliteReward() {
    this.flags.eliteReward = false
    const R = EVENT_RULES, t = this.dg.tier
    this.callout('🔥 ผ่านทางอันตรายได้! รางวัลก้อนโต', W / 2, 250)
    this.coinsFly(HERO_X + 80, GROUND - 40, Phaser.Math.Between(R.chestZeny[0] * t, R.chestZeny[1] * t) * R.forkZeny)
    const id = matOf(this.dg.id, false)
    this.runMats[id] = (this.runMats[id] ?? 0) + 1
    this.floatText(HERO_X + 60, GROUND - 120, `${matName(id)} +1`, '#e8d9a8')
  }

  /** Dice animation for a stat check. The bot runs time fast, so this stays short. */
  private async rollCheck(label: string, chance: number) {
    const need = Math.round(chance * 100), roll = Phaser.Math.Between(1, 100), ok = roll <= need
    const c = this.add.container(W / 2, H / 2 - 40).setDepth(31000)
    c.add(this.add.rectangle(0, 0, 360, 150, COLORS.night, 0.92).setStrokeStyle(3, COLORS.gold))
    c.add(this.add.text(0, -48, `🎲 ${label} · ต้องได้ ≤ ${need}`, { fontFamily: FONT_UI, fontSize: '18px', color: '#d8d4f0' }).setOrigin(0.5))
    const num = this.add.text(0, 6, '', { fontFamily: FONT_NUM, fontSize: '44px', color: '#f6eedc', stroke: '#14172b', strokeThickness: 6 }).setOrigin(0.5)
    c.add(num)
    for (let i = 0; i < 8; i++) { num.setText(`${Phaser.Math.Between(1, 100)}`); sfx.pop(); await this.wait(55) }
    num.setText(`${roll}`).setColor(ok ? '#8fe08a' : '#ff7a7a')
    c.add(this.add.text(0, 52, ok ? '✅ สำเร็จ!' : '❌ พลาด...', { fontFamily: FONT_UI, fontSize: '22px', fontStyle: 'bold', color: ok ? '#8fe08a' : '#ff7a7a' }).setOrigin(0.5))
    if (ok) sfx.win(); else sfx.hurt()
    await this.wait(650)
    c.destroy()
    return ok
  }

  private async reveal(text: string, color = '#f2b84b') {
    const t = this.add.text(W / 2, H / 2 - 40, text, { fontFamily: FONT_UI, fontSize: '44px', fontStyle: 'bold', color, stroke: '#14172b', strokeThickness: 8 }).setOrigin(0.5).setDepth(31000).setScale(0.6)
    sfx.door()
    await this.tween({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' })
    await this.wait(700)
    t.destroy()
  }

  /** An event fight: the hero can't drop below the floor (a loss costs at most eventFightLoss of max HP), and the
   *  monsters run once the hero has used `turns` turns. Not a wave: no turn log, no room heal, no game over. */
  private async eventFight(kind: MonsterKind, o: { hp?: number; dmg?: number; def?: number; mul?: { hp: number; dmg: number }; turns: number; tint?: number; alpha?: number }) {
    const id = this.runId, start = this.mons.length
    const m = this.addMon(kind, 0)
    const base = m.def
    const hp = Math.round(o.hp ?? base.hp * (o.mul?.hp ?? 1)), dmg = o.dmg ?? base.dmg * (o.mul?.dmg ?? 1)
    m.def = { ...base, hp, dmg, def: o.def ?? base.def }; m.hp = hp
    if (o.tint) m.spr.setTint(o.tint)
    if (o.alpha) m.spr.setAlpha(o.alpha)
    this.banner(`${m.def.name}${m.def.title ? ` · ${m.def.title}` : ''}`, `มีเวลา ${o.turns} เทิร์น · แพ้ไม่ตาย เสีย HP ไม่เกิน ${Math.round(EVENT_RULES.eventFightLoss * 100)}%`)
    await this.wait(800)
    this.fightTurns = 0; this.timedOut = false; this.turnLimit = o.turns
    const floor = Math.max(1, Math.round(this.hp - this.st.maxHp * EVENT_RULES.eventFightLoss))
    this.hpFloor = floor
    const mine = () => this.mons.slice(start).filter((x) => !x.dead)
    while (mine().length && this.hp > this.hpFloor) {
      const a = this.nextActor()
      if (this.allies.length) { await this.allyTurns(); if (!mine().length) break }
      if (a.hero) {
        if (this.fightTurns >= this.turnLimit) break
        this.fightTurns++
        const left = this.turnLimit - this.fightTurns
        if (left === 2 || left === 1) this.callout(`⏳ อีก ${left} เทิร์นมันจะหนี!`, W / 2, 150)
        await this.heroTurn()
      } else await this.monTurn(a.m)
      if (id !== this.runId) { this.hpFloor = 0; return { won: false, share: 0 } }
      await this.levelUps()
      await this.wait(90)
    }
    this.hpFloor = 0
    this.hx = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0, web: 0, slow: 0, thorn: 0, venom: 0, venomTurns: 0 }; this.syncWeb()
    if (this.heroSpr.angle !== 0) { this.heroSpr.setAngle(0).setAlpha(1) }
    const share = Math.min(1, 1 - Math.max(0, m.hp) / hp)
    const left = mine()
    if (!left.length) { await this.wait(400); return { won: true, share: 1 } }
    for (const x of left) {
      x.dead = true; x.dotTxt?.destroy(); x.dotTxt = undefined
      this.tweens.add({ targets: [x.spr, x.shadow], x: W + 140, duration: 520, ease: 'Quad.easeIn', onComplete: () => this.removeMon(x) })
    }
    this.callout(this.hp <= floor ? '🤕 ไม่ไหวแล้ว... มันหนีไป' : '💨 มันหนีไปแล้ว!', W / 2, 200)
    await this.wait(700)
    return { won: false, share }
  }

  // ---------- Dungeon 3: mini boss mechanics + top-tier skills (data/relics.ts) ----------
  private lastHurt = 0
  /** พร v2: relic magic (Hellfire, Lightning Wrath) = magic power x the run's ATK buffs. */
  private magicPow() { return magicPower(this.st) * this.atkMul() }
  private atkMul() {
    return (this.relic === 'trinity' ? 1 + RELIC_RULES.trinity.atkPct : 1) * (1 + this.harvest * RELIC_RULES.harvest.perKill) * (this.buf.blood > 0 && this.st.s2Star ? 1 + S2N.bloodAtk : 1)
      * (this.hx.weaken > 0 ? BATTLE.weakenMul : 1) * (this.hx.thorn > 0 ? 1 - BATTLE.iceSkin.dmgCut : 1) * (this.relic === 'aegis' && this.shield > 0 ? 1 + RELIC_RULES.aegis.dmg : 1)
      * (1 + Math.min(this.pk.comboAtkCap, this.pk.comboAtk * this.comboAtkN)) * (1 + Math.min(this.pk.veteranCap, this.pk.veteran * this.fightTurns)) // legends เชี่ยวชาญคอมโบ / ทหารผ่านศึก
      * (1 + IMMORTAL_RULES.eggStep * this.eggN) // 🌈 ไข่ทองคำ
  }

  /** Monster M.ATK (Q 2026-11-04): magic attacks use matk when the monster has one. */
  private monMatk(m: Mon) { return m.def.matk ?? m.def.dmg }

  /** Monster spell (MonSkill 'bolt'): a magic projectile = M.ATK x pow. Can't be fled; lucky dodge, shields and M.DEF work. */
  /** v49: a monster hit crits (def.crit): returns the damage multiplier and shows CRITICAL. */
  private monCrit(m: Mon) {
    if (!m.def.crit || Math.random() >= m.def.crit) return 1
    this.floatText(HERO_X + 30, GROUND - 150, '💥 CRITICAL!', '#ff5a4e')
    return Math.max(1, BATTLE.monCritMul * (1 - this.st.critDR)) // hero Crit DR (LUK / gear): a crit never hits softer than a normal hit
  }

  private async monBolt(m: Mon, sk: MonSkill) {
    const fxColor = sk.fx?.burn ? 0xff6a2a : sk.fx?.freeze ? 0x9fe3ff : sk.fx?.poison ? 0x7fd04c : sk.name.includes('⚡') || sk.fx?.silence ? 0xfff07a : undefined
    const c = fxColor ?? m.def.slamColor ?? 0xb48aff
    const hits = sk.hits ?? 1
    let fxDone = false
    for (let i = 0; i < hits && this.hp > 0 && !m.dead; i++) {
      const b = this.add.image(m.spr.x - 20, m.spr.y - m.spr.displayHeight * 0.6 - (i % 2) * 30, 'dot').setTint(c).setScale(sk.big ? 3.4 : 2.6).setDepth(9000)
      await this.tween({ targets: b, x: HERO_X + 10, y: GROUND - 50, duration: hits > 1 ? 140 : 220, ease: 'Quad.easeIn' })
      b.destroy()
      this.burst(HERO_X, GROUND - 50, c, sk.big ? 18 : 12, 180, true)
      if (sk.big) this.shake(120, 0.008)
      const landed = this.hurtHero(this.monMatk(m) * BATTLE.monDmgMul * this.skPow(m, sk, 1.3) * this.monMul(m) * this.monCrit(m), true, 999, m)
      if (landed && sk.fx && !fxDone) { fxDone = true; this.applyFx(sk.fx, m) } // the debuff rides on the first hit that lands
    }
  }

  /** v49 physical skill: dash in and hit `hits` times at pow x ATK (each hit rolls Flee unless it crits). */
  private async monStrike(m: Mon, sk: MonSkill) {
    const home = m.spr.x
    await this.tween({ targets: [m.spr, m.shadow], x: HERO_X + 70, duration: BATTLE.stepMs * 0.3, ease: 'Quad.easeIn' })
    let fxDone = false
    for (let i = 0; i < (sk.hits ?? 1) && this.hp > 0 && !m.dead; i++) {
      if (i) { this.tweens.add({ targets: m.spr, x: m.spr.x - 14, duration: 60, yoyo: true }); await this.wait(130) }
      const cr = this.monCrit(m)
      const alone = sk.alone && !this.alive().some((x) => x !== m) ? sk.alone : 1
      if (alone > 1 && i === 0) this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, `ไร้ศพข้างกาย! ×${alone}`, '#c9a8ff')
      const landed = this.hurtHero(m.def.dmg * BATTLE.monDmgMul * this.skPow(m, sk, 1.3) * this.monMul(m) * cr * alone, !!sk.magic, sk.magic || cr > 1 ? 999 : m.def.hit ?? 15, m)
      if (landed) { this.monLeech(m); if (sk.fx && !fxDone) { fxDone = true; this.applyFx(sk.fx, m) } }
    }
    if (sk.drain && this.hp > 0 && !m.dead) { // hunter ตะปบจุดตาย: drain the hero's blood as magic damage, heal by it
      const before = this.hp
      if (this.hurtHero(this.hp * sk.drain, true, 999, m)) { this.healMon(m, Math.max(0, before - this.hp)); this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '🩸 ดูดเลือด!', '#ff7a9a') }
    }
    await this.tween({ targets: [m.spr, m.shadow], x: home, duration: BATTLE.stepMs * 0.3, ease: 'Quad.easeOut' })
  }

  /** v49 monster counter: right after the hero's basic attack, the target may strike back (def.counter). */
  private async monCounter(m: Mon | undefined) {
    if (!m || m.dead || m.frozen || m.charging || !m.def.counter || this.hp <= 0 || Math.random() >= m.def.counter - this.st.ignoreCounter) return // hero Ignore Counter (DEX / gear)
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '↩️ สวนกลับ!', '#ff9a6a')
    this.tweens.add({ targets: m.spr, x: m.spr.x - 24, duration: 90, yoyo: true })
    await this.wait(150)
    const cr = this.monCrit(m)
    const landed = this.hurtHero((m.def.magic ? this.monMatk(m) : m.def.dmg) * BATTLE.monDmgMul * this.monMul(m) * BATTLE.monCounterMul * (1 - this.st.counterDR) * cr, !!m.def.magic, cr > 1 ? 999 : m.def.hit ?? 15, m)
    if (landed) this.monLeech(m)
  }

  /** Monster hit multiplier: Ice Age weakens it. */
  private monMul(m: Mon) {
    let k = m.iced ? 1 - RELIC_RULES.iceage.atkDown : 1
    return k * m.dmgMul * (m.atkUpTurns > 0 ? 1 + m.atkUp : 1) * (m.weakTurns > 0 ? 1 - m.weakPct : 1) * (1 + this.flags.curseDmg) * (m.chill > 0 ? 1 - this.px('chillWeak') : 1) // card กัดเย็น
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
    const got = Math.min(Math.ceil(m.def.hp - m.hp), Math.ceil(n * (1 - cut)))
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

  /** Duelist Riposte: a blocked hit comes back as 80% of itself, true damage, capped and never lethal (Q's reflect rule). */
  private riposteHit(m: Mon, dmg: number) {
    this.parryCount++
    this.slashFx(HERO_X + 40, GROUND - 50); sfx.door()
    const n = Math.min(Math.ceil(dmg * BATTLE.duel.ripostePct), Math.ceil(m.riposteLeft ?? 0)) // one stance answers at most riposteCap of max HP in total (multi-hit kits)
    if (n <= 0) return
    m.riposteLeft = (m.riposteLeft ?? 0) - n
    if (this.trueHurt(m, n, false) > 0) this.floatText(HERO_X, GROUND - 130, '🤺 โดนสวน!', '#ff7a7a')
  }

  /** Duelist true damage: ignores Flee / DEF / M.DEF; lucky dodge and shields still work. Returns HP lost. */
  private trueHurt(m: Mon, n: number, lethal: boolean, crit = false): number {
    n = Math.ceil(n)
    if (n <= 0 || this.hp <= 0) return 0
    if (this.dodgeCharges > 0) { this.dodgeCharges--; this.evadeJuice('เงาพริ้ว!', '#c9c9d6'); return 0 }
    if (this.hx.web <= 0 && Math.random() < this.st.luckyDodge) { this.evadeJuice('LUCKY!', '#6fd08c'); return 0 }
    if (this.shield > 0) { const a = Math.min(Math.ceil(this.shield), n); this.shield = Math.max(0, this.shield - a); n -= a; if (n <= 0) { this.floatText(HERO_X, GROUND - 110, '🛡️ กันไว้', '#9fe3ff'); return 0 } }
    this.castBreak(n)
    const before = this.hp
    this.hp = lethal ? this.hp - n : Math.max(this.hpFloor, 1, this.hp - n)
    if (lethal && this.hp <= 0 && this.hpFloor > 0) this.hp = this.hpFloor
    const lost = Math.max(0, before - Math.max(0, this.hp))
    this.minHpPct = Math.min(this.minHpPct, Math.max(0, this.hp) / this.st.maxHp)
    this.damageNumber(HERO_X, GROUND - 70, lost, crit, '#ffffff')
    this.cameras.main.shake(crit ? 140 : 80, crit ? 0.008 : 0.004)
    this.knockedOut()
    void m
    return lost
  }

  /** Duelist: damage dealt by her vital strikes heals her back over BATTLE.duel.healTurns of her turns. */
  private duelHealAdd(m: Mon, n: number) {
    if (n <= 0) return
    m.duelHeal = (m.duelHealTurns ? (m.duelHeal ?? 0) * m.duelHealTurns : 0) + n
    m.duelHealTurns = BATTLE.duel.healTurns
    m.duelHeal = m.duelHeal / m.duelHealTurns
  }

  /** Death Realm (Q 2026-11-04): the hero loses `n` points of every base stat this fight; derived stats move by the
   *  exact difference heroStats() gives for one point less of everything, and come back at the next fight. */
  private drained = 0
  private drainDelta?: Partial<Record<keyof Stats, number>>
  private deathRealm(m: Mon, n: number) {
    const s = save(), base = s.stats as Record<string, number>
    if (Object.values(base).some((v) => v - this.drained - n < 1)) return // never below 1
    if (!this.drainDelta) {
      const a = heroStats(s) as unknown as Record<string, number>
      const b = heroStats({ ...s, stats: Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v - 1])) as typeof s.stats }) as unknown as Record<string, number>
      this.drainDelta = Object.fromEntries(Object.keys(a).filter((k) => typeof a[k] === 'number' && a[k] !== b[k]).map((k) => [k, b[k] - a[k]])) as Partial<Record<keyof Stats, number>>
    }
    this.shiftStats(n)
    this.drained += n
    m.dmgMul += 0.01 * n
    this.floatText(HERO_X, GROUND - 160, `💀 Death Realm: All Stat -${n} (รวม -${this.drained})`, '#c9a8ff')
  }
  private shiftStats(n: number) {
    const st = this.st as unknown as Record<string, number>
    for (const [k, d] of Object.entries(this.drainDelta ?? {})) st[k] += (d as number) * n
    this.hp = Math.max(1, Math.min(this.hp, this.st.maxHp))
  }
  /** Venom Strike (Q 2026-11-04, venomqueen): a magic DoT that starts at venom.dmg (scaled like its M.ATK) and doubles every hero turn. */
  private matkScale(m: Mon) { const b = MONSTERS[m.kind]; return this.monMatk(m) / (b.matk ?? b.dmg) }
  private venomStrike(m: Mon) {
    const V = m.def.venom!
    if (this.hp <= 0) return
    if (this.relic === 'purify' || Math.random() < this.st.debuffRes) { this.resistCount++; this.floatText(HERO_X - 40, GROUND - 160, '🕷️ ต้านทาน!', '#9fe3ff'); return }
    this.debuffCount++
    this.hx.venom = V.dmg * this.matkScale(m) * this.monMul(m); this.hx.venomTurns = V.turns
    this.floatText(HERO_X + 30, GROUND - 150, `🕷️ พิษทวีคูณ ${V.turns} เทิร์น`, '#9be35a')
  }
  /** พ่นใยมัดตัว: while webbed the hero's AGI counts BATTLE.web.agi; derived stats move by exactly what heroStats() gives. */
  private webOn = false
  private webDelta?: Partial<Record<keyof Stats, number>>
  private syncWeb() {
    const on = this.hx.web > 0
    if (on === this.webOn) return
    if (!this.webDelta) {
      const s = save()
      const a = heroStats(s) as unknown as Record<string, number>
      const b = heroStats({ ...s, stats: { ...s.stats, agi: Math.floor(s.stats.agi * BATTLE.web.agi) } }) as unknown as Record<string, number>
      this.webDelta = Object.fromEntries(Object.keys(a).filter((k) => typeof a[k] === 'number' && a[k] !== b[k]).map((k) => [k, b[k] - a[k]])) as Partial<Record<keyof Stats, number>>
    }
    const st = this.st as unknown as Record<string, number>
    for (const [k, d] of Object.entries(this.webDelta)) st[k] += (d as number) * (on ? 1 : -1)
    this.hp = Math.max(1, Math.min(this.hp, this.st.maxHp))
    this.webOn = on
  }
  /** v77 พรแสง: while blessed the hero's base stats get blessBase(); derived stats move by exactly what heroStats() gives (like syncWeb). */
  private blessOn = false
  private blessDelta?: Partial<Record<keyof Stats, number>>
  private syncBless() {
    const on = this.buf.bless > 0
    if (on === this.blessOn) return
    if (!this.blessDelta) {
      const s = save(), add = blessBase(s) ?? {}
      const a = heroStats(s) as unknown as Record<string, number>
      const b = heroStats({ ...s, tempBase: add }) as unknown as Record<string, number>
      this.blessDelta = Object.fromEntries(Object.keys(a).filter((k) => typeof a[k] === 'number' && a[k] !== b[k]).map((k) => [k, b[k] - a[k]])) as Partial<Record<keyof Stats, number>>
    }
    const st = this.st as unknown as Record<string, number>
    for (const [k, d] of Object.entries(this.blessDelta)) st[k] += (d as number) * (on ? 1 : -1)
    this.hp = Math.max(1, Math.min(this.hp, this.st.maxHp))
    this.blessOn = on
    if (!on) { this.kyrie = { hp: 0, hits: 0 }; this.floatText(HERO_X, GROUND - 150, '🔆 พรแสงหมด', '#c9c9d6') }
  }
  /** Remove the worst hero debuff (v77 พรแสง cleanse). */
  private cleanseOne() {
    const X = this.hx
    if (X.venomTurns > 0) { X.venomTurns = 0; X.venom = 0 }
    else if (X.poison > 0) X.poison = 0
    else if (X.burn > 0) X.burn = 0
    else if (X.silence > 0) X.silence = 0
    else if (X.web > 0) { X.web = 0; this.syncWeb() }
    else if (X.armorBreak > 0) X.armorBreak = 0
    else if (X.weaken > 0) X.weaken = 0
    else if (X.slow > 0) X.slow = 0
    else if (X.thorn > 0) X.thorn = 0
    else return
    this.floatText(HERO_X, GROUND - 175, '🔆 ล้างดีบัฟ!', '#ffe08a')
  }
  private undrain() {
    if (!this.drained) return
    this.shiftStats(-this.drained)
    this.drained = 0
  }

  /** Drainer Summon Maiden (Q 2026-11-04): she turns immortal and calls a Maiden ghost with her max HP and M.ATK. */
  private summonMaiden(m: Mon) {
    m.maidenDone = true
    const slot = this.freeSlots()[0]
    if (slot === undefined) return
    const g = this.addMon('maiden', slot, 0)
    g.summoned = true
    g.def = { ...g.def, hp: m.def.hp, matk: m.def.matk ?? m.def.dmg, hit: m.def.hit }
    g.hp = g.def.hp
    g.spr.setTint(BATTLE.maiden.tint)
    m.maiden = g
    this.turnLimit += BATTLE.maiden.turns
    this.callout(`👻 ${m.def.name}: Summon Maiden! อมตะจนกว่าเมเดนจะตาย`, W / 2, 205, '#e0a8ff')
    this.cameras.main.flash(200, 200, 120, 255)
  }

  /** Gunner Bullet Time (Q 2026-11-04): under 25% HP she counts down 3 of her turns (still shooting), then fires 25 shots. */
  private async bulletTime(m: Mon): Promise<boolean> {
    const B = BATTLE.bulletTime, top = m.spr.y - m.spr.displayHeight - 10
    if (m.bulletDone || this.hp <= 0) return false
    if (m.bulletCd === undefined) {
      if (m.hp >= m.def.hp * B.at) return false
      m.bulletCd = B.countdown
      this.callout(`⏳ ${m.def.name}: Bullet Time! อีก ${B.countdown} เทิร์นจะระดมยิง ${B.hits} นัด`, W / 2, 205)
      m.spr.setTint(0xffc070)
      return false
    }
    if (--m.bulletCd > 0) { this.floatText(m.spr.x, top, `⏳ Bullet Time ${m.bulletCd}…`, '#ffc070'); return false }
    m.bulletDone = true; m.spr.clearTint()
    this.callout(`🔫 ${m.def.name}: BULLET TIME!!`, W / 2, 205)
    for (let i = 0; i < B.hits && this.hp > 0 && !m.dead; i++) {
      this.tweens.add({ targets: m.spr, x: m.spr.x + 6, duration: 30, yoyo: true })
      this.burst(HERO_X + Phaser.Math.Between(-10, 30), GROUND - Phaser.Math.Between(30, 90), 0xffc070, 3, 60)
      const cr = this.monCrit(m)
      this.hurtHero(m.def.dmg * BATTLE.monDmgMul * (1 + Phaser.Math.FloatBetween(B.bonusMin, B.bonusMax)) * this.monMul(m) * cr, false, cr > 1 ? 999 : m.def.hit ?? 15, m)
      await this.wait(70)
    }
    await this.wait(250)
    return true
  }

  /** Duelist turn script (before the normal attack). Returns true when the turn was used. */
  private async duelTurn(m: Mon): Promise<boolean> {
    const D = BATTLE.duel, top = m.spr.y - m.spr.displayHeight - 10
    if (m.espadaArmed) { // Grandado Espada: 4 crit thrusts at the marked vitals
      m.espadaArmed = false; m.spr.clearTint()
      this.callout(`⚔️ ${m.def.name}: กรันดาโด เอสปาดา!`, W / 2, 205)
      let got = 0
      for (let i = 0; i < D.espadaHits && this.hp > 0; i++) {
        this.tweens.add({ targets: m.spr, x: HERO_X + 70, duration: 90, yoyo: true })
        this.slashFx(HERO_X + 20 + i * 8, GROUND - 40 - i * 12)
        got += this.trueHurt(m, this.st.maxHp * Phaser.Math.FloatBetween(D.espadaMin, D.espadaMax), true, true)
        await this.wait(260)
      }
      this.duelHealAdd(m, got)
      return true
    }
    if (m.phase > 0 && m.turns >= (m.espadaNext ?? 0)) { // phase 2: open every vital point, immortal while marking
      m.espadaNext = m.turns + D.espadaEvery; m.espadaArmed = true
      m.spr.setTint(0xffe08a)
      this.floatText(m.spr.x, top, '✨ เปิดจุดตายทั้งหมด! (อมตะ · เทิร์นหน้าพุ่งแทง 4 ครั้ง)', '#ffe08a')
      await this.wait(BATTLE.stepMs); return true
    }
    if (m.turns % BATTLE.parryEvery === 0) { // Riposte stance instead of attacking
      m.parry = true; m.riposteLeft = this.st.maxHp * BATTLE.duel.riposteCap
      m.spr.setTint(0xc9e0ff)
      this.floatText(m.spr.x, top, '🤺 Riposte! อมตะ · ตีเข้ามาโดนสวน 80% (อย่าเพิ่งใช้ท่าไม้ตาย)', '#c9e0ff')
      await this.wait(BATTLE.stepMs); return true
    }
    if (m.turns % D.vitalEvery === 0) { // passive: vital-point thrust, true damage
      const src = this.roomDef(this.room)?.src ?? this.dg.id, lv = HARD.recLv[src] ?? 12
      this.tweens.add({ targets: m.spr, x: HERO_X + 70, duration: 140, yoyo: true })
      this.slashFx(HERO_X + 30, GROUND - 60)
      this.floatText(m.spr.x, top, '🎯 แทงจุดตาย! (ดาเมจจริง)', '#ffd27a')
      const got = this.trueHurt(m, this.st.maxHp * D.vitalPct + m.def.dmg * this.monMul(m) * lv * D.vitalLvMul, true)
      this.duelHealAdd(m, got)
      await this.wait(BATTLE.stepMs); return true
    }
    return false
  }

  /** Perfect Riposte skill: every Nth enemy attack is parried and countered. */
  private riposte(m: Mon) {
    if (this.relic !== 'riposte') return false
    if (++this.enemyAttacks % RELIC_RULES.riposte.every) return false
    this.counterCount++
    this.floatText(HERO_X, GROUND - 120, '🤺 ปัดป้อง!', '#c9e0ff')
    this.slashFx(m.spr.x - 20, GROUND - 40)
    this.withSrc('counter', () => this.strike(m, RELIC_RULES.riposte.mul, this.job.attack === 'magic', this.job.attack === 'magic' ? '#c9a8ff' : undefined))
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
      this.withSrc('zap', () => this.damageMon(m, Math.max(1, Math.round(this.magicPow() * Phaser.Math.FloatBetween(0.9, 1.1) * S.mul)), false, '#bfe6ff')) // magic: no crit (RO rule)
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
      if (this.st.poise > 0 && (k === 'freeze' || k === 'silence')) { this.floatText(HERO_X - 40, GROUND - 160, `🧘 ${FX_ICON[k]} กันได้`, '#ff6b7a'); continue } // v78 Poise
      if (this.relic === 'purify' || Math.random() < this.st.debuffRes) { this.resistCount++; this.floatText(HERO_X - 40, GROUND - 160, `${FX_ICON[k]} ต้านทาน!`, '#9fe3ff'); continue }
      this.debuffCount++
      if (k === 'poison') X.poison = Math.min(BATTLE.poisonCap, X.poison + v)
      else if (k === 'freeze') {
        const lost = v * (1 - this.st.tenacity)
        this.heroGauge = Math.max(-150, this.heroGauge - lost)
        this.floatText(HERO_X, GROUND - 150, '❄️ แข็ง! เสียเทิร์น', '#9fe3ff')
        this.heroSpr.setTint(0x9fe3ff); this.time.delayedCall(500, () => this.heroSpr.setTint((COSTUMES.find((c) => c.id === save().costume) ?? COSTUMES[0]).tint))
      } else X[k] = Math.max(X[k], v)
      if (k !== 'freeze' && src) this.floatText(HERO_X + 30, GROUND - 150, `${FX_ICON[k]} ${({ poison: 'พิษ', burn: 'ไฟลุก', weaken: 'อ่อนแรง', armorBreak: 'เกราะแตก', silence: 'ใบ้', web: 'โดนใยมัด! หลบไม่ได้ AGI -50%', slow: 'Frozen Heart! ATK Speed -50%' } as Record<string, string>)[k]}`, '#ffb0e0')
    }
    this.syncWeb()
  }

  /** Poison / burn tick on the hero: shields soak it, it can't be dodged, and it can knock the hero out. */
  private dotHurt(dmg: number, icon: string, color: string) {
    let n = Math.max(1, Math.ceil(dmg))
    if (this.shield > 0) { const a = Math.min(Math.ceil(this.shield), n); this.shield = Math.max(0, this.shield - a); n -= a; if (n <= 0) return }
    this.hp = Math.max(this.hpFloor, this.hp - n) // v85: a poison / burn tick never breaks a chant
    if (this.hp > 0) this.lowHpCheck()
    this.minHpPct = Math.min(this.minHpPct, this.hp / this.st.maxHp)
    this.damageNumber(HERO_X, GROUND - 70, n, false, color)
    this.floatText(HERO_X - 30, GROUND - 120, icon, color)
    this.knockedOut()
  }

  /** Reflected damage from a mirror monster: magic, never misses. Thorn Aura halves it. */
  private reflectHurt(m: Mon, dmg: number) {
    let n = Math.ceil(dmg * (1 - this.st.mdef * (this.hx.armorBreak > 0 ? BATTLE.armorBreakMul : 1)) * (this.relic === 'thornaura' ? 1 - RELIC_RULES.thornaura.reflectCut : 1))
    n = Math.min(n, Math.ceil(this.st.maxHp * BATTLE.reflectCap)) // Q 2026-11-04: one reflected hit is capped, so big burst can't one-shot you
    if (n <= 0) return
    if (this.shield > 0) { const a = Math.min(Math.ceil(this.shield), n); this.shield = Math.max(0, this.shield - a); n -= a; if (n <= 0) return }
    this.hp = Math.max(this.hpFloor, 1, this.hp - n) // reflect alone never knocks the hero out
    this.minHpPct = Math.min(this.minHpPct, this.hp / this.st.maxHp)
    this.damageNumber(HERO_X, GROUND - 70, n, false, '#c9e0ff')
    if (Math.random() < 0.3) this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '🪞 สะท้อน!', '#c9e0ff')
    this.knockedOut()
  }

  /** Shared knock-out check for damage that skips hurtHero (Phoenix revive still works). */
  private knockedOut() {
    if (this.hp > 0 || this.holyRevive()) return
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

  /** v68: a skill's pow x the caster's scaling stat (mon-stats skillMul; 1 for a monster without stats). */
  private skPow(m: Mon, sk: MonSkill, dflt: number) { return (sk.pow ?? dflt) * skillMul(m.def, scaleOf(sk)) }

  /** A skill instead of an attack, on every `every`-th turn when it has a use. Returns true if one was used. */
  private async useSkill(m: Mon) {
    for (const raw of m.skills) {
      if (m.turns % raw.every) continue
      const picked = raw.pick ? raw.pick[Phaser.Math.Between(0, raw.pick.length - 1)] : raw // spell rotation
      const sk = skillAtLv(picked, picked.lv ?? raw.lv ?? 1) // v81 skill level (RO style over-level ok)
      if (sk.big) { this.callout(`${m.def.name}: ${sk.name}!`, W / 2, 190, '#ff7ad0'); this.cameras.main.flash(220, 200, 80, 255); await this.wait(350) }
      const allies = this.alive()
      let done = false
      if (sk.kind === 'heal') {
        const t = sk.self ? m : allies.filter((a) => a.hp < a.def.hp * 0.8).sort((a, b) => a.hp / a.def.hp - b.hp / b.def.hp)[0]
        if (t && t.hp < t.def.hp * 0.8) { this.healMon(t, t.def.hp * this.skPow(m, sk, 0.15)); done = true }
      } else if (sk.kind === 'shield') {
        for (const t of sk.self ? [m] : allies) { t.shield = Math.max(t.shield, Math.round(t.def.hp * this.skPow(m, sk, 0.1))); this.dotIcon(t) }
        done = true
      } else if (sk.kind === 'warcry') {
        if (sk.self) { m.atkUp += this.skPow(m, sk, 0.2); m.atkUpTurns = sk.turns ?? 3 }
        else for (const t of allies) { t.atkUp = Math.max(t.atkUp, this.skPow(m, sk, 0.2)); t.atkUpTurns = Math.max(t.atkUpTurns, (sk.turns ?? 3) + (t === m ? 1 : 0)); this.dotIcon(t) }
        this.dotIcon(m); done = true
      } else if (sk.kind === 'haste') { for (const t of allies) if (t !== m) t.gauge += this.skPow(m, sk, 30); done = true }
      else if (sk.kind === 'curse' && sk.fx) { this.applyFx(sk.fx, m); done = true }
      else if (sk.kind === 'bolt') { await this.monBolt(m, sk); done = true }
      else if (sk.kind === 'strike') { await this.monStrike(m, sk); done = true }
      else if (sk.kind === 'summon' && sk.summon) done = this.summonAdds(sk.summon[0], sk.summon[1]) > 0
      else if (sk.kind === 'revive') {
        const corpse = this.mons.slice(this.roomStart).find((x) => x.dead && !x.revived && x.def.ai !== 'boss' && x !== m)
        const slot = this.freeSlots()[0]
        if (corpse && slot !== undefined) {
          corpse.revived = true
          const r = this.addMon(corpse.kind, slot, 0)
          r.revived = true; r.hp = Math.round(r.def.hp * Math.min(1, this.skPow(m, sk, 0.5)))
          done = true
        }
      }
      if (!done) continue
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10, `✦ ${sk.name}`, sk.kind === 'curse' || sk.kind === 'bolt' || sk.kind === 'strike' ? '#ffb0e0' : '#b0ffc8')
      this.tweens.add({ targets: m.spr, scaleY: m.spr.scaleY * 1.12, duration: 140, yoyo: true })
      this.burst(m.spr.x, m.spr.y - 40, sk.kind === 'curse' || sk.kind === 'bolt' || sk.kind === 'strike' ? 0xc03070 : 0x6fd08c, 12, 140)
      await this.wait(BATTLE.stepMs)
      return true
    }
    return false
  }

  /** Boss phase: heal / shield / adds on entering, then faster, harder, new tricks. */
  private enterPhase(m: Mon, p: BossPhase) {
    if (p.drainStats) m.drainStats = p.drainStats
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
    if (p.absorb !== undefined) m.absorb = p.absorb
    if (p.skills) m.skills = p.skills
    if (p.onHit) m.onHit = p.onHit
    if (p.slamFx) m.slamFx = p.slamFx
    if (p.heal) this.healMon(m, m.def.hp * p.heal)
    if (p.shield) m.shield = Math.max(m.shield, Math.round(m.def.hp * p.shield))
    if (p.summon) this.summonAdds(p.summon[0], p.summon[1])
    this.dotIcon(m)
  }

  /** After the duel: pick 1 of 3 top-tier skills (the mini boss's two + one random). */
  private async offerRelic(catchUp = false) {
    const sig = MINI_RELICS[this.miniKind ?? 'duelist'] ?? ['trinity', 'storm']
    const can = (r: RelicId) => { const n = RELICS[r].needs; return !n || this.perks.some((o) => o.def.line === n) } // transforms need a card of their line
    const rest = (Object.keys(RELICS) as RelicId[]).filter((r) => !sig.includes(r) && can(r))
    let ids: RelicId[] = [...sig, rest[Phaser.Math.Between(0, rest.length - 1)]]
    if (this.testRelic) ids = [this.testRelic, ...ids.filter((x) => x !== this.testRelic)].slice(0, 3) // bot hook
    sfx.win(); this.cameras.main.flash(220, 255, 230, 150)
    const c = await this.choose({ name: '🔴 พรเทพ!', icon: '👑', desc: `${catchUp ? 'พรเทพที่ถือมาตอนผ่านจุดนี้' : `ชนะ ${MONSTERS[this.miniKind ?? 'duelist'].name}!`} เลือกพรเทพ 1 อย่าง ติดตัวจนจบรอบนี้ (มีได้ 1 ใบต่อรอบ)`, rare: true },
      ids.map((r) => ({ label: `${RELICS[r].icon} ${RELICS[r].name}`, sub: RELICS[r].desc })))
    const r = ids[c]
    this.relic = r
    if (r === 'trinity') {
      const T = RELIC_RULES.trinity
      this.applyMod({ crit: T.crit, critMul: T.critMul, combo: T.combo, counter: T.counter })
      this.st.combo = Math.min(COMBO.rateCap, this.st.combo); this.st.counter = Math.min(COMBO.rateCap, this.st.counter)
    }
    if (r === 'bloodpact') { this.st.lifesteal = Math.min(0.4, this.st.lifesteal + RELIC_RULES.bloodpact.lifesteal) } // Q 2026-11-04: cap stays 40% even with the pact
    if (r === 'haste') this.smashCdLeft = Math.max(0, this.smashCdLeft - RELIC_RULES.haste.cd)
    if (r === 'asura') { const A = RELIC_RULES.asura; this.applyMod({ crit: A.crit, critMul: A.critMul }); this.st.resRegenCut += A.regenCut; this.st.rageGain -= A.regenCut } // ร่างอสุรา
    this.callout(`👑 ${RELICS[r].icon} ${RELICS[r].name}`, W / 2, 190)
    await this.wait(400)
  }

  /** Event panel: icon, name, text and 1-3 option buttons. Resolves with the picked index. */
  private choose(ev: Panel, opts: Opt[]) {
    return new Promise<number>((done) => {
      this.time.paused = true
      const c = this.add.container(0, 0).setDepth(30000)
      c.add(this.add.rectangle(W / 2, H / 2, W, H, COLORS.night, 0.78).setInteractive())
      const jp = ev.tier === 'jackpot', wide = opts.length > 3
      const box = this.add.rectangle(W / 2, H / 2, wide ? 860 : 620, 400, jp ? 0x4a1f3a : ev.rare ? 0x3a2f1a : 0x22284a, 0.96).setStrokeStyle(jp ? 6 : 4, jp ? 0xff8cc6 : ev.rare ? COLORS.gold : 0x5a5f8a)
      c.add(box)
      c.add(this.add.text(W / 2, H / 2 - 150, ev.icon, { fontSize: '52px' }).setOrigin(0.5))
      c.add(this.add.text(W / 2, H / 2 - 98, ev.name, { fontFamily: FONT_UI, fontSize: '28px', fontStyle: 'bold', color: jp ? '#ffd86b' : ev.rare ? '#f2b84b' : '#f6eedc' }).setOrigin(0.5))
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
      const bw = opts.length === 1 ? 300 : opts.length === 2 ? 270 : opts.length === 3 ? 186 : 196, gap = 14
      const x0 = W / 2 - ((opts.length - 1) * (bw + gap)) / 2
      opts.forEach((o, i) => {
        const x = x0 + i * (bw + gap), y = H / 2 + 70
        const b = button(this, x, y, bw, 70, o.label, () => finish(i), { size: 17, fill: o.off ? 0x4a4e6e : COLORS.gold, color: o.off ? '#8a87a8' : undefined })
        c.add(b)
        c.add(this.add.text(x, y + 50, o.sub, { fontFamily: FONT_UI, fontSize: '13px', color: o.off ? '#8a87a8' : '#d8d4f0', align: 'center', wordWrap: { width: bw } }).setOrigin(0.5, 0))
        const k = `keydown-${['ONE', 'TWO', 'THREE', 'FOUR'][i]}`
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
    else if (this.autoUlt) this.autoSkip = true // auto mode: a cancel holds the ult for this turn
  }

  // ---------- v55 auto ult ----------
  /** save.autoUlt: 'auto' (default) books the ult by itself, 'manual' waits for the button. */
  private autoUlt = true
  private autoSkip = false // player cancelled a booked ult in auto mode: skip one auto decision
  private ultHeld = 0 // hero turns the ready ult has been held for timing
  /** Same timing rule the bot (tools/bot.cjs) uses, plus a hold cap so a ready ult is never sat on for long:
   *  boss with a charged attack -> wait for the charge (max 3 turns); duelist -> not into her parry;
   *  trash almost dead -> hold 1 turn so the ult is not wasted; everything else -> cast now. */
  autoUltWant(): boolean {
    const live = this.alive()
    if (!live.length) return false
    const boss = live.find((m) => m.def.ai === 'boss')
    if (boss) {
      if (boss.charging) return true
      if (boss.def.mini === 'duelist') return !(boss.parry || boss.espadaArmed) || this.ultHeld >= 2
      if (boss.def.mini && !boss.def.charge) return true
      return this.ultHeld >= 3
    }
    if (live.every((m) => m.hp <= m.def.hp * 0.2)) return this.ultHeld >= 1
    return true
  }

  private autoUltTurn() {
    if (!this.autoUlt || this.smashQueued || this.smashCdLeft > 0) { if (this.smashCdLeft > 0) this.ultHeld = 0; return }
    if (this.autoSkip) { this.autoSkip = false; return }
    if (this.autoUltWant()) { this.smashQueued = true; this.ultHeld = 0 } else this.ultHeld++
  }

  private setAutoUlt(on: boolean) {
    this.autoUlt = on
    const s = save(); s.autoUlt = on ? 'auto' : 'manual'; persist()
    this.autoBtn?.setLabel(on ? '⚡ อัตโนมัติ' : '🖐️ กดเอง')
    if (on) this.clearBookings() // auto fires everything itself: no stale gold rings
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
      { text: `${this.run.where(this.room)} · เก็บได้ ${this.zeny} zeny · ${this.kills} ตัว`, size: 19 },
      { text: 'กลับเมืองตอนนี้ได้ zeny กับ EXP ที่เก็บมาแล้วครบ ไม่หายค่ะ', size: 16, color: '#a9a6c7' },
    ], 'ลุยต่อ', () => { this.unpause() }, { label: 'กลับเมือง', onGo: () => { this.unpause(); this.runId++; this.settle(false); go(this, 'hub') } })
    const lab = () => (this.autoUlt ? '⚡ ทักษะ: อัตโนมัติ' : '🖐️ ทักษะ: กดเอง (จองก่อนใช้)')
    const tg = button(this, 0, -170, 300, 48, lab(), () => { this.setAutoUlt(!this.autoUlt); tg.setLabel(lab()) }, { size: 18, fill: 0x5a5f8a, color: '#f6eedc' })
    ;(this.overlay as Phaser.GameObjects.Container | undefined)?.add(tg)
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
    if (this.hard) { // hard mode: zeny / account EXP / forge mats scaled up (in-run EXP stays normal)
      const k = HARD.reward * (this.hardK.hp / HARD_POWER.target) ** HARD.rewardPow
      this.zeny = Math.round(this.zeny * k); this.runXp = Math.round(this.runXp * k)
      for (const id of Object.keys(this.runMats)) this.runMats[id] = Math.ceil(this.runMats[id] * HARD.mats)
      const ck = this.run.corrupt?.reward ?? 1 // D6+ corruption: every penalty pays (data/corruptions.ts)
      if (ck !== 1) { this.zeny = Math.round(this.zeny * ck); this.runXp = Math.round(this.runXp * ck); for (const id of Object.keys(this.runMats)) this.runMats[id] = Math.ceil(this.runMats[id] * ck) }
    }
    this.zeny = Math.round(this.zeny * this.run.mut.zenyMul * this.dropMul) // daily mutators · v59 over-geared normal dungeon
    const mode = MODES[this.run.modeId].reward(s, this.run, { won, left: this.leftTower, floor: this.towerFloor, from: Math.max(0, (this.modeArgs.startFloor ?? 1) - 1), bank: this.bank })
    if (mode) { this.zeny += mode.zeny; for (const [id, n] of Object.entries(mode.mats)) this.runMats[id] = (this.runMats[id] ?? 0) + n }
    s.zeny += this.zeny
    if (this.run.modeId === 'dungeon' && this.dg.id === 'd1') s.bestRoom = Math.max(s.bestRoom, this.room + (won ? 1 : 0))
    let gems = mode?.gems ?? 0
    if (mode?.fortune) s.fortune = Math.min(FORTUNE.max, (s.fortune ?? 0) + mode.fortune)
    if (won && !mode) {
      const by = this.hard ? (s.hardClearsBy ??= {}) : (s.clearsBy ??= { d1: s.clears })
      gems += (by[this.dg.id] ?? 0) === 0 ? FREE_GEMS.firstClear : FREE_GEMS.clear // first hard clear also pays the first-clear gems
      by[this.dg.id] = (by[this.dg.id] ?? 0) + 1
      s.clears++
    }
    const before = s.gems
    const ups = addXp(this.runXp)
    s.gems += gems + this.runGems
    for (const id of this.runCards) addCard(s, id)
    for (const [id, n] of Object.entries(this.runMats)) addMat(s, id, n)
    for (const id of this.runUniques) if (!s.owned.includes(id)) s.owned.push(id) // v88: one copy per id
    for (const [id, n] of Object.entries(this.runDupeMats)) addMat(s, id, n)
    persist()
    const uniq = [
      ...this.runUniques.map((id) => `💎✨ ได้ของยูนีค! ${itemById(id).icon} ${itemById(id).name} (ใส่ได้ที่หน้าตัวละคร · ใส่พร้อมกันได้ ${UNIQUE.maxEquipped} ชิ้น)${splitStatLine(itemById(id)).curse ? `\n💀 คำสาป: ${splitStatLine(itemById(id)).curse}` : ''}`),
      ...Object.entries(this.runDupeMats).map(([id, n]) => `💎 ของยูนีคซ้ำ → ได้วัตถุดิบแทน ${matName(id)} x${n}`),
    ]
    const lines = [...uniq, ...(mode?.lines ?? []), `+${this.zeny} zeny · +${this.runXp} EXP${s.gems > before ? ` · +${s.gems - before} เพชร` : ''}`]
    if (ups.base) lines.push(`🎉 Base Lv ${s.baseLevel}! ได้แต้มสถานะเพิ่ม`)
    if (ups.job) lines.push(`✨ Job Lv ${s.jobLevel}! ได้แต้มสกิลเพิ่ม`)
    if (this.runCards.length) { // grouped + capped: a long tower run can find dozens
      const n = new Map<string, number>()
      for (const id of this.runCards) n.set(id, (n.get(id) ?? 0) + 1)
      const all = [...n].map(([id, k]) => `${cardName(cardById(id)!)}${k > 1 ? ` x${k}` : ''}`), show = all.slice(0, 6)
      lines.push(`🃏 ได้การ์ด ${this.runCards.length} ใบ: ${show.join(', ')}${all.length > show.length ? ` และอีก ${all.length - show.length} แบบ` : ''} (ใส่ได้ที่หน้าตัวละคร)`)
    }
    const mats = Object.entries(this.runMats)
    if (mats.length) lines.push(`🔨 วัตถุดิบ: ${mats.map(([id, n]) => `${matName(id)} x${n}`).join(', ')} (ใช้ที่โรงตีเหล็ก)`)
    return lines.join('\n')
  }

  private buildText() {
    const r = this.relic ? `${RELICS[this.relic].icon}${RELICS[this.relic].name}  ` : ''
    const f = this.flags, ev = `${f.clover ? '🍀' : ''}${f.allLegend ? '🌠' : ''}${f.curses.length ? `💀${f.curses.length}` : ''}`
    const im = this.immortal ? `🌈${IMMORTALS[this.immortal].icon}  ` : ''
    const n = new Map<Line, number>(), leg = this.perks.filter((o) => o.def.rarity === 'legend').length
    for (const o of this.perks) if (o.def.line !== 'common') n.set(o.def.line, (n.get(o.def.line) ?? 0) + Math.min(o.lv, 2))
    return (ev ? ev + '  ' : '') + r + im + (leg ? `🟠${leg} ` : '') + [...n].map(([l, k]) => `${LINES[l].icon}${k}`).join(' ')
  }

  private showGameOver() {
    const rewards = this.settle(false)
    this.panel([
      { text: this.timedOut ? 'หมดเวลา!' : 'ล้มแล้ว...', size: 44, color: '#ff7a7a', bold: true },
      ...(this.timedOut ? [{ text: `เกิน ${this.turnLimit} เทิร์นในการสู้ครั้งนี้ · ลองเพิ่มดาเมจ (ATK, คริ, พรสายโจมตี) ดูนะคะ`, size: 16, color: '#ffb0b0' }] : []),
      { text: `${this.run.where(this.room)} · ล้มมอนไป ${this.kills} ตัว`, size: 19 },
      { text: rewards, size: 19, color: '#f2b84b' },
      { text: 'ของที่เก็บมาไม่หาย! ลองซื้ออาวุธหรือลงแต้มสถานะที่เมือง แล้วมาใหม่นะ', size: 16, color: '#a9a6c7' },
    ], 'ลองอีกครั้ง', () => { void this.startRun() }, { label: 'กลับเมือง', onGo: () => go(this, 'hub') })
  }

  /** Tower: bank this floor's loot, then climb on (true) or leave (false). */
  private async floorCleared(f: number): Promise<boolean> {
    this.towerFloor = f
    if (this.run.modeId === 'tower' && recordTowerCheckpoint(save(), f, this.level, !!this.relic)) persist() // v87: level + relic of the first run to clear a checkpoint
    const loot = towerFloorLoot(f, save().baseLevel, this.roomDef(this.room) ?? undefined)
    this.bank.zeny += loot.zeny
    for (const [id, n] of Object.entries(loot.mats)) this.bank.mats[id] = (this.bank.mats[id] ?? 0) + n
    this.callout(`🗼 ผ่านชั้น ${f}! คลังรางวัล +${loot.zeny} zeny`, W / 2, 190)
    await this.wait(500)
    if (this.autoTower !== undefined) return f < this.autoTower // bot hook
    const next = f + 1, kind = next % 10 === 0 ? ' · ⚔️ ดวลต่อเนื่อง' : next % 5 === 0 ? ' · 👹 บอส' : ''
    const mats = Object.entries(this.bank.mats).map(([id, n]) => `${matName(id)} x${n}`).join(', ')
    const c = await this.choose({ name: `ผ่านชั้น ${f} แล้ว!`, icon: '🗼', desc: `คลังรางวัลชั้น: ${this.bank.zeny} zeny${mats ? ` · ${mats}` : ''}\nออกตอนนี้ได้ครบ · ล้มชั้นถัดไปได้แค่ครึ่ง` },
      [{ label: `⬆️ ขึ้นชั้น ${next}${kind}`, sub: 'มอนแกร่งขึ้นทุกชั้น' }, { label: '🏘️ กลับเมือง', sub: 'เก็บรางวัลชั้นครบ 100%' }])
    return c === 0
  }

  private showTowerLeave() {
    this.leftTower = true
    const rewards = this.settle(true)
    this.panel([
      { text: `🗼 ไต่ได้ถึงชั้น ${this.towerFloor}!`, size: 44, color: '#f2b84b', bold: true },
      { text: `${this.kills} ตัว · HP เหลือ ${this.hp} · build: ${this.buildText() || '-'} · Lv ${this.level}`, size: 17, color: '#a9a6c7' },
      { text: rewards, size: 19, color: '#f2b84b' },
    ], 'ไต่ใหม่', () => { void this.startRun() }, { label: 'กลับเมือง', onGo: () => go(this, 'hub') })
  }

  private showWin() {
    const secs = Math.round((this.time.now - this.startedAt) / 1000)
    const rewards = this.settle(true)
    this.panel([
      { text: this.hard ? '🔥 เคลียร์โหมดยากแล้ว!' : this.run.modeId === 'daily' ? '🎲 ผ่านท้าทายรายวัน!' : 'เคลียร์ดันแล้ว!', size: 44, color: '#f2b84b', bold: true },
      { text: `ล้ม${this.dg.boss}ได้ใน ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} นาที · ${this.kills} ตัว · HP เหลือ ${this.hp}`, size: 19 },
      { text: rewards, size: 19, color: '#f2b84b' },
      { text: `build: ${this.buildText() || '-'} · Lv ${this.level}`, size: 16, color: '#a9a6c7' },
    ], 'ลุยอีกรอบ', () => { void this.startRun() }, { label: 'กลับเมือง', onGo: () => go(this, 'hub') })
  }

  private panel(lines: { text: string; size: number; color?: string; bold?: boolean }[], label: string, onGo: () => void, alt: { label: string; onGo: () => void }) {
    this.overlay?.destroy()
    const c = this.add.container(W / 2, H / 2).setDepth(30000)
    c.add(this.add.rectangle(0, 0, W, H, COLORS.night, 0.82).setInteractive())
    // Long results (a deep tower run: many cards / mats / level-ups) must never push the buttons off screen (Q bug 2026-11-04):
    // every line wraps, and the whole block shrinks until text + buttons fit.
    const BTN = 90, room = H - 24
    let texts: Phaser.GameObjects.Text[] = []
    for (let k = 1; ; k *= 0.88) {
      texts.forEach((t) => t.destroy())
      texts = lines.map((l) => this.add.text(0, 0, l.text, { fontFamily: FONT_UI, fontSize: `${Math.max(11, Math.round(l.size * k))}px`, fontStyle: l.bold ? 'bold' : 'normal', color: l.color ?? '#f6eedc', align: 'center', lineSpacing: Math.round(6 * k), wordWrap: { width: W - 90, useAdvancedWrap: true } }).setOrigin(0.5, 0))
      const gap = Math.round(12 * k), total = texts.reduce((a, t) => a + t.height + gap, 0) + BTN
      if (total <= room || k < 0.45) {
        let y = Math.max(-H / 2 + 12, -total / 2)
        for (const t of texts) { t.setY(y); c.add(t); y += t.height + gap }
        y = Math.min(y, H / 2 - BTN) // buttons always on screen
        c.add(button(this, 140, y + 34, 240, 56, label, () => onGo(), { size: 22 }))
        c.add(button(this, -140, y + 34, 240, 56, alt.label, () => alt.onGo(), { size: 22, fill: 0x5a5f8a, color: '#f6eedc' }))
        break
      }
    }
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
    this.autoBtn = button(this, W - 250, H - 50, 124, 44, '', () => this.setAutoUlt(!this.autoUlt), { size: 15, fill: 0x2a2e50, color: '#f6eedc' }).setDepth(15003) as Btn
    this.autoBtn.setLabel(this.autoUlt ? '⚡ อัตโนมัติ' : '🖐️ กดเอง')
    this.fortuneTxt = this.add.text(W - 250, 34, '', { fontFamily: FONT_UI, fontSize: '14px', color: '#8fe08a', stroke: '#14172b', strokeThickness: 4 }).setDepth(15001)
    this.debuffTxt = this.add.text(22, 98, '', { fontFamily: FONT_UI, fontSize: '15px', color: '#ffb0e0', stroke: '#14172b', strokeThickness: 4 }).setDepth(15001)
    this.buffTxt = this.add.text(22, 98, '', { fontFamily: FONT_UI, fontSize: '15px', color: '#ffe08a', stroke: '#14172b', strokeThickness: 4 }).setDepth(15001)
    this.setFast(false)
  }

  // ---------- v86 MOBA-style skill buttons (docs/design/skill-buttons-v86.md) ----------
  private clearBookings() { this.book = { s1: false, s2: false, s3: false } }
  private s3Cost() { return Math.max(0, (this.j2?.skill3.cost ?? 0) - this.st.j2CmdCut) } // v82 Beastmaster คำสั่งไว

  /** (Re)build the cluster for the current job. The Novice keeps the old long smash button. */
  private buildSkillHud() {
    for (const b of this.skillBtns) { this.tweens.killTweensOf([b.c, b.ring, b.flash, ...(b.spin ? [b.spin] : [])]); b.c.destroy() }
    this.skillBtns = []
    this.skillTip?.destroy(); this.skillTip = undefined
    const nov = this.job.id === 'novice'
    this.smashBtn.setVisible(nov)
    if (!nov) this.smashBtn.disableInteractive()
    const s1 = slotCenter('s1', W, H)
    this.autoBtn?.setPosition(nov ? W - 250 : s1.x - s1.r - 10 - 62, nov ? H - 50 : H - 34)
    if (nov) return
    const slots: SkillSlot[] = []
    if (this.job.resource) slots.push('s1')
    if (this.s2) slots.push('s2')
    if (this.j2) slots.push('s3')
    slots.push('ult')
    this.skillBtns = slots.map((s) => this.makeSkillBtn(s))
    this.skillTip = this.add.text(W - 8, slotCenter('s3', W, H).y - 36, '', { fontFamily: FONT_UI, fontSize: '14px', fontStyle: 'bold', color: '#f6eedc', stroke: '#14172b', strokeThickness: 4, align: 'right' }).setOrigin(1, 1).setDepth(15004)
  }

  private makeSkillBtn(slot: SkillSlot): SkillBtnView {
    const { x, y, r } = slotCenter(slot, W, H), big = slot === 'ult'
    const base = this.add.graphics(), sweep = this.add.graphics(), ring = this.add.graphics(), bookRing = this.add.graphics()
    const flash = this.add.graphics(); flash.fillStyle(0xffffff, 1).fillCircle(0, 0, r).setAlpha(0)
    const t = (oy: number, size: number, color: string, font = FONT_NUM) => this.add.text(0, oy, '', { fontFamily: font, fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#14172b', strokeThickness: 3 }).setOrigin(0.5)
    const icon = this.add.text(0, big ? -6 : -3, '', { fontSize: big ? '36px' : '24px' }).setOrigin(0.5)
    const cd = t(0, big ? 38 : 26, '#ffffff'), cost = t(big ? r - 17 : r - 11, big ? 14 : 11, '#cfe8ff'), tag = t(-r + (big ? 13 : 9), big ? 12 : 10, '#ffd24a', FONT_UI)
    let spin: Phaser.GameObjects.Graphics | undefined
    if (big) { // Mage ult chant: a rotating magic ring (visible only while an 'ult' cast is charging)
      spin = this.add.graphics().setVisible(false)
      spin.lineStyle(3, 0xb48aff, 0.95)
      for (let i = 0; i < 10; i++) { const a0 = (i * Math.PI) / 5; spin.beginPath(); spin.arc(0, 0, r + 10, a0, a0 + (Math.PI / 5) * 0.55); spin.strokePath() }
      spin.fillStyle(0xe6d4ff, 1)
      for (let i = 0; i < 4; i++) spin.fillCircle(Math.cos((i * Math.PI) / 2) * (r + 10), Math.sin((i * Math.PI) / 2) * (r + 10), 3.5)
      this.tweens.add({ targets: spin, angle: 360, duration: 2200, repeat: -1 })
    }
    this.tweens.add({ targets: ring, alpha: { from: 0.35, to: 1 }, duration: 520, yoyo: true, repeat: -1 }) // ready glow
    const c = this.add.container(x, y, [base, icon, sweep, cd, cost, tag, flash, ring, bookRing, ...(spin ? [spin] : [])]).setDepth(15003)
    c.setSize(r * 2, r * 2).setInteractive(new Phaser.Geom.Circle(r, r, r), Phaser.Geom.Circle.Contains)
    if (c.input) c.input.cursor = 'pointer'
    const v: SkillBtnView = { slot, r, sig: '', c, base, sweep, ring, bookRing, spin, flash, icon, cd, cost, tag }
    c.on('pointerover', () => { const sp = this.skillSpec(slot); this.skillTip?.setText(`${sp.icon} ${sp.name}${sp.costTxt ? `  ${sp.costTxt}` : ''}`) })
    c.on('pointerout', () => { c.setScale(1); this.skillTip?.setText('') })
    c.on('pointerdown', () => c.setScale(0.94))
    c.on('pointerup', () => { c.setScale(1); unlock(); this.tapSkill(slot) })
    return v
  }

  /** What one button shows right now: the pure rules in battle/skill-hud.ts get these numbers. */
  private skillSpec(slot: SkillSlot): { in: SkillBtnIn; icon: string; name: string; costTxt: string } {
    const manual = !this.autoUlt, silent = this.hx.silence > 0, ri = resourceIcon(this.job.resource)
    const money = (n: number) => (n > 0 ? `${ri}${Math.round(n)}` : '')
    if (slot === 's1') {
      const cost = autoCost(this.job, this.st)
      return { in: { cdLeft: 0, cdMax: 0, cost, res: this.res, booked: this.book.s1, manual }, icon: this.job.auto.icon, name: this.job.auto.name, costTxt: money(cost) }
    }
    if (slot === 's2' && this.s2) {
      const k = this.s2
      return { in: { cdLeft: this.s2Cd, cdMax: s2Cooldown(k, this.st), cost: k.cost, res: this.res, booked: this.book.s2, manual, blocked: silent }, icon: k.icon, name: k.name, costTxt: money(k.cost) }
    }
    if (slot === 's3' && this.j2) {
      const sk = this.j2.skill3, cost = this.s3Cost(), monk = this.j2.id === 'monk', need = KIT2.monk.thunderMin
      return { in: { cdLeft: this.s3Cd, cdMax: sk.cd, cost, res: this.res, booked: this.book.s3, manual, blocked: silent || (monk && this.charges < need) }, icon: sk.icon, name: sk.name, costTxt: monk ? `🔵${this.charges}/${need}` : money(cost) }
    }
    const cost = this.ultCost(), u = this.job.ult
    return { in: { cdLeft: this.smashCdLeft, cdMax: Math.max(this.ultTurns(), this.smashCdLeft), cost, res: this.res, booked: this.smashQueued, manual, blocked: silent }, icon: u.icon, name: u.name, costTxt: money(cost) }
  }

  /** Called every frame, but only redraws a button whose signature changed (turn tick, resource crossing a cost, booking...). */
  private refreshSkillHud() {
    const chant = this.casts.some((c) => c.kind === 'ult')
    for (const v of this.skillBtns) {
      const sp = this.skillSpec(v.slot), s = skillButtonState(sp.in)
      const tag = s.booked ? 'จอง' : v.slot === 'ult' && !sp.in.manual && s.ready ? 'ออโต้' : ''
      const spin = v.slot === 'ult' && chant
      const sig = `${s.ready}|${s.short}|${s.greyed}|${s.sweep.toFixed(2)}|${s.turns}|${tag}|${sp.icon}|${sp.costTxt}|${spin}`
      if (sig === v.sig) continue
      v.sig = sig
      this.drawSkillBtn(v, s, sp.icon, sp.costTxt, tag, spin)
    }
  }

  private drawSkillBtn(v: SkillBtnView, s: SkillBtnOut, icon: string, costTxt: string, tag: string, spin: boolean) {
    const r = v.r
    v.base.clear()
      .fillStyle(0x000000, 0.35).fillCircle(0, 3, r)
      .fillStyle(s.greyed ? 0x20243e : v.slot === 'ult' ? 0x4a3a7a : 0x2f3560, 1).fillCircle(0, 0, r)
      .fillStyle(0xffffff, s.greyed ? 0.04 : 0.1).fillCircle(0, -r * 0.25, r * 0.7)
      .lineStyle(3, s.greyed ? 0x454c80 : 0xf4e6c8, 1).strokeCircle(0, 0, r)
    v.icon.setText(icon).setAlpha(s.greyed ? 0.55 : 1)
    v.sweep.clear()
    if (s.sweep > 0) {
      v.sweep.fillStyle(0x000000, 0.62)
      if (s.sweep >= 1) v.sweep.fillCircle(0, 0, r - 1)
      else { const a = sweepAngles(s.sweep); v.sweep.beginPath(); v.sweep.slice(0, 0, r - 1, a.from, a.to, false); v.sweep.fillPath() }
    }
    v.cd.setText(s.turns > 0 ? String(s.turns) : '')
    v.cost.setText(costTxt).setColor(s.short ? '#ff6b6b' : '#cfe8ff')
    v.tag.setText(tag).setColor(tag === 'จอง' ? '#ffd24a' : '#9fe3ff')
    v.ring.clear().setVisible(s.ready && !s.booked)
    if (s.ready && !s.booked) v.ring.lineStyle(3, 0x7ff0ff, 1).strokeCircle(0, 0, r + 3)
    v.bookRing.clear()
    if (s.booked) v.bookRing.lineStyle(4, 0xffd24a, 1).strokeCircle(0, 0, r + 3).lineStyle(2, 0xfff1b0, 0.9).strokeCircle(0, 0, r + 7)
    v.spin?.setVisible(spin)
  }

  /** Cast feedback: the button pops and flashes so the player SEES which skill just fired. */
  private popSkill(slot: SkillSlot) {
    const v = this.skillBtns.find((b) => b.slot === slot)
    if (!v) return
    this.tweens.killTweensOf([v.c, v.flash])
    v.c.setScale(1)
    this.tweens.add({ targets: v.c, scale: 1.28, duration: 110, yoyo: true, ease: 'Quad.easeOut' })
    v.flash.setAlpha(0.85)
    this.tweens.add({ targets: v.flash, alpha: 0, duration: 340 })
  }

  /** Tap: auto mode = hint only (the ult keeps its old tap = cancel / book); manual mode = toggle the booking. */
  private tapSkill(slot: SkillSlot) {
    if (this.over || this.paused) return
    if (slot === 'ult') { this.queueSmash(); return }
    if (tapAction(!this.autoUlt) === 'hint') { this.floatText(W - 200, H - 215, 'โหมดออโต้ — สลับเป็นกดเอง เพื่อจอง', '#a9a6c7'); return }
    this.book[slot] = !this.book[slot]
    if (this.book[slot]) sfx.pop()
  }

  /** Digit1-3 book Skill 1-3, Digit4 books the ult; manual mode only, never while a pick / pause overlay is up. */
  private skillHotkey(e: KeyboardEvent) {
    const slot = hotkeySlot(e.code)
    if (!slot || e.repeat || this.autoUlt || this.pendingPick || this.overlay || !this.skillBtns.some((b) => b.slot === slot)) return
    this.tapSkill(slot)
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
    if (this.shield + this.kyrie.hp > 0) g.fillStyle(0x9fe3ff, 0.75).fillRoundedRect(16, 14, Math.min(hpW, hpW * (this.shield + this.kyrie.hp) / this.st.maxHp), 6, 2) // + v77 Kyrie barrier
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
    if (this.dg.tier >= FORTUNE.minTier) { // Fortune meter (kept across runs): full = the next event is a JACKPOT
      const f = Math.min(1, (save().fortune ?? 0) / FORTUNE.max), bx = W - 228, by = 40, bw = 110
      g.fillStyle(COLORS.night, 0.8).fillRoundedRect(bx - 2, by - 2, bw + 4, 12, 4)
      g.fillStyle(f >= 1 ? 0xffd86b : 0x5fbf5a).fillRoundedRect(bx, by, Math.max(0, bw * f), 8, 3)
      this.fortuneTxt?.setText(f >= 1 ? '🍀 JACKPOT!' : '🍀').setPosition(f >= 1 ? bx - 4 : W - 250, by + (f >= 1 ? 10 : -6))
    } else this.fortuneTxt?.setText('')
    const left = this.turnLimit - this.fightTurns
    const affix = this.alive().find((m) => m.affix)?.affix
    this.hudTxt.room.setText(`${this.dg.level ? `Lv${this.roomDef(this.room)?.lv ?? roomLevel(this.dg.level, this.dg.rooms, this.room)}${this.hard ? ' 🔥ยาก' : ''} · ` : this.hard ? `🔥ยาก HP x${this.hardK.hp.toFixed(1)} ATK x${this.hardK.atk.toFixed(1)} · ` : ''}${this.run.corrupt ? `${this.run.corrupt.list.map((c) => c.icon).join('')} · ` : this.aff.defs.length ? `${this.aff.defs.map((a) => a.icon).join('')} · ` : ''}${this.run.where(this.room)} · ⏳ ${this.alive().length ? `${left}/${this.turnLimit} เทิร์น` : '-'}${affix ? `\n${affix}` : ''}`).setColor(this.alive().length && left <= 3 ? '#ff7a7a' : '#f6eedc').setPosition(18, this.job.resource ? 68 : 54)
    this.hudTxt.build.setText(this.buildText()).setY(14)
    const X = this.hx
    this.debuffTxt?.setText([X.poison > 0 ? `☠️${X.poison}` : '', X.burn > 0 ? `🔥${X.burn}` : '', X.weaken > 0 ? `💔${X.weaken}` : '', X.armorBreak > 0 ? `🛡️💥${X.armorBreak}` : '', X.silence > 0 ? `🤐${X.silence}` : '', X.web > 0 ? `🕸️${X.web}` : '', X.slow > 0 ? `💙${X.slow}` : '', X.thorn > 0 ? `❄️${X.thorn}` : '', X.venomTurns > 0 ? `🕷️${X.venomTurns}` : ''].filter(Boolean).join(' ')).setY(this.job.resource ? 92 : 78)
    { const B = this.buf, d = this.debuffTxt, k2i = this.s2?.icon ?? '' // v77: hero buffs (the picked Skill 2's icon + turns left; พรแสง adds Kyrie hits / Gloria)
      this.buffTxt?.setText([B.bless > 0 ? `${k2i}${B.bless}` : '', this.kyrie.hits > 0 ? `🛡️${this.kyrie.hits}` : '', B.bless > 0 && this.st.s2Star > 0 && this.s2?.id === 'cl_bless' ? '✨' : '',
        ...(['guard', 'blood', 'hawk', 'mshield', 'renew'] as const).map((k) => (B[k] > 0 ? `${k2i}${B[k]}` : ''))].filter(Boolean).join(' '))
        .setPosition(22 + (d && d.text ? d.width + 10 : 0), this.job.resource ? 92 : 78) }

    // monster HP bars + boss charge
    for (const m of this.mons) {
      if (m.dead || !m.spr.active) continue
      const w = Math.max(40, m.spr.displayWidth * 0.8), x = m.spr.x - w / 2, y = m.spr.y - m.spr.displayHeight - 12
      g.fillStyle(COLORS.night, 0.85).fillRect(x - 1, y - 1, w + 2, 8)
      g.fillStyle(m.def.ai === 'boss' ? COLORS.gold : COLORS.hp).fillRect(x, y, w * Math.max(0, m.hp / m.def.hp), 6)
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
    if (this.job.id !== 'novice') { this.refreshSkillHud(); return } // v86: the cluster replaces the long button
    const ready = this.smashCdLeft <= 0
    const u = this.job.ult
    const cost = this.ultCost(), short = cost > 0 && this.res < cost
    const tag = cost > 0 ? ` · 🔷${cost}` : ''
    this.smashBtn.setLabel(this.autoUlt && ready && !this.smashQueued && !short ? `${u.icon} ${u.name}\n${this.autoSkip ? 'ข้ามรอบนี้' : `ออโต้${tag}`}` : this.smashQueued ? (ready ? (short ? `รอ Mana\n${Math.floor(this.res)}/${cost}` : `${u.icon} ตาหน้า!\n(แตะยกเลิก)`) : `จองไว้แล้ว\nอีก ${this.smashCdLeft} เทิร์น`) : ready ? `${u.icon} ${u.name}\n${short ? `Mana ไม่พอ${tag}` : `พร้อม${tag}`}` : `${u.name}\nอีก ${this.smashCdLeft} เทิร์น`)
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
    total = Math.ceil(total)
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
    this.afterimage(0x9fe3ff, 26)
    this.tweens.add({ targets: this.heroSpr, x: HERO_X - 34, duration: 90, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { this.heroSpr.x = HERO_X } })
  }

  private damageNumber(x: number, y: number, n: number, crit: boolean, color?: string, heal = false) {
    n = Math.ceil(n) // safety net: never show a fraction
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

  private callout(text: string, x: number, y: number, color = '#f2b84b') {
    const t = this.add.text(x, y, text, { fontFamily: FONT_UI, fontSize: '22px', fontStyle: 'bold', color, stroke: '#14172b', strokeThickness: 6 }).setOrigin(0.5).setDepth(9999)
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
