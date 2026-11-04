import Phaser from 'phaser'
import { COLORS } from '../data/game-data'
import { COSTUMES, FREE_GEMS, GEM_PACKS, GEM_TO_ZENY_TEST, SUPPORTER_PRICE, ZENY_PACKS, ZENY_PER_GEM } from '../data/meta'
import { persist, save, today } from '../save'
import { sfx } from '../sfx'
import { button, confirm, gemIcon, go, panel, tabs, toast, topBar, txt, UI } from '../ui'

// Gem shop + top-up. MOCK: no payment is ever taken. Gems buy looks only (costumes, supporter badge),
// and every gem can also be earned for free by playing, so nothing here gives power.
export class GemShopScene extends Phaser.Scene {
  private body?: Phaser.GameObjects.Container
  private tab = 0
  private refreshWallet!: () => void
  constructor() { super('gemshop') }

  create() {
    this.cameras.main.setBackgroundColor(UI.night)
    this.cameras.main.fadeIn(160, 20, 23, 43)
    this.refreshWallet = topBar(this, '💎 ร้านเพชร', () => go(this, 'hub'))

    // the shop's promise, always visible
    panel(this, 16, 70, 262, 490, 0x22324a, 0x3b6a8a)
    txt(this, 32, 86, '📜 กฎของร้านนี้', 19, UI.gem, true)
    txt(this, 32, 120, [
      '✅ เพชรซื้อได้แค่ของแต่งตัว',
      '✅ ไม่มีค่าพลังขาย ไม่มีกาชา',
      '✅ ไม่มีพลังงาน เล่นได้ไม่จำกัด',
      '✅ เพชรทุกเม็ดหาได้ฟรีในเกม',
      '',
      'หาเพชรฟรีได้จาก:',
      `· รับฟรีรายวัน +${FREE_GEMS.daily}`,
      `· Base Lv อัป +${FREE_GEMS.levelUp}`,
      `· เคลียร์ดันครั้งแรก +${FREE_GEMS.firstClear}`,
      `· เคลียร์ดันทุกครั้ง +${FREE_GEMS.clear}`,
      '',
      '🧪 โหมดทดลอง: ปุ่มเติมเงิน',
      'ไม่ตัดเงินจริง กดแล้วได้เพชร',
      'เลย ไว้ทดสอบระบบค่ะ',
      ...(GEM_TO_ZENY_TEST ? ['🧪 แลก Zeny: เฉพาะช่วงทดสอบ'] : []),
    ].join('\n'), 15, UI.text).setLineSpacing(6)

    const labels = ['💎 เติมเพชร', '👗 ชุดแต่งกาย', '🌟 ผู้สนับสนุน', ...(GEM_TO_ZENY_TEST ? ['🧪 แลก Zeny'] : [])]
    tabs(this, 294, 92, labels, labels.length > 3 ? 152 : 204, (i) => { this.tab = i; this.render() })
  }

  private render() {
    this.body?.destroy()
    this.body = this.add.container(0, 0)
    if (this.tab === 0) this.topUp()
    else if (this.tab === 1) this.costumes()
    else if (this.tab === 2) this.supporter()
    else this.zenyExchange()
  }

  private topUp() {
    const s = save(), b = this.body!
    GEM_PACKS.forEach((p, i) => {
      const x = 294 + i * 216, y = 130, w = 204, h = 260
      b.add(panel(this, x, y, w, h, UI.panel, i === 1 ? COLORS.gold : UI.line))
      if (i === 1) b.add(txt(this, x + w / 2, y + 14, 'คุ้มสุด', 14, UI.gold, true).setOrigin(0.5, 0))
      for (let k = 0; k <= i; k++) b.add(gemIcon(this, x + w / 2 + (k - i / 2) * 26, y + 70, 14 + i * 2))
      b.add(txt(this, x + w / 2, y + 112, `${p.gems}`, 34, UI.gem, true).setOrigin(0.5, 0))
      b.add(txt(this, x + w / 2, y + 156, p.bonus ? `+ โบนัส ${p.bonus}` : 'เพชร', 16, p.bonus ? UI.green : UI.sub).setOrigin(0.5, 0))
      b.add(button(this, x + w / 2, y + h - 38, w - 30, 48, p.price, () =>
        confirm(this, `เติม ${p.gems + p.bonus} เพชร`, `ราคาจริง ${p.price}\n🧪 โหมดทดลอง: ไม่ตัดเงินจริง กดยืนยันแล้วได้เพชรทันที`, 'ยืนยัน (ทดลอง)', () => {
          s.gems += p.gems + p.bonus; persist(); sfx.win(); this.refreshWallet()
          toast(this, `ได้ ${p.gems + p.bonus} เพชร (ทดลอง)`, UI.gem)
        }), { size: 20 }))
    })
    const got = s.lastDaily === today()
    b.add(panel(this, 294, 410, 640, 70, 0x2a2a50, UI.line))
    b.add(txt(this, 314, 430, `🎁 เพชรฟรีรายวัน +${FREE_GEMS.daily}`, 19, UI.text, true))
    b.add(button(this, 840, 445, 150, 46, got ? 'รับแล้ว' : 'รับเลย', () => {
      s.lastDaily = today(); s.gems += FREE_GEMS.daily; persist(); this.refreshWallet(); toast(this, `+${FREE_GEMS.daily} เพชร`, UI.gem); this.render()
    }, { size: 18 }).setEnabled(!got))
    b.add(txt(this, 294, 500, 'ถ้าวันหนึ่งเปิดให้เติมจริง ก็จะเป็นแบบนี้: จ่ายเพื่อสนับสนุนคนทำเกม ได้ของสวยๆ กลับไป ไม่ได้ความเก่ง', 14, UI.sub).setWordWrapWidth(640))
  }

  private costumes() {
    const s = save(), b = this.body!
    COSTUMES.forEach((c, i) => {
      const x = 294 + (i % 3) * 216, y = 128 + Math.floor(i / 3) * 214, w = 204, h = 202
      const owned = s.costumes.includes(c.id), worn = s.costume === c.id
      b.add(panel(this, x, y, w, h, UI.panel, worn ? COLORS.gold : UI.line))
      b.add(this.add.image(x + w / 2, y + 62, 'novice').setScale(2).setTint(c.tint))
      b.add(txt(this, x + w / 2, y + 112, c.name, 18, UI.text, true).setOrigin(0.5, 0))
      b.add(txt(this, x + w / 2, y + 138, 'ไม่มีค่าพลัง', 13, UI.sub).setOrigin(0.5, 0))
      const label = worn ? 'ใส่อยู่' : owned ? 'ใส่' : `💎 ${c.price}`
      b.add(button(this, x + w / 2, y + h - 28, w - 30, 40, label, () => {
        if (!owned) {
          if (s.gems < c.price) { toast(this, 'เพชรไม่พอ รับฟรีรายวันหรือเก็บเลเวลได้นะคะ', UI.red); return }
          confirm(this, `ซื้อ ${c.name}?`, `ใช้ ${c.price} เพชร (เหลือ ${s.gems - c.price})\nไม่มีค่าพลัง เป็นของแต่งตัวอย่างเดียว`, 'ซื้อเลย', () => {
            if (s.gems < c.price || s.costumes.includes(c.id)) return
            s.gems -= c.price; s.costumes.push(c.id); s.costume = c.id; sfx.win(); persist(); this.refreshWallet(); this.render()
          })
          return
        }
        s.costume = c.id; persist(); this.refreshWallet(); this.render()
      }, { size: 16 }).setEnabled(!worn))
    })
  }

  private supporter() {
    const s = save(), b = this.body!
    b.add(panel(this, 294, 128, 640, 300, UI.panel, COLORS.gold))
    b.add(txt(this, 614, 150, '🌟 ป้ายผู้สนับสนุน', 28, UI.gold, true).setOrigin(0.5, 0))
    b.add(txt(this, 614, 200, `ชื่อสีทอง + ดาว 🌟 หน้าชื่อ ตลอดไป\nไม่มีค่าพลัง ไม่มี EXP บูสต์ ไม่มีของพิเศษที่คนอื่นหาไม่ได้\nเป็นแค่คำขอบคุณที่ช่วยสนับสนุนเกมค่ะ`, 17, UI.text).setOrigin(0.5, 0).setAlign('center'))
    b.add(txt(this, 614, 300, `ตัวอย่าง:  🌟 ${s.name}`, 24, UI.gold, true).setOrigin(0.5, 0))
    b.add(button(this, 614, 384, 280, 52, s.supporter ? 'เป็นผู้สนับสนุนแล้ว ขอบคุณค่ะ!' : `💎 ${SUPPORTER_PRICE}`, () => {
      if (s.gems < SUPPORTER_PRICE) { toast(this, 'เพชรไม่พอค่ะ', UI.red); return }
      confirm(this, 'เป็นผู้สนับสนุน?', `ใช้ ${SUPPORTER_PRICE} เพชร ได้ชื่อสีทอง (ไม่มีค่าพลัง)`, 'ยืนยัน', () => {
        s.gems -= SUPPORTER_PRICE; s.supporter = true; persist(); sfx.win(); this.refreshWallet(); this.render()
      })
    }, { size: 18 }).setEnabled(!s.supporter))
  }

  /** 🧪 TEST ONLY: spend gems for zeny during the playtest (meta.ts GEM_TO_ZENY_TEST). */
  private zenyExchange() {
    const s = save(), b = this.body!
    b.add(panel(this, 294, 128, 640, 44, 0x4a2a3a, 0xff7a7a))
    b.add(txt(this, 614, 150, `🧪 ทดสอบเท่านั้น · 1 เพชร = ${ZENY_PER_GEM} zeny · จะเอาออกก่อนเปิดจริงค่ะ`, 15, UI.text, true).setOrigin(0.5))
    ZENY_PACKS.forEach((g, i) => {
      const x = 294 + i * 216, y = 186, w = 204, h = 220, z = g * ZENY_PER_GEM
      b.add(panel(this, x, y, w, h, UI.panel, UI.line))
      b.add(txt(this, x + w / 2, y + 22, '💰', 40).setOrigin(0.5, 0))
      b.add(txt(this, x + w / 2, y + 82, `${z.toLocaleString()}`, 30, UI.gold, true).setOrigin(0.5, 0))
      b.add(txt(this, x + w / 2, y + 122, 'zeny', 16, UI.sub).setOrigin(0.5, 0))
      b.add(button(this, x + w / 2, y + h - 34, w - 30, 44, `💎 ${g}`, () => {
        if (s.gems < g) { toast(this, 'เพชรไม่พอค่ะ (เติมเพชรทดลองได้ที่แท็บแรก)', UI.red); return }
        confirm(this, `แลก ${z.toLocaleString()} zeny?`, `ใช้ ${g} เพชร (เหลือ ${s.gems - g})\n🧪 ระบบนี้มีแค่ช่วงทดสอบนะคะ`, 'แลกเลย', () => {
          if (s.gems < g) return
          s.gems -= g; s.zeny += z; persist(); sfx.coin(); this.refreshWallet()
          toast(this, `+${z.toLocaleString()} zeny (ทดสอบ)`, UI.gold); this.render()
        })
      }, { size: 18 }).setEnabled(s.gems >= g))
    })
    b.add(txt(this, 294, 426, `มีเพชร ${s.gems} · ไม่พอก็กดเติมเพชรทดลองที่แท็บ 💎 ได้ ไม่ตัดเงินจริงค่ะ`, 14, UI.sub).setWordWrapWidth(640))
  }
}
