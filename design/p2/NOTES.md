# P2 implementation notes (spec vs real code)

Entries the implementer logged while coding. Each keeps the spec's intent; "why" is the real code.

## P2a

- **T4 field `weaveBonus`** is added in T7, not T4: `tsconfig` has `noUnusedLocals`, so an unread field / local in T4 fails `npm run typecheck`. T4 only adds `s1Weave` and clears it at the top of `basicAttack()`.
- **T6 c1 lifesteal cap**: the spec says cap the total with 0.4. Real `ls` also has Wolf stance `woundLs` and Skill 2 เลือดเดือด, which were never capped; capping all of it would nerf them. Only `st.lifesteal + thCondLeech` is capped (new `LIFESTEAL_CAP` 0.4 in `stats.ts`, also used by `heroBuild`). Other leech sources add on top as before.
- **T6 c4 ราชันย์โลหิต**: the gear ★ `bloodKing` line keeps its old inline `0.4` / `×2` (spec: "เลข 0.4/2 ของ gear เดิมคงไว้ ไม่แตะ"); the Thief node uses `max(KIT.thiefBloodKingMul, gear ×2)`. The c4 node text does not mention Shroud yet: `inShroud()` returns false until P2b, so P2b should add "หรืออยู่ในม่านควัน" to the `thief_c4` desc when it wires `inShroud()`.
- **T6 c3**: the kill heal block also needs `KIT.thiefKillRes` for the new node (spec only mentions replacing the old `resGain(10)`); both use the same key.
