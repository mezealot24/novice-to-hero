import Phaser from 'phaser'
import { COLORS, type Stats } from '../data/game-data'
import { BASE_STATS, canWear, CERT_SLOTS_AT, COSTUMES, gearBase, heroStats, itemStatLine, ITEMS, itemById, JOB_RULES, RACES, SKILLS, SLOTS, STAT_RULES, totalBase, wearText, type Slot } from '../data/meta'
import { canChangeJob, persist, resetTree, save } from '../save'
import { branchesOf, branchSpent, lockReason, nodesOf, TALENT_RULES, talentEarned, talentFree, talentPick, talentsOf, treeSpent } from '../data/tree'
import { JOB_CHANGE, JOBS, skillPow } from '../data/jobs'
import { button, confirm, go, panel, tabs, toast, topBar, txt, UI } from '../ui'

// Character sheet: preview on the left, three tabs on the right (equipment, status, skills).
export class CharacterScene extends Phaser.Scene {
  private body?: Phaser.GameObjects.Container
  private preview?: Phaser.GameObjects.Container
  private tab = 0
  private slot: Slot | 'costume' = 'weapon'
  private bagPage = 0
  constructor() { super('character') }

  create(data: { tab?: number }) {
    this.cameras.main.setBackgroundColor(UI.night)
    this.cameras.main.fadeIn(160, 20, 23, 43)
    this.tab = data?.tab ?? 0
    topBar(this, '👤 ตัวละคร', () => go(this, 'hub'))
    this.drawPreview()
    tabs(this, 330, 84, ['🎒 อุปกรณ์', '📊 สถานะ', '✨ สกิล', '🌳 ต้นสกิล', '⭐ ทาเลนต์'], 118, (i) => { this.tab = i; this.render() }, this.tab)
  }

  private render() {
    this.body?.destroy()
    this.body = this.add.container(0, 0)
    if (this.tab === 0) this.equipTab()
    else if (this.tab === 1) this.statusTab()
    else if (this.tab === 2) this.skillTab()
    else if (this.tab === 3) this.treeTab()
    else this.talentTab()
  }

  private redraw() { this.drawPreview(); this.render() }

  // ---------- left: hero preview + derived stats summary ----------
  private drawPreview() {
    this.preview?.destroy()
    const s = save(), c = this.add.container(0, 0)
    this.preview = c
    c.add(panel(this, 16, 70, 298, 490))
    const costume = COSTUMES.find((x) => x.id === s.costume) ?? COSTUMES[0]
    c.add(this.add.image(165, 150, JOBS[s.job].tex).setScale(2.5).setTint(costume.tint))
    c.add(txt(this, 165, 216, `${s.supporter ? '🌟 ' : ''}${s.name}`, 22, s.supporter ? UI.gold : UI.text, true).setOrigin(0.5))
    c.add(txt(this, 165, 244, `${RACES[s.race].icon} ${RACES[s.race].name} · ${JOBS[s.job].icon} ${JOBS[s.job].name}`, 15, UI.sub).setOrigin(0.5))
    c.add(txt(this, 165, 268, `Base Lv ${s.baseLevel} · Job Lv ${s.jobLevel}/${s.job === 'novice' ? JOB_RULES.maxJobLevel : JOB_CHANGE.classMaxJobLevel}`, 14, UI.text).setOrigin(0.5))
    const st = heroStats(s)
    const rows = derivedRows(st)
    rows.forEach(([k, v], i) => {
      const y = 290 + i * 16.2
      c.add(txt(this, 30, y, k, 12, UI.sub))
      c.add(txt(this, 300, y, v, 12, UI.text, true).setOrigin(1, 0))
    })
  }

  // ---------- tab 1: equipment + costume ----------
  private equipTab() {
    const s = save(), b = this.body!
    const slots: { id: Slot | 'costume'; name: string; icon: string; cur: string; desc: string }[] = [
      ...SLOTS.map((sl) => { const it = itemById(s.equipped[sl.id]); return { id: sl.id, name: sl.name, icon: sl.icon, cur: `${it.icon} ${it.name}`, desc: canWear(it, s.job) ? itemStatLine(it) || it.desc : `⚠ ${wearText(it)} เท่านั้น (ไม่ได้ค่าพลัง)` } }),
      { id: 'costume', name: 'ชุดแต่งกาย', icon: '👗', cur: (COSTUMES.find((c) => c.id === s.costume) ?? COSTUMES[0]).name, desc: 'เปลี่ยนสีอย่างเดียว ไม่มีค่าพลัง' },
    ]
    slots.forEach((sl, i) => {
      const x = 330 + (i % 2) * 308, y = 116 + Math.floor(i / 2) * 76, on = sl.id === this.slot
      const g = this.add.graphics()
      g.fillStyle(on ? 0x34396a : UI.panel, 1).fillRoundedRect(x, y, 300, 68, 12)
      g.lineStyle(on ? 3 : 2, on ? COLORS.gold : UI.line).strokeRoundedRect(x, y, 300, 68, 12)
      b.add(g)
      b.add(txt(this, x + 14, y + 5, `${sl.icon} ${sl.name}`, 12, UI.sub))
      b.add(txt(this, x + 14, y + 20, sl.cur, 16, UI.text, true))
      b.add(txt(this, x + 14, y + 44, clip(sl.desc, 46), 11, sl.desc.startsWith('⚠') ? UI.red : UI.green))
      const z = this.add.zone(x + 150, y + 34, 300, 68).setInteractive({ useHandCursor: true })
      z.on('pointerup', () => { this.slot = sl.id; this.bagPage = 0; this.render() })
      b.add(z)
    })

    b.add(txt(this, 330, 272, this.slot === 'costume' ? 'ชุดที่มี (ซื้อเพิ่มที่ร้านเพชร)' : 'ของที่มีในกระเป๋า (ซื้อเพิ่มที่ร้านค้า)', 15, UI.sub))
    const list = this.slot === 'costume'
      ? COSTUMES.filter((c) => s.costumes.includes(c.id)).map((c) => ({ id: c.id, label: c.name, desc: 'ไม่มีค่าพลัง', worn: s.costume === c.id, tint: c.tint }))
      : ITEMS.filter((it) => it.slot === this.slot && s.owned.includes(it.id))
        .sort((a, c) => Number(!canWear(a, s.job)) - Number(!canWear(c, s.job)))
        .map((it) => ({ id: it.id, label: `${it.icon} ${it.name}`, desc: canWear(it, s.job) ? itemStatLine(it) || it.desc : `⚠ ${wearText(it)} เท่านั้น`, worn: s.equipped[it.slot] === it.id, tint: 0, off: !canWear(it, s.job) }))
    const per = 6, pages = Math.max(1, Math.ceil(list.length / per))
    this.bagPage = Math.min(this.bagPage, pages - 1)
    if (pages > 1) {
      b.add(button(this, 700, 538, 44, 36, '◀', () => { this.bagPage--; this.render() }, { size: 15 }).setEnabled(this.bagPage > 0))
      b.add(txt(this, 745, 538, `${this.bagPage + 1}/${pages}`, 14, UI.text, true).setOrigin(0.5))
      b.add(button(this, 790, 538, 44, 36, '▶', () => { this.bagPage++; this.render() }, { size: 15 }).setEnabled(this.bagPage < pages - 1))
    }
    list.slice(this.bagPage * per, this.bagPage * per + per).forEach((it, i) => {
      const x = 330 + (i % 2) * 308, y = 296 + Math.floor(i / 2) * 64
      b.add(panel(this, x, y, 300, 56, UI.panel, it.worn ? COLORS.gold : UI.line, 10))
      if (it.tint) b.add(this.add.image(x + 24, y + 28, 'novice').setScale(0.9).setTint(it.tint))
      b.add(txt(this, x + (it.tint ? 48 : 12), y + 6, it.label, 16, UI.text, true))
      b.add(txt(this, x + (it.tint ? 48 : 12), y + 30, clip(it.desc, 34), 11, 'off' in it && it.off ? UI.red : UI.green).setWordWrapWidth(196).setLineSpacing(0))
      b.add(button(this, x + 258, y + 28, 72, 38, it.worn ? 'ใส่อยู่' : 'ใส่', () => {
        if (this.slot === 'costume') s.costume = it.id
        else s.equipped[this.slot] = it.id
        persist(); this.redraw()
      }, { size: 15 }).setEnabled(!it.worn && !('off' in it && it.off)))
    })
    if (list.length <= 1) b.add(txt(this, 640, 400, this.slot === 'costume' ? 'ยังไม่มีชุดอื่น' : 'ยังไม่มีของชิ้นอื่น\nเก็บ zeny จากดันแล้วไปร้านค้านะคะ', 15, UI.sub).setOrigin(0.5).setAlign('center'))
    b.add(button(this, 860, 538, 140, 38, this.slot === 'costume' ? '💎 ร้านเพชร' : '🛒 ร้านค้า', () => go(this, this.slot === 'costume' ? 'gemshop' : 'shop'), { size: 15, fill: 0x5a5f8a, color: UI.text }))
  }

  // ---------- tab 2: base stats ----------
  private statusTab() {
    const s = save(), b = this.body!
    const total = totalBase(s), gear = gearBase(s)
    b.add(txt(this, 330, 112, `แต้มสถานะเหลือ: ${s.statPoints}`, 20, s.statPoints ? UI.gold : UI.sub, true))
    b.add(txt(this, 330, 138, `ได้ ${STAT_RULES.pointsPerLevel} แต้มทุก Base Lv · รีเซ็ตฟรีได้ตลอด`, 14, UI.sub))
    BASE_STATS.forEach((bs, i) => {
      const y = 166 + i * 56
      b.add(panel(this, 330, y, 600, 50, UI.panel, UI.line, 10))
      b.add(txt(this, 344, y + 6, bs.name, 19, UI.gold, true))
      b.add(txt(this, 344, y + 30, bs.role, 12, UI.sub))
      const raceB = total[bs.id] - s.stats[bs.id] - gear[bs.id], gearB = gear[bs.id]
      b.add(txt(this, 404, y + 11, `${total[bs.id]}`, 22, UI.text, true))
      if (raceB) b.add(txt(this, 436, y + 8, `${raceB > 0 ? '+' : ''}${raceB} เผ่า`, 10, raceB > 0 ? UI.green : UI.red))
      if (gearB) b.add(txt(this, 436, y + 26, `+${gearB} ของ`, 10, '#7fd7ff'))
      b.add(txt(this, 482, y + 8, bs.desc, 13, '#d8d4f0').setWordWrapWidth(320).setLineSpacing(2))
      const add = (n: number) => {
        n = Math.min(n, s.statPoints, STAT_RULES.max - s.stats[bs.id])
        if (n <= 0) return
        s.stats[bs.id] += n; s.statPoints -= n; persist(); this.redraw()
      }
      b.add(button(this, 838, y + 25, 52, 36, '+1', () => add(1), { size: 16 }).setEnabled(s.statPoints > 0))
      b.add(button(this, 896, y + 25, 52, 36, '+5', () => add(5), { size: 16 }).setEnabled(s.statPoints > 1))
    })
    b.add(button(this, 860, 132, 140, 38, '↺ รีเซ็ตแต้ม', () => {
      const spent = Object.values(s.stats).reduce((a, v) => a + v - STAT_RULES.start, 0)
      if (!spent) { toast(this, 'ยังไม่ได้ลงแต้มเลยค่ะ', UI.sub); return }
      confirm(this, 'รีเซ็ตแต้มสถานะ?', `คืน ${spent} แต้มให้ลงใหม่ ฟรี ไม่เสียอะไรค่ะ`, 'รีเซ็ต', () => {
        for (const k of Object.keys(s.stats) as (keyof typeof s.stats)[]) s.stats[k] = STAT_RULES.start
        s.statPoints += spent; persist(); this.redraw()
      })
    }, { size: 15, fill: 0x5a5f8a, color: UI.text }))
  }

  // ---------- tab 3: skills, passives, talents ----------
  private skillTab() {
    const s = save(), b = this.body!
    b.add(txt(this, 330, 116, `แต้มสกิลเหลือ: ${s.skillPoints}`, 20, s.skillPoints ? UI.gold : UI.sub, true))
    const job = JOBS[s.job]
    b.add(txt(this, 330, 144, `ได้ 1 แต้มทุก Job Lv · ${job.icon} ${job.name}${s.job === 'novice' ? '' : ' + สกิลโนวิสที่ติดตัว'}`, 14, UI.sub))
    const rows: { icon: string; name: string; kind: string; lv: number; max: number; desc: string; up: () => void }[] = []
    if (s.job !== 'novice') {
      const cls = [
        { key: 'auto' as const, sk: job.auto, kind: `อัตโนมัติ · ${job.resource ?? ''}` },
        { key: 'ult' as const, sk: job.ult, kind: `กดเอง · ${job.ult.cd} เทิร์น` },
      ]
      for (const c of cls) {
        const lv = s.jobSkills[c.key]
        rows.push({ icon: c.sk.icon, name: c.sk.name, kind: c.kind, lv, max: 10, desc: `${c.sk.desc} · แรง x${skillPow(lv).toFixed(1)}`, up: () => { s.jobSkills[c.key]++ } })
      }
    }
    for (const sk of SKILLS) {
      if (sk.id === 'smash' && s.job !== 'novice') continue
      const lv = s.skills[sk.id]
      rows.push({ icon: sk.icon, name: sk.name, kind: sk.kind === 'active' ? 'Active' : 'Passive', lv, max: sk.max, desc: lv ? sk.desc(lv) : `ยังไม่ได้เรียน · Lv1: ${sk.desc(1)}`, up: () => { s.skills[sk.id]++ } })
    }
    rows.forEach((r, i) => {
      const h = rows.length > 3 ? 46 : 54, y = 168 + i * (h + 6)
      b.add(panel(this, 330, y, 600, h, UI.panel, UI.line, 10))
      b.add(txt(this, 346, y + 5, `${r.icon} ${r.name}`, 16, UI.text, true))
      b.add(txt(this, 346, y + h - 20, r.kind, 11, UI.gold))
      b.add(txt(this, 540, y + 5, `Lv ${r.lv}/${r.max}`, 14, UI.text, true))
      b.add(txt(this, 540, y + 24, r.desc, 11, UI.green).setWordWrapWidth(300))
      b.add(button(this, 890, y + h / 2, 64, 34, r.lv ? '+1' : 'เรียน', () => {
        if (s.skillPoints <= 0 || r.lv >= r.max) return
        r.up(); s.skillPoints--; persist(); this.redraw()
      }, { size: 15 }).setEnabled(s.skillPoints > 0 && r.lv < r.max))
    })

    // certificate slots (passive slots by Base Lv) + talents, locked until job change
    const y0 = 372
    b.add(txt(this, 330, y0, '🎖️ ช่องใบรับรอง (Passive พิเศษ) · เปิดตาม Base Lv', 16, UI.text, true))
    CERT_SLOTS_AT.forEach((lv, i) => {
      const x = 330 + i * 152, open = s.baseLevel >= lv
      b.add(panel(this, x, y0 + 28, 144, 56, open ? 0x2a3b5a : 0x1d2140, open ? COLORS.gold : UI.line, 10))
      b.add(txt(this, x + 72, y0 + 56, open ? 'ว่าง\n(เร็วๆ นี้)' : `🔒 Base Lv ${lv}`, 12, open ? UI.gold : UI.sub).setOrigin(0.5).setAlign('center'))
    })
    b.add(txt(this, 330, y0 + 100, '🌳 ทาเลนต์ & เปลี่ยนอาชีพ', 16, UI.text, true))
    if (canChangeJob(s) || s.job !== 'novice') {
      b.add(txt(this, 330, y0 + 126, s.job === 'novice' ? 'ล้มบอสดันแรกแล้ว! ไปเลือกอาชีพได้เลย' : 'ลงแต้มต้นสกิลได้ที่แท็บ 🌳 · เปลี่ยนอาชีพใหม่ได้ฟรีช่วงทดลอง (คืนแต้มให้)', 13, UI.gold).setWordWrapWidth(420))
      b.add(button(this, 850, y0 + 132, 150, 36, '🎓 อาชีพ', () => go(this, 'job'), { size: 15 }))
    } else b.add(txt(this, 330, y0 + 126, 'ปลดล็อกเมื่อล้มบอสดันแรก (ราชาเจลล็อป) · มี 5 อาชีพ: นักดาบ นักธนู จอมเวท นักบวช โจร', 13, UI.sub).setWordWrapWidth(600))
  }

  // ---------- tab 4: skill tree (data/tree.ts) ----------
  private treeTab() {
    const s = save(), b = this.body!
    const job = JOBS[s.job]
    if (s.job === 'novice') {
      b.add(txt(this, 330, 130, '🌳 ต้นสกิลเปิดหลังเปลี่ยนอาชีพ', 20, UI.gold, true))
      b.add(txt(this, 330, 166, 'อาชีพละ 2 สาย (จอมเวท 3 สายตามธาตุ) · ลงแต้มสกิลเดียวกับสกิลอาชีพ\nโหนดสุดท้าย ★ เลือกได้อาชีพละ 1 อันเท่านั้น', 14, UI.sub))
      return
    }
    const t = (s.jobTree ??= {})
    b.add(txt(this, 330, 114, `แต้มสกิลเหลือ: ${s.skillPoints}`, 18, s.skillPoints ? UI.gold : UI.sub, true))
    b.add(txt(this, 500, 118, `${job.icon} ลงไปแล้ว ${treeSpent(t, s.job)} · ทุก 2 แต้มเปิดโหนดถัดไป · ★ ได้ 1 อัน`, 12, UI.sub))
    b.add(button(this, 885, 124, 90, 30, 'รีเซ็ตฟรี', () => {
      const back = resetTree(s)
      if (!back) return
      s.skillPoints += back; persist(); toast(this, `คืน ${back} แต้มแล้ว`); this.redraw()
    }, { size: 13, fill: 0x5a5f8a, color: UI.text }).setEnabled(treeSpent(t, s.job) > 0))
    const brs = branchesOf(s.job)
    const core = brs.find((x) => nodesOf(x.id).every((n) => n.tier === 0))
    const cols = brs.filter((x) => x !== core)
    const x0 = 330, wAll = 600, gap = 10
    const cw = (wAll - gap * (cols.length - 1)) / cols.length
    let top = 146
    const node = (n: ReturnType<typeof nodesOf>[number], x: number, y: number, w: number, h: number) => {
      const lv = t[n.id] ?? 0, why = lockReason(t, s.job, n), cap = n.tier === 4
      const open = !why || why === 'เต็มแล้ว'
      b.add(panel(this, x, y, w, h, lv ? 0x2a3b5a : open ? UI.panel : 0x1d2140, cap ? COLORS.gold : lv ? 0x7fd7ff : UI.line, 10))
      b.add(txt(this, x + 8, y + 4, `${cap ? '★ ' : ''}${n.icon} ${n.name}`, 13, open ? UI.text : UI.sub, true))
      b.add(txt(this, x + w - 8, y + 5, `${lv}/${n.max}`, 12, lv ? UI.gold : UI.sub, true).setOrigin(1, 0))
      b.add(txt(this, x + 8, y + 23, n.desc(Math.max(1, lv)), 11, open ? UI.green : UI.sub).setWordWrapWidth(w - 60))
      if (why && why !== 'เต็มแล้ว') b.add(txt(this, x + 8, y + h - 16, `🔒 ${why}`, 10, UI.sub))
      b.add(button(this, x + w - 26, y + h - 20, 40, 26, '+', () => {
        if (s.skillPoints <= 0 || lockReason(t, s.job, n)) return
        t[n.id] = (t[n.id] ?? 0) + 1; s.skillPoints--; persist(); this.redraw()
      }, { size: 16 }).setEnabled(s.skillPoints > 0 && !why))
    }
    if (core) {
      for (const n of nodesOf(core.id)) node(n, x0, top, wAll, 50)
      top += 58
    }
    const nh = core ? 70 : 86
    cols.forEach((br, i) => {
      const x = x0 + i * (cw + gap)
      b.add(txt(this, x, top, `${br.icon} ${br.name} · ${branchSpent(t, br.id)}`, 15, UI.gold, true))
      b.add(txt(this, x, top + 20, br.blurb, 11, UI.sub).setWordWrapWidth(cw))
      nodesOf(br.id).forEach((n, k) => node(n, x, top + 40 + k * (nh + 6), cw, nh))
    })
  }

  // ---------- tab 5: talents (4 tiers by Job Lv, pick 1 of 3, free swap in town) ----------
  private talentTab() {
    const s = save(), b = this.body!
    if (s.job === 'novice') {
      b.add(txt(this, 330, 130, '⭐ ทาเลนต์เปิดหลังเปลี่ยนอาชีพ', 20, UI.gold, true))
      b.add(txt(this, 330, 166, `4 ชั้น เปิดที่ Job Lv ${TALENT_RULES.rowsAt.join(' / ')} · ชั้นละเลือก 1 จาก 3\nใช้แต้มทาเลนต์ (แยกจากแต้มสกิล) ได้ 1 แต้มทุก ${TALENT_RULES.pointEveryJobLv} Job Lv · รีเซ็ตฟรีในเมือง`, 14, UI.sub))
      return
    }
    const t = (s.jobTalents ??= {})
    const free = talentFree(t, s.jobLevel)
    b.add(txt(this, 330, 114, `⭐ แต้มทาเลนต์เหลือ: ${free}`, 18, free > 0 ? UI.gold : UI.sub, true))
    b.add(txt(this, 540, 118, `ได้ ${talentEarned(s.jobLevel)} จาก Job Lv ${s.jobLevel} · กดการ์ด = ลง/อัปแรงก์`, 12, UI.sub))
    b.add(button(this, 885, 124, 90, 30, 'รีเซ็ตฟรี', () => {
      s.jobTalents = {}; persist(); toast(this, 'คืนแต้มทาเลนต์แล้ว'); this.redraw()
    }, { size: 13, fill: 0x5a5f8a, color: UI.text }).setEnabled(Object.keys(t).length > 0))
    TALENT_RULES.rowsAt.forEach((lv, i) => {
      const row = i + 1, y = 144 + i * 104, open = s.jobLevel >= lv
      const opts = talentsOf(s.job, row)
      const cur = talentPick(t, row)
      b.add(txt(this, 330, y, `ชั้น ${row} · Job Lv ${lv}${open ? '' : ' 🔒'}`, 14, open ? UI.text : UI.sub, true))
      if (!opts.length) { b.add(txt(this, 330, y + 26, 'กำลังออกแบบ (เร็วๆ นี้)', 12, UI.sub)); return }
      const cw = (600 - 2 * 10) / 3
      opts.slice(0, 3).forEach((o, k) => {
        const x = 330 + k * (cw + 10), picked = cur?.id === o.id
        const rank = picked ? Math.min(cur!.rank, o.max) : 0
        b.add(panel(this, x, y + 20, cw, 76, picked ? 0x2a3b5a : open ? UI.panel : 0x1d2140, picked ? COLORS.gold : UI.line, 10))
        b.add(txt(this, x + 8, y + 24, `${o.icon} ${o.name}  ${rank}/${o.max}`, 13, open ? UI.text : UI.sub, true))
        b.add(txt(this, x + 8, y + 43, o.desc(Math.max(1, Math.min(rank + (rank < o.max ? 1 : 0), o.max))), 11, open ? UI.green : UI.sub).setWordWrapWidth(cw - 16))
        // switching inside a row refunds the old pick's ranks, so the cost is 1 TP either way
        const refund = picked ? 0 : cur?.rank ?? 0
        const can = open && rank < o.max && free + refund >= 1
        if (can) {
          const hit = this.add.zone(x, y + 20, cw, 76).setOrigin(0).setInteractive({ useHandCursor: true })
          hit.on('pointerup', () => { t[String(row)] = { id: o.id, rank: rank + 1 }; persist(); this.redraw() })
          b.add(hit)
        }
      })
    })
  }

}

export function derivedRows(st: Stats): [string, string][] {
  const pct = (n: number) => `${Math.round(n * 100)}%`
  return [
    ['HP', `${Math.round(st.maxHp)}`],
    ['P.ATK (ต่ำ~สูง)', `${Math.round(st.atk * st.minPct)}~${Math.round(st.atk)}`],
    ['M.ATK', `${Math.round(st.matk)}`],
    ['ดาเมจสกิลกายภาพ', `+${(st.pskill * 100).toFixed(1)}%`],
    ['P.DEF / M.DEF', `${st.def.toFixed(1)} (-${Math.round(100 - 10000 / (100 + st.def))}%) / ${pct(st.mdef)}`],
    ['Hit / Flee', `${Math.round(st.hit)} / ${Math.round(st.flee)}`],
    ['คริ / ต้านทาน', `${(st.crit * 100).toFixed(1)}% / ${pct(st.tenacity)}`],
    ['สวนกลับ / คอมโบ', `${pct(st.counter)} / ${pct(st.combo)}`],
    ['ความเร็วเทิร์น', `${(st.aspd / 1.6 * 10).toFixed(1)}`],
    ['ฟื้น HP / ฮีลแรง', `${(st.regen * 1.5).toFixed(2)}%/เทิร์น · +${pct(st.healAmp)}`],
    ['ดูดเลือด / หลบ→ฟื้น HP', `${pct(st.lifesteal)} / ${(st.dodgeHeal * 100).toFixed(1)}%`],
    ['ดาเมจคริ / โล่ต้นเวฟ', `${pct(st.critMul)} / ${pct(st.waveShield)}`],
    ['Max Mana / ฟื้น/เทิร์น', `${Math.round(st.maxRes)} / ${Math.round(st.resRegen * 3)}`],
    ['หลบโชคดี / ดรอปหายาก', `${(st.luckyDodge * 100).toFixed(1)}% / ${(st.dropChance * 100).toFixed(1)}%`],
    ['การ์ดตำนาน / อีเวนต์', `${(st.legendChance * 100).toFixed(1)}% / ${pct(st.eventChance)}`],
  ]
}

const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + '…' : t)
