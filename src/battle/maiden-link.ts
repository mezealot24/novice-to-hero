// Karvos (drainer) Summon Maiden link (Q 2026-11-21): no more immortality while the Maiden lives.
// Instead a share of every hit on Karvos goes to the Maiden, and Karvos cannot drop below 1 HP until the Maiden is dead.
// Pure, Phaser-free; BattleScene.damageMon / killMon call these. tests/maiden-link.test.ts checks the numbers.

/** Split one hit on the linked boss. Whole numbers only: the Maiden takes floor(dmg x share), the boss keeps the rest,
 *  so the two parts always add back up to the hit (a 1-damage hit stays on the boss). */
export function maidenSplit(dmg: number, share: number): { toMaiden: number; toBoss: number } {
  if (!(dmg > 0)) return { toMaiden: 0, toBoss: Math.max(0, dmg || 0) }
  const s = Math.min(1, Math.max(0, share))
  const toMaiden = Math.floor(dmg * s)
  return { toMaiden, toBoss: dmg - toMaiden }
}

/** HP the linked boss is left with: never below 1 while her Maiden lives. */
export function maidenHpFloor(hp: number, maidenAlive: boolean): number {
  return maidenAlive ? Math.max(1, hp) : hp
}
