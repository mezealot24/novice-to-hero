import test from 'node:test'
import assert from 'node:assert/strict'
import { canWear, canWearAs, heroStats, itemById, ITEMS, itemStatLine, itemUnlocked } from '../src/data/meta'
import { CLASS_CRAFT_ITEMS, D7_CLASS_GEAR, D8_CLASS_GEAR, D9_CLASS_GEAR, JOB2_ARMORS, JOB3_CRAFT_ITEMS } from '../src/data/class-craft'
import { craftCost, forgeItem, gradeCap, matDungeon, refinable } from '../src/data/craft'
import { pinnedReady } from '../src/data/cardforge'
import { JOB2 } from '../src/data/jobs2'
import { JOB3 } from '../src/data/jobs3'
import { JOBS, type JobId } from '../src/data/jobs'
import { matById } from '../src/data/materials'
import { equip, newSave, pay, type SaveData } from '../src/save'

const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}

const BASE_JOBS: JobId[] = ['swordsman', 'thief', 'cleric', 'mage', 'archer']

test('class craft: all ids unique, inside ITEMS, valid craft recipes & materials', () => {
  const ids = ITEMS.map((i) => i.id)
  assert.equal(new Set(ids).size, ids.length, 'no duplicate IDs')
  assert.equal(CLASS_CRAFT_ITEMS.length, 31, '10 J2 armors + 15 D7-D9 + 6 J3 pieces')

  for (const it of CLASS_CRAFT_ITEMS) {
    assert.equal(itemById(it.id), it)
    assert.ok(it.craft, `${it.id} has craft info`)
    assert.equal(it.price, 0, `${it.id} is forge-only`)
    assert.equal(refinable(it), true)
    assert.equal(gradeCap(it), 5)
    assert.equal(matDungeon(it), it.craft!.dg)

    const cost = craftCost(it)
    for (const matId of Object.keys(cost.mats)) {
      assert.ok(matById(matId), `${it.id} uses real material ${matId}`)
    }

    // Verify all stats on item produce readable Thai stat lines
    assert.ok(itemStatLine(forgeItem(it, 5, 0)).length > 0, `${it.id} produces stat text`)
  }
})

test('class craft: every 2nd job has its own distinct D6 crafted armor', () => {
  assert.equal(JOB2_ARMORS.length, 10)
  const seenJ2 = new Set<string>()
  const names = new Set<string>()

  for (const it of JOB2_ARMORS) {
    assert.equal(it.slot, 'armor')
    assert.equal(it.craft!.dg, 'd6')
    assert.equal(it.j2?.length, 1)
    const j2 = it.j2![0]
    assert.ok(JOB2[j2], `valid 2nd job ${j2}`)
    assert.ok(it.jobs?.includes(JOB2[j2].parent), `${it.id} parent class matches`)
    assert.equal(seenJ2.has(j2), false, `only one D6 armor per 2nd job (${j2})`)
    seenJ2.add(j2)
    names.add(it.name)

    // Strictly locked to its 2nd job
    assert.equal(canWear(it, JOB2[j2].parent, j2), true)
    assert.equal(canWear(it, JOB2[j2].parent), false, 'requires 2nd job')
    const otherJ2 = Object.keys(JOB2).find((k) => k !== j2) as keyof typeof JOB2
    assert.equal(canWear(it, JOB2[otherJ2].parent, otherJ2), false, 'other 2nd job cannot wear')
  }
  assert.equal(seenJ2.size, Object.keys(JOB2).length, 'every 2nd job covered')
  assert.equal(names.size, 10, 'every armor has a distinct name')
})

test('class craft: D7, D8, and D9 each provide 1 distinct crafted gear per base class', () => {
  for (const [tier, list, dg] of [
    ['D7', D7_CLASS_GEAR, 'd7'],
    ['D8', D8_CLASS_GEAR, 'd8'],
    ['D9', D9_CLASS_GEAR, 'd9'],
  ] as const) {
    assert.equal(list.length, 5, `${tier} has 5 pieces`)
    const jobsCovered = new Set<JobId>()
    for (const it of list) {
      assert.equal(it.craft!.dg, dg)
      assert.equal(it.jobs?.length, 1, `${it.id} locked to 1 base class`)
      const j = it.jobs![0]
      assert.ok(JOBS[j])
      jobsCovered.add(j)

      // Check class lock
      assert.equal(canWear(it, j), true)
      const other = BASE_JOBS.find((x) => x !== j)!
      assert.equal(canWear(it, other), false, `${it.id} cannot be worn by ${other}`)
    }
    assert.equal(jobsCovered.size, 5, `${tier} covers all 5 base classes`)
  }
})

test('class craft: D10 3rd-job Awakening gear covers Lord Knight full set & Paladin armor/shield', () => {
  assert.equal(JOB3_CRAFT_ITEMS.length, 6)
  const lk = JOB3_CRAFT_ITEMS.filter((i) => i.j3?.includes('lordknight'))
  const pl = JOB3_CRAFT_ITEMS.filter((i) => i.j3?.includes('paladin'))

  assert.deepEqual(lk.map((i) => i.slot).sort(), ['acc', 'armor', 'head', 'weapon'])
  assert.deepEqual(pl.map((i) => i.slot).sort(), ['armor', 'offhand'])

  for (const it of JOB3_CRAFT_ITEMS) {
    assert.equal(it.craft!.dg, 'd10')
    assert.equal(it.req, 'job3')
    const j3 = it.j3![0]
    const j2 = JOB3[j3].parent
    const baseJob = JOB2[j2].parent
    assert.equal(canWear(it, baseJob, j2), false, '2nd job cannot wear 3rd job craft')
    assert.equal(canWear(it, baseJob, j2, j3), true, 'matching 3rd job can wear')
  }
})

test('class craft: forging, equipping, heroStats, and pinnedReady integration', () => {
  const s: SaveData = newSave('smith', 'human')
  s.job = 'swordsman'
  s.job2 = 'knight'
  s.job3 = 'lordknight'
  s.zeny = 50000
  s.clearsBy = { d6: 1, d10: 1 }
  s.mats = {
    m_d6: 30, b_d6: 10,
    m_d10: 30, b_d10: 10,
  }

  // Pin Lord Knight lance and check pinnedReady
  const lance = itemById('cc_lk_lance')
  s.forgePin = lance.id
  assert.equal(itemUnlocked(lance, s), true)
  assert.equal(pinnedReady(s), lance, 'pinnedReady detects class craft item')

  // Craft & equip D6 Knight armor + D10 LK lance
  const barding = itemById('cc_kn_barding')
  assert.equal(pay(s, craftCost(barding)), true)
  s.owned.push(barding.id)
  assert.equal(canWearAs(barding, s), true)
  assert.equal(equip(s, barding.id), true)

  assert.equal(pay(s, craftCost(lance)), true)
  s.owned.push(lance.id)
  assert.equal(equip(s, lance.id), true)

  // Should no longer be pinnedReady once owned
  assert.equal(pinnedReady(s), undefined)

  // Verify stats apply
  const st = heroStats(s)
  assert.ok(st.j2HpDmg >= 0.035, 'j2HpDmg from both knight armor and LK lance')
  assert.ok(st.j2Spiral >= 0.15, 'j2Spiral from LK lance')
  assert.ok(st.j2Guard >= 0.04, 'j2Guard from knight armor')
})
