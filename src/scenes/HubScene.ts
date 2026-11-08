import Phaser from 'phaser'
import { COLORS, DUNGEONS, H, HARD, W } from '../data/game-data'
import { levelDropMul } from '../data/mon-stats'
import { foldCorruptions, rollCorruptions } from '../data/corruptions'
import { HARD_POWER, heroParts, heroPower, matchScale, overpowerMul, powerHint, recPower, TOWER_POWER } from '../data/power'
import { COSTUMES, FREE_GEMS, isBroken, itemById, JOB_RULES, noviceLeft, RACES, STAT_RULES } from '../data/meta'
import { canChangeJob, canChangeJob2, persist, save, today, ultMode, wipe } from '../save'
import { JOB_CHANGE, JOBS } from '../data/jobs'
import { JOB2, JOB2_RULES, job2Of } from '../data/jobs2'
import { DAILY, dailyOf, dailySeed, deepDailyOk, MODES, PANEL_MODES, TOWER, towerCatchUp, towerCheckpoints, towerSkipCheck, towerSkipGems } from '../data/modes'
import { cloudEnabled } from '../cloud'
import { setMuted } from '../sfx'
import { askRepick } from './JobScene'
import { backdrop, button, confirm, fullscreenButton, go, panel, toast, topBar, txt, UI } from '../ui'
import { ftue } from '../analytics'

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
    const costume = COSTUMES.find((c) => c.id === s.costume) ?? COSTUMES[0]
    const hero = this.add.image(214, 210, JOBS[s.job].tex).setScale(3.2).setTint(costume.tint)
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
    if (canChangeJob(s)) {
      const jb = button(this, 214, 448, 300, 44, '🎓 เปลี่ยนอาชีพได้แล้ว!', () => go(this, 'job'), { size: 18 })
      this.tweens.add({ targets: jb, scale: 1.05, duration: 600, yoyo: true, repeat: -1 })
    } else if (canChangeJob2(s) && job2Of(s.job).length) { // 2nd job: Job Lv 40 + ดัน 5 (design/second-jobs-v1.md)
      const jb = button(this, 214, 448, 300, 44, '⭐ อาชีพขั้น 2 ได้แล้ว!', () => go(this, 'job', { job2: true }), { size: 18 })
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
      const info = `${d.rooms.length - 1 - (mini ? 1 : 0)} เวฟ${mini ? ' + ดวล 1-1' : ''} + บอส${d.boss}`
      const lockMsg = d.unlock === 'job' ? '🔒 ปลดล็อกหลังเปลี่ยนอาชีพ' : `🔒 ปลดล็อกหลังเคลียร์${prevName(d.unlock)}`
      const status = locked ? (compact ? '🔒 ล็อก' : lockMsg) : n ? `เคลียร์แล้ว ${n} ครั้ง` : compact ? `ครั้งแรก 💎${FREE_GEMS.firstClear}` : `เคลียร์ครั้งแรกได้เพชร ${FREE_GEMS.firstClear}`
      const nameT = txt(this, 452, y, `${i + 1}. ${d.name}${d.tier >= 4 ? ' 💀' : ''}`, compact ? 15 : 17, locked ? UI.sub : UI.text, true)
      if (d.level) { // D6+: fixed monster level instead of Hero Power (data/mon-stats.ts)
        const dm = levelDropMul(s.baseLevel, d.level), low = s.baseLevel < d.level[0]
        txt(this, nameT.x + nameT.width + 8, y + 2, `มอน Lv${d.level[0]}-${d.level[1]}${dm < 1 ? ` · ดรอป x${dm.toFixed(2)}` : ''}`, 12, low ? '#ff7a7a' : dm < 1 ? '#9fd0ff' : '#9fe3a0', true)
      } else {
        const ph = powerHint(power, d.id), dm = overpowerMul(power, d.id)
        txt(this, nameT.x + nameT.width + 8, y + 2, `แนะนำ ⚡${ph.rec}${dm < 1 ? ` · ดรอป x${dm.toFixed(2)}` : ''}`, 12, ph.color, true)
      }
      const hb = (s.hardClearsBy ?? {})[d.id] ?? 0
      if (compact) txt(this, 452, y + 19, `${info} · ${status}${hb ? ` · 🔥${hb}` : ''}`, 11, locked ? '#ff9a9a' : n ? UI.sub : UI.gem).setWordWrapWidth(n ? 270 : 320)
      else {
        txt(this, 452, y + 22, info, 13, UI.sub)
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
      if (n > 0 && d.level) { // D6+ hard: +50% monster stat points + a PoE-style corruption roll shown before the run
        const seed = Math.floor(Math.random() * 1e9), cr = foldCorruptions(rollCorruptions(seed))
        button(this, 756, y + (compact ? 18 : 26), 62, compact ? 34 : 50, '🔥ยาก', () => confirm(this, `🔥 โหมดยาก · ${d.name}`,
          `มอน Lv${d.level![0]}-${d.level![1]} เท่าเดิม แต่แต้มสถานะ +50% (ธรรมดา 100% · มินิ 150% · บอส 200%)\nบอส/มินิบอสสุ่มสกิล + passive\n☠️ Corruption: ${cr.list.map((c) => `${c.icon} ${c.name} (${c.desc})`).join('\n')}\nรางวัล zeny/EXP x${(HARD.reward * cr.reward).toFixed(2)} · วัตถุดิบ x${(HARD.mats * cr.reward).toFixed(2)}`,
          'ลุยเลย', () => go(this, 'battle', { d: i, hard: true, seed }), 'ยังก่อน'), { size: 14, fill: 0x5a1a4a, color: UI.text })
      } else if (n > 0) { // hard mode (v47): cleared dungeons only, monsters scale with Base Lv
        const m = matchScale(heroParts(s), d.id), kh = m.hp * HARD_POWER.target, ka = m.atk * HARD_POWER.target, rw = HARD.reward * m.hp ** HARD.rewardPow
        button(this, 756, y + (compact ? 18 : 26), 62, compact ? 34 : 50, '🔥ยาก', () => confirm(this, `🔥 โหมดยาก · ${d.name}`,
          `มอนแกร่งตาม Hero Power ของเรา (⚡${power} · ดันนี้แนะนำ ⚡${recPower(d.id)})\nมอนประมาณ ${Math.round(HARD_POWER.target * 100)}% ของเรา: HP x${kh.toFixed(2)} (ตามดาเมจเรา) · ATK x${ka.toFixed(2)} (ตามความถึก)\nบอส/มินิบอสสุ่มสกิล + passive · 🎯 หลบได้ครั้งเดียวแล้วตีโดนแน่ 3 เทิร์น\nรางวัล zeny/EXP x${rw.toFixed(2)} · วัตถุดิบ x${HARD.mats}`,
          'ลุยเลย', () => go(this, 'battle', { d: i, hard: true }), 'ยังก่อน'), { size: 14, fill: 0x8a3a2a, color: UI.text })
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
    tile(5, '🎮', 'โหมด', 'หอคอย · ท้าทายรายวัน', 0x7a3a6a, () => this.modes())
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

  /** 🎮 mode select (design/game-modes-v1.md §5): one row per mode, unlock state + best record. */
  private modes() {
    const s = save()
    const c = this.add.container(0, 0).setDepth(40000)
    c.add(this.add.rectangle(W / 2, H / 2, W, H, UI.night, 0.8).setInteractive())
    c.add(panel(this, W / 2 - 400, H / 2 - 250, 800, 500, UI.panelHi, COLORS.gold))
    c.add(txt(this, W / 2, H / 2 - 232, '🎮 โหมดท้าทาย', 26, UI.gold, true).setOrigin(0.5, 0))
    PANEL_MODES.forEach((id, i) => {
      const m = MODES[id], y = H / 2 - 180 + i * 190, u = m.unlock(s)
      c.add(panel(this, W / 2 - 380, y, 760, 176, 0x2a3358))
      c.add(txt(this, W / 2 - 360, y + 12, `${m.icon} ${m.name}`, 22, u.ok ? UI.text : UI.sub, true))
      c.add(txt(this, W / 2 + 200, y + 18, u.ok ? m.record(s) : `🔒 ${u.why}`, 14, u.ok ? UI.gold : '#ff9a9a').setOrigin(1, 0))
      let body = m.desc
      if (id === 'tower') body = `${m.desc}\n⚡ พลังเรา ${heroPower(s)} · ชั้น 1 มอนราว ${Math.round(TOWER_POWER.start * 100)}% แล้วโตทบต้นทุกชั้น · สู้นานเกิน ${TOWER_POWER.enrageWave} เทิร์น (บอส ${TOWER_POWER.enrageBoss}) มอนคลั่ง`
      if (id === 'daily') {
        const seed = dailySeed(), d = dailyOf(seed)
        body = `วันนี้: ${d.dg.name} · ${d.mutators.map((x) => `${x.icon} ${x.name} (${x.desc})`).join(' · ')}\n${m.desc}`
        if (deepDailyOk(s)) { // v118 🌌 deep daily: names only (the panel row is short)
          const dd = dailyOf(seed, true)
          body += `\n🌌 รายวันลึก: ${dd.dg.name} · ${dd.mutators.map((x) => `${x.icon} ${x.name}`).join(' ')} · 💎${DAILY.deepGems}`
        }
      }
      c.add(txt(this, W / 2 - 360, y + 46, body, 13, UI.sub).setWordWrapWidth(560).setLineSpacing(4))
      const startIt = () => go(this, 'battle', { mode: id })
      c.add(button(this, W / 2 + 290, y + 88, 130, 56, u.ok ? 'ลุย!' : '🔒', () => {
        if (!u.ok) { confirm(this, `${m.name} ยังล็อกอยู่`, `${u.why} (โหมดทดสอบ: ลองได้)`, 'ลองเลย', startIt); return }
        startIt()
      }, { size: 20, fill: u.ok ? undefined : 0x4a4e6e, color: u.ok ? undefined : UI.sub }))
      if (id === 'tower' && towerCheckpoints(s.modes?.tower?.bestFloor ?? 0).length) // v87: skip to a checkpoint (gems)
        c.add(button(this, W / 2 + 290, y + 142, 130, 32, '⏭️ ข้ามชั้น', () => { c.destroy(); this.towerSkip() }, { size: 15, fill: 0x8a6fd1, color: UI.text }))
      if (id === 'daily' && u.ok && deepDailyOk(s)) // v118 🌌 deep daily (D6-D10), opens after D10
        c.add(button(this, W / 2 + 290, y + 142, 130, 32, '🌌 รายวันลึก', () => go(this, 'battle', { mode: 'daily', deep: true }), { size: 15, fill: 0x4a3a8a, color: UI.text }))
    })
    c.add(button(this, W / 2, H / 2 + 218, 200, 44, 'ปิด', () => c.destroy(), { size: 18, fill: 0x5a5f8a, color: UI.text }))
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
