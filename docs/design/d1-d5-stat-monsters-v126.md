# v126: D1-D5 monsters on the D6+ stat system (legacy removed)

Q 2026-11-19: "ปรับบาลานซ์มอน d1-d5 ให้ใช้ระบบเดียวกับ d6+ ยกเลิก legacy D1-5"

## What changed
- D1-D5 have a level band and every room has a Lv (normal = band start, mini = boss - 1, boss = band end), the same Lv the old
  `LEGACY.lv` / `tierDrop` gave: D1 3-5, D2 8-10, D3 11-13, D4 14-16, D5 19-21.
- Every monster (D1-D5, events, support) is built by `statMonster` at the room Lv. `hp` / `dmg` are `1` placeholders like D6+,
  `bodyMul` x HP / ATK / M.ATK, `speedMul` x AGI speed, def / hit / flee / crit / combo / counter are bonuses on top.
- The values were calibrated once from the old `withStats` anchor x `BATTLE.monBuff.hp/dmg`, so at its home room Lv every monster
  has its v125 numbers (±1%). Fixture: `tests/fixtures/d1-d5-v125-numbers.json`.
- Removed: `LEGACY`, `legacyLevel`, `withStats` + the REF freeze, `BattleScene.buffDef` / `hardDef` / `legacyStats`,
  `BATTLE.monBuff.hp|dmg` (turns stay), the KITS crit / combo / counter of D1-D5 (now on each monster line).
- 🔥 Hard on D1-D5 = the D6+ hard: +50% stat points on every tier + a corruption roll (was: HP / ATK x Hero Power).
- Rewards in a normal D1-D5 run use `levelDropMul` (hero Lv over the band), like D6+ (was: Hero Power `overpowerMul`).
- 🎲 Daily D2-D5: rooms move with the hero (boss Lv = Base Lv), replacing the old `levelScale` HP / ATK curve.
- Skill Lv bonus is absolute for everyone (`MON_SKILL_LV.nativeAnchor`): D3-D5 casters now cast +1 Lv (Lv 10-19) / +2 Lv (Lv 20-21).
- Summons take the room's Lv (like D6+): king's mini jellops Lv 5, hydra's toads Lv 16, lich's hell knights Lv 21.

## Kept D6+ only
Hell mode (`hellOpen`: tier 6+), deep daily / rift / weekly bounty pools, the tower's D5 anchor (`deepKind`, `deepDungeon`).

## Live config
Old live-config keys `monStat.legacy.*`, `battle.monBuff.hp|dmg.*` and D1-D5 `hp` / `dmg` / `matk` are now skipped / unused.
Tune D1-D5 with `bodyMul`, `speedMul`, `statAlloc`, `pointsMul` and the bonuses, as on D6+.
