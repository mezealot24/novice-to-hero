// Q 2026-11-20: taking gear off (or swapping it) always sends its cards back to the bag (save.ts equip / unequip).
// These helpers warn first, so the player sees which cards come out before it happens.
import Phaser from 'phaser'
import { cardById, cardName } from '../data/cards'
import type { CardsOff } from '../save'
import { confirm, toast } from '../ui'

const cardCount = (off: CardsOff[]) => off.reduce((a, o) => a + o.cards.length, 0)

/** One line per item that loses its cards: "🗡️ Dagger: การ์ดหมาป่า, การ์ดค้างคาว". Empty when nothing moves. */
export function cardsOffText(off: CardsOff[]): string {
  if (!off.length) return ''
  const lines = off.map((o) => `${o.item.icon} ${o.item.name}: ${o.cards.map((id) => { const cd = cardById(id); return cd ? cardName(cd) : id }).join(', ')}`)
  return `🃏 การ์ด ${cardCount(off)} ใบจะถูกถอดกลับเข้ากระเป๋า\n${lines.join('\n')}`
}

/** Toast after the swap: how many cards went back to the bag. */
export function cardsOffToast(scene: Phaser.Scene, off: CardsOff[]) {
  if (off.length) toast(scene, `🃏 ถอดการ์ด ${cardCount(off)} ใบกลับเข้ากระเป๋าแล้วค่ะ`)
}

/** Run `act` right away when no cards move; otherwise ask first ("cards will come out"), then run it and toast. */
export function guardCardsOff(scene: Phaser.Scene, off: CardsOff[], title: string, ok: string, act: () => void) {
  if (!off.length) { act(); return }
  confirm(scene, title, cardsOffText(off), ok, () => { act(); cardsOffToast(scene, off) })
}
