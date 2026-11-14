import test from 'node:test'
import assert from 'node:assert/strict'
import { bbox, inside, insideBox, type Pt } from '../src/gfx/fx/beast/_poly'

// Small seeded RNG so the test is deterministic.
function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
}

test('insideBox matches inside for random polygons and points (bbox reject is exact)', () => {
  const r = rng(7)
  for (let p = 0; p < 200; p++) {
    const n = 3 + Math.floor(r() * 10)
    const cx = (r() - 0.5) * 60, cy = (r() - 0.5) * 60
    const pts: Pt[] = Array.from({ length: n }, (_, i): Pt => {
      const a = (i / n) * Math.PI * 2 + r() * 0.5, d = 2 + r() * 20
      return [cx + Math.cos(a) * d, cy + Math.sin(a) * d]
    })
    const b = bbox(pts)
    for (let k = 0; k < 400; k++) {
      const x = cx + (r() - 0.5) * 60, y = cy + (r() - 0.5) * 60
      assert.equal(insideBox(pts, b, x, y), inside(pts, x, y))
    }
  }
})

test('bbox covers every vertex', () => {
  const pts: Pt[] = [[-3, 4], [5, -2], [1, 9]]
  assert.deepEqual(bbox(pts), [-3, -2, 5, 9])
})
