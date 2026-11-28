import Phaser from 'phaser'
import { HERO_SKILL_BOOK, heroSkillSteps, resolveHeroKit, type HeroKit } from '../data/hero-skill-book'
import { chooseHeroSkill, newKitState, spendKit, tickKit, type KitCtx, type KitState } from '../battle/hero-skill-engine'
import { afterDef, BATTLE, hasFx, COMBO, doubleAtkChance, COLORS, hitChance, DUNGEONS, FONT_NUM, HARD, HARD_PASSIVES, HARD_SKILLS, FONT_UI, H, MONSTERS, perkDesc, PLAYER, RULES, bankedRunXp, softCapDiminish, W, type BossPhase, type DungeonDef, type HitFx, type MonSkill, type MonsterDef, type MonsterKind, type Stats, LIFESTEAL_CAP } from '../data/game-data'
import { counterRate, shieldGain } from '../data/stack-math'
import { ELEM_SRC, FOCUS_RULES, GENERAL_PERKS, IMMORTAL_RULES, IMMORTALS, JOB_LINES, levelDelta, LINES, MAGE_SKIP, newPerkStats, nextZapTarget, PERKS_V2, OFFER_RULES, OUTSIDE_CAP, overflowShare, PROC_POW, PROC_RULES, type Effect, type ImmortalId, type Line, type OutsideKey, type PerkDef, type PerkStats, type Proc, type Src, type Trigger } from '../data/perks'
import { EVENT_RULES, FORTUNE, type DayOpts, type EventId } from '../data/events'
import { newFlags, runPostWaveEvent, type Curse, type EventHost, type Opt, type Panel, type RunFlags } from './battle-events'
import { blessBase, FREE_GEMS, heroBuild, heroStats, jobUpText, itemById, PER_POINT, RESOURCES, splitStatLine, totalBase, type BaseStat, type HeroBuildSummary } from '../data/meta'
import { COIN_FX, CRIT_RULES, FLEE_RULES, monHitChance, RESIST_RULES, coinTier, monCritRate, monSkillCritRate, splitZeny } from '../data/battle-rules'
import { COMBINE_FX, type ItemEffectId, type ItemEffectSpec } from '../data/item-effects'
import { createBiomeCombatState, HAZARD_TUNING, modifyHeroDirectHealBiome, onHeroShieldOrBlockBiome, onHeroSkillCastBiome, onMonsterHitBiome, onTurnEndBiome, type BiomeCombatState } from '../data/biome-hazards'
import { RIFT_BRANCHES, riftBoonById, type RiftBoonDef, type RiftBranchDef } from '../data/rift'
import { applyRiftBranchChoice } from '../battle/rift-engine'
import { maidenHpFloor, maidenSplit } from '../battle/maiden-link'
import { foldMutators, mutatorById } from '../data/mutators'
import { cardById, cardName, cardPityMax, cardRate, cardsOfMonster, EQUIP_CARDS } from '../data/cards'
import { CLERIC_KIT, JOBS, SPELL_VAMP, MAGE_SPELL, RES_RULES, SWORD_MANA, SWORD_S1, swordCoatFlat, swordExecMul, swordS1Lv, swordUltLv, swordS1Raw, swordWaveNow, swordAwakenUlt, type JobDef } from '../data/jobs'
import { JOB2, PET_IDS, type Job2Def, type PetId } from '../data/jobs2'
import { skill2Picked } from '../data/tree'
import { ALLIES, falconHitMul, fillAllies, frenzyMul, gadgetById, guardHit, hawkMul, hurtAlly, liveAllies, makeAlly, petPhysScale, readyAllies, reviveAllies, rollGadget, tauntTarget, tickAllies, TRAP_IDS, useAlly, type Ally, type AllyCtx, type GadgetId } from '../battle/allies'
import type { Skill2Def } from '../data/skill2'
import { canRollCrit, critPower, scaleCritMul, type CritSlot } from '../data/skill-registry'
import { hotkeySlot, mayCast, resourceIcon, skillButtonState, slotCenter, sweepAngles, tapAction, type SkillBtnIn, type SkillBtnOut, type SkillSlot } from '../battle/skill-hud'
import { BM_CRIT_COUNTER, BM_STANCE, KIT3, championVarMul, disarmWeak, divestMul, rogueStripCut, snatchShare, stalkerPreyAmp, stalkerResMul, preyMarkOf, preyTurnsOf, reactionOf, reactionMul, doubleCastReady, doubleCastMul, soulBurst, foresightCdCut, profLegacy, profOffMul, soulChangeShield, kingpinDebtAmp, kingpinTakeMul, stalkerMarkCap, wizCastTaken, type ProfReaction } from '../data/skill-math'
import { branchPts } from '../data/tree'
import { ultCdCut, condCritB3, thiefUltCondCritDmg, thiefUltCritAdd, thiefUltHitCount, thiefOnHitEff, thiefUltFinisher, thiefPoisonPerStack, poisonCapOf, poisonDefCut, slowAtLv, ablazeBlastDmg, asuraDamage, autoCost, swordS1ExcessPow, swordS1On, swordMultiHitDr, swordHelixNeed, swordCullThreshold, bellMdefMul, breakChance, breakRefundMana, breaksOn, castUsesTurn, clericBasic, clericUltLights, clericUltSmash, dawnBonus, dawnMul, dawnWisGain, gcPulses, glacialBarrierMax, glacialDue, glacialNovaMul, haymakerCalc, icdReady, physBase, hitBase, KIT, KIT2, MAGE_CAST, MAGE_DEF, MAGE_DEF_POWER_NONE, MAGE_PASSIVE, mageAutoMul, mageDefPower, type MageDefPower, magicPower, matkToPmRatio, moltenThornsMul, moltenWardGain, SAGE_S1, sageAutoChance, sageElementBenefit, sageFireChance, sageIceChance, sageLightChance, sageRodGain, staticCounterMul, staticDodgeCharges, staticShockChance, S2N, s2Cooldown, thiefBloodKingOn, thiefBossCritHeal, thiefCondLeechAdd, thiefKillHeal, thiefS1Woven, thiefStackCritAdd, debuffKinds, type DebuffFlags, poisonAt, takenAmp, ultCooldown, ultCost, rogueKnifeMul, rogueSteelMul, rogueStabAmp, rogueComboDebuff, rogueAmbushCrit } from '../data/skill-math'
import { agonyBonus, canDetonate, contaminateBossRefund, contaminateCritChance, contaminateLeechShare, detonateDmg, detonateStacks, gamblerLuckyRes, paApplies, poisonPowerBonus, poisonTickTotal, shadowWardApplies } from '../data/thief-offmeta'
import { applyDeathMarkState, applyMistDr, applyToxicOverheal, bloodFuryDmgMul, bloodFurySelfCost, counterDefBonusDmg, deathMarkEarlyPop, deathMarkEchoDmg, deathMarkNetHpDmg, flurryStabMul, luckyReprisalAction, mobsterFlurrySlashMul, physLeechMul, pickDeathMarkTarget, s3ShieldPierceOf, shieldCutMul, shouldRecordDeathMark, swordBreakTurnsOf, swordS1Cd, swordS3BreakTurns, swordTakenMul } from '../data/passive-battle'
import { addCard, addMat, addXp, loseXp, persist, save, trialWin, ultMode } from '../save'
import { activeJob3, JOB3 } from '../data/jobs3'
import { MAT_RULES, matName, matOf, taintDrop } from '../data/materials'
import { TAINT_MAT } from '../data/taint'
import { pinnedReady } from '../data/cardforge'
import { rollUniqueDrop, UNIQUE } from '../data/uniques'
import { rollEndgameUniqueDrop, rollUnique3Drop } from '../data/uniques3'
import { hellEff, MINI_POOL, MINI_RELICS, RELIC_RULES, RELICS, type RelicId } from '../data/relics'
import { sfx, unlock } from '../sfx'
import { addBreak, fangSoak, s4Shatter, s4StunKind, s4Target, s4Unlocked, spBreakMul } from '../data/skill4'
import { HARD_POWER, TOWER_POWER } from '../data/power'
import { escalate, escalationAt } from '../data/hard-escalation'
import { canPay, MON_MANA, newManaPool, payMana, regenMana, type ManaPool } from '../data/mon-mana'
import { MON_CAST, monBreakChance, monBreakGauge, monBreaksOn, monCastDmgMul, monCastPity, monSkillCasts } from '../data/mon-cast'
import { deepAnchor, deepKind, homeDungeon, homeLv, monTier, POW_DEFAULT, restatAt, topStats, roomLevel, scaleOf, skillAtLv, skillMul, slamScaleOf, statMonster, towerMonLv } from '../data/mon-stats'
import { ENDLESS_HELL, endlessHell, HELL, HELL_MODE, hellBossHp, hellify, hellLvCap, hellXpMul } from '../data/hell'
import { foldAffixes } from '../data/affixes'
import { PACKS } from '../data/dungeons'
import { DUNGEON_DAYS, echoPay } from '../data/dungeon-days'
import { buildRun, MODES, payTowerSkip, recordTowerCheckpoint, riftFloorLoot, towerFloorLoot, towerSkipGems, type ModeArgs, type RunConfig, type RunRoom } from '../data/modes'
import { button, fullscreenButton, go, toast, type Btn } from '../ui'
import { chipGrid, comboBannerSpec, floatLane, hazardHudBadge, HUD_THEME, stagePill, statusChips, turnHitsHudText, turnQueueSpeedText, type StatusChip } from '../battle/hud-layout'
import { fitWidth, openPauseMenu, type PauseExtra } from '../battle/pause-menu'
import { derivedRows, estimateHitsPerTurn } from '../data/stat-rows'
import { castLv, casterOf, formulaDamage, skillLvBonus } from '../data/mon-skill-scale'
import { CombatLog, deathText, recapLines, saveDeath, type DeathRec, type HitOut, type HitRec } from '../data/combat-log'
import { ftue, track } from '../analytics'
import { HeroRig } from '../battle/hero-rig'
import { fitHeroScale, heroCostumeTint, heroRigSpec, heroTex, type HeroRigSpec } from '../gfx/hero-visual'
import { ARCHER_PFX, BEAST_PFX, BERSERKER_PFX, CLERIC_PFX, COIN_DROP_IDS, COIN_DROP_REST, COIN_PFX, KNIGHT_PFX, MAGE_PFX, POISON_GREEN, RICOCHET_LEAF, SWORD_PFX, THIEF_PFX, ZAP_YELLOW, ZAP_YELLOW_SPARKS, playPfx, preloadPfx } from '../gfx/pixelfx'
import { THIEF_FX, backstabFx, daggerCrossFx, flyingKnife, knifeLandFx, knifeStormFx, shadowSlashFx, smokeBombFx, venomStabFx } from '../battle/thief-vfx'
import { pickChainTargets, playChainLightningFx } from '../battle/lightning-vfx'
import { RANGER_FX, arrowImpactFx, arrowProjectile, arrowRainFx, beastRoarFx, boarGuardFx, eagleEyeFx, huntMarkOn, petHitFx, type PetKind, pierceShotFx, snareTrapFx, stampedeFx, wolfRoarPalette } from '../battle/ranger-vfx'
import { awakenAuraFx, awakenBurstFx, blockShieldFx, brandishSweepFx, castBreakFx, ccGuardFx, chargeOpenerFx, cleanseFx, cleaveFx, comboSlashFx, crimsonWaveFx, executeMarkFx, guardianUltFx, helixSpinFx, ignorePainFx, pierceHitFx, rampageAuraFx, rampageBurstFx, sealCutFx, silenceSealFx, skill2AuraFx, spearBoomerangFx, spearWaveFx, spiralPierceFx, vengeanceBurstFx, windWaveFx } from '../battle/sword-vfx'
import { applyTankDr, isMonSkillTag } from '../data/tank-scale'

// Side-scroll, turn-based (Capybara Go-like): the hero walks right, meets a group, and everyone
// takes turns by speed (AGI). The player's job: the build (1-of-3 cards) and when to fire Smash.

const GROUND = 430 // feet line
const HERO_X = 220
const SLOT_X = [560, 660, 760, 850] // monster formation, front first
/** v86 skill-button view: one circle of the bottom-right cluster (redrawn only when its signature changes). */
interface SkillBtnView {
  slot: SkillSlot; r: number; sig: string
  c: Phaser.GameObjects.Container
  base: Phaser.GameObjects.Graphics; sweep: Phaser.GameObjects.Graphics; ring: Phaser.GameObjects.Graphics; bookRing: Phaser.GameObjects.Graphics
  spin?: Phaser.GameObjects.Graphics; flash: Phaser.GameObjects.Graphics
  icon: Phaser.GameObjects.Text; cd: Phaser.GameObjects.Text; cost: Phaser.GameObjects.Text; tag: Phaser.GameObjects.Text
}
const MIX_X = [530, 615, 730, 865] // tower mixed fight (floor 20+): 2 adds in front, bosses / minis behind
const FACES_RIGHT: MonsterKind[] = ['wolf', 'shadowwolf', 'boar', 'alpha', 'hunter'] // textures drawn facing right; flip to face the hero

interface Mon {
  kind: MonsterKind; def: MonsterDef; spr: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image
  hp: number; gauge: number; dead: boolean; slot: number; turns: number; charging: boolean; summoned: boolean
  burnStacks: number; burnStackTurns: number // Mage fire ult: stacking burn
  chill: number; frozen: boolean // Mage ice ult: chill = slowed turns left, frozen = skips its next turn
  burn: number; burnTurns: number; poison: number; poisonDmg: number; dotTxt?: Phaser.GameObjects.Text
  marked?: number // Cleric ★ judgement: turns of +15% damage taken
  parry: boolean // duelist Riposte stance: immortal until her next turn, every blocked hit is riposted
  riposteLeft?: number; bulletCd?: number; maiden?: Mon; maidenDone?: boolean; drainStats?: number; vengTurns?: number; vengCd?: number; bulletDone?: boolean; duelHeal?: number; duelHealTurns?: number; espadaNext?: number; espadaArmed?: boolean // duelist kit (Q 2026-11-04)
  ice: number; iceChance: number; iced: boolean // Ice Age: turns left, freeze chance this turn, attack is weakened this turn
  hell: number // Hellfire stacks (no cap)
  harvestMark: number // Soul Harvest: boss HP steps already counted
  mSilence?: number // ⚔️ ดาบสยบมนตร์: monster turns left with no skills / casts
  // ----- Dungeon 4-5: skills, phases (design/dungeon-4-5-brutal.md) -----
  shield: number // absorbs hero damage first
  atkUp: number; atkUpTurns: number // warcry: + damage share for its own next N turns
  phase: number // boss phases entered so far
  speedMul: number; dmgMul: number; affix?: string; reflect: number; absorb: number; stored: number; chargeEvery: number
  skills: MonSkill[]; onHit?: HitFx; slamFx?: HitFx
  mp?: ManaPool // boss mana (data/mon-mana.ts): every ai 'boss' without a hero kit
  heroKit?: HeroKit; kit?: KitState // v125 hero skills the monster casts (resolved: 'mirror' -> the player's kit)
  revived: boolean // came back once (necro): can't be raised again
  clone?: boolean; evaded?: number; trueTurns?: number // v56 trueSight: hero evades counted, then 🎯 its physical hits get FLEE_RULES.trueSightHit
  weakTurns: number; weakPct: number // hero Skill 2 ท้าทาย: hits weaker for its next N turns
  tauntTurns?: number // hero Skill 2 ท้าทาย: RO Provoke + counter amp + Helix x2 turns left
  tauntVuln?: number // hero Skill 2 ท้าทาย: bonus physical dmg taken while taunted
  armorBrk: number // Mobster ตัดเส้นเอ็น: turns of DEF -KIT2.mobster.armorBrk
  blind: number // Crusader Holy Cross: turns of Hit -KIT2.crusader.blindHit (Thief ม่านควัน Sightless Raid shares it)
  exposed: number; exposedPct: number // P2'b Thief ม่านควัน: monster turns of Exposed · its B1 damage-taken share (hits only, not dot)
  wound: number; woundTurns: number // P2'b Thief แผลลึก: Wound stacks · hero turns left (refreshed on every add)
  woundCut: number; woundCutTurns: number // P2'b Blade's End heal cut share · monster turns left (healCut() takes the max with burn / hellfire)
  bladeSpent?: boolean // P2'b Blade's End already went off on this monster this hero turn
  dagger: number; daggerTurns: number // P3'a Rogue 🔪 ตราคมมีด: Marks · monster turns left (refreshed on every add)
  stabMark: number; strip: number // P3'a Rogue Back Stab: Backstab Mark (B1 Taken, hits) · Strip Armor (P.DEF cut), monster turns left
  disarm?: number; disarmPct?: number; divestRes?: number; snatchCd?: number; breakImmune?: number // 🧤 Rogue rg_d สายปลด: ปลดอาวุธ (its next turn hits x(1 - pct)) · strip resistance (boss) · ฉกบัฟ / ตัดจังหวะ cooldowns, monster turns
  wet: number // Innovator ☁️ เมฆฝน: turns of +KIT2.innovator.wetAmp damage taken
  huntMark: number // v82 Archer หมายหัว: turns of +st.arMark damage taken (ticks with its turns)
  stunTurns?: number // Champion Tiger Knuckle extra stun turns left
  broken?: number // Q 2026-11-24 ⛓️ Break (Dota 2 style): hero turns left with its passives off (data/skill4.ts BREAK_OFF)
  spBreak?: number // Spiral Pierce: Knight physical damage amp turns left (hero turns)
  gore?: number; goreTurns?: number // Berserker คลื่นดาบ Gore bleed per monster turn · turns left
  permafrost?: number // Sage ❄️ Permafrost stacks (0..4, Sejuani E style)
  mark?: ProfMark | null; markTurns?: number; markLayers?: number // 🎓 Professor 🏷️ element mark (monster turns left · charges before it is used up)
  sunder?: number // void_sunder DEF/M.DEF shred share
  sunderTurns?: number // void_sunder turns left
  chargeHits?: number // multi_hit_break hits landed while charging
  castSteady?: boolean // Q 2026-11-20 monster cast: its last cast broke, so this / its next cast can't break (MON_CAST.steady)
  castRing?: Phaser.GameObjects.Ellipse // magic circle under the monster while it casts (charging)
  castSkill?: MonSkill // Q 2026-11-21: the strong magic skill being cast (picked + levelled at cast start), released next turn instead of the slam
  deathMark?: number; deathMarkDmg?: number // PoE Passive Death Mark: hero turns left · recorded non-DoT hero net HP dmg
  instanceId?: string // biome hazard target id
}
type Element = 'lightning' | 'fire' | 'ice' | 'arcane'
type ProfMark = 'fire' | 'lightning' | 'ice'
const PROF_ORDER: readonly ProfMark[] = ['fire', 'lightning', 'ice'] // 👊 Spell Fist rotation · Soul Burst igniter fallback
const isProfMark = (e: string | null | undefined): e is ProfMark => e === 'fire' || e === 'lightning' || e === 'ice'
const PROF_ICON: Record<ProfMark, string> = { fire: '🔥', lightning: '⚡', ice: '❄️' }
const FIELD_NAME: Record<ProfMark, string> = { fire: '🌋 Volcano', lightning: '🌪️ Violent Gale', ice: '🌊 Deluge' }
const REACTION_UI: Record<ProfReaction, { name: string; color: string; tint: number }> = {
  vaporize: { name: '♨️ Vaporize', color: '#ffb08a', tint: 0xffb08a },
  overload: { name: '💥 Overload', color: '#ffd36b', tint: 0xffd36b },
  superconduct: { name: '🧲 Superconduct', color: '#a8c8ff', tint: 0xa8c8ff },
}
/** v78 / v85 chant entry: `paid` = Mana spent (partly refunded on a break) · `safe` = the steady pity chant (can't break). */
type Cast = { kind: 'gust' | 'ult'; pow: number; hit: number; paid: number; safe?: boolean }
const ELEMENTS: Record<Element, { icon: string; name: string; sub: string }> = {
  lightning: { icon: '⚡', name: 'สายฟ้า', sub: 'เป้าเดียว ฟาด 6 ฮิต (0.3–1.2x ต่อฮิต) ฆ่าบอส' },
  fire: { icon: '🔥', name: 'ไฟ', sub: 'ดาเมจกลาง 2x + เผาซ้อน (ลดฮีลศัตรู)' },
  ice: { icon: '❄️', name: 'น้ำแข็ง', sub: 'ดาเมจ 1.6x + ช้าลง · โดนซ้ำแช่แข็ง' },
  arcane: { icon: '✨', name: 'เวทมนตร์', sub: 'ศรเวทและดาวตก ทะลวงเกราะเวท' },
}
type Actor = { hero: true } | { hero: false; m: Mon }
const MINI_HINT: Record<string, string> = {
  duelist: 'ทุก 3 เทิร์นแทงจุดตาย (ดาเมจจริง) · ตั้งท่า Riposte = อมตะ ตีเข้าไปโดนสวน 80% · อย่าใช้ท่าไม้ตายตอนนั้น · ต่ำกว่า 40% เปิดจุดตายแล้วพุ่งแทง 4 ครั้ง',
  hunter: 'ดูดเลือดทุกครั้งที่กัด + Blood Razor ตามเลือดที่เราเหลือ · เราเลือดต่ำกว่าครึ่ง มันเร็วขึ้น 75% คอมโบถี่ · ไฟตัดฮีลได้',
  gunner: 'HP ต่ำกว่า 25% นับถอยหลัง 3 เทิร์นแล้วระดมยิง 25 นัด รีบปิดเกมหรือเปิดโล่ · ยิงรัว 3 นัด (Flee ช่วยหลบทีละนัด) · ร่ายจรวดยักษ์ = เตรียมกันด้วยท่าไม้ตาย · ครึ่งเลือดยิงติดไฟ',
  drainer: 'HP ต่ำกว่าครึ่งเรียกเมเดน (อมตะจนกว่าเมเดนจะตาย · เมเดนหลบ 50% ทุกครั้ง · เผาทุกเทิร์น) · เวทดูดชีวิต · ต่ำกว่าครึ่งฟื้น HP ทุกเทิร์น · ท่าร่ายดูดเลือดเต็ม · ทุก 4 เทิร์นปิดปาก 1 เทิร์น',
  venomqueen: 'ผิวพิษ: ตีโดน = ติดพิษ, คริเบา · พ่นใยมัดตัว = หลบไม่ได้ + AGI ครึ่ง 2 เทิร์น · เหล็กในทุก 2 เทิร์น · Venom Strike = พิษทวีคูณ 4 เทิร์น · ครึ่งเลือดฟักลูก',
  frostgiant: 'P.DEF สูงมาก (คริ/เวททะลุ) · ตีโดนเรา = หนามน้ำแข็ง DMG -15% · Frozen Heart ATK Speed -50% · ร่ายทุบแล้วแข็ง · 40% ได้เกราะน้ำแข็ง',
  mirage: 'เก็บดาเมจที่โดน 30% (🔮) แล้วร่ายยิงคืนเป็นโซลสไตรค์ 5 ลูก · เตรียมโล่/หลบตอนร่าย · ตีทีเราอ่อนแรง · ครึ่งเลือดเก็บ 40% + เศษกระจก',
  warlord: 'ทุก 3 เทิร์นคลั่งเลือดแรงขึ้นสะสม! ต้องจบไว · ดูดเลือด · ต่ำกว่า 30% เร็วมาก',
  sphinx: 'สายเวท มี M.DEF สูง (สายกายภาพได้เปรียบ) · ลำแสง 3 ลูกทุก 3 เทิร์น · ร่ายปริศนา = ใบ้ + อ่อนแรง · ครึ่งเลือดได้โล่และแรงขึ้น',
  jackallord: 'AGI สูง หลบเก่ง ตีรัว + สวนกลับ · หลบได้ 2 ครั้งแล้วตาเหยี่ยวโดนแน่ · ครึ่งเลือดเรียกหมาไน 2 ตัว',
  ...Object.assign({}, ...PACKS.map((p) => p.miniHints)), // D7-D10 (v78, data/dungeons/dN.ts)
}
const FX_ICON: Record<keyof HitFx, string> = { poison: '☠️', burn: '🔥', weaken: '💔', armorBreak: '🛡️💥', silence: '🤐', freeze: '❄️', web: '🕸️', slow: '💙' }

export class BattleScene extends Phaser.Scene {
  // hero
  private st!: Stats
  private hp = 0
  private smashCdLeft = 0 // hero turns until Smash is ready (Novice: cooldown, no resource)
  private heroGauge = 0
  private heroRig!: HeroRig
  private rigSpec: HeroRigSpec = heroRigSpec({ job: 'novice' })
  private get heroSpr(): Phaser.GameObjects.Container { return this.heroRig.root }
  private perks: { def: PerkDef; lv: number }[] = [] // พร v2 cards this run (lv 2 = "+")
  private hits = 0
  // run
  private mons: Mon[] = []
  private room = 0
  private level = 1
  private xp = 0
  private zeny = 0
  private kills = 0
  private runXp = 0
  private runGems = 0
  private runCards: string[] = [] // equipment cards found this run (kept win or lose)
  private runMats: Record<string, number> = {} // forge materials found this run (kept win or lose)
  private runUniques: string[] = [] // v88 unique items dropped by the final boss this run (added to the bag in settle)
  private runDupeMats: Record<string, number> = {} // v88 boss mats paid for a duplicate unique (never zeny; added after the hard-mode scaling)
  private cardLuck = 1 // LUK bonus on card drops (same curve as rare drops)
  private settled = false
  private over = false
  private paused = false
  private smashQueued = false
  private runId = 0
  private startedAt = 0
  // view
  private far!: Phaser.GameObjects.TileSprite
  private mid!: Phaser.GameObjects.TileSprite
  private ground!: Phaser.GameObjects.TileSprite
  private hud!: Phaser.GameObjects.Graphics
  private hudTxt!: Record<'hp' | 'res' | 'lv' | 'zeny' | 'room' | 'affix' | 'hazard' | 'qSpeed' | 'hitsHud', Phaser.GameObjects.Text>
  // v112 modern HUD: hero portrait, HP drain ghost, status chips (hud-layout.ts), cached stage / affix strings, float-text lanes
  private portrait?: Phaser.GameObjects.Image
  private coinImg?: Phaser.GameObjects.Image
  private hpGhost = 1
  private stageTxt = ''
  private affixTxt = ''
  private hazardSig = ''
  private qSpeedTxt = ''
  private hitsHudTxt = ''
  private turnHitsCur = 0
  private turnDmgCur = 0
  private turnHitsLast = 0
  private turnHitsTotal = 0
  private turnHitsPeak = 0
  private inHeroTurn = false
  private comboBanner?: {
    c: Phaser.GameObjects.Container
    rank: Phaser.GameObjects.Text
    hits: Phaser.GameObjects.Text
    dmg: Phaser.GameObjects.Text
    fadeEv?: Phaser.Time.TimerEvent
  }
  private build!: HeroBuildSummary
  private fxCd: Partial<Record<ItemEffectId, number>> = {}
  private spellbladeReady = false
  private guardianUsed = false
  private echoLock = false
  private biomeState: BiomeCombatState | null = null
  private biomeCritAdd = 0
  private biomeSkillMul = 1
  private monSeq = 0
  private chipViews: { c: Phaser.GameObjects.Container; g: Phaser.GameObjects.Graphics; icon: Phaser.GameObjects.Text; n: Phaser.GameObjects.Text }[] = []
  private chipNames: string[] = []
  private chipSig = ''
  private chipTip?: Phaser.GameObjects.Text
  private floatRecent: { x: number; y: number; t: number }[] = []
  private pauseOpen = false
  private queueIcons: Phaser.GameObjects.Image[] = []
  private smashBtn!: Btn
  private autoBtn?: Btn
  private speedBtn!: Btn
  private overlay?: Phaser.GameObjects.Container
  private fast = false

  constructor() { super('battle') }

  private dg: DungeonDef = DUNGEONS[0]
  /** Hard mode (v47): replay of a cleared dungeon, monsters scale with Base Lv (data/game-data.ts HARD). gap = levels above the dungeon's recLv. */
  hard = false
  hellOverLv = false // v129 😈 D1-D5: hero Lv above hellLvCap, account EXP x HELL_MODE.overLvXp
  hell = false // 😈 hell mode (v129: D1+): a hard run where every monster is a Hell copy (data/hell.ts HELL_MODE)
  /** v59: hard-mode monster multiplier from Hero Power (HUD shows it), normal-dungeon drop share when over-geared. */
  hardK = { hp: 1, atk: 1 }
  /** v59 tower: affixes live on the current floor (folded), monsters enraged this fight (bots read enrageCount). */
  private aff = foldAffixes([])
  enrageCount = 0
  /** Bot / test hook: the open choice (event or card) picks option i. */
  pendingPick?: (i: number) => void
  /** Bot / debug: what the open level-up offer holds (PICK=smart in tools/bot.cjs). */
  pendingOffers?: { id: string; legend: boolean; up: boolean; own: boolean; general: boolean }[]
  eventLog: string[] = []
  /** Playtest counters (bots read these). */
  counterCount = 0
  /** Hero turns used in the current fight, and the fight's limit (Q: no endless tank stalling). */
  fightTurns = 0
  turnLimit = 20
  timedOut = false
  turnsLog: number[] = [] // hero turns per fight this run (bots read it)
  peakTurns = 0 // most hero turns any fight in this run took (bots read it)
  comboCount = 0
  /** Mage: ultimate element, picked at the start of each run. */
  element: Element = 'fire'
  /** Mage: the element picked at run start; the card pool follows it (the วงล้อธาตุ talent only rotates the ult). */
  runElement: Element | null = null
  revivedCount = 0
  /** Dungeon 3: top-tier skill won from the mini boss this run, and which mini boss was drawn. */
  relic: RelicId | null = null
  miniKind: MonsterKind | null = null
  miniWon = false
  testRelic?: RelicId
  testEvent?: EventId // bot hook: every post-wave event is this one
  minHpPct = 1 // playtest: lowest HP share this run
  parryCount = 0
  freezeCount = 0
  private enemyAttacks = 0
  private harvest = 0
  /** Dungeon 4-5 debuffs on the hero (counts are hero turns, poison = stacks). */
  hx = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0, web: 0, slow: 0, thorn: 0, venom: 0, venomTurns: 0 }
  debuffCount = 0 // playtest: debuffs that landed this run
  resistCount = 0
  private roomStart = 0
  /** Event v2 (scenes/battle-events.ts): per-run flags, the HP an event fight can't push the hero below, 777 crit wave */
  flags: RunFlags = newFlags()
  private hpFloor = 0
  private starsOn = false
  /** Berserker ★ ไม่รู้สึกเจ็บ: เทิร์นที่เหลือใน Ignore Pain (3→0) · 0 = ไม่ active */
  private ignorePainTurns = 0
  /** Berserker ★ ไม่รู้สึกเจ็บ: damage สะสมระหว่าง Ignore Pain → ใช้คำนวณ Regen Dmg */
  private ignorePainDmg = 0
  private ignorePainUsed = false
  private ignorePainRegenTurns = 0
  private ignorePainRegenPerTurn = 0
  /** Warlord Ult Undying Bloodlust: HP >= 1 floor turns (separate from Berserker Ignore Pain so both work independently) */
  private wlUndyingTurns = 0
  private sayN = 0
  private fortuneTxt?: Phaser.GameObjects.Text

  /** Game mode of this run (data/modes.ts, design/game-modes-v1.md): rooms, scaling, mutators, HUD text. */
  run!: RunConfig
  private modeArgs: ModeArgs = {}
  /** Endless Tower: floors cleared this run, the floor bank (kept in full on leaving, half on falling), bot hook: auto-climb to this floor then leave. */
  towerFloor = 0
  private bank: { zeny: number; mats: Record<string, number> } = { zeny: 0, mats: {} }
  private leftTower = false
  autoTower?: number
  /** v87 tower floor skip: level / relic the hero starts with after paying for a skip (null = normal start). */
  private skipCatch: { lv: number; relic: boolean; est: boolean } | null = null
  private skipNote = ''
  private sky?: Phaser.GameObjects.Graphics

  init(data?: ModeArgs) {
    this.modeArgs = { ...(data ?? {}) }
    this.run = buildRun(save(), this.modeArgs)
    this.dg = this.run.themeAt(0)
    this.hard = this.run.modeId === 'hard'
    this.hell = this.hard && !!this.run.hell
    this.mons = []; this.queueIcons = []; this.overlay = undefined; this.paused = false; this.over = false
    this.time.paused = false
  }

  create() {
    this.makeBackdrop()
    this.heroRig = new HeroRig(this, HERO_X, GROUND, this.rigSpec, 0xffffff)
    this.add.image(HERO_X, GROUND + 2, 'shadow').setScale(1, 1.2).setDepth(GROUND - 1)
    this.buildHud()
    this.cameras.main.fadeIn(200, 20, 23, 43)
    this.input.keyboard!.on('keydown-SPACE', () => this.queueSmash())
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.skillHotkey(e)) // v86: 1/2/3 book Skill 1-3, 4 books the ult (manual mode)
    this.input.keyboard!.on('keydown-ESC', () => this.showPause())
    ;(window as unknown as { __battle: BattleScene }).__battle = this
    this.startRun()
  }

  // ---------- backdrop ----------
  private makeBackdrop() {
    if (!this.textures.exists('bg_far')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false)
      g.fillStyle(0x3a4a7a).fillTriangle(0, 200, 160, 40, 320, 200).fillTriangle(220, 200, 420, 70, 640, 200)
      g.fillStyle(0x2f3d68).fillTriangle(480, 200, 640, 90, 800, 200)
      g.generateTexture('bg_far', 640, 200); g.clear()
      for (let i = 0; i < 8; i++) {
        const x = i * 60 + 20, h = 70 + ((i * 37) % 40)
        g.fillStyle(0x5a3a2a).fillRect(x + 12, 160 - 30, 8, 30)
        g.fillStyle(i % 2 ? 0x2f6a44 : 0x3a7a4e).fillCircle(x + 16, 160 - h * 0.6, h * 0.45)
      }
      g.generateTexture('bg_mid', 480, 160); g.destroy()
    }
    this.sky = this.add.graphics().setDepth(-100)
    this.paintSky()
    this.far = this.add.tileSprite(0, GROUND - 230, W, 200, 'bg_far').setOrigin(0).setDepth(-90).setAlpha(0.9).setTint(this.dg.hills)
    this.mid = this.add.tileSprite(0, GROUND - 170, W, 160, 'bg_mid').setOrigin(0).setDepth(-80).setTint(this.dg.hills)
    this.ground = this.add.tileSprite(0, GROUND - 20, W, H - GROUND + 20, 'grass0').setOrigin(0).setDepth(-70)
    if (this.dg.tier > 1) this.ground.setTint(0x9a90c0)
    this.add.rectangle(0, GROUND - 22, W, 6, 0x3d6e4c).setOrigin(0).setDepth(-69)
  }

  private paintSky() {
    const [top, bottom] = this.dg.sky
    this.sky?.clear().fillGradientStyle(top, top, bottom, bottom, 1).fillRect(0, 0, W, GROUND - 40)
  }
  /** Tower: a new theme every 10 floors repaints the sky and hills. */
  private retheme(dg: DungeonDef) {
    if (dg === this.dg) return
    this.dg = dg
    this.paintSky(); this.far.setTint(dg.hills); this.mid.setTint(dg.hills)
    if (dg.tier > 1) this.ground.setTint(0x9a90c0)
  }
  private roomDef(i: number): RunRoom | null { return this.run.roomAt(i) }

  private scroll(px: number) {
    this.far.tilePositionX += px * 0.15
    this.mid.tilePositionX += px * 0.45
    this.ground.tilePositionX += px
  }

  // ---------- run flow ----------
  private async startRun() {
    unlock()
    const id = ++this.runId
    this.overlay?.destroy(); this.overlay = undefined
    this.mons.forEach((m) => this.removeMon(m)); this.mons = []
    const s = save()
    this.skipCatch = null; this.skipNote = ''
    if (this.modeArgs.mode === 'tower' && this.modeArgs.skipTo) { // v87: pay the gems now (every run start, a retry pays again); short -> floor 1
      const S = this.modeArgs.skipTo, got = payTowerSkip(s, S)
      if (got) { this.skipCatch = got; this.modeArgs.startFloor = S + 1; persist(); this.skipNote = `⏭️ ข้ามไปชั้น ${S + 1} (-💎${towerSkipGems(S)})` }
      else { this.modeArgs.skipTo = undefined; this.modeArgs.startFloor = undefined; this.skipNote = '💎 เพชรไม่พอข้ามชั้น: เริ่มที่ชั้น 1' }
    }
    this.run = buildRun(s, this.modeArgs) // a retry rebuilds the run (new tower floors, same daily seed)
    track({ e: 'run_start', mode: this.run.hell ? 'hell' : this.run.modeId, dungeon: this.run.themeAt(0).id }); ftue('run1_start')
    this.retheme(this.run.themeAt(0))
    const mut = this.run.mut
    this.drained = 0; this.drainDelta = undefined
    this.build = heroBuild(mut.lukMul !== 1 ? { ...s, stats: { ...s.stats, luk: Math.round(s.stats.luk * mut.lukMul) } } : s) // mutator ดวงพุ่ง
    this.st = this.build.stats
    this.st.maxHp = Math.round(this.st.maxHp * mut.heroMul.maxHp); this.st.atk *= mut.heroMul.atk; this.st.matk *= mut.heroMul.matk
    this.fxCd = {}; this.spellbladeReady = false; this.guardianUsed = false; this.echoLock = false
    this.biomeState = null; this.biomeCritAdd = 0; this.biomeSkillMul = 1; this.hazardSig = ''; this.monSeq = 0
    this.towerFloor = 0; this.bank = { zeny: 0, mats: {} }; this.leftTower = false
    this.clog.reset() // v120 combat log: one run
    this.hardK = this.hard ? { hp: HARD_POWER.target, atk: HARD_POWER.target } : { hp: 1, atk: 1 } // fixed level (v126: every dungeon): reward = HARD.reward x corruption
    this.aff = foldAffixes(this.run.corrupt?.affixes ?? []); this.enrageCount = 0
    this.hp = this.st.maxHp; this.smashCdLeft = 0; this.heroGauge = 0; this.zapCount = 0; this.emergencyUsed = false; this.firstOffer = true
    this.job = JOBS[s.job ?? 'novice']
    this.j2 = s.job2 && JOB2[s.job2]?.parent === this.job.id ? JOB2[s.job2] : undefined // 2nd job (design/second-jobs-v1.md)
    if (this.job.id === 'cleric') preloadPfx(this, CLERIC_PFX) // bake the pixelfx sheets now, not on the first cast
    if (this.job.id === 'mage') preloadPfx(this, MAGE_PFX)
    if (this.job.id === 'archer') preloadPfx(this, ARCHER_PFX)
    if (this.job.id === 'thief') preloadPfx(this, THIEF_PFX)
    if (this.job.id === 'swordsman') preloadPfx(this, SWORD_PFX) // 🤐 ดาบสยบมนตร์ / 🗡️ ดาบพิพากษา (Knight / Berserker cast the Skill 1 too)
    if (this.j2?.id === 'knight') preloadPfx(this, KNIGHT_PFX)
    if (this.j2?.id === 'berserker') preloadPfx(this, BERSERKER_PFX)
    if (this.j2?.id === 'beastmaster') preloadPfx(this, BEAST_PFX)
    else if (this.st.arHawk > 0) preloadPfx(this, ['hawkDive']) // archer talent เหยี่ยวคู่ใจ
    preloadPfx(this, ['zapYellow', 'zapBolt'])
    preloadPfx(this, COIN_PFX) // kill loot: every job sees it
    if (this.j2) this.job = { ...this.job, resource: this.j2.resource ?? this.job.resource, auto: { ...this.job.auto, ...(this.j2.id === 'sage' ? { name: SAGE_S1.name, icon: SAGE_S1.icon, cost: KIT2.sage.s1Cost } : { cost: this.j2.autoCost ?? this.job.auto.cost }) }, ult: { ...this.job.ult, ...this.j2.ult, ...(this.j2.id === 'monk' && this.st.j2Asura > 0 ? { icon: '💥', name: 'อาชูร่าสไตรก์' } : {}), ...(this.j2.id === 'sage' && this.st.j3Pf > 0 ? { icon: '💎', name: 'Soul Burst' } : {}) } } // Berserker: Rage · Sage: Spellstrike Skill 1 · Ult วิวัฒน์ · Monk ★ Asura Strike
    if (this.j2?.id === 'sage') this.job = { ...this.job, attack: 'melee' } // 📖 Sage: melee basic + counters (P.ATK)
    const tb = totalBase(s)
    this.sageInt = tb.int; this.heroVit = tb.vit; this.heroDex = tb.dex; this.heroWis = tb.wis; this.mdPower = mageDefPower(tb.int, tb.wis, s.baseLevel); this.casts = []; this.steady = false; this.endow = 0 // Phase 5 Mage · v78 DEX lowers the chant break
    this.heroLuk = tb.luk; this.heroStr = tb.str; this.heroTopStat = Math.max(tb.str, tb.dex, tb.agi); this.pet = s.pet ?? 'hawk' // Phase 4 Archer: hawk / gadget odds read base LUK · bm_k1 highest STR/DEX/AGI
    { const wpn = itemById(s.equipped.weapon ?? ''); this.j2Weapon = !!this.j2?.mastery.ok(wpn); this.hasShield = !wpn.twoHand && !!s.equipped.offhand && s.equipped.offhand !== 'none_off'; this.dualKnife = this.hasShield && itemById(s.equipped.offhand ?? '').wtype === 'dagger' }
    this.frenzy = 0; this.frenzyAt = 0; this.s3Cd = 0; this.s4Cd = 0; this.boomCd = 0; this.rampage = 0; this.rampageAuraStop(); this.swAwaken = 0; this.swWave = false; this.swAuraStop(); this.charges = 0; this.monkGrit = 0; this.asuraExhaust = 0; this.allies = []; this.allyTxt.clear(); this.chargeTxt = undefined
    this.s2 = this.job.id === 'novice' ? undefined : skill2Picked(s.jobTree, this.job.id); this.s2Cd = 0; this.s1Cd = 0; this.swGuard = 0
    this.buf = { guard: 0, blood: 0, hawk: 0, mshield: 0, renew: 0, bless: 0, dawnWis: 0, lootAtk: 0, lootCrit: 0 }; this.s2Count = 0
    this.hcVit = { n: 0, turns: 0, amt: 0, delta: {} } // v119 💪 Holy Cross VIT stacks
    this.dawnWisAmt = 0; this.dawnWisDelta = {}; this.dawnCount = 0; this.gc = null // v102 ☀️ แสงแตก · v108 🌄 hit counter · v111 ✨ pulses
    this.blessOn = false; this.blessDelta = undefined; this.kyrie = { hp: 0, hits: 0 } // v77 พรแสง
    if (this.s2?.id === 'cl_spear') this.st.spearMul += S2N.spearPlus(this.st.s2Lv) // หอกคม: +10%/lv of the 0.3x base
    this.res = this.job.resource === 'rage' ? 0 : this.resMax()
    this.shield = 0; this.dodgeCharges = 0; this.ctrCharges = 0; this.s1CtrDmgLeft = 0; this.kitSkillCritAdd = 0; this.knightPiercing = false; this.shadowGauge = 0; this.shadowTurns = 0; this.waveOpen = false; this.dodgeFleeTurns = 0; this.thMarkMon = undefined; this.malice = 0; this.rogueCp = 0; this.thHpBonus = 0; this.thTenBonus = 0; this.shroudTurns = 0; this.raidReady = false; this.deathMarkPopping = false; this.mobExecuting = false; this.toxicHealing = false; this.inS3 = false
    this.rigSpec = heroRigSpec(s)
    this.heroRig.setAppearance(this.rigSpec, heroCostumeTint(s.costume))
    this.heroRig.resetPose(HERO_X, GROUND)
    this.perks = []; this.hits = 0; this.procHits = {}; this.pk = newPerkStats(); this.masteries = []; this.src = 'other'; this.immortal = null; this.eggN = 0; this.eggDef = 0
    this.level = 1; this.xp = 0; this.zeny = 0; this.kills = 0; this.runXp = 0; this.runGems = 0; this.runCards = []; this.runMats = {}; this.runUniques = []; this.runDupeMats = {}; this.pendingLevels = 0
    this.cardLuck = 1 + Math.min(PER_POINT.luk.dropCap, PER_POINT.luk.dropPct * totalBase(s).luk)
    this.settled = false; this.over = false; this.smashQueued = false; this.clearBookings()
    this.buildSkillHud() // v86: job / 2nd job / Skill 2 are known now
    this.startedAt = this.time.now
    this.turnHitsCur = 0; this.turnDmgCur = 0; this.turnHitsLast = 0; this.turnHitsTotal = 0; this.turnHitsPeak = 0; this.inHeroTurn = false; this.hideTurnCombo()
    this.eventLog = []; this.lockTarget = undefined; this.lockStacks = 0; this.hawkTurn = 0; this.revivedCount = 0; this.spears = 0; this.spearAcc = 0; this.ultRegenTurns = 0; this.shieldLayers = []; this.smiteCount = 0; this.counterCount = 0; this.comboCount = 0; this.comboLevel = 0; this.lowShake = !!save().lowShake; this.autoUlt = ultMode() === 'auto'; this.autoSkip = false; this.ultHeld = 0; this.peakTurns = 0; this.turnsLog = []
    this.faith = 0; this.wardTurns = 0; this.holyRevived = false // v84 webs: momentum / Faith / ม่านพร / ★ คืนชีพ (1 per run)
    this.minHpPct = 1; this.relic = null; this.miniKind = null; this.miniWon = false; this.parryCount = 0; this.freezeCount = 0; this.harvest = 0; this.enemyAttacks = 0
    this.hx = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0, web: 0, slow: 0, thorn: 0, venom: 0, venomTurns: 0 }; this.webOn = false; this.webDelta = undefined; this.debuffCount = 0; this.resistCount = 0
    this.flags = newFlags(); this.hpFloor = 0; this.starsOn = false; this.ignorePainTurns = 0; this.ignorePainDmg = 0; this.ignorePainUsed = false; this.ignorePainRegenTurns = 0; this.ignorePainRegenPerTurn = 0; this.wlUndyingTurns = 0
    if (Object.keys(mut.hero).length) this.applyMod(mut.hero)
    if (this.run.modeId === 'rift' && s.riftRun?.boons.length) {
      for (const bid of s.riftRun.boons) {
        const b = riftBoonById(bid)
        if (b?.stats) this.applyMod(b.stats)
      }
    }
    this.runElement = null
    if (this.job.id === 'mage') {
      const els = this.runElements() // 📖 Sage / 🎓 Professor: 🔥⚡❄️ only (no ✨ Arcane)
      const c = await this.choose({ name: 'เลือกธาตุท่าไม้ตาย', icon: '🔮', desc: 'รอบนี้ "เวทธาตุ" จะใช้ธาตุไหน?' },
        els.map((e) => ({ label: `${ELEMENTS[e].icon} ${ELEMENTS[e].name}`, sub: ELEMENTS[e].sub })))
      if (id !== this.runId) return
      this.element = els[c]
      this.runElement = this.element
    }
    if (this.run.mutators.length) { // daily / bounty: show rules before the first wave
      this.banner(`${this.run.corrupt ? `☠️ Corruption (รางวัล x${this.run.corrupt.reward.toFixed(2)})` : this.run.modeId === 'bounty' ? "🎯 ค่าหัวสัปดาห์นี้" : "🎲 กฎวันนี้"}: ${this.run.mutators.map((m) => `${m.icon} ${m.name}`).join(' · ')}`, this.run.mutators.map((m) => m.desc).join(' · '))
      await this.wait(1600)
      if (id !== this.runId) return
    }
    if (this.skipCatch) { // v87: the level + relic the checkpoint had, picked up front (no fights yet)
      const c = this.skipCatch
      this.banner(this.skipNote, `เริ่ม Lv ${c.lv} · เลือกการ์ด ${c.lv - 1} ใบ${c.relic ? ' + พรเทพ 1 ใบ' : ''}${c.est ? ' (ประมาณจากชั้น: ยังไม่เคยมีบันทึก)' : ''}`)
      await this.wait(1200)
      if (id !== this.runId) return
      this.level = c.lv; this.pendingLevels = c.lv - 1
      await this.levelUps()
      if (id !== this.runId) return
      if (c.relic) { await this.offerRelic(true); if (id !== this.runId) return }
    } else if (this.skipNote) { this.banner(this.skipNote, ''); await this.wait(1000); if (id !== this.runId) return }
    for (let i = 0; ; i++) {
      const room = this.roomDef(i)
      if (!room) break
      this.room = i
      this.retheme(this.run.themeAt(i))
      await this.walk(i === 0 ? 700 : 1100)
      if (id !== this.runId) return
      if (room.dayStart && room.days) await this.newDay(room.day ?? 1, room.days) // ☀️ dungeon days (data/dungeon-days.ts)
      if (id !== this.runId) return
      await this.spawnRoom(i)
      const won = await this.fight(id)
      if (id !== this.runId) return
      if (!won) { this.over = true; await this.wait(700); this.showGameOver(); return }
      if (room.dayEnd) { await this.settleDay(room); if (id !== this.runId) return } // ☀️ bounty / Kafra / oath / scout pay out
      if (this.flags.oath !== 'blood') this.heal(this.st.maxHp * RULES.healOnClear * this.run.mut.waveHeal) // ⚔️ blood vow: no wave heal until day end
      if (this.immortal === 'egg' && this.eggN < IMMORTAL_RULES.eggMax) { this.eggN++; this.st.def += this.eggDef * IMMORTAL_RULES.eggStep; this.floatText(HERO_X, GROUND - 150, `🥚 ไข่ทองคำ +${Math.round(this.eggN * IMMORTAL_RULES.eggStep * 100)}%`, '#ffd86b') }
      if (this.flags.eliteReward) this.eliteReward()
      this.gainXp(RULES.xpOnClear); this.runXp += RULES.xpOnClear
      await this.levelUps()
      // the 1v1 mini boss gives a top-tier skill instead of an event; other waves (not the boss) lead to one event
      if (room.mini) { this.miniWon = true; if (this.run.relicAfter(room, !!this.relic)) { await this.offerRelic(); if (id !== this.runId) return } }
      for (let e = this.run.eventsAfter(i, room); e > 0; e--) { await this.postWaveEvent(); if (id !== this.runId) return }
      if (this.run.endless && room.floorEnd && !(await this.floorCleared(room.floor ?? i + 1))) {
        if (id !== this.runId) return
        this.over = true; sfx.win(); await this.wait(400); this.showTowerLeave(); return
      }
      if (id !== this.runId) return
    }
    this.over = true
    sfx.win()
    await this.wait(600)
    this.showWin()
  }

  private wait(ms: number) { return new Promise<void>((r) => this.time.delayedCall(ms, r)) }
  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig) { return new Promise<void>((r) => this.tweens.add({ ...cfg, onComplete: () => r() })) }

  /** Hero walks: the world scrolls past. */
  private async walk(ms: number) {
    this.heroRig.startWalk()
    const ev = this.time.addEvent({ delay: 16, loop: true, callback: () => this.scroll(4) })
    await this.wait(ms)
    ev.remove()
    this.heroRig.stopWalk()
  }

  private async spawnRoom(i: number) {
    if (this.job.resource === 'rage') this.res = Math.min(RES_RULES.rageMax, this.st.startRage) // talent: เลือดร้อน
    else if (this.st.startRage > 0) this.gainRes(this.st.startRage) // Swordsman on Mana: the same talent refills Mana at wave start
    const room = this.roomDef(i)!
    const kinds: MonsterKind[] = []
    this.roomStart = this.mons.length
    if (this.run.affixesAt) { // v59 tower: one more floor rule every 10 floors
      const next = foldAffixes(this.run.affixesAt(room)), fresh = next.defs.filter((a) => !this.aff.defs.includes(a))
      this.aff = next
      if (fresh.length) { this.banner(`🗼 กฎใหม่ของหอคอย: ${fresh.map((a) => `${a.icon} ${a.name}`).join(' · ')}`, fresh.map((a) => a.desc).join(' · ')); await this.wait(1400) }
    }
    if (room.mini) {
      const pool = room.miniPool ?? MINI_POOL, picked = this.flags.nextMini // ☀️ 🔭 scout picked tonight's mini in advance
      this.flags.nextMini = undefined
      this.miniKind = picked && pool.includes(picked) ? picked : pool[Phaser.Math.Between(0, pool.length - 1)]
      const d = MONSTERS[this.miniKind]
      this.banner(`⚔️ ดวล 1-1 · ${d.name} ${d.title ?? ''}`, MINI_HINT[d.mini!])
      kinds.push(this.miniKind)
    } else {
      this.banner(room.title, room.boss ? 'บอสร่ายพลัง = ตาเรา! เตรียมกันด้วยท่าไม้ตาย หรือรีบตีให้จบ' : 'ผลัดกันตีตามความเร็ว (AGI) · ' + (this.autoUlt ? 'ท่าไม้ตายออกเองอัตโนมัติ' : 'แตะปุ่มทุบเมื่อพร้อม'))
      for (const [k, n] of room.spawn) for (let j = 0; j < n; j++) kinds.push(k)
    }
    kinds.slice(0, SLOT_X.length).forEach((k, j) => this.addMon(k, j))
    if (room.elite) this.flags.eliteReward = true // ☀️ day-end elite wave: pays like the fork event's dangerous path (no stat boost)
    if (room.dayEnd) this.dayHp0 = this.hp // ☀️ 📜 no-scratch bounty reads the HP lost in this fight
    if (this.flags.elite && !room.mini && !room.boss) { // event ทางแยก: this wave is elite
      const E = EVENT_RULES.forkElite
      this.flags.elite = false; this.flags.eliteReward = true
      for (const m of this.mons.slice(this.roomStart)) { m.def = { ...m.def, hp: Math.round(m.def.hp * E.hp), dmg: m.def.dmg * E.dmg }; m.hp = m.def.hp; m.spr.setTint(0xff9a8a) }
      this.callout('🔥 ทางอันตราย: มอนแกร่งขึ้น!', W / 2, 250)
    }
    if (this.job.id === 'archer') { // archer talents: ก้าวถอย / สมาธิพราน
      if (this.st.arWaveDodge > 0) this.dodgeCharges = Math.max(this.dodgeCharges, this.st.arWaveDodge)
      if (this.st.arStartFull > 0) this.res = this.resMax()
    }
    if (this.st.mgWaveBarrier > 0) this.addShield(this.st.matk * this.st.mgWaveBarrier, true) // mage talent ลูกศิษย์น้ำแข็ง
    this.auraLeft = this.st.mgAura > 0 ? MAGE_PASSIVE.aura.turns : 0 // Mage core passive 🔮 ออร่าเวท: the buff restarts every wave
    if (this.auraLeft > 0) this.floatText(HERO_X, GROUND - 150, `🔮 ออร่าเวท +${Math.round(this.st.mgAura * 100)}%`, '#c9a8ff')
    const waveDodge = this.st.waveDodge + staticDodgeCharges(this.st.mgStatic) // Thief talent: ม่านควัน + Mage passive ⚡ Static Mirage (stack)
    if (waveDodge > 0) this.dodgeCharges = Math.max(this.dodgeCharges, waveDodge)
    if (this.job.id === 'thief') { // P2'c th_t1a ก้าวเงา gauge · th_t1b เปิดฉากซุ่มโจมตี opener
      this.waveOpen = this.st.thWaveOpenCrit > 0
      if (this.st.thWaveGauge > 0) this.addShadow(this.st.thWaveGauge)
    }
    if (this.st.bossShield > 0 && this.mons.some((m) => !m.dead && m.def.ai === 'boss')) this.addShield(this.st.maxHp * this.st.bossShield) // cleric talent: ร่างพร
    if (this.st.spearStart > 0) this.spears += this.st.spearStart // cleric talent: หอกเปิดศึก
    if (this.st.clManaShield > 0) this.addShield(this.st.maxRes * this.st.clManaShield, true) // v86 💠 มานาพิทักษ์: wave-start shield from Max Mana
    if (this.st.waveShield > 0) { // gear: tops the shield up (never stacks) at every wave start
      const target = Math.round(this.st.maxHp * this.st.waveShield * (1 + this.st.shieldAmp) * shieldCutMul(this.st.thDefShieldCut))
      if (this.shield < target) { this.shield = target; this.floatText(HERO_X, GROUND - 100, `🛡️ โล่ ${target}`, '#9fe3ff') }
    }
    await this.wait(900)
  }

  private addMon(kind: MonsterKind, slot: number, gauge?: number) {
    // v126: every level dungeon (D1-D13, daily, rift) builds its monsters from their stats at the room Lv; the tower rebuilds them at the floor Lv
    let def = this.echoDef(kind) ?? (this.dg.level && this.run.modeId !== 'tower' ? this.statDef(MONSTERS[kind], kind) : this.modeDef(this.towerStats(kind), kind))
    if (this.isHell(kind)) def = hellify(def, Math.random()) // v114 🔥 tower floor 25+
    const big = def.ai === 'boss'
    const x = this.roomDef(this.room)?.mixed ? MIX_X[slot] ?? SLOT_X[slot] : big ? 720 : SLOT_X[slot] // tower mixed fight: adds in front, big ones behind
    const y = GROUND + (slot % 2 ? 14 : -4)
    const shadow = this.add.image(W + 80, y + 2, 'shadow').setScale((def.radius * 2.4) / 60 * 1.4, 1.2).setDepth(y - 1)
    const spr = this.add.image(W + 80, y, def.tex).setOrigin(0.5, 1).setScale(kind === 'minijellop' ? 1.1 : big ? 1.6 : 1.5).setDepth(y)
    if (FACES_RIGHT.includes(kind)) spr.setFlipX(true)
    if (def.hellish) spr.setTint(HELL.tint)
    else if (this.hard) spr.setTint(HARD.tint)
    else if (this.run.tint) spr.setTint(this.run.tint)
    else if (this.run.affix && def.ai === 'boss') spr.setTint(HARD.tint)
    const affix = (this.hard || this.run.affix) && def.ai === 'boss' ? this.lastAffix : undefined
    const m: Mon = { kind, def, spr, shadow, hp: def.hp, gauge: gauge ?? Phaser.Math.Between(0, 40), dead: false, slot, turns: 0, charging: false, summoned: false, burnStacks: 0, burnStackTurns: 0, chill: 0, frozen: false, burn: 0, burnTurns: 0, poison: 0, poisonDmg: 0, parry: false, ice: 0, iceChance: 0, iced: false, hell: 0, harvestMark: 0, huntMark: 0,
      shield: 0, atkUp: 0, atkUpTurns: 0, phase: 0, speedMul: 1, dmgMul: 1, reflect: def.reflect ?? 0, absorb: def.absorb ?? 0, stored: 0, chargeEvery: def.chargeEvery ?? BATTLE.slamEvery, skills: def.skills ?? [], onHit: def.onHit, slamFx: def.slamFx, revived: false, weakTurns: 0, weakPct: 0, tauntTurns: 0, armorBrk: 0, blind: 0, exposed: 0, exposedPct: 0, wound: 0, woundTurns: 0, woundCut: 0, woundCutTurns: 0, dagger: 0, daggerTurns: 0, stabMark: 0, strip: 0, wet: 0, spBreak: 0, gore: 0, goreTurns: 0, deathMark: 0, deathMarkDmg: 0, affix, instanceId: `${kind}_${++this.monSeq}` }
    const hk = def.heroKit && resolveHeroKit(def.heroKit, { job: this.job.id, s2: this.s2?.id, job2: this.j2?.id })
    if (hk?.skills.length) { m.heroKit = hk; m.kit = newKitState(hk) }
    else if (big) m.mp = newManaPool() // Q 2026-11-23: bosses pay mana for active skills
    if (this.biomeState?.hazard === 'astral_eclipse' && m.instanceId) {
      this.biomeState.monsterAstralLayers[m.instanceId] = big ? HAZARD_TUNING.astral_eclipse.bossLayers : HAZARD_TUNING.astral_eclipse.normalLayers
      this.biomeState.monsterStaggerTurns[m.instanceId] = 0
    }
    if (affix) m.speedMul = this.lastSpeed
    m.speedMul *= this.modeSpeed
    if (affix) this.time.delayedCall(700, () => this.callout(`🔥 ${def.name}: ${affix}`, W / 2, 205))
    else if (def.hellish && big) this.time.delayedCall(700, () => this.callout(`🔥 ${def.name}: ${def.hellish}`, W / 2, 205))
    else if (def.hellish) this.time.delayedCall(500 + slot * 120, () => this.floatText(spr.x, spr.y - 90, def.hellish!, '#ff8a80'))
    if (def.escTag && big) this.time.delayedCall(1300, () => this.callout(`🔥 ${def.name}: ${def.escNames}`, W / 2, 235))
    else if (def.escTag) this.time.delayedCall(700 + slot * 120, () => this.floatText(spr.x, spr.y - 110, def.escTag!, '#ffd86b'))
    this.mons.push(m)
    this.tweens.add({ targets: [spr, shadow], x, duration: 600, ease: 'Quad.easeOut', delay: slot * 90 })
    return m
  }

  /** Level dungeon (v126: D1-D5 too): numbers from the monster's 7 stats at the room's level (data/mon-stats.ts). No Hero Power scaling;
   * 🔥 hard = +50% stat points on every tier, boss / mini affixes, and the run's corruption (affixes + stat boosts). */
  private statDef(base: MonsterDef, kind?: MonsterKind): MonsterDef {
    const endless = kind && this.run.riftMode ? this.towerLv(kind) : 0 // v125 rift: room Lv, never below ENDLESS_HELL.minLv from depth 100
    const lv = endless || (this.roomDef(this.room)?.lv ?? roomLevel(this.dg.level!, this.dg.rooms, this.room)) + (this.hell ? HELL_MODE.lv : 0) // 😈 hell: +10 Lv
    // v127 🔥 hard escalation: +10% stat points per room, day 2+ perks / HP, day 3+ 🟡 blessing, 😈 hell MVP 🔴 (data/hard-escalation.ts)
    const esc = this.hard && !this.run.endless ? escalationAt(this.room, this.roomDef(this.room)?.day ?? 1, this.hell && monTier(base) === 'boss') : null
    let out = statMonster(esc ? { ...base, pointsMul: (base.pointsMul ?? 1) * esc.pointsMul } : base, lv, { hard: this.hard || this.endlessDeep(), statMul: this.run.corrupt?.statMul })
    if (this.hell && !out.passive) out = hellify(out, Math.random()) // 😈 every monster is a Hell copy (one trait, HP / ATK / EXP up)
    if (esc) { const r = escalate(out, esc); out = r.def; if (r.tag) { out.escTag = r.tag; out.escNames = r.names } }
    if (this.hell && !out.passive && monTier(base) === 'boss') { // 😈 MVP HP nerf (Q 2026-11-22): x HELL_MODE.bossHp, cap x bossHpCap of the 🔥 hard boss here
      const roomLv = lv - (endless ? 0 : HELL_MODE.lv), e1 = esc && escalationAt(this.room, this.roomDef(this.room)?.day ?? 1, false)
      const hard = statMonster(e1 ? { ...base, pointsMul: (base.pointsMul ?? 1) * e1.pointsMul } : base, roomLv, { hard: true, statMul: this.run.corrupt?.statMul }).hp * (e1 ? e1.hp : 1)
      out.hp = hellBossHp(out.hp, hard)
    }
    const mut = this.run.mut
    if (mut.monHp !== 1) out.hp = Math.round(out.hp * mut.monHp)
    if (mut.monAtk !== 1) { out.dmg *= mut.monAtk; out.matk = (out.matk ?? out.dmg) * mut.monAtk }
    this.modeSpeed = mut.monSpeed * this.aff.speed
    if (this.hard && out.ai === 'boss' && !out.passive) { this.hardAffix(out); if (this.run.corrupt?.tyrant) this.hardAffix(out) }
    if (!out.passive) this.aff.mon(out) // corruption: tower affixes reused
    return out
  }

  /** 🗼 tower: a monster rebuilt at the floor's tower Lv (v116 / v122: HP / ATK / M.ATK from its stats at that Lv too, no Hero Power).
   *  A D6+ kind with no floor Lv falls back to its D5-anchored build (v114). */
  private towerStats(kind: MonsterKind): MonsterDef {
    const base = deepAnchor(kind), lv = this.towerLv(kind)
    return lv ? restatAt(base, kind, lv, true, this.endlessDeep()) : base
  }
  /** ☀️ dungeon days (Q 2026-11-18 "มอนจากด่านเก่าต้อง Scale lv ตามด่านใหม่"): a monster from an earlier dungeon in an echo room
   *  is rebuilt at THIS room's Lv with its own kit, then pays EXP / zeny like this dungeon's monsters of its tier (dungeon-days echoPay).
   *  null = not an echo. */
  private echoDef(kind: MonsterKind): MonsterDef | null {
    const room = this.roomDef(this.room), d = MONSTERS[kind], home = homeDungeon(kind)
    if ((!room?.echo && !this.forceEcho) || !d || !home || home === this.dg.id || this.run.endless || !this.dg.level) return null
    const out = this.statDef(d, kind), k = echoPay(this.dg, d)
    return { ...out, xp: Math.max(1, Math.round(out.xp * k.xp)), zeny: [Math.round(out.zeny[0] * k.zeny), Math.round(out.zeny[1] * k.zeny)] }
  }

  private forceEcho = false // ☀️ 👑 rematch event fight: rebuild the old boss at this room's Lv too
  private dayHp0 = 0

  /** ☀️ the day-end fight was won: settle what the day's events left (bounty, Kafra, oath, scout). */
  private async settleDay(room: RunRoom) {
    const F = this.flags, R = EVENT_RULES, h = this.eventHost(), t = this.dg.tier
    if (F.bounty) {
      const kind = room.mini ? this.miniKind : this.mons.slice(this.roomStart)[0]?.kind
      const ok = F.bounty === 'speed' ? this.fightTurns <= Math.ceil(this.turnLimit * R.bountySpeed) : (this.dayHp0 - this.hp) / this.st.maxHp <= R.bountyClean
      if (!ok) { this.callout('📜 ทำสัญญาไม่สำเร็จ...', W / 2, 250); h.addFortune(FORTUNE.failCheck, 'ปลอบใจ') }
      else if (F.bounty === 'speed') { this.callout('📜 ค่าหัวสายฟ้า!', W / 2, 250); h.gainZeny(Phaser.Math.Between(R.chestZeny[0] * t, R.chestZeny[1] * t) * R.bountyZeny); h.mat(true, 1) }
      else { this.callout('📜 ค่าหัวไร้รอย!', W / 2, 250); const n = kind ? h.card(kind) : undefined; if (n) this.say(`🃏 ได้${n}!`, '#f2b84b'); else h.mat(true, 1, kind ? homeDungeon(kind) : undefined) }
      F.bounty = undefined
      await this.wait(500)
    }
    if (F.deposit) { const back = Math.round(F.deposit * R.kafraRate); this.say(`🏦 คาฟร่าคืนเงิน ${back} z`, '#ffd86b'); h.gainZeny(back); F.deposit = undefined }
    if (F.debt) {
      const pay = Math.min(this.zeny, F.debt)
      this.zeny -= pay; this.say(`💸 คืนเงินกู้ ${pay} z`, '#ffd86b')
      if (pay < F.debt) this.addCurse('hunted')
      F.debt = undefined
    }
    if (F.oath === 'hunt') { F.curseDmg = Math.max(0, F.curseDmg - R.oathHunt); const n = h.card(); if (n) this.say(`🃏 ได้${n}!`, '#f2b84b'); h.addFortune(FORTUNE.risky, 'คำสาบาน') }
    if (F.oath === 'blood') F.dayLegend = (F.dayLegend ?? 0) + 1
    F.oath = undefined
    for (; (F.dayLegend ?? 0) > 0; F.dayLegend!--) await this.offerPerks(true)
  }

  /** ☀️ a new day of a dungeon run: banner + a small heal (DUNGEON_DAYS.dayHeal). */
  private async newDay(day: number, days: number) {
    if (day <= 1) { this.banner(`☀️ วันที่ 1 / ${days}`, `ดันนี้ยาว ${days} วัน · ทุกวันจบด้วยศึกท้ายวัน 🌙 · วันสุดท้ายเจอบอส`); await this.wait(1100); return }
    this.heal(this.st.maxHp * DUNGEON_DAYS.dayHeal)
    this.banner(`☀️ วันที่ ${day} / ${days}`, day === days ? 'วันสุดท้าย! ปลายทางคือบอส' : 'มอนจากดันที่เคยผ่านเริ่มหวนกลับมา...')
    await this.wait(1100)
  }

  /** v116: Lv a monster of `kind` takes on this tower floor (0 = not an endless room). Hell copies get HELL.lv more.
   *  v125: a Void Rift room's Lv (every kind, D1-D13). Floor / depth ENDLESS_HELL.from+: never below ENDLESS_HELL.minLv. */
  private towerLv(kind: MonsterKind): number {
    const r = this.roomDef(this.room)
    if (!r?.floor) return 0
    const lv = this.run.modeId === 'tower' ? towerMonLv(r.floor) + (this.isHell(kind) ? HELL.lv : 0) : this.run.riftMode ? r.lv ?? 0 : 0
    return lv && endlessHell(r.floor) ? Math.max(ENDLESS_HELL.minLv, lv) : lv
  }
  /** v125: tower floor / rift depth ENDLESS_HELL.from+: every monster is Hell with the 🔥 hard stat points. */
  private endlessDeep(): boolean {
    const r = this.roomDef(this.room)
    return (this.run.modeId === 'tower' || !!this.run.riftMode) && !!r?.floor && endlessHell(r.floor)
  }
  /** v114 / v118: a 🔥 Hell copy here? Rolled per room (RunRoom.hell); from HELL.allFrom every D1-D5 kind is, summons included.
   *  v125: from ENDLESS_HELL.from every kind (D6+ too) in the tower and the Void Rift. */
  private isHell(kind: MonsterKind): boolean {
    if (this.endlessDeep()) return true
    const r = this.roomDef(this.room)
    if (this.run.modeId !== 'tower' || !r?.floor) return false
    return !!r.hell?.includes(kind) || (r.floor >= HELL.allFrom && !deepKind(kind))
  }

  /** Tower / daily (RunConfig.scale): level + floor + mutator multipliers; tower bosses also roll the hard-mode affixes. */
  private modeDef(def: MonsterDef, kind?: MonsterKind): MonsterDef {
    // v125 rift: a D1-D5 kind is already rebuilt at the room Lv, so it takes only the mutators (statDef gives its D6+ roommates the same)
    const mut = this.run.mut, room = this.roomDef(this.room)
    const k = !room ? null : this.run.riftMode ? { hp: mut.monHp, atk: mut.monAtk, hit: 0, speed: mut.monSpeed } : this.run.scale(room, kind)
    this.modeSpeed = (k?.speed ?? 1) * this.aff.speed
    if (!k) return def
    const out: MonsterDef = { ...def, hp: Math.round(def.hp * k.hp), dmg: def.dmg * k.atk, ...(def.matk ? { matk: def.matk * k.atk } : {}), hit: (def.hit ?? 15) + k.hit }
    if (this.run.affix && !this.hard && def.ai === 'boss' && !def.passive) this.hardAffix(out)
    if (!def.passive) this.aff.mon(out) // v59 tower floor affixes
    return out
  }
  private modeSpeed = 1

  /** Hard mode: a mini boss / boss rolls 1 extra skill + 1 passive (final bosses of dungeon 3+: 2 passives). */
  private hardAffix(d: MonsterDef) {
    const pick = <T,>(a: T[]) => a[Phaser.Math.Between(0, a.length - 1)]
    const sk = pick(HARD_SKILLS.filter((x) => !(d.skills ?? []).some((y) => y.kind === x.kind && JSON.stringify(y.fx) === JSON.stringify(x.fx))))
    d.skills = [...(d.skills ?? []), sk] // own skills keep priority
    d.trueSight = HARD_POWER.bossSight // v59 anti-evasion (Q: Flee 159 Thief made bosses useless): 1 dodge -> sure hits for 3 turns
    if (d.phases) d.phases = d.phases.map((p) => (p.skills ? { ...p, skills: [...p.skills, sk] } : p))
    const pool = HARD_PASSIVES.filter((p) => !(p.onHit && hasFx(d.onHit)) && !(p.reflect && (d.reflect || d.absorb)) && !(p.lifesteal && d.lifesteal))
    const n = !d.mini && this.dg.tier >= 3 ? 2 : 1
    const got: string[] = []
    this.lastSpeed = 1
    for (let i = 0; i < n && pool.length; i++) {
      const p = pool.splice(Phaser.Math.Between(0, pool.length - 1), 1)[0]
      got.push(p.name)
      if (p.lifesteal) d.lifesteal = (d.lifesteal ?? 0) + p.lifesteal
      if (p.reflect) d.reflect = (d.reflect ?? 0) + p.reflect
      if (p.onHit) d.onHit = p.onHit
      if (p.def) d.def = (d.def ?? 0) + p.def
      if (p.speed) this.lastSpeed = p.speed
      if (p.enrage) d.phases = [...(d.phases ?? []), { at: 0.35, name: p.name, dmg: p.enrage, speed: 1.15 }].sort((a, b) => b.at - a.at)
    }
    this.lastAffix = `${sk.name} · ${got.join(' · ')}`
  }
  private lastAffix = ''
  private lastSpeed = 1

  private removeMon(m: Mon) { this.monCastFx(m, false); m.castSkill = undefined; m.spr.destroy(); m.shadow.destroy(); m.dotTxt?.destroy(); m.dotTxt = undefined }
  /** Q 2026-11-20: a monster cast (the old boss charge, still the `charging` flag) ends: released, broken or countered.
   *  Flag, tint, ring, pity and the stored skill (castSkill) cleared in one place. `say` = the cancel callout (float = small float text instead of a callout),
   *  `push` = turn gauge lost (`clamp` false keeps a cancel that may push below 0, like ★ หักท่า). */
  private endMonCast(m: Mon, say?: { text: string; color: string; float?: boolean; dy?: number }, push = 0, clamp = true) {
    m.charging = false; m.chargeHits = 0; m.castSteady = false; m.castSkill = undefined
    m.spr.clearTint()
    this.monCastFx(m, false)
    if (push) m.gauge = clamp ? Math.max(0, m.gauge - push) : m.gauge - push
    if (!say) return
    const y = m.spr.y - m.spr.displayHeight - (say.dy ?? 30)
    if (say.float) this.floatText(m.spr.x, y, say.text, say.color)
    else this.callout(say.text, m.spr.x, y, say.color)
  }
  /** Magic circle under a casting monster, pulsing like the hero Mage chant (castFx). */
  private monCastFx(m: Mon, on: boolean) {
    if (m.castRing) { this.tweens.killTweensOf(m.castRing); m.castRing.destroy(); m.castRing = undefined }
    if (!on || m.dead || !m.spr.active) return
    playPfx(this, 'magicCircle', m.spr.x, m.spr.y, { scale: 1.2, speed: 1.4 })
    const w = Math.max(130, m.spr.displayWidth * 0.95)
    m.castRing = this.add.ellipse(m.spr.x, m.spr.y - 2, w, w * 0.28).setStrokeStyle(3, 0xff7ad9).setDepth(m.spr.depth - 0.5)
    this.tweens.add({ targets: m.castRing, alpha: 0.35, scaleX: 1.15, scaleY: 1.15, duration: 360, yoyo: true, repeat: -1 })
  }
  /** Q 2026-11-20: a direct hit that reached HP may break a monster cast (mirrors the hero castBreak). DoT / reflect / echo never do. */
  private monCastBreak(m: Mon, dmg: number) {
    if (!m.charging || m.dead || m.hp <= 0 || m.castSteady || !monBreaksOn(dmg, m.def.hp)) return
    if (Math.random() >= monBreakChance(monTier(m.def), this.hard || this.isHell(m.kind))) return
    this.endMonCast(m, { text: `💔 ร่ายแตก! ${m.def.name}`, color: '#ff7a7a' })
    m.gauge = monBreakGauge(m.gauge) // pushed back MON_CAST.pushGauge, never below 0
    if (monCastPity()) m.castSteady = true
  }
  private alive() { return this.mons.filter((m) => !m.dead) }
  private smashTurns() { return Math.max(2, Math.round(this.st.smashCd / BATTLE.msPerTurn)) }
  private heroSpeed() { return BATTLE.heroSpeed * (this.st.aspd / PLAYER.aspd) * (this.mcOver > 0 ? 1 + KIT3.mechanic.overAspd + this.st.j3McOver : 1) * (1 + this.frenzy * KIT2.berserker.frenzyAspd) * (this.hx.slow > 0 ? BATTLE.frozenHeart : 1) * (this.asuraExhaust > 0 ? 1 - KIT2.monk.asuraSlow : 1) * (this.relic === 'haste' ? 1 + RELIC_RULES.haste.speed : 1) * (this.st.j2Frenzy > 0 ? frenzyMul(this.st, this.front()[0]?.poison ?? 0) : 1) * (1 + this.st.j2Tempo * this.rgTempo) } // + P3'a Rogue rg_c1 Tempo // 🩸 Beastmaster Bloodscent Frenzy

  /** Who acts next: fill gauges until someone reaches 100 (ties go to the hero). */
  private nextActor(): Actor {
    const live = this.alive()
    for (;;) {
      if (this.heroGauge >= 100) { this.heroGauge -= 100; return { hero: true } }
      const m = live.filter((x) => x.gauge >= 100).sort((a, b) => b.gauge - a.gauge)[0]
      if (m) { m.gauge -= 100; return { hero: false, m } }
      const hs = this.heroSpeed()
      this.heroGauge += hs
      if (this.allies.length) fillAllies(this.allies, this.st, hs) // own-turn allies (wolf) share the queue
      for (const x of live) x.gauge += this.monSpeed(x)
    }
  }

  private monSpeed(m: Mon) {
    const frenzy = m.def.mini === 'hunter' && !this.isBroken(m) && m.hp < m.def.hp * BATTLE.frenzyAt ? BATTLE.frenzySpeed : 1
    const scent = this.scent(m) ? BATTLE.scentSpeed : 1 // hunter กลิ่นเลือด: the hero is low
    return (m.def.speed ?? BATTLE.monSpeed[m.kind] ?? 10) * (m.chill > 0 ? Math.max(0.3, 0.6 - this.st.chillSlow) : 1) * Math.max(frenzy, scent) * m.speedMul
  }
  private scent(m: Mon) { return m.def.mini === 'hunter' && !this.isBroken(m) && this.hp > 0 && this.hp < this.st.maxHp * BATTLE.scentAt }
  /** hunter Blood Razor: a landed normal hit adds magic damage from the hero's current HP. */
  private razor(m: Mon) {
    if (!m.def.razor || this.hp <= 0 || m.dead || this.isBroken(m)) return
    const n = this.hp * m.def.razor
    if (n >= 1 && this.hurtHero(n, true, 999, m, '🩸 Blood Razor')) this.floatText(HERO_X + 30, GROUND - 150, '🩸 Blood Razor', '#ff7a9a')
  }

  /** Preview the next N turns for the queue strip (pure simulation on copies). */
  private previewQueue(n: number): (Mon | null)[] {
    const live = this.alive()
    let hg = this.heroGauge
    const g = new Map(live.map((m) => [m, m.gauge]))
    const out: (Mon | null)[] = []
    while (out.length < n && live.length) {
      if (hg >= 100) { hg -= 100; out.push(null); continue }
      const m = live.filter((x) => g.get(x)! >= 100).sort((a, b) => g.get(b)! - g.get(a)!)[0]
      if (m) { g.set(m, g.get(m)! - 100); out.push(m); continue }
      hg += this.heroSpeed()
      for (const x of live) g.set(x, g.get(x)! + this.monSpeed(x))
    }
    return out
  }

  private async fight(id: number): Promise<boolean> {
    this.undrain()
    this.fightTurns = 0; this.timedOut = false
    this.turnHitsCur = 0; this.turnDmgCur = 0; this.turnHitsLast = 0; this.turnHitsTotal = 0; this.turnHitsPeak = 0; this.inHeroTurn = false; this.hideTurnCombo()
    this.frenzy = 0; this.boomCd = 0; this.firstSwing = true; this.s1Weave = false; this.weaveBonus = 0; this.dodgeCdIcd = 0; this.detUsed = false; this.luckyIcd = false; this.leechLeft = this.st.maxHp * KIT.thiefLeechTurnCap; this.rampage = 0; this.rampageAuraStop(); this.swAwaken = 0; this.swWave = false; this.swAuraStop(); this.s1CtrDmgLeft = 0; this.kitSkillCritAdd = 0; this.knightPiercing = false; this.swHelixHits = 0; this.swVeng = 0; this.swCullBuff = 0; this.monHitsThisTurn = 0
    this.rgTempo = 0; this.rgComboN = 0; this.rgDodgeIcd = 0; this.rgFlee = 0; this.rgDodged = false; this.rgAmbush = false; this.rgSnatchAmp = 0; this.rgSnatchTurns = 0; this.skPlagTurns = 0; this.skFullUsed = false // P3'a Rogue: per wave · 🥷 sk_d
    this.martyrUsed = false; this.lastStandUsed = false; this.thirdHits = 0; this.j2Hurt = false; this.monkGrit = 0; this.asuraExhaust = 0; this.awakenTurns = 0; this.awakenAbsorbed = 0; this.awakenUltPow = 1; this.clearAllies() // Crusader ★ ผู้พลีชีพ once per wave · allies last one wave · Awakening resets per wave
    this.inspireUsed = false; this.inspire = 0; this.earthDone = false // ⚜️ Paladin: once per fight
    this.hwAmp = 0; this.mcOver = 0 // 🌌 Amplify · 🤖 Overclock
    this.clearBookings() // v86: booked Skill 1-3 do not carry into the next wave (the ult booking does)
    this.zenyWave = 0; this.mirror = false; this.waveAllies() // Phase 4 Archer: pets / traps every wave
    this.casts = []; this.castFx(false); this.zenTurns = 0; this.endow = 0; this.rodUsed = false; this.sageFireBoltsTurn = 0; this.sageFireNovaUsed = false // Phase 5 Mage: a charge never carries into the next wave
    this.pfSet.clear(); this.pfConverged = false; this.pfFist = 0; this.pfField = 0; this.pfFreeEndow = false // 🎓 Professor: reactions / variant are per wave
    if (this.st.j3Pf > 0 && this.st.j3PfMemorize > 0 && this.alive().some((m) => m.def.ai === 'boss')) { // 📜 Memorize: boss wave opens with a free Endow (no CD)
      this.endow = Math.max(this.endow, KIT2.sage.endowTurns + this.st.j2EndowTurns)
      this.pfFreeEndow = this.st.j3PfMemorize >= 2
      this.floatText(HERO_X, GROUND - 160, `📜 Memorize: Endow ${ELEMENTS[this.element].icon}${this.pfFreeEndow ? ' · ไม่ใช้ Mana ทั้งเวฟ' : ''}`, '#c9a8ff')
    }
    if (this.st.j2ChargeFirst > 0) this.heroGauge = Math.max(this.heroGauge, 100) // Knight ★ ทะยาน: the hero acts first
    this.clEmerUsed = false; this.sweepTurn = 0 // v84: momentum and ฉุกเฉิน are per wave, the sweep counts this wave's hero turns
    if (this.st.j2Banner > 0) { // v84 Knight ปักธง: wave-start shield (stacks)
      this.addShield(this.st.maxHp * this.st.j2Banner, true)
      this.floatText(HERO_X, GROUND - 100, `🚩 ปักธง: โล่ ${Math.round(this.shield)}`, '#9fe3ff')
    }
    this.mdLast = { shock: -Infinity, nova: -Infinity }; this.raiseGlacial() // Mage passive ❄️ Glacial Aegis: barrier at the start of every wave
    this.lowHpDone = false; this.demonOn = false; this.demonDone = false; this.comboAtkN = 0; this.fightUlts = 0; this.lowRegen = { turns: 0, amt: 0 }; this.ignorePainTurns = 0; this.ignorePainDmg = 0; this.ignorePainUsed = false; this.ignorePainRegenTurns = 0; this.ignorePainRegenPerTurn = 0; this.wlUndyingTurns = 0
    this.fxCd = {}; this.spellbladeReady = false; this.guardianUsed = false; this.echoLock = false; this.biomeCritAdd = 0; this.biomeSkillMul = 1
    const room = this.roomDef(this.room)
    const hazard = (room && this.run.biomeAt?.(this.room, room)) ?? this.dg.hazard
    if (hazard) {
      const monIds = this.alive().map((m) => m.instanceId ?? m.kind)
      const bossIds = new Set(this.alive().filter((m) => m.def.ai === 'boss').map((m) => m.instanceId ?? m.kind))
      this.biomeState = createBiomeCombatState(hazard, monIds, bossIds)
    } else {
      this.biomeState = null
    }
    const sanctumBoon = this.hasRiftBoon('rift_sanctum')
    if (sanctumBoon) this.addShield(this.st.maxHp * sanctumBoon.effect.power, true)
    this.turnLimit = room?.turnLimit ?? (room?.boss ? BATTLE.bossTurnLimit : BATTLE.turnLimit)
    this.turnLimit = Math.round(this.turnLimit * BATTLE.monBuff.turns[Math.max(0, Math.min(4, this.dg.tier - 1))])
    if (this.hard) this.turnLimit = Math.round(this.turnLimit * HARD.turnMul * (this.hell ? HELL_MODE.turnMul : 1))
    if (room) this.turnLimit = Math.max(5, Math.round(this.turnLimit * this.run.turnMul(room))) // tower floors / daily ⏳ รีบเร่ง
    if (this.relic === 'iceage') this.castIceAge()
    if (this.relic === 'aegis') { // โล่อมตะ: shield at every fight start (tops up, never stacks)
      const want = Math.round(this.st.maxHp * RELIC_RULES.aegis.shield * (1 + this.st.shieldAmp) * shieldCutMul(this.st.thDefShieldCut))
      if (this.shield < want) { this.shield = want; this.floatText(HERO_X, GROUND - 100, `🛡️ โล่อมตะ ${want}`, '#9fe3ff') }
    }
    if (Object.keys(this.flags.pendingFx).length) { this.applyFx(this.flags.pendingFx); this.flags.pendingFx = {} } // event trap / runes
    if (this.flags.stars) { this.flags.stars = false; this.starsOn = true; this.applyMod({ crit: 1 }); this.callout('🌠 777! คริทุกฮิต', W / 2, 250) }
    if (await this.procs('fightStart') > 0) await this.wait(350) // พร v2: fight-start cards
    while (this.alive().length && this.hp > 0) {
      const a = this.nextActor()
      if (this.allies.length) { await this.allyTurns(); if (!this.alive().length || this.hp <= 0) break }
      if (a.hero) {
        if (this.fightTurns >= this.turnLimit) { await this.timeUp(); return false }
        this.fightTurns++
        this.peakTurns = Math.max(this.peakTurns, this.fightTurns)
        if (glacialDue(this.st.mgGlacial, this.fightTurns)) this.raiseGlacial() // Mage passive ❄️: re-raise every few hero turns
        this.enrageTick(room)
        const left = this.turnLimit - this.fightTurns
        if (left === 3 || left === 1) this.callout(`⏳ เหลืออีก ${left} เทิร์น!`, W / 2, 150)
        await this.heroTurn()
      } else await this.monTurn(a.m)
      if (id !== this.runId) return false
      await this.levelUps()
      await this.wait(90)
    }
    this.turnsLog.push(this.fightTurns)
    this.demonOn = false
    this.hx = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0, web: 0, slow: 0, thorn: 0, venom: 0, venomTurns: 0 }; this.syncWeb() // debuffs end with the fight
    if (this.starsOn) { this.starsOn = false; this.applyMod({ crit: -1 }) }
    this.biomeState = null; this.biomeCritAdd = 0; this.biomeSkillMul = 1
    return this.hp > 0
  }

  /** The worn effect of this id. Unique Passive rule (🧬 combine spec): the same id never stacks, the strongest one counts. */
  private itemEffect(id: ItemEffectId): ItemEffectSpec | undefined {
    let best: ItemEffectSpec | undefined
    for (const e of this.build?.effects ?? []) if (e.id === id && (!best || e.power > best.power)) best = e
    return best
  }
  /** 🧬 Combine passives skip the ult: its hits and the ⚔️ ปลุกดาบ / Awakening windows (the point is damage outside the ult). */
  private inUltWindow() { return this.src === 'ult' || this.swAwaken > 0 || this.awakenTurns > 0 }
  private fxReady(id: ItemEffectId): boolean {
    return (this.fxCd[id] ?? 0) <= 0
  }
  private armFxCd(fx: ItemEffectSpec) {
    if ((fx.cd ?? 0) > 0) this.fxCd[fx.id] = fx.cd!
  }
  private tickFxCd() {
    for (const k of Object.keys(this.fxCd) as ItemEffectId[]) {
      const v = this.fxCd[k] ?? 0
      if (v > 0) this.fxCd[k] = v - 1
    }
  }
  private hasRiftBoon(idOrKind: string): RiftBoonDef | undefined {
    if (this.run?.modeId !== 'rift') return undefined
    const boons = save().riftRun?.boons
    if (!boons?.length) return undefined
    for (const id of boons) {
      const b = riftBoonById(id)
      if (b && (b.id === idOrKind || b.effect.kind === idOrKind)) return b
    }
    return undefined
  }
  private notifyShieldOrBlockBiome() {
    if (this.biomeState) {
      const b = onHeroShieldOrBlockBiome(this.biomeState, this.st.def, this.st.maxHp)
      if (b.triggeredWave && b.aoeTrueDamage > 0 && this.alive().length) {
        this.floatText(HERO_X + 40, GROUND - 155, '🌊 คลื่นแรงดันใต้สมุทร!', '#9fe3ff')
        for (const m of this.alive()) this.withSrc('other', () => this.damageMon(m, b.aoeTrueDamage, false, '#9fe3ff', true))
      }
    }
    for (const m of this.alive()) {
      if (m.charging && m.def.chargeCounter === 'shield_or_guard') {
        this.endMonCast(m, { text: `🛡️ สกัดท่าร่าย ${m.def.name}!`, color: '#9fe3ff' }, 30)
      }
    }
  }
  private interruptStunCharge(m: Mon) {
    if (m.charging && m.def.chargeCounter === 'interrupt_stun') {
      this.endMonCast(m, { text: `💫 ขัดจังหวะร่าย ${m.def.name}!`, color: '#ffe08a' }, 30)
    }
  }

  /** v59 tower: a fight that drags past N hero turns enrages every monster (+x damage per hero turn, stacking). */
  private enrageTick(room: RunRoom | null) {
    const after = room && this.run.enrageAfter ? this.run.enrageAfter(room) : 0
    if (!after || this.fightTurns <= after) return
    for (const m of this.alive()) m.dmgMul *= 1 + TOWER_POWER.enragePer
    this.enrageCount++
    if (this.fightTurns === after + 1) this.callout(`😡 มอนคลั่ง! แรงขึ้น ${Math.round(TOWER_POWER.enragePer * 100)}% ทุกเทิร์น`, W / 2, 175, '#ff7a7a')
  }

  // ---------- hero turn ----------
  /** Dungeon 4-5: debuffs tick before the hero acts and count down after. */
  private async heroTurn() {
    this.inHeroTurn = true
    this.turnHitsCur = 0
    this.turnDmgCur = 0
    this.guardPool = 0 // ตั้งการ์ด: dmg taken counts per monster turn
    this.hideTurnCombo()
    try {
    this.tickFxCd()
    this.detUsed = false
    this.luckyIcd = false
    this.leechLeft = this.st.maxHp * KIT.thiefLeechTurnCap
    if (this.shadowTurns > 0 && --this.shadowTurns === 0) this.heroSpr.setAlpha(1) // 👤 ร่างเงา wears off
    const X = this.hx
    if (this.relic === 'purify') this.heal(this.st.maxHp * RELIC_RULES.purify.regen, true)
    if (X.poison > 0) { this.dotHurt(this.st.maxHp * BATTLE.poisonPct * X.poison, '☠️', '#b48aff'); X.poison-- }
    if (X.burn > 0 && this.hp > 0) this.dotHurt(this.st.maxHp * BATTLE.burnPct, '🔥', '#ff8c42')
    if (X.venomTurns > 0 && this.hp > 0) { this.dotHurt(X.venom * (1 - this.st.mdef), '🕷️', '#9be35a'); X.venom *= 2; if (--X.venomTurns === 0) X.venom = 0 } // Venom Strike: magic DoT that doubles every turn
    if (this.hp <= 0) return
    const radBurn = this.itemEffect('radiance_burn')
    if (radBurn && this.alive().length && this.hp > 0) {
      this.floatText(HERO_X + 30, GROUND - 155, '☀️ ออร่าเพลิงศักดิ์สิทธิ์!', '#ff9a3c')
      this.withSrc('fire', () => {
        for (const m of this.alive()) {
          this.strike(m, radBurn.power, true, '#ff9a3c')
          if (!m.dead) this.addBurn(m, 1, false)
        }
      })
    }
    if (this.job.id === 'cleric') this.tickShieldLayers()
    if (this.frenzy > 0 && this.fightTurns - this.frenzyAt > KIT2.berserker.frenzyKeep) { this.frenzy = 0; this.floatText(HERO_X, GROUND - 150, '🔥 Frenzy หมด', '#c9c9d6') }
    if (this.st.j2Es > 0 && !this.j2Hurt) this.addShield(this.st.maxHp * this.st.j2Es, true) // Monk Invoker Energy Shield (Meditate)
    if (this.j3Bless > 0) this.j3Bless--
    if (this.rgSnatchTurns > 0 && --this.rgSnatchTurns === 0) this.rgSnatchAmp = 0
    if (this.skPlagTurns > 0) this.skPlagTurns--
    if (this.hwAmp > 0) this.hwAmp--
    if (this.mcOver > 0) this.mcOver--
    if (this.inspire > 0) this.inspire--
    if (this.st.j3EarthDrive > 0 && !this.earthDone && this.alive().length) { // ⚜️ Earth Drive / 💥 Ranger Arrow Ambush: opens the fight
      this.earthDone = true
      if (this.st.j3Rn > 0) {
        this.callout('💥 Arrow Ambush!', W / 2, 170, '#9fe08a')
        arrowRainFx(this, GROUND)
        for (const m of this.alive()) {
          arrowImpactFx(this, m.spr.x, m.spr.y - m.spr.displayHeight * 0.5)
          this.strike(m, this.st.j3EarthDrive * (1 + this.st.pskill), false, '#9fe08a')
          if (!m.dead) { m.armorBrk = Math.max(m.armorBrk, 1); this.dotIcon(m) }
        }
      } else if (this.st.j3Sk > 0) { // 🥷 Ambush: free flying knives (they mark as usual)
        this.callout('🥷 Ambush!', W / 2, 170, '#b9a8ff')
        this.throwKnives(Math.round(this.st.j3EarthDrive), this.knifeMul() * KIT3.stalker.ambushKnifeMul)
      } else if (this.st.j3Kp > 0) { // 🧾 ค่าคุ้มครอง: every monster starts in debt (poison + chill)
        this.callout('🧾 ค่าคุ้มครอง!', W / 2, 170, '#c9a8ff')
        for (const m of this.alive()) { this.addPoison(m, Math.round(this.st.j3EarthDrive)); m.chill = Math.max(m.chill, KIT3.kingpin.openerChill); this.dotIcon(m) }
      } else if (this.st.j3Hw > 0) { // 🔥 Fire Pillar: x Pm on every monster + 1 burn stack
        this.callout('🔥 Fire Pillar!', W / 2, 170, '#ff8c42')
        for (const m of this.alive()) {
          playPfx(this, 'fireball', m.spr.x, m.spr.y - 30, { scale: 1.2, speed: 1.8 })
          this.withSrc('skill', () => this.strike(m, this.st.j3EarthDrive, true, '#ff8c42'))
          if (!m.dead) { m.burnStacks = Math.min(this.burnMax(), m.burnStacks + 1); m.burnStackTurns = 3; this.dotIcon(m) }
        }
      } else if (this.st.j3Mc > 0) { // 🪤 Deploy: extra random traps
        this.callout('🪤 Deploy!', W / 2, 170, '#ffc98a')
        for (let i = 0; i < Math.round(this.st.j3EarthDrive); i++) this.layTrap(TRAP_IDS[Phaser.Math.Between(0, TRAP_IDS.length - 1)])
      } else if (this.st.j3Wl > 0) {
        this.callout('📣 Crushing Warcry!', W / 2, 170, '#ff8a7a')
        this.gainRage(KIT3.warlord.warcryRage)
        for (const m of this.alive()) { this.strike(m, this.st.j3EarthDrive * (1 + this.st.pskill), false, '#ff8a7a'); if (!m.dead) { m.armorBrk = Math.max(m.armorBrk, 1); this.dotIcon(m) } }
      } else {
        this.callout('🌋 Earth Drive!', W / 2, 170)
        for (const m of this.alive()) { this.strike(m, this.st.j3EarthDrive * this.st.def / Math.max(1, this.st.atk)); if (!m.dead) { m.armorBrk = Math.max(m.armorBrk, 1); this.dotIcon(m) } }
      }
    }
    if (this.st.j2Dark > 0) this.addShield(this.st.maxHp * this.st.j2Dark, true) // Monk Chayula Darkness
    this.j2Hurt = false
    if (this.st.j2GritRate > 0 && this.alive().length && this.hp > 0) { // Monk Sett-style Haymaker
      const hm = haymakerCalc(this.st, this.monkGrit)
      if (hm.triggerAt > 0 && this.monkGrit >= hm.triggerAt) await this.releaseHaymaker()
    }
    if (this.alive().length && this.hp > 0) await this.heroAct()
    if (this.allies.length) await this.alliesOnTurn() // boar charge / robot turret
    if (this.st.j2Sweep > 0 && ++this.sweepTurn % KIT2.knight.tree.sweepEvery === 0 && this.alive().length && this.hp > 0) await this.spearSweep() // v84 Knight ทวนวน
    if (this.wardTurns > 0) this.wardTurns-- // v84 Priest ม่านพร
    for (const a of reviveAllies(this.allies)) { // 🐗 back up from down: full HP + charge (+ bm_b4 revive shield)
      this.floatText(HERO_X + 70, GROUND - 120, `${a.def.icon} ฟื้นแล้ว!`, '#9fe08a'); this.syncAlly(a)
      if (a.def.share && this.st.j2BoarEvo > 0) this.addShield(this.st.maxHp * KIT2.beastmaster.boarReviveShield)
      if (a.def.charge && this.alive().length && this.hp > 0) this.allyAct(a, false, undefined, a.def.charge)
    }
    for (const a of this.allies) if (a.down > 0) this.syncAlly(a)
    for (const a of tickAllies(this.allies)) { this.floatText(HERO_X + 70, GROUND - 120, `${a.def.icon} หมดเวลา`, '#c9c9d6'); this.syncAlly(a) }
    this.allies = liveAllies(this.allies)
    if (this.rampage > 0 && --this.rampage === 0) this.rampageAuraStop()
    if (this.swAwaken > 0 && --this.swAwaken === 0) { this.swWave = false; this.swAuraStop() } // ⚔️ ปลุกดาบ ends (the wave fired on the last turn at the latest)
    if (this.awakenTurns > 0 && --this.awakenTurns === 0) this.endAwakening()
    if (this.asuraExhaust > 0 && --this.asuraExhaust === 0) this.floatText(HERO_X, GROUND - 150, '💪 ฟื้นจากง่อยแดก!', '#6fd08c')
    if (this.pfField > 0 && this.alive().length && this.hp > 0) { this.pfField--; this.profFieldPulse() } // 🎓 🌋 Elemental Field: marks every monster at the turn start
    if (this.endow > 0 && !this.st.j2EndowWave) this.endow-- // Sage Endow (★ อาวุธธาตุ: whole wave)
    if (this.ignorePainTurns > 0) {
      this.ignorePainTurns--
      if (this.ignorePainTurns === 0) {
        this.ignorePainRegenTurns = KIT2.berserker.ignorePainRegenTurns
        const bonusHeal = this.st.j3Wl > 0 && this.st.j3GospelHeal > 0 ? Math.round(this.st.maxHp * this.st.j3GospelHeal) : 0
        this.ignorePainRegenPerTurn = Math.round(this.ignorePainDmg * KIT2.berserker.ignorePainRegenPct) + bonusHeal
        this.callout(`🩸 ไม่รู้สึกเจ็บสิ้นสุด! ฟื้น HP ${this.ignorePainRegenPerTurn}/เทิร์น`, W / 2, 170, '#6fd08c')
      } else {
        this.floatText(HERO_X + 20, GROUND - 140, `👹 ไม่รู้สึกเจ็บ (${this.ignorePainTurns})`, '#ff4444')
      }
    }
    if (this.wlUndyingTurns > 0) {
      this.wlUndyingTurns--
      if (this.wlUndyingTurns === 0) {
        const healPct = KIT3.warlord.ultBloodHealBase + this.res * KIT3.warlord.ultBloodHealPerRage + this.st.j3GospelHeal
        const healAmt = Math.round(this.st.maxHp * healPct)
        this.heal(healAmt)
        this.callout(`🩸 Bloodlust! ฟื้น +${healAmt} HP`, W / 2, 170, '#6fd08c')
      } else {
        this.floatText(HERO_X - 20, GROUND - 140, `🪓 อมตะคลั่ง (${this.wlUndyingTurns})`, '#ff6b6b')
      }
    }
    if (this.job.id === 'cleric') this.syncShieldLayers()
    if (X.burn > 0) X.burn--
    if (X.weaken > 0) X.weaken--
    if (X.armorBreak > 0) X.armorBreak--
    if (X.silence > 0) X.silence--
    if (X.slow > 0) X.slow--
    if (X.thorn > 0) X.thorn--
    if (X.web > 0 && --X.web === 0) this.syncWeb()
    if (this.job.id === 'cleric') {
      if (this.ultRegenTurns > 0) { this.ultRegenTurns--; this.heal(this.st.maxHp * this.st.ultRegen) } // cleric talent: พรยืนยาว
      this.spearAcc += this.st.spearRate
      if (Math.random() < this.st.spearLuck) { this.spears++; this.floatText(HERO_X + 30, GROUND - 170, '🍀 หอกแสง!', '#f6e27a') } // v37 Q: LUK calls light spears
      while (this.spearAcc >= 1) { this.spearAcc--; this.spears++ }
    }
    await this.fireSpears() // พร v2: ✨ cards give every job light spears
    for (const m of [...this.alive()]) { // PoE Passive Death Mark: tick hero turns, pop pure B6 echo on expiry
      if (m.dead || this.hp <= 0) continue
      if ((m.deathMark ?? 0) > 0) {
        m.deathMark = m.deathMark! - 1
        if (m.deathMark <= 0) this.popDeathMark(m)
        else this.dotIcon(m)
      }
    }
    if (this.biomeState && this.alive().length && this.hp > 0) {
      onTurnEndBiome(this.biomeState)
      this.biomeCritAdd = 0
      this.biomeSkillMul = 1
    }
    } finally {
      this.inHeroTurn = false
      this.turnHitsLast = this.turnHitsCur
      this.turnHitsPeak = Math.max(this.turnHitsPeak, this.turnHitsCur)
      this.fadeTurnCombo()
    }
  }

  // ---------- Cleric: light spears (design/skill-tree-priest.md 3.1) ----------
  private spears = 0
  private spearAcc = 0
  private ultRegenTurns = 0
  /** v58 Q: Priest shields last CLERIC_KIT.shieldTurns hero turns and the total never goes past shieldCap of max HP.
   *  Layers are bookkeeping only: this.shield stays the one number every hit path reads; hits eat the oldest layer first. */
  private shieldLayers: { amt: number; turns: number }[] = []
  private syncShieldLayers() {
    const cap = Math.round(this.st.maxHp * CLERIC_KIT.shieldCap)
    if (this.shield > cap) this.shield = cap
    let sum = this.shieldLayers.reduce((a, l) => a + l.amt, 0)
    if (this.shield > sum) { this.shieldLayers.push({ amt: this.shield - sum, turns: CLERIC_KIT.shieldTurns }); sum = this.shield } // shield from any other path (gear, overheal...)
    let eaten = sum - this.shield
    for (const l of this.shieldLayers) { const a = Math.min(l.amt, eaten); l.amt -= a; eaten -= a }
    this.shieldLayers = this.shieldLayers.filter((l) => l.amt > 0)
  }
  /** Start of each Priest turn: layers age; a layer that hits 0 turns fades. */
  private tickShieldLayers() {
    this.syncShieldLayers()
    let gone = 0
    for (const l of this.shieldLayers) if (--l.turns <= 0) gone += l.amt
    this.shieldLayers = this.shieldLayers.filter((l) => l.turns > 0)
    if (gone > 0) { this.shield = Math.max(0, this.shield - gone); this.floatText(HERO_X, GROUND - 100, `🛡️ โล่หมดเวลา −${Math.round(gone)}`, '#9fe3ff') }
  }
  private smiteCount = 0
  private async fireSpears() {
    const n = Math.min(KIT.spearMax, this.spears); this.spears = 0
    if (!n || !this.alive().length || this.hp <= 0) return
    this.floatText(HERO_X + 30, GROUND - 140, `🔱 x${n}`, '#f6e27a')
    this.burst(700, GROUND - 40, 0xf6e27a, 10 + n * 2, 200)
    const mul = (KIT.spearBase + this.st.spearMul) * (this.relic === 'magicspear' ? RELIC_RULES.magicspear.mul : 1) // mythic หอกเวท
    this.withSrc('spear', () => {
      for (let i = 0; i < n; i++) {
        const t = this.alive(); if (!t.length) break
        const m = t[Phaser.Math.Between(0, t.length - 1)] // v120: random target + splash (was: every monster)
        this.lanceHit(m, mul); if (this.pk.spearBurn > 0 && !m.dead) this.addBurn(m, this.pk.spearBurn, false) // legend หอกเพลิง
        if (this.st.spearHeal > 0) this.heal(this.st.maxHp * this.st.spearHeal, true)
        if (this.px('spearShield') > 0 && Math.random() < this.px('spearShield')) this.addShield(this.st.maxHp * PROC_RULES.spearShield, true) // หอกคุ้มกาย
      }
    })
    if (this.relic === 'magicspear') this.withSrc('fire', () => { for (const m of this.alive()) { this.strike(m, PROC_POW.firewave!, true, '#ff8c42'); this.addBurn(m, 1) } })
    if (this.st.clSpearShield > 0) this.addShield(this.st.maxHp * this.st.clSpearShield) // v58 Ult web: เกราะแสง
    await this.wait(BATTLE.stepMs * 0.3)
  }
  /** Skill heal (auto / ult): talents/tree turn it into shield and damage too. */
  private skillHeal(n: number) {
    const eff = n * (1 + this.st.healAmp)
    this.heal(n)
    this.addFaith(KIT.clericTree.faithHeal) // v84 สวดภาวนา
    if (this.st.healShield > 0) this.addShield(eff * this.st.healShield, true)
    const f = this.front()[0]
    if (this.st.atone > 0 && f) this.damageMon(f, Math.max(1, Math.round(eff * this.st.atone)), false, '#ffe08a') // tree ★A: ไฟชำระ
  }

  private async heroAct() {
    this.execTurnUsed = false; this.critPetUsed = false; this.killHealCritUsed = false
    if (this.j2?.id === 'rogue') this.rogueTurnStart() // P3'a
    if (this.dodgeCdIcd > 0) this.dodgeCdIcd-- // P2'a th_t2a ICD counts hero turns
    if (this.dodgeFleeTurns > 0) this.dodgeFleeTurns-- // P2'c th_t1a
    for (const m of this.alive()) { // P2'b: Blade's End once per hero turn per monster · Wound counts hero turns (ticks before skill2Turn)
      m.bladeSpent = false
      if (m.woundTurns > 0 && --m.woundTurns === 0) { m.wound = 0; this.dotIcon(m) }
    }
    this.syncStackBody() // P2'b th_t1c
    if (this.shroudTurns > 0) this.shroudTurns-- // P2'b Shroud: cast on turn N = S2N.smokeTurns -> covers the monster turns after N and N+1
    if (this.st.regen > 0) {
      const lowAmp = this.st.swLowRegenAmp > 0 && this.hp < this.st.maxHp * KIT.swordCore.lowHpAt ? 1 + this.st.swLowRegenAmp : 1
      this.heal(this.st.maxHp * this.st.regen * BATTLE.regenPerTurn / 100 * lowAmp, true)
    }
    if (this.lowRegen.turns > 0) { this.lowRegen.turns--; this.heal(this.st.maxHp * this.lowRegen.amt) } // ฟื้นยามคับขัน
    if (this.ignorePainRegenTurns > 0) { // Berserker ★ ไม่รู้สึกเจ็บ: Regen Damage ที่ทำได้ 30% x 2 เทิร์น
      this.ignorePainRegenTurns--
      if (this.ignorePainRegenPerTurn > 0) {
        this.heal(this.ignorePainRegenPerTurn)
        this.floatText(HERO_X, GROUND - 120, `🩸 ฟื้นตัว +${this.ignorePainRegenPerTurn}`, '#6fd08c')
      }
    }
    const rt = this.px('resTurn'); if (rt > 0 && !(this.asuraExhaust > 0 && this.job.resource === 'mana')) { const left = this.resGain(rt); if (left > 0 && this.pk.prayHeal > 0) this.heal(this.st.maxHp * this.pk.prayHeal * left, true) } // ภาวนา (v78: the share that didn't fit / Novice -> heal)
    if (this.zenTurns > 0) this.zenTurns--
    if (this.smashCdLeft > 0) this.smashCdLeft--
    if (this.s1Cd > 0) this.s1Cd--
    if (this.s4Cd > 0) this.s4Cd--
    if (this.boomCd > 0) this.boomCd--
    for (const m of this.alive()) { if ((m.broken ?? 0) > 0) { m.broken!--; this.dotIcon(m) } if ((m.spBreak ?? 0) > 0) m.spBreak!-- } // ⛓️ Break & Spiral Break count hero turns
    if (this.swGuard > 0) this.swGuard--
    if (this.swCullBuff > 0) this.swCullBuff--
    this.ultCdCutLeft = KIT.thiefUltCdCutCap; this.ultJustCast = false // P2'c Global Ult CD cap: new hero turn
    if (this.relic === 'storm' && this.fightTurns % RELIC_RULES.storm.every === 0) { await this.lightningWrath(); if (!this.alive().length) return }
    // resource tick
    this.sageFireBoltsTurn = 0; this.sageFireNovaUsed = false
    if (this.job.resource === 'mana' && this.asuraExhaust <= 0) this.gainRes((this.st.resRegen * RES_RULES.manaPerTurnMul + Math.max(0, this.resMax() - this.res) * this.st.strManaMiss) * (1 - this.st.resRegenCut)) // + 💪 กายสู่เวท missing-Mana share (+ 🎓 Soul Change)
    this.overflow = this.st.mgOverflow > 0 && this.job.resource === 'mana' && this.res >= this.resMax() * 0.9 // mage talent พลังล้น
    this.auraNow = this.auraLeft > 0 ? this.st.mgAura : 0; if (this.auraLeft > 0) this.auraLeft-- // Mage core passive 🔮 ออร่าเวท: this turn's bonus, then one turn used up
    if (this.alive().length && (await this.procs('turn')) + (await this.procs('every2')) > 0) { await this.wait(160); if (!this.alive().length) return } // พร v2: every-turn cards
    if (this.job.resource === 'energy') this.res = Math.min(this.resMax(), this.res + (RES_RULES.energyPerTurn + this.st.arTurnRes) * (1 - this.st.resRegenCut))
    if (this.job.resource === 'rage' && this.st.j2RageTurn > 0) this.gainRage(this.st.j2RageTurn * (this.ignorePainTurns > 0 ? 2 : 1))
    const chantDone = this.casts.length > 0 && castUsesTurn(this.j2?.id) // v78: a Mage / Sage chant landing IS this turn's action (Wizard: free)
    if (this.casts.length) { await this.releaseCasts(); if (!this.alive().length || this.hp <= 0) return } // 🔮 last turn's chant goes off (before the silence check)
    await this.skill2Turn()
    if (this.swWave) { await this.swordWaveCheck(); if (!this.alive().length || this.hp <= 0) return } // 🌊 คลื่นดาบ (free action)
    if (this.gc && this.alive().length && this.hp > 0) { await this.asSkill(() => this.gcPulse(), 'ult', 'ult'); if (!this.alive().length || this.hp <= 0) return } // v111 ✨ Grand Cross: next pulse
    if (this.j2 && this.alive().length && this.hp > 0) await this.skill3Turn()
    if (!this.alive().length || this.hp <= 0) return
    if (this.st.arHawk > 0 && ++this.hawkTurn % 3 === 0) { const t = this.alive(); if (t.length) { const m = t[Phaser.Math.Between(0, t.length - 1)]; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 20, '🦅', '#f2d24b'); petHitFx(this, 'hawk', m.spr, GROUND); this.strike(m, this.st.arHawk, true, '#f2d24b') } } // archer talent เหยี่ยวคู่ใจ
    if (this.asuraExhaust > 0) {
      this.floatText(HERO_X, GROUND - 140, `😵 ง่อยแดก! (${this.asuraExhaust})`, '#ff9a9a')
      await this.basicAttack()
      return
    }
    this.autoUltTurn()
    if (chantDone) return // free actions above still ran; no Skill 1 / ult / basic this turn
    if (await this.skill4Turn()) return // Q 2026-11-24 Skill 4 takes the hero turn (a booked, paid ult goes first)
    if (this.smashQueued && this.smashCdLeft <= 0 && this.hx.silence > 0) this.floatText(HERO_X, GROUND - 140, `🤐 ใบ้! อีก ${this.hx.silence} เทิร์น`, '#c9a8ff')
    const asuraNeed = this.j2?.id === 'monk' && this.st.j2Asura > 0 ? KIT2.monk.asuraMinAt : 0
    const ultCost = this.ultCost()
    const ultWaiting = this.smashQueued && this.smashCdLeft <= 0 && this.hx.silence <= 0 // ult ready and booked
    if (ultWaiting && this.res >= ultCost && this.charges >= asuraNeed) {
      this.smashQueued = false
      this.smashCdLeft = this.ultTurns(); this.ultJustCast = true // P2'c: CD floor for the rest of this hero turn
      this.spendRes(ultCost)
      this.ultOpen = 1 + this.pk.ultBoost // legend เปิดฉากเต็มแรง (v78: every ult)
      this.fightUlts++
      this.popSkill('ult')
      await this.asSkill(() => (this.job.id === 'novice' ? this.smash() : this.ultimate()), 'ult', 'ult')
      if (!this.casts.some((c) => c.kind === 'ult')) await this.afterUlt() // a chanted ult runs these when it lands
      await this.faithBurst() // v84 ศรัทธา: an ult heal can fill Faith too
      return
    }
    if (ultWaiting) this.floatText(HERO_X, GROUND - 140, this.charges < asuraNeed ? `🔵 ลูกพลังไม่พอ อาชูร่า (${this.charges}/${asuraNeed})` : `🔷 Mana ไม่พอ ult (${Math.floor(this.res)}/${ultCost})`, '#5aa0ff') // keep it booked, save Mana/charges for it
    const cost = this.shadowTurns > 0 && this.job.id === 'thief' ? 0 : autoCost(this.job, this.st) // 👤 ร่างเงา: Skill 1 free
    const s1Ok = mayCast(!this.autoUlt, this.book.s1) && !(swordS1On(this.job) && this.s1Cd > 0) // ⚔️ ดาบสยบมนตร์ has a cooldown · v86: manual mode only casts Skill 1 when it is booked, otherwise a basic attack (saves Mana for the ult)
    const castS1 = async () => { const inShadow = this.shadowTurns > 0; this.spendRes(cost); this.book.s1 = false; this.popSkill('s1'); await this.asSkill(() => this.autoSkill(), 'skill', 's1'); if (this.job.id === 'thief' && !inShadow) this.s1Weave = true } // P2'a สลับคม: next turn is a basic attack (Q3: not after a free ร่างเงา cast)
    if (this.job.id === 'cleric') { // v59 Q: the Priest smashes EVERY turn; Skill 1 rides along (heal first when low, holy light after the smash)
      // M2 (eval §2.2 A.3): a booked ult no longer blocks Skill 1 outright (was `!ultWaiting`): the low-HP heal always goes,
      // the holy light goes when the Mana left still reaches the ult by next turn (same rule as the Swordsman S1)
      const ultSafe = () => !ultWaiting || this.res - cost >= ultCost - this.st.resRegen * RES_RULES.manaPerTurnMul
      const castable = (emergency: boolean) => s1Ok && (emergency || ultSafe()) && this.res >= cost && this.alive().length > 0 && this.hp > 0
      const low = this.hp < this.st.maxHp * (KIT.clericHealBelow - this.st.healAt)
      if (low && castable(true)) await castS1()
      if (this.alive().length) await this.basicAttack()
      if (!low && castable(false)) await castS1()
      await this.faithBurst() // v84 ศรัทธา: full Faith bursts after the turn's actions
      return
    }
    const s1UltOk = !ultWaiting || (swordS1On(this.job) && this.job.resource === 'mana' && this.res - cost >= ultCost - this.st.resRegen * RES_RULES.manaPerTurnMul)
    if (this.job.resource && this.j2?.id !== 'sage' && s1Ok && s1UltOk && !thiefS1Woven(this.job.id, this.s1Weave, this.shadowTurns > 0) && this.res >= cost && this.alive().length) {
      await castS1()
      return
    }
    await this.basicAttack()
  }

  private job: JobDef = JOBS.novice
  // ----- skill web v1: Skill 2 (data/skill2.ts, design/skill-web-v1.md) -----
  private s2?: Skill2Def
  private s2Cd = 0 // hero turns until Skill 2 can cast again
  private buf = { guard: 0, blood: 0, hawk: 0, mshield: 0, renew: 0, bless: 0, dawnWis: 0, lootAtk: 0, lootCrit: 0 } // hero turns left on Skill 2 buffs (+ v102 ☀️ แสงแตก WIS)
  private kyrie = { hp: 0, hits: 0 } // v77 พรแสง "+" Kyrie Eleison: barrier HP + hits left (gone with the blessing)
  private s2Count = 0 // casts this run (bot/debug)
  private book = { s1: false, s2: false, s3: false, s4: false } // v86 manual mode: skills the player booked (the ult uses smashQueued)
  private skillBtns: SkillBtnView[] = [] // v86 MOBA-style cluster (everything but the Novice)
  private skillTip?: Phaser.GameObjects.Text
  private res = 0
  private shield = 0
  private dodgeCharges = 0
  private shroudTurns = 0 // P2'b ม่านควัน Shroud: hero turns left (ticks at the top of heroAct)
  private raidReady = false // P2'b ม่านควัน: the next active hit is a Sightless Raid
  private thHpBonus = 0; private thTenBonus = 0 // P2'b th_t1c: Max HP / tenacity added right now (delta-tracked)
  private shadowGauge = 0 // 👤 Thief เกจเงา (KIT.thiefShadow)
  private shadowTurns = 0 // hero turns of ร่างเงา left
  private waveOpen = false // P2'c th_t1b: the next physical hero hit this wave is a sure crit
  private dodgeFleeTurns = 0 // P2'c th_t1a: hero turns of Flee after a dodge left
  private thMarkMon?: Mon // 🔻 Thief หมายหัว target
  private malice = 0
  private rogueCp = 0 // 🔁 Rogue Combo Point
  private guardPool = 0 // ตั้งการ์ด: dmg taken since this hero turn ended, not yet paid back by a counter
  private ctrCharges = 0 // Swordsman talent ท่าสวนพร้อม: sure counters left
  private s1CtrDmgLeft = 0 // Swordsman ★ จักรผันสะท้าน: boosted counter hits left
  private swHelixHits = 0 // 🌀 พายุสวนกลับ: landed hits counter
  private swVeng = 0 // 🔥 เพลิงแค้น: damage stored to burst on Ult/wave
  private swCullBuff = 0 // 🪓 เพลิงชัยชนะ: P.ATK + P.DEF buff turns after a Cull kill
  private monHitsThisTurn = 0 // hits landed on hero during current monster turn (เกราะไม่สะทก)
  /** Mana the ult costs (Mage, Swordsman); 0 for every other job. */
  private ultCost() { return ultCost(this.job, this.st, this.j2?.id) } // 🔱 Knight: KIT2.knight.ultMana // v102: + Cleric Ult node Lv Mana
  private resMax() { return this.job.resource === 'rage' ? RES_RULES.rageMax : this.job.resource === 'energy' ? RES_RULES.energyMax : this.st.maxRes }
  private ultTurns() {
    const t = this.job.id === 'novice' ? this.smashTurns() : ultCooldown(this.job, this.st) // gear smashCd cuts every job's ult
    return this.relic === 'haste' ? Math.max(2, t - RELIC_RULES.haste.cd) : t
  }
  private overflow = false
  private zapCount = 0 // lightning hits this run (ประจุสะสม)
  private zapTurn = new Map<Mon, number>() // storm set: hits per target this turn
  private emergencyUsed = false
  private mdLast = { shock: -Infinity, nova: -Infinity } // Mage passives (docs/passive_mage_3.md): hero turn each internal cooldown last fired
  private auraLeft = 0 // Mage core passive 🔮 ออร่าเวท: hero turns of the buff left this wave
  private auraNow = 0 // ...and the damage bonus active on the current hero turn (0 when it ran out)
  private mdPower: MageDefPower = MAGE_DEF_POWER_NONE // Mage passives: INT / WIS / Base Lv scaling, set at run init
  /** ❄️ Glacial Aegis: raise the barrier to its size (tops up, never stacks). */
  private raiseGlacial() {
    const target = Math.round(glacialBarrierMax(this.st.mgGlacial, this.st.maxHp, this.st.matk, this.mdPower.shield) * (1 + this.st.shieldAmp))
    if (target <= 0 || this.shield >= target) return
    this.shield = target
    this.floatText(HERO_X, GROUND - 100, `❄️ บาเรียน้ำแข็ง ${target}`, '#9fe3ff')
  }
  /** ⚡ Static Mirage: on a hit or a dodge, zap the attacker (1 proc per hero turn); maybe shock it (gauge push). */
  private staticCounter(src?: Mon) {
    const r = this.st.mgStatic
    if (r <= 0 || !src || src.dead || !icdReady(this.fightTurns, this.mdLast.shock, MAGE_DEF.static.icdTurns)) return
    this.mdLast.shock = this.fightTurns
    playPfx(this, 'zapYellow', src.spr.x, src.spr.y - src.spr.displayHeight * 0.4, { scale: 1.1, speed: 1.4 })
    this.withLightning(() => this.withSrc('other', () => this.strike(src, staticCounterMul(r, this.mdPower.dmg), true, '#ffe94a')))
    if (!src.dead && Math.random() < staticShockChance(r, this.mdPower.shockAdd)) { src.gauge -= MAGE_DEF.static.shockPush; this.floatText(src.spr.x, src.spr.y - src.spr.displayHeight - 20, '⚡ ชะงัก!', '#ffe94a') }
  }
  /** 🔥 Molten Mantle + ❄️ Glacial Aegis on-hit parts (the hit landed, before the shield soaks it). */
  private mageOnHit(src: Mon) {
    if (this.st.mgMolten > 0 && !src.dead) {
      playPfx(this, 'fireball', src.spr.x, src.spr.y - src.spr.displayHeight * 0.4, { scale: 1, speed: 1.6 })
      this.withSrc('other', () => this.strike(src, moltenThornsMul(this.st.mgMolten, this.mdPower.dmg), true, '#ff8c42'))
      if (!src.dead) { src.burnStacks = Math.min(this.burnMax(), src.burnStacks + MAGE_DEF.molten.burnStacks); src.burnStackTurns = Math.max(src.burnStackTurns, PROC_RULES.burnTurns); this.dotIcon(src) }
    }
    if (this.st.mgGlacial > 0 && this.shield > 0 && !src.dead) { src.chill = Math.max(src.chill, MAGE_DEF.glacial.chillTurns); this.dotIcon(src) }
  }
  /** ❄️ Shatter Nova: the shield just broke. Every monster takes a cold blast; normal ones freeze, boss / mini only get chill + a gauge push. */
  private glacialNova() {
    const r = this.st.mgGlacial
    if (r <= 0 || !icdReady(this.fightTurns, this.mdLast.nova, MAGE_DEF.glacial.novaIcdTurns)) return
    this.mdLast.nova = this.fightTurns
    this.callout('❄️ Shatter Nova!', HERO_X + 120, GROUND - 160)
    for (const m of [...this.alive()]) {
      playPfx(this, 'frostNova', m.spr.x, m.spr.y - m.spr.displayHeight * 0.3, { scale: 1.1, speed: 1.4 })
      this.withSrc('other', () => this.strike(m, glacialNovaMul(r, this.mdPower.dmg), true, '#9fe3ff'))
      if (m.dead) continue
      if (m.def.ai === 'boss') m.gauge -= MAGE_DEF.glacial.freezePush
      else { m.frozen = true; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 20, 'แช่แข็ง!', '#9fe3ff') }
      m.chill = Math.max(m.chill, MAGE_DEF.glacial.chillTurns); this.dotIcon(m)
    }
  }
  /** ☄️ Brand-style Ablaze detonation when burnStacks reaches threshold (mage_f4). */
  private tryAblazeDetonate(m: Mon) {
    const A = MAGE_PASSIVE.ablaze
    if (this.st.fireSpread <= 0 || m.dead || m.burnStacks < A.stacksNeeded) return
    m.burnStacks = Math.max(0, m.burnStacks - A.consumeStacks)
    if (m.burnStacks === 0) m.burnStackTurns = 0
    this.dotIcon(m)
    this.resGain(A.manaGain)
    this.callout('☄️ เปลวไฟระเบิด!', m.spr.x, m.spr.y - 130, '#ff8b47')
    this.burst(m.spr.x, m.spr.y - 20, 0xff7038, 22, 260)
    this.shake(140, 0.008)
    sfx.slam()
    const dmg = ablazeBlastDmg(m.def.hp, this.st.matk, m.def.ai === 'boss')
    for (const o of [...this.alive()]) {
      o.hp = Math.max(0, o.hp - dmg)
      this.floatText(o.spr.x, o.spr.y - o.spr.displayHeight - 16, `🔥 -${dmg}`, '#ff9457')
      if (o.hp <= 0) { this.killMon(o); continue }
      if (o !== m) {
        o.burnStacks = Math.min(this.burnMax(), o.burnStacks + A.spreadStacks)
        o.burnStackTurns = Math.max(o.burnStackTurns, 3)
        this.dotIcon(o)
      }
    }
  }
  private firstOffer = true
  /** Drainer under Summon Maiden (Q 2026-11-21): still takes damage (a share goes to the Maiden) but cannot die while the Maiden lives. */
  private maidenLinked(m: Mon) { return !!m.maiden && !m.maiden.dead }
  private front() { return this.alive().sort((a, b) => a.slot - b.slot) }
  /** Boss / mini boss first. */
  private bossTarget() { return this.alive().find((m) => m.def.ai === 'boss') }
  private gainRage(n: number) { if (this.job.resource === 'rage') this.res = Math.min(RES_RULES.rageMax, this.res + n * (1 + this.st.rageGain)) }
  /** Flat resource gain for Mana/Energy jobs (talents that used to give Rage). */
  /** Pay Mana / Energy / Rage; v86 💠 มานาพิทักษ์ heals a share of the Mana spent. */
  private spendRes(n: number) {
    if (n <= 0) return
    this.res -= n
    if (this.st.clManaHeal > 0 && this.job.resource === 'mana' && this.hp > 0) this.heal(n * this.st.clManaHeal, true)
  }
  private gainRes(n: number) { if (this.job.resource && this.job.resource !== 'rage') { this.soulChange(this.res + n - this.resMax()); this.res = Math.min(this.resMax(), this.res + n) } }
  /** 🎓 💧 Soul Change: Mana that would spill past max becomes a ward. */
  private soulChange(over: number) {
    const w = soulChangeShield(this.st, over)
    if (w <= 0) return
    this.addShield(w, true)
    this.floatText(HERO_X, GROUND - 110, `💧 Soul Change +${w}`, '#9fe3ff')
  }
  /** v78 focus: resource gain for any job; returns the share (0..1) that didn't fit (no resource = all of it). */
  private resGain(n: number) {
    const r = this.job.resource
    if (!r) return overflowShare(n, 0, false)
    const add = r === 'rage' ? n * (1 + this.st.rageGain) : n, room = this.resMax() - this.res
    this.res = Math.min(this.resMax(), this.res + add)
    return overflowShare(add, room)
  }
  private poisonMax() { return poisonCapOf(this.st) }
  /** 👤 Thief เกจเงา: fill it, full = ร่างเงา (sure physical crits + Skill 1 free) for KIT.thiefShadow.turns hero turns. */
  private addShadow(n: number) {
    const S = KIT.thiefShadow
    if (this.job.id !== 'thief' || n <= 0 || S.max <= 0 || this.shadowTurns > 0) return
    this.shadowGauge = Math.min(S.max, this.shadowGauge + n)
    if (this.shadowGauge < S.max) { sfx.shadowTick(this.shadowGauge, S.max); this.floatText(HERO_X - 40, GROUND - 175, `👤 ${this.shadowGauge}/${S.max}`, '#9a9ab8'); return }
    this.shadowGauge = 0; this.shadowTurns = S.turns + this.st.thShadowTurns + 1 // +1: heroTurn ticks it down before acting · P2'c thief_b4 ★ longer
    this.heroSpr.setAlpha(0.75)
    sfx.shadowForm()
    if (this.st.thShadowShield > 0) this.addShield(Math.min(this.st.maxHp * KIT.thiefShadowShieldHpCap, this.st.thShadowShield * this.fleeNow())) // P2'c thief_b2 โล่เงา
    this.callout('👤 ร่างเงา! คริแน่ + ทักษะ 1 ฟรี', HERO_X + 60, GROUND - 190, '#c9b8ff')
  }
  /** 👤 a dodge: gauge +KIT.thiefShadow.dodge (P2'c thief_b1: maybe +1 more) · thief_b3: inside ร่างเงา it may cut the Ult CD (Global cap). */
  private shadowDodged() {
    if (this.job.id !== 'thief') return
    if (this.st.thDodgeFlee > 0) this.dodgeFleeTurns = KIT.thiefDodgeFleeTurns // P2'c th_t1a (refresh, no stack)
    if (this.shadowTurns > 0 && this.st.thShadowDodgeCd > 0 && Math.random() < this.st.thShadowDodgeCd && this.cutUltCd(1) > 0) this.floatText(HERO_X - 40, GROUND - 195, '🌀 เงาวนลูป! Ult CD −1', '#c9b8ff')
    this.addShadow(KIT.thiefShadow.dodge + (this.st.thShadowFill > 0 && Math.random() < this.st.thShadowFill ? 1 : 0))
  }
  /** P2'd LUK Gambler's Edge: Thief-line gains Energy on LUCKY! dodge (1/hero turn).
   *  PoE Passive thLuckyKnife: Rogue/Stalker throws 1 free knife, Mobster/Kingpin applies poison. */
  private gamblerLucky(label: string, src?: Mon) {
    const g = gamblerLuckyRes(label, this.job.id, this.luckyIcd)
    if (g > 0 && this.job.resource === 'energy') {
      this.luckyIcd = true
      this.resGain(g)
      if (this.hp > 0 && this.alive().length) {
        const act = luckyReprisalAction(this.st.thLuckyKnife, this.j2?.id)
        if (act === 'knife') {
          const prev = { ls: this.lsMul, force: this.forceCrit, stab: this.backStabbing }
          this.lsMul = 0; this.forceCrit = false; this.backStabbing = false
          try { this.throwKnives(1) } finally { this.lsMul = prev.ls; this.forceCrit = prev.force; this.backStabbing = prev.stab }
        } else if (act === 'poison') {
          const tgt = src && !src.dead ? src : this.front()[0]
          if (tgt) {
            this.addPoison(tgt, KIT.thiefLuckyPoison)
            this.floatText(tgt.spr.x, tgt.spr.y - tgt.spr.displayHeight - 34, `🍀 พิษ +${KIT.thiefLuckyPoison}`, '#b48aff')
          }
        }
      }
    }
  }
  /** 🔻 Thief หมายหัว: keep a live mark on the highest-HP monster. */
  private ensureMark() {
    if (this.st.thMark <= 0 || (this.thMarkMon && !this.thMarkMon.dead)) return
    const jumped = !!this.thMarkMon
    this.thMarkMon = this.alive().sort((a, b) => b.hp - a.hp)[0]
    if (jumped) this.malice = Math.floor(this.malice / 2) // the mark jumps: keep half the Malice
    if (this.thMarkMon) this.dotIcon(this.thMarkMon)
  }
  /** 💰 ล้วงกระเป๋า: one loot by the monster's stat (KIT.thiefSteal). */
  private stealFrom(m: Mon, k: string, idx = 0) {
    sfx.stealLoot(idx)
    const T = KIT.thiefSteal, say = (t: string, c: string) => this.floatText(HERO_X, GROUND - 150, `💰 ${t}`, c)
    if (k === 'str') { this.buf.lootAtk = T.turns; say(`ขโมยแรง! P.ATK +${Math.round(T.atk * 100)}%`, '#ffb36b') }
    else if (k === 'agi') { this.res = Math.min(this.resMax(), this.res + T.res); say(`ขโมยจังหวะ! Energy +${T.res}`, '#8fe3ff') }
    else if (k === 'int') { if (!m.dead) { this.addPoison(m, T.poison) } say(`ขโมยขวดยา! พิษ +${T.poison}`, '#b48aff') }
    else if (k === 'vit') { if (!m.dead) { m.armorBrk = Math.max(m.armorBrk, T.brkTurns); this.dotIcon(m) } say('ขโมยเกราะ! เกราะแตก', '#d9c7a0') }
    else if (k === 'wis') { this.heal(this.st.maxHp * T.heal); say('ขโมยยาฮีล!', '#7dff9a') }
    else { this.buf.lootCrit = T.turns; say(`ขโมยดวง! คริ +${Math.round(T.crit * 100)}%`, '#ffe08a') }
  }
  /** ☠️ poison per stack this hero applies: Thief line flat + KIT.poison.atkPer x P.ATK · other jobs flat Stats.poisonDmg */
  private myPoisonDmg() { return this.job.id === 'thief' ? thiefPoisonPerStack(this.st) : this.st.poisonDmg }
  private burnMax() { return 10 + this.st.burnCap }
  private berserking() { return this.st.berserk > 0 && this.hp < this.st.maxHp * 0.3 }
  private lockTarget?: Mon
  private lockStacks = 0
  private hawkTurn = 0
  private ultFiring = false // archer: ult hits a charging boss harder (ทะลวงเกราะ / ศรบั่น)

  /** One physical/magic hit. Crit is rolled first; a basic / combo / counter crit skips flee, a physical skill crit
   *  still rolls Hit (Q 2026-11-19). No crit ignores DEF. Magic never misses. Returns damage dealt. */
  private strike(m: Mon, mul: number, magic = false, color?: string, pierce = 0, falconCrit = 0): number {
    if (m.dead || this.hp <= 0) return 0
    if (this.rgSnatchTurns > 0) mul *= 1 + this.rgSnatchAmp // 🧤 ฉกบัฟ: a stolen war cry
    if (this.skPlagTurns > 0) mul *= 1 + this.st.j3SkPlag // 🥷 sk_d2 ลอกท่า
    if (!magic && this.st.j3Sk > 0 && this.st.j3SkPrey > 0) mul *= 1 + stalkerPreyAmp(this.st.j3SkPrey, this.stripKinds(m)) // 🥷 sk_d1 เหยื่อเปลือย
    if (this.j3Bless > 0) mul *= 1 + this.st.j3AfterBless // ⚜️ พรหลังศึก
    let coatFlat = 0
    if (!magic && this.swAwaken > 0) { // ⚔️ ปลุกดาบ (Q 2026-11-22): STR buff -> P.ATK, ★ ดาบตื่นเต็มพลัง (+P.ATK, +Bonus STR%, True Strike), ✨ เคลือบดาบสวรรค์
      const lv = swordUltLv(this.st), strAdd = SWORD_MANA.awakenStr[lv - 1] + (this.st.swAwStrPct > 0 ? Math.round(this.heroStr * this.st.swAwStrPct) : 0), atk = Math.max(1, this.st.atk)
      mul *= 1 + SWORD_MANA.awakenAtk + this.st.swAwAtk + (strAdd * PER_POINT.str.atk) / atk
      if (!this.allyHitting && !this.isProcHit()) coatFlat = swordCoatFlat(lv, this.heroStr + strAdd, m.hp, this.st.atk, m.def.ai === 'boss' || !!m.def.mini, this.knightPiercing)
    }
    if (!magic && this.swCullBuff > 0) mul *= 1 + KIT.swordUltTree.cullAtk // 🪓 เพลิงชัยชนะ (+P.ATK)
    if (!magic && (m.tauntTurns ?? 0) > 0 && (m.tauntVuln ?? 0) > 0) mul *= 1 + m.tauntVuln! // 📣 ท้าทาย (RO Provoke: มอนโดนกายภาพแรงขึ้น)
    if (!magic && !this.allyHitting && this.st.swBloodFuryDmg > 0) mul *= bloodFuryDmgMul(this.hp, this.st.maxHp, this.st.swBloodFuryDmg) // 🩸 สัญญาคลั่งเลือด
    if (this.st.swVsMute > 0 && (m.charging || (m.mSilence ?? 0) > 0)) mul *= 1 + this.st.swVsMute // ⚔️ เจาะจังหวะ
    if (!magic && this.src === 'ult' && this.job.id === 'swordsman' && !this.isProcHit()) { const full = swordAwakenUlt(this.j2?.id) && !this.knightPiercing; mul *= swordExecMul(m.hp / Math.max(1, m.def.hp), m.def.ai === 'boss' || !!m.def.mini, full ? 1 : SWORD_MANA.execLineShare, this.st.swExecAdd + this.st.swExecBonus) } // ⚖️ คำพิพากษา (+ ⚖️ คมพิพากษา + ⚖️ ตราพิพากษา): every Swordsman-line ult hit (job1/2/3; job1 + Knight 🔱 full curve except multi-hit Pierce), read per hit so multi-hit Pierce ramps
    if (magic && this.hwAmp > 0) mul *= 1 + KIT3.highwizard.amp + this.st.j3HwAmp // 🌌 Mystical Amplification
    if (magic && !ELEM_SRC.has(this.src)) mul *= 1 + this.st.elemDmg
    const canFalconCrit = falconCrit > 0 && m.huntMark > 0
    const wlCrit = !magic && this.st.j3Wl > 0 ? this.res * KIT3.warlord.rageCritPer + this.frenzy * this.st.j3WlBlitz : 0
    const physCritAdd = (this.buf.hawk > 0 ? S2N.hawkCrit(this.st.s2Lv) : 0) + (this.buf.lootCrit > 0 ? KIT.thiefSteal.crit : 0) + this.critAdd + this.biomeCritAdd + (this.rampage > 0 ? KIT2.berserker.ultCrit : 0) + wlCrit
    const critRate = canFalconCrit ? falconCrit : this.critRateFor(magic, physCritAdd, m)
    if (!magic && this.st.thMark > 0 && this.job.id === 'thief') this.ensureMark()
    const markHit = !magic && this.st.thMark > 0 && this.job.id === 'thief' && m === this.thMarkMon, release = markHit && this.malice >= KIT.thiefMark.max // 🔻 หมายหัว: full Malice
    if (release) mul *= 1 + KIT.thiefMark.dmg * this.st.thMark // R4.6 B4 (skill-own: 1 own hit per full Malice), stays x mul (MAIN-VS-REV4 §2 C2)
    const shadowSure = !magic && this.shadowTurns > 0 && this.job.id === 'thief' // 👤 ร่างเงา
    const opener = !magic && this.waveOpen && !this.allyHitting && this.job.id === 'thief' // P2'c th_t1b: first physical hit of the wave
    if (opener) this.waveOpen = false
    const crit = this.forceCrit || release || shadowSure || opener || (!this.petNoCrit && this.critAllowed() && Math.random() < critRate) // magic crits only with spellCrit (or Falcon Crit on Marked targets) · Skill 2 ตาเหยี่ยว · 2nd job
    if (!crit && !magic && !this.allyHitting && this.st.thPerfectAgony > 0 && this.src !== 'poison') mul *= 1 - KIT.thiefAgonyHitCut // P2'd th_t4b วิถีพิษคริ: non-crit physical hits deal less
    const effFlee = m.huntMark > 0 ? (m.def.flee ?? 5) * Math.max(0, 1 - this.st.j2MarkPierceFlee) : (m.def.flee ?? 5)
    const noFlee = m.huntMark > 0 && this.st.j2MarkPierceFlee >= 1
    const critSkipsFlee = crit && (!this.isSkillHit() || this.backStabbing) // Q 2026-11-19: only a basic / combo / counter crit skips Flee; a physical skill hit rolls Hit (Back Stab is a stated sure hit)
    if (!magic && !critSkipsFlee && !this.sureHit && !this.swAwakeSure() && !noFlee && this.zenTurns <= 0 && Math.random() > hitChance(this.st.hit, effFlee)) { this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 6, 'MISS', '#a9a6c7'); return 0 }
    if (!magic && !this.backStabbing && !this.swAwakeSure() && m.def.luckyDodge && Math.random() < m.def.luckyDodge) { this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 6, '🍀 หลบ!', '#a9a6c7'); return 0 } // D6+ stat monsters: LUK lucky dodge (bypassed by ★ ดาบตื่นเต็มพลัง True Strike)
    if (m.def.fixedFlee && Math.random() < m.def.fixedFlee) { this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 6, 'MISS 👻', '#e0a8ff'); return 0 } // Maiden: always 50%
    const skillCutMul = this.skillHits ? 1 - this.skillCut() : 1
    if (this.skillHits) mul *= skillCutMul // spell vamp drawbacks: skill / ult damage cut
    if (!magic && this.st.j2HpPunch > 0 && !this.allyHitting && this.src !== 'other') mul += this.st.j2HpPunch * this.st.maxHp / Math.max(1, this.st.atk) // Monk หมัดเลือดนักสู้ (+ Paladin Hybrid)
    const j2m = this.j2 ? this.j2Mul(m, crit, magic) : 1
    if (this.j2) mul *= j2m
    const brittle = Math.max(this.st.brittle, this.px('vsChill')) // tree: ice "เปราะ" · card เปราะน้ำแข็ง + gear/cards (the higher one)
    if (m.chill > 0 && brittle > 0) mul *= 1 + brittle
    if (this.ultFiring && m.charging && this.st.arUltBreak > 0) mul *= 1 + this.st.arUltBreak // archer tree/talent: ult vs a charging boss
    if (this.st.arLowHpBonus > 0 && m.hp < m.def.hp * 0.5) mul *= 1 + this.st.arLowHpBonus // archer talent เก็บตัวเปราะ r2
    if (crit && this.st.arCritRes > 0 && this.job.resource === 'energy') this.res = Math.min(this.resMax(), this.res + this.st.arCritRes) // archer talent ลมหายใจนักล่า
    const chargeDmgAdd = (magic || this.isProcHit()) && this.st.lightChargeLv > 0 && this.lightChargeStacks >= 5 ? this.st.lightChargeLv * 0.2 : 0
    const critDmgAdd = (magic ? 0 : this.condCritDmg(m, opener)) + (falconCrit > 0 && m.huntMark > 0 ? Math.max(0, 1.5 - this.st.critMul) : 0) + (m.huntMark > 0 ? this.st.j2StanceMarkCritDmg : 0) + (!magic && this.st.j3Wl > 0 ? this.res * KIT3.warlord.rageCritDmgPer : 0) + (this.isProcHit() && (!this.reacting || this.st.j3PfCritMana > 0) ? this.st.procCritMul : 0) + chargeDmgAdd // 🎓 reactions take procCritMul only with 🎯 จุดอ่อนธาตุ
    const wasForce = this.forceCrit; if (release || shadowSure || opener) this.forceCrit = true // sure crits keep full crit power (critPow)
    const r = this.roll(mul, magic, crit, critDmgAdd); this.forceCrit = wasForce
    if (coatFlat > 0) r.dmg += Math.round(coatFlat * skillCutMul * j2m)
    const up = this.src === 'ult' ? this.st.ultPierce : 0 // v78 บดกระดูก: ult pierce
    const awPierce = !magic && this.st.j3Rn > 0 && (this.awakenTurns > 0 || this.stampedeFiring) ? this.st.j2Spiral : 0
    const sunder = (m.sunderTurns ?? 0) > 0 ? Math.max(0, 1 - (m.sunder ?? 0)) : 1
    if (!magic) r.dmg = m.def.def ? Math.max(1, Math.round(afterDef(r.dmg, m.def.def * (1 - Math.min(1, pierce + up + awPierce)) * Math.max(0, 1 - this.st.physPen) * sunder * (m.armorBrk > 0 ? 1 - KIT2.mobster.armorBrk : 1) * (m.strip > 0 ? 1 - rogueStripCut(this.st.j2StripPlus) : 1) * (this.job.id === 'thief' ? 1 - poisonDefCut(m.poison) : 1)))) : r.dmg // crits face DEF too (Q 2026-11-19) · Mobster เกราะแตก · Ranger j2Spiral · physPen · void_sunder
    if (magic && m.def.mdef) r.dmg = Math.max(1, Math.round(r.dmg * (1 - m.def.mdef * (1 - Math.min(1, pierce + up)) * Math.max(0, 1 - this.st.magPen) * sunder))) // D6+ stat monsters: WIS M.DEF · magPen · void_sunder
    if (r.crit && m.def.statDef?.critDR) r.dmg = Math.max(1, Math.round(r.dmg * Math.max(1 / (this.st.critMul || 1), 1 - m.def.statDef.critDR))) // LUK crit DR, never below a normal hit
    if (m.def.toxicSkin) { // venomqueen Toxic Skin: crit bonus halved, -5% damage
      const T = BATTLE.toxicSkin, cm = this.st.critMul || 1
      if (r.crit && cm > 1) r.dmg = r.dmg * (1 + (cm - 1) * (1 - T.critCut)) / cm
      r.dmg = Math.max(1, Math.round(r.dmg * (1 - T.dr)))
    }
    this.lastCrit = r.crit
    this.damageMon(m, r.dmg, r.crit, color)
    if (r.crit && !this.killHealCritUsed && this.st.killHeal > 0 && (m.def.ai === 'boss' || !!m.def.mini) && this.hp > 0) {
      this.killHealCritUsed = true
      this.heal(this.st.maxHp * this.st.killHeal * 0.25, true)
    } else if (r.crit && !this.killHealCritUsed && this.st.thKillLeech > 0 && (m.def.ai === 'boss' || !!m.def.mini) && this.hp > 0) { // P2'a thief_c3 กระหายเลือด: first boss / mini crit of the turn
      this.killHealCritUsed = true
      this.heal(this.st.maxHp * thiefBossCritHeal(this.st), true)
      if (this.job.resource === 'energy') this.resGain(KIT.thiefBossCritRes)
    }
    if (m.def.toxicSkin && this.hp > 0) this.applyFx({ poison: BATTLE.toxicSkin.poison }) // every landed hit poisons the hero
    if (m.def.iceSkin && this.hp > 0) { if (!this.hx.thorn) this.floatText(HERO_X + 30, GROUND - 150, '❄️ หนามน้ำแข็ง! DMG -15%', '#9fe3ff'); this.hx.thorn = BATTLE.iceSkin.turns }
    if (this.raidReady && !magic && !this.allyHitting && !m.dead && (this.src === 'basic' || this.src === 'combo' || this.src === 'skill' || this.src === 'ult')) this.sightlessRaid(m) // P2'b ม่านควัน
    if (this.s2?.id === 'th_wound' && !magic && !m.dead && !this.allyHitting && !m.bladeSpent && m.wound >= S2N.bladeAt && (this.src === 'basic' || this.src === 'combo' || this.backStabbing)) this.bladesEnd(m) // P2'b แผลลึก (แทงพิษ / Skill 2 alone never detonate)
    if (this.skillHits) { this.skillHits.dmg += r.dmg; this.skillHits.mons.add(m) }
    if (!magic && this.st.poison > 0 && !m.dead && !this.noHitPoison) this.addPoison(m, this.st.poison) // P3'a Sinister Steel swing: none
    if (markHit) { // 🔻 หมายหัว: build Malice, or spend it on the release hit
      if (release) { this.malice = 0; sfx.maliceRelease(); this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 40, '🔻 ปลดหมายหัว!', '#ff6b8a') }
      else this.malice = Math.min(KIT.thiefMark.max, this.malice + 1)
      if (!m.dead) this.dotIcon(m)
    }
    if (this.relic === 'hellfire' && !m.dead) { m.hell++; this.dotIcon(m) }
    const woundLs = !magic && m.poison >= BM_STANCE.wolf.woundMinStacks ? this.st.j2StanceWoundLeech : 0
    const condLs = !magic ? thiefCondLeechAdd(this.st, this.statusKinds(m)) : 0 // P2'a thief_c1: leech vs a target with a status (base lifesteal + this stays under LIFESTEAL_CAP)
    const ls = (condLs > 0 ? Math.min(LIFESTEAL_CAP, this.st.lifesteal + condLs) : this.st.lifesteal) + woundLs + (this.buf.blood > 0 ? S2N.bloodVamp(this.st.s2Lv) : 0) + ((this.swAwaken > 0 || this.rampage > 0) && (this.src === 'basic' || this.src === 'combo' || this.src === 'counter') && !magic ? this.st.swAwLeech : 0) // Skill 2 เลือดเดือด · 🩸 ดาบกระหายเลือด · Wolf Bloodpack Stance wound leech
    const bkMul = Math.max(this.bloodKingOn() ? KIT.thiefBloodKingMul : 1, this.st.bloodKing > 0 && this.hp < this.st.maxHp * 0.4 ? 2 : 1) // P2'a thief_c4 vs gear ★ ราชันย์โลหิต: the bigger one, never both
    if (ls > 0 && this.lsMul > 0) this.heal(r.dmg * ls * this.lsMul * (this.berserking() ? 2 : 1) * bkMul * physLeechMul(magic, this.st.thPhysLeechCut), true)
    if (this.job.id === 'thief' && !magic) {
      if (r.crit) sfx.daggerCrit(this.j2?.id === 'mobster')
      else sfx.daggerHit(this.j2?.id === 'mobster')
    } else {
      if (r.crit) sfx.crit(); else sfx.hit()
    }
    this.gainRage(RES_RULES.rageOnHit)
    if (r.crit && !magic && this.j2?.id === 'berserker') { // คลั่งเลือด: crits stack Frenzy
      const max = KIT2.berserker.frenzyMax + this.st.j2FrenzyMax
      this.frenzyAt = this.fightTurns
      if (this.frenzy < max) { this.frenzy++; this.floatText(HERO_X, GROUND - 165, `🔥 Frenzy ${this.frenzy}`, '#ff8c42') }
      if (this.st.j3Wl > 0 && this.wlUndyingTurns > 0 && this.st.j3GospelField > 0) {
        this.gainRage(KIT3.warlord.ultFuryCritRage)
        this.heal(this.st.maxHp * KIT3.warlord.ultFuryCritHeal, true)
      }
    }
    if (r.crit && !magic && this.st.j2KnifeCrit > 0 && this.j2?.id === 'rogue' && (this.src === 'basic' || this.src === 'combo' || (this.backStabbing && !this.shadowStabbing))) this.critKnives++ // Rogue ★ คริเป็นมีด (+ Back Stab, not the rg_c4 shadow)
    if (!magic && r.dmg > 0 && this.j2?.id === 'rogue') { // P3'a Rogue
      const pick = this.pickupOpen && !this.knifeHitting && m.dagger > 0
      if ((r.crit || pick) && (this.st.j2CritLeech > 0 || this.st.j2CritEnergy > 0)) this.rgLeech(r.dmg) // rg_x3
      if (pick) this.voracityPickup(m) // 🔪 เก็บมีด (reads the Marks even if this hit killed it)
    }
    if (!m.dead && !this.allyHitting) {
      const vs = this.itemEffect('void_sunder')
      if (vs && Math.random() < (vs.chance ?? 1)) {
        m.sunder = Math.max(m.sunder ?? 0, vs.power)
        m.sunderTurns = Math.max(m.sunderTurns ?? 0, 2)
        this.dotIcon(m)
      }
      if (r.crit) {
        const coc = this.itemEffect('coc_cast')
        if (coc && this.fxReady('coc_cast') && Math.random() < (coc.chance ?? 1)) {
          this.armFxCd(coc)
          this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 28, '☄️ คริร่ายเวท!', '#c9a8ff')
          this.withSrc('fire', () => this.strike(m, coc.power, true, '#c9a8ff'))
        }
        if (!m.dead && this.hasRiftBoon('rift_critstorm')) {
          this.withSrc('zap', () => this.zap(m, 0.55, '#ffe94a', false))
        }
      }
    }
    if (this.j2?.id === 'mobster') this.mobExec(m)
    if (r.crit && this.st.j2CritPet > 0 && !this.allyHitting && !this.critPetUsed && this.hp > 0) this.critPet(m) // v82 Beastmaster ★ พรานแห่งป่า
    if (this.st.j2LightStar > 0 && this.lightningHitting && this.hp > 0) {
      this.gainRes(1)
      if (r.crit && !m.dead) {
        const hpDmg = Math.max(1, Math.round(m.hp * 0.04 * (1 - (m.def.mdef ?? 0) * Math.max(0, 1 - this.st.magPen))))
        this.damageMon(m, hpDmg, false, '#fff07a')
      }
    }
    if (this.st.lightChargeLv > 0 && this.lightningHitting) {
      if (this.lightChargeStacks >= 5) this.lightChargeStacks = 0
      else this.lightChargeStacks++
    }
    return r.dmg
  }
  private lightChargeStacks = 0
  private lightningHitting = false
  private withLightning<T>(fn: () => T): T {
    const prev = this.lightningHitting
    this.lightningHitting = true
    try { return fn() } finally { this.lightningHitting = prev }
  }

  // ===== 2nd jobs (design/second-jobs-v1.md, data/jobs2.ts, numbers skill-math KIT2) =====
  private j2?: Job2Def
  private j2Weapon = false // wielding the 2nd job's mastery weapon (Berserker 2-hand, Knight spear)
  private hasShield = false // an off-hand is worn (Knight Auto Guard full strength)
  private frenzy = 0 // Berserker Frenzy stacks
  private frenzyAt = 0 // fightTurns of the last crit
  private s3Cd = 0 // hero turns until ทักษะ 3 can cast again
  private s4Cd = 0 // Q 2026-11-24 hero turns until Skill 4 can cast again
  private rampage = 0 // Berserker บ้าระห่ำ turns left
  private s1Cd = 0 // ⚔️ ดาบสยบมนตร์: hero turns until Skill 1 can cast again · swGuard = CC-immune hero turns (web ใจไม่หวั่น)
  private swGuard = 0
  private swAura?: { stop: () => void } // ⚔️ ปลุกดาบ lasting aura (VFX only)
  private swAuraStop() { this.swAura?.stop(); this.swAura = undefined }
  private rampageAura?: { stop: () => void } // 👹 บ้าระห่ำ lasting crimson aura (VFX only)
  private rampageAuraStop() { this.rampageAura?.stop(); this.rampageAura = undefined }
  private heroStr = 0 // total STR at fight start (✨ เคลือบดาบสวรรค์ per 10 STR)
  private swWaveReUsed = false // ★ คลื่นซ้ำ used this awaken
  private swAwaken = 0 // ⚔️ ปลุกดาบ: awakened hero turns left (counting the current one) · swWave = 🌊 คลื่นดาบ still loaded, swWavePow its hit power (fixed at cast)
  private swWave = false
  private swWavePow = 0
  private knightPiercing = false
  private boomCd = 0 // Knight Spear Boomerang cooldown (hero turns)
  private firstSwing = false // Knight Charge Attack: first basic swing of the wave
  private s1Weave = false // P2'a Thief สลับคม: แทงพิษ was cast outside ร่างเงา, the next hero action is a basic attack (cleared by basicAttack)
  private weaveBonus = 0 // P2'a th_t2c: basic bracket bonus for the swing right after แทงพิษ (set / cleared in basicAttack)
  private dodgeCdIcd = 0 // P2'a th_t2a: hero turns until a dodge may cut a cooldown again
  private detUsed = false // P2'd thief_v2 Contaminate: 1/hero turn across Basic + แทงพิษ
  private luckyIcd = false // P2'd LUK Gambler's Edge: LUCKY! Energy gain, 1/hero turn
  private leechLeft = 0 // P2'd thief_v3 เลือดพิษ: remaining HP heal budget this hero turn (max KIT.thiefLeechTurnCap x maxHp)
  private deathMarkPopping = false // PoE Passive Death Mark: pure B6 echo pop in progress
  private mobExecuting = false // Mobster Execute: exclude instant execute damage from Death Mark
  private toxicHealing = false // PoE Passive Eldritch Venom: poison-leech heal eligible for Toxic Overheal shield
  private inS3 = false // PoE Passive Shieldbreaker: inside Skill 3 cast (monster shield pierce)
  private killHealCritUsed = false // กระหายเลือด: boss/mini crit heal once per hero turn
  private forceCrit = false
  /** Q 2026-11-14: Beastmaster Ult + Skill 3 hawk / boar hits never crit (the wolf still can; sure crits still go through). */
  private petNoCrit = false
  private noPetCrit(fn: () => void) { const p = this.petNoCrit; this.petNoCrit = true; try { fn() } finally { this.petNoCrit = p } }
  // ----- v92 Cleric web 🌄 แสงรุ่งอรุณ (KIT.clericTree.dawn): bonus magic damage (STR + WIS + matk x M.ATK) · v108: passive on every Nth basic / combo hit -----
  /** Bonus magic hit on the targets (hitPow 1 for the passive); ★ = sure crit + crit dmg; heals a share of the first hit. */
  private dawnBonus(targets: Mon[], hitPow: number) {
    const D = KIT.clericTree.dawn, st = this.st, s = save()
    if (st.clDawn <= 0 || this.job.id !== 'cleric' || !targets.length) return
    const b = totalBase(s), bl = this.buf.bless > 0 ? blessBase(s) ?? {} : {} // พรแสง adds STR / WIS while it lasts
    const str = b.str + (bl.str ?? 0), wis = b.wis + (bl.wis ?? 0)
    const mul = dawnMul(st, str, wis + this.dawnWisAmt) * hitPow // v102: the ☀️ แสงแตก WIS counts for the damage...
    const wisGain = dawnWisGain(st, dawnBonus(st, str, wis) * hitPow) // ...but not for the next buff (no snowball)
    const sure = st.clDawnUlt > 0, add = sure ? st.clDawnCrit : 0, wasCrit = this.forceCrit
    this.forceCrit = wasCrit || sure; st.critMul += add
    let front = 0
    try { targets.forEach((m, i) => { const d = this.strike(m, mul, true, '#ffd36e'); if (i === 0) front = d }) } finally { st.critMul -= add; this.forceCrit = wasCrit }
    playPfx(this, 'critGold', targets[0].spr.x - 10, GROUND, { scale: 1.3, speed: 1.2 }) // 🌄 dawn: a gold crit flare
    if (st.clDawnWis > 0 && st.clDawnWisTurns > 0 && this.hp > 0) { // v102 ☀️ แสงแตก: WIS buff, refreshed by every bonus hit
      this.buf.dawnWis = Math.round(st.clDawnWisTurns); this.syncDawnWis(wisGain)
      this.floatText(HERO_X, GROUND - 170, `☀️ WIS +${wisGain} (${this.buf.dawnWis} เทิร์น)`, '#ffd36e')
    }
    if (front <= 0 || this.hp <= 0 || st.clDawnHeal <= 0) return
    const big = targets[0].def.ai === 'boss' || !!targets[0].def.mini
    const amt = front * st.clDawnHeal * (big ? 1 : D.weak)
    if (amt > 0) { this.heal(amt, true); this.floatText(HERO_X, GROUND - 150, `🌄 +${Math.round(amt * (1 + st.healAmp))}`, '#7fe39a') }
  }
  private critAdd = 0 // temporary crit chance (Warlord)
  private kitSkillCritAdd = 0 // temporary skillCrit bonus (swordS1 / Berserker S3 / ult2)
  private dualKnife = false // Rogue: a dagger in the off-hand (+KIT2.rogue.dualKnife flying knives)
  private critKnives = 0 // Rogue ★: knives owed by basic / combo crits, thrown after the swing
  private execTurnUsed = false // Mobster ★ งานต่อไป: one extra turn per hero turn
  private martyrUsed = false // Crusader ★ ผู้พลีชีพ used this wave
  private lastStandUsed = false // 🧬 ใจสู้ used this wave
  private thirdHits = 0 // 🧬 สามจังหวะ: basic attacks since the last 3rd-hit burst (this wave)
  private cleaving = false // 🧬 ฟันกวาด splash in progress (no splash of a splash)
  private j2Hurt = false // a hit landed on the hero since its last turn (Monk Energy Shield)
  private charges = 0 // Monk 🔵 power charges
  private monkGrit = 0 // Monk Sett-style Grit stored from incoming hits
  private asuraExhaust = 0 // Monk Asura Strike post-cast ง่อยแดก turns left
  private chargeTxt?: Phaser.GameObjects.Text
  private allies: Ally[] = [] // battle/allies.ts (Monk Tempest Bell)
  private allyTxt = new Map<Ally, Phaser.GameObjects.Text>()
  private chargeMax() { return KIT2.monk.chargeMax + this.st.j2ChargeMax }
  /** Monk: gain / spend power charges, shown above the hero. Blocked from gaining charges during ง่อยแดก. */
  private addCharges(n: number) {
    if (n > 0 && this.asuraExhaust > 0) return
    const v = Math.max(0, Math.min(this.chargeMax(), this.charges + n))
    if (v === this.charges) return
    this.charges = v
    if (!this.chargeTxt?.active) this.chargeTxt = this.add.text(HERO_X, GROUND - 190, '', { fontSize: '14px' }).setOrigin(0.5).setDepth(9500)
    this.chargeTxt.setText('🔵'.repeat(this.charges))
  }
  /** Monk หมัดแค้น / หมัดพิพากษา: turn-start burst releasing stored rage + M.DEF×HP as Shield + True Damage. */
  private async releaseHaymaker() {
    const hm = haymakerCalc(this.st, this.monkGrit)
    if (hm.triggerAt <= 0 || this.monkGrit < hm.triggerAt) return
    this.monkGrit = 0
    const t = this.bossTarget() ?? this.front()[0]
    if (!t) return
    this.addShield(hm.rawShield, true)
    this.floatText(HERO_X, GROUND - 125, `🥊 โล่แรงฮึด +${hm.shield}`, '#9fe3ff')
    this.callout(hm.star ? '🔥 หมัดพิพากษา!' : '🥊 หมัดแค้น!', W / 2, 165, '#ff9a3c')
    this.stayIn = false
    await this.lunge(t, () => {
      this.cameras.main.flash(hm.star ? 140 : 90, 255, 160, 60)
      this.shake(hm.star ? 220 : 140, hm.star ? 0.014 : 0.009)
      playPfx(this, hm.star ? 'slam' : 'critOrange', t.spr.x - 10, GROUND, { scale: hm.star ? 1.2 : 1.3, speed: 1.5 })
      this.withSrc('other', () => this.damageMon(t, hm.centerTrueDmg, hm.star, '#ffb84d', true))
      if (hm.star) {
        if (!t.dead && t.def.ai === 'boss') t.gauge -= KIT2.monk.haymakerPush
        for (const o of this.alive()) {
          if (o === t) continue
          this.burst(o.spr.x, o.spr.y - 30, 0xffd36b, 10, 170)
          this.withSrc('other', () => this.damageMon(o, hm.splashTrueDmg, false, '#ffd36b', true))
          if (!o.dead && o.def.ai === 'boss') o.gauge -= KIT2.monk.haymakerPush
        }
      }
    })
  }
  /** Monk หมัดอัสนี: converts P.ATK share into magic multiplier units for Falling Thunder / Combo Thunder. */
  private thunderAtkAdd() {
    return this.st.j2ThunderAtk > 0 ? this.st.j2ThunderAtk * this.st.atk / Math.max(1, magicPower(this.st)) : 0
  }
  /** 🥊 Champion Falling Thunder variant: 🐅 Tiger Knuckle (single + stun) / 💥 Chain Crush (all True Dmg). */
  private async championVariant(live: Mon[], pow: number) {
    const P = KIT3.champion, s = save(), heir = this.st.j3Heir > 0, base = pow * (1 + this.st.j3VarMul)
    const n = this.charges
    this.addCharges(-n)
    if (s.job3Var === 'b') {
      const V = P.varB, hpBonus = heir && branchPts(s.job2Tree, V.branch) >= P.heirNeed ? 0.03 * this.st.maxHp : 0
      this.cameras.main.flash(90, 255, 170, 70)
      const cm = championVarMul(this.st, V, n) // M3: the 🔵 charges paid now count (were drained for nothing)
      for (const m of this.alive()) {
        const dmg = Math.round(this.st.atk * cm * base + this.st.mdef * this.st.maxHp * V.mdefHp + hpBonus)
        this.burst(m.spr.x, m.spr.y - 30, 0xff9a3c, 10, 180)
        this.withSrc('skill', () => this.damageMon(m, dmg, true, '#ff9a3c', true))
      }
      this.floatText(HERO_X, GROUND - 170, `💥 Chain Crush x${n}`, '#ff9a3c')
      await this.wait(BATTLE.stepMs * 0.3)
      return
    }
    const V = P.varA, t = this.bossTarget() ?? live[0]
    if (t) {
      const stuns = V.stunTurns + (heir && branchPts(s.job2Tree, V.branch) >= P.heirNeed ? 1 : 0)
      await this.lunge(t, () => {
        this.cameras.main.flash(100, 255, 230, 150)
        this.burst(t.spr.x, t.spr.y - 30, 0xffd24a, 16, 220)
        this.strike(t, championVarMul(this.st, V, n) * base + V.hp * this.st.maxHp / Math.max(1, this.st.atk), false, '#ffd24a') // M3: x spent charges
        if (!t.dead) {
          t.frozen = true
          t.stunTurns = Math.max(t.stunTurns ?? 0, stuns - 1)
          this.interruptStunCharge(t)
          this.dotIcon(t)
        }
      })
      this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 30, `🐅 Tiger Knuckle x${n}🔵 (💫 เสียเทิร์น x${stuns})`, '#ffd24a')
    }
  }
  /** 🐉 Lord Knight Brandish Spear variant (design/awakening-lordknight-v1.md): 🐉 Dragon Breath (all + burn) / 💥 Joint Beat (one, DEF -50%). */
  private async lkVariant(live: Mon[], pow: number) {
    const P = KIT3.lordknight, s = save(), heir = this.st.j3Heir > 0, base = pow * (1 + this.st.pskill) * (1 + this.st.j3VarMul)
    if (s.job3Var === 'b') {
      const V = P.varB, t = this.bossTarget() ?? live[0], hits = 1 + (heir && branchPts(s.job2Tree, V.branch) >= P.heirNeed ? 1 : 0)
      for (let i = 0; i < hits && !t.dead; i++) await this.lunge(t, () => this.strike(t, V.mul * base + V.hp * this.st.maxHp / Math.max(1, this.st.atk), false, '#ff9a6a', V.pierce))
      this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 30, `💥 Joint Beat${hits > 1 ? ' x2' : ''}`, '#ff9a6a')
      return
    }
    const V = P.varA, brk = heir && branchPts(s.job2Tree, V.branch) >= P.heirNeed
    await this.lunge(live[0], () => {
      this.cameras.main.flash(90, 255, 140, 60)
      for (const m of this.alive()) {
        this.strike(m, V.mul * base + V.hp * this.st.maxHp / Math.max(1, this.st.atk), false, '#ff8c42')
        if (!m.dead) { m.burn = Math.max(m.burn, Math.round(this.st.atk * V.burnAtk)); m.burnTurns = Math.max(m.burnTurns, V.burn); if (brk) m.armorBrk = Math.max(m.armorBrk, 1); this.dotIcon(m) }
      }
    })
    this.callout(brk ? '🐉 Dragon Breath! 🔥 + เกราะแตก' : '🐉 Dragon Breath! 🔥', W / 2, 170)
  }
  // ===== the last four Awakenings (docs/design/awakening-last-four-v1.md · numbers KIT3 · pure math in skill-math.ts) =====
  /** พรหลังศึก after an Awakening ult (shared ใยชั้น 3 node). */
  private afterBless() {
    if (this.st.j3AfterBless <= 0) return
    this.j3Bless = KIT3.common.afterTurns
    this.floatText(HERO_X, GROUND - 150, `🌅 พรหลังศึก +${Math.round(this.st.j3AfterBless * 100)}%`, '#ffe08a')
  }
  /** 🥷 Stalker Back Stab variant: 🌀 Fan of Knives (every monster, sure crit, + Marks) / 🎯 Assassinate (one, DEF -50%, a kill resets the CD).
   *  `base` already holds pow, pskill, Combo Point and the Shadow Ambush amp of the normal Back Stab. */
  private async stalkerVariant(t: Mon, base: number, sfxOpts: { ambush?: boolean; cp?: number }) {
    const P = KIT3.stalker, s = save(), heirOn = (b: string) => this.st.j3Heir > 0 && branchPts(s.job2Tree, b) >= P.heirNeed, k = base * (1 + this.st.j3VarMul)
    if (s.job3Var === 'b') {
      const V = P.varB, heir = heirOn(V.branch)
      const prevLs = this.lsMul
      this.forceCrit = true; this.backStabbing = true; this.pickupOpen = true
      try { await this.lunge(t, () => { backstabFx(this, t.spr); sfx.backStab({ ambush: sfxOpts.ambush, cp: sfxOpts.cp, shadow: false }); this.strike(t, V.mul * k, false, '#ffd36b', V.pierce) }, true, true) }
      finally { this.forceCrit = false; this.backStabbing = false; this.pickupOpen = false; this.lsMul = prevLs }
      if (t.dead) { this.s3Cd = 0; this.floatText(HERO_X, GROUND - 175, '🎯 Assassinate! คูลดาวน์คืน', '#ffd36b') }
      else if (heir) this.s3Cd = Math.max(0, this.s3Cd - V.heirCdCut)
      return
    }
    const V = P.varA, heir = heirOn(V.branch), marks = heir ? V.heirMarks : V.marks
    this.forceCrit = true; this.backStabbing = true
    try {
      await this.lunge(t, () => {
        sfx.backStab({ ambush: sfxOpts.ambush, cp: sfxOpts.cp, shadow: false })
        this.cameras.main.flash(90, 185, 168, 255)
        this.alive().forEach((m, i) => {
          backstabFx(this, m.spr)
          this.shadowStabbing = i > 0 // ★ คริเป็นมีด: the fan owes one crit knife, like a single Back Stab
          this.strike(m, V.mul * k, false, '#b9a8ff')
          if (m.dead) return
          m.dagger = Math.min(this.markCap(), m.dagger + marks); m.daggerTurns = KIT2.rogue.markTurns + P.markTurnsAdd
          if (heir) m.strip = Math.max(m.strip, KIT2.rogue.stabStripTurns)
          this.dotIcon(m)
        })
      }, true, true)
    } finally { this.forceCrit = false; this.backStabbing = false; this.shadowStabbing = false }
    this.callout(heir ? '🌀 Fan of Knives! 🔪 + Strip' : '🌀 Fan of Knives! 🔪', W / 2, 170, '#b9a8ff')
  }
  /** 🥷 Phantom Storm: after the storm, aimed knives at the most-marked monster (root u3Pow multiplies them). */
  private async phantomStorm(stormKnifeMul: number) {
    const P = KIT3.stalker, n = P.phantomKnives + Math.round(this.st.j3GospelField)
    if (!this.alive().length || this.hp <= 0) return
    this.callout('👻 Phantom Storm!', W / 2, 170, '#b9a8ff')
    let healed = 0
    for (let i = 0; i < n && this.alive().length; i++) {
      this.throwKnives(1, stormKnifeMul * P.phantomMul * (1 + this.st.u3Pow), () => this.stabTarget())
      if (this.st.j3GospelHeal > 0 && healed++ < P.gospelHealMax) this.heal(this.st.maxHp * this.st.j3GospelHeal, true)
      await this.wait(BATTLE.stepMs * 0.08)
    }
    this.stalkerFullDivest()
    this.afterBless()
  }
  /** 🎩 Kingpin ตัดเส้นเอ็น variant: 💰 Shakedown (every monster, armor break + chill) / 📜 Hit Contract (one, heavy + poison + weaken). */
  private async kingpinVariant(t: Mon, pow: number, turns: number) {
    const P = KIT3.kingpin, s = save(), heirOn = (b: string) => this.st.j3Heir > 0 && branchPts(s.job2Tree, b) >= P.heirNeed, base = pow * (1 + this.st.pskill) * (1 + this.st.j3VarMul)
    if (s.job3Var === 'b') {
      const V = P.varB, hits = heirOn(V.branch) ? 2 : 1
      for (let i = 0; i < hits && !t.dead; i++) await this.lunge(t, () => {
        sfx.tendonCut()
        daggerCrossFx(this, t.spr.x - 20, GROUND - 40, this.hits, 'mobster')
        this.strike(t, V.mul * base, false, '#c9a8ff')
        if (t.dead) return
        this.addPoison(t, V.poison)
        t.armorBrk = Math.max(t.armorBrk, turns); t.weakPct = Math.max(t.weakTurns > 0 ? t.weakPct : 0, V.weak); t.weakTurns = Math.max(t.weakTurns, V.weakTurns); this.dotIcon(t)
        this.mobExec(t)
      }, false, true)
      if (!t.dead) this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 30, `📜 Hit Contract${hits > 1 ? ' x2' : ''}`, '#c9a8ff')
      return
    }
    const V = P.varA, heir = heirOn(V.branch)
    await this.lunge(t, () => {
      sfx.tendonCut()
      this.cameras.main.flash(90, 167, 123, 224)
      for (const m of this.alive()) {
        daggerCrossFx(this, m.spr.x - 20, GROUND - 40, this.hits, 'mobster')
        this.strike(m, V.mul * base, false, '#c9a8ff')
        if (m.dead) continue
        m.armorBrk = Math.max(m.armorBrk, turns); m.chill = Math.max(m.chill, turns)
        if (heir) { m.weakPct = Math.max(m.weakTurns > 0 ? m.weakPct : 0, V.heirWeak); m.weakTurns = Math.max(m.weakTurns, V.heirWeakTurns) }
        this.dotIcon(m)
        this.mobExec(m)
      }
    }, false, true)
    this.callout(heir ? '💰 Shakedown! ⛓️ + อ่อนแรง' : '💰 Shakedown! ⛓️', W / 2, 170, '#c9a8ff')
  }
  /** 🎩 Hostile Takeover: after ทวงหนี้, slash every survivor again (more per debt on it), then one more Execute check. */
  private async hostileTakeover(h2: number) {
    const P = KIT3.kingpin, rounds = 1 + Math.round(this.st.j3GospelField)
    for (let r = 0; r < rounds && this.alive().length && this.hp > 0; r++) {
      const live = this.front()
      this.callout('🏦 Hostile Takeover!', W / 2, 170, '#c9a8ff')
      let hit = 0
      await this.lunge(live[0], () => {
        sfx.debtCollectSlash()
        live.forEach((m, i) => {
          shadowSlashFx(this, m.spr, i)
          if (this.strike(m, kingpinTakeMul(this.debt(m)) * h2 * (1 + this.st.pskill) * (1 + this.st.u3Pow), false, '#e0b0ff') > 0) hit++
          if (!m.dead) this.mobExec(m)
        })
      }, false, true)
      if (this.st.j3GospelHeal > 0 && hit > 0) this.heal(this.st.maxHp * this.st.j3GospelHeal * Math.min(P.gospelHealMax, hit), true)
    }
    this.afterBless()
  }
  /** 🌌 High Wizard Storm Gust cast: ❄️ Frost Nova (more hits, harder on chilled) / ⚡ Jupitel Thunder (one target, bolts push the gauge) · then Amplify. */
  private async gustCast(pow: number) {
    if (this.st.j3Hw <= 0) { await this.stormGust(pow); return }
    const P = KIT3.highwizard, s = save(), heirOn = (b: string) => this.st.j3Heir > 0 && branchPts(s.job2Tree, b) >= P.heirNeed, k = pow * (1 + this.st.j3VarMul)
    if (s.job3Var === 'b') {
      const V = P.varB, t = this.bossTarget() ?? this.front()[0], heir = heirOn(V.branch)
      if (t) {
        this.callout('⚡ Jupitel Thunder!', W / 2, 170, '#bfe6ff')
        for (let i = 0; i < V.hits && !t.dead; i++) {
          playPfx(this, 'zap', t.spr.x, t.spr.y - t.spr.displayHeight * 0.45, { scale: 1.2, speed: 1.6 })
          this.strike(t, (V.mul + this.st.j2LovMul * V.mul) * k, true, '#bfe6ff')
          if (!t.dead) t.gauge -= V.push
          await this.wait(90)
        }
        if (heir && !t.dead) { if (t.def.ai === 'boss') t.gauge -= V.push * V.hits; else this.stunMon(t) }
      }
    } else {
      const V = P.varA
      await this.stormGust(k, { hits: V.hits + (heirOn(V.branch) ? V.heirHits : 0), vsChill: V.vsChill })
    }
    this.amplify()
  }
  /** 🌌 Mystical Amplification: a landed big spell leaves + magic damage for the next hero turns (+1: this turn's tick). */
  private amplify() {
    if (this.st.j3Hw <= 0 || this.hp <= 0) return
    const P = KIT3.highwizard
    this.hwAmp = P.ampTurns + 1
    this.floatText(HERO_X, GROUND - 185, `🌌 Amplify +${Math.round((P.amp + this.st.j3HwAmp) * 100)}% (${P.ampTurns} เทิร์น)`, '#9fb8ff')
  }
  /** 🌌 Gravitation Field: after the Ult, every monster x Pm through part of M.DEF + boss gauge push (root u3Pow multiplies it). */
  private async gravitation(h2: number) {
    const P = KIT3.highwizard, waves = 1 + Math.round(this.st.j3GospelField)
    for (let w = 0; w < waves && this.alive().length && this.hp > 0; w++) {
      this.callout('🌌 Gravitation Field!', W / 2, 170, '#9fb8ff')
      playPfx(this, 'magicCircle', 700, GROUND, { scale: 1.5, speed: 1.3 })
      this.shake(200, 0.012)
      let hit = 0
      for (const m of this.alive()) {
        this.burst(m.spr.x, m.spr.y - 30, 0x6a5acd, 14, 180)
        if (this.strike(m, P.gravMul * h2 * (1 + this.st.u3Pow), true, '#9fb8ff', P.gravPierce + this.st.j3Pierce) > 0) hit++
        if (!m.dead && m.def.ai === 'boss') m.gauge -= P.gravPush
      }
      if (this.st.j3HwDrain > 0 && hit > 0) { this.gainRes(this.st.j3HwDrain * hit); this.floatText(HERO_X, GROUND - 165, `💧 Soul Drain +${this.st.j3HwDrain * hit}`, '#7ec8ff') }
      await this.wait(BATTLE.stepMs * 0.25)
    }
    this.amplify()
    this.afterBless()
  }
  /** 🤖 Mechanic กล่องสุ่ม variant (rides on top of the box): 🚀 Rocket Barrage / 🏰 Fortress Mode · then Overclock. */
  private async mechanicVariant(pow: number) {
    const P = KIT3.mechanic, s = save(), heirOn = (b: string) => this.st.j3Heir > 0 && branchPts(s.job2Tree, b) >= P.heirNeed, k = pow * (1 + this.st.j3VarMul)
    if (s.job3Var === 'b') {
      const V = P.varB, n = V.turrets + (heirOn(V.branch) ? V.heirTurrets : 0)
      for (let i = 0; i < n; i++) this.spawnTurret(k)
      this.addShield(this.st.maxHp * V.shield * k)
      this.callout('🏰 Fortress Mode!', W / 2, 170, '#ffc98a')
    } else if (this.alive().length) {
      const V = P.varA, n = V.rockets + (heirOn(V.branch) ? V.heirRockets : 0)
      this.callout('🚀 Rocket Barrage!', W / 2, 170, '#ff8c42')
      await this.salvo(n, V.mul * k * (1 + this.st.j2BoxMul) * (1 + this.st.pskill), false)
    }
    this.mcOver = P.overTurns + 1 // +1: this turn's tick
    this.floatText(HERO_X, GROUND - 185, `⚙️ Overclock +${Math.round((P.overAspd + this.st.j3McOver) * 100)}% (${P.overTurns} เทิร์น)`, '#ffc98a')
  }
  /** 🤖 Arm Cannon: after the ult, a missile salvo at random monsters (root u3Pow multiplies it). */
  private async armCannon(h2: number) {
    const P = KIT3.mechanic
    if (!this.alive().length || this.hp <= 0) return
    this.callout('🚀 Arm Cannon!', W / 2, 170, '#ff8c42')
    await this.salvo(P.missiles + Math.round(this.st.j3GospelField), P.missileMul * h2 * (1 + this.st.pskill) * (1 + this.st.u3Pow), true)
    this.afterBless()
  }
  /** 🤖 n rockets / missiles at random live monsters (wet / chilled targets take more · หัวรบเจาะเกราะ pierce). `repair` = the mc_c1 heal per hit. */
  private async salvo(n: number, mul: number, repair: boolean) {
    const P = KIT3.mechanic
    let healed = 0
    for (let i = 0; i < n; i++) {
      const l = this.alive(); if (!l.length || this.hp <= 0) return
      const m = l[Phaser.Math.Between(0, l.length - 1)]
      await this.shoot(m, 0xff8c42, () => {
        const d = this.strike(m, mul * (m.wet > 0 || m.chill > 0 ? 1 + P.missileVsSoaked : 1), false, '#ff8c42', this.st.j3Pierce)
        this.burst(m.spr.x, m.spr.y - 30, 0xff8c42, 12, 200)
        if (repair && d > 0 && this.st.j3GospelHeal > 0 && healed++ < P.gospelHealMax) this.heal(this.st.maxHp * this.st.j3GospelHeal, true)
      })
    }
  }
  /** 🪓 Warlord Skill 3 variant: Spinning Guillotine (varA) / Warlord's Warcry (varB). */
  private async warlordVariant(live: Mon[], pow: number) {
    const W3 = KIT3.warlord, s = save(), heir = this.st.j3Heir > 0, base = pow * (1 + this.st.pskill) * (1 + this.st.j3VarMul)
    if (!live.length) return
    if (s.job3Var === 'b') {
      const V = W3.varB, heirOn = heir && branchPts(s.job2Tree, V.branch) >= W3.heirNeed
      await this.lunge(live[0], () => {
        this.cameras.main.flash(90, 255, 110, 90)
        for (const m of this.alive()) {
          this.strike(m, V.mul * base, false, '#ff8a7a')
          if (!m.dead) {
            m.weakTurns = Math.max(m.weakTurns, V.weakTurns)
            m.weakPct = Math.max(m.weakPct, V.weakPct)
            m.armorBrk = Math.max(m.armorBrk, V.breakTurns)
            m.gauge -= V.push + (heirOn ? V.heirPush : 0)
            this.dotIcon(m)
          }
        }
      })
      this.gainRage(V.rage)
      this.addShield(this.st.maxHp * V.shield, true)
      if (heirOn && this.alive().length) {
        for (const m of this.alive()) {
          this.strike(m, V.mul * 0.5 * base, false, '#ff6b6b')
          if (!m.dead) { m.chill = Math.max(m.chill, 2); this.dotIcon(m) }
        }
      }
      this.callout(heirOn ? '📣 Warcry! คำรามสยบศึก!' : "📣 Warlord's Warcry!", W / 2, 170, '#ff8a7a')
      return
    }
    const V = W3.varA, t = this.bossTarget() ?? live[0], heirOn = heir && branchPts(s.job2Tree, V.branch) >= W3.heirNeed
    const miss = Math.max(0, 1 - t.hp / Math.max(1, t.def.hp))
    const mul = V.mul * base * (1 + miss * V.execMax)
    this.critAdd = heirOn ? 1 : V.critAdd
    await this.lunge(t, () => {
      this.cameras.main.flash(90, 255, 80, 70)
      for (let i = 0; i < V.hits && !t.dead; i++) this.strike(t, mul, false, '#ff6b6b')
      if (heirOn) {
        for (const m of this.alive().filter((x) => x !== t)) this.strike(m, mul * V.splashShare, false, '#ff8a7a')
      }
    })
    this.critAdd = 0
    this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 30, heirOn ? '⚔️ Guillotine! x2 คริคลั่ง' : '⚔️ Spinning Guillotine! x2', '#ff6b6b')
  }
  /** ⚜️ Paladin Holy Cross variant (design/awakening-crusader-v1.md §4.3). Returns hits landed (for กางเขนหล่อกาย). */
  private async holyVariant(t: Mon, pow: number): Promise<number> {
    const P = KIT3.paladin, C = KIT2.crusader, heir = this.st.j3Heir > 0, base = pow * (1 + this.st.j2CrossAdd) * (1 + this.st.j3VarMul)
    const blind = (m: Mon, add = 0) => { if (!m.dead) { m.blind = Math.max(m.blind, C.blindTurns + this.st.j2BlindAdd + add); this.dotIcon(m) } }
    let landed = 0
    if (save().job3Var === 'b') { // ⚖️ Pressure: one heavy hit through DEF on the boss (or the front), + max HP share
      const V = P.varB, m = this.bossTarget() ?? t, heirOn = heir && branchPts(save().job2Tree, V.branch) >= P.heirNeed
      await this.maceSmash(m, () => {
        landed += this.strike(m, V.atk * base * (1 + this.st.pskill) + V.hp * this.st.maxHp / Math.max(1, this.st.atk), false, '#ffe08a', 1)
        if (!m.dead && V.pm > 0) landed += this.strike(m, V.pm * base, true, '#fff3a0') // M3: + Holy Cross magic share
        for (const x of heirOn ? this.alive() : [m]) blind(x, V.blindAdd)
        this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, heirOn ? '⚖️ Pressure! 🙈 ทุกตัว' : '⚖️ Pressure! 🙈', '#ffe08a')
        this.cameras.main.flash(80, 255, 240, 170)
      })
      return landed
    }
    const V = P.varA, hits = V.hits + (heir && branchPts(save().job2Tree, V.branch) >= P.heirNeed ? 1 : 0) // 🔗 Shield Chain: the front, then bounces
    const mul = (V.atk + V.def * this.st.def / Math.max(1, this.st.atk)) * base * (this.hasShield ? 1 : V.noShield)
    let m: Mon | undefined = t
    for (let i = 0; i < hits && m; i++) {
      const target: Mon = m
      await this.shoot(target, 0xd8d8e8, () => { landed += this.strike(target, mul * (1 + this.st.pskill), false, '#d8d8e8'); if (!target.dead && V.pm > 0) landed += this.strike(target, V.pm * base, true, '#fff3a0'); blind(target) }) // M3: + magic share
      const rest: Mon[] = this.alive().filter((x) => x !== target)
      m = rest.length ? rest[Phaser.Math.Between(0, rest.length - 1)] : !target.dead ? target : undefined
    }
    this.floatText(HERO_X, GROUND - 150, `🔗 Shield Chain x${hits}`, '#d8d8e8')
    return landed
  }
  /** Crusader Auto Guard landed: ★ ป้อมศรัทธา shield + บล็อกฟื้นฟู heal. */
  private onBlock(src?: Mon) {
    this.heroRig.playBlock()
    blockShieldFx(this, HERO_X, GROUND)
    const P = KIT3.paladin, on3 = this.st.j3On > 0
    const over = (1 + this.st.j2GuardOver * KIT2.crusader.guardOverMul) * (on3 ? 1 + P.blockAmp : 1) // v116: Auto Guard over the cap = bigger block shield / heal · ⚜️ Prestige x1.25
    if (on3) this.addFaith(P.blockFaith) // ⚜️ Paladin: a block = Faith
    if (this.inspire > 0) this.heal(this.st.maxHp * KIT3.common.inspireHeal, true) // 3rd job ★ Inspiration / Parrying
    if (this.st.j3Press > 0 && src && !src.dead) this.strike(src, this.st.j3Press * this.st.def / Math.max(1, this.st.atk), false, '#d8d8e8') // Shield Press
    if (this.st.j2BlockShield > 0) this.addShield(this.st.maxHp * this.st.j2BlockShield * over, true)
    if (this.st.j2BlockHeal > 0) this.heal(this.st.maxHp * this.st.j2BlockHeal * over, true)
    if (this.st.j2BannerKill > 0) this.addShield(this.st.maxHp * this.st.j2BannerKill * 0.5, true) // Knight ธงชัย: block shield (half of kill)
    if (this.st.j2BannerAura > 0) { // v84 Knight ★ ธงอมตะ
      const T = KIT2.knight.tree
      this.heal(this.st.maxHp * T.auraHeal, true); this.gainRage(T.auraRes); this.gainRes(T.auraRes)
      this.floatText(HERO_X, GROUND - 150, '🏳️ ธงอมตะ', '#f6eedc')
    }
    this.notifyShieldOrBlockBiome()
  }
  /** Ally context for battle/allies.ts: hits use the hero's strike as magic / physical 'other' (no lifesteal, no combo). */
  private allyCtx(a: Ally, combo = false, foe?: Mon): AllyCtx {
    const front = () => (foe && !foe.dead ? foe : this.front()[0])
    const run = (fn: () => void) => { // v82: "the ally did something" + its hits count as ally hits (ผู้นำฝูง / พรานแห่งป่า skip them)
      this.allyActed = true
      const p = this.allyHitting; this.allyHitting = true
      try { this.withSrc('other', fn) } finally { this.allyHitting = p }
    }
    return {
      ally: a, st: this.st, luk: this.heroLuk, int: this.sageInt, dex: this.heroDex, topStat: this.heroTopStat, combo,
      awaken: this.awakenTurns > 0, awakenPow: this.awakenTurns > 0 ? this.awakenUltPow : 1,
      hitAll: (mul, magic, color) => run(() => { for (const m of this.alive()) this.strike(m, mul, magic, color) }),
      hitOne: (mul, magic, color, sure, fx) => {
        const t = this.alive(); if (!t.length) return false
        const p = this.sureHit; this.sureHit = p || !!sure
        const tgt = t[Phaser.Math.Between(0, t.length - 1)] // picked here (same single RNG call) so the pet fx hits the same monster
        const fc = fx?.falconCrit ?? 0
        const canFalconCrit = fc > 0 && tgt.huntMark > 0
        let d = 0
        const exec = () => run(() => { this.allyHitFx(a, tgt); d = this.strike(tgt, mul, magic, color, fx?.pierce ?? 0, canFalconCrit ? fc : 0) })
        try { if (magic && fx?.mark && !canFalconCrit) this.noPetCrit(exec); else exec() } finally { this.sureHit = p }
        if (tgt.dead || d <= 0 || !fx) return false
        const fresh = fx.mark ? this.markPrey(tgt) : false
        if (fx.blind && fx.blind > 0) { tgt.blind = Math.max(tgt.blind, fx.blind); this.dotIcon(tgt) } // 🪶 Razor Gust
        return fresh
      },
      rally: (id) => { const x = readyAllies(this.allies).find((y) => y.def.id === id && y.def.trigger === 'ownTurn'); if (x) x.gauge = Math.max(x.gauge, 100) },
      hitFront: (mul, color, bleed = 0, crit = false, pierce = 0) => {
        const m = this.front()[0]; if (!m) return 0
        let d = 0; const fc = this.forceCrit; this.forceCrit = fc || crit
        const exec = () => run(() => { this.allyHitFx(a, m); d = this.strike(m, mul, false, color, pierce) })
        try { if (a.def.id === 'boar') this.noPetCrit(exec); else exec() } finally { this.forceCrit = fc }
        if (bleed > 0) this.addPoison(m, bleed)
        return d
      },
      frontInfo: () => { const m = this.front()[0]; return m ? { hpPct: m.hp / Math.max(1, m.def.hp), marked: m.huntMark > 0, bleed: m.poison } : undefined },
      healPack: (n) => this.healPackRaw(n),
      healBoar: (share) => this.healBoarShare(share),
      hitFoe: (mul, color) => { const m = front(); if (m) run(() => this.strike(m, mul, false, color)) },
      stun: (all) => { for (const m of all ? this.alive() : [front()]) if (m) this.stunMon(m) },
      chill: (turns, all) => { for (const m of all ? this.alive() : [front()]) if (m && !m.dead) { m.chill = Math.max(m.chill, turns); this.dotIcon(m) } },
      shield: (share) => { this.allyActed = true; this.addShield(this.st.maxHp * share) },
      say: (text, color) => this.floatText(HERO_X + 70, GROUND - 150, text, color),
    }
  }
  private markPrey(m: Mon, turns = preyTurnsOf(this.st)): boolean {
    if (m.dead) return false
    const fresh = m.huntMark <= 0
    m.huntMark = Math.max(m.huntMark, turns)
    if (fresh) huntMarkOn(this, m.spr)
    this.dotIcon(m)
    return fresh
  }
  private healPackRaw(n: number) {
    if (n <= 0) return
    if (this.hp > 0) this.heal(n, true)
    const b = readyAllies(this.allies).find((x) => x.def.share)
    if (b) { b.hp = Math.min(b.maxHp, b.hp + Math.max(1, Math.round(n))); this.syncAlly(b) }
  }
  private healBoarShare(share: number) {
    if (share <= 0) return
    const b = readyAllies(this.allies).find((x) => x.def.share)
    if (!b || b.hp >= b.maxHp) return
    const h = Math.max(1, Math.round(b.maxHp * share))
    b.hp = Math.min(b.maxHp, b.hp + h); this.syncAlly(b)
    const bx = this.allyTxt.get(b)?.x ?? HERO_X + 70
    this.floatText(bx, GROUND - 110, `+${h}`, '#9fe08a')
  }
  private petFxN = 0 // pet fx counter: nudges repeated hits so they do not stack exactly
  /** Beastmaster pet strike visual (hawk dive / boar charge / claw slash) on the monster the ally really hit. */
  private allyHitFx(a: Ally, m: Mon) {
    const kind: PetKind | undefined = a.def.id === 'hawk' ? 'hawk' : a.def.id === 'boar' ? 'boar' : a.def.id === 'wolf' || a.def.id === 'pack' ? 'wolf' : undefined
    if (kind) petHitFx(this, kind, m.spr, GROUND, this.petFxN++)
  }
  /** One ally act: wiggle its icon, use up a trap. */
  private allyAct(a: Ally, combo = false, foe?: Mon, move: (c: AllyCtx) => void = a.def.act) {
    this.allyActed = false
    move(this.allyCtx(a, combo, foe))
    if (this.allyActed && a.def.kind === 'pet') this.petPerks()
    this.tweens.add({ targets: this.allyTxt.get(a), angle: 12, duration: 60, yoyo: true })
    if (a.def.uses && useAlly(a)) { this.syncAlly(a); this.allies = liveAllies(this.allies) }
  }
  /** Loses its next turn (Ankle Snare / banana / boar charge); boss / mini: gauge push instead. */
  private stunMon(m: Mon) {
    if (m.dead) return
    this.interruptStunCharge(m)
    if (m.def.ai === 'boss') { m.gauge -= KIT2.innovator.snarePush; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '⏪ ช้าลง', '#e0b07a'); return }
    m.frozen = true; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '💫 เสียเทิร์น', '#e0b07a')
  }
  /** Own-turn allies (wolf, wolf pack) whose gauge is full act now. */
  private async allyTurns() {
    for (const a of readyAllies(this.allies)) {
      while (a.def.trigger === 'ownTurn' && !a.dead && a.gauge >= 100 && this.alive().length && this.hp > 0) { a.gauge -= 100; this.allyAct(a); await this.wait(140) }
    }
  }
  /** End of a hero turn: 'heroTurn' allies act (boar charge, robot turret). */
  private async alliesOnTurn() {
    let n = 0
    for (const a of readyAllies(this.allies)) if (a.def.trigger === 'heroTurn' && this.alive().length && this.hp > 0) { this.allyAct(a); n++ }
    if (n) await this.wait(120)
  }
  /** A monster starts its action: the first live trap goes off on it. True when one did. */
  private trapOnAct(m: Mon): boolean {
    const a = readyAllies(this.allies).find((x) => x.def.trigger === 'monsterAct')
    if (!a) return false
    this.allyAct(a, false, m)
    return true
  }
  // ===== Phase 4 Archer: 🐺 Beastmaster / 🔧 Innovator (numbers KIT2.beastmaster / KIT2.innovator, allies battle/allies.ts) =====
  private heroLuk = 0
  private heroTopStat = 0 // bm_k1: highest of base STR / DEX / AGI
  private stampedeFiring = false // Ranger Primal Stampede active during endAwakening finale too
  private pet: PetId = 'hawk' // save.pet: the partner ★ พรานแห่งป่า sends in again
  private pets: { id: PetId; pow: number }[] = [] // this wave's pet lineup (rework v1: all 3)
  private sureHit = false // Blitz Beat: skips Flee
  private debtBursting = false // Mobster ทวงหนี้ burst in flight: killMon skips ระเบิดพิษ spread
  private backStabbing = false // Rogue Back Stab in flight: RO Back Stab ignores the monster's LUK lucky dodge · ★ คริเป็นมีด counts it
  // ----- P3'a Rogue 🔪 Dagger Mark / Voracity (design/thief-rogue-rework-v1.md §3.2) -----
  private pickupOpen = false // the hero's own basic / combo / แทงพิษ / Back Stab hit may pick up Marks (closed after one pickup)
  private knifeHitting = false // a flying knife is striking (Kill Reset · no pickup from knives)
  private shadowStabbing = false // rg_c4 ★ Living Shadow stab (no ★ crit knife, no lifesteal)
  private noHitPoison = false // Sinister Steel swing: no st.poison on every monster it touches
  private voracityKillUsed = false; private pickupCdUsed = false; private knifeLoopUsed = false; private critEnergyTurn = 0 // 1 per hero turn guards
  private rgTempo = 0; private rgComboN = 0; private rgDodgeIcd = 0; private rgFlee = 0 // rg_c1 Tempo stacks (wave) · rg_c3 combo hit count, dodge ICD, FLEE bonus until the next hero turn
  private skPlagTurns = 0; private skFullUsed = false // 🥷 sk_d2 ลอกท่า hero turns left · sk_d4 ★ used this wave
  private rgSnatchAmp = 0; private rgSnatchTurns = 0 // 🧤 rg_d3 ฉกบัฟ: stolen war cry (damage share) · hero turns left
  private rgDodged = false; private rgAmbush = false // the hero dodged since the last hero turn -> this turn's Back Stab is a Shadow Ambush
  private zenyWave = 0 // 🧲 แม่เหล็ก: + zeny share this wave
  private mirror = false // 🔁 กระจก: the next landed monster hit is bounced back
  /** Wave start: Beastmaster pets, Innovator traps (+ Ranger Hybrid traps · ★ ป้อมถาวร free turret). */
  private waveAllies() {
    this.pets = []
    if (this.j2?.id === 'beastmaster') {
      const st = this.st, B = KIT2.beastmaster
      const k = B.packPow * (1 + st.j2PetPow) * (st.j2Pack3 > 0 ? 1 + B.tree.pack3Pow : 1) // rework v2.1: all 3 pets every wave · ใจเดียวกัน · ★ ฝูงพันธมิตร
      for (const p of PET_IDS) this.pets.push({ id: p, pow: k })
      for (const p of this.pets) this.spawnAlly(makeAlly(ALLIES[p.id], st, p.pow))
      if ((st.j2Roar > 0 || st.j2RoarWeaken > 0) && this.alive().length) {
        for (const m of this.alive()) {
          if (st.j2Roar > 0) m.gauge -= st.j2Roar
          if (st.j2RoarWeaken > 0) { m.weakPct = Math.max(m.weakTurns > 0 ? m.weakPct : 0, st.j2RoarWeaken); m.weakTurns = Math.max(m.weakTurns, B.roarWeakenTurns); this.dotIcon(m) }
        }
        this.floatText(HERO_X + 70, GROUND - 160, '🐺 ขู่คำราม!', '#c9c9d6')
      }
    }
    const trapCount = (this.j2?.id === 'innovator' ? KIT2.innovator.traps : 0) + this.st.j2Traps
    for (let i = 0; i < trapCount; i++) this.layTrap(TRAP_IDS[Phaser.Math.Between(0, TRAP_IDS.length - 1)])
    if (this.j2?.id === 'innovator' && this.st.j2TurretWave > 0) this.spawnTurret(1)
  }
  private layTrap(id: typeof TRAP_IDS[number], pow = 1) { this.spawnAlly(makeAlly(ALLIES[id], this.st, pow)) }
  private spawnTurret(pow: number) {
    const I = KIT2.innovator
    this.spawnAlly(makeAlly(ALLIES.turret, this.st, pow, this.st.j2TurretWave > 0 ? Infinity : I.turretTurns + this.st.j2TurretTurns))
  }
  // ----- v82 ใยชั้น 2 ผูกพัน / สัญชาตญาณ (numbers KIT2.beastmaster.tree) -----
  private allyActed = false // set by an AllyCtx hit / shield: the ally really did something this act
  private allyHitting = false // an ally hit is running (no ผู้นำฝูง bonus, no ★ พรานแห่งป่า)
  private critPetUsed = false // ★ พรานแห่งป่า: once per hero turn (reset in heroAct)
  private livePets() { return readyAllies(this.allies).filter((a) => a.def.kind === 'pet').length }
  /** A pet acted: ประสานล่า Energy · เยียวยาพงไพร heal (x2 below 35% HP). */
  private petPerks() {
    if (this.st.j2PetRes > 0) this.gainRes(this.st.j2PetRes)
    if (this.st.j2PetHeal > 0 && this.hp > 0) {
      const low = this.st.j2PetHealLow > 0 && this.hp < this.st.maxHp * KIT2.beastmaster.petHealLowHp ? 2 : 1
      this.heal(this.st.maxHp * this.st.j2PetHeal * low, true)
    }
  }
  /** ★ พรานแห่งป่า (bm_s4): a hero crit triggers partner reaction by save.pet (hawk RO Blitz+Mark · boar cleave+push+shield · wolf pounce+bleed+gauge). */
  private critPet(target?: Mon) {
    const a = readyAllies(this.allies).find((x) => x.def.id === this.pet)
    const row = this.alive()
    if (!a || !row.length) return
    this.critPetUsed = true
    const c = this.allyCtx(a), B = KIT2.beastmaster, awPow = this.awakenTurns > 0 ? this.awakenUltPow : 1
    c.say('🏹 พรานแห่งป่า!', '#9fe08a')
    if (a.def.id === 'hawk') {
      const tgt = target && !target.dead ? target : row[Phaser.Math.Between(0, row.length - 1)]
      const fMul = falconHitMul(this.st, BM_CRIT_COUNTER.hawk.mul, this.sageInt, this.heroDex, this.heroTopStat) * a.pow * awPow
      const p = this.sureHit, prevAlly = this.allyHitting; this.sureHit = true; this.allyHitting = true
      let d = 0
      try {
        this.noPetCrit(() => this.withSrc('other', () => {
          this.allyHitFx(a, tgt)
          d = this.strike(tgt, fMul, true, '#f2d24b', 1)
        }))
      } finally { this.sureHit = p; this.allyHitting = prevAlly }
      if (!tgt.dead && d > 0) {
        const fresh = this.markPrey(tgt, Math.max(preyTurnsOf(this.st), BM_CRIT_COUNTER.hawk.markTurns))
        if (fresh && this.st.j2HawkEvo > 0) c.rally('wolf')
      }
    } else if (a.def.id === 'boar') {
      const f = this.front()[0]
      const mul = (BM_CRIT_COUNTER.boar.mul + this.st.j2BoarMul) * petPhysScale(this.st, this.heroTopStat) * a.pow * awPow
      c.hitFront(mul, '#e0b07a')
      if (f && !f.dead) { f.gauge -= BM_CRIT_COUNTER.boar.push; this.floatText(f.spr.x, f.spr.y - f.spr.displayHeight - 25, `⏪ -${BM_CRIT_COUNTER.boar.push}`, '#e0b07a') }
      this.addShield(this.st.maxHp * BM_CRIT_COUNTER.boar.shieldPct)
    } else {
      const mul = (BM_CRIT_COUNTER.wolf.mul + this.st.j2WolfMul + (this.st.j2WolfEvo ? B.wolfEvoMul : 0)) * petPhysScale(this.st, this.heroTopStat) * a.pow * awPow
      c.hitFront(mul, '#c9c9d6', BM_CRIT_COUNTER.wolf.bleed)
      a.gauge = Math.min(100, a.gauge + BM_CRIT_COUNTER.wolf.gaugeGain)
      this.syncAlly(a)
    }
    this.petPerks()
    this.tweens.add({ targets: this.allyTxt.get(a), angle: 12, duration: 60, yoyo: true })
  }
  /** 📯 สั่งลุย: every pet in the lineup does its special move (Ranger replaces with Variant A/B). */
  private async petCommand(pow: number) {
    if (this.st.j3Rn > 0) { await this.rangerVariant(pow); return }
    const B = KIT2.beastmaster
    beastRoarFx(this, HERO_X, GROUND) // 📯 the call goes out
    for (const p of this.pets) {
      if (!this.alive().length) return
      const k = pow * p.pow
      if (p.id === 'hawk') {
        this.floatText(HERO_X + 70, GROUND - 160, '🦅 ฟาด!', '#f2d24b')
        const c = this.allyCtx(makeAlly(ALLIES.hawk, this.st, k))
        const hits = B.cmdHawkHits + this.st.j2CmdHawkAdd
        const hMul = hawkMul(this.st, this.sageInt, this.heroDex, this.heroTopStat) * k
        this.noPetCrit(() => { for (let i = 0; i < hits; i++) c.hitOne(hMul, true, '#f2d24b', true, { mark: true, pierce: 1 }) })
      } else if (p.id === 'boar') this.addShield(this.st.maxHp * B.cmdBoarShield * k)
      else {
        this.floatText(HERO_X + 70, GROUND - 160, '🐺 อู้ววว! เรียกฝูง', '#c9c9d6')
        beastRoarFx(this, HERO_X + 90, GROUND, wolfRoarPalette)
        for (let i = 0; i < B.cmdPack; i++) { const w = makeAlly(ALLIES.pack, this.st, B.cmdPackPow * k); w.gauge = 50; this.spawnAlly(w) }
      }
      await this.wait(BATTLE.stepMs * 0.2)
    }
  }
  /** 🪶 Ranger Skill 3 Variant (design/awakening-beastmaster-v1.md §3.1): Variant A 🌩️ Arrow Storm / Variant B 🎯 Aimed Warg. */
  private async rangerVariant(pow: number) {
    const P = KIT3.ranger, B = KIT2.beastmaster, s = save(), heir = this.st.j3Heir > 0
    const base = pow * (1 + this.st.j3VarMul)
    const packScale = B.packPow * (1 + this.st.j2PetPow) * (this.st.j2Pack3 > 0 ? 1 + B.tree.pack3Pow : 1)
    const k = base * packScale
    const hawkUnit = hawkMul(this.st, this.sageInt, this.heroDex, this.heroTopStat) * k
    beastRoarFx(this, HERO_X, GROUND)
    if (s.job3Var === 'b') {
      const V = P.varB, t = this.bossTarget() ?? this.front()[0]
      if (!t) return
      const heirOn = heir && branchPts(s.job2Tree, V.branch) >= P.heirNeed
      const shots = heirOn ? 2 : 1
      this.callout('🎯 Aimed Warg!', W / 2, 170, '#9fe08a')
      for (let i = 0; i < shots && !t.dead; i++) {
        pierceShotFx(this, t.spr.x, t.spr.y - t.spr.displayHeight * 0.5)
        arrowImpactFx(this, t.spr.x, t.spr.y - t.spr.displayHeight * 0.5)
        this.strike(t, V.boltMul * base * (1 + this.st.pskill), false, '#9fe08a', V.pierce)
        if (i + 1 < shots && !t.dead) await this.wait(90)
      }
      if (!t.dead) {
        const wargMul = (V.wargMul + this.st.j2WolfMul + (this.st.j2WolfEvo ? B.wolfEvoMul : 0)) * petPhysScale(this.st, this.heroTopStat) * k
        const prevAlly = this.allyHitting, fc = this.forceCrit
        this.allyHitting = true; this.forceCrit = fc || heirOn
        let d = 0
        try {
          this.withSrc('other', () => {
            petHitFx(this, 'wolf', t.spr, GROUND, this.petFxN++)
            d = this.strike(t, wargMul, false, '#c9c9d6')
          })
        } finally { this.allyHitting = prevAlly; this.forceCrit = fc }
        if (!t.dead) this.addPoison(t, V.bleedAdd)
        if (heirOn && d > 0) this.healPackRaw(d * B.crunchHeal)
      }
      if (this.alive().length) {
        const row = this.alive(), hTgt = !t.dead ? t : row[Phaser.Math.Between(0, row.length - 1)]
        const pSure = this.sureHit, prevAlly = this.allyHitting
        this.sureHit = true; this.allyHitting = true
        try {
          this.noPetCrit(() => this.withSrc('other', () => {
            petHitFx(this, 'hawk', hTgt.spr, GROUND, this.petFxN++)
            const hd = this.strike(hTgt, hawkUnit, true, '#f2d24b', 1)
            if (!hTgt.dead && hd > 0) this.markPrey(hTgt)
          }))
        } finally { this.sureHit = pSure; this.allyHitting = prevAlly }
      }
      this.addShield(this.st.maxHp * B.cmdBoarShield * k)
      if (this.pet === 'boar' && !t.dead) { t.gauge -= V.boarPush; this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 25, `⏪ -${V.boarPush}`, '#e0b07a') }
      this.petPerks()
      await this.wait(BATTLE.stepMs * 0.25)
      return
    }
    const V = P.varA, heirOn = heir && branchPts(s.job2Tree, V.branch) >= P.heirNeed
    const row = this.alive()
    if (!row.length) return
    this.callout(heirOn ? '🌩️ Arrow Storm + Razor Gust!' : '🌩️ Arrow Storm!', W / 2, 170, '#9fe08a')
    arrowRainFx(this, GROUND, undefined, row.reduce((sum, m) => sum + m.spr.x, 0) / row.length)
    for (const m of row) {
      arrowImpactFx(this, m.spr.x, m.spr.y - m.spr.displayHeight * 0.5)
      this.strike(m, V.arrowMul * base * (1 + this.st.pskill), false, '#9fe08a')
    }
    await this.wait(BATTLE.stepMs * 0.2)
    if (this.alive().length) {
      const c = this.allyCtx(makeAlly(ALLIES.hawk, this.st, k))
      const hits = B.cmdHawkHits + this.st.j2CmdHawkAdd
      this.noPetCrit(() => { for (let i = 0; i < hits; i++) c.hitOne(hawkUnit, true, '#f2d24b', true, { mark: true, pierce: 1 }) })
    }
    if (heirOn && this.alive().length) {
      const pSure = this.sureHit, prevAlly = this.allyHitting
      this.sureHit = true; this.allyHitting = true
      try {
        this.noPetCrit(() => this.withSrc('other', () => {
          for (const m of this.alive()) {
            petHitFx(this, 'hawk', m.spr, GROUND, this.petFxN++)
            const d = this.strike(m, hawkUnit, true, '#f2d24b', 1)
            if (!m.dead && d > 0) { this.markPrey(m); m.blind = Math.max(m.blind, V.blindTurns); this.dotIcon(m) }
          }
        }))
      } finally { this.sureHit = pSure; this.allyHitting = prevAlly }
    }
    this.addShield(this.st.maxHp * B.cmdBoarShield * k)
    if (this.alive().length) {
      beastRoarFx(this, HERO_X + 90, GROUND, wolfRoarPalette)
      for (let i = 0; i < B.cmdPack; i++) { const w = makeAlly(ALLIES.pack, this.st, B.cmdPackPow * k); w.gauge = 50; this.spawnAlly(w) }
    }
    this.petPerks()
    await this.wait(BATTLE.stepMs * 0.2)
  }
  private awakenTurns = 0 // 🐾 Primeval Awakening hero turns left
  private awakenAbsorbed = 0 // total damage absorbed by the boar during Awakening (for end shield)
  private awakenUltPow = 1 // 1 + ult2Pow while Awakening is active
  /** 🐾 Primeval Awakening (Q5) + ✨ Primal Stampede (Ranger Ult 2). */
  private async primevalAwakening(ultPow: number) {
    const B = KIT2.beastmaster
    beastRoarFx(this, HERO_X, GROUND)
    this.cameras.main.flash(140, 240, 200, 120)
    this.callout(this.st.j3Rn > 0 ? '✨ PRIMAL STAMPEDE!' : '🐾 PRIMEVAL AWAKENING!', W / 2, 170, '#f2d24b')
    while (this.cleanseOne()) { /* clear hero debuffs */ }
    for (const a of this.allies) if (!a.dead && a.def.share) { a.down = 0; a.hp = a.maxHp; this.syncAlly(a) }
    for (const m of this.alive()) this.stunMon(m)
    this.awakenTurns = B.ultAwakenTurns + this.st.j2UltAwakenAdd + 1 // ticks down at end of this hero turn
    this.awakenAbsorbed = 0
    this.awakenUltPow = Math.max(1, ultPow)
    if (this.st.j3Rn > 0) {
      const volleys = KIT3.ranger.ultVolleys + this.st.j3GospelField
      for (let i = 0; i < volleys && this.alive().length; i++) {
        this.runStampedeVolley()
        await this.wait(BATTLE.stepMs * 0.25)
      }
      return
    }
    await this.wait(BATTLE.stepMs * 0.3)
  }
  /** One synchronous Primal Stampede volley (used at start & finale of Awakening). */
  private runStampedeVolley() {
    const P = KIT3.ranger, row = this.alive()
    if (!row.length || this.hp <= 0) return
    const k3 = (1 + this.st.u3Pow) * this.awakenUltPow
    stampedeFx(this, row.reduce((sum, m) => sum + m.spr.x, 0) / row.length, GROUND)
    const prevStampede = this.stampedeFiring, prevAlly = this.allyHitting
    this.stampedeFiring = true; this.allyHitting = true
    try {
      this.withSrc('ult', () => {
        const hawkTargets = Phaser.Utils.Array.Shuffle([...row]).slice(0, P.ultHawkTargets)
        const hMul = falconHitMul(this.st, P.ultHawkMul + this.st.j2HawkMul, this.sageInt, this.heroDex, this.heroTopStat) * k3
        const pSure = this.sureHit; this.sureHit = true
        try {
          this.noPetCrit(() => {
            for (const m of hawkTargets) {
              if (m.dead) continue
              petHitFx(this, 'hawk', m.spr, GROUND, this.petFxN++)
              const d = this.strike(m, hMul, true, '#f2d24b', 1)
              if (!m.dead && d > 0) this.markPrey(m)
            }
          })
        } finally { this.sureHit = pSure }
        const bMul = P.ultBoarMul * k3 * (1 + this.st.j2BoarMul) * petPhysScale(this.st, this.heroTopStat)
        this.noPetCrit(() => {
          for (const m of this.alive()) { petHitFx(this, 'boar', m.spr, GROUND, this.petFxN++); this.strike(m, bMul, false, '#e0b07a') }
        })
        const wolfTgt = this.bossTarget() ?? this.front()[0]
        if (wolfTgt && !wolfTgt.dead) {
          const wMul = P.ultWolfMul * k3 * (1 + this.st.j2WolfMul) * petPhysScale(this.st, this.heroTopStat)
          const fc = this.forceCrit; this.forceCrit = true
          try {
            petHitFx(this, 'wolf', wolfTgt.spr, GROUND, this.petFxN++)
            this.strike(wolfTgt, wMul, false, '#c9c9d6')
          } finally { this.forceCrit = fc }
          if (!wolfTgt.dead) this.addPoison(wolfTgt, P.ultWolfBleed)
        }
        if (this.st.j3GospelHeal > 0) {
          this.heal(this.st.maxHp * this.st.j3GospelHeal, true)
          this.healBoarShare(this.st.j3GospelHeal)
        }
      })
    } finally { this.stampedeFiring = prevStampede; this.allyHitting = prevAlly }
  }
  /** Awakening ends: Ranger Finale Stampede + shield from absorbed damage + post-awakening bless. */
  private endAwakening() {
    const B = KIT2.beastmaster
    if (this.st.j3Rn > 0 && this.alive().length && this.hp > 0) this.runStampedeVolley()
    else {
      const row = this.alive()
      if (row.length) stampedeFx(this, row.reduce((sum, m) => sum + m.spr.x, 0) / row.length, GROUND)
    }
    const sh = Math.max(this.st.maxHp * B.ultEndShieldMin, this.awakenAbsorbed * B.ultEndShield) * this.awakenUltPow
    this.addShield(sh)
    this.floatText(HERO_X + 70, GROUND - 160, '🐾 สิ้นสุด Awakening! 🛡️', '#f2d24b')
    if (this.st.j3Rn > 0 && this.st.j3AfterBless > 0) {
      this.j3Bless = KIT3.common.afterTurns
      this.floatText(HERO_X, GROUND - 150, `🌅 พรหลังศึก +${Math.round(this.st.j3AfterBless * 100)}%`, '#ffe08a')
    }
    this.awakenAbsorbed = 0; this.awakenUltPow = 1
  }
  /** 🎲 กล่องสุ่มประหลาด: one gadget (💥 jackpot = all of them). */
  private async gadget(id: GadgetId, pow: number) {
    const I = KIT2.innovator, g = gadgetById(id), k = pow * (1 + this.st.j2BoxMul), all = id === 'jackpot'
    const on = (x: GadgetId) => all || id === x
    this.callout(`${g.rare ? '⭐ ' : ''}${g.icon} ${g.name}!`, W / 2, 170, g.rare ? '#f2d24b' : '#f6eedc')
    if (all) this.cameras.main.flash(160, 255, 220, 120)
    if (on('chicken')) { for (const a of this.allies) if (a.def.id === 'chicken') { a.dead = true; this.syncAlly(a) } this.allies = liveAllies(this.allies); this.spawnAlly(makeAlly(ALLIES.chicken, this.st)) }
    if (on('banana')) { const t = this.front()[0]; if (t) this.stunMon(t) }
    if (on('rocket')) { const t = this.alive(); if (t.length) { const m = t[Phaser.Math.Between(0, t.length - 1)]; await this.shoot(m, 0xff8c42, () => { this.strike(m, I.rocketMul * k * (1 + this.st.pskill), false, '#ff8c42'); this.burst(m.spr.x, m.spr.y - 30, 0xff8c42, 14, 200) }) } }
    if (on('robot')) this.spawnTurret(k)
    if (on('magnet')) { this.zenyWave = Math.max(this.zenyWave, I.magnetZeny); this.floatText(HERO_X, GROUND - 170, `🧲 zeny +${Math.round(I.magnetZeny * 100)}% เวฟนี้`, '#f2b84b') }
    if (on('mirror')) { this.mirror = true; this.floatText(HERO_X, GROUND - 150, '🔁 สะท้อนฮิตถัดไป', '#c9e0ff') }
    if (on('cola')) { for (const m of this.alive()) { this.strike(m, I.colaMul * k * (1 + this.st.pskill), false, '#c98a4a'); if (!m.dead) { m.chill = Math.max(m.chill, I.colaChill); this.dotIcon(m) } } this.burst(700, GROUND - 40, 0xc98a4a, 16, 200) }
    if (on('balloon')) { this.dodgeCharges++; this.floatText(HERO_X, GROUND - 130, '🎈 หลบ 1 ครั้ง', '#ff9ac9') }
    if (on('cloud')) for (const m of this.alive()) { m.wet = Math.max(m.wet, I.wetTurns); this.dotIcon(m) }
    await this.wait(BATTLE.stepMs * 0.3)
  }
  private spawnAlly(a: Ally) {
    this.allies.push(a)
    const i = this.allies.length - 1
    this.allyTxt.set(a, this.add.text(HERO_X + 70 + i * 34, GROUND - 40, '', { fontSize: '28px', align: 'center' }).setOrigin(0.5, 1).setDepth(9000))
    this.syncAlly(a)
  }
  private syncAlly(a: Ally) {
    const t = this.allyTxt.get(a); if (!t?.active) return
    if (a.dead) { t.destroy(); this.allyTxt.delete(a); return }
    const info = a.down > 0 ? `💤${a.down}` : a.def.hp ? `${a.hp}${a.def.rageK ? `\n💢${Math.floor(a.rage)}` : ''}` : '' // 🐗 HP + Rage · down = turns left
    t.setText(`${a.def.icon}\n${info}`).setFontSize(a.def.hp ? 18 : 28).setAlpha(a.down > 0 ? 0.45 : 1)
  }
  private clearAllies() { for (const a of this.allies) { a.dead = true; this.syncAlly(a) } this.allies = [] }
  /** Hero basic / combo swing: allies with trigger 'heroBasic' act (Tempest Bell rings). */
  private alliesOnSwing() {
    const combo = this.comboLevel >= 2 || this.awakenTurns > 0
    for (const a of readyAllies(this.allies)) if ((a.def.trigger === 'heroBasic' || (combo && a.def.comboFollow)) && this.alive().length) this.allyAct(a, this.comboLevel >= 2) // wolf: bites along with hero combo hits (or every basic during Awakening)
  }
  /** 🐗 Guardian split (allies.guardHit): the boar takes its share, Rage full = an extra charge. Returns the hero's part. */
  private boarGuard(n: number, src?: Mon): number {
    const B = KIT2.beastmaster
    const g = guardHit(this.allies, n, this.st, this.awakenTurns > 0 ? B.ultBoarShare : undefined); if (!g) return n
    const bx = this.allyTxt.get(g.ally)?.x ?? HERO_X + 70 // over the boar's own slot
    boarGuardFx(this, bx, GROUND - 55)
    this.damageNumber(bx, GROUND - 90, g.took, false, '#f2b84b')
    if (this.awakenTurns > 0) {
      this.awakenAbsorbed += g.took
      if (src && !src.dead) {
        const ref = Math.max(1, Math.round(Math.min(g.took * B.ultReflect * this.awakenUltPow, this.st.maxHp * BATTLE.reflectCap)))
        this.damageMon(src, ref, false, '#f2d24b', true)
      }
    }
    if (g.broke) this.floatText(bx, GROUND - 130, g.ally.dead ? `${g.ally.def.icon} หมดแรง!` : `${g.ally.def.icon} หมดแรง! พัก ${g.ally.down} เทิร์น`, '#e0b07a')
    this.syncAlly(g.ally)
    if (g.full && g.ally.def.charge && this.alive().length) {
      this.floatText(bx, GROUND - 175, '💢 เกจโกรธเต็ม!', '#ff9a3c')
      if (this.st.j2StanceGritShield > 0) this.addShield(this.st.maxHp * this.st.j2StanceGritShield)
      this.allyAct(g.ally, false, undefined, g.ally.def.charge)
    }
    return g.hero
  }
  /** A monster attack goes to a taunting ally instead of the hero (raw damage, no DEF); true = the ally took it. */
  private allyTaunt(dmg: number): boolean {
    const a = tauntTarget(this.allies); if (!a) return false
    const broke = hurtAlly(a, dmg)
    this.damageNumber(HERO_X + 70, GROUND - 90, Math.max(1, Math.round(dmg)), false, '#bfe6ff')
    if (broke) a.def.onBreak?.(this.allyCtx(a))
    this.syncAlly(a)
    return true
  }
  /** Rogue มีดบิน: n knives at random monsters (KIT2.rogue.markFocus: one still under the Mark cap) or at `pick()`.
   *  Thrown outside basicOnce, so lsMul is 0: no lifesteal (Q). */
  private throwKnives(n: number, mul = this.knifeMul(), pick?: () => Mon | undefined) {
    for (let i = 0; i < n; i++) {
      const t = this.alive(); if (!t.length) return
      const m = pick?.() ?? this.knifeTarget(t)
      sfx.knifeThrow()
      this.floatText(m.spr.x - 20, m.spr.y - m.spr.displayHeight - 34, '🔪', '#e0e0f0')
      this.knifeHit(m, mul)
    }
  }
  /** P3'a: knife x P.ATK (base + มีดคม / ใบมีดลับคม) x (1 + pskill x KIT2.rogue.knifePskillShare). The storm has its own formula. */
  private knifeMul(base: number = KIT2.rogue.knifeMul) { return rogueKnifeMul(this.st, base) }
  private markCap() { return stalkerMarkCap(this.st) } // 🥷 Preserve raises it
  private knifeTarget(t: Mon[]): Mon {
    if (Math.random() < KIT2.rogue.markFocus) { const open = t.filter((m) => m.dagger < this.markCap()); if (open.length) return open[Phaser.Math.Between(0, open.length - 1)] }
    return t[Phaser.Math.Between(0, t.length - 1)]
  }
  /** P3'a one flying knife (combo / crit / free / storm): strike (src 'other'), then a landed knife adds 🔪 +1 Mark,
   *  rg_k3 a status, rg_k2 one bounce (a bounced knife never bounces again). */
  private knifeHit(m: Mon, mul: number, bounced = false) {
    const had = m.dagger, prev = this.knifeHitting
    this.knifeHitting = true
    let dmg = 0
    try { dmg = this.withSrc('other', () => this.strike(m, mul, false, '#e0e0f0', this.st.j3Sk > 0 ? this.st.j3Pierce : 0)) } finally { this.knifeHitting = prev } // 🥷 มีดทะลวงเงา
    if (dmg <= 0 || this.j2?.id !== 'rogue') return
    const R = KIT2.rogue
    if (!m.dead) {
      if (this.st.j3Sk > 0 && had >= this.markCap()) this.resGain(KIT3.stalker.fullMarkRes) // 🥷 Preserve: a knife on a full-Mark monster
      m.dagger = Math.min(this.markCap(), m.dagger + 1); m.daggerTurns = R.markTurns + (this.st.j3Sk > 0 ? KIT3.stalker.markTurnsAdd : 0)
      if (this.st.j2KnifeStatus > 0 && Math.random() < this.st.j2KnifeStatus) this.knifeStatus(m)
      this.dotIcon(m)
    }
    if (!bounced && this.st.j2KnifeBounce > 0 && (m.dead || had >= R.knifeBounceAt)) {
      const o = this.alive().filter((x) => x !== m)
      if (o.length) {
        const b = o[Phaser.Math.Between(0, o.length - 1)]
        sfx.knifeBounce()
        this.floatText(b.spr.x - 20, b.spr.y - b.spr.displayHeight - 34, '🔪↪', '#e0e0f0')
        this.knifeHit(b, mul * (R.knifeBounce + this.st.j2KnifeBounce), true)
      }
    }
  }
  /** P3'a rg_k3 มีดอาบสถานะ: แผลลึก Wound +1 · else Exposed +1 monster turn · else +1 poison on a poisoned monster. */
  private knifeStatus(m: Mon) {
    if (this.s2?.id === 'th_wound') this.addWound(m, 1)
    else if (m.exposed > 0) m.exposed++
    else if (m.poison > 0) this.addPoison(m, 1)
  }
  /** P3'a 🔪 เก็บมีด (Voracity pickup): every Mark on `m` -> a Sinister Steel swing (no poison, no lifesteal, never a forced crit),
   *  Energy, a Combo Point, Back Stab CD cut (2+ Marks, 1 per hero turn) and rg_k4 ★ a Skill 2 / 3 CD cut. */
  private voracityPickup(m: Mon) {
    this.pickupOpen = false // closed BEFORE the swing: its own hits never pick up
    const R = KIT2.rogue, n = m.dagger
    m.dagger = 0; m.daggerTurns = 0; this.dotIcon(m)
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 52, `🔪 เก็บมีด ×${n}`, '#ffd36b')
    daggerCrossFx(this, m.spr.x, m.spr.y - m.spr.displayHeight / 2)
    sfx.voracityPickup(n)
    const steel = rogueSteelMul(n, this.st.pskill)
    const prev = { ls: this.lsMul, force: this.forceCrit, stab: this.backStabbing, poison: this.noHitPoison }
    this.lsMul = 0; this.forceCrit = false; this.backStabbing = false; this.noHitPoison = true
    try {
      this.withSrc('other', () => {
        if (!m.dead) this.strike(m, steel, false, '#ffd36b')
        for (const o of this.alive()) if (o !== m) this.strike(o, steel * R.markSteelSplash, false, '#ffd36b')
      })
    } finally { this.lsMul = prev.ls; this.forceCrit = prev.force; this.backStabbing = prev.stab; this.noHitPoison = prev.poison }
    this.resGain(R.markRes * n)
    this.rogueCp = Math.min(R.stabCpMax, this.rogueCp + R.markCp)
    if (n >= R.stabPickupAt && !this.pickupCdUsed && this.s3Cd > 0) {
      this.pickupCdUsed = true; this.s3Cd = Math.max(0, this.s3Cd - R.stabPickupCdCut)
      this.floatText(HERO_X, GROUND - 175, `🗡️ Back Stab CD -${R.stabPickupCdCut}`, '#ffd36b')
    }
    if (this.st.j2KnifeLoop > 0 && !this.knifeLoopUsed && (this.s2Cd > 0 || this.s3Cd > 0)) { // rg_k4 ★ ห่ามีดวนลูป: the longer of Skill 2 / Skill 3
      this.knifeLoopUsed = true
      if (this.s2Cd >= this.s3Cd) this.s2Cd--; else this.s3Cd--
    }
  }
  /** P3'a 🔪 Kill Reset: Back Stab + Ult CD -1 and free knives at the lowest-HP monster (flag set BEFORE the knives: no kill chain). */
  private killReset() {
    this.voracityKillUsed = true
    this.s3Cd = Math.max(0, this.s3Cd - 1); this.cutUltCd(1)
    sfx.killReset()
    this.floatText(HERO_X, GROUND - 190, '🔪 Kill Reset! CD -1', '#ffd36b')
    this.throwKnives(KIT2.rogue.markKillKnives, this.knifeMul(), () => this.alive().sort((a, b) => a.hp - b.hp)[0])
  }
  /** P3'a rg_x3 ดูดเลือดจากคมคริ: heal a share of a crit / pickup hit + Energy (KIT2.rogue.critLeechResMax per hero turn). */
  private rgLeech(dmg: number) {
    if (this.st.j2CritLeech > 0 && this.hp > 0) this.heal(dmg * this.st.j2CritLeech, true)
    const e = Math.min(this.st.j2CritEnergy, KIT2.rogue.critLeechResMax - this.critEnergyTurn)
    if (e > 0 && this.job.resource === 'energy') { this.critEnergyTurn += e; this.resGain(e) }
  }
  /** P3'a Rogue debuffs for rg_x2 ใจสลาย: poison / Wound / Exposed / Strip / chill. */
  private rgDebuffed(m: Mon) { return this.j2?.id === 'rogue' && (m.poison > 0 || m.wound > 0 || m.exposed > 0 || m.strip > 0 || m.chill > 0) }
  /** P3'a rg_c2 แทงรัวซ้ำแผล: combo dmg per debuff kind / Mark on the target (KIT2.rogue.comboDebuffMax kinds). */
  private rgComboDebuff(m: Mon) {
    if (this.st.j2ComboDebuff <= 0 || this.j2?.id !== 'rogue') return 0
    return rogueComboDebuff(this.st, debuffKinds(this.debuffFlags(m), true) + (m.dagger > 0 ? 1 : 0) + (m.strip > 0 ? 1 : 0))
  }
  /** P3'a crit adds vs `m`: rg_x1 Ambush (HP high / low / Exposed) + rg_k1 on a hit that picks up Marks. */
  private rgCritAdd(m: Mon) {
    if (this.j2?.id !== 'rogue') return 0
    return rogueAmbushCrit(this.st, m.hp / Math.max(1, m.def.hp), m.exposed > 0) + (this.pickupOpen && !this.knifeHitting && m.dagger > 0 ? this.st.j2MarkCrit : 0)
  }
  /** P3'a: once per hero turn (guards, Shadow Ambush window, rg_c3 FLEE / ICD, rg_k4 ★ free knife on a Mark-free field). */
  private rogueTurnStart() {
    this.voracityKillUsed = false; this.pickupCdUsed = false; this.knifeLoopUsed = false; this.critEnergyTurn = 0
    this.rgAmbush = this.rgDodged; this.rgDodged = false; this.rgFlee = 0
    if (this.rgDodgeIcd > 0) this.rgDodgeIcd--
    const live = this.alive()
    if (this.st.j2KnifeLoop > 0 && live.length && live.every((m) => m.dagger <= 0)) this.throwKnives(1)
  }
  /** P3'a Rogue combo hit: rg_c1 Tempo + rg_c3 FLEE / sure dodge every N hits (ICD). */
  private rogueComboHit() {
    const R = KIT2.rogue
    if (this.st.j2Tempo > 0 && this.rgTempo < R.comboTempoMax) this.rgTempo++
    if (this.st.j2ComboDodge > 0) {
      this.rgFlee = this.st.j2ComboDodge
      if (++this.rgComboN >= R.comboDodgeEvery && this.rgDodgeIcd <= 0) {
        this.rgComboN = 0; this.rgDodgeIcd = R.comboDodgeIcdTurns; this.dodgeCharges++
        sfx.shadowStep()
        this.floatText(HERO_X, GROUND - 150, '💨 เงาพริ้วสลับร่าง', '#c9c9d6')
      }
    }
  }
  /** P3'a Back Stab hit (also the rg_c4 ★ shadow): sure crit, sure hit, opens a Mark pickup. */
  private async backStab(t: Mon, mul: number, shadow = false, sfxOpts?: { ambush?: boolean; cp?: number }) {
    const prevLs = this.lsMul
    this.forceCrit = true; this.backStabbing = true; this.shadowStabbing = shadow; this.pickupOpen = true
    if (shadow) this.lsMul = 0
    try { await this.lunge(t, () => { backstabFx(this, t.spr); sfx.backStab({ ambush: sfxOpts?.ambush, cp: sfxOpts?.cp, shadow }); this.strike(t, mul, false, shadow ? '#b9a8ff' : '#ffd36b') }, true, true) }
    finally { this.forceCrit = false; this.backStabbing = false; this.shadowStabbing = false; this.pickupOpen = false; this.lsMul = prevLs }
  }
  /** 🧤 rg_d4 ★ ตัดจังหวะ: a casting monster with >= divest.breakMarks Marks that isn't immune yet (most Marks first). */
  private breakCastTarget(): Mon | undefined {
    if (this.st.j2BreakCast <= 0) return undefined
    const D = KIT2.rogue.divest
    return this.alive().filter((m) => m.charging && m.dagger >= D.breakMarks && !(m.breakImmune ?? 0)).sort((a, b) => b.dagger - a.dagger)[0]
  }
  /** 🧤 rg_d4: spend every Mark on `m` and cut its cast: a normal monster just stops, a boss / mini breaks (gauge back, next cast steady). */
  private divestBreak(m: Mon) {
    const D = KIT2.rogue.divest
    m.dagger = 0; m.daggerTurns = 0; m.breakImmune = D.breakImmune
    const bossy = monTier(m.def) !== 'normal'
    this.endMonCast(m, { text: bossy ? '⛓️ ตัดจังหวะ! ร่ายแตก' : '⛓️ ตัดจังหวะ!', color: '#ffd36b' }, bossy ? D.breakPush : 0)
    if (bossy && monCastPity()) m.castSteady = true
    this.shake(70, 0.004)
    this.dotIcon(m)
    this.stalkerPlagiarize()
  }
  /** 🧤 strip potency on `m` (lazy): boss / mini x bossMul, stripped again within resTurns x resMul. Reading it starts the boss's resistance. */
  private divestPotOf(m: Mon) {
    let k: number | undefined
    return () => {
      if (k !== undefined) return k
      const bossy = monTier(m.def) !== 'normal'
      k = divestMul(bossy, (m.divestRes ?? 0) > 0, this.st.j3Sk > 0 && this.st.j3SkRes > 0 ? stalkerResMul(this.st.j3SkRes) : undefined)
      if (bossy) m.divestRes = KIT2.rogue.divest.resTurns
      return k
    }
  }
  /** 🧤 rg_d3 ✋ ฉกบัฟ: steal one buff (war cry > shield > reflect / absorb > vengeance), keep snatchShare of it. */
  private divestSnatch(m: Mon, pot: () => number) {
    const D = KIT2.rogue.divest
    if ((m.snatchCd ?? 0) > 0) return
    const has = m.atkUpTurns > 0 || m.shield > 0 || m.reflect > 0 || m.absorb > 0 || m.stored > 0 || !!m.vengTurns
    if (!has) return
    const share = snatchShare(this.st.j2Snatch) * pot()
    let got = ''
    if (m.atkUpTurns > 0) {
      const amp = Math.min(D.snatchAmpCap, m.atkUp * share)
      m.atkUp = 0; m.atkUpTurns = 0
      this.rgSnatchAmp = Math.max(this.rgSnatchTurns > 0 ? this.rgSnatchAmp : 0, amp); this.rgSnatchTurns = D.snatchTurns
      got = `💢 ATK +${Math.round(amp * 100)}%`
    } else if (m.shield > 0) {
      const sh = Math.min(this.st.maxHp * D.snatchShieldCap, m.shield * share)
      m.shield = 0
      if (sh > 0) this.addShield(sh, true)
      got = `🛡️ โล่ ${Math.round(sh)}`
    } else if (m.reflect > 0 || m.absorb > 0 || m.stored > 0) { m.reflect = 0; m.absorb = 0; m.stored = 0; got = '🔁 สะท้อน' }
    else { m.vengTurns = 0; m.vengCd = BATTLE.vengeance.cd; got = '🖤 ความแค้น' }
    m.snatchCd = D.snatchCd
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 44, `✋ ฉก ${got}`, '#ffd36b')
    this.dotIcon(m)
    this.stalkerPlagiarize()
  }
  /** 🥷 strip kinds on `m` for sk_d1 เหยื่อเปลือย: 🔓 Strip Armor · 🧤 disarm · 😰 weak · 👁️ Exposed · 🦴 armor break. */
  private stripKinds(m: Mon) {
    return (m.strip > 0 ? 1 : 0) + ((m.disarm ?? 0) > 0 ? 1 : 0) + (m.weakTurns > 0 ? 1 : 0) + (m.exposed > 0 ? 1 : 0) + (m.armorBrk > 0 ? 1 : 0)
  }
  /** 🥷 sk_d2 ลอกท่า: a broken cast / a snatched buff -> hero damage + for plagTurns hero turns. */
  private stalkerPlagiarize() {
    if (this.st.j3Sk <= 0 || this.st.j3SkPlag <= 0) return
    if (this.skPlagTurns <= 0) this.floatText(HERO_X, GROUND - 190, `🎭 ลอกท่า! ดาเมจ +${Math.round(this.st.j3SkPlag * 100)}%`, '#b9a8ff')
    this.skPlagTurns = KIT3.stalker.divest.plagTurns
  }
  /** 🥷 sk_d4 ★ ปลดเปลือยหมดตัว: once a wave, Phantom Storm strips every monster (boss potency rules apply). */
  private stalkerFullDivest() {
    if (this.st.j3SkStrip <= 0 || this.skFullUsed || !this.alive().length) return
    this.skFullUsed = true
    const V = KIT3.stalker.divest, R = KIT2.rogue
    this.callout('🌪️ ปลดเปลือยหมดตัว!', W / 2, 200, '#ffd36b')
    for (const m of this.alive()) {
      const k = this.divestPotOf(m)()
      m.weakPct = Math.max(m.weakTurns > 0 ? m.weakPct : 0, V.fullWeak * k); m.weakTurns = Math.max(m.weakTurns, V.fullTurns)
      m.disarm = Math.max(m.disarm ?? 0, 2); m.disarmPct = Math.max(m.disarmPct ?? 0, V.fullDisarm * k)
      m.exposedPct = Math.max(m.exposed > 0 ? m.exposedPct : 0, V.fullExposed * k); m.exposed = Math.max(m.exposed, V.fullTurns)
      m.strip = Math.max(m.strip, R.stabStripTurns)
      if (m.atkUpTurns > 0) { m.atkUp = 0; m.atkUpTurns = 0 } else if (m.shield > 0) { m.shield = 0 } else if (m.reflect > 0 || m.absorb > 0) { m.reflect = 0; m.absorb = 0 }
      this.dotIcon(m)
    }
  }
  /** 🧤 after Back Stab: rg_d1 ปลดอาวุธ (>= divest.marks Marks) · rg_d2 full Marks -> Exposed. `marks` = Marks before the pickup. */
  private divestAfterStab(t: Mon, marks: number, full: boolean, pot: () => number) {
    const D = KIT2.rogue.divest
    if (this.st.j2Disarm > 0 && marks >= D.marks) {
      const k = pot()
      t.weakPct = Math.max(t.weakTurns > 0 ? t.weakPct : 0, disarmWeak(this.st.j2Disarm) * k); t.weakTurns = Math.max(t.weakTurns, D.turns)
      t.disarm = 2; t.disarmPct = Math.max(t.disarmPct ?? 0, D.disarm * k)
      this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 62, '🧤 ปลดอาวุธ!', '#ffd36b')
    }
    if (this.st.j2StripPlus > 0 && full) {
      t.exposedPct = Math.max(t.exposed > 0 ? t.exposedPct : 0, D.exposedPct * pot()); t.exposed = Math.max(t.exposed, D.exposedTurns)
    }
  }
  /** P3'a Back Stab target: most Marks, then highest HP. */
  private stabTarget(): Mon | undefined { return this.alive().sort((a, b) => b.dagger - a.dagger || b.hp - a.hp)[0] }
  /** Rogue 🌪️ พายุมีด (VFX v2): the backdrop dims, a ring of daggers whirls over the monsters and collapses, then `n`
   *  knives dive from the sky one after another (same rules as throwKnives: random alive monster each, no lifesteal).
   *  A knife's damage lands when it arrives; if its target died on the way it hits another live monster. The last knife
   *  lands big (gold flash + hit-stop). */
  private async knifeStorm(n: number, mul: number) {
    const live = this.alive(); if (!live.length || n <= 0) return
    const D = THIEF_FX.dim, step = BATTLE.stepMs
    const dim = this.add.rectangle(0, 0, W, H, 0x05030c, 0).setOrigin(0).setDepth(D.depth)
    this.tweens.add({ targets: dim, fillAlpha: D.alpha, duration: D.fadeMs })
    const cx = live.reduce((a, m) => a + m.spr.x, 0) / live.length
    this.heroRig.playWindup(false)
    const collapseMs = knifeStormFx(this, cx, GROUND)
    this.callout('🌪️ พายุมีด!', W / 2, 165, '#ffd36b')
    sfx.knifeStormBuild(collapseMs / (this.fast ? 2000 : 1000))
    await this.wait(collapseMs)
    this.heroRig.playStrike(1, false)
    this.shake(90, 0.006)
    const flights: Promise<void>[] = []
    for (let i = 0; i < n; i++) {
      const t = this.alive(); if (!t.length) break
      const m = t[Phaser.Math.Between(0, t.length - 1)], last = i === n - 1
      flights.push(this.diveKnife(m, mul, i, last, n))
      await this.wait(step * 0.07)
    }
    await Promise.all(flights)
    this.tweens.add({ targets: dim, fillAlpha: 0, duration: D.fadeMs * 2, onComplete: () => dim.destroy() })
    await this.wait(step * 0.2)
  }
  /** One storm knife: dives at `m` from high on the left, then strikes on arrival (or another live monster if `m` died). */
  private async diveKnife(m: Mon, mul: number, i: number, last: boolean, total = 8) {
    const tx = m.spr.x + Phaser.Math.Between(-8, 8), ty = m.spr.y - m.spr.displayHeight * THIEF_FX.knife.chest
    const sx = tx - Phaser.Math.Between(70, 150), sy = ty - Phaser.Math.Between(190, 250)
    const k = flyingKnife(this, sx, sy, Math.atan2(ty - sy, tx - sx))
    sfx.knifeThrow()
    if (k) await this.tween({ targets: k, x: tx, y: ty, duration: BATTLE.stepMs * 0.22, ease: 'Quad.easeIn' })
    k?.destroy()
    const t = m.dead ? this.alive() : [m]; if (!t.length) return
    const hit = t[Phaser.Math.Between(0, t.length - 1)]
    knifeLandFx(this, hit.spr, i, last)
    if (last) sfx.knifeStormFinale()
    else sfx.knifeLand(i, total)
    this.knifeHit(hit, mul) // P3'a: storm knives mark too
    if (last) {
      this.cameras.main.flash(120, 255, 211, 107)
      this.shake(160, 0.012)
      this.hitStop(70)
    }
  }
  /** Rogue: knives per combo hit (+ crit knives owed). */
  private comboKnives(comboHit: boolean) {
    if (this.j2?.id !== 'rogue') return
    const R = KIT2.rogue
    const n = comboHit ? R.knifePerCombo + (this.dualKnife ? R.dualKnife : 0) + this.st.j2KnifeAdd : 0, c = this.critKnives
    this.critKnives = 0
    if (n > 0) this.throwKnives(n)
    if (c > 0) this.throwKnives(c, this.knifeMul(R.critKnifeMul)) // ★ คริเป็นมีด: crit knives hit harder (P3'a)
  }
  /** Mobster สมุดหนี้: debuff kinds on a monster (★ ดอกเบี้ยทบต้น x2). */
  private debt(m: Mon) {
    const n = (m.poison > 0 ? 1 : 0) + (m.burnTurns > 0 || m.burnStacks > 0 || m.hell > 0 ? 1 : 0) + (m.chill > 0 ? 1 : 0) + (m.weakTurns > 0 ? 1 : 0) + ((m.marked ?? 0) > 0 ? 1 : 0) + (m.armorBrk > 0 ? 1 : 0)
    return n * (this.st.j2DebtX2 > 0 ? 2 : 1)
  }
  private execLine(m: Mon) { const M = KIT2.mobster; return M.execBase + M.execPer * this.debt(m) + this.st.j2ExecAdd }
  /** Mobster Execute: a normal monster under the debt line dies at once (bosses / minis take x bossExecMul in j2Mul instead). */
  private mobExec(m: Mon) {
    if (m.dead || m.def.ai === 'boss' || this.hp <= 0 || m.hp >= m.def.hp * this.execLine(m)) return false
    sfx.mobsterExecute()
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '⚰️ เก็บงาน!', '#c9a8ff')
    this.mobExecuting = true
    try { this.damageMon(m, m.hp + m.shield, false, '#c9a8ff') } finally { this.mobExecuting = false }
    if (!m.dead) return false
    if (this.st.j3Kp > 0) this.resGain(KIT3.kingpin.execRes) // 🎩 Loan Shark
    if (this.st.j2ExecTurn > 0 && !this.execTurnUsed && this.alive().length) { // ★ งานต่อไป
      this.execTurnUsed = true
      this.heroGauge = Math.max(this.heroGauge, 100)
      sfx.nextJob()
      this.floatText(HERO_X, GROUND - 160, '🕴️ งานต่อไป!', '#c9a8ff')
    }
    return true
  }
  /** Monk หมัดกระแส: every swing / combo hit builds charges · ฝ่ามือธาตุ chill · ★ Instill bolt at full charges. */
  private monkSwing(f: Mon) {
    const O = KIT2.monk
    if (this.comboLevel >= 2 && this.st.j3Ch > 0 && this.asuraExhaust <= 0) {
      this.gainRes(this.st.resRegen * RES_RULES.manaPerTurnMul * KIT3.champion.comboManaBonus)
    }
    if (this.st.j2Chill > 0 && !f.dead && Math.random() < this.st.j2Chill) { f.chill = Math.max(f.chill, O.chillTurns); this.dotIcon(f) }
    if (this.st.j2Instill > 0 && this.charges >= this.chargeMax()) {
      const t = this.alive()
      if (t.length) { const m = t[Phaser.Math.Between(0, t.length - 1)]; this.floatText(m.spr.x + 20, m.spr.y - m.spr.displayHeight - 34, '⚡', '#bfe6ff'); this.withSrc('other', () => this.strike(m, O.instillMul, true, '#bfe6ff')) }
    }
    this.addCharges(this.comboLevel >= 2 ? O.chargePerCombo : O.chargePerSwing)
  }
  /** 2nd-job damage multiplier on every hero hit. */
  private j2Mul(m: Mon, crit: boolean, magic: boolean) {
    let k = 1
    const big = m.def.ai === 'boss' // bosses + mini bosses
    if (crit && !magic && this.frenzy > 0) k *= 1 + this.frenzy * KIT2.berserker.frenzyCritDmg
    if (crit && big && this.st.j2BossCrit > 0) k *= 1 + this.st.j2BossCrit // ★ หน้าแหก
    if (this.st.j2Duel > 0 && (this.alive().length === 1 || m.def.ai === 'boss')) k *= 1 + this.st.j2Duel // ดวล
    if (this.st.j2DuelExec > 0 && big && m.hp < m.def.hp * 0.3) k *= 1 + this.st.j2DuelExec // ★ ดวลตาย
    if (this.st.j2LowHp > 0) k *= 1 + this.st.j2LowHp * Math.max(0, 1 - this.hp / this.st.maxHp) // คลั่ง
    if (big && this.j2?.id === 'mobster' && m.hp < m.def.hp * this.execLine(m)) k *= KIT2.mobster.bossExecMul // สมุดหนี้ vs boss / mini
    if (this.st.j3Kp > 0) k *= 1 + kingpinDebtAmp(this.st, this.debt(m)) // 🎩 Loan Shark: debts pay interest
    if (this.j2?.id === 'crusader' && KIT2.crusader.holyFoes.includes(m.kind)) k *= 1 + KIT2.crusader.holyVs // ศรัทธา vs undead / demons
    if (this.endow > 0 && (this.autoSpelling || this.src === 'basic' || this.src === 'combo' || (this.j2?.id === 'sage' && this.src === 'skill'))) k *= 1 + KIT2.sage.endowAmp + this.st.j2EndowAmp // Sage Endow
    if (m.wet > 0) k *= 1 + KIT2.innovator.wetAmp // Innovator ☁️ เมฆฝน
    if (this.st.j2PackLead > 0 && !this.allyHitting) k *= 1 + this.st.j2PackLead * this.livePets() // v82 Beastmaster ผู้นำฝูง (hero hits only)
    if (!magic && this.st.j2MdefDmg > 0) k *= 1 + this.st.mdef * this.st.j2MdefDmg // Monk ปราณเหล็กใน (+ Paladin Hybrid)
    if (this.src === 'combo' && this.comboLevel >= 2 && this.st.j2ComboRamp > 0) k *= 1 + this.st.j2ComboRamp * (this.comboLevel - 1) // Monk ท่าสับต่อเนื่อง (+ Paladin Hybrid)
    if (this.asuraExhaust > 0 && (this.src === 'basic' || this.src === 'combo')) k *= 1 - KIT2.monk.asuraWeak // Monk ง่อยแดก
    k *= spBreakMul(m.spBreak, this.j2?.id === 'knight', magic)
    return k
  }
  /** Knight ถึกเป็นแรง: spear skills add a share of max HP, as a P.ATK multiplier. */
  private hpMul() { return this.j2?.id === 'knight' ? (KIT2.knight.hpDmg + this.st.j2HpDmg) * this.st.maxHp / Math.max(1, this.st.atk) : 0 }
  /** Knight Charge Attack / ★ ทะยาน: the first basic swing of each wave (stacks with j2Charge). */
  private chargeMul() {
    if (!this.firstSwing) return 1
    this.firstSwing = false
    if (this.st.j2ChargeFirst > 0) {
      this.floatText(HERO_X + 40, GROUND - 150, '🚀 ทะยาน!', '#f2d24b')
      this.heroGauge = Math.min(100, this.heroGauge + KIT2.knight.chargeFirstGauge)
      this.resGain(KIT2.knight.chargeFirstRes)
      return KIT2.knight.chargeFirst + this.st.j2Charge
    }
    return 1 + this.st.j2Charge
  }
  /** ทักษะ 3: casts by itself (free extra action) at the start of the hero's turn when ready and paid for; Spear Boomerang answers a charge. */
  private async skill3Turn() {
    const j2 = this.j2!, K = KIT2.knight
    if (this.hcVit.turns > 0 && --this.hcVit.turns === 0) { this.hcVit.n = 0; this.syncHcVit(0) } // v119 💪 Holy Cross VIT runs out
    if (this.st.j2Boomerang > 0 && this.boomCd <= 0) {
      const ch = this.alive().find((m) => m.charging)
      if (ch) {
        this.boomCd = K.boomerangTurns
        await this.skillName({ name: 'Spear Boomerang', icon: '↩️' })
        this.heroRig.playStrike(1, true)
        await spearBoomerangFx(this, HERO_X, GROUND, { x: ch.spr.x, y: ch.spr.y }, () => {
          this.withSrc('skill', () => this.strike(ch, K.boomerang + this.hpMul()))
          if (!ch.dead && ch.charging) this.endMonCast(ch, { text: '❌ ขัดร่าย!', color: '#9fe3ff', float: true, dy: 24 })
        })
        if (!this.alive().length) return
      }
    }
    if (this.hx.silence > 0) return
    if (this.s3Cd > 0) { this.s3Cd--; return }
    if (this.asuraExhaust > 0) return
    if (!mayCast(!this.autoUlt, this.book.s3)) return // v86: manual mode waits for the booking
    if (j2.id === 'monk' && this.st.j2Asura > 0 && this.autoUlt && !this.book.s3 && this.smashCdLeft <= 0 && this.charges < KIT2.monk.asuraMinAt) return // save charges for Asura in auto mode when ready
    if (j2.id === 'monk' && this.charges < KIT2.monk.thunderMin) return // Falling Thunder needs charges
    const cost = this.s3Cost()
    if (this.res < cost) return
    if (this.smashQueued && this.smashCdLeft <= 0 && this.res - cost < this.ultCost()) return
    this.spendRes(cost)
    this.s3Cd = j2.id === 'berserker' && this.st.j3Wl <= 0 ? KIT2.berserker.waveCdJ2 : j2.skill3.cd
    this.book.s3 = false; this.popSkill('s3')
    const pow = 1 + this.st.s3Pow
    if (j2.id === 'wizard' && this.charge({ kind: 'gust', pow, hit: pow, paid: 0 }, this.res + cost)) return // Storm Gust charges a turn
    await this.asSkill(async () => {
      const prevS3 = this.inS3
      this.inS3 = true
      try {
      await this.skillName(j2.skill3)
      const live = this.front()
      if (j2.id === 'wizard' || j2.id === 'sage') { await this.mageSkill3(pow); return } // Phase 5 Mage
      if (j2.id === 'beastmaster') { await this.petCommand(pow); return } // 📯 สั่งลุย
      if (j2.id === 'innovator') { await this.gadget(rollGadget(this.st, this.heroLuk), pow); if (this.st.j3Mc > 0) await this.mechanicVariant(pow); return } // 🎲 กล่องสุ่มประหลาด (+ 🤖 Mechanic variant on top)
      if (j2.id === 'crusader') { // ✝️ Holy Cross: front monster, each hit P.ATK + Pm, then blind · Shield Boomerang
        const C = KIT2.crusader, t = live[0], k = C.crossMul * pow * (1 + this.st.j2CrossAdd)
        let landed = 0
        if (t && this.st.j3On > 0) landed = await this.holyVariant(t, pow) // ⚜️ Paladin: Shield Chain / Pressure replace the cross
        else if (t) await this.maceSmash(t, () => {
          for (let i = 0; i < C.crossHits && !t.dead; i++) { landed += this.strike(t, k * (1 + this.st.pskill), false, '#ffe08a'); if (!t.dead) landed += this.strike(t, k, true, '#fff3a0') }
          if (!t.dead) { t.blind = Math.max(t.blind, C.blindTurns + this.st.j2BlindAdd); this.dotIcon(t); this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 30, '✝️ 🙈 ตาบอด', '#ffe08a') }
          this.cameras.main.flash(80, 255, 240, 170)
        })
        if (landed > 0 && this.st.j2HcVit > 0 && this.hp > 0) { // v119 💪 กางเขนหล่อกาย: +VIT stack, lasts until hcVitGrace turns after the next ready cast
          this.hcVit.n = Math.min(Math.round(this.st.j2HcVit), this.hcVit.n + 1); this.hcVit.turns = j2.skill3.cd + 1 + C.hcVitGrace
          this.syncHcVit(this.hcVit.n * C.hcVit)
          this.floatText(HERO_X, GROUND - 170, `💪 VIT +${this.hcVit.n * C.hcVit} (${this.hcVit.n}/${Math.round(this.st.j2HcVit)})`, '#ffe08a')
        }
        const o = this.alive()
        if (this.st.j2ShieldBoom > 0 && this.hasShield && o.length) {
          const m = o[Phaser.Math.Between(0, o.length - 1)]
          await this.shoot(m, 0xd8d8e8, () => this.strike(m, this.st.j2ShieldBoom * this.st.def / Math.max(1, this.st.atk)))
        }
      } else if (j2.id === 'monk') { // ⚡ Falling Thunder: spend every charge, lightning on all (+ หมัดอัสนี P.ATK)
        if (this.st.j3Ch > 0) {
          await this.championVariant(live, pow)
        } else {
          const O = KIT2.monk, n = this.charges
          this.addCharges(-n)
          this.cameras.main.flash(90, 191, 230, 255)
          const mul = (O.thunderPm * (1 + (O.thunderPer + this.st.j2ThunderPer) * n) + this.thunderAtkAdd()) * pow
          for (const m of this.alive()) { playPfx(this, 'zap', m.spr.x, m.spr.y - m.spr.displayHeight * 0.45, { scale: 1.4, speed: 1.3 }); this.strike(m, mul, true, '#bfe6ff') }
          this.floatText(HERO_X, GROUND - 170, `⚡ x${n}`, '#bfe6ff')
          await this.wait(BATTLE.stepMs * 0.3)
        }
      } else if (j2.id === 'rogue') { // 🗡️ Back Stab: sure crit on the most-marked monster (P3'a), picks up its Marks
        const R = KIT2.rogue, cp = this.rogueCp
        const brk = this.breakCastTarget() // 🧤 ★ ตัดจังหวะ: a casting monster with enough Marks goes first
        const t = brk ?? (this.st.j3Sk > 0 && save().job3Var === 'b' ? this.bossTarget() ?? this.stabTarget() : this.stabTarget()) // 🎯 Assassinate: boss first
        if (t && cp > 0) { this.floatText(HERO_X, GROUND - 160, `🔁 Combo Point x${cp}`, '#ffd36b'); this.rogueCp = 0 }
        if (t) {
          if (brk) this.divestBreak(brk) // spends its Marks before the stab (no pickup)
          const marks = t.dagger, full = marks >= this.markCap(), pot = this.divestPotOf(t)
          if (this.st.j2Snatch > 0 && marks >= R.divest.marks) this.divestSnatch(t, pot) // ✋ ฉกบัฟ: before the stab, so a stolen shield no longer soaks it
          const ambush = this.inShroud() || this.rgAmbush // 🌑 Shadow Ambush: in Shroud, or dodged since the last hero turn
          const amp = rogueStabAmp(ambush) // B4 (R4.6): conditional Back Stab amps add under one cap · Combo Point stays outside (MAIN-VS-REV4 R1)
          if (ambush) { this.rgAmbush = false; this.resGain(R.stabAmbushRes); this.floatText(HERO_X, GROUND - 175, '🌑 Shadow Ambush!', '#b9a8ff') }
          if (this.st.j3Sk > 0) await this.stalkerVariant(t, pow * (1 + this.st.pskill) * (1 + R.stabCpPer * cp) * (1 + amp), { ambush, cp }) // 🥷 Stalker: Fan of Knives / Assassinate replace the stab
          else await this.backStab(t, R.stabMul * pow * (1 + this.st.pskill) * (1 + R.stabCpPer * cp) * (1 + amp), false, { ambush, cp })
          if (!t.dead) { t.stabMark = R.stabMarkTurns; t.strip = R.stabStripTurns; this.divestAfterStab(t, marks, full, pot); this.dotIcon(t) } // Backstab Mark + Strip Armor + 🧤 สายปลด
          this.comboKnives(false) // ★ คริเป็นมีด: the Back Stab crit owes a knife
        }
      } else if (j2.id === 'mobster') { // ⛓️ ตัดเส้นเอ็น: boss first, DEF break + chill
        const M = KIT2.mobster, t = this.bossTarget() ?? live[0], turns = M.cutTurns + this.st.j2DebuffTurns
        if (t && this.st.j3Kp > 0) await this.kingpinVariant(t, pow, turns) // 🎩 Kingpin: Shakedown / Hit Contract replace the cut
        else if (t) await this.lunge(t, () => {
          sfx.tendonCut()
          daggerCrossFx(this, t.spr.x - 20, GROUND - 40, this.hits, 'mobster')
          this.strike(t, M.cutMul * pow * (1 + this.st.pskill), false, '#c9a8ff')
          if (t.dead) return
          t.armorBrk = Math.max(t.armorBrk, turns); t.chill = Math.max(t.chill, turns); this.dotIcon(t)
          this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 30, '⛓️ เกราะแตก + ช้า', '#c9a8ff')
          this.mobExec(t)
        }, false, true)
      } else if (j2.id === 'berserker') {
        if (this.st.j3Wl > 0) await this.warlordVariant(live, pow)
        else {
          const B = KIT2.berserker, w = this.j2Weapon ? 1 : B.waveOffWeapon
          const prevKitCrit = this.kitSkillCritAdd
          this.kitSkillCritAdd = B.waveCrit
          let dealt = 0
          const hitSet = new Set<Mon>()
          try {
            this.cameras.main.flash(80, 220, 70, 70)
            await this.lunge(live[0], () => {
              crimsonWaveFx(this, live[0].spr.x, GROUND)
              for (let h = 0; h < B.waveHits; h++) {
                live.forEach((m, i) => {
                  if (m.dead) return
                  const dmg = this.strike(m, (i === 0 ? B.waveFront : B.waveBack) * pow * w * (1 + this.st.pskill), false, '#9fe3ff')
                  dealt += dmg
                  if (dmg > 0) hitSet.add(m)
                })
              }
            })
            for (const m of hitSet) {
              if (!m.dead) {
                m.gore = Math.max(m.gore ?? 0, Math.round(this.st.atk * B.waveGoreAtk))
                m.goreTurns = Math.max(m.goreTurns ?? 0, B.waveGoreTurns)
                this.dotIcon(m)
              }
            }
            if (hitSet.size >= B.waveMultiAt) {
              this.gainRage(B.waveMultiRage)
              this.floatText(HERO_X, GROUND - 155, `💢 +${B.waveMultiRage} Rage`, '#ff8c42')
            }
            if (this.rampage > 0 && this.st.swWaveShield > 0 && dealt > 0) this.addShield(Math.min(this.st.maxHp * KIT.swordUltTree.waveShieldCap, dealt * KIT.swordUltTree.rampageWaveShield))
          } finally {
            this.kitSkillCritAdd = prevKitCrit
          }
        }
      } else if (this.st.j3Lk > 0) await this.lkVariant(live, pow) // 🐉 Lord Knight: Dragon Breath / Joint Beat replace Brandish
      else if (live[0]) {
        const tgts = live.slice(0, K.brandTargets)
        const pierce = this.st.j2Spiral > 0 ? K.spiralS3S4Pierce : 0
        const prevKitCrit = this.kitSkillCritAdd
        this.kitSkillCritAdd = K.brandCritAdd
        try {
          await this.lunge(live[0], () => {
            brandishSweepFx(this, live[0].spr.x + 25, GROUND, tgts.map((m) => m.spr), 0xf2d24b, true)
            tgts.forEach((m, i) => {
              const mulBase = i === 0 && tgts.length <= 2 ? K.brandMul * (1 + K.brandLowTargetAmp) : K.brandMul
              this.strike(m, mulBase * pow * (1 + this.st.pskill) + this.hpMul(), false, undefined, pierce)
              if (!m.dead) m.gauge -= (i === 0 ? K.brandPush : K.brandPushOther)
            })
          }, false, true)
        } finally {
          this.kitSkillCritAdd = prevKitCrit
        }
      }
      } finally { this.inS3 = prevS3 }
    }, 'skill')
  }
  /** ⛓️ Break (Q 2026-11-24, Dota 2 style): the monster's passives are off (reflect / absorb, lifesteal, on-hit status, Blood Razor, Hunter frenzy, Drainer regen). */
  private isBroken(m: Mon) { return (m.broken ?? 0) > 0 }
  private breakMon(m: Mon, turns: number, y = m.spr.y - m.spr.displayHeight - 46) {
    if (m.dead || turns <= 0) return
    m.broken = addBreak(m.broken, turns)
    this.floatText(m.spr.x, y, `⛓️ Break ${m.broken} เทิร์น (ปิด passive)`, '#c9a8ff')
    this.dotIcon(m)
  }
  /** Q 2026-11-24 Skill 4 is learned (Knight, Job2 Lv >= KIT2.knight.s4.unlockLv): button, cast and the 🐍 Fang passive. */
  private s4On() { return !!this.j2?.skill4 && s4Unlocked(this.j2.id, save().job2Level) }
  /** Skill 4: takes the hero turn when ready and paid for. A booked, affordable ult goes first; auto mode keeps Mana for an ult that is about to come back. */
  private async skill4Turn(): Promise<boolean> {
    const sk = this.j2?.skill4
    if (!sk || !this.s4On() || this.s4Cd > 0 || this.hx.silence > 0 || this.asuraExhaust > 0) return false
    if (!mayCast(!this.autoUlt, this.book.s4)) return false
    const ultCost = this.ultCost()
    if (this.smashQueued && this.smashCdLeft <= 0 && this.res >= ultCost) return false
    if (this.res < sk.cost) return false
    if (this.autoUlt && this.smashCdLeft <= 1 && this.res - sk.cost < ultCost) return false
    const t = s4Target(this.alive(), (m) => monTier(m.def))
    if (!t) return false
    this.spendRes(sk.cost)
    this.s4Cd = sk.cd
    this.book.s4 = false; this.popSkill('s4')
    await this.asSkill(() => this.spiralPierce(t), 'skill')
    return true
  }
  /** 🌀 Spiral Pierce (Rell Q + Serpent's Fang): shatter the target's shield, thrust (+ if shattered), then stun a normal / mini or cut a boss cast. */
  private async spiralPierce(t: Mon) {
    const S = KIT2.knight.s4, st = this.st, tier = monTier(t.def), lk = st.j3Lk > 0
    await this.skillName(this.j2!.skill4!)
    const sh = s4Shatter(t.shield, tier)
    if (sh.shattered) {
      t.shield = sh.shield; this.dotIcon(t)
      this.burst(t.spr.x, t.spr.y - t.spr.displayHeight * 0.5, 0x9fe3ff, 14, 200)
      this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 40, tier === 'boss' ? `🛡️💥 ทุบโล่ −${Math.round(S.bossShield * 100)}%` : '🛡️💥 ทุบโล่!', '#9fe3ff')
    }
    const amp = sh.shattered ? 1 + S.shatterAmp : 1, hits = lk ? S.lkHits : 1
    const mul = ((lk ? S.lkMul : S.mul) * (1 + st.pskill) + this.hpMul()) * amp
    const extraPierce = st.j2Spiral > 0 ? KIT2.knight.spiralS3S4Pierce : 0
    const prevKitCrit = this.kitSkillCritAdd
    this.kitSkillCritAdd = S.critAdd
    try {
      await this.lunge(t, () => {
        this.cameras.main.flash(70, 160, 220, 255)
        spiralPierceFx(this, t.spr.x, t.spr.y - t.spr.displayHeight * 0.45, sh.shattered)
        for (let i = 0; i < hits && !t.dead; i++) {
          const hitPierce = Math.min(1, (lk && i === hits - 1 ? S.lkPierce : S.defPierce) + extraPierce)
          this.strike(t, mul, false, '#9fe3ff', hitPierce)
        }
        if (t.dead) return
        const y = t.spr.y - t.spr.displayHeight - 24
        if (s4StunKind(tier) === 'turn') { t.frozen = true; this.floatText(t.spr.x, y, '💫 สตั๊น (เสียเทิร์น)', '#ffe08a') }
        else if (t.charging) this.endMonCast(t, { text: `💫 ตัดร่าย ${t.def.name}!`, color: '#ffe08a' }, S.bossGauge)
        else { t.gauge = Math.max(0, t.gauge - S.bossGauge); this.floatText(t.spr.x, y, `💫 เกจ −${S.bossGauge}`, '#ffe08a') }
        this.breakMon(t, S.breakTurns, y - 22)
        t.spBreak = Math.max(t.spBreak ?? 0, S.breakTurns)
        const swBrk = swordBreakTurnsOf(st.swS3ArmorBreak)
        if (swBrk > 0) t.armorBrk = Math.max(t.armorBrk, swBrk)
        this.dotIcon(t)
      }, true, true)
    } finally {
      this.kitSkillCritAdd = prevKitCrit
    }
  }
  /** Ult วิวัฒน์: replaces the base class ult (keeps ultPow + ult-web Stats where they fit). */
  private async ult2(live: Mon[], pow: number, hitPow: number) {
    const p2 = pow * (1 + this.st.ult2Pow), h2 = hitPow * (1 + this.st.ult2Pow)
    if (this.j2!.id === 'wizard' || this.j2!.id === 'sage') { await this.mageUlt2(live, p2, h2); return } // Phase 5 Mage
    if (this.j2!.id === 'beastmaster') { await this.primevalAwakening(1 + this.st.ult2Pow); return } // 🐾 Primeval Awakening (Q5)
    if (this.j2!.id === 'innovator') { // 🛠️ สิ่งประดิษฐ์สุดเพี้ยน: 3 boxes + every trap + the base pierce shot
      for (let i = 0; i < KIT2.innovator.ultBoxes && this.alive().length; i++) await this.gadget(rollGadget(this.st, this.heroLuk), p2)
      for (const t of TRAP_IDS) this.layTrap(t, p2)
      await this.archerPierce(h2)
      if (this.st.j3Mc > 0) await this.armCannon(h2) // 🤖 Mechanic: Arm Cannon
      return
    }
    if (this.j2!.id === 'berserker') {
      const B = KIT2.berserker
      const prevKitCrit = this.kitSkillCritAdd
      this.kitSkillCritAdd = B.ultCrit
      let dealt = 0
      try {
        if (this.st.j3Wl > 0) {
          const W3 = KIT3.warlord
          this.gainRage(W3.ultRageGain)
          this.cleanseOne()
          const turns = W3.ultUndyingTurns + this.st.j3GospelField
          rampageBurstFx(this, HERO_X, GROUND, true)
          await this.lunge(live[0], () => { crimsonWaveFx(this, live[0].spr.x, GROUND, true); live.forEach((m) => { dealt += this.strike(m, (B.ultMul + this.st.ultMulAdd) * h2 * (1 + this.st.pskill) * (1 + this.st.u3Pow) * (m.charging ? 1 + this.st.ultVsCharge : 1), false, '#ff6b6b'); this.trySwCull(m) }) })
          this.releaseSwVeng(live)
          if (this.st.swWaveShield > 0 && dealt > 0) this.addShield(Math.min(this.st.maxHp * KIT.swordUltTree.waveShieldCap, dealt * KIT.swordUltTree.rampageWaveShield))
          this.rampage = turns + 1
          this.wlUndyingTurns = turns + 1
          this.rampageAuraStop(); this.rampageAura = rampageAuraFx(this, HERO_X, GROUND)
          if (this.st.j3AfterBless > 0) this.j3Bless = KIT3.common.afterTurns
          this.callout(`🪓 Undying Bloodlust! อมตะ ${turns} เทิร์น`, W / 2, 170, '#ff5a4e')
          this.cameras.main.flash(180, 255, 60, 60)
          return
        }
        this.gainRage(B.ultRageGain)
        rampageBurstFx(this, HERO_X, GROUND, false)
        await this.lunge(live[0], () => { crimsonWaveFx(this, live[0].spr.x, GROUND, false); live.forEach((m) => { dealt += this.strike(m, (B.ultMul + this.st.ultMulAdd) * h2 * (1 + this.st.pskill) * (m.charging ? 1 + this.st.ultVsCharge : 1)); this.trySwCull(m) }) })
        this.releaseSwVeng(live)
        if (this.st.swWaveShield > 0 && dealt > 0) this.addShield(Math.min(this.st.maxHp * KIT.swordUltTree.waveShieldCap, dealt * KIT.swordUltTree.waveShield))
        this.rampage = B.ultTurns + 1 // ticks down after this turn
        this.rampageAuraStop(); this.rampageAura = rampageAuraFx(this, HERO_X, GROUND)
        this.callout(`👹 บ้าระห่ำ ${B.ultTurns} เทิร์น!`, W / 2, 170)
        this.cameras.main.flash(140, 255, 90, 78)
        return
      } finally {
        this.kitSkillCritAdd = prevKitCrit
      }
    }
    if (this.j2!.id === 'rogue') { // 🌪️ พายุมีด: shadow dance + a knife storm
      await this.shadowDance(h2)
      const R = KIT2.rogue
      await this.knifeStorm(R.ultKnives + this.st.j2KnifeAdd, (R.ultKnifeMul + R.ultKnifeJ2Share * this.st.j2KnifeMul) * h2) // knife nodes / talents now count in the storm
      if (this.st.j3Sk > 0) await this.phantomStorm((R.ultKnifeMul + R.ultKnifeJ2Share * this.st.j2KnifeMul) * h2) // 🥷 Stalker: Phantom Storm
      return
    }
    if (this.j2!.id === 'mobster') { // 💀 ทวงหนี้: slash all, burst every poison stack, then collect
      const M = KIT2.mobster
      if (live[0]) await this.lunge(live[0], () => { sfx.debtCollectSlash(); live.forEach((m, i) => { shadowSlashFx(this, m.spr, i); this.strike(m, M.ultSlash * h2 * (1 + this.st.pskill), false, '#c9a8ff') }) }, false, true)
      const mobFlurry = mobsterFlurrySlashMul(h2, this.st.pskill, this.st.thMobFlurry)
      if (mobFlurry > 0 && this.hp > 0) {
        const surv = this.front()
        if (surv[0]) await this.lunge(surv[0], () => { sfx.debtCollectSlash(); surv.forEach((m, i) => { shadowSlashFx(this, m.spr, i); this.strike(m, mobFlurry, false, '#c9a8ff') }) }, false, true)
      }
      let kills = 0
      for (const m of live) {
        if (!m.dead && m.poison > 0) {
          const dmg = Math.max(1, Math.round(m.poison * m.poisonDmg * M.burstTurns * M.burstMul * h2 * this.dotMul()))
          sfx.debtPoisonDetonate()
          this.burst(m.spr.x, m.spr.y - 30, 0xa77be0, 14, 200)
          this.debtBursting = true // a debt kill must not re-spread the stacks it bursts (killMon ระเบิดพิษ) · stacks stay readable for amps
          try { this.withSrc('poison', () => this.damageMon(m, dmg, false, '#a77be0', true)) } finally { this.debtBursting = false }
          m.poison = Math.floor(m.poison * KIT.poison.burstKeep); this.dotIcon(m) // kit poison.burstKeep (0 = cleared)
        }
        if (m.dead || this.mobExec(m)) kills++
      }
      if (kills > 0) { this.smashCdLeft = Math.max(0, this.smashCdLeft - M.ultCdRefund); sfx.debtRefund(); this.floatText(HERO_X, GROUND - 170, `💀 ทวงครบ! ult -${M.ultCdRefund}`, '#c9a8ff') }
      this.cameras.main.flash(120, 167, 123, 224)
      await this.wait(BATTLE.stepMs * 0.4)
      if (this.st.j3Kp > 0) await this.hostileTakeover(h2) // 🎩 Kingpin: Hostile Takeover
      return
    }
    if (this.j2!.id === 'crusader') { // ✨ Grand Cross (v106/v111 Q 2026-11-08): pay HP + burn ALL Mana left; pulse 1 now, the rest one per hero turn (spread, not burst)
      // Cleric Ult-web buffs: root P.ATK (split over the pulses) · ใต้ปีกเทพ shield · ไฟชำระ / talents · ★ ซ้อน: every pulse hits twice (the 2nd without the burn bonus)
      const C = KIT2.crusader, k = h2 * (1 + this.st.j2CrossAdd), charging = this.alive().some((m) => m.charging)
      const paid = Math.min(this.hp - 1, Math.floor(this.hp * C.gcPay * Math.max(0, 1 - this.st.j2PayCut)))
      if (paid > 0) { const hp0 = this.hp; this.hp -= paid; this.logLoss('✨ Grand Cross จ่าย HP', hp0); this.damageNumber(HERO_X, GROUND - 70, paid, false, '#ff9a9a') }
      const burnt = Math.floor(this.res)
      if (burnt > 0) { this.spendRes(burnt); this.floatText(HERO_X, GROUND - 130, `🔥 เผา Mana ${burnt}`, '#9fc3ff') } // v110: counts as Mana spent (💠 มานาพิทักษ์ heal)
      const n = gcPulses(this.st)
      this.gc = { left: n, n, k, extra: C.gcBurn * (burnt + paid) * k / n, base: n - (this.st.j3On > 0 ? KIT3.paladin.gospelPulse + this.st.j3GospelField : 0) } // a new cast replaces what is left of the old one
      const hit = this.alive().length
      await this.gcPulse()
      if (paid > 0 && hit >= C.gcRefundAt) { this.hp = Math.min(this.st.maxHp, this.hp + Math.round(paid * C.gcRefund)); this.floatText(HERO_X, GROUND - 160, `✨ คืน HP ${Math.round(paid * C.gcRefund)}`, '#6fd08c') }
      this.addShield(this.st.maxHp * CLERIC_KIT.ultShield * p2 * (charging ? 1 + this.st.ultChargeShield : 1))
      await this.clericUltExtras()
      return
    }
    if (this.j2!.id === 'monk') {
      if (this.st.j2Asura > 0) { // 💥 ★ อาชูร่าสไตรก์: consume all charges + Mana, pierce 100% DEF/M.DEF, then ง่อยแดก
        const O = KIT2.monk, t = this.bossTarget() ?? this.front()[0]
        const spentCharges = this.charges, burntMana = Math.floor(this.res)
        this.addCharges(-spentCharges)
        if (burntMana > 0) this.spendRes(burntMana)
        if (t) {
          const bossBoost = t.charging ? 1 + this.st.ultVsCharge : 1
          const dmg = asuraDamage(this.st, spentCharges, burntMana, h2 * bossBoost)
          this.stayIn = false
          await this.lunge(t, () => {
            this.cameras.main.flash(220, 255, 220, 140)
            this.shake(260, 0.018)
            this.hitStop(95)
            playPfx(this, 'slam', t.spr.x - 10, GROUND, { scale: 1.6, speed: 1.3 }) // 💥 Asura: the floor gives
            playPfx(this, 'critOrange', t.spr.x - 10, GROUND, { scale: 1.6, speed: 1.2 })
            this.withSrc('ult', () => this.damageMon(t, dmg, true, '#ff6b4a', true))
          })
          this.callout(`💥 อาชูร่าสไตรก์! (${spentCharges}🔵 + ${burntMana} Mana)`, W / 2, 165, '#ff9a3c')
          if (this.st.j3Ch > 0) {
            const shockwaveHits = KIT3.champion.extraHits + this.st.j3GospelField
            const k3 = 1 + this.st.u3Pow
            for (let sh = 0; sh < shockwaveHits; sh++) {
              const others = this.alive().filter((x) => x !== t)
              if (others.length) {
                const splashDmg = Math.max(1, Math.round(dmg * 0.3 * k3))
                for (const m of others) {
                  this.burst(m.spr.x, m.spr.y - 30, 0xffaa4a, 12, 180)
                  this.withSrc('ult', () => this.damageMon(m, splashDmg, true, '#ffaa4a', true))
                }
              } else if (!t.dead) {
                const soloDmg = Math.max(1, Math.round(dmg * 0.15 * k3))
                this.burst(t.spr.x, t.spr.y - 30, 0xffaa4a, 12, 180)
                this.withSrc('ult', () => this.damageMon(t, soloDmg, true, '#ffaa4a', true))
              }
            }
            if (this.st.j3GospelHeal > 0) this.heal(this.st.maxHp * this.st.j3GospelHeal, true)
            if (this.st.j3AfterBless > 0) {
              this.j3Bless = KIT3.common.afterTurns
              this.floatText(HERO_X, GROUND - 150, `🌅 พรหลังศึก +${Math.round(this.st.j3AfterBless * 100)}%`, '#ffe08a')
            }
          }
        }
        this.asuraExhaust = O.asuraExhaustTurns + 1
        await this.clericUltExtras() // M3: ไฟชำระ / แสงลงทัณฑ์ / พรยืนยาว now work on the Monk line too (was skipped)
        await this.wait(BATTLE.stepMs * 0.35)
        return
      }
      // 🔔 Tempest Bell: an Ally object that soaks hits, rings on swings, bursts when broken
      const old = this.allies.find((a) => a.def.id === ALLIES.tempestBell.id && !a.dead)
      if (old) { old.dead = true; this.syncAlly(old); this.allies = liveAllies(this.allies) } // one bell at a time
      this.spawnAlly(makeAlly(ALLIES.tempestBell, this.st, h2))
      this.callout(`🔔 Tempest Bell ${KIT2.monk.bellTurns} เทิร์น!`, W / 2, 170)
      this.burst(HERO_X + 70, GROUND - 40, 0xbfe6ff, 16, 180)
      if (this.st.j3Ch > 0 && this.alive().length) {
        const extra = KIT3.champion.extraHits + this.st.j3GospelField
        const splashDmg = Math.max(1, Math.round(magicPower(this.st) * KIT2.monk.bellBoom * bellMdefMul(this.st) * h2 * (1 + this.st.u3Pow)))
        for (let sh = 0; sh < extra && this.alive().length; sh++) {
          for (const m of this.alive()) {
            this.burst(m.spr.x, m.spr.y - 30, 0xbfe6ff, 10, 160)
            this.withSrc('ult', () => this.damageMon(m, splashDmg, true, '#bfe6ff', true))
          }
        }
        if (this.st.j3GospelHeal > 0) this.heal(this.st.maxHp * this.st.j3GospelHeal, true)
        if (this.st.j3AfterBless > 0) {
          this.j3Bless = KIT3.common.afterTurns
          this.floatText(HERO_X, GROUND - 150, `🌅 พรหลังศึก +${Math.round(this.st.j3AfterBless * 100)}%`, '#ffe08a')
        }
      }
      await this.clericUltExtras() // M3: Tempest Bell path too
      return
    }
    // 🐴 Knight / 🐉 Lord Knight: 🔱 Pierce of Judgement = ⚔️ ปลุกหอก first so 🎯 Pierce rides the STR buff + ✨ coat + sure hit
    // (Q 2026-11-23 "บัฟแล้วค่อยแทง"), then the 🔱 thrust if the target is already under the line (else later in swordWaveCheck)
    await this.swordAwaken(p2, h2, false)
    if (this.hp > 0) await this.knightPierce(h2)
    if (this.hp > 0) await this.swordWaveCheck(true)
  }

  // ===== Phase 5 Mage: 🌩️ Wizard / 📖 Sage (numbers KIT2.wizard / KIT2.sage) =====
  /** v78 cast queue (was Wizard-only): Wizard ร่ายใหญ่ (Storm Gust / ult) · base Mage its element ult (v85: ลูกไฟระเบิด is instant again).
   *  Paid on charge, released at the start of the next hero turn. Wizard never breaks (takes +15% instead); a Mage chant can (castBreak).
   *  `paid` = Mana spent on it (refunded in part when it breaks) · `safe` = the pity chant after a break: can't break. */
  private casts: Cast[] = []
  private steady = false // v85: the last chant broke, so the NEXT one can't
  private castRing?: Phaser.GameObjects.Ellipse // magic circle under the hero while a big spell charges
  private endow = 0 // Sage Endow turns left
  private autoSpelling = false // a Sage Auto Spell / On-Hit Perk bolt is landing (Endow + procCritMul apply)
  private rodUsed = false // Sage ★ Magic Rod: the wave's spell already absorbed
  private sageInt = 0 // total INT (Auto Spell / On-Hit Perk chance)
  private heroVit = 0 // total VIT (Sage Magic Rod scaling)
  private sageFireBoltsTurn = 0 // Sage 🔥 Fire Bolt counter this turn (x hit ramp + Inferno Overdrive)
  private sageFireNovaUsed = false
  private sageInfusePow = 0 // >0 when Sage's passive Skill 1 (ศาสตราวุธธาตุ) spent Mana for this basic/combo turn
  private heroDex = 0 // total DEX (v78 chant break)
  private heroWis = 0 // total WIS (v86 💠 มานาพิทักษ์)
  private zenTurns = 0 // v78 เปิดฉากเต็มแรง: hero turns of Zen left (no miss, crit damage +)
  /** Start charging a spell (true), or cast it now (false): Wizard ★ Quagmire at high Mana. `mana` = Mana before paying. */
  private charge(c: Cast, mana: number) {
    const wz = this.j2?.id === 'wizard'
    if (wz && this.st.j2QuickCast > 0 && mana >= this.resMax() * KIT2.wizard.quickMana) { this.floatText(HERO_X, GROUND - 165, '🌀 Quagmire: ร่ายด่วน!', '#c9a8ff'); return false }
    if (!wz && this.steady) { c.safe = true; this.steady = false; this.floatText(HERO_X, GROUND - 175, '🧘 ตั้งสติ (ร่ายนี้ไม่แตก)', '#9fe3ff') }
    this.casts.push(c)
    this.castFx(true)
    if (wz) this.floatText(HERO_X, GROUND - 150, `🔮 ร่าย${c.kind === 'gust' ? ' Storm Gust' : 'มหาเวท'}... (ดาเมจเข้า +${Math.round(wizCastTaken(this.st) * 100)}%)`, '#c9a8ff')
    else this.floatText(HERO_X, GROUND - 150, `🔮 ร่าย${this.job.ult.name}... ${c.safe ? '' : '(โดนตีแรงอาจแตก)'}`, '#c9a8ff')
    return true
  }
  private async releaseCasts() {
    const casts = this.casts
    this.casts = []; this.castFx(false)
    for (const c of casts) {
      if (!this.alive().length || this.hp <= 0) return
      if (c.kind === 'gust') await this.asSkill(async () => { await this.skillName(this.j2!.skill3); await this.gustCast(c.pow) }, 'skill')
      else {
        await this.asSkill(async () => { await this.skillName(this.job.ult); if (this.j2?.id === 'wizard') await this.wizUlt(c.pow, c.hit); else { sfx.slam(); await this.ultNow(c.pow, c.hit) } }, 'ult', 'ult')
        await this.afterUlt()
      }
    }
  }
  /** v78 / v85: a hit that reached HP (dmg after shields, >= breakMinHp of max HP; never a DoT tick) may break a Mage chant: queue gone,
   *  breakRefund of the Mana paid comes back, a broken ult is back in brokenUltCd turns, and the next chant is steady (can't break). */
  private castBreak(dmg: number) {
    if (!this.casts.length || this.j2?.id === 'wizard' || this.casts.every((c) => c.safe) || !breaksOn(dmg, this.st.maxHp)) return
    if (Math.random() >= breakChance(this.heroDex, this.st.tenacity, this.st.poise > 0)) return
    if (this.casts.some((c) => c.kind === 'ult')) this.smashCdLeft = Math.min(this.smashCdLeft, MAGE_CAST.brokenUltCd)
    const back = breakRefundMana(this.casts.reduce((a, c) => a + c.paid, 0))
    this.res = Math.min(this.resMax(), this.res + back)
    this.steady = true
    this.casts = []; this.castFx(false)
    this.floatText(HERO_X, GROUND - 150, `💔 ร่ายแตก! คืน Mana +${back}`, '#ff7a7a')
  }
  /** After an ult lands: เปิดฉากเต็มแรง Zen + after-ult cards. */
  private async afterUlt() {
    if (this.pk.zen > 0) { this.zenTurns = FOCUS_RULES.zenTurns + 1; this.floatText(HERO_X, GROUND - 185, `🧘 Zen ${FOCUS_RULES.zenTurns} เทิร์น: ไม่พลาด + คริแรง`, '#ff6b7a') } // +1: this turn's tick
    if (this.alive().length && await this.procs('ult') > 0) await this.wait(220) // พร v2: after-ult cards
  }
  /** Magic circle under the hero, pulsing like a boss charge. */
  private castFx(on: boolean) {
    if (this.castRing) { this.tweens.killTweensOf(this.castRing); this.castRing.destroy(); this.castRing = undefined }
    if (!on) return
    playPfx(this, 'magicCircle', HERO_X, GROUND, { scale: 1.1, speed: 1.4 })
    this.castRing = this.add.ellipse(HERO_X, GROUND - 2, 130, 36).setStrokeStyle(3, 0xb48aff).setDepth(GROUND - 0.5)
    this.tweens.add({ targets: this.castRing, alpha: 0.35, scaleX: 1.15, scaleY: 1.15, duration: 360, yoyo: true, repeat: -1 })
  }
  /** ทักษะ 3 of the Mage 2nd jobs: Wizard Storm Gust (no charge: ★ Quagmire) · Sage Endow. */
  private async mageSkill3(pow: number) {
    if (this.j2!.id === 'wizard') { await this.gustCast(pow); return }
    const S = KIT2.sage
    this.endow = Math.max(this.endow, S.endowTurns + this.st.j2EndowTurns)
    playPfx(this, 'runeCircle', HERO_X, GROUND, { scale: 1.2, speed: 1.5 })
    this.burst(HERO_X, GROUND - 40, 0xc9a8ff, 18, 160)
    this.floatText(HERO_X, GROUND - 160, `🗡️ Endow ${ELEMENTS[this.element].icon} +${Math.round((S.endowAmp + this.st.j2EndowAmp) * 100)}%`, '#c9a8ff')
    if (this.st.j3Pf > 0) this.profVariant() // 🎓 Professor: Endow stays, the Skill 3 variant rides on top
    await this.wait(BATTLE.stepMs * 0.3)
  }
  /** ❄️ Storm Gust: every monster, N hits x Pm; the last hit freezes (boss / mini: chill + gauge push). */
  private async stormGust(pow: number, nova?: { hits: number; vsChill: number }) {
    const Z = KIT2.wizard, mul = (Z.gustMul + this.st.j2GustMul) * pow, gustHits = Z.gustHits + (nova?.hits ?? 0)
    this.callout(nova ? '❄️ Frost Nova!' : '❄️ Storm Gust!', W / 2, 170)
    this.cameras.main.flash(120, 159, 227, 255)
    playPfx(this, 'frostNova', 700, GROUND, { scale: 1.4, speed: 1.4 })
    for (let h = 0; h < gustHits; h++) {
      this.burst(700, GROUND - 40, 0x9fe3ff, 24, 300)
      playPfx(this, 'iceSpikes', 620 + h * 35, GROUND, { scale: 1.1, speed: 1.6 })
      for (const m of this.alive()) {
        this.strike(m, mul * (nova && (m.chill > 0 || m.frozen) ? 1 + nova.vsChill : 1), true, '#9fe3ff')
        if (h < gustHits - 1 || m.dead) continue
        m.chill = Math.max(m.chill, Z.gustChill + this.st.chillPlus)
        if (m.def.ai === 'boss') m.gauge -= Z.gustPush
        else if (!m.frozen) { m.frozen = true; this.freezeCount++; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 20, 'แช่แข็ง!', '#9fe3ff') }
        if (!m.charging) m.spr.setTint(0x9fe3ff)
        this.dotIcon(m)
      }
      await this.wait(140)
    }
  }
  /** Ult วิวัฒน์ of the Mage 2nd jobs. Wizard charges a turn first (ร่ายใหญ่). */
  private async mageUlt2(live: Mon[], p2: number, h2: number) {
    if (this.j2!.id === 'wizard') { if (!this.charge({ kind: 'ult', pow: p2, hit: h2, paid: 0 }, this.res + this.ultCost())) await this.wizUlt(p2, h2); return }
    // 🚫 Dispell + Spell Breaker: strip every monster, steal Mana, smash the caster (charging one first)
    const S = KIT2.sage, t = this.alive().find((m) => m.charging) ?? live[0]
    const manaBefore = this.res + this.ultCost() // 🔮 Foresight reads the Mana the cast started with
    let n = 0
    for (const m of this.alive()) n += this.dispell(m)
    this.callout(n > 0 ? `🚫 Dispell! ลบ ${n} อย่าง` : '🚫 Dispell!', W / 2, 170)
    this.cameras.main.flash(120, 201, 168, 255)
    playPfx(this, 'magicCircle', 700, GROUND, { scale: 1.3, speed: 1.5 })
    const manaGain = S.ultMana + this.st.j2UltMana
    this.gainRes(manaGain); this.floatText(HERO_X, GROUND - 165, `🔷 Mana +${manaGain}`, '#5aa0ff')
    if (this.st.j3Pf > 0) { await this.soulBurstUlt(t, h2, manaBefore); return } // 🎓 Professor: Soul Burst replaces Spell Breaker
    if (t && !t.dead) await this.lunge(t, () => {
      playPfx(this, 'arcaneBeam', t.spr.x - 30, GROUND, { scale: 1.2, speed: 1.5 })
      this.strike(t, (S.ultAtk + this.st.ultMulAdd) * h2 * (1 + this.st.pskill))
      this.strike(t, S.ultPm * h2, true, '#c9a8ff')
      if (!t.dead && this.st.j2UltBreak > 0) { t.armorBrk = Math.max(t.armorBrk, this.st.j2UltBreak); this.dotIcon(t) }
    })
  }
  /** Sage Dispell on one monster: shield, war cry, reflect / absorb, vengeance, a charge. Returns how many it stripped. */
  private dispell(m: Mon) {
    let n = 0
    if (m.shield > 0) { m.shield = 0; n++ }
    if (m.atkUpTurns > 0) { m.atkUp = 0; m.atkUpTurns = 0; n++ }
    if (m.reflect > 0 || m.absorb > 0 || m.stored > 0) { m.reflect = 0; m.absorb = 0; m.stored = 0; n++ }
    if (m.vengTurns) { m.vengTurns = 0; m.vengCd = BATTLE.vengeance.cd; n++ }
    if (m.charging) { this.endMonCast(m, { text: '❌ ขัดร่าย!', color: '#9fe3ff', float: true, dy: 24 }); n++ }
    if (n > 0) this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 40, '🚫', '#c9a8ff')
    this.dotIcon(m)
    return n
  }
  /** Wizard big blast by the run element (+ base Mage ult amps, ร่ายคู่, Mana back, วงล้อธาตุ). */
  private async wizUlt(p2: number, h2: number) {
    const Z = KIT2.wizard, el = this.element
    const amp = 1 + this.st.mgUltAmp + (el === 'lightning' ? this.st.mgLightAmp : el === 'fire' ? this.st.mgFireAmp : el === 'ice' ? this.st.mgIceAmp : 0)
    const dbl = this.st.mgDoubleCast > 0
    for (let c = 0; c < (dbl ? 2 : 1) && this.alive().length; c++) await this.wizBlast(el, h2 * amp * (dbl ? this.st.mgDoubleCast : 1))
    this.addShield(this.st.matk * (MAGE_SPELL.barrier + (el === 'ice' ? this.st.iceBarrier : 0)) * p2 * (el === 'ice' ? Z.iceBarrier : 1) * (1 - this.st.mgBarrierCut))
    if (this.st.mgUltMana > 0) this.res = Math.min(this.resMax(), this.res + this.st.mgUltMana)
    if (this.st.j3Hw > 0) await this.gravitation(h2) // 🌌 High Wizard: Gravitation Field (+ Amplify)
    if (this.st.elemWheel > 0) this.wheelElement(el)
  }
  /** Elements this run can pick: Sage / Professor skip ✨ Arcane (their perks are 🔥⚡❄️). */
  private runElements() { return (Object.keys(ELEMENTS) as Element[]).filter((e) => this.j2?.id !== 'sage' || e !== 'arcane') }
  /** talent วงล้อธาตุ: the next element after `el` (Sage skips Arcane). */
  private wheelElement(el: Element) {
    const els = this.runElements()
    this.element = els[(els.indexOf(el) + 1) % els.length]
    this.floatText(HERO_X, GROUND - 180, `🔄 ถัดไป ${ELEMENTS[this.element].icon}`, '#c9a8ff')
  }
  private async wizBlast(el: Element, pow: number) {
    const Z = KIT2.wizard
    this.shake(260, 0.016)
    if (el === 'ice') { await this.stormGust(pow); return } // ❄️ a free Storm Gust
    if (el === 'fire') { // ☄️ Meteor Storm
      this.callout('☄️ Meteor Storm!', W / 2, 170)
      playPfx(this, 'fireTornado', 700, GROUND, { scale: 1.5, speed: 1.3 })
      for (let i = 0; i < Z.meteors + this.st.j2Meteors; i++) {
        const l = this.alive(); if (!l.length) break
        const t = l[Phaser.Math.Between(0, l.length - 1)]
        const orb = this.add.circle(t.spr.x + 90, 20, 16, 0xff8c42).setDepth(9000)
        await this.tween({ targets: orb, x: t.spr.x, y: t.spr.y - 30, duration: 170, ease: 'Quad.easeIn' })
        orb.destroy()
        playPfx(this, 'fireball', t.spr.x, t.spr.y - 30, { scale: 1.3, speed: 1.8 })
        this.burst(t.spr.x, t.spr.y - 30, 0xff8c42, 16, 220)
        this.strike(t, (Z.meteorMul + this.st.j2MeteorMul) * pow, true, '#ff8c42')
        if (!t.dead) { t.burnStacks = Math.min(this.burnMax(), t.burnStacks + Z.meteorBurn + this.st.mgFireStack); t.burnStackTurns = 3; this.dotIcon(t) }
      }
      return
    }
    if (el === 'arcane') { // ✨ Star Fall
      this.callout('✨ Star Fall!', W / 2, 170)
      playPfx(this, 'magicCircle', 700, GROUND, { scale: 1.4, speed: 1.4 })
      playPfx(this, 'starFall', 700, GROUND, { scale: 1.5, speed: 1.3 })
      for (const m of this.alive()) {
        playPfx(this, 'arcaneMissiles', m.spr.x, GROUND, { scale: 1.2, speed: 1.6 })
        this.strike(m, (Z.meteorMul + this.st.j2MeteorMul) * pow, true, '#c9a8ff')
      }
      return
    }
    // ⚡ Lord of Vermilion: every monster, N hits, stun chance (boss / mini: gauge push)
    this.callout('⚡ Lord of Vermilion!', W / 2, 170)
    playPfx(this, 'thunderclap', 700, GROUND, { scale: 1.5, speed: 1.4 })
    this.zapTurn.clear()
    for (let h = 0; h < Z.lovHits + this.st.j2LovHits; h++) {
      this.cameras.main.flash(80, 200, 230, 255)
      for (const m of this.alive()) {
        playPfx(this, 'zapBolt', m.spr.x, GROUND, { scale: 1.15, speed: 1.4, flip: h % 2 === 1 })
        this.zap(m, (Z.lovMul + this.st.j2LovMul) * pow, '#bfe6ff', false)
        if (m.dead || Math.random() >= Z.lovStun + this.st.j2LovStun) continue
        if (m.def.ai === 'boss') m.gauge -= Z.lovPush
        else m.frozen = true
        this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 24, '💫 มึน!', '#f2d24b')
      }
      await this.wait(110)
    }
  }
  /** 📖 Sage Auto Spell + On-Hit Elemental Perks (basic swing, Skill 1 Spellstrike, ★ Hindsight combo & counter, ★ Magic Rod). */
  private sageSpell(target?: Mon, guaranteed = false, hitMul = 1, swingHit = true) {
    if (this.j2?.id !== 'sage' || this.hp <= 0) return
    const S = KIT2.sage, endowed = this.endow > 0
    const prevLs = this.lsMul
    this.lsMul = 0
    this.autoSpelling = true
    let autoHit = false
    try {
      if (guaranteed || (swingHit && Math.random() < sageAutoChance(this.st, this.sageInt, endowed))) {
        const el = this.element
        this.floatText(HERO_X, GROUND - 150, `📖 Auto Spell ${ELEMENTS[el].icon}`, '#c9a8ff')
        for (let i = 0; i < 1 + this.st.j2AutoBolts; i++) {
          const t = target && !target.dead ? target : this.front()[0]
          if (!t) break
          const boltMul = (S.autoMul + this.st.j2AutoMul) * hitMul
          let dealt = 0
          if (el === 'lightning') {
            playPfx(this, 'lightningStrike', t.spr.x, GROUND, { scale: 1.1, speed: 1.8 })
            dealt = this.withSrc('other', () => this.zap(t, boltMul, '#bfe6ff', false))
          } else if (el === 'arcane') {
            playPfx(this, 'arcaneMissiles', t.spr.x, GROUND, { scale: 1.1, speed: 1.6 })
            dealt = this.withSrc('other', () => this.strike(t, boltMul, true, '#c9a8ff'))
          } else if (el === 'ice') {
            playPfx(this, 'iceLance', t.spr.x, t.spr.y - t.spr.displayHeight * 0.4, { scale: 1.1, speed: 1.6 })
            dealt = this.withSrc('other', () => this.strike(t, boltMul, true, '#9fe3ff'))
          } else {
            playPfx(this, 'fireball', t.spr.x, t.spr.y - t.spr.displayHeight * 0.4, { scale: 1.1, speed: 1.6 })
            dealt = this.withSrc('other', () => this.strike(t, boltMul, true, '#ff8c42'))
          }
          if (dealt > 0) { autoHit = true; this.profApply(t, el) } // 🎓 Auto Spell marks / reacts
          if (t.dead) continue
          if (el === 'fire') { t.burnStacks = Math.min(this.burnMax(), t.burnStacks + 1); t.burnStackTurns = 3 }
          else if (el === 'ice') { t.chill = Math.max(t.chill, 1); if (!t.charging) t.spr.setTint(0x9fe3ff) }
          this.dotIcon(t)
        }
      }
      if (swingHit || autoHit) this.sageElementalPerks(target, hitMul, endowed)
    } finally {
      this.lsMul = prevLs
      this.autoSpelling = false
    }
  }

  /** 📖 Sage On-Hit Elemental Perks: Fire Bolt xhit · Chain Lightning · Permafrost (main runElement = 100%, others = offMul 50%). */
  private sageElementalPerks(target: Mon | undefined, hitMul: number, endowed: boolean) {
    const P = KIT2.sage.perk, el = this.element
    // 🔥 Fire Bolt × hit
    if (this.st.j2FirePerk > 0 && Math.random() < sageFireChance(this.st, this.sageInt, el, endowed)) {
      const ben = sageElementBenefit('fire', el, this.st)
      this.sageFireBoltsTurn++
      const bolts = ben >= 1 ? Math.min(P.fireMaxBolts, this.sageFireBoltsTurn) : 1
      const mul = (P.fireMul + this.st.j2FireDmg) * ben * hitMul
      for (let i = 0; i < bolts; i++) {
        const t = target && !target.dead ? target : this.front()[0]
        if (!t) break
        playPfx(this, 'fireball', t.spr.x, t.spr.y - t.spr.displayHeight * 0.4, { scale: 1.05, speed: 1.7 })
        if (this.withSrc('other', () => this.strike(t, mul, true, '#ff8c42')) > 0) this.profApply(t, 'fire') // 🎓
        if (!t.dead && (ben >= 1 || Math.random() < profOffMul(this.st))) {
          t.burnStacks = Math.min(this.burnMax(), t.burnStacks + P.fireBurn); t.burnStackTurns = 3; this.dotIcon(t)
        }
      }
      if (this.st.j2FireStar > 0 && this.sageFireBoltsTurn >= P.fireMaxBolts && !this.sageFireNovaUsed && this.alive().length) {
        this.sageFireNovaUsed = true
        this.floatText(HERO_X, GROUND - 170, '💥 Inferno Overdrive!', '#ff7a42')
        playPfx(this, 'fireTornado', 700, GROUND, { scale: 1.25, speed: 1.6 })
        for (const m of this.alive()) {
          this.withSrc('other', () => this.strike(m, P.fireNovaMul * ben * hitMul, true, '#ff7a42'))
          if (!m.dead) { m.burnStacks = Math.min(this.burnMax(), m.burnStacks + P.fireNovaBurn); m.burnStackTurns = 3; this.dotIcon(m) }
        }
      }
    }
    // ⚡ Chain Lightning
    if (this.st.j2LightPerk > 0 && Math.random() < sageLightChance(this.st, this.sageInt, el, endowed)) {
      const ben = sageElementBenefit('lightning', el, this.st)
      const aliveCount = this.alive().length
      const jumps = Math.min(aliveCount, P.lightTargetsBase + (this.st.j2LightPerk >= 3 && ben >= 1 ? 1 : 0))
      const { chain, originDead } = pickChainTargets(target, this.alive(), jumps)
      if (chain.length > 0) {
        let curMul = (P.lightMul + this.st.j2LightDmg) * ben * hitMul * (aliveCount === 1 ? 4 : 1)
        const zapped: Mon[] = [] // 🎓 marked after the chain (reactions stay out of the lightning-hit window)
        this.withLightning(() => {
          for (let i = 0; i < chain.length; i++) {
            const m = chain[i]
            if (m.dead) continue
            if (this.withSrc('other', () => this.strike(m, curMul, true, '#bfe6ff')) > 0) zapped.push(m)
            if (!m.dead && this.st.j2LightStun > 0 && Math.random() < this.st.j2LightStun * ben) {
              if (m.def.ai === 'boss') m.gauge -= P.lightPush
              else this.stunMon(m)
            }
            curMul *= 1 - P.lightDecay
          }
        })
        playChainLightningFx(this, { chain, originDead })
        for (const m of zapped) this.profApply(m, 'lightning')
      }
    }
    // ❄️ Permafrost (Sejuani E: stack 1..4 -> shatter + freeze)
    if (this.st.j2IcePerk > 0 && Math.random() < sageIceChance(this.st, el, endowed)) {
      const t = target && !target.dead ? target : this.front()[0]
      if (t) {
        const ben = sageElementBenefit('ice', el, this.st)
        t.permafrost = (t.permafrost ?? 0) + 1
        t.chill = Math.max(t.chill, 1)
        if (!t.charging) t.spr.setTint(0x9fe3ff)
        if (t.permafrost >= P.iceMax) {
          t.permafrost = 0
          this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 36, '❄️ Permafrost Shatter!', '#9fe3ff')
          playPfx(this, 'frostNova', t.spr.x, GROUND, { scale: 1.2, speed: 1.6 })
          this.withSrc('other', () => {
            if (this.st.j2IceStar > 0) this.forceCrit = true
            this.strike(t, (P.iceMul + this.st.j2IceDmg) * ben * hitMul, true, '#9fe3ff')
            this.forceCrit = false
          })
          if (!t.dead) {
            if (t.def.ai === 'boss') t.gauge -= P.iceBossPush * ben + (this.st.j2IceStar > 0 ? P.iceStarPush : 0)
            else if (!t.frozen) { t.frozen = true; this.freezeCount++; this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 20, 'แช่แข็ง!', '#9fe3ff') }
          }
          if (this.st.j2IceStar > 0) {
            for (const o of this.alive()) if (o !== t) {
              playPfx(this, 'iceSpikes', o.spr.x, GROUND, { scale: 1, speed: 1.7 })
              this.withSrc('other', () => {
                this.forceCrit = true
                this.strike(o, P.iceStarMul * ben * hitMul, true, '#9fe3ff')
                this.forceCrit = false
              })
            }
          }
        } else {
          this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 28, `💠 ${t.permafrost}/${P.iceMax}`, '#9fe3ff')
        }
        this.profApply(t, 'ice') // 🎓
        if (!t.dead) this.dotIcon(t)
      }
    }
  }

  // ===== 🎓 Professor (Sage Awakening): 🏷️ element marks + ⚗️ reactions (numbers KIT3.professor · pure math in skill-math.ts) =====
  private reacting = false // a reaction is resolving: its own hits never mark / react again (no loops)
  private lastCrit = false // the last strike() rolled a crit (🎯 จุดอ่อนธาตุ Mana)
  private pfSet = new Set<ProfReaction>() // reactions set off this wave (🔺 สมการตรีธาตุ)
  private pfConverged = false
  private pfFist = 0 // 👊 Spell Fist swings left
  private pfFistIdx = 0
  private pfFistHeir = false // 👑 สืบสาน: the 3rd swing's reaction is a sure crit
  private pfField = 0 // 🌋 Elemental Field turn-start pulses left
  private pfLayers = 1 // 🌋 + 👑 สืบสาน: Field marks carry 2 charges
  private pfVarMul = 0 // power of the Skill 3 variant that is on (Field: the Endow element's perk branch)
  private pfFreeEndow = false // 📜 Memorize Lv 2: Endow costs no Mana this boss wave
  private pfForce = false // the next reaction is a sure crit
  private pfVarLive = false // a Spell Fist swing / Field pulse is resolving: its reactions take the variant power

  private pfPts(branch: string) { return branchPts(save().job2Tree, branch) }
  private clearMark(m: Mon) { m.mark = null; m.markTurns = 0; m.markLayers = 0 }
  /** A hit of element `el` landed on `m`: mark it, refresh it, or set off a reaction (different element). */
  private profApply(m: Mon | undefined, el: string | null | undefined, layers = 1) {
    if (!m || m.dead || this.st.j3Pf <= 0 || this.reacting || this.hp <= 0 || !isProfMark(el)) return
    const kind = reactionOf(m.mark, el)
    if (kind) { this.fireReaction(m, kind, el); return }
    const same = m.mark === el
    m.mark = el
    m.markTurns = KIT3.professor.markTurns + this.st.j3PfMarkTurns
    m.markLayers = Math.max(same ? m.markLayers ?? 1 : 1, layers)
    this.dotIcon(m)
  }
  /** Spend the mark (layers / 🏷️ residue), hit, 🔁 Double Casting echo, 🔺 Convergence, 💥 hand the mark on. */
  private fireReaction(m: Mon, kind: ProfReaction, el: ProfMark) {
    const ui = REACTION_UI[kind], layers = (m.markLayers ?? 1) - 1
    if (layers > 0) m.markLayers = layers
    else if (Math.random() < this.st.j3PfResidue) this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 62, '🏷️ ตราติดทน', '#c9a8ff')
    else this.clearMark(m)
    this.pfSet.add(kind)
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 48, `${ui.name}!`, ui.color)
    this.reactionHit(m, kind, 1)
    if (this.alive().length && doubleCastReady(this.st, this.res, this.resMax())) { // 🔁 Double Casting (an echo never echoes again)
      this.spendRes(KIT3.professor.dcCost)
      this.floatText(HERO_X, GROUND - 175, `🔁 Double Casting ${ui.name}`, '#c9a8ff')
      this.reactionHit(m.dead ? this.front()[0] : m, kind, doubleCastMul(this.st))
    }
    if (this.st.j3PfTrinity > 0 && !this.pfConverged && this.pfSet.size >= 3 && this.alive().length) this.convergence()
    if (m.dead && this.st.j3PfChain > 0) { // 💥 ลูกโซ่ธาตุ: the mark jumps to the next monsters (may chain-react)
      for (const o of this.front().slice(0, KIT3.professor.chainSpread)) this.profApply(o, el)
    } else this.dotIcon(m)
  }
  /** One reaction's damage + effect at `share` power (1 = the reaction, < 1 = a Double Casting echo). */
  private reactionHit(t: Mon | undefined, kind: ProfReaction, share: number) {
    if (!t || t.dead || this.hp <= 0) return
    const P = KIT3.professor, ui = REACTION_UI[kind]
    const amp = share * (this.pfConverged ? 1 + P.convergeAmp : 1) * (this.endow > 0 ? 1 + KIT2.sage.endowAmp + this.st.j2EndowAmp : 1) * (this.pfVarLive ? 1 + this.pfVarMul : 1)
    const leg = profLegacy(this.st, { f: this.pfPts('sg_f'), l: this.pfPts('sg_l'), i: this.pfPts('sg_i') })
    const prev = { ls: this.lsMul, auto: this.autoSpelling, force: this.forceCrit }
    this.reacting = true; this.lsMul = 0; this.autoSpelling = false // the Endow amp is applied once above, not again via autoSpelling
    let crit = false
    const hit = (m: Mon, k: number) => {
      if (m.dead) return
      this.forceCrit = prev.force || this.pfForce
      this.lastCrit = false // a MISS / dodge returns before strike() sets it
      this.withSrc('other', () => this.strike(m, k, true, ui.color))
      crit ||= this.lastCrit
    }
    try {
      if (kind === 'overload') { // 💥 every monster + armor break
        playPfx(this, 'thunderclap', 700, GROUND, { scale: 1.3, speed: 1.6 })?.setTint(ui.tint)
        this.cameras.main.flash(70, 255, 211, 107)
        for (const o of this.alive()) { hit(o, reactionMul(kind) * amp); if (!o.dead) { o.armorBrk = Math.max(o.armorBrk, P.ovlBreak); this.dotIcon(o) } }
      } else {
        const tgts = [t]
        if (kind === 'superconduct' && leg.chain > 0) tgts.push(...this.front().filter((o) => o !== t).slice(0, leg.chain)) // ⚡ ตำราอัสนี: bounces
        for (const o of tgts) {
          if (o.dead) continue
          const frozen = o.frozen
          if (kind === 'vaporize') { playPfx(this, 'fireball', o.spr.x, o.spr.y - o.spr.displayHeight * 0.4, { scale: 1.3, speed: 1.6 })?.setTint(ui.tint); playPfx(this, 'frostNova', o.spr.x, GROUND, { scale: 0.9, speed: 1.8 })?.setTint(ui.tint) }
          else playPfx(this, 'lightningStrike', o.spr.x, GROUND, { scale: 1.15, speed: 1.7 })?.setTint(ui.tint)
          hit(o, reactionMul(kind, frozen) * amp)
          if (o.dead) continue
          if (kind === 'vaporize' && frozen) { o.frozen = false; o.stunTurns = 0; if (!o.charging) o.spr.clearTint(); this.floatText(o.spr.x, o.spr.y - o.spr.displayHeight - 30, '💨 ตีแตก!', '#ffb08a') }
          if (kind === 'superconduct') {
            o.sunder = Math.max(o.sunder ?? 0, P.supShred); o.sunderTurns = Math.max(o.sunderTurns ?? 0, P.supTurns)
            if (o.def.ai === 'boss') o.gauge -= P.supPush
          }
          this.dotIcon(o)
        }
      }
      // ⚔️ legacy: 🔥 reactions leave burn · ❄️ reactions add Permafrost (never past the shatter, which stays the perk's job)
      if (kind !== 'superconduct' && leg.burn > 0) for (const o of kind === 'overload' ? this.alive() : [t]) if (!o.dead) { o.burnStacks = Math.min(this.burnMax(), o.burnStacks + leg.burn); o.burnStackTurns = 3; this.dotIcon(o) }
      if (kind !== 'overload' && leg.ice > 0 && !t.dead) { t.permafrost = Math.min(KIT2.sage.perk.iceMax - 1, (t.permafrost ?? 0) + leg.ice); this.dotIcon(t) }
      if (crit && this.st.j3PfCritMana > 0) this.gainRes(this.st.j3PfCritMana) // 🎯 จุดอ่อนธาตุ
    } finally {
      this.reacting = false; this.lsMul = prev.ls; this.autoSpelling = prev.auto; this.forceCrit = prev.force
    }
  }
  /** 🔺 สมการตรีธาตุ: all 3 reactions this wave -> Convergence on every monster, reactions stronger until the wave ends. */
  private convergence() {
    const P = KIT3.professor
    this.pfConverged = true
    this.callout('🔺 Convergence! สมการตรีธาตุ', W / 2, 170, '#c9a8ff')
    playPfx(this, 'magicCircle', 700, GROUND, { scale: 1.4, speed: 1.5 })?.setTint(0xc9a8ff)
    const prev = { r: this.reacting, auto: this.autoSpelling, ls: this.lsMul }
    this.reacting = true; this.autoSpelling = false; this.lsMul = 0
    try { for (const o of this.alive()) this.withSrc('other', () => this.strike(o, P.convergeMul, true, '#c9a8ff')) } finally { this.reacting = prev.r; this.autoSpelling = prev.auto; this.lsMul = prev.ls }
  }
  /** A melee swing landed: 👊 Spell Fist rotates 🔥→⚡→❄️, otherwise an Endowed swing carries the Endow element. */
  private profSwing(f: Mon) {
    if (this.st.j3Pf <= 0 || f.dead) return
    if (this.pfFist > 0) {
      const el = PROF_ORDER[this.pfFistIdx % PROF_ORDER.length]
      this.pfFistIdx++; this.pfFist--
      this.pfForce = this.pfFistHeir && this.pfFistIdx % PROF_ORDER.length === 0 // 👑 the round's 3rd swing
      this.floatText(f.spr.x, f.spr.y - f.spr.displayHeight - 56, `👊 ${PROF_ICON[el]}`, '#c9a8ff')
      this.pfVarLive = true
      try { this.profApply(f, el) } finally { this.pfForce = false; this.pfVarLive = false }
      return
    }
    if (this.endow > 0) this.profApply(f, this.element)
  }
  /** Skill 3 variant on top of Endow: 👊 Spell Fist (A) or 🌋 Elemental Field (B). */
  private profVariant() {
    const P = KIT3.professor, el: ProfMark = isProfMark(this.element) ? this.element : 'fire'
    if (save().job3Var === 'b') {
      const pts = this.pfPts(P.fieldBranch[el])
      this.pfVarMul = Math.min(P.varB.cap, P.varB.per * pts)
      this.pfLayers = this.st.j3Heir > 0 && pts >= P.heirNeed ? 2 : 1
      this.pfField = P.varB.turns - 1 // this cast is pulse 1
      this.callout(`${FIELD_NAME[el]}! (${P.varB.turns} เทิร์น)`, W / 2, 200, '#c9a8ff')
      this.profFieldPulse()
      return
    }
    this.pfVarMul = this.st.j3VarMul // sg_a points (hero-stats)
    this.pfFistHeir = this.st.j3Heir > 0 && this.pfPts(P.varA.branch) >= P.heirNeed
    this.pfFist = P.varA.hits; this.pfFistIdx = 0
    this.floatText(HERO_X, GROUND - 185, `👊 Spell Fist ${PROF_ORDER.map((e) => PROF_ICON[e]).join('→')}`, '#c9a8ff')
  }
  /** 🌋 one Field pulse: the Endow element on every monster (different marks react). */
  private profFieldPulse() {
    const el: ProfMark = isProfMark(this.element) ? this.element : 'fire', tint = el === 'fire' ? 0xff8c42 : el === 'ice' ? 0x9fe3ff : 0xbfe6ff
    playPfx(this, 'runeCircle', 700, GROUND, { scale: 1.4, speed: 1.4 })?.setTint(tint)
    this.pfVarLive = true
    try { for (const m of [...this.alive()]) this.profApply(m, el, this.pfLayers) } finally { this.pfVarLive = false }
  }
  /** 💎 Soul Burst (Ult วิวัฒน์ 2): burn all Mana into the front smash, then ignite every mark at once. */
  private async soulBurstUlt(t: Mon | undefined, h2: number, manaBefore: number) {
    const S = KIT2.sage, sb = soulBurst(this.st, this.res, this.resMax()), k3 = 1 + this.st.u3Pow
    const cdCut = foresightCdCut(this.st, manaBefore, this.resMax())
    this.res = sb.left
    this.callout(`💎 Soul Burst! เผา Mana ${sb.burnt}`, W / 2, 205, '#c9a8ff')
    if (t && !t.dead) await this.lunge(t, () => {
      playPfx(this, 'arcaneBeam', t.spr.x - 30, GROUND, { scale: 1.3, speed: 1.5 })?.setTint(0xc9a8ff)
      this.strike(t, (sb.atkMul + this.st.ultMulAdd) * h2 * (1 + this.st.pskill) * k3)
      this.strike(t, (S.ultPm + sb.pmMul) * h2 * k3, true, '#c9a8ff')
      if (!t.dead && this.st.j2UltBreak > 0) { t.armorBrk = Math.max(t.armorBrk, this.st.j2UltBreak); this.dotIcon(t) }
    })
    const endowEl: ProfMark = isProfMark(this.element) ? this.element : 'fire'
    for (const m of [...this.alive()]) { // ignite: marked -> react with the Endow element (or the next one if it is the same) · unmarked -> Endow mark
      if (m.dead) continue
      const ign = !m.mark || m.mark !== endowEl ? endowEl : PROF_ORDER[(PROF_ORDER.indexOf(m.mark) + 1) % PROF_ORDER.length]
      this.profApply(m, ign)
    }
    if (cdCut > 0) { this.smashCdLeft = Math.max(0, this.smashCdLeft - cdCut); this.floatText(HERO_X, GROUND - 185, '🔮 Foresight: คูลดาวน์ −1', '#c9a8ff') }
  }

  /** Q 2026-11-03: lifesteal works only on basic attacks + combo hits (1), the D.Strike extra hit (0.33); skills, actives and passives 0. */
  private lsMul = 0
  /** Spell vamp (Q 2026-11-04): skill hits are collected while a skill runs, then healed once; hitting several monsters heals 1/3. */
  private skillHits: { dmg: number; mons: Set<Mon> } | null = null
  private skillSlot: CritSlot | null = null
  /** Per-skill crit switch (admin: skills `crit.<class>.<slot>`, default on). Off = the skill's OWN hits (src skill / ult / other) never roll a crit.
   *  Not governed: forceCrit (a sure crit is a deliberate effect) and element procs (zap / fire / ice / spear / light ...: ELEM_SRC). */
  private critAllowed() {
    if (this.skillSlot === null || ELEM_SRC.has(this.src)) return true
    return canRollCrit(this.job.id, this.skillSlot)
  }
  /** On-hit proc (zap / fire / ice / spear / light ...) or a Sage Auto Spell bolt: rolls spellCrit (CRIT_RULES). */
  private isProcHit() { return this.autoSpelling || this.reacting || ELEM_SRC.has(this.src) } // 🎓 reactions roll spellCrit (Sage cap)
  /** An active skill / Ult hit (not a proc): rolls skillCrit, and a physical one must pass Hit/Flee even on a crit. */
  private isSkillHit() { return !this.isProcHit() && (this.src === 'skill' || this.src === 'ult' || (this.skillSlot !== null && this.src === 'other')) }
  /** Sage rework v1 crit split (data/battle-rules.ts CRIT_RULES): basic -> crit · skill/Ult -> skillCrit · proc -> spellCrit. */
  /** P2'a th_t2a: one Ult cooldown cut, the single place Thief Ult CD cuts go through (P2'c adds the global cap / floor here). */
  private ultCdCutLeft = 0 // P2'c Global Ult CD cap: turns of Ult CD cut left this hero turn (KIT.thiefUltCdCutCap)
  private ultJustCast = false // P2'c: the Ult was cast this hero turn (CD floor KIT.thiefUltCdFloor)
  /** P2'c Global Ult CD cap: the one place Thief-line Ult CD cuts go through (th_t2a, thief_b3, Rogue Kill Reset). */
  private cutUltCd(n: number) {
    const cut = ultCdCut(this.smashCdLeft, n, this.ultCdCutLeft, this.ultJustCast)
    this.smashCdLeft -= cut; this.ultCdCutLeft -= cut
    return cut
  }
  /** P2'a th_t2a: a dodge cuts Skill 2 (when its CD is the longer one) or the Ult cooldown, once per ICD. */
  private dodgeCdCut() {
    if (this.st.thDodgeCdCut <= 0 || this.dodgeCdIcd > 0) return
    if (this.s2Cd > 0 && this.s2Cd >= this.smashCdLeft) this.s2Cd = Math.max(0, this.s2Cd - this.st.thDodgeCdCut)
    else if (this.cutUltCd(this.st.thDodgeCdCut) <= 0) return // P2'c: nothing to cut / turn cap spent -> the ICD is not used
    this.dodgeCdIcd = this.st.thDodgeCdIcd
  }
  /** P2'b: the debuffs one monster carries, for the pure debuffKinds() (stabMark: P3 Rogue). */
  private debuffFlags(m: Mon): DebuffFlags {
    return { poison: m.poison > 0, wound: m.wound > 0, exposed: m.exposed > 0, chill: m.chill > 0, stabMark: m.stabMark > 0, blind: m.blind > 0, armorBrk: m.armorBrk > 0, weak: m.weakTurns > 0 }
  }
  /** P2'b th_t1c กายต้านพิษ: poison + Wound stacks on the field -> temporary Max HP + tenacity (delta-tracked so the base never drifts). */
  private syncStackBody() {
    if (this.st.thStackHp <= 0 && this.st.thCondTenacity <= 0 && this.thHpBonus === 0 && this.thTenBonus === 0) return
    const live = this.alive()
    const n = Math.min(KIT.thiefStackHpMax, live.reduce((sum, m) => sum + m.poison + m.wound, 0))
    const wantHp = n * this.st.thStackHp, wantTen = live.some((m) => m.poison > 0 || m.wound > 0) ? this.st.thCondTenacity : 0
    const dHp = wantHp - this.thHpBonus
    this.st.maxHp += dHp; this.thHpBonus = wantHp
    if (this.hp > 0) this.hp = dHp > 0 ? this.hp + dHp : Math.min(this.hp, this.st.maxHp) // grows with the bonus, clamped when it fades (never revives)
    this.st.tenacity += wantTen - this.thTenBonus; this.thTenBonus = wantTen
  }
  /** P2'b B1 Taken (R4.6): every term keeps its own filter, then takenAmp() adds them under one cap. Stack thresholds = share of poisonMax(). */
  private takenAmpOf(m: Mon, dot: boolean): number {
    const cap = this.poisonMax()
    const priv = this.st.thPrivileged > 0 && (m.poison >= poisonAt(KIT.thiefPrivShare, cap) || debuffKinds(this.debuffFlags(m), true) >= KIT.thiefKindsAt) ? this.st.thPrivileged : 0
    return takenAmp({
      exposed: !dot && m.exposed > 0 ? m.exposedPct : 0, // Exposed: hits only
      stabMark: !dot && m.stabMark > 0 ? KIT2.rogue.stabMarkAmp : 0, // P3'a Backstab Mark: hits only
      woundPriv: this.s2?.id === 'th_wound' && m.poison > 0 && m.wound > 0 ? S2N.woundPriv : 0, // แผลลึก Privileged: all damage incl. dot
      privileged: priv, // th_t4a สถานะทับซ้อน (dot too)
      poisonAmp: this.st.poisonAmp > 0 && m.poison >= poisonAt(KIT.thiefPoisonAmpShare, cap) ? this.st.poisonAmp : 0, // gear / cards / sets กัดกร่อน (dot too, like before)
    })
  }
  /** Status kinds on a monster for thief_c1: poison / Wound / Exposed / chill (🐌 พิษชา counts). */
  private statusKinds(m: Mon): number { return debuffKinds(this.debuffFlags(m), false) }
  /** P2'c R4.6 B3 Crit Dmg (physical hits): every conditional crit-dmg term adds, one cap KIT.thiefCondCritDmgCap (หมายหัว's release is B4: own x mul). */
  private condCritDmg(m: Mon, opener = false): number {
    const st = this.st, thief = this.job.id === 'thief', hpShare = m.hp / Math.max(1, m.def.hp)
    return condCritB3([
      this.inShroud() && st.s2Star > 0 && this.s2?.id === 'th_smoke' ? S2N.smokeCritDmg : 0, // P2'b Shroud ★
      st.j2HeartRend > 0 && this.rgDebuffed(m) ? st.j2HeartRend : 0, // P3'a Rogue rg_x2 ใจสลาย
      thief && this.src === 'ult' && !this.isProcHit() ? thiefUltCondCritDmg(st, this.statusKinds(m), hpShare) : 0, // thief_u1 / u3 / th_t3a (Ult cap)
      thief && (this.src === 'basic' || this.src === 'combo') && hpShare < KIT.thiefExecBelow ? st.thExecUlt : 0, // thief_u3 on basic / combo
      opener ? st.thWaveOpenCritDmg : 0, // th_t1b R2
    ])
  }
  /** P2'a thief_c4 ★ ราชันย์โลหิต active right now. */
  private bloodKingOn(): boolean { return thiefBloodKingOn(this.st, this.hp, this.st.maxHp, this.inShroud()) }
  /** P2'b ม่านควัน Shroud is up (FLEE / skillCrit / ★ crit dmg / thief_c4 read it). */
  private inShroud(): boolean { return this.shroudTurns > 0 }
  /** P2'b: hero FLEE right now (Shroud x(1 + S2N.smokeFlee)); never write st.flee itself. */
  private fleeNow(): number { return (this.st.flee + this.rgFlee + (this.shadowTurns > 0 ? this.st.thShadowFlee : 0) + (this.dodgeFleeTurns > 0 ? this.st.thDodgeFlee : 0)) * (this.inShroud() ? 1 + S2N.smokeFlee : 1) } // + P3'a rg_c3 combo FLEE · P2'c thief_b1 in ร่างเงา + th_t1a after a dodge
  /** P2'b แผลลึก: add Wound stacks (cap S2N.woundMax(s2Lv)), refresh to S2N.woundTurns hero turns. P2'c On-Hit Ult / thief_b4 ★ call it too. */
  private addWound(m: Mon, n: number) {
    if (m.dead || n <= 0) return
    m.wound = Math.min(S2N.woundMax(this.st.s2Lv), m.wound + n); m.woundTurns = S2N.woundTurns; this.dotIcon(m)
  }
  /** P2'b แผลลึก Blade's End: spend S2N.bladeAt Wound for a DEF-piercing hit + heal cut, once per hero turn per monster (flag set BEFORE the hit). */
  private bladesEnd(m: Mon) {
    m.bladeSpent = true; m.wound -= S2N.bladeAt
    m.woundCut = Math.max(m.woundCut, S2N.bladeHealCut); m.woundCutTurns = S2N.bladeCutTurns
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 40, "🩸 Blade's End", '#ff7a7a')
    shadowSlashFx(this, m.spr)
    sfx.bladesEnd()
    const prevLs = this.lsMul, prevForce = this.forceCrit
    this.lsMul = 0
    const blade = () => this.withSrc('other', () => this.strike(m, S2N.bladeMul * (1 + this.st.pskill), false, '#ff7a7a', 1))
    try {
      if (this.st.s2Star > 0) blade() // ★ แผลมรณะ: Blade's End can crit
      else { this.forceCrit = false; this.noPetCrit(blade) } // no crit, not even inside a forced-crit Back Stab
    } finally { this.lsMul = prevLs; this.forceCrit = prevForce }
    this.dotIcon(m)
  }
  /** P2'b ม่านควัน Sightless Raid: the first active hit after the cast marks Exposed + Blind and hits again (src 'other', so it never re-triggers). */
  private sightlessRaid(m: Mon) {
    this.raidReady = false // off BEFORE the bonus hit
    m.exposed = S2N.exposedTurns; m.exposedPct = this.st.s2Star > 0 ? S2N.exposedStar : S2N.exposedPct
    m.blind = Math.max(m.blind, S2N.smokeBlindTurns); this.dotIcon(m)
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 40, '👁️ Sightless Raid', '#e6e6f2')
    daggerCrossFx(this, m.spr.x, m.spr.y - m.spr.displayHeight / 2, 0, this.j2?.id === 'mobster' ? 'mobster' : 'thief')
    sfx.sightlessRaid()
    this.withSrc('other', () => this.strike(m, S2N.raidMul * (1 + this.st.pskill), false, '#e6e6f2'))
  }
  private critRateFor(magic: boolean, physAdd: number, target?: Mon): number {
    const C = CRIT_RULES.cap
    const sc = target && !magic ? thiefStackCritAdd(this.st, target.poison + target.wound) + this.rgCritAdd(target) : 0 // th_t2b: physical crit / skillCrit per poison + Wound stack · P3'a Rogue rg_x1 / rg_k1
    const spellCap = this.j2?.id === 'sage' ? CRIT_RULES.sageSpellCap : C.spellCrit
    const burnBonus = target && target.burnStacks > 0 ? this.st.j2FireCrit : 0
    const iceBonus = target && (target.chill > 0 || target.frozen) ? (this.st.j2IcePerk > 0 ? KIT2.sage.perk.iceCritBonus : 0) + this.st.j2IceCrit : 0
    const chargeCrit = (magic || this.isProcHit()) && this.st.lightChargeLv > 0 && this.lightChargeStacks > 0 ? this.lightChargeStacks * (0.02 + this.st.lightChargeLv * 0.01) : 0
    if (this.isProcHit()) return Math.min(spellCap, this.st.spellCrit + burnBonus + iceBonus + chargeCrit)
    if (this.isSkillHit()) {
      const skillCrit = this.st.skillCrit + this.kitSkillCritAdd + (this.inShroud() ? S2N.smokeSkillCrit : 0) + (this.src === 'ult' && !magic && this.job.id === 'thief' ? thiefUltCritAdd(this.st) : 0) // P2'b Shroud · P2'c thief_u1 / th_t3a Ult-only skillCrit (still under C.skillCrit)
      if (skillCrit <= 0) return 0 // Q 2026-11-19: any skill (physical or magic) needs skillCrit to crit at all (spellCrit / talent / buff bonuses ride on top of it)
      return Math.min(C.skillCrit, skillCrit + sc + iceBonus + (magic ? this.st.spellCrit + chargeCrit : (this.st.crit + physAdd) * CRIT_RULES.skillFromCrit))
    }
    return magic ? Math.min(spellCap, this.st.spellCrit + burnBonus + iceBonus + chargeCrit) : Math.min(C.crit, this.st.crit + physAdd + sc)
  }
  /** Share of the crit bonus a skill hit keeps (admin: same `crit.<class>.<slot>` number; 1 = full). Sure crits and element procs always keep all of it. */
  private critPow() {
    if (this.skillSlot === null || this.forceCrit || ELEM_SRC.has(this.src)) return 1
    return critPower(this.job.id, this.skillSlot)
  }
  private skillCut() { return Math.min(0.9, this.st.skillDmgCut + (this.buf.blood > 0 ? SPELL_VAMP.bloodCut : 0) + (this.relic === 'bloodpact' ? RELIC_RULES.bloodpact.skillCut : 0)) }
  /** v106: one-cast spellVamp bonus (Grand Cross); asSkill() clears it after healing. */
  private castVamp = 0
  private spellVamp() { return Math.min(0.4, this.st.spellVamp + this.castVamp + (this.buf.blood > 0 ? S2N.bloodVamp(this.st.s2Lv) : 0) + (this.relic === 'bloodpact' ? RELIC_RULES.bloodpact.spellVamp : 0)) }
  /** relic สัญญาเลือด: burn / poison / hellfire ticks are weaker too (Q 2026-11-04) */
  private dotMul() { return this.relic === 'bloodpact' ? 1 - RELIC_RULES.bloodpact.dotCut : 1 }
  /** `slot` = which crit switch (data/skill-registry.ts SKILL_CRIT) governs this cast's own hits; null = none (Skill 3 ...). */
  private async asSkill(fn: () => Promise<void>, src: Src, slot: CritSlot | null = null) {
    this.skillHits = { dmg: 0, mons: new Set() }
    const prev = this.src, prevSlot = this.skillSlot
    this.src = src
    this.skillSlot = slot
    const isCast = src === 'skill' || src === 'ult'
    if (isCast && !this.echoLock && this.hp > 0) {
      if (this.itemEffect('spellblade') || this.hasRiftBoon('rift_spellblade')) this.spellbladeReady = true
      const bp = this.itemEffect('blood_pact')
      if (bp && this.hp > 1) {
        const cost = Math.min(this.hp - 1, Math.round(this.st.maxHp * (bp.threshold ?? 0.06)))
        if (cost > 0) {
          const hp0 = this.hp; this.hp -= cost; this.logLoss('🩸 สัญญาเลือด', hp0)
          this.floatText(HERO_X, GROUND - 145, `🩸 สัญญาเลือด -${cost}`, '#ff4d6d')
        }
      }
      if (slot !== 's2' && this.st.swBloodFurySelf > 0 && this.hp > 1) {
        const sc = bloodFurySelfCost(this.hp, this.st.swBloodFurySelf)
        if (sc > 0) {
          const hp0 = this.hp; this.hp -= sc; this.logLoss('🩸 สัญญาคลั่งเลือด', hp0)
          this.floatText(HERO_X, GROUND - 155, `🩸 คลั่งเลือด -${sc}`, '#ff5a5a')
        }
      }
      const mo = this.itemEffect('mana_overload')
      if (mo && this.job.resource === 'mana' && this.res >= this.resMax() * (mo.threshold ?? 0.6)) {
        const extraMana = Math.min(this.res, Math.round(this.resMax() * 0.1))
        if (extraMana > 0) {
          this.spendRes(extraMana)
          this.floatText(HERO_X, GROUND - 145, '🔮 โอเวอร์โหลด!', '#5aa0ff')
        }
      }
      if (this.biomeState) {
        const bCast = onHeroSkillCastBiome(this.biomeState, this.st.maxHp)
        this.biomeCritAdd = bCast.critDmgBonus
        this.biomeSkillMul = bCast.skillDmgMultiplier
        if (bCast.triggeredOverheat) {
          this.hx.silence = Math.max(this.hx.silence, this.biomeState.overheatedSilenceTurns)
          this.callout('🔥 ความร้อนเกินพิกัด! ติดใบ้', HERO_X + 100, GROUND - 165, '#ff7a42')
        }
        if (bCast.selfBurnDamage > 0 && this.hp > 1) {
          const loss = Math.min(this.hp - 1, bCast.selfBurnDamage)
          if (loss > 0) {
            const hp0 = this.hp; this.hp -= loss; this.logLoss('🌋 ความร้อนเกินพิกัด', hp0)
            this.damageNumber(HERO_X, GROUND - 70, loss, false, '#ff7a42')
          }
        }
      }
    }
    try {
      await fn()
      if (isCast && !this.echoLock && this.alive().length && this.hp > 0) {
        const ed = this.itemEffect('echo_double')
        const rbEcho = this.hasRiftBoon('rift_echo')
        const canEcho = (ed && this.fxReady('echo_double') && Math.random() < (ed.chance ?? 0.25)) || (!ed && rbEcho && Math.random() < 0.25)
        if (canEcho) {
          this.echoLock = true
          if (ed) this.armFxCd(ed)
          this.callout('🪞 สะท้อนเงา! ร่ายซ้ำ', HERO_X + 100, GROUND - 155, '#c9a8ff')
          try { await fn() } finally { this.echoLock = false }
        }
      }
    } finally {
      this.src = prev
      this.skillSlot = prevSlot
      const h = this.skillHits; this.skillHits = null
      const v = this.spellVamp(); this.castVamp = 0
      if (v > 0 && h.dmg > 0 && this.hp > 0) this.heal(h.dmg * v * (h.mons.size > 1 ? SPELL_VAMP.aoe : 1) * (this.berserking() ? 2 : 1), true)
    }
  }

  /** Thief passive Double Strike: chance of +1 hit (Q: unlike RO, it can crit; lifesteals at KIT.thiefStrikeLs). P2'a: landing it gives Energy. */
  private doubleAttack(m: Mon, mul: number) {
    if (this.st.doubleAtk <= 0 || m.dead || Math.random() >= doubleAtkChance(this.st.doubleAtk)) return
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 22, 'DOUBLE!', '#ffd36b')
    sfx.doubleStrike()
    this.addShadow(KIT.thiefShadow.double) // 👤 เกจเงา
    if (this.job.resource === 'energy') this.resGain(KIT.thiefStrikeRes)
    const prev = this.lsMul
    this.lsMul = this.bloodKingOn() ? KIT.thiefBloodKingStrikeLs : KIT.thiefStrikeLs // P2'a thief_c4
    this.strike(m, mul)
    this.lsMul = prev
    if (this.s2?.id === 'th_wound' && this.st.s2Lv > 0 && !m.dead && Math.random() < S2N.woundStrikeChance) this.addWound(m, 1) // P2'b "+" แผลฉีก
  }

  /** PoE Passive Eldritch Venom: mark poison-leech heals eligible for Toxic Overheal -> shield. */
  private withToxicHeal(fn: () => void) {
    const prev = this.toxicHealing
    this.toxicHealing = true
    try { fn() } finally { this.toxicHealing = prev }
  }

  /** P2'd thief_v3 เลือดพิษ: heal from poison damage capped at thiefLeechTurnCap of max HP per hero turn. */
  private leechHeal(n: number) {
    if (n <= 0 || this.leechLeft <= 0 || this.hp <= 0) return
    const amt = Math.min(n, this.leechLeft)
    this.leechLeft -= amt
    this.withToxicHeal(() => this.heal(amt, true))
  }

  /** P2'd thief_v2 ระเบิดสารพิษ (Contaminate): consume a share of poison stacks for a poison burst + AoE splash (1/hero turn). */
  private contaminate(m: Mon) {
    if (m.dead || this.hp <= 0 || !canDetonate(this.detUsed, m.poison, this.poisonMax(), this.st.thDetonate)) return
    const det = detonateStacks(m.poison)
    if (det <= 0) return
    this.detUsed = true
    const star = this.st.thDetonateStar > 0
    const crit = star && Math.random() < contaminateCritChance(this.st.skillCrit, this.st.spellCrit)
    let dmg = Math.max(1, Math.round(detonateDmg(det, m.poisonDmg, this.st.thDetonate) * this.dotMul()))
    if (crit) dmg = Math.max(1, Math.round(dmg * this.st.critMul))
    venomStabFx(this, m.spr)
    sfx.poisonContaminate(crit)
    this.burst(m.spr.x, m.spr.y - 30, 0xa77be0, 14, 200)
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 36, '☣️ ระเบิดสารพิษ!', '#c9a8ff')
    const share = contaminateLeechShare(star)
    const hp0 = m.hp
    this.withSrc('poison', () => this.damageMon(m, dmg, crit, '#a77be0', false))
    const net = hp0 - Math.max(0, m.hp)
    if (this.st.thPoisonLeech > 0 && net > 0) this.leechHeal(net * this.st.thPoisonLeech * share)
    if (!m.dead) {
      m.poison = Math.max(0, m.poison - det)
      if (star && (m.def.ai === 'boss' || !!m.def.mini)) m.poison = Math.min(this.poisonMax(), m.poison + contaminateBossRefund(det))
      this.dotIcon(m)
    }
    const splash = Math.max(1, Math.round(dmg * KIT.thiefDetSplash))
    for (const o of this.alive()) {
      if (o === m || o.dead) continue
      const ohp0 = o.hp
      this.withSrc('poison', () => this.damageMon(o, splash, crit, '#a77be0', false))
      const onet = ohp0 - Math.max(0, o.hp)
      if (this.st.thPoisonLeech > 0 && onet > 0) this.leechHeal(onet * this.st.thPoisonLeech * share)
    }
  }

  /** While true, melee hits stay at the monster (combo chain, Thief ult) and the hero walks home once at the end via goHome(). */
  private stayIn = false

  private async lunge(m: Mon, fn: () => void, thrust = false, quietFx = false) {
    const step = BATTLE.stepMs, tx = m.spr.x - 70
    this.heroRig.playWindup(thrust)
    if (Math.abs(this.heroSpr.x - tx) < 6) { // already in front of it: short pull-back jab instead of a full dash
      await this.tween({ targets: this.heroSpr, x: tx - 14, duration: step * 0.1, ease: 'Quad.easeOut' })
      await this.tween({ targets: this.heroSpr, x: tx, duration: step * 0.1, ease: 'Quad.easeIn' })
    } else await this.tween({ targets: this.heroSpr, x: tx, duration: step * 0.35, ease: 'Quad.easeIn' })
    this.heroRig.playStrike(Math.max(1, this.comboLevel), thrust)
    if (!quietFx) this.heroSlashFx(m.spr.x - 20, GROUND - 40, thrust)
    if (this.job.id === 'thief') {
      if (!quietFx) sfx.daggerSlash(this.hits, this.j2?.id === 'mobster')
    } else {
      sfx.swing()
    }
    fn()
    this.shake(60, 0.004)
    if (!this.stayIn) await this.goHome()
  }

  /** v58 Priest: dash in, hop, slam the mace/book down (gold ring). */
  private async maceSmash(m: Mon, fn: () => void) {
    const step = BATTLE.stepMs, tx = m.spr.x - 70, y0 = this.heroSpr.y
    if (Math.abs(this.heroSpr.x - tx) >= 6) await this.tween({ targets: this.heroSpr, x: tx, duration: step * 0.3, ease: 'Quad.easeIn' })
    await this.tween({ targets: this.heroSpr, y: y0 - 22, angle: -12, duration: step * 0.1, ease: 'Quad.easeOut' })
    await this.tween({ targets: this.heroSpr, y: y0, angle: 8, duration: step * 0.08, ease: 'Quad.easeIn' })
    this.heroSpr.setAngle(0)
    playPfx(this, 'blunt', m.spr.x - 16, GROUND, { scale: 1.5, speed: 1.4 }) // pixelfx: a heavy mace thud
    sfx.swing()
    fn()
    this.shake(80, 0.006)
    if (!this.stayIn) await this.goHome()
  }

  /** v58 Priest ult: a beam of Holy Light falls on one monster (magic, M.ATK). */
  private async holyLight(m: Mon, mul: number, skip?: ReadonlySet<Mon>) {
    const d = this.lanceHit(m, mul, skip) // v120: every Priest light is a หอกแสง (same look, same splash as perk spears)
    await this.wait(BATTLE.stepMs * 0.12)
    return d
  }
  /** v120 หอกแสง (Q 2026-11-11): full hit on `m` + KIT.spearSplash on the alive monster next to it on each side
   *  (`skip` = monsters this volley already hits head-on). Damage source stays the caller's (withSrc). */
  private lanceHit(m: Mon, mul: number, skip?: ReadonlySet<Mon>): number {
    if (m.dead) return 0
    const row = this.alive().sort((a, b) => a.slot - b.slot), i = row.indexOf(m)
    this.lanceFx(m)
    const d = this.strike(m, mul, true, '#f6e27a')
    for (const o of [row[i - 1], row[i + 1]]) if (o && !o.dead && !skip?.has(o)) this.strike(o, mul * KIT.spearSplash, true, '#f6e27a')
    return d
  }
  /** A golden lance drops from the upper left onto the target, then a light burst. Fire-and-forget. */
  private lanceFx(m: Mon) {
    const tx = m.spr.x, ty = GROUND - 20
    const spr = this.add.image(tx - 90, ty - 170, 'dot').setTint(0xf6e27a).setScale(9, 1.6).setRotation(Math.atan2(150, 90)).setDepth(9000).setAlpha(0.95)
    this.tweens.add({ targets: spr, x: tx, y: ty, duration: 110, ease: 'Quad.easeIn', onComplete: () => {
      spr.destroy()
      playPfx(this, 'smite', tx, GROUND, { scale: 1.1, speed: 2 })
    } })
  }

  private async goHome() {
    if (Math.abs(this.heroSpr.x - HERO_X) > 1) await this.tween({ targets: this.heroSpr, x: HERO_X, duration: BATTLE.stepMs * 0.35, ease: 'Quad.easeOut' })
  }

  /** Ranged projectile. `arrow` set = the pixel-art arrow (rotated at the target, impact burst on arrival) instead of the tinted dot. */
  private async shoot(m: Mon, color: number, fn: () => void, arrow?: { palette?: (string | number)[] }) {
    const sx = HERO_X + 30, sy = GROUND - 50
    const tx = m.spr.x, ty = m.spr.y - (arrow ? m.spr.displayHeight * 0.4 : 30)
    const shaft = arrow ? arrowProjectile(this, sx, sy, Math.atan2(ty - sy, tx - sx), arrow.palette) : undefined
    const b = shaft ?? this.add.image(sx, sy, 'dot').setTint(color).setScale(2.2, 1.2).setDepth(9000)
    this.tweens.add({ targets: this.heroSpr, x: HERO_X - 8, duration: 80, yoyo: true })
    sfx.swing()
    await this.tween({ targets: b, x: tx, y: ty, duration: 200 })
    b.destroy()
    if (arrow) arrowImpactFx(this, tx, ty, arrow.palette)
    fn()
  }

  /** Basic attack, then combo: each success chains one more (COMBO.baseCount + st.comboCount). */
  private async basicAttack() {
    const target = this.front()[0]
    const woven = thiefS1Woven(this.job.id, this.s1Weave, false) // P2'a สลับคม: this swing follows แทงพิษ
    this.s1Weave = false // any basic attack ends the weave
    this.weaveBonus = woven ? this.st.thWeaveDmg : 0 // th_t2c: every basic / combo hit of this swing
    if (woven && this.st.thWeaveRes > 0) this.resGain(this.st.thWeaveRes)
    // 📖 Sage Passive Skill 1 (ศาสตราวุธธาตุ): never skips basicAttack; spends Mana alongside the swing to empower + guarantee Auto Spell
    this.sageInfusePow = 0
    if (this.j2?.id === 'sage' && target) {
      const cost = autoCost(this.job, this.st)
      if (this.res >= cost && this.hx.silence <= 0) {
        this.spendRes(cost)
        this.popSkill('s1')
        this.sageInfusePow = (1 + this.st.s1Pow + this.auraNow) * (this.overflow ? this.st.mgOverflow : 1)
      }
    }
    this.comboSum = { on: true, per: new Map() } // RO-style: each hit shows its own white number, the chain total pops big + yellow at the end
    let extra = 0 // roll the chain first (same odds as before) so the hero knows to stay at the monster between hits
    const rate = this.comboChance() - (target ? this.monCombo(target).ignore : 0), count = COMBO.baseCount + this.st.comboCount + (this.relic === 'wolf' ? RELIC_RULES.wolf.comboCount : 0)
    while (extra < count && Math.random() < rate) extra++ // Capybara-style: each extra hit rolls (rate - Ignore Combo), stop on a miss
    this.stayIn = extra > 0 || this.rampage > 0
    const swFirst = (this.swAwaken > 0 || this.rampage > 0) ? this.front()[0] : undefined
    await this.swingOnce()
    if (swFirst) this.swordCleave(swFirst)
    this.comboKnives(false) // Rogue ★: crit knives from the first swing
    if (this.rampage > 0 && this.alive().length) { this.floatText(HERO_X, GROUND - 150, '👹', '#ff5a4e'); await this.swingOnce() } // Berserker บ้าระห่ำ: every swing hits twice
    if (this.alive().length && await this.procs('basic') > 0) await this.wait(120) // พร v2: on-basic-attack cards
    if (this.immortal === 'angel' && this.fightTurns <= IMMORTAL_RULES.angelTurns && this.hp > 0) { // 🌈 พรนางฟ้า
      const t = this.front()[0]
      if (t) { this.withSrc('light', () => this.strike(t, IMMORTAL_RULES.angelMul, true, '#fff3a0')); this.burst(t.spr.x, t.spr.y - 30, 0xfff3a0, 8, 140) }
      this.heal(this.st.maxHp * IMMORTAL_RULES.angelHeal, true)
    }
    let hits = 1
    for (let n = 0; n < extra && this.alive().length; n++) {
      this.comboCount++
      if (this.pk.comboAtk > 0) this.comboAtkN++ // legend เชี่ยวชาญคอมโบ
      this.comboLevel = n + 2
      sfx.combo(n + 2)
      await this.swingOnce()
      this.comboKnives(true) // Rogue มีดบิน
      if (this.j2?.id === 'rogue') { this.rogueCp = Math.min(KIT2.rogue.stabCpMax, this.rogueCp + 1); this.rogueComboHit() } // 🔁 Combo Point · P3'a rg_c1 / rg_c3
      hits++
    }
    if (this.j2?.id === 'rogue' && this.st.j2LivingShadow > 0 && hits >= KIT2.rogue.comboShadowAt) { // P3'a rg_c4 ★ 👥 Living Shadow
      const t = this.stabTarget()
      if (t) {
        this.floatText(HERO_X, GROUND - 160, '👥 เงาเลียนแบบ!', '#b9a8ff')
        await this.backStab(t, KIT2.rogue.comboShadowMul * KIT2.rogue.stabMul * (1 + this.st.s3Pow) * (1 + this.st.pskill), true)
      }
    }
    this.sageInfusePow = 0
    this.comboLevel = 0
    this.comboSum.on = false
    let best: { dmg: number, hits: number, x: number, y: number } | undefined // total for the monster that took the most (cleave splash shows only its own numbers)
    for (const v of this.comboSum.per.values()) if (!best || v.dmg > best.dmg) best = v
    if (hits >= 2 && best) this.comboTotal(best.x, best.y, best.dmg, Math.max(hits, best.hits))
    if (this.j2?.id === 'monk' && this.asuraExhaust <= 0 && this.hp > 0 && this.alive().length) {
      const O = KIT2.monk
      if (this.st.j2ComboThunder > 0 && hits >= O.comboThunderHits && this.charges >= O.thunderMin) { // ⚡ ฟ้าฟาดคอมโบ (0 CD, 0 🔵)
        const pow = 1 + this.st.s3Pow, mul = (O.thunderPm * O.comboThunderMul * (1 + (O.thunderPer + this.st.j2ThunderPer) * this.charges) + this.thunderAtkAdd() * O.comboThunderMul) * pow
        this.floatText(HERO_X + 30, GROUND - 170, '⚡ ฟ้าฟาดคอมโบ!', '#bfe6ff')
        this.cameras.main.flash(70, 191, 230, 255)
        this.withSrc('skill', () => { for (const m of this.alive()) { this.burst(m.spr.x, m.spr.y - 30, 0xbfe6ff, 6, 130); this.strike(m, mul, true, '#bfe6ff') } })
      }
      const fin = this.front()[0]
      if (this.st.j2ComboFinish > 0 && hits >= 2 && this.charges >= 1 && fin) { // 🌪️ ★ พายุหมัดปิดฉาก: 1 🔵 finisher + armor break + stun/push + CD -1
        this.addCharges(-1)
        const finMul = (O.comboFinishMul + O.comboFinishPerHit * (hits - 1)) * (1 + this.st.pskill)
        await this.lunge(fin, () => {
          this.shake(110, 0.008)
          this.burst(fin.spr.x, fin.spr.y - 30, 0xffd24a, 14, 190)
          this.withSrc('combo', () => this.strike(fin, finMul, false, '#ffd24a'))
          if (!fin.dead) {
            fin.armorBrk = Math.max(fin.armorBrk, O.comboFinishBreakTurns); this.dotIcon(fin)
            if (fin.def.ai === 'boss') fin.gauge -= O.comboFinishPush
            else if (Math.random() < O.comboFinishStunChance) this.stunMon(fin)
          }
        })
        this.s3Cd = Math.max(0, this.s3Cd - O.comboFinishCdCut)
        this.smashCdLeft = Math.max(0, this.smashCdLeft - O.comboFinishCdCut)
        this.floatText(HERO_X, GROUND - 165, `🌪️ ปิดฉาก! CD -${O.comboFinishCdCut}`, '#ffd24a')
      }
    }
    this.weaveBonus = 0 // th_t2c covers the hero's own swing only
    await this.monCounter(target) // v49: the target may strike back
    this.stayIn = false
    await this.goHome()
  }

  /** P3'a: one basic / combo swing, open for one Rogue Mark pickup. */
  private async swingOnce() {
    this.pickupOpen = this.j2?.id === 'rogue'
    try { await this.basicOnce() } finally { this.pickupOpen = false }
  }

  private async basicOnce() {
    const live = this.front()
    let f = live[0]
    if (!f) return
    const kind = this.job.id
    this.lsMul = 1 // basic hit + combo: full lifesteal (reset below, before card procs)
    const prevSrc = this.src
    this.src = this.comboLevel >= 2 ? 'combo' : 'basic'
    if (kind === 'archer') {
      if (this.st.arSnipeLow > 0) { const low = live.slice().sort((a, b) => a.hp - b.hp)[0]; if (low) f = low } // talent เก็บตัวเปราะ
      let mul = 1
      if (this.st.lockOn > 0) { // tree: "ล็อกเป้า"
        this.lockStacks = this.lockTarget === f ? Math.min(5, this.lockStacks + 1) : 0
        this.lockTarget = f; mul += 0.08 * this.lockStacks
      }
      await this.shoot(f, 0xf6eedc, () => this.strike(f, mul), {})
    }
    else if (kind === 'mage' && this.j2?.id === 'sage') await this.lunge(f, () => {
      const inf = this.sageInfusePow > 0 ? KIT2.sage.s1InfuseBonus * (1 + this.st.s1Pow) : 0
      const hitDmg = this.strike(f, KIT2.sage.basicMul + inf)
      if (this.sageInfusePow > 0 && !f.dead) {
        if (this.st.mgHex > 0) { f.weakPct = Math.max(f.weakTurns > 0 ? f.weakPct : 0, this.st.mgHex); f.weakTurns = Math.max(f.weakTurns, MAGE_PASSIVE.hex.turns); this.dotIcon(f) }
        if (this.st.autoBurn > 0 && this.element === 'fire') { f.burnStacks = Math.min(this.burnMax(), f.burnStacks + this.st.autoBurn); f.burnStackTurns = 3; this.dotIcon(f); this.tryAblazeDetonate(f) }
      }
      if (hitDmg > 0) this.profSwing(f) // 🎓 Endow / 👊 Spell Fist: the melee hit carries an element
      const isFirstSwing = this.comboLevel === 0
      if (isFirstSwing || this.st.j2Hindsight > 0) {
        this.sageSpell(f, isFirstSwing && this.sageInfusePow > 0, this.sageInfusePow > 0 ? this.sageInfusePow : 1, hitDmg > 0)
      }
    }) // 📖 Sage: melee x P.ATK (+ Passive Skill 1 Mana infusion + on-impact Auto Spell & Perks)
    else if (kind === 'mage') await this.shoot(f, 0x9f7bff, () => { if (this.strike(f, MAGE_SPELL.basicMul, true, '#c9a8ff') > 0) this.gainRes(MAGE_CAST.boltMana) }) // weak free magic bolt (v78: + Mana on hit); real damage = Mana spells
    else if (kind === 'thief') await this.lunge(f, () => { this.strike(f, 0.6); this.strike(f, 0.6); this.doubleAttack(f, 0.6); if (this.st.thS1Matk > 0 && this.st.matk > 0 && !f.dead) this.strike(f, this.st.thS1Matk * KIT.thiefVenomBasicShare * matkToPmRatio(this.st), true, '#c9a8ff'); this.contaminate(f) })
    else if (kind === 'cleric') {
      const surge = this.firstSwing && this.st.j2ChargeFirst > 0
      if (this.st.j2Charge > 0 && this.firstSwing) chargeOpenerFx(this, HERO_X, f.spr.x, GROUND, surge)
      const fs = this.chargeMul()
      const prevForce = this.forceCrit, prevSure = this.sureHit
      if (surge) { this.forceCrit = true; this.sureHit = true }
      try { await this.maceSmash(f, () => this.strike(f, clericBasic() * fs)) } finally { this.forceCrit = prevForce; this.sureHit = prevSure } // v58 Q: melee mace/book smash, P.ATK (STR) only; spells carry M.ATK
      if (this.st.clDawn > 0 && ++this.dawnCount >= KIT.clericTree.dawn.every) { // v108 🌄 รุ่งอรุณ passive (Dawnbreaker): every Nth basic / combo hit
        this.dawnCount = 0
        const t = f.dead ? this.front()[0] : f
        if (t) this.withSrc('other', () => this.dawnBonus([t], 1))
      }
    }
    else {
      const surge = this.firstSwing && this.st.j2ChargeFirst > 0
      const knightCharge = (this.j2?.id === 'knight' || this.st.j2Charge > 0) && this.firstSwing
      if (knightCharge) chargeOpenerFx(this, HERO_X, f.spr.x, GROUND, surge)
      const prevForce = this.forceCrit, prevSure = this.sureHit
      if (surge) { this.forceCrit = true; this.sureHit = true }
      try {
        await this.lunge(f, () => { const cl = BATTLE.cleave + this.st.cleaveAdd, fs = this.chargeMul(); if (live[1]) { this.strike(f, fs); this.strike(live[1], cl) } else this.strike(f, fs + (kind === 'swordsman' ? cl : 0)) }, this.j2?.id === 'knight') // novice, swordsman: cleave (+talent ฟันกวาด) · swordsman alone vs 1 monster: the cleave lands on it too
      } finally { this.forceCrit = prevForce; this.sureHit = prevSure }
    }
    this.lsMul = 0
    if (!f.dead && this.hp > 0) {
      if (this.spellbladeReady) {
        const sb = this.itemEffect('spellblade')
        const rbSb = this.hasRiftBoon('rift_spellblade')
        if ((sb && this.fxReady('spellblade')) || rbSb) {
          this.spellbladeReady = false
          if (sb) this.armFxCd(sb)
          const pow = (sb?.power ?? 0) + (rbSb ? 0.85 : 0)
          this.floatText(f.spr.x, f.spr.y - f.spr.displayHeight - 26, '🗡️ ดาบเวท!', '#7fd7ff')
          this.withSrc('other', () => this.strike(f, pow, true, '#7fd7ff'))
        }
      }
      const rc = this.itemEffect('rend_current')
      if (rc && !f.dead && !this.inUltWindow()) { // 🧬 คมกัดกร่อน (BotRK): % of the target's current HP, boss half, capped by P.ATK
        const pct = rc.power * (f.def.ai === 'boss' ? COMBINE_FX.bossMul : 1)
        const dmg = Math.max(1, Math.round(Math.min(f.hp * pct, this.st.atk * (rc.threshold ?? COMBINE_FX.rendCap))))
        this.burst(f.spr.x, f.spr.y - f.spr.displayHeight / 2, 0xff6b8a, 8, 140)
        this.withSrc('other', () => this.damageMon(f, dmg, false, '#ff6b8a'))
      }
      const th = this.itemEffect('third_hit')
      if (th && !f.dead && !this.inUltWindow() && ++this.thirdHits >= (th.threshold ?? COMBINE_FX.thirdEvery)) { // 🧬 สามจังหวะ (Kraken Slayer): flat burst, no DEF
        this.thirdHits = 0
        const dmg = Math.max(1, Math.round(this.st.atk * th.power + (save().baseLevel ?? 1) * COMBINE_FX.thirdPerLv))
        this.floatText(f.spr.x, f.spr.y - f.spr.displayHeight - 44, '🎯 จังหวะที่ 3!', '#ffd166')
        this.burst(f.spr.x, f.spr.y - f.spr.displayHeight / 2, 0xffd166, 14, 220, true)
        this.withSrc('other', () => this.damageMon(f, dmg, false, '#ffd166'))
      }
      const bs = this.itemEffect('bash')
      if (bs && !f.dead && !this.inUltWindow() && this.fxReady('bash') && Math.random() < (bs.chance ?? COMBINE_FX.bashChance)) { // 🧬 ทุบมึน (Skull Basher)
        this.armFxCd(bs)
        this.burst(f.spr.x, f.spr.y - f.spr.displayHeight / 2, 0xffb347, 12, 180); this.shake(80, 0.004)
        if (f.def.ai === 'boss' && f.charging && !f.castSteady) { this.endMonCast(f, { text: `💥 ทุบมึน! ร่ายแตก ${f.def.name}`, color: '#ffb347' }); f.gauge = monBreakGauge(f.gauge) }
        else this.stunMon(f)
      }
      const bk = this.itemEffect('break_hit')
      if (bk && !f.dead && this.fxReady('break_hit') && Math.random() < (bk.chance ?? COMBINE_FX.breakChance)) { // 🧬 ⛓️ ตัดพลัง (Silver Edge style Break)
        this.armFxCd(bk)
        this.burst(f.spr.x, f.spr.y - f.spr.displayHeight / 2, 0xc9a8ff, 12, 180)
        this.breakMon(f, bk.power)
      }
      const cl = this.itemEffect('chain_lightning')
      const rbCl = this.hasRiftBoon('rift_lightning')
      if (!f.dead && ((cl && this.fxReady('chain_lightning') && Math.random() < (cl.chance ?? 1)) || (!cl && rbCl && Math.random() < 0.3))) {
        if (cl) this.armFxCd(cl)
        const pow = cl?.power ?? rbCl?.effect.power ?? 0.4
        const targets = rbCl?.effect.secondary ?? 2
        this.floatText(f.spr.x, f.spr.y - f.spr.displayHeight - 26, '⚡ สายฟ้าชิ่ง!', '#bfe6ff')
        const { chain: chainRow, originDead } = pickChainTargets(f, this.alive(), targets)
        if (chainRow.length > 0) {
          playChainLightningFx(this, { chain: chainRow, originDead, palette: ZAP_YELLOW, sparks: ZAP_YELLOW_SPARKS })
          this.withSrc('zap', () => { for (const cm of chainRow) this.zap(cm, pow, '#bfe6ff', false) })
        }
      }
    }
    if (this.j2?.id === 'monk') this.monkSwing(f)
    else if (this.st.j2Chill > 0 && !f.dead && Math.random() < this.st.j2Chill) { f.chill = Math.max(f.chill, KIT2.monk.chillTurns); this.dotIcon(f) } // ⚜️ Hybrid borrows Monk ฝ่ามือธาตุ
    if (this.allies.length) {
      this.alliesOnSwing()
      if (this.st.j2WolfRallyStep > 0) {
        const w = readyAllies(this.allies).find((a) => a.def.id === 'wolf')
        if (w) { w.gauge = Math.min(100, w.gauge + this.st.j2WolfRallyStep); this.syncAlly(w) }
      }
    }
    if (this.demonOn && !f.dead) this.addPoison(f, IMMORTAL_RULES.demonPoison) // 🌈 เงาปีศาจ
    this.src = prevSrc
    this.hits++
    if (this.alive().length && await this.procs('hits') > 0) await this.wait(100) // พร v2: every-N-hits cards
  }

  /** Skill 2: buffs tick down, then it casts by itself (free extra action) when ready, paid for and useful. */
  private async skill2Turn() {
    const B = this.buf
    if (B.renew > 0) { B.renew--; this.heal(this.st.matk * S2N.renewHeal(this.st.s2Lv)) } // Priest heals = x M.ATK
    for (const k of ['guard', 'blood', 'hawk', 'mshield', 'lootAtk', 'lootCrit'] as const) if (B[k] > 0) B[k]--
    this.heroRig.setGuardAura(B.guard > 0)
    if (B.bless > 0 && --B.bless === 0) this.syncBless()
    if (B.dawnWis > 0 && --B.dawnWis === 0) this.syncDawnWis(0)
    const k = this.s2
    if (!k || this.hx.silence > 0 || !this.alive().length) return
    if (this.s2Cd > 0) { this.s2Cd--; return }
    if (this.asuraExhaust > 0) return
    if (!mayCast(!this.autoUlt, this.book.s2)) return // v86: manual mode waits for the booking
    if (this.res < k.cost) return
    if (this.smashQueued && this.smashCdLeft <= 0 && this.res - k.cost < this.ultCost()) return // keep Mana for the booked ult
    if (k.id === 'mg_mshield' && B.mshield > 0) return
    if (k.id === 'cl_renew' && (B.renew > 0 || this.hp >= this.st.maxHp)) return
    if (k.id === 'sw_guard' && B.guard > 0) return
    if (k.id === 'cl_bless' && B.bless > 0) return
    this.spendRes(k.cost)
    this.s2Cd = s2Cooldown(k, this.st)
    this.s2Count++
    this.book.s2 = false; this.popSkill('s2')
    await this.asSkill(() => this.castSkill2(k), 'skill', 's2')
  }

  private async castSkill2(k: Skill2Def) {
    const lv = this.st.s2Lv, star = this.st.s2Star > 0, B = this.buf
    this.floatText(HERO_X, GROUND - 160, `${k.icon} ${k.name}`, '#7fd7ff')
    const front = () => this.front()[0]
    const bossFirst = () => this.bossTarget() ?? this.alive().sort((x, y) => y.hp - x.hp)[0]
    switch (k.id) {
      case 'sw_guard': B.guard = S2N.guardTurns(star); this.ctrCharges = Math.max(this.ctrCharges, S2N.guardCounters(star)); this.addShield(this.st.maxHp * S2N.guardShield(star), true); this.heroRig.setGuardAura(true); skill2AuraFx(this, 'sw_guard', HERO_X, GROUND); this.floatText(HERO_X, GROUND - 100, '🛡️ ตั้งการ์ด + โล่', '#9fe3ff'); break
      case 'sw_blood': B.blood = S2N.bloodTurns; skill2AuraFx(this, 'sw_blood', HERO_X, GROUND); break
      case 'sw_taunt':
        for (const m of this.alive()) {
          m.tauntTurns = S2N.tauntTurns(star)
          m.tauntVuln = S2N.tauntVuln(lv)
          m.armorBrk = Math.max(m.armorBrk, S2N.tauntBreakTurns(star))
          m.atkUpTurns = Math.max(m.atkUpTurns, S2N.tauntTurns(star))
          m.atkUp = Math.max(m.atkUp, S2N.tauntEnrage)
          if (star && m.charging) {
            m.charging = false; m.chargeHits = 0; m.castSteady = false; m.castSkill = undefined
            this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '📣 ตัดร่าย!', '#ffd36b')
          }
          this.dotIcon(m)
        }
        if (star) {
          this.resGain(S2N.tauntStarRes)
          this.addShield(this.st.maxHp * S2N.tauntStarShield, true)
          this.floatText(HERO_X, GROUND - 135, `📢 +${S2N.tauntStarRes} ${this.job.resource === 'rage' ? 'Rage' : 'Mana'} + 🛡️`, '#ffd36b')
        }
        skill2AuraFx(this, 'sw_taunt', HERO_X, GROUND, this.alive().map((m) => m.spr))
        this.cameras.main.shake(80, 0.004)
        break
      case 'ar_rain':
        for (let w = 0; w < S2N.rainWaves(star); w++) {
          arrowRainFx(this, GROUND, this.st.arPoisonS2 > 0 ? POISON_GREEN : undefined)
          for (const m of this.alive()) { this.strike(m, S2N.rainMul(lv)); if (this.st.arPoisonS2 > 0) this.addPoison(m, KIT.archerTree.poisonArrowStacks) } // v82 ★ หมอกพิษ
          await this.wait(BATTLE.stepMs * 0.3)
        }
        break
      case 'ar_hawk': B.hawk = S2N.hawkTurns; eagleEyeFx(this, HERO_X, GROUND); break
      case 'ar_trap':
        for (const m of star ? this.alive() : [front()].filter(Boolean) as Mon[]) { this.strike(m, S2N.trapMul); if (this.st.arPoisonS2 > 0) this.addPoison(m, KIT.archerTree.poisonArrowStacks); m.gauge -= S2N.trapPush(lv); this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 20, '🕳️', '#c9c9d6'); snareTrapFx(this, m.spr.x, GROUND) }
        break
      case 'mg_mshield':
        B.mshield = S2N.mshieldTurns(star)
        playPfx(this, 'runeCircle', HERO_X, GROUND, { scale: 1.2, speed: 1.5 })
        this.floatText(HERO_X, GROUND - 100, '🔷 Mana Shield', '#5aa0ff')
        break
      case 'mg_nova':
        playPfx(this, 'frostNova', 700, GROUND, { scale: 1.3, speed: 1.4 })
        this.burst(700, GROUND - 20, 0x9fe3ff, 30, 300)
        for (const m of this.alive()) {
          playPfx(this, 'iceSpikes', m.spr.x, GROUND, { scale: 1.1, speed: 1.6 })
          this.strike(m, S2N.novaMul(lv), true, '#9fe3ff')
          if (m.dead) continue
          m.chill = Math.max(m.chill, S2N.novaChill(star)); if (star) m.gauge -= S2N.novaPush
          if (!m.charging) m.spr.setTint(0x9fe3ff); this.dotIcon(m)
        }
        await this.wait(BATTLE.stepMs * 0.3)
        break
      case 'mg_arcane': {
        let t = bossFirst()
        for (let i = 0; i < S2N.arcaneHits(star); i++) {
          if (!t || t.dead) { t = bossFirst(); if (!t) break }
          const m = t
          playPfx(this, 'arcaneMissiles', m.spr.x, GROUND, { scale: 1.2, speed: 1.7 })
          await this.shoot(m, 0xc9a8ff, () => this.strike(m, S2N.arcaneMul(lv), true, '#c9a8ff'))
        }
        break
      }
      case 'cl_renew': B.renew = S2N.renewTurns(star); this.burst(HERO_X, GROUND - 40, 0x6fd08c, 14, 160); break
      case 'cl_bless': { // v77 Q 2026-11-06: active Blessing (+ Kyrie Eleison barrier, ★ Gloria LUK)
        B.bless = S2N.blessTurns; this.syncBless()
        for (let i = 0; i < S2N.blessCleanse; i++) this.cleanseOne()
        if (lv > 0) {
          this.kyrie = { hp: Math.round(this.st.maxHp * S2N.kyrieHp(lv) * (1 + this.st.shieldAmp)), hits: S2N.kyrieHits }
          this.floatText(HERO_X, GROUND - 100, `🛡️ Kyrie Eleison ${this.kyrie.hp}`, '#9fe3ff')
        }
        if (star) this.floatText(HERO_X, GROUND - 130, `✨ Gloria LUK +${S2N.gloriaLuk}`, '#ffe08a')
        this.burst(HERO_X, GROUND - 40, 0xffe08a, 16, 180)
        break
      }
      case 'cl_spear': this.spears += S2N.spearCount(star); break // "+" node: spearMul set at run start
      case 'th_smoke':
        this.dodgeCharges = Math.max(this.dodgeCharges, S2N.smokeDodges(star))
        this.shroudTurns = S2N.smokeTurns; this.raidReady = true // P2'b Shroud + Sightless Raid
        if (lv > 0) { this.heal(this.st.maxHp * S2N.smokeHeal(lv)); if (this.job.resource === 'energy') this.resGain(S2N.smokeRes(lv)) } // "+" ควันหอม
        smokeBombFx(this, HERO_X, GROUND)
        sfx.smokeBomb()
        this.floatText(HERO_X, GROUND - 190, `🌫️ Shroud ${this.shroudTurns}`, '#c9c9d6')
        break
      case 'th_pick': {
        const m = front(); if (!m) break
        await this.lunge(m, () => {
          sfx.pickpocket()
          daggerCrossFx(this, m.spr.x - 20, GROUND - 40, this.hits, this.j2?.id === 'mobster' ? 'mobster' : 'thief')
          this.strike(m, S2N.pickMul(star))
          if (star && !m.dead) { this.addPoison(m, S2N.pickPoison) }
          ;[...new Set(topStats(m.def).map((x) => (x === 'dex' ? 'luk' : x)))].slice(0, star ? 2 : 1).forEach((k, i) => this.stealFrom(m, k, i)) // DEX and LUK share one loot // 💰 GW2-style steal by the monster's top stat
        }, false, true)
        this.res = Math.min(this.resMax(), this.res + S2N.pickRes(lv))
        break
      }
      case 'th_wound': {
        const m = front(); if (!m) break
        await this.lunge(m, () => {
          venomStabFx(this, m.spr)
          sfx.deepWound()
          this.strike(m, S2N.woundMul(star), false, '#ff7a7a', 1)
          if (!m.dead) { this.addPoison(m, S2N.woundPoison(lv)) }
          this.addWound(m, star ? S2N.woundStarStacks : S2N.woundStacks) // P2'b Wound
        }, true, true)
        break
      }
    }
  }

  private async skillName(sk: { name: string; icon: string }) {
    this.floatText(HERO_X, GROUND - 130, `${sk.icon} ${sk.name}`, '#f2b84b')
    await this.wait(150)
  }

  private async autoSkill() {
    const pow = 1 + this.st.s1Pow // skill web: ทักษะ 1 +power node
    await this.skillName(this.job.auto)
    const live = this.front()
    switch (this.job.id) {
      case 'swordsman': await this.swordS1(); break // the whole line: ⚔️ ดาบสยบมนตร์ (Q 2026-11-21; the old ฟันพายุ + v84 จังหวะดาบ code is gone, Q 2026-11-24 cleanup)
      case 'archer':
        if (this.st.arAim > 0) { // talent ศรเล็ง: 2 aimed shots at the front, + crit
          this.st.crit += this.st.arAimCrit
          for (let i = 0; i < 2; i++) { const m = this.front()[0]; if (!m) break; await this.arrow(m, this.st.arAim * pow, pow) }
          this.st.crit -= this.st.arAimCrit
        } else {
          const shots = this.st.arVolley > 0 ? KIT.archerVolleyShots : KIT.archerAutoShots, mul = this.st.arVolley > 0 ? this.st.arVolley : KIT.archerAuto // talent ศรสามดอก
          const lock = this.st.lockOn > 0 && this.lockTarget && !this.lockTarget.dead ? this.lockTarget : undefined // ★ ล็อกเป้า: ยิงคู่ยิงตัวที่ล็อก
          for (let i = 0; i < shots; i++) { const t = this.alive(); if (!t.length) break; const m = lock && !lock.dead ? lock : t[Phaser.Math.Between(0, t.length - 1)]; await this.arrow(m, mul * pow, pow) }
        }
        break
      case 'mage':
        await this.mageFire(pow + this.auraNow, mageAutoMul(this.st, this.j2?.id === 'wizard' ? MAGE_SPELL.autoMul : MAGE_CAST.fireMul)) // 2026-11-13: 90% M.ATK : 10% P.ATK · v85: instant for every Mage (Sage uses Passive Skill 1 inside basicAttack)
        break
      case 'cleric':
        if (this.hp < this.st.maxHp * (KIT.clericHealBelow - this.st.healAt)) { this.skillHeal(this.st.matk * CLERIC_KIT.heal * pow); playPfx(this, 'healRing', HERO_X, GROUND, { scale: 1, speed: 1.6 }) }
        else if (this.st.judge > 0 && ++this.smiteCount % KIT.clericJudgeEvery === 0) { // tree ★B: วันพิพากษา
          this.callout('⚖️ พิพากษา!', W / 2, 170); live.forEach((m) => playPfx(this, 'pillar', m.spr.x, GROUND, { scale: 1.2, speed: 2 }))
          for (const m of live) { const d = this.strike(m, KIT.clericJudge * pow * (1 + this.st.smiteMul), true, '#f6e27a'); if (!m.dead) m.marked = 2; if (this.st.smiteVamp > 0) this.heal(d * this.st.smiteVamp, true) }
        } else {
          const hit = live.slice(0, KIT.clericSmiteTargets + this.st.smiteTargets), set = new Set(hit)
          for (const m of hit) { // v120: หอกแสง on the front N; splash only onto monsters outside that group
          if (m.dead) continue
          const d = await this.holyLight(m, CLERIC_KIT.smite * pow * (1 + this.st.smiteMul), set)
          if (this.st.smiteVamp > 0) this.heal(d * this.st.smiteVamp, true)
        }
        }
        this.addFaith(KIT.clericTree.faithCast) // v84 สวดภาวนา
        await this.wait(BATTLE.stepMs * 0.4)
        break
      case 'thief':
        this.pickupOpen = this.j2?.id === 'rogue' // P3'a: แทงพิษ can pick up Marks
        try { await this.lunge(live[0], () => { const m = live[0], mul = KIT.thiefAuto * pow * (1 + this.st.pskill); venomStabFx(this, m.spr); sfx.venomStab(); this.strike(m, mul); this.doubleAttack(m, mul); if (!m.dead) { this.addPoison(m, KIT.thiefAutoPoison) } if (this.st.thS1Matk > 0 && this.st.matk > 0 && !m.dead) this.strike(m, this.st.thS1Matk * matkToPmRatio(this.st), true, '#c9a8ff'); this.contaminate(m) }, true, true) } finally { this.pickupOpen = false }
        break
    }
  }

  /** ลูกไฟระเบิด: fire on every monster at `mul` x Pm (Mage / Wizard). */
  private async mageFire(pow: number, mul: number) {
    playPfx(this, 'fireTornado', 700, GROUND, { scale: 1.4, speed: 1.4 })
    this.burst(700, GROUND - 30, 0xff8c42, 30, 300)
    for (const m of this.front()) {
      playPfx(this, 'fireball', m.spr.x, m.spr.y - m.spr.displayHeight * 0.4, { scale: 1.2, speed: 1.6 })
      this.strike(m, mul * pow * (this.overflow ? this.st.mgOverflow : 1), true, '#ff8c42')
      if (this.st.mgHex > 0 && !m.dead) { m.weakPct = Math.max(m.weakTurns > 0 ? m.weakPct : 0, this.st.mgHex); m.weakTurns = Math.max(m.weakTurns, MAGE_PASSIVE.hex.turns); this.dotIcon(m) } // Mage core passive 🕯️ มนต์ถดถอย: its hits weaken (the stronger / longer one wins, never stacks)
      if (this.st.burnDps > 0 && !m.dead) { m.burn = this.st.burnDps; m.burnTurns = 3; this.dotIcon(m) }
      if (this.st.autoBurn > 0 && this.element === 'fire' && !m.dead) { m.burnStacks = Math.min(this.burnMax(), m.burnStacks + this.st.autoBurn); m.burnStackTurns = 3; this.dotIcon(m) } // tree
    }
    await this.wait(BATTLE.stepMs * 0.6)
  }

  private async ultimate() {
    const pow = 1 + this.st.ultPow // skill web: Ult +power node
    const hitPow = pow * (1 + this.st.ultAmp + this.auraNow) // run pick บดกระดูก (+ Mage 🔮 ออร่าเวท): damage only, shields/heals stay
    await this.skillName(this.job.ult)
    if (this.job.id === 'mage' && !this.j2) { this.charge({ kind: 'ult', pow: pow * MAGE_CAST.ultMul, hit: hitPow * MAGE_CAST.ultMul, paid: this.ultCost() }, this.res + this.ultCost()); return } // v78: the element ult chants 1 turn
    if (this.job.id !== 'thief') sfx.slam()
    await this.ultNow(pow, hitPow)
    this.ultWebAfter()
  }
  /** ⚔️ ปลุกดาบ (Q 2026-11-21 Riven-style): wake the blade, the wave fires itself later (swordWaveCheck). Job1 ดาบพิพากษา and,
   *  since Q 2026-11-23, the Knight's 🔱 Pierce of Judgement (same awaken, its wave is one boss-first spear thrust). */
  private async swordAwaken(pow: number, hitPow: number, waveNow = true) {
    const knight = this.j2?.id === 'knight'
    this.swAwaken = SWORD_MANA.awakenTurns + 1 // ticks down after this turn
    this.swWave = true; this.swWaveReUsed = false
    this.swWavePow = hitPow
    this.callout(`${knight ? '🔱 ปลุกหอก' : '⚔️ ปลุกดาบ'}! ${SWORD_MANA.awakenTurns} เทิร์น`, W / 2, 170, knight ? '#ffe08a' : '#9fd0ff')
    awakenBurstFx(this, HERO_X, GROUND)
    this.swAuraStop(); this.swAura = awakenAuraFx(this, HERO_X, GROUND)
    if (this.st.ultShieldAdd > 0) this.addShield(this.st.maxHp * this.st.ultShieldAdd * pow) // Q 2026-11-22: no base shield; only talent ปราการ / cards
    if (this.st.ultCounters > 0) this.ctrCharges = this.st.ultCounters // talent: ท่าสวนพร้อม
    this.cameras.main.flash(120, 140, 170, 220)
    if (waveNow) await this.swordWaveCheck(true) // a monster already low: cut now (the turn-start check covers the rest)
  }
  /** 🌊 คลื่นดาบ: the awakened Swordsman's wave, on every monster. Fires once, when a monster is under the execute line or on the
   *  last awakened turn (swordWaveNow). Runs as the ult (src 'ult' + its crit switch) so ⚖️ คำพิพากษา and ult nodes apply,
   *  but not through asSkill: no second on-cast trigger. `inUlt` = called from the ult itself (src is already 'ult'). */
  private async swordWaveCheck(inUlt = false) {
    if (!this.swWave || this.hp <= 0) return
    if (this.j2?.id === 'knight') { await this.spearWaveCheck(inUlt); return } // 🔱 Pierce of Judgement
    const live = this.front(), fracs = live.map((m) => m.hp / Math.max(1, m.def.hp))
    const go = inUlt ? fracs.some((f) => f < SWORD_MANA.execLow) : swordWaveNow(this.swAwaken, fracs)
    if (!live.length || !go) return
    this.swWave = false
    const prev = this.src, prevSlot = this.skillSlot, pSure = this.sureHit
    this.src = 'ult'; this.skillSlot = 'ult'; this.sureHit = this.st.swAwTrue > 0 // True Strike only with ★ ดาบตื่นเต็มพลัง
    try {
      sfx.slam()
      this.callout('🌊 คลื่นดาบ!', W / 2, 170, '#ff9a6a')
      let dealt = 0, killed = false
      const farX = Math.max(...live.map((m) => m.spr.x))
      await windWaveFx(this, HERO_X + 40, farX, GROUND)
      this.swAuraStop() // the blade's power is spent
      await this.lunge(live[0], () => {
        const low = this.front().filter((m) => m.hp / Math.max(1, m.def.hp) < SWORD_MANA.execLow)
        for (const m of this.front()) {
          dealt += this.strike(m, (SWORD_MANA.ultMul + this.st.ultMulAdd) * this.swWavePow * (1 + this.st.swWaveAmp) * (1 + this.st.pskill) * (m.charging ? 1 + this.st.ultVsCharge : 1)) // + 🌊 คลื่นซ้ำ waveAmp
          this.trySwCull(m)
          if (m.dead) killed = true
        }
        this.releaseSwVeng(this.front())
        for (const m of low) executeMarkFx(this, m.spr.x, m.spr.y - m.spr.displayHeight * 0.45) // ⚖️ คำพิพากษา
        guardianUltFx(this, HERO_X, GROUND, live[0].spr.x - 10, {
          armorBreak: false, shatteredTargets: [], // the v84 ทุบเกราะ / ★ หักท่า nodes are gone (Q 2026-11-24 cleanup)
        })
      }, false, true) // talents: ปราการ / ฟันทลาย
      const U = KIT.swordUltTree
      if (this.st.swWaveShield > 0 && dealt > 0) this.addShield(Math.min(this.st.maxHp * U.waveShieldCap, dealt * U.waveShield)) // ★ ปราการคลื่น
      if (this.st.swWaveRe > 0 && killed && !this.swWaveReUsed && Math.random() < this.st.swWaveRe && this.swAwaken > 1 && this.alive().length) { // ★ คลื่นซ้ำ: one more wave this awaken
        this.swWaveReUsed = true; this.swWave = true
        this.floatText(HERO_X, GROUND - 170, '🌊 คลื่นซ้ำ!', '#8ff0d6')
      }
    } finally { this.src = prev; this.skillSlot = prevSlot; this.sureHit = pSure }
  }
  /** 🔱 Pierce of Judgement's target: boss > mini > front (Q 2026-11-23 "แทงตัวเดียวเล็งบอสก่อน"). */
  private spearTarget(): Mon | undefined { return this.bossTarget() ?? this.alive().find((m) => m.def.mini) ?? this.front()[0] }
  /** 🎯 Pierce (Knight / Lord Knight cast, Q 2026-11-23 "พอไม่มี Pierce เดิมแล้วไม่สะใจ"): the old instant multi-thrust is back as the
   *  first half of Pierce of Judgement. pierceHits hits (boss / mini pierceBigHits) + ทะลวง+ / 🐉 Hundred Spear on the boss-first target,
   *  each pierceMul x P.ATK (+ max HP share), DEF pierce j2Spiral, full ⚖️ curve per hit, crits only with skillCrit. Cast right after ⚔️ ปลุกหอก. */
  private async knightPierce(h2: number) {
    const t = this.spearTarget()
    if (!t) return
    const K = KIT2.knight, st = this.st, big = t.def.ai === 'boss' || !!t.def.mini
    const hits = (big ? K.pierceBigHits : K.pierceHits) + st.j2PierceHits
    const extra = st.j3Lk > 0 ? KIT3.lordknight.extraHits + st.j3GospelField : 0 // 🐉 Hundred Spear
    const pForce = this.forceCrit, prevPiercing = this.knightPiercing
    this.forceCrit = false; this.knightPiercing = true // crits only with skillCrit (the skill-hit rule), never a forced crit
    try {
      this.stayIn = true
      for (let i = 0; i < hits + extra && !t.dead && this.hp > 0; i++) await this.lunge(t, () => {
        const k3 = i >= hits ? 1 + st.u3Pow : 1 // ใยชั้น 3 root powers the added hits
        pierceHitFx(this, t.spr.x, GROUND, i, i >= hits)
        const n = this.strike(t, ((K.pierceMul + st.ultMulAdd) * h2 * (1 + st.pskill) * (t.charging ? 1 + st.ultVsCharge : 1) + this.hpMul()) * k3, false, i >= hits ? '#ff9a6a' : '#f2d24b', st.j2Spiral)
        if (i >= hits && n > 0 && st.j3GospelHeal > 0) this.heal(st.maxHp * st.j3GospelHeal, true) // ทวนดูดเลือด
      }, true, true)
      this.stayIn = false
      if (extra && st.j3AfterBless > 0) { this.j3Bless = KIT3.common.afterTurns; this.floatText(HERO_X, GROUND - 150, `🌅 พรหลังศึก +${Math.round(st.j3AfterBless * 100)}%`, '#ffe08a') }
      this.hitStop(65)
      await this.goHome()
      this.shake(140, 0.01)
    } finally { this.stayIn = false; this.forceCrit = pForce; this.knightPiercing = prevPiercing }
  }
  /** 🔱 คลื่นทะลวง (Knight / Lord Knight): the awakened Knight's wave is ONE big spear thrust at the boss-first target (Pierce already
   *  landed on cast). Fires once, when THAT target is under the execute line or on the last awakened turn: waveMul x the wave power
   *  (+ max HP share), never misses, crits only with skillCrit, full ⚖️ curve. The 🌊 web nodes apply: คลื่นคม amp, ★ ปราการคลื่น, คลื่นซ้ำ. */
  private async spearWaveCheck(inUlt: boolean) {
    const t = this.spearTarget()
    if (!t) return
    const frac = t.hp / Math.max(1, t.def.hp)
    if (!(inUlt ? frac < SWORD_MANA.execLow : swordWaveNow(this.swAwaken, [frac]))) return
    this.swWave = false
    const K = KIT2.knight, st = this.st
    const prev = this.src, prevSlot = this.skillSlot, pSure = this.sureHit, pForce = this.forceCrit
    this.src = 'ult'; this.skillSlot = 'ult'; this.sureHit = this.st.swAwTrue > 0; this.forceCrit = false // True Strike only with ★ ดาบตื่นเต็มพลัง
    let dealt = 0
    try {
      sfx.slam()
      this.callout('🔱 คลื่นทะลวง!', W / 2, 170, '#ffe08a')
      const y = t.spr.y - t.spr.displayHeight * 0.45
      await spearWaveFx(this, HERO_X + 70, t.spr.x - 6, y)
      this.swAuraStop() // the spear's power is spent
      dealt = this.strike(t, ((K.waveMul + st.ultMulAdd) * this.swWavePow * (1 + st.swWaveAmp) * (1 + st.pskill) * (t.charging ? 1 + st.ultVsCharge : 1) + this.hpMul()), false, '#ffe08a', st.j2Spiral)
      this.releaseSwVeng([t])
      this.trySwCull(t)
      if (!t.dead && t.hp / Math.max(1, t.def.hp) < SWORD_MANA.execLow) executeMarkFx(this, t.spr.x, y) // ⚖️ คำพิพากษา
      this.hitStop(80)
      this.shake(160, 0.012)
      const U = KIT.swordUltTree
      if (st.swWaveShield > 0 && dealt > 0) this.addShield(Math.min(st.maxHp * U.waveShieldCap, dealt * U.waveShield)) // ★ ปราการคลื่น
      if (st.swWaveRe > 0 && t.dead && !this.swWaveReUsed && Math.random() < st.swWaveRe && this.swAwaken > 1 && this.alive().length) { // คลื่นซ้ำ
        this.swWaveReUsed = true; this.swWave = true
        this.floatText(HERO_X, GROUND - 170, '🔱 คลื่นซ้ำ!', '#ffe08a')
      }
    } finally { this.src = prev; this.skillSlot = prevSlot; this.sureHit = pSure; this.forceCrit = pForce }
  }
  /** ⚔️ ปลุกดาบ: a basic swing also cuts the next monster for cleaveShare (one cut per swing turn). */
  private swordCleave(first: Mon) {
    const next = this.front().find((m) => m !== first && !m.dead)
    if (!next || this.hp <= 0) return
    cleaveFx(this, next.spr.x, next.spr.y - next.spr.displayHeight * 0.45)
    this.withSrc('basic', () => this.strike(next, SWORD_MANA.cleaveShare + this.st.swAwCleave, false, '#9fd0ff')) // + ⚔️ ฟันกวาดตื่น
  }
  /** 🌀 พายุสวนกลับ (swordsman_b): deterministic AoE counter spin every N hits taken. */
  private triggerSwordHelix() {
    const live = this.alive()
    if (!live.length || this.hp <= 0) return
    const S = KIT.swordS1Tree
    const mul = this.st.swHelixMul * (1 + this.st.swHelixAmp)
    const defFlat = Math.round(this.st.def * this.st.swHelixDef)
    this.counterCount++
    this.callout('🌀 พายุสวนกลับ!', W / 2, 165, '#7fd0ff')
    helixSpinFx(this, HERO_X + 60, GROUND)
    sfx.swing()
    this.shake(65, 0.005)
    this.withSrc('counter', () => {
      for (const o of live) {
        if (o.dead) continue
        this.heroSlashFx(o.spr.x - 10, GROUND - 40, this.rigSpec.isKnightLine)
        this.strike(o, mul, false, '#7fd0ff')
        if (!o.dead && defFlat > 0) this.damageMon(o, defFlat, false, '#ffd984')
        if (!o.dead) this.trySwCull(o)
      }
    })
    if (this.st.swHelixFast > 0) { // ★ จักรผันสะท้าน
      this.addShield(this.st.maxHp * S.helixStarShield, true)
      this.gainRes(S.helixStarMana)
    }
  }
  /** 🔥 เพลิงแค้น (swordsman_a1): release stored damage taken as bonus damage + shield on Ult/wave. */
  private releaseSwVeng(targets: Mon[]) {
    if (this.swVeng <= 0 || this.hp <= 0) return
    const U = KIT.swordUltTree, v = this.swVeng
    this.swVeng = 0
    const sh = Math.round(v * U.vengShield)
    const dmg = Math.round(v * U.vengDmg)
    if (sh > 0) this.addShield(sh, true)
    if (dmg > 0) {
      vengeanceBurstFx(this, HERO_X, GROUND)
      for (const o of targets) if (!o.dead) this.damageMon(o, dmg, false, '#ff9a3c')
      this.floatText(HERO_X, GROUND - 165, `🔥 ระเบิดเพลิงแค้น +${dmg}`, '#ff9a3c')
    }
  }
  /** 🪓 ดาบผ่าชีพ (swordsman_a4 ★): execute low-HP target and reset Ult CD + Mana + buff on kill. */
  private trySwCull(m: Mon): boolean {
    if (this.st.swCull <= 0 || m.dead || this.hp <= 0) return false
    const U = KIT.swordUltTree, isBig = m.def.ai === 'boss' || !!m.def.mini
    const frac = m.hp / Math.max(1, m.def.hp)
    const thresh = swordCullThreshold(isBig, this.st.swCullAdd)
    if (frac <= thresh) {
      this.damageMon(m, Math.ceil(m.hp), false, '#ff5c5c', true)
      executeMarkFx(this, m.spr.x, m.spr.y - m.spr.displayHeight * 0.45)
      sfx.slam()
      this.callout('🪓 ดาบผ่าชีพ!', W / 2, 165, '#ff5c5c')
      if (m.dead) {
        this.gainRes(U.cullMana)
        this.smashCdLeft = Math.max(0, this.smashCdLeft - U.cullCdCut)
        this.swCullBuff = U.cullBuffTurns + 1
        this.floatText(HERO_X, GROUND - 175, `🔥 เพลิงชัยชนะ! CD −${U.cullCdCut} · Mana +${U.cullMana}`, '#ff9a3c')
      }
      return true
    }
    if (isBig && frac <= U.cullBonusAt) {
      const burst = Math.max(1, Math.round(this.st.atk * U.cullBonusMul))
      this.damageMon(m, burst, false, '#ff8a65')
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 36, `🪓 ผ่าเกราะ +${burst}`, '#ff8a65')
    }
    return false
  }
  /** ⚔️ ดาบสยบมนตร์ (Q 2026-11-21, Swordsman / Knight Skill 1): cleanse the hero's CC, one cut on the caster > boss > front
   *  for [P.ATK x pct + STR x k + base x Base Lv] (turned into P.ATK units for strike), then silence + cut its cast + it loses a turn. */
  private async swordS1() {
    const st = this.st, S = KIT.swordS1Tree, s = save(), lv = swordS1Lv(st)
    this.s1Cd = swordS1Cd(st.swS1CdCut)
    const X = this.hx, cc = X.silence + X.web + X.slow
    X.silence = 0; X.slow = 0
    if (X.web > 0) { X.web = 0; this.syncWeb() }
    if (cc > 0) { this.floatText(HERO_X, GROUND - 160, '✨ ล้าง CC!', '#9fd0ff'); cleanseFx(this, HERO_X, GROUND) }
    if (st.swCcGuard > 0) { this.swGuard = S.guardTurns + 1; ccGuardFx(this, HERO_X, GROUND) } // +1: ticks at the next hero turn start · 🛡️ ใจไม่หวั่น
    if (st.swS1Shield > 0) { this.addShield(st.maxHp * st.swS1Shield); blockShieldFx(this, HERO_X, GROUND) } // 🛡️ ตั้งรับ
    if (st.swS1Ctr > 0) this.ctrCharges = Math.max(this.ctrCharges, st.swS1Ctr) // ★ สวนเงียบ
    if (st.swS1CtrDmg > 0) this.s1CtrDmgLeft = Math.max(this.s1CtrDmgLeft, Math.max(st.swS1Ctr, KIT.swordS1Tree.counters))
    const t = this.alive().find((m) => m.charging) ?? this.bossTarget() ?? this.front()[0]
    if (!t) return
    const pb = physBase(st), atkAvg = Math.max(1, (pb.lo + pb.hi) / 2)
    let mul = (swordS1Raw(lv, atkAvg, totalBase(s).str, s.baseLevel) / atkAvg) * (1 + st.pskill) * swordS1ExcessPow(st) + this.hpMul() // Knight: + max HP share
    if (this.j2?.id === 'berserker' && (this.frenzy >= KIT2.berserker.stormFrenzyAt || this.rampage > 0)) mul *= 1 + KIT2.berserker.stormFrenzyAmp
    const wasCasting = t.charging, wasSilenced = (t.mSilence ?? 0) > 0
    const cutY = (m: Mon) => m.spr.y - m.spr.displayHeight * 0.45
    const pSure = this.sureHit, prevKitCrit = this.kitSkillCritAdd
    this.sureHit = true // 🤐 ดาบสยบมนตร์ never misses (Q 2026-11-22)
    this.kitSkillCritAdd = SWORD_S1.skillCritAdd
    try {
    await this.lunge(t, () => {
      sealCutFx(this, t.spr.x, cutY(t))
      this.strike(t, mul)
      if (st.swS1Splash > 0) for (const m of this.alive()) if (m !== t) { cleaveFx(this, m.spr.x, cutY(m)); this.strike(m, mul * st.swS1Splash) } // ⚔️ ฟันเฉือน
    }, false, true)
    if (st.swS1Star > 0 && !t.dead && this.hp > 0) await this.lunge(t, () => { sealCutFx(this, t.spr.x, cutY(t), true); this.strike(t, mul * S.starHit) }, false, true) // ★ ดาบสยบคู่
    } finally { this.sureHit = pSure; this.kitSkillCritAdd = prevKitCrit }
    if (!t.dead) {
      if (t.charging) castBreakFx(this, t.spr.x, cutY(t))
      if (t.charging) this.endMonCast(t, { text: '🤐 ขัดร่าย!', color: '#9fd0ff', float: true, dy: 24 })
      t.mSilence = Math.max(t.mSilence ?? 0, SWORD_S1.silenceTurns + (st.swS1Star > 0 ? 1 : 0))
      t.frozen = true // loses its next turn (the silence counts down only on the turns it acts)
      const swBrk = swordBreakTurnsOf(st.swS3ArmorBreak)
      if (swBrk > 0) t.armorBrk = Math.max(t.armorBrk, swBrk) // 🔨 ทลายเกราะศึก
      silenceSealFx(this, t.spr.x, t.spr.y - t.spr.displayHeight - 8)
      this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 30, '🤐 ใบ้ · 💫 เสียเทิร์น', '#9fd0ff')
      this.dotIcon(t)
    }
    if (st.swS1Refund > 0) { // ⚔️ ตัดจังหวะ
      if (wasCasting) { this.resGain(st.swS1Refund); this.s1Cd = Math.max(0, this.s1Cd - 1) }
      else if (t.def.ai === 'boss' || !!t.def.mini || wasSilenced) this.resGain(Math.round(st.swS1Refund * 0.5))
    }
  }
  /** v84 webs, after any Swordsman / Priest ult (their 2nd jobs too): ม่านพร · ชุบชีวา. */
  private ultWebAfter() {
    const C = KIT.clericTree, st = this.st
    if (st.clUltWard > 0) { this.wardTurns = C.wardTurns + 1; this.floatText(HERO_X, GROUND - 175, `🕯️ ม่านพร −${Math.round(st.clUltWard * 100)}% ${C.wardTurns} เทิร์น`, '#fff3a0') } // +1: this turn's tick
    if (st.clUltMend > 0 && this.hp > 0 && this.hp < st.maxHp) this.skillHeal((st.maxHp - this.hp) * st.clUltMend)
  }
  /** PoE Passive Death Mark (Keystone 💀 ตราความตาย): mark highest-HP alive monster (prefer unguarded). Refreshes turns without wiping recorded dmg. */
  private applyDeathMark() {
    const t = pickDeathMarkTarget(this.mons, () => false)
    if (!t) return
    const next = applyDeathMarkState(t.deathMark ?? 0, t.deathMarkDmg ?? 0, KIT.thiefDeathMarkTurns)
    t.deathMark = next.turns
    t.deathMarkDmg = next.dmg
    this.dotIcon(t)
    this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 44, '💀 ตราความตาย!', '#d99bff')
  }
  /** PoE Passive Death Mark: pure B6 echo burst (zero B1-B5 double-dip, skips monster shield, guarded against double-kill). */
  private popDeathMark(m: Mon) {
    if (m.dead) { m.deathMark = 0; m.deathMarkDmg = 0; return }
    const recorded = m.deathMarkDmg ?? 0
    m.deathMark = 0
    m.deathMarkDmg = 0
    this.dotIcon(m)
    const echo = deathMarkEchoDmg(recorded, this.st.thDeathMark)
    if (echo <= 0) return
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 44, `💀 ตราความตาย! ${echo}`, '#d99bff')
    this.burst(m.spr.x, m.spr.y - 30, 0xd99bff, 16, 220)
    this.shake(110, 0.007)
    this.deathMarkPopping = true
    try {
      this.withSrc('other', () => this.damageMon(m, echo, false, '#d99bff', true, true, true))
    } finally {
      this.deathMarkPopping = false
    }
  }
  private async ultNow(pow: number, hitPow: number) {
    if (this.job.id === 'thief' && this.st.thDeathMark > 0) this.applyDeathMark()
    const live = this.front()
    if (this.j2) { await this.ult2(live, pow, hitPow); return }
    switch (this.job.id) {
      case 'swordsman':
        await this.swordAwaken(pow, hitPow)
        break
      case 'archer':
        await this.archerPierce(hitPow)
        break
      case 'mage': {
        const el = this.element
        const amp = 1 + this.st.mgUltAmp + (el === 'lightning' ? this.st.mgLightAmp : el === 'fire' ? this.st.mgFireAmp : this.st.mgIceAmp)
        const dc = this.st.mgDoubleCast > 0 ? this.st.mgDoubleCast : 1 // talent ร่ายคู่
        await this.mageUlt(el, hitPow * amp * dc, pow * amp * dc) // v78 fix: damage on hitPow (ultAmp / บดกระดูก), barrier stays on pow
        if (this.st.mgDoubleCast > 0) await this.mageUlt(el, hitPow * amp * dc, 0)
        if (this.st.mgUltMana > 0) this.res = Math.min(this.resMax(), this.res + this.st.mgUltMana)
        if (this.st.elemWheel > 0) this.wheelElement(el) // talent วงล้อธาตุ
        break
      }
      case 'cleric':
        await this.clericUlt(live, pow, hitPow)
        break
      case 'thief':
        await this.shadowDance(hitPow)
        break
    }
  }

  /** v111 ✨ Grand Cross pulses left (one fires on cast, then one at the start of each hero turn). k / extra are fixed at cast. */
  private gc: { left: number; n: number; k: number; extra: number; base: number } | null = null
  private j3Bless = 0 // ⚜️ พรหลังศึก: hero turns of outgoing damage + j3AfterBless left
  private inspire = 0 // ⚜️ ★ Inspiration: hero turns left · inspireUsed = once per fight
  private inspireUsed = false
  private earthDone = false // ⚜️ Earth Drive: once per fight, on the first hero turn
  private hwAmp = 0 // 🌌 High Wizard Amplify: hero turns of + magic damage left
  private mcOver = 0 // 🤖 Mechanic Overclock: hero turns of + speed left
  /** One Grand Cross pulse on every monster: gcPm x Pm (+ burn share, magic) and gcAtk x P.ATK + gcStr x STR (+ root share, physical).
   *  ★ ซ้อน: hits twice, the 2nd without the burn share. v119: no spell vamp (the HP refund heals) · 🛡️ กางเขนคุ้มกาย shield per pulse. */
  private async gcPulse() {
    const g = this.gc
    if (!g || g.left <= 0 || !this.alive().length) return
    const C = KIT2.crusader, b = totalBase(save()), bl = this.buf.bless > 0 ? blessBase(save()) ?? {} : {}
    const pb = physBase(this.st), atkAvg = Math.max(1, (pb.lo + pb.hi) / 2)
    const physMul = (C.gcAtk + this.st.clUltAtk / g.n) * g.k * (1 + this.st.pskill) + C.gcStr * (b.str + (bl.str ?? 0)) * g.k / atkAvg
    const last = g.left === 1, idx = g.n - g.left
    g.left--
    const k3 = idx >= g.base ? 1 + this.st.u3Pow : 1 // ⚜️ the pulses Gospel Cross adds take the ใยชั้น 3 root
    const hits = this.alive().length
    if (this.st.j2GcShield > 0) this.addShield(this.st.maxHp * this.st.j2GcShield)
    for (let twice = 0; twice < (this.st.j2GcTwice > 0 ? 2 : 1) && this.alive().length; twice++) {
      this.cameras.main.flash(110, 255, 243, 160)
      for (const m of this.alive()) {
        playPfx(this, last ? 'pillar' : 'smite', m.spr.x, GROUND, { scale: last ? 1.3 : 1.2, speed: 2 }) // ✨ Grand Cross: light on every pulse, the last one a pillar
        const cross = this.add.text(m.spr.x, m.spr.y - m.spr.displayHeight / 2, '✝️', { fontSize: last ? '50px' : '40px' }).setOrigin(0.5).setDepth(9000)
        this.tweens.add({ targets: cross, scale: 1.6, alpha: 0, duration: 300, onComplete: () => cross.destroy() })
        this.strike(m, (C.gcPm * g.k + (twice === 0 ? g.extra / Math.max(1, magicPower(this.st)) : 0)) * k3, true, '#fff3a0')
        this.strike(m, physMul * k3, false, '#ffe08a')
      }
      await this.wait(BATTLE.stepMs * 0.25)
    }
    if (this.st.j3On > 0 && hits > 0) { // ⚜️ Gospel: Faith from a big pulse · แสงพระวรสาร heal
      const P = KIT3.paladin
      if (hits >= P.gospelAt) this.addFaith(P.blockFaith + this.st.j3GospelFaith)
      if (this.st.j3GospelHeal > 0) this.heal(this.st.maxHp * this.st.j3GospelHeal * Math.min(P.gospelHealMax, hits), true)
    }
    if (g.left <= 0) {
      this.gc = null
      if (this.st.j3AfterBless > 0) { this.j3Bless = KIT3.common.afterTurns; this.floatText(HERO_X, GROUND - 150, `🌅 พรหลังศึก +${Math.round(this.st.j3AfterBless * 100)}%`, '#ffe08a') }
    }
  }

  /** v58 Cleric ult พรคุ้มครอง: smash all (P.ATK) + 🌄 Dawn Light + Holy Light (M.ATK) + timed shield + Ult-web extras.
   *  v103 (Q 2026-11-07): Crusader's Grand Cross runs all of it first. */
  private async clericUlt(live: Mon[], pow: number, hitPow: number) {
    const charging = this.alive().some((m) => m.charging)
    if (live[0]) await this.maceSmash(live[0], () => { live.forEach((m) => this.strike(m, clericUltSmash(this.st) * (hitPow / pow) * (1 + this.st.pskill))); this.cameras.main.flash(120, 255, 240, 170) })
    for (let i = 0; i < clericUltLights(this.st); i++) { const t = this.alive(); if (!t.length) break; await this.holyLight(t[Phaser.Math.Between(0, t.length - 1)], CLERIC_KIT.ultLight * hitPow) }
    this.addShield(this.st.maxHp * CLERIC_KIT.ultShield * pow * (charging ? 1 + this.st.ultChargeShield : 1)) // talent: ใต้ปีกเทพ · lasts shieldTurns, capped
    await this.clericUltExtras()
  }
  /** Cleric Ult-web extras after the hits: ★ ไฟชำระ + talents แสงลงทัณฑ์ / พรยืนยาว (v106: Grand Cross too). */
  private async clericUltExtras() {
    if (this.st.clPurify > 0) { // Ult web ★: ไฟชำระ
      const X = this.hx, n = X.poison + X.burn + X.weaken + X.armorBreak + X.silence + X.web + X.slow + X.thorn + X.venomTurns
      this.hx = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0, web: 0, slow: 0, thorn: 0, venom: 0, venomTurns: 0 }; this.syncWeb()
      this.skillHeal(this.st.matk * CLERIC_KIT.purifyHeal)
      this.floatText(HERO_X, GROUND - 160, n > 0 ? '🔆 ไฟชำระ: ล้างดีบัฟ!' : '🔆 ไฟชำระ', '#ffe08a')
    }
    this.burst(HERO_X, GROUND - 50, 0xf6e27a, 24, 200)
    if (this.st.ultHoly > 0) for (const m of this.alive()) this.strike(m, this.st.ultHoly, true, '#f6e27a') // talent: แสงลงทัณฑ์
    if (this.st.ultRegen > 0) this.ultRegenTurns = 3 // talent: พรยืนยาว
    await this.wait(BATTLE.stepMs * 0.5)
  }

  /** Archer ult ศรทะลวง: dodge back + a piercing shot at the boss / biggest HP (Beastmaster / Innovator ults end with it). */
  private async archerPierce(hitPow: number) {
    this.dodgeCharges = Math.max(this.dodgeCharges, 1 + this.st.arUltDodge) // talent ถอยยาว
    this.floatText(HERO_X, GROUND - 100, '💨 ถอยหลบ!', '#c9c9d6')
    const t = this.bossTarget() ?? this.alive().sort((x, y) => y.hp - x.hp)[0]
    if (t) {
      this.tweens.add({ targets: this.heroSpr, x: HERO_X - 40, duration: 120, yoyo: true })
      this.ultFiring = true
      this.tweens.add({ targets: this.heroSpr, x: HERO_X - 8, duration: 80, yoyo: true })
      sfx.swing()
      pierceShotFx(this, t.spr.x, t.spr.y - t.spr.displayHeight * 0.4) // the lance flies in from the left; the strike lands as it arrives
      await this.wait(RANGER_FX.pierceShot.hitMs)
      {
        const A = KIT.archerTree, low = this.st.arExecute > 0 && t.hp < t.def.hp * A.execBelow // v82 ★ ศรประหาร
        if (low && t.def.ai !== 'boss') this.execute(t)
        else this.strike(t, (KIT.archerUlt - this.st.arUltMulCut) * hitPow * (low ? 1 + A.execBig : 1), false, undefined, this.st.pierce)
        this.burst(t.spr.x, t.spr.y - 30, 0xfff3a0, 20, 260)
        if (this.st.arMark > 0 && !t.dead) { t.huntMark = A.markTurns; this.dotIcon(t); huntMarkOn(this, t.spr); this.floatText(t.spr.x, t.spr.y - t.spr.displayHeight - 40, '🏷️ หมายหัว', '#f2b84b') } // v82 หมายหัว
        if (this.st.arUltSplash > 0) for (const o of this.alive()) if (o !== t) this.strike(o, this.st.arUltSplash * hitPow, false, undefined, this.st.pierce) // talent ศรเจาะทะลุ
      }
      this.ultFiring = false
      this.shake(160, 0.012)
    }
    await this.wait(200)
  }

  // ----- v82 archer web: 🧪 ศรพิษ / 🏷️ ล่าหัว (numbers KIT.archerTree) -----
  /** One ยิงคู่ arrow: ศรอาบพิษ may poison · a kill fires ศรเด้ง at the front (a ricochet never ricochets again). */
  private async arrow(m: Mon, mul: number, pow: number) {
    const was = !m.dead
    await this.shoot(m, 0xf2b84b, () => { if (this.strike(m, mul) > 0) this.poisonArrow(m) }, { palette: this.st.arPoisonArrow > 0 ? POISON_GREEN : undefined })
    if (!was || !m.dead || this.st.arRicochet <= 0) return
    const n = this.front()[0]
    if (!n) return
    this.floatText(n.spr.x, n.spr.y - n.spr.displayHeight - 40, '🍃 ศรเด้ง!', '#c9f2a0')
    await this.shoot(n, 0xc9f2a0, () => { if (this.strike(n, this.st.arRicochet * pow) > 0) this.poisonArrow(n) }, { palette: RICOCHET_LEAF })
  }
  private poisonArrow(m: Mon) { if (this.st.arPoisonArrow > 0 && Math.random() < this.st.arPoisonArrow) this.addPoison(m, KIT.archerTree.poisonArrowStacks) }
  /** ★ ศรประหาร on a normal monster: finish it through the normal kill path (on-kill effects still run). */
  private execute(m: Mon) {
    if (m.dead) return
    const d = Math.max(1, Math.ceil(m.hp))
    m.shield = 0; m.hp = 0
    this.damageNumber(m.spr.x, m.spr.y - m.spr.displayHeight, d, true, '#ff5a5a')
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 40, '💀 ประหาร!', '#ff5a5a')
    this.killMon(m)
  }
  /** Kill hook: ไล่ล่า (the marked one died: Energy + the mark jumps to the front) · ล่าต่อ (chance ult cooldown −1). */
  private archerKill(m: Mon, others: Mon[]) {
    const A = KIT.archerTree
    if (m.huntMark > 0 && this.st.arMarkJump > 0) {
      m.huntMark = 0
      this.gainRes(this.st.arMarkJump)
      const f = others.filter((o) => !o.dead).sort((a, b) => a.slot - b.slot)[0]
      if (f) { f.huntMark = A.markTurns; this.dotIcon(f); huntMarkOn(this, f.spr); this.floatText(f.spr.x, f.spr.y - f.spr.displayHeight - 40, '🏷️ ไล่ล่า!', '#f2b84b') }
    }
    if (this.st.arKillCd > 0 && Math.random() < this.st.arKillCd) {
      if (this.smashCdLeft > 0) this.smashCdLeft = Math.max(0, this.smashCdLeft - A.killCdCut)
      this.gainRes(A.killCdRes)
      this.floatText(HERO_X, GROUND - 170, `⏳ ult −${A.killCdCut} · +${A.killCdRes}`, '#f2b84b')
    }
  }

  // ----- v84 webs: 🙏 ศรัทธา / ⛪ ฟื้นคืน (KIT.clericTree) · 🚩 ธงศึก / 🌀 กวาดทวน (KIT2.knight.tree) -----
  private faith = 0 // Priest Faith stacks (this run)
  private overBursting = false // ★ แสงล้นฟ้า running (its kill heals can't chain another burst)
  private wardTurns = 0 // ม่านพร: hero turns of less damage taken left
  private clEmerUsed = false // ฉุกเฉิน used this wave
  private holyRevived = false // ★ คืนชีพ used this run
  private sweepTurn = 0 // Knight ทวนวน: hero turns this wave
  private addFaith(n: number) {
    const T = KIT.clericTree
    if (this.st.clFaith <= 0 || n <= 0 || this.faith >= T.faithMax) return
    this.faith = Math.min(T.faithMax, this.faith + n)
    this.floatText(HERO_X - 40, GROUND - 175, `🙏 ศรัทธา ${this.faith}/${T.faithMax}`, '#fff3a0')
  }
  /** Full Faith: holy light on every monster (x Pm) + พรเกื้อ heal per stack. */
  private async faithBurst() {
    const T = KIT.clericTree, n = this.faith
    if (this.st.clFaith <= 0 || n < T.faithMax || !this.alive().length || this.hp <= 0) return
    this.faith = 0
    this.callout('🙏 ศรัทธาระเบิด!', W / 2, 170, '#fff3a0')
    this.cameras.main.flash(120, 255, 243, 170)
    this.withSrc('light', () => { for (const m of this.alive()) { this.strike(m, this.st.clFaith * (1 + this.st.s1Pow), true, '#fff3a0'); playPfx(this, 'pillar', m.spr.x, GROUND, { scale: 1.2, speed: 2 }) } })
    if (this.st.clFaithHeal > 0) this.heal(this.st.maxHp * this.st.clFaithHeal * n)
    await this.wait(BATTLE.stepMs * 0.3)
  }
  /** Overheal (amount past max HP): ล้นศรัทธา may give Faith · ★ แสงล้นฟ้า hits the front monster with it. */
  private overFaith(over: number) {
    const T = KIT.clericTree
    if (this.st.clFaithOver > 0 && over >= this.st.maxHp * T.overMin && Math.random() < this.st.clFaithOver) this.addFaith(1)
    const f = this.front()[0]
    if (this.st.clOverBurst <= 0 || this.overBursting || !f) return
    this.overBursting = true
    try { this.withSrc('light', () => this.damageMon(f, Math.max(1, Math.round(Math.min(over, this.st.maxHp * T.overCap) * T.overBurst)), false, '#fff3a0')) } finally { this.overBursting = false }
  }
  /** ★ คืนชีพ: once per run, a knock-out leaves the Priest at reviveHp + shield, debuffs cleared. */
  private holyRevive(): boolean {
    if (this.hp > 0 || this.st.clRevive <= 0 || this.holyRevived) return false
    const T = KIT.clericTree
    this.holyRevived = true; this.revivedCount++
    this.hp = Math.round(this.st.maxHp * T.reviveHp)
    this.hx = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0, web: 0, slow: 0, thorn: 0, venom: 0, venomTurns: 0 }; this.syncWeb()
    this.addShield(this.st.maxHp * T.reviveShield, true)
    this.heroRig.resetPose()
    this.cameras.main.flash(300, 255, 243, 170)
    playPfx(this, 'feathers', HERO_X, GROUND - 50, { scale: 1.5, speed: 1.3 }) // ✨ wings of light scatter
    playPfx(this, 'healRing', HERO_X, GROUND, { scale: 1.2, speed: 1.4 })
    this.callout('✨ คืนชีพ! แสงศักดิ์สิทธิ์ดึงกลับมา', W / 2, 200, '#fff3a0')
    sfx.win()
    return true
  }
  /** Knight ทวนวน: a free spear sweep on every monster (+ max HP share) · เหวี่ยง gauge push · ทวนเร็ว gauge per kill · ★ พายุทวน break + stun. */
  private async spearSweep() {
    const T = KIT2.knight.tree, st = this.st, live = this.front()
    if (!live.length) return
    this.floatText(HERO_X, GROUND - 130, '🌀 กวาดทวน', '#f2b84b')
    let kills = 0
    const prevKitCrit = this.kitSkillCritAdd
    this.kitSkillCritAdd = T.sweepCritAdd
    try {
      await this.lunge(live[0], () => this.withSrc('skill', () => {
        brandishSweepFx(this, live[0].spr.x + 25, GROUND, live.map((m) => m.spr), 0xf2b84b, false)
        for (const m of live) {
          this.strike(m, st.j2Sweep * (1 + st.pskill) + this.hpMul())
          if (m.dead) { kills++; continue }
          if (st.j2SweepPush > 0) m.gauge -= st.j2SweepPush
          if (st.j2SweepStar > 0) { m.armorBrk = Math.max(m.armorBrk, T.sweepBreak); this.dotIcon(m); if (Math.random() < T.sweepStun) this.stunMon(m) }
        }
      }), false, true)
    } finally {
      this.kitSkillCritAdd = prevKitCrit
    }
    if (st.j2SweepGauge > 0 && (kills > 0 || live.length > 0)) {
      const effLv = st.j2SweepGauge / T.sweepGauge
      const gain = st.j2SweepGauge * kills + T.sweepHitGauge * effLv * live.length
      this.heroGauge = Math.min(100, this.heroGauge + gain)
      if (T.sweepRes > 0) this.resGain(T.sweepRes)
      this.floatText(HERO_X, GROUND - 160, '⚡ ทวนเร็ว', '#f2b84b')
    }
  }

  /** Thief ult เงาพริ้ว (Rogue พายุมีด reuses it). */
  private async shadowDance(hitPow: number) {
    const st = this.st
    this.dodgeCharges = Math.max(0, KIT.thiefUltDodge + st.ultDodge) // talents: เงาหมอกลวงตา + / เงาสังหาร −
    this.addShadow(KIT.thiefShadow.ult + st.thUltGauge) // 👤 เกจเงา (+ P2'c th_t3c)
    sfx.shadowDanceStart()
    this.stayIn = true // dart from monster to monster, walk home once at the end
    // P2'c (thiefUlt* in skill-math = the budget math): every stab (finisher too) x Ratio AGI · On-Hit = lifesteal x eff + Wound chance
    const per = flurryStabMul(hitPow, st.thUltAgi, st.thFlurryDmgCut), eff = thiefOnHitEff(st), prevLs = this.lsMul
    let crits = 0, res = 0
    const n = thiefUltHitCount(st)
    const stab = (m: Mon, mul: number, i: number, sure: boolean, finisher = false) => {
      shadowSlashFx(this, m.spr, i) // เงาพริ้ว: a shadow cut per dart
      if (finisher) sfx.shadowFinisher()
      else sfx.shadowSlash(i, n)
      const wasForce = this.forceCrit
      if (sure) this.forceCrit = true
      if (eff > 0) this.lsMul = eff
      const dealt = this.strike(m, per * mul) // Q: scales with AGI
      this.lsMul = prevLs; this.forceCrit = wasForce
      if (dealt > 0 && this.lastCrit) {
        crits++
        const g = Math.min(st.thUltCritRes, KIT.thiefUltCritResCap - res) // thief_u3: Energy per crit, capped per cast
        if (g > 0 && this.job.resource === 'energy') { res += g; this.resGain(g) }
      }
      if (st.ultPoison > 0 && !m.dead) { this.addPoison(m, st.ultPoison) } // talent: มีดอาบพิษ / เงาหมอกลวงตา
      if (eff > 0 && dealt > 0 && !m.dead && this.s2?.id === 'th_wound' && Math.random() < eff) this.addWound(m, 1) // thief_u2 On-Hit
    }
    for (let i = 0; i < n; i++) { // talent: มีดรัว / คมมีดประสาน
      const t = this.alive(); if (!t.length) break
      const m = t[Phaser.Math.Between(0, t.length - 1)]
      this.heroSpr.setAlpha(0.4)
      await this.lunge(m, () => stab(m, 1, i, false), false, true)
    }
    const fin = thiefUltFinisher(st, crits) // th_t3a / thief_u4 ★: one closing stab at the lowest-HP share
    const last = this.alive().sort((a, b) => a.hp / Math.max(1, a.def.hp) - b.hp / Math.max(1, b.def.hp))[0]
    if (fin.mul > 0 && last) {
      this.floatText(last.spr.x, last.spr.y - last.spr.displayHeight - 40, '🗡️ ทีปิด!', '#c9b8ff')
      await this.lunge(last, () => stab(last, fin.mul, n, fin.sure, true), false, true)
    }
    this.stayIn = false
    this.heroSpr.setAlpha(this.shadowTurns > 0 ? 0.75 : 1) // keep the ร่างเงา look
    await this.goHome()
  }

  /** `pow` = damage power (with ultAmp) · `bpow` = barrier power (0 = no barrier). */
  private async mageUlt(el: Element, pow: number, bpow: number) {
    const live = this.front()
    const col = el === 'lightning' ? 0xbfe6ff : el === 'fire' ? 0xff8c42 : el === 'ice' ? 0x9fe3ff : 0xc9a8ff
    const txt = el === 'lightning' ? '#bfe6ff' : el === 'fire' ? '#ff8c42' : el === 'ice' ? '#9fe3ff' : '#c9a8ff'
    this.floatText(HERO_X, GROUND - 150, `${ELEMENTS[el].icon} ${ELEMENTS[el].name}`, txt)
    if (el === 'lightning') {
      this.cameras.main.flash(140, 200, 230, 255)
      playPfx(this, 'thunderclap', 700, GROUND, { scale: 1.5, speed: 1.4 })
    } else if (el === 'fire') {
      playPfx(this, 'fireTornado', 700, GROUND, { scale: 1.5, speed: 1.3 })
      const orb = this.add.circle(W - 60, 40, 30, col).setDepth(9000)
      await this.tween({ targets: orb, x: 700, y: GROUND - 30, duration: 380, ease: 'Quad.easeIn' })
      orb.destroy()
    } else if (el === 'ice') {
      playPfx(this, 'frostNova', 700, GROUND, { scale: 1.5, speed: 1.3 })
      const orb = this.add.circle(W - 60, 40, 30, col).setDepth(9000)
      await this.tween({ targets: orb, x: 700, y: GROUND - 30, duration: 380, ease: 'Quad.easeIn' })
      orb.destroy()
    } else {
      playPfx(this, 'starFall', 700, GROUND, { scale: 1.5, speed: 1.3 })
      const orb = this.add.circle(W - 60, 40, 30, col).setDepth(9000)
      await this.tween({ targets: orb, x: 700, y: GROUND - 30, duration: 380, ease: 'Quad.easeIn' })
      orb.destroy()
    }
    this.shake(260, 0.016)
    this.burst(700, GROUND - 20, col, 36, 400)
    let froze = false
    if (el === 'lightning') await this.lightningStorm(pow, txt) // single target, many hits (Q 2026-11-03)
    for (const m of el === 'lightning' ? [] : live) {
      if (el === 'fire') {
        playPfx(this, 'fireball', m.spr.x, m.spr.y - m.spr.displayHeight * 0.4, { scale: 1.3, speed: 1.6 })
        this.strike(m, KIT.mageFire * pow, true, txt)
        if (!m.dead && this.relic === 'hellfire') { m.hell += KIT.mageFireStacks + this.st.mgFireStack; this.dotIcon(m) } // Hellfire: no cap, never expires
        else if (!m.dead) { m.burnStacks = Math.min(this.burnMax(), m.burnStacks + KIT.mageFireStacks + this.st.mgFireStack); m.burnStackTurns = 3; this.dotIcon(m) }
      } else if (el === 'ice') {
        playPfx(this, 'iceLance', m.spr.x, m.spr.y - m.spr.displayHeight * 0.4, { scale: 1.3, speed: 1.5 })
        this.strike(m, KIT.mageIce * pow, true, txt)
        if (m.dead) continue
        if (m.chill > 0 && m.def.ai !== 'boss') { m.frozen = true; froze = true; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 20, 'แช่แข็ง!', '#9fe3ff') }
        m.chill = KIT.mageIceChill + this.st.chillPlus; m.gauge -= 25; if (!m.charging) m.spr.setTint(0x9fe3ff); this.dotIcon(m)
      } else {
        playPfx(this, 'arcaneBeam', m.spr.x - 30, GROUND, { scale: 1.2, speed: 1.6 })
        this.strike(m, KIT.mageFire * pow, true, txt)
      }
    }
    if (froze && this.st.shatter > 0) { // tree ice ★ "ผลึกแตก"
      this.callout('❄️ ผลึกแตก!', W / 2, 170)
      playPfx(this, 'iceSpikes', 700, GROUND, { scale: 1.3, speed: 1.5 })
      for (const m of this.alive()) this.strike(m, m.frozen ? 1.5 : 0.75, true, '#9fe3ff')
    }
    if (bpow > 0) this.addShield(this.st.matk * (MAGE_SPELL.barrier + (el === 'ice' ? this.st.iceBarrier : 0)) * bpow * (1 - this.st.mgBarrierCut))
    await this.wait(300)
  }

  /** One lightning hit (ult, Bolt): storm set ramp, ประจุสะสม, and the tree fork on lightning runs. */
  private zap(m: Mon, mul: number, txt = '#bfe6ff', fork = true) {
    const proc = this.src === 'zap' // card lightning (not the Mage ult)
    const superHit = proc && fork && this.relic === 'superbolt' && Math.random() < RELIC_RULES.superbolt.chance
    if (proc) {
      playPfx(this, 'zapYellow', m.spr.x + Phaser.Math.Between(-8, 8), GROUND, { scale: superHit ? 1.45 : 1.2, speed: 1.9, flip: Math.random() < 0.5 })
    }
    const n = this.zapTurn.get(m) ?? 0
    this.zapTurn.set(m, n + 1)
    if (this.st.stormSet > 0) mul *= 1 + 0.1 * n
    this.zapCount++
    const every = this.pk.zapCharge || (this.st.boltCharge > 0 ? 10 : 0) // legend ประจุสะสม
    const charged = every > 0 && this.zapCount % every === 0
    if (charged) { mul *= 3; m.gauge -= 15; this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '🔋 ประจุ!', txt) }
    if (superHit) { // mythic อสนีเทพ
      mul *= RELIC_RULES.superbolt.mul
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 46, '⚡ อสนีเทพ!', '#fff07a')
      for (const o of this.alive().filter((x) => x !== m).slice(0, 2)) {
        playPfx(this, 'zapYellow', o.spr.x + Phaser.Math.Between(-8, 8), GROUND, { scale: 1.05, speed: 1.9, flip: Math.random() < 0.5 })
        this.strike(o, RELIC_RULES.superbolt.splash, true, txt)
      }
    }
    const dealt = this.withLightning(() => this.strike(m, mul, true, txt))
    if (proc && fork && this.pk.chain > 0 && Math.random() < this.pk.chain) { // legend ฟ้าแตกแขนง: never chains again
      const l = this.alive(); if (l.length) this.zap(l[Phaser.Math.Between(0, l.length - 1)], mul, txt, false)
    } else if (fork && this.element === 'lightning' && this.st.lightChain > 0 && Math.random() < this.st.lightChain) { // tree "ฟ้าแตกแขนง": never chains again
      const l = this.alive(); if (l.length) {
        const tgt = l[Phaser.Math.Between(0, l.length - 1)]
        playPfx(this, 'zapBolt', tgt.spr.x + Phaser.Math.Between(-8, 8), GROUND, { scale: 1.15, speed: 1.9, flip: Math.random() < 0.5 })
        this.zap(tgt, mul, txt, false)
      }
    }
    return dealt
  }

  /** Mage lightning ult: 6+ hits on one target (boss, else highest HP), 0.3–1.2x each; leftovers jump if it dies. */
  private async lightningStorm(pow: number, txt: string) {
    const pick = () => this.bossTarget() ?? this.alive().sort((x, y) => y.hp - x.hp)[0]
    this.zapTurn.clear()
    let t = pick()
    const hits = KIT.mageLightHits + this.st.lightHits
    for (let i = 0; i < hits; i++) {
      if (!t || t.dead) { const l = this.alive(); if (!l.length) break; t = l[Phaser.Math.Between(0, l.length - 1)] }
      let r = Phaser.Math.FloatBetween(KIT.mageLightLo, KIT.mageLightHi)
      if (this.st.lightLuck > 0) r = Math.max(r, Phaser.Math.FloatBetween(KIT.mageLightLo, KIT.mageLightHi)) // tree ★ ฟ้าลิขิต
      playPfx(this, i === 0 ? 'lightningStrike' : 'zapBolt', t.spr.x, GROUND, { scale: 1.2, speed: i === 0 ? 1.8 : 1.4, flip: i % 2 === 1 })
      this.zap(t, r * pow, txt)
      if (r >= 1 && this.st.overload > 0 && this.job.resource === 'mana') this.res = Math.min(this.resMax(), this.res + this.st.overload)
      await this.wait(70)
    }
  }

  private addShield(n: number, quiet = false) {
    if (this.job.id === 'cleric') this.syncShieldLayers() // book older shield before the new layer
    const prev = this.shield
    this.shield += shieldGain(this.shield, Math.round(n * (1 + this.st.shieldAmp) * shieldCutMul(this.st.thDefShieldCut)), Math.round(this.st.maxHp * BATTLE.shieldCap)) // Q 2026-11-08: cap + diminishing for every job (Priest's own 50% cap follows)
    if (this.job.id === 'cleric') this.syncShieldLayers() // new layer (shieldTurns) + 50% max HP cap
    if (this.shield > prev) this.notifyShieldOrBlockBiome()
    if (!quiet) this.floatText(HERO_X, GROUND - 100, `🛡️ โล่ ${Math.round(this.shield)}`, '#9fe3ff')
  }

  /** RO-style crit: physical only, uses max ATK (no low roll) x critMul (base 1.4 + crit-damage bonuses). Caller still applies DEF on a crit (Q 2026-11-19). */
  private roll(mul = 1, magic = false, crit = Math.random() < this.critRateFor(magic, 0), critDmgAdd = 0) { // crit split: CRIT_RULES via critRateFor
    const hb = hitBase(this.st, magic) // data/skill-math.ts: the one place the hit base (and the coming 70/30 magic rule) lives
    const base = (crit ? hb.hi : Phaser.Math.FloatBetween(hb.lo, hb.hi)) * (this.berserking() ? 1.4 : 1) * this.atkMul()
    return { dmg: Math.max(1, Math.round(base * mul * (crit ? scaleCritMul(this.st.critMul + critDmgAdd + (this.buf.hawk > 0 && this.st.s2Star ? S2N.hawkCritDmg : 0) + (this.zenTurns > 0 ? FOCUS_RULES.zenCritDmg : 0), this.critPow()) : 1))), crit } // Skill 2 ★ เล็งจุดตาย · v78 Zen · Skyhunter / Falcon Crit
  }

  /** Monster P.DEF (stat spec v1 formula). Magic skips this. */
  private armor(m: Mon, dmg: number, pierce = 0) {
    if (!m.def.def) return dmg
    const sunder = (m.sunderTurns ?? 0) > 0 ? Math.max(0, 1 - (m.sunder ?? 0)) : 1
    const effDef = m.def.def * Math.max(0, 1 - Math.min(1, pierce)) * Math.max(0, 1 - this.st.physPen) * sunder
    return Math.max(1, Math.round(afterDef(dmg, effDef)))
  }

  private async smash() {
    this.smashCdLeft = this.smashTurns()
    sfx.slam()
    await this.tween({ targets: this.heroSpr, x: HERO_X + 140, y: GROUND - 90, duration: 220, ease: 'Quad.easeOut' })
    await this.tween({ targets: this.heroSpr, y: GROUND, duration: 140, ease: 'Quad.easeIn' })
    this.shake(260, 0.014)
    const ring = this.add.ellipse(HERO_X + 140, GROUND, 40, 14).setStrokeStyle(8, COLORS.gold).setDepth(9000)
    this.tweens.add({ targets: ring, width: 900, height: 120, alpha: 0, duration: 380, onComplete: () => ring.destroy() })
    this.burst(HERO_X + 140, GROUND, COLORS.gold, 26, 360)
    for (const m of this.alive()) {
      if (Math.random() > hitChance(this.st.hit, m.def.flee ?? 5)) {
        this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 6, 'MISS', '#a9a6c7')
        continue
      }
      const r = this.roll(this.st.smashMul * (1 + this.st.pskill))
      this.damageMon(m, this.armor(m, r.dmg, this.st.ultPierce), true) // v78 บดกระดูก pierce · crits face DEF too (Q 2026-11-19)
      if (!m.dead) { m.gauge = Math.max(0, m.gauge - 40); this.tweens.add({ targets: m.spr, x: m.spr.x + 30, duration: 90, yoyo: true }) }
    }
    await this.wait(250)
    await this.tween({ targets: this.heroSpr, x: HERO_X, duration: 200 })
  }

  /** dot = damage over time / reflected damage: no executioner bonus and never reflected back. skipB5 = poison tick already applied PA to flat portion only. pure = B6 echo (skips B1-B5 amps and monster shield). */
  private damageMon(m: Mon, dmg: number, crit: boolean, color?: string, dot = false, skipB5 = false, pure = false) {
    if (m.dead) return
    if (!pure) {
      dmg = Math.ceil(dmg * this.srcMul(m, dot)) // พร v2 tags (masteries, style switches) · whole numbers only (Q: round up), so shown == applied
      if (this.src === 'poison' && !skipB5 && !this.debtBursting) { // P2'd B5 Poison power: Perfect Agony + vsPoison (Contaminate), one cap thiefAgonyCap
        const pa = paApplies(crit, this.debtBursting) ? agonyBonus(this.st.critMul, this.st.thPerfectAgony) : 0
        const vp = !dot && m.poison > 0 ? this.px('vsPoison') : 0
        const b5 = poisonPowerBonus(pa, vp)
        if (b5 > 0) dmg = Math.ceil(dmg * (1 + b5))
      }
      if (this.biomeState && !dot && m.instanceId) {
        const bHit = onMonsterHitBiome(this.biomeState, m.instanceId, dmg, 1)
        dmg = bHit.finalDamage
        if (bHit.justBroken) this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 28, '🌑 เกราะจันทราแตก! (Stagger)', '#ffd08a')
      }
      if (m.charging && !dot && m.def.chargeCounter === 'multi_hit_break') {
        m.chargeHits = (m.chargeHits ?? 0) + 1
        if (m.chargeHits >= 3) {
          this.endMonCast(m, { text: `💥 ทะลวงร่าย ${m.def.name}!`, color: '#ff9a3c' }, 30)
        }
      }
      if ((m.marked ?? 0) > 0) dmg = Math.ceil(dmg * 1.15) // cleric ★B: ตราบาป
      if (!dot && m.huntMark > 0) { const mk = Math.max(this.st.arMark, this.j2?.id === 'beastmaster' ? preyMarkOf(this.st) : 0); if (mk > 0) dmg = Math.ceil(dmg * (1 + mk)) } // v82 archer หมายหัว · 🏷️ Beastmaster Prey Mark (hits only)
      if (this.st.lateDmg > 0 && this.fightTurns >= 12) dmg = Math.ceil(dmg * (1 + this.st.lateDmg)) // cleric talent: อรุณรุ่ง
      const taken = this.takenAmpOf(m, dot); if (taken > 0) dmg = Math.ceil(dmg * (1 + taken)) // P2'b B1 Taken (R4.6): Exposed + Privileged + gear กัดกร่อน, added under KIT.thiefTakenCap
      if (!dot && this.relic === 'executioner' && m.hp < m.def.hp * RELIC_RULES.executioner.below) dmg = Math.ceil(dmg * (1 + RELIC_RULES.executioner.mul))
    }
    if (this.maidenLinked(m) && dmg > 0) { // Q 2026-11-21: no immortality · BATTLE.maiden.share of the hit goes to the Maiden instead
      const { toMaiden, toBoss } = maidenSplit(dmg, BATTLE.maiden.share)
      if (toMaiden > 0) this.damageMon(m.maiden!, toMaiden, crit, '#e0a8ff', true, false, true) // already amplified here: pure, never reflected
      dmg = toBoss
      if (dmg <= 0) return
    }
    if ((m.parry || m.espadaArmed) && dmg > 0) { // duelist: Riposte stance / Grandado Espada mark turn = immortal
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 6, m.parry ? 'ปัด!' : 'อมตะ!', '#c9e0ff')
      if (m.parry && !dot && !pure && this.hp > 0) this.riposteHit(m, dmg)
      return
    }
    if (!dot && !pure && m.reflect > 0 && dmg > 0 && this.hp > 0 && !this.isBroken(m)) this.reflectHurt(m, dmg * m.reflect) // ⛓️ Break: passives off
    if (!dot && !pure && m.absorb > 0 && dmg > 0 && !this.isBroken(m)) { m.stored += dmg * m.absorb; this.dotIcon(m) } // Mirage: stores it for the Soul Strike
    if (!pure && m.shield > 0) { // monster shield (turtle wall, ice armor, bone shield) soaks first · PoE Passive S3 shield pierce
      const shPierce = s3ShieldPierceOf(this.inS3, this.src, dot, this.st.thS3ShieldPierce)
      const soak = fangSoak(m.shield, dmg, shPierce, !this.allyHitting && this.s4On() ? KIT2.knight.s4.fang : 0, pure) // 🐍 เขี้ยวงู (Skill 4 passive)
      if (soak.absorbed > 0) {
        m.shield = soak.remShield; dmg = soak.remDmg
        this.floatText(m.spr.x + 30, m.spr.y - m.spr.displayHeight - 20, `🛡️-${Math.round(soak.absorbed)}`, '#9fe3ff')
        if (m.shield <= 0) { m.shield = 0; this.dotIcon(m) }
        if (dmg <= 0) return
      }
    }
    const hp0 = m.hp
    m.hp = maidenHpFloor(m.hp - dmg, this.maidenLinked(m)) // Karvos cannot die before her Maiden
    if (!dot && !pure && !this.allyHitting && m.hp > 0 && this.isSkillHit() && !this.inUltWindow()) { // 🧬 เพลิงทรมาน (Liandry): skill hit -> % Max HP burn
      const sb = this.itemEffect('skill_burn')
      if (sb) {
        const per = Math.max(1, Math.round(Math.min(m.def.hp * sb.power * (m.def.ai === 'boss' ? COMBINE_FX.bossMul : 1), Math.max(this.st.atk, this.st.matk) * (sb.threshold ?? COMBINE_FX.burnCap))))
        m.burn = Math.max(m.burnTurns > 0 ? m.burn : 0, per); m.burnTurns = Math.max(m.burnTurns, COMBINE_FX.burnTurns); this.dotIcon(m)
      }
    }
    if (!dot && !pure && !this.allyHitting && !this.cleaving && (this.src === 'basic' || this.src === 'combo') && dmg > 0 && !this.inUltWindow()) { // 🧬 ฟันกวาด (Battle Fury)
      const cv = this.itemEffect('cleave'), others = cv ? this.alive().filter((o) => o !== m) : []
      if (cv && others.length) {
        this.cleaving = true
        try { for (const o of others) this.damageMon(o, Math.max(1, Math.round(dmg * cv.power)), false, '#c9e0ff', false, false, true) } finally { this.cleaving = false }
      }
    }
    if (!dot && !pure) this.monCastBreak(m, dmg) // Q 2026-11-20: a hard direct hit may break a boss cast (hero + ally hits; DoT / reflect / echo never)
    if (shouldRecordDeathMark({ dot, pure, allyHitting: this.allyHitting, popping: this.deathMarkPopping, mobExecuting: this.mobExecuting, markTurns: m.deathMark ?? 0, ratio: this.st.thDeathMark })) {
      const net = deathMarkNetHpDmg(hp0, m.hp)
      if (net > 0) m.deathMarkDmg = (m.deathMarkDmg ?? 0) + net
    }
    const swBrk = swordS3BreakTurns(this.inS3, this.src, dot, this.st.swS3ArmorBreak)
    if (swBrk > 0 && !pure && !this.allyHitting && !m.dead && m.hp > 0 && this.job.id === 'swordsman') {
      m.armorBrk = Math.max(m.armorBrk, swBrk)
      this.dotIcon(m)
    }
    if (!m.dead && m.hp > 0 && !dot && !pure && this.hp > 0) {
      const ex = this.itemEffect('execute_cull')
      if (ex && !this.maidenLinked(m)) {
        const baseThresh = ex.threshold ?? 0.12
        const thresh = m.def.ai === 'boss' ? baseThresh * 0.5 : baseThresh
        if (m.hp / m.def.hp <= thresh) {
          m.hp = 0; m.shield = 0
          this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '☠️ ประหารชีวิต!', '#ff4d6d')
        }
      }
    }
    if (!dot && dmg > 0 && this.inHeroTurn) {
      this.turnHitsCur++
      this.turnDmgCur += dmg
      this.turnHitsTotal++
      this.turnHitsPeak = Math.max(this.turnHitsPeak, this.turnHitsCur)
      this.popTurnCombo(this.turnHitsCur, this.turnDmgCur)
    }
    if (this.ignorePainTurns > 0 && !dot) this.ignorePainDmg += dmg
    this.damageNumber(m.spr.x, m.spr.y - m.spr.displayHeight, dmg, crit, color)
    if (this.comboSum.on && !dot) { const e = this.comboSum.per.get(m) ?? { dmg: 0, hits: 0, x: 0, y: 0 }; e.dmg += dmg; e.hits++; e.x = m.spr.x; e.y = m.spr.y - m.spr.displayHeight; this.comboSum.per.set(m, e) }
    if (crit && !dot) this.critJuice(m)
    else if (this.comboLevel >= 2 && !dot) { this.hitStop(20 + 12 * this.comboLevel); this.shake(60, 0.002 + 0.0015 * this.comboLevel) }
    m.spr.setTintFill(0xffffff)
    this.time.delayedCall(80, () => m.spr.active && m.spr.clearTint())
    if (this.relic === 'harvest' && m.def.ai === 'boss' && m.hp > 0) {
      const steps = Math.floor((1 - m.hp / m.def.hp) / RELIC_RULES.harvest.bossStep)
      while (m.harvestMark < steps) { m.harvestMark++; this.harvestSoul() }
    }
    if (m.def.mini === 'drainer' && !m.maidenDone && m.hp > 0 && m.hp < m.def.hp * BATTLE.maiden.at) this.summonMaiden(m)
    if (!m.dead && (m.deathMark ?? 0) > 0) {
      if (m.hp <= 0) {
        m.deathMark = 0; m.deathMarkDmg = 0
      } else if (deathMarkEarlyPop(m.hp, m.def.hp, m.deathMark!, m.deathMarkDmg ?? 0, KIT.thiefDeathMarkAt)) {
        this.popDeathMark(m)
      }
    }
    if (!m.dead && m.hp <= 0) this.killMon(m)
    else if (!m.dead) while (m.def.phases && m.phase < m.def.phases.length && m.hp < m.def.hp * m.def.phases[m.phase].at) this.enterPhase(m, m.def.phases[m.phase++])
  }

  /** Equipment card drop (design/equipment-cards.md): base rate x LUK, guaranteed after `pity` kills of that monster. */
  /** v125 tower / rift: a kind rebuilt below its home Lv (a D13 monster on floor 1) pays EXP / zeny x Lv / homeLv, and drops no card
   *  and none of its own dungeon's mats (the theme's instead). 1 everywhere else. */
  private endlessPay(m: Mon): number {
    if (this.run.modeId !== 'tower' && !this.run.riftMode) return 1
    const home = homeLv(m.kind)
    return home > 0 && m.def.lv ? Math.min(1, m.def.lv / home) : 1
  }
  private rollCard(m: Mon) {
    if (m.revived || this.endlessPay(m) < 1) return
    const pity = (save().cardPity ??= {})
    for (const cd of cardsOfMonster(m.kind)) {
      const n = (pity[cd.id] ?? 0) + 1
      if (Math.random() < cardRate(cd) * this.cardLuck * (this.hell && monTier(m.def) !== 'normal' ? HELL_MODE.bossCardMul : 1) || n >= cardPityMax(cd)) {
        pity[cd.id] = 0
        this.runCards.push(cd.id)
        this.callout(`🃏 ได้${cardName(cd)}!`, m.spr.x, m.spr.y - 130 - (cd.v2 ? 40 : 0))
        sfx.coin()
      } else pity[cd.id] = n
    }
  }

  /** Forge materials (design/item-acquisition-v1.md): this dungeon's common one from normal monsters, its boss one from minis / bosses. Summons (no card) drop nothing. */
  private rollMat(m: Mon) {
    if (m.revived || !cardsOfMonster(m.kind).length) return
    const echoHome = this.roomDef(this.room)?.echo ? homeDungeon(m.kind) : undefined // ☀️ Q 2026-11-18: a monster from an earlier dungeon drops that dungeon's mats
    const dg = echoHome || (this.run.modeId === 'tower' && deepKind(m.kind) && this.endlessPay(m) >= 1 && homeDungeon(m.kind)) || this.dg.id, got: [string, number][] = [] // v114: a D6+ monster in the tower drops its own dungeon's mats
    if (m.def.ai === 'boss' && !m.def.mini) {
      got.push([matOf(dg, true), MAT_RULES.boss.boss], [matOf(dg, false), MAT_RULES.boss.common])
      if ((this.run.modeId === 'dungeon' || this.run.modeId === 'hard' || this.run.modeId === 'bounty') && this.roomDef(this.room)?.boss && taintDrop(dg)) got.push([TAINT_MAT, taintDrop(dg) + (this.hell ? HELL_MODE.taintAdd : 0)]) // v89 ผลึกโลกันตร์: D6+ final boss only
    }
    else if (m.def.ai === 'boss') got.push([matOf(dg, true), MAT_RULES.mini.boss])
    else if (Math.random() < MAT_RULES.normalRate) got.push([matOf(dg, false), 1])
    got.forEach(([id, n], i) => {
      this.runMats[id] = (this.runMats[id] ?? 0) + n
      this.floatText(m.spr.x + 40, m.spr.y - 40 - i * 24, `${matName(id)} +${n}`, '#e8d9a8')
    })
  }

  /** v88 unique item (design/unique-taint-tower-skip-v1.md §2): only the final boss of a dungeon / hard run can drop one.
   * A duplicate (already owned, or already dropped this run) pays that dungeon's boss materials instead. Never zeny. */
  private rollUnique(m: Mon) {
    if ((this.run.modeId !== 'dungeon' && this.run.modeId !== 'hard' && this.run.modeId !== 'bounty' && this.run.modeId !== 'rift') || m.revived || m.def.ai !== 'boss' || m.def.mini || !cardsOfMonster(m.kind).length || !this.roomDef(this.room)?.boss) return
    const s = save(), j3 = activeJob3(s)
    const ownedAll = [...s.owned, ...this.runUniques]
    const egSource = this.run.modeId === 'rift' ? 'rift' : this.dg.id
    let got = rollEndgameUniqueDrop(egSource, j3, this.hell ? 'hell' : this.hard, ownedAll)
    if (got.kind === 'none' && this.dg.id === 'd10' && j3) {
      got = rollUnique3Drop(j3, this.hell ? 'hell' : this.hard, ownedAll)
    }
    if (got.kind === 'none' && this.run.modeId !== 'rift') {
      got = rollUniqueDrop(this.dg.id, this.hell ? 'hell' : this.hard, ownedAll)
    }
    if (got.kind === 'none') return
    const it = itemById(got.id)
    if (got.kind === 'new') this.runUniques.push(got.id)
    else for (const [id, n] of Object.entries(got.mats)) this.runDupeMats[id] = (this.runDupeMats[id] ?? 0) + n
    this.callout(got.kind === 'new' ? `💎 ของยูนีค! ${it.icon} ${it.name}` : `💎 ${it.icon} ${it.name} (ซ้ำ → วัตถุดิบ)`, m.spr.x, m.spr.y - 170, '#ffd86b')
    sfx.win()
  }

  private killMon(m: Mon) {
    if (this.maidenLinked(m)) { m.hp = maidenHpFloor(m.hp, true); return } // any direct kill (execute, blasts) waits for the Maiden
    m.dead = true
    m.deathMark = 0; m.deathMarkDmg = 0
    m.castSteady = false; m.castSkill = undefined; this.monCastFx(m, false) // a cast dies with its caster
    this.syncStackBody() // P2'b th_t1c: a dead monster's stacks no longer count
    if (this.st.killHeal > 0 && this.hp > 0) {
      this.heal(this.st.maxHp * this.st.killHeal) // gear / card / Mobster kill heal
      if (this.job.resource === 'energy') this.resGain(KIT.thiefKillRes)
    }
    if (this.st.thKillLeech > 0 && this.hp > 0) { // P2'a thief_c3 กระหายเลือด: + poison left on the corpse
      this.heal(this.st.maxHp * thiefKillHeal(this.st, m.poison))
      if (this.job.resource === 'energy') this.resGain(KIT.thiefKillRes)
    }
    if (this.st.lockOn > 0 && this.lockTarget === m && this.dodgeCharges < 1) { this.dodgeCharges = 1; this.floatText(HERO_X, GROUND - 100, '💨 ถอยตั้งหลัก', '#c9c9d6') } // archer ★ ล็อกเป้า: kill the locked target -> 1 sure dodge
    const others = this.alive()
    if (this.st.fireSpread > 0 && m.burnStacks > 0) {
      for (const o of others) { o.burnStacks = Math.min(this.burnMax(), o.burnStacks + Math.ceil(m.burnStacks / 2)); o.burnStackTurns = 3; this.dotIcon(o) } // tree
      this.resGain(MAGE_PASSIVE.ablaze.manaGain)
    }
    if (this.st.poisonSpread > 0 && m.poison > 0 && !this.debtBursting) { // 💣 ระเบิดพิษ (KIT.poison.spreadShare / spreadBurst): pass the stacks on, then blast them (kills can chain)
      const P = KIT.poison, pass = Math.ceil(m.poison * P.spreadShare), blast = Math.round(m.poison * m.poisonDmg * P.spreadBurst * this.dotMul())
      const live = others.filter((o) => !o.dead)
      if (live.length) { sfx.poisonSpread(); this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '💣 ระเบิดพิษ!', '#b48aff') }
      for (const o of live) { if (pass > 0) { o.poison = Math.min(this.poisonMax(), o.poison + pass); o.poisonDmg = Math.max(o.poisonDmg, m.poisonDmg); this.dotIcon(o) } }
      if (blast > 0) for (const o of live) if (!o.dead) this.withSrc('poison', () => this.damageMon(o, blast, false, '#b48aff', true))
    }
    this.archerKill(m, others)
    if (this.st.j2BannerKill > 0 && this.hp > 0) { // Knight ธงชัย: shield + gauge + res on kill
      const T = KIT2.knight.tree
      this.addShield(this.st.maxHp * this.st.j2BannerKill, true)
      this.heroGauge = Math.min(100, this.heroGauge + T.bannerKillGauge)
      this.resGain(T.bannerKillRes)
      this.floatText(HERO_X, GROUND - 135, '🎖️ ธงชัย!', '#f2d24b')
    }
    if (this.j2?.id === 'rogue' && !this.voracityKillUsed && this.hp > 0 && (this.knifeHitting || m.dagger > 0)) this.killReset() // P3'a 🔪 Kill Reset (1 per hero turn)
    this.kills++
    void this.procs('kill', m) // พร v2: on-kill cards
    if (this.relic === 'glass' && this.hp > 0) this.heal(this.st.maxHp * RELIC_RULES.glass.killHeal, true) // mythic แก้วร้าว
    if (this.relic === 'harvest') this.harvestSoul()
    if (this.relic === 'executioner' && this.smashCdLeft > 0) { this.smashCdLeft = Math.max(0, this.smashCdLeft - RELIC_RULES.executioner.cd); this.floatText(HERO_X, GROUND - 150, '🪓 ท่าไม้ตายเร็วขึ้น', '#f2b84b') }
    if (m.def.deathBlast && this.hp > 0) { // bloater / imp / mirror shard: blows up when it dies
      this.callout(`💥 ${m.def.name}ระเบิด!`, m.spr.x, m.spr.y - 120)
      this.burst(m.spr.x, m.spr.y - 20, 0xffb347, 22, 300)
      this.shake(180, 0.012)
      sfx.slam()
      this.hurtHero(m.def.dmg * BATTLE.monDmgMul * m.def.deathBlast, true, m.def.hit ?? 15, undefined, `💥 ระเบิดตาย (${m.def.name})`)
    }
    if (this.aff.split > 0 && !m.clone && !m.summoned && m.def.ai !== 'boss' && this.hp > 0) { // tower affix แยกร่าง
      const sl = this.freeSlots().find((x) => x !== m.slot) ?? this.freeSlots()[0]
      if (sl != null) { // right away, so the fight can't end before the copy arrives; the copy drops nothing (revived)
        const c = this.addMon(m.kind, sl, 0), hp = Math.max(1, Math.round(c.def.hp * this.aff.split))
        c.clone = true; c.revived = true; c.def = { ...c.def, hp }; c.hp = hp; c.spr.setAlpha(0.75)
        this.callout(`🧬 ${m.def.name}แยกร่าง!`, SLOT_X[sl] ?? W / 2, GROUND - 140)
      }
    }
    const pay = this.endlessPay(m), xp = Math.max(1, Math.round(m.def.xp * pay))
    this.runXp += xp
    this.gainXp(xp)
    const [a, b] = m.def.zeny
    this.coinsFly(m.spr.x, m.spr.y, Math.round(Phaser.Math.Between(a, b) * pay * (1 + this.zenyWave)), true) // Innovator 🧲 แม่เหล็ก
    this.rollCard(m)
    this.rollMat(m)
    this.rollUnique(m)
    if (Math.random() < this.st.dropChance) { this.runGems++; this.floatText(m.spr.x, m.spr.y - 80, '💎 ของหายาก!', '#7fd7ff'); sfx.coin() }
    sfx.pop()
    m.dotTxt?.destroy(); m.dotTxt = undefined
    this.tweens.add({ targets: [m.spr, m.shadow], alpha: 0, duration: 260, onComplete: () => this.removeMon(m) })
    this.tweens.add({ targets: m.spr, scaleY: 0.2, duration: 260 })
    // close ranks: survivors step forward
    this.time.delayedCall(280, () => {
      this.alive().sort((x, y) => x.slot - y.slot).forEach((x, i) => {
        if (x.def.ai === 'boss') return
        if (SLOT_X[i] === undefined || !x.spr?.active) return // a summon past the last slot: stay put (undefined x crashed the tween)
        x.slot = i
        this.tweens.add({ targets: [x.spr, x.shadow], x: SLOT_X[i], duration: 260 })
      })
    })
  }

  // ---------- monster turn ----------
  private async monTurn(m: Mon) {
    this.monHitsThisTurn = 0
    m.turns++
    if (m.kit && m.heroKit) tickKit(m.kit, m.heroKit)
    if (m.mp) regenMana(m.mp)
    if (m.atkUpTurns > 0 && --m.atkUpTurns === 0) { m.atkUp = 0; this.dotIcon(m) }
    if (m.weakTurns > 0 && --m.weakTurns === 0) this.dotIcon(m)
    if ((m.tauntTurns ?? 0) > 0) m.tauntTurns!--
    if ((m.trueTurns ?? 0) > 0 && --m.trueTurns! === 0) this.dotIcon(m)
    if ((m.marked ?? 0) > 0) m.marked!--
    if (this.awakenTurns <= 0 && m.huntMark > 0 && --m.huntMark === 0) this.dotIcon(m)
    if (m.armorBrk > 0 && --m.armorBrk === 0) this.dotIcon(m)
    if (m.blind > 0 && --m.blind === 0) this.dotIcon(m)
    if (m.wet > 0 && --m.wet === 0) this.dotIcon(m)
    if (m.exposed > 0 && --m.exposed === 0) { m.exposedPct = 0; this.dotIcon(m) } // P2'b Exposed counts monster turns
    if (m.woundCutTurns > 0 && --m.woundCutTurns === 0) m.woundCut = 0 // P2'b Blade's End heal cut
    if (m.daggerTurns > 0 && --m.daggerTurns === 0) { m.dagger = 0; this.dotIcon(m) } // P3'a 🔪 ตราคมมีด
    if (m.stabMark > 0 && --m.stabMark === 0) this.dotIcon(m) // P3'a Backstab Mark
    if (m.strip > 0 && --m.strip === 0) this.dotIcon(m) // P3'a Strip Armor
    if ((m.disarm ?? 0) > 0 && --m.disarm! === 0) { m.disarmPct = 0; this.dotIcon(m) } // 🧤 ปลดอาวุธ: set to 2, so this whole turn is the weakened one
    if ((m.divestRes ?? 0) > 0) m.divestRes!--
    if ((m.snatchCd ?? 0) > 0) m.snatchCd!--
    if ((m.breakImmune ?? 0) > 0) m.breakImmune!--
    if (m.def.toxicSkin) { // Toxic Skin tenacity: debuffs on it wear off twice as fast (P2'b: never Wound / Exposed, design Rev 3 §2.4)
      if (m.chill > 0) m.chill--; if (m.burnTurns > 0) m.burnTurns--; if (m.burnStackTurns > 0) m.burnStackTurns--; if (m.poison > 0) m.poison--; if ((m.goreTurns ?? 0) > 0 && --m.goreTurns! === 0) { m.gore = 0; this.dotIcon(m) }
      if (m.weakTurns > 0 && --m.weakTurns === 0) this.dotIcon(m); if ((m.tauntTurns ?? 0) > 0) m.tauntTurns!--; if ((m.marked ?? 0) > 0) m.marked!--; if (this.awakenTurns <= 0 && m.huntMark > 0 && --m.huntMark === 0) this.dotIcon(m); if (m.armorBrk > 0 && --m.armorBrk === 0) this.dotIcon(m)
    }
    if (m.drainStats && !m.dead && this.hp > 0) this.deathRealm(m, m.drainStats)
    if (m.vengCd) m.vengCd--
    if (m.vengTurns && !m.dead) {
      const V = BATTLE.vengeance
      if (m.shield > 0 && this.hp > 0 && this.hurtHero(this.st.maxHp * V.dotPct + m.def.dmg * V.dotAtk, false, 999, undefined, `🖤 ความแค้นกัดกิน (${m.def.name})`)) this.floatText(HERO_X, GROUND - 150, '🖤 ความแค้นกัดกิน', '#c9a8ff')
      if (--m.vengTurns === 0) { m.shield = 0; m.vengCd = V.cd; this.dotIcon(m) }
    }
    // damage over time first
    if (m.burnTurns > 0) { m.burnTurns--; this.withSrc('fire', () => this.damageMon(m, Math.max(1, Math.round(m.burn * this.dotMul())), false, '#ff8c42', true)); if (!m.burnTurns) this.dotIcon(m) }
    if (!m.dead && (m.goreTurns ?? 0) > 0) { m.goreTurns!--; this.withSrc('other', () => this.damageMon(m, Math.max(1, Math.round((m.gore ?? 0) * this.dotMul())), false, '#ff5a5a', true)); if (!m.goreTurns) { m.gore = 0; this.dotIcon(m) } }
    if (!m.dead && m.poison > 0) {
      const bleedScale = 1 + this.st.j2BleedDmg
      const P = KIT.poison, hpBite = m.hp > m.def.hp * P.hpAbove ? m.poison * (m.def.hp * this.st.poisonHpPct + P.hpFlat) : 0 // 🩸 %HP bite while above 50%
      const hpBleed = this.st.j2WolfBleedPct > 0 ? Math.min(Math.round(m.poison * m.def.hp * this.st.j2WolfBleedPct), Math.round(KIT2.beastmaster.wolfBleedCap * this.st.atk)) : 0
      const pa = agonyBonus(this.st.critMul, this.st.thPerfectAgony)
      const tickDmg = poisonTickTotal(m.poison * m.poisonDmg * bleedScale, pa, hpBite, this.dotMul(), hpBleed) // PA multiplies flat poison only, never hpBite / hpBleed
      const hp0 = m.hp
      if (this.job.id === 'thief') sfx.poisonTick()
      this.withSrc('poison', () => this.damageMon(m, tickDmg, false, '#a77be0', true, true))
      if (this.st.thPoisonLeech > 0) {
        const net = hp0 - Math.max(0, m.hp)
        if (net > 0) this.leechHeal(net * this.st.thPoisonLeech)
      } else if (this.st.poisonLeech > 0) {
        this.withToxicHeal(() => this.heal(m.poison * m.poisonDmg * this.st.poisonLeech, true))
      }
      if (this.st.poisonSlow > 0 && !m.dead && m.poison >= slowAtLv(this.st.poisonSlow)) { m.chill = Math.max(m.chill, KIT.poison.slowTurns); this.dotIcon(m) } // 🐌 Thief พิษชา
    } // Thief เลือดพิษ · 🐺 IV talent % Max HP bleed
    if (!m.dead && m.burnStackTurns > 0) { // ไฟลุก: stacks x magic power (พร v2: 70% M.ATK + 30% P.ATK)
      m.burnStackTurns--
      this.withSrc('fire', () => this.damageMon(m, Math.max(1, Math.round(m.burnStacks * magicPower(this.st) * (0.12 + this.st.burnTick) * this.dotMul())), false, '#ff8c42', true))
      const ward = moltenWardGain(this.st.mgMolten, this.st.matk, this.st.maxHp, this.shield, this.mdPower.shield) // Mage passive 🔥 Flame Ward: burn ticks feed a shield (capped)
      if (ward > 0) { this.shield += ward; this.floatText(HERO_X, GROUND - 100, `🔥 เกราะเพลิง +${ward}`, '#ff8c42') }
      if (!m.burnStackTurns) m.burnStacks = 0
      this.dotIcon(m)
    }
    if (!m.dead && m.hell > 0) this.withSrc('fire', () => this.damageMon(m, Math.max(1, Math.round(hellEff(m.hell) * RELIC_RULES.hellfire.dmgPerStack * this.magicPow() * this.dotMul())), false, '#ff5a2a', true))
    if (!m.dead && m.def.mini === 'drainer' && !this.isBroken(m) && m.hp < m.def.hp * BATTLE.demonAt) this.healMon(m, m.def.hp * BATTLE.demonRegen, true)
    m.parry = false
    if (!m.dead && (m.duelHealTurns ?? 0) > 0) { m.duelHealTurns!--; this.healMon(m, m.duelHeal ?? 0) }
    if (!m.dead && (m.sunderTurns ?? 0) > 0) { if (--m.sunderTurns! <= 0) m.sunder = 0; this.dotIcon(m) }
    if (!m.dead && (m.markTurns ?? 0) > 0) { if (--m.markTurns! <= 0) this.clearMark(m); this.dotIcon(m) } // 🎓 🏷️ element mark fades
    if (!m.dead && m.chill > 0) { m.chill--; if (!m.chill && !m.charging) m.spr.clearTint(); this.dotIcon(m) }
    if (!m.dead && m.frozen) {
      if ((m.stunTurns ?? 0) > 0) m.stunTurns!--
      else m.frozen = false
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10, '❄️ แข็งอยู่', '#9fe3ff')
      await this.wait(250); return
    }
    if (m.dead) { await this.wait(200); return }
    if (m.def.passive) { this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10, '💨 วิ่งวน!', '#f2c94c'); await this.wait(200); return } // event เจลล็อปทองคำ
    if (this.allies.length && this.trapOnAct(m)) { // Innovator trap: goes off as it moves · snared / frozen = this turn is lost
      await this.wait(250)
      if (m.dead || !this.alive().length) return
      if (m.frozen) { m.frozen = false; await this.wait(150); return }
    }
    m.iced = m.ice > 0
    if (m.iced) { // Ice Age: weaker hits for N turns, freeze chance doubles every turn
      m.ice--
      const chance = m.iceChance * (m.def.ai === 'boss' ? RELIC_RULES.iceage.bossFreezeMul : 1)
      m.iceChance *= RELIC_RULES.iceage.freezeMul
      if (!m.ice) { m.spr.clearTint(); this.dotIcon(m) }
      if (Math.random() < chance) {
        this.freezeCount++
        m.spr.setTint(0x9fe3ff)
        this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10, `🧊 แช่แข็ง! (${Math.round(chance * 100)}%)`, '#9fe3ff')
        await this.wait(300); return
      }
    }
    if (m.def.mini === 'duelist' && await this.duelTurn(m)) return
    if (m.def.mini === 'gunner' && await this.bulletTime(m)) return

    const muted = (m.mSilence ?? 0) > 0 // ⚔️ ดาบสยบมนตร์: no skills / casts this turn
    if (muted) { m.mSilence!--; this.dotIcon(m) }
    if (!m.charging && !muted && await this.useSkill(m)) return

    if (m.def.ai === 'boss') {
      if (!m.summoned && m.def.summon && m.hp < m.def.hp / 2) {
        m.summoned = true
        this.callout(`${m.def.name}เรียกลูกน้อง!`, W / 2, 150)
        this.tweens.add({ targets: m.spr, scaleY: m.spr.scaleY * 1.2, duration: 150, yoyo: true })
        this.addMon(m.def.summon, 0, 0); this.addMon(m.def.summon, 1, 0) // adds start at gauge 0: one breath to react
        await this.wait(700)
        return
      }
      if (m.charging) { // the cast is released: the stored magic skill (Q 2026-11-21) or the old charged slam, same damage code
        const sk = m.castSkill, mul = monCastDmgMul(!!m.castSteady) // a steady cast (after a break) hits for MON_CAST.steadyDmg
        this.endMonCast(m)
        if (sk) await this.fireMonSkill(m, sk, mul)
        else await this.slam(m, mul)
        return
      }
      if (m.def.charge && m.turns % m.chargeEvery === 0 && !muted) { await this.startMonCast(m); return }
    }
    const home = m.spr.x
    await this.tween({ targets: [m.spr, m.shadow], x: HERO_X + 70, duration: BATTLE.stepMs * 0.35, ease: 'Quad.easeIn' })
    if (m.def.magic) this.burst(HERO_X, GROUND - 40, m.def.mini === 'drainer' ? 0xc03050 : 0xb48aff, 10, 140) // spores / dark bolt
    const shots = m.def.shots ?? 1
    for (let i = 0; i < shots && this.hp > 0 && !m.dead; i++) {
      if (this.riposte(m)) continue
      const cr = this.monCrit(m)
      const landed = this.hurtHero((m.def.magic ? this.monMatk(m) : m.def.dmg) * BATTLE.monDmgMul * this.monMul(m) * cr, !!m.def.magic, cr > 1 ? 999 : m.def.hit ?? 15, m, shots > 1 ? `โจมตี ${i + 1}/${shots}` : 'โจมตี')
      if (landed) { this.monLeech(m); this.razor(m); if (m.onHit && !this.isBroken(m)) this.applyFx(m.onHit, m); if (await this.procs('hurt', m) > 0) await this.wait(90); await this.tryCounter(m) }
      else if (this.hitOut === 'block' && this.st.swBlockCounter > 0) await this.tryCounter(m, true)
    }
    if (m.def.combo) { // v49 monster combo: chain extra hits like the hero (same cap)
      let extra = 0
      while (extra < BATTLE.comboMax && Math.random() < m.def.combo + (this.scent(m) ? BATTLE.scentCombo : 0) - this.st.ignoreCombo) extra++ // hero Ignore Combo (AGI / gear)
      for (let i = 0; i < extra && this.hp > 0 && !m.dead; i++) {
        this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10 - i * 22, `คอมโบ x${i + 2}!`, '#ffb070')
        this.tweens.add({ targets: m.spr, x: m.spr.x - 14, duration: 70, yoyo: true })
        await this.wait(160)
        const cr = this.monCrit(m)
        const landed = this.hurtHero((m.def.magic ? this.monMatk(m) : m.def.dmg) * BATTLE.monDmgMul * this.monMul(m) * BATTLE.monComboMul * (1 - this.st.comboDR) * cr, !!m.def.magic, cr > 1 ? 999 : m.def.hit ?? 15, m, 'คอมโบ')
        if (landed) { this.monLeech(m); this.razor(m) }
      }
    }
    await this.tween({ targets: [m.spr, m.shadow], x: home, duration: BATTLE.stepMs * 0.35, ease: 'Quad.easeOut' })
  }

  /** Counter: when a hit lands, sometimes strike back at the attacker right away (basic attack x counterMul).
   *  Q 2026-11-03: shown as an action: melee dashes into the attacker and knocks it back, ranged/magic fire point blank. */
  private async tryCounter(m: Mon, guaranteed = false) {
    if (this.hp <= 0 || m.dead) return
    if (!guaranteed) {
      if (this.ctrCharges > 0) this.ctrCharges-- // talent: ท่าสวนพร้อม (sure counter)
      else if (Math.random() >= this.counterChance() - this.monCombo(m).ignoreCounter) return // Capybara-style: rate - Ignore Counter
    }
    const s1CtrBoost = this.s1CtrDmgLeft > 0 && this.st.swS1CtrDmg > 0
    if (s1CtrBoost) this.s1CtrDmgLeft--
    if (this.ctrCharges === 0) this.s1CtrDmgLeft = 0
    this.counterCount++
    this.notifyShieldOrBlockBiome()
    void this.procs('counter', m) // พร v2: on-counter cards (spears)
    if (this.st.counterRage > 0) { this.gainRage(this.st.counterRage); this.gainRes(this.st.counterRage) } // talent: เหล็กกล้า (Rage or Mana)
    if (this.st.counterShield > 0) this.addShield(this.st.maxHp * this.st.counterShield, true)
    this.counterJuice()
    const magic = this.job.attack === 'magic' || this.st.holyCounter > 0 // tree: "ศรัทธาสวน"
    const hit = () => this.withSrc('counter', () => {
      this.forceCrit = this.st.j2CounterCrit > 0 && !magic // Knight ★ Counter Attack
      const s1Mul = s1CtrBoost ? 1 + this.st.swS1CtrDmg : 1
      const dmg = this.strike(m, BATTLE.counterMul * s1Mul * ((m.tauntTurns ?? 0) > 0 ? 1 + S2N.tauntCtrAmp : 1), magic, magic ? '#c9a8ff' : undefined)
      this.forceCrit = false
      if (this.st.j2Hindsight > 0 && dmg > 0) this.sageSpell(m, false, 1, true) // Sage ★ Hindsight
      if (this.st.ctrAoe > 0) for (const o of this.alive()) if (o !== m) this.strike(o, 0.5 * s1Mul * ((o.tauntTurns ?? 0) > 0 ? 1 + S2N.tauntCtrAmp : 1), magic) // tree: "สวนพายุ"
      this.guardBackHit(m)
      if (!m.dead && this.st.swCounterDefMul > 0) {
        const bonus = counterDefBonusDmg(this.st.def, this.st.swCounterDefMul)
        if (bonus > 0) {
          this.damageMon(m, bonus, false, '#ffd984')
          this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 48, `⚔️ เกราะสะท้อน +${bonus}`, '#ffd984')
        }
      }
    })
    if (this.job.attack !== 'melee') { await this.shoot(m, magic ? 0x9f7bff : 0xf6eedc, hit, this.job.id === 'archer' && !magic ? {} : undefined); return }
    // melee: wind back, dash in with an afterimage, knock the attacker back and chase it a little, then walk home
    const step = BATTLE.stepMs
    this.heroRig.playWindup(this.rigSpec.isKnightLine)
    await this.tween({ targets: this.heroSpr, x: HERO_X - 18, duration: step * 0.1, ease: 'Quad.easeOut' })
    this.afterimage(this.rigSpec.afterimageTint)
    sfx.dash()
    await this.tween({ targets: this.heroSpr, x: m.spr.x - 40, duration: step * 0.14, ease: 'Quad.easeIn' })
    this.heroRig.playStrike(2, this.rigSpec.isKnightLine)
    this.heroSlashFx(m.spr.x - 10, GROUND - 40, this.rigSpec.isKnightLine)
    sfx.swing()
    hit()
    this.shake(70, 0.005)
    if (!m.dead) this.tweens.add({ targets: [m.spr, m.shadow], x: m.spr.x + 110, duration: step * 0.25, ease: 'Quad.easeOut' })
    await this.tween({ targets: this.heroSpr, x: this.heroSpr.x + 50, duration: step * 0.15, ease: 'Quad.easeOut' })
    await this.tween({ targets: this.heroSpr, x: HERO_X, duration: step * 0.3, ease: 'Quad.easeOut' })
  }

  /** Q 2026-11-22 🛡️ ตั้งการ์ด: while guarding, a counter adds % of the dmg taken this turn (then the pool empties) + P.DEF x. Flat, skips DEF. */
  private guardBackHit(m: Mon) {
    if (m.dead || this.buf.guard <= 0 || this.s2?.id !== 'sw_guard') return
    const lv = this.st.s2Lv, star = this.st.s2Star > 0
    const bonus = Math.round(this.guardPool * S2N.guardBack(lv, star) + this.st.def * S2N.guardDef(lv))
    this.guardPool = 0
    if (bonus <= 0) return
    this.damageMon(m, bonus, false, '#9fe3ff')
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 34, `🛡️ สวนคืน ${bonus}`, '#9fe3ff')
  }

  /** Fire-and-forget melee dash for counters that happen inside a sync hit check (dodge → strike back). */
  private dashStrike(m: Mon) {
    const step = BATTLE.stepMs
    this.time.delayedCall(200, () => { // let the evade sidestep (90 ms yoyo) finish first
      if (m.dead || this.hp <= 0) return
      this.afterimage(0xc9c9d6)
      this.heroRig.playWindup(this.rigSpec.isKnightLine)
      sfx.dash()
      this.tweens.add({ targets: this.heroSpr, x: m.spr.x - 40, duration: step * 0.14, ease: 'Quad.easeIn', onComplete: () => {
        if (!m.dead) {
          this.heroRig.playStrike(2, this.rigSpec.isKnightLine)
          this.heroSlashFx(m.spr.x - 10, GROUND - 40, this.rigSpec.isKnightLine)
          if (this.job.id === 'thief') sfx.shadowCounter()
          else sfx.swing()
          const dmg = this.withSrc('counter', () => this.strike(m, BATTLE.counterMul))
          if (this.st.j2Hindsight > 0 && dmg > 0) this.sageSpell(m, false, 1, true)
          this.shake(60, 0.004)
        }
        this.tweens.add({ targets: this.heroSpr, x: HERO_X, duration: step * 0.3, ease: 'Quad.easeOut' })
      } })
    })
  }

  /** Fading copy of the hero (dash / evade trail). */
  private afterimage(tint: number, dx = 0) {
    this.heroRig.spawnAfterimage(tint, dx)
  }

  /** Out of turns: the monsters win this fight (the run ends like a knock-out). */
  private async timeUp() {
    this.timedOut = true
    this.callout('⌛ หมดเวลา! มอนหนีไปได้...', W / 2, 150)
    sfx.die()
    this.heroRig.setKnockedOut(true)
    this.tweens.add({ targets: this.heroSpr, angle: -90, alpha: 0.6, duration: 400 })
    await this.wait(900)
  }

  /** Q 2026-11-20 / 11-21: a boss starts a cast (ร่าย, the `charging` flag): the charged slam, or `sk` = a strong magic skill
   *  (mon-cast monSkillCasts) picked and levelled now so the telegraph names it and the next turn releases that same spell.
   *  The charge cast gives the hero an answering turn; a skill cast only with MON_CAST.skillFreeTurn. */
  private async startMonCast(m: Mon, sk?: MonSkill) {
    m.charging = true; m.chargeHits = 0; m.castSkill = sk // the wind-up is a cast the hero can break; `charging` stays the flag
    m.spr.setTint(0xff8080)
    this.monCastFx(m, true)
    if (!sk || MON_CAST.skillFreeTurn > 0) this.heroGauge = Math.max(this.heroGauge, 100) // the hero gets one turn to answer the cast
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10, `🔮 ร่าย ${sk ? sk.name : m.def.slamName ?? 'มหาเวท'}...`, '#ff7a7a')
    if (m.castSteady) {
      const cut = Math.round((1 - monCastDmgMul(true)) * 100)
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 34, `🧘 ตั้งสติ (ร่ายนี้ไม่แตก${cut > 0 ? ` · เบาลง ${cut}%` : ''})`, '#9fe3ff')
    }
    this.tweens.add({ targets: m.spr, scaleX: m.spr.scaleX * 1.1, duration: 200, yoyo: true, repeat: 1 })
    await this.wait(BATTLE.stepMs)
  }

  /** The charge cast's release. `mul` = MON_CAST.steadyDmg on a steady cast (the slam hit only; the Soul Strike it fires keeps its stored damage). */
  private async slam(m: Mon, mul = 1) {
    const home = m.spr.x
    await this.slamMotion(m)
    if (this.riposte(m)) { await this.wait(300); if (!m.dead) await this.tween({ targets: [m.spr, m.shadow], x: home, duration: 260 }); m.spr.setAngle(0); return }
    const hit = this.hurtHero(((m.def.slamMagic ? this.monMatk(m) + (m.def.venom ? m.def.venom.dex * this.matkScale(m) : 0) : m.def.dmg) + 8) * BATTLE.monDmgMul * (m.def.slamMul ?? 1.6) * skillMul(m.def, slamScaleOf(m.def)) * this.monMul(m) * mul, !!m.def.slamMagic, m.def.slamMagic ? 999 : m.def.hit ?? 15, m, `🔮 ${m.def.slamName ?? 'ท่าร่าย'}`) // Q 2026-11-21: a physical slam rolls Hit vs Flee like a hero physical skill; a magic slam can't be fled, only lucky-dodged / shielded
    if (m.stored > 0) await this.soulStrike(m)
    if (hit) {
      this.monLeech(m, m.def.mini === 'hunter' || m.def.mini === 'drainer' ? 1 : undefined) // the big drain heals all of it
      if (m.slamFx) this.applyFx(m.slamFx, m)
      if (m.def.venom) this.venomStrike(m)
      await this.tryCounter(m)
      const lost = this.st.poise > 0 ? 0 : BATTLE.slamStun * (1 - this.st.tenacity) // v78 🧘 Poise: no slam stun
      this.heroGauge = Math.max(-100, this.heroGauge - lost)
      if (lost >= 10) this.floatText(HERO_X, GROUND - 120, 'มึน!', '#f2b84b')
    }
    if (!m.dead && Math.abs(m.spr.x - home) > 4) await this.tween({ targets: [m.spr, m.shadow], x: home, duration: 260, ease: 'Quad.easeOut' })
    m.spr.setAngle(0)
    await this.wait(300)
  }

  /** The charged attack's look, per boss (MonsterDef.slamAnim). Ends where the hit lands; slam() walks it home after. */
  private async slamMotion(m: Mon) {
    const c = m.def.slamColor ?? COLORS.telegraph
    const sx = m.spr.scaleX, sy = m.spr.scaleY
    switch (m.def.slamAnim ?? 'stomp') {
      case 'pounce': { // crouch, leap in an arc onto the hero, claws
        await this.tween({ targets: m.spr, scaleY: sy * 0.8, scaleX: sx * 1.1, duration: 140, yoyo: true })
        this.tweens.add({ targets: [m.spr, m.shadow], x: HERO_X + 70, duration: 320, ease: 'Sine.easeIn' })
        await this.tween({ targets: m.spr, y: GROUND - 110, duration: 160, ease: 'Quad.easeOut' })
        await this.tween({ targets: m.spr, y: GROUND, duration: 160, ease: 'Quad.easeIn' })
        this.slashFx(HERO_X + 10, GROUND - 50); this.slashFx(HERO_X - 10, GROUND - 70)
        this.burst(HERO_X, GROUND - 50, c, 16, 220)
        this.shake(200, 0.012); sfx.swing()
        break
      }
      case 'cleave': { // march in, raise the blade, one huge sweep
        await this.tween({ targets: [m.spr, m.shadow], x: HERO_X + 90, duration: 280, ease: 'Quad.easeIn' })
        await this.tween({ targets: m.spr, angle: 18, duration: 220, ease: 'Back.easeIn' })
        await this.tween({ targets: m.spr, angle: -28, duration: 90, ease: 'Quad.easeOut' })
        const s = this.add.image(HERO_X + 10, GROUND - 60, 'slash').setDepth(9000).setScale(1.4).setTint(c)
        this.tweens.add({ targets: s, scale: 2, alpha: 0, duration: 260, onComplete: () => s.destroy() })
        this.burst(HERO_X, GROUND - 50, c, 18, 260)
        this.shake(260, 0.016); sfx.slam()
        break
      }
      case 'shot': { // recoil and fire one big projectile
        this.tweens.add({ targets: m.spr, x: m.spr.x + 24, duration: 90, yoyo: true })
        const b = this.add.image(m.spr.x - 30, m.spr.y - m.spr.displayHeight * 0.5, 'dot').setTint(c).setScale(4.5, 3).setDepth(9000)
        sfx.swing()
        await this.tween({ targets: b, x: HERO_X + 10, y: GROUND - 50, duration: 260, ease: 'Quad.easeIn' })
        b.destroy()
        this.burst(HERO_X, GROUND - 50, c, 26, 320)
        this.cameras.main.flash(90, 255, 200, 140)
        this.shake(260, 0.016); sfx.slam()
        break
      }
      case 'cast': { // rise, glow, and loose a spell orb (Mirage's Soul Strike bolts follow on their own)
        await this.tween({ targets: [m.spr], y: GROUND - 30, duration: 220, ease: 'Sine.easeOut' })
        m.spr.setTint(c)
        this.burst(m.spr.x, m.spr.y - m.spr.displayHeight * 0.6, c, 14, 120, true)
        await this.wait(160)
        const o = this.add.image(m.spr.x - 20, m.spr.y - m.spr.displayHeight * 0.6, 'dot').setTint(c).setScale(3.5).setDepth(9000)
        this.tweens.add({ targets: o, angle: 360, duration: 300 })
        await this.tween({ targets: o, x: HERO_X, y: GROUND - 50, scale: 5, duration: 300, ease: 'Quad.easeIn' })
        o.destroy()
        m.spr.clearTint()
        this.burst(HERO_X, GROUND - 50, c, 22, 260, true)
        this.cameras.main.flash(110, 200, 160, 255)
        this.tweens.add({ targets: m.spr, y: GROUND, duration: 200 })
        this.shake(220, 0.012); sfx.slam()
        break
      }
      case 'bite': { // lunge with three snapping bites
        await this.tween({ targets: [m.spr, m.shadow], x: HERO_X + 110, duration: 240, ease: 'Quad.easeIn' })
        for (let i = 0; i < 3; i++) {
          await this.tween({ targets: m.spr, x: HERO_X + 70, angle: -10, duration: 70, yoyo: true })
          this.burst(HERO_X + 10, GROUND - 40 - i * 18, c, 8, 160)
          sfx.hit(); this.shake(90, 0.008)
        }
        break
      }
      default: { // stomp: big jump and a ground slam
        await this.tween({ targets: m.spr, y: m.spr.y - 120, duration: 220, ease: 'Quad.easeOut' })
        await this.tween({ targets: m.spr, y: GROUND, duration: 150, ease: 'Quad.easeIn' })
        this.shake(300, 0.02)
        this.burst(m.spr.x, GROUND, c, 24, 320)
        sfx.slam()
      }
    }
  }

  /** Mirage Soul Strike (Q 2026-11-03, RO style): the damage it stored fires back as magic bolts.
   *  Telegraphed by the charge; each bolt can't be fled but lucky dodge, dodge charges, shields and M.DEF work. */
  private async soulStrike(m: Mon) {
    const total = Math.min(m.stored, this.st.maxHp * BATTLE.soulCap) * (this.relic === 'thornaura' ? 1 - RELIC_RULES.thornaura.reflectCut : 1)
    m.stored = 0; this.dotIcon(m)
    if (m.dead || this.hp <= 0 || total <= 0) return
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, `🔮 โซลสไตรค์ ${Math.round(total)}!`, '#c9a8ff')
    for (let i = 0; i < BATTLE.soulBolts && this.hp > 0; i++) {
      const b = this.add.image(m.spr.x - 20, m.spr.y - 60 - i * 8, 'dot').setTint(0xc9a8ff).setScale(1.8).setDepth(9000)
      await this.tween({ targets: b, x: HERO_X, y: GROUND - 50, duration: 110 })
      b.destroy()
      this.hurtHero(total / BATTLE.soulBolts, true, 999, m, '🔮 โซลสไตรค์')
    }
  }

  /** v120 combat log: every hit on the hero goes through here (hurtHeroCore does the work), `tag` = what hit (log only). */
  private hurtHero(dmg: number, magic: boolean, monHit: number, src?: Mon, tag = 'โจมตี'): boolean {
    const hp0 = this.hp, crit = this.monCritHit
    this.monCritHit = false; this.hitOut = 'hit'; this.hitLost = 0
    const landed = this.hurtHeroCore(dmg, magic, monHit, src, isMonSkillTag(tag))
    const out: HitOut = landed && this.hitOut === 'hit' && this.hitLost === 0 && this.lastHurt > 0 ? 'shield' : this.hitOut
    this.logHit({ who: src?.def.name ?? '', kind: src?.kind, tag, magic, crit, out, raw: dmg, taken: this.lastHurt, shield: Math.max(0, this.lastHurt - this.hitLost), hp: this.hitLost, hp0,
      mon: src ? { lv: src.def.lv, dmg: src.def.dmg, matk: src.def.matk, mul: this.monMul(src), hell: src.def.hellish, affix: src.affix } : undefined })
    return landed
  }
  private clog = new CombatLog()
  private hitOut: HitOut = 'hit'
  private hitLost = 0
  private monCritHit = false
  private logHit(h: Omit<HitRec, 'turn' | 'floor' | 'maxHp'>) {
    this.clog.push({ ...h, turn: this.fightTurns, floor: this.roomDef(this.room)?.floor ?? 0, maxHp: this.st.maxHp })
  }
  /** Damage that skips hurtHero (DoT ticks, events, HP costs): logged with no source. */
  private logLoss(tag: string, hp0: number, magic = true) {
    const lost = Math.max(0, hp0 - this.hp)
    if (lost > 0) this.logHit({ who: '', tag, magic, crit: false, out: 'hit', raw: lost, taken: lost, shield: 0, hp: lost, hp0 })
  }

  private mitigatedGuardHit(dmg: number, magic: boolean, monHit: number, src?: Mon, skill = false): number {
    const ab = this.hx.armorBreak > 0 ? BATTLE.armorBreakMul : 1 // เกราะแตก: P.DEF / M.DEF count half
    const effMdef = Math.min(RESIST_RULES.hardCap, this.st.mdef * ab + (this.st.j3Ch > 0 && this.monkGrit > 0 ? KIT3.champion.gritMdefBonus : 0))
    const effDef = this.st.def * ab * (this.swCullBuff > 0 ? 1 + KIT.swordUltTree.cullDef : 1) * (this.buf.guard > 0 && this.s2?.id === 'sw_guard' ? 1 + S2N.guardDefPct(this.st.s2Lv) : 1)
    const raw = magic ? dmg * (1 - effMdef) : afterDef(dmg, effDef)
    let n = Math.max(1, Math.ceil(raw * (1 - this.st.guard) * (this.buf.guard > 0 ? 1 - S2N.guardCut(this.st.s2Lv) : 1) * this.takenMul())) // Skill 2 ตั้งการ์ด · พร v2
    if (this.st.thShadowWard > 0 && shadowWardApplies(magic, monHit, (src?.trueTurns ?? 0) > 0)) n = Math.max(1, Math.ceil(n * (1 - this.st.thShadowWard))) // P2'd WIS Shadow Ward
    if (this.st.thMistDr > 0 && shadowWardApplies(magic, monHit, (src?.trueTurns ?? 0) > 0)) n = applyMistDr(n, this.st.thMistDr) // PoE Passive Mistwalker DR (multiplicative with Shadow Ward)
    if (!magic && this.st.j2BoarGuardDr > 0 && readyAllies(this.allies).some((a) => a.def.share && a.hp > a.maxHp * KIT2.beastmaster.boarGuardHpPct)) n = Math.max(1, Math.ceil(n * (1 - this.st.j2BoarGuardDr))) // 🐗 bm_b3: Boar > 50% HP lowers physical dmg taken
    n = applyTankDr(n, this.st.tankDr, this.st.tankSkillDr, skill) // 🛡️ Q 2026-11-21 tank class bulk (data/tank-scale.ts)
    if (src && this.st.j2Provoke > 0) { // Knight ข่มขวัญ: immediate 50% DR, full DR below provokeAt HP
      const cut = src.hp < src.def.hp * KIT2.knight.tree.provokeAt ? this.st.j2Provoke : this.st.j2Provoke * 0.5
      n = Math.max(1, Math.ceil(n * (1 - cut)))
    }
    const mDr = swordMultiHitDr(this.monHitsThisTurn, this.st.swMultiDr) // 🛡️ เกราะไม่สะทก: multi-hit DR
    if (mDr > 0) n = Math.max(1, Math.ceil(n * (1 - mDr)))
    return n
  }

  /** Order (stat spec v1): lucky dodge -> hit/flee -> DEF. Returns false when the hit didn't land. */
  private hurtHeroCore(dmg: number, magic: boolean, monHit: number, src?: Mon, skill = false): boolean {
    this.lastHurt = 0
    const dodged = (label: string, color: string) => {
      this.hitOut = label === 'LUCKY!' ? 'lucky' : label === 'EVADE!' ? 'evade' : 'dodge'
      this.evadeJuice(label, color)
      if (src && !src.dead && src.def.trueSight && !(src.trueTurns ?? 0) && (src.evaded = (src.evaded ?? 0) + 1) >= src.def.trueSight.after) { // anti-AGI: it reads the hero's footwork
        src.evaded = 0; src.trueTurns = src.def.trueSight.turns + 1; this.dotIcon(src)
        this.time.delayedCall(350, () => this.callout(`🎯 ${src.def.name}: ตาเหยี่ยว! Hit +${FLEE_RULES.trueSightHit} ${src.def.trueSight!.turns} เทิร์น`, W / 2, 205))
      }
      if (this.st.dodgeStrike > 0 && src && !src.dead) { // tree ★: strike back from the shadows (melee dashes in after the sidestep)
        this.floatText(HERO_X + 40, GROUND - 130, 'สวนจากเงา!', '#c9c9d6'); this.counterCount++
        if (this.job.attack === 'melee') this.dashStrike(src)
        else this.withSrc('counter', () => this.strike(src, BATTLE.counterMul, this.job.attack === 'magic'))
      }
      this.staticCounter(src) // Mage passive ⚡ Static Mirage: also on a dodge
      if (this.st.dodgeHeal > 0) this.heal(this.st.maxHp * this.st.dodgeHeal) // gear: dodging heals a little (Thief)
      if (this.st.arDodgeShield > 0 && this.shield < this.st.maxHp * this.st.arDodgeShield * 3) this.addShield(Math.min(this.st.maxHp * this.st.arDodgeShield, this.st.maxHp * this.st.arDodgeShield * 3 - this.shield)) // archer tree โล่ลม
      if (this.st.arDodgeRes > 0 && this.job.resource === 'energy') this.res = Math.min(this.resMax(), this.res + this.st.arDodgeRes) // archer ★ ยิงถอย
      if (this.st.dodgeEnergy > 0 && this.job.resource === 'energy') this.res = Math.min(this.resMax(), this.res + this.st.dodgeEnergy) // Thief talent: ขโมยจังหวะ
      this.dodgeCdCut() // P2'a th_t2a: also cuts a cooldown (ICD)
      this.shadowDodged() // 👤 เกจเงา (+ P2'c thief_b1 / b3)
      this.gamblerLucky(label, src) // P2'd LUK Gambler's Edge: LUCKY! -> Energy (+ PoE thLuckyKnife, 1/hero turn)
      this.rgDodged = true // P3'a Rogue: next Back Stab is a Shadow Ambush
      return false
    }
    if (this.dodgeCharges > 0) { this.dodgeCharges--; return dodged('เงาพริ้ว!', '#c9c9d6') }
    if (src && this.allies.length && this.allyTaunt(dmg)) { this.hitOut = 'taunt'; return false } // Ally taunt (Monk Tempest Bell) takes the attack
    if (src && src.blind > 0) monHit *= 1 - KIT2.crusader.blindHit // Crusader Holy Cross 🙈
    if (!magic && (this.st.j3Rn > 0 || this.st.j3Sk > 0) && this.inspire > 0 && Math.random() < KIT3.common.inspireGuard) {
      if (this.st.j3Inspire > 0) this.heal(this.st.maxHp * KIT3.common.inspireHeal, true)
      return dodged(this.st.j3Sk > 0 ? '🌑 Hide!' : '🎭 พรางตัว!', this.st.j3Sk > 0 ? '#b9a8ff' : '#9fe08a')
    }
    const sure = this.hx.web > 0 // 🕸️ webbed: Can't Evade
    if (!magic && (src?.trueTurns ?? 0) > 0) monHit += FLEE_RULES.trueSightHit // 🎯 ตาเหยี่ยว: + Hit (Q 2026-11-21: was a sure hit that skipped Flee + lucky dodge)
    if (!sure && Math.random() < this.st.luckyDodge) return dodged('LUCKY!', '#6fd08c')
    if (!sure && Math.random() > monHitChance(monHit, this.fleeNow(), this.st.fleeFloor, this.alive().length)) return dodged('EVADE!', '#9fe3ff') // Q 2026-11-21 RO-style: floor 20% (Thief เงาบาง lowers it) + mob penalty
    if (!magic && (this.st.j2Guard > 0 || this.inspire > 0) && Math.random() < (this.inspire > 0 ? KIT3.common.inspireGuard : this.st.j2Guard + (this.gc ? this.st.j2GcGuard : 0)) * (this.hasShield || this.j2?.id === 'monk' || this.inspire > 0 ? 1 : KIT2.knight.guardShieldless)) { this.hitOut = 'block'; this.floatText(HERO_X, GROUND - 120, '🛡️ BLOCK!', '#9fe3ff'); sfx.hit(); this.onBlock(src); if (this.buf.guard > 0 && this.s2?.id === 'sw_guard') { const est = this.mitigatedGuardHit(dmg, magic, monHit, src, skill); this.guardPool += Math.round(est * S2N.guardAutoBlockShare) } return false } // Knight / Crusader / Champion / Warlord Auto Guard
    if (magic && this.j2?.id === 'sage') { // 🛡️ Sage Magic Rod (+ VIT scaling)
      const rod = sageRodGain(this.st, this.heroVit)
      if (this.st.j2RodBlock > 0 && !this.rodUsed) {
        this.rodUsed = true; this.hitOut = 'rod'
        const blockMana = KIT2.sage.rodBlockMana + Math.floor(Math.max(0, this.heroVit) * KIT2.sage.rodVitMana)
        this.gainRes(blockMana)
        if (rod.shield > 0) this.addShield(rod.shield, true)
        this.floatText(HERO_X, GROUND - 120, `🔮 Magic Rod! +${blockMana}💧`, '#c9a8ff')
        if (src && !src.dead) this.sageSpell(src, true) // ★ Magic Rod เต็มขั้น: counter-cast Auto Spell
        return false
      }
      if (rod.mana > 0) {
        this.gainRes(rod.mana)
        if (rod.shield > 0) this.addShield(rod.shield, true)
      }
    }
    let n = this.mitigatedGuardHit(dmg, magic, monHit, src, skill)
    if (this.mirror && src && !src.dead) { // Innovator 🔁 กระจก: the hit bounces back, capped like every reflect (BATTLE.reflectCap)
      this.mirror = false; this.hitOut = 'mirror'; this.floatText(HERO_X, GROUND - 120, '🔁 สะท้อน!', '#c9e0ff')
      this.damageMon(src, Math.max(1, Math.round(Math.min(n * KIT2.innovator.mirrorCap, this.st.maxHp * BATTLE.reflectCap))), false, '#c9e0ff', true)
      return false
    }
    if (src && this.allies.length) n = this.boarGuard(n, src) // 🐗 Guardian: the boar takes its share of a landed hit (DoTs have no src)
    this.lastHurt = n; this.j2Hurt = true
    if (src) this.monHitsThisTurn++
    if (this.st.swVengRate > 0 && n > 0) { // 🔥 เพลิงแค้น: store dmg taken for Ult burst + shield
      const cap = this.st.maxHp * KIT.swordUltTree.vengCap
      const add = Math.min(Math.max(0, cap - this.swVeng), n * this.st.swVengRate)
      if (add > 0) { this.swVeng += add; this.floatText(HERO_X - 24, GROUND - 155, `🔥 เพลิงแค้น +${Math.round(add)}`, '#ff9a3c') }
    }
    if (src && this.st.swHelixMul > 0 && this.hp > 0) { // 🌀 พายุสวนกลับ: deterministic AoE spin every N hits taken (x2 vs taunted!)
      this.swHelixHits += (src.tauntTurns ?? 0) > 0 ? S2N.tauntHelixMult : 1
      if (this.swHelixHits >= swordHelixNeed(this.st.swHelixFast)) {
        this.swHelixHits = 0
        this.triggerSwordHelix()
      }
    }
    if (this.buf.guard > 0 && this.s2?.id === 'sw_guard') {
      this.guardPool += n // Q 2026-11-22: ตั้งการ์ด counter pays back the dmg taken this turn
      if (src && !src.dead && n > 0) { // 🦔 การ์ดแน่น (Rammus W): spiked shell thorns on every landed hit
        const thornRaw = Math.max(1, Math.round(this.st.def * (1 + S2N.guardDefPct(this.st.s2Lv)) * S2N.guardThorn(this.st.s2Lv, this.st.s2Star > 0)))
        const thorn = Math.min(thornRaw, Math.max(1, Math.round(this.st.maxHp * BATTLE.reflectCap)))
        this.damageMon(src, thorn, false, '#ffd984', true)
        this.floatText(src.spr.x, src.spr.y - src.spr.displayHeight - 28, `🦔 เกราะหนาม ${thorn}`, '#ffd984')
      }
    }
    if (src && !src.dead) { this.staticCounter(src); this.mageOnHit(src) } // Mage passives ⚡🔥❄️ (docs/passive_mage_3.md)
    if (this.st.j2GritRate > 0 && n > 0) {
      const { cap } = haymakerCalc(this.st, this.monkGrit)
      const add = Math.min(Math.max(0, cap - this.monkGrit), n * this.st.j2GritRate)
      if (add > 0) { this.monkGrit += add; this.floatText(HERO_X - 20, GROUND - 155, `🥊 แรงฮึด +${Math.round(add)}`, '#ff9a3c') }
    }
    if (this.st.clManaGuard > 0 && this.job.resource === 'mana') this.gainRes(n * this.st.clManaGuard * (1 + this.heroWis * KIT.clericTree.core.wisAmp)) // v86 💠 มานาพิทักษ์ (before shields)
    if (!magic && this.st.j2Reflect > 0 && src && !src.dead) this.damageMon(src, Math.max(1, Math.round(Math.min(n * this.st.j2Reflect, this.st.maxHp * BATTLE.reflectCap))), false, '#c9e0ff', true) // Crusader Reflect Shield
    if (src?.def.vengeance && n > 0 && !src.dead && !src.vengTurns && !src.vengCd) { // death knight โล่แห่งความแค้น
      src.shield += n * BATTLE.vengeance.share; src.vengTurns = BATTLE.vengeance.turns; this.dotIcon(src)
      this.floatText(src.spr.x, src.spr.y - src.spr.displayHeight - 30, `🛡️ โล่แห่งความแค้น +${Math.round(n * BATTLE.vengeance.share)}`, '#c9a8ff')
    }
    if (this.relic === 'thornaura' && src && !src.dead) { this.damageMon(src, Math.max(1, Math.round(n * RELIC_RULES.thornaura.back)), false, '#7fd08c', true); this.floatText(src.spr.x, src.spr.y - src.spr.displayHeight - 30, '🌵 หนาม!', '#7fd08c') }
    this.gainRage(RES_RULES.rageOnHurt + this.st.rageOnHurtAdd) // talent: แค้นฝังใจ
    if (this.st.rageOnHurtAdd > 0) this.gainRes(this.st.rageOnHurtAdd) // same talent on a Mana job: Mana when hit
    if (this.kyrie.hits > 0 && this.kyrie.hp > 0) { // v77 Kyrie Eleison: breaks on its HP or after N hits, whichever first
      const absorbed = Math.min(this.kyrie.hp, n)
      this.kyrie.hp -= absorbed; this.kyrie.hits--; n -= absorbed
      this.floatText(HERO_X, GROUND - 110, `🛡️ -${absorbed}`, '#9fe3ff')
      if (this.kyrie.hp <= 0 || this.kyrie.hits <= 0) { this.kyrie = { hp: 0, hits: 0 }; this.floatText(HERO_X, GROUND - 140, '🛡️ Kyrie แตก', '#c9c9d6') }
      if (n <= 0) return true
    }
    if (this.shield > 0) {
      const absorbed = Math.min(Math.ceil(this.shield), n)
      this.shield = Math.max(0, this.shield - absorbed); n -= absorbed
      this.floatText(HERO_X, GROUND - 110, `🛡️ -${absorbed}`, '#9fe3ff')
      if (this.shield <= 0 && this.st.barrierBoom > 0) { // mage talent บาเรียระเบิด
        this.callout('💥 บาเรียระเบิด!', HERO_X + 120, GROUND - 160)
        for (const m of this.alive()) { this.strike(m, this.st.barrierBoom, true, '#c9a8ff'); if (this.st.barrierBoom >= 1.6) m.gauge -= 20 }
      }
      if (this.shield <= 0) this.glacialNova() // Mage passive ❄️ Shatter Nova
      if (this.st.thorns > 0 && src && !src.dead) this.damageMon(src, Math.max(1, Math.round(absorbed * this.st.thorns)), false, '#9fe3ff', true) // tree: "โล่หนาม"
      if (n <= 0) return true
    }
    if (this.buf.mshield > 0 && this.job.resource === 'mana' && this.res > 0) { // Skill 2 Mana Shield (active, v27)
      const paid = Math.min(Math.floor(this.res), Math.ceil(n * S2N.mshieldTake(this.st.s2Lv)))
      this.res -= paid; n -= paid
      if (paid > 0) this.floatText(HERO_X, GROUND - 110, `🔷 -${paid}`, '#5aa0ff')
      if (n <= 0) return true
    }
    if (this.st.j2Martyr > 0 && !this.martyrUsed && this.hp - n <= 0 && this.hp > 1) { // Crusader ★ ผู้พลีชีพ
      this.martyrUsed = true; n = this.hp - 1
      this.addShield(this.st.maxHp * KIT2.crusader.martyrShield, true)
      this.callout('🕊️ ผู้พลีชีพ! ยังไม่ล้ม', HERO_X + 120, GROUND - 150)
    }
    const ls = this.itemEffect('last_stand')
    if (ls && !this.lastStandUsed && this.hp - n <= 0 && this.hp > 1) { // 🧬 ใจสู้ (Sterak / Aegis): once per wave
      this.lastStandUsed = true; n = this.hp - 1
      this.addShield(this.st.maxHp * ls.power, true)
      this.callout('💪 ใจสู้! ยังไม่ล้ม', HERO_X + 120, GROUND - 150)
      this.burst(HERO_X, GROUND - 40, 0xffe08a, 22, 200, true)
    }
    this.castBreak(n) // v78: only a hit that got past every shield (v85: and big enough)
    const hpBefore = this.hp
    const floor = this.ignorePainTurns > 0 || this.wlUndyingTurns > 0 ? Math.max(1, this.hpFloor) : this.hpFloor
    this.hp = Math.max(floor, this.hp - n)
    this.hitLost = hpBefore - this.hp
    if (this.hp > 0) this.lowHpCheck()
    if (this.st.mgEmergency > 0 && !this.emergencyUsed && this.hp > 0 && this.hp < this.st.maxHp * 0.3) { // mage talent มานาฉุกเฉิน
      this.emergencyUsed = true; this.res = this.resMax()
      if (this.st.mgEmergency >= 2) this.addShield(this.st.matk * 2, true)
      this.callout('🔷 มานาฉุกเฉิน!', HERO_X + 120, GROUND - 150)
    }
    this.minHpPct = Math.min(this.minHpPct, this.hp / this.st.maxHp)
    this.damageNumber(HERO_X, GROUND - 70, n, false, '#ff7a7a')
    if (this.holyRevive()) return true // v84 Priest ★ คืนชีพ (before the Phoenix feather)
    if (this.hp <= 0 && this.st.revive > 0) {
      this.st.revive--; this.revivedCount++
      this.hp = Math.round(this.st.maxHp * Math.max(BATTLE.reviveHp, this.st.reviveHp))
      this.callout('🍃 ขนนกฟีนิกซ์! ลุกขึ้นอีกครั้ง', HERO_X + 120, GROUND - 150)
      this.burst(HERO_X, GROUND - 40, 0xffb347, 24, 220)
      sfx.win()
      return true
    }
    sfx.hurt()
    this.heroRig.flashFill(0xff6060, 90)
    this.tweens.add({ targets: this.heroSpr, x: HERO_X - 14, duration: 70, yoyo: true })
    if (this.hp <= 0) { sfx.die(); this.heroRig.setKnockedOut(true); this.tweens.add({ targets: this.heroSpr, angle: -90, alpha: 0.6, duration: 400 }) }
    return true
  }

  private heal(n: number, quiet = false) {
    if (this.ignorePainTurns > 0) return // Berserker ★ ไม่รู้สึกเจ็บ: ดูดเลือดหรือฮีลไม่มีผลใดๆ ขณะอยู่ในสถานะนี้
    const before = this.hp
    if (this.hx.burn > 0) n *= 1 - BATTLE.burnHealCut // burning: healing on the hero is cut
    if (this.st.clFaith > 0) n *= 1 + this.faith * KIT.clericTree.faithHealAmp // v120 สวดภาวนา: each held Faith = heal +6%
    n *= this.run.mut.healMul * this.aff.healMul // daily mutator แผลเรื้อรัง · tower affix แผลลึก
    if (this.biomeState && n > 0) n = modifyHeroDirectHealBiome(this.biomeState, n)
    const want = Math.ceil(this.hp + n * (1 + this.st.healAmp))
    const shCut = shieldCutMul(this.st.thDefShieldCut)
    if (this.st.j2NoLight > 0 && want > this.st.maxHp) { const cap = Math.ceil(this.st.maxHp * KIT2.monk.darkCap); if (this.shield < cap) this.shield = Math.min(cap, this.shield + (want - this.st.maxHp) * KIT2.monk.noLightMul * shCut) } // Monk ★ ไร้แสง
    else if (this.st.overhealShield > 0 && want > this.st.maxHp) this.shield = Math.min(Math.ceil(this.st.maxHp * 0.5), this.shield + (want - this.st.maxHp) * shCut) // tree: "ไฟชำระ" (cap 50% max HP)
    else if (this.pk.overheal > 0 && want > this.st.maxHp) {
      const capShare = Math.max(this.pk.overheal, this.toxicHealing && this.st.thEldritchVenom > 0 ? KIT.thiefOverhealCap : 0)
      this.shield = applyToxicOverheal(this.shield, want - this.st.maxHp, this.st.maxHp, capShare, this.st.thDefShieldCut)
    } // legend ฮีลล้นเป็นโล่
    else if (this.toxicHealing && this.st.thEldritchVenom > 0 && want > this.st.maxHp) {
      this.shield = applyToxicOverheal(this.shield, want - this.st.maxHp, this.st.maxHp, KIT.thiefOverhealCap, this.st.thDefShieldCut)
    } // PoE Passive Eldritch Venom: Toxic Overheal -> shield (cap KIT.thiefOverhealCap)
    this.hp = Math.min(this.st.maxHp, want)
    if (want > this.st.maxHp && this.hp > 0) this.overFaith(want - this.st.maxHp) // v84 ล้นศรัทธา / ★ แสงล้นฟ้า
    if (this.relic === 'bloodpact' && want > this.st.maxHp) { // Blood Pact: overheal becomes shield (capped)
      const cap = Math.round(this.st.maxHp * RELIC_RULES.bloodpact.shieldCap)
      this.shield = Math.max(this.shield, Math.min(cap, this.shield + (want - this.st.maxHp) * shCut))
    }
    if (this.hp > before && !quiet) this.damageNumber(HERO_X, GROUND - 70, this.hp - before, false, '#6fd08c', true)
  }

  private dotIcon(m: Mon) {
    if (m.dead || !m.spr.active) return // a DoT tick or card can land after the kill: its icon text is already gone (page error 'drawImage' of null)
    if (!m.dotTxt) m.dotTxt = this.add.text(0, 0, '', { fontSize: '14px' }).setOrigin(0.5).setDepth(9500)
    m.dotTxt.setText(`${(m.broken ?? 0) > 0 ? '⛓️' + m.broken : ''}${(m.mSilence ?? 0) > 0 ? '🤐' : ''}${m.burnTurns > 0 ? '🔥' : ''}${m.burnStacks > 0 ? '🔥' + m.burnStacks : ''}${m.hell > 0 ? '♨️' + m.hell : ''}${m.poison > 0 ? '☠️' + m.poison : ''}${m.chill > 0 ? '❄️' : ''}${(m.permafrost ?? 0) > 0 ? '💠' + m.permafrost : ''}${m.mark ? `[${PROF_ICON[m.mark]}${(m.markLayers ?? 1) > 1 ? '×' + m.markLayers : ''}]` : ''}${m.ice > 0 ? '🧊' + m.ice : ''}${m.shield > 0 ? '🛡️' : ''}${m.atkUpTurns > 0 ? '💢' : ''}${m.weakTurns > 0 ? '😰' : ''}${(m.disarm ?? 0) > 0 ? '🧤' : ''}${m.armorBrk > 0 ? '🦴' : ''}${(m.sunderTurns ?? 0) > 0 ? '🕳️' : ''}${m.blind > 0 ? '🙈' : ''}${m.exposed > 0 ? '👁️' : ''}${m.wound > 0 ? '🩸' + m.wound : ''}${(m.goreTurns ?? 0) > 0 ? '🩸' : ''}${m.dagger > 0 ? '🔪' + m.dagger : ''}${m.stabMark > 0 ? '🗡️' : ''}${m.strip > 0 ? '🔓' : ''}${m.wet > 0 ? '💧' : ''}${(m.trueTurns ?? 0) > 0 ? '🎯' : ''}${m.huntMark > 0 ? '🏷️' : ''}${this.thMarkMon === m ? '🔻' + this.malice : ''}${(m.deathMark ?? 0) > 0 ? '💀' + m.deathMark : ''}${m.reflect > 0 ? '🔁' : ''}${m.stored > 0 ? '🔮' + Math.round(m.stored) : ''}`)
  }

  // ---------- xp / perks ----------
  private pendingLevels = 0
  private gainXp(n: number) {
    this.xp += n
    while (this.xp >= RULES.xpNeed(this.level)) { this.xp -= RULES.xpNeed(this.level); this.level++; this.pendingLevels++ }
  }

  private async levelUps() {
    while (this.pendingLevels > 0 && this.hp > 0) {
      this.pendingLevels--
      this.heal(this.st.maxHp * RULES.healOnLevel)
      sfx.win()
      await this.offerPerks()
    }
  }

  private applyMod(mod: Partial<Stats>) {
    for (const k of Object.keys(mod) as (keyof Stats)[]) {
      const v = mod[k]!
      if (k === 'maxHp') { this.st.maxHp += v; this.hp += v; continue }
      if (k === 'pickHpPct') { const d = Math.round(this.st.maxHp * v); this.st.maxHp += d; this.hp += d; continue } // run pick: % of the current value, applied now
      if (k === 'pickAtkPct') { this.st.atk = Math.round(this.st.atk * (1 + v)); continue }
      if (k === 'pickMatkPct') { this.st.matk = Math.round(this.st.matk * (1 + v)); continue }
      if (k === 'fireEvery') { this.st.fireEvery = this.st.fireEvery === 0 ? Math.max(1, v) : Math.max(1, this.st.fireEvery + v); continue }
      this.st[k] += v
      if (k === 'crit' && this.job.id === 'mage') { this.st.crit -= v; this.st.skillCrit += v } // Sage rework v1: Mage crit -> skillCrit (no spellCrit leak)
      if (k === 'lifesteal') this.st.lifesteal = Math.min(0.4, this.st.lifesteal) // Q: lifesteal cap 40%
      if (k === 'mdef') this.st.mdef = softCapDiminish(this.st.mdef) // soft-cap diminish up to hardCap
      if (k === 'tenacity') this.st.tenacity = softCapDiminish(this.st.tenacity)
    }
    this.st.smashCost = Math.max(6, this.st.smashCost)
  }

  /** พร v2 level-up pick (design/skills-v2.md §1.4): 3 cards from every line (owned + not yet maxed ones come back as "+"),
   *  each slot may roll 🟠 legendary (only for lines the hero already has), then 1 ⭐ general card. `forceLegend` (events) tries legendary in every slot. */
  private offerPerks(forceLegend = false) {
    return new Promise<void>((done) => {
      const lv = (id: string) => this.perkLv(id)
      // Mage: the run's element bans a line (⚡ → no 🔥, 🔥 → no ⚡; ❄️ keeps both). Mage's magic basic can't use on-hit poison / lifesteal.
      const banned: Line[] = this.runElement === 'lightning' ? ['fire'] : this.runElement === 'fire' ? ['storm'] : []
      const ok = (p: PerkDef) => lv(p.id) < p.max && !banned.includes(p.line) && !(this.job.id === 'mage' && MAGE_SKIP.has(p.id)) && !(p.needsRes && !this.job.resource)
      const lines = new Set(this.perks.filter((o) => o.def.rarity === 'common' && o.def.line !== 'common').map((o) => o.def.line))
      const commons = PERKS_V2.filter((p) => p.rarity === 'common' && ok(p))
      const legends = PERKS_V2.filter((p) => p.rarity === 'legend' && ok(p) && lines.has(p.line))
      const generals = GENERAL_PERKS.filter(ok)
      const offers: PerkDef[] = []
      const take = (list: PerkDef[]) => { const left = list.filter((p) => !offers.includes(p)); if (left.length) { offers.push(left[Phaser.Math.Between(0, left.length - 1)]); return true } return false }
      const want = (id: string) => { const p = PERKS_V2.find((x) => x.id === id); if (p && ok(p) && !offers.includes(p) && (p.rarity === 'common' || lines.has(p.line))) offers.push(p) }
      for (const id of this.testPerk ?? []) if (!offers.length && !lv(id)) want(id) // bot hook: a card not owned yet first, so a list covers every card
      for (const id of this.testPerk ?? []) if (!offers.length) want(id) // ... then "+" levels
      if (this.firstOffer && this.st.mgFirstCard > 0) want(this.st.mgFirstCard === 1 ? 'stm_roar' : 'fir_ball') // mage talent row 1
      this.firstOffer = false
      const own = JOB_LINES[this.job.id] ?? []
      let lean = lines.size > 0 && Math.random() < OFFER_RULES.lean // one slot leans to a line already owned so builds still grow
      while (offers.length < 3) {
        if ((forceLegend || this.flags.allLegend || Math.random() < this.st.legendChance) && take(legends)) continue
        if (lean) { lean = false; if (take(commons.filter((p) => lines.has(p.line)))) continue }
        if (Math.random() < OFFER_RULES.ownLine && take(commons.filter((p) => own.includes(p.line)))) continue // own lines weigh more; other lines still show up (🌀)
        if (!take(commons) && !take(legends) && !take(generals)) break
      }
      while (offers.length < 4 && take(generals)) { /* always ends with a general card */ }
      if (!offers.length) { done(); return }
      this.time.paused = true
      const c = this.add.container(0, 0).setDepth(30000)
      c.add(this.add.rectangle(W / 2, H / 2, W, H, COLORS.night, 0.8).setInteractive())
      c.add(this.add.text(W / 2, 44, `เลเวล ${this.level}! เลือกพร 1 อย่าง`, { fontFamily: FONT_UI, fontSize: '28px', fontStyle: 'bold', color: '#f2b84b' }).setOrigin(0.5))
      const cw = 680, ch = 104, gap = 10 // v48: one column of 4 rows
      const y0 = H / 2 + 26 - ((offers.length - 1) * (ch + gap)) / 2
      const keys: string[] = []
      const pick = (p: PerkDef) => {
        if (!c.active) return
        keys.forEach((k) => this.input.keyboard!.removeAllListeners(k))
        this.pendingPick = undefined
        this.pendingOffers = undefined
        c.destroy()
        this.time.paused = false
        this.takePerk(p)
        done()
      }
      offers.forEach((p, i) => {
        const line = LINES[p.line], have = lv(p.id), up = have > 0 && p.max === 2, leg = p.rarity === 'legend', gen = p.line === 'common'
        const alien = !gen && !own.includes(p.line)
        const card = this.add.container(W / 2, y0 + i * (ch + gap))
        const bg = this.add.rectangle(0, 0, cw, ch, leg ? 0xffe08a : up ? 0xe2f4dc : alien ? 0xe6e0f4 : 0xf4e6c8).setStrokeStyle(leg ? 6 : 4, leg ? 0xff8c42 : Phaser.Display.Color.HexStringToColor(line.color).color)
        const icon = this.add.text(-cw / 2 + 52, 0, p.icon, { fontSize: '40px' }).setOrigin(0.5)
        const name = this.add.text(-cw / 2 + 100, -ch / 2 + 12, `${p.name}${up ? '+' : ''}`, { fontFamily: FONT_UI, fontSize: '22px', fontStyle: 'bold', color: leg ? '#a8420f' : '#2b2238' })
        const desc = this.add.text(-cw / 2 + 100, -ch / 2 + 44, perkDesc(p.desc[up ? 1 : 0] || p.desc[0], this.job.ult), { fontFamily: FONT_UI, fontSize: '15px', color: '#4a3f5c', wordWrap: { width: cw - 120 }, lineSpacing: 2 })
        const tag = gen ? 'พรทั่วไป · เลือกซ้ำได้' : `${leg ? '🟠 ตำนาน · ' : alien ? '🌀 พรต่างสาย · ' : ''}${line.icon} สาย${line.name}${up ? ' · ขั้น + (อัปจากที่มี)' : p.max === 2 ? ' · เลือกซ้ำ = +' : ''}`
        const foot = this.add.text(cw / 2 - 14, -ch / 2 + 14, tag, { fontFamily: FONT_UI, fontSize: '14px', color: leg ? '#ff8c42' : line.color, fontStyle: 'bold', stroke: '#2b2238', strokeThickness: 2 }).setOrigin(1, 0)
        const key = this.add.text(-cw / 2 + 10, -ch / 2 + 6, `${i + 1}`, { fontFamily: FONT_NUM, fontSize: '16px', color: '#8d7244' })
        card.add([bg, icon, name, desc, foot, key]).setSize(cw, ch).setInteractive({ useHandCursor: true })
        card.on('pointerover', () => card.setScale(1.02))
        card.on('pointerout', () => card.setScale(1))
        card.on('pointerup', () => pick(p))
        c.add(card)
        const k = `keydown-${['ONE', 'TWO', 'THREE', 'FOUR'][i]}`
        keys.push(k)
        this.input.keyboard!.once(k, () => pick(p))
      })
      this.pendingPick = (i) => pick(offers[Math.min(i, offers.length - 1)])
      this.pendingOffers = offers.map((p) => ({ id: p.id, legend: p.rarity === 'legend', up: lv(p.id) > 0, own: own.includes(p.line), general: p.line === 'common' }))
    })
  }

  /** Own a card, or take it to "+": apply its stat / run-stat delta for that level. */
  private takePerk(p: PerkDef) {
    let o = this.perks.find((x) => x.def.id === p.id)
    if (o) o.lv++
    else { o = { def: p, lv: 1 }; this.perks.push(o) }
    const repeat = p.max > 2
    this.applyMod(levelDelta(p.mod, o.lv, repeat))
    const d = levelDelta(p.pk, o.lv, repeat)
    for (const k of Object.keys(d) as (keyof PerkStats)[]) this.pk[k] += d[k] ?? 0
    if (p.mastery) {
      const i = Math.min(o.lv, 2) - 1, ms = this.masteries.find((x) => x.id === p.id)
      if (ms) { ms.amp = p.mastery.amp[i]; ms.cut = p.mastery.cut[i] } else this.masteries.push({ id: p.id, src: p.mastery.src, amp: p.mastery.amp[i], cut: p.mastery.cut[i] })
    }
    this.callout(`${p.rarity === 'legend' ? '🟠 ' : ''}${p.icon} ${p.name}${o.lv >= 2 && p.max === 2 ? '+' : ''}`, HERO_X, GROUND - 140)
    if (p.rarity === 'legend') sfx.door()
  }

  // ---------- พร v2: Trigger x Effect (data/perks.ts) ----------
  private pk: PerkStats = newPerkStats()
  private masteries: { id: string; src: Src; amp: number; cut: number }[] = []
  /** Damage source tag of whatever the hero is doing right now (basic / combo / counter / skill / ult / zap / fire ...). */
  private src: Src = 'other'
  private immortal: ImmortalId | null = null
  private eggN = 0
  private eggDef = 0
  private lowHpDone = false
  private demonOn = false
  private demonDone = false
  private comboAtkN = 0
  private fightUlts = 0
  private ultOpen = 1
  private lowRegen = { turns: 0, amt: 0 }
  private procDepth = 0
  /** Bot hook (PERK=id,id): the first of these cards still open goes into slot 1 of every level-up offer. */
  testPerk?: string[]
  /** Bot / debug: how many times each card's trigger fired this run. */
  procHits: Record<string, number> = {}
  /** Bot / debug: card ids with level, e.g. "stm_roar+ grd_open". */
  perkList() { return this.perks.map((o) => `${o.def.id}${o.lv >= 2 && o.def.max === 2 ? '+' : o.lv > 1 ? `x${o.lv}` : ''}`).join(' ') }

  private withSrc<T>(src: Src, fn: () => T): T { const p = this.src; this.src = src; try { return fn() } finally { this.src = p } }
  private perkLv(id: string) { return this.perks.find((o) => o.def.id === id)?.lv ?? 0 }
  /** Monster combo defence by tier (COMBO), harder in hard mode / tower. */
  private monCombo(m: Mon) {
    const t = m.def.mini ? 'mini' : m.def.ai === 'boss' ? 'boss' : 'normal', add = this.hard || this.run.endless ? COMBO.hardAdd : 0
    const a = t === 'normal' ? 0 : add
    const sd = m.def.statDef // D6+ stat monsters: AGI / DEX / VIT like the hero (x/(x+400))
    return { ignore: COMBO.ignore[t] + a + (sd?.ignoreCombo ?? 0), basicDR: COMBO.basicDR[t], comboDR: COMBO.comboDR[t] + a + (sd?.comboDR ?? 0), ignoreCounter: COMBO.ignoreCounter[t] + a + (sd?.ignoreCounter ?? 0), counterDR: COMBO.counterDR[t] + a + (sd?.counterDR ?? 0) }
  }
  private comboChance() { return (this.st.combo + (this.relic === 'wolf' ? RELIC_RULES.wolf.combo : 0)) * (this.relic === 'wizard' ? RELIC_RULES.wizard.chanceMul : 1) }
  /** พร v2 number in a run: card + gear lines / monster cards, capped (perks.ts OUTSIDE_CAP). */
  private px(k: OutsideKey) { return Math.min(OUTSIDE_CAP[k], this.pk[k] + this.st[k]) }
  private counterChance() { return counterRate(this.st.counter + (this.swAwaken > 0 || this.rampage > 0 ? this.st.swAwCtr : 0), this.st.counterPct, COMBO.rateCap) * (this.relic === 'wizard' ? RELIC_RULES.wizard.chanceMul : 1) }
  /** True Strike (Can't Be Evaded): only active while awakened WITH ★ ดาบตื่นเต็มพลัง (swordsman_d4). */
  private swAwakeSure() { return this.swAwaken > 0 && this.st.swAwTrue > 0 }

  /** Damage multiplier by source tag: masteries, style-switch mythics, card mods, glass, demon form, open-strong ult. */
  private srcMul(m: Mon, dot: boolean) {
    const src = this.src, rel = this.relic
    let k = 1
    for (const ms of this.masteries) k *= ms.src === src ? 1 + ms.amp : 1 - ms.cut
    const basic = src === 'basic' || src === 'combo', skill = src === 'skill' || src === 'ult'
    if (basic) { const d = this.monCombo(m), c = src === 'combo'; k *= Math.max(COMBO.dmgFloor, 1 + this.px('basicDmg') + this.weaveBonus + (c ? this.st.comboDmg + this.rgComboDebuff(m) : 0) - d.basicDR - (c ? d.comboDR : 0)) } // Capybara-style additive bracket (+ P2'a th_t2c weave)
    if (src === 'counter') { const d = this.monCombo(m); k *= Math.max(COMBO.dmgFloor, 1 + this.px('basicDmg') + this.px('counterDmg') - d.basicDR - d.counterDR) } // same bracket as combo
    if (rel === 'wolf') k *= src === 'combo' || src === 'counter' ? 1 + RELIC_RULES.wolf.comboCounter : skill ? 1 - RELIC_RULES.wolf.skillCut : 1
    if (rel === 'wizard' && skill) k *= 1 + RELIC_RULES.wizard.skill
    if (rel === 'queen') k *= ELEM_SRC.has(src) ? 1 + RELIC_RULES.queen.elem : basic ? 1 - RELIC_RULES.queen.basicCut : 1
    if (ELEM_SRC.has(src)) k *= 1 + this.st.elemDmg
    if (skill) {
      k *= this.biomeSkillMul
      const bp = this.itemEffect('blood_pact')
      if (bp) k *= 1 + bp.power
      const mo = this.itemEffect('mana_overload')
      if (mo && this.job.resource === 'mana' && this.res >= this.resMax() * (mo.threshold ?? 0.6)) k *= 1 + mo.power
    }
    if (!dot && this.px('vsBurn') > 0 && (m.burnStackTurns > 0 || m.burnTurns > 0 || m.hell > 0)) k *= 1 + this.px('vsBurn')
    if (!dot && src !== 'poison' && m.poison > 0) k *= 1 + this.px('vsPoison') // src 'poison' (!dot = Contaminate) applies vsPoison inside B5 instead
    if (rel === 'glass' && this.hp < this.st.maxHp * RELIC_RULES.glass.below) k *= 1 + RELIC_RULES.glass.dmg
    if (this.demonOn) k *= 1 + IMMORTAL_RULES.demonDmg
    if (src === 'ult') k *= this.ultOpen
    const rs = this.itemEffect('ramp_stack') // 🧬 สะสมศึก (Rageblade): +power per fight turn after the first, never on the ult
    if (rs && !this.allyHitting && !this.inUltWindow()) k *= 1 + rs.power * Math.min(rs.threshold ?? COMBINE_FX.rampMax, Math.max(0, this.fightTurns - 1))
    return k
  }
  /** Hero damage-taken multiplier from cards / mythics. */
  private takenMul() {
    const G = RELIC_RULES.glass
    return (1 - Math.min(this.pk.hardenCap, this.pk.harden * this.fightTurns)) * (this.relic === 'glass' && this.hp < this.st.maxHp * G.below ? 1 + G.taken : 1) * (this.rampage > 0 ? 1 + KIT2.berserker.ultTaken : 1) * (this.j2?.id === 'wizard' && this.casts.length ? 1 + wizCastTaken(this.st) : 1) * (this.wardTurns > 0 ? 1 - this.st.clUltWard : 1) // v84 ม่านพร
      * (this.gc && this.st.j2GcAngel > 0 ? 1 - Math.min(KIT2.crusader.angelCap, this.st.j2GcAngel * this.gc.left) : 1) // v119 🪽 Guardian Angel: fades with the pulses left
      * (this.st.j3Banding > 0 ? 1 - this.st.j3Banding * Math.min(KIT3.common.bandingMax, this.alive().length) : 1) // ⚜️ Banding
      * (this.st.j2HaymakerStar > 0 && this.monkGrit > 0 ? 1 - KIT2.monk.haymakerDr : 1) // Monk ★ หมัดพิพากษา Sett DR while holding Grit
      * (this.st.j3Wl > 0 ? 1 + KIT3.warlord.carnageTaken : 1) // 🪓 Warlord Aspect of Carnage (+10% damage taken)
      * (this.buf.blood > 0 ? 1 + S2N.bloodTaken : 1)
      * swordTakenMul(this.st.swIronDr, this.st.swCleaveTaken) // PoE Passive Swordsman: Iron Fortress DR & Cleavestorm vulnerability
  }
  /** First drop under 30% HP this fight (lowHp cards), and 🌈 เงาปีศาจ under 50%. */
  private lowHpCheck() {
    if (!this.guardianUsed && this.hp > 0) {
      const gp = this.itemEffect('guardian_pulse')
      if (gp && this.fxReady('guardian_pulse') && this.hp <= this.st.maxHp * (gp.threshold ?? 0.35)) {
        this.guardianUsed = true
        this.armFxCd(gp)
        this.addShield(this.st.maxHp * gp.power)
        this.cleanseOne()
        this.callout('🛡️ ชีพจรพิทักษ์!', HERO_X + 110, GROUND - 150, '#9fe3ff')
      }
    }
    if (this.st.j3Inspire > 0 && !this.inspireUsed && this.hp > 0 && this.hp < this.st.maxHp * KIT3.common.inspireAt) { // ⚜️ ★ Inspiration / 🎭 Ranger Camouflage / 🪓 Warlord Bloodscent
      this.inspireUsed = true; this.inspire = KIT3.common.inspireTurns
      if (this.st.j3Wl > 0) this.gainRage(KIT3.warlord.ultRageGain)
      const label = this.st.j3Rn > 0 ? '🎭 พรางตัว!' : this.st.j3Wl > 0 ? '🦁 Bloodscent!' : this.st.j3Lk > 0 ? '⚔️ Parrying!' : this.st.j3Sk > 0 ? '🌑 Hide!' : this.st.j3Kp > 0 ? '🎩 Untouchable!' : this.st.j3Hw > 0 ? '🧱 Safety Wall!' : this.st.j3Mc > 0 ? '🛠️ Auto-Repair!' : '🦁 Inspiration!'
      this.callout(`${label} ${this.st.j3Rn > 0 || this.st.j3Sk > 0 ? 'หลบ' : 'บล็อก'} ${KIT3.common.inspireGuard * 100}% ${KIT3.common.inspireTurns} เทิร์น`, W / 2, 170)
    }
    if (!this.lowHpDone && this.hp < this.st.maxHp * PROC_RULES.lowHpAt) { this.lowHpDone = true; void this.procs('lowHp') }
    if (this.st.clEmergency > 0 && !this.clEmerUsed && this.hp < this.st.maxHp * KIT.clericTree.emergencyAt) { // v84 Priest ฉุกเฉิน (1 per wave)
      this.clEmerUsed = true; this.heal(this.st.maxHp * this.st.clEmergency)
      this.callout('🚑 ฮีลฉุกเฉิน!', HERO_X + 120, GROUND - 150, '#6fd08c')
    }
    if (this.immortal === 'demon' && !this.demonDone && this.hp < this.st.maxHp * IMMORTAL_RULES.demonAt) {
      this.demonDone = true; this.demonOn = true
      this.callout('😈 ร่างปีศาจ! ดาเมจ +50%', HERO_X + 120, GROUND - 160, '#ff6b9a')
      this.burst(HERO_X, GROUND - 40, 0x9a2a5a, 20, 200)
    }
  }

  /** Fire every owned card whose trigger is `on` (awaited by async battle hooks). Returns how many fired. */
  private async procs(on: Trigger, target?: Mon): Promise<number> {
    if (this.hp <= 0 || this.procDepth > 1 || !this.perks.length) return 0
    let fired = 0
    this.procDepth++
    try {
      for (const o of this.perks) {
        const p = o.def.proc
        if (!p) continue
        const i = Math.min(o.lv, 2) - 1
        if ((o.lv >= 2 && p.on2 ? p.on2 : p.on) !== on) continue
        if (on === 'every2' && this.fightTurns % 2) continue
        if (on === 'hits' && (!p.every || this.hits % p.every[i] !== 0)) continue
        if (p.chance && Math.random() >= p.chance[i]) continue
        if (await this.runFx(o.def, p, i, target)) { fired++; this.procHits[o.def.id] = (this.procHits[o.def.id] ?? 0) + 1 }
      }
    } finally { this.procDepth-- }
    return fired
  }

  /** Mana a Mage pays for a magic card effect (spec default: Mage still pays for card spells). */
  private procCost(fx: Effect, n: number) {
    if (this.job.id !== 'mage') return 0
    const R = PROC_RULES
    return fx === 'zap' ? R.mageZap * n : fx === 'fireball' || fx === 'firewave' || fx === 'icewave' ? R.mageFire * n : fx === 'icespike' ? R.mageIce * n : 0
  }

  private async runFx(def: PerkDef, p: Proc, i: number, target?: Mon): Promise<boolean> {
    const n = (p.count?.[i] ?? 1) + (def.id === 'stm_roar' ? this.st.boltHits : 0) // mage talent ลูกศิษย์สายฟ้า r2: Bolt +1 hit
    const amt = p.amt?.[i] ?? 0, pow = p.pow ?? PROC_POW[p.fx] ?? 1
    const hits = p.fx === 'zap' || p.fx === 'fireball' || p.fx === 'firewave' || p.fx === 'icespike' || p.fx === 'icewave' || p.fx === 'poison'
    if (hits && !this.alive().length) return false
    const cost = this.procCost(p.fx, n)
    if (cost > 0) { if (this.res < cost) return false; this.spendRes(cost) }
    const pickT = () => { if (target && !target.dead) return target; const l = this.alive(); return l.length ? l[Phaser.Math.Between(0, l.length - 1)] : undefined }
    switch (p.fx) {
      case 'zap': {
        this.zapTurn.clear()
        const runId = this.runId
        let bag: Mon[] = []
        for (let k = 0; k < n; k++) {
          if (runId !== this.runId || this.over || this.hp <= 0) break
          if (!this.alive().length) break
          if (k > 0) {
            await this.wait(PROC_RULES.zapDelayMs)
            if (runId !== this.runId || this.over || this.hp <= 0) break
          }
          const pick = nextZapTarget(this.alive(), bag, (max) => Phaser.Math.Between(0, max - 1))
          bag = pick.bag
          if (!pick.target) break
          this.withSrc('zap', () => this.zap(pick.target!, pow, '#fff08a'))
          sfx.hit()
        }
        break
      }
      case 'fireball':
        for (let k = 0; k < n; k++) {
          const t = pickT(); if (!t) break
          this.fireballFx(t)
          this.withSrc('fire', () => this.strike(t, pow, true, '#ff8c42'))
          this.addBurn(t, p.burn?.[i] ?? 1)
        }
        break
      case 'firewave':
        playPfx(this, 'fireTornado', 700, GROUND, { scale: 1.4, speed: 1.4 })
        for (let k = 0; k < n; k++) {
          this.burst(700, GROUND - 20, 0xff8c42, 18, 260)
          for (const m of this.alive()) { this.withSrc('fire', () => this.strike(m, pow, true, '#ff8c42')); this.addBurn(m, p.burn?.[i] ?? 1) }
        }
        break
      case 'icespike': {
        const t = pickT()
        if (t) {
          playPfx(this, 'iceLance', t.spr.x, t.spr.y - 30, { scale: 1.3, speed: 1.6 })
          this.iceHit(t, pow, false)
        }
        break
      }
      case 'icewave':
        playPfx(this, 'frostNova', 700, GROUND, { scale: 1.4, speed: 1.4 })
        this.burst(700, GROUND - 20, 0x9fe3ff, 16, 240)
        for (const m of this.alive()) this.iceHit(m, pow, !!p.freeze2 && i === 1)
        break
      case 'spear': this.spears += n; this.floatText(HERO_X + 30, GROUND - 170, `🔱 +${n}`, '#f6e27a'); break
      case 'poison': for (const m of target && !target.dead ? [target] : this.alive()) this.addPoison(m, n); break
      case 'shield': this.addShield(this.st.maxHp * amt); break
      case 'heal': this.heal(this.st.maxHp * amt); break
      case 'regen': this.lowRegen = { turns: PROC_RULES.regenTurns, amt }; this.floatText(HERO_X, GROUND - 150, `🌱 ฟื้น ${Math.round(amt * 100)}%/เทิร์น`, '#6fd08c'); break
      case 'res': { const left = this.resGain(amt); if (left > 0 && this.pk.wakeShield > 0) this.addShield(this.st.maxHp * this.pk.wakeShield * left); break } // ปลุกพลัง (v78: the share that didn't fit / Novice -> shield)
    }
    return true
  }

  /** ไฟลุก stacks (Mage fire ult system). Fire cards add at least ไฟสามชั้น's count; Hellfire turns them into ♨️ stacks. */
  private addBurn(m: Mon, stacks: number, fireCard = true) {
    if (m.dead || stacks <= 0) return
    const n = fireCard ? Math.max(stacks, this.pk.fireStacks) : stacks
    if (this.relic === 'hellfire') m.hell += n
    else { m.burnStacks = Math.min(this.burnMax(), m.burnStacks + n); m.burnStackTurns = PROC_RULES.burnTurns }
    this.dotIcon(m)
  }
  private addPoison(m: Mon, n: number) {
    if (m.dead || n <= 0) return
    const cap = this.poisonMax(), over = m.poison + n - cap
    m.poison = Math.min(cap, m.poison + n); m.poisonDmg = Math.max(m.poisonDmg, this.myPoisonDmg()); this.dotIcon(m)
    if (over > 0 && this.st.poisonOverflow > 0) { // 💥 Mobster พิษล้น: stacks over the cap burst at once
      const dmg = Math.max(1, Math.round(over * m.poisonDmg * KIT.poison.overflowMul * this.dotMul()))
      sfx.poisonOverflow()
      this.withSrc('poison', () => this.damageMon(m, dmg, false, '#c77dff', true))
    }
  }
  /** Ice spike: chill 2 turns; a chilled normal monster may freeze (10%, หนาวลึก higher); สัมผัสมรณะ may execute one under 30%. */
  private iceHit(m: Mon, pow: number, sureFreeze: boolean) {
    if (m.dead) return
    const wasChill = m.chill > 0, boss = m.def.ai === 'boss'
    if (!boss && this.pk.execute > 0 && m.hp < m.def.hp * 0.3 && Math.random() < this.pk.execute) {
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '☠️ ประหาร!', '#9fe3ff')
      this.withSrc('ice', () => this.damageMon(m, m.hp + m.shield, false, '#9fe3ff'))
      return
    }
    this.withSrc('ice', () => this.strike(m, pow, true, '#9fe3ff'))
    this.burst(m.spr.x, m.spr.y - 30, 0x9fe3ff, 6, 120)
    if (m.dead) return
    if (wasChill && !boss && !m.frozen && (sureFreeze || Math.random() < (this.pk.freeze || PROC_RULES.freezeBase))) {
      m.frozen = true; this.freezeCount++
      this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 20, 'แช่แข็ง!', '#9fe3ff')
    }
    m.chill = Math.max(m.chill, PROC_RULES.chillTurns + this.st.chillPlus + this.pk.chillExtra)
    if (!m.charging) m.spr.setTint(0x9fe3ff)
    this.dotIcon(m)
  }
  private fireballFx(m: Mon) {
    playPfx(this, 'fireball', m.spr.x, m.spr.y - 30, { scale: 1.3, speed: 1.6 })
    const b = this.add.image(HERO_X + 20, GROUND - 50, 'dot').setTint(0xff8c42).setScale(2.4).setDepth(9000)
    this.tweens.add({ targets: b, x: m.spr.x, y: m.spr.y - 30, duration: 200, onComplete: () => { b.destroy(); this.burst(m.spr.x, m.spr.y - 30, 0xff8c42, 10, 160) } })
  }

  // ---------- post-wave events v2 (logic: scenes/battle-events.ts, numbers: data/events.ts) ----------
  private async postWaveEvent() {
    await this.walk(500)
    await runPostWaveEvent(this.eventHost())
    await this.wait(500)
    await this.levelUps()
  }

  /** What the event handlers may touch: a narrow view of this scene. */
  private eventHost(): EventHost {
    const self = this
    return {
      tier: this.dg.tier, st: this.st, flags: this.flags,
      stat: (k: BaseStat) => totalBase(save())[k],
      hp: () => this.hp,
      zeny: () => this.zeny,
      nextIsWave: () => { const r = this.roomDef(this.room + 1); return !!r && !r.mini && !r.boss },
      miniPool: () => this.dg.rooms.find((r) => r.mini)?.miniPool ?? MINI_POOL,
      log: (id) => { this.eventLog.push(id) },
      forced: () => this.testEvent,
      choose: (p, o) => this.choose(p, o),
      roll: (label, chance) => this.rollCheck(label, chance),
      reveal: (text, color) => this.reveal(text, color),
      perks: (legend) => this.offerPerks(!!legend),
      immortal: () => this.immortal,
      grantImmortal: (id) => {
        if (this.immortal) return
        this.immortal = id
        if (id === 'demon') { const cut = Math.round(this.st.maxHp * IMMORTAL_RULES.demonHpCost); this.st.maxHp -= cut; this.hp = Math.min(this.hp, this.st.maxHp) }
        if (id === 'egg') this.eggDef = this.st.def
        this.callout(`🌈 พรอมตะ: ${IMMORTALS[id].icon} ${IMMORTALS[id].name}`, W / 2, 190)
        this.cameras.main.flash(260, 255, 220, 255); sfx.win()
      },
      applyMod: (mod) => this.applyMod(mod),
      heal: (share) => { this.heal(this.st.maxHp * share); this.burst(HERO_X, GROUND - 40, 0x6fd08c, 14, 140) },
      hurt: (share) => {
        const n = Math.min(this.hp - 1, Math.round(this.st.maxHp * share))
        if (n <= 0) return
        const hp0 = this.hp; this.hp -= n; this.logLoss('🎲 อีเวนต์', hp0); sfx.hurt()
        this.minHpPct = Math.min(this.minHpPct, this.hp / this.st.maxHp)
        this.damageNumber(HERO_X, GROUND - 70, n, false, '#ff7a7a')
      },
      gainZeny: (n) => { if (n > 0) this.coinsFly(HERO_X + 80, GROUND - 40, n) },
      spend: (n) => { this.zeny = Math.max(0, this.zeny - n); sfx.coin() },
      gainXp: (n) => { this.gainXp(n); this.runXp += n },
      gems: (n) => {
        const give = Math.max(0, Math.min(n, EVENT_RULES.gemCap - this.flags.gems))
        this.flags.gems += give; this.runGems += give
        return give
      },
      card: (kind) => {
        const pool = EQUIP_CARDS.filter((c) => (kind ? c.monster === kind : c.dungeon === this.dg.id))
        if (!pool.length) return undefined
        const cd = pool[Phaser.Math.Between(0, pool.length - 1)]
        this.runCards.push(cd.id); sfx.coin()
        return cardName(cd)
      },
      mat: (boss, n, dg) => {
        const id = matOf(dg ?? this.dg.id, boss)
        this.runMats[id] = (this.runMats[id] ?? 0) + n
        this.floatText(HERO_X + 60, GROUND - 120, `${matName(id)} +${n}`, '#e8d9a8')
      },
      fortune: () => save().fortune ?? 0,
      setFortune: (n) => { save().fortune = n; persist() },
      addFortune: (n, why) => {
        if (this.dg.tier < FORTUNE.minTier) return
        const s = save(), before = s.fortune ?? 0
        s.fortune = Math.min(FORTUNE.max, Math.round(before + n))
        if (s.fortune > before) this.floatText(W - 170, 70, `🍀 +${s.fortune - before}${why ? ` ${why}` : ''}`, '#8fe08a')
      },
      curse: (c: Curse) => this.addCurse(c),
      cleanse: () => {
        if (this.flags.curseHp > 0) { this.st.maxHp += this.flags.curseHp; this.hp += this.flags.curseHp }
        this.flags.curseHp = 0; this.flags.curseDmg = 0; this.flags.curses = []
        this.say('🕯️ ล้างคำสาปแล้ว!', '#9fe3ff')
      },
      shieldShare: (share) => { this.shield = Math.max(this.shield, Math.round(this.st.maxHp * share * shieldCutMul(this.st.thDefShieldCut))); this.floatText(HERO_X, GROUND - 100, `🛡️ โล่ ${this.shield}`, '#9fe3ff') },
      fight: (kind, o) => this.eventFight(kind, o),
      dayOpts: () => this.dayOpts(),
      nextMinis: () => { const r = this.roomDef(this.room + 1); return r?.mini ? r.miniPool ?? MINI_POOL : [] },
      rematchPool: () => this.rematchPool(),
      say: (text, color) => this.say(text, color),
      sound: (k) => { sfx[k]() },
      flash: (big) => {
        this.cameras.main.flash(big ? 450 : 200, 255, 230, 150)
        if (big) { this.burst(W / 2, H / 2, COLORS.gold, 40, 420, true); self.shake(250, 0.01) }
      },
    }
  }

  /** ☀️ which day events may roll after this room (data/events.ts DayOpts). Undefined outside day runs. */
  private dayOpts(): DayOpts | undefined {
    const r = this.roomDef(this.room), next = this.roomDef(this.room + 1), F = this.flags
    if (!r?.days || this.run.endless) return undefined
    let ahead = false
    for (let j = this.room + 1; ; j++) { const x = this.roomDef(j); if (!x || x.day !== r.day || x.boss) break; if (x.dayEnd) { ahead = true; break } }
    const nextEnd = !!next?.dayEnd
    return {
      bounty: nextEnd && !F.bounty,
      scout: nextEnd && !!next?.mini && (next.miniPool ?? MINI_POOL).length >= 2 && !F.nextMini,
      kafra: ahead && !F.deposit && !F.debt,
      oath: ahead && !F.oath,
      rematch: (r.day ?? 1) >= 2 && this.rematchPool().length > 0,
    }
  }
  /** ☀️ 👑 bosses of the dungeons before this one that the save has cleared. */
  private rematchPool(): { kind: MonsterKind; dg: string }[] {
    const s = save(), by = s.clearsBy ?? { d1: s.clears }, i = DUNGEONS.findIndex((d) => d.id === this.dg.id)
    return DUNGEONS.slice(0, Math.max(0, i)).filter((d) => (by[d.id] ?? 0) > 0).flatMap((d) => (d.rooms.find((r) => r.boss)?.spawn ?? []).map(([kind]) => ({ kind, dg: d.id })))
  }

  private say(text: string, color?: string) {
    this.callout(text, HERO_X + 120, GROUND - 150 - (this.sayN++ % 3) * 32, color)
  }

  private addCurse(c: Curse) {
    const R = EVENT_RULES
    this.flags.curses.push(c)
    if (c === 'frail') {
      const n = Math.round(this.st.maxHp * R.curseHpCut)
      this.st.maxHp -= n; this.hp = Math.max(1, Math.min(this.hp, this.st.maxHp)); this.flags.curseHp += n
      this.say(`💀 คำสาปร่างเปราะ: Max HP -${n}`, '#b48aff')
    } else {
      this.flags.curseDmg += R.curseMonDmg
      this.say(`💀 คำสาปถูกล่า: มอนตีแรง +${Math.round(R.curseMonDmg * 100)}%`, '#b48aff')
    }
    sfx.hurt()
  }

  /** Event ทางแยก: the elite wave was cleared. */
  private eliteReward() {
    this.flags.eliteReward = false
    const R = EVENT_RULES, t = this.dg.tier
    this.callout('🔥 ผ่านทางอันตรายได้! รางวัลก้อนโต', W / 2, 250)
    this.coinsFly(HERO_X + 80, GROUND - 40, Phaser.Math.Between(R.chestZeny[0] * t, R.chestZeny[1] * t) * R.forkZeny)
    const id = matOf(this.dg.id, false)
    this.runMats[id] = (this.runMats[id] ?? 0) + 1
    this.floatText(HERO_X + 60, GROUND - 120, `${matName(id)} +1`, '#e8d9a8')
  }

  /** Dice animation for a stat check. The bot runs time fast, so this stays short. */
  private async rollCheck(label: string, chance: number) {
    const need = Math.round(chance * 100), roll = Phaser.Math.Between(1, 100), ok = roll <= need
    const c = this.add.container(W / 2, H / 2 - 40).setDepth(31000)
    c.add(this.add.rectangle(0, 0, 360, 150, COLORS.night, 0.92).setStrokeStyle(3, COLORS.gold))
    c.add(this.add.text(0, -48, `🎲 ${label} · ต้องได้ ≤ ${need}`, { fontFamily: FONT_UI, fontSize: '18px', color: '#d8d4f0' }).setOrigin(0.5))
    const num = this.add.text(0, 6, '', { fontFamily: FONT_NUM, fontSize: '44px', color: '#f6eedc', stroke: '#14172b', strokeThickness: 6 }).setOrigin(0.5)
    c.add(num)
    for (let i = 0; i < 8; i++) { num.setText(`${Phaser.Math.Between(1, 100)}`); sfx.pop(); await this.wait(55) }
    num.setText(`${roll}`).setColor(ok ? '#8fe08a' : '#ff7a7a')
    c.add(this.add.text(0, 52, ok ? '✅ สำเร็จ!' : '❌ พลาด...', { fontFamily: FONT_UI, fontSize: '22px', fontStyle: 'bold', color: ok ? '#8fe08a' : '#ff7a7a' }).setOrigin(0.5))
    if (ok) sfx.win(); else sfx.hurt()
    await this.wait(650)
    c.destroy()
    return ok
  }

  private async reveal(text: string, color = '#f2b84b') {
    const t = this.add.text(W / 2, H / 2 - 40, text, { fontFamily: FONT_UI, fontSize: '44px', fontStyle: 'bold', color, stroke: '#14172b', strokeThickness: 8 }).setOrigin(0.5).setDepth(31000).setScale(0.6)
    sfx.door()
    await this.tween({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' })
    await this.wait(700)
    t.destroy()
  }

  /** An event fight: the hero can't drop below the floor (a loss costs at most eventFightLoss of max HP), and the
   *  monsters run once the hero has used `turns` turns. Not a wave: no turn log, no room heal, no game over. */
  private async eventFight(kind: MonsterKind, o: { hp?: number; dmg?: number; def?: number; mul?: { hp: number; dmg: number }; turns: number; tint?: number; alpha?: number; echo?: boolean }) {
    const id = this.runId, start = this.mons.length
    this.forceEcho = !!o.echo // ☀️ rematch: an old boss (and its summons) at this room's Lv
    try { return await this.eventFightRun(kind, o, id, start) } finally { this.forceEcho = false }
  }
  private async eventFightRun(kind: MonsterKind, o: { hp?: number; dmg?: number; def?: number; mul?: { hp: number; dmg: number }; turns: number; tint?: number; alpha?: number }, id: number, start: number) {
    const m = this.addMon(kind, 0)
    const base = m.def
    const hp = Math.round(o.hp ?? base.hp * (o.mul?.hp ?? 1)), dmg = o.dmg ?? base.dmg * (o.mul?.dmg ?? 1)
    m.def = { ...base, hp, dmg, def: o.def ?? base.def }; m.hp = hp
    if (o.tint) m.spr.setTint(o.tint)
    if (o.alpha) m.spr.setAlpha(o.alpha)
    this.banner(`${m.def.name}${m.def.title ? ` · ${m.def.title}` : ''}`, `มีเวลา ${o.turns} เทิร์น · แพ้ไม่ตาย เสีย HP ไม่เกิน ${Math.round(EVENT_RULES.eventFightLoss * 100)}%`)
    await this.wait(800)
    this.fightTurns = 0; this.timedOut = false; this.turnLimit = o.turns
    const floor = Math.max(1, Math.round(this.hp - this.st.maxHp * EVENT_RULES.eventFightLoss))
    this.hpFloor = floor
    const mine = () => this.mons.slice(start).filter((x) => !x.dead)
    while (mine().length && this.hp > this.hpFloor) {
      const a = this.nextActor()
      if (this.allies.length) { await this.allyTurns(); if (!mine().length) break }
      if (a.hero) {
        if (this.fightTurns >= this.turnLimit) break
        this.fightTurns++
        const left = this.turnLimit - this.fightTurns
        if (left === 2 || left === 1) this.callout(`⏳ อีก ${left} เทิร์นมันจะหนี!`, W / 2, 150)
        await this.heroTurn()
      } else await this.monTurn(a.m)
      if (id !== this.runId) { this.hpFloor = 0; return { won: false, share: 0 } }
      await this.levelUps()
      await this.wait(90)
    }
    this.hpFloor = 0
    this.hx = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0, web: 0, slow: 0, thorn: 0, venom: 0, venomTurns: 0 }; this.syncWeb()
    if (this.heroSpr.angle !== 0) { this.heroRig.resetPose() }
    const share = Math.min(1, 1 - Math.max(0, m.hp) / hp)
    const left = mine()
    if (!left.length) { await this.wait(400); return { won: true, share: 1 } }
    for (const x of left) {
      x.dead = true; x.dotTxt?.destroy(); x.dotTxt = undefined; this.monCastFx(x, false)
      this.tweens.add({ targets: [x.spr, x.shadow], x: W + 140, duration: 520, ease: 'Quad.easeIn', onComplete: () => this.removeMon(x) })
    }
    this.callout(this.hp <= floor ? '🤕 ไม่ไหวแล้ว... มันหนีไป' : '💨 มันหนีไปแล้ว!', W / 2, 200)
    await this.wait(700)
    return { won: false, share }
  }

  // ---------- Dungeon 3: mini boss mechanics + top-tier skills (data/relics.ts) ----------
  private lastHurt = 0
  /** พร v2: relic magic (Hellfire, Lightning Wrath) = magic power x the run's ATK buffs. */
  private magicPow() { return magicPower(this.st) * this.atkMul() }
  private atkMul() {
    return (this.relic === 'trinity' ? 1 + RELIC_RULES.trinity.atkPct : 1) * (1 + this.harvest * RELIC_RULES.harvest.perKill) * (this.buf.blood > 0 && this.st.s2Star ? 1 + S2N.bloodAtk : 1) * (this.buf.lootAtk > 0 ? 1 + KIT.thiefSteal.atk : 1) // 💰 ล้วงกระเป๋า loot
      * (this.hx.weaken > 0 ? BATTLE.weakenMul : 1) * (this.hx.thorn > 0 ? 1 - BATTLE.iceSkin.dmgCut : 1) * (this.relic === 'aegis' && this.shield > 0 ? 1 + RELIC_RULES.aegis.dmg : 1)
      * (1 + Math.min(this.pk.comboAtkCap, this.pk.comboAtk * this.comboAtkN)) * (1 + Math.min(this.pk.veteranCap, this.pk.veteran * this.fightTurns)) // legends เชี่ยวชาญคอมโบ / ทหารผ่านศึก
      * (1 + IMMORTAL_RULES.eggStep * this.eggN) // 🌈 ไข่ทองคำ
      * (this.st.j3Wl > 0 ? 1 + KIT3.warlord.carnageDmg : 1) // 🪓 Warlord Aspect of Carnage (+15% all damage)
  }

  /** Monster M.ATK (Q 2026-11-04): magic attacks use matk when the monster has one. */
  private monMatk(m: Mon) { return m.def.matk ?? m.def.dmg }

  /** Monster spell (MonSkill 'bolt'): a magic projectile = M.ATK x pow. Can't be fled; lucky dodge, shields and M.DEF work. */
  /** v49: a monster hit crits (def.crit; skills pass their skill crit rate): returns the damage multiplier and shows CRITICAL. */
  private monCrit(m: Mon, rate = m.def.crit ?? 0) {
    rate = monCritRate(rate, this.st.critShield) // Q 2026-11-21 "แบบ RO": hero LUK crit shield lowers every monster crit roll
    if (!rate || Math.random() >= rate) return 1
    this.floatText(HERO_X + 30, GROUND - 150, '💥 CRITICAL!', '#ff5a4e')
    this.monCritHit = true
    return Math.max(1, BATTLE.monCritMul * (1 - this.st.critDR)) // hero Crit DR (LUK / gear): a crit never hits softer than a normal hit
  }

  /** Q 2026-11-21: a monster skill hit rolls its own skill crit (MonsterDef.skillCrit, default 0 = never; battle-rules monSkillCritRate). */
  private monSkillCrit(m: Mon, sk: MonSkill) { return this.monCrit(m, monSkillCritRate(m.def, sk)) }

  private async monBolt(m: Mon, sk: MonSkill, mul = 1) { // mul: MON_CAST.steadyDmg on a steady cast release
    const fxColor = sk.fx?.burn ? 0xff6a2a : sk.fx?.freeze ? 0x9fe3ff : sk.fx?.poison ? 0x7fd04c : sk.name.includes('⚡') || sk.fx?.silence ? 0xfff07a : undefined
    const c = fxColor ?? m.def.slamColor ?? 0xb48aff
    const hits = sk.hits ?? 1
    let fxDone = false
    for (let i = 0; i < hits && this.hp > 0 && !m.dead; i++) {
      const b = this.add.image(m.spr.x - 20, m.spr.y - m.spr.displayHeight * 0.6 - (i % 2) * 30, 'dot').setTint(c).setScale(sk.big ? 3.4 : 2.6).setDepth(9000)
      await this.tween({ targets: b, x: HERO_X + 10, y: GROUND - 50, duration: hits > 1 ? 140 : 220, ease: 'Quad.easeIn' })
      b.destroy()
      this.burst(HERO_X, GROUND - 50, c, sk.big ? 18 : 12, 180, true)
      if (sk.big) this.shake(120, 0.008)
      const landed = this.hurtHero(this.skillHit(m, sk, true) * this.monMul(m) * this.monSkillCrit(m, sk) * mul, true, 999, m, `✦ ${sk.name}`)
      if (landed && sk.fx && !fxDone) { fxDone = true; this.applyFx(sk.fx, m) } // the debuff rides on the first hit that lands
    }
  }

  /** v49 physical skill: dash in and hit `hits` times at pow x ATK. Q 2026-11-21: each physical hit rolls Hit vs Flee even on a crit
   *  (same as a hero physical skill); a magic strike can't be fled. `mul` = MON_CAST.steadyDmg on a steady cast release (not the drain). */
  private async monStrike(m: Mon, sk: MonSkill, mul = 1) {
    const home = m.spr.x
    await this.tween({ targets: [m.spr, m.shadow], x: HERO_X + 70, duration: BATTLE.stepMs * 0.3, ease: 'Quad.easeIn' })
    let fxDone = false
    for (let i = 0; i < (sk.hits ?? 1) && this.hp > 0 && !m.dead; i++) {
      if (i) { this.tweens.add({ targets: m.spr, x: m.spr.x - 14, duration: 60, yoyo: true }); await this.wait(130) }
      const cr = this.monSkillCrit(m, sk)
      const alone = sk.alone && !this.alive().some((x) => x !== m) ? sk.alone : 1
      if (alone > 1 && i === 0) this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, `ไร้ศพข้างกาย! ×${alone}`, '#c9a8ff')
      const landed = this.hurtHero(this.skillHit(m, sk, false) * this.monMul(m) * cr * alone * mul, !!sk.magic, sk.magic ? 999 : m.def.hit ?? 15, m, `✦ ${sk.name}`)
      if (landed) { this.monLeech(m); if (sk.fx && !fxDone) { fxDone = true; this.applyFx(sk.fx, m) } }
    }
    if (sk.drain && this.hp > 0 && !m.dead) { // hunter ตะปบจุดตาย: drain the hero's blood as magic damage, heal by it
      const before = this.hp
      if (this.hurtHero(this.hp * sk.drain, true, 999, m, `🩸 ${sk.name} (ดูดเลือด)`)) { this.healMon(m, Math.max(0, before - this.hp)); this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '🩸 ดูดเลือด!', '#ff7a9a') }
    }
    await this.tween({ targets: [m.spr, m.shadow], x: home, duration: BATTLE.stepMs * 0.3, ease: 'Quad.easeOut' })
  }

  /** v49 monster counter: right after the hero's basic attack, the target may strike back (def.counter). */
  private async monCounter(m: Mon | undefined) {
    if (!m || m.dead || m.frozen || m.charging || !m.def.counter || this.hp <= 0 || Math.random() >= m.def.counter - this.st.ignoreCounter) return // hero Ignore Counter (DEX / gear)
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '↩️ สวนกลับ!', '#ff9a6a')
    this.tweens.add({ targets: m.spr, x: m.spr.x - 24, duration: 90, yoyo: true })
    await this.wait(150)
    const cr = this.monCrit(m)
    const landed = this.hurtHero((m.def.magic ? this.monMatk(m) : m.def.dmg) * BATTLE.monDmgMul * this.monMul(m) * BATTLE.monCounterMul * (1 - this.st.counterDR) * cr, !!m.def.magic, cr > 1 ? 999 : m.def.hit ?? 15, m, 'สวนกลับ')
    if (landed) this.monLeech(m)
  }

  /** Monster hit multiplier: Ice Age weakens it. */
  private monMul(m: Mon) {
    let k = m.iced ? 1 - RELIC_RULES.iceage.atkDown : 1
    if ((m.mSilence ?? 0) > 0 && this.st.swMuteWeak > 0) k *= 1 - this.st.swMuteWeak // 🛡️ ปิดปาก
    if ((this.swAwaken > 0 || this.rampage > 0) && this.st.swAwDr > 0) k *= 1 - this.st.swAwDr // 🛡️ ใจดาบ
    return k * m.dmgMul * (m.atkUpTurns > 0 ? 1 + m.atkUp : 1) * (m.weakTurns > 0 ? 1 - m.weakPct : 1) * ((m.disarm ?? 0) > 0 ? 1 - (m.disarmPct ?? 0) : 1) * (1 + this.flags.curseDmg) * (m.chill > 0 ? 1 - this.px('chillWeak') : 1) // card กัดเย็น
  }

  /** Heal cut on a monster: Hellfire 5%/stack (max 50%), otherwise 25% while any normal burn is on it · P2'b Blade's End: the bigger cut wins, never stacked. */
  private healCut(m: Mon) {
    const H = RELIC_RULES.hellfire
    const base = m.hell > 0 ? Math.min(H.cutMax, m.hell * H.cutPerStack) : m.burnTurns > 0 || m.burnStackTurns > 0 ? RELIC_RULES.burnCut : 0
    return Math.max(base, m.woundCutTurns > 0 ? m.woundCut : 0)
  }

  private healMon(m: Mon, n: number, quiet = false) {
    if (m.dead || n <= 0) return
    const cut = this.healCut(m)
    const got = Math.min(Math.ceil(m.def.hp - m.hp), Math.ceil(n * (1 - cut)))
    if (got <= 0) return
    m.hp += got
    if (!quiet || cut > 0) this.damageNumber(m.spr.x, m.spr.y - m.spr.displayHeight, got, false, '#6fd08c', true)
    if (cut > 0) this.floatText(m.spr.x + 40, m.spr.y - m.spr.displayHeight - 24, `ตัดฮีล ${Math.round(cut * 100)}%`, '#ff8c42')
  }

  /** Lifesteal monsters heal from the damage that just landed on the hero (pre-shield). */
  private monLeech(m: Mon, share?: number) {
    if (this.isBroken(m)) return // ⛓️ Break: no lifesteal
    let ls = share ?? m.def.lifesteal ?? 0
    if (m.def.mini === 'hunter' && share === undefined && m.hp < m.def.hp * BATTLE.frenzyAt) ls = BATTLE.frenzyLifesteal
    if (ls > 0 && this.lastHurt > 0) this.healMon(m, this.lastHurt * ls)
  }

  /** Duelist Riposte: a blocked hit comes back as 80% of itself, true damage, capped and never lethal (Q's reflect rule). */
  private riposteHit(m: Mon, dmg: number) {
    this.parryCount++
    this.slashFx(HERO_X + 40, GROUND - 50); sfx.door()
    const n = Math.min(Math.ceil(dmg * BATTLE.duel.ripostePct), Math.ceil(m.riposteLeft ?? 0)) // one stance answers at most riposteCap of max HP in total (multi-hit kits)
    if (n <= 0) return
    m.riposteLeft = (m.riposteLeft ?? 0) - n
    if (this.trueHurt(m, n, false) > 0) this.floatText(HERO_X, GROUND - 130, '🤺 โดนสวน!', '#ff7a7a')
  }

  /** Duelist true damage: ignores Flee / DEF / M.DEF; lucky dodge and shields still work. Returns HP lost. */
  private trueHurt(m: Mon, n: number, lethal: boolean, crit = false): number {
    n = Math.ceil(n)
    if (n <= 0 || this.hp <= 0) return 0
    if (this.dodgeCharges > 0) { this.dodgeCharges--; this.evadeJuice('เงาพริ้ว!', '#c9c9d6'); this.shadowDodged(); return 0 }
    if (this.hx.web <= 0 && Math.random() < this.st.luckyDodge) { this.evadeJuice('LUCKY!', '#6fd08c'); this.shadowDodged(); this.gamblerLucky('LUCKY!', m); return 0 }
    if (this.shield > 0) { const a = Math.min(Math.ceil(this.shield), n); this.shield = Math.max(0, this.shield - a); n -= a; if (n <= 0) { this.floatText(HERO_X, GROUND - 110, '🛡️ กันไว้', '#9fe3ff'); return 0 } }
    this.castBreak(n)
    const before = this.hp
    // Berserker ★ ไม่รู้สึกเจ็บ / Warlord อมตะคลั่ง: HP ค้างที่ 1 ตลอดสถานะ (ไม่ตก)
    const floor = this.ignorePainTurns > 0 || this.wlUndyingTurns > 0 ? 1 : this.hpFloor
    this.hp = lethal ? this.hp - n : Math.max(floor, 1, this.hp - n)
    if (lethal && this.hp <= 0 && floor > 0) this.hp = floor
    const lost = Math.max(0, before - Math.max(0, this.hp))
    this.minHpPct = Math.min(this.minHpPct, Math.max(0, this.hp) / this.st.maxHp)
    this.damageNumber(HERO_X, GROUND - 70, lost, crit, '#ffffff')
    this.cameras.main.shake(crit ? 140 : 80, crit ? 0.008 : 0.004)
    this.knockedOut()
    return lost
  }

  /** Duelist: damage dealt by her vital strikes heals her back over BATTLE.duel.healTurns of her turns. */
  private duelHealAdd(m: Mon, n: number) {
    if (n <= 0) return
    m.duelHeal = (m.duelHealTurns ? (m.duelHeal ?? 0) * m.duelHealTurns : 0) + n
    m.duelHealTurns = BATTLE.duel.healTurns
    m.duelHeal = m.duelHeal / m.duelHealTurns
  }

  /** Death Realm (Q 2026-11-04): the hero loses `n` points of every base stat this fight; derived stats move by the
   *  exact difference heroStats() gives for one point less of everything, and come back at the next fight. */
  private drained = 0
  private drainDelta?: Partial<Record<keyof Stats, number>>
  private deathRealm(m: Mon, n: number) {
    const s = save(), base = s.stats as Record<string, number>
    if (Object.values(base).some((v) => v - this.drained - n < 1)) return // never below 1
    if (!this.drainDelta) {
      const a = heroStats(s) as unknown as Record<string, number>
      const b = heroStats({ ...s, stats: Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v - 1])) as typeof s.stats }) as unknown as Record<string, number>
      this.drainDelta = Object.fromEntries(Object.keys(a).filter((k) => typeof a[k] === 'number' && a[k] !== b[k]).map((k) => [k, b[k] - a[k]])) as Partial<Record<keyof Stats, number>>
    }
    this.shiftStats(n)
    this.drained += n
    m.dmgMul += 0.01 * n
    this.floatText(HERO_X, GROUND - 160, `💀 Death Realm: All Stat -${n} (รวม -${this.drained})`, '#c9a8ff')
  }
  private shiftStats(n: number) {
    const st = this.st as unknown as Record<string, number>
    for (const [k, d] of Object.entries(this.drainDelta ?? {})) st[k] += (d as number) * n
    this.hp = Math.max(1, Math.min(this.hp, this.st.maxHp))
  }
  /** Venom Strike (Q 2026-11-04, venomqueen): a magic DoT that starts at venom.dmg (scaled like its M.ATK) and doubles every hero turn. */
  private matkScale(m: Mon) { const b = MONSTERS[m.kind]; return this.monMatk(m) / (b.matk ?? b.dmg) }
  private venomStrike(m: Mon) {
    const V = m.def.venom!
    if (this.hp <= 0) return
    const resistChance = Math.max(this.st.tenacity, this.st.debuffRes)
    if (this.relic === 'purify' || Math.random() < resistChance) { this.resistCount++; this.floatText(HERO_X - 40, GROUND - 160, '🕷️ ต้านทาน!', '#9fe3ff'); return }
    this.debuffCount++
    this.hx.venom = V.dmg * this.matkScale(m) * this.monMul(m); this.hx.venomTurns = V.turns
    this.floatText(HERO_X + 30, GROUND - 150, `🕷️ พิษทวีคูณ ${V.turns} เทิร์น`, '#9be35a')
  }
  /** พ่นใยมัดตัว: while webbed the hero's AGI counts BATTLE.web.agi; derived stats move by exactly what heroStats() gives. */
  private webOn = false
  private webDelta?: Partial<Record<keyof Stats, number>>
  private syncWeb() {
    const on = this.hx.web > 0
    if (on === this.webOn) return
    if (!this.webDelta) {
      const s = save()
      const a = heroStats(s) as unknown as Record<string, number>
      const b = heroStats({ ...s, stats: { ...s.stats, agi: Math.floor(s.stats.agi * BATTLE.web.agi) } }) as unknown as Record<string, number>
      this.webDelta = Object.fromEntries(Object.keys(a).filter((k) => typeof a[k] === 'number' && a[k] !== b[k]).map((k) => [k, b[k] - a[k]])) as Partial<Record<keyof Stats, number>>
    }
    const st = this.st as unknown as Record<string, number>
    for (const [k, d] of Object.entries(this.webDelta)) st[k] += (d as number) * (on ? 1 : -1)
    this.hp = Math.max(1, Math.min(this.hp, this.st.maxHp))
    this.webOn = on
  }
  /** v77 พรแสง: while blessed the hero's base stats get blessBase(); derived stats move by exactly what heroStats() gives (like syncWeb). */
  private blessOn = false
  private blessDelta?: Partial<Record<keyof Stats, number>>
  private syncBless() {
    const on = this.buf.bless > 0
    if (on === this.blessOn) return
    if (!this.blessDelta) {
      const s = save(), add = blessBase(s) ?? {}
      const a = heroStats(s) as unknown as Record<string, number>
      const b = heroStats({ ...s, tempBase: add }) as unknown as Record<string, number>
      this.blessDelta = Object.fromEntries(Object.keys(a).filter((k) => typeof a[k] === 'number' && a[k] !== b[k]).map((k) => [k, b[k] - a[k]])) as Partial<Record<keyof Stats, number>>
    }
    const st = this.st as unknown as Record<string, number>
    for (const [k, d] of Object.entries(this.blessDelta)) st[k] += (d as number) * (on ? 1 : -1)
    this.hp = Math.max(1, Math.min(this.hp, this.st.maxHp))
    this.blessOn = on
    if (!on) { this.kyrie = { hp: 0, hits: 0 }; this.floatText(HERO_X, GROUND - 150, '🔆 พรแสงหมด', '#c9c9d6') }
  }
  /** v119 💪 กางเขนหล่อกาย (Crusader): VIT stacks from Holy Cross; same delta trick as syncDawnWis. */
  private hcVit: { n: number; turns: number; amt: number; delta: Partial<Record<keyof Stats, number>> } = { n: 0, turns: 0, amt: 0, delta: {} }
  private syncHcVit(amt: number) {
    const h = this.hcVit
    if (amt === h.amt) return
    const st = this.st as unknown as Record<string, number>
    for (const [k, d] of Object.entries(h.delta)) st[k] -= d as number
    h.delta = {}
    if (amt > 0) {
      const s = save()
      const a = heroStats(s) as unknown as Record<string, number>
      const b = heroStats({ ...s, tempBase: { vit: amt } }) as unknown as Record<string, number>
      h.delta = Object.fromEntries(Object.keys(a).filter((k) => typeof a[k] === 'number' && a[k] !== b[k]).map((k) => [k, b[k] - a[k]])) as Partial<Record<keyof Stats, number>>
      for (const [k, d] of Object.entries(h.delta)) st[k] += d as number
    }
    this.hp = Math.max(1, Math.min(this.hp, this.st.maxHp))
    const was = h.amt
    h.amt = amt
    if (amt === 0 && was > 0) this.floatText(HERO_X, GROUND - 150, '💪 VIT กางเขนหมด', '#c9c9d6')
  }
  /** v102 ☀️ แสงแตก: WIS the buff adds right now (0 = off); derived stats move by exactly what heroStats() gives (like syncBless). */
  private dawnWisAmt = 0
  private dawnCount = 0 // v108 🌄 basic / combo hits since the last Dawn Light
  private dawnWisDelta: Partial<Record<keyof Stats, number>> = {}
  private syncDawnWis(amt: number) {
    if (amt === this.dawnWisAmt) return
    const st = this.st as unknown as Record<string, number>
    for (const [k, d] of Object.entries(this.dawnWisDelta)) st[k] -= d as number // take the old amount off
    this.dawnWisDelta = {}
    if (amt > 0) {
      const s = save()
      const a = heroStats(s) as unknown as Record<string, number>
      const b = heroStats({ ...s, tempBase: { wis: amt } }) as unknown as Record<string, number>
      this.dawnWisDelta = Object.fromEntries(Object.keys(a).filter((k) => typeof a[k] === 'number' && a[k] !== b[k]).map((k) => [k, b[k] - a[k]])) as Partial<Record<keyof Stats, number>>
      for (const [k, d] of Object.entries(this.dawnWisDelta)) st[k] += d as number
    }
    this.hp = Math.max(1, Math.min(this.hp, this.st.maxHp))
    const was = this.dawnWisAmt
    this.dawnWisAmt = amt
    if (amt === 0 && was > 0) this.floatText(HERO_X, GROUND - 150, '☀️ แสงแตกหมด', '#c9c9d6')
  }
  /** Remove the worst hero debuff (v77 พรแสง cleanse). */
  private cleanseOne(): boolean {
    const X = this.hx
    if (X.venomTurns > 0) { X.venomTurns = 0; X.venom = 0 }
    else if (X.poison > 0) X.poison = 0
    else if (X.burn > 0) X.burn = 0
    else if (X.silence > 0) X.silence = 0
    else if (X.web > 0) { X.web = 0; this.syncWeb() }
    else if (X.armorBreak > 0) X.armorBreak = 0
    else if (X.weaken > 0) X.weaken = 0
    else if (X.slow > 0) X.slow = 0
    else if (X.thorn > 0) X.thorn = 0
    else return false
    this.floatText(HERO_X, GROUND - 175, '🔆 ล้างดีบัฟ!', '#ffe08a')
    return true
  }
  private undrain() {
    if (!this.drained) return
    this.shiftStats(-this.drained)
    this.drained = 0
  }

  /** Drainer Summon Maiden (Q 2026-11-04): she calls a Maiden ghost with her max HP and M.ATK. */
  private summonMaiden(m: Mon) {
    m.maidenDone = true
    const slot = this.freeSlots()[0]
    if (slot === undefined) return
    const g = this.addMon('maiden', slot, 0)
    g.summoned = true
    g.def = { ...g.def, hp: m.def.hp, matk: m.def.matk ?? m.def.dmg, hit: m.def.hit }
    g.hp = g.def.hp
    g.spr.setTint(BATTLE.maiden.tint)
    m.maiden = g
    this.turnLimit += BATTLE.maiden.turns
    this.callout(`👻 ${m.def.name}: Summon Maiden! ดาเมจครึ่งหนึ่งส่งให้เมเดน · ตายก่อนเมเดนไม่ได้`, W / 2, 205, '#e0a8ff')
    this.cameras.main.flash(200, 200, 120, 255)
  }

  /** Gunner Bullet Time (Q 2026-11-04): under 25% HP she counts down 3 of her turns (still shooting), then fires 25 shots. */
  private async bulletTime(m: Mon): Promise<boolean> {
    const B = BATTLE.bulletTime, top = m.spr.y - m.spr.displayHeight - 10
    if (m.bulletDone || this.hp <= 0) return false
    if (m.bulletCd === undefined) {
      if (m.hp >= m.def.hp * B.at) return false
      m.bulletCd = B.countdown
      this.callout(`⏳ ${m.def.name}: Bullet Time! อีก ${B.countdown} เทิร์นจะระดมยิง ${B.hits} นัด`, W / 2, 205)
      m.spr.setTint(0xffc070)
      return false
    }
    if (--m.bulletCd > 0) { this.floatText(m.spr.x, top, `⏳ Bullet Time ${m.bulletCd}…`, '#ffc070'); return false }
    m.bulletDone = true; m.spr.clearTint()
    this.callout(`🔫 ${m.def.name}: BULLET TIME!!`, W / 2, 205)
    for (let i = 0; i < B.hits && this.hp > 0 && !m.dead; i++) {
      this.tweens.add({ targets: m.spr, x: m.spr.x + 6, duration: 30, yoyo: true })
      this.burst(HERO_X + Phaser.Math.Between(-10, 30), GROUND - Phaser.Math.Between(30, 90), 0xffc070, 3, 60)
      const cr = this.monCrit(m)
      this.hurtHero(m.def.dmg * BATTLE.monDmgMul * (1 + Phaser.Math.FloatBetween(B.bonusMin, B.bonusMax)) * this.monMul(m) * cr, false, cr > 1 ? 999 : m.def.hit ?? 15, m, '⏳ Bullet Time')
      await this.wait(70)
    }
    await this.wait(250)
    return true
  }

  /** Duelist turn script (before the normal attack). Returns true when the turn was used. */
  private async duelTurn(m: Mon): Promise<boolean> {
    const D = BATTLE.duel, top = m.spr.y - m.spr.displayHeight - 10
    if (m.espadaArmed) { // Grandado Espada: 4 crit thrusts at the marked vitals
      m.espadaArmed = false; m.spr.clearTint()
      this.callout(`⚔️ ${m.def.name}: กรันดาโด เอสปาดา!`, W / 2, 205)
      let got = 0
      for (let i = 0; i < D.espadaHits && this.hp > 0; i++) {
        this.tweens.add({ targets: m.spr, x: HERO_X + 70, duration: 90, yoyo: true })
        this.slashFx(HERO_X + 20 + i * 8, GROUND - 40 - i * 12)
        got += this.trueHurt(m, this.st.maxHp * Phaser.Math.FloatBetween(D.espadaMin, D.espadaMax), true, true)
        await this.wait(260)
      }
      this.duelHealAdd(m, got)
      return true
    }
    if (m.phase > 0 && m.turns >= (m.espadaNext ?? 0)) { // phase 2: open every vital point, immortal while marking
      m.espadaNext = m.turns + D.espadaEvery; m.espadaArmed = true
      m.spr.setTint(0xffe08a)
      this.floatText(m.spr.x, top, '✨ เปิดจุดตายทั้งหมด! (อมตะ · เทิร์นหน้าพุ่งแทง 4 ครั้ง)', '#ffe08a')
      await this.wait(BATTLE.stepMs); return true
    }
    if (m.turns % BATTLE.parryEvery === 0) { // Riposte stance instead of attacking
      m.parry = true; m.riposteLeft = this.st.maxHp * BATTLE.duel.riposteCap
      m.spr.setTint(0xc9e0ff)
      this.floatText(m.spr.x, top, '🤺 Riposte! อมตะ · ตีเข้ามาโดนสวน 80% (อย่าเพิ่งใช้ท่าไม้ตาย)', '#c9e0ff')
      await this.wait(BATTLE.stepMs); return true
    }
    if (m.turns % D.vitalEvery === 0) { // passive: vital-point thrust, true damage
      const src = this.roomDef(this.room)?.src ?? this.dg.id, lv = HARD.recLv[src] ?? 12
      this.tweens.add({ targets: m.spr, x: HERO_X + 70, duration: 140, yoyo: true })
      this.slashFx(HERO_X + 30, GROUND - 60)
      this.floatText(m.spr.x, top, '🎯 แทงจุดตาย! (ดาเมจจริง)', '#ffd27a')
      const got = this.trueHurt(m, this.st.maxHp * D.vitalPct + m.def.dmg * this.monMul(m) * lv * D.vitalLvMul, true)
      this.duelHealAdd(m, got)
      await this.wait(BATTLE.stepMs); return true
    }
    return false
  }

  /** Perfect Riposte skill: every Nth enemy attack is parried and countered. */
  private riposte(m: Mon) {
    if (this.relic !== 'riposte') return false
    if (++this.enemyAttacks % RELIC_RULES.riposte.every) return false
    this.counterCount++
    this.floatText(HERO_X, GROUND - 120, '🤺 ปัดป้อง!', '#c9e0ff')
    this.slashFx(m.spr.x - 20, GROUND - 40)
    this.withSrc('counter', () => this.strike(m, RELIC_RULES.riposte.mul, this.job.attack === 'magic', this.job.attack === 'magic' ? '#c9a8ff' : undefined))
    return true
  }

  private castIceAge() {
    const I = RELIC_RULES.iceage
    for (const m of this.alive()) { m.ice = I.turns; m.iceChance = I.freeze0; m.spr.setTint(0xcfefff); this.dotIcon(m) }
    this.cameras.main.flash(160, 190, 230, 255)
    this.callout('🧊 ยุคน้ำแข็ง!', W / 2, 150)
  }

  private async lightningWrath() {
    const S = RELIC_RULES.storm
    this.callout('🌩️ สายฟ้าพิโรธ!', W / 2, 150)
    this.cameras.main.flash(140, 200, 230, 255)
    for (let i = 0; i < S.bolts; i++) {
      const t = this.alive(); if (!t.length) break
      const m = t[Phaser.Math.Between(0, t.length - 1)]
      playPfx(this, 'zapYellow', m.spr.x + Phaser.Math.Between(-8, 8), GROUND, { scale: 1.25, speed: 1.9, flip: Math.random() < 0.5 })
      this.withSrc('zap', () => this.damageMon(m, Math.max(1, Math.round(this.magicPow() * Phaser.Math.FloatBetween(0.9, 1.1) * S.mul)), false, '#fff08a')) // magic: no crit (RO rule)
      sfx.hit()
      await this.wait(70)
    }
    this.shake(160, 0.01)
  }

  private harvestSoul() {
    const H = RELIC_RULES.harvest
    if (this.harvest < H.max / H.perKill) this.harvest++
    this.heal(this.st.maxHp * H.heal, true)
    this.floatText(HERO_X, GROUND - 140, `🐦‍⬛ วิญญาณ +${Math.round(this.harvest * H.perKill * 100)}%`, '#c9a8ff')
  }

  // ---------- Dungeon 4-5: monster skills, hero debuffs, boss phases (design/dungeon-4-5-brutal.md) ----------
  /** Puts a hit effect on the hero. Purify (relic) ignores all of it; debuffRes rolls once per effect. */
  private applyFx(fx: HitFx, src?: Mon) {
    if (this.hp <= 0) return
    const X = this.hx
    for (const k of Object.keys(fx) as (keyof HitFx)[]) {
      const v = fx[k]!
      if (!v) continue
      if (this.swGuard > 0 && (k === 'freeze' || k === 'silence' || k === 'web' || k === 'slow')) { this.floatText(HERO_X - 40, GROUND - 160, `🧘 ${FX_ICON[k]} กันได้`, '#9fd0ff'); continue } // ⚔️ ใจไม่หวั่น
      if (this.st.poise > 0 && (k === 'freeze' || k === 'silence')) { this.floatText(HERO_X - 40, GROUND - 160, `🧘 ${FX_ICON[k]} กันได้`, '#ff6b7a'); continue } // v78 Poise
      const resistChance = Math.max(this.st.tenacity, this.st.debuffRes)
      if (this.relic === 'purify' || Math.random() < resistChance) { this.resistCount++; this.floatText(HERO_X - 40, GROUND - 160, `${FX_ICON[k]} ต้านทาน!`, '#9fe3ff'); continue }
      this.debuffCount++
      if (k === 'poison') X.poison = Math.min(BATTLE.poisonCap, X.poison + v)
      else if (k === 'freeze') {
        const lost = v * (1 - this.st.tenacity)
        this.heroGauge = Math.max(-150, this.heroGauge - lost)
        this.floatText(HERO_X, GROUND - 150, '❄️ แข็ง! เสียเทิร์น', '#9fe3ff')
        this.heroRig.flashTint(0x9fe3ff, 500)
      } else X[k] = Math.max(X[k], v)
      if (k !== 'freeze' && src) this.floatText(HERO_X + 30, GROUND - 150, `${FX_ICON[k]} ${({ poison: 'พิษ', burn: 'ไฟลุก', weaken: 'อ่อนแรง', armorBreak: 'เกราะแตก', silence: 'ใบ้', web: 'โดนใยมัด! หลบไม่ได้ AGI -50%', slow: 'Frozen Heart! ATK Speed -50%' } as Record<string, string>)[k]}`, '#ffb0e0')
    }
    this.syncWeb()
  }

  /** Poison / burn tick on the hero: shields soak it, it can't be dodged, and it can knock the hero out. */
  private dotHurt(dmg: number, icon: string, color: string) {
    let n = Math.max(1, Math.ceil(dmg))
    if (this.shield > 0) { const a = Math.min(Math.ceil(this.shield), n); this.shield = Math.max(0, this.shield - a); n -= a; if (n <= 0) return }
    const hp0 = this.hp
    // Berserker ★ ไม่รู้สึกเจ็บ / Warlord อมตะคลั่ง: DoT ก็ไม่ตก HP < 1
    const floor = this.ignorePainTurns > 0 || this.wlUndyingTurns > 0 ? 1 : this.hpFloor
    this.hp = Math.max(floor, this.hp - n) // v85: a poison / burn tick never breaks a chant
    this.logLoss(`${icon} DoT`, hp0) // v120 combat log (before a revive can lift HP back)
    if (this.hp > 0) this.lowHpCheck()
    this.minHpPct = Math.min(this.minHpPct, this.hp / this.st.maxHp)
    this.damageNumber(HERO_X, GROUND - 70, n, false, color)
    this.floatText(HERO_X - 30, GROUND - 120, icon, color)
    this.knockedOut()
  }

  /** Reflected damage from a mirror monster: magic, never misses. Thorn Aura halves it. */
  private reflectHurt(m: Mon, dmg: number) {
    let n = Math.ceil(dmg * (1 - this.st.mdef * (this.hx.armorBreak > 0 ? BATTLE.armorBreakMul : 1)) * (this.relic === 'thornaura' ? 1 - RELIC_RULES.thornaura.reflectCut : 1))
    n = Math.min(n, Math.ceil(this.st.maxHp * BATTLE.reflectCap)) // Q 2026-11-04: one reflected hit is capped, so big burst can't one-shot you
    if (n <= 0) return
    if (this.shield > 0) { const a = Math.min(Math.ceil(this.shield), n); this.shield = Math.max(0, this.shield - a); n -= a; if (n <= 0) return }
    this.hp = Math.max(this.hpFloor, 1, this.hp - n) // reflect alone never knocks the hero out
    this.minHpPct = Math.min(this.minHpPct, this.hp / this.st.maxHp)
    this.damageNumber(HERO_X, GROUND - 70, n, false, '#c9e0ff')
    if (Math.random() < 0.3) this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 30, '🔁 สะท้อน!', '#c9e0ff')
    this.knockedOut()
  }

  /** Shared knock-out check for damage that skips hurtHero (Phoenix revive still works). */
  private knockedOut() {
    if (this.ignorePainTurns > 0 || this.wlUndyingTurns > 0) { this.hp = Math.max(1, this.hp); return }
    if (this.hp > 0 || this.holyRevive()) return
    // Berserker ★ ไม่รู้สึกเจ็บ: โดนดาเมจถึงตาย → เลือดค้างที่ 1 HP ไม่ตาย 3 เทิร์น
    if (this.st.j2IgnorePain > 0 && !this.ignorePainUsed && this.job.resource === 'rage') {
      this.ignorePainUsed = true
      this.hp = 1
      this.ignorePainTurns = KIT2.berserker.ignorePainTurns
      this.ignorePainDmg = 0
      this.ignorePainRegenTurns = 0
      this.ignorePainRegenPerTurn = 0
      ignorePainFx(this, HERO_X, GROUND)
      this.callout('👹 ไม่รู้สึกเจ็บ! อมตะ 3 เทิร์น', HERO_X + 120, GROUND - 150, '#ff4444')
      return
    }
    if (this.st.revive > 0) {
      this.st.revive--; this.revivedCount++
      this.hp = Math.round(this.st.maxHp * Math.max(BATTLE.reviveHp, this.st.reviveHp))
      this.callout('🍃 ขนนกฟีนิกซ์! ลุกขึ้นอีกครั้ง', HERO_X + 120, GROUND - 150)
      return
    }
    sfx.die(); this.heroRig.setKnockedOut(true); this.tweens.add({ targets: this.heroSpr, angle: -90, alpha: 0.6, duration: 400 })
  }

  /** Free formation slots for adds (bosses stand in the back, so only the two front slots then). */
  private freeSlots() {
    const live = this.alive()
    const used = new Set(live.filter((x) => x.def.ai !== 'boss').map((x) => x.slot))
    const max = live.some((x) => x.def.ai === 'boss') ? 2 : SLOT_X.length
    return [...Array(max).keys()].filter((i) => !used.has(i))
  }

  private summonAdds(kind: MonsterKind, n: number) {
    const free = this.freeSlots().slice(0, n)
    for (const sl of free) this.addMon(kind, sl, 0).summoned = true // adds start at gauge 0: one breath to react
    return free.length
  }

  /** v68: a skill's pow x the caster's scaling stat (mon-stats skillMul; 1 for a monster without stats). */
  private skPow(m: Mon, sk: MonSkill, dflt: number) { return (sk.pow ?? dflt) * skillMul(m.def, scaleOf(sk)) }
  /** v124: one bolt / strike hit before crit / alone / buffs: the skill's formula (MonSkill.f) if it has one, else ATK (bolt: M.ATK) x pow. */
  private skillHit(m: Mon, sk: MonSkill, spell: boolean): number {
    if (sk.f) return formulaDamage(sk.f, sk.lv ?? 1, casterOf(m.def), { maxHp: this.st.maxHp, hp: this.hp })
    return (spell ? this.monMatk(m) : m.def.dmg) * BATTLE.monDmgMul * this.skPow(m, sk, 1.3)
  }

  /** A skill instead of an attack, on every `every`-th turn when it has a use. Returns true if one was used. */
  private async useSkill(m: Mon) {
    if (m.kit && m.heroKit && await this.useHeroSkill(m, m.heroKit, m.kit)) return true // v125 hero skills first
    let dry: MonSkill | undefined
    for (const raw of m.skills) {
      if (m.turns % raw.every) continue
      const { picked, sk } = this.monSkillOf(m, raw)
      if (m.mp && !canPay(m.mp, sk)) { dry ??= sk; continue } // Q 2026-11-23: no mana, no skill (the next one in its list may still fit)
      // Q 2026-11-21: a boss / mini boss casts (ร่าย) its strong magic skills first; the cadence counted here, the release skips it
      if (m.def.ai === 'boss' && monSkillCasts(picked, POW_DEFAULT[picked.kind])) { if (m.mp) payMana(m.mp, sk); await this.startMonCast(m, sk); return true }
      if (await this.fireMonSkill(m, sk)) { if (m.mp) payMana(m.mp, sk); return true }
    }
    if (dry) this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10, `💧 มานาไม่พอ (${dry.name})`, '#7fb4ff')
    return false
  }

  /** The skill a raw entry casts now: one of `pick` at random (spell rotation), at its skill Lv. `picked` = before levelling. */
  private monSkillOf(m: Mon, raw: MonSkill, lvBonus = true): { picked: MonSkill; sk: MonSkill } {
    const picked = raw.pick ? raw.pick[Phaser.Math.Between(0, raw.pick.length - 1)] : raw // spell rotation
    return { picked, sk: skillAtLv(picked, castLv(picked.lv ?? raw.lv ?? 1, lvBonus ? skillLvBonus(m.kind, m.def.lv ?? 1, m.def) : 0)) } // v81 skill Lv (RO style over-level ok) · v124 + 1 per 10 monster Lv
  }

  /** v125: one monster skill (or one step of a hero skill). Returns true when it had a use and happened. */
  private async castMonSkill(m: Mon, raw: MonSkill, lvBonus = true): Promise<boolean> { return this.fireMonSkill(m, this.monSkillOf(m, raw, lvBonus).sk) }

  /** A resolved monster skill goes off (also a released skill cast; `mul` = MON_CAST.steadyDmg on a steady cast's bolt / strike hits). */
  private async fireMonSkill(m: Mon, sk: MonSkill, mul = 1): Promise<boolean> {
    if (sk.big) { this.callout(`${m.def.name}: ${sk.name}!`, W / 2, 190, '#ff7ad0'); this.cameras.main.flash(220, 200, 80, 255); await this.wait(350) }
    const allies = this.alive()
    let done = false
    if (sk.kind === 'heal') {
      const t = sk.self ? m : allies.filter((a) => a.hp < a.def.hp * 0.8).sort((a, b) => a.hp / a.def.hp - b.hp / b.def.hp)[0]
      if (t && t.hp < t.def.hp * 0.8) { this.healMon(t, t.def.hp * this.skPow(m, sk, 0.15)); done = true }
    } else if (sk.kind === 'shield') {
      for (const t of sk.self ? [m] : allies) { t.shield = Math.max(t.shield, Math.round(t.def.hp * this.skPow(m, sk, 0.1))); this.dotIcon(t) }
      done = true
    } else if (sk.kind === 'warcry') {
      if (sk.self) { m.atkUp += this.skPow(m, sk, 0.2); m.atkUpTurns = sk.turns ?? 3 }
      else for (const t of allies) { t.atkUp = Math.max(t.atkUp, this.skPow(m, sk, 0.2)); t.atkUpTurns = Math.max(t.atkUpTurns, (sk.turns ?? 3) + (t === m ? 1 : 0)); this.dotIcon(t) }
      this.dotIcon(m); done = true
    } else if (sk.kind === 'haste') { for (const t of allies) if (t !== m) t.gauge += this.skPow(m, sk, 30); done = true }
    else if (sk.kind === 'curse' && sk.fx) { this.applyFx(sk.fx, m); done = true }
    else if (sk.kind === 'bolt') { await this.monBolt(m, sk, mul); done = true }
    else if (sk.kind === 'strike') { await this.monStrike(m, sk, mul); done = true }
    else if (sk.kind === 'summon' && sk.summon) done = this.summonAdds(sk.summon[0], sk.summon[1]) > 0
    else if (sk.kind === 'revive') {
      const corpse = this.mons.slice(this.roomStart).find((x) => x.dead && !x.revived && x.def.ai !== 'boss' && x !== m)
      const slot = this.freeSlots()[0]
      if (corpse && slot !== undefined) {
        corpse.revived = true
        const r = this.addMon(corpse.kind, slot, 0)
        r.revived = true; r.hp = Math.round(r.def.hp * Math.min(1, this.skPow(m, sk, 0.5)))
        done = true
      }
    }
    if (!done) return false
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 10, `✦ ${sk.name}`, sk.kind === 'curse' || sk.kind === 'bolt' || sk.kind === 'strike' ? '#ffb0e0' : '#b0ffc8')
    this.tweens.add({ targets: m.spr, scaleY: m.spr.scaleY * 1.12, duration: 140, yoyo: true })
    this.burst(m.spr.x, m.spr.y - 40, sk.kind === 'curse' || sk.kind === 'bolt' || sk.kind === 'strike' ? 0xc03070 : 0x6fd08c, 12, 140)
    await this.wait(BATTLE.stepMs)
    return true
  }

  /** v125 (Q 2026-11-17): a hero skill from the monster's kit (battle/hero-skill-engine.ts picks it, its steps cast as monster skills). */
  private async useHeroSkill(m: Mon, kit: HeroKit, st: KitState): Promise<boolean> {
    const live = this.alive()
    const ctx: KitCtx = {
      turn: m.turns, selfHp: m.hp / m.def.hp, selfShield: m.shield > 0, selfBuffed: m.atkUpTurns > 0,
      lowestHp: Math.min(1, ...live.map((a) => a.hp / a.def.hp)), heroHp: this.hp / this.st.maxHp,
      heroFx: { poison: this.hx.poison, burn: this.hx.burn, weaken: this.hx.weaken, armorBreak: this.hx.armorBreak, silence: this.hx.silence, web: this.hx.web, slow: this.hx.slow },
    }
    const id = chooseHeroSkill(kit, st, ctx)
    if (!id) return false
    const e = HERO_SKILL_BOOK[id]
    this.floatText(m.spr.x, m.spr.y - m.spr.displayHeight - 34, `🧬 ${e.icon} ${e.name}`, '#7fe3c4')
    let cast = false
    for (const step of heroSkillSteps(id, kit.lv)) {
      if (m.dead || this.hp <= 0) break
      if (await this.castMonSkill(m, step, kit.lvBonus !== false)) cast = true
    }
    if (cast) spendKit(st, kit, id)
    return cast
  }

  /** Boss phase: heal / shield / adds on entering, then faster, harder, new tricks. */
  private enterPhase(m: Mon, p: BossPhase) {
    if (p.drainStats) m.drainStats = p.drainStats
    this.callout(`⚠️ ${m.def.name}: ${p.name}`, W / 2, 190)
    this.cameras.main.flash(200, 255, 80, 80)
    this.shake(220, 0.012)
    sfx.slam()
    this.tweens.add({ targets: m.spr, scaleX: m.spr.scaleX * 1.15, scaleY: m.spr.scaleY * 1.15, duration: 180, yoyo: true })
    if (p.cleanse) { m.burn = 0; m.burnTurns = 0; m.burnStacks = 0; m.burnStackTurns = 0; m.poison = 0; m.chill = 0; m.frozen = false }
    if (p.speed) m.speedMul *= p.speed
    if (p.dmg) m.dmgMul *= p.dmg
    if (p.chargeEvery) m.chargeEvery = p.chargeEvery
    if (p.reflect !== undefined) m.reflect = p.reflect
    if (p.absorb !== undefined) m.absorb = p.absorb
    if (p.skills) m.skills = p.skills
    if (p.onHit) m.onHit = p.onHit
    if (p.slamFx) m.slamFx = p.slamFx
    if (p.heal) this.healMon(m, m.def.hp * p.heal)
    if (p.shield) m.shield = Math.max(m.shield, Math.round(m.def.hp * p.shield))
    if (m.mp) regenMana(m.mp, m.mp.maxMana * MON_MANA.phaseRefill) // a new phase opens with a mana surge
    if (p.summon) this.summonAdds(p.summon[0], p.summon[1])
    this.dotIcon(m)
  }

  /** After the duel: pick 1 of 3 top-tier skills (the mini boss's two + one random). */
  private async offerRelic(catchUp = false) {
    const sig = MINI_RELICS[this.miniKind ?? 'duelist'] ?? ['trinity', 'storm']
    const can = (r: RelicId) => { const n = RELICS[r].needs; return !n || this.perks.some((o) => o.def.line === n) } // transforms need a card of their line
    const rest = (Object.keys(RELICS) as RelicId[]).filter((r) => !sig.includes(r) && can(r))
    let ids: RelicId[] = [...sig, rest[Phaser.Math.Between(0, rest.length - 1)]]
    if (this.testRelic) ids = [this.testRelic, ...ids.filter((x) => x !== this.testRelic)].slice(0, 3) // bot hook
    sfx.win(); this.cameras.main.flash(220, 255, 230, 150)
    const c = await this.choose({ name: '🔴 พรเทพ!', icon: '👑', desc: `${catchUp ? 'พรเทพที่ถือมาตอนผ่านจุดนี้' : `ชนะ ${MONSTERS[this.miniKind ?? 'duelist'].name}!`} เลือกพรเทพ 1 อย่าง ติดตัวจนจบรอบนี้ (มีได้ 1 ใบต่อรอบ)`, rare: true },
      ids.map((r) => ({ label: `${RELICS[r].icon} ${RELICS[r].name}`, sub: RELICS[r].desc })))
    const r = ids[c]
    this.relic = r
    if (r === 'trinity') {
      const T = RELIC_RULES.trinity
      this.applyMod({ crit: T.crit, critMul: T.critMul, combo: T.combo, counter: T.counter })
      this.st.combo = Math.min(COMBO.rateCap, this.st.combo); this.st.counter = Math.min(COMBO.rateCap, this.st.counter)
    }
    if (r === 'bloodpact') { this.st.lifesteal = Math.min(0.4, this.st.lifesteal + RELIC_RULES.bloodpact.lifesteal) } // Q 2026-11-04: cap stays 40% even with the pact
    if (r === 'haste') this.smashCdLeft = Math.max(0, this.smashCdLeft - RELIC_RULES.haste.cd)
    if (r === 'asura') { const A = RELIC_RULES.asura; this.applyMod({ crit: A.crit, critMul: A.critMul }); this.st.resRegenCut += A.regenCut; this.st.rageGain -= A.regenCut } // ร่างอสุรา
    this.callout(`👑 ${RELICS[r].icon} ${RELICS[r].name}`, W / 2, 190)
    await this.wait(400)
  }

  /** Event panel: icon, name, text and 1-3 option buttons. Resolves with the picked index. */
  private choose(ev: Panel, opts: Opt[]) {
    return new Promise<number>((done) => {
      this.time.paused = true
      const c = this.add.container(0, 0).setDepth(30000)
      c.add(this.add.rectangle(W / 2, H / 2, W, H, COLORS.night, 0.78).setInteractive())
      const jp = ev.tier === 'jackpot', wide = opts.length > 3
      const box = this.add.rectangle(W / 2, H / 2, wide ? 860 : 620, 400, jp ? 0x4a1f3a : ev.rare ? 0x3a2f1a : 0x22284a, 0.96).setStrokeStyle(jp ? 6 : 4, jp ? 0xff8cc6 : ev.rare ? COLORS.gold : 0x5a5f8a)
      c.add(box)
      c.add(this.add.text(W / 2, H / 2 - 150, ev.icon, { fontSize: '52px' }).setOrigin(0.5))
      c.add(this.add.text(W / 2, H / 2 - 98, ev.name, { fontFamily: FONT_UI, fontSize: '28px', fontStyle: 'bold', color: jp ? '#ffd86b' : ev.rare ? '#f2b84b' : '#f6eedc' }).setOrigin(0.5))
      c.add(this.add.text(W / 2, H / 2 - 64, ev.desc, { fontFamily: FONT_UI, fontSize: '16px', color: '#a9a6c7', align: 'center', wordWrap: { width: 560 } }).setOrigin(0.5, 0))
      const keys: string[] = []
      const finish = (i: number) => {
        if (!c.active || !opts[i] || opts[i].off) return
        keys.forEach((k) => this.input.keyboard!.removeAllListeners(k))
        this.pendingPick = undefined
        c.destroy()
        this.time.paused = false
        done(i)
      }
      const bw = opts.length === 1 ? 300 : opts.length === 2 ? 270 : opts.length === 3 ? 186 : 196, gap = 14
      const x0 = W / 2 - ((opts.length - 1) * (bw + gap)) / 2
      opts.forEach((o, i) => {
        const x = x0 + i * (bw + gap), y = H / 2 + 70
        const b = button(this, x, y, bw, 70, o.label, () => finish(i), { size: 17, fill: o.off ? 0x4a4e6e : COLORS.gold, color: o.off ? '#8a87a8' : undefined })
        c.add(b)
        c.add(this.add.text(x, y + 50, o.sub, { fontFamily: FONT_UI, fontSize: '13px', color: o.off ? '#8a87a8' : '#d8d4f0', align: 'center', wordWrap: { width: bw } }).setOrigin(0.5, 0))
        const k = `keydown-${['ONE', 'TWO', 'THREE', 'FOUR'][i]}`
        keys.push(k)
        this.input.keyboard!.on(k, () => finish(i))
      })
      this.pendingPick = finish
    })
  }

  // ---------- smash / pause / speed ----------
  private queueSmash() {
    if (this.over || this.paused) return
    this.smashQueued = !this.smashQueued
    if (this.smashQueued) sfx.pop()
    else if (this.autoUlt) this.autoSkip = true // auto mode: a cancel holds the ult for this turn
  }

  // ---------- v55 auto ult ----------
  /** save.autoUlt: 'auto' (default) books the ult by itself, 'manual' waits for the button. */
  private autoUlt = true
  private autoSkip = false // player cancelled a booked ult in auto mode: skip one auto decision
  private ultHeld = 0 // hero turns the ready ult has been held for timing
  /** Same timing rule the bot (tools/bot.cjs) uses, plus a hold cap so a ready ult is never sat on for long:
   *  boss with a charged attack -> wait for the charge (max 3 turns); duelist -> not into her parry;
   *  trash almost dead -> hold 1 turn so the ult is not wasted; everything else -> cast now. */
  autoUltWant(): boolean {
    const live = this.alive()
    if (!live.length) return false
    const boss = live.find((m) => m.def.ai === 'boss')
    if (boss) {
      if (boss.charging) return true
      if (boss.def.mini === 'duelist') return !(boss.parry || boss.espadaArmed) || this.ultHeld >= 2
      if (boss.def.mini && !boss.def.charge) return true
      return this.ultHeld >= 3
    }
    if (live.every((m) => m.hp <= m.def.hp * 0.2)) return this.ultHeld >= 1
    return true
  }

  private autoUltTurn() {
    if (!this.autoUlt || this.smashQueued || this.smashCdLeft > 0 || this.asuraExhaust > 0) { if (this.smashCdLeft > 0) this.ultHeld = 0; return }
    if (this.j2?.id === 'monk' && this.st.j2Asura > 0 && this.charges < KIT2.monk.asuraMinAt) return
    if (this.autoSkip) { this.autoSkip = false; return }
    if (this.autoUltWant()) { this.smashQueued = true; this.ultHeld = 0 } else this.ultHeld++
  }

  private setAutoUlt(on: boolean) {
    this.autoUlt = on
    const s = save(); s.autoUlt = on ? 'auto' : 'manual'; persist()
    this.autoBtn?.setLabel(on ? '⚡ อัตโนมัติ' : '🖐️ กดเอง')
    if (on) this.clearBookings() // auto fires everything itself: no stale gold rings
  }

  private setFast(on: boolean) {
    this.fast = on
    this.stopToken++ // a running hit-stop must not restore the old speed
    this.time.timeScale = on ? 2 : 1
    this.tweens.timeScale = on ? 2 : 1
    this.speedBtn.setLabel(on ? '▶▶ x2' : '▶ x1')
  }

  private showPause() {
    if (this.pauseOpen) { this.unpause(); return } // Esc again = resume
    if (this.over || this.paused || this.overlay) return
    this.paused = true
    this.time.paused = true
    this.tweens.pauseAll()
    const rows = derivedRows(this.st, this.job.id, this.j2?.id)
    rows[0] = ['HP', `${Math.round(this.hp)} / ${Math.round(this.st.maxHp)}`]
    const perks = this.perks.map((o) => {
      const p = o.def, line = LINES[p.line], up = o.lv >= 2 && p.max === 2, leg = p.rarity === 'legend', gen = p.line === 'common'
      return {
        icon: p.icon, name: p.name, badge: up ? '+' : o.lv > 1 ? `x${o.lv}` : '', color: line.color, legend: leg,
        tag: gen ? 'พรทั่วไป' : `${leg ? '🟠 ตำนาน · ' : ''}${line.icon} สาย${line.name}`,
        desc: perkDesc(p.desc[up ? 1 : 0] || p.desc[0], this.job.ult),
      }
    })
    const ex: PauseExtra[] = []
    if (this.relic) { const r = RELICS[this.relic]; ex.push({ icon: r.icon, name: r.name, desc: r.desc, color: '#f2b84b' }) }
    if (this.immortal) { const im = IMMORTALS[this.immortal]; ex.push({ icon: `🌈${im.icon}`, name: im.name, desc: im.desc, color: '#9fe3ff' }) }
    const f = this.flags
    if (f.clover) ex.push({ icon: '🍀', name: 'แจ็กพอต', desc: 'อีเวนต์ต่อจากนี้เป็นแบบหายาก · เช็คทุกครั้ง +20%', color: '#8fe08a' })
    if (f.allLegend) ex.push({ icon: '🌠', name: '777', desc: 'เลือกพร 1 ใน 3 ครั้งต่อ ๆ ไปเป็นพรตำนานทั้งหมด', color: '#ffd86b' })
    for (const c of f.curses) ex.push(c === 'frail'
      ? { icon: '💀', name: 'ร่างเปราะ', desc: `คำสาป: Max HP -${f.curseHp} (ล้างได้ที่อีเวนต์ 🕯️)`, color: '#b48aff' }
      : { icon: '💀', name: 'ถูกล่า', desc: `คำสาป: มอนตีแรง +${Math.round(f.curseDmg * 100)}% (ล้างได้ที่อีเวนต์ 🕯️)`, color: '#b48aff' })
    if (this.run.modeId === 'rift') {
      for (const bid of save().riftRun?.boons ?? []) {
        const b = riftBoonById(bid)
        if (b) ex.push({ icon: b.icon, name: b.name, desc: b.desc, color: '#9fe3ff' })
      }
    }
    this.overlay = openPauseMenu(this, {
      title: 'พักเกม',
      sub: `${this.job.icon} ${this.job.name} Lv ${this.level} · ${this.run.where(this.room)} · 💰 ${this.zeny} · ⚔️ ${this.kills} ตัว`,
      stats: rows, build: this.buildText(), perks, extras: ex,
      autoLabel: () => (this.autoUlt ? '⚡ ทักษะ: อัตโนมัติ' : '🖐️ ทักษะ: กดเอง (จองก่อนใช้)'),
      onToggleAuto: () => this.setAutoUlt(!this.autoUlt),
      onResume: () => this.unpause(),
      onLeave: () => { this.unpause(); this.runId++; this.settle(false); go(this, 'hub') },
    })
    this.pauseOpen = true
  }

  private unpause() {
    this.overlay?.destroy(); this.overlay = undefined
    this.pauseOpen = false
    this.paused = false
    this.time.paused = false
    this.tweens.resumeAll()
  }

  // ---------- results ----------
  private settle(won: boolean, died = false): string {
    if (this.settled) return ''
    this.settled = true
    const s = save()
    if (this.hard) { // hard mode: zeny / account EXP / forge mats scaled up (in-run EXP stays normal)
      const k = HARD.reward * (this.hardK.hp / HARD_POWER.target) ** HARD.rewardPow
      this.zeny = Math.round(this.zeny * k); this.runXp = Math.round(this.runXp * k)
      for (const id of Object.keys(this.runMats)) this.runMats[id] = Math.ceil(this.runMats[id] * HARD.mats)
      const ck = this.run.corrupt?.reward ?? 1 // D6+ corruption: every penalty pays (data/corruptions.ts)
      if (ck !== 1) { this.zeny = Math.round(this.zeny * ck); this.runXp = Math.round(this.runXp * ck); for (const id of Object.keys(this.runMats)) this.runMats[id] = Math.ceil(this.runMats[id] * ck) }
      if (this.hell) { // 😈 hell mode pays on top of hard
        this.zeny = Math.round(this.zeny * HELL_MODE.reward); this.runXp = Math.round(this.runXp * HELL_MODE.reward)
        for (const id of Object.keys(this.runMats)) this.runMats[id] = Math.ceil(this.runMats[id] * HELL_MODE.mats)
        this.hellOverLv = hellXpMul(this.dg, s.baseLevel) < 1 // v129 😈 D1-D5: a hero above the Hell band banks 1% EXP
        if (this.hellOverLv) this.runXp = Math.round(this.runXp * HELL_MODE.overLvXp)
      }
    }
    this.zeny = Math.round(this.zeny * this.run.mut.zenyMul) // daily mutators · v128: no level / Hero Power drop cut any more (Q 2026-11-19)
    const dxx = this.run.modeId === 'dungeon' || this.run.modeId === 'hard', xpFull = this.runXp
    this.runXp = bankedRunXp(this.runXp, won, dxx) // 💀 lost Dxx run: Base / Job EXP x RULES.failXpMul (zeny / loot unchanged)
    const mode = MODES[this.run.modeId].reward(s, this.run, { won, left: this.leftTower, floor: this.towerFloor, from: Math.max(0, (this.modeArgs.startFloor ?? 1) - 1), bank: this.bank })
    if (mode) { this.zeny += mode.zeny; for (const [id, n] of Object.entries(mode.mats)) this.runMats[id] = (this.runMats[id] ?? 0) + n }
    s.zeny += this.zeny
    if (this.run.modeId === 'dungeon' && this.dg.id === 'd1') s.bestRoom = Math.max(s.bestRoom, this.room + (won ? 1 : 0))
    let gems = mode?.gems ?? 0
    if (mode?.fortune) s.fortune = Math.min(FORTUNE.max, (s.fortune ?? 0) + mode.fortune)
    if (won && !mode) {
      const by = this.hell ? (s.hellClearsBy ??= {}) : this.hard ? (s.hardClearsBy ??= {}) : (s.clearsBy ??= { d1: s.clears }) // 😈 own record: the first hell clear pays first-clear gems
      gems += (by[this.dg.id] ?? 0) === 0 ? FREE_GEMS.firstClear : FREE_GEMS.clear // first hard clear also pays the first-clear gems
      by[this.dg.id] = (by[this.dg.id] ?? 0) + 1
      s.clears++
    }
    const trial = won ? trialWin(s, this.dg.id, this.hard) : undefined // ⚔️ Master Trial (design/awakening-crusader-v1.md §3)
    const before = s.gems
    const lv0 = { base: s.baseLevel, job: s.jobLevel, job2: s.job2Level ?? 1, job3: s.job3Level ?? 1 }
    const ups = addXp(this.runXp)
    const hellLoss = this.hell && died ? loseXp(RULES.hellDeathBase, RULES.hellDeathJob) : null // 😈 v128: dying in hell costs 5% Base / 10% Job of the current bar
    track({ e: 'run_end', mode: this.hell ? 'hell' : this.run.modeId, dungeon: this.dg.id, won, room: this.room, zeny: this.zeny, xp: this.runXp })
    if (won) ftue('run1_win')
    if (won && this.run.modeId === 'dungeon' && this.dg.id === 'd1') ftue('d1_clear')
    if (s.baseLevel > lv0.base) track({ e: 'level_up', kind: 'base', level: s.baseLevel })
    if (s.jobLevel > lv0.job) track({ e: 'level_up', kind: 'job', level: s.jobLevel })
    if ((s.job2Level ?? 1) > lv0.job2) track({ e: 'level_up', kind: 'job2', level: s.job2Level ?? 1 })
    if ((s.job3Level ?? 1) > lv0.job3) track({ e: 'level_up', kind: 'job3', level: s.job3Level ?? 1 })
    s.gems += gems + this.runGems
    for (const id of this.runCards) addCard(s, id)
    for (const [id, n] of Object.entries(this.runMats)) addMat(s, id, n)
    for (const id of this.runUniques) if (!s.owned.includes(id)) s.owned.push(id) // v88: one copy per id
    for (const [id, n] of Object.entries(this.runDupeMats)) addMat(s, id, n)
    persist()
    const uniq = [
      ...this.runUniques.map((id) => `💎✨ ได้ของยูนีค! ${itemById(id).icon} ${itemById(id).name} (ใส่ได้ที่หน้าตัวละคร · ใส่พร้อมกันได้ ${UNIQUE.maxEquipped} ชิ้น)${splitStatLine(itemById(id)).curse ? `\n💀 คำสาป: ${splitStatLine(itemById(id)).curse}` : ''}`),
      ...Object.entries(this.runDupeMats).map(([id, n]) => `💎 ของยูนีคซ้ำ → ได้วัตถุดิบแทน ${matName(id)} x${n}`),
    ]
    const lines = [...uniq, ...(mode?.lines ?? []), `+${this.zeny} zeny · +${this.runXp} EXP${s.gems > before ? ` · +${s.gems - before} เพชร` : ''}`]
    if (this.runXp < xpFull) lines.push(`💀 ล้มเหลว: ได้ EXP แค่ ${Math.round(RULES.failXpMul * 100)}% (เต็ม ${xpFull}) · zeny กับของได้ครบ`)
    if (this.hellOverLv) lines.push(`😈 Lv เกินนรกดันนี้ (มอนสูงสุด Lv${hellLvCap(this.dg)}): ได้ EXP แค่ ${Math.round(HELL_MODE.overLvXp * 100)}%`)
    if (hellLoss) lines.push(`😈 ตายในนรก: เสีย Base EXP ${hellLoss.base} · Job EXP ${hellLoss.job} (${Math.round(RULES.hellDeathBase * 100)}% / ${Math.round(RULES.hellDeathJob * 100)}% ของหลอด · ไม่ลดเลเวล)`)
    if (ups.base) lines.push(`🎉 Base Lv ${s.baseLevel}! ได้แต้มสถานะเพิ่ม`)
    if (ups.job) lines.push(jobUpText(s, ups.job))
    if (trial) lines.unshift(`⚔️ ผ่าน Master Trial! ตื่นรู้เป็น ${JOB3[trial].icon} ${JOB3[trial].name} ได้ที่ 🏠 เมือง › อาชีพ`)
    const pin = pinnedReady(s) // v99 📌 pinned forge recipe
    if (pin) lines.push(`📌 ตี ${pin.icon} ${pin.name} ได้แล้ว! ไปที่ 🔨 โรงตีเหล็ก › 📜 สูตร`)
    if (this.runCards.length) { // grouped + capped: a long tower run can find dozens
      const n = new Map<string, number>()
      for (const id of this.runCards) n.set(id, (n.get(id) ?? 0) + 1)
      const all = [...n].map(([id, k]) => `${cardName(cardById(id)!)}${k > 1 ? ` x${k}` : ''}`), show = all.slice(0, 6)
      lines.push(`🃏 ได้การ์ด ${this.runCards.length} ใบ: ${show.join(', ')}${all.length > show.length ? ` และอีก ${all.length - show.length} แบบ` : ''} (ใส่ได้ที่หน้าตัวละคร)`)
    }
    const mats = Object.entries(this.runMats)
    if (mats.length) lines.push(`🔨 วัตถุดิบ: ${mats.map(([id, n]) => `${matName(id)} x${n}`).join(', ')} (ใช้ที่โรงตีเหล็ก)`)
    return lines.join('\n')
  }

  private buildText() {
    const r = this.relic ? `${RELICS[this.relic].icon}${RELICS[this.relic].name}  ` : ''
    const f = this.flags, ev = `${f.clover ? '🍀' : ''}${f.allLegend ? '🌠' : ''}${f.curses.length ? `💀${f.curses.length}` : ''}`
    const im = this.immortal ? `🌈${IMMORTALS[this.immortal].icon}  ` : ''
    const n = new Map<Line, number>(), leg = this.perks.filter((o) => o.def.rarity === 'legend').length
    for (const o of this.perks) if (o.def.line !== 'common') n.set(o.def.line, (n.get(o.def.line) ?? 0) + Math.min(o.lv, 2))
    return (ev ? ev + '  ' : '') + r + im + (leg ? `🟠${leg} ` : '') + [...n].map(([l, k]) => `${LINES[l].icon}${k}`).join(' ')
  }

  /** v120: the run's last hits + what scaled them, saved for later reading (death recap, 📋 copy, `nthDeaths()` in the console). */
  private deathRec(): DeathRec {
    const s = save(), st = this.st, pp = this.run.pp
    return {
      at: new Date().toISOString(), mode: this.run.modeId + (this.hell ? ' hell' : this.hard ? ' hard' : ''), where: this.run.where(this.room), floor: this.roomDef(this.room)?.floor ?? 0,
      reason: this.timedOut ? 'timeout' : 'dead',
      hero: { job: this.job.id, job2: this.j2?.id, lv: this.level, baseLv: s.baseLevel, power: pp.power, offense: pp.offense, survival: pp.survival,
        maxHp: st.maxHp, def: st.def, mdef: st.mdef, guard: st.guard, flee: st.flee, luckyDodge: st.luckyDodge, autoGuard: st.j2Guard, critDR: st.critDR, critShield: st.critShield },
      affixes: this.aff.defs.map((a) => `${a.icon}${a.name}`), fightTurns: this.fightTurns, enrage: this.enrageCount, hits: [...this.clog.hits],
    }
  }
  private copyDeathLog(d: DeathRec) {
    const text = deathText(d)
    console.info(text)
    const ok = () => toast(this, '📋 คัดลอก combat log แล้ว'), fail = () => toast(this, '📋 คัดลอกไม่ได้ · เปิด console พิมพ์ nthDeaths()', '#ff9a9a')
    try { void navigator.clipboard.writeText(text).then(ok, fail) } catch { fail() }
  }

  private showGameOver() {
    const rewards = this.settle(false, !this.timedOut)
    const d = this.deathRec()
    saveDeath(d)
    const recap = this.timedOut ? [] : recapLines(d)
    this.panel([
      { text: this.timedOut ? 'หมดเวลา!' : 'ล้มแล้ว...', size: 44, color: '#ff7a7a', bold: true },
      ...(this.timedOut ? [{ text: `เกิน ${this.turnLimit} เทิร์นในการสู้ครั้งนี้ · ลองเพิ่มดาเมจ (ATK, คริ, พรสายโจมตี) ดูนะคะ`, size: 16, color: '#ffb0b0' }] : []),
      { text: `${this.run.where(this.room)} · ล้มมอนไป ${this.kills} ตัว`, size: 19 },
      ...(recap.length ? [{ text: `☠️ ${recap.length} hit สุดท้าย:\n${recap.join('\n')}`, size: 14, color: '#ffb3a8' }] : []),
      { text: rewards, size: 19, color: '#f2b84b' },
      { text: 'ของที่เก็บมาไม่หาย! ลองซื้ออาวุธหรือลงแต้มสถานะที่เมือง แล้วมาใหม่นะ', size: 16, color: '#a9a6c7' },
    ], 'ลองอีกครั้ง', () => { void this.startRun() }, { label: 'กลับเมือง', onGo: () => go(this, 'hub') }, { label: '📋 log', onGo: () => this.copyDeathLog(d) })
  }

  /** Tower / Rift: bank this floor's loot, then climb on (true) or leave / extract (false). */
  private async floorCleared(f: number): Promise<boolean> {
    this.towerFloor = f
    if (this.run.modeId === 'rift') {
      const s = save()
      if (!s.riftRun) {
        s.riftRun = {
          seed: String(this.modeArgs.seed ?? this.run.seed ?? 'rift'),
          depth: f,
          daily: this.run.riftDaily,
          boons: [],
          curses: [],
          bankZeny: 0,
          bankMats: {},
          startedAt: Date.now(),
        }
      }
      const rRun = s.riftRun
      const loot = riftFloorLoot(f)
      this.bank.zeny += loot.zeny
      for (const [id, n] of Object.entries(loot.mats)) this.bank.mats[id] = (this.bank.mats[id] ?? 0) + n
      rRun.depth = f
      rRun.bankZeny = this.bank.zeny
      rRun.bankMats = { ...this.bank.mats }
      persist()
      this.callout(`🌀 ผ่าน Rift ชั้น ${f}! คลังรางวัล +${loot.zeny} zeny`, W / 2, 190)
      await this.wait(500)
      if (this.autoTower !== undefined) return f < this.autoTower // bot hook
      const mats = Object.entries(this.bank.mats).map(([id, n]) => `${matName(id)} x${n}`).join(', ')
      const branches: RiftBranchDef[] = Object.values(RIFT_BRANCHES)
      const branchOpts = branches.map((b) => ({
        label: `${b.icon} ${b.name}`,
        sub: `${b.desc} (รางวัล x${b.rewardMul.toFixed(2)})`,
      }))
      branchOpts.push({
        label: '🚪 ถอนตัวเก็บของเต็ม (Safe Extract)',
        sub: 'เก็บรางวัลในคลังครบ 100% และจบการสำรวจ Rift',
      })
      const pickIdx = await this.choose(
        {
          name: `🌀 ผ่าน Rift ชั้น ${f}!`,
          icon: '🌀',
          desc: `คลังรางวัล Rift: ${this.bank.zeny} zeny${mats ? ` · ${mats}` : ''}\nเลือกเส้นทางชั้นถัดไป หรือถอนตัวเพื่อรับของเต็มจำนวน`,
        },
        branchOpts,
      )
      if (pickIdx >= branches.length) {
        persist()
        return false
      }
      const chosenBranch = branches[pickIdx]
      const branchRes = applyRiftBranchChoice(rRun, chosenBranch.id, undefined, f + 1)
      if (branchRes.healFrac > 0) this.heal(this.st.maxHp * branchRes.healFrac)
      if (branchRes.rewardMul > 1) {
        const bonusZeny = Math.round(loot.zeny * (branchRes.rewardMul - 1))
        this.bank.zeny += bonusZeny
        for (const [id, n] of Object.entries(loot.mats)) {
          const add = Math.max(0, Math.round(n * (branchRes.rewardMul - 1)))
          if (add > 0) this.bank.mats[id] = (this.bank.mats[id] ?? 0) + add
        }
        rRun.bankZeny = this.bank.zeny
        rRun.bankMats = { ...this.bank.mats }
      }
      if (branchRes.addedCurse) {
        const mDef = mutatorById(branchRes.addedCurse)
        if (mDef && !this.run.mutators.some((x) => x.id === mDef.id)) {
          this.run.mutators.push(mDef)
          this.run.mut = foldMutators(this.run.mutators)
        }
      }
      if (branchRes.boonChoices.length > 0) {
        const bIdx = await this.choose(
          {
            name: '🌟 เลือกพรแห่งรอยแยก (Rift Boon)',
            icon: '🌟',
            desc: 'เลือกพร 1 อย่าง ติดตัวตลอดการสำรวจ Rift รอบนี้',
          },
          branchRes.boonChoices.map((b) => ({ label: `${b.icon} ${b.name}`, sub: b.desc })),
        )
        const pickedBoon = branchRes.boonChoices[Math.min(bIdx, branchRes.boonChoices.length - 1)]
        if (pickedBoon && !rRun.boons.includes(pickedBoon.id)) {
          rRun.boons.push(pickedBoon.id)
          if (pickedBoon.stats) this.applyMod(pickedBoon.stats)
        }
      }
      persist()
      return true
    }
    if (this.run.modeId === 'tower' && recordTowerCheckpoint(save(), f, this.level, !!this.relic)) persist() // v87/v90: keeps the MAX level seen at this checkpoint across runs; relic is sticky (true once any run held one)
    const loot = towerFloorLoot(f, save().baseLevel, this.roomDef(this.room) ?? undefined)
    this.bank.zeny += loot.zeny
    for (const [id, n] of Object.entries(loot.mats)) this.bank.mats[id] = (this.bank.mats[id] ?? 0) + n
    this.callout(`🗼 ผ่านชั้น ${f}! คลังรางวัล +${loot.zeny} zeny`, W / 2, 190)
    await this.wait(500)
    if (this.autoTower !== undefined) return f < this.autoTower // bot hook
    const next = f + 1, kind = next % 10 === 0 ? ' · ⚔️ ดวลต่อเนื่อง' : next % 5 === 0 ? ' · 👹 บอส' : ''
    const mats = Object.entries(this.bank.mats).map(([id, n]) => `${matName(id)} x${n}`).join(', ')
    const c = await this.choose({ name: `ผ่านชั้น ${f} แล้ว!`, icon: '🗼', desc: `คลังรางวัลชั้น: ${this.bank.zeny} zeny${mats ? ` · ${mats}` : ''}\nออกตอนนี้ได้ครบ · ล้มชั้นถัดไปได้แค่ครึ่ง` },
      [{ label: `⬆️ ขึ้นชั้น ${next}${kind}`, sub: 'มอนแกร่งขึ้นทุกชั้น' }, { label: '🏘️ กลับเมือง', sub: 'เก็บรางวัลชั้นครบ 100%' }])
    return c === 0
  }

  private showTowerLeave() {
    this.leftTower = true
    const rewards = this.settle(true)
    const isRift = this.run.modeId === 'rift'
    this.panel([
      { text: isRift ? `🌀 ถอนตัวจาก Rift ชั้น ${this.towerFloor}!` : `🗼 ไต่ได้ถึงชั้น ${this.towerFloor}!`, size: 44, color: '#f2b84b', bold: true },
      { text: `${this.kills} ตัว · HP เหลือ ${this.hp} · build: ${this.buildText() || '-'} · Lv ${this.level}`, size: 17, color: '#a9a6c7' },
      { text: rewards, size: 19, color: '#f2b84b' },
    ], isRift ? 'ลุย Rift ใหม่' : 'ไต่ใหม่', () => { void this.startRun() }, { label: 'กลับเมือง', onGo: () => go(this, 'hub') })
  }

  private showWin() {
    const secs = Math.round((this.time.now - this.startedAt) / 1000)
    const rewards = this.settle(true)
    this.panel([
      { text: this.hell ? '😈 เคลียร์โหมดนรกแล้ว!' : this.hard ? '🔥 เคลียร์โหมดยากแล้ว!' : this.run.modeId === 'bounty' ? '🎯 พิชิตค่าหัวสัปดาห์นี้!' : this.run.modeId === 'daily' ? '🎲 ผ่านท้าทายรายวัน!' : 'เคลียร์ดันแล้ว!', size: 44, color: '#f2b84b', bold: true },
      { text: `ล้ม${this.dg.boss}ได้ใน ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} นาที · ${this.kills} ตัว · HP เหลือ ${this.hp}`, size: 19 },
      { text: rewards, size: 19, color: '#f2b84b' },
      { text: `build: ${this.buildText() || '-'} · Lv ${this.level}`, size: 16, color: '#a9a6c7' },
    ], 'ลุยอีกรอบ', () => { void this.startRun() }, { label: 'กลับเมือง', onGo: () => go(this, 'hub') })
  }

  private panel(lines: { text: string; size: number; color?: string; bold?: boolean }[], label: string, onGo: () => void, alt: { label: string; onGo: () => void }, extra?: { label: string; onGo: () => void }) {
    this.overlay?.destroy()
    const c = this.add.container(W / 2, H / 2).setDepth(30000)
    c.add(this.add.rectangle(0, 0, W, H, COLORS.night, 0.82).setInteractive())
    // Long results (a deep tower run: many cards / mats / level-ups) must never push the buttons off screen (Q bug 2026-11-04):
    // every line wraps, and the whole block shrinks until text + buttons fit.
    const BTN = 90, room = H - 24
    let texts: Phaser.GameObjects.Text[] = []
    for (let k = 1; ; k *= 0.88) {
      texts.forEach((t) => t.destroy())
      texts = lines.map((l) => this.add.text(0, 0, l.text, { fontFamily: FONT_UI, fontSize: `${Math.max(11, Math.round(l.size * k))}px`, fontStyle: l.bold ? 'bold' : 'normal', color: l.color ?? '#f6eedc', align: 'center', lineSpacing: Math.round(6 * k), wordWrap: { width: W - 90, useAdvancedWrap: true } }).setOrigin(0.5, 0))
      const gap = Math.round(12 * k), total = texts.reduce((a, t) => a + t.height + gap, 0) + BTN
      if (total <= room || k < 0.45) {
        let y = Math.max(-H / 2 + 12, -total / 2)
        for (const t of texts) { t.setY(y); c.add(t); y += t.height + gap }
        y = Math.min(y, H / 2 - BTN) // buttons always on screen
        c.add(button(this, 140, y + 34, 240, 56, label, () => onGo(), { size: 22 }))
        c.add(button(this, -140, y + 34, 240, 56, alt.label, () => alt.onGo(), { size: 22, fill: 0x5a5f8a, color: '#f6eedc' }))
        break
      }
    }
    if (extra) c.add(button(this, W / 2 - 70, -H / 2 + 36, 120, 44, extra.label, () => extra.onGo(), { size: 16, fill: 0x2a2e50, color: '#f6eedc' })) // v120 top-right, never pushes the layout
    this.overlay = c
  }

  // ---------- HUD ----------
  private buildHud() {
    this.hud = this.add.graphics().setDepth(15000)
    const t = (x: number, y: number, size: number, color = '#f6eedc', font = FONT_NUM) =>
      this.add.text(x, y, '', { fontFamily: font, fontSize: `${size}px`, color, stroke: '#14172b', strokeThickness: 4 }).setDepth(15001)
    this.hudTxt = {
      hp: t(179, 23, 14).setOrigin(0.5), res: t(179, 42, 11).setOrigin(0.5).setStroke('#14172b', 3), lv: t(36, 63, 12, '#14172b').setOrigin(0.5).setStroke('#14172b', 0).setFontStyle('bold'),
      zeny: t(W - 20, 12, 20, '#f2b84b').setOrigin(1, 0), room: t(W / 2, 20, 15, '#f6eedc', FONT_UI).setOrigin(0.5), affix: t(W / 2, 99, 13, '#ffd0a0', FONT_UI).setOrigin(0.5),
      hazard: t(W / 2, 118, 12, '#f6eedc', FONT_UI).setOrigin(0.5),
      qSpeed: t(W / 2, 79, 11, '#9fe3ff', FONT_UI).setOrigin(0.5),
      hitsHud: t(20, H - 27, 13, '#ffe08a', FONT_UI).setOrigin(0, 0.5),
    }
    this.portrait = this.add.image(36, 34, 'novice').setDepth(15001)
    this.coinImg = this.add.image(W - 70, 25, 'coin').setDepth(15001).setScale(1.2)
    this.chipViews = []; this.chipNames = []; this.chipSig = ''; this.stageTxt = ''; this.affixTxt = ''; this.qSpeedTxt = ''; this.hitsHudTxt = ''; this.floatRecent = []; this.pauseOpen = false
    this.chipTip = this.add.text(12, 0, '', { fontFamily: FONT_UI, fontSize: '13px', fontStyle: 'bold', color: '#f6eedc', backgroundColor: '#0f1226', padding: { x: 6, y: 3 } }).setDepth(15005).setVisible(false)
    fullscreenButton(this, W - 30, 66)
    button(this, W - 30, 110, 38, 38, 'II', () => this.showPause(), { size: 16, fill: 0x2a2e50, color: '#f6eedc' }).setDepth(15003)
    this.speedBtn = button(this, W - 90, 110, 70, 38, '▶ x1', () => this.setFast(!this.fast), { size: 15, fill: 0x2a2e50, color: '#f6eedc' }).setDepth(15003) as Btn
    this.smashBtn = button(this, W - 100, H - 70, 160, 84, 'ทุบ!', () => this.queueSmash(), { size: 22 }).setDepth(15003) as Btn
    this.autoBtn = button(this, W - 250, H - 50, 124, 44, '', () => this.setAutoUlt(!this.autoUlt), { size: 15, fill: 0x2a2e50, color: '#f6eedc' }).setDepth(15003) as Btn
    this.autoBtn.setLabel(this.autoUlt ? '⚡ อัตโนมัติ' : '🖐️ กดเอง')
    this.fortuneTxt = this.add.text(W - 250, 34, '', { fontFamily: FONT_UI, fontSize: '14px', color: '#8fe08a', stroke: '#14172b', strokeThickness: 4 }).setDepth(15001)
    const rank = this.add.text(0, -30, '', { fontFamily: FONT_UI, fontSize: '15px', fontStyle: 'bold', color: '#ffd34d', stroke: '#14172b', strokeThickness: 5 }).setOrigin(0.5)
    const hits = this.add.text(0, 0, '', { fontFamily: FONT_NUM, fontSize: '38px', fontStyle: 'bold', color: '#ffe08a', stroke: '#14172b', strokeThickness: 7 }).setOrigin(0.5)
    const dmg = this.add.text(0, 28, '', { fontFamily: FONT_NUM, fontSize: '15px', fontStyle: 'bold', color: '#f6eedc', stroke: '#14172b', strokeThickness: 5 }).setOrigin(0.5)
    const cb = this.add.container(W - 125, 178, [rank, hits, dmg]).setDepth(14900).setAngle(-4).setAlpha(0)
    this.comboBanner = { c: cb, rank, hits, dmg }
    this.setFast(false)
  }

  /** Status chips under the hero card: redrawn only when the list changes; hover shows the name. */
  private drawChips(chips: StatusChip[]) {
    const sig = chips.map((c) => `${c.icon}${c.n}${c.kind}`).join('|')
    if (sig === this.chipSig) return
    this.chipSig = sig
    const S = 28, X0 = 10, Y0 = 80, T = HUD_THEME
    const grid = chipGrid(chips.length, 290, S, 4)
    while (this.chipViews.length < grid.pos.length) {
      const i = this.chipViews.length
      const g = this.add.graphics()
      const icon = this.add.text(0, -1, '', { fontSize: '15px' }).setOrigin(0.5)
      const n = this.add.text(S / 2 - 1, S / 2 + 1, '', { fontFamily: FONT_NUM, fontSize: '11px', fontStyle: 'bold', color: '#ffffff', stroke: '#14172b', strokeThickness: 3 }).setOrigin(1, 1)
      const c = this.add.container(0, 0, [g, icon, n]).setDepth(15001).setSize(S, S).setInteractive()
      c.on('pointerover', () => { const name = this.chipNames[i]; if (name) this.chipTip?.setText(name).setPosition(X0, c.y + S / 2 + 4).setVisible(true) })
      c.on('pointerout', () => this.chipTip?.setVisible(false))
      this.chipViews.push({ c, g, icon, n })
    }
    this.chipViews.forEach((v, i) => {
      const p = grid.pos[i]
      if (!p) { v.c.setVisible(false); this.chipNames[i] = ''; return }
      const more = grid.overflow > 0 && i === grid.pos.length - 1
      const ch = chips[i], edge = more ? T.edge : ch.kind === 'debuff' ? T.debuff : T.buff
      v.c.setVisible(true).setPosition(X0 + p.x + S / 2, Y0 + p.y + S / 2)
      v.g.clear().fillStyle(0x000000, 0.3).fillRoundedRect(-S / 2, -S / 2 + 2, S, S, 7)
        .fillStyle(!more && ch.kind === 'debuff' ? 0x3a1424 : T.glass, 0.92).fillRoundedRect(-S / 2, -S / 2, S, S, 7)
        .lineStyle(1.5, edge, more ? 0.4 : 0.95).strokeRoundedRect(-S / 2, -S / 2, S, S, 7)
      v.icon.setText(more ? `+${grid.overflow}` : ch.icon).setFontSize(more ? 12 : ch.icon.length > 2 ? 11 : 15).setColor('#f6eedc')
      v.n.setText(more ? '' : ch.n)
      this.chipNames[i] = more ? chips.slice(i).map((c) => `${c.icon} ${c.name} ${c.n}`).join('  ') : `${ch.icon} ${ch.name}${ch.n ? ` · ${ch.n}` : ''}`
    })
  }

  // ---------- v86 MOBA-style skill buttons (docs/design/skill-buttons-v86.md) ----------
  private hudFour = false // Q 2026-11-24: Skill 4 button on, the arc holds 4 small buttons
  private clearBookings() { this.book = { s1: false, s2: false, s3: false, s4: false } }
  private s3Cost() { return this.pfFreeEndow && this.j2?.id === 'sage' ? 0 : Math.max(0, (this.j2?.skill3.cost ?? 0) - this.st.j2CmdCut) } // 🎓 📜 Memorize Lv 2: free Endow this boss wave // v82 Beastmaster คำสั่งไว

  /** (Re)build the cluster for the current job. The Novice keeps the old long smash button. */
  private buildSkillHud() {
    for (const b of this.skillBtns) { this.tweens.killTweensOf([b.c, b.ring, b.flash, ...(b.spin ? [b.spin] : [])]); b.c.destroy() }
    this.skillBtns = []
    this.skillTip?.destroy(); this.skillTip = undefined
    const nov = this.job.id === 'novice'
    this.smashBtn.setVisible(nov)
    if (!nov) this.smashBtn.disableInteractive()
    const s1 = slotCenter('s1', W, H)
    this.autoBtn?.setPosition(nov ? W - 250 : s1.x - s1.r - 10 - 62, nov ? H - 50 : H - 34)
    if (nov) return
    const slots: SkillSlot[] = []
    if (this.job.resource) slots.push('s1')
    if (this.s2) slots.push('s2')
    if (this.j2) slots.push('s3')
    this.hudFour = this.s4On()
    if (this.hudFour) slots.push('s4')
    slots.push('ult')
    this.skillBtns = slots.map((s) => this.makeSkillBtn(s))
    this.skillTip = this.add.text(W - 8, slotCenter('s3', W, H).y - 36, '', { fontFamily: FONT_UI, fontSize: '14px', fontStyle: 'bold', color: '#f6eedc', stroke: '#14172b', strokeThickness: 4, align: 'right' }).setOrigin(1, 1).setDepth(15004)
  }

  private makeSkillBtn(slot: SkillSlot): SkillBtnView {
    const { x, y, r } = slotCenter(slot, W, H, this.hudFour), big = slot === 'ult'
    const base = this.add.graphics(), sweep = this.add.graphics(), ring = this.add.graphics(), bookRing = this.add.graphics()
    const flash = this.add.graphics(); flash.fillStyle(0xffffff, 1).fillCircle(0, 0, r).setAlpha(0)
    const t = (oy: number, size: number, color: string, font = FONT_NUM) => this.add.text(0, oy, '', { fontFamily: font, fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#14172b', strokeThickness: 3 }).setOrigin(0.5)
    const icon = this.add.text(0, big ? -6 : -3, '', { fontSize: big ? '36px' : '24px' }).setOrigin(0.5)
    const cd = t(0, big ? 38 : 26, '#ffffff'), cost = t(big ? r - 17 : r - 11, big ? 14 : 11, '#cfe8ff'), tag = t(-r + (big ? 13 : 9), big ? 12 : 10, '#ffd24a', FONT_UI)
    let spin: Phaser.GameObjects.Graphics | undefined
    if (big) { // Mage ult chant: a rotating magic ring (visible only while an 'ult' cast is charging)
      spin = this.add.graphics().setVisible(false)
      spin.lineStyle(3, 0xb48aff, 0.95)
      for (let i = 0; i < 10; i++) { const a0 = (i * Math.PI) / 5; spin.beginPath(); spin.arc(0, 0, r + 10, a0, a0 + (Math.PI / 5) * 0.55); spin.strokePath() }
      spin.fillStyle(0xe6d4ff, 1)
      for (let i = 0; i < 4; i++) spin.fillCircle(Math.cos((i * Math.PI) / 2) * (r + 10), Math.sin((i * Math.PI) / 2) * (r + 10), 3.5)
      this.tweens.add({ targets: spin, angle: 360, duration: 2200, repeat: -1 })
    }
    this.tweens.add({ targets: ring, alpha: { from: 0.35, to: 1 }, duration: 520, yoyo: true, repeat: -1 }) // ready glow
    const c = this.add.container(x, y, [base, icon, sweep, cd, cost, tag, flash, ring, bookRing, ...(spin ? [spin] : [])]).setDepth(15003)
    c.setSize(r * 2, r * 2).setInteractive(new Phaser.Geom.Circle(r, r, r), Phaser.Geom.Circle.Contains)
    if (c.input) c.input.cursor = 'pointer'
    const v: SkillBtnView = { slot, r, sig: '', c, base, sweep, ring, bookRing, spin, flash, icon, cd, cost, tag }
    c.on('pointerover', () => { const sp = this.skillSpec(slot); this.skillTip?.setText(`${sp.icon} ${sp.name}${sp.costTxt ? `  ${sp.costTxt}` : ''}`) })
    c.on('pointerout', () => { c.setScale(1); this.skillTip?.setText('') })
    c.on('pointerdown', () => c.setScale(0.94))
    c.on('pointerup', () => { c.setScale(1); unlock(); this.tapSkill(slot) })
    return v
  }

  /** What one button shows right now: the pure rules in battle/skill-hud.ts get these numbers. */
  private skillSpec(slot: SkillSlot): { in: SkillBtnIn; icon: string; name: string; costTxt: string } {
    const manual = !this.autoUlt, silent = this.hx.silence > 0, exhaust = this.asuraExhaust > 0, ri = resourceIcon(this.job.resource)
    const money = (n: number) => (n > 0 ? `${ri}${Math.round(n)}` : '')
    if (slot === 's1') {
      const cost = this.shadowTurns > 0 && this.job.id === 'thief' ? 0 : autoCost(this.job, this.st), isSage = this.j2?.id === 'sage' // 👤 ร่างเงา: Skill 1 free
      const swCd = swordS1On(this.job) // ⚔️ ดาบสยบมนตร์ shows its cooldown
      return { in: { cdLeft: swCd ? this.s1Cd : 0, cdMax: swCd ? swordS1Cd(this.st.swS1CdCut) : 0, cost, res: this.res, booked: isSage ? false : this.book.s1, manual, blocked: exhaust }, icon: this.job.auto.icon, name: isSage ? `${this.job.auto.name} (ติดตัว: ตีใช้ Mana)` : this.job.auto.name, costTxt: money(cost) }
    }
    if (slot === 's2' && this.s2) {
      const k = this.s2
      return { in: { cdLeft: this.s2Cd, cdMax: s2Cooldown(k, this.st), cost: k.cost, res: this.res, booked: this.book.s2, manual, blocked: silent || exhaust }, icon: k.icon, name: k.name, costTxt: money(k.cost) }
    }
    if (slot === 's3' && this.j2) {
      const sk = this.j2.skill3, cost = this.s3Cost(), monk = this.j2.id === 'monk', need = KIT2.monk.thunderMin
      return { in: { cdLeft: this.s3Cd, cdMax: sk.cd, cost, res: this.res, booked: this.book.s3, manual, blocked: silent || exhaust || (monk && this.charges < need) }, icon: sk.icon, name: sk.name, costTxt: monk ? `🔵${this.charges}/${need}` : money(cost) }
    }
    if (slot === 's4' && this.j2?.skill4) {
      const sk = this.j2.skill4
      return { in: { cdLeft: this.s4Cd, cdMax: sk.cd, cost: sk.cost, res: this.res, booked: this.book.s4, manual, blocked: silent || exhaust }, icon: sk.icon, name: sk.name, costTxt: money(sk.cost) }
    }
    const cost = this.ultCost(), asura = this.j2?.id === 'monk' && this.st.j2Asura > 0, need = KIT2.monk.asuraMinAt
    const u = asura ? { icon: '💥', name: 'อาชูร่าสไตรก์' } : this.job.ult
    return { in: { cdLeft: this.smashCdLeft, cdMax: Math.max(this.ultTurns(), this.smashCdLeft), cost, res: this.res, booked: this.smashQueued, manual, blocked: silent || exhaust || (asura && this.charges < need) }, icon: u.icon, name: u.name, costTxt: asura ? `🔵${this.charges}/${need}` : money(cost) }
  }

  /** Called every frame, but only redraws a button whose signature changed (turn tick, resource crossing a cost, booking...). */
  private refreshSkillHud() {
    const chant = this.casts.some((c) => c.kind === 'ult')
    for (const v of this.skillBtns) {
      const sp = this.skillSpec(v.slot), s = skillButtonState(sp.in)
      const tag = v.slot === 's1' && this.j2?.id === 'sage' ? 'ติดตัว' : s.booked ? 'จอง' : v.slot === 'ult' && !sp.in.manual && s.ready ? 'ออโต้' : ''
      const spin = v.slot === 'ult' && chant
      const sig = `${s.ready}|${s.short}|${s.greyed}|${s.sweep.toFixed(2)}|${s.turns}|${tag}|${sp.icon}|${sp.costTxt}|${spin}`
      if (sig === v.sig) continue
      v.sig = sig
      this.drawSkillBtn(v, s, sp.icon, sp.costTxt, tag, spin)
    }
  }

  private drawSkillBtn(v: SkillBtnView, s: SkillBtnOut, icon: string, costTxt: string, tag: string, spin: boolean) {
    const r = v.r
    v.base.clear()
      .fillStyle(0x000000, 0.35).fillCircle(0, 3, r)
      .fillStyle(s.greyed ? 0x20243e : v.slot === 'ult' ? 0x4a3a7a : 0x2f3560, 1).fillCircle(0, 0, r)
      .fillStyle(0xffffff, s.greyed ? 0.04 : 0.1).fillCircle(0, -r * 0.25, r * 0.7)
      .lineStyle(3, s.greyed ? 0x454c80 : 0xf4e6c8, 1).strokeCircle(0, 0, r)
    v.icon.setText(icon).setAlpha(s.greyed ? 0.55 : 1)
    v.sweep.clear()
    if (s.sweep > 0) {
      v.sweep.fillStyle(0x000000, 0.62)
      if (s.sweep >= 1) v.sweep.fillCircle(0, 0, r - 1)
      else { const a = sweepAngles(s.sweep); v.sweep.beginPath(); v.sweep.slice(0, 0, r - 1, a.from, a.to, false); v.sweep.fillPath() }
    }
    v.cd.setText(s.turns > 0 ? String(s.turns) : '')
    v.cost.setText(costTxt).setColor(s.short ? '#ff6b6b' : '#cfe8ff')
    v.tag.setText(tag).setColor(tag === 'จอง' ? '#ffd24a' : '#9fe3ff')
    v.ring.clear().setVisible(s.ready && !s.booked)
    if (s.ready && !s.booked) v.ring.lineStyle(3, 0x7ff0ff, 1).strokeCircle(0, 0, r + 3)
    v.bookRing.clear()
    if (s.booked) v.bookRing.lineStyle(4, 0xffd24a, 1).strokeCircle(0, 0, r + 3).lineStyle(2, 0xfff1b0, 0.9).strokeCircle(0, 0, r + 7)
    v.spin?.setVisible(spin)
  }

  /** Cast feedback: the button pops and flashes so the player SEES which skill just fired. */
  private popSkill(slot: SkillSlot) {
    const v = this.skillBtns.find((b) => b.slot === slot)
    if (!v) return
    this.tweens.killTweensOf([v.c, v.flash])
    v.c.setScale(1)
    this.tweens.add({ targets: v.c, scale: 1.28, duration: 110, yoyo: true, ease: 'Quad.easeOut' })
    v.flash.setAlpha(0.85)
    this.tweens.add({ targets: v.flash, alpha: 0, duration: 340 })
  }

  /** Tap: auto mode = hint only (the ult keeps its old tap = cancel / book); manual mode = toggle the booking. */
  private tapSkill(slot: SkillSlot) {
    if (this.over || this.paused) return
    if (slot === 'ult') { this.queueSmash(); return }
    if (slot === 's1' && this.j2?.id === 'sage') { this.floatText(W - 210, H - 215, `📖 ติดตัว: ตีใช้ Mana ${autoCost(this.job, this.st)} เสริม On-Hit`, '#c9a8ff'); return }
    if (tapAction(!this.autoUlt) === 'hint') { this.floatText(W - 200, H - 215, 'โหมดออโต้ — สลับเป็นกดเอง เพื่อจอง', '#a9a6c7'); return }
    this.book[slot] = !this.book[slot]
    if (this.book[slot]) sfx.pop()
  }

  /** Digit1-3 book Skill 1-3, Digit4 books the ult; manual mode only, never while a pick / pause overlay is up. */
  private skillHotkey(e: KeyboardEvent) {
    const slot = hotkeySlot(e.code)
    if (!slot || e.repeat || this.autoUlt || this.pendingPick || this.overlay || !this.skillBtns.some((b) => b.slot === slot)) return
    this.tapSkill(slot)
  }

  update(_time = 0, delta = 16) {
    if (!this.st) return
    const g = this.hud.clear(), T = HUD_THEME
    const bar = (x: number, y: number, w: number, h: number, pct: number, color: number, back: number, ghost = 0) => {
      const r = Math.min(h / 2, 5)
      g.fillStyle(back, 1).fillRoundedRect(x, y, w, h, r)
      if (ghost > pct) g.fillStyle(T.hpGhost, 0.85).fillRoundedRect(x, y, Math.max(2 * r, w * ghost), h, r)
      if (pct > 0) g.fillStyle(color, 1).fillRoundedRect(x, y, Math.max(2 * r, w * pct), h, r)
      if (pct > 0) g.fillStyle(0xffffff, 0.2).fillRect(x + r, y + 1, Math.max(0, w * pct - 2 * r), Math.max(1, Math.floor(h / 3)))
      g.lineStyle(1, 0x000000, 0.45).strokeRoundedRect(x, y, w, h, r)
    }
    // hero card (top-left): portrait + Lv badge, HP (drain ghost + shield), resource, XP
    const res = !!this.job.resource, bx = 68, bw = 222
    g.fillStyle(0x000000, 0.28).fillRoundedRect(10, 11, 290, 64, T.r)
    g.fillStyle(T.glass, T.glassA).fillRoundedRect(10, 8, 290, 64, T.r)
    g.fillStyle(0xffffff, 0.05).fillRoundedRect(12, 10, 286, 22, T.r - 2)
    g.lineStyle(1, T.edge, T.edgeA).strokeRoundedRect(10, 8, 290, 64, T.r)
    g.fillStyle(T.tileHi, 1).fillCircle(36, 34, 22).lineStyle(2, T.gold, 0.9).strokeCircle(36, 34, 22)
    g.fillStyle(T.gold, 1).fillRoundedRect(16, 55, 40, 16, 8)
    const curSave = save(), curHeroTex = heroTex(curSave), curTint = heroCostumeTint(curSave.costume)
    if (this.portrait && this.portrait.texture.key !== curHeroTex && this.textures.exists(curHeroTex)) {
      const fr = this.portrait.setTexture(curHeroTex).frame
      this.portrait.setScale(Math.min(34 / fr.width, 34 / fr.height))
      this.portrait.setTint(curTint)
    }
    this.hudTxt.lv.setText(`Lv${this.level}`)
    const hpPct = Math.max(0, Math.min(1, this.hp / this.st.maxHp))
    this.hpGhost = this.hpGhost < hpPct ? hpPct : Math.max(hpPct, this.hpGhost - (delta / 1000) * 0.4)
    const hy = res ? 14 : 18, hh = res ? 18 : 22
    bar(bx, hy, bw, hh, hpPct, hpPct > 0.3 ? T.hp : T.hpLow, T.hpBack, this.hpGhost)
    if (this.shield + this.kyrie.hp > 0) g.fillStyle(T.shield, 0.8).fillRoundedRect(bx, hy, Math.min(bw, bw * (this.shield + this.kyrie.hp) / this.st.maxHp), 5, 2) // + v77 Kyrie barrier
    this.hudTxt.hp.setText(`${Math.round(this.hp)} / ${Math.round(this.st.maxHp)}`).setPosition(bx + bw / 2, hy + hh / 2)
    if (this.job.resource) {
      const r = RESOURCES[this.job.resource], max = this.resMax()
      bar(bx, 36, bw, 13, Math.min(1, this.res / max), r.color, 0x1d2140)
      this.hudTxt.res.setText(`${r.name} ${Math.floor(this.res)}/${Math.round(max)}`).setPosition(bx + bw / 2, 42.5)
    } else this.hudTxt.res.setText('')
    bar(bx, res ? 54 : 46, bw, 5, Math.min(1, this.xp / RULES.xpNeed(this.level)), T.xp, 0x1d2140)
    // zeny pill (top-right)
    const zw = this.hudTxt.zeny.setText(`${this.zeny}`).width
    this.coinImg?.setPosition(W - 20 - zw - 16, 25)
    g.fillStyle(T.glass, T.glassA).fillRoundedRect(W - zw - 54, 8, zw + 44, 34, 17).lineStyle(1, T.gold, 0.5).strokeRoundedRect(W - zw - 54, 8, zw + 44, 34, 17)
    if (this.dg.tier >= FORTUNE.minTier) { // Fortune meter (kept across runs): full = the next event is a JACKPOT
      const f = Math.min(1, (save().fortune ?? 0) / FORTUNE.max), fx = W - 228, fy = 50, fw = 110
      bar(fx, fy, fw, 8, f, f >= 1 ? 0xffd86b : 0x5fbf5a, 0x1d2140)
      this.fortuneTxt?.setText(f >= 1 ? '🍀 JACKPOT!' : '🍀').setPosition(f >= 1 ? fx - 4 : W - 250, fy + (f >= 1 ? 10 : -6))
    } else this.fortuneTxt?.setText('')
    // stage pill (top-centre) + affix line under the turn queue
    const left = this.turnLimit - this.fightTurns, fighting = this.alive().length > 0
    const sp = stagePill({
      roomLv: this.dg.level ? this.roomDef(this.room)?.lv ?? roomLevel(this.dg.level, this.dg.rooms, this.room) : undefined, hard: this.hard, hardK: this.hardK,
      modIcons: this.run.corrupt ? this.run.corrupt.list.map((c) => c.icon).join('') : this.aff.defs.map((a) => a.icon).join(''),
      where: this.run.where(this.room), fighting, left, limit: this.turnLimit,
    })
    if (sp.text !== this.stageTxt) { this.stageTxt = sp.text; fitWidth(this.hudTxt.room.setText(sp.text), 330, 15, 10) }
    this.hudTxt.room.setColor(sp.warn ? '#ff7a7a' : '#f6eedc')
    const rw = this.hudTxt.room.width + 28
    g.fillStyle(sp.warn ? 0x3a1424 : T.glass, T.glassA).fillRoundedRect(W / 2 - rw / 2, 6, rw, 28, 14)
    g.lineStyle(1, sp.warn ? T.debuff : T.edge, sp.warn ? 0.9 : T.edgeA).strokeRoundedRect(W / 2 - rw / 2, 6, rw, 28, 14)
    const affix = this.alive().find((m) => m.affix)?.affix ?? ''
    if (affix !== this.affixTxt) { this.affixTxt = affix; fitWidth(this.hudTxt.affix.setText(affix), 360, 13, 10) }
    if (affix) { const aw = this.hudTxt.affix.width + 20; g.fillStyle(T.glass, 0.7).fillRoundedRect(W / 2 - aw / 2, 89, aw, 20, 10) }
    const hb = hazardHudBadge(this.biomeState, W)
    const hSig = hb ? `${hb.icon}|${hb.text}|${hb.tone}` : ''
    if (hSig !== this.hazardSig) {
      this.hazardSig = hSig
      fitWidth(this.hudTxt.hazard.setText(hb ? hb.text : ''), 340, 12, 10)
      this.hudTxt.hazard.setColor(hb?.tone === 'warn' ? '#ff9a7a' : hb?.tone === 'sweet' || hb?.tone === 'stagger' ? '#ffe08a' : '#f6eedc')
    }
    if (hb) {
      const hw = this.hudTxt.hazard.width + 20
      const edge = hb.tone === 'warn' ? T.debuff : hb.tone === 'sweet' || hb.tone === 'stagger' ? T.gold : T.edge
      g.fillStyle(hb.tone === 'warn' ? 0x3a1424 : T.glass, 0.78).fillRoundedRect(hb.x - hw / 2, hb.y - 10, hw, 20, 10)
      g.lineStyle(1, edge, 0.85).strokeRoundedRect(hb.x - hw / 2, hb.y - 10, hw, 20, 10)
    }
    // status chips (debuffs red, buffs gold) under the hero card
    const B = this.buf
    this.drawChips(statusChips({ ...this.hx, asuraExhaust: this.asuraExhaust }, {
      gcLeft: this.gc?.left, hcVit: this.hcVit.n, dawn: this.st.clDawn > 0 && this.job.id === 'cleric' ? { n: this.dawnCount, every: KIT.clericTree.dawn.every } : undefined,
      dawnWis: B.dawnWis, bless: B.bless, kyrieHits: this.kyrie.hits, gloria: this.st.s2Star > 0 && this.s2?.id === 'cl_bless',
      grit: this.st.j2GritRate > 0 ? (() => { const hm = haymakerCalc(this.st, this.monkGrit); return { amt: this.monkGrit, cap: hm.cap, ready: hm.triggerAt > 0 && this.monkGrit >= hm.triggerAt } })() : undefined,
      guard: B.guard, blood: B.blood, hawk: B.hawk, mshield: B.mshield, renew: B.renew, s2Icon: this.s2?.icon ?? '✨', s2Name: this.s2?.name ?? 'บัฟ',
    }))

    // monster HP bars + boss charge
    for (const m of this.mons) {
      if (m.dead || !m.spr.active) continue
      const w = Math.max(40, m.spr.displayWidth * 0.8), x = m.spr.x - w / 2, y = m.spr.y - m.spr.displayHeight - 12
      g.fillStyle(COLORS.night, 0.85).fillRect(x - 1, y - 1, w + 2, 8)
      g.fillStyle(m.def.ai === 'boss' ? COLORS.gold : COLORS.hp).fillRect(x, y, w * Math.max(0, m.hp / m.def.hp), 6)
      let sy = y + 7
      if (m.shield > 0) { // Q 2026-11-23: monster shield (bone shield, ice armor, 🟡 เกราะสวรรค์...) was invisible, so its soak read as "HP barely moved"
        g.fillStyle(COLORS.night, 0.85).fillRect(x - 1, sy, w + 2, 5)
        g.fillStyle(HUD_THEME.shield, 0.95).fillRect(x, sy + 1, w * Math.min(1, m.shield / Math.max(1, m.def.hp)), 3)
        sy += 5
      }
      const mp = m.mp ?? (m.kit && m.heroKit ? m.kit : undefined) // Q 2026-11-23: boss mana bar (a hero-kit boss shows its kit mana)
      if (mp && mp.maxMana > 0) {
        g.fillStyle(COLORS.night, 0.85).fillRect(x - 1, sy, w + 2, 5)
        g.fillStyle(HUD_THEME.mana, 0.95).fillRect(x, sy + 1, w * Math.min(1, mp.mana / mp.maxMana), 3)
      }
      m.dotTxt?.setPosition(m.spr.x, y - 12)
    }

    // turn queue strip (top centre): who acts next, left to right
    const q = this.over ? [] : this.previewQueue(7)
    while (this.queueIcons.length < 7) this.queueIcons.push(this.add.image(0, 0, 'novice').setDepth(15002))
    const qx = W / 2 - 3 * 46, qy = 53
    if (q.length) g.fillStyle(HUD_THEME.glass, 0.6).fillRoundedRect(qx - 30, 33, 7 * 46 + 14, 54, 12).lineStyle(1, HUD_THEME.edge, 0.1).strokeRoundedRect(qx - 30, 33, 7 * 46 + 14, 54, 12)
    this.queueIcons.forEach((ic, i) => {
      const a = q[i]
      if (a === undefined) { ic.setVisible(false); return }
      ic.setVisible(true).setPosition(qx + i * 46, qy).setTexture(a ? a.def.tex : curHeroTex).clearTint()
      const s = a ? (a.def.ai === 'boss' ? 0.36 : 0.75) : fitHeroScale(ic.width, ic.height, 0.75, 38)
      const lead = !a ? fitHeroScale(ic.width, ic.height, 0.75 * 1.25, 40) : s * 1.25
      ic.setScale(i === 0 ? lead : s).setFlipX(!!a && FACES_RIGHT.includes(a.kind))
      if (!a) ic.setTint(curTint)
      if (i === 0) g.lineStyle(2, COLORS.gold).strokeRoundedRect(qx - 21, qy - 21, 42, 42, 8)
    })
    const qs = this.over ? '' : turnQueueSpeedText(this.heroSpeed(), this.front().map((m) => this.monSpeed(m)), this.heroGauge)
    if (qs !== this.qSpeedTxt) {
      this.qSpeedTxt = qs
      fitWidth(this.hudTxt.qSpeed.setText(qs), 7 * 46, 11, 9)
    }

    // bottom-left Hits/Turn HUD pill
    const est = estimateHitsPerTurn(this.st, this.job.id, this.j2?.id)
    const ht = this.over ? '' : turnHitsHudText({
      activeTurnHits: this.turnHitsCur,
      lastTurnHits: this.turnHitsLast,
      totalHits: this.turnHitsTotal,
      turnsTaken: this.fightTurns,
      peakHits: this.turnHitsPeak,
      estAvg: est.avgHits,
      estMax: est.maxHits,
      inTurn: this.inHeroTurn,
    })
    if (ht !== this.hitsHudTxt) {
      this.hitsHudTxt = ht
      fitWidth(this.hudTxt.hitsHud.setText(ht), 360, 13, 10)
    }
    if (ht) {
      const hw = this.hudTxt.hitsHud.width + 20
      const activeHit = this.inHeroTurn && this.turnHitsCur > 0
      g.fillStyle(activeHit ? 0x2a2342 : T.glass, T.glassA).fillRoundedRect(10, H - 44, hw, 34, 10)
      g.lineStyle(1, activeHit ? T.gold : T.edge, activeHit ? 0.85 : T.edgeA).strokeRoundedRect(10, H - 44, hw, 34, 10)
    }

    // smash button state
    if (this.job.id !== 'novice') { this.refreshSkillHud(); return } // v86: the cluster replaces the long button
    const ready = this.smashCdLeft <= 0
    const u = this.job.ult
    const cost = this.ultCost(), short = cost > 0 && this.res < cost
    const tag = cost > 0 ? ` · 🔷${cost}` : ''
    this.smashBtn.setLabel(this.autoUlt && ready && !this.smashQueued && !short ? `${u.icon} ${u.name}\n${this.autoSkip ? 'ข้ามรอบนี้' : `ออโต้${tag}`}` : this.smashQueued ? (ready ? (short ? `รอ Mana\n${Math.floor(this.res)}/${cost}` : `${u.icon} ตาหน้า!\n(แตะยกเลิก)`) : `จองไว้แล้ว\nอีก ${this.smashCdLeft} เทิร์น`) : ready ? `${u.icon} ${u.name}\n${short ? `Mana ไม่พอ${tag}` : `พร้อม${tag}`}` : `${u.name}\nอีก ${this.smashCdLeft} เทิร์น`)
    this.smashBtn.setAlpha(ready || this.smashQueued ? 1 : 0.6)
  }

  // ---------- fx ----------
  private slashFx(x: number, y: number) {
    const s = this.add.image(x, y, 'slash').setDepth(9000).setScale(0.7)
    this.tweens.add({ targets: s, scale: 1, alpha: 0, duration: 180, onComplete: () => s.destroy() })
  }

  private heroSlashFx(x: number, y: number, thrust = false) {
    if (this.job.id === 'swordsman') {
      if (thrust) pierceHitFx(this, x + 20, GROUND, this.hits % 5, false)
      else comboSlashFx(this, x, y, Math.max(1, this.comboLevel), this.rigSpec.slashPalette, this.j2?.id === 'berserker' ? 'berserker' : 'swordsman')
      return
    }
    if (this.job.id === 'thief') { daggerCrossFx(this, x, y, this.hits, this.j2?.id === 'mobster' ? 'mobster' : 'thief'); return } // ฟันไขว้คู่
    this.slashFx(x, y)
  }

  // ---------- hit feel (game-feel skill): small = evade · combo grows · medium = counter · large = crit ----------
  private comboLevel = 0
  private stopToken = 0
  private lastStop = 0
  private lowShake = false

  /** Camera shake; the "ลดจอสั่น" setting cuts it to a third. */
  private shake(ms: number, intensity: number) { this.cameras.main.shake(ms, this.lowShake ? intensity / 3 : intensity) }

  /** Hit-stop: freeze tweens + timers for a real-time moment, then put back the x1/x2 speed.
   *  Skipped when a bot runs the game fast, and at most one per 120 ms so multi-hits don't stall. */
  private hitStop(ms: number) {
    if (this.over || this.tweens.timeScale > 2) return
    const now = performance.now()
    if (now - this.lastStop < 120) return
    this.lastStop = now
    const tok = ++this.stopToken
    this.tweens.timeScale = 0.05; this.time.timeScale = 0.05
    window.setTimeout(() => {
      if (tok !== this.stopToken || !this.sys.isActive() && !this.sys.isPaused()) return
      const sp = this.fast ? 2 : 1
      this.tweens.timeScale = sp; this.time.timeScale = sp
    }, ms / (this.fast ? 2 : 1))
  }

  /** Big word that pops in with overshoot (EVADE / COUNTER / 3 HIT). */
  private popWord(x: number, y: number, s: string, color: string, size = 24, from = 1.7) {
    const t = this.add.text(x, y, s, { fontFamily: FONT_NUM, fontSize: `${size}px`, color, stroke: '#14172b', strokeThickness: 6 }).setOrigin(0.5).setDepth(10000).setScale(from)
    this.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' })
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, delay: 520, duration: 360, onComplete: () => t.destroy() })
  }

  private comboSum = { on: false, per: new Map<Mon, { dmg: number, hits: number, x: number, y: number }>() }

  /** RO double-attack style: after a combo chain, the summed damage pops big and yellow above the last target and hangs ~1.3 s. */
  private comboTotal(x: number, y: number, total: number, hits: number) {
    total = Math.ceil(total)
    const ty = y - 62
    const tag = this.add.text(x, ty - 30, `${hits} HIT`, { fontFamily: FONT_NUM, fontSize: '16px', color: '#ffe9a8', stroke: '#14172b', strokeThickness: 5 }).setOrigin(0.5).setDepth(10001)
    const t = this.add.text(x, ty, `${total}`, { fontFamily: FONT_NUM, fontSize: `${36 + Math.min(3, hits - 2) * 6}px`, color: '#ffd34d', stroke: '#14172b', strokeThickness: 7 }).setOrigin(0.5).setDepth(10001).setScale(1.9)
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' })
    this.tweens.add({ targets: [t, tag], y: '-=18', alpha: 0, delay: 1300, duration: 400, onComplete: () => { t.destroy(); tag.destroy() } })
  }

  private hideTurnCombo() {
    const b = this.comboBanner
    if (!b) return
    b.fadeEv?.remove(); b.fadeEv = undefined
    this.tweens.killTweensOf(b.c)
    b.c.setAlpha(0).setScale(1).setY(178)
  }

  private popTurnCombo(hits: number, totalDmg: number) {
    const b = this.comboBanner, spec = comboBannerSpec(hits, totalDmg)
    if (!b || !spec) return
    b.fadeEv?.remove(); b.fadeEv = undefined
    this.tweens.killTweensOf(b.c)
    b.rank.setText(spec.rankLabel).setColor(spec.color)
    b.hits.setText(spec.hitsLabel).setColor(spec.color)
    b.dmg.setText(spec.dmgLabel)
    b.c.setY(178).setAlpha(1).setScale(spec.scale)
    this.tweens.add({ targets: b.c, scale: 1, duration: 180, ease: 'Back.easeOut' })
  }

  private fadeTurnCombo() {
    const b = this.comboBanner
    if (!b || this.turnHitsCur <= 0) return
    b.fadeEv?.remove()
    b.fadeEv = this.time.delayedCall(900, () => {
      if (!b.c.active) return
      this.tweens.add({ targets: b.c, alpha: 0, y: 164, duration: 300, ease: 'Quad.easeIn' })
    })
  }

  /** Counter: clang + spark, hero flashes white, short freeze, then the strike back. */
  private counterJuice() {
    this.popWord(HERO_X + 40, GROUND - 140, 'COUNTER!', '#ff9f43', 26)
    sfx.clang()
    this.burst(HERO_X + 36, GROUND - 50, 0xffd27a, 14, 260, true)
    this.heroRig.flashFill(0xffffff, 90)
    this.hitStop(60)
  }

  /** Crit: freeze, star burst, shake (the monster's white flash and big number come from damageMon). */
  private critJuice(m: Mon) {
    const y = m.spr.y - m.spr.displayHeight / 2
    this.burst(m.spr.x, y, 0xffe08a, 18, 320, true)
    const ring = this.add.circle(m.spr.x, y, 10).setStrokeStyle(4, 0xffe08a).setDepth(9001)
    this.tweens.add({ targets: ring, scale: 6, alpha: 0, duration: 260, ease: 'Quad.easeOut', onComplete: () => ring.destroy() })
    this.popWord(m.spr.x, m.spr.y - m.spr.displayHeight - 80, 'CRITICAL', '#ffd34d', 18, 2)
    this.shake(110, 0.008)
    if (this.job.id === 'thief') sfx.daggerCritSpark()
    else sfx.critBoom()
    this.hitStop(80)
  }

  /** Evade: sidestep with an afterimage + whoosh; no shake (small tier). */
  private evadeJuice(label: string, color: string) {
    this.popWord(HERO_X, GROUND - 100, label, color, 22, 1.4)
    if (this.job.id === 'thief') {
      if (label === 'LUCKY!') sfx.luckyDodge()
      else sfx.shadowEvade()
    } else {
      sfx.evade()
    }
    this.afterimage(0x9fe3ff, 26)
    this.tweens.add({ targets: this.heroSpr, x: HERO_X - 34, duration: 90, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { this.heroSpr.x = HERO_X } })
  }

  private damageNumber(x: number, y: number, n: number, crit: boolean, color?: string, heal = false) {
    n = Math.ceil(n) // safety net: never show a fraction
    const t = this.add.text(x + Phaser.Math.Between(-10, 10), y, heal ? `+${n}` : crit ? `${n}!` : `${n}`, {
      fontFamily: FONT_NUM, fontSize: crit ? '40px' : '24px', color: color ?? (crit ? '#ffd34d' : '#f6eedc'), stroke: '#14172b', strokeThickness: crit ? 7 : 5,
    }).setOrigin(0.5).setDepth(9999)
    if (crit) { t.setScale(1.8); this.tweens.add({ targets: t, scale: 1, duration: 240, ease: 'Back.easeOut' }) }
    this.tweens.add({ targets: t, y: y - 44, duration: 300, ease: 'Back.easeOut' })
    this.tweens.add({ targets: t, alpha: 0, delay: 500, duration: 260, onComplete: () => t.destroy() })
  }

  floatText(x: number, y: number, s: string, color: string) {
    y -= this.laneOf(x, y) * 24 // v112: texts fired at the same spot stack instead of overlapping
    const t = this.add.text(x, y, s, { fontFamily: FONT_UI, fontSize: '18px', fontStyle: 'bold', color, stroke: '#14172b', strokeThickness: 5 }).setOrigin(0.5).setDepth(9999)
    this.tweens.add({ targets: t, y: y - 34, alpha: 0, delay: 400, duration: 700, onComplete: () => t.destroy() })
  }

  /** Lane for a new float text / callout at (x, y): how many fired near there just now (max 4). Real time, so a pause doesn't matter. */
  private laneOf(x: number, y: number) {
    const now = performance.now()
    this.floatRecent = this.floatRecent.filter((r) => now - r.t < 650)
    const lane = Math.min(4, floatLane(this.floatRecent, x, y, now))
    this.floatRecent.push({ x, y, t: now })
    return lane
  }

  private burst(x: number, y: number, color: number, n: number, speed: number, star = false) {
    const p = this.add.particles(x, y, 'dot', {
      speed: { min: speed * 0.3, max: speed }, angle: { min: star ? 0 : 180, max: 360 }, scale: { start: 0.9, end: 0 },
      lifespan: 420, tint: [color, 0xffffff], quantity: n, emitting: false,
    }).setDepth(9000)
    p.explode(n)
    this.time.delayedCall(600, () => p.destroy())
  }

  /**
   * Zeny loot. poof (a kill, (x, y) = the monster's feet): a pixelfx coin-drop bursts out and bounces, then its
   * coins lift off where they settled and fly to the zeny counter. Without poof (events, chests) the coins pop
   * out of (x, y) and fly. A fixed handful of coins per tier carries the zeny (COIN_FX), one sound each way.
   */
  private coinsFly(x: number, y: number, n: number, poof = false) {
    if (n <= 0) return
    const tier = coinTier(n), shares = splitZeny(n, tier.coins), k = shares.length
    sfx.coinDrop()
    const fly = () => {
      let left = k
      const rest: readonly number[] = COIN_DROP_REST[tier.coins]
      shares.forEach((share, i) => {
        const sx = poof ? x + (rest[i] ?? 0) * COIN_FX.scale : x + Phaser.Math.Between(-40, 40)
        const sy = poof ? y - 3 * COIN_FX.scale : y
        const c = this.add.image(sx, sy, 'coin').setDepth(9800)
        this.tweens.add({ targets: c, scaleX: 0.25, duration: 110, yoyo: true, repeat: -1 }) // spins as it flies
        this.tweens.add({ targets: c, y: sy - COIN_FX.hop - (poof ? 0 : Phaser.Math.Between(0, 30)), duration: COIN_FX.hopMs, delay: i * COIN_FX.staggerMs, ease: 'Quad.easeOut',
          onComplete: () => this.tweens.add({ targets: c, x: this.coinImg?.x ?? W - 70, y: 25, duration: COIN_FX.flyMs, ease: 'Quad.easeIn',
            onComplete: () => {
              this.tweens.killTweensOf(c); c.destroy()
              this.zeny += share
              this.coinPop()
              if (--left === 0) sfx.coinGet()
            } }) })
      })
    }
    if (!poof) { fly(); return }
    const spr = playPfx(this, COIN_DROP_IDS[tier.coins], x, y, { scale: COIN_FX.scale, speed: COIN_FX.speed, depth: y + 1 })
    if (spr) spr.once('animationcomplete', fly)
    else fly()
  }

  /** The HUD coin swells on each coin that lands. */
  private coinPop() {
    const img = this.coinImg
    if (!img) return
    this.tweens.killTweensOf(img)
    img.setScale(COIN_FX.popScale)
    this.tweens.add({ targets: img, scale: 1.2, duration: COIN_FX.popMs, ease: 'Quad.easeOut' })
  }

  private callout(text: string, x: number, y: number, color = '#f2b84b') {
    y -= this.laneOf(x, y) * 28
    const t = this.add.text(x, y, text, { fontFamily: FONT_UI, fontSize: '22px', fontStyle: 'bold', color, stroke: '#14172b', strokeThickness: 6 }).setOrigin(0.5).setDepth(9999)
    this.tweens.add({ targets: t, y: y - 20, alpha: 0, delay: 1300, duration: 500, onComplete: () => t.destroy() })
  }

  private banner(title: string, sub: string) {
    const c = this.add.container(W / 2, 190).setDepth(10000)
    c.add([this.add.rectangle(0, 0, W, 84, COLORS.night, 0.72),
      this.add.text(0, -14, title, { fontFamily: FONT_UI, fontSize: '30px', fontStyle: 'bold', color: '#f6eedc' }).setOrigin(0.5),
      this.add.text(0, 22, sub, { fontFamily: FONT_UI, fontSize: '16px', color: '#a9a6c7' }).setOrigin(0.5)]).setAlpha(0)
    this.tweens.add({ targets: c, alpha: 1, duration: 200, yoyo: true, hold: 1200, onComplete: () => c.destroy() })
  }
}
