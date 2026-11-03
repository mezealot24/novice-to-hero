import Phaser from 'phaser'
import { COLORS, DUNGEONS, H, W } from '../data/game-data'
import { COSTUMES, FREE_GEMS, JOB_RULES, RACES, STAT_RULES } from '../data/meta'
import { canChangeJob, persist, save, today, wipe } from '../save'
import { JOB_CHANGE, JOBS } from '../data/jobs'
import { setMuted } from '../sfx'
import { backdrop, button, confirm, fullscreenButton, go, panel, toast, topBar, txt, UI } from '../ui'

// Town / main menu. Everything branches from here and every run comes back here.
export class HubScene extends Phaser.Scene {
  constructor() { super('hub') }

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
    txt(this, 214, 346, `${RACES[s.race].icon} ${RACES[s.race].name} · ${JOBS[s.job].icon} ${JOBS[s.job].name}`, 17, UI.sub).setOrigin(0.5)
    const bar = (y: number, label: string, cur: number, need: number, color: number, max: boolean) => {
      txt(this, 52, y, label, 15, UI.text, true)
      const g = this.add.graphics()
      g.fillStyle(0x10132a).fillRoundedRect(150, y + 2, 226, 16, 6)
      g.fillStyle(color).fillRoundedRect(150, y + 2, max ? 226 : Math.max(6, 226 * Math.min(1, cur / need)), 16, 6)
      txt(this, 263, y + 10, max ? 'MAX' : `${cur}/${need}`, 12, UI.text).setOrigin(0.5)
    }
    bar(378, `Base Lv ${s.baseLevel}`, s.baseXp, STAT_RULES.baseXpNeed(s.baseLevel), 0x7fd7ff, false)
    const jobMax = s.jobLevel >= (s.job === 'novice' ? JOB_RULES.maxJobLevel : JOB_CHANGE.classMaxJobLevel)
    bar(406, `Job Lv ${s.jobLevel}`, s.jobXp, JOB_RULES.jobXpNeed(s.jobLevel), 0x6fd08c, jobMax)
    const notes: string[] = []
    if (s.statPoints > 0) notes.push(`มีแต้มสถานะ ${s.statPoints}`)
    if (s.skillPoints > 0) notes.push(`มีแต้มสกิล ${s.skillPoints}`)
    if (canChangeJob(s)) {
      const jb = button(this, 214, 448, 300, 44, '🎓 เปลี่ยนอาชีพได้แล้ว!', () => go(this, 'job'), { size: 18 })
      this.tweens.add({ targets: jb, scale: 1.05, duration: 600, yoyo: true, repeat: -1 })
    } else txt(this, 214, 446, notes.length ? `✨ ${notes.join(' · ')}` : `เคลียร์ดัน ${s.clears} ครั้ง`, 15, notes.length ? UI.gold : UI.sub).setOrigin(0.5).setAlign('center').setWordWrapWidth(340)
    button(this, 214, 506, 330, 52, '👤 ตัวละคร / อุปกรณ์ / สถานะ', () => go(this, 'character'), { fill: 0x5a5f8a, color: UI.text, size: 18 })

    // ---- adventure (right top): one row per dungeon ----
    panel(this, 428, 76, 508, 240, 0x2a3358)
    txt(this, 452, 84, '⚔️ ผจญภัย', 20, UI.gold, true)
    const by = s.clearsBy ?? { d1: s.clears }
    const isLocked = (d: (typeof DUNGEONS)[number]) => (d.unlock === 'job' && s.job === 'novice') || (d.unlock.startsWith('d') && !(by[d.unlock] > 0))
    const prevName = (u: string) => DUNGEONS.find((x) => x.id === u)?.name ?? u
    const rowH = Math.min(66, Math.floor(200 / DUNGEONS.length)) // 5 dungeons: compact rows
    const compact = rowH < 60
    DUNGEONS.forEach((d, i) => {
      const y = 112 + i * rowH
      const locked = isLocked(d)
      const n = by[d.id] ?? 0
      const mini = d.rooms.some((r) => r.mini)
      const info = `${d.rooms.length - 1 - (mini ? 1 : 0)} เวฟ${mini ? ' + ดวล 1-1' : ''} + บอส${d.boss}`
      const lockMsg = d.unlock === 'job' ? '🔒 ปลดล็อกหลังเปลี่ยนอาชีพ' : `🔒 ปลดล็อกหลังเคลียร์${prevName(d.unlock)}`
      const status = locked ? (compact ? '🔒 ล็อก' : lockMsg) : n ? `เคลียร์แล้ว ${n} ครั้ง` : compact ? `ครั้งแรก 💎${FREE_GEMS.firstClear}` : `เคลียร์ครั้งแรกได้เพชร ${FREE_GEMS.firstClear}`
      txt(this, 452, y, `${i + 1}. ${d.name}${d.tier >= 4 ? ' 💀' : ''}`, compact ? 15 : 17, locked ? UI.sub : UI.text, true)
      if (compact) txt(this, 452, y + 19, `${info} · ${status}`, 11, locked ? '#ff9a9a' : n ? UI.sub : UI.gem).setWordWrapWidth(320)
      else {
        txt(this, 452, y + 22, info, 13, UI.sub)
        txt(this, 452, y + 40, status, 13, locked ? '#ff9a9a' : n ? UI.sub : UI.gem)
      }
      const b = button(this, 856, y + (compact ? 18 : 26), 130, compact ? 34 : 50, locked ? '🔒' : 'ลุย!', () => {
        // playtest: a locked dungeon still opens, after a warning
        const why = d.unlock === 'job' ? 'แนะนำให้เคลียร์ดัน 1 แล้วเปลี่ยนอาชีพก่อน\nโนวิสจะยากมาก' : `แนะนำให้เคลียร์${prevName(d.unlock)}ก่อน มอนแรงมาก`
        if (locked) { confirm(this, `${d.name} ยังล็อกอยู่`, `${why} (โหมดทดสอบ: ลองได้)`, 'ลองเลย', () => go(this, 'battle', { d: i })); return }
        go(this, 'battle', { d: i })
      }, { size: compact ? 17 : 20, fill: locked ? 0x4a4e6e : undefined, color: locked ? UI.sub : undefined })
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
    tile(4, '⚙️', 'ตั้งค่า', s.muted ? 'เสียง: ปิด' : 'เสียง: เปิด', 0x4a4e6e, () => this.settings())

    if (data?.fresh) this.time.delayedCall(250, () => toast(this, `ยินดีต้อนรับ ${s.name}! ลองกด "ออกผจญภัย" ได้เลย`))
    if (s.webRefund) { // v27 skill web migration notice (once)
      const n = s.webRefund
      delete s.webRefund; persist()
      this.time.delayedCall(300, () => confirm(this, '✨ ระบบสกิลใหม่!', `สกิลกับต้นสกิลรวมเป็นหน้าเดียวแล้ว + มีทักษะ 2 ให้เลือก\nคืนแต้มสกิลให้ ${n} แต้ม ไปลงใหม่ได้ฟรีค่ะ`, 'ไปหน้าสกิล', () => go(this, 'character', { tab: 3 })))
    }
  }

  private settings() {
    const s = save()
    const c = this.add.container(0, 0).setDepth(40000)
    c.add(this.add.rectangle(W / 2, H / 2, W, H, UI.night, 0.75).setInteractive())
    c.add(panel(this, W / 2 - 230, H / 2 - 180, 460, 360, UI.panelHi, COLORS.gold))
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
    c.add(button(this, W / 2, H / 2 + 54, 320, 52, '🗑️ ลบเซฟ เริ่มใหม่', () =>
      confirm(this, 'ลบเซฟจริงไหม?', 'ตัวละคร ของ และเพชรทั้งหมดจะหายถาวร', 'ลบเลย', () => { wipe(); go(this, 'title') }),
    { fill: 0x8a3a4a, color: UI.text, size: 19 }))
    c.add(button(this, W / 2, H / 2 + 128, 200, 48, 'ปิด', () => { c.destroy(); this.scene.restart() }, { size: 19 }))
  }
}
