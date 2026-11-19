# P2 implementation notes (spec vs real code)

Entries the implementer logged while coding. Each keeps the spec's intent; "why" is the real code.

## P2a

- **T4 field `weaveBonus`** is added in T7, not T4: `tsconfig` has `noUnusedLocals`, so an unread field / local in T4 fails `npm run typecheck`. T4 only adds `s1Weave` and clears it at the top of `basicAttack()`.
- **T6 c1 lifesteal cap**: the spec says cap the total with 0.4. Real `ls` also has Wolf stance `woundLs` and Skill 2 เลือดเดือด, which were never capped; capping all of it would nerf them. Only `st.lifesteal + thCondLeech` is capped (new `LIFESTEAL_CAP` 0.4 in `stats.ts`, also used by `heroBuild`). Other leech sources add on top as before.
- **T6 c4 ราชันย์โลหิต**: the gear ★ `bloodKing` line keeps its old inline `0.4` / `×2` (spec: "เลข 0.4/2 ของ gear เดิมคงไว้ ไม่แตะ"); the Thief node uses `max(KIT.thiefBloodKingMul, gear ×2)`. The c4 node text does not mention Shroud yet: `inShroud()` returns false until P2b, so P2b should add "หรืออยู่ในม่านควัน" to the `thief_c4` desc when it wires `inShroud()`.
- **T6 c3**: the kill heal block also needs `KIT.thiefKillRes` for the new node (spec only mentions replacing the old `resGain(10)`); both use the same key.
- **T8 migration**: before `resetTree()`, non-number / non-finite / ≤ 0 entries of `jobTree` are dropped (and a non-object `jobTree` becomes `{}`): `resetTree()` sums `Object.values` as-is, so one corrupt value would make the refund `NaN`. The reset itself sits inside `if (v < 1)` so P3 can add `if (v < 2)` next to it.

## P2b

- **T3 `stackCountOf()`**: P2a left it at `m.poison` with "P2b adds Wound here"; T3 makes it `m.poison + m.wound` (the spec §3.2 lists `thief_c1`/`thief_c2` counting poison + Wound). `thief_c2` / `th_t2b` texts now say "พิษ + Wound".
- **T3 field names**: the spec's `woundCut` / `woundCutTurns` are used as written (Rev 3 calls it `woundHealCut`).
- **T7 ล้วงกระเป๋า Zeny**: `coinsFly()` adds each coin share to `this.zeny` when it lands (no double count). The coin start point is read before the hit (the sprite may be gone after a kill). `pickZenyDex` divides through `Math.max(1, …)` so an admin value of 0 cannot make `Infinity` Zeny.
- **T7 `procs('basic')`**: called once after the swing as the spec says, with the Skill 2 `src` (`'skill'`) still set: `withSrc()` restores `src` synchronously, so it cannot wrap the async `procs()`. Card procs read the trigger, not `src`.
- **T7 th_t2c weave**: ล้วงกระเป๋า is a basic swing (`src 'basic'`), so a pending จังหวะสลับมีด bonus also applies to it (the bonus is only cleared at the end of `basicAttack()`). Left as is (one basic swing = basic bracket, as the spec asks).
- **T8 Blade's End crit**: without ★ the spec allowed a forced crit (Back Stab `forceCrit`) to leak into Blade's End; the code clears `forceCrit` for the non-★ hit (the spec's "strict" option) so "Blade's End คริได้" stays a ★-only effect. Hook + Wound add are methods `bladesEnd(m)` / `addWound(m, n)`.

## P2'a

Slice P2'a (design/p2/MAIN-VS-REV4.md §4) on top of main's live Thief rework. Entries where the plan or the old P2a spec did not match the real code.

- **Keys**: only the keys P2'a reads were added (14 KIT · 8 Stats). The ones MAIN-VS-REV4 §2 drops (`thPoisonPen`, `thToxicHold`, `thStrikePoison`, `thPlagueDeath`, `thStackCrit`, `thCritPoison`, `thiefToxicHoldCap`, `thiefSpreadShare`, `thiefPlague*`, `thiefStackCritMax`) are not created at all.
- **Core column order**: c1 คมเลือดซ้อนสถานะ (tier 1) → c2 หมายหัว (tier 2, main's node moved from `thief_crit` as is) → c3 กระหายเลือด → c4 ★ ราชันย์โลหิต. หมายหัว now needs c1 instead of the retired มีดคู่ (`thief_b3`) to unlock.
- **Retired with the two old columns**: `thief_b3` มีดคู่ (P2'c re-adds the id in `thief_b`), `thief_l1`–`l4` (incl. เลือดพิษ `poisonLeech`: no Thief node gives it until P2'd `thief_v3`), old c3 คริชาร์จ (`arCritRes`, Archer keeps the stat) and old c4 เพชฌฆาต (`thExecute` stays in `Stats`/BattleScene with no source; P2'c removes the ×1.5 line). Gear / card `killHeal` / `bloodKing` / `poisonLeech` still work.
- **`th_t2b` stack cap 14** (`thiefStackCritTalMax`) kept as specced: MAIN-VS-REV4 §5.1 #3 flags thresholds tuned at cap 12, but this is a per-stack ramp (not a flat on/off threshold) and 14 = 70% of today's base cap 20, so it still grows with stacks. Retune after playtest. Counts poison only (P2'b adds Wound).
- **`thiefBloodKingOn(st, hp, maxHp)`** has no `inShroud` parameter yet (old P2a passed a stub `false`): ม่านควัน is P2'b, which can add the parameter + desc text when it exists. c4 desc says HP only.
- **admin-model test**: `เคลือบพิษ` keeps its main name (a-line untouched), so only the มีดคู่ / คมเลือด / จุดบอด picks moved to "any class node with crit / lifesteal" (from old `ecaf11d`).
- **c1 lifesteal cap** (same as old `0085cf4`): only `st.lifesteal + thCondLeech` is capped with the new `LIFESTEAL_CAP` 0.4 (`stats.ts`, also used by `heroBuild` instead of its inline `0.4`). Wolf stance `woundLs` and Skill 2 เลือดเดือด were never capped and still add on top.
- **c1 status kinds** = poison + chill (`statusKinds(m)`): 🐌 พิษชา's chill counts as a kind (MAIN-VS-REV4 §2 P7). P2'b adds Wound / Exposed there.
- **c3** keeps the gear / card / Mobster `killHeal` block (now `resGain(KIT.thiefKillRes)` instead of `resGain(10)`, same number); the node heal is a second block. The boss crit heal is an `else if` after the gear one, so both share the once-per-turn `killHealCritUsed`.
- **c4** uses `max(KIT.thiefBloodKingMul, gear bloodKing ×2)`; the gear line keeps its old inline `0.4` / `2` (not new numbers, only moved into `bkMul`).
- **`th_t2a` CD pick**: Skill 2 when its CD left ≥ the Ult's, else the Ult (old P2a choice; Rev 3 only says "or"). Only `th_t2a` goes through the new `cutUltCd(n)` today; the other Ult CD cuts (relics, ทวงหนี้ refund, combo finisher, Archer kills) still write `smashCdLeft` directly — P2'c moves the Thief ones behind `cutUltCd` when it adds the global cap.
- **`th_t2b`** reads `target.poison` directly in `critRateFor` (no `stackCountOf` helper until P2'b has Wound to add). Magic hits / procs get nothing.
- **`th_t2c` weave bonus** is added inside the basic bracket (`srcMul`, R4.6 B4), so it covers every basic / combo / D.Strike hit of that one swing and is cleared before `monCounter` (a counter swing does not get it).
- **Migration** (`f574d3e` src applied with `git apply -3`, owner rule: minimal): `thiefRogueRework` number, `THIEF_REWORK_VER = 1`. Lower version + `job === 'thief'` (Rogue / Mobster too) → `resetTree(s)` refund (cross-tier points go back to job2 / job3 pools) + `jobTalents = {}`; job2 web / talents / points untouched. Non-number / ≤ 0 `jobTree` entries are dropped first so the refund cannot be `NaN`; flag is written first, so a rerun does nothing. Later slices bump the version + add an `if (v < N)` block.
- **bot.cjs** (`49467dd` applied): bot saves carry `thiefRogueRework: 1` so `load()` does not wipe the bot's Thief `jobTree`; examples use live ids. Not run.

## P2'b

Slice P2'b (design/p2/MAIN-VS-REV4.md §4: status layer + Skill 2) on top of P2'a. Entries where the plan / old P2b spec did not match the real code.

- **Thresholds as a cap share**: the old `thiefPrivAt` 8 / `thiefPoisonAmpAt` 10 (flat stacks, tuned at cap 12) became `KIT.thiefPrivShare` 0.6 / `KIT.thiefPoisonAmpShare` 0.5 of the hero's `poisonMax()` through `poisonAt(share, cap)` (ceil, ≥ 1). At the base cap 20 gear กัดกร่อน still needs 10 stacks (no change); with พิษสะสม (cap 29) it needs 15. สถานะทับซ้อน = 12 at cap 20 (0.6 is MAIN-VS-REV4 §5.1 #3's example; old 8/12 was 0.67).
- **Skill 2 numbers** (old `49b97d3` minus every `th_pick` key: `pickBase` `pickStarMul` `pickZeny*` `plunder*`): `S2N.pickMul` stays (main's steal). The old commit also rewrote the Skill 2 texts / info rows and the ม่านควัน cost (40 → 35) in the numbers commit; here they move to the ม่านควัน / แผลลึก commits, so no text describes a mechanic before it exists.
- **Status kinds / stack count**: main has no `stackCountOf()` (old P2b T3); P2'a's `th_t2b` reads the target in `critRateFor`, so that line now passes `target.poison + target.wound`. `statusKinds(m)` = `debuffKinds(debuffFlags(m), false)`. `robbed` (old ล้วงกระเป๋า Zeny flag) is not added. Mobster `debt(m)` still does not count Wound / Exposed (old spec F25).
- **B1 in `damageMon`**: `takenAmpOf(m, dot)` sits on the old `poisonAmp` line (same place in the multiplier order, after `lateDmg`, before the executioner relic). The gear text (`stat-text.ts`, set 3-piece label) now says "≥ ครึ่งเพดาน" instead of "10+": same 10 at the base cap, more with poison-cap nodes / gear.
- **th_t4a** (old `fdd5d8d` text reworked): the stack threshold reads "60% ของเพดานพิษ (12 จาก 20)" from `KIT.thiefPrivShare` / base cap; the game checks against the hero's real `poisonMax()`. Wide kinds count blind / armor break / weak too (old spec), so Mobster's armor break + poison already opens it.
- **th_t1c** (old `40857b5`): `syncStackBody()` runs at the top of `heroAct` (after the Wound tick) and in `killMon`; poison added mid-turn shows up in Max HP on the next hero turn. Tenacity is added directly (no `applyMod` soft cap); a card pick that soft-caps tenacity while the bonus is on can drift it a little — accepted (≤ 0.14).
- **Migration v2**: `THIEF_REWORK_VER = 2`; the body is the v1 reset behind `if (v < 1)` / `if (v < 2)` flags, run once, so a save older than both is refunded once (not twice). Owner rule: beta saves, same minimal reset — the reset also lets players re-pick Skill 2 after the ม่านควัน / แผลลึก rework.
- **ม่านควัน** (old `6d335c8`): Shroud ticks in `heroAct` next to the Wound tick (before `skill2Turn`), not in `heroTurn` where 👤 ร่างเงา ticks: cast on turn N = 2 → 1 at N+1 → 0 at N+2, so it covers the monster turns after N and N+1 (spec "2 เทิร์นเต็ม"). Shroud and ร่างเงา are separate (MAIN-VS-REV4 U1: Shroud stays a Skill 2 status). The Raid hook sits in `strike()` after the Toxic / Ice Skin lines, flag cleared before the bonus hit. ควันหอม Energy only for Energy users (Mobster / Rogue are Energy too). ★ crit dmg only for physical hits.
- **ราชันย์โลหิต**: `thiefBloodKingOn(st, hp, maxHp, inShroud)` got the 4th (required) parameter + c4 text "หรืออยู่ในม่านควัน" (NOTES P2'a asked for it). Gear ★ ราชันย์โลหิต is unchanged (HP only).
- **แผลลึก** (old `d4521f7`): `addWound` / `bladesEnd` as before (strict no-crit without ★: `forceCrit` cleared for the hit, restored after). Hook sits right after the Sightless Raid hook. Blade's End uses `shadowSlashFx` (MAIN-VS-REV4 R4 reuse list) on top of main's `venomStabFx` for the cast.

## P2'c

Slice P2'c Ult × เกจเงา (design/p2/MAIN-VS-REV4.md §4 + owner answers Q1 / Q2) on top of P2'b + crit rework (`0be41df`) + Ratio AGI pool floor + Rogue P3'a. Entries where the plan / old P2c-spec did not match the real code.

### Ult budget (Q2: ceiling = live เงาพริ้ว incl. ร่างเงา)

Unit = one non-crit stab (`KIT.thiefUlt × hitPow × (1 + thUltAgi)`): hitPow, Ratio AGI (also the `thiefUltAgiPoolMin` 60 floor), P.ATK, DEF and the Hit roll scale every stab the same, so they cancel; Rogue พายุมีด = the same dance × `h2` (its knives are outside the budget). Ceiling = main's best build: old `th_t3b` มีดรัว R2 = 7 stabs. Crit rework rules: an Ult stab crits only with skillCrit (`sc`); ร่างเงา = every stab a sure crit at full crit power. Worst-case target (HP low, 3 kinds), crit + ★ finisher trigger as expected values. `thiefUltBudget()` (skill-math) = the model; `tests/thief-p2c.test.ts` locks every build ≤ 100% over sc 0–0.6 × critMul 1.4–3.0 × other B3 0 / 0.25 / 0.61 × card ultHits 0 / 1, both states.

| Build | Lv 20 (sc 0, cm 1.4) off / on | Lv 40 (sc 0.10, cm 1.8) off / on | Lv 80 (sc 0.25, cm 2.2) off / on | Rogue Lv 80 (sc 0.30, cm 2.2) off / on |
|---|---|---|---|---|
| live ceiling (old th_t3b R2, 7 stabs) | 7.00 (100%) / 9.80 (100%) | 7.56 (100%) / 12.60 (100%) | 9.10 (100%) / 15.40 (100%) | 9.52 (100%) / 15.40 (100%) |
| base (no talent) | 4.00 (57%) / 5.60 (57%) | 4.32 (57%) / 7.20 (57%) | 5.20 (57%) / 8.80 (57%) | 5.44 (57%) / 8.80 (57%) |
| th_t3b R2 only | 6.00 (86%) / 8.40 (86%) | 6.48 (86%) / 10.80 (86%) | 7.80 (86%) / 13.20 (86%) | 8.16 (86%) / 13.20 (86%) |
| th_t3a R2 + u full | 4.82 (69%) / 6.97 (71%) | 5.50 (73%) / 8.78 (70%) | 6.87 (76%) / 10.58 (69%) | 7.20 (76%) / 10.58 (69%) |
| th_t3b R2 + u full (max) | 6.17 (88%) / 9.61 (98%) | 6.87 (91%) / 12.09 (96%) | 8.55 (94%) / 14.57 (95%) | 9.00 (95%) / 14.57 (95%) |
| th_t3c R2 + u full | 4.11 (59%) / 6.51 (66%) | 4.57 (61%) / 8.19 (65%) | 5.66 (62%) / 9.87 (64%) | 5.95 (62%) / 9.87 (64%) |

(u full = thief_u1 5 · u2 5 · u3 5 · u4★. Reference crit profiles per level are guesses: the crit rework left physical classes with few skillCrit sources; the test covers the whole grid.)

### Plan vs real code

- **ร่างเงา makes crit-rate bonuses worthless, crit dmg full** (MAIN-VS-REV4 §5.2): so the u-line has small Ult skillCrit (≤ +5%, th_t3a ≤ +8%) and one Ult-own crit-dmg cap `thiefUltCondCap` 0.15; the old P2c numbers (cond crit dmg 0.30, finisher 0.3, On-Hit D.Strike) went 115% over the ceiling with the gauge on.
- **`th_t3b` re-cut +2 | +3 → +1 | +2 stabs** (+ On-Hit): any u-line damage on top of the live 7 stabs breaks the ceiling. th_t3b alone = 86% of live; with the full u-line 88–98%. Players without u-line points lose up to 14% Ult (the v5 reset gives every point back).
- **Old th_t3a เงาซ้อน (sure dodges) / th_t3c มีดอาบพิษ (poison)** are merged into the new `th_t3c` เงาหมอกลวงตา (+ gauge +1 per cast); `th_t3a` is now the crit / execution style (sure dodges −1 trade-off, never below 1).
- **On-Hit = lifesteal × share + Wound chance only**: Rev 3's On-Hit D.Strike / card `procs('basic')` / knife crits add damage outside the stab model → not in P2'c. Ult stabs had no lifesteal before (`lsMul` 0 in skills).
- **Finisher**: one per cast, at the lowest HP share. `th_t3a` always fires and rolls crit; `thief_u4` ★ needs `thiefFinisherAt` 3 crits and is a sure crit (always inside ร่างเงา). `thiefFinisherMul` 0.2 (0.25 was 0.3% over with card ultHits +1).
- **Q1 one gauge**: no `ghostShroud` counter, no `thiefShroud*` keys, no `onShroudBreak()`. b-line: b1 dodge gauge +1 chance + Flee in ร่างเงา (the old flat Flee / fleeFloor are gone) · b2 keeps dodge heal + shield on entering ร่างเงา · b3 (id back) dodges inside ร่างเงา cut the Ult CD · b4★ keeps the counter + ร่างเงา +1 turn. `th_t1a` fills the gauge at wave start (it was a Shroud charge in Rev 3).
- **All 3 dodge paths** (hurtHeroCore `dodged()`, duelist `trueHurt` sure dodge + LUCKY) call `shadowDodged()` (they all filled the gauge before).
- **Global Ult CD cap**: `cutUltCd()` was P2'a's single entry point; it now spends `thiefUltCdCutCap` 2 per hero turn (reset at the hero-turn CD tick) and the cast turn keeps CD ≥ `thiefUltCdFloor`. The plan's floor 1 would still let the next tick reach 0 = back-to-back Ults, so the floor is **2**. Routed: th_t2a, thief_b3, Rogue Kill Reset (R4.8). Not routed: relics, Archer, Mage Foresight, Mobster ทวงหนี้ refund (Mobster rule). th_t2a no longer spends its ICD on a zero cut.
- **B3**: `condCritDmg(m, opener)` sums Shroud ★ + Rogue rg_x2 ใจสลาย + Ult-own + thief_u3 on basic / combo + th_t1b R2 under `thiefCondCritDmgCap` 0.75. Today's max without P2'c terms is 0.61, so rg_x2 is unchanged unless stacked with the new terms. `thExecute` ×1.5 removed; `Stats.thExecute` kept as a retired key. หมายหัว release stays ×mul (B4).
- **th_t1b opener**: the first physical hero hit of each wave (ally hits excluded) is a sure crit; if the first action is the Ult, one stab gets it (outside the per-cast budget, ≤ 1 stab per wave).
- **th_t4c**: renamed to หมอกลวงตา only (effect = old flat fleeFloor). Rev 3 Mistwalker (window, trueSight DR, poison reflect) is not in P2'c's slice list.
- **Not done** (not in the slice list): DEX → Ult stabs (`thiefUltDex*`), `thief_b1` trueSight DR, Shadow window `fleeFloor`.
- **Save**: `THIEF_REWORK_VER` 3 → **5**: 4 is left for Rogue P3'b (planned). Same minimal reset as P2'a/b, now `if (v < 5)` (once even several versions behind); the Rogue `job2Tree` / talents are never touched by it. `tests/rogue-p3a.test.ts` now expects the class 1 reset for a v2 save too. `tools/bot.cjs` flag 5 (not run).
- **Mobster** (`job === 'thief'`): gets b-line / th_t1* / th_t2a CD cap / thief_u3 basic crit dmg; its Ult (ทวงหนี้) does not call `shadowDance`, so the u-line / th_t3* do nothing for it. `trees2/mobster.ts` / `JOB2.mobster` / `KIT2.mobster` untouched.
- **Uptime of ร่างเงา** (b1 / b4★ / th_t1a / th_t3c make it more frequent / longer) is not in the per-cast budget: needs Q's playtest.
