import test from 'node:test'
import assert from 'node:assert/strict'
import { newSave } from '../src/save'
import { forged, forgeTag, imbueOf, isAwakened, heroBuild, heroStats, jobBonusBase, jobUpText, itemById } from '../src/data/meta'
import { UNIQUE_AWAKEN } from '../src/data/item-effects'
import { STAT_CAPS } from '../src/data/stats'

test('forge-state: isAwakened, imbueOf, forgeTag, and forged aspectModOf + curseReduction', () => {
  const s = newSave('t', 'human')
  assert.equal(isAwakened(s, 'u_pl_aegiscrown'), false)
  assert.equal(imbueOf(s, 'u_pl_aegiscrown'), undefined)
  assert.equal(forgeTag(s, 'u_pl_aegiscrown'), ' 💀')
  assert.equal(forgeTag(s, 'sw_1'), '')

  s.awakened = { u_pl_aegiscrown: 1 }
  s.imbue = { u_pl_aegiscrown: 'aspect_spellblade' }
  assert.equal(isAwakened(s, 'u_pl_aegiscrown'), true)
  assert.equal(imbueOf(s, 'u_pl_aegiscrown'), 'aspect_spellblade')
  assert.equal(forgeTag(s, 'u_pl_aegiscrown'), ' 💀 🌟 🔮')

  // Unawakened vs awakened unique item with negative (curse) stat and aspect mod
  const raw = itemById('u_c3_mjollnir')
  const sPlain = newSave('t', 'human')
  const fPlain = forged(sPlain, raw)
  assert.equal(fPlain.mod?.maxHp, raw.mod?.maxHp)

  const sAwk = newSave('t', 'human')
  sAwk.awakened = { u_c3_mjollnir: 1 }
  sAwk.imbue = { u_c3_mjollnir: 'aspect_coc' }
  const fAwk = forged(sAwk, raw)
  // Positive stats scale by 1 + statScaleBonus (1.2x), negative curse stats scale by 1 - curseReduction (0.5x)
  assert.equal(
    fAwk.mod?.maxHp,
    Math.round((raw.mod?.maxHp ?? 0) * (1 - UNIQUE_AWAKEN.curseReduction)),
  )
  assert.ok((fAwk.mod?.elemDmg ?? 0) > (raw.mod?.elemDmg ?? 0))
  // aspect_coc adds +0.04 crit & +0.04 spellCrit on top of awakened mod
  assert.ok((fAwk.mod?.crit ?? 0) > (raw.mod?.crit ?? 0) * 1.2)
})

test('heroBuild: integrates setBonuses, conversions with caps & cycle guard, and pen/elem caps', () => {
  const s = newSave('t', 'human')
  Object.assign(s, {
    job: 'cleric',
    jobLevel: 40,
    job2: 'monk',
    job2Level: 50,
    job3: 'champion',
    job3Level: 30,
    job3Trial: { champion: 1 },
    owned: ['u_ch_ironrobe', 'u_c3_voidprism'],
    equipped: {
      armor: 'u_ch_ironrobe',
      acc: 'u_c3_voidprism',
    },
    imbue: {
      u_ch_ironrobe: 'aspect_heartsteel',
      u_c3_voidprism: 'aspect_voidsunder',
    },
  })

  const build = heroBuild(s)
  const st = heroStats(s)
  assert.deepEqual(st, build.stats)
  assert.ok(build.effects.some((e) => e.id === 'guardian_pulse'))
  assert.ok(build.effects.some((e) => e.id === 'void_sunder'))
  assert.ok(build. effects.some((e) => e.id === 'mana_overload'))
  assert.ok((build.conversionGains.atk ?? 0) > 0, 'P.DEF -> P.ATK conversion applied')
  assert.ok((build.conversionGains.maxHp ?? 0) > 0, 'P.DEF -> Max HP conversion applied')
  assert.ok((build.conversionGains.elemDmg ?? 0) > 0, 'Max Mana -> elemDmg conversion applied')
  assert.ok(st.physPen <= STAT_CAPS.physPen && st.physPen > 0)
  assert.ok(st.magPen <= STAT_CAPS.magPen && st.magPen > 0)
  assert.ok(st.elemDmg <= STAT_CAPS.elemDmg && st.elemDmg > 0)

  // JOB3_BONUS_STATS for Champion (+2 STR/AGI/WIS per 10 Job3 levels = +6 at Lv 30)
  const jb = jobBonusBase(s)
  const jbNoJ3 = jobBonusBase({ ...s, job3: undefined })
  assert.equal(jb.str - jbNoJ3.str, 6)
  assert.equal(jb.agi - jbNoJ3.agi, 6)
  assert.equal(jb.wis - jbNoJ3.wis, 6)
  assert.match(jobUpText({ ...s, job3Level: 20 }, 1), /Job3 Lv 20!.*STR AGI WIS \+2/)
})
