# Changelog 2026-11-19

## ⚖️ balance(thief): เงาพริ้ว Ratio AGI (Q's pick, K = 2.0)
- Was `thUltAgi = 0.02 × AGI` (uncapped): damage = P.ATK × AGI, both grow with level -> early Thief weak, late runaway
  - Q's Lv 80 Rogue (AGI 238): ×5.74 per stab, 1311–2384/stab (crit 6317), ~90% of พายุมีด damage
- Now `thUltAgi = K × min(cap, AGI above start / stat pool)` · pool = `pointsPerLevel × Base Lv` (`statPool()`)
  - all-in AGI = ×3.0 at **every** Base Lv (Lv 20 ≈ +38% vs before · Lv 40 ≈ −11% · Lv 80 ≈ −48%)
  - gear / race / job AGI count, share cap 1.2 (×3.4 max)
- New `KIT.thiefUltAgiK` 2 · `KIT.thiefUltAgiShareCap` 1.2 (admin table `kit`, with Thai explain)
- `StatsInput.baseLevel` (optional; SaveData already has it) · no baseLevel -> pool = allocated points
- Status tab AGI line + เงาพริ้ว desc show the new rule · Mobster unaffected (ทวงหนี้ does not call shadowDance)
- Tests: `tests/thief-ult-agi.test.ts`
- Not bot-checked (Q playtests)

## 🐛 fix(rogue): พายุมีด knives ignored มีดบิน bonuses
- `BattleScene` storm threw `ultKnifeMul × h2` only: `j2KnifeMul` (มีดคม `rg_k1`, ใบมีดลับคม `rg_t2_knife`) did nothing in the Ult
- Now `(ultKnifeMul + ultKnifeJ2Share × j2KnifeMul) × h2` · new `KIT2.rogue.ultKnifeJ2Share` 0.75 (admin kit2 table)
- Small buff: Q's playtest says the knives are the weak part of พายุมีด (the stabs were the OP part, fixed by Ratio AGI)

## ✨ feat(rogue): Back Stab ignores lucky dodge · ★ คริเป็นมีด works on Back Stab
- RO Back Stab never misses: the forced crit already skipped Flee, but D6+ LUK monsters could still 🍀 lucky-dodge it -> new `backStabbing` flag skips `luckyDodge` (Maiden `fixedFlee` unchanged)
- `rg_x4` ★ คริเป็นมีด counted only basic / combo crits -> Back Stab (always a crit) now owes +1 มีดบิน, thrown right after the stab
- Texts: Back Stab desc + rg_x4 desc

## 📝 docs(design): Thief & Rogue rework Rev 4
- `design/thief-rogue-rework-v1.md` gets a "Rev 4 Delta" on top: shipped P1 (3 commits), Q's decisions, rules that override Rev 3 (Ult budget vs ×AGI, no magic numbers in BattleScene, Mobster impact, `resetTree()` migration, reused ids, unverified balance numbers, damage-amp bracket table)
- Removed 15 expired `vertexaisearch` redirect links · fixed `rg_c1` Tempo Lv1 (+12%, not +20%)
- Open for Q: Mobster path (A/B) · แทงพิษ `pskill`

## 🧹 fix(mobster): ทวงหนี้ debt kill no longer re-spreads the burst stacks
- Order is `damageMon()` (can kill -> `killMon` -> `poisonSpread` reads the stacks) then `m.poison = 0` -> a debt kill re-spread the stacks it just burst
- Now a `debtBursting` flag skips only the spread (first try cleared the stacks before the hit, but that also dropped กัดกร่อน `poisonAmp` on the burst: reverted) · Q: the spread on a debt kill was hardly ever used, so this is cleanup (Mobster tree / KIT2 untouched)

## ⚖️ balance(thief): แทงพิษ scales with STR (pskill), base 1.6 -> 1.0
- Other STR skills (Swordsman S1, Back Stab, ตัดเส้นเอ็น, Ults) multiply `(1 + pskill)`; แทงพิษ (+ its Double Strike) did not
- Now `KIT.thiefAuto × pow × (1 + pskill)` · `thiefAuto` 1.6 -> 1.0 so Q's Lv 80 (STR 121, pskill +60.5%) hits the same (1.6 vs 1.605)
- Trade-off (Q's pick): low-STR Thieves hit softer with แทงพิษ (STR 20: 1.6 -> 1.1, −31%) · early game leans on เงาพริ้ว (Ratio AGI) instead · Mobster gets the same change (Q chose path A)
- Skill info row + JOBS.thief.auto desc updated

## 📝 docs(design): Rev 4 damage-amp brackets + KIT key list (P2 prep)
- `design/thief-rogue-rework-v1.md` R4.6: map of every live damage amp (`strike()` / `roll()` / `damageMon()` / `srcMul()`, file:line) + 6 bracket rules for the Rev 3 amps
  - B1 Taken (Exposed, stabMark, Privileged, `poisonAmp`): additive, cap +0.60 · B2 vs-status: unchanged (`OUTSIDE_CAP`) · B3 conditional crit dmg: into `critDmgAdd`, cap +0.75 · B4 skill-own (rg_s3, Ambush): `1 + Σ`, Back Stab cap +0.75 · B5 poison power (Perfect Agony + vsPoison on Contaminate): cap +1.00 · B6 echo (Death Mark pop): no amps at all
  - Lv 80 Back Stab: live ×2.64 · Rev 3 multiplied ×12.05 · with brackets ×6.21 · Contaminate ×10.92 -> ×6.08 · `vsPoison` is already at its 0.70 cap from gear, so `thief_a2` +0.24 adds nothing there
  - Code facts Rev 3 got wrong: `dot=true` still takes `poisonAmp` / `marked` / `lateDmg` / masteries · `thExecute` ×1.5 loses its only source · talent row + Skill 2 are pick-one
- R4.7: 148 keys to add before P2/P3 (Thief `KIT` 76 · `S2P` 2 + `S2N` 25 · `KIT2.rogue` 45) with Thai admin labels + registration checklist (`KIT_INTS`/`KIT_NUMS`, `KIT_EXPLAIN`, `S2N_TH`, `J2_LABEL`, `J2_COL` prefixes, `INTISH`, no `Cost`/`Cd` suffix)
- 1-per-turn ICDs = flags (no key) · value-only changes on existing paths: `job.thief.auto.cost` 40 -> 45, `th_smoke` cost 40 -> 35
- Docs only · no code / test / bot run

## 🔀 chore(thief): P1 rebased onto main (Thief rework #120–#125 + VFX)
- Ratio AGI replaces main's `KIT.thiefUltAgi` (0.02/pt) with `thiefUltAgiK` / `thiefUltAgiShareCap` · admin test `thief-poison` checks the new knobs
- พายุมีด v2 `knifeStorm()` gets `ultKnifeJ2Share × j2KnifeMul` · Back Stab keeps main's Combo Points + `backstabFx`, adds lucky-dodge pierce + ★ crit knife
- ทวงหนี้: main's `poison.burstKeep` kept; `debtBursting` stops ระเบิดพิษ re-spreading on a debt kill (main's chain blast made it matter more)
- แทงพิษ `(1 + pskill)` on main's `venomStabFx` line

## ⚖️ balance(thief): Ratio AGI pool floor (Lv 4 hit the cap)
- Q playtest: Lv 4, AGI 18 (race +2, gear +4) showed เงาพริ้ว +227% — free AGI filled a 12-point pool, near the ×3.4 cap
- Share now divides by `max(KIT.thiefUltAgiPoolMin 60, 3 × Base Lv)` (60 = Lv 20's points) · Lv 4 AGI 18 → +57% (pre-P1: +34%) · Lv 20+ unchanged
- New admin key `thiefUltAgiPoolMin` (kit table, int 0–300, Thai label)

## ⚖️ balance(combat): crit rework, physical skills need skillCrit + Hit, crits no longer ignore DEF (Q)
- Physical skill / Ult hits crit **only** with `skillCrit` (สกิลคริ): `CRIT_RULES.skillFromCrit` 0.5 -> 0 and `skillCrit <= 0` = no crit at all
  - Basic `crit` + crit buffs (ตาเหยี่ยว, ขโมยดวง, คลื่นดาบ, Berserker rampage, Warlord rage) no longer reach skills · Thief poison-stack / Sage ice bonuses still ride on top of `skillCrit`
  - Sure crits are unchanged (`forceCrit`, ร่างเงา, หมายหัว release, Back Stab) · magic skills unchanged (`skillCrit + spellCrit`)
- Physical skill hits always roll Hit vs Flee, even on a crit (new `isSkillHit()`) · basic / combo / counter crits still skip Flee · `sureHit`, Mark pierce, Zen, Back Stab still sure-hit
- **No crit ignores DEF**: `strike()` + Novice `smash()` apply DEF on crits · Ranger `awPierce` now applies to crits too · monster crits already faced hero DEF
- `hitText()` (skill panel) uses the same rule · item texts "คริ = ทะลุเกราะ" removed (u_hawkeye unique, DEX weapon, D9 archer craft, admin DEF explain)
- Balance impact: big nerf to crit builds (crit dmg now ÷ DEF, skills lose borrowed crit) · physical classes have almost no `skillCrit` source yet
- Shroud (P2'b ม่านควัน `smokeSkillCrit`) counts as a skillCrit source, so physical skills inside Shroud can crit
- Tests: `tests/crit-split.test.ts` (+ skill-info tests) · not bot-checked

## ✨ feat(rogue): P3'a 🔪 Dagger Mark + Voracity · Back Stab rework · web rg_k / rg_c / rg_x as mechanics
- Design: `design/thief-rogue-rework-v1.md` §3.2–3.5 + R4.8 (what shipped / what waits for P3'b)
- 🔪 **ตราคมมีด (Dagger Mark):** every landed flying knife (combo / crit / free / storm) = +1 Mark (max `markMax` 3, `markTurns` 2 monster turns, refreshed) · `markFocus` 30% a knife picks a monster under the cap
- 🔪 **เก็บมีด (Voracity pickup):** basic / combo (1 per swing), แทงพิษ, Back Stab on a marked monster -> Sinister Steel `0.35x/Mark x (1 + pskill)` (others 60%, no poison, no lifesteal) + Energy 6/Mark + Combo Point +1 · 2+ Marks = Back Stab CD -1 (1/turn)
- 🔪 **Kill Reset (1/hero turn):** knife kill or a marked monster dies -> Back Stab CD -1 + Ult CD -1 + 2 free knives at the lowest-HP monster
- มีดบิน now x `(1 + pskill x 0.5)` (`knifePskillShare`)
- 🗡️ **Back Stab:** targets the most Marks (ties: highest HP) · picks up Marks · Backstab Mark (hits +15% taken, B1 Taken cap) + Strip Armor (P.DEF -20%) 2 monster turns · 🌑 Shadow Ambush (in ม่านควัน Shroud, or dodged since the last hero turn) +25% (B4 `stabAmpCap` 0.75) + 15 Energy · Combo Point stays (MAIN-VS-REV4 R1), outside B4
- ชำนาญมีด: crit +3% -> **skillCrit +5%** (physical skills crit only with skillCrit since the crit rework)
- Web (ids kept, mechanics replace flat stats):
  - 🔪 `rg_k1` มีดคมปักลึก (knife dmg + crit on pickup hits) · `rg_k2` มีดชิ่งสังหาร (bounce off Mark ≥2 / kill, 71–95%) · `rg_k3` มีดอาบสถานะ (Wound / Exposed / poison chance) · `rg_k4`★ ห่ามีดวนลูป (+1 knife, pickup cuts S2/S3 CD, free knife on a Mark-free field)
  - ⚡ `rg_c1` จังหวะเร่ง (combo + Tempo speed stacks) · `rg_c2` แทงรัวซ้ำแผล (combo dmg + per debuff kind) · `rg_c3` เงาพริ้วสลับร่าง (combo FLEE + sure dodge every 3 combo hits, ICD 2) · `rg_c4`★ คอมโบไม่จบ (Combo Count +1 + 👥 Living Shadow Back Stab 45% after 3+ hits)
  - 🎯 `rg_x1` จุดตายเป้าอ่อน (crit/skillCrit vs HP ≥70% / <35% / Exposed) · `rg_x2` ใจสลาย (crit dmg vs debuffed) · `rg_x3` ดูดเลือดจากคมคริ (crit / pickup heal + Energy, cap 12/turn) · `rg_x4`★ คริเป็นมีด (crit knives 1.2x)
- 30 new `KIT2.rogue` keys with Thai admin labels (kit2 table) · pure helpers `rogueKnifeMul` / `rogueSteelMul` / `rogueStabAmp` / `rogueComboDebuff` / `rogueAmbushCrit`
- Save: `THIEF_REWORK_VER` 2 -> 3 · Rogue ใยชั้น 2 web reset + refund once (class 1 web, Thief + Rogue talents untouched) · Mobster untouched · `tools/bot.cjs` flag 3
- Tests: `tests/rogue-p3a.test.ts` (+ thief-p2a / p2b migration tests updated) · Not balanced: needs Q's playtest

## ✨ feat(thief): P2'c Ult budget in 2 states (ร่างเงา on / off) + Ult KIT keys
- Plan: `design/p2/MAIN-VS-REV4.md` §4 P2'c + §5.2 · owner Q2: ceiling = today's live เงาพริ้ว **including ร่างเงา** (no nerf to live)
- Pure math in `skill-math.ts` (BattleScene + test share it): `thiefUltHitCount` · `thiefUltCritRate` (Ult-only skillCrit counts as skillCrit, crit rework rules) · `thiefUltCondCritDmg` (B3 Ult-own, cap `thiefUltCondCap`) · `thiefOnHitEff` · `thiefUltFinisher` · `thiefUltBudget(st, hero, shadow)` in stab units (gauge on = every stab a full crit)
- 8 new `KIT` keys with Thai admin labels (Ult table) · 10 new `Stats` keys (0 = no change yet: nodes come in later P2'c commits)
- Tests: `tests/thief-p2c.test.ts` (model = live without P2'c stats, both states)

## ✨ feat(thief): P2'c Global Ult CD cap
- `cutUltCd()` is now capped: all Thief-line Ult CD cuts (th_t2a ขโมยจังหวะ, Rogue Kill Reset, later thief_b3) share `KIT.thiefUltCdCutCap` 2 turns per hero turn · in the cast turn the CD never drops below `KIT.thiefUltCdFloor` 2 (no back-to-back Ults)
- th_t2a: a capped-out / zero cut no longer spends its ICD
- Not routed (other classes / Mobster rule): relics, Archer kill CD, Mage Foresight, Mobster ทวงหนี้ refund
- Pure `ultCdCut()` + test in `tests/thief-p2c.test.ts`

## ✨ feat(thief): P2'c B3 crit-dmg bracket · drop hardcoded thExecute x1.5
- R4.6 B3 in `strike()`: one `condCritDmg(m)` sum (Shroud ★ `smokeCritDmg` + Rogue rg_x2 ใจสลาย + Ult-own `thiefUltCondCritDmg` + thief_u3 on basic / combo) added to critMul, cap `KIT.thiefCondCritDmgCap` 0.75 (new key, Thai label)
- Removed the `thExecute` x1.5 line (no source since P2'a); `Stats.thExecute` stays as a retired key
- หมายหัว release stays x mul = B4 (MAIN-VS-REV4 §2 C2) · comment only
- Today nothing changes in play: Shroud ★ 0.25 + ใจสลาย 0.36 = 0.61 < 0.75 (Ult-own terms come with thief_u)

## ✨ feat(thief): P2'c thief_b = 👤 เกจเงา modifiers (Q1: one gauge) · save v5
- Owner Q1: Rev 3 Ghost Shroud merges into main's เกจเงา — no second shadow resource; the `thief_b` line now tunes the gauge:
  - 🌫️ `thief_b1` ย่องเบาในเงา: a dodge has 20–100% chance of gauge +1 more · Flee +4–18 while ร่างเงา
  - 🌙 `thief_b2` หายใจในเงา: dodge heal 1.2–6% (kept) · entering ร่างเงา = shadow shield 6–30% of Flee (max `thiefShadowShieldHpCap` 20% HP)
  - 🌀 `thief_b3` เงาวนลูป (id back, was มีดคู่): a dodge inside ร่างเงา has 20–100% chance of Ult CD −1 (Global Ult CD cap)
  - 👤 `thief_b4` ★ เงาสวน: counter 0.8x (kept) · ร่างเงา +1 hero turn
- All three dodge paths (hurt, duelist true damage, LUCKY) use one `shadowDodged()`
- Save: `THIEF_REWORK_VER` 3 -> **5** (4 is left for Rogue P3'b) · same minimal Thief class 1 web + talents reset & refund once (`v < 5`), Rogue job2 web / talents untouched · rogue-p3a / thief-p2a tests follow the new version

## ✨ feat(thief): P2'c thief_u line (Ult crit · On-Hit · finisher) + new เงาพริ้ว dance
- New Ult branch `thief_u` เงาสังหาร (`ATTACH thief_u: 'ult'`, 2nd Ult column):
  - 🎯 `thief_u1` เงาจุดตาย: Ult skillCrit +1–5% (opens Ult crits with no gear skillCrit) · Ult crit dmg +1–5% per debuff kind (max 3)
  - 🩸 `thief_u2` เงาประสานอาวุธ: On-Hit 40–50% = Ult stabs lifesteal x share · same chance Wound +1 (แผลลึก)
  - 💀 `thief_u3` เพชฌฆาตเงา: crit dmg +3–15% vs HP < 35% (Ult + basic / combo, B3) · Energy +1–6 per Ult crit (max 12 / cast)
  - 🗡️ `thief_u4` ★ เงาพันคม: 3+ Ult crits = closing stab 0.2x (sure crit) at the lowest-HP share — always fires inside ร่างเงา
- Ult-own crit dmg total capped at `thiefUltCondCap` 0.15, then the B3 cap · every stab (finisher too) x Ratio AGI
- `shadowDance()` (Rogue พายุมีด too) reads the shared pure math; Ult info panel lists the new rows
- 1 new `KIT` key `thiefUltCritResCap` · `thUltCritRes` in `INT_FIELDS`
- Budget test: u full ≤ live ceiling for every hero profile, gauge on and off (`th_t3b` re-cut comes with the talents commit)

## ✨ feat(thief): P2'c talents rows 1 / 3 + rename th_t4c
- Row 1 (ids kept, reset by save v5):
  - 🐈 `th_t1a` ก้าวเงา: every wave starts with เกจเงา +1 | +2 · after a dodge Flee +12 | +20 for `thiefDodgeFleeTurns` 2 hero turns (refresh)
  - 💨 `th_t1b` เปิดฉากซุ่มโจมตี (was ควันตั้งต้น): wave-start sure dodges 1 | 2 (kept) · first physical hit of each wave = sure crit · R2 + `thiefOpenCritDmg` 25% crit dmg (B3)
- Row 3 = the 3 Ult styles (numbers cut for the Ult budget, see `design/p2/NOTES.md` P2'c table):
  - 💀 `th_t3a` เงาสังหาร: Ult skillCrit +5 | +8% · crit dmg +10 | +15% vs HP < 50% or 2+ kinds (Ult cap) · closing stab 0.35 | 0.5x · sure dodges −1
  - 🌪️ `th_t3b` คมมีดประสาน (was มีดรัว +2 | +3): stabs +1 | +2 · On-Hit +3 | +5% (alone 41 | 43%)
  - 🌫️ `th_t3c` เงาหมอกลวงตา: sure dodges +1 | +2 (was th_t3a) · poison +2 | +3 per stab (was th_t3c) · เกจเงา +1 per cast
- 🌑 `th_t4c` ร่างเงา -> **หมอกลวงตา** (name clashed with the gauge state; effect unchanged)
- `thiefFinisherMul` 0.25 -> 0.2 (max stack + card ultHits was 0.3% over the ceiling)
- 2 new `KIT` keys with Thai labels · budget table test (Lv 20 / 40 / 80 + Rogue, gauge off / on, every profile, + card ultHits)

## 📝 docs(thief): P2'c sync tools + docs
- `tools/bot.cjs`: bot saves carry `thiefRogueRework: 5` (else `load()` wipes the bot's Thief web) · TREEX example with `thief_u1` · not run
- `design/p2/NOTES.md` `## P2'c`: Ult budget table (Lv 20 / 40 / 80 + Rogue, ร่างเงา off / on) + plan-vs-code notes
- `design/thief-rogue-rework-v1.md`: R4.4 row P2'c + R4.9 (what shipped vs Rev 3 / P2c-spec)

## Monster skills no longer crit by default + ดาบมรณะ nerf (Q 2026-11-19)
- `CRIT_RULES.monSkill = false`: a monster skill hit (strike / bolt, hero-kit casts) only rolls crit when the skill sets `crit: true`. Basic attack / combo / counter / Bullet Time still roll the monster's crit. Same idea as the hero rule (#132).
- Death knight ⚔️ ดาบมรณะ: pow 2.8 -> 2.2, alone x2 -> x1.5. At D3 boss Lv 13 it was 192 dmg (6x its basic hit, 308 on a crit) and one-shot 75% HP of a Lv 11 hero; now ~113 and no crit.
- Every other D1-D5 boss / mini top skill sits at 1.5-2.5x its basic hit, left as is.
- Hero magic skills now need skillCrit too (Q picked "Need skillCrit too"): no skillCrit = the skill never crits; spellCrit / ice / charge bonuses add on top once skillCrit > 0. Procs, Auto Spell and magic basics still roll spellCrit as before. Mage skillCrit comes from crit gear / cards / talents (converted), Sage also from DEX; Mage LUK only gives spellCrit.

## 🌘 Moonshadow Thief off-hand (Q 2026-11-19)
- New D3 forge item `c_moondirk` มีดปัดเงาจันทร์ (off-hand dagger, Thief only): AGI +3, Flee +6, Combo +5% · bonus ★3 dodgeHeal +2% / ★5 Combo +4% · recipe D3 12 common + 3 boss + 900z (same as other D3 pieces)
- Joins ชุดเงาจันทร์ (Moonshadow) `memberIds`; set tiers unchanged. Same off-hand slot as โล่ / กระบอกธนู, so no stacking
- Tests: `tests/moonshadow-dirk.test.ts`
- `c_rustfang` มีดสนิมเงา (D3 Thief weapon) poison -> crit line: poison +1 removed, **skillCrit +6%** · ★5 bonus poisonAmp +15% -> skillCrit +4% / critMul +10%
- `c_rustfang` มีดสนิมเงา joins ชุดเงาจันทร์ memberIds (weapon slot, stacks with the off-hand)

## Mage LUK -> skillCrit + DEX chant-break nerf (Q 2026-11-19)
- Mage LUK now also gives **skillCrit +1% per 10 LUK (cap 15%)** on top of spellCrit +1%/6 LUK (`PER_POINT.off.mageLukSkillCrit` / `mageLukSkillCritCap`), so a LUK Mage's skills can crit under the skillCrit-only rule.
- Chant break: `MAGE_CAST.breakDex` 0.012 -> 0.005. Break chance = 25% − 0.5%/DEX − tenacity: DEX 21 used to reach 0%, now DEX 50 does (DEX 10 = 20%, 30 = 10%).

## ✨ feat(thief): P2'd statEff + matkToPmRatio + thief_v1 แทงฉาบอาคม
- Added `statEff(b, k)` single stat-point door in `hero-stats.ts`, `matkToPmRatio(st)` in `skill-math.ts`, and 7 new P2'd `Stats` keys initialized to `0` in `PLAYER`
- Added branch `thief_v` เล่นแร่พิษ (`ATTACH thief_v: 's1'`) and `thief_v1` แทงฉาบอาคม: adds a magic hit scaled on M.ATK to แทงพิษ and basic attacks (`KIT.thiefVenomBasicShare` 0.58, registered across all 4 admin/layout files) + `autoInfo` row
- Tests: `tests/thief-p2d.test.ts`

## ✨ feat(thief): P2'd thief_v2 ระเบิดสารพิษ (Contaminate)
- Added `src/data/thief-offmeta.ts` pure helpers (`canDetonate`, `detonateStacks`, `detonateDmg`) and `thief_v2` ระเบิดสารพิษ (tier 2, unique name)
- Triggers once per hero turn on Basic / แทงพิษ when target poison ≥ 50% of `poisonMax()` (`thiefDetAtShare`), consuming 40% (min 3) stacks AFTER `damageMon(..., dot=false)` so B1 + B5 amps still see full stacks, plus 50% splash to other alive monsters (no separate M.ATK terms: M.ATK already scales `poisonDmg` via `KIT.poison.matkPer`)
- 7 new `KIT` keys registered across all 4 admin/layout files

## ✨ feat(thief): P2'd thief_v3 เลือดพิษ (INT leech + cap) + thief_v4 ★ นักเล่นแร่พิษ
- Added `thief_v3` เลือดพิษ (tier 3): INT scales poison leech rate in `heroBuild` (plus gear `poisonLeech`, max `thiefLeechCap` 60%), heals from net HP lost by monsters on poison ticks and Contaminate, capped at `thiefLeechTurnCap` 25% Max HP per hero turn
- Added `thief_v4` ★ นักเล่นแร่พิษ (tier 4, no Alchemy Blade): Contaminate can crit (`skillCrit + spellCrit`, capped at `CRIT_RULES.cap.skillCrit`), gets 100% of เลือดพิษ rate, and refunds `thiefDetBossRefund` 25% of consumed stacks onto bosses/mini-bosses
- 5 new `KIT` keys registered across all 4 admin/layout files

## ✨ feat(thief): P2'd th_t4b วิถีพิษคริ (Perfect Agony B5, flat-only) + save v6
- Reworked `th_t4b` นักฆ่า -> วิถีพิษคริ (ranks 1/2 = 0.5/0.8 conversion of `critMul` above `thiefAgonyFrom` 1.4, capped at `thiefAgonyCap` 1.0 shared with `vsPoison` on Contaminate; non-crit physical hits −15% `thiefAgonyHitCut`)
- Flat-only tick rule (`MAIN-VS-REV4.md` §5.1 #4): Perfect Agony multiplies ONLY flat poison (`m.poison × m.poisonDmg × bleedScale`) on poison ticks, NEVER `%HP bite` or Wolf `%HP bleed`; skips crits (Contaminate ★) and Mobster `ทวงหนี้` (`debtBursting`); `srcMul` skips `vsPoison` when `src === 'poison'` so Contaminate applies `vsPoison` once inside B5
- Bumped `THIEF_REWORK_VER` 5 -> 6 (`migrateThiefRogueRework` resets Thief class 1 web + talents once for saves < 6; Rogue job2 web + talents untouched)
- 3 new `KIT` keys registered across all 4 admin/layout files

## ✨ feat(thief): P2'd WIS Shadow Ward + LUK Gambler's Edge + sync tools & docs
- Added WIS Shadow Ward (`thiefWardPer` 0.003/WIS above start, max `thiefWardCap` 15%): reduces magic, `monHit >= 999`, and `trueSight` hits in `hurtHeroCore` (`job.id === 'thief'`, incl. Rogue & Mobster under Way A; dropped WIS poison cap/Venom Melt per `MAIN-VS-REV4.md`)
- Added LUK Gambler's Edge (`thiefLuckyRes` +6 Energy on `LUCKY!` dodge, 1/hero turn `luckyIcd`): wired on BOTH `hurtHeroCore` `dodged()` and `trueHurt()` `LUCKY!` paths
- Updated `statInfo.ts` (Thief WIS/LUK status lines), `tools/bot.cjs` (`thiefRogueRework: 6` + `thief_v` TREEX example), `design/p2/NOTES.md` (`## P2'd`), `design/thief-rogue-rework-v1.md` (`R4.4` + `R4.10`)
- Added full 19-key admin/registry sweep + Shadow Ward / Gambler's Edge tests in `tests/thief-p2d.test.ts`

## ✨ feat(hell): 😈 Hell mode on D1-D5 (v129)
- `hellOpen` opens on every level dungeon (D1-D5 too) after a 🔥 hard clear of that dungeon; `dungeonRun` keeps `hell` when `dg.level` (was `deepDungeon`)
- Same mechanics as D6+: hard +50% stat points + escalation + corruption, every monster a Hell copy (Lv +10, one hell trait), hell MVP 🔴, hell death EXP loss
- Normal hell drop rates: reward x1.5, mats x2 (was 1.5, Q 2026-11-19; x3 of a normal run), unique 20%, MVP / mini card x2 (`HELL_MODE`); no ผลึกโลกันตร์ on D1-D5 (Hub text hides it)
- New `HELL_MODE.overLvXp` 0.01: a hero above `hellLvCap` (top room Lv + `HELL_MODE.lv`, D1-D5 only via `overLvTierMax` 5) banks 1% of the run's account Base + Job EXP; zeny / loot unchanged; shown in the Hub confirm and the result screen
