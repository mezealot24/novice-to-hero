// admin.html: live-ops balance editor. Edits a Patch (tunables.ts whitelist), saves it as the server draft, publishes it.
// The server re-validates everything (server/src/config.ts); the checks here are only for fast feedback.
import { MONSTERS, type MonsterKind } from '../data/game-data'
import { JOBS } from '../data/jobs'
import { SKILL2 } from '../data/skill2'
import { CRIT_SLOTS, critRef, JOB2_IDS, job2Layout, SKILL_CLASSES, SKILL_LAYOUT, type SkillClass, type SkillRef } from '../data/skill-registry'
import { JOB2, type Job2Id } from '../data/jobs2'
import type { BaseStat } from '../data/meta'
import { MON_STAT, monPoints, monTier, statNative } from '../data/mon-stats'
import { canonicalJson, checkPatch, guardsFor, type FieldRow } from '../data/patch'
import { TABLE_IDS, TABLES, type Patch, type TableId } from '../data/tunables'
import { LOCAL_KEY } from '../live-keys'
import { borrowPlan, heroClasses, type BorrowLine } from './borrow'
import { kitUsers, scriptKits } from './kits'
import { API, authClient, call, errText, parseRow, type SRow } from './api'
import { clampField, clonePatch, diffPatches, fieldLabel, fieldRow, fields, monSections, monsterGroups, patchSize, pctHint, previewLevels, previewMon, previewSkills, setIn, TIER_LABEL, valueIn, allocFor, BASE7, type MonPreview, type SkillPreview, type Tier } from './model'

declare const __PREVIEW__: boolean
const LOCAL_OK = import.meta.env.DEV || (typeof __PREVIEW__ !== 'undefined' && __PREVIEW__) // ?cfg=local only works in these game builds

// ---------- tiny DOM helper (textContent only: no data ever goes through innerHTML) ----------
type Attrs = Record<string, string | boolean | ((e: Event) => void)>
function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: (Node | string | null | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v)
    else if (v === true) el.setAttribute(k, '')
    else if (v !== false) el.setAttribute(k, v)
  }
  for (const c of kids) if (c !== null && c !== false) el.append(c)
  return el
}
const $ = (id: string) => document.getElementById(id) as HTMLElement
const fmt = (v: number | undefined) => (v === undefined ? '—' : String(v))
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—')

function toast(msg: string, bad = false) {
  const t = h('div', { class: `toast${bad ? ' bad' : ''}` }, msg)
  $('toasts').append(t)
  setTimeout(() => t.remove(), bad ? 7000 : 3500)
}

// ---------- state ----------
type Tab = 'mon' | 'skills' | 'tables' | 'diff' | 'history'
const S = {
  offline: !API, me: '', live: null as SRow | null, draftRow: null as SRow | null,
  draft: {} as Patch, saved: '{}', tab: 'mon' as Tab, search: '', table: 'monStat' as TableId, skillClass: 'swordsman' as SkillClass | Job2Id, busy: false,
}
const livePatch = (): Patch => S.live?.patch ?? {}
const dirty = () => canonicalJson(S.draft) !== S.saved
const defOf = (t: TableId, path: string) => fieldRow(t, path)?.value
const liveOf = (t: TableId, path: string) => valueIn(livePatch(), t, path) ?? defOf(t, path)
const draftOf = (t: TableId, path: string) => valueIn(S.draft, t, path) ?? defOf(t, path)
const pending = () => diffPatches(livePatch(), S.draft)

function adopt(draftRow: SRow | null, live: SRow | null) {
  S.draftRow = draftRow; S.live = live
  S.draft = clonePatch(draftRow?.patch ?? live?.patch ?? {})
  S.saved = canonicalJson(draftRow?.patch ?? live?.patch ?? {})
}

// ---------- boot / auth ----------
async function boot() {
  if (S.offline) { S.me = 'offline (ไม่มี VITE_API_URL)'; adopt(null, null); renderApp(); return }
  const r = await call('/admin/state')
  if (r.status === 200) {
    S.me = typeof r.body.me === 'string' ? r.body.me : ''
    adopt(parseRow(r.body.draft), parseRow(r.body.live))
    renderApp(); return
  }
  const email = typeof r.body.email === 'string' ? r.body.email : ''
  renderGate(r.status === 401 ? 'login' : r.status === 403 ? 'forbidden' : 'error', r.status === 403 ? email : errText(r))
}

function renderGate(kind: 'login' | 'forbidden' | 'error', info: string) {
  const signIn = h('button', { class: 'primary', onclick: () => { void authClient?.signIn.social({ provider: 'google', callbackURL: location.href }) } }, 'เข้าสู่ระบบด้วย Google')
  const signOut = h('button', { onclick: () => { void authClient?.signOut().then(() => location.reload()) } }, 'ออกจากระบบ')
  const msg = kind === 'login' ? 'หน้านี้สำหรับผู้ดูแลเกมเท่านั้น — เข้าสู่ระบบด้วยบัญชี Google ที่อยู่ใน ADMIN_EMAILS'
    : kind === 'forbidden' ? (info ? `บัญชี ${info} ไม่ใช่ admin (ต้องเป็น Google + อยู่ใน ADMIN_EMAILS)` : 'ตอนนี้เป็นบัญชี guest — เข้าสู่ระบบด้วย Google ก่อน')
      : `ติดต่อเซิร์ฟเวอร์ไม่ได้: ${info}`
  $('app').replaceChildren(h('div', { class: 'gate' }, h('h1', {}, '⚙️ Balance Editor'), h('p', {}, msg),
    h('div', { class: 'row' }, kind === 'error' ? h('button', { onclick: () => location.reload() }, 'ลองใหม่') : signIn, kind === 'forbidden' ? signOut : null)))
}

// ---------- shell ----------
function renderApp() {
  const tabs: [Tab, string][] = [['mon', '👾 มอนสเตอร์'], ['skills', '⚔️ สกิลอาชีพ'], ['tables', '📊 ตารางอื่น'], ['diff', '📝 สรุป / เผยแพร่'], ['history', '🕘 ประวัติ']]
  const header = h('header', {},
    h('div', { class: 'row top' }, h('b', {}, '⚙️ Balance Editor'), h('span', { class: 'muted' }, S.me),
      S.offline ? null : h('button', { class: 'small', onclick: () => { void authClient?.signOut().then(() => location.reload()) } }, 'ออก')),
    h('div', { id: 'status', class: 'muted' }),
    h('div', { class: 'row' },
      h('button', { id: 'btnSave', disabled: S.offline, onclick: () => { void saveDraft() } }, '💾 บันทึก draft'),
      h('button', { onclick: () => { void testInGame() } }, '▶ ทดสอบในเกม'),
      h('button', { class: 'primary', disabled: S.offline, onclick: () => openPublish() }, '🚀 Publish')),
    h('nav', {}, ...tabs.map(([id, label]) => h('button', { class: S.tab === id ? 'on' : '', onclick: () => { S.tab = id; renderApp() } }, label))))
  $('app').replaceChildren(header, h('main', { id: 'main' }))
  updateStatus()
  renderTab()
}

function updateStatus() {
  const el = document.getElementById('status')
  if (!el) return
  const live = S.live ? `Live #${S.live.id} (${S.live.entries} ช่อง, ${when(S.live.publishedAt)})` : 'Live: ปิด (ใช้ค่า default ของ build)'
  const draft = S.draftRow ? `Draft #${S.draftRow.id}` : 'ยังไม่มี draft บนเซิร์ฟเวอร์'
  const n = pending().length
  el.textContent = `${live} · ${draft} · ต่างจาก live ${n} ช่อง${dirty() ? ' · ⚠️ ยังไม่บันทึก' : ''}`
  el.classList.toggle('warn', dirty())
}

function renderTab() {
  const main = $('main')
  main.replaceChildren()
  if (S.tab === 'mon') renderMonsters(main)
  else if (S.tab === 'skills') renderSkills(main)
  else if (S.tab === 'tables') renderTables(main)
  else if (S.tab === 'diff') renderDiff(main)
  else void renderHistory(main)
}

// ---------- one editable field ----------
function fieldCell(t: TableId, row: FieldRow, label: string, onChange: () => void): HTMLElement {
  const { path, def } = row
  const range = `ช่วง ${def.min} – ${def.max}${def.kind === 'int' ? ' (จำนวนเต็ม)' : ''}`
  const input = h('input', { type: 'number', inputmode: 'decimal', step: def.kind === 'int' ? '1' : 'any', min: String(def.min), max: String(def.max), title: range })
  const meta = h('div', { class: 'meta' })
  const cell = h('div', { class: 'f' })
  const refresh = () => {
    const d = valueIn(S.draft, t, path), live = liveOf(t, path), cur = draftOf(t, path)
    input.value = d === undefined ? (row.value === undefined ? '' : String(row.value)) : String(d)
    input.placeholder = row.value === undefined ? '—' : ''
    // only say what matters: the % reading, and where the value came from when it is not the plain default.
    // v117 (Q 2026-11-08: "publish แล้วยัง default —"): "default —" read as "not applied". Say it plainly instead.
    const show = (v: number | undefined) => (v === undefined ? 'ไม่ได้ตั้ง' : fmt(v))
    const src = cur !== live ? `✏️ ยังไม่ publish · live ${show(live)}` : live !== row.value ? '✅ ใช้ค่านี้ใน live แล้ว' : ''
    const parts = [pctHint(def, cur), src, cur !== row.value || live !== row.value ? `ค่าเดิมในโค้ด ${show(row.value)}` : ''].filter(Boolean)
    meta.textContent = parts.join(' · ')
    toLive.hidden = cur === live
    toDef.hidden = d === undefined
    cell.classList.toggle('chg', cur !== live)
    cell.classList.toggle('pat', d !== undefined)
  }
  const write = (v: number | null) => {
    setIn(S.draft, t, path, v === null || v === row.value ? null : v) // equal to the default = not in the patch
    refresh(); onChange(); updateStatus()
  }
  input.addEventListener('change', () => {
    const v = clampField(def, input.value)
    if (v !== null && String(v) !== input.value.trim()) toast(`${label}: ปรับเป็น ${v} (ช่วง ${def.min}–${def.max})`)
    write(v)
  })
  const toLive = h('button', { class: 'icon', title: 'กลับเป็นค่า live', onclick: () => write(valueIn(livePatch(), t, path) ?? null) }, '↺')
  const toDef = h('button', { class: 'icon', title: 'กลับเป็นค่า default', onclick: () => write(null) }, '×')
  cell.append(h('label', { title: `${t}.${path} · ${range}` }, label), h('div', { class: 'in' }, input, toLive, toDef), meta)
  refresh()
  return cell
}

/** A <details> whose body is built on first open (monster cards hold hundreds of inputs). */
function lazyDetails(cls: string, summary: string, build: () => HTMLElement): HTMLDetailsElement {
  const d = h('details', { class: cls }, h('summary', {}, summary))
  d.addEventListener('toggle', () => { if (d.open && d.children.length === 1) d.append(build()) })
  return d
}
/** A leaf with a value somewhere (build default, draft or live): shown up front; the rest waits behind "＋". */
const isUsed = (t: TableId, r: FieldRow) => r.value !== undefined || valueIn(S.draft, t, r.path) !== undefined || valueIn(livePatch(), t, r.path) !== undefined
const cells = (t: TableId, fs: { row: FieldRow; label: string }[], onChange: () => void) =>
  h('div', { class: 'grid' }, ...fs.map((f) => fieldCell(t, f.row, f.label, onChange)))

/** Fields in a grid; absent optional leaves tucked under "＋" unless the draft / live sets them. */
function fieldGrid(t: TableId, rows: FieldRow[], labelOf: (p: string) => string, onChange: () => void): HTMLElement {
  const fs = rows.map((row) => ({ row, label: labelOf(row.path) }))
  const main = fs.filter((f) => isUsed(t, f.row)), extra = fs.filter((f) => !isUsed(t, f.row))
  const box = h('div', {}, cells(t, main, onChange))
  if (extra.length) box.append(lazyDetails('extra', `＋ ช่องที่ยังไม่ตั้ง · ${extra.length}`, () => cells(t, extra, onChange)))
  return box
}

/** Monster card body: one titled block per section; unset sections fold into one "＋" line at the bottom. */
function monsterBody(k: MonsterKind, onChange: () => void): HTMLElement {
  const box = h('div', {}), idle: HTMLElement[] = []
  for (const kit of scriptKits(k)) { // 🎭 scripted kits: shared BATTLE numbers, edited here
    const users = kitUsers(kit.name)
    box.append(h('section', { class: 'sec kit' }, h('h4', {}, `🎭 ${kit.name}`), h('p', { class: 'hint' }, kit.desc),
      h('div', { class: 'grid' }, ...kit.fields.map((q) => { const row = fieldRow('battle', q.path); return row ? fieldCell('battle', row, q.label, () => { onChange(); updateStatus() }) : '' })),
      h('p', { class: 'warn small' }, `⚠️ ค่ากลางใน BATTLE${users.length > 1 ? ` · ใช้ร่วมกับ: ${users.join(', ')}` : ''} (แท็บตารางอื่น → battle)`)))
  }
  for (const s of monSections(k, rowsOfMonster(k).filter((r) => !inBuilder(k, r.path)))) { // stat pipeline lives in 📊
    const shown = (f: { row: FieldRow }) => isUsed('monsters', f.row) || /\.skills\.\d+(\.pick\.\d+)?\.lv$/.test(f.row.path) // skill level: always in sight
    const used = s.fields.filter(shown), rest = s.fields.filter((f) => !shown(f))
    if (!used.length) { idle.push(lazyDetails('extra', `${s.title} · ${rest.length}`, () => cells('monsters', rest, onChange))); continue }
    const sec = h('section', { class: 'sec' }, h('h4', {}, s.title), cells('monsters', used, onChange))
    if (rest.length) sec.append(lazyDetails('extra', `＋ ช่องที่ยังไม่ตั้ง · ${rest.length}`, () => cells('monsters', rest, onChange)))
    box.append(sec)
  }
  if (idle.length) box.append(h('details', { class: 'extra idle' }, h('summary', {}, `＋ หมวดที่ยังไม่ได้ใช้ · ${idle.length}`), ...idle))
  return box
}

// ---------- monsters ----------
let monRows: Map<string, FieldRow[]> | null = null
function rowsOfMonster(k: MonsterKind): FieldRow[] {
  if (!monRows) {
    monRows = new Map()
    for (const r of fields('monsters')) {
      const key = r.path.slice(0, r.path.indexOf('.'))
      const list = monRows.get(key) ?? []
      list.push(r); monRows.set(key, list)
    }
  }
  return monRows.get(k) ?? []
}
const changedCount = (t: TableId, prefix: string) => pending().filter((d) => d.table === t && d.path.startsWith(prefix)).length

function monsterCard(k: MonsterKind): HTMLElement {
  const m = MONSTERS[k]
  const badge = h('span', { class: 'badge' })
  const setBadge = () => { const n = changedCount('monsters', `${k}.`); badge.textContent = n ? `${n} แก้` : ''; badge.hidden = !n }
  setBadge()
  const d = h('details', { class: 'mon' },
    h('summary', {}, h('b', {}, m.name), m.title ? h('span', { class: 'muted' }, ` · ${m.title}`) : null, ' ', h('code', {}, k),
      h('span', { class: 'muted' }, statNative(k) ? ' · stat monster' : ` · HP ${fmt(liveOf('monsters', `${k}.hp`))}`), ' ', badge))
  const fill = () => {
    const prev = h('div', { class: 'preview' })
    const drawPrev = () => prev.replaceChildren(...previewBox(k))
    drawPrev()
    const rebuild = () => { while (d.children.length > 1) d.lastChild?.remove(); fill(); setBadge() }
    const changed = () => { setBadge(); drawPrev() }
    d.append(prev, statBuilder(k, changed), borrowBox(k, rebuild), monsterBody(k, changed))
  }
  d.addEventListener('toggle', () => { if (d.open && d.children.length === 1) fill() })
  return d
}

/** Monster fields the 📊 table owns (kept out of the sections below so nothing shows twice). */
const BUILDER_REL = /^(statAlloc\.\w+|pointsMul|bodyMul\.\w+|speedMul|def|hit|flee|crit|combo|counter|hp|dmg|matk)$/
const inBuilder = (k: MonsterKind, path: string) => BUILDER_REL.test(path.slice(k.length + 1))

/** "📊 สร้าง stat": the whole stat pipeline in one table — ① point budget ② split (statAlloc) ③ derived numbers (× body / + bonus). */
function statBuilder(k: MonsterKind, onChange: () => void): HTMLElement {
  const native = statNative(k), lvs = previewLevels(k), tier = monTier(MONSTERS[k])
  const box = h('section', { class: 'sec builder' })
  let lv = lvs[lvs.length - 1]
  const P = (rel: string) => `${k}.${rel}`
  const val = (rel: string) => draftOf('monsters', P(rel))
  const n0 = (v: number) => Math.round(v).toLocaleString('en-US')
  const pc = (v: number) => `${Math.round(v * 100)}%`
  const signed = (v: number, f: (x: number) => string) => (v >= 0 ? `+${f(v)}` : `−${f(-v)}`)
  const write = (rel: string, v: number | null) => {
    const row = fieldRow('monsters', P(rel))
    if (row) setIn(S.draft, 'monsters', P(rel), v === null || v === row.value || (v === 0 && row.value === undefined && rel.startsWith('statAlloc.')) ? null : v)
  }
  const done = () => { updateStatus(); onChange(); draw() }
  /** One editable monster field, committed on change. */
  const num = (rel: string, hint = '') => {
    const row = fieldRow('monsters', P(rel))
    if (!row) return h('span', { class: 'muted' }, '—')
    const cur = val(rel), live = liveOf('monsters', P(rel))
    const i = h('input', { type: 'number', inputmode: 'decimal', step: row.def.kind === 'int' ? '1' : 'any', placeholder: hint,
      title: `${P(rel)} · ช่วง ${row.def.min} – ${row.def.max}${cur !== live ? ` · live ${fmt(live)}` : ''}`, class: cur !== live ? 'chg' : '' })
    i.value = cur === undefined ? '' : String(cur)
    i.addEventListener('change', () => { write(rel, clampField(row.def, i.value)); done() })
    return i
  }
  const draw = () => {
    const all = previewMon(k, S.draft), p = all.find((x) => x.lv === lv) ?? all[0]
    const base = monPoints(lv, tier), pm = val('pointsMul') ?? 1
    const lvSel = h('select', {}, ...lvs.map((v) => h('option', { value: String(v) }, `Lv ${v}`)))
    lvSel.value = String(lv)
    lvSel.addEventListener('change', () => { lv = Number(lvSel.value); draw() })
    // ② the "= stat" row is editable too: typed stats -> statAlloc + pointsMul (allocFor)
    const want = Object.fromEntries(BASE7.map((s) => {
      const i = h('input', { type: 'number', min: '1', step: '1', title: `พิมพ์ ${s.toUpperCase()} ที่อยากได้ที่ Lv ${lv} → ระบบคำนวณสัดส่วน + pointsMul ให้` })
      i.value = String(p.base[s] ?? 1)
      i.addEventListener('change', () => {
        const target = Object.fromEntries(BASE7.map((q) => [q, Number(want[q].value) || 1])) as Record<BaseStat, number>
        const plan = allocFor(k, lv, target, null)
        for (const q of BASE7) write(`statAlloc.${q}`, plan.weights[q])
        write('pointsMul', plan.pointsMul === 1 ? null : plan.pointsMul)
        toast(`${MONSTERS[k].name}: สัดส่วนใหม่ + pointsMul ×${plan.pointsMul} (ยังไม่บันทึก)`)
        done()
      })
      return [s, i]
    })) as Record<BaseStat, HTMLInputElement>
    // ③ derived numbers
    const mult: [string, keyof MonPreview, string, string | null][] = [['HP', 'hp', 'bodyMul.hp', 'hp'], ['ATK', 'dmg', 'bodyMul.dmg', 'dmg'], ['M.ATK', 'matk', 'bodyMul.matk', 'matk'], ['ความเร็ว', 'speed', 'speedMul', null]]
    const bonus: [string, keyof MonPreview, number, boolean][] = [['DEF', 'def', 0, false], ['Hit', 'hit', 15, false], ['Flee', 'flee', 5, false], ['คริ', 'crit', 0, true], ['คอมโบ', 'combo', 0, true], ['สวนกลับ', 'counter', 0, true]]
    const live = previewMon(k, livePatch()).find((x) => x.lv === lv)
    const out = (key: keyof MonPreview, f: (v: number) => string) => {
      const a = p[key] as number, b = live ? (live[key] as number) : a
      return h('td', { class: `num out${f(a) !== f(b) ? ' chg' : ''}`, title: f(a) !== f(b) ? `live ${f(b)}` : '' }, f(a))
    }
    const rows3 = [
      ...mult.map(([label, key, mulRel, baseRel]) => {
        const F = p[key] as number, m = val(mulRel) ?? 1, f = key === 'speed' ? (v: number) => v.toFixed(1) : n0
        const from = !native && baseRel
          ? h('td', {}, num(baseRel), h('small', { class: 'muted' }, ` × ${(F / ((val(baseRel) ?? F) * m || 1)).toFixed(2)} จาก stat`))
          : h('td', { class: 'num' }, f(F / (m || 1)))
        return h('tr', {}, h('th', {}, label), from, h('td', {}, '×', num(mulRel, '1')), h('td', { class: 'muted' }, '—'), out(key, f))
      }),
      ...bonus.map(([label, key, dflt, rate]) => {
        const F = p[key] as number, b = val(key) ?? (native ? 0 : dflt), f = rate ? pc : n0
        return h('tr', {}, h('th', {}, label), h('td', { class: 'num' }, native ? f(F - b) : signed(F - b, f)), h('td', { class: 'muted' }, '—'), h('td', {}, '+', num(key, native ? '0' : String(dflt))), out(key, f))
      }),
    ]
    box.replaceChildren(
      h('h4', {}, '📊 สร้าง stat ', lvSel),
      h('div', { class: 'step' }, h('b', {}, '① แต้มรวม '), `Lv ${lv} × ${TIER_LABEL[tier]} ${pc(MON_STAT.tierPct[tier])} = ${base} แต้ม  × `, num('pointsMul', '1'), h('b', {}, ` = ${Math.round(base * pm)} แต้ม`)),
      h('div', { class: 'step' }, h('b', {}, '② แบ่งแต้ม '), h('span', { class: 'muted small' }, 'สัดส่วน = หั่นพิซซ่ากี่ชิ้น (แก้ได้) · แถว "= stat" พิมพ์ค่าที่อยากได้ได้เลย ระบบคิดสัดส่วน + pointsMul ให้')),
      h('div', { class: 'scroll' }, h('table', { class: 'b7' },
        h('thead', {}, h('tr', {}, h('th', {}, ''), ...BASE7.map((s) => h('th', {}, s.toUpperCase())))),
        h('tbody', {},
          h('tr', {}, h('th', {}, 'สัดส่วน'), ...BASE7.map((s) => h('td', {}, num(`statAlloc.${s}`, '0')))),
          h('tr', {}, h('th', {}, '= stat'), ...BASE7.map((s) => h('td', {}, want[s])))))),
      h('div', { class: 'step' }, h('b', {}, '③ ค่าจริง '), h('span', { class: 'muted small' }, native
        ? 'จาก stat × ตัวคูณ + โบนัส = ในเกม'
        : 'มอน D1-5: HP / ATK = ค่าตั้ง (ที่ Lv บ้านเกิด) × ผลจาก stat × ตัวคูณ · ช่อง + = ค่าตั้ง (บวกผลต่างจาก stat)')),
      h('div', { class: 'scroll' }, h('table', { class: 'b3' },
        h('thead', {}, h('tr', {}, ...['', native ? 'จาก stat' : 'ค่าตั้ง / จาก stat', '× ตัวคูณ', native ? '+ โบนัส' : '+ ค่าตั้ง', '= ในเกม'].map((x) => h('th', {}, x)))),
        h('tbody', {}, ...rows3))),
    )
  }
  draw()
  return box
}

/** "📥 ยืมจาก Hero tree": pick class -> node / talent -> Lv, see what it adds, then write it into the draft. */
function borrowBox(k: MonsterKind, rebuild: () => void): HTMLElement {
  const classes = heroClasses()
  const cls = h('select', {}, ...classes.map((c, i) => h('option', { value: String(i) }, `${c.name} · ${c.srcs.length}`)))
  const src = h('select', {}), lv = h('select', {}), plan = h('div', { class: 'plan' })
  const go = h('button', { class: 'primary small' }, '📥 ใส่ให้มอน')
  const pickedSrc = () => classes[Number(cls.value)]?.srcs[Number(src.value)]
  const fillSrc = () => {
    const c = classes[Number(cls.value)], groups = new Map<string, HTMLOptGroupElement>()
    src.replaceChildren()
    c?.srcs.forEach((s, i) => {
      const g = groups.get(s.group) ?? h('optgroup', { label: s.group })
      g.append(h('option', { value: String(i) }, `${s.icon} ${s.name}`)); groups.set(s.group, g)
    })
    src.append(...groups.values())
    fillLv()
  }
  const fillLv = () => {
    const s = pickedSrc()
    lv.replaceChildren(...Array.from({ length: s?.top ?? 0 }, (_, i) => h('option', { value: String(i + 1) }, `Lv ${i + 1}${s && i + 1 > s.max ? ' 🔺 เกิน Max' : ''}`)))
    lv.value = String(s?.max ?? 1)
    drawPlan()
  }
  let lines: BorrowLine[] = []
  const drawPlan = () => {
    const s = pickedSrc()
    if (!s) { plan.replaceChildren(); return }
    const p = borrowPlan(k, s, Number(lv.value), (path) => draftOf('monsters', path))
    lines = p.lines
    const pct = (path: string, v: number) => (pctHint(fieldRow('monsters', path)?.def ?? { kind: 'int', min: 0, max: 0 }, v) ?? fmt(v))
    plan.replaceChildren(
      h('div', { class: 'muted small' }, `ฮีโร่: ${s.desc(Number(lv.value))}${Number(lv.value) > s.max ? ` · 🔺 เกิน Max ${s.max} (สูตรเดียวกันต่อเลเวล)` : ''}${s.top === s.max && s.max > 0 ? ' · ช่องนี้ต่อเกิน Max ไม่ได้' : ''}`),
      ...lines.map((l) => h('div', {}, `✅ ${l.label}: ${pct(l.path, l.from)} → `, h('b', {}, pct(l.path, l.to)), l.capped ? h('span', { class: 'bad small' }, ` ⛔ ติดเพดาน ${fmt(fieldRow('monsters', l.path)?.def.max)}`) : '', l.approx ? h('span', { class: 'warn small' }, ` ≈ ${l.approx}`) : '')),
      p.skipped.length ? h('div', { class: 'muted small', title: p.skipped.join('\n') }, `⏭️ ข้าม ${p.skipped.length} อย่าง (มอนยังไม่มีกลไก): ${p.skipped.join(', ')}`) : '',
      lines.length ? '' : h('div', { class: 'warn small' }, 'มอนตัวนี้รับอะไรจากช่องนี้ไม่ได้'),
    )
    go.toggleAttribute('disabled', !lines.length)
  }
  cls.addEventListener('change', fillSrc); src.addEventListener('change', fillLv); lv.addEventListener('change', drawPlan)
  go.addEventListener('click', () => {
    const s = pickedSrc()
    for (const l of lines) setIn(S.draft, 'monsters', l.path, l.to === fieldRow('monsters', l.path)?.value ? null : l.to)
    updateStatus(); toast(`ยืม ${s?.icon ?? ''} ${s?.name ?? ''} Lv ${lv.value} ให้ ${MONSTERS[k].name} แล้ว (${lines.length} ช่อง · ยังไม่บันทึก)`)
    rebuild()
  })
  const d = h('details', { class: 'borrow' }, h('summary', {}, '📥 ยืมจาก Hero tree'),
    h('div', { class: 'row' }, cls, src, lv, go), plan,
    h('p', { class: 'muted small' }, 'บวกเพิ่มจากค่าปัจจุบันของมอน · ยืมซ้ำ = บวกซ้ำ · กด ↺ / × ที่ช่องเพื่อย้อน · ใช้ได้เฉพาะ stat ที่มอนมีกลไกอยู่แล้ว (คริ คอมโบ สวนกลับ ดูดเลือด Flee Hit พิษ สะท้อน)'))
  d.addEventListener('toggle', () => { if (d.open && !src.children.length) fillSrc() }, { once: true })
  return d
}

/** "📈 ค่าจริงในเกม": the game's own formulas on the draft (and on live, to show what an edit moves). */
function previewBox(k: MonsterKind): Node[] {
  const draft = previewMon(k, S.draft), live = previewMon(k, livePatch())
  const n = (v: number) => Math.round(v).toLocaleString('en-US')
  const pct = (v: number) => `${Math.round(v * 100)}%`
  const rows: [string, (p: MonPreview) => number, (v: number) => string][] = [
    ['HP', (p) => p.hp, n], ['ATK', (p) => p.dmg, n], ['M.ATK', (p) => p.matk, n], ['DEF', (p) => p.def, n], ['M.DEF', (p) => p.mdef, pct],
    ['Hit', (p) => p.hit, n], ['Flee', (p) => p.flee, n], ['คริ', (p) => p.crit, pct], ['คอมโบ', (p) => p.combo, pct], ['สวนกลับ', (p) => p.counter, pct],
    ['ความเร็ว', (p) => p.speed, (v) => v.toFixed(1)],
  ]
  const show = (ps: MonPreview[], get: (p: MonPreview) => number, f: (v: number) => string) => ps.map((p) => f(get(p))).join(' → ')
  const chips = rows.map(([label, get, f]) => {
    const now = show(draft, get, f), was = show(live, get, f)
    return h('span', { class: `chip${now !== was ? ' chg' : ''}`, title: now !== was ? `live: ${was}` : '' }, h('small', {}, label), ` ${now}`)
  })
  const lv = draft.map((p) => p.lv).join(' → ')
  const stats = (['str', 'vit', 'wis', 'dex', 'int', 'luk', 'agi'] as const).map((s) => `${s.toUpperCase()} ${show(draft, (p) => p.base[s] ?? 1, n)}`).join(' · ')
  return [
    h('div', { class: 'ptitle' }, h('b', {}, '📈 ค่าจริงในเกม'), h('span', { class: 'muted' }, ` · Lv ${lv}${draft.length > 1 ? ' (ห้องแรก → ห้องสุดท้ายที่เจอ)' : ''} · ส้ม = ต่างจาก live`)),
    h('div', { class: 'chips' }, ...chips),
    h('div', { class: 'muted small' }, stats),
    ...skillLines(k),
  ]
}

/** One line per skill as cast at its level: ✨ name Lv · every N · power · hits · effects (orange = differs from live). */
function skillLines(k: MonsterKind): Node[] {
  const now = previewSkills(k, S.draft), was = previewSkills(k, livePatch())
  const txt = (p: SkillPreview) => [
    `✨ ${p.name} Lv ${p.lv}`, `ทุก ${p.every} เทิร์น`, p.pow !== undefined ? `พลัง ${Number(p.pow.toFixed(3))}` : '',
    p.hits && p.hits > 1 ? `${p.hits} ฮิต` : '', p.turns ? `${p.turns} เทิร์น` : '', p.fx,
  ].filter(Boolean).join(' · ')
  return now.map((p, i) => {
    const a = txt(p), b = was[i] ? txt(was[i]) : ''
    return h('div', { class: `small${a !== b ? ' warn' : ''}`, title: a !== b ? `live: ${b}` : '' }, a)
  })
}

function renderMonsters(main: HTMLElement) {
  const q = S.search.trim().toLowerCase()
  const match = (k: MonsterKind) => !q || k.includes(q) || MONSTERS[k].name.toLowerCase().includes(q) || (MONSTERS[k].title ?? '').toLowerCase().includes(q)
  const search = h('input', { type: 'search', placeholder: 'ค้นหาชื่อ / kind เช่น king, ไฮดรา', value: S.search })
  const list = h('div', {})
  const draw = () => {
    list.replaceChildren()
    for (const g of monsterGroups()) {
      const sec = h('section', {}, h('h2', {}, g.name))
      let any = false
      for (const tier of ['boss', 'mini', 'normal'] as Tier[]) {
        const ks = g.tiers[tier].filter(match)
        if (!ks.length) continue
        any = true
        sec.append(h('h3', { class: `tier ${tier}` }, `${TIER_LABEL[tier]} · ${ks.length}`), ...ks.map(monsterCard))
      }
      if (any) list.append(sec)
    }
    if (!list.children.length) list.append(h('p', { class: 'muted' }, 'ไม่พบมอนสเตอร์'))
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  search.addEventListener('input', () => { S.search = search.value; clearTimeout(timer); timer = setTimeout(draw, 150) })
  draw()
  main.append(h('div', { class: 'sticky-search' }, search), list)
}

// ---------- class skills (skill-registry.ts) ----------
/** One column: a titled block of fields. The crit switch of the slot comes first. */
function skillBlock(title: string, refs: SkillRef[], hint?: string): HTMLElement {
  const cs = refs.map((ref) => { const row = fieldRow(ref.table, ref.path); return row ? fieldCell(ref.table, row, ref.label, updateStatus) : null })
  return h('section', { class: 'sec skillcol' }, h('h4', {}, title), hint ? h('p', { class: 'hint' }, hint) : null, h('div', { class: 'grid' }, ...cs))
}
function renderSkills(main: HTMLElement) {
  const sel = S.skillClass, j2 = (JOB2_IDS as string[]).includes(sel) ? JOB2[sel as Job2Id] : undefined
  const c = (j2 ? j2.parent : sel) as SkillClass, job = JOBS[c], L = SKILL_LAYOUT[c]
  const chip = (id: SkillClass | Job2Id, label: string) => h('button', { class: sel === id ? 'on' : '', onclick: () => { S.skillClass = id; renderTab() } }, label)
  const pick = h('div', { class: 'chips' }, ...SKILL_CLASSES.map((id) => chip(id, `${JOBS[id].icon} ${JOBS[id].name}`)))
  const pick2 = h('div', { class: 'chips' }, h('span', { class: 'muted' }, 'อาชีพขั้น 2: '), ...JOB2_IDS.filter((id) => JOB2[id].parent === c).map((id) => chip(id, `${JOB2[id].icon} ${JOB2[id].name}`)))
  if (j2) { // v107 round 2: skill 3 / Ult วิวัฒน์ / signature + other KIT2 numbers
    const l = job2Layout(sel as Job2Id)
    main.append(pick, pick2, h('h2', {}, `${j2.icon} ${j2.name}`),
      h('p', { class: 'hint' }, 'สวิตช์คริใช้ของคลาสแม่ · ตัวเลขในคำอธิบายบนจอเกมยังเป็นค่าเดิมจนกว่าจะ build ใหม่ แต่หน้ารายละเอียด Ult และค่าที่คำนวณจริงเปลี่ยนทันที'),
      h('div', { class: 'skillcols' },
        skillBlock(`3 · ${j2.skill3.icon} ${j2.skill3.name}`, l.s3),
        skillBlock(`Ult วิวัฒน์ · ${j2.ult.icon} ${j2.ult.name}`, l.ult),
        skillBlock(`${j2.signature.icon} ${j2.signature.name} · ตัวเลขอื่น`, l.other)))
    return
  }
  const crit = (slot: (typeof CRIT_SLOTS)[number]) => critRef(c, slot)
  const cols: HTMLElement[] = [
    skillBlock(`1 · ${job.auto.icon} ${job.auto.name}`, [crit('s1'), ...L.s1]),
    ...L.s2.map((x) => { const d = SKILL2.find((s) => s.id === x.id); return skillBlock(`2 · ${d?.icon ?? ''} ${d?.name ?? x.id}`, [crit('s2'), ...x.refs], 'ทักษะ 2 เลือกได้ 1 ใน 3 · สวิตช์คริใช้ร่วมกันทั้ง 3 ท่า') }),
    skillBlock(`Ult · ${job.ult.icon} ${job.ult.name}`, [crit('ult'), ...L.ult]),
    ...(L.tree ? [skillBlock('🌳 Skill tree (node)', L.tree, '"Lv เดิม" = ค่าต่อ Lv ก่อนยืด 3 → 5 (Lv จริง × 3/5)')] : []),
  ]
  main.append(pick, pick2, h('h2', {}, `${job.icon} ${job.name}`),
    h('p', { class: 'hint' }, 'คริได้ไหม: 1 = ท่านี้คริได้ (ตอนนี้ทุกท่าเป็นแบบนี้) · 0 = ฮิตของท่านี้ไม่คริ · ไม่รวมคริตายตัว (เช่น ★ พันดาบ) และดาเมจ on-hit (สายฟ้า/ไฟ/น้ำแข็ง/หอก/แสง) · ใช้กับอาชีพขั้น 2 ของคลาสนี้ด้วย'),
    h('p', { class: 'hint' }, 'ตัวเลขในคำอธิบายสกิลบนจอเกมยังเป็นค่าเดิมจนกว่าจะ build ใหม่ — ค่าที่ใช้คำนวณจริงเปลี่ยนตามที่ตั้งทันที'),
    h('div', { class: 'skillcols' }, ...cols))
}

// ---------- other tables (generic from TABLES) ----------
function renderTables(main: HTMLElement) {
  const ids = TABLE_IDS.filter((t) => t !== 'monsters' && t !== 'archetypes') // archetypes: no monster uses one since v76 (own statAlloc each)
  const pick = h('div', { class: 'chips' }, ...ids.map((t) => h('button', { class: S.table === t ? 'on' : '', onclick: () => { S.table = t; renderTab() } }, t)))
  const t = S.table
  const rows = fields(t), groups = new Map<string, FieldRow[]>()
  for (const r of rows) {
    const dot = r.path.indexOf('.'), key = dot < 0 ? '' : r.path.slice(0, dot)
    const list = groups.get(key) ?? []
    list.push(r); groups.set(key, list)
  }
  const flat = groups.get('') ?? []
  for (const [k, list] of groups) if (k && list.length === 1) { flat.push(...list); groups.delete(k) }
  groups.delete('')
  const body = h('div', {}, h('h2', {}, TABLES[t].label))
  if (flat.length) body.append(fieldGrid(t, flat, (p) => fieldLabel(t, p), updateStatus))
  for (const [k, list] of groups) {
    const badge = h('span', { class: 'badge' })
    const setBadge = () => { const n = changedCount(t, `${k}.`); badge.textContent = n ? `${n} แก้` : ''; badge.hidden = !n }
    setBadge()
    const d = h('details', { class: 'mon' }, h('summary', {}, h('b', {}, k), h('span', { class: 'muted' }, ` · ${list.length} ช่อง `), badge))
    d.addEventListener('toggle', () => { if (d.open && d.children.length === 1) d.append(fieldGrid(t, list, (p) => fieldLabel(t, p, true), setBadge)) })
    body.append(d)
  }
  main.append(pick, body)
}

// ---------- diff / publish ----------
function diffTable(rows: ReturnType<typeof diffPatches>, fromLabel: string, toLabel: string, onUndo?: (t: TableId, path: string) => void): HTMLElement {
  if (!rows.length) return h('p', { class: 'muted' }, 'ไม่มีความต่าง')
  const tb = h('tbody', {}, ...rows.map((d) => h('tr', {},
    h('td', {}, h('code', {}, d.table)), h('td', {}, fieldLabel(d.table, d.path)), h('td', { class: 'num muted' }, fmt(d.def)),
    h('td', { class: 'num' }, fmt(d.from)), h('td', { class: 'num new' }, fmt(d.to)),
    h('td', {}, onUndo ? h('button', { class: 'icon', title: 'ยกเลิกการแก้ช่องนี้', onclick: () => onUndo(d.table, d.path) }, '↺') : ''))))
  return h('div', { class: 'scroll' }, h('table', {}, h('thead', {}, h('tr', {}, ...['ตาราง', 'ช่อง', 'default', fromLabel, toLabel, ''].map((x) => h('th', {}, x)))), tb))
}

function renderDiff(main: HTMLElement) {
  const rows = pending()
  const check = checkPatch(S.draft, guardsFor(S.draft))
  const problems = [...check.errors.map((e) => `❌ ${e.table}.${e.path}: ${e.msg}`), ...check.skipped.map((s) => `⚠️ ${s.table}.${s.path}: ${s.reason}${s.detail ? ` (${s.detail})` : ''}`)]
  main.append(
    h('h2', {}, `Draft เทียบกับ live · ${rows.length} ช่อง`),
    h('p', { class: 'muted' }, `patch ทั้งหมด ${patchSize(S.draft)} ช่อง (ค่าที่ต่างจาก default) · ตรวจแล้ว: ${check.ok && !check.skipped.length ? '✅ ผ่าน' : 'มีปัญหา'}`),
    ...(problems.length ? [h('ul', { class: 'problems' }, ...problems.slice(0, 50).map((p) => h('li', {}, p)))] : []),
    diffTable(rows, 'live', 'draft', (t, path) => { setIn(S.draft, t, path, valueIn(livePatch(), t, path) ?? null); updateStatus(); renderTab() }),
    h('div', { class: 'row' },
      h('button', { disabled: S.offline, onclick: () => { void saveDraft() } }, '💾 บันทึก draft'),
      h('button', { class: 'primary', disabled: S.offline, onclick: () => openPublish() }, '🚀 Publish'),
      h('button', { class: 'danger', disabled: S.offline, onclick: () => { void discardDraft() } }, '🗑 ทิ้ง draft (กลับไปเท่า live)')))
}

async function saveDraft(): Promise<boolean> {
  if (S.offline || S.busy) return false
  S.busy = true
  try {
    const r = await call('/admin/draft', 'PUT', { patch: S.draft, note: S.draftRow?.note ?? '' })
    if (r.status !== 200) { toast(`บันทึกไม่สำเร็จ: ${errText(r)}`, true); return false }
    const row = parseRow(r.body.draft)
    if (row) { S.draftRow = row; S.saved = canonicalJson(row.patch ?? S.draft) }
    toast(`บันทึก draft #${row?.id ?? '?'} แล้ว`)
    updateStatus()
    return true
  } finally { S.busy = false }
}

async function discardDraft() {
  if (!confirm('ทิ้ง draft บนเซิร์ฟเวอร์ และรีเซ็ตทุกช่องกลับเป็นค่า live?')) return
  const r = await call('/admin/draft/discard', 'POST', {})
  if (r.status !== 200) { toast(errText(r), true); return }
  adopt(null, S.live); toast('ทิ้ง draft แล้ว'); renderApp()
}

function openPublish() {
  const n = pending().length
  const note = h('textarea', { rows: '3', maxlength: '500', placeholder: 'บันทึกสั้น ๆ เช่น "เนิร์ฟไฮดรา HP -10%"' })
  const go = h('button', { class: 'primary' }, `ยืนยัน Publish (${n} ช่อง)`)
  const dlg = h('dialog', {}, h('h2', {}, '🚀 Publish draft เป็น live?'),
    h('p', {}, `ผู้เล่นทุกคนจะได้ค่าใหม่ ${n} ช่องตอนเปิดเกมครั้งถัดไป (cache ~1 นาที)`), note,
    h('div', { class: 'row' }, h('button', { onclick: () => dlg.close() }, 'ยกเลิก'), go))
  go.addEventListener('click', () => {
    void (async () => {
      go.setAttribute('disabled', '')
      if ((dirty() || !S.draftRow) && !(await saveDraft())) { go.removeAttribute('disabled'); return }
      const r = await call('/admin/publish', 'POST', { draftId: S.draftRow?.id, note: note.value })
      if (r.status !== 200) { toast(`Publish ไม่สำเร็จ: ${errText(r)}`, true); go.removeAttribute('disabled'); return }
      const live = parseRow(r.body.live)
      dlg.close(); adopt(null, live); toast(`Publish #${live?.id ?? '?'} แล้ว 🎉`); renderApp()
    })()
  })
  dlg.addEventListener('close', () => dlg.remove())
  document.body.append(dlg)
  dlg.showModal()
}

// ---------- test in game ----------
async function testInGame() {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ patch: S.draft, guards: guardsFor(S.draft) })) } catch { /* private mode */ }
  const local = LOCAL_OK || S.offline
  const w = window.open('about:blank', '_blank') // open now: a window opened after an await is popup-blocked
  if (!local && (dirty() || !S.draftRow) && !(await saveDraft())) { w?.close(); return }
  const url = new URL(`./?cfg=${local ? 'local' : 'draft'}`, location.href).href
  if (w) w.location.href = url; else location.href = url
}

// ---------- history ----------
async function renderHistory(main: HTMLElement) {
  if (S.offline) { main.append(h('p', { class: 'muted' }, 'offline: ไม่มีประวัติ')); return }
  main.append(h('p', { class: 'muted' }, 'กำลังโหลด…'))
  const r = await call('/admin/releases?limit=50')
  if (S.tab !== 'history') return
  main.replaceChildren()
  if (r.status !== 200) { main.append(h('p', { class: 'bad' }, errText(r))); return }
  const list = (Array.isArray(r.body.releases) ? r.body.releases : []).map(parseRow).filter((x): x is SRow => x !== null)
  main.append(h('h2', {}, 'ประวัติ release'),
    S.live ? h('button', { class: 'danger', onclick: () => { void unpublish() } }, '⏻ ปิด live config (ผู้เล่นใช้ค่า default)') : h('p', { class: 'muted' }, 'ตอนนี้ไม่มี live release'))
  if (!list.length) main.append(h('p', { class: 'muted' }, 'ยังไม่มี release'))
  for (const rel of list) {
    const body = h('div', {})
    const d = h('details', { class: `rel ${rel.status}` },
      h('summary', {}, h('b', {}, `#${rel.id}`), ' ', h('span', { class: `pill ${rel.status}` }, rel.status), ` ${when(rel.publishedAt ?? rel.createdAt)} · ${rel.entries} ช่อง · ${rel.publishedBy ?? rel.createdBy}`,
        rel.note ? h('div', { class: 'muted' }, rel.note) : null),
      body)
    d.addEventListener('toggle', () => {
      if (!d.open || body.children.length) return
      void (async () => {
        const g = await call(`/admin/release/${rel.id}`)
        const full = parseRow(g.body.release)
        if (!full?.patch) { body.append(h('p', { class: 'bad' }, errText(g))); return }
        const p = full.patch
        body.append(
          h('p', { class: 'muted' }, 'เทียบกับ live ปัจจุบัน (live → release นี้):'), diffTable(diffPatches(livePatch(), p), 'live', `#${rel.id}`),
          h('div', { class: 'row' },
            h('button', { onclick: () => { S.draft = clonePatch(p); updateStatus(); toast(`โหลด #${rel.id} เข้า draft แล้ว (ยังไม่บันทึก)`) } }, '📥 โหลดเข้า draft'),
            rel.status === 'archived' ? h('button', { class: 'danger', onclick: () => { void rollback(rel.id) } }, '⏪ Rollback เป็น release นี้') : null))
      })()
    })
    main.append(d)
  }
}

async function rollback(id: number) {
  const note = prompt(`Rollback: live จะกลับไปใช้ค่าของ #${id} (สร้าง release ใหม่) — เหตุผล?`, '')
  if (note === null) return
  const r = await call('/admin/rollback', 'POST', { id, note })
  if (r.status !== 200) { toast(`Rollback ไม่สำเร็จ: ${errText(r)}`, true); return }
  S.live = parseRow(r.body.live); toast(`Rollback แล้ว → live #${S.live?.id ?? '?'}`); renderApp()
}

async function unpublish() {
  if (!confirm('ปิด live config? ผู้เล่นจะกลับไปใช้ค่า default ของ build (draft ไม่หาย)')) return
  const r = await call('/admin/unpublish', 'POST', {})
  if (r.status !== 200) { toast(errText(r), true); return }
  S.live = null; toast('ปิด live config แล้ว'); renderApp()
}

window.addEventListener('beforeunload', (e) => { if (dirty()) e.preventDefault() })
void boot()
