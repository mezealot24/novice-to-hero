// Dynamic pixel-art Chain Lightning module for pixelfx (adapted from Sprite Fusion's open-source lightning,
// MIT License, Copyright (c) 2026 Hugo Duprez).
// Unlike the stock fixed-position chain-lightning.js, this module accepts dynamic target nodes so bolts erupt
// directly from the struck monster and chain across any battle formation, with optional Overload Tempest return.
import {
  Lights,
  P,
  Particles,
  Rng,
  TAU,
  WHITE,
  clamp,
  ease,
  fit,
  hex,
  lerp,
  mix,
  rng,
  smooth,
  sparkle,
} from '../vendor/pixelfx/core/index.js'
import { PLASMA, VOLT, bowed, crackle, scorch, stroke, trace, zigzag } from '../vendor/pixelfx/fx/lightning/_lib.js'

export interface ChainNode {
  x: number
  y: number
  groundY?: number
}

export interface ChainArcOpts {
  palette?: string[]
  sparks?: string[]
  overloadPalette?: string[]
  seed?: number
  /** Target nodes in chain order (node 0 = primary struck monster). */
  nodes?: ChainNode[]
  /** Optional dead origin when the struck monster died before the chain jumped to nodes[0]. */
  originNode?: ChainNode
  /** When true, fires an Overload Tempest return arc from the final target back to nodes[0]. */
  overloadBack?: boolean
}

interface BoltPath {
  w: number
  pts: number[][]
}

interface BoltShape {
  paths: BoltPath[]
}

interface PainterLike {
  px(x: number, y: number, c: number): void
  dot(x: number, y: number, c: number, a?: number): void
  line(x0: number, y0: number, x1: number, y1: number, c: number | ((u: number) => number), a?: number | ((u: number) => number)): void
  circle(x: number, y: number, r: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, a?: number): void
}

export const OVERLOAD_GOLD = ['#381c04', '#703d0c', '#b87216', '#e8a628', '#ffd447', '#ffeb85', '#fff8c4', '#ffffff']

export const meta = {
  name: 'Chain lightning',
  desc: 'An electric bolt erupts from the struck target and chains across monsters in turn; each flashes, sparks, and grounds itself while arcs flicker between them, with optional Overload Tempest echo.',
  tags: ['lightning', 'electric', 'chain', 'spell', 'combat', 'one-shot'],
  size: [200, 96] as number[],
  origin: [40, 74] as number[],
  duration: 0.85,
  loop: false,
  fps: 30,
  bg: 'dark',
  options: { palette: VOLT, sparks: PLASMA, seed: 3 },
}

const DEFAULT_NODES: ChainNode[] = [
  { x: 0, y: -22, groundY: 0 },
  { x: 54, y: -28, groundY: 0 },
  { x: 108, y: -19, groundY: 0 },
]

const LEAP = 0.045
const GAP = 0.055
const HOLD = 0.32
const BREAK = 0.11
const TRACE_FADE = 0.16
const ASH = hex('#5b5566')

function floorAt(nodes: ChainNode[], x: number): number {
  let best = nodes[0]?.groundY ?? 0
  let bestDist = Infinity
  for (const n of nodes) {
    const d = Math.abs(x - n.x)
    if (d < bestDist) {
      bestDist = d
      best = n.groundY ?? 0
    }
  }
  return best
}

function linkStrength(t: number, onT: number, offT: number): number {
  const a = t - onT
  if (a < 0) return 0
  const hum = a < 0.09 ? ([1, 0.55, 1][Math.floor(a * 33)] ?? 1) : 0.78 + 0.22 * Math.sin(t * 61 + onT * 10) * Math.sin(t * 23)
  const b = t - offT
  if (b < 0) return hum
  if (b < BREAK) return hum * (1 - b / BREAK) * (Math.floor(b * 60) % 3 === 1 ? 0.5 : 1)
  return 0
}

export function create(o: ChainArcOpts = {}) {
  const C = fit(o.palette && o.palette.length > 0 ? o.palette : VOLT, 8) as number[]
  const COv = fit(o.overloadPalette && o.overloadPalette.length > 0 ? o.overloadPalette : OVERLOAD_GOLD, 8) as number[]
  const sparkRamp = o.sparks && o.sparks.length > 0 ? o.sparks : PLASMA
  const seed = o.seed ?? 3
  const R = new Rng(seed)

  const targetNodes = (o.nodes && o.nodes.length > 0 ? o.nodes : DEFAULT_NODES).map((n) => ({
    x: n.x,
    y: n.y,
    groundY: n.groundY ?? 0,
  }))
  const originNode = o.originNode
    ? { x: o.originNode.x, y: o.originNode.y, groundY: o.originNode.groundY ?? targetNodes[0].groundY }
    : undefined

  // Node sequence for visual links:
  // - If originNode is present (hit target died before chain rolled), link 0 leaps from originNode -> targetNodes[0].
  // - Otherwise targetNodes[0] is the struck target itself: it ignites immediately at t = 0 and links leap outward.
  const pts: Array<{ x: number; y: number; groundY: number }> = originNode ? [originNode, ...targetNodes] : targetNodes
  const linksCount = Math.max(0, pts.length - 1)
  const firstOffset = originNode ? 0 : 0.015
  const linkStart = (i: number) => firstOffset + i * GAP
  const linkOn = (i: number) => linkStart(i) + LEAP
  const linkOff = (i: number) => HOLD + i * 0.035

  const nodeOn = (idx: number) => (idx === 0 ? 0 : linkOn(idx - 1))
  const nodeOff = (idx: number) => {
    if (linksCount === 0) return HOLD
    if (idx === 0) return linkOff(0)
    return linkOff(Math.min(linksCount - 1, idx - 1))
  }

  // Grounding targets under each node
  const allForFloor = pts
  const groundX = pts.map((n) => n.x + R.range(-5, 5))
  const singleGroundingOffsets = [-16, 4, 18]

  // Overload Tempest return link (from final target back to targetNodes[0])
  const hasOverload = !!o.overloadBack
  const firstSurvIdx = originNode ? 1 : 0
  const lastIdx = pts.length - 1
  const ovStart = (linksCount > 0 ? linkOn(linksCount - 1) : 0.04) + 0.05
  const ovOn = ovStart + LEAP
  const ovOff = HOLD + Math.max(1, linksCount) * 0.035

  const ps = new Particles({ rng: R, ground: (x: number) => floorAt(allForFloor, x), sparks: sparkRamp })
  const hot = new Particles({ rng: R, ground: (x: number) => floorAt(allForFloor, x) })
  const lights = new Lights()

  const nodeHit = pts.map(() => false)
  const nodePopped = pts.map(() => false)
  let ovHit = false
  let t = 0

  const linkShape = (ax: number, ay: number, bx: number, by: number, i: number, f: number, bowMul = 1, salt = 0): BoltShape => {
    const r = rng(seed, 31 + salt, i, f)
    const L = Math.hypot(bx - ax, by - ay)
    // Bow upward regardless of left-to-right or right-to-left direction
    const upwardSign = bx >= ax ? -1 : 1
    return bowed(r, ax, ay, bx, by, upwardSign * L * r.range(0.06, 0.16) * bowMul, 0.2, 0.09) as unknown as BoltShape
  }

  const spawnBurst = (x: number, y: number, dir: number, count: number) => {
    lights.add(x, y, 52, C[4], 0.85, 0.2)
    lights.add(x, y, 16, WHITE, 0.7, 0.08)
    for (let j = 0; j < count; j++) {
      const a = R.chance(0.55) ? dir + R.range(-1.1, 1.1) : R.range(0, TAU)
      const sp = R.range(65, 210)
      ps.spawn(P.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 35, R.range(0.14, 0.36))
    }
    for (let j = 0; j < 4; j++) {
      hot.spawn(P.SPARK, x + R.range(-2, 2), y + 2, R.range(-45, 45), R.range(-55, 20), R.range(0.24, 0.42))
    }
    ps.spawn(P.STAR, x + R.range(-4, 4), y - R.range(3, 7), 0, -6, R.range(0.2, 0.32), C[6], R.range(1.5, 2.4))
    for (let j = 0; j < 2; j++) {
      ps.spawn(P.SMOKE, x + R.range(-4, 4), y + R.range(-2, 3), R.range(-6, 6), -R.range(8, 16), R.range(0.32, 0.48), mix(ASH, C[2], 0.35), R.range(2, 3.2), R.range(0.03, 0.1))
    }
  }

  return {
    update(dt: number) {
      t += dt
      for (let i = 0; i < pts.length; i++) {
        const n = pts[i]
        const onT = nodeOn(i)
        const offT = nodeOff(i)
        if (!nodeHit[i] && t >= onT) {
          nodeHit[i] = true
          const prev = i > 0 ? pts[i - 1] : n
          const dir = i > 0 ? Math.atan2(n.y - prev.y, n.x - prev.x) : 0
          spawnBurst(n.x, n.y, dir, i === 0 ? 18 : 15)
        }
        if (nodeHit[i] && t < offT) {
          if (i > 0 && R.chance(10 * dt)) {
            const u = R.next()
            const prev = pts[i - 1]
            ps.spawn(P.SPARK, lerp(prev.x, n.x, u), lerp(prev.y, n.y, u) - 2, R.range(-55, 55), R.range(-85, 20), R.range(0.1, 0.22))
          }
          if (R.chance(7 * dt)) {
            ps.spawn(P.SPARK, groundX[i], n.groundY - 1, R.range(-65, 65), -R.range(40, 130), R.range(0.12, 0.24))
          }
          if (R.chance(2.5 * dt)) {
            hot.spawn(P.SPARK, n.x + R.range(-3, 3), n.y + 3, R.range(-30, 30), R.range(-30, 10), R.range(0.24, 0.38))
          }
        }
        if (!nodePopped[i] && t >= offT + BREAK) {
          nodePopped[i] = true
          for (let j = 0; j < 6; j++) {
            const a = R.range(0, TAU)
            const sp = R.range(35, 125)
            ps.spawn(P.SPARK, n.x, n.y, Math.cos(a) * sp, Math.sin(a) * sp - 25, R.range(0.1, 0.2))
          }
          ps.spawn(P.SMOKE, n.x, n.y, R.range(-4, 4), -R.range(10, 16), R.range(0.16, 0.24), mix(ASH, C[2], 0.35), R.range(2.2, 3.2))
          lights.add(n.x, n.y, 28, C[4], 0.5, 0.12)
        }
      }

      if (hasOverload && !ovHit && t >= ovOn) {
        ovHit = true
        const dst = pts[firstSurvIdx]
        lights.add(dst.x, dst.y, 64, COv[4], 0.9, 0.22)
        lights.add(dst.x, dst.y, 20, WHITE, 0.85, 0.1)
        for (let j = 0; j < 14; j++) {
          const a = R.range(0, TAU)
          const sp = R.range(60, 190)
          ps.spawn(P.SPARK, dst.x, dst.y, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.14, 0.26), COv[5])
        }
      }

      ps.update(dt)
      hot.update(dt)
      lights.update(dt)
    },

    drawBack(p: PainterLike) {
      for (let i = 0; i < pts.length; i++) {
        const a = t - nodeOn(i)
        if (a < 0) continue
        const offT = nodeOff(i)
        const T0 = Math.min(1, a / 0.14) * Math.pow(clamp(1 - (t - offT) / 0.4), 1.3) * 0.9
        scorch(p, groundX[i], pts[i].groundY, 7, T0, 1 - smooth(0.48, 0.72, t))
      }
      ps.draw(p, 'back')
      hot.draw(p, 'back')
    },

    draw(p: PainterLike) {
      const f = Math.floor(t * 30 + 1e-4)
      const f2 = f >> 1

      // Draw chain links between consecutive targets
      for (let i = 0; i < linksCount; i++) {
        const aNode = pts[i]
        const bNode = pts[i + 1]
        const t0 = linkStart(i)
        const onT = linkOn(i)
        const offT = linkOff(i)

        if (t >= t0 && t < onT) {
          const u = ease.outQuad((t - t0) / LEAP)
          const b = linkShape(aNode.x, aNode.y, bNode.x, bNode.y, i, -1)
          const trunk: BoltShape = { paths: [b.paths[0]] }
          stroke(p, trunk, 1, C, 0.78, { upTo: u })
          const tp = b.paths[0].pts
          const [hx, hy] = tp[Math.min(tp.length - 1, Math.floor(u * (tp.length - 1)))]
          p.circle(hx, hy, 2, WHITE)
          p.glow(hx, hy, 16, C[5], 0.7)
        }

        const k = linkStrength(t, onT, offT)
        if (k > 0) {
          stroke(p, linkShape(aNode.x, aNode.y, bNode.x, bNode.y, i, f2), k, C, 0.78)
        } else if (t >= offT + BREAK && t < offT + BREAK + TRACE_FADE) {
          const g = 1 - (t - offT - BREAK) / TRACE_FADE
          const b = linkShape(aNode.x, aNode.y, bNode.x, bNode.y, i, Math.floor((offT + BREAK) * 15))
          trace(p, b.paths[0].pts, g > 0.5 ? C[4] : C[2], g * 0.9)
        }
      }

      // Draw Overload Tempest return arc (from final target back to first target)
      if (hasOverload && lastIdx > firstSurvIdx) {
        const src = pts[lastIdx]
        const dst = pts[firstSurvIdx]
        if (t >= ovStart && t < ovOn) {
          const u = ease.outQuad((t - ovStart) / LEAP)
          const b = linkShape(src.x, src.y, dst.x, dst.y, 99, -1, 1.55, 17)
          const trunk: BoltShape = { paths: [b.paths[0]] }
          stroke(p, trunk, 1, COv, 0.85, { upTo: u })
          const tp = b.paths[0].pts
          const [hx, hy] = tp[Math.min(tp.length - 1, Math.floor(u * (tp.length - 1)))]
          p.circle(hx, hy, 2.2, WHITE)
          p.glow(hx, hy, 18, COv[5], 0.75)
        }
        const kov = linkStrength(t, ovOn, ovOff)
        if (kov > 0) {
          stroke(p, linkShape(src.x, src.y, dst.x, dst.y, 99, f2, 1.55, 17), kov, COv, 0.82)
        } else if (t >= ovOff + BREAK && t < ovOff + BREAK + TRACE_FADE) {
          const g = 1 - (t - ovOff - BREAK) / TRACE_FADE
          const b = linkShape(src.x, src.y, dst.x, dst.y, 99, Math.floor((ovOff + BREAK) * 15), 1.55, 17)
          trace(p, b.paths[0].pts, g > 0.5 ? COv[4] : COv[2], g * 0.85)
        }
      }

      // Draw target nodes, crawling arcs, and grounding bolts
      for (let i = 0; i < pts.length; i++) {
        const n = pts[i]
        const onT = nodeOn(i)
        const offT = nodeOff(i)
        const age = t - onT
        if (age >= 0 && age < 0.085) {
          const q = age / 0.085
          p.circle(n.x, n.y, 6 * (1 - q) + 1.5, C[5])
          p.circle(n.x, n.y, 5 * (1 - q), WHITE)
          sparkle(p, n.x, n.y, Math.round(10 * (1 - q)), C[6], C[4], 0.6)
        }

        // Overload return burst flash on firstSurvIdx
        if (hasOverload && i === firstSurvIdx && t >= ovOn && t - ovOn < 0.1) {
          const q = (t - ovOn) / 0.1
          p.circle(n.x, n.y, 7 * (1 - q) + 2, COv[5])
          p.circle(n.x, n.y, 5.5 * (1 - q), WHITE)
          sparkle(p, n.x, n.y, Math.round(12 * (1 - q)), COv[6], COv[4], 0.7)
        }

        const k = i === 0 && linksCount === 0
          ? linkStrength(t, 0, HOLD)
          : i === 0
            ? linkStrength(t, 0, linkOff(0))
            : linkStrength(t, onT, offT)

        if (k > 0.05) {
          const r = (2.6 + Math.sin(t * 47 + i) * 0.7) * k
          p.circle(n.x, n.y, r + 1.5, C[2])
          p.circle(n.x, n.y, r + 0.7, C[5])
          p.circle(n.x, n.y, r * 0.6, WHITE)
          p.glow(n.x, n.y, 26, C[4], 0.6 * k)
          p.glow(n.x, n.y, 8, C[6], 0.5 * k)

          const r2 = rng(seed, 11, i, f)
          const crawlCount = age < 0.12 ? 2 : 1
          for (let j = 0; j < crawlCount; j++) {
            const a0 = r2.range(0, TAU)
            const a1 = a0 + r2.sign() * r2.range(0.5, 1.0)
            const d0 = r2.range(4, 6)
            const d1 = r2.range(5, 8)
            crackle(
              p,
              zigzag(r2, n.x + Math.cos(a0) * d0, n.y + Math.sin(a0) * d0, n.x + Math.cos(a1) * d1, n.y + Math.sin(a1) * d1, 0.35, 0),
              r2.range(0.45, 0.72) * k,
              C,
              0.25,
            )
          }

          // Grounding bolts down to the floor (extra tendrils when only 1 target is present)
          if (linksCount === 0) {
            for (let g = 0; g < singleGroundingOffsets.length; g++) {
              if (r2.next() < 0.55 * k) {
                const gx = n.x + singleGroundingOffsets[g] + r2.range(-3, 3)
                crackle(p, zigzag(r2, n.x + r2.range(-2, 2), n.y + 3, gx, n.groundY - 0.5, 0.32, 0.35), 0.8 * k, C, 0.35)
                p.glow(gx, n.groundY - 1, 12, C[5], 0.5 * k)
                p.px(gx, n.groundY - 1, WHITE)
              }
            }
          } else if (r2.next() < 0.35 * k) {
            const gx = groundX[i] + r2.range(-3, 3)
            crackle(p, zigzag(r2, n.x + r2.range(-2, 2), n.y + 3, gx, n.groundY - 0.5, 0.3, 0.35), 0.75 * k, C, 0.35)
            p.glow(gx, n.groundY - 1, 12, C[5], 0.5 * k)
            p.px(gx, n.groundY - 1, WHITE)
          }
        }
      }

      ps.draw(p, 'front')
      hot.draw(p, 'front')
      lights.draw(p)
    },
  }
}
