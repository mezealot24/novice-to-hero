import Phaser from 'phaser'
import { COLORS, H, W } from '../data/game-data'
import { RACE_GROWTH, RACE_IDS, RACES, raceBase, raceSteps, type BaseStat, type RaceId } from '../data/meta'
import { newSave, setSave, wipe } from '../save'
import { backdrop, button, go, panel, txt, UI } from '../ui'
import { ftue } from '../analytics'

const NAMES = ['ข้าวปั้น', 'ปลาทู', 'หมูกรอบ', 'บัวลอย', 'ทองหยิบ', 'มะม่วง', 'ขนมครก', 'ลูกชิ้น', 'ส้มตำ', 'ไข่เจียว', 'โรตี', 'ข้าวเหนียว', 'ทับทิม', 'เฉาก๊วย']

// Character creation: pick a race (7 races, data/meta/races.ts) and a name (dice, no keyboard needed on phones).
export class CreateScene extends Phaser.Scene {
  private race: RaceId = 'human'
  private name = NAMES[0]
  constructor() { super('create') }

  create() {
    backdrop(this, false)
    ftue('create_open')
    this.race = 'human'
    this.name = Phaser.Utils.Array.GetRandom(NAMES)
    txt(this, W / 2, 34, 'สร้างตัวละคร', 30, UI.gold, true).setOrigin(0.5)
    txt(this, W / 2, 66, `เลือกเผ่า · ทุกเผ่ามีจุดเด่น-จุดด้อย · ค่าเผ่าโตขึ้นทุก ${RACE_GROWTH.every} Job Lv`, 16, UI.sub).setOrigin(0.5)

    // 7 race chips + one detail panel for the picked race (Q 2026-11-20: race growth every 5 Job Lv, weaknesses go negative)
    const ids = RACE_IDS
    const cw = 124, chH = 64, gap = 8, cy = 88
    const x0 = W / 2 - ((ids.length - 1) * (cw + gap)) / 2
    const chips: { id: RaceId; g: Phaser.GameObjects.Graphics; x: number }[] = []
    const fmt = (o: Partial<Record<BaseStat, number>>) => (Object.keys(o) as BaseStat[]).filter((k) => o[k]).map((k) => `${k.toUpperCase()} ${o[k]! > 0 ? '+' : ''}${o[k]}`).join('  ')
    const maxSteps = raceSteps({ job: 'swordsman', jobLevel: 999, job2: 'knight', job2Level: 999, job3: 'lordknight', job3Level: 999 })
    panel(this, W / 2 - 370, 160, 740, 214, UI.panel)
    const detail = {
      head: txt(this, W / 2, 168, '', 26, UI.text, true).setOrigin(0.5, 0),
      blurb: txt(this, W / 2, 206, '', 15, UI.sub).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(680),
      start: txt(this, W / 2, 238, '', 15, UI.green, true).setOrigin(0.5, 0),
      grow: txt(this, W / 2, 266, '', 15, '#7fd7ff', true).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(700),
      end: txt(this, W / 2, 294, '', 13, UI.sub).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(700),
      trait: txt(this, W / 2, 330, '', 16, UI.gold, true).setOrigin(0.5, 0),
    }
    const draw = () => {
      chips.forEach((c) => {
        const on = c.id === this.race
        c.g.clear()
        c.g.fillStyle(on ? 0x34396a : UI.panel, 0.97).fillRoundedRect(c.x - cw / 2, cy, cw, chH, 12)
        c.g.lineStyle(on ? 4 : 2, on ? COLORS.gold : UI.line).strokeRoundedRect(c.x - cw / 2, cy, cw, chH, 12)
      })
      const r = RACES[this.race]
      const growth = (Object.keys(r.growth) as BaseStat[]).map((k) => `${k.toUpperCase()} ${r.growth[k]! > 0 ? '+' : ''}${r.growth[k]}`).join('  ')
      const full = raceBase(this.race, maxSteps)
      detail.head.setText(`${r.icon} ${r.name}`)
      detail.blurb.setText(r.blurb)
      detail.start.setText(`เริ่มต้น: ${fmt(r.bonus)}`)
      detail.grow.setText(`📈 ทุก ${RACE_GROWTH.every} Job Lv: ${growth}`)
      detail.end.setText(`Job Lv เต็มทุกขั้น (${maxSteps} ขั้น) รวมได้: ${fmt(full)}`)
      detail.trait.setText(r.trait)
    }
    ids.forEach((id, i) => {
      const r = RACES[id], x = x0 + i * (cw + gap)
      chips.push({ id, g: this.add.graphics(), x })
      txt(this, x, cy + 4, r.icon, 26).setOrigin(0.5, 0)
      txt(this, x, cy + 38, r.name, 15, UI.text, true).setOrigin(0.5, 0)
      const hit = this.add.zone(x, cy + chH / 2, cw, chH).setInteractive({ useHandCursor: true })
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
      ftue('char_created')
      go(this, 'hub', { fresh: true })
    }, { size: 24 })
    button(this, 70, H - 40, 110, 42, '‹ กลับ', () => go(this, 'title'), { fill: 0x5a5f8a, color: UI.text, size: 17 })
  }
}
