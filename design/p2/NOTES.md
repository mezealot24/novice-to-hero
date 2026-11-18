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
