// admin.html: live-ops balance editor. Edits a Patch (tunables.ts whitelist), saves it as the server draft, publishes it.
// The server re-validates everything (server/src/config.ts); the checks here are only for fast feedback.
import { MONSTERS, type MonsterKind } from '../data/game-data'
import { canonicalJson, checkPatch, guardsFor, type FieldRow } from '../data/patch'
import { TABLE_IDS, TABLES, type Patch, type TableId } from '../data/tunables'
import { LOCAL_KEY } from '../live-keys'
import { API, authClient, call, errText, parseRow, type SRow } from './api'
import { clampField, clonePatch, diffPatches, fieldLabel, fieldRow, fields, monsterGroups, patchSize, setIn, TIER_LABEL, valueIn, type Tier } from './model'

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
type Tab = 'mon' | 'tables' | 'diff' | 'history'
const S = {
  offline: !API, me: '', live: null as SRow | null, draftRow: null as SRow | null,
  draft: {} as Patch, saved: '{}', tab: 'mon' as Tab, search: '', table: 'monStat' as TableId, busy: false,
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
  const tabs: [Tab, string][] = [['mon', '👾 มอนสเตอร์'], ['tables', '📊 ตารางอื่น'], ['diff', '📝 สรุป / เผยแพร่'], ['history', '🕘 ประวัติ']]
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
  else if (S.tab === 'tables') renderTables(main)
  else if (S.tab === 'diff') renderDiff(main)
  else void renderHistory(main)
}

// ---------- one editable field ----------
function fieldCell(t: TableId, row: FieldRow, label: string, onChange: () => void): HTMLElement {
  const { path, def } = row
  const input = h('input', { type: 'number', inputmode: 'decimal', step: def.kind === 'int' ? '1' : 'any', min: String(def.min), max: String(def.max) })
  const meta = h('div', { class: 'meta' })
  const cell = h('div', { class: 'f' })
  const refresh = () => {
    const d = valueIn(S.draft, t, path), live = liveOf(t, path)
    input.value = d === undefined ? (row.value === undefined ? '' : String(row.value)) : String(d)
    input.placeholder = row.value === undefined ? 'ไม่มี' : ''
    meta.textContent = `def ${fmt(row.value)} · live ${fmt(live)} · [${def.min}, ${def.max}]${def.kind === 'int' ? ' int' : ''}`
    cell.classList.toggle('chg', draftOf(t, path) !== live)
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
  cell.append(h('label', { title: `${t}.${path}` }, label), h('div', { class: 'in' }, input, toLive, toDef), meta)
  refresh()
  return cell
}

/** Fields in a grid; absent optional leaves tucked under "ช่องเสริม" unless the draft / live sets them. */
function fieldGrid(t: TableId, rows: FieldRow[], labelOf: (p: string) => string, onChange: () => void): HTMLElement {
  const used = (r: FieldRow) => r.value !== undefined || valueIn(S.draft, t, r.path) !== undefined || valueIn(livePatch(), t, r.path) !== undefined
  const main = rows.filter(used), extra = rows.filter((r) => !used(r))
  const box = h('div', {}, h('div', { class: 'grid' }, ...main.map((r) => fieldCell(t, r, labelOf(r.path), onChange))))
  if (extra.length) {
    const d = h('details', { class: 'extra' }, h('summary', {}, `ช่องเสริม (ยังไม่มีค่า) · ${extra.length}`))
    d.addEventListener('toggle', () => { if (d.open && d.children.length === 1) d.append(h('div', { class: 'grid' }, ...extra.map((r) => fieldCell(t, r, labelOf(r.path), onChange)))) }, { once: false })
    box.append(d)
  }
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
      h('span', { class: 'muted' }, m.statAlloc ? ' · stat monster' : ` · HP ${fmt(liveOf('monsters', `${k}.hp`))}`), ' ', badge))
  d.addEventListener('toggle', () => {
    if (!d.open || d.children.length > 1) return
    if (m.statAlloc) d.append(h('p', { class: 'hint' }, 'Stat monster (D6+): HP / ATK / DEF มาจาก statAlloc × เลเวลห้อง — ปรับ bodyMul / statAlloc ที่นี่ หรือ MON_STAT ในแท็บตารางอื่น (hp/dmg = 1 เป็นค่าวาง)'))
    d.append(fieldGrid('monsters', rowsOfMonster(k), (p) => fieldLabel('monsters', p, true), setBadge))
  })
  return d
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

// ---------- other tables (generic from TABLES) ----------
function renderTables(main: HTMLElement) {
  const ids = TABLE_IDS.filter((t) => t !== 'monsters')
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
