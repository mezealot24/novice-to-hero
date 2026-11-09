import test from 'node:test'
import assert from 'node:assert/strict'
import { COSTUMES } from '../src/data/meta'
import { fitHeroScale, heroCostumeTint, heroRigSpec, heroTex } from '../src/gfx/hero-visual'

test('heroTex routes Knight line to mounted Peco sprite while keeping other jobs intact', () => {
  assert.equal(heroTex({ job: 'novice' }), 'novice')
  assert.equal(heroTex({ job: 'swordsman' }), 'hero_swordsman')
  assert.equal(heroTex({ job: 'swordsman', job2: 'berserker' }), 'hero_swordsman')
  assert.equal(heroTex({ job: 'swordsman', job2: 'knight' }), 'hero_knight')
  assert.equal(heroTex({ job: 'swordsman', job2: 'knight', job3: 'lordknight' }), 'hero_knight')
  assert.equal(heroTex({ job: 'archer' }), 'hero_archer')
  assert.equal(heroTex({ job: 'mage' }), 'hero_mage')
  assert.equal(heroTex({ job: 'cleric', job2: 'crusader', job3: 'paladin' }), 'hero_cleric')
  assert.equal(heroTex({ job: 'thief', job2: 'rogue' }), 'hero_thief')
})

test('heroRigSpec builds modular Swordsman rig and respects two-hand offhand lock', () => {
  const shielded = heroRigSpec({
    job: 'swordsman',
    equipped: { weapon: 'knife', offhand: 'o_ironshield' },
  })
  assert.equal(shielded.compositeTex, 'hero_swordsman')
  assert.equal(shielded.bodyTex, 'body_swordsman')
  assert.equal(shielded.weaponTex, 'wpn_sword')
  assert.equal(shielded.shieldTex, 'shd_buckler')
  assert.equal(shielded.isMounted, false)
  assert.equal(shielded.isTwoHand, false)

  const twoHand = heroRigSpec({
    job: 'swordsman',
    equipped: { weapon: 'w_greatsword', offhand: 'o_ironshield' },
  })
  assert.equal(twoHand.isTwoHand, true)
  assert.equal(twoHand.shieldTex, undefined)
})

test('heroRigSpec builds modular Knight rig (Lance+Kite vs 2H Halberd) and adds gold aura only when active LK', () => {
  const lanceKnight = heroRigSpec({
    job: 'swordsman',
    job2: 'knight',
    equipped: { weapon: 'w_spear', offhand: 'o_tower' },
  })
  assert.equal(lanceKnight.compositeTex, 'hero_knight')
  assert.equal(lanceKnight.mountTex, 'mount_peco')
  assert.equal(lanceKnight.bodyTex, 'body_knight')
  assert.equal(lanceKnight.weaponTex, 'wpn_lance')
  assert.equal(lanceKnight.shieldTex, 'shd_kite')
  assert.equal(lanceKnight.auraTex, undefined)
  assert.equal(lanceKnight.isMounted, true)
  assert.equal(lanceKnight.isKnightLine, true)

  const halberdKnight = heroRigSpec({
    job: 'swordsman',
    job2: 'knight',
    equipped: { weapon: 'w_lance', offhand: 'o_tower' },
  })
  assert.equal(halberdKnight.weaponTex, 'wpn_halberd')
  assert.equal(halberdKnight.shieldTex, undefined)
  assert.equal(halberdKnight.isTwoHand, true)

  const lordKnight = heroRigSpec({
    job: 'swordsman',
    job2: 'knight',
    job3: 'lordknight',
    equipped: { weapon: 'w_spear', offhand: 'o_tower' },
  })
  assert.equal(lordKnight.auraTex, 'aura_gold')

  const parkedLk = heroRigSpec({
    job: 'swordsman',
    job2: 'berserker',
    job3: 'lordknight',
  })
  assert.equal(parkedLk.auraTex, undefined)
})

test('heroCostumeTint and fitHeroScale handle default/custom costumes and wide Knight sprites cleanly', () => {
  assert.equal(heroCostumeTint(undefined), COSTUMES[0].tint)
  assert.equal(heroCostumeTint('nonexistent'), COSTUMES[0].tint)
  if (COSTUMES[1]) {
    assert.equal(heroCostumeTint(COSTUMES[1].id), COSTUMES[1].tint)
  }

  // Standard 48x52 fits inside 180px box at full baseScale 3.2 (3.2 * 52 = 166.4 <= 180)
  assert.equal(fitHeroScale(48, 52, 3.2, 180), 3.2)
  // Wide 68x64 Knight shrinks proportionally to stay inside 180px box
  assert.equal(fitHeroScale(68, 64, 3.2, 180), 180 / 68)
  // Zero guard
  assert.equal(fitHeroScale(0, 0, 2, 100), 2)
})

