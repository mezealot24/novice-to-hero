import { PACKS } from './dungeons'
import type { MonsterKind } from './monsters'

/** Stat spec v1: hit chance = clamp(0.80 + (Hit - Flee) * 1%, 80%, 98%), both sides. */
/** Thief Double Strike: Lv 1 20% ... Lv 5 60% (Q: Lv 5 = RO Lv 10). */
export const doubleAtkChance = (lv: number) => (lv <= 0 ? 0 : 0.1 + 0.1 * Math.min(5, lv))
export const hitChance = (hit: number, flee: number, floor = 0.8) => Math.min(0.98, Math.max(floor, 0.8 + (hit - flee) * 0.01))
/** Stat spec v1: damage after DEF = dmg * 100 / (100 + DEF). Never subtract flat. */
export const afterDef = (dmg: number, def: number) => dmg * 100 / (100 + Math.max(0, def))

// ===== Turn-based side-scroll battle (BattleScene) =====
// Turn order: everyone fills a gauge by `speed` per tick; at 100 they act. Faster = more turns.
/** Hero combo, Capybara Go style (Q 2026-11-04 18:24 "เต็มสูตร + Combo DR"):
 * - each basic attack chains baseCount + st.comboCount extra hits; each needs a roll at (combo rate - target's Ignore Combo), stop on a miss
 * - combo rate has no 50% cap any more: it may pass 100% (rateCap) so it still lands vs high Ignore Combo
 * - hit damage: x max(dmgFloor, 1 + basicDmg (+ comboDmg on combo hits) - basicDR (- comboDR on combo hits))
 * Monster defence by tier (+hardAdd in hard mode / tower). Monster combos on the hero keep BATTLE.comboMax. */
export const COMBO = {
  baseCount: 1,
  rateCap: 1.5,
  dmgFloor: 0.2,
  ignore: { normal: 0, mini: 0.15, boss: 0.25 },
  basicDR: { normal: 0, mini: 0.05, boss: 0.1 },
  comboDR: { normal: 0, mini: 0.1, boss: 0.15 },
  hardAdd: 0.1, // Ignore Combo / Counter and Combo / Counter DR extra in hard mode / tower
  // Counter, same model (Q 2026-11-04 18:26): rate may pass 100% vs Ignore Counter; dmg x max(dmgFloor, 1 + basicDmg + counterDmg - basicDR - counterDR)
  ignoreCounter: { normal: 0, mini: 0.15, boss: 0.25 },
  counterDR: { normal: 0, mini: 0.1, boss: 0.15 },
  // hero side: stat x/(x+defK) (AGI Ignore Combo, DEX Ignore Counter, VIT Combo+Counter DR, LUK Crit DR) + gear; caps
  defK: 400, defCap: 0.3, critDRCap: 0.5,
}

/** Diminishing returns above soft cap: smoothly scales up to hard cap using x/(x+K). */
export const RESIST_RULES = {
  softCap: 0.70,
  hardCap: 0.85,
  k: 0.15,
}
export const softCapDiminish = (v: number, soft = RESIST_RULES.softCap, hard = RESIST_RULES.hardCap, k = RESIST_RULES.k) => {
  if (v <= soft) return Math.max(0, v)
  const x = v - soft
  return Math.min(hard, soft + (hard - soft) * (x / (x + k)))
}
/** Expected extra hits per basic attack for a combo rate and chain length (rolls stop on the first miss). */
export const comboExtra = (rate: number, count: number) => { const p = Math.max(0, Math.min(1, rate)); let e = 0, q = 1; for (let i = 0; i < count; i++) { q *= p; e += q } return e }

export const BATTLE = {
  turnLimit: 20, // Q 2026-11-03: hero turns per wave fight; run out = the run is lost (stops pure-tank stalling)
  bossTurnLimit: 30, // boss fights (bot: damage builds 10-23 turns, pure tanks 36-43)
  heroSpeed: 10, // at base attack speed (PLAYER.aspd); AGI / speed perks scale it with aspd
  monSpeed: { jellop: 8, minijellop: 9, wolf: 13, king: 8, bat: 16, shroom: 7, boar: 9, shadowwolf: 14, alpha: 11,
    skeleton: 10, wisp: 14, gargoyle: 7, duelist: 15, hunter: 13, gunner: 14, drainer: 10, deathknight: 11,
    toad: 10, lizardshaman: 9, hornet: 17, turtleguard: 7, bloater: 8, spiderling: 15, venomqueen: 14, frostgiant: 9, hydra: 11,
    hellknight: 10, hexwitch: 11, imp: 17, necropriest: 9, wraith: 15, maiden: 11, shard: 14, mirage: 14, warlord: 12, lich: 11, dewsprite: 13, bonepriest: 9, mimic: 11, mimicking: 10, goldjellop: 12,
    mummy: 10, jackal: 14, sandscorp: 13, dunewraith: 13, scarab: 8, sunpriest: 10, sphinx: 12, jackallord: 14, pharaoh: 11 /* D6: fallback only, stat monsters use def.speed (AGI) */,
    ...Object.assign({}, ...PACKS.map((p) => p.monSpeed)) /* D7-D10 packs (v78) */ } as Record<MonsterKind, number>,
  monDmgMul: 0.55, // monster hit = def.dmg * this
  // v56 (Q: "มอนกากไป"): every spawned monster's HP / ATK / M.ATK and every turn limit, by dungeon tier 1..5
  monBuff: { hp: [1.05, 1.1, 1.18, 1.45, 1.45], dmg: [1.05, 1.1, 1.18, 1.36, 1.4], turns: [1, 1.04, 1.08, 1.16, 1.2] },
  cleave: 0.5, // hero's swing also hits the 2nd monster for this share
  regenPerTurn: 1.5, // regen stat (%/s in real-time) -> % of max HP per hero turn
  resPerTurn: 1, // resRegen multiplier per hero turn
  slamEvery: 3, // boss charges every Nth turn, slams on the next
  slamStun: 45, // gauge the hero loses when slammed (tenacity reduces it)
  stepMs: 520, // one action's animation at x1
  msPerTurn: 1500, // smashCd (ms) -> hero turns of cooldown
  comboMax: 2, // monsters: extra basic attacks a combo can chain (heroes use COMBO below)
  counterMul: 0.8, // a counter hit = basic attack x this
  reviveHp: 0.3, // Phoenix card: share of max HP the hero gets back
  // ----- Dungeon 3 mini bosses -----
  parryEvery: 5, // duelist Riposte (Q 2026-11-04): stance every Nth turn, immortal until her next turn
  parryMul: 1.4, // (legacy) riposte damage x the duelist's normal hit
  // Q 2026-11-04 Celeste kit (Monster DB comment): vital-point passive, Riposte, Grandado Espada
  duel: {
    vitalEvery: 3, vitalPct: 0.08, vitalLvMul: 0.03, // every 3rd turn: true dmg = 8% hero max HP + ATK x lv x 0.03 (lv = dungeon recLv)
    healTurns: 3, // vital / espada damage dealt is healed back over 3 of her turns
    ripostePct: 0.8, riposteCap: 0.15, // Riposte: each blocked hit answered with 80% of it as true dmg, at most 15% hero max HP per stance in total, never lethal
    espadaEvery: 10, espadaHits: 4, espadaMin: 0.03, espadaMax: 0.1, // phase 2: mark turn (immortal), then 4 crit thrusts of 3-10% hero max HP (Q asked 4-16%: bot died to it)
  },
  frenzyAt: 0.5, frenzySpeed: 1.4, frenzyLifesteal: 0.6, // hunter below 50% HP
  toxicSkin: { dr: 0.05, poison: 1, tenacity: 0.5, critCut: 0.5 }, // venomqueen (Q 2026-11-04): -5% P/M damage taken, 1 poison on the hero per landed hit, debuffs on it wear off 2x as fast, crit bonus vs it halved
  web: { agi: 0.5 },
  frozenHeart: 0.5, // hero attack speed x this while slowed
  iceSkin: { turns: 2, dmgCut: 0.15 }, // frostgiant (Q 2026-11-04): hitting it = ❄️ หนามน้ำแข็ง, hero damage -15% for 2 hero turns (refreshes) // พ่นใยมัดตัว: hero AGI x this while webbed
  vengeance: { share: 0.5, turns: 3, cd: 3, dotPct: 0.03, dotMatk: 0.3 }, // death knight (Q 2026-11-04): 50% of a hit it lands -> shield for 3 of its turns (then 3-turn cooldown); while it holds, hero takes 3% max HP + M.ATK x 0.3 magic each of its turns
  maiden: { at: 0.5, turns: 22, tint: 0xff9ad0 }, // drainer: under 50% HP she turns immortal and calls the Maiden (same max HP / M.ATK); +22 turns to the limit (bot timed out at +12)
  bulletTime: { at: 0.25, countdown: 3, hits: 25, bonusMin: 0.01, bonusMax: 0.25 }, // gunner (Q 2026-11-04): under 25% HP, 3-turn countdown, then 25 shots of her normal shot x (1 + 1-25%)
  scentAt: 0.5, scentSpeed: 1.75, scentCombo: 0.5, // hunter กลิ่นเลือด (Q 2026-11-04): hero below 50% HP -> turn speed +75%, combo +50%
  demonAt: 0.5, demonRegen: 0.02, // drainer below 50% HP: regen share of max HP per turn
  // ----- Dungeon 4-5: debuffs on the hero (HitFx) -----
  poisonPct: 0.01, poisonCap: 8, // per stack per hero turn, share of max HP (Lv-15 bot: 1.2%/cap 10 killed Thief in wave 1-2)
  burnPct: 0.03, burnHealCut: 0.4,
  weakenMul: 0.75, armorBreakMul: 0.5,
  monCritMul: 1.6, monComboMul: 0.7, monCounterMul: 0.8, // v49 monster crit / combo / counter
  shieldCap: 1, // hero shield (all jobs but Priest, who keeps CLERIC_KIT.shieldCap): max share of max HP; the closer to it, the less each new shield adds (stack-math shieldGain)
  reflectCap: 0.04, // reflect / thorns: one reflected hit deals at most this share of hero max HP, and can't knock the hero out
  soulBolts: 5, soulCap: 0.4, // Mirage Soul Strike: stored damage fires as N magic bolts, total capped at this share of hero max HP
}
