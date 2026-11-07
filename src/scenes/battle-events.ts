// Post-wave events v2: the scene-side handlers (rules and numbers live in data/events.ts).
// BattleScene hands over a small EventHost, so this file never touches battle internals directly.
// Design: design/roadmap-and-events-v1.md.
import { COMMON_PERKS, type HitFx, type MonsterKind, type Stats } from '../data/game-data'
import { IMMORTAL_RULES, IMMORTALS, type ImmortalId } from '../data/perks'
import type { BaseStat } from '../data/meta'
import {
  CHECK_NAME, checkChance, EVENT_RULES as R, eventById, eventMon, FORTUNE, fortuneGain, jackpotFor, nextJackpot, rollEvent,
  SLOT_FACES, slotsResult, type CheckStat, type EventDef, type EventId, type SlotFace,
} from '../data/events'

export type Curse = 'frail' | 'hunted'
/** Per-run state the events leave behind (BattleScene reads some of it in fights). */
export interface RunFlags {
  last?: EventId
  clover: boolean // jackpot: every later event is rare, every check +20%
  allLegend: boolean // jackpot 777: every later 1-of-3 pick is legendary
  stars: boolean // jackpot 777: the next wave crits on every hit
  karma: number // traveler: the next event is rare with this chance
  curses: Curse[]
  curseDmg: number // monsters hit this much harder
  curseHp: number // max HP taken by the frail curse (given back on cleanse)
  elite: boolean // fork: the next wave is elite
  eliteReward: boolean // ...and pays out once it is cleared
  pendingFx: HitFx // trap / runes: lands on the hero when the next wave starts
  gems: number // gems given by events this run (capped)
}
export const newFlags = (): RunFlags => ({ clover: false, allLegend: false, stars: false, karma: 0, curses: [], curseDmg: 0, curseHp: 0, elite: false, eliteReward: false, pendingFx: {}, gems: 0 })

export interface Opt { label: string; sub: string; off?: boolean }
export interface Panel { icon: string; name: string; desc: string; rare?: boolean; tier?: EventDef['tier'] }

export interface EventHost {
  readonly tier: number
  readonly st: Stats
  readonly flags: RunFlags
  /** base stat incl. race + gear (what checks and LUK tiers read) */
  stat(k: BaseStat): number
  hp(): number
  zeny(): number
  /** next room is a normal wave (fork may make it elite) */
  nextIsWave(): boolean
  miniPool(): MonsterKind[]
  log(id: EventId): void
  /** bot / test hook: force this event */
  forced?(): EventId | undefined
  choose(p: Panel, opts: Opt[]): Promise<number>
  /** dice animation; resolves pass / fail */
  roll(label: string, chance: number): Promise<boolean>
  /** big centred text for a moment (slot reels, card reveal) */
  reveal(text: string, color?: string): Promise<void>
  perks(legend?: boolean): Promise<void>
  /** พร v2 🌈 immortal card this run (1 max), and granting one */
  immortal(): ImmortalId | null
  grantImmortal(id: ImmortalId): void
  applyMod(mod: Partial<Stats>): void
  heal(share: number): void
  /** lose a share of max HP; never kills */
  hurt(share: number): void
  gainZeny(n: number): void
  spend(n: number): void
  gainXp(n: number): void
  /** gems, capped per run; returns how many were given */
  gems(n: number): number
  /** a random card of this dungeon's monsters (or of `kind`) goes to the run's loot; returns its name */
  card(kind?: MonsterKind): string | undefined
  mat(boss: boolean, n: number): void
  fortune(): number
  setFortune(n: number): void
  addFortune(n: number, why?: string): void
  curse(c: Curse): void
  cleanse(): void
  shieldShare(share: number): void
  /** an event fight: never kills (stops at a loss of eventFightLoss of max HP), the monster runs after `turns` hero turns.
   * hp / dmg / def replace the monster's numbers; mul scales its own (ghost). share = HP share taken off it. */
  fight(kind: MonsterKind, o: { hp?: number; dmg?: number; def?: number; mul?: { hp: number; dmg: number }; turns: number; tint?: number; alpha?: number }): Promise<{ won: boolean; share: number }>
  say(text: string, color?: string): void
  sound(k: 'win' | 'door' | 'coin' | 'hurt' | 'pop'): void
  flash(big: boolean): void
}

const rint = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const pickOne = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
const shuffle = <T>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const pc = (x: number) => `${Math.round(x * 100)}%`
const chestZeny = (t: number) => rint(R.chestZeny[0] * t, R.chestZeny[1] * t)
const luk = (h: EventHost) => h.stat('luk')
const discount = (h: EventHost) => Math.min(R.merchantOffCap, luk(h) * R.merchantLukOff)
const bonus = (h: EventHost) => (h.flags.clover ? R.cloverCheck : 0)
const STAT_ICON: Record<CheckStat, string> = { str: '💪', agi: '🤸', dex: '🔍', int: '📖', wis: '🧘', luk: '🍀' }

/** Roll one stat check; a failed check feeds the Fortune meter. */
async function doCheck(h: EventHost, stat: CheckStat) {
  const ok = await h.roll(CHECK_NAME[stat], checkChance(stat, h.stat(stat), bonus(h)))
  if (!ok) h.addFortune(FORTUNE.failCheck, 'ปลอบใจ')
  return ok
}

/** The usual stat-check panel: [stat] / [LUK instead] / [walk past]. null = walked past. */
async function statEvent(h: EventHost, ev: EventDef, stat: CheckStat, verb: string, win: string, lose: string): Promise<boolean | null> {
  const cs = checkChance(stat, h.stat(stat), bonus(h)), cl = checkChance('luk', luk(h), bonus(h))
  const c = await h.choose(ev, [
    { label: `${STAT_ICON[stat]} ${verb} ${pc(cs)}`, sub: `ใช้ ${CHECK_NAME[stat]} ${h.stat(stat)}\nผ่าน: ${win}\nพลาด: ${lose}` },
    { label: `🍀 เสี่ยงดวง ${pc(cl)}`, sub: `ใช้ LUK ${luk(h)} แทน\nผลเหมือนกัน` },
    { label: '🚶 เดินผ่าน', sub: 'ไม่เสี่ยงดีกว่า' },
  ])
  if (c === 2) return null
  return doCheck(h, c === 0 ? stat : 'luk')
}

/** The better of [stat] and LUK, rolled straight away (for a second step inside an event). */
const bestOf = (h: EventHost, stat: CheckStat): CheckStat =>
  checkChance(stat, h.stat(stat), bonus(h)) >= checkChance('luk', luk(h), bonus(h)) ? stat : 'luk'

function randomCurse(h: EventHost) {
  const c: Curse = h.flags.curses.includes('frail') ? 'hunted' : h.flags.curses.includes('hunted') ? 'frail' : pickOne(['frail', 'hunted'] as const)
  h.curse(c)
}

type Handler = (h: EventHost, ev: EventDef) => Promise<void>
const HANDLERS: Record<EventId, Handler> = {
  // ---------------- common ----------------
  async camp(h, ev) {
    const c = await h.choose(ev, [
      { label: `🔥 พักฟื้น HP ${R.campHeal * 100}%`, sub: `ตอนนี้ HP ${Math.round(h.hp())}/${Math.round(h.st.maxHp)}` },
      { label: `⚔️ ซ้อมดาบ EXP +${R.campXp}`, sub: 'ได้พรครั้งถัดไปเร็วขึ้น' },
    ])
    if (c === 0) h.heal(R.campHeal)
    else { h.gainXp(R.campXp); h.say(`EXP +${R.campXp}`, '#7fd7ff') }
  },
  async chest(h, ev) {
    const mimic = R.mimicChance * (1 - Math.min(R.mimicCutCap, luk(h) * R.mimicLukCut))
    const c = await h.choose(ev, [
      { label: '🔓 เปิดหีบ', sub: `zeny + ลุ้นเพชร\nโอกาสเป็นมิมิค ${pc(mimic)} (LUK ลดได้)` },
      { label: '🚶 ไม่เปิด', sub: 'กลัวโดนงับ' },
    ])
    if (c === 1) return
    if (Math.random() < mimic) {
      h.say('😱 มิมิค! หีบงับ!', '#ff7a7a')
      const r = await h.fight('mimic', { ...eventMon('mimic', h.tier), turns: R.mimicTurns })
      if (r.won) { h.say('ล้มมิมิคได้! zeny x2', '#f2b84b'); h.gainZeny(chestZeny(h.tier) * 2) }
      return
    }
    h.gainZeny(chestZeny(h.tier))
    if (Math.random() < h.st.dropChance * R.chestGemChance && h.gems(1)) h.say('💎 เจอเพชร!', '#7fd7ff')
  },
  async shrine(h, ev) {
    const pool = shuffle([...COMMON_PERKS].filter((p) => !p.mod.revive)).slice(0, 2)
    const c = await h.choose(ev, pool.map((p) => ({ label: `⚪ ${p.name}`, sub: p.desc })))
    h.applyMod(pool[c].mod)
    h.say(`⛩️ ได้พร: ${pool[c].name}`)
  },
  async merchant(h, ev) {
    const d = discount(h), t = h.tier
    const potion = Math.round(R.potionCost * t * (1 - d)), card = Math.round(R.cardCost * t * (1 - d))
    const off = d > 0 ? ` (ลด ${pc(d)})` : ''
    const c = await h.choose(ev, [
      { label: `🧪 ยาฟื้น HP ${R.potionHeal * 100}%`, sub: `${potion} zeny${off}`, off: h.zeny() < potion },
      { label: '🙏 พร 1 ใน 3', sub: `${card} zeny${off}`, off: h.zeny() < card },
      { label: '👋 ไม่ซื้อ', sub: `มี ${h.zeny()} zeny` },
    ])
    if (c === 0) { h.spend(potion); h.heal(R.potionHeal) }
    if (c === 1) { h.spend(card); await h.perks() }
  },
  async spring(h, ev) {
    const good = Math.min(0.9, R.springGood + h.st.eventChance)
    const c = await h.choose(ev, [
      { label: '🥤 ดื่ม!', sub: `โชคดี ${pc(good)}: ฮีล ${R.springHeal * 100}% + ATK +${R.springAtk}` },
      { label: '🚶 เดินผ่าน', sub: 'ไม่เสี่ยงดีกว่า' },
    ])
    if (c === 1) return
    if (await h.roll('🍀 ดวง', good)) {
      h.heal(R.springHeal); h.applyMod({ atk: R.springAtk, matk: R.springAtk })
      h.say(`✨ สดชื่น! ATK +${R.springAtk}`)
    } else { h.hurt(R.springHurt); h.say('🤢 ท้องเสีย...', '#b48aff'); h.addFortune(FORTUNE.failCheck, 'ปลอบใจ') }
  },
  async slots(h, ev) {
    const cost = R.slotsCost * h.tier, nudge = luk(h) >= R.slotsLukNudge
    const c = await h.choose(ev, [
      { label: `🎰 หมุน! (${cost} zeny)`, sub: `คู่ = คืน ${cost * 2}\n🟢🟢🟢 = เพชร 3 · ⭐/💰 x3 = พรตำนาน\n🍀🍀🍀 = มาตรดวงเต็ม · 💀💀💀 = คำสาป` },
      { label: '👋 ไม่เล่น', sub: nudge ? 'LUK ถึงแล้ว: ช่องที่ไม่ตรงหมุนใหม่ได้ 1 ครั้ง' : `LUK ${R.slotsLukNudge}+ ได้สิทธิ์เคาะ 1 ช่อง` },
    ])
    if (c === 1) return
    h.spend(cost)
    const reels: SlotFace[] = [pickOne(SLOT_FACES), pickOne(SLOT_FACES), pickOne(SLOT_FACES)]
    await h.reveal(`🎰 ${reels.join(' ')}`)
    let res = slotsResult(reels)
    if (nudge && (res === 'pair' || res === 'none')) {
      const [a, b] = reels
      const i = res === 'pair' ? (a === b ? 2 : reels[1] === reels[2] ? 0 : 1) : 2
      reels[i] = pickOne(SLOT_FACES)
      await h.reveal(`🍀 เคาะ! ${reels.join(' ')}`, '#8fe08a')
      res = slotsResult(reels)
    }
    if (res === 'gems') { const n = h.gems(3); h.say(n ? `💎 แจ็กพอตเจลล็อป! เพชร +${n}` : 'เพชรเต็มโควตารอบนี้แล้ว รับ zeny แทน', '#7fd7ff'); if (!n) h.gainZeny(cost * 5) }
    else if (res === 'legend') { h.say('⭐ สามตัวเรียง! พรตำนาน', '#f2b84b'); await h.perks(true) }
    else if (res === 'jackpot') {
      if (h.tier >= FORTUNE.minTier) { h.setFortune(FORTUNE.max); h.say('🍀🍀🍀 มาตรดวงเต็ม! JACKPOT รออยู่', '#8fe08a') }
      else { h.say('🍀 สามใบ! พรตำนาน', '#8fe08a'); await h.perks(true) }
    } else if (res === 'curse') { h.say('💀💀💀 ซวยแล้ว...', '#b48aff'); randomCurse(h) }
    else if (res === 'pair') { h.say(`คู่! คืน ${cost * 2} zeny`, '#f2b84b'); h.gainZeny(cost * 2) }
    else { h.say('ไม่ได้อะไรเลย...', '#a9a6c7'); h.addFortune(FORTUNE.failCheck, 'ปลอบใจ') }
  },
  async cursed(h, ev) {
    const st = bestOf(h, 'wis')
    const c = await h.choose(ev, [
      { label: '⚰️ เปิดเลย!', sub: `zeny x${R.cursedZeny} + พร 1 ใน 3\nแล้วลุ้นต้านคำสาป (${CHECK_NAME[st]} ${pc(checkChance(st, h.stat(st), bonus(h)))})` },
      { label: '🚶 ไม่เอา', sub: 'ของต้องสาปไม่คุ้มหรอก' },
    ])
    if (c === 1) return
    h.addFortune(FORTUNE.risky, 'เสี่ยง')
    h.gainZeny(chestZeny(h.tier) * R.cursedZeny)
    await h.perks()
    if (await doCheck(h, st)) h.say('✨ ต้านคำสาปได้!', '#9fe3ff')
    else randomCurse(h)
  },
  async door(h, ev) {
    const ok = await statEvent(h, ev, 'str', 'งัดประตู', 'zeny + วัตถุดิบดันนี้ 1', `เสีย HP ${pc(R.hurtShare)}`)
    if (ok === null) return
    if (ok) { h.say('🚪 เปิดได้! ห้องลับ!', '#f2b84b'); h.gainZeny(chestZeny(h.tier) * R.doorZeny); h.mat(false, 1) }
    else { h.say('🤕 ประตูไม่ขยับ หลังเคล็ด...', '#ff7a7a'); h.hurt(R.hurtShare) }
  },
  async trap(h, ev) {
    const ok = await statEvent(h, ev, 'agi', 'ย่องผ่าน', 'zeny + ลุ้นเพชร', `ติดพิษ ${R.trapPoison} ชั้นตอนเริ่มเวฟถัดไป`)
    if (ok === null) return
    if (ok) {
      h.say('🤸 ผ่านฉลุย!', '#8fe08a'); h.gainZeny(chestZeny(h.tier))
      if (Math.random() < h.st.dropChance * R.chestGemChance && h.gems(1)) h.say('💎 เจอเพชร!', '#7fd7ff')
    } else { h.say('☠️ โดนลูกดอกพิษ!', '#a77be0'); h.flags.pendingFx.poison = (h.flags.pendingFx.poison ?? 0) + R.trapPoison }
  },
  async runes(h, ev) {
    const ok = await statEvent(h, ev, 'int', 'อ่านรูน', 'เลือกพรทั่วไปแรง x2 (1 ใน 2)', `ใบ้ ${R.runesSilence} เทิร์นตอนเริ่มเวฟถัดไป`)
    if (ok === null) return
    if (!ok) { h.say('🤐 รูนย้อนกลับ! พูดไม่ออก', '#ffb0e0'); h.flags.pendingFx.silence = Math.max(h.flags.pendingFx.silence ?? 0, R.runesSilence); return }
    const pool = shuffle([...COMMON_PERKS].filter((p) => !p.mod.revive)).slice(0, 2)
    const x2 = (m: Partial<Stats>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, (v as number) * 2])) as Partial<Stats>
    const c = await h.choose({ icon: '📜', name: 'อ่านออกแล้ว!', desc: 'เลือกพลังรูน 1 อย่าง (แรง x2 ติดตัวทั้งรอบ)', rare: true }, pool.map((p) => ({ label: `✦ ${p.name}`, sub: `${p.desc} (x2)` })))
    h.applyMod(x2(pool[c].mod)); h.say(`📜 พลังรูน: ${pool[c].name} x2`, '#f2b84b')
  },
  async blood(h, ev) {
    const cost = Math.round(h.st.maxHp * R.bloodCost)
    const c = await h.choose(ev, [
      { label: `🩸 ถวายเลือด`, sub: `HP -${cost} (ไม่ตาย)\nได้เลือกพร 1 ใน 3` },
      { label: '🚶 ไม่เอา', sub: `HP ตอนนี้ ${Math.round(h.hp())}/${Math.round(h.st.maxHp)}` },
    ])
    if (c === 1) return
    h.hurt(R.bloodCost)
    await h.perks()
  },
  async fork(h, ev) {
    const E = R.forkElite
    const c = await h.choose(ev, [
      { label: '🌿 ทางสงบ', sub: 'เวฟถัดไปปกติ' },
      { label: '🔥 ทางอันตราย', sub: `เวฟถัดไปเป็นมอนแกร่ง (HP x${E.hp} ตี x${E.dmg})\nชนะ: zeny x${R.forkZeny} + วัตถุดิบ 1 + มาตรดวง` },
    ])
    if (c === 0) return
    h.flags.elite = true
    h.addFortune(FORTUNE.risky, 'เสี่ยง')
    h.say('🔥 เลือกทางอันตราย!', '#ff8c42')
  },
  async traveler(h, ev) {
    const potion = R.potionCost * h.tier, boost = Math.min(0.95, R.travelerBoost + h.st.eventChance)
    const c = await h.choose(ev, [
      { label: '🩹 แบ่งเลือดให้', sub: `HP -${pc(R.travelerCost)} (ไม่ตาย)\nอีเวนต์ถัดไปหายาก ${pc(boost)}` },
      { label: '🧪 ให้ยา', sub: `${potion} zeny\nอีเวนต์ถัดไปหายาก ${pc(boost)}`, off: h.zeny() < potion },
      { label: '🚶 เดินผ่าน', sub: 'ขอโทษนะ...' },
    ])
    if (c === 2) return
    if (c === 0) h.hurt(R.travelerCost)
    else h.spend(potion)
    h.flags.karma = boost
    h.say('🙏 "ขอบคุณ! โชคดีนะ"', '#f6eedc')
  },
  // ---------------- rare ----------------
  async goldchest(h, ev) {
    await h.choose(ev, [{ label: '🔓 เปิดหีบทอง', sub: `zeny ก้อนใหญ่ + เพชร ${R.goldGems}` }])
    h.gainZeny(rint(R.goldZeny[0] * h.tier, R.goldZeny[1] * h.tier))
    const n = h.gems(R.goldGems); if (n) h.say(`💎 +${n}`, '#7fd7ff')
    const ok = await statEvent(h, { ...ev, name: 'ลิ้นชักลับใต้หีบ', desc: 'มีลิ้นชักลับล็อกอยู่ ข้างในมีการ์ดมอนส่องแสง' }, 'dex', 'ไขลิ้นชัก', 'การ์ดมอนดันนี้ 1 ใบ', 'ลิ้นชักล็อกตาย')
    if (ok) { const c = h.card(); if (c) h.say(`🃏 ได้${c}!`, '#f2b84b') }
  },
  async fairy(h, ev) {
    await h.choose(ev, [{ label: '🧚 รับพร', sub: 'เลือกพร 🟠 ตำนาน (ของสายที่มีอยู่แล้ว)' }])
    await h.perks(true)
  },
  async goldjellop(h, ev) {
    const c = await h.choose(ev, [
      { label: '⚔️ ไล่ตี!', sub: `ตีให้แตกใน ${R.goldJellopTurns} เทิร์น\nแตก: zeny x${R.goldJellopZeny} + วัตถุดิบบอส 1\nไม่ทัน: ได้ zeny ตามดาเมจ` },
      { label: '👀 ปล่อยไป', sub: 'มันน่ารักเกินจะตี' },
    ])
    if (c === 1) return
    const big = chestZeny(h.tier) * R.goldJellopZeny
    const r = await h.fight('goldjellop', { ...eventMon('goldjellop', h.tier), turns: R.goldJellopTurns })
    if (r.won) { h.say('✨ แตกกระจาย! zeny เพียบ', '#f2b84b'); h.gainZeny(big); h.mat(true, 1) }
    else { const n = Math.round(big * r.share * 0.5); h.say(`💨 หนีไปได้... เก็บเศษทองได้ ${n} zeny`, '#f2b84b'); if (n) h.gainZeny(n) }
  },
  async goddess(h, ev) {
    type Gift = { id: 'legend' | 'gems' | 'zeny' | 'empty'; label: string }
    const gifts = shuffle<Gift>([
      { id: 'legend', label: '🟠 พรตำนาน' }, { id: 'gems', label: '💎 เพชร 3' }, { id: 'zeny', label: '💰 zeny ก้อนโต' }, { id: 'empty', label: '💨 ว่างเปล่า' },
    ]).slice(0, 3)
    const peek = Math.min(2, Math.floor(luk(h) / R.goddessPeekPer))
    const c = await h.choose({ ...ev, desc: `${ev.desc}\nLUK ${luk(h)}: แอบดูได้ ${peek} ใบ${peek < 2 ? ` (ทุก ${R.goddessPeekPer} LUK = 1 ใบ)` : ''}` },
      gifts.map((g, i) => (i < peek ? { label: `👁️ ${g.label}`, sub: 'แอบดูแล้ว (LUK)' } : { label: `❓ การ์ดใบที่ ${i + 1}`, sub: 'ลุ้นเอา!' })))
    const g = gifts[c]
    await h.reveal(`🃏 ${g.label}`, g.id === 'empty' ? '#a9a6c7' : '#f2b84b')
    if (g.id === 'legend') await h.perks(true)
    else if (g.id === 'gems') { const n = h.gems(3); if (!n) h.gainZeny(chestZeny(h.tier) * 3) }
    else if (g.id === 'zeny') h.gainZeny(chestZeny(h.tier) * 5)
    else h.addFortune(FORTUNE.failCheck, 'ปลอบใจ')
  },
  async market(h, ev) {
    const d = discount(h), t = h.tier, off = d > 0 ? ` (ลด ${pc(d)})` : ''
    const perk = Math.round(R.marketPerk * t * (1 - d)), card = Math.round(R.marketCard * t * (1 - d)), fix = Math.round(R.marketCleanse * t * (1 - d))
    const cursed = h.flags.curses.length > 0
    const c = await h.choose(ev, [
      { label: '🟠 พรตำนาน', sub: `${perk} zeny${off}`, off: h.zeny() < perk },
      { label: '🃏 การ์ดดันนี้', sub: `${card} zeny${off}`, off: h.zeny() < card },
      cursed ? { label: '🕯️ ล้างคำสาป', sub: `${fix} zeny${off}`, off: h.zeny() < fix } : { label: '🧪 ยาเต็มหลอด', sub: `ฮีล 100% · ${fix} zeny${off}`, off: h.zeny() < fix },
      { label: '👋 ไป', sub: `มี ${h.zeny()} zeny` },
    ])
    if (c === 0) { h.spend(perk); await h.perks(true) }
    if (c === 1) { h.spend(card); const n = h.card(); if (n) h.say(`🃏 ได้${n}!`, '#f2b84b') }
    if (c === 2) { h.spend(fix); if (cursed) h.cleanse(); else h.heal(1) }
  },
  async ghost(h, ev) {
    const kind = pickOne(h.miniPool())
    const c = await h.choose(ev, [
      { label: '⚔️ รับคำท้า', sub: `ดวลร่างวิญญาณ (HP x${R.ghostMul.hp} ตี x${R.ghostMul.dmg})\nชนะ: การ์ดของมันแน่นอน\nแพ้: เสีย HP ไม่เกิน ${pc(R.eventFightLoss)}` },
      { label: '🙏 ขอผ่าน', sub: 'วันนี้ไม่ไหวจริงๆ' },
    ])
    if (c === 1) return
    const r = await h.fight(kind, { mul: R.ghostMul, turns: R.ghostTurns, tint: 0x9fb8ff, alpha: 0.75 })
    if (r.won) { const n = h.card(kind); if (n) h.say(`🃏 ได้${n}!`, '#f2b84b'); else h.mat(true, 1) }
    else h.say('👻 วิญญาณจางหายไป...', '#9fb8ff')
  },
  // ---------------- rare: พร v2 🌈 immortal cards ----------------
  async altar(h, ev) {
    const cost = R.altarZeny * h.tier, A = IMMORTALS.angel
    const cs = checkChance('wis', h.stat('wis'), bonus(h))
    const c = await h.choose(ev, [
      { label: `💰 ถวาย ${cost} zeny`, sub: `ได้ ${A.icon} ${A.name} แน่นอน\n${A.desc}`, off: h.zeny() < cost },
      { label: `🧘 ภาวนา ${pc(cs)}`, sub: `ใช้ WIS ${h.stat('wis')}\nผ่าน: ได้ ${A.icon} ${A.name}\nพลาด: ไม่ได้อะไร` },
      { label: '🚶 เดินผ่าน', sub: 'ไม่ต้องการพร' },
    ])
    if (c === 2) return
    if (c === 0) h.spend(cost)
    else if (!(await doCheck(h, 'wis'))) { h.say('แสงจางหายไป...', '#a9a6c7'); return }
    h.grantImmortal('angel')
  },
  async darkmirror(h, ev) {
    const D = IMMORTALS.demon
    const c = await h.choose(ev, [
      { label: '🖐️ ยื่นมือเข้าไป', sub: `ได้ ${D.icon} ${D.name}\n${D.desc}\nแลกกับ: HP สูงสุด −${pc(IMMORTAL_RULES.demonHpCost)} จนจบรอบ` },
      { label: '🚶 ไม่แตะ', sub: 'เงานั่นดูไม่น่าไว้ใจ' },
    ])
    if (c === 1) return
    h.grantImmortal('demon')
  },
  async nest(h, ev) {
    const E = IMMORTALS.egg
    const c = await h.choose(ev, [
      { label: '⚔️ สู้แม่นก', sub: `ชนะ: ได้ ${E.icon} ${E.name}\n${E.desc}\nแพ้: เสีย HP ไม่เกิน ${pc(R.eventFightLoss)}` },
      { label: '🚶 ปล่อยไว้', sub: 'แม่นกดุเกินไป' },
    ])
    if (c === 1) return
    const mon = eventMon('mimic', h.tier) // scaled by dungeon tier (the gargoyle's own DEF 90 is a D3 wall)
    const r = await h.fight('gargoyle', { ...mon, hp: Math.round(mon.hp * R.nestHp), turns: R.nestTurns, tint: 0xffd86b })
    if (r.won) h.grantImmortal('egg')
    else h.say('🐣 แม่นกไล่เราออกมา...', '#a9a6c7')
  },
  // ---------------- jackpot ----------------
  async vault(h, ev) {
    type Loot = { id: 'legend' | 'zeny' | 'gems' | 'heal'; label: string; sub: string }
    const all: Loot[] = [
      { id: 'legend', label: '🟠 พรตำนาน', sub: 'เลือกพรตำนานของสายที่มี' },
      { id: 'zeny', label: `💰 zeny x${R.vaultZeny}`, sub: 'กองทองท่วมหัว' },
      { id: 'gems', label: `💎 เพชร ${R.vaultGems}`, sub: 'เก็บไว้ซื้อชุด/ซ่อมของ' },
      { id: 'heal', label: '💖 ฟื้นเต็ม + โล่', sub: `ฮีล 100% + โล่ ${pc(R.vaultShield)}` },
    ]
    const hint = nextJackpot(luk(h))
    const desc = `${ev.desc}${hint ? `\n(LUK ${hint.minLuk}+ จะได้ ${hint.icon} ${hint.name} แทน)` : ''}`
    for (let k = 0; k < 2; k++) {
      const c = await h.choose({ ...ev, desc: k === 0 ? desc : 'เลือกอีก 1 อย่าง!' }, all.map((l) => ({ label: l.label, sub: l.sub })))
      const l = all.splice(c, 1)[0]
      if (l.id === 'legend') await h.perks(true)
      else if (l.id === 'zeny') h.gainZeny(chestZeny(h.tier) * R.vaultZeny)
      else if (l.id === 'gems') { const n = h.gems(R.vaultGems); if (!n) h.gainZeny(chestZeny(h.tier) * 3) }
      else { h.heal(1); h.shieldShare(R.vaultShield) }
    }
  },
  async mimicking(h, ev) {
    const c = await h.choose(ev, [
      { label: '⚔️ สู้!', sub: `ชนะ: การ์ดดันนี้ 1 ใบแน่นอน + zeny x${R.kingZeny}\nแพ้: เสีย HP ไม่เกิน ${pc(R.eventFightLoss)} แล้วมันหนีไป` },
      { label: '🏦 ไม่สู้ เปิดห้องสมบัติแทน', sub: 'รับห้องสมบัติลับ (เลือก 2 อย่าง)' },
    ])
    if (c === 1) { await HANDLERS.vault(h, jackpotFor(0)); return }
    const r = await h.fight('mimicking', { ...eventMon('mimicking', h.tier), turns: R.kingTurns })
    if (!r.won) { h.say('👑 ราชามิมิคหนีไปแล้ว...', '#a9a6c7'); h.gainZeny(chestZeny(h.tier)); return }
    h.say('👑 ล้มราชามิมิค!', '#f2b84b')
    h.gainZeny(chestZeny(h.tier) * R.kingZeny)
    const n = h.card(); if (n) h.say(`🃏 ได้${n}!`, '#f2b84b')
  },
  async clover(h, ev) {
    await h.choose(ev, [{ label: '🍀 รับโชค!', sub: `ทั้งรอบนี้: ทุกอีเวนต์เป็นหายาก\nทุกการลุ้น +${pc(R.cloverCheck)} · และได้พรตำนาน 1 ใน 3 ตอนนี้` }])
    h.flags.clover = true
    await h.perks(true)
  },
  async stars(h, ev) {
    await h.choose(ev, [{ label: '🌠 777!', sub: `เวฟถัดไป: ทุกการโจมตีคริ\nพรที่เหลือทั้งรอบเป็นตำนาน · เพชร +${R.starsGems}` }])
    h.flags.stars = true; h.flags.allLegend = true
    const n = h.gems(R.starsGems); if (n) h.say(`💎 +${n}`, '#7fd7ff')
  },
}

/** One post-wave event: jackpot if the Fortune meter is full, else a rare / common roll. */
export async function runPostWaveEvent(h: EventHost) {
  const F = h.flags, meterOn = h.tier >= FORTUNE.minTier
  let ev: EventDef
  const forced = h.forced?.()
  if (forced) ev = eventById(forced)
  else if (meterOn && h.fortune() >= FORTUNE.max) { ev = jackpotFor(luk(h)); h.setFortune(0) }
  else {
    let rare = F.clover ? 1 : h.st.eventChance
    if (F.karma > 0) { rare = Math.max(rare, F.karma); F.karma = 0 }
    const potion = Math.round(R.potionCost * h.tier * (1 - discount(h)))
    ev = rollEvent(rare, h.tier, { canShop: h.zeny() >= potion, canSpin: h.zeny() >= R.slotsCost * h.tier, canFork: h.nextIsWave(), canImmortal: !h.immortal(), last: F.last })
    if (meterOn) h.addFortune(fortuneGain(luk(h)))
  }
  F.last = ev.id
  h.log(ev.id)
  if (ev.tier === 'common') h.sound('door')
  else { h.sound('win'); h.flash(ev.tier === 'jackpot') }
  await HANDLERS[ev.id](h, ev)
}
