import Phaser from 'phaser'
import { COLORS, H, W } from '../data/game-data'
import { RACES, type RaceId } from '../data/meta'
import { newSave, setSave, wipe } from '../save'
import { backdrop, button, go, panel, txt, UI } from '../ui'

const NAMES = ['ข้าวปั้น', 'ปลาทู', 'หมูกรอบ', 'บัวลอย', 'ทองหยิบ', 'มะม่วง', 'ขนมครก', 'ลูกชิ้น', 'ส้มตำ', 'ไข่เจียว', 'โรตี', 'ข้าวเหนียว', 'ทับทิม', 'เฉาก๊วย']

// Character creation: pick a race (placeholder set) and a name (dice, no keyboard needed on phones).
export class CreateScene extends Phaser.Scene {
  private race: RaceId = 'human'
  private name = NAMES[0]
  constructor() { super('create') }

  create() {
    backdrop(this, false)
    this.race = 'human'
    this.name = Phaser.Utils.Array.GetRandom(NAMES)
    txt(this, W / 2, 34, 'สร้างตัวละคร', 30, UI.gold, true).setOrigin(0.5)
    txt(this, W / 2, 70, 'เลือกเผ่า (ทุกเผ่าเก่งได้เท่ากัน แค่เริ่มต่างกันนิดหน่อย)', 16, UI.sub).setOrigin(0.5)

    const ids = Object.keys(RACES) as RaceId[]
    const cw = 270, ch = 270, gap = 22
    const x0 = W / 2 - ((ids.length - 1) * (cw + gap)) / 2
    const cards: { id: RaceId; g: Phaser.GameObjects.Graphics; x: number }[] = []
    const draw = () => cards.forEach((c) => {
      const on = c.id === this.race
      c.g.clear()
      c.g.fillStyle(on ? 0x34396a : UI.panel, 0.97).fillRoundedRect(c.x - cw / 2, 100, cw, ch, 16)
      c.g.lineStyle(on ? 4 : 2, on ? COLORS.gold : UI.line).strokeRoundedRect(c.x - cw / 2, 100, cw, ch, 16)
    })
    ids.forEach((id, i) => {
      const r = RACES[id], x = x0 + i * (cw + gap)
      const g = this.add.graphics()
      cards.push({ id, g, x })
      txt(this, x, 128, r.icon, 46).setOrigin(0.5, 0)
      txt(this, x, 190, r.name, 26, UI.text, true).setOrigin(0.5, 0)
      txt(this, x, 228, r.blurb, 15, UI.sub).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(cw - 30)
      const bonus = Object.entries(r.bonus).map(([k, v]) => `${k.toUpperCase()} ${v! > 0 ? '+' : ''}${v}`).join('  ')
      txt(this, x, 280, bonus, 15, UI.green, true).setOrigin(0.5, 0)
      txt(this, x, 312, r.trait, 15, UI.gold).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(cw - 30)
      const hit = this.add.zone(x, 100 + ch / 2, cw, ch).setInteractive({ useHandCursor: true })
      hit.on('pointerup', () => { this.race = id; draw() })
    })
    draw()

    // name row
    panel(this, W / 2 - 230, 392, 460, 60, UI.panel)
    txt(this, W / 2 - 210, 422, 'ชื่อ', 18, UI.sub).setOrigin(0, 0.5)
    const nameT = txt(this, W / 2 - 40, 422, this.name, 26, UI.text, true).setOrigin(0.5)
    button(this, W / 2 + 160, 422, 110, 42, '🎲 สุ่ม', () => {
      let n = this.name
      while (n === this.name) n = Phaser.Utils.Array.GetRandom(NAMES)
      this.name = n
      nameT.setText(n)
    }, { fill: 0x5a5f8a, color: UI.text, size: 17 })

    button(this, W / 2, 508, 300, 60, 'เริ่มผจญภัย!', () => {
      wipe()
      setSave(newSave(this.name, this.race))
      go(this, 'hub', { fresh: true })
    }, { size: 24 })
    button(this, 70, H - 40, 110, 42, '‹ กลับ', () => go(this, 'title'), { fill: 0x5a5f8a, color: UI.text, size: 17 })
    txt(this, W - 16, H - 22, 'เผ่า/ค่าพลังเป็นตัวร่าง จะปรับตามผลวิจัยระบบคลาส', 13, UI.sub).setOrigin(1, 0.5)
  }
}
