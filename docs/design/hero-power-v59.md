# Hero Power + monster scaling (v59)

Q 2026-11-04: "มอนสเตอร์ บอส มินิบอส scale ไม่ทันคนเล่นจริงละ" → plan approved ("Ok เอาตามนี้").
Playtest target: Q's Thief Lv44 (AGI 101, Flee 159, lucky dodge 25%, crit 56%, combo 50%, HP 386) found hard D1-5 trivial
and the tower only got hard past F60.

## Hero Power (`src/data/power.ts`)
- Read off `heroStats` (Lv, stat points, gear, refine, cards, talents, skill web). No in-run picks / relics:
  every mode snapshots it at run start (`RunConfig.power`, `RunConfig.pp`).
- `offense` = expected damage per hero-time vs a reference monster (DEF 20, Flee 15): P.ATK or M.ATK by class,
  hit chance, crit x crit damage, combo, Double Strike, attack speed, skill power.
- `survival` = HP / damage taken share (DEF, M.DEF, guard, Flee with the real hit floor incl. Thief `fleeFloor`,
  lucky dodge) x sustain (lifesteal, spell vamp, regen, heal amp, counter, **dodge heal**).
- `CLASS_K` calibrates classes (Priest heals, Mage AoE, Thief poison) so bot builds of the same tier score alike.
- `power = 0.55 · sqrt(offense · survival)`; shown on the character screen, hub (`แนะนำ ⚡N`) and tower panel.

## Scaling rule: `matchScale(pp, dungeon)`
Each dungeon has a reference build `REC[d] = { o, s }` (bot profiles that clear it ~80%).
Monster **HP x offense / o** (fights last as long) and **ATK x survival / s** (hits hurt as much).
A hero below the reference is lifted to 1, so scaling never makes content easier.

| | rule |
|---|---|
| 🟢 normal | monsters unchanged. Power > 1.5x recommended → zeny, card and common-mat drop chance x(1.5/ratio), min 40%. |
| 🔥 hard | `matchScale x 1.1` (replaces Base-Lv scaling). Every boss / mini boss: 🎯 trueSight after 1 dodge, 3 turns (anti-evasion). |
| 🗼 tower | `0.8 x matchScale(src dungeon) x damp`, HP x1.04^(f-1), ATK x1.03^(f-1). Damp = (P/330)^-0.15 above 330 so gear still climbs. |

Tower extras:
- **Affixes** (`src/data/affixes.ts`): one more every 10 floors (F11+ 1, F21+ 2 … max 4), rolled per run, banner on arrival:
  แผลลึก (heal -30%), เกราะหนา (DEF +25, HP +10%), ตาเหยี่ยว (all trueSight), แยกร่าง (copy at 40% HP), ว่องไว (+15% speed),
  ผีดูดเลือด (15% lifesteal), ระเบิดตาย (death blast).
- **Enrage**: after 12 hero turns (boss / mini 20) every monster +8% damage per hero turn, stacking.

Bot: `POWER=1` prints a profile's power / offense / survival; results carry `power`.
