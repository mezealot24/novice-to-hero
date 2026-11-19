import test from 'node:test'
import assert from 'node:assert/strict'
import { AWAKENED_CRAFT_ITEMS } from '../src/data/awakened-craft'
import { CARDFORGE_EXPANSION_ITEMS } from '../src/data/cardforge'
import { CHAMPION_UNIQUES, CREATIVE_UNIQUES } from '../src/data/uniques3'
import { ITEM_SETS, setBonuses, setById } from '../src/data/sets'
import {
  ASPECTS,
  ASPECT_LIST,
  UNIQUE_AWAKEN,
  awakenUnique,
  bossCardOfDungeon,
  canAwakenUnique,
  canImbueAspect,
  imbueAspect,
  itemConversionsOf,
  itemEffectsOf,
  type AspectId,
} from '../src/data/item-effects'
import {
  BARE_ITEM,
  forged,
  heroBuild,
  heroStats,
  imbueOf,
  isAwakened,
  itemById,
  wornItems,
  type EquipSlot,
  type Item,
} from '../src/data/meta'
import { STAT_CAPS } from '../src/data/stats'
import { equip, forgetForge, newSave, unequip, type SaveData } from '../src/save'

function makeEndgameHero(): SaveData {
  const s = newSave('tester', 'human')
  Object.assign(s, {
    baseLevel: 99,
    job: 'cleric',
    jobLevel: 40,
    job2: 'monk',
    job2Level: 50,
    job3: 'champion',
    job3Level: 30,
    job3Trial: { champion: 1 },
    stats: { str: 60, vit: 60, wis: 50, dex: 45, int: 55, luk: 40, agi: 55 },
    zeny: 500_000,
    clearsBy: { d10: 5, d11: 5, d12: 5, d13: 5 },
  })
  return s
}

function firstValidAspectForSlot(slot: Item['slot']): AspectId {
  const found = ASPECT_LIST.find((a) => a.slots.includes(slot))
  assert.ok(found, `Expected at least one aspect supporting slot ${slot}`)
  return found.id
}

test('Equip/Unequip Symmetry & Stat Identity: equipping, imbuing, awakening, and unequipping restores exact heroStats with zero mutation leaks', () => {
  const catalogGroups: readonly { label: string; items: readonly Item[] }[] = [
    { label: 'AWAKENED_CRAFT_ITEMS', items: AWAKENED_CRAFT_ITEMS },
    { label: 'CARDFORGE_EXPANSION_ITEMS', items: CARDFORGE_EXPANSION_ITEMS },
    { label: 'CHAMPION_UNIQUES', items: CHAMPION_UNIQUES },
    { label: 'CREATIVE_UNIQUES', items: CREATIVE_UNIQUES },
  ]

  // 1. Individual item symmetry across all 4 expansion catalogs + aspect imbue + unique awakening
  for (const group of catalogGroups) {
    assert.ok(group.items.length > 0, `${group.label} must not be empty`)
    for (const it of group.items) {
      const s = makeEndgameHero()
      const baselineStats = structuredClone(heroStats(s))
      const baselineBuild = structuredClone(heroBuild(s))

      s.owned.push(it.id)
      const targetSlot: EquipSlot = it.slot === 'acc' ? 'acc' : it.slot
      assert.equal(equip(s, it.id, targetSlot), true, `Failed to equip ${it.id} in ${targetSlot}`)

      // Imbue matching aspect
      const aspectId = firstValidAspectForSlot(it.slot)
      s.imbue = { [it.id]: aspectId }

      // Awaken if unique
      if (it.unique) {
        s.awakened = { [it.id]: 1 }
      }

      const equippedStats = heroStats(s)
      const equippedBuild = heroBuild(s)
      assert.notDeepEqual(
        equippedStats,
        baselineStats,
        `${group.label} item ${it.id} must change heroStats when equipped/imbued`,
      )
      assert.ok(
        equippedBuild.effects.length > baselineBuild.effects.length ||
          equippedBuild.conversions.length > baselineBuild.conversions.length ||
          Object.keys(it.mod).length > 0,
      )

      // Unequip and clear imbue/awakened -> exact stat identity restored
      assert.equal(unequip(s, targetSlot), true, `Failed to unequip ${it.id} from ${targetSlot}`)
      delete s.imbue[it.id]
      if (s.awakened) delete s.awakened[it.id]

      assert.deepEqual(
        heroStats(s),
        baselineStats,
        `Unequipping ${it.id} (${group.label}) leaked state into heroStats`,
      )
      assert.deepEqual(
        heroBuild(s),
        baselineBuild,
        `Unequipping ${it.id} (${group.label}) leaked state into heroBuild`,
      )
    }
  }

  // 2. Full 3-piece set + multi-slot equip + imbue + awaken symmetry across ITEM_SETS
  for (const setDef of ITEM_SETS) {
    const members = (setDef.memberIds ?? []).map((id) => itemById(id))
    assert.ok(members.length >= 3, `Set ${setDef.id} must have at least 3 members`)

    const s = makeEndgameHero()
    // Class sets (Q 2026-11-19 zone sets): wear them as that class (2nd job set, no 3rd job) instead of the default Monk
    const AS: Record<string, string> = { thief: 'rogue', swordsman: 'berserker', mage: 'wizard', archer: 'beastmaster' }
    const lock = (['thief', 'swordsman', 'mage', 'archer'] as const).find((j) => members.every((m) => !m.jobs || m.jobs.includes(j)))
    if (lock) Object.assign(s, { job: lock, job2: AS[lock], job3: undefined, job3Trial: {} })
    const baseStats = structuredClone(heroStats(s))

    const usedSlots: EquipSlot[] = []
    for (const member of members) {
      let slot: EquipSlot = member.slot === 'acc' ? 'acc' : member.slot
      if (slot === 'acc' && usedSlots.includes('acc')) slot = 'acc2'
      if (usedSlots.includes(slot)) continue
      // Respect max 2 uniques equipped at once if set contains multiple uniques
      s.owned.push(member.id)
      if (equip(s, member.id, slot)) {
        usedSlots.push(slot)
        s.imbue = s.imbue ?? {}
        s.imbue[member.id] = firstValidAspectForSlot(member.slot)
        if (member.unique) {
          s.awakened = s.awakened ?? {}
          s.awakened[member.id] = 1
        }
      }
    }

    assert.ok(usedSlots.length >= 2, `Set ${setDef.id} should equip at least 2 distinct slots`)
    const activeBuild = heroBuild(s)
    assert.ok(
      activeBuild.sets.active.some((a) => a.set.id === setDef.id),
      `Set ${setDef.id} should be active when its members are equipped`,
    )
    assert.notDeepEqual(activeBuild.stats, baseStats)

    for (const slot of usedSlots) {
      assert.equal(unequip(s, slot), true)
    }
    s.imbue = {}
    s.awakened = {}

    assert.deepEqual(
      heroStats(s),
      baseStats,
      `Set ${setDef.id} multi-slot unequip must restore exact baseline heroStats`,
    )
  }
})

test('Stat Conversions (StatConvert): single-pass deterministic conversion caps (maxHp->atk, maxRes->matk, def->maxHp, atk->matk, flee->def)', () => {
  // Verify each of the 5 core conversion paths and their exact caps
  // 1. maxHp -> atk (ac_bloodpact_cloak: ratio 0.04, cap 220)
  {
    const s = makeEndgameHero()
    s.owned.push('ac_bloodpact_cloak')
    equip(s, 'ac_bloodpact_cloak', 'armor')

    const bNormal = heroBuild(s)
    assert.ok((bNormal.conversionGains.atk ?? 0) > 0)
    assert.ok((bNormal.conversionGains.atk ?? 0) <= 220)

    // Push VIT huge so 4% maxHp exceeds cap 220 (e.g. maxHp > 10,000)
    s.stats.vit = 999
    const bCapped = heroBuild(s)
    assert.equal(bCapped.conversionGains.atk, 220, 'maxHp -> atk must respect cap 220')
  }

  // 2. maxRes -> matk (ac_muramana_staff: ratio 0.55, cap 280)
  {
    const s = makeEndgameHero()
    s.owned.push('ac_muramana_staff')
    equip(s, 'ac_muramana_staff', 'weapon')

    s.stats.int = 999
    const bCapped = heroBuild(s)
    assert.equal(bCapped.conversionGains.matk, 280, 'maxRes -> matk must respect cap 280')
  }

  // 3. def -> maxHp (ac_heartsteel_shield: ratio 3.5, cap 1100)
  {
    const s = makeEndgameHero()
    s.owned.push('ac_heartsteel_shield')
    equip(s, 'ac_heartsteel_shield', 'offhand')

    s.stats.vit = 999
    const bCapped = heroBuild(s)
    assert.equal(bCapped.conversionGains.maxHp, 1100, 'def -> maxHp must respect cap 1100')
  }

  // 4. atk -> matk (ac_battlesage_tome: ratio 0.45, cap 200)
  {
    const s = makeEndgameHero()
    s.owned.push('ac_battlesage_tome')
    equip(s, 'ac_battlesage_tome', 'offhand')

    s.stats.str = 999
    const bCapped = heroBuild(s)
    assert.equal(bCapped.conversionGains.matk, 200, 'atk -> matk must respect cap 200')
  }

  // 5. flee -> def (aspect_ironreflex on cloth: ratio 0.85, cap 150)
  {
    const s = makeEndgameHero()
    s.imbue = { cloth: 'aspect_ironreflex' }

    s.stats.agi = 999
    const bCapped = heroBuild(s)
    assert.equal(bCapped.conversionGains.def, 150, 'flee -> def must respect cap 150')
  }

  // 6. Single-pass snapshot guarantee: def -> maxHp (ac_heartsteel_shield) + maxHp -> atk (ac_bloodpact_cloak)
  // The maxHp -> atk conversion must read pre-conversion maxHp (not the +maxHp gained from def -> maxHp)
  {
    const s = makeEndgameHero()
    s.stats.vit = 40
    s.owned.push('ac_bloodpact_cloak', 'ac_heartsteel_shield')

    // Equip only bloodpact cloak first to measure pre-conversion maxHp
    equip(s, 'ac_bloodpact_cloak', 'armor')
    const cloakOnly = heroBuild(s)
    const cloakRatio = 0.04
    assert.equal(
      cloakOnly.conversionGains.atk,
      Math.min(220, cloakOnly.stats.maxHp * cloakRatio),
    )

    // Now also equip heartsteel shield (which adds flat +420 maxHp & +10 VIT pre-conversion, AND converts 350% DEF -> maxHp)
    equip(s, 'ac_heartsteel_shield', 'offhand')
    const both = heroBuild(s)
    const defToHpGain = both.conversionGains.maxHp ?? 0
    assert.ok(defToHpGain > 0)
    const preConversionMaxHp = both.stats.maxHp - Math.round(defToHpGain)
    const expectedAtkGain = Math.min(220, preConversionMaxHp * cloakRatio)
    assert.ok(
      Math.abs((both.conversionGains.atk ?? 0) - expectedAtkGain) < 1e-6,
      `Single-pass conversion must read pre-conversion maxHp (${preConversionMaxHp}), not post-conversion maxHp (${both.stats.maxHp})`,
    )
  }
})

test('Item Sets (setBonuses): 2-piece and 3-piece thresholds, duplicate acc ID guard, and heroBuild merge', () => {
  // Duplicate item IDs in two acc slots do NOT double-count toward 2-piece set bonus
  const prism = itemById('ac_seraph_prism')
  const dupeSummary = setBonuses([prism, prism, prism])
  assert.equal(
    dupeSummary.active.length,
    0,
    'Duplicate item IDs in worn array must not count as multiple set pieces',
  )

  // Verify 2-piece and 3-piece thresholds across all ITEM_SETS
  for (const setDef of ITEM_SETS) {
    assert.equal(setById(setDef.id), setDef)
    const memberIds = setDef.memberIds ?? []
    assert.ok(memberIds.length >= 3)
    const m1 = itemById(memberIds[0])
    const m2 = itemById(memberIds[1])
    const m3 = itemById(memberIds[2])

    // 1 piece -> 0 active tiers
    const s1 = setBonuses([m1])
    assert.equal(s1.active.length, 0)

    // 2 distinct pieces -> 2-piece tier active, 3-piece tier is nextTier
    const s2 = setBonuses([m1, m2])
    const act2 = s2.active.find((a) => a.set.id === setDef.id)
    assert.ok(act2, `2 pieces of ${setDef.id} must activate 2pc bonus`)
    assert.equal(act2.count, 2)
    assert.equal(act2.activeTiers.length, 1)
    assert.equal(act2.activeTiers[0].pieces, 2)
    assert.equal(act2.nextTier?.pieces, 3)

    // 3 distinct pieces -> both 2-piece and 3-piece tiers active
    const s3 = setBonuses([m1, m2, m3])
    const act3 = s3.active.find((a) => a.set.id === setDef.id)
    assert.ok(act3, `3 pieces of ${setDef.id} must activate 3pc bonus`)
    assert.equal(act3.count, 3)
    assert.equal(act3.activeTiers.length, 2)
    assert.equal(act3.nextTier?.pieces, setDef.tiers.find((t) => t.pieces > 3)?.pieces) // Q 2026-11-19: Thief-line sets add a 4pc tier
  }

  // Verify 3-piece set effects & conversions merge into heroBuild(s)
  // Test abyssal_leviathan (3pc has conversion maxHp -> matk) & clockwork_chronos (3pc has effect echo_double)
  {
    const s = makeEndgameHero()
    // clockwork_chronos: ac_echo_sabre (weapon), ac_chronos_crown (head), cf_chronowatch (acc)
    s.owned.push('ac_echo_sabre', 'ac_chronos_crown', 'cf_chronowatch')
    assert.equal(equip(s, 'ac_echo_sabre', 'weapon'), true)
    assert.equal(equip(s, 'ac_chronos_crown', 'head'), true)
    assert.equal(equip(s, 'cf_chronowatch', 'acc'), true)

    const build = heroBuild(s)
    const activeChronos = build.sets.active.find((a) => a.set.id === 'clockwork_chronos')
    assert.ok(activeChronos)
    assert.equal(activeChronos.count, 3)
    // 3 echo_double effects: 1 from sabre, 1 from watch, 1 from 3pc set bonus
    const echoEffects = build.effects.filter((e) => e.id === 'echo_double')
    assert.equal(echoEffects.length, 3)
  }

  {
    // Test setBonuses conversion merge into heroBuild via trinity_spellblade + abyssal_leviathan
    // Equipping 2 armor items isn't possible in 1 hero, so let's test eclipse_seraph (armor + acc + head):
    // ac_radiance_plate (armor), ac_seraph_prism (acc), cf_seraphhalo (head)
    const s = makeEndgameHero()
    s.owned.push('ac_radiance_plate', 'ac_seraph_prism', 'cf_seraphhalo')
    assert.equal(equip(s, 'ac_radiance_plate', 'armor'), true)
    assert.equal(equip(s, 'ac_seraph_prism', 'acc'), true)
    assert.equal(equip(s, 'cf_seraphhalo', 'head'), true)

    const build = heroBuild(s)
    const activeEclipse = build.sets.active.find((a) => a.set.id === 'eclipse_seraph')
    assert.ok(activeEclipse)
    assert.equal(activeEclipse.count, 3)
    // 2 radiance_burn effects: 1 from plate (0.35), 1 from 3pc set bonus (0.3)
    const burns = build.effects.filter((e) => e.id === 'radiance_burn')
    assert.equal(burns.length, 2)
    // Conversion from ac_seraph_prism (healAmp -> elemDmg) is active
    assert.ok(build.conversions.some((c) => c.from === 'healAmp' && c.to === 'elemDmg'))
    assert.ok((build.conversionGains.elemDmg ?? 0) > 0)
  }
})

test('Aspect Imbue & Unique Awakening: slot guards, taint block, material/zeny deduction, forged statScaleBonus/curseReduction, and forgetForge cleanup', () => {
  const s = makeEndgameHero()
  const craftWeapon = itemById('ac_trinity_blade') // slot: weapon
  const uniqueHead = itemById('u_ch_asuracrown') // slot: head, unique.dg = 'd10', mod has def: -8

  // Unowned guard
  assert.equal(canImbueAspect(s, craftWeapon, 'aspect_spellblade').why, 'unowned')
  assert.equal(canAwakenUnique(s, uniqueHead).why, 'unowned')

  s.owned.push(craftWeapon.id, uniqueHead.id)

  // Starter item (price === 0, no craft, no unique) cannot be imbued
  const starterKnife = itemById(BARE_ITEM.weapon)
  assert.equal(canImbueAspect(s, starterKnife, 'aspect_spellblade').why, 'invalid')

  // Non-unique cannot be awakened
  assert.equal(canAwakenUnique(s, craftWeapon).why, 'not_unique')

  // Slot guard on canImbueAspect (aspect_radiance is ['armor', 'offhand'], weapon must fail with 'slot')
  assert.equal(canImbueAspect(s, craftWeapon, 'aspect_radiance').why, 'slot')
  assert.equal(imbueAspect(s, craftWeapon, 'aspect_radiance'), false)

  // Taint block on both imbue and awaken
  s.taint = {
    [craftWeapon.id]: { kind: 'blessed', bonus: { atk: 5 } },
    [uniqueHead.id]: { kind: 'blessed', bonus: { atk: 5 } },
  }
  assert.equal(canImbueAspect(s, craftWeapon, 'aspect_spellblade').why, 'tainted')
  assert.equal(canAwakenUnique(s, uniqueHead).why, 'tainted')
  delete s.taint

  // Short materials / zeny check for Imbue
  s.mats = {}
  s.zeny = 100
  const shortImbue = canImbueAspect(s, craftWeapon, 'aspect_spellblade')
  assert.equal(shortImbue.ok, false)
  assert.equal(shortImbue.why, 'short')
  assert.ok(shortImbue.short.includes('m_d10'))
  assert.ok(shortImbue.short.includes('m_rift'))
  assert.ok(shortImbue.short.includes('zeny'))

  // Exact material & zeny deduction on imbueAspect
  const asp = ASPECTS.aspect_spellblade
  s.mats = { m_d10: asp.mats.m_d10, m_rift: asp.mats.m_rift + 3 }
  s.zeny = asp.zeny + 500
  assert.equal(canImbueAspect(s, craftWeapon, 'aspect_spellblade').ok, true)
  assert.equal(imbueAspect(s, craftWeapon, 'aspect_spellblade'), true)
  assert.equal(s.zeny, 500)
  assert.equal(s.mats.m_d10, undefined, 'Zeroed material key must be deleted')
  assert.equal(s.mats.m_rift, 3)
  assert.equal(imbueOf(s, craftWeapon.id), 'aspect_spellblade')
  assert.equal(canImbueAspect(s, craftWeapon, 'aspect_spellblade').why, 'already')

  // Short materials / cards / zeny check for Awaken Unique
  const bossCard = bossCardOfDungeon('d10')!
  assert.equal(bossCard, 'card_starweaver')
  s.cards = {}
  s.mats = {}
  s.zeny = 100
  const shortAwk = canAwakenUnique(s, uniqueHead)
  assert.equal(shortAwk.ok, false)
  assert.equal(shortAwk.why, 'short')
  assert.deepEqual(shortAwk.short, [bossCard, 'b_d10', 'zeny'])

  // Exact card, boss mat, and zeny deduction on awakenUnique
  s.cards = { [bossCard]: UNIQUE_AWAKEN.bossCards }
  s.mats = { b_d10: UNIQUE_AWAKEN.bossMats + 2 }
  s.zeny = UNIQUE_AWAKEN.zeny + 250
  const beforeAwkForged = forged(s, uniqueHead)
  assert.equal(canAwakenUnique(s, uniqueHead).ok, true)
  assert.equal(awakenUnique(s, uniqueHead), true)
  assert.equal(s.zeny, 250)
  assert.equal(s.cards[bossCard], undefined, 'Zeroed boss card key must be deleted')
  assert.equal(s.mats.b_d10, 2)
  assert.equal(isAwakened(s, uniqueHead.id), true)
  assert.equal(canAwakenUnique(s, uniqueHead).why, 'already')

  // Verify forged(s, it) statScaleBonus (+20% positive) & curseReduction (-50% negative curse penalty)
  const afterAwkForged = forged(s, uniqueHead)
  // Positive flat & pct stats scale by 1 + 0.2 = 1.2x
  assert.equal(
    afterAwkForged.mod.atk,
    Math.round((beforeAwkForged.mod.atk ?? 0) * (1 + UNIQUE_AWAKEN.statScaleBonus)),
  )
  assert.equal(
    afterAwkForged.mod.physPen,
    Math.round((beforeAwkForged.mod.physPen ?? 0) * (1 + UNIQUE_AWAKEN.statScaleBonus) * 1000) / 1000,
  )
  // Negative curse penalty (def: -8) scales by 1 - 0.5 = 0.5x (-4)
  assert.equal(beforeAwkForged.mod.def, -8)
  assert.equal(
    afterAwkForged.mod.def,
    Math.round((beforeAwkForged.mod.def ?? 0) * (1 - UNIQUE_AWAKEN.curseReduction)),
  )

  // Verify awakened itemEffectsOf & itemConversionsOf scaling
  const rawEffects = itemEffectsOf(undefined, uniqueHead)
  const awkEffects = itemEffectsOf(s, uniqueHead)
  assert.equal(awkEffects.length, rawEffects.length)
  assert.ok(awkEffects[0].power > rawEffects[0].power)

  const ironRobe = itemById('u_ch_ironrobe')
  s.owned.push(ironRobe.id)
  s.awakened![ironRobe.id] = 1
  const rawConv = itemConversionsOf(undefined, ironRobe)
  const awkConv = itemConversionsOf(s, ironRobe)
  assert.ok(awkConv[0].ratio > rawConv[0].ratio)

  // Verify forgetForge() cleans up both imbue and awakened records
  forgetForge(s, craftWeapon.id)
  forgetForge(s, uniqueHead.id)
  assert.equal(imbueOf(s, craftWeapon.id), undefined)
  assert.equal(isAwakened(s, uniqueHead.id), false)
})

test('Penetration & Elemental Damage: aggregate from items, sets, and aspects and respect STAT_CAPS', () => {
  const s = makeEndgameHero()
  const baseSt = heroStats(s)
  assert.equal(baseSt.physPen, 0)
  assert.equal(baseSt.magPen, 0)
  assert.equal(baseSt.elemDmg, 0)

  // Equip Void Riftweaver 3-piece set:
  // ac_void_bow (weapon: physPen 0.18, magPen 0.12)
  // u_c3_voidprism (acc: physPen 0.14, magPen 0.14, elemDmg 0.20, plus maxRes -> elemDmg conversion)
  // Plus add ac_radiance_plate (armor: elemDmg 0.18) and cf_seraphhalo (head: elemDmg 0.18, magPen 0.12)
  s.owned.push('ac_void_bow', 'u_c3_voidprism', 'ac_radiance_plate', 'cf_seraphhalo', 'ac_seraph_prism')
  equip(s, 'ac_void_bow', 'weapon')
  equip(s, 'u_c3_voidprism', 'acc')
  equip(s, 'ac_radiance_plate', 'armor')
  equip(s, 'cf_seraphhalo', 'head')
  equip(s, 'ac_seraph_prism', 'acc2')

  // Imbue aspect_voidsunder (+0.12 physPen, +0.12 magPen, +0.12 elemDmg) on weapon, head, acc, acc2
  s.imbue = {
    ac_void_bow: 'aspect_voidsunder',
    cf_seraphhalo: 'aspect_voidsunder',
    u_c3_voidprism: 'aspect_voidsunder',
    ac_seraph_prism: 'aspect_voidsunder',
  }

  const worn = wornItems(s)
  assert.equal(worn.length, 6)

  const st = heroStats(s)
  // Raw physPen = 0.18 (bow) + 0.14 (voidprism) + 4 * 0.12 (4 voidsunder aspects) = 0.80 -> clamped to STAT_CAPS.physPen (0.75)
  assert.equal(st.physPen, STAT_CAPS.physPen)

  // Raw magPen = 0.12 (bow) + 0.14 (voidprism) + 0.12 (halo) + 0.14 (seraph_prism) + 0.18 (eclipse_seraph 3pc) + 4 * 0.12 (aspects) = 1.18 -> clamped to STAT_CAPS.magPen (0.75)
  assert.equal(st.magPen, STAT_CAPS.magPen)

  // elemDmg aggregates from items + eclipse_seraph 2pc (+0.22) + aspects + conversions, and stays within STAT_CAPS.elemDmg (2.0)
  assert.ok(st.elemDmg > 1.0 && st.elemDmg <= STAT_CAPS.elemDmg)

  // Now push elemDmg over STAT_CAPS.elemDmg (2.0) using refineLines / awakened to verify the 2.0 cap
  s.awakened = { u_c3_voidprism: 1 }
  s.refineLines = {
    ac_void_bow: [{ k: 'elemDmg', v: 1.5, pct: true, label: 'ธาตุ' }],
  }
  const stCappedElem = heroStats(s)
  assert.equal(stCappedElem.elemDmg, STAT_CAPS.elemDmg)
})
