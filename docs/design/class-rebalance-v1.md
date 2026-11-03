# Class rebalance v1: gear and cards should carry D4-5 (2026-11-03)

Q's ask: Swordsman, Priest and Mage cleared dungeons 4-5 on their base kit. A build without crafted gear or cards
should struggle there; Forge gear (grade + refine) or cards are what make the class strong.
Also: stats a class's kit ignores should do something real for that class.

## Targets (bot, 8 runs)
| Profile | Target |
|---|---|
| D5 Lv20, dungeon-shop class gear, no cards (bot default) | 2-3 / 8 |
| D4 Lv15, same | 4-5 / 8 |
| D5 Lv20, crafted kit `CRAFTED=1 EXTRA=1` (d3 craft weapon + emerald mail + lich ring, grade 4, +5) | 6-8 / 8 |

Monsters were not touched, because Archer and Thief are still the weakest classes.

## Nerfs (free class power removed)
| Class | Before | After |
|---|---|---|
| ⚔️ Swordsman | class mod HP +40, DEF +6, ATK +3, counter 5% · ฟันพายุ 1.3x · ult 1.4x, shield 15% | counter 2% only · ฟันพายุ 1.15x · ult 1.2x, shield 10% |
| ✨ Priest | class mod HP +20, heal/shield amp +15%, M.ATK +4 · heal 22% · ult shield 35% + heal 15% · smite 2x | HP +10 · heal 12% · ult shield 15% + heal 8% · smite 1.4x (`CLERIC_KIT`) |
| 🔮 Mage | class mod M.ATK +10, HP +15 · ลูกไฟระเบิด 1.1x · ult barrier 2x | HP +10 · ลูกไฟระเบิด 0.9x · barrier 1.5x (`MAGE_SPELL`) |

## Off-stats (PER_POINT.off in meta.ts, heroStats)
| Class | Stat | Effect |
|---|---|---|
| 🔮 Mage | STR | new core node กายสู่เวท (`mage_core3`, 3 lv): 30/60/100% of STR above base also counts as INT (M.ATK + Max Mana) |
| 🔮 Mage | LUK | magic crit +1% per 6 LUK |
| ✨ Priest | DEX | light spear damage +1% per DEX (spearMul +0.003) |
| ⚔️ Swordsman | DEX | counter chance +0.2% per DEX |
| 🏹 Archer | STR | ศรทะลวง (ult) damage +1% per STR |
| 🗡️ Thief | INT | poison (done in the Thief skill-web thread) |

## Bot results (v39 base -> this change, D5 unless noted)
| Class | Before (shop gear) | After (shop gear) | After (crafted +5) |
|---|---|---|---|
| ⚔️ Swordsman | 4-6/8 (D4 6/8) | ~2-4/8 (D4 ~1-4/8) | 7-8/8 |
| ✨ Priest | 8/8 (D4 8/8) | 5/8 (D4 3/8) | 8/8 |
| 🔮 Mage | 6-8/8 (D4 7/8) | 2/8 (D4 7/8) | 8/8 |

Note: the Thief thread's lifesteal rule (basic attacks + combo only) lands separately and trims Swordsman lifesteal gear further.
