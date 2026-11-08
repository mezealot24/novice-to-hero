import Phaser from 'phaser'
import { COLORS, FONT_NUM, H, W } from '../data/game-data'
import { RACES } from '../data/meta'
import { hasSave, load } from '../save'
import { JOBS } from '../data/jobs'
import { setMuted } from '../sfx'
import { backdrop, button, confirm, fullscreenButton, go, panel, toast, txt, UI } from '../ui'
import { cloudEnabled, linkProvider, status, syncStart } from '../cloud'
import { PREVIEW, PREVIEW_JOBS, previewHero } from '../preview-kit'
import { analyticsEnabled, consentState, ftue, setConsent } from '../analytics'

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
    if (!hasSave()) txt(this, W / 2, by + 74, cloudEnabled ? 'เกมจะบันทึกอัตโนมัติบน cloud' : 'เกมจะบันทึกอัตโนมัติในเครื่องนี้', 15, UI.sub).setOrigin(0.5)

    if (PREVIEW) { // playtest link only: start as a ready-made Lv 20 hero
      txt(this, W / 2, H - 116, '🧪 ลิงก์ทดลอง: ตัวทดสอบ Lv 20 (เกียร์คราฟต์ +5 · ดัน 1-4 ผ่านแล้ว · แต้มยังไม่ลง)', 14, UI.gold).setOrigin(0.5)
      PREVIEW_JOBS.forEach((j, i) => button(this, W / 2 + (i - 2) * 150, H - 78, 140, 44, `${JOBS[j].icon} ${JOBS[j].name}`, () => { previewHero(j); go(this, 'hub') }, { size: 16, fill: 0x3a6b4a, color: UI.text }))
    }
    if (cloudEnabled) {
      button(this, W - 110, H - 40, 190, 44, '☁️ บัญชี / เซฟออนไลน์', () => go(this, 'cloud', { from: 'title' }), { size: 15, fill: 0x2f6a8a, color: UI.text })
      // pull the cloud save before the player continues (the cloud always wins)
      void syncStart().then((r) => {
        if (!this.scene.isActive('title')) return
        if (r === 'adopted' || !hasSave() !== !s) { this.scene.restart(); return } // the cloud save arrived: redraw Continue / New game
        // still a guest: one obvious button so the save follows the player to every device
        if (r === 'ok' && status.guest) button(this, W - 150, H - 98, 270, 48, '🔐 Login Google · เซฟข้ามเครื่อง', async () => {
          const err = await linkProvider('google') // on success the browser leaves for Google
          if (err) toast(this, `login ไม่ได้: ${err}`, UI.red)
        }, { size: 15 })
      })
    }
    txt(this, 16, H - 28, 'v0.3 · M3 shell · ภาพชั่วคราว', 13, UI.sub)
    fullscreenButton(this, W - 30, 30)
    if (analyticsEnabled) { // design/analytics-v1.md: ask once (PDPA), the answer can be changed here any time
      ftue('title')
      const st = consentState()
      if (st === 'unknown') consentModal(this, () => this.scene.restart())
      else button(this, 116, H - 62, 200, 34, st === 'yes' ? '📊 ส่งข้อมูลการเล่น: เปิด' : '📊 ส่งข้อมูลการเล่น: ปิด', () => consentModal(this, () => this.scene.restart()),
        { size: 13, fill: 0x3a3f66, color: UI.sub })
    }
  }
}

/** Opt-in for anonymous play data. Both answers are the same size: saying no must be as easy as yes. */
function consentModal(scene: Phaser.Scene, done: () => void) {
  const c = scene.add.container(0, 0).setDepth(40000)
  c.add(scene.add.rectangle(W / 2, H / 2, W, H, UI.night, 0.8).setInteractive())
  const pw = 600, ph = 300
  c.add(panel(scene, W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, UI.panelHi, COLORS.gold))
  c.add(txt(scene, W / 2, H / 2 - ph / 2 + 24, '📊 ช่วยให้เกมดีขึ้นได้ไหมคะ?', 24, UI.gold, true).setOrigin(0.5, 0))
  c.add(txt(scene, W / 2, H / 2 - ph / 2 + 68, [
    'ขอส่งข้อมูลการเล่นแบบไม่ระบุตัวตน (หน้าที่เปิด ด่านที่เล่น เลเวล ปุ่มซื้อที่กด)',
    'เพื่อปรับความยากและแก้จุดที่ผู้เล่นติดในช่วงทดสอบ',
    'ไม่ส่งชื่อ อีเมล หรือข้อมูลส่วนตัว · เปลี่ยนใจได้ที่หน้านี้ตลอด',
    'ถ้าอายุต่ำกว่า 10 ปี ให้ผู้ปกครองเป็นคนเลือกนะคะ',
  ].join('\n'), 16, UI.text).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(pw - 40))
  const pick = (yes: boolean) => { c.destroy(); setConsent(yes); done() }
  c.add(button(scene, W / 2 - 130, H / 2 + ph / 2 - 44, 230, 52, 'ไม่ส่ง', () => pick(false), { fill: 0x5a5f8a, color: UI.text, size: 19 }))
  c.add(button(scene, W / 2 + 130, H / 2 + ph / 2 - 44, 230, 52, 'ส่งได้เลย', () => pick(true), { size: 19 }))
}
