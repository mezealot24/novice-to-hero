import Phaser from 'phaser'
import { COLORS, H, W } from '../data/game-data'
import { JOB_LINES, LINES } from '../data/perks'
import { BASE_JOBS, JOB_CHANGE, JOBS, type JobId } from '../data/jobs'
import { RESOURCES } from '../data/meta'
import { canRepickJob, changeJob, repickJob, save } from '../save'
import { sfx } from '../sfx'
import { backdrop, button, confirm, go, toast, txt, UI } from '../ui'

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

  create() {
    backdrop(this, false)
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
        changeJob(this.pick); sfx.win(); go(this, 'hub')
      })
    }, { size: 20 })
  }

  private detail() {
    const j = JOBS[this.pick]
    return `${j.auto.icon} ${j.auto.desc}\n${j.ult.icon} ${j.ult.name} (คูลดาวน์ ${j.ult.cd} เทิร์น): ${j.ult.desc}`
  }
}
