# ☀️ Dungeon days v1 (Q 2026-11-18)

Q: "ถ้าผ่าน D1 แล้ว D2, D3, ... จะมีมอนของด่านที่เคยผ่านปรากฏ · แต่ละดันเพิ่ม Phase จาก 6/6 ขึ้นเรื่อยๆ (Capybara Go ใช้ระบบวัน)".
Q picked option B (full day system) over echo-waves-only (A) and mix-only (C).
Follow-ups: "มอนด่านเก่าต้อง Drop Item มอนด่านเก่า" + "ต้อง Scale lv ตามด่านใหม่".

## Shape of a run (normal + 🔥 hard dungeon runs, D2+)

| Day | Rooms |
|---|---|
| 1 | first half of the authored waves → 🌙 day-end = the dungeon's own 1-1 duel (or an elite echo wave if it has none) |
| 2 .. N-1 | 🔁 echo waves → 🌙 day-end = a returning mini boss (own pool + minis of earlier dungeons), or an elite echo wave |
| N | second half of the authored waves → 👑 the dungeon boss |

- Days: `base 3` at D2, `+1 every 2` dungeons, `max 6` → D2-D3 3 days (9 rooms), D4-D5 4 (12), D6-D7 5 (15), D8+ 6 (18).
- An echo wave = `size 3` monsters: `native 1` of the dungeon's own normals + the rest drawn from earlier dungeons
  (pick a dungeon, then a kind, so D1 and D(n-1) come back as often).
- Every room leads to one post-wave event as before; a day-end fight gives `dayEndEvents` (+1) more (the night at camp).
  A new day heals `dayHeal` (15%) Max HP and shows the ☀️ day banner.
- A returning mini only offers 👑 พรเทพ when the run has none yet (never a forced swap); otherwise its reward is the extra event.
- An elite day-end wave pays like the fork event's dangerous path (zeny + 1 material), with no stat boost.
- D1 (tutorial), daily, bounty, tower and rift are unchanged.

## Monsters from earlier dungeons (BattleScene.echoDef)

- Rebuilt at **this room's Lv** with their own kit: D6+ = the room Lv (`statMonster` for a D6+ kind, `restatAt(..., numbers)` for a
  D1-D5 kind, like the tower); D2-D5 = this dungeon's `LEGACY.lv` for the monster's tier. Hard / hell / corruption apply as usual.
- EXP / zeny × (this dungeon's average for the tier / the monster's own), so a D1 jellop in D7 pays like a D7 monster.
- Drops: its **own** equipment cards (cards are per monster) and its **home dungeon's** materials (`m_dN` / `b_dN`).

## Tuning

All numbers in `DUNGEON_DAYS` (`src/data/dungeon-days.ts`), live-config table `progression` → `days.*` (admin ☀️ days group).
`days.on = 0` returns every dungeon to its 6 authored rooms. No save key changed.

## Bot

Runs are ~2-3x longer: raise the per-run timeout, e.g. `TMO=400000 tools/bot-lite.sh 7 2 mage`.
