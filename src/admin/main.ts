// admin.html: live-ops balance editor. Edits a Patch (tunables.ts whitelist), saves it as the server draft, publishes it.
// The server re-validates everything (server/src/config.ts); the checks here are only for fast feedback.
import { DUNGEONS, MONSTERS, type MonsterKind } from '../data/game-data'
import { JOBS } from '../data/jobs'
import { JOB2, type Job2Id } from '../data/jobs2'
import type { BaseStat } from '../data/meta'
import { MON_STAT, monPoints, monTier, statNative } from '../data/mon-stats'
import { canonicalJson, checkPatch, guardsFor, type FieldRow } from '../data/patch'
import { SKILL2 } from '../data/skill2'
import { CRIT_SLOTS, critRef, JOB2_IDS, job2Layout, SKILL_CLASSES, SKILL_LAYOUT, type SkillClass, type SkillRef } from '../data/skill-registry'
import { type Patch, type TableId } from '../data/tunables'
import { LOCAL_KEY } from '../live-keys'
import { API, authClient, call, errText, parseRow, type SRow } from './api'
import { borrowPlan, heroClasses, type BorrowLine } from './borrow'
import {
  applyBulkOp,
  BULK_TABLE_IDS,
  filterMonsters,
  filterSkills,
  filterTableRows,
  implicitDefault,
  isUnusedNativeField,
  MON_PRESETS,
  type BulkOp,
  type BulkTarget,
  type MonFilter,
  type MonPresetId,
  type SkillFilter,
  type TableFilter,
} from './bulk'
import { explainField, explainTableGroup, TABLE_EXPLAIN } from './explain'
import { kitUsers, scriptKits } from './kits'
import {
  allocFor,
  BASE7,
  clampField,
  clonePatch,
  diffPatches,
  fieldLabel,
  fieldRow,
  fields,
  monSections,
  monsterGroups,
  patchSize,
  pctHint,
  previewLevels,
  previewManyMons,
  previewMon,
  previewSkills,
  setIn,
  TIER_LABEL,
  valueIn,
  type MonPreview,
  type SkillPreview,
  type Tier,
} from './model'

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
const nFmt = (v: number | undefined) => (v === undefined ? '—' : Number(v.toPrecision(6)).toString())
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—')

let uidSeq = 0
const nextId = (pre: string) => `${pre}-${++uidSeq}`

function toast(msg: string, bad = false) {
  const t = h('div', { class: `toast${bad ? ' bad' : ''}`, ...(bad ? { role: 'alert' } : {}) }, msg)
  $('toasts').append(t)
  if (!bad) announce(msg)
  setTimeout(() => t.remove(), bad ? 7000 : 3500)
}

function announce(msg: string) {
  const el = document.getElementById('announce')
  if (el) el.textContent = msg
}

// ---------- state ----------
type Tab = 'mon' | 'skills' | 'tables' | 'diff' | 'history'
const S = {
  offline: !API,
  me: '',
  live: null as SRow | null,
  draftRow: null as SRow | null,
  draft: {} as Patch,
  saved: '{}',
  tab: 'mon' as Tab,
  search: '',
  openMonster: '' as string,
  monMode: 'cards' as 'cards' | 'bulk',
  monPreset: 'core' as MonPresetId,
  monBulkRel: 'bodyMul.hp',
  monFilter: { search: '', dungeon: 'all', tier: 'all', model: 'all', status: 'all' } as MonFilter,
  monSel: new Set<MonsterKind>(),
  table: 'battle' as TableId,
  tableMode: 'groups' as 'groups' | 'bulk',
  tableFilter: { table: 'all', group: 'all', search: '', status: 'setOnly' } as TableFilter,
  tableSel: new Set<string>(),
  skillClass: 'swordsman' as SkillClass | Job2Id,
  skillMode: 'class' as 'class' | 'bulk',
  skillFilter: { search: '', tier: 'all', cls: 'all', slot: 'all', metric: 'all', status: 'all' } as SkillFilter,
  skillSel: new Set<string>(),
  bulkOp: 'pct' as BulkOp,
  bulkArg: '10',
  busy: false,
}
const livePatch = (): Patch => S.live?.patch ?? {}
const dirty = () => canonicalJson(S.draft) !== S.saved
const defOf = (t: TableId, path: string) => fieldRow(t, path)?.value
const liveOf = (t: TableId, path: string) => valueIn(livePatch(), t, path) ?? defOf(t, path)
const draftOf = (t: TableId, path: string) => valueIn(S.draft, t, path) ?? defOf(t, path)
const pending = () => diffPatches(livePatch(), S.draft)

function adopt(draftRow: SRow | null, live: SRow | null) {
  S.draftRow = draftRow
  S.live = live
  S.draft = clonePatch(draftRow?.patch ?? live?.patch ?? {})
  S.saved = canonicalJson(draftRow?.patch ?? live?.patch ?? {})
}

// ---------- boot / auth ----------
async function boot() {
  if (S.offline) {
    S.me = 'offline (ไม่มี VITE_API_URL)'
    adopt(null, null)
    renderApp()
    return
  }
  const r = await call('/admin/state')
  if (r.status === 200) {
    S.me = typeof r.body.me === 'string' ? r.body.me : ''
    adopt(parseRow(r.body.draft), parseRow(r.body.live))
    renderApp()
    return
  }
  const email = typeof r.body.email === 'string' ? r.body.email : ''
  renderGate(r.status === 401 ? 'login' : r.status === 403 ? 'forbidden' : 'error', r.status === 403 ? email : errText(r))
}

function renderGate(kind: 'login' | 'forbidden' | 'error', info: string) {
  const signIn = h('button', { type: 'button', class: 'primary', onclick: () => { void authClient?.signIn.social({ provider: 'google', callbackURL: location.href }) } }, 'เข้าสู่ระบบด้วย Google')
  const signOut = h('button', { type: 'button', onclick: () => { void authClient?.signOut().then(() => location.reload()) } }, 'ออกจากระบบ')
  const msg = kind === 'login'
    ? 'หน้านี้สำหรับผู้ดูแลเกมเท่านั้น — เข้าสู่ระบบด้วยบัญชี Google ที่อยู่ใน ADMIN_EMAILS'
    : kind === 'forbidden'
      ? (info ? `บัญชี ${info} ไม่ใช่ admin (ต้องเป็น Google + อยู่ใน ADMIN_EMAILS)` : 'ตอนนี้เป็นบัญชี guest — เข้าสู่ระบบด้วย Google ก่อน')
      : `ติดต่อเซิร์ฟเวอร์ไม่ได้: ${info}`
  $('app').replaceChildren(h('main', { class: 'gate' }, h('h1', {}, '⚙️ Balance Editor'), h('p', {}, msg),
    h('div', { class: 'row' }, kind === 'error' ? h('button', { type: 'button', onclick: () => location.reload() }, 'ลองใหม่') : signIn, kind === 'forbidden' ? signOut : null)))
}

// ---------- shell ----------
function renderApp() {
  const tabs: [Tab, string][] = [['mon', '👾 มอนสเตอร์'], ['skills', '⚔️ สกิลอาชีพ'], ['tables', '📊 ตารางอื่น'], ['diff', '📝 สรุป / เผยแพร่'], ['history', '🕘 ประวัติ']]
  const header = h('header', {},
    h('div', { class: 'row top' }, h('h1', { class: 'brand' }, '⚙️ Balance Editor · Engine'), h('span', { class: 'muted' }, S.me),
      S.offline ? null : h('button', { type: 'button', class: 'small', onclick: () => { void authClient?.signOut().then(() => location.reload()) } }, 'ออก')),
    h('div', { id: 'status', class: 'muted', role: 'status', 'aria-live': 'polite' }),
    h('div', { class: 'row' },
      h('button', { type: 'button', id: 'btnSave', disabled: S.offline, onclick: () => { void saveDraft() } }, '💾 บันทึก draft'),
      h('button', { type: 'button', onclick: () => { void testInGame() } }, '▶ ทดสอบในเกม'),
      h('button', { type: 'button', class: 'primary', disabled: S.offline, onclick: () => openPublish() }, '🚀 Publish')),
    h('nav', { 'aria-label': 'หมวดเครื่องมือปรับสมดุล' },
      ...tabs.map(([id, label]) => h('button', {
        type: 'button',
        class: S.tab === id ? 'on' : '',
        'aria-current': S.tab === id ? 'page' : false,
        onclick: () => { S.tab = id; renderApp() },
      }, label))))
  $('app').replaceChildren(header, h('main', { id: 'main', tabindex: '-1' }))
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

// ---------- accessible mode segmented control (forms: <= 5 options -> radio) ----------
function modeSwitch<T extends string>(legend: string, value: T, choices: [T, string][], onPick: (v: T) => void): HTMLElement {
  const group = nextId('mode')
  const fs = h('fieldset', { class: 'mode-seg' }, h('legend', { class: 'visually-hidden' }, legend))
  for (const [val, label] of choices) {
    const id = nextId('mopt')
    const radio = h('input', { type: 'radio', name: group, id, value: val, class: 'visually-hidden', checked: value === val })
    radio.addEventListener('change', () => { if (radio.checked) onPick(val) })
    fs.append(radio, h('label', { for: id }, label))
  }
  return fs
}

// ---------- responsive accessible table wrapper ----------
function wrapTable(captionText: string, labels: string[], tableContent: HTMLElement): HTMLElement {
  const capId = nextId('cap')
  const tbl = tableContent as HTMLTableElement
  tbl.prepend(h('caption', { id: capId, class: 'visually-hidden' }, captionText))
  labels.forEach((lbl, idx) => {
    if (idx > 0 && lbl) tbl.style.setProperty(`--label-${idx + 1}`, JSON.stringify(lbl))
  })
  return h('div', { class: 'table-wrapper', tabindex: '0', role: 'region', 'aria-labelledby': capId }, tbl)
}

// ---------- one editable field with Thai "ปรับแล้วได้อะไร" + expandable formula details ----------
function fieldCell(t: TableId, row: FieldRow, label: string, onChange: () => void, opts?: { native?: boolean }): HTMLElement {
  const { path, def } = row
  const ex = explainField(t, path, { native: opts?.native, defaultLabel: label })
  const displayLabel = label || ex.label
  const range = `ช่วง ${def.min} – ${def.max}${def.kind === 'int' ? ' (จำนวนเต็ม)' : ''}`
  const inId = nextId('in')
  const effId = nextId('eff')
  const metaId = nextId('meta')
  const detId = nextId('det')

  const input = h('input', {
    id: inId,
    type: 'number',
    inputmode: 'decimal',
    step: def.kind === 'int' ? '1' : 'any',
    min: String(def.min),
    max: String(def.max),
    'aria-describedby': `${effId} ${metaId}`,
  })
  const meta = h('div', { class: 'meta', id: metaId })
  const cell = h('div', { class: 'f' })

  const toLive = h('button', {
    type: 'button',
    class: 'icon',
    'aria-label': `คืนค่า live ของ ${displayLabel}`,
    title: 'กลับเป็นค่า live',
    onclick: () => write(valueIn(livePatch(), t, path) ?? null),
  }, '↺')
  const toDef = h('button', {
    type: 'button',
    class: 'icon',
    'aria-label': `คืนค่า default ของ ${displayLabel}`,
    title: 'กลับเป็นค่า default',
    onclick: () => write(null),
  }, '×')

  const refresh = () => {
    const d = valueIn(S.draft, t, path), live = liveOf(t, path), cur = draftOf(t, path)
    input.value = d === undefined ? (row.value === undefined ? '' : String(row.value)) : String(d)
    input.placeholder = row.value === undefined ? '—' : ''
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
    setIn(S.draft, t, path, v === null || v === row.value ? null : v)
    refresh(); onChange(); updateStatus()
  }

  input.addEventListener('change', () => {
    const v = clampField(def, input.value)
    if (v !== null && String(v) !== input.value.trim()) toast(`${displayLabel}: ปรับเป็น ${v} (ช่วง ${def.min}–${def.max})`)
    write(v)
  })

  const det = h('div', { class: 'f-detail', id: detId, hidden: true },
    ex.detail ? h('div', { class: 'f-det-text' }, ex.detail) : null,
    h('div', { class: 'f-det-tech' }, h('code', {}, `${t}.${path}`), ` · ${range}`))
  const infoBtn = h('button', {
    type: 'button',
    class: 'icon info-btn',
    'aria-expanded': 'false',
    'aria-controls': detId,
    'aria-label': `ดูสูตรและคำอธิบายเพิ่ม: ${displayLabel}`,
    onclick: () => {
      const open = !det.hidden
      det.hidden = open
      infoBtn.setAttribute('aria-expanded', String(!open))
    },
  }, '?')

  cell.append(
    h('div', { class: 'f-head' }, h('label', { for: inId }, displayLabel), infoBtn),
    h('div', { class: 'f-effect', id: effId }, ex.effect),
    h('div', { class: 'in' }, input, toLive, toDef),
    meta,
    det,
  )
  refresh()
  return cell
}

/** A <details> whose body is built on first open (monster cards hold hundreds of inputs). */
function lazyDetails(cls: string, summary: string, build: () => HTMLElement): HTMLDetailsElement {
  const d = h('details', { class: cls }, h('summary', {}, summary))
  d.addEventListener('toggle', () => { if (d.open && d.children.length === 1) d.append(build()) })
  return d
}
const isUsed = (t: TableId, r: FieldRow) => r.value !== undefined || valueIn(S.draft, t, r.path) !== undefined || valueIn(livePatch(), t, r.path) !== undefined
const cells = (t: TableId, fs: { row: FieldRow; label: string }[], onChange: () => void, native?: boolean) =>
  h('div', { class: 'grid' }, ...fs.map((f) => fieldCell(t, f.row, f.label, onChange, { native })))

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
  const native = statNative(k)
  for (const kit of scriptKits(k)) {
    const users = kitUsers(kit.name)
    box.append(h('section', { class: 'sec kit' }, h('h4', {}, `🎭 ${kit.name}`), h('p', { class: 'hint' }, kit.desc),
      h('div', { class: 'grid' }, ...kit.fields.map((q) => { const row = fieldRow('battle', q.path); return row ? fieldCell('battle', row, q.label, () => { onChange(); updateStatus() }) : '' })),
      h('p', { class: 'warn small' }, `⚠️ ค่ากลางใน BATTLE${users.length > 1 ? ` · ใช้ร่วมกับ: ${users.join(', ')}` : ''} (แท็บตารางอื่น → ระบบต่อสู้)`)))
  }
  for (const s of monSections(k, rowsOfMonster(k).filter((r) => !inBuilder(k, r.path)))) {
    const shown = (f: { row: FieldRow }) => isUsed('monsters', f.row) || /\.skills\.\d+(\.pick\.\d+)?\.lv$/.test(f.row.path)
    const used = s.fields.filter(shown), rest = s.fields.filter((f) => !shown(f))
    if (!used.length) { idle.push(lazyDetails('extra', `${s.title} · ${rest.length}`, () => cells('monsters', rest, onChange, native))); continue }
    const sec = h('section', { class: 'sec' }, h('h4', {}, s.title), cells('monsters', used, onChange, native))
    if (rest.length) sec.append(lazyDetails('extra', `＋ ช่องที่ยังไม่ตั้ง · ${rest.length}`, () => cells('monsters', rest, onChange, native)))
    box.append(sec)
  }
  if (idle.length) box.append(h('details', { class: 'extra idle' }, h('summary', {}, `＋ หมวดที่ยังไม่ได้ใช้ · ${idle.length}`), ...idle))
  return box
}

// ---------- reusable Bulk Bar ----------
function createBulkBar(opts: {
  getTotalFiltered: () => number
  getTargets: () => BulkTarget[]
  selectAllFiltered: () => void
  clearSelection: () => void
  onApplied: () => void
  extraControl?: HTMLElement
  targetSummaryLabel?: () => string
}): { el: HTMLElement; refresh: () => void } {
  const opId = nextId('bop'), argId = nextId('barg'), prevId = nextId('bprev')
  const countEl = h('span', { class: 'bulk-count' })
  const selAllBtn = h('button', { type: 'button', class: 'small', onclick: () => { opts.selectAllFiltered(); refresh() } })
  const clrBtn = h('button', { type: 'button', class: 'small', onclick: () => { opts.clearSelection(); refresh() } }, 'ล้างที่เลือก')

  const opSel = h('select', { id: opId, name: 'bulkOp' },
    h('option', { value: 'pct' }, '±% เพิ่ม/ลดเป็น % (เช่น 15 หรือ -10)'),
    h('option', { value: 'mul' }, '× คูณค่าเดิม (เช่น 1.2 หรือ 0.8)'),
    h('option', { value: 'add' }, '± บวก/ลบค่าคงที่ (เช่น 10 หรือ -5)'),
    h('option', { value: 'set' }, '= ตั้งค่าตรง (แทนที่ทุกแถว)'),
    h('option', { value: 'resetLive' }, '↺ คืนค่า live ทุกแถวที่เลือก'),
    h('option', { value: 'resetDef' }, '× คืนค่า default (build) ทุกแถวที่เลือก'),
  )
  opSel.value = S.bulkOp

  const argLbl = h('label', { for: argId }, 'เปอร์เซ็นต์ (%)')
  const argIn = h('input', { id: argId, name: 'bulkArg', type: 'number', inputmode: 'decimal', step: 'any', value: S.bulkArg })
  const applyBtn = h('button', { type: 'submit', class: 'primary' }, '✨ ปรับทั้งหมดที่เลือก')
  const previewEl = h('div', { id: prevId, class: 'bulk-preview muted small', 'aria-live': 'polite' })

  const opLabelText = (op: BulkOp) =>
    op === 'pct' ? 'เปอร์เซ็นต์ (%)' : op === 'mul' ? 'ตัวคูณ (×)' : op === 'add' ? 'ค่าบวก/ลบ (±)' : 'ค่าที่จะตั้ง (=)'

  const parseArg = (): number | undefined => {
    if (S.bulkOp === 'resetLive' || S.bulkOp === 'resetDef') return undefined
    const v = Number(argIn.value.trim())
    return argIn.value.trim() !== '' && Number.isFinite(v) ? v : undefined
  }

  const refresh = () => {
    const targets = opts.getTargets()
    const op = S.bulkOp
    const needsArg = op !== 'resetLive' && op !== 'resetDef'
    argIn.disabled = !needsArg
    argIn.hidden = !needsArg
    argLbl.hidden = !needsArg
    argLbl.textContent = opLabelText(op)
    const totalFiltered = opts.getTotalFiltered()
    countEl.textContent = opts.targetSummaryLabel ? opts.targetSummaryLabel() : `เลือกแล้ว ${targets.length} / ${totalFiltered} แถวที่กรอง`
    selAllBtn.textContent = `☑️ เลือกทั้งหมดในตาราง (${totalFiltered})`
    applyBtn.textContent = `✨ ปรับ ${targets.length} แถวที่เลือก`
    const argVal = parseArg()
    clrBtn.disabled = targets.length === 0

    if (!targets.length) {
      previewEl.textContent = 'ติ๊กเลือกแถวในตารางด้านล่าง แล้วเลือกวิธีปรับเพื่อดูตัวอย่างผลก่อนกดปรับ'
      return
    }
    if (needsArg && argVal === undefined) {
      previewEl.textContent = 'พิมพ์ตัวเลขในช่องค่าเพื่อดูตัวอย่างผลลัพธ์'
      return
    }
    const sim = applyBulkOp(S.draft, livePatch(), targets, op, argVal, true)
    const parts = [`จะอัปเดต ${sim.changed} ช่อง`]
    if (sim.unchanged) parts.push(`เท่าเดิม ${sim.unchanged}`)
    if (sim.clamped) parts.push(`ชนเพดาน min/max ${sim.clamped}`)
    if (sim.skipped) parts.push(`ข้ามช่องว่าง/ไม่ใช้งาน ${sim.skipped}`)
    const sam = sim.sample ? ` · ตัวอย่าง [${sim.sample.label}]: ${nFmt(sim.sample.from)} → ${nFmt(sim.sample.to)}` : ''
    previewEl.textContent = `${parts.join(' · ')}${sam}`
  }

  opSel.addEventListener('change', () => {
    S.bulkOp = opSel.value as BulkOp
    if (S.bulkOp === 'mul' && (S.bulkArg === '10' || S.bulkArg === '')) argIn.value = S.bulkArg = '1.2'
    else if (S.bulkOp === 'pct' && S.bulkArg === '1.2') argIn.value = S.bulkArg = '10'
    argIn.setCustomValidity('')
    refresh()
  })

  argIn.addEventListener('input', () => {
    argIn.setCustomValidity('')
    S.bulkArg = argIn.value
    refresh()
  })

  const form = h('form', { class: 'bulk-bar', novalidate: true },
    h('div', { class: 'bulk-top row' }, countEl, selAllBtn, clrBtn, opts.extraControl ?? null),
    h('div', { class: 'bulk-controls' },
      h('div', { class: 'bc' }, h('label', { for: opId }, 'วิธีปรับ (Bulk)'), opSel),
      h('div', { class: 'bc' }, argLbl, argIn),
      h('div', { class: 'bc bc-go' }, applyBtn),
    ),
    previewEl,
  )

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const targets = opts.getTargets()
    const needsArg = S.bulkOp !== 'resetLive' && S.bulkOp !== 'resetDef'
    const argVal = parseArg()
    if (!targets.length) {
      const msg = 'กรุณาติ๊กเลือกอย่างน้อย 1 แถวในตารางด้านล่างก่อนกดปรับ'
      toast(msg, true)
      announce(msg)
      return
    }
    if (needsArg && argVal === undefined) {
      argIn.setCustomValidity('กรุณากรอกตัวเลขที่ถูกต้อง')
      argIn.reportValidity()
      argIn.focus()
      return
    }
    const res = applyBulkOp(S.draft, livePatch(), targets, S.bulkOp, argVal, false)
    updateStatus()
    opts.onApplied()
    refresh()
    const msg = `ปรับ Bulk สำเร็จ ${res.changed} ช่อง${res.clamped ? ` (ชนเพดาน ${res.clamped})` : ''}${res.skipped ? ` (ข้าม ${res.skipped})` : ''} · ยังไม่บันทึก`
    toast(msg)
  })

  refresh()
  return { el: form, refresh }
}

// ---------- shared inline draft input for table rows ----------
function inlineTableCell(opts: {
  t: TableId
  row: FieldRow
  rowTitle: string
  colTitle: string
  disabledReason?: string
  onCellChange: () => void
}): { td: HTMLElement; refresh: () => void } {
  const { t, row, rowTitle, colTitle, disabledReason, onCellChange } = opts
  const { path, def } = row
  const td = h('td', { class: 'tbl-num' })
  if (disabledReason) {
    td.append(h('span', { class: 'muted small' }, disabledReason))
    return { td, refresh: () => {} }
  }
  const input = h('input', {
    type: 'number',
    inputmode: 'decimal',
    step: def.kind === 'int' ? '1' : 'any',
    min: String(def.min),
    max: String(def.max),
    'aria-label': `${rowTitle} · ${colTitle}`,
  })
  const note = h('div', { class: 'tbl-hint' })
  const toLive = h('button', {
    type: 'button',
    class: 'icon mini',
    'aria-label': `คืนค่า live: ${rowTitle} ${colTitle}`,
    title: 'คืนค่า live',
    onclick: () => write(valueIn(livePatch(), t, path) ?? null),
  }, '↺')
  const toDef = h('button', {
    type: 'button',
    class: 'icon mini',
    'aria-label': `คืนค่า default: ${rowTitle} ${colTitle}`,
    title: 'คืนค่า default',
    onclick: () => write(null),
  }, '×')

  const refresh = () => {
    const d = valueIn(S.draft, t, path), live = liveOf(t, path), cur = draftOf(t, path)
    const imp = implicitDefault(t, path)
    input.value = d === undefined ? (row.value === undefined ? '' : String(row.value)) : String(d)
    input.placeholder = row.value === undefined ? (imp === undefined ? '—' : String(imp)) : ''
    const pct = pctHint(def, cur)
    note.textContent = [pct, cur !== live ? `live ${fmt(live)}` : ''].filter(Boolean).join(' · ')
    toLive.hidden = cur === live
    toDef.hidden = d === undefined
    td.classList.toggle('chg', cur !== live)
    td.classList.toggle('pat', d !== undefined)
  }

  const write = (v: number | null) => {
    setIn(S.draft, t, path, v === null || v === row.value ? null : v)
    refresh(); onCellChange(); updateStatus()
  }

  input.addEventListener('change', () => {
    const v = clampField(def, input.value)
    if (v !== null && String(v) !== input.value.trim()) toast(`${rowTitle} (${colTitle}): ปรับเป็น ${v} (ช่วง ${def.min}–${def.max})`)
    write(v)
  })

  td.append(h('div', { class: 'in tbl-in' }, input, toLive, toDef), note)
  refresh()
  return { td, refresh }
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
  if (S.openMonster === k) {
    d.open = true
    fill()
    S.openMonster = ''
  }
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
  const num = (rel: string, hint = '', desc = rel) => {
    const row = fieldRow('monsters', P(rel))
    if (!row) return h('span', { class: 'muted' }, '—')
    const cur = val(rel), live = liveOf('monsters', P(rel))
    const ex = explainField('monsters', P(rel), { native })
    const i = h('input', {
      type: 'number', inputmode: 'decimal', step: row.def.kind === 'int' ? '1' : 'any', placeholder: hint,
      'aria-label': `${MONSTERS[k].name} · ${desc}`,
      title: `${ex.effect} (${P(rel)} · ช่วง ${row.def.min}–${row.def.max}${cur !== live ? ` · live ${fmt(live)}` : ''})`,
      class: cur !== live ? 'chg' : '',
    })
    i.value = cur === undefined ? '' : String(cur)
    i.addEventListener('change', () => { write(rel, clampField(row.def, i.value)); done() })
    return i
  }
  const draw = () => {
    const all = previewMon(k, S.draft), p = all.find((x) => x.lv === lv) ?? all[0]
    const base = monPoints(lv, tier), pm = val('pointsMul') ?? 1
    const lvSel = h('select', { 'aria-label': 'เลือกเลเวลตัวอย่าง' }, ...lvs.map((v) => h('option', { value: String(v) }, `Lv ${v}`)))
    lvSel.value = String(lv)
    lvSel.addEventListener('change', () => { lv = Number(lvSel.value); draw() })
    const want = Object.fromEntries(BASE7.map((s) => {
      const i = h('input', {
        type: 'number', min: '1', step: '1',
        'aria-label': `${MONSTERS[k].name} เป้าหมาย ${s.toUpperCase()} ที่ Lv ${lv}`,
        title: `พิมพ์ ${s.toUpperCase()} ที่อยากได้ที่ Lv ${lv} → ระบบคำนวณสัดส่วน + pointsMul ให้`,
      })
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
          ? h('td', {}, num(baseRel, '', `${label} ฐาน`), h('small', { class: 'muted' }, ` × ${(F / ((val(baseRel) ?? F) * m || 1)).toFixed(2)} จาก stat`))
          : h('td', { class: 'num' }, f(F / (m || 1)))
        return h('tr', {}, h('th', { scope: 'row' }, label), from, h('td', {}, '×', num(mulRel, '1', `ตัวคูณ ${label}`)), h('td', { class: 'muted' }, '—'), out(key, f))
      }),
      ...bonus.map(([label, key, dflt, rate]) => {
        const F = p[key] as number, b = val(key) ?? (native ? 0 : dflt), f = rate ? pc : n0
        return h('tr', {}, h('th', { scope: 'row' }, label), h('td', { class: 'num' }, native ? f(F - b) : signed(F - b, f)), h('td', { class: 'muted' }, '—'), h('td', {}, '+', num(key, native ? '0' : String(dflt), label)), out(key, f))
      }),
    ]
    box.replaceChildren(
      h('h4', {}, '📊 สร้าง stat ', lvSel),
      h('div', { class: 'step' }, h('b', {}, '① แต้มรวม '), `Lv ${lv} × ${TIER_LABEL[tier]} ${pc(MON_STAT.tierPct[tier])} = ${base} แต้ม  × `, num('pointsMul', '1', 'ตัวคูณแต้ม (pointsMul)'), h('b', {}, ` = ${Math.round(base * pm)} แต้ม`)),
      h('div', { class: 'step' }, h('b', {}, '② แบ่งแต้ม '), h('span', { class: 'muted small' }, 'สัดส่วน = หั่นพิซซ่ากี่ชิ้น (แก้ได้) · แถว "= stat" พิมพ์ค่าที่อยากได้ได้เลย ระบบคิดสัดส่วน + pointsMul ให้')),
      h('div', { class: 'scroll' }, h('table', { class: 'b7' },
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, ''), ...BASE7.map((s) => h('th', { scope: 'col' }, s.toUpperCase())))),
        h('tbody', {},
          h('tr', {}, h('th', { scope: 'row' }, 'สัดส่วน'), ...BASE7.map((s) => h('td', {}, num(`statAlloc.${s}`, '0', `สัดส่วน ${s.toUpperCase()}`)))),
          h('tr', {}, h('th', { scope: 'row' }, '= stat'), ...BASE7.map((s) => h('td', {}, want[s])))))),
      h('div', { class: 'step' }, h('b', {}, '③ ค่าจริง '), h('span', { class: 'muted small' }, native
        ? 'จาก stat × ตัวคูณ + โบนัส = ในเกม (ปรับ bodyMul/pointsMul เพิ่มความถึก/แรงได้โดยไม่เพี้ยนสูตร)'
        : 'มอน D1–5: HP / ATK = ค่าตั้ง (ที่ Lv บ้านเกิด) × ผลจาก stat × ตัวคูณ · ช่อง + = ค่าตั้ง (บวกผลต่างจาก stat)')),
      h('div', { class: 'scroll' }, h('table', { class: 'b3' },
        h('thead', {}, h('tr', {}, ...['', native ? 'จาก stat' : 'ค่าตั้ง / จาก stat', '× ตัวคูณ', native ? '+ โบนัส' : '+ ค่าตั้ง', '= ในเกม'].map((x) => h('th', { scope: 'col' }, x)))),
        h('tbody', {}, ...rows3))),
    )
  }
  draw()
  return box
}

/** "📥 ยืมจาก Hero tree": pick class -> node / talent -> Lv, see what it adds, then write it into the draft. */
function borrowBox(k: MonsterKind, rebuild: () => void): HTMLElement {
  const classes = heroClasses()
  const cls = h('select', { 'aria-label': 'เลือกอาชีพที่จะยืมโนด' }, ...classes.map((c, i) => h('option', { value: String(i) }, `${c.name} · ${c.srcs.length}`)))
  const src = h('select', { 'aria-label': 'เลือกสกิลหรือทาเลนต์' }), lv = h('select', { 'aria-label': 'เลือกเลเวลที่ต้องการ' }), plan = h('div', { class: 'plan' })
  const go = h('button', { type: 'button', class: 'primary small' }, '📥 ใส่ให้มอน')
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
  const span = (xs: (string | number | undefined)[]) => { const u = [...new Set(xs.filter((x) => x !== undefined && x !== '').map(String))]; return u.join('→') }
  const txt = (p: SkillPreview) => [
    `✨ ${p.name} Lv ${span(p.casts.map((c) => c.lv)) || p.lv}`, `ทุก ${p.every} เทิร์น`, span(p.casts.map((c) => c.dmg)),
    p.pow !== undefined && !p.casts.some((c) => c.dmg) ? `พลัง ${Number(p.pow.toFixed(3))}` : '',
    p.casts.some((c) => (c.hits ?? 1) > 1) ? `${span(p.casts.map((c) => c.hits ?? 1))} ฮิต` : '', p.turns ? `${p.turns} เทิร์น` : '', span(p.casts.map((c) => c.fx)),
  ].filter(Boolean).join(' · ')
  return now.map((p, i) => {
    const a = txt(p), b = was[i] ? txt(was[i]) : ''
    return h('div', { class: `small${a !== b ? ' warn' : ''}`, title: a !== b ? `live: ${b}` : '' }, a)
  })
}

function renderMonsters(main: HTMLElement) {
  const top = h('div', { class: 'tab-head' },
    h('h2', {}, '👾 มอนสเตอร์ทั้งหมด'),
    modeSwitch('รูปแบบหน้ามอนสเตอร์', S.monMode, [['cards', '🗂 การ์ดรายตัว'], ['bulk', '📋 ตาราง & Bulk']], (m) => { S.monMode = m; renderTab() }))

  if (S.monMode === 'cards') {
    const sId = nextId('msrc')
    const search = h('input', { id: sId, name: 'monCardSearch', type: 'search', placeholder: 'ค้นหาชื่อ / kind เช่น king, ไฮดรา', value: S.search, autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false' })
    const list = h('div', { class: 'mon-list' })
    const draw = () => {
      const term = S.search.trim().toLowerCase()
      const match = (k: MonsterKind) => !term || k.includes(term) || MONSTERS[k].name.toLowerCase().includes(term) || (MONSTERS[k].title ?? '').toLowerCase().includes(term)
      list.replaceChildren()
      for (const g of monsterGroups()) {
        const sec = h('section', {}, h('h3', { class: 'dg-title' }, g.name))
        let any = false
        for (const tier of ['boss', 'mini', 'normal'] as Tier[]) {
          const ks = g.tiers[tier].filter(match)
          if (!ks.length) continue
          any = true
          sec.append(h('h4', { class: `tier ${tier}` }, `${TIER_LABEL[tier]} · ${ks.length}`), ...ks.map(monsterCard))
        }
        if (any) list.append(sec)
      }
      if (!list.children.length) list.append(h('p', { class: 'muted' }, 'ไม่พบมอนสเตอร์'))
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    search.addEventListener('input', () => { S.search = search.value; clearTimeout(timer); timer = setTimeout(draw, 150) })
    draw()
    main.append(top, h('div', { class: 'sticky-search' }, h('label', { for: sId, class: 'visually-hidden' }, 'ค้นหามอนสเตอร์'), search), list)
    return
  }

  // ----- Monster Table & Filter & Bulk mode -----
  const tableSlot = h('div', {})
  let filtered = filterMonsters(S.monFilter, S.draft, livePatch())
  let rowRefreshers: (() => void)[] = []

  const colId = nextId('mbcol')
  const bulkColSel = h('select', { id: colId, name: 'bulkCol' })
  const syncBulkColOptions = () => {
    const presetCols = MON_PRESETS[S.monPreset].cols
    const allCols = Object.values(MON_PRESETS).flatMap((p) => p.cols)
    const seen = new Set<string>()
    const uniqueCols = [...presetCols, ...allCols].filter((c) => (seen.has(c.rel) ? false : (seen.add(c.rel), true)))
    bulkColSel.replaceChildren(...uniqueCols.map((c) => h('option', { value: c.rel }, `${c.short} (${c.rel})`)))
    if (!seen.has(S.monBulkRel)) S.monBulkRel = presetCols[0].rel
    bulkColSel.value = S.monBulkRel
  }
  syncBulkColOptions()

  const refreshVisibleRows = () => {
    for (const fn of rowRefreshers) fn()
    bulkBar.refresh()
  }

  const bulkBar = createBulkBar({
    getTotalFiltered: () => filtered.length,
    getTargets: () => filtered
      .filter((m) => S.monSel.has(m.kind))
      .map((m): BulkTarget => ({
        table: 'monsters',
        path: `${m.kind}.${S.monBulkRel}`,
        label: `${m.name} (${S.monBulkRel})`,
      })),
    selectAllFiltered: () => { filtered.forEach((m) => S.monSel.add(m.kind)); drawTable() },
    clearSelection: () => { S.monSel.clear(); drawTable() },
    onApplied: () => refreshVisibleRows(),
    extraControl: h('div', { class: 'bc-inline' }, h('label', { for: colId, class: 'small muted' }, 'คอลัมน์เป้าหมาย: '), bulkColSel),
    targetSummaryLabel: () => {
      const vis = filtered.filter((m) => S.monSel.has(m.kind)).length
      const tot = S.monSel.size
      return `เลือกในตารางนี้ ${vis} / ${filtered.length} ตัว${tot > vis ? ` (เลือกค้างนอกตัวกรองอีก ${tot - vis})` : ''}`
    },
  })

  bulkColSel.addEventListener('change', () => { S.monBulkRel = bulkColSel.value; bulkBar.refresh() })

  const drawTable = () => {
    filtered = filterMonsters(S.monFilter, S.draft, livePatch())
    const preset = MON_PRESETS[S.monPreset]
    const draftPrevMap = previewManyMons(filtered.map((m) => m.kind), S.draft)
    const livePrevMap = previewManyMons(filtered.map((m) => m.kind), livePatch())
    rowRefreshers = []

    if (!filtered.length) {
      tableSlot.replaceChildren(h('p', { class: 'muted' }, 'ไม่พบมอนสเตอร์ที่ตรงเงื่อนไขตัวกรอง'))
      bulkBar.refresh()
      return
    }

    const n0 = (v: number) => Math.round(v).toLocaleString('en-US')
    const headAllChk = h('input', {
      type: 'checkbox',
      'aria-label': 'เลือกหรือยกเลิกมอนสเตอร์ทั้งหมดที่แสดง',
      checked: filtered.every((m) => S.monSel.has(m.kind)),
    })
    headAllChk.addEventListener('change', () => {
      if (headAllChk.checked) filtered.forEach((m) => S.monSel.add(m.kind))
      else filtered.forEach((m) => S.monSel.delete(m.kind))
      drawTable()
    })

    const colHeaders = [
      'มอนสเตอร์',
      'ค่าจริงในเกม (ร่าง)',
      ...preset.cols.map((c) => c.short),
    ]

    const thead = h('thead', {}, h('tr', {},
      h('th', { scope: 'col' }, h('div', { class: 'th-row' }, headAllChk, h('span', {}, 'มอนสเตอร์ (ดัน / ระดับ)'))),
      h('th', { scope: 'col' }, 'ค่าจริงในเกม (Draft)', h('div', { class: 'th-sub' }, 'ส้ม = ต่างจาก live')),
      ...preset.cols.map((c) => h('th', { scope: 'col', title: `${c.tip} · กดเพื่อเลือกเป็นคอลัมน์ Bulk` },
        h('button', {
          type: 'button',
          class: `col-pick${S.monBulkRel === c.rel ? ' on' : ''}`,
          onclick: () => { S.monBulkRel = c.rel; syncBulkColOptions(); bulkBar.refresh(); drawTable() },
        }, c.short, h('span', { class: 'th-sub' }, c.rel)))),
    ))

    const tbody = h('tbody', {})
    for (const m of filtered) {
      const chkId = nextId('mchk')
      const chk = h('input', { type: 'checkbox', id: chkId, checked: S.monSel.has(m.kind), 'aria-label': `เลือก ${m.name}` })
      chk.addEventListener('change', () => {
        if (chk.checked) S.monSel.add(m.kind)
        else S.monSel.delete(m.kind)
        headAllChk.checked = filtered.every((x) => S.monSel.has(x.kind))
        bulkBar.refresh()
      })
      const openCard = h('button', {
        type: 'button',
        class: 'mini-link',
        title: `เปิดดูการ์ดและสกิลทั้งหมดของ ${m.name}`,
        onclick: () => {
          S.monMode = 'cards'
          S.search = m.kind
          S.openMonster = m.kind
          renderTab()
        },
      }, 'การ์ด')

      const prevTd = h('td', { class: 'tbl-prev' })
      const drawRowPrev = (recompute: boolean) => {
        const dp = recompute ? previewMon(m.kind, S.draft) : (draftPrevMap.get(m.kind) ?? [])
        const lp = livePrevMap.get(m.kind) ?? []
        const dLast = dp[dp.length - 1], lLast = lp[lp.length - 1]
        if (!dLast) return
        const hpChg = n0(dLast.hp) !== n0(lLast?.hp ?? dLast.hp)
        const atkChg = n0(dLast.dmg) !== n0(lLast?.dmg ?? dLast.dmg)
        const spdChg = dLast.speed.toFixed(1) !== (lLast?.speed ?? dLast.speed).toFixed(1)
        prevTd.replaceChildren(
          h('div', { class: `prev-line${hpChg ? ' chg' : ''}` }, `HP ${n0(dLast.hp)}`),
          h('div', { class: `prev-line${atkChg ? ' chg' : ''}` }, `ATK ${n0(dLast.dmg)}`),
          h('div', { class: `prev-line small${spdChg ? ' chg' : ' muted'}` }, `Lv${dLast.lv} · Spd ${dLast.speed.toFixed(1)}`),
        )
      }
      drawRowPrev(false)

      const cellRefreshers: (() => void)[] = []
      const colTds = preset.cols.map((c) => {
        const path = `${m.kind}.${c.rel}`
        const row = fieldRow('monsters', path)
        if (!row) return h('td', { class: 'muted small' }, '—')
        const unused = isUnusedNativeField('monsters', path) ? 'ใช้ stat' : undefined
        const cell = inlineTableCell({
          t: 'monsters',
          row,
          rowTitle: m.name,
          colTitle: c.short,
          disabledReason: unused,
          onCellChange: () => { drawRowPrev(true); bulkBar.refresh() },
        })
        cellRefreshers.push(cell.refresh)
        return cell.td
      })

      rowRefreshers.push(() => {
        for (const fn of cellRefreshers) fn()
        drawRowPrev(true)
      })

      const dgShort = m.dungeonId.toUpperCase()
      const tierCls = m.tier === 'boss' ? 'bad' : m.tier === 'mini' ? 'warn' : 'muted'
      const thRow = h('th', { scope: 'row' },
        h('div', { class: 'row-hdr' },
          chk,
          h('div', { class: 'row-name' },
            h('label', { for: chkId }, h('b', {}, m.name), ' ', h('code', {}, m.kind)),
            h('div', { class: 'small' },
              h('span', { class: tierCls }, TIER_LABEL[m.tier]),
              ` · ${dgShort} · ${m.native ? 'Stat ล้วน' : 'ฐาน D1-5'}`,
              ' ',
              openCard))))

      tbody.append(h('tr', {}, thRow, prevTd, ...colTds))
    }

    const tbl = h('table', { class: 'bulk-tbl' }, thead, tbody)
    tableSlot.replaceChildren(wrapTable(`ตารางปรับมอนสเตอร์ (${preset.label})`, colHeaders, tbl))
    bulkBar.refresh()
  }

  // Filter controls
  const qId = nextId('mfq'), dgId = nextId('mfd'), trId = nextId('mft'), mdId = nextId('mfm'), stId = nextId('mfs')
  const fSearch = h('input', { id: qId, type: 'search', placeholder: 'ชื่อ, kind, ฉายา…', value: S.monFilter.search, autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false' })
  const fDg = h('select', { id: dgId },
    h('option', { value: 'all' }, 'ทุกดันเจี้ยน'),
    ...DUNGEONS.map((d) => h('option', { value: d.id }, `${d.id.toUpperCase()} · ${d.name}`)),
    h('option', { value: 'other' }, 'อื่น ๆ (อีเวนต์/ซัมมอน)'))
  fDg.value = S.monFilter.dungeon
  const fTier = h('select', { id: trId },
    h('option', { value: 'all' }, 'ทุกระดับ'),
    h('option', { value: 'boss' }, 'บอส (MVP)'),
    h('option', { value: 'mini' }, 'มินิบอส'),
    h('option', { value: 'normal' }, 'มอนสเตอร์ปกติ'))
  fTier.value = S.monFilter.tier
  const fModel = h('select', { id: mdId },
    h('option', { value: 'all' }, 'ทุกโมเดลพลัง'),
    h('option', { value: 'native' }, 'D6+ (Stat ล้วน)'),
    h('option', { value: 'anchored' }, 'D1–5 / อีเวนต์ (ยึดค่าฐาน)'))
  fModel.value = S.monFilter.model
  const fStatus = h('select', { id: stId },
    h('option', { value: 'all' }, 'ทั้งหมด'),
    h('option', { value: 'diffLive' }, '✏️ ต่างจาก live'),
    h('option', { value: 'diffDef' }, '🔵 แก้จาก default'))
  fStatus.value = S.monFilter.status

  const presetChips = h('div', { class: 'chips', role: 'group', 'aria-label': 'ชุดคอลัมน์มอนสเตอร์' },
    h('span', { class: 'muted small' }, 'ชุดคอลัมน์: '),
    ...(Object.keys(MON_PRESETS) as MonPresetId[]).map((pid) =>
      h('button', {
        type: 'button',
        class: S.monPreset === pid ? 'on small' : 'small',
        'aria-pressed': String(S.monPreset === pid),
        onclick: () => { S.monPreset = pid; S.monBulkRel = MON_PRESETS[pid].cols[0].rel; syncBulkColOptions(); renderTab() },
      }, MON_PRESETS[pid].label)))

  let tMon: ReturnType<typeof setTimeout> | undefined
  fSearch.addEventListener('input', () => { S.monFilter.search = fSearch.value; clearTimeout(tMon); tMon = setTimeout(drawTable, 120) })
  fDg.addEventListener('change', () => { S.monFilter.dungeon = fDg.value; drawTable() })
  fTier.addEventListener('change', () => { S.monFilter.tier = fTier.value as MonFilter['tier']; drawTable() })
  fModel.addEventListener('change', () => { S.monFilter.model = fModel.value as MonFilter['model']; drawTable() })
  fStatus.addEventListener('change', () => { S.monFilter.status = fStatus.value as MonFilter['status']; drawTable() })

  const filterBar = h('section', { class: 'filter-bar' },
    h('div', { class: 'filter-grid' },
      h('div', { class: 'fg' }, h('label', { for: qId }, 'ค้นหา'), fSearch),
      h('div', { class: 'fg' }, h('label', { for: dgId }, 'ดันเจี้ยน'), fDg),
      h('div', { class: 'fg' }, h('label', { for: trId }, 'ระดับ'), fTier),
      h('div', { class: 'fg' }, h('label', { for: mdId }, 'โมเดล stat'), fModel),
      h('div', { class: 'fg' }, h('label', { for: stId }, 'สถานะการแก้'), fStatus)),
    presetChips)

  drawTable()
  main.append(top, filterBar, bulkBar.el, tableSlot)
}

// ---------- class skills (skill-registry.ts) ----------
function skillBlock(title: string, refs: SkillRef[], hint?: string): HTMLElement {
  const cs = refs.map((ref) => { const row = fieldRow(ref.table, ref.path); return row ? fieldCell(ref.table, row, ref.label, updateStatus) : null })
  return h('section', { class: 'sec skillcol' }, h('h4', {}, title), hint ? h('p', { class: 'hint' }, hint) : null, h('div', { class: 'grid' }, ...cs))
}

function renderSkills(main: HTMLElement) {
  const top = h('div', { class: 'tab-head' },
    h('h2', {}, '⚔️ สกิลอาชีพและอาชีพขั้น 2'),
    modeSwitch('รูปแบบหน้าสกิลอาชีพ', S.skillMode, [['class', '🧩 แยกตามอาชีพ'], ['bulk', '📋 ตาราง & Bulk']], (m) => { S.skillMode = m; renderTab() }))

  if (S.skillMode === 'class') {
    const sel = S.skillClass, j2 = (JOB2_IDS as string[]).includes(sel) ? JOB2[sel as Job2Id] : undefined
    const c = (j2 ? j2.parent : sel) as SkillClass, job = JOBS[c], L = SKILL_LAYOUT[c]
    const chip = (id: SkillClass | Job2Id, label: string) => h('button', { type: 'button', class: sel === id ? 'on' : '', 'aria-pressed': String(sel === id), onclick: () => { S.skillClass = id; renderTab() } }, label)
    const pick = h('div', { class: 'chips' }, ...SKILL_CLASSES.map((id) => chip(id, `${JOBS[id].icon} ${JOBS[id].name}`)))
    const pick2 = h('div', { class: 'chips' }, h('span', { class: 'muted' }, 'อาชีพขั้น 2: '), ...JOB2_IDS.filter((id) => JOB2[id].parent === c).map((id) => chip(id, `${JOB2[id].icon} ${JOB2[id].name}`)))

    if (j2) {
      const l = job2Layout(sel as Job2Id)
      main.append(top, pick, pick2, h('h3', {}, `${j2.icon} ${j2.name}`),
        h('p', { class: 'hint' }, 'ความแรงคริใช้ของคลาสแม่ · ตัวเลขคำอธิบายบนหน้าจอเกมจะคงเดิมจนกว่าจะ build ใหม่ แต่ค่าคำนวณจริงเปลี่ยนทันที · แตะ ? ที่แต่ละช่องเพื่อดูสูตร'),
        h('div', { class: 'skillcols' },
          skillBlock(`3 · ${j2.skill3.icon} ${j2.skill3.name}`, l.s3, 'ทักษะใหม่ของอาชีพขั้น 2 (ปรับ cost / cd และตัวคูณทั้งหมดได้)'),
          skillBlock(`Ult วิวัฒน์ · ${j2.ult.icon} ${j2.ult.name}`, l.ult, 'ท่าไม้ตายขั้น 2 (สเกลควบคู่ของคลาสแม่)'),
          skillBlock(`${j2.signature.icon} ${j2.signature.name} · พาสซีฟ/อื่น ๆ`, l.other, 'Signature, Weapon Mastery และ Skill tree ชั้น 2 (ถ้ามี)')))
      return
    }
    const crit = (slot: (typeof CRIT_SLOTS)[number]) => critRef(c, slot)
    const cols: HTMLElement[] = [
      skillBlock(`1 · ${job.auto.icon} ${job.auto.name}`, [crit('s1'), ...L.s1]),
      ...L.s2.map((x) => { const d = SKILL2.find((s) => s.id === x.id); return skillBlock(`2 · ${d?.icon ?? ''} ${d?.name ?? x.id}`, [crit('s2'), ...x.refs], 'ทักษะ 2 เลือกได้ 1 ใน 3 · ความแรงคริใช้ร่วมกันทั้ง 3 ท่า') }),
      skillBlock(`Ult · ${job.ult.icon} ${job.ult.name}`, [crit('ult'), ...L.ult]),
      ...(L.tree ? [skillBlock('🌳 Skill tree (node)', L.tree, '"Lv เดิม" = ค่าต่อ Lv ก่อนยืด 3 → 5 (Lv จริง × 3/5)')] : []),
    ]
    main.append(top, pick, pick2, h('h3', {}, `${job.icon} ${job.name}`),
      h('p', { class: 'hint' }, 'ความแรงคริ: 1 = คริเต็ม · 0.5 = โบนัสคริ (critMul−1) เหลือครึ่ง · 0 = ไม่คริ · ใช้กับอาชีพขั้น 2 ของคลาสนี้ด้วย · ค่าคำนวณจริงในเกมเปลี่ยนทันที'),
      h('div', { class: 'skillcols' }, ...cols))
    return
  }

  // ----- Skills Table & Filter & Bulk mode -----
  const tableSlot = h('div', {})
  let filtered = filterSkills(S.skillFilter, S.draft, livePatch())
  let rowRefreshers: (() => void)[] = []

  const refreshVisibleRows = () => { for (const fn of rowRefreshers) fn(); bulkBar.refresh() }

  const bulkBar = createBulkBar({
    getTotalFiltered: () => filtered.length,
    getTargets: () => filtered
      .filter((r) => S.skillSel.has(r.id))
      .map((r): BulkTarget => ({ table: r.table, path: r.path, label: `${r.className}: ${r.explain.label}` })),
    selectAllFiltered: () => { filtered.forEach((r) => S.skillSel.add(r.id)); drawTable() },
    clearSelection: () => { S.skillSel.clear(); drawTable() },
    onApplied: () => refreshVisibleRows(),
    targetSummaryLabel: () => {
      const vis = filtered.filter((r) => S.skillSel.has(r.id)).length
      const tot = S.skillSel.size
      return `เลือกในตารางนี้ ${vis} / ${filtered.length} ช่อง${tot > vis ? ` (เลือกค้างนอกตัวกรองอีก ${tot - vis})` : ''}`
    },
  })

  const drawTable = () => {
    filtered = filterSkills(S.skillFilter, S.draft, livePatch())
    rowRefreshers = []
    if (!filtered.length) {
      tableSlot.replaceChildren(h('p', { class: 'muted' }, 'ไม่พบพารามิเตอร์สกิลที่ตรงเงื่อนไข'))
      bulkBar.refresh()
      return
    }
    const headChk = h('input', {
      type: 'checkbox',
      'aria-label': 'เลือกหรือยกเลิกสกิลทั้งหมดที่แสดง',
      checked: filtered.every((r) => S.skillSel.has(r.id)),
    })
    headChk.addEventListener('change', () => {
      if (headChk.checked) filtered.forEach((r) => S.skillSel.add(r.id))
      else filtered.forEach((r) => S.skillSel.delete(r.id))
      drawTable()
    })

    const labels = ['อาชีพ / ช่องสกิล', 'ชื่อค่า & ปรับแล้วได้อะไร', 'Default', 'Live', 'Draft (แก้ไข)']
    const thead = h('thead', {}, h('tr', {},
      h('th', { scope: 'col' }, h('div', { class: 'th-row' }, headChk, h('span', {}, labels[0]))),
      h('th', { scope: 'col' }, labels[1]),
      h('th', { scope: 'col', class: 'num' }, labels[2]),
      h('th', { scope: 'col', class: 'num' }, labels[3]),
      h('th', { scope: 'col' }, labels[4]),
    ))

    const tbody = h('tbody', {})
    for (const r of filtered) {
      const chkId = nextId('schk')
      const chk = h('input', { type: 'checkbox', id: chkId, checked: S.skillSel.has(r.id), 'aria-label': `เลือก ${r.className} ${r.explain.label}` })
      chk.addEventListener('change', () => {
        if (chk.checked) S.skillSel.add(r.id)
        else S.skillSel.delete(r.id)
        headChk.checked = filtered.every((x) => S.skillSel.has(x.id))
        bulkBar.refresh()
      })
      const liveTd = h('td', { class: 'num' }, fmt(liveOf(r.table, r.path)))
      const cell = inlineTableCell({
        t: r.table,
        row: r.row,
        rowTitle: `${r.className} (${r.slotLabel})`,
        colTitle: r.explain.label,
        onCellChange: () => { liveTd.textContent = fmt(liveOf(r.table, r.path)); bulkBar.refresh() },
      })
      rowRefreshers.push(() => { liveTd.textContent = fmt(liveOf(r.table, r.path)); cell.refresh() })

      const thRow = h('th', { scope: 'row' },
        h('div', { class: 'row-hdr' },
          chk,
          h('div', { class: 'row-name' },
            h('label', { for: chkId }, h('b', {}, r.className)),
            h('div', { class: 'small muted' }, `${r.slotLabel} · `, h('code', {}, `${r.table}.${r.path}`)))))

      const descTd = h('td', {},
        h('div', { class: 'tbl-lbl' }, r.explain.label),
        h('div', { class: 'f-effect' }, r.explain.effect),
        r.explain.detail ? h('div', { class: 'muted small' }, r.explain.detail) : null)

      tbody.append(h('tr', {}, thRow, descTd, h('td', { class: 'num muted' }, fmt(r.row.value)), liveTd, cell.td))
    }
    const tbl = h('table', { class: 'bulk-tbl' }, thead, tbody)
    tableSlot.replaceChildren(wrapTable('ตารางปรับสกิลอาชีพแบบกลุ่ม', labels, tbl))
    bulkBar.refresh()
  }

  const qId = nextId('sfq'), trId = nextId('sft'), clId = nextId('sfc'), slId = nextId('sfs'), mtId = nextId('sfm'), stId = nextId('sfst')
  const fSearch = h('input', { id: qId, type: 'search', placeholder: 'ชื่อสกิล, ผลที่เปลี่ยน, path…', value: S.skillFilter.search, autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false' })
  const fTier = h('select', { id: trId },
    h('option', { value: 'all' }, 'ทั้งหมด (คลาส 1 + ขั้น 2)'),
    h('option', { value: 'base' }, 'คลาสหลัก (5 อาชีพ)'),
    h('option', { value: 'job2' }, 'อาชีพขั้น 2 (10 อาชีพ)'))
  fTier.value = S.skillFilter.tier

  const fCls = h('select', { id: clId },
    h('option', { value: 'all' }, 'ทุกอาชีพ'),
    h('optgroup', { label: 'คลาสหลัก (+รวมขั้น 2)' },
      ...SKILL_CLASSES.map((c) => h('option', { value: c }, `${JOBS[c].icon} ${JOBS[c].name}`))),
    h('optgroup', { label: 'เฉพาะอาชีพขั้น 2' },
      ...JOB2_IDS.map((j) => h('option', { value: j }, `${JOB2[j].icon} ${JOB2[j].name}`))))
  fCls.value = S.skillFilter.cls

  const fSlot = h('select', { id: slId },
    h('option', { value: 'all' }, 'ทุกช่องสกิล'),
    h('option', { value: 'crit' }, '💥 สวิตช์คริ (crit)'),
    h('option', { value: 's1' }, '1 · ทักษะ 1'),
    h('option', { value: 's2' }, '2 · ทักษะ 2'),
    h('option', { value: 's3' }, '3 · ทักษะ 3 (ขั้น 2)'),
    h('option', { value: 'ult' }, '⚡ Ult / Ult วิวัฒน์'),
    h('option', { value: 'tree' }, '🌳 Skill tree'),
    h('option', { value: 'other' }, '✨ Signature / พาสซีฟขั้น 2'))
  fSlot.value = S.skillFilter.slot

  const fMetric = h('select', { id: mtId },
    h('option', { value: 'all' }, 'ทุกประเภทค่า'),
    h('option', { value: 'cost' }, '💧 ค่าร่าย (Cost)'),
    h('option', { value: 'cd' }, '⏱️ คูลดาวน์ (CD)'),
    h('option', { value: 'crit' }, '💥 ตัวคูณคริ (Crit)'),
    h('option', { value: 'dmg' }, '⚔️ ตัวคูณดาเมจ / ฮีล / โล่ / บัฟ'),
    h('option', { value: 'count' }, '🔢 จำนวนฮิต / เทิร์น / สแต็ก'))
  fMetric.value = S.skillFilter.metric

  const fStatus = h('select', { id: stId },
    h('option', { value: 'all' }, 'ทั้งหมด'),
    h('option', { value: 'diffLive' }, '✏️ ต่างจาก live'),
    h('option', { value: 'diffDef' }, '🔵 แก้จาก default'))
  fStatus.value = S.skillFilter.status

  let tSk: ReturnType<typeof setTimeout> | undefined
  fSearch.addEventListener('input', () => { S.skillFilter.search = fSearch.value; clearTimeout(tSk); tSk = setTimeout(drawTable, 120) })
  fTier.addEventListener('change', () => { S.skillFilter.tier = fTier.value as SkillFilter['tier']; drawTable() })
  fCls.addEventListener('change', () => { S.skillFilter.cls = fCls.value; drawTable() })
  fSlot.addEventListener('change', () => { S.skillFilter.slot = fSlot.value as SkillFilter['slot']; drawTable() })
  fMetric.addEventListener('change', () => { S.skillFilter.metric = fMetric.value as SkillFilter['metric']; drawTable() })
  fStatus.addEventListener('change', () => { S.skillFilter.status = fStatus.value as SkillFilter['status']; drawTable() })

  const filterBar = h('section', { class: 'filter-bar' },
    h('div', { class: 'filter-grid' },
      h('div', { class: 'fg' }, h('label', { for: qId }, 'ค้นหา'), fSearch),
      h('div', { class: 'fg' }, h('label', { for: trId }, 'ระดับอาชีพ'), fTier),
      h('div', { class: 'fg' }, h('label', { for: clId }, 'อาชีพ'), fCls),
      h('div', { class: 'fg' }, h('label', { for: slId }, 'ช่องสกิล'), fSlot),
      h('div', { class: 'fg' }, h('label', { for: mtId }, 'ประเภทค่า'), fMetric),
      h('div', { class: 'fg' }, h('label', { for: stId }, 'สถานะการแก้'), fStatus)))

  drawTable()
  main.append(top, filterBar, bulkBar.el, tableSlot)
}

// ---------- other tables (generic from TABLES) ----------
function renderTables(main: HTMLElement) {
  const top = h('div', { class: 'tab-head' },
    h('h2', {}, '📊 ตารางระบบและสูตรเกม'),
    modeSwitch('รูปแบบหน้าตารางอื่น', S.tableMode, [['groups', '🧩 แยกกลุ่ม'], ['bulk', '📋 ตาราง & Bulk']], (m) => { S.tableMode = m; renderTab() }))

  if (S.tableMode === 'groups') {
    const ids = BULK_TABLE_IDS
    if (!ids.includes(S.table)) S.table = 'battle'
    const pick = h('div', { class: 'chips', role: 'group', 'aria-label': 'เลือกตาราง' },
      ...ids.map((t) => h('button', {
        type: 'button',
        class: S.table === t ? 'on' : '',
        'aria-pressed': String(S.table === t),
        onclick: () => { S.table = t; renderTab() },
      }, TABLE_EXPLAIN[t].short, ' ', h('code', {}, t))))

    const t = S.table
    const tex = TABLE_EXPLAIN[t]
    const rows = fields(t), groups = new Map<string, FieldRow[]>()
    for (const r of rows) {
      const dot = r.path.indexOf('.'), key = dot < 0 ? '' : r.path.slice(0, dot)
      const list = groups.get(key) ?? []
      list.push(r); groups.set(key, list)
    }
    const flat = groups.get('') ?? []
    for (const [k, list] of groups) if (k && list.length === 1) { flat.push(...list); groups.delete(k) }
    groups.delete('')

    const body = h('div', {},
      h('h3', {}, tex.label),
      h('p', { class: 'hint' }, tex.summary))

    const labelOf = (p: string) => explainField(t, p).label
    if (flat.length) body.append(fieldGrid(t, flat, labelOf, updateStatus))
    for (const [k, list] of groups) {
      const grp = explainTableGroup(t, k)
      const badge = h('span', { class: 'badge' })
      const setBadge = () => { const n = changedCount(t, `${k}.`); badge.textContent = n ? `${n} แก้` : ''; badge.hidden = !n }
      setBadge()
      const d = h('details', { class: 'mon' },
        h('summary', {}, h('b', {}, grp.title), h('span', { class: 'muted' }, ` · ${list.length} ช่อง `), badge,
          grp.desc ? h('div', { class: 'small muted' }, grp.desc) : null))
      d.addEventListener('toggle', () => { if (d.open && d.children.length === 1) d.append(fieldGrid(t, list, labelOf, setBadge)) })
      body.append(d)
    }
    main.append(top, pick, body)
    return
  }

  // ----- Tables Bulk & Filter mode -----
  const tableSlot = h('div', {})
  let filtered = filterTableRows(S.tableFilter, S.draft, livePatch())
  let rowRefreshers: (() => void)[] = []

  const refreshVisibleRows = () => { for (const fn of rowRefreshers) fn(); bulkBar.refresh() }

  const bulkBar = createBulkBar({
    getTotalFiltered: () => filtered.length,
    getTargets: () => filtered
      .filter((r) => S.tableSel.has(r.id))
      .map((r): BulkTarget => ({ table: r.table, path: r.path, label: `${r.tableShort}: ${r.explain.label}` })),
    selectAllFiltered: () => { filtered.forEach((r) => S.tableSel.add(r.id)); drawTable() },
    clearSelection: () => { S.tableSel.clear(); drawTable() },
    onApplied: () => refreshVisibleRows(),
    targetSummaryLabel: () => {
      const vis = filtered.filter((r) => S.tableSel.has(r.id)).length
      const tot = S.tableSel.size
      return `เลือกในตารางนี้ ${vis} / ${filtered.length} ช่อง${tot > vis ? ` (เลือกค้างนอกตัวกรองอีก ${tot - vis})` : ''}`
    },
  })

  const grpSelId = nextId('tfg')
  const fGroup = h('select', { id: grpSelId })
  const syncGroupOptions = () => {
    const groups = new Map<string, string>()
    const tablesToScan = S.tableFilter.table === 'all' ? BULK_TABLE_IDS : [S.tableFilter.table]
    for (const t of tablesToScan) {
      for (const r of fields(t)) {
        const dot = r.path.indexOf('.')
        if (dot > 0) {
          const k = r.path.slice(0, dot)
          if (!groups.has(k)) groups.set(k, explainTableGroup(t, k).title)
        }
      }
    }
    fGroup.replaceChildren(
      h('option', { value: 'all' }, 'ทุกกลุ่มย่อย'),
      ...[...groups.entries()].map(([k, title]) => h('option', { value: k }, title)))
    if (S.tableFilter.group !== 'all' && !groups.has(S.tableFilter.group)) S.tableFilter.group = 'all'
    fGroup.value = S.tableFilter.group
  }
  syncGroupOptions()

  const drawTable = () => {
    filtered = filterTableRows(S.tableFilter, S.draft, livePatch())
    rowRefreshers = []
    if (!filtered.length) {
      tableSlot.replaceChildren(h('p', { class: 'muted' }, 'ไม่พบพารามิเตอร์ที่ตรงเงื่อนไข'))
      bulkBar.refresh()
      return
    }
    const headChk = h('input', {
      type: 'checkbox',
      'aria-label': 'เลือกหรือยกเลิกทุกช่องที่แสดง',
      checked: filtered.every((r) => S.tableSel.has(r.id)),
    })
    headChk.addEventListener('change', () => {
      if (headChk.checked) filtered.forEach((r) => S.tableSel.add(r.id))
      else filtered.forEach((r) => S.tableSel.delete(r.id))
      drawTable()
    })

    const labels = ['ตาราง / กลุ่ม', 'ชื่อค่า & ปรับแล้วได้อะไร', 'Default', 'Live', 'Draft (แก้ไข)']
    const thead = h('thead', {}, h('tr', {},
      h('th', { scope: 'col' }, h('div', { class: 'th-row' }, headChk, h('span', {}, labels[0]))),
      h('th', { scope: 'col' }, labels[1]),
      h('th', { scope: 'col', class: 'num' }, labels[2]),
      h('th', { scope: 'col', class: 'num' }, labels[3]),
      h('th', { scope: 'col' }, labels[4]),
    ))

    const tbody = h('tbody', {})
    for (const r of filtered) {
      const chkId = nextId('tchk')
      const chk = h('input', { type: 'checkbox', id: chkId, checked: S.tableSel.has(r.id), 'aria-label': `เลือก ${r.explain.label}` })
      chk.addEventListener('change', () => {
        if (chk.checked) S.tableSel.add(r.id)
        else S.tableSel.delete(r.id)
        headChk.checked = filtered.every((x) => S.tableSel.has(x.id))
        bulkBar.refresh()
      })
      const liveTd = h('td', { class: 'num' }, fmt(liveOf(r.table, r.path)))
      const cell = inlineTableCell({
        t: r.table,
        row: r.row,
        rowTitle: `${r.tableShort}: ${r.explain.label}`,
        colTitle: r.path,
        onCellChange: () => { liveTd.textContent = fmt(liveOf(r.table, r.path)); bulkBar.refresh() },
      })
      rowRefreshers.push(() => { liveTd.textContent = fmt(liveOf(r.table, r.path)); cell.refresh() })

      const thRow = h('th', { scope: 'row' },
        h('div', { class: 'row-hdr' },
          chk,
          h('div', { class: 'row-name' },
            h('label', { for: chkId }, h('b', {}, r.tableShort)),
            h('div', { class: 'small muted' }, r.groupTitle, ' · ', h('code', {}, r.path)))))

      const descTd = h('td', {},
        h('div', { class: 'tbl-lbl' }, r.explain.label),
        h('div', { class: 'f-effect' }, r.explain.effect),
        r.explain.detail ? h('div', { class: 'muted small' }, r.explain.detail) : null)

      tbody.append(h('tr', {}, thRow, descTd, h('td', { class: 'num muted' }, fmt(r.row.value)), liveTd, cell.td))
    }
    const tbl = h('table', { class: 'bulk-tbl' }, thead, tbody)
    tableSlot.replaceChildren(wrapTable('ตารางปรับค่าระบบแบบกลุ่ม', labels, tbl))
    bulkBar.refresh()
  }

  const qId = nextId('tfq'), tblId = nextId('tft'), stId = nextId('tfst')
  const fSearch = h('input', { id: qId, type: 'search', placeholder: 'ค้นหาชื่อค่า, ผลที่เปลี่ยน, path…', value: S.tableFilter.search, autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false' })
  const fTable = h('select', { id: tblId },
    h('option', { value: 'all' }, 'รวมทุกตาราง'),
    ...BULK_TABLE_IDS.map((t) => h('option', { value: t }, `${TABLE_EXPLAIN[t].short} (${t})`)))
  fTable.value = S.tableFilter.table

  const fStatus = h('select', { id: stId },
    h('option', { value: 'setOnly' }, 'เฉพาะช่องที่ตั้งค่าไว้ (แนะนำ)'),
    h('option', { value: 'all' }, 'ทั้งหมดรวมช่องว่าง (optional)'),
    h('option', { value: 'diffLive' }, '✏️ ต่างจาก live'),
    h('option', { value: 'diffDef' }, '🔵 แก้จาก default'))
  fStatus.value = S.tableFilter.status

  let tTb: ReturnType<typeof setTimeout> | undefined
  fSearch.addEventListener('input', () => { S.tableFilter.search = fSearch.value; clearTimeout(tTb); tTb = setTimeout(drawTable, 120) })
  fTable.addEventListener('change', () => { S.tableFilter.table = fTable.value as TableFilter['table']; syncGroupOptions(); drawTable() })
  fGroup.addEventListener('change', () => { S.tableFilter.group = fGroup.value; drawTable() })
  fStatus.addEventListener('change', () => { S.tableFilter.status = fStatus.value as TableFilter['status']; drawTable() })

  const filterBar = h('section', { class: 'filter-bar' },
    h('div', { class: 'filter-grid' },
      h('div', { class: 'fg' }, h('label', { for: qId }, 'ค้นหา'), fSearch),
      h('div', { class: 'fg' }, h('label', { for: tblId }, 'ตาราง'), fTable),
      h('div', { class: 'fg' }, h('label', { for: grpSelId }, 'กลุ่มย่อย'), fGroup),
      h('div', { class: 'fg' }, h('label', { for: stId }, 'สถานะการตั้งค่า'), fStatus)))

  drawTable()
  main.append(top, filterBar, bulkBar.el, tableSlot)
}

// ---------- diff / publish ----------
function diffTable(rows: ReturnType<typeof diffPatches>, fromLabel: string, toLabel: string, onUndo?: (t: TableId, path: string) => void): HTMLElement {
  if (!rows.length) return h('p', { class: 'muted' }, 'ไม่มีความต่าง')
  const labels = ['ช่องและผลที่เปลี่ยน', 'ตาราง', 'default', fromLabel, toLabel, ...(onUndo ? ['ย้อน'] : [])]
  const tb = h('tbody', {}, ...rows.map((d) => {
    const monKind = d.table === 'monsters' ? (d.path.slice(0, d.path.indexOf('.')) as MonsterKind) : undefined
    const native = monKind && MONSTERS[monKind] ? statNative(monKind) : false
    const ex = explainField(d.table, d.path, { native })
    const monPrefix = monKind && MONSTERS[monKind] ? `${MONSTERS[monKind].name} · ` : ''
    return h('tr', {},
      h('th', { scope: 'row' },
        h('div', {}, `${monPrefix}${ex.label}`),
        h('div', { class: 'f-effect' }, ex.effect),
        h('code', {}, d.table === 'monsters' ? d.path : fieldLabel(d.table, d.path))),
      h('td', {}, TABLE_EXPLAIN[d.table].short, ' ', h('code', {}, d.table)),
      h('td', { class: 'num muted' }, fmt(d.def)),
      h('td', { class: 'num' }, fmt(d.from)),
      h('td', { class: 'num new' }, fmt(d.to)),
      onUndo ? h('td', {}, h('button', { type: 'button', class: 'icon', 'aria-label': `ยกเลิกการแก้ ${ex.label}`, title: 'ยกเลิกการแก้ช่องนี้', onclick: () => onUndo(d.table, d.path) }, '↺')) : null)
  }))
  const tbl = h('table', {}, h('thead', {}, h('tr', {}, ...labels.map((x) => h('th', { scope: 'col' }, x)))), tb)
  return wrapTable(`ตารางเปรียบเทียบ ${fromLabel} กับ ${toLabel}`, labels, tbl)
}

function renderDiff(main: HTMLElement) {
  const rows = pending()
  const check = checkPatch(S.draft, guardsFor(S.draft))
  const problems = [...check.errors.map((e) => `❌ ${e.table}.${e.path}: ${e.msg}`), ...check.skipped.map((s) => `⚠️ ${s.table}.${s.path}: ${s.reason}${s.detail ? ` (${s.detail})` : ''}`)]
  main.append(
    h('h2', {}, `📝 สรุปการแก้เทียบกับ live · ${rows.length} ช่อง`),
    h('p', { class: 'muted' }, `patch ทั้งหมด ${patchSize(S.draft)} ช่อง (ค่าที่ต่างจาก default) · ตรวจแล้ว: ${check.ok && !check.skipped.length ? '✅ ผ่าน' : 'มีปัญหา'}`),
    ...(problems.length ? [h('ul', { class: 'problems' }, ...problems.slice(0, 50).map((p) => h('li', {}, p)))] : []),
    diffTable(rows, 'live', 'draft', (t, path) => { setIn(S.draft, t, path, valueIn(livePatch(), t, path) ?? null); updateStatus(); renderTab() }),
    h('div', { class: 'row' },
      h('button', { type: 'button', disabled: S.offline, onclick: () => { void saveDraft() } }, '💾 บันทึก draft'),
      h('button', { type: 'button', class: 'primary', disabled: S.offline, onclick: () => openPublish() }, '🚀 Publish'),
      h('button', { type: 'button', class: 'danger', disabled: S.offline, onclick: () => { void discardDraft() } }, '🗑 ทิ้ง draft (กลับไปเท่า live)')))
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
  const titleId = nextId('dlgtitle'), noteId = nextId('dlgnote')
  const note = h('textarea', { id: noteId, rows: '3', maxlength: '500', placeholder: 'บันทึกสั้น ๆ เช่น "เนิร์ฟไฮดรา HP -10%"' })
  const go = h('button', { type: 'button', class: 'primary' }, `ยืนยัน Publish (${n} ช่อง)`)
  const dlg = h('dialog', { 'aria-labelledby': titleId },
    h('h2', { id: titleId }, '🚀 Publish draft เป็น live?'),
    h('p', {}, `ผู้เล่นทุกคนจะได้ค่าใหม่ ${n} ช่องตอนเปิดเกมครั้งถัดไป (cache ~1 นาที)`),
    h('label', { for: noteId, class: 'small muted' }, 'บันทึกการเปลี่ยนแปลง (ไม่บังคับ)'),
    note,
    h('div', { class: 'row' }, h('button', { type: 'button', onclick: () => dlg.close() }, 'ยกเลิก'), go))
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
  const w = window.open('about:blank', '_blank')
  if (!local && (dirty() || !S.draftRow) && !(await saveDraft())) { w?.close(); return }
  const url = new URL(`./?cfg=${local ? 'local' : 'draft'}`, location.href).href
  if (w) w.location.href = url; else location.href = url
}

// ---------- history ----------
async function renderHistory(main: HTMLElement) {
  if (S.offline) { main.append(h('p', { class: 'muted' }, 'offline: ไม่มีประวัติ (โหมดนี้แก้/ทดสอบ Table & Bulk ได้เต็มรูปแบบบนเบราว์เซอร์)')); return }
  main.append(h('p', { class: 'muted' }, 'กำลังโหลด…'))
  const r = await call('/admin/releases?limit=50')
  if (S.tab !== 'history') return
  main.replaceChildren()
  if (r.status !== 200) { main.append(h('p', { class: 'bad' }, errText(r))); return }
  const list = (Array.isArray(r.body.releases) ? r.body.releases : []).map(parseRow).filter((x): x is SRow => x !== null)
  main.append(h('h2', {}, 'ประวัติ release'),
    S.live ? h('button', { type: 'button', class: 'danger', onclick: () => { void unpublish() } }, '⏻ ปิด live config (ผู้เล่นใช้ค่า default)') : h('p', { class: 'muted' }, 'ตอนนี้ไม่มี live release'))
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
            h('button', { type: 'button', onclick: () => { S.draft = clonePatch(p); updateStatus(); toast(`โหลด #${rel.id} เข้า draft แล้ว (ยังไม่บันทึก)`) } }, '📥 โหลดเข้า draft'),
            rel.status === 'archived' ? h('button', { type: 'button', class: 'danger', onclick: () => { void rollback(rel.id) } }, '⏪ Rollback เป็น release นี้') : null))
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
