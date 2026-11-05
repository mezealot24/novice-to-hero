import Phaser from 'phaser'
import { FONT_NUM, H, W } from '../data/game-data'
import { RACES } from '../data/meta'
import { hasSave, load } from '../save'
import { JOBS } from '../data/jobs'
import { setMuted } from '../sfx'
import { backdrop, button, confirm, fullscreenButton, go, txt, UI } from '../ui'
import { cloudEnabled, conflict, syncStart } from '../cloud'
import { PREVIEW, PREVIEW_JOBS, previewHero } from '../preview-kit'

// First screen: logo, a novice bouncing on the hill, Continue / New game.
export class TitleScene extends Phaser.Scene {
  constructor() { super('title') }

  create() {
    backdrop(this)
    const s = load()
    if (s) setMuted(s.muted)

    const logo = this.add.text(W / 2, 120, 'NOVICE TO HERO', { fontFamily: FONT_NUM, fontSize: '68px', color: '#f2b84b', stroke: '#14172b', strokeThickness: 10 }).setOrigin(0.5)
    this.tweens.add({ targets: logo, y: 128, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    txt(this, W / 2, 182, 'จากโนวิสตัวจิ๋ว สู่ฮีโร่ของเมือง', 20, UI.sub).setOrigin(0.5)

    // little scene: novice + jellop
    const hero = this.add.image(W / 2 - 40, H - 150, JOBS[s?.job ?? 'novice'].tex).setScale(2.4)
    this.tweens.add({ targets: hero, y: hero.y - 10, duration: 420, yoyo: true, repeat: -1, ease: 'Quad.easeOut' })
    const j = this.add.image(W / 2 + 70, H - 140, 'jellop').setScale(1.8)
    this.tweens.add({ targets: j, scaleY: 1.5, scaleX: 2.05, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    const by = 290
    if (s) {
      button(this, W / 2, by, 320, 60, `เล่นต่อ · ${s.name}  Lv ${s.baseLevel}`, () => go(this, 'hub'), { size: 21 })
      button(this, W / 2, by + 74, 320, 50, 'สร้างตัวละครใหม่', () =>
        confirm(this, 'เริ่มใหม่?', `ตัวละคร "${s.name}" (${RACES[s.race].name} Lv ${s.baseLevel}) จะถูกลบ\nของและเพชรทั้งหมดจะหายไปด้วยนะคะ`, 'ลบแล้วเริ่มใหม่', () => go(this, 'create')),
      { fill: 0x5a5f8a, color: UI.text, size: 18 })
    } else {
      button(this, W / 2, by + 20, 320, 64, 'เริ่มเกม', () => go(this, 'create'), { size: 24 })
    }
    if (!hasSave()) txt(this, W / 2, by + 74, 'เกมจะบันทึกอัตโนมัติในเครื่องนี้', 15, UI.sub).setOrigin(0.5)

    if (PREVIEW) { // playtest link only: start as a ready-made Lv 20 hero
      txt(this, W / 2, H - 116, '🧪 ลิงก์ทดลอง: ตัวทดสอบ Lv 20 (เกียร์คราฟต์ +5 · ดัน 1-4 ผ่านแล้ว · แต้มยังไม่ลง)', 14, UI.gold).setOrigin(0.5)
      PREVIEW_JOBS.forEach((j, i) => button(this, W / 2 + (i - 2) * 150, H - 78, 140, 44, `${JOBS[j].icon} ${JOBS[j].name}`, () => { previewHero(j); go(this, 'hub') }, { size: 16, fill: 0x3a6b4a, color: UI.text }))
    }
    if (cloudEnabled) {
      button(this, W - 110, H - 40, 190, 44, '☁️ บัญชี / เซฟออนไลน์', () => go(this, 'cloud', { from: 'title' }), { size: 15, fill: 0x2f6a8a, color: UI.text })
      // pull the cloud save before the player continues; a real conflict goes to the account screen
      void syncStart().then((r) => {
        if (r === 'conflict' || conflict()) go(this, 'cloud', { from: 'title' })
        else if (!this.scene.isActive('title')) return
        else if (!hasSave() === !s) return
        else this.scene.restart() // a cloud save arrived (or went away): redraw Continue / New game
      })
    }
    txt(this, 16, H - 28, 'v0.3 · M3 shell · ภาพชั่วคราว', 13, UI.sub)
    fullscreenButton(this, W - 30, 30)
  }
}
