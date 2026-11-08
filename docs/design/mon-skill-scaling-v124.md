# Monster skill scaling (v124)

Q 2026-11-08: "skills ของบอส หรือมอนตัวอื่นๆ ต้องมี level skill และ scaling เหมือนกับสกิล hero" ·
"ทำระบบ scaling lv รองรับค่าสถานะต่างๆ ไว้รอเลย ประยุกต์รวมไปจาก lol, dota2, ro and more"

Code: `src/data/mon-skill-scale.ts` · used by `BattleScene.useSkill` (Lv) and `BattleScene.skillHit` (damage).

## 1. Skill Lv from monster Lv (every mode)
`cast Lv = own Lv + floor((monster Lv − anchor) / 10)`, the bonus capped at Lv 10 (a skill written above 10 keeps its Lv, RO style).

| monster | anchor | result |
|---|---|---|
| D1-D5 / event (anchored numbers) | its home Lv | home dungeon / hard / daily: unchanged · tower: grows (อัศวินมรณะนรก F45 Lv78 → Lv7) |
| D6+ stat monsters | `MON_SKILL_LV.nativeAnchor` = 0 (absolute) | Lv 40 → 5, Lv 80 → 9 |

The Lv works through `skillAtLv` (v81): pow +10%/Lv, +1 hit / 10 Lv (bolt / strike), +1 fx stack / 5 Lv (not freeze), warcry +1 turn / 5 Lv.
Heal / shield / revive pows grow too (share of max HP, capped at 100%).

D6-D10 impact (was Lv 1 everywhere):

| dungeon | Lv | skill Lv | pow | fx stacks |
|---|---|---|---|---|
| D6 | 40-50 | 5-6 | x1.4-1.5 | +0-1 |
| D7 | 50-60 | 6-7 | x1.5-1.6 | +1 |
| D8 | 60-70 | 7-8 | x1.6-1.7 | +1 |
| D9 | 70-80 | 8-9 | x1.7-1.8 | +1 |
| D10 | 80-90 | 9-10 | x1.8-1.9 | +1 |

Knobs: `MON_SKILL_LV.nativeAnchor` (e.g. 40 → D6 +0, D10 +4), `.every`, `.max`; `SKILL_SCALE.lv.powPer` (0.1).

## 2. Multi-ratio formula (`MonSkill.f`, optional)
`damage per hit = base(Lv) + Σ ratio(Lv) × source`, then crit, `alone`, buffs, the hero's DEF / M.DEF as before.

- **LvVal**: `number` (flat) · `number[]` (Dota: value per Lv, last repeats) · `{ base, per }` (LoL / RO: base + per × (Lv−1)).
- **sources**: `atk` / `matk` (normal-hit power: def.dmg / matk × 0.55, so `atk: 1` = its normal hit) · `str` `vit` `wis` `dex` `int` `luk` `agi`
  (stat points, RO) · `lv` · `maxHp` (caster) · `tgtMaxHp` / `tgtHp` / `tgtMissing` (LoL %HP / execute).
- A skill without `f` keeps the old path: ATK (bolt: M.ATK) × 0.55 × pow × stat scale. No tuned skill was converted.
- `describeFormula(f, lv)` gives hero-style text: `150 + 150% P.ATK + 2×STR + 5% HP สูงสุดเป้าหมาย`.

Example (Q's): ดาบมรณะ "STR × P.ATK 125% × Lv" could be written
`f: { ratio: { atk: { base: 1.25, per: 0.25 }, str: { base: 1, per: 1 } } }` → Lv1 125% P.ATK + 1×STR, Lv7 275% P.ATK + 7×STR.

## Not done yet
- Bestiary / admin don't show `f` or the cast Lv yet.
- Hero-side `S2N` style tables could share `LvVal` later.
