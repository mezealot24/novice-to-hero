import Phaser from 'phaser'
import { cloudEnabled, conflict, linkProvider, onStatus, PROVIDERS, resolve, status, syncStart } from '../cloud'
import { button, go, panel, toast, topBar, txt, UI } from '../ui'

const STATE_LABEL = { off: 'ปิดอยู่', idle: '✅ ซิงก์แล้ว', syncing: '⏳ กำลังซิงก์…', offline: '📴 ออฟไลน์ (เล่นต่อได้ ซิงก์ทีหลัง)', conflict: '⚠️ เซฟไม่ตรงกัน ต้องเลือก', error: '❌ ซิงก์ไม่สำเร็จ' } as const

// Account + cloud save screen: sync status, link a guest to Google / Apple / Facebook / LINE, resolve a save conflict.
export class CloudScene extends Phaser.Scene {
  private off?: () => void
  private body?: Phaser.GameObjects.Container
  private from = 'title'
  constructor() { super('cloud') }

  create(data?: { from?: string }) {
    this.from = data?.from ?? 'title'
    this.cameras.main.setBackgroundColor(UI.night)
    topBar(this, '☁️ บัญชี & เซฟออนไลน์', () => go(this, this.from))
    this.off = onStatus(() => this.render())
    this.events.once('shutdown', () => this.off?.())
    this.render()
    if (cloudEnabled && status.state !== 'syncing') void syncStart().then(() => this.render())
  }

  private render() {
    this.body?.destroy()
    const b = (this.body = this.add.container(0, 0))
    if (!cloudEnabled) {
      b.add(txt(this, 120, 120, 'เวอร์ชันนี้ยังไม่เปิดเซฟออนไลน์ เซฟอยู่ในเครื่องนี้อย่างเดียวค่ะ', 18, UI.sub))
      return
    }
    b.add(panel(this, 120, 80, 720, 90, UI.panel, UI.line))
    b.add(txt(this, 144, 96, `สถานะ: ${STATE_LABEL[status.state]}`, 20, UI.text, true))
    b.add(txt(this, 144, 130, status.guest ? '👤 ตอนนี้เป็นผู้เล่นชั่วคราว (guest): ผูกบัญชีเพื่อไม่ให้เซฟหาย' : `🔗 ผูกแล้ว: ${status.linked.join(', ')}`, 16, UI.sub))

    const c = conflict()
    if (c) {
      b.add(panel(this, 120, 186, 720, 150, 0x4a2a3a, 0xff7a7a))
      b.add(txt(this, 144, 200, 'เซฟในเครื่องนี้กับบน cloud ไม่ตรงกัน เลือกอันที่จะใช้ (อีกอันจะถูกทับ)', 17, UI.text, true).setWordWrapWidth(680))
      b.add(button(this, 300, 290, 280, 52, '☁️ ใช้เซฟบน cloud', () => { void resolve('cloud') }, { size: 18 }))
      b.add(button(this, 640, 290, 280, 52, '📱 ใช้เซฟเครื่องนี้', () => { void resolve('local') }, { size: 18, fill: 0x5a5f8a, color: UI.text }))
    }

    b.add(txt(this, 120, 360, status.guest ? 'ผูกบัญชีด้วย:' : 'ผูกบัญชีเพิ่ม:', 18, UI.text, true))
    PROVIDERS.forEach((p, i) => {
      const done = status.linked.includes(p.id)
      b.add(button(this, 220 + i * 170, 420, 156, 52, done ? `✔ ${p.label}` : p.label, async () => {
        const err = await linkProvider(p.id) // on success the browser leaves for the provider
        if (err) toast(this, `ผูกไม่ได้: ${err}`, UI.red)
      }, { size: 18, fill: done ? 0x3a6b4a : 0x2f6a8a, color: UI.text }).setEnabled(!done))
    })
    b.add(button(this, 220, 500, 200, 48, '🔄 ซิงก์ตอนนี้', () => { void syncStart().then(() => this.render()) }, { size: 17, fill: 0x5a5f8a, color: UI.text }))
  }
}
