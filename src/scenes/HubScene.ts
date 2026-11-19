import Phaser from 'phaser'
import { COLORS, DUNGEONS, H, HARD, W } from '../data/game-data'
import type { BiomeHazardId } from '../data/biome-hazards'
import { TOWER_LV, towerMonLv } from '../data/mon-stats'
import { foldCorruptions, rollCorruptions } from '../data/corruptions'
import { heroPower, TOWER_POWER } from '../data/power'
import { FREE_GEMS, isBroken, itemById, JOB_RULES, noviceLeft, RACES, STAT_RULES } from '../data/meta'
import { canChangeJob, canChangeJob2, persist, save, today, ultMode, wipe, job3Ready } from '../save'
import { activeJob3, job3Of } from '../data/jobs3'
import { JOB_CHANGE, JOBS } from '../data/jobs'
import { JOB2, JOB2_RULES, job2Of } from '../data/jobs2'
import { BOUNTY, bountyOf, DAILY, dailyOf, dailySeed, deepDailyOk, MODES, PANEL_MODES, TOWER, towerCatchUp, towerCheckpoints, towerSkipCheck, towerSkipGems, weeklySeed, type ModeArgs } from '../data/modes'
import { matName, taintDrop } from '../data/materials'
import { daysOf } from '../data/dungeon-days'
import { TAINT_MAT } from '../data/taint'
import { RIFT_TUNING } from '../data/rift'
import { cloudEnabled } from '../cloud'
import { setMuted } from '../sfx'
import { askRepick } from './JobScene'
import { backdrop, button, confirm, fullscreenButton, go, panel, toast, topBar, txt, UI } from '../ui'
import { fitHeroScale, heroCostumeTint, heroTex } from '../gfx/hero-visual'
import { ftue } from '../analytics'
import { HELL, HELL_MODE, hellLvCap, hellOpen } from '../data/hell'

const BIOME_BADGE: Record<Exclude<BiomeHazardId, 'none'>, { icon: string; label: string; color: string; bg: number; stroke: number }> = {
  clockwork_heat: { icon: '⚙️', label: 'เตาหลอมคลั่ง', color: '#ffbe7b', bg: 0x3a2012, stroke: 0xb86a2c },
  abyssal_pressure: { icon: '🌊', label: 'แรงดันห้วงลึก', color: '#8ad8ff', bg: 0x102a42, stroke: 0x2f7aa8 },
  astral_eclipse: { icon: '🌑', label: 'สุริยคราสมิติ', color: '#e2b8ff', bg: 0x26143d, stroke: 0x8048b8 },
}

// Town / main menu. Everything branches from here and every run comes back here.
export class HubScene extends Phaser.Scene {
  constructor() { super('hub') }
  /** v78 D7-D10: dungeon list page (5 per page once there are more than 6). undefined = the page of the newest unlocked dungeon. */
  private static dgPage?: number

  create(data: { fresh?: boolean }) {
    backdrop(this)
    const s = save()
    const refreshWallet = topBar(this, '🏘️ เมืองเริ่มต้น')
    fullscreenButton(this, W - 30, 86)

    // ---- character card (left) ----
    panel(this, 24, 76, 380, 476)
    const hero = this.add.image(214, 210, heroTex(s)).setTint(heroCostumeTint(s.costume))
    hero.setScale(fitHeroScale(hero.width, hero.height, 3.2, 180))
    this.add.image(214, 282, 'shadow').setScale(1.4, 1.6).setDepth(-1)
    this.tweens.add({ targets: hero, y: 200, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    const nameColor = s.supporter ? UI.gold : UI.text
    txt(this, 214, 312, `${s.supporter ? '🌟 ' : ''}${s.name}`, 26, nameColor, true).setOrigin(0.5)
    txt(this, 214, 346, `${RACES[s.race].icon} ${RACES[s.race].name} · ${s.job2 ? `${JOB2[s.job2].icon} ${JOB2[s.job2].name}` : `${JOBS[s.job].icon} ${JOBS[s.job].name}`}`, 17, UI.sub).setOrigin(0.5)
    const bar = (y: number, label: string, cur: number, need: number, color: number, max: boolean) => {
      txt(this, 52, y, label, 15, UI.text, true)
      const g = this.add.graphics()
      g.fillStyle(0x10132a).fillRoundedRect(150, y + 2, 226, 16, 6)
      g.fillStyle(color).fillRoundedRect(150, y + 2, max ? 226 : Math.max(6, 226 * Math.min(1, cur / need)), 16, 6)
      txt(this, 263, y + 10, max ? 'MAX' : `${cur}/${need}`, 12, UI.text).setOrigin(0.5)
    }
    bar(378, `Base Lv ${s.baseLevel}`, s.baseXp, STAT_RULES.baseXpNeed(s.baseLevel), 0x7fd7ff, false)
    const jobMax = s.jobLevel >= (s.job === 'novice' ? JOB_RULES.maxJobLevel : JOB_CHANGE.classMaxJobLevel)
    if (s.job2) { const l2 = s.job2Level ?? 1; bar(406, `Job2 Lv ${l2}`, s.job2Xp ?? 0, JOB_RULES.jobXpNeed(l2), 0xf2b84b, l2 >= JOB2_RULES.maxJobLevel) }
    else bar(406, `Job Lv ${s.jobLevel}`, s.jobXp, JOB_RULES.jobXpNeed(s.jobLevel), 0x6fd08c, jobMax)
    const notes: string[] = []
    if (s.statPoints > 0) notes.push(`มีแต้มสถานะ ${s.statPoints}`)
    if (s.skillPoints > 0) notes.push(`มีแต้มสกิล ${s.skillPoints}`)
    if (noviceLeft(s.skills) > 0) notes.push(`มีแต้มโนวิส ${noviceLeft(s.skills)}`)
    if ((s.job2Points ?? 0) > 0) notes.push(`มีแต้มใยชั้น 2 ${s.job2Points}`)
    if (activeJob3(s) && (s.job3Points ?? 0) > 0) notes.push(`มีแต้มใยชั้น 3 ${s.job3Points}`)
    const awaken = s.job2 ? job3Of(s.job2) : undefined // ⚜️ 3rd job ready (Master Trial passed) but not taken yet
    if (canChangeJob(s)) {
      const jb = button(this, 214, 448, 300, 44, '🎓 เปลี่ยนอาชีพได้แล้ว!', () => go(this, 'job'), { size: 18 })
      this.tweens.add({ targets: jb, scale: 1.05, duration: 600, yoyo: true, repeat: -1 })
    } else if (canChangeJob2(s) && job2Of(s.job).length) { // 2nd job: Job Lv 40 + ดัน 5 (design/second-jobs-v1.md)
      const jb = button(this, 214, 448, 300, 44, '⭐ อาชีพขั้น 2 ได้แล้ว!', () => go(this, 'job', { job2: true }), { size: 18 })
      this.tweens.add({ targets: jb, scale: 1.05, duration: 600, yoyo: true, repeat: -1 })
    } else if (awaken && job3Ready(s, awaken.id) && !activeJob3(s)) {
      const jb = button(this, 214, 448, 300, 44, `${awaken.icon} ตื่นรู้ได้แล้ว!`, () => go(this, 'job', { job3: true }), { size: 18 })
      this.tweens.add({ targets: jb, scale: 1.05, duration: 600, yoyo: true, repeat: -1 })
    } else if (s.job !== 'novice') { // v52: re-pick another class for gems
      if (notes.length) txt(this, 214, 432, `✨ ${notes.join(' · ')}`, 13, UI.gold).setOrigin(0.5)
      button(this, 214, notes.length ? 459 : 450, 280, 34, `🔄 เปลี่ยนอาชีพใหม่ 💎${JOB_CHANGE.repickGems}`, () => askRepick(this), { size: 15, fill: 0x4a5a8a, color: UI.text })
    } else txt(this, 214, 446, notes.length ? `✨ ${notes.join(' · ')}` : `เคลียร์ดัน ${s.clears} ครั้ง`, 15, notes.length ? UI.gold : UI.sub).setOrigin(0.5).setAlign('center').setWordWrapWidth(340)
    button(this, 214, 506, 330, 52, '👤 ตัวละคร / อุปกรณ์ / สถานะ', () => go(this, 'character'), { fill: 0x5a5f8a, color: UI.text, size: 18 })

    // ---- adventure (right top): one row per dungeon ----
    panel(this, 428, 76, 508, 240, 0x2a3358)
    txt(this, 452, 84, '⚔️ ผจญภัย', 20, UI.gold, true)
    const power = heroPower(s) // v59: one number monsters scale to (data/power.ts)
    txt(this, 916, 88, `⚡ Hero Power ${power}`, 15, UI.gold, true).setOrigin(1, 0)
    const by = s.clearsBy ?? { d1: s.clears }
    const isLocked = (d: (typeof DUNGEONS)[number]) => (d.unlock === 'job' && s.job === 'novice') || (d.unlock.startsWith('d') && !(by[d.unlock] > 0))
    const prevName = (u: string) => DUNGEONS.find((x) => x.id === u)?.name ?? u
    // v78: more than 6 dungeons -> pages of 5 (◀ D1-5 / D6-10 ▶), opening on the newest unlocked one
    const per = DUNGEONS.length > 6 ? 5 : DUNGEONS.length, pages = Math.ceil(DUNGEONS.length / per)
    const newest = Math.max(0, DUNGEONS.reduce((a, d, i) => (isLocked(d) ? a : i), 0))
    const page = Math.min(pages - 1, HubScene.dgPage ?? Math.floor(newest / per))
    if (pages > 1) {
      const flip = (to: number) => { HubScene.dgPage = (to + pages) % pages; this.scene.restart() }
      button(this, 600, 98, 34, 26, '◀', () => flip(page - 1), { size: 13, fill: 0x4a5a8a, color: UI.text })
      txt(this, 650, 98, `ดัน ${page * per + 1}-${Math.min(DUNGEONS.length, (page + 1) * per)}`, 13, UI.sub, true).setOrigin(0.5)
      button(this, 700, 98, 34, 26, '▶', () => flip(page + 1), { size: 13, fill: 0x4a5a8a, color: UI.text })
    }
    const rowH = Math.min(66, Math.floor(200 / per)) // 5+ dungeons: compact rows (6 = 33px)
    const compact = rowH < 60
    DUNGEONS.forEach((d, i) => {
      if (Math.floor(i / per) !== page) return
      const y = 112 + (i % per) * rowH
      const locked = isLocked(d)
      const n = by[d.id] ?? 0
      const mini = d.rooms.some((r) => r.mini)
      const nDays = daysOf(d) // ☀️ dungeon days (data/dungeon-days.ts)
      const info = nDays ? `☀️ ${nDays} วัน · ศึกท้ายวัน 🌙 · บอส${d.boss}` : `${d.rooms.length - 1 - (mini ? 1 : 0)} เวฟ${mini ? ' + ดวล 1-1' : ''} + บอส${d.boss}`
      const lockMsg = d.unlock === 'job' ? '🔒 ปลดล็อกหลังเปลี่ยนอาชีพ' : `🔒 ปลดล็อกหลังเคลียร์${prevName(d.unlock)}`
      const status = locked ? (compact ? '🔒 ล็อก' : lockMsg) : n ? `เคลียร์แล้ว ${n} ครั้ง` : compact ? `ครั้งแรก 💎${FREE_GEMS.firstClear}` : `เคลียร์ครั้งแรกได้เพชร ${FREE_GEMS.firstClear}`
      const nameT = txt(this, 452, y, `${i + 1}. ${d.name}${d.tier >= 4 ? ' 💀' : ''}`, compact ? 15 : 17, locked ? UI.sub : UI.text, true)
      const maxRight = n > 0 ? 718 : 786
      if (d.level) { // fixed monster level (data/mon-stats.ts; v126: D1-D5 too) · v128: no drop cut for a high hero any more
        const low = s.baseLevel < d.level[0], lvX = nameT.x + nameT.width + 8
        const lvT = txt(this, lvX, y + 2, `มอน Lv${d.level[0]}-${d.level[1]}`, 12, low ? '#ff7a7a' : '#9fe3a0', true)
        if (lvX + lvT.width > maxRight) lvT.setFontSize(11)
      }
      const hb = (s.hardClearsBy ?? {})[d.id] ?? 0, hl = (s.hellClearsBy ?? {})[d.id] ?? 0, hellOn = hellOpen(s, d) // 😈 hell mode (v129: D1-D5 too)
      const hazard = d.hazard && d.hazard !== 'none' ? BIOME_BADGE[d.hazard] : undefined
      if (compact) {
        let lineX = 452
        if (hazard) {
          const pill = this.add.graphics()
          const badgeT = txt(this, lineX + 5, y + 19, `${hazard.icon} ${hazard.label}`, 10, hazard.color, true)
          if (locked) badgeT.setAlpha(0.65)
          const pillW = Math.ceil(badgeT.width) + 10
          pill.fillStyle(hazard.bg, locked ? 0.45 : 0.95)
          pill.lineStyle(1, hazard.stroke, locked ? 0.45 : 0.9)
          pill.fillRoundedRect(lineX, y + 17, pillW, 16, 4)
          pill.strokeRoundedRect(lineX, y + 17, pillW, 16, 4)
          lineX += pillW + 6
        }
        const counts = `${hb ? `🔥${hb} ` : ''}${hl ? `😈${hl} ` : ''}`
        const line2 = hazard ? `${counts}${status} · ${info}` : `${counts}${info} · ${status}`
        txt(this, lineX, y + 19, line2, 11, locked ? '#ff9a9a' : n ? UI.sub : UI.gem).setWordWrapWidth(Math.max(80, maxRight - lineX)).setMaxLines(1) // counts first: a long line is cut, not spilled into the next row
      } else {
        let infoX = 452
        if (hazard) {
          const pill = this.add.graphics()
          const badgeT = txt(this, infoX + 6, y + 23, `${hazard.icon} ${hazard.label}`, 11, hazard.color, true)
          if (locked) badgeT.setAlpha(0.65)
          const pillW = Math.ceil(badgeT.width) + 12
          pill.fillStyle(hazard.bg, locked ? 0.45 : 0.95)
          pill.lineStyle(1, hazard.stroke, locked ? 0.45 : 0.9)
          pill.fillRoundedRect(infoX, y + 21, pillW, 18, 4)
          pill.strokeRoundedRect(infoX, y + 21, pillW, 18, 4)
          infoX += pillW + 6
        }
        txt(this, infoX, y + 22, info, 13, UI.sub)
        txt(this, 452, y + 40, status, 13, locked ? '#ff9a9a' : n ? UI.sub : UI.gem)
      }
      const b = button(this, 856, y + (compact ? 18 : 26), 130, compact ? 34 : 50, locked ? '🔒' : 'ลุย!', () => {
        // playtest: a locked dungeon still opens, after a warning
        const why = d.unlock === 'job' ? 'แนะนำให้เคลียร์ดัน 1 แล้วเปลี่ยนอาชีพก่อน\nโนวิสจะยากมาก' : `แนะนำให้เคลียร์${prevName(d.unlock)}ก่อน มอนแรงมาก`
        // broken gear (failed refine) gives nothing: say so in red before the run (design 3.5)
        const broken = Object.values(s.equipped).filter((id, k, all) => isBroken(s, id) && all.indexOf(id) === k).map((id) => itemById(id).name)
        const start = () => {
          if (!broken.length) { go(this, 'battle', { d: i }); return }
          const c = confirm(this, '💔 มีของแตกอยู่', `${broken.join(', ')} แตกอยู่ ไม่ได้ค่าพลังและการ์ด\nซ่อมได้ที่ 🔨 โรงตีเหล็ก`, 'ลุยเลย', () => go(this, 'battle', { d: i }), 'ยังก่อน')
          ;(c.list[3] as Phaser.GameObjects.Text).setColor('#ff8a8a') // body text in red (design 3.5)
          ;(c.list[2] as Phaser.GameObjects.Text).setColor('#ff6b6b')
        }
        if (locked) { confirm(this, `${d.name} ยังล็อกอยู่`, `${why} (โหมดทดสอบ: ลองได้)`, 'ลองเลย', start); return }
        start()
      }, { size: compact ? 17 : 20, fill: locked ? 0x4a4e6e : undefined, color: locked ? UI.sub : undefined })
      if (n > 0 && d.level) { // hard (v126: every dungeon): +50% monster stat points + a PoE-style corruption roll shown before the run
        const seed = Math.floor(Math.random() * 1e9), cr = foldCorruptions(rollCorruptions(seed))
        button(this, hellOn ? 739 : 756, y + (compact ? 18 : 26), hellOn ? 32 : 62, compact ? 34 : 50, hellOn ? '🔥' : '🔥ยาก', () => confirm(this, `🔥 โหมดยาก · ${d.name}`,
          `มอน Lv${d.level![0]}-${d.level![1]} เท่าเดิม แต่แต้มสถานะ +50% (ธรรมดา 100% · มินิ 150% · บอส 200%)\nบอส/มินิบอสสุ่มสกิล + passive\n☠️ Corruption: ${cr.list.map((c) => `${c.icon} ${c.name} (${c.desc})`).join('\n')}\nรางวัล zeny/EXP x${(HARD.reward * cr.reward).toFixed(2)} · วัตถุดิบ x${(HARD.mats * cr.reward).toFixed(2)}`,
          'ลุยเลย', () => go(this, 'battle', { d: i, hard: true, seed }), 'ยังก่อน'), { size: 14, fill: 0x5a1a4a, color: UI.text })
        if (hellOn) { // 😈 hell mode (data/hell.ts HELL_MODE): opens after a 🔥 hard clear of this dungeon
          const hs = Math.floor(Math.random() * 1e9), hc = foldCorruptions(rollCorruptions(hs)), cap = hellLvCap(d)
          const capLine = cap === Infinity ? '' : `\n${s.baseLevel > cap ? '⚠️ ' : ''}Lv เกิน ${cap}: ได้ EXP แค่ ${Math.round(HELL_MODE.overLvXp * 100)}%`
          button(this, 774, y + (compact ? 18 : 26), 32, compact ? 34 : 50, '😈', () => confirm(this, `😈 โหมดนรก · ${d.name}`,
            `โหมดยาก + มอนทุกตัวเป็นร่างนรก: Lv +${HELL_MODE.lv} · HP x${HELL.hp} · ATK x${HELL.atk} · สุ่มพลังนรก 1 อย่าง\nรางวัล zeny / EXP / วัตถุดิบ x${HELL_MODE.reward} ของโหมดยาก · ยูนีค ${HELL_MODE.uniqueRate * 100}% ${taintDrop(d.id) ? ` · ผลึกโลกันตร์ +${HELL_MODE.taintAdd}` : ''}${capLine}\n☠️ Corruption: ${hc.list.map((c) => `${c.icon} ${c.name}`).join(' · ')}`,
            'ลุยเลย', () => go(this, 'battle', { d: i, hard: true, hell: true, seed: hs }), 'ยังก่อน'), { size: 16, fill: 0x3a0a14, color: '#ffb0b0' })
        }
      }
      const nextLocked = i === DUNGEONS.length - 1 || isLocked(DUNGEONS[i + 1])
      if (!locked && nextLocked) this.tweens.add({ targets: b, scale: 1.05, duration: 700, yoyo: true, repeat: -1 })
    })

    // ---- menu grid (right bottom) ----
    const gx = 428, gy = 326, bw = 164, bh = 104, gap = 8
    const tile = (i: number, icon: string, label: string, sub: string, fill: number, onClick: () => void) => {
      const x = gx + (i % 3) * (bw + gap) + bw / 2, y = gy + Math.floor(i / 3) * (bh + gap) + bh / 2
      button(this, x, y, bw, bh, `${icon} ${label}\n`, onClick, { fill, color: UI.text, size: 19 })
      txt(this, x, y + 22, sub, 12, '#d8d4f0').setOrigin(0.5).setAlign('center').setWordWrapWidth(bw - 12)
    }
    tile(0, '🛒', 'ร้านค้า', 'อาวุธ เกราะ ประดับ', 0x3d6e4c, () => go(this, 'shop'))
    tile(1, '🔨', 'โรงตีเหล็ก', 'ตีของ · อัปขั้น', 0x8a5a2f, () => go(this, 'forge'))
    tile(2, '💎', 'ร้านเพชร', 'เติมเงิน · ชุดแต่งกาย', 0x2f6a8a, () => go(this, 'gemshop'))
    tile(3, '🎁', 'เพชรฟรีรายวัน', s.lastDaily === today() ? 'รับแล้ววันนี้' : `+${FREE_GEMS.daily} รับได้เลย`, 0x6a4a8a, () => {
      if (s.lastDaily === today()) { toast(this, 'วันนี้รับไปแล้ว พรุ่งนี้มาใหม่นะคะ', UI.sub); return }
      s.lastDaily = today(); s.gems += FREE_GEMS.daily; persist(); refreshWallet()
      toast(this, `ได้เพชรฟรี +${FREE_GEMS.daily}`, UI.gem)
      this.time.delayedCall(500, () => this.scene.restart())
    })
    tile(5, '🎮', 'โหมด', 'หอคอย · รายวัน · ค่าหัว · รอยแยก', 0x7a3a6a, () => this.modes())
    tile(4, '⚙️', 'ตั้งค่า', s.muted ? 'เสียง: ปิด' : 'เสียง: เปิด', 0x4a4e6e, () => this.settings())

    ftue('hub_first')
    if (data?.fresh) this.time.delayedCall(250, () => toast(this, `ยินดีต้อนรับ ${s.name}! ลองกด "ออกผจญภัย" ได้เลย`))
    if (s.webRefund) { // v27 skill web migration notice (once)
      const n = s.webRefund
      delete s.webRefund; persist()
      this.time.delayedCall(300, () => confirm(this, '✨ ระบบสกิลใหม่!', `สกิลกับต้นสกิลรวมเป็นหน้าเดียวแล้ว + มีทักษะ 2 ให้เลือก\nคืนแต้มสกิลให้ ${n} แต้ม ไปลงใหม่ได้ฟรีค่ะ`, 'ไปหน้าสกิล', () => go(this, 'character', { tab: 3 })))
    } else if (s.stretchRefund) { // v83 node-level stretch notice (once)
      const { skill, job2 } = s.stretchRefund
      delete s.stretchRefund; persist()
      const back = [skill > 0 ? `แต้มสกิล ${skill}` : '', job2 > 0 ? `แต้มใยชั้น 2 ${job2}` : ''].filter(Boolean).join(' + ')
      this.time.delayedCall(300, () => confirm(this, '✨ โหนดสกิลมีเลเวลมากขึ้น!', `โหนด 1→3 · 2→4 · 3→5 เลเวล (เต็มแล้วแรงเท่าเดิม)\nคืน ${back} ไปลงใหม่ได้ฟรีค่ะ`, 'ไปหน้าสกิล', () => go(this, 'character', { tab: 3 })))
    }
  }

  /** 🎮 mode select (2x2 grid inside 800x520 modal): unlock state, record & launch actions. */
  private modes() {
    const s = save()
    const c = this.add.container(0, 0).setDepth(40000)
    c.add(this.add.rectangle(W / 2, H / 2, W, H, UI.night, 0.8).setInteractive())
    c.add(panel(this, W / 2 - 400, H / 2 - 260, 800, 520, UI.panelHi, COLORS.gold))
    c.add(txt(this, W / 2, H / 2 - 246, '🎮 โหมดท้าทาย', 24, UI.gold, true).setOrigin(0.5, 0))
    const cols = 2, cardW = 374, cardH = 202, gapX = 16, gapY = 10
    const gridX = W / 2 - (cols * cardW + (cols - 1) * gapX) / 2
    const gridY = H / 2 - 212
    const launch = (args: ModeArgs) => go(this, 'battle', args)

    PANEL_MODES.forEach((id, i) => {
      const m = MODES[id], u = m.unlock(s)
      const col = i % cols, row = Math.floor(i / cols)
      const cx = gridX + col * (cardW + gapX), cy = gridY + row * (cardH + gapY)
      c.add(panel(this, cx, cy, cardW, cardH, 0x2a3358))
      c.add(txt(this, cx + 14, cy + 10, `${m.icon} ${m.name}`, 17, u.ok ? UI.text : UI.sub, true))
      c.add(txt(this, cx + 14, cy + 31, u.ok ? m.record(s) : `🔒 ${u.why}`, 12, u.ok ? UI.gold : '#ff9a9a', true).setWordWrapWidth(cardW - 28).setMaxLines(1))

      let body = m.desc
      if (id === 'tower') {
        body = `${m.desc}\n⚡ พลังเรา ${heroPower(s)} · มอน Lv ≈ ${TOWER_LV.perFloor}/ชั้น (ชั้น 40 ≈ Lv ${towerMonLv(40)})\nธีม/${TOWER.themeEvery} · บอส/${TOWER.bossEvery} · กอนท์เล็ต/${TOWER.gauntletEvery} · คลั่ง ${TOWER_POWER.enrageWave}/${TOWER_POWER.enrageBoss} · ตกเก็บ ${Math.round(TOWER.fallKeep * 100)}%`
      } else if (id === 'daily') {
        const seed = dailySeed(), d = dailyOf(seed)
        body = `วันนี้: ${d.dg.name} · ${d.mutators.map((x) => `${x.icon} ${x.name}`).join(' · ')}\nรางวัล: 💎${DAILY.gems} · 🍀${DAILY.fortune} (${m.desc})`
        if (deepDailyOk(s)) {
          const dd = dailyOf(seed, true, s)
          body += `\n🌌 รายวันลึก: ${dd.dg.name} · ${dd.mutators.map((x) => `${x.icon} ${x.name}`).join(' ')} · 💎${DAILY.deepGems}`
        }
      } else if (id === 'bounty') {
        const seed = weeklySeed(), b = bountyOf(seed, s)
        body = `สัปดาห์ (${String(seed).slice(4)}): ${b.dg.name} (บอส ${b.dg.boss})\nรางวัล: 💎${BOUNTY.gems} · 🍀${BOUNTY.fortune} · ${matName(TAINT_MAT)}×${BOUNTY.taintCrystals}\n${b.mutators.map((x) => `${x.icon} ${x.name} (${x.desc})`).join(' · ')}`
      } else if (id === 'rift') {
        const rr = s.riftRun, w = s.talentWallet
        const walletLine = `เศษรูน ${w?.runeDust ?? 0} · เหรียญทอง ${w?.goldMedals ?? 0}`
        if (rr) {
          const curseTxt = rr.curses.length ? ` · คำสาป ${rr.curses.length}` : ''
          body = `▶️ รันค้าง: ชั้น ${rr.depth}${rr.daily ? ' (ประจำวัน)' : ''} · พร ${rr.boons.length}${curseTxt} · เงินฝาก ${rr.bankZeny}z\nบอสทุก ${RIFT_TUNING.bossEvery} ชั้น · พลาดเก็บเศษรูน ${Math.round(RIFT_TUNING.deathDustKeep * 100)}%\n${walletLine}`
        } else {
          body = `${m.desc}\nบอสทุก ${RIFT_TUNING.bossEvery} ชั้น · ประจำวัน 💎${RIFT_TUNING.dailyGems} + 🍀${RIFT_TUNING.dailyFortune}\n${walletLine}`
        }
      }

      c.add(txt(this, cx + 14, cy + 49, body, 11, UI.sub).setWordWrapWidth(cardW - 28).setLineSpacing(2).setMaxLines(6))

      const btnY = cy + cardH - 28, btnH = 34
      const tryStart = (args: ModeArgs) => {
        if (!u.ok) { confirm(this, `${m.name} ยังล็อกอยู่`, `${u.why} (โหมดทดสอบ: ลองได้)`, 'ลองเลย', () => launch(args)); return }
        launch(args)
      }

      if (id === 'tower') {
        const hasSkip = towerCheckpoints(s.modes?.tower?.bestFloor ?? 0).length > 0
        if (hasSkip) {
          c.add(button(this, cx + 98, btnY, 164, btnH, u.ok ? '⚔️ ลุยชั้น 1' : '🔒', () => tryStart({ mode: 'tower' }), { size: 14, fill: u.ok ? undefined : 0x4a4e6e, color: u.ok ? undefined : UI.sub }))
          c.add(button(this, cx + 276, btnY, 164, btnH, '⏭️ ข้ามชั้น', () => { c.destroy(); this.towerSkip() }, { size: 14, fill: 0x8a6fd1, color: UI.text }))
        } else {
          c.add(button(this, cx + cardW / 2, btnY, 220, btnH, u.ok ? '⚔️ ลุย!' : '🔒', () => tryStart({ mode: 'tower' }), { size: 15, fill: u.ok ? undefined : 0x4a4e6e, color: u.ok ? undefined : UI.sub }))
        }
      } else if (id === 'daily') {
        if (u.ok && deepDailyOk(s)) {
          c.add(button(this, cx + 98, btnY, 164, btnH, '📅 รายวัน', () => tryStart({ mode: 'daily' }), { size: 14 }))
          c.add(button(this, cx + 276, btnY, 164, btnH, '🌌 รายวันลึก', () => launch({ mode: 'daily', deep: true }), { size: 14, fill: 0x4a3a8a, color: UI.text }))
        } else {
          c.add(button(this, cx + cardW / 2, btnY, 220, btnH, u.ok ? '📅 ลุยรายวัน' : '🔒', () => tryStart({ mode: 'daily' }), { size: 15, fill: u.ok ? undefined : 0x4a4e6e, color: u.ok ? undefined : UI.sub }))
        }
      } else if (id === 'bounty') {
        c.add(button(this, cx + cardW / 2, btnY, 220, btnH, u.ok ? '🎯 ล่า!' : '🔒', () => tryStart({ mode: 'bounty' }), { size: 15, fill: u.ok ? 0x8a3a3a : 0x4a4e6e, color: u.ok ? undefined : UI.sub }))
      } else if (id === 'rift') {
        const rr = s.riftRun
        if (rr) {
          c.add(button(this, cx + 83, btnY, 140, btnH, `▶️ ต่อชั้น ${rr.depth}`, () => tryStart({ mode: 'rift', resumeRift: true }), { size: 13, fill: 0x2d7a64, color: UI.text }))
          c.add(button(this, cx + 208, btnY, 98, btnH, '🔄 เริ่มใหม่', () => confirm(this, 'เริ่มรอยแยกใหม่?', `รันค้างชั้น ${rr.depth} จะถูกแทนที่ (เงินและของที่ฝากไว้จะหาย)`, 'เริ่มใหม่', () => launch({ mode: 'rift' })), { size: 12, fill: 0x4a5588, color: UI.text }))
          c.add(button(this, cx + 312, btnY, 98, btnH, '🎲 ประจำวัน', () => confirm(this, 'ลงรอยแยกประจำวัน?', `รันค้างชั้น ${rr.depth} จะถูกแทนที่`, 'ลงประจำวัน', () => launch({ mode: 'rift', riftDaily: true })), { size: 12, fill: 0x68489c, color: UI.text }))
        } else {
          c.add(button(this, cx + 98, btnY, 168, btnH, u.ok ? '🌀 ลงรอยแยก' : '🔒 ลงรอยแยก', () => tryStart({ mode: 'rift' }), { size: 14, fill: u.ok ? undefined : 0x4a4e6e, color: u.ok ? undefined : UI.sub }))
          c.add(button(this, cx + 276, btnY, 168, btnH, u.ok ? '🎲 รอยแยกประจำวัน' : '🎲 ประจำวัน 🔒', () => tryStart({ mode: 'rift', riftDaily: true }), { size: 13, fill: u.ok ? 0x68489c : 0x4a4e6e, color: u.ok ? UI.text : UI.sub }))
        }
      }
    })
    c.add(button(this, W / 2, H / 2 + 232, 200, 38, 'ปิด', () => c.destroy(), { size: 16, fill: 0x5a5f8a, color: UI.text }))
  }

  /** v87 🗼 floor skip picker (design/unique-taint-tower-skip-v1.md §1): pick a checkpoint, see the gem price and the level you start with, confirm. */
  private towerSkip(pick?: number) {
    const s = save(), cps = towerCheckpoints(s.modes?.tower?.bestFloor ?? 0)
    if (!cps.length) return
    const S = pick && cps.includes(pick) ? pick : cps[cps.length - 1]
    const i = cps.indexOf(S), cost = towerSkipGems(S), chk = towerSkipCheck(s, S), up = towerCatchUp(s, S)
    const c = this.add.container(0, 0).setDepth(40500)
    c.add(this.add.rectangle(W / 2, H / 2, W, H, UI.night, 0.8).setInteractive())
    c.add(panel(this, W / 2 - 320, H / 2 - 190, 640, 380, UI.panelHi, COLORS.gold))
    c.add(txt(this, W / 2, H / 2 - 172, '⏭️ ข้ามชั้นหอคอย', 26, UI.gold, true).setOrigin(0.5, 0))
    c.add(txt(this, W / 2, H / 2 - 134, `จุดข้ามทุก ${TOWER.skipEvery} ชั้น ไปได้ถึงชั้น ${cps[cps.length - 1]} (สถิติชั้น ${s.modes?.tower?.bestFloor ?? 0}) · ชั้นที่ข้ามไม่ได้ zeny วัตถุดิบ หรือเพชรรางวัล`, 13, UI.sub).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(580))
    c.add(button(this, W / 2 - 170, H / 2 - 60, 56, 50, '◀', () => { c.destroy(); this.towerSkip(cps[i - 1]) }, { size: 22 }).setEnabled(i > 0))
    c.add(button(this, W / 2 + 170, H / 2 - 60, 56, 50, '▶', () => { c.destroy(); this.towerSkip(cps[i + 1]) }, { size: 22 }).setEnabled(i < cps.length - 1))
    c.add(txt(this, W / 2, H / 2 - 86, `ข้ามถึงชั้น ${S}`, 28, UI.text, true).setOrigin(0.5, 0))
    c.add(txt(this, W / 2, H / 2 - 48, `เริ่มสู้ที่ชั้น ${S + 1}`, 17, '#9fe3a8').setOrigin(0.5, 0))
    const info = [
      `💎 ราคา ${cost} เพชร (ชั้นละ ${TOWER.skipGems}) · มี ${s.gems} · เหลือ ${Math.max(0, s.gems - cost)}`,
      `🎓 เริ่ม Lv ${up.lv} ในรัน → เลือกการ์ด ${up.lv - 1} ใบก่อนสู้${up.relic ? ' + พรเทพ 1 ใบ' : ''}`,
      up.est ? '(ยังไม่เคยมีบันทึกที่จุดนี้ เลเวลเป็นค่าประมาณ — ผ่านจุดนี้ในรันจริงครั้งหนึ่งจะจำของจริงไว้)' : '(เลเวล/พรเทพที่เคยมีตอนผ่านจุดนี้ในรันจริง)',
    ]
    c.add(txt(this, W / 2, H / 2 + 0, info.join('\n'), 15, chk.ok ? UI.text : '#ff9a9a').setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(580))
    if (!chk.ok) c.add(txt(this, W / 2, H / 2 + 90, chk.why === 'gems' ? `💎 เพชรไม่พอ (ขาด ${cost - s.gems})` : '🔒 ยังไม่ถึงจุดนี้', 16, '#ff9a9a', true).setOrigin(0.5, 0))
    c.add(button(this, W / 2 - 120, H / 2 + 150, 200, 48, 'ปิด', () => c.destroy(), { size: 18, fill: 0x5a5f8a, color: UI.text }))
    c.add(button(this, W / 2 + 120, H / 2 + 150, 200, 48, `ข้าม 💎${cost}`, () => {
      c.destroy()
      confirm(this, `ข้ามไปชั้น ${S + 1}?`, `จ่าย 💎${cost} (เหลือ ${s.gems - cost}) ตอนเริ่มรัน
เริ่ม Lv ${up.lv} + เลือกการ์ดก่อนสู้
ชั้น 1-${S} ไม่ได้รางวัลและไม่นับสถิติ`, `ข้าม 💎${cost}`,
        () => go(this, 'battle', { mode: 'tower', skipTo: S }), 'ย้อนกลับ')
    }, { size: 18 }).setEnabled(chk.ok))
  }

  private settings() {
    const s = save()
    const c = this.add.container(0, 0).setDepth(40000)
    c.add(this.add.rectangle(W / 2, H / 2, W, H, UI.night, 0.75).setInteractive())
    c.add(panel(this, W / 2 - 230, H / 2 - 180, 460, 420, UI.panelHi, COLORS.gold))
    c.add(txt(this, W / 2, H / 2 - 154, 'ตั้งค่า', 26, UI.gold, true).setOrigin(0.5, 0))
    const snd = button(this, W / 2, H / 2 - 70, 320, 52, s.muted ? '🔇 เสียง: ปิด' : '🔊 เสียง: เปิด', () => {
      s.muted = !s.muted; setMuted(s.muted); persist()
      snd.setLabel(s.muted ? '🔇 เสียง: ปิด' : '🔊 เสียง: เปิด')
    }, { fill: 0x5a5f8a, color: UI.text, size: 19 })
    c.add(snd)
    const shk = button(this, W / 2, H / 2 - 8, 320, 52, s.lowShake ? '📳 จอสั่น: ลดลง' : '📳 จอสั่น: ปกติ', () => {
      s.lowShake = !s.lowShake; persist()
      shk.setLabel(s.lowShake ? '📳 จอสั่น: ลดลง' : '📳 จอสั่น: ปกติ')
    }, { fill: 0x5a5f8a, color: UI.text, size: 19 })
    c.add(shk)
    const ultLab = () => (ultMode(s) === 'auto' ? '⚡ อัลติ: อัตโนมัติ' : '🖐️ อัลติ: กดเอง')
    const ult = button(this, W / 2, H / 2 + 54, 320, 52, ultLab(), () => {
      s.autoUlt = ultMode(s) === 'auto' ? 'manual' : 'auto'; persist()
      ult.setLabel(ultLab())
    }, { fill: 0x5a5f8a, color: UI.text, size: 19 })
    c.add(ult)
    c.add(button(this, W / 2, H / 2 + 116, 320, 52, '🗑️ ลบเซฟ เริ่มใหม่', () =>
      confirm(this, 'ลบเซฟจริงไหม?', 'ตัวละคร ของ และเพชรทั้งหมดจะหายถาวร', 'ลบเลย', () => { wipe(); go(this, 'title') }),
    { fill: 0x8a3a4a, color: UI.text, size: 19 }))
    if (cloudEnabled) {
      c.add(button(this, W / 2 - 100, H / 2 + 186, 190, 48, '☁️ บัญชี', () => go(this, 'cloud', { from: 'hub' }), { size: 18, fill: 0x2f6a8a, color: UI.text }))
      c.add(button(this, W / 2 + 100, H / 2 + 186, 190, 48, 'ปิด', () => { c.destroy(); this.scene.restart() }, { size: 19 }))
    } else c.add(button(this, W / 2, H / 2 + 186, 200, 48, 'ปิด', () => { c.destroy(); this.scene.restart() }, { size: 19 }))
  }
}
