# Cleric / Crusader / Monk — M2–M4 polish + rework plan (v1)

> Follows `cleric-crusader-monk-balance-eval-v1.md` (M1). PR #181. Every number below is tunable in admin.

## 1. Bot matrix Before / After (same 16 configs, N = 20, 640 runs)

- Before = `c8479dd` build · After = this branch (final build). Configs: `.bot-dist/gen-matrix.cjs` (not committed), checked tree-legal with the game's own `lockReason` / `lockReason3` (class-1 19 / 39 / 78 / 88 / 117, Job2 39 / 49, Job3 29: 16/16 legal).
- Only the Cleric line is compared, no other classes.

| ID | Build | Win B → A | Total DPT B → A | ΔDPT | Ult% B → A | Note |
|---|---|---:|---:|---:|---:|---|
| CL-B02 | D5 Judgement + Spear | 20 → 19 | 305.5 → 346.5 | +13.4% | 34.7 → 38.7 | ตัดสินหมู่ / ใจนิ่ง rework + Miracle skill crit |
| CL-B03 | D5 Faith + Spear | 18 → 19 | 275.5 → 388.2 | +40.9% | 36.7 → 39.7 | 129 → 87 turns |
| CL-B04 | D5 Judgement + Renew | 20 → 19 | 321.2 → 362.6 | +12.9% | 36.6 → 35.7 | Renew light + 25 Mana |
| CL-B06 | D5 Sanctuary + Bless | 19 → 20 | 329.6 → 360.7 | +9.4% | 44.4 → 49.7 | root ultPow |
| CL-B07 | D5 Dawn + Bless | 20 → 20 | 402.5 → 414.2 | +2.9% | 38.0 → 37.5 | |
| CL-B12 | D6 Normal | 13 → 14 | 1,186.8 → 1,265.7 | +6.6% | 19.1 → 20.1 | 6 timeouts still |
| CL-B13 | D6 HARD | 0 → 0 | 756.3 → 919.3 | +21.6% | 20.4 → 21.8 | still dies (minHP 8%) |
| CR-B02 | D6 Crusader | 20 → 20 | 3,824 → 4,271 | +11.7% | 66.3 → 65.1 | Holy Cross s3% 9.3 → 12.1 |
| CR-B04 | D10 Crusader HARD | 1 → 2 | 9,442 → 10,731 | +13.6% | 75.9 → 78.5 | 8 timeouts |
| PA-B02 | D10 Paladin Pressure | 20 → 20 | 12,011 → 13,785 | +14.8% | 71.4 → 72.3 | |
| PA-B04 | D10 Paladin HARD | 2 → 7 | 12,983 → 17,516 | +34.9% | 71.0 → 78.9 | 10 timeouts |
| MK-B01 | D6 Monk Combo + Bell | 20 → 20 | 2,281 → 2,398 | +5.1% | 0 | |
| MK-B02 | D6 Monk Haymaker | 20 → 20 | 1,845 → 2,000 | +8.4% | 0 | haymakerDmg 278 → 1,295 (fixed telemetry both sides) |
| MK-B03 | D6 Monk Asura | 20 → 20 | 2,270 → 2,028 | −10.6% | 24.0 → 25.6 | ⚠️ regression, see §3 |
| CH-B01 | D10 Tiger Knuckle | 20 → 20 | 8,251 → 8,769 | +6.3% | 22.0 → 25.6 | |
| CH-B02 | D10 Chain Crush | 20 → 20 | 7,657 → 9,354 | +22.2% | 22.9 → 27.1 | gap to Tiger closed |

Findings during M4 (fixed in this PR):
- The first After build put Crusader / Paladin Ult% at 75–83%: the root `ultPow` fed Grand Cross. Grand Cross now keeps `KIT2.crusader.gcRootShare` = 25% of it.
- **M1's "Haymaker never fires" was a bot bug**: `tools/bot.cjs` reset the telemetry tag at the first `await` of async methods. Fixed; Before Haymaker = 278 dmg/run, After 1,295.

## 2. Done in this PR (S1 / S2 / S3-1)

- **Cleric S1:** ⚖️ ตัดสินหมู่ (+1 target Lv 1, +2 Lv 3, +4%/Lv light), 🧘 ใจนิ่ง (flat heal line, +5% light / +6% heal per Lv), 🍀 ปาฏิหาริย์ skillCrit, S1 not blocked by a booked ult.
- **Cleric S2:** 🌿 ฟื้นฟู 25 Mana + light per tick + casts at full HP · 🔱 หอกแสง 3 / 5 spears, หอกคม +0.05/Lv · 🔆 พรแสง unchanged (playtest: strongest).
- **Cleric Ult:** root `ultPow` (smash excluded), `CLASS_K.cleric` 1.8 → 1.5.
- **Crusader S3:** Holy Cross ×1.4 · Paladin Shield Chain / Pressure + magic share · Grand Cross 25% root share.
- **Monk S3:** Champion variants × spent charges · Haymaker trigger 12% / ★ 8% · Asura exhaust 2 · Ult extras on Monk · retired gear affixes replaced.

## 3. Next rework (proposed, not done)

1. **Monk Asura (MK-B03 −10.6%)**: the root `ultPow` change does not reach `asuraDamage` the same way and the shorter exhaust lets the bot fire Asura with fewer charges. Try: Asura min charges 3 → 4 or `asuraPerCharge` 0.6 → 0.75; re-run MK-B03.
2. **Crusader / Paladin HARD timeouts (8–10/20)**: Ult% still 65–79%. Next lever is non-ult: Holy Cross cost 22 → 15 / CD 2 → 1, or Pressure `atk` 1.6 → 2.2. Goal Ult% ≤ 55%.
3. **Cleric D6 HARD 0/20 (minHP 8%)**: offense is up 21.6% but it still dies; it is survival. Candidate: Kyrie / ult shield scale with root Lv, or `cleric_core3` Mana guard. No monster changes (Q rule).
4. **Cleric Sanctuary (`cleric_a`)**: lowest D5 non-ult (181 DPT); thorns only fire after Kyrie. Make thorns read Kyrie absorb too.
5. Cleanup: dead v84 fields (`clUltWard`, `clUltMend`, `clEmergency`, `clRevive`), Monk talent ids `mk_t2_es` / `mk_t4_dark` (names only, stats are live).

Save ids: no node / item id changed in this PR.
