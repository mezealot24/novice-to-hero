// Renders one pixelfx effect module to a PNG contact sheet (dark background), so an effect can be looked at
// without opening the game.
// usage: node tools/pfx-sheet.mjs <effect module .ts/.js> [out.png] [frames=12] [zoom=2] [opts JSON]
//   node tools/pfx-sheet.mjs src/gfx/zap-strike.ts .tests-out/zap.png 8 2 '{"seed":3}'
// Frames are spread evenly over meta.duration. A red cross marks meta.origin in every cell.
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { deflateSync } from 'node:zlib'

const [src, outArg, framesArg, zoomArg, optsArg] = process.argv.slice(2)
if (!src) { console.error('usage: node tools/pfx-sheet.mjs <effect module> [out.png] [frames] [zoom] [opts JSON]'); process.exit(1) }
const out = resolve(outArg ?? '.tests-out/pfx-sheet.png'), N = Math.max(1, +(framesArg ?? 12)), Z = Math.max(1, +(zoomArg ?? 2))
const opts = optsArg ? JSON.parse(optsArg) : {}

mkdirSync('.tests-out', { recursive: true })
const entry = resolve('.tests-out/pfx-sheet-entry.mjs')
writeFileSync(entry, `export * as mod from ${JSON.stringify(resolve(src))}\nexport { createFrame, clearFrame, createFx, composite } from ${JSON.stringify(resolve('src/vendor/pixelfx/core/index.js'))}\n`)
const bundle = resolve('.tests-out/pfx-sheet-bundle.mjs')
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: bundle, logLevel: 'warning' })
const { mod, createFrame, clearFrame, createFx, composite } = await import(pathToFileURL(bundle).href + `?t=${Date.now()}`)

const { size: [w, h], origin: [ox, oy], duration } = mod.meta
const cols = Math.min(N, Math.max(1, Math.floor(1800 / (w * Z + 2)))), rows = Math.ceil(N / cols)
const CW = w * Z + 2, CH = h * Z + 2, SW = cols * CW, SH = rows * CH
const sheet = Buffer.alloc(SW * SH * 4)
for (let i = 0; i < SW * SH; i++) { sheet[i * 4] = 60; sheet[i * 4 + 1] = 60; sheet[i * 4 + 2] = 80; sheet[i * 4 + 3] = 255 } // cell borders
const BG = 0xff2b1714 // ABGR: the night battle backdrop, roughly
const frame = createFrame(w, h), rgba = new Uint8ClampedArray(w * h * 4)
const fx = createFx(mod, { x: ox, y: oy, ...opts })
const step = N > 1 ? duration / N : 0
let lit = 0
for (let i = 0; i < N; i++) {
  if (i > 0) for (let s = 0; s < 4; s++) fx.update(step / 4)
  clearFrame(frame); fx.draw(frame); composite(frame, rgba, BG)
  for (let j = 0; j < w * h; j++) if (frame.color[j] >>> 24 || frame.light[j] & 0xffffff) lit++
  const cx = (i % cols) * CW + 1, cy = Math.floor(i / cols) * CH + 1
  for (let y = 0; y < h * Z; y++) for (let x = 0; x < w * Z; x++) {
    const sx = Math.floor(x / Z), sy = Math.floor(y / Z), a = (sy * w + sx) * 4, b = ((cy + y) * SW + cx + x) * 4
    const cross = (sx === ox && Math.abs(sy - oy) <= 2) || (sy === oy && Math.abs(sx - ox) <= 2)
    sheet[b] = cross ? 255 : rgba[a]; sheet[b + 1] = cross ? 40 : rgba[a + 1]; sheet[b + 2] = cross ? 40 : rgba[a + 2]; sheet[b + 3] = 255
  }
}

// a tiny PNG writer (RGBA, no filter)
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([len, td, cr]) }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(SW, 0); ihdr.writeUInt32BE(SH, 4); ihdr[8] = 8; ihdr[9] = 6
const raw = Buffer.alloc((SW * 4 + 1) * SH)
for (let y = 0; y < SH; y++) sheet.copy(raw, y * (SW * 4 + 1) + 1, y * SW * 4, (y + 1) * SW * 4)
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]))
console.log(`${mod.meta.name ?? src}: ${N} frames of ${w}x${h} over ${duration}s -> ${out} (${SW}x${SH}), ${lit} lit px in all`)
