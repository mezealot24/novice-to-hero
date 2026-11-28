// usage: node bot.cjs <html> <job> <runs>   MODE=tower TOWER_MAX=15 (climb then leave) · MODE=daily SEED=yyyymmdd · START=n tower start floor · TMO=ms per run
// EVENT=id forces every post-wave event · PICK=smart takes the best-looking level-up card instead of a random one, PICK=last always the last card (the common / general one: same cards on old and new builds, for A/B) · พร v2: PERK=id[,id] puts that card in slot 1 of every level-up and the bot takes slot 1 · MYTHIC=id same as RELIC=id
// env: ALLOC='{"str":8,"int":7}' overrides the class stat spread · GEAR=1 class gear · D=2 dungeon 3 (Lv 10 hero, dungeon-2 gear) · D=4 Lv 15 hero for dungeon 4 · D=5 Lv 20 + หัวใจไฮดรา for dungeon 5 · DUN=index · RELIC=id force a pick
// env (M1+): J2TAL / TAL2='{"1":{"id":"...","rank":2}}' · BOT_SEED=n deterministic Math.random per run · PLAYWRIGHT_CHANNEL / PLAYWRIGHT_EXECUTABLE_PATH · ALLOW_PAGE_ERRORS=1
const fs = require('fs')
const path = require('path')
const { pathToFileURL, fileURLToPath } = require('url')
const { chromium } = require('playwright')
const [html, job, runsArg] = process.argv.slice(2)
// LITE=1 (v78, weak PC): one low-memory Chromium (no GPU / 1 renderer / 512 MB heap / tiny viewport), 3 runs unless given,
// 90 s per run, slower polling. Pair with tools/bot-lite.sh (one job at a time, never in parallel).
const LITE = !!process.env.LITE
const RUNS = +runsArg || (LITE ? 3 : 8)
if (LITE) process.env.TMO ||= '90000'
if (process.env.MYTHIC) process.env.RELIC = process.env.MYTHIC
if (!html || !job) { console.error('usage: node bot.cjs <html> <job> [runs]'); process.exit(1) }
const JOB_ALLOC = {
  swordsman: { str: 8, vit: 7 }, archer: { dex: 8, agi: 7 }, mage: { int: 8, wis: 7 },
  cleric: { wis: 8, int: 7 }, thief: process.env.TH_LUK ? { agi: 8, luk: 7 } : { agi: 8, str: 7 }, // Q 2026-11-03: Thief damage comes from STR
}
if (!JOB_ALLOC[job]) { console.error(`Invalid job "${job}". Expected one of: ${Object.keys(JOB_ALLOC).join(', ')}`); process.exit(1) }
const J2_ALLOC = {
  crusader: { str: 5, vit: 6, int: 4 },
  monk: { str: 5, agi: 4, vit: 3, wis: 3 },
}
const alloc = { ...(process.env.JOB2 && J2_ALLOC[process.env.JOB2] ? J2_ALLOC[process.env.JOB2] : JOB_ALLOC[job]) }
if (process.env.ALLOC) { for (const k in alloc) delete alloc[k]; Object.assign(alloc, JSON.parse(process.env.ALLOC)) } // e.g. ALLOC='{"str":8,"int":7}'
function resolveHtmlUrl(raw) {
  if (/^file:\/\//i.test(raw)) {
    const p = fileURLToPath(raw)
    if (!fs.existsSync(p)) { console.error(`HTML file not found: ${p}`); process.exit(1) }
    return raw
  }
  let norm = /^\/[A-Za-z]:\//.test(raw) ? raw.slice(1) : raw
  if (process.platform === 'win32' && /^\/[A-Za-z]\//.test(norm) && !fs.existsSync(path.resolve(norm))) {
    norm = `${norm[1]}:/${norm.slice(3)}`
  }
  const abs = path.resolve(norm)
  if (!fs.existsSync(abs)) { console.error(`HTML file not found: ${abs}`); process.exit(1) }
  return pathToFileURL(abs).href
}
const htmlUrl = resolveHtmlUrl(html)
const D = +(process.env.D || 1)
const stats = { str: 1, vit: 1, wis: 1, dex: 1, int: 1, luk: 1, agi: 1 }
for (const k in alloc) stats[k] += alloc[k]
if (D === 2 && !process.env.LO) { for (const k in alloc) stats[k] += alloc[k]; stats.vit += 3 } // ~Base Lv 10: 30 points
const save = {
  v: 1, name: 'Bot', race: 'human', baseLevel: 5, baseXp: 0, statPoints: 0, jobLevel: 1, jobXp: 0, skillPoints: 0,
  skills: { smash: 1, firstaid: 0, tough: 0, focus: 0, power: 0, iron: 0, swift: 0 }, nov2: 1, job, jobSkills: { auto: 1, ult: 1 }, stats, zeny: 0, gems: 0,
  owned: ['knife', 'cloth', 'none', 'shortsword', 'leather'], equipped: { weapon: 'shortsword', armor: 'leather', acc: 'none' },
  ...(process.env.GEAR ? (() => { const [w, a, c] = { swordsman: ['w_bloodblade', 'a_thornmail', 'r_fist'], archer: ['w_hawkbow', 'a_eaglecloak', 'r_wind'], mage: ['w_wardstaff', 'a_runerobe', 'r_mana'], cleric: ['w_holymace', 'a_lightvestment', 'r_beads'], thief: ['w_shadowdagger', 'a_nightsuit', 'r_feather'] }[job]; return { owned: ['knife', 'cloth', 'none', w, a, c], equipped: { weapon: w, armor: a, acc: c } } })() : {}),
  costumes: ['default'], costume: 'default', supporter: false, clears: 1, bestRoom: 0, clearsBy: { d1: 1 }, lastDaily: '2099-01-01', muted: true,
}
if (D === 2 && !process.env.LO) {
  const [w, a] = { swordsman: ['w_berserkaxe', 'a_thornmail'], archer: ['w_starbow', 'a_eaglecloak'], mage: ['w_archstaff', 'a_runerobe'], cleric: ['w_sunmace', 'a_lightvestment'], thief: ['w_twinfang', 'a_nightsuit'] }[job]
  Object.assign(save, { baseLevel: 10, jobLevel: 8, jobSkills: { auto: 3, ult: 3 }, owned: ['knife', 'cloth', 'none', w, a, 'r_alphafang'], equipped: { weapon: w, armor: a, acc: 'r_alphafang' }, clearsBy: { d1: 3, d2: 1 }, clears: 4 })
}
if (D >= 4) { // Dungeon 4-5 profiles: Lv 15 (45 points) / Lv 20 (60 points) + dungeon-2 class gear
  const k = D === 4 ? 3 : 4
  for (const key in stats) stats[key] = 1
  for (const key in alloc) stats[key] += alloc[key] * k
  const [w, a] = { swordsman: ['w_berserkaxe', 'a_thornmail'], archer: ['w_starbow', 'a_eaglecloak'], mage: ['w_archstaff', 'a_runerobe'], cleric: ['w_sunmace', 'a_lightvestment'], thief: ['w_twinfang', 'a_nightsuit'] }[job]
  const acc = process.env.ACC || (D === 4 ? 'r_alphafang' : 'r_hydraheart')
  Object.assign(save, { baseLevel: D === 4 ? 15 : 20, jobLevel: D === 4 ? 15 : 20, jobSkills: { auto: D === 4 ? 5 : 7, ult: D === 4 ? 5 : 7 }, owned: ['knife', 'cloth', 'none', w, a, acc], equipped: { weapon: w, armor: a, acc }, clearsBy: { d1: 3, d2: 2, d3: 2, d4: D === 5 ? 1 : 0 }, clears: 8 })
}
if (D >= 6) { // D6 profile (Q 2026-11-04 level dungeons): Base Lv 45 (135 points), Job Lv 40, D5 gear; pair with CRAFTED=1 EXTRA=1 REFINE=7
  // v78: D=7..10 -> Base Lv 55 / 65 / 75 / 85 (points 3 x (Lv-1) split by the class alloc) · BL=n overrides
  const bl = +(process.env.BL || [45, 55, 65, 75, 85][Math.min(4, D - 6)])
  const k = D === 6 ? 9 : Math.round(3 * (bl - 1) / 15)
  for (const key in stats) stats[key] = 1
  for (const key in alloc) stats[key] += alloc[key] * k
  Object.assign(save, { baseLevel: bl, jobLevel: 40, jobSkills: { auto: 10, ult: 10 }, clearsBy: { d1: 3, d2: 2, d3: 2, d4: 2, d5: 1, ...Object.fromEntries([6, 7, 8, 9].filter((n) => n < D).map((n) => [`d${n}`, 1])) }, clears: 10 })
  if (!process.env.ACC) { save.owned.push('r_hydraheart'); save.equipped.acc = 'r_hydraheart' }
}
// skill web (v27): old class skill levels -> +power nodes (12%/lv); S2=<skill2 id> learns that Skill 2 (+ PL "+" levels, STAR=1 its ★)
{
  const lvTo = (lv) => Math.min(5, Math.round(((lv || 1) - 1) * 10 / 12))
  const t = { [`${job}_s1p`]: lvTo(save.jobSkills.auto), [`${job}_ultp`]: lvTo(save.jobSkills.ult) }
  if (process.env.S2) { t[process.env.S2] = 1; t[process.env.S2 + '_p'] = +(process.env.PL ?? 0); if (process.env.STAR) { if (!process.env.PL || t[process.env.S2 + '_p'] < 3) t[process.env.S2 + '_p'] = 5; t[process.env.S2 + '_x'] = 1 } } // v83: "+" max 5 (up to 10/15 at Job2/Job3; preserve explicit PL >= 3)
  if (process.env.TREEX) Object.assign(t, JSON.parse(process.env.TREEX)) // extra web nodes, e.g. {"thief_core1":5,"thief_v1":5,"thief_v2":5,"thief_v3":5,"thief_v4":1}
  Object.assign(save, { web: 1, stretch: 1, bmRework: 2, thiefRogueRework: 6, swordsmanRework: 1, jobTree: t, jobSkills: { auto: 1, ult: 1 } }) // stretch / bmRework / thiefRogueRework / swordsmanRework: skip migrations (else load() wipes the bot's jobTree)
}
// EXTRA=1: also wear headgear + off-hand for the class and a second accessory (equipment screen v1)
if (process.env.EXTRA) {
  const hi = D >= 2
  const [h, o] = { swordsman: ['h_helm', hi ? 'o_tower' : 'o_ironshield'], archer: ['h_ranger', hi ? 'o_windquiver' : 'o_quiver'], mage: ['h_witch', hi ? 'o_starorb' : 'o_orb'], cleric: ['h_halo', 'o_holyshield'], thief: ['h_hood', hi ? 'o_scorpion' : 'o_maingauche'] }[job]
  const a2 = hi ? 'fang' : 'clover'
  save.owned = [...save.owned, h, o, a2]
  save.equipped = { ...save.equipped, head: h, offhand: o, acc2: a2 }
}
// CRAFTED=1: forged kit for the class (d3 craft weapon, emerald mail, lich ring at D5) at GRADE 4 / REFINE 5 unless set; pair with EXTRA=1
if (process.env.CRAFTED) {
  const w = { swordsman: 'c_herosword', archer: 'c_sealbow', mage: 'c_sealstaff', cleric: 'c_dawnmace', thief: 'c_rustfang' }[job]
  process.env.WEAPON ||= w; process.env.ARMOR ||= 'c_emeraldmail'; if (D >= 5) process.env.ACC ||= 'c_lichring'
  process.env.GRADE ||= '4'; process.env.REFINE ||= '5'
}
// forge (design/item-acquisition-v1.md): WEAPON / ARMOR / ACC / HEAD / OFF=<item id> swap gear in, GRADE=n puts every worn item at grade n
for (const [env, slot] of [['WEAPON', 'weapon'], ['ARMOR', 'armor'], ['ACC', 'acc'], ['HEAD', 'head'], ['OFF', 'offhand']]) if (process.env[env]) { save.owned.push(process.env[env]); save.equipped[slot] = process.env[env] }
if (process.env.GRADE) save.grade = Object.fromEntries(Object.values(save.equipped).map((id) => [id, +process.env.GRADE]))
// refine (phase 2): REFINE=n puts every worn item at +n (no bonus lines), BROKEN=1 marks them all broken
// SOCK='{"<item id>":["card id",...]}' slots cards (bag gets them too) · TAL='{"1":{"id":"cleric_t1_focus","rank":2}}' sets talents · J2TAL/TAL2 sets job2Talents
if (process.env.BL) save.baseLevel = +process.env.BL // HARD=1 tests: scaling reads Base Lv
if (process.env.HARD) save.hardClearsBy = {}
if (process.env.SOCK) { save.sockets = JSON.parse(process.env.SOCK); save.cards = {}; for (const ids of Object.values(save.sockets)) for (const id of ids) save.cards[id] = (save.cards[id] ?? 0) + 1 }
if (process.env.TAL) save.jobTalents = JSON.parse(process.env.TAL)
if (process.env.J2TAL || process.env.TAL2) save.job2Talents = JSON.parse(process.env.J2TAL || process.env.TAL2)
if (process.env.PASSIVE) save.passiveNodes = JSON.parse(process.env.PASSIVE)
// 2nd job (design/second-jobs-v1.md): JOB2=berserker|knight|rogue|mobster|crusader|monk|wizard|sage|beastmaster|innovator · PET=hawk|boar|wolf (Beastmaster) · J2LV=n (default 30) · J2T='{"node":lv}' replaces the preset web, J2T=0 empty · J2W=<weapon id> (default the mastery weapon, J2W=0 keeps gear)
if (process.env.JOB2) {
  const j2 = process.env.JOB2
  const preset = { // v83 node levels: old full 1/2/3 -> 3/4/5 (★, +power and NO_STRETCH nodes keep theirs)
    berserker: { berserker_s3p: 5, berserker_u2p: 5, bz_c1: 5, bz_c2: 5, bz_c3: 5, bz_c4: 1, bz_d1: 5, bz_d2: 5 },
    knight: { knight_s3p: 5, knight_u2p: 5, kn_p1: 5, kn_p2: 1, kn_g1: 5, kn_g2: 5, kn_g3: 5, kn_g4: 1 },
    rogue: { rogue_s3p: 5, rogue_u2p: 5, rg_c1: 5, rg_c2: 5, rg_c3: 5, rg_c4: 1, rg_k1: 5, rg_k2: 5, rg_k3: 5 },
    mobster: { mobster_s3p: 5, mobster_u2p: 5, mb_e1: 5, mb_e2: 5, mb_e3: 5, mb_e4: 1, mb_p1: 5, mb_p2: 5, mb_p3: 5 },
    crusader: { crusader_s3p: 5, crusader_u2p: 5, cr_s1: 5, cr_s2: 5, cr_s3: 5, cr_s4: 1, cr_d1: 5, cr_d2: 5, cr_d3: 5 },
    monk: { monk_s3p: 5, monk_u2p: 5, mk_s1: 3, mk_s2: 1, mk_u1: 5, mk_c1: 5, mk_c2: 5, mk_c3: 4, mk_c4: 1, mk_h1: 5, mk_h2: 2 },
    wizard: { wizard_s3p: 5, wizard_u2p: 5, wz_i1: 5, wz_i2: 5, wz_i3: 5, wz_i4: 1, wz_m1: 5, wz_m2: 5, wz_m3: 5 }, // Phase 5 Mage
    sage: { sage_s3p: 5, sage_u2p: 5, sg_a1: 5, sg_a2: 5, sg_a3: 1, sg_a4: 1, sg_e1: 4, sg_e2: 5, sg_e3: 1, sg_r1: 5, sg_r2: 4 },
    beastmaster: { beastmaster_s3p: 5, beastmaster_u2p: 5, bm_w1: 5, bm_w2: 5, bm_w3: 5, bm_w4: 1, bm_h1: 5, bm_h2: 5, bm_h3: 1, bm_h4: 1 }, // Rework v2.1 (legal caps, 2 ★)
    innovator: { innovator_s3p: 5, innovator_u2p: 5, in_g1: 5, in_g2: 5, in_g3: 4, in_g4: 1, in_r1: 5, in_r2: 4, in_r3: 5, in_r4: 1 },
  }[j2] || {}
  const t = process.env.J2T === '0' ? {} : process.env.J2T ? JSON.parse(process.env.J2T) : preset
  Object.assign(save, { job2: j2, job2Level: +(process.env.J2LV || 30), job2Xp: 0, job2Points: 0, job2Tree: t, jobLevel: 40 }) // default J2LV=30 kept for bot-lite.sh compatibility; pass J2LV=40..50 or custom J2T when preset exceeds 29 pts
  save.clearsBy = { ...save.clearsBy, d5: Math.max(1, save.clearsBy.d5 || 0) }
  const w = process.env.J2W ?? { berserker: 'w_greatsword', knight: 'w_spear', rogue: 'w_assassin', mobster: 'w_assassin', crusader: 'w_crusmace', monk: 'w_knuckle', wizard: 'w_wizstaff', sage: 'w_sagebook', beastmaster: 'w_beastbow', innovator: 'w_gadgetbow' }[j2]
  if (w && w !== '0') { save.owned.push(w); save.equipped.weapon = w }
  const o = process.env.J2O ?? { rogue: 'o_rogueknife', mobster: 'o_mobknife', crusader: 'o_crusshield' }[j2] // J2O=<off-hand id> (default the class off-hand), J2O=0 keeps gear
  if (o && o !== '0') { save.owned.push(o); save.equipped.offhand = o }
  if (process.env.PET) save.pet = process.env.PET
}
// 3rd job (design/awakening-crusader-v1.md): JOB3=paladin|lordknight|champion|ranger|warlord|professor|stalker|kingpin|highwizard|mechanic (needs JOB2 = its parent) · J3LV=n (default 30) · J3P=pure|hybrid · J3V=a|b · J3T='{"node":lv}' (or J3T=0 empty)
// sets the Master Trial win + ดัน 10 clear so the save is a legal Awakening
if (process.env.JOB3) {
  const j3 = process.env.JOB3
  const preset3 = {
    paladin: { paladin_u3p: 5, pa_l1: 3, pa_l2: 3, pa_l3: 3, pa_l4: 1, pa_g1: 3, pa_g2: 3, pa_g3: 2, pa_g4: 1, pa_r1: 3, pa_r2: 2 }, // 29 pts, max 2 ★
    lordknight: { lordknight_u3p: 5, lk_l1: 3, lk_l2: 3, lk_l3: 3, lk_l4: 1, lk_g1: 3, lk_g2: 3, lk_g3: 2, lk_g4: 1, lk_r1: 3, lk_r2: 2 }, // 29 pts, max 2 ★
    champion: { champion_u3p: 5, ch_l1: 3, ch_l2: 3, ch_l3: 3, ch_l4: 1, ch_g1: 3, ch_g2: 3, ch_g3: 2, ch_g4: 1, ch_r1: 3, ch_r2: 2 }, // 29 pts, max 2 ★
    ranger: { ranger_u3p: 5, rn_l1: 3, rn_l2: 3, rn_l3: 3, rn_l4: 1, rn_g1: 3, rn_g2: 3, rn_g3: 2, rn_g4: 1, rn_r1: 3, rn_r2: 2 }, // 29 pts, max 2 ★
    warlord: { warlord_u3p: 5, wl_l1: 3, wl_l2: 3, wl_l3: 3, wl_l4: 1, wl_u1: 3, wl_u2: 3, wl_u3: 2, wl_u4: 1, wl_b1: 3, wl_b2: 2 }, // 29 pts, max 2 ★
    professor: { professor_u3p: 5, pf_l1: 3, pf_l2: 2, pf_l3: 3, pf_l4: 1, pf_r1: 3, pf_r2: 1, pf_r3: 3, pf_r4: 1, pf_p1: 3, pf_p2: 2, pf_p3: 2 }, // 29 pts, 2 ★ (needs Sage perk points in J2T for reactions)
    // the last four (docs/design/awakening-last-four-v1.md): 29 pts, 2 ★ (legacy ★ สืบสาน + the Ult ★)
    stalker: { stalker_u3p: 5, sk_l1: 3, sk_l2: 3, sk_l3: 3, sk_l4: 1, sk_p1: 3, sk_p2: 3, sk_p3: 2, sk_p4: 1, sk_s1: 3, sk_s2: 2 },
    kingpin: { kingpin_u3p: 5, kp_l1: 3, kp_l2: 3, kp_l3: 3, kp_l4: 1, kp_t1: 3, kp_t2: 3, kp_t3: 2, kp_t4: 1, kp_f1: 3, kp_f2: 2 },
    highwizard: { highwizard_u3p: 5, hw_l1: 3, hw_l2: 3, hw_l3: 3, hw_l4: 1, hw_g1: 3, hw_g2: 3, hw_g3: 2, hw_g4: 1, hw_a1: 3, hw_a2: 2 },
    mechanic: { mechanic_u3p: 5, mc_l1: 3, mc_l2: 3, mc_l3: 3, mc_l4: 1, mc_c1: 3, mc_c2: 3, mc_c3: 2, mc_c4: 1, mc_o1: 3, mc_o2: 2 },
  }[j3] || {}
  const t3 = process.env.J3T === '0' ? {} : process.env.J3T ? JSON.parse(process.env.J3T) : preset3
  Object.assign(save, { job3: j3, job3Level: +(process.env.J3LV || 30), job3Xp: 0, job3Points: 0, job3Tree: t3,
    job3Path: process.env.J3P || 'pure', job3Var: process.env.J3V || 'a', job3Trial: { [j3]: 1 }, job2Level: 50 })
  save.clearsBy = { ...save.clearsBy, d10: Math.max(1, save.clearsBy.d10 || 0) }
}
if (process.env.REFINE) save.refine = Object.fromEntries(Object.values(save.equipped).map((id) => [id, +process.env.REFINE]))
if (process.env.GRADES) save.grade = JSON.parse(process.env.GRADES) // per-item grade '{"<item id>":5}' (after the 2nd-job weapon swap, so it counts)
if (process.env.BROKEN) save.broken = Object.values(save.equipped)

async function launchBrowser() {
  const baseOpts = LITE
    ? { args: ['--disable-gpu', '--disable-dev-shm-usage', '--disable-extensions', '--mute-audio', '--renderer-process-limit=1', '--js-flags=--max-old-space-size=512'] }
    : {}
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
    return chromium.launch({ ...baseOpts, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH })
  }
  if (process.env.PLAYWRIGHT_CHANNEL) {
    return chromium.launch({ ...baseOpts, channel: process.env.PLAYWRIGHT_CHANNEL })
  }
  const attempts = []
  try {
    const defExe = chromium.executablePath()
    if (defExe && fs.existsSync(defExe)) attempts.push({ ...baseOpts })
  } catch {}
  attempts.push(
    { ...baseOpts, channel: 'chrome' },
    { ...baseOpts, channel: 'msedge' },
    ...(fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe') ? [{ ...baseOpts, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' }] : []),
    ...(fs.existsSync('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe') ? [{ ...baseOpts, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' }] : []),
    ...(fs.existsSync('C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe') ? [{ ...baseOpts, executablePath: 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe' }] : []),
  )
  const errs = []
  for (const opts of attempts) {
    try {
      return await chromium.launch(opts)
    } catch (e) {
      errs.push(`${opts.channel || opts.executablePath || 'default'}: ${e.message.split('\n')[0]}`)
    }
  }
  throw new Error(`No Chromium/Chrome/Edge browser could launch (${errs.join('; ')})`)
}

const BOT_SEED = +(process.env.BOT_SEED || 0)
const ALLOW_PAGE_ERRORS = !!process.env.ALLOW_PAGE_ERRORS

;(async () => {
  const b = await launchBrowser()
  const p = await b.newPage(LITE ? { viewport: { width: 480, height: 270 } } : undefined)
  let errors = 0
  let crashed = false
  p.on('crash', () => { crashed = true; console.error('page crashed') })
  p.on('pageerror', (e) => { errors++; console.error('pageerror', e.message, (e.stack || '').split('\n').slice(1, 4).join(' | ').slice(0, 400)) })
  await p.addInitScript((s) => {
    localStorage.setItem('novice-to-hero.save.v1', JSON.stringify(s))
  }, save)
  await p.goto(htmlUrl)
  await p.waitForFunction(() => window.__nth && window.__nth.scene.isActive('title'), null, { timeout: 30000 })
  await p.waitForFunction(() => window.__nth && window.__nth.scene.isActive('title'), null, { timeout: 30000 })
  const res = []
  for (let r = 0; r < RUNS; r++) {
    const runSeed = BOT_SEED > 0 ? (BOT_SEED + r * 1013) : 0
    res.push(await p.evaluate(async ([first, RELIC, D, DUN, HARD, MODE, TOWER_MAX, SEED, TMO, START, PERK, EVENT, SMART, LAST, POLL, RUN_SEED]) => {
      if (RUN_SEED > 0) {
        if (!window.__setBotSeed) {
          let st = (RUN_SEED >>> 0) || 1
          const mulberry32 = () => {
            st = (st + 0x6D2B79F5) | 0
            let t = Math.imul(st ^ (st >>> 15), 1 | st)
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296
          }
          window.__setBotSeed = (n) => { st = ((n >>> 0) || 1) }
          Math.random = mulberry32
        } else {
          window.__setBotSeed(RUN_SEED)
        }
      }
      const g = window.__nth, R = g.renderer
      R.preRender = () => {}; R.render = () => {}; R.postRender = () => {} // test only: skip drawing
      if (first) { g.scene.getScenes(true).forEach((s) => s.scene.stop()); g.scene.start('battle', MODE ? { mode: MODE, ...(SEED ? { seed: SEED } : {}), ...(START ? { startFloor: START } : {}) } : { d: DUN, hard: !!HARD, ...(HARD === 'hell' ? { hell: true } : {}) }) } // HARD=hell: 😈 hell mode (D6-D10)
      while (!window.__battle || !window.__battle.st) await new Promise((r) => setTimeout(r, 30))
      const B = window.__battle
      const newTel = () => ({
        totalDmg: 0, ultDmg: 0, ultWinDmg: 0, s1Dmg: 0, s2Dmg: 0, s3Dmg: 0, s4Dmg: 0,
        basicDmg: 0, counterDmg: 0, procDmg: 0, dotDmg: 0, allyDmg: 0,
        dawnDmg: 0, faithDmg: 0, haymakerDmg: 0, spearDmg: 0,
        healedHp: 0, shieldSoaked: 0, blocks: 0, dodges: 0,
        __sub: '', __stack: [],
      })
      if (!B.__botPatched) {
        B.__botPatched = true
        B.__botTel = newTel()
        const recDmg = (scene, dealt, isDot) => {
          if (!(dealt > 0)) return
          const tel = scene.__botTel
          tel.totalDmg += dealt
          const inUltWin = (typeof scene.inUltWindow === 'function' ? scene.inUltWindow() : false) || scene.skillSlot === 'ult'
          if (inUltWin) tel.ultWinDmg += dealt
          if (scene.allyHitting) tel.allyDmg += dealt
          if (tel.__sub === 'dawn') tel.dawnDmg += dealt
          else if (tel.__sub === 'faith') tel.faithDmg += dealt
          else if (tel.__sub === 'haymaker') tel.haymakerDmg += dealt
          else if (tel.__sub === 'spear') tel.spearDmg += dealt
          if (scene.src === 'ult' || scene.skillSlot === 'ult') tel.ultDmg += dealt
          else if (scene.inS3) tel.s3Dmg += dealt
          else if (scene.skillSlot === 's1') tel.s1Dmg += dealt
          else if (scene.skillSlot === 's2') tel.s2Dmg += dealt
          else if (scene.skillSlot === 's4') tel.s4Dmg += dealt
          else if (!isDot && (scene.src === 'basic' || scene.src === 'combo')) tel.basicDmg += dealt
          else if (!isDot && scene.src === 'counter') tel.counterDmg += dealt
          else {
            tel.procDmg += dealt
            if (isDot) tel.dotDmg += dealt
          }
        }
        B.__botRecDmg = recDmg
        const origDmgMon = B.damageMon
        if (typeof origDmgMon === 'function') {
          B.damageMon = function(m, dmg, crit, color, dot, skipB5, pure) {
            if (!m || m.dead) return origDmgMon.apply(this, arguments)
            const tel = this.__botTel
            const hp0 = Math.max(0, m.hp || 0) + Math.max(0, m.shield || 0)
            const frame = { m, nested: 0 }
            tel.__stack.push(frame)
            try {
              return origDmgMon.apply(this, arguments)
            } finally {
              tel.__stack.pop()
              const hp1 = Math.max(0, m.hp || 0) + Math.max(0, m.shield || 0)
              const dealt = Math.max(0, Math.max(0, hp0 - hp1) - frame.nested)
              for (let i = tel.__stack.length - 1; i >= 0; i--) {
                if (tel.__stack[i].m === m) { tel.__stack[i].nested += dealt; break }
              }
              recDmg(this, dealt, !!dot)
            }
          }
        }
        const origExecute = B.execute
        if (typeof origExecute === 'function') {
          B.execute = function(m) {
            if (m && !m.dead) {
              const dealt = Math.max(0, m.hp || 0) + Math.max(0, m.shield || 0)
              if (dealt > 0) recDmg(this, dealt, false)
            }
            return origExecute.apply(this, arguments)
          }
        }
        for (const [mName, tag] of [['dawnBonus', 'dawn'], ['faithBurst', 'faith'], ['releaseHaymaker', 'haymaker'], ['fireSpears', 'spear']]) {
          const origFn = B[mName]
          if (typeof origFn === 'function') {
            B[mName] = function() {
              const prev = this.__botTel.__sub
              this.__botTel.__sub = tag
              let out, async = false // M4 fix: async methods (releaseHaymaker hits inside an awaited lunge) reset the tag only when they settle
              try { out = origFn.apply(this, arguments); if (out && typeof out.then === 'function') { async = true; return out.finally(() => { this.__botTel.__sub = prev }) } return out } finally { if (!async) this.__botTel.__sub = prev }
            }
          }
        }
        const origHeal = B.heal
        if (typeof origHeal === 'function') {
          B.heal = function() {
            const hp0 = this.hp || 0
            const out = origHeal.apply(this, arguments)
            const gained = Math.max(0, (this.hp || 0) - hp0)
            if (gained > 0) this.__botTel.healedHp += gained
            return out
          }
        }
        if (B.clog && typeof B.clog.push === 'function' && !B.clog.__botPatched) {
          B.clog.__botPatched = true
          const origPush = B.clog.push
          B.clog.push = function(h) {
            if (h && B.__botTel) {
              B.__botTel.shieldSoaked += (h.shield || 0)
              if (h.out === 'block') B.__botTel.blocks++
              else if (h.out === 'dodge' || h.out === 'lucky' || h.out === 'evade') B.__botTel.dodges++
            }
            return origPush.apply(this, arguments)
          }
        }
      }
      if (TMO === 1) return { power: B.run.power, o: Math.round(B.run.pp.offense), s: Math.round(B.run.pp.survival), st: Object.fromEntries(["maxHp","atk","minPct","crit","critMul","combo","aspd","doubleAtk","flee","luckyDodge","dodgeHeal","fleeFloor","def","pskill","s1Pow","ultPow","ultAmp","hit","regen","s2Lv","s2Star"].map((k) => [k, +(+B.st[k]).toFixed(3)])) } // POWER=1: only print the Hero Power of this profile
      if (RELIC) B.testRelic = RELIC
      if (PERK) B.testPerk = PERK.split(',')
      if (EVENT) B.testEvent = EVENT
      if (MODE === 'tower') B.autoTower = TOWER_MAX // climb to this floor, then leave
      B.__botTel = newTel()
      if (!first) B.startRun()
      await new Promise((r) => setTimeout(r, 60))
      const t0 = Date.now()
      while (!B.over && Date.now() - t0 < TMO) {
        B.time.timeScale = 15; B.tweens.timeScale = 15
        if (B.pendingPick) { // v48: 4 picks (old builds clamp) · PICK=smart: legendary > "+" > own line > general > other lines (พร v2 builds)
          const stuck = B.pendingPick === B.botLastPick; B.botLastPick = B.pendingPick // an event choice that slot 4 doesn't exist for: fall back to random
          const o = SMART && B.pendingOffers, score = (x) => (x.legend ? 4 : x.up ? 3 : x.own ? 2 : x.general ? 1 : 0) + Math.random() * 0.5
          B.pendingPick((B.miniWon && !B.relic && RELIC) || PERK ? 0 : o ? o.reduce((bi, x, i) => (score(x) > score(o[bi]) ? i : bi), 0) : LAST && !stuck && !(B.miniWon && !B.relic) ? 3 : Math.floor(Math.random() * 4))
        }
        const boss = B.alive().find((m) => m.def.ai === 'boss')
        // duelist never charges: ult when she is not in parry stance
        const want = !boss || boss.charging || (boss.def.mini === 'duelist' && !boss.parry && !boss.espadaArmed) || (boss.def.mini && !(boss.def.charge || boss.def.breakPct))
        if (!B.autoUltWant && B.smashCdLeft <= 0 && !B.smashQueued && want) B.queueSmash() // v55+: the game's auto ult (same rule) books it
        await new Promise((r) => setTimeout(r, POLL))
      }
      const bm = B.mons.find((m) => m.def.ai === 'boss')
      const tel = B.__botTel
      const totalTurns = Math.max(1, (B.turnsLog || []).reduce((a, n) => a + n, 0) + (B.timedOut || !B.over ? (B.fightTurns || 0) : 0))
      const totalDmg = Math.round(tel.totalDmg)
      const ultDmg = Math.round(tel.ultDmg)
      const ultWinDmg = Math.round(tel.ultWinDmg)
      const nonUltDmg = Math.max(0, totalDmg - ultDmg)
      const pctOf = (v) => (totalDmg > 0 ? +(100 * v / totalDmg).toFixed(1) : 0)
      return {
        power: B.run.power, o: Math.round(B.run.pp.offense), s: Math.round(B.run.pp.survival),
        enrage: B.enrageCount ?? 0, procHits: B.procHits ?? null, perks: B.perkList ? B.perkList() : '', imm: B.immortal ?? null, floor: B.towerFloor, mode: B.run.modeId, where: B.run.where(B.room), muts: B.run.mutators.map((m) => m.id).join('+'), mats: Object.values(B.runMats || {}).reduce((a, n) => a + n, 0), maxHp: Math.round(B.st.maxHp), minHp: B.minHpPct, mini: B.miniKind, miniWon: B.miniWon, relic: B.relic, parry: B.parryCount, frz: B.freezeCount, tl: (B.turnsLog || []).join('/'), win: B.over && B.hp > 0 && !B.timedOut, room: B.room, hp: Math.round(B.hp), bossHp: bm ? Math.max(0, Math.round(bm.hp)) : null, breaks: B.breakCount ?? 0, revived: B.revivedCount ?? 0, ctr: B.counterCount ?? 0, combo: B.comboCount ?? 0, el: B.job.id === 'mage' ? B.element : '', s2: B.s2Count ?? 0, to: !!B.timedOut, jsTimeout: !B.over, dbf: B.debuffCount ?? 0, peak: B.peakTurns ?? 0, ms: Date.now() - t0,
        totalTurns, totalDmg, ultDmg, ultWinDmg, nonUltDmg,
        s1Dmg: Math.round(tel.s1Dmg), s2Dmg: Math.round(tel.s2Dmg), s3Dmg: Math.round(tel.s3Dmg), s4Dmg: Math.round(tel.s4Dmg),
        dotDmg: Math.round(tel.dotDmg), basicDmg: Math.round(tel.basicDmg), counterDmg: Math.round(tel.counterDmg), procDmg: Math.round(tel.procDmg),
        allyDmg: Math.round(tel.allyDmg), dawnDmg: Math.round(tel.dawnDmg), faithDmg: Math.round(tel.faithDmg), haymakerDmg: Math.round(tel.haymakerDmg), spearDmg: Math.round(tel.spearDmg),
        healedHp: Math.round(tel.healedHp), shieldSoaked: Math.round(tel.shieldSoaked), blocks: tel.blocks, dodges: tel.dodges,
        ultPct: pctOf(ultDmg), ultWinPct: pctOf(ultWinDmg),
        nonUltDpt: +(nonUltDmg / totalTurns).toFixed(1), ultDpt: +(ultDmg / totalTurns).toFixed(1), totalDpt: +(totalDmg / totalTurns).toFixed(1),
        s1Pct: pctOf(tel.s1Dmg), s2Pct: pctOf(tel.s2Dmg), s3Pct: pctOf(tel.s3Dmg), s4Pct: pctOf(tel.s4Dmg),
        basicPct: pctOf(tel.basicDmg), counterPct: pctOf(tel.counterDmg), procPct: pctOf(tel.procDmg),
      }
    }, [r === 0, process.env.RELIC || '', D, process.env.DUN ? +process.env.DUN : D >= 4 ? D - 1 : D, process.env.HARD || '', process.env.MODE || '', +(process.env.TOWER_MAX || 15), +(process.env.SEED || 0), +(process.env.POWER ? 1 : process.env.TMO || 120000), +(process.env.START || 0), process.env.PERK || '', process.env.EVENT || '', process.env.PICK === 'smart', process.env.PICK === 'last', +(process.env.POLL || (LITE ? 40 : 15)), runSeed]))
  }
  if (process.env.POWER) {
    console.log(JSON.stringify({ job, D, ...res[0] }))
    await b.close()
    if (crashed || (errors > 0 && !ALLOW_PAGE_ERRORS)) process.exit(1)
    return
  }
  if (process.env.DEBUG) console.log(JSON.stringify(res))
  const wins = res.filter((x) => x.win).length
  const minis = {}; for (const x of res) if (x.mini) { const k = x.mini; minis[k] = minis[k] || [0, 0, 0]; minis[k][0]++; if (x.miniWon) minis[k][1]++; if (x.win) minis[k][2]++ }
  const relics = {}; for (const x of res) if (x.relic) { relics[x.relic] = relics[x.relic] || [0, 0]; relics[x.relic][0]++; if (x.win) relics[x.relic][1]++ }
  const sum = (fn) => res.reduce((a, x) => a + fn(x), 0)
  const sumTurns = Math.max(1, sum((x) => x.totalTurns))
  const sumDmg = sum((x) => x.totalDmg)
  const sumUlt = sum((x) => x.ultDmg)
  const sumUltWin = sum((x) => x.ultWinDmg)
  const sumNonUlt = Math.max(0, sumDmg - sumUlt)
  const pctSum = (v) => (sumDmg > 0 ? +(100 * v / sumDmg).toFixed(1) : 0)
  const mean = (fn) => +(sum(fn) / Math.max(1, res.length)).toFixed(1)
  if (process.env.MODE) console.log(JSON.stringify({ job, mode: process.env.MODE, seed: process.env.SEED, wins, runs: RUNS, power: res[0]?.power, floors: res.map((x) => x.floor).join(','), at: res.filter((x) => !x.win).map((x) => x.where + (x.to ? ' (หมดเทิร์น)' : '')), muts: res[0]?.muts, minHp: Math.round(100 * res.reduce((a, x) => a + x.minHp, 0) / res.length), errors }))
  console.log(JSON.stringify({
    job, power: res[0]?.power, offense: res[0]?.o, survival: res[0]?.s, wins, runs: RUNS,
    minHp: Math.round(100 * res.reduce((a, x) => a + x.minHp, 0) / res.length),
    meanTurns: mean((x) => x.totalTurns), meanPeak: mean((x) => x.peak), meanRoom: mean((x) => x.room + (x.win ? 1 : 0)), meanFloor: mean((x) => x.floor || 0),
    totalDmg: Math.round(sumDmg / Math.max(1, res.length)), nonUltDmg: Math.round(sumNonUlt / Math.max(1, res.length)), ultDmg: Math.round(sumUlt / Math.max(1, res.length)),
    totalDpt: +(sumDmg / sumTurns).toFixed(1), nonUltDpt: +(sumNonUlt / sumTurns).toFixed(1), ultDpt: +(sumUlt / sumTurns).toFixed(1),
    ultPct: pctSum(sumUlt), ultWinPct: pctSum(sumUltWin),
    s1Pct: pctSum(sum((x) => x.s1Dmg)), s2Pct: pctSum(sum((x) => x.s2Dmg)), s3Pct: pctSum(sum((x) => x.s3Dmg)), s4Pct: pctSum(sum((x) => x.s4Dmg)),
    basicPct: pctSum(sum((x) => x.basicDmg)), counterPct: pctSum(sum((x) => x.counterDmg)), procPct: pctSum(sum((x) => x.procDmg)),
    dotPct: pctSum(sum((x) => x.dotDmg)), allyPct: pctSum(sum((x) => x.allyDmg)),
    dawnDmg: Math.round(sum((x) => x.dawnDmg) / Math.max(1, res.length)), faithDmg: Math.round(sum((x) => x.faithDmg) / Math.max(1, res.length)),
    haymakerDmg: Math.round(sum((x) => x.haymakerDmg) / Math.max(1, res.length)), spearDmg: Math.round(sum((x) => x.spearDmg) / Math.max(1, res.length)),
    healedHp: Math.round(sum((x) => x.healedHp) / Math.max(1, res.length)), shieldSoaked: Math.round(sum((x) => x.shieldSoaked) / Math.max(1, res.length)),
    blocks: mean((x) => x.blocks), dodges: mean((x) => x.dodges),
    mats: res.map((x) => x.mats).join(','), ...(D >= 2 ? { minis, relics } : {}), deaths: res.filter((x) => !x.win).map((x) => `r${x.room + 1}[${x.maxHp}]` + (x.bossHp != null ? `(boss ${x.bossHp})` : '')), breaks: res.reduce((a, x) => a + x.breaks, 0), revives: res.reduce((a, x) => a + x.revived, 0), ctr: res.reduce((a, x) => a + (x.ctr || 0), 0), combo: res.reduce((a, x) => a + (x.combo || 0), 0), timeouts: res.filter((x) => x.to).length, debuffs: res.reduce((a, x) => a + (x.dbf || 0), 0), peakTurns: res.map((x) => x.peak).join(','), s2casts: res.reduce((a, x) => a + (x.s2 || 0), 0), els: res.map((x) => (x.el ? x.el[0] : '') + (x.win ? 'W' : 'L')).join(' '), errors,
  }))
  await b.close()
  if (crashed || res.length !== RUNS || (errors > 0 && !ALLOW_PAGE_ERRORS)) {
    console.error(`bot.cjs failed: crashed=${crashed} runs=${res.length}/${RUNS} errors=${errors}`)
    process.exit(1)
  }
})().catch((e) => { console.error(job, e.message); process.exit(1) })
