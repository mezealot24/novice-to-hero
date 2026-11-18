# Changelog 2026-11-18

## 🔧 feat(thief): P2a stat + KIT keys and admin registry
- 14 new `Stats` keys (default 0 in `PLAYER`): `thPoisonPen` `thToxicHold` `thStrikePoison` `thPlagueDeath` `thCondLeech` `thStackCrit` `thCritPoison` `thKillLeech` `thBloodKing` `thDodgeCdCut` `thDodgeCdIcd` `thStackCritTal` `thWeaveDmg` `thWeaveRes`
- 19 new `KIT` keys from R4.7.2 (INTS 9 · NUMS 10), Thai label + effect in `KIT_EXPLAIN`, listed in `SKILL_LAYOUT.thief` (`s1` + new `tree` column)
- No behavior yet (spec: `design/p2/P2a-spec.md` T1)

## ⚡ feat(thief): แทงพิษ cost 45, Energy floor 30, pure helpers
- `JOBS.thief.auto.cost` 40 → 45 (desc: "แล้วตีปกติ 1 เทิร์น (สลับคม)") · `autoCost()` floor for Thief (Rogue / Mobster too) = `KIT.thiefAutoMinCost` 30
- Pure helpers in `skill-math.ts`: `thiefS1Woven` `thiefStackCritAdd` `thiefCondLeechAdd` `thiefKillHeal` `thiefBossCritHeal` `thiefToxicHold` `thiefSpreadAmount` `thiefBloodKingOn`
- `autoInfo` Thief row "สลับคม"

## 🌐 feat(thief): P2a skill web a-line, core column, row-2 talents
- ☠️ พิษ (a-line): `thief_a1` เคลือบพิษอาบคม (poison + pen vs poisoned) · `thief_a2` พิษกัดลึก (poisonDmg + vsPoison, B2) · `thief_a3` พิษทนทาน (poisonCap + toxicSkin hold + D.Strike poison) · `thief_a4` ★ ระเบิดพิษลาม (spread 60% + Plague Burst)
- 🩸 new single core column `thief_core` replaces `thief_crit` + `thief_blood`: `thief_c1` คมเลือดซ้อนสถานะ · `thief_c2` จุดตายสะสม · `thief_c3` กระหายเลือด · `thief_c4` ★ ราชันย์โลหิต (ids `thief_c2..c4` reused, gated by the save migration) · `thief_b3`, `thief_l1..l4` removed
- Talents row 2: `th_t2a` ขโมยจังหวะ (+CD cut) · `th_t2b` จุดบอดซ้อนพิษ (crit per stack) · `th_t2c` จังหวะสลับมีด (weave bonus; no more `autoCostCut`)
- Tests: new `tests/thief-p2a.test.ts` · `admin-model` borrow tests no longer use removed Thief nodes
- Hooks come in the next commits (data only here)

## 🔁 feat(thief): s1Weave alternation and D.Strike energy
- สลับคม: after แทงพิษ the next hero action is a basic attack (`s1Weave`, cleared by any basic attack · a booked Ult keeps it) → S1 : Basic = 1 : 1 even with cost cuts (Rogue / Mobster too: `job.id` stays `thief`)
- Double Strike landing: Energy +`KIT.thiefStrikeRes` (4) · its leech share is `KIT.thiefStrikeLs` (was hardcoded 0.33)
- Test: 20-turn Energy simulation in `tests/thief-p2a.test.ts`

## ☠️ feat(thief): thief_a hooks pen, hold, strike poison, plague
- `thief_a1`: physical non-crit hits on a poisoned monster add `thPoisonPen` to physPen (total under `STAT_CAPS.physPen` 0.75)
- `thief_a3`: Toxic Skin monsters keep each poison stack with chance `thiefToxicHold` (cap 0.75) · Double Strike landed → +1 poison
- `thief_a4` ★: poison spread on death = `KIT.thiefSpreadShare` (60%, card `ven_L1` alone still /2) · Plague Burst: corpse with ≥ `KIT.thiefPlagueAt` stacks hits every other monster for `thiefPlagueTurns` turns of its poison (dot, src poison) · `plagueBursting` stops chains · ทวงหนี้ (`debtBursting`) skips both

## 🩸 feat(thief): thief_core hooks leech, stack crit, kill heal, blood king
- `thief_c1`: physical hits leech `thCondLeech` when the target has a status (poison / chill today; ×1.5 at 2+ kinds) · base lifesteal + this capped at `LIFESTEAL_CAP` 0.4 (new export, also used by `heroBuild`)
- `thief_c2`: crit (basic / combo) and skillCrit (skills / Ult) + per poison stack on the target (`thiefStackCritAdd`, under the usual crit caps) · physical crit → +1 poison
- `thief_c3`: kill heals `thiefKillHeal` (+ poison on the corpse) + Energy `KIT.thiefKillRes` · first boss / mini crit each turn heals + Energy · old `resGain(10)` of `killHeal` now reads `KIT.thiefKillRes` (same 10)
- `thief_c4` ★: HP < 45% → lifesteal ×1.75 and D.Strike leech 66% (gear ★ ราชันย์โลหิต ×2 is not stacked: the bigger one wins)
- Extension points for P2b: `statusKinds()` `stackCountOf()` `inShroud()` · notes in `design/p2/NOTES.md`

## ⏱️ feat(thief): row-2 talents dodge cooldown, stack crit, weave bonus
- `th_t2a` ขโมยจังหวะ: a dodge still gives Energy, and also cuts Skill 2 (when its CD is the longer one) or the Ult CD by 1 turn · ICD 3 / 2 hero turns · Ult CD cuts go through the new `cutUltCd()` (P2c adds the global cap there)
- `th_t2b` จุดบอดซ้อนพิษ: crit / skillCrit per poison stack (cap `KIT.thiefStackCritTalMax` 14) via the same helper as `thief_c2`
- `th_t2c` จังหวะสลับมีด: the basic attack right after แทงพิษ gets +25/40% in the basic bracket (all its basic / combo hits, outside the `basicDmg` perk cap) + Energy 10/16

## 💾 feat(save): thief rework v1 free web and talent reset
- New `SaveData.thiefRogueRework` (version number) + `THIEF_REWORK_VER = 1` + `migrateThiefRogueRework()` (runs in `load()` after `migrateNodeStretch` / `migrateSageRework`; `newSave()` starts at 1)
- Every save with `job === 'thief'` (Rogue / Mobster included) gets its class 1 web refunded through `resetTree()` (cross-tier points go back to their own pool) and `jobTalents` cleared, once · `job2Tree` / `job2Talents` / `job2Points` untouched
- Guards: non-object save, string flag, null `jobTree`, corrupt values, missing `skillPoints` · tests in `tests/thief-p2a.test.ts` (incl. `load()` end to end)

## 🤖 chore(bot): sync thief web ids and rework flag
- `tools/bot.cjs` save setup adds `thiefRogueRework: 1` (else `load()` would wipe the bot's Thief / Rogue / Mobster `jobTree`) · `TREEX` / `TAL` examples use P2a ids · Rogue preset untouched (P3) · bot not run (Q playtests)

## 🐛 fix(admin): Thai labels for kit mageCore
- `kit.mageCore.*` (กายสู่เวท) had no `KIT_EXPLAIN` rows and no group title → 2 `admin-engine` tests failed (pre-existing, not P2a) · added 4 labels + the group title

## 🎯 feat(thief): B1 takenAmp + debuffKinds pure helpers + KIT keys
- P2b T1 (`design/p2/P2b-spec.md`): `takenAmp(TakenIn)` = Exposed + stabMark + woundPriv + privileged + gear `poisonAmp` **added**, one cap `KIT.thiefTakenCap` 0.6 (R4.6 B1) · `debuffKinds(flags, wide)` (4 kinds for thief_c1, 8 for th_t4a)
- New `KIT` keys `thiefTakenCap` 0.6 · `thiefPrivAt` 8 · `thiefStackHpMax` 20 · `thiefPoisonAmpAt` 10 (admin kit table + Thai labels) · `thiefKindsAt` / `thiefStrikeRes` / `thiefStrikeLs` already came with P2a
- Pure only, no caller yet · tests `tests/thief-p2b.test.ts`

## 🔢 feat(thief): Skill 2 numbers S2P/S2N + admin labels + text
- P2b T2: `S2P.smokeRes` {10, 5} (rounded) · `S2P.woundMax` {6, 2/3} (floored) · 25 plain `S2N` numbers (Shroud / Sightless Raid / Exposed / Blind · ล้วงกระเป๋า / Zeny / Plunder · Wound / Blade's End / Privileged), all in the admin `skills` table with Thai labels
- `S2N.pickMul()` removed → `pickBase` 1.3 / `pickStarMul` 1.9: ล้วงกระเป๋า hits 1.3x / 1.9x now (was 1x / 1.6x); the full rework comes in T7
- ม่านควัน cost 40 → 35 · the three Skill 2 texts + skill info rows describe the new mechanics (numbers read from `S2N`, whole numbers at fractional "+" levels)

## 👁️ feat(thief): monster statuses Exposed / Wound / woundHealCut + ticks
- P2b T3: `Mon.exposed` / `exposedPct` (monster turns) · `wound` / `woundTurns` (hero turns, ticked at the top of `heroAct()` before Skill 2) · `woundCut` / `woundCutTurns` (Blade's End heal cut) · `bladeSpent` (reset each hero turn) · `robbed`
- `healCut()` = max(hellfire / burn cut, Blade's End cut) · icons 👁️ Exposed, 🩸N Wound · Toxic Skin does not speed up Wound / Exposed
- `thief_c2` / `th_t2b` stack crit counts poison + Wound (`stackCountOf`) · no caller sets the new statuses yet (T6–T8)

## ➕ feat(thief): B1 takenAmp in damageMon (replaces the flat poisonAmp line)
- P2b T4: `damageMon()` calls `takenAmpOf(m, dot)`: Exposed (hits only) + แผลลึก Privileged (`S2N.woundPriv`, dot too) + `thPrivileged` (new stat, th_t4a in T5) + gear `poisonAmp` (still needs `KIT.thiefPoisonAmpAt` 10 stacks) — **added**, cap `KIT.thiefTakenCap` 0.6
- Numbers today: unchanged, except gear `poisonAmp` + old th_t4a above +60% now stop at +60% (max gear 0.45 + 0.25 = 0.70 → 0.60)
- `thief_c1` status kinds read `debuffKinds()` (Poison / Wound / Exposed / Chill) · new `debuffFlags(m)` (stabMark = P3)
