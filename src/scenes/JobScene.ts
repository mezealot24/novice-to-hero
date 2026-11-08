import Phaser from 'phaser'
import { COLORS, H, W } from '../data/game-data'
import { JOB_LINES, LINES } from '../data/perks'
import { BASE_JOBS, JOB_CHANGE, JOBS, type JobId } from '../data/jobs'
import { RESOURCES } from '../data/meta'
import { canRepickJob, changeJob, changeJob2, changeJob3, job3Lock, job3SwapCost, repickJob, save, setJob3Path, setJob3Variant } from '../save'
import { activeJob3, JOB3_RULES, job3Of, type Job3Variant } from '../data/jobs3'
import { JOB2, JOB2_RULES, job2Of, type Job2Id } from '../data/jobs2'
import { sfx } from '../sfx'
import { backdrop, button, confirm, go, toast, txt, UI } from '../ui'
import { ftue, track } from '../analytics'

const REPICK_BODY = `ใช้ 💎${JOB_CHANGE.repickGems} เปลี่ยนเป็นอาชีพอื่น\nคืนแต้มใยสกิลทั้งหมด · ล้างทาเลนต์ (ลงใหม่ได้ฟรี)\nเก็บไว้: Base Lv, Job Lv, สถานะ, ของ, การ์ด, zeny`

/** 🔄 re-pick entry (Hub + character screen): gem check, then the job screen. Gems are paid only on the final pick. */
export function askRepick(scene: Phaser.Scene) {
  const s = save(), cost = JOB_CHANGE.repickGems
  if (s.gems < cost) { toast(scene, `เพชรไม่พอ ต้องใช้ 💎${cost} (มี ${s.gems})\nรับฟรีได้ที่ 🎁 เพชรฟรีรายวัน · เลเวลอัป`, UI.sub); return }
  confirm(scene, '🔄 เปลี่ยนอาชีพใหม่?', `${REPICK_BODY}\nจ่ายเพชรตอนกดเลือกอาชีพใหม่เท่านั้นค่ะ`, 'ไปเลือก', () => go(scene, 'job'))
}

// Job change: Novice picks one of the 5 base classes; a class can re-pick another one for gems (v52).
export class JobScene extends Phaser.Scene {
  private pick: JobId = 'swordsman'
  constructor() { super('job') }

  create(data?: { job2?: boolean; job3?: boolean }) {
    backdrop(this, false)
    if (data?.job3) { this.create3(); return }
    if (data?.job2) { this.create2(); return }
    const s = save()
    const repick = canRepickJob(s)
    const list = BASE_JOBS.filter((id) => id !== s.job) // a re-pick never offers the current class
    this.pick = list[0]
    txt(this, W / 2, 30, repick ? `🔄 เปลี่ยนอาชีพใหม่ (ตอนนี้: ${JOBS[s.job].icon} ${JOBS[s.job].name})` : '🎓 เลือกอาชีพแรก', 28, UI.gold, true).setOrigin(0.5)
    txt(this, W / 2, 62, repick ? `ใช้ 💎${JOB_CHANGE.repickGems} (มี ${s.gems}) · คืนแต้มใยสกิลครบ ล้างทาเลนต์ · Job Lv ${s.jobLevel} คงเดิม` : 'ล้มราชาเจลล็อปแล้ว โนวิสพร้อมเติบโต! Job Lv เริ่มใหม่ที่ 1 สกิลโนวิสยังติดตัว', 15, UI.sub).setOrigin(0.5)

    const cw = 178, ch = 400, gap = 8
    const x0 = W / 2 - ((list.length - 1) * (cw + gap)) / 2
    const frames: { id: JobId; g: Phaser.GameObjects.Graphics; x: number }[] = []
    const draw = () => frames.forEach((f) => {
      const on = f.id === this.pick
      f.g.clear()
      f.g.fillStyle(on ? 0x34396a : UI.panel, 0.97).fillRoundedRect(f.x - cw / 2, 86, cw, ch, 14)
      f.g.lineStyle(on ? 4 : 2, on ? COLORS.gold : UI.line).strokeRoundedRect(f.x - cw / 2, 86, cw, ch, 14)
    })
    list.forEach((id, i) => {
      const j = JOBS[id], x = x0 + i * (cw + gap)
      frames.push({ id, g: this.add.graphics(), x })
      const spr = this.add.image(x, 160, j.tex).setScale(2)
      this.tweens.add({ targets: spr, y: 154, duration: 500 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
      txt(this, x, 214, `${j.icon} ${j.name}`, 20, UI.text, true).setOrigin(0.5)
      txt(this, x, 238, j.focus, 14, UI.gold, true).setOrigin(0.5)
      const res = j.resource ? RESOURCES[j.resource] : null
      const tags = (JOB_LINES[j.id] ?? []).map((l) => `${LINES[l].icon}${LINES[l].name}`).join(' ') // พร v2 own lines
      txt(this, x - cw / 2 + 12, 258, [
        j.blurb,
        `พลัง: ${res ? res.name : '-'}`,
        `อัตโนมัติ: ${j.auto.icon} ${j.auto.name}`,
        `กดเอง: ${j.ult.icon} ${j.ult.name}`,
        `พร: ${tags} + ⭐ทั่วไป`,
      ].join('\n'), 12, '#d8d4f0').setWordWrapWidth(cw - 22).setLineSpacing(5)
      const z = this.add.zone(x, 86 + ch / 2, cw, ch).setInteractive({ useHandCursor: true })
      z.on('pointerup', () => { this.pick = id; sfx.pop(); draw(); detail.setText(this.detail()) })
    })
    draw()
    const detail = txt(this, W / 2, 500, this.detail(), 13, UI.text).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(W - 300)
    button(this, 70, H - 36, 110, 42, '‹ กลับ', () => go(this, 'hub'), { fill: 0x5a5f8a, color: UI.text, size: 17 })
    button(this, W - 120, H - 36, 200, 50, 'เป็นอาชีพนี้!', () => {
      const j = JOBS[this.pick]
      if (repick) {
        confirm(this, `เปลี่ยนเป็น${j.name}? 💎${JOB_CHANGE.repickGems}`, REPICK_BODY, `จ่าย 💎${JOB_CHANGE.repickGems}`, () => {
          if (!repickJob(this.pick)) { toast(this, `เพชรไม่พอ ต้องใช้ 💎${JOB_CHANGE.repickGems}`, UI.sub); return }
          sfx.win(); go(this, 'hub')
        })
        return
      }
      confirm(this, `เป็น${j.name}?`, `${j.blurb}\nเปลี่ยนเป็นอาชีพอื่นทีหลังได้ด้วย 💎${JOB_CHANGE.repickGems}`, 'ตกลง', () => {
        changeJob(this.pick); track({ e: 'job_change', tier: 1, job: this.pick, gems: 0 }); ftue('job1'); sfx.win(); go(this, 'hub')
      })
    }, { size: 20 })
  }

  // ---------- 2nd job (design/second-jobs-v1.md): Job Lv 40 + ดัน 5 → pick 1 of the 2 ----------
  private pick2: Job2Id = 'berserker'
  private create2() {
    const s = save(), base = JOBS[s.job], list = job2Of(s.job)
    const repick = !!s.job2, cost = repick ? JOB2_RULES.repickGems : 0
    this.pick2 = list.find((j) => j.id !== s.job2)?.id ?? list[0].id
    txt(this, W / 2, 30, repick ? `🔄 เปลี่ยนสายอาชีพขั้น 2 (ตอนนี้: ${JOB2[s.job2!].icon} ${JOB2[s.job2!].name})` : `⭐ อาชีพขั้น 2 ของ${base.icon} ${base.name}`, 28, UI.gold, true).setOrigin(0.5)
    txt(this, W / 2, 62, repick ? `ใช้ 💎${cost} (มี ${s.gems}) · คืนแต้มใยชั้น 2 ครบ · Job2 Lv ${s.job2Level ?? 1} คงเดิม` : 'ใยสกิลเดิมอยู่ครบ + ได้ใยชั้น 2 · Job2 Lv เริ่มที่ 1 (สูงสุด 50) ได้แต้มใยชั้น 2 ทุกเลเวล', 15, UI.sub).setOrigin(0.5)
    if (!list.length) { txt(this, W / 2, 300, 'อาชีพนี้ยังไม่มีขั้น 2 (กำลังทำ เร็วๆ นี้ค่ะ)', 20, UI.text).setOrigin(0.5); button(this, 70, H - 36, 110, 42, '‹ กลับ', () => go(this, 'hub'), { fill: 0x5a5f8a, color: UI.text, size: 17 }); return }
    const cw = 420, ch = 430, gap = 20, x0 = W / 2 - ((list.length - 1) * (cw + gap)) / 2
    const frames: { id: Job2Id; g: Phaser.GameObjects.Graphics; x: number }[] = []
    const draw = () => frames.forEach((f) => {
      const on = f.id === this.pick2
      f.g.clear()
      f.g.fillStyle(on ? 0x34396a : UI.panel, 0.97).fillRoundedRect(f.x - cw / 2, 86, cw, ch, 14)
      f.g.lineStyle(on ? 4 : 2, on ? COLORS.gold : UI.line).strokeRoundedRect(f.x - cw / 2, 86, cw, ch, 14)
    })
    list.forEach((j, i) => {
      const x = x0 + i * (cw + gap), cur = j.id === s.job2
      frames.push({ id: j.id, g: this.add.graphics(), x })
      const spr = this.add.image(x - 140, 150, base.tex).setScale(1.8)
      this.tweens.add({ targets: spr, y: 144, duration: 520 + i * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
      txt(this, x - 80, 118, `${j.icon} ${j.name}${cur ? ' (ตอนนี้)' : ''}`, 22, UI.text, true)
      txt(this, x - 80, 150, j.focus, 14, UI.gold, true)
      const res = RESOURCES[j.resource ?? base.resource ?? 'mana']
      txt(this, x - cw / 2 + 14, 200, [
        j.blurb,
        `พลัง: ${res.name} · เก่งเมื่อใช้: ${j.mastery.weapon}`,
        `${j.signature.icon} ${j.signature.name}: ${j.signature.desc}`,
        `${j.skill3.icon} ทักษะ 3 ${j.skill3.name}: ${j.skill3.desc}`,
        `${j.ult.icon} Ult ${j.ult.name}: ${j.ult.desc}`,
      ].join('\n'), 12, '#d8d4f0').setWordWrapWidth(cw - 28).setLineSpacing(5)
      const z = this.add.zone(x, 86 + ch / 2, cw, ch).setInteractive({ useHandCursor: true })
      z.on('pointerup', () => { if (!cur) { this.pick2 = j.id; sfx.pop(); draw() } })
    })
    draw()
    button(this, 70, H - 36, 110, 42, '‹ กลับ', () => go(this, 'hub'), { fill: 0x5a5f8a, color: UI.text, size: 17 })
    button(this, W - 120, H - 36, 200, 50, repick ? `เปลี่ยน 💎${cost}` : 'เป็นอาชีพนี้!', () => {
      const j = JOB2[this.pick2]
      if (j.id === s.job2) return
      confirm(this, `เป็น${j.icon} ${j.name}?`, repick ? `จ่าย 💎${cost} · คืนแต้มใยชั้น 2 ทั้งหมด` : `${j.blurb}\nเปลี่ยนสายทีหลังได้ด้วย 💎${JOB2_RULES.repickGems}`, repick ? `จ่าย 💎${cost}` : 'ตกลง', () => {
        if (!changeJob2(j.id, cost)) { toast(this, cost ? `เพชรไม่พอ ต้องใช้ 💎${cost}` : 'ยังเปลี่ยนไม่ได้', UI.sub); return }
        track({ e: 'job_change', tier: 2, job: j.id, gems: cost }); ftue('job2')
        sfx.win(); go(this, 'hub')
      })
    }, { size: 20 })
  }

  // ---------- 3rd job "Awakening" (design/awakening-crusader-v1.md): unlock / awaken / path + variant ----------
  private create3() {
    const s = save(), d = s.job2 ? job3Of(s.job2) : undefined
    button(this, 70, H - 36, 110, 42, '‹ กลับ', () => go(this, 'hub'), { fill: 0x5a5f8a, color: UI.text, size: 17 })
    if (!d) { txt(this, W / 2, 300, 'อาชีพขั้น 2 นี้ยังไม่มีขั้น 3 (กำลังทำ เร็วๆ นี้ค่ะ)', 20, UI.text).setOrigin(0.5); return }
    const on = activeJob3(s) === d.id, why = job3Lock(s, d.id)
    txt(this, W / 2, 30, `${d.icon} ตื่นรู้: ${JOB2[d.parent].icon} ${JOB2[d.parent].name} → ${d.name}`, 28, UI.gold, true).setOrigin(0.5)
    txt(this, W / 2, 62, 'ใยชั้น 1 + ใยชั้น 2 + Ult เดิมอยู่ครบ · ชั้น 3 เพิ่มของใหม่ซ้อนขึ้นไป · ไม่ใช้เพชร', 15, UI.sub).setOrigin(0.5)
    const spr = this.add.image(200, 220, JOBS[s.job].tex).setScale(2.2).setTint(0xffe7a0) // A2: same sprite + gold aura (no new art)
    this.tweens.add({ targets: spr, y: 212, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    txt(this, 330, 100, [
      d.blurb,
      `${d.signature.icon} ${d.signature.name}: ${d.signature.desc}`,
      `✨ Ult วิวัฒน์ 2 ${d.ultName}: Grand Cross ยิงเพิ่ม 1 pulse · pulse ที่โดน ≥ 3 ตัวได้ศรัทธา`,
      `Job3 Lv 1-${JOB3_RULES.maxJobLevel} · ใยชั้น 3 ได้ 1 แต้มต่อ Lv · เปลี่ยนสายขั้น 2 = ชั้น 3 พักไว้ ไม่หาย`,
    ].join('\n'), 14, '#d8d4f0').setWordWrapWidth(600).setLineSpacing(6)
    if (!on) {
      txt(this, 330, 290, why ? `🔒 ยังขาด: ${why}` : '✅ พร้อมตื่นรู้แล้ว!', 16, why ? UI.sub : UI.green, true).setWordWrapWidth(600)
      button(this, W - 130, H - 36, 220, 50, `${d.icon} ตื่นรู้!`, () => {
        if (!changeJob3(d.id)) { toast(this, why || 'ยังตื่นรู้ไม่ได้', UI.sub); return }
        track({ e: 'job_change', tier: 3, job: d.id, gems: 0 }); ftue('job3')
        sfx.win(); go(this, 'hub')
      }, { size: 20 }).setEnabled(!why)
      return
    }
    // awakened: pick the Skill 3 variant (free) and the path (free once a week)
    txt(this, 330, 270, `ทักษะ 3 Holy Cross แบบไหน (เปลี่ยนฟรี)`, 16, UI.gold, true)
    ;(['a', 'b'] as Job3Variant[]).forEach((v, i) => {
      const V = d.variants[v], cur = (s.job3Var ?? 'a') === v
      button(this, 450 + i * 250, 312, 236, 40, `${cur ? '✅ ' : ''}${V.icon} ${V.name}`, () => { if (setJob3Variant(v)) { sfx.pop(); this.scene.restart({ job3: true }) } }, { size: 15, fill: cur ? COLORS.gold : 0x4a5a8a, color: cur ? UI.ink : UI.text })
      txt(this, 336 + i * 250, 336, V.desc, 11, UI.sub).setWordWrapWidth(228)
    })
    const cost = job3SwapCost(s), path = s.job3Path ?? 'pure'
    txt(this, 330, 400, `สาย (เปลี่ยน${cost ? ` 💎${cost}` : 'ฟรี'} · ฟรีสัปดาห์ละครั้ง · คืนแต้มใยชั้น 3)`, 16, UI.gold, true)
    ;([['pure', '⚜️ Pure', 'ใยชั้น 3 ครบทุกชั้น + ★'], ['hybrid', `👊 Hybrid`, `ใยชั้น 3 ชั้น 1-2 + ใย ${JOB2[d.sibling].name} ชั้น 1-2`]] as const).forEach(([p, name, desc], i) => {
      const cur = path === p
      button(this, 450 + i * 250, 442, 236, 40, `${cur ? '✅ ' : ''}${name}`, () => {
        if (cur) return
        confirm(this, `เปลี่ยนเป็น ${name}?`, `${desc}\nคืนแต้มใยชั้น 3 ทั้งหมด${cost ? ` · จ่าย 💎${cost}` : ' · ครั้งนี้ฟรี'}`, 'เปลี่ยน', () => {
          if (!setJob3Path(p)) { toast(this, `เพชรไม่พอ ต้องใช้ 💎${cost}`, UI.sub); return }
          sfx.pop(); this.scene.restart({ job3: true })
        })
      }, { size: 15, fill: cur ? COLORS.gold : 0x4a5a8a, color: cur ? UI.ink : UI.text })
      txt(this, 336 + i * 250, 466, desc, 11, UI.sub).setWordWrapWidth(228)
    })
  }

  private detail() {
    const j = JOBS[this.pick]
    return `${j.auto.icon} ${j.auto.desc}\n${j.ult.icon} ${j.ult.name} (คูลดาวน์ ${j.ult.cd} เทิร์น): ${j.ult.desc}`
  }
}
