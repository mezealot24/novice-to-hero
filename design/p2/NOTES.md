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
