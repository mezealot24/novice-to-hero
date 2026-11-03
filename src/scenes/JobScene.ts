import Phaser from 'phaser'
import { COLORS, H, TAGS, W } from '../data/game-data'
import { BASE_JOBS, JOBS, type JobId } from '../data/jobs'
import { RESOURCES } from '../data/meta'
import { changeJob, save } from '../save'
import { sfx } from '../sfx'
import { backdrop, button, confirm, go, txt, UI } from '../ui'

// Job change: pick one of the 5 base classes. (Playtest period: re-picking later is free.)
export class JobScene extends Phaser.Scene {
  private pick: JobId = 'swordsman'
  constructor() { super('job') }

  create() {
    backdrop(this, false)
    const s = save()
    this.pick = s.job === 'novice' ? 'swordsman' : s.job
    txt(this, W / 2, 30, '🎓 เลือกอาชีพแรก', 28, UI.gold, true).setOrigin(0.5)
    txt(this, W / 2, 62, s.job === 'novice' ? 'ล้มราชาเจลล็อปแล้ว โนวิสพร้อมเติบโต! Job Lv เริ่มใหม่ที่ 1 สกิลโนวิสยังติดตัว' : 'ช่วงทดลอง: เปลี่ยนอาชีพใหม่ได้ฟรี แต้มสกิลอาชีพคืนให้ครบ', 15, UI.sub).setOrigin(0.5)

    const cw = 178, ch = 400, gap = 8
    const x0 = W / 2 - ((BASE_JOBS.length - 1) * (cw + gap)) / 2
    const frames: { id: JobId; g: Phaser.GameObjects.Graphics; x: number }[] = []
    const draw = () => frames.forEach((f) => {
      const on = f.id === this.pick
      f.g.clear()
      f.g.fillStyle(on ? 0x34396a : UI.panel, 0.97).fillRoundedRect(f.x - cw / 2, 86, cw, ch, 14)
      f.g.lineStyle(on ? 4 : 2, on ? COLORS.gold : UI.line).strokeRoundedRect(f.x - cw / 2, 86, cw, ch, 14)
    })
    BASE_JOBS.forEach((id, i) => {
      const j = JOBS[id], x = x0 + i * (cw + gap)
      frames.push({ id, g: this.add.graphics(), x })
      const spr = this.add.image(x, 160, j.tex).setScale(2)
      this.tweens.add({ targets: spr, y: 154, duration: 500 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
      txt(this, x, 214, `${j.icon} ${j.name}`, 20, UI.text, true).setOrigin(0.5)
      txt(this, x, 238, j.focus, 14, UI.gold, true).setOrigin(0.5)
      const res = j.resource ? RESOURCES[j.resource] : null
      const tags = j.tags.map((t) => `${TAGS[t].icon}${TAGS[t].name}`).join(' ')
      txt(this, x - cw / 2 + 12, 258, [
        j.blurb,
        `พลัง: ${res ? res.name : '-'}`,
        `อัตโนมัติ: ${j.auto.icon} ${j.auto.name}`,
        `กดเอง: ${j.ult.icon} ${j.ult.name}`,
        `การ์ด: ${tags} + ⭐ทั่วไป`,
      ].join('\n'), 12, '#d8d4f0').setWordWrapWidth(cw - 22).setLineSpacing(5)
      const z = this.add.zone(x, 86 + ch / 2, cw, ch).setInteractive({ useHandCursor: true })
      z.on('pointerup', () => { this.pick = id; sfx.pop(); draw(); detail.setText(this.detail()) })
    })
    draw()
    const detail = txt(this, W / 2, 500, this.detail(), 13, UI.text).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(W - 300)
    button(this, 70, H - 36, 110, 42, '‹ กลับ', () => go(this, 'hub'), { fill: 0x5a5f8a, color: UI.text, size: 17 })
    button(this, W - 120, H - 36, 200, 50, 'เป็นอาชีพนี้!', () => {
      const j = JOBS[this.pick]
      confirm(this, `เป็น${j.name}?`, `${j.blurb}\nเลือกแล้วยังเปลี่ยนได้ฟรีในช่วงทดลองค่ะ`, 'ตกลง', () => {
        changeJob(this.pick); sfx.win(); go(this, 'hub')
      })
    }, { size: 20 })
  }

  private detail() {
    const j = JOBS[this.pick]
    return `${j.auto.icon} ${j.auto.desc}\n${j.ult.icon} ${j.ult.name} (คูลดาวน์ ${j.ult.cd} เทิร์น): ${j.ult.desc}`
  }
}
