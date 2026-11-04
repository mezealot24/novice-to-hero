# Game Modes v1 — Endless Tower + Daily Challenge (v51)

Q 2026-11-04: "เพิ่ม content โหมดใหม่ และความท้าทายใหม่ๆ" · architecture by the coordinator, implemented in thread "Add new game modes and challenges".

## 1. Goal
- Endgame content after D3 that never runs out (🗼 Endless Tower) and a reason to log in every day (🎲 Daily Challenge).
- One generic `GameMode` abstraction so later modes (hell mode, boss rush, seasonal) are data, not BattleScene forks.
- MVP: 2 new modes, no backend, no new art.

## 2. Architecture

```
HubScene ──(🎮 โหมด panel)──► go('battle', { mode, d?, hard?, seed? })
                                   │
BattleScene.init ── MODES[mode].buildRun(save, args) ──► RunConfig
                                   │
BattleScene reads RunConfig only: roomAt(i) · themeAt(i) · scale(room) · turnMul(room)
                                  · mutators · eventsAfter(i) · relicAfter(room) · where(i)
settle ── MODES[mode].reward(save, cfg, result) ──► gems / fortune / save.modes record
```

### `src/data/modes.ts`
| field | meaning |
|---|---|
| `GameMode.id` | `dungeon` · `hard` · `tower` · `daily` |
| `name`, `icon`, `desc` | panel text |
| `unlock(save)` | `{ ok, why }` (locked modes still open after a warning: playtest rule, same as dungeons) |
| `record(save)` | one-line best record for the panel |
| `buildRun(save, args)` | → `RunConfig` (pure data + small functions) |
| `reward(save, cfg, result)` | extra rewards + updates `save.modes[id]`; `dungeon` / `hard` keep the old settle code (adapter, no behaviour change) |

### `RunConfig`
| field | used for |
|---|---|
| `modeId`, `seed` | which mode / daily seed (YYYYMMDD) |
| `endless` | tower: rooms are generated forever, a floor ends with a stay / leave choice |
| `roomAt(i)` | the i-th room (`RunRoom` = `RoomDef` + `floor`, `floorEnd`, `src` dungeon id for level scaling) or `null` = run cleared |
| `themeAt(i)` | the dungeon whose sky, mats and cards this room uses |
| `scale(room)` | `{ hp, atk, hit, speed }` monster multipliers on top of the normal defs (`null` = none) |
| `affix` | bosses / minis roll the hard-mode extra skill + passive |
| `turnMul(room)` | turn-limit multiplier |
| `mutators` | `MutatorDef[]` (daily) |
| `eventsAfter(i, room)` | how many post-wave events after this room |
| `relicAfter(room, hasRelic)` | offer the mini-boss relic after this duel? |
| `where(i)` | HUD / pause text ("ด่าน 3/6", "🗼 ชั้น 12") |

`dungeon` and `hard` adapters build exactly the old rooms; BattleScene's hard-mode code path (`this.hard`, `hardDef`, `HARD.turnMul`) is untouched, so the hard-mode thread can keep tuning it.

### Save schema (`save.ts`)
```ts
modes?: Record<string, { bestFloor?: number; clears: number; lastSeed?: number }>
```
Migration: `s.modes ??= {}` on load. Additive only, old saves load unchanged.
- tower: `bestFloor` (highest floor cleared), `clears` = runs that left alive.
- daily: `lastSeed` = YYYYMMDD of the last rewarded clear, `clears` = days cleared.

## 3. 🗼 Endless Tower
- **Unlock:** clear D3 (`clearsBy.d3 > 0`).
- **Floors:** 1 floor = 1 fight. Theme (monster pool + sky): floors 1-10 D2, 11-20 D3, 21-30 D4, 31+ D5.
  - every **5th** floor = boss: random from the bosses of D1..(theme+1), always with hard-mode affixes.
  - every **10th** floor = mini-boss gauntlet: 2 duels in a row (3 from floor 30), first gauntlet win offers a relic.
  - floor 15+: normal floors get +1 extra monster.
- **Scaling:** level scaling = the hard-mode boss curve, both ways: `curve(BaseLv) / curve(recLv of the monster's dungeon)` (no ×1.3 hard base), then per floor HP × (0.8 + 0.06·(f−1)), ATK × (0.85 + 0.03·(f−1)), Hit + floor(f/5). Turn limits × (1 + 0.015·(f−1)), max ×1.6; a boss floor uses the larger of its own limit and the limit of the boss made for the hero's level.
- **Between floors:** heal as usual, a post-wave event every 3rd normal floor, then a choice: ขึ้นชั้นต่อ / กลับเมือง.
- **Rewards:** floor bank per floor: zeny (20 + 6f)·(1 + BaseLv/20), 1 common mat of the theme, boss floors +1 boss mat, gauntlet +2 boss mats. Leaving keeps 100% of the bank, falling keeps 50% (push-your-luck). Kill zeny / EXP / cards are kept as in every run.
- **Gems (first time only):** reaching floor 10 / 25 / 50 = 💎 20 / 40 / 80 (paid when `bestFloor` passes them).

## 4. 🎲 Daily Challenge
- **Unlock:** clear D2.
- **Seed:** YYYYMMDD (UTC date), mulberry32. The seed picks the dungeon (D2-D5) and 2-3 mutators, the same for every player (leaderboard-ready, no backend).
- **Scaling:** monsters level-scaled to the hero's Base Lv both ways (same curve as the tower), so any level can play any daily.
- **Mutators** (`src/data/mutators.ts`):

| id | name | effect |
|---|---|---|
| swift | 💨 มอนใจร้อน | monster speed ×1.3 |
| noheal | 🩹 แผลเรื้อรัง | hero healing ×0.5, no heal after a wave |
| events | 🎪 เทศกาลเหตุการณ์ | 2 events after every wave |
| critonly | 🎯 คริหรือศูนย์ | crit 100%, ATK / M.ATK ×0.6 |
| lucky | 🍀 ดวงพุ่ง | allocated LUK ×2 |
| giant | 🦣 มอนยักษ์ | monster HP ×1.5, speed ×0.85, zeny ×1.3 |
| glass | 🗡️ ปืนใหญ่กระจก | ATK / M.ATK ×1.4, max HP ×0.6 |
| brutal | 💢 มอนเดือด | monster ATK ×1.3, zeny ×1.2 |
| rush | ⏳ รีบเร่ง | turn limits ×0.75, zeny ×1.3 |

- **Rewards:** first clear of the day 💎15 + 🍀 Fortune +25. Replays are allowed (normal loot only).

## 5. Hub
- New tile **🎮 โหมด** (menu grid slot 6) opens a panel: one row per new mode with icon, unlock state, best record, today's mutators for the daily, and a ลุย button.
- Normal / hard dungeons stay in the ⚔️ ผจญภัย list (they are modes in code only).

## 6. Test plan
- `tools/bot.cjs` `MODE=tower TOWER_MAX=15` and `MODE=daily SEED=yyyymmdd`, every class: no page errors, floors reached / wins.

## 7. Later (not in v51)
- Leaderboard for the daily seed, tower season reset, hell-mode mutators stacking (Heat), mutators in the tower every 10 floors.
