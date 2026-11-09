// Pure visual lookup for the hero across UI scenes and the BattleScene Container rig.
// No Phaser imports so unit tests can verify class/gear/tint mappings directly in Node.
import { JOBS, type JobId } from '../data/jobs'
import type { Job2Id } from '../data/jobs2'
import { activeJob3, type Job3Id } from '../data/jobs3'
import { COSTUMES, itemById, type EquipSlot } from '../data/meta'

export interface HeroVisualInput {
  job: JobId
  job2?: Job2Id
  job3?: Job3Id
  equipped?: Partial<Record<EquipSlot, string>>
  costume?: string
}

export interface HeroRigSpec {
  /** Single composite texture key for UI portraits, queue icons, and simple classes. */
  compositeTex: string
  /** Tintable hero body texture (costumes tint this layer only when split into parts). */
  bodyTex: string
  mountTex?: string
  weaponTex?: string
  shieldTex?: string
  auraTex?: string
  mountOffset: { x: number; y: number }
  bodyOffset: { x: number; y: number }
  weaponOffset: { x: number; y: number }
  shieldOffset: { x: number; y: number }
  /** Resting angle (degrees) applied to the weapon layer before swing/thrust tweens. */
  weaponRestAngle: number
  isMounted: boolean
  isTwoHand: boolean
  isKnightLine: boolean
  afterimageTint: number
  /** Combo slash progression: hit 1 -> hit 2 -> hit 3+. */
  slashPalette: [number, number, number]
  auraTint?: number
}

export const HERO_VISUAL_KEYS = [
  'novice',
  'hero_swordsman',
  'hero_knight',
  'body_swordsman',
  'body_knight',
  'mount_peco',
  'wpn_sword',
  'wpn_lance',
  'wpn_halberd',
  'shd_buckler',
  'shd_kite',
  'aura_gold',
] as const

export function heroCostumeTint(costumeId?: string): number {
  return (COSTUMES.find((c) => c.id === costumeId) ?? COSTUMES[0]).tint
}

/** Single composite texture key for the hero's current progression tier (safe for Image portraits & menus). */
export function heroTex(s: HeroVisualInput): string {
  const job = s.job ?? 'novice'
  // P0: Knight (and Lord Knight riding on Knight until P1 adds hero_lordknight) renders mounted on Peco-Peco.
  if (job === 'swordsman' && s.job2 === 'knight') return 'hero_knight'
  return JOBS[job].tex
}

/** Layer breakdown for BattleScene's HeroRig so costumes tint only the warrior, leaving Peco / weapons / auras crisp. */
export function heroRigSpec(s: HeroVisualInput): HeroRigSpec {
  const job = s.job ?? 'novice'
  const job3 = activeJob3(s)
  const wpnId = s.equipped?.weapon ?? ''
  const wpn = wpnId ? itemById(wpnId) : undefined
  const isTwoHand = !!wpn?.twoHand
  const hasShield = !isTwoHand && !!s.equipped?.offhand && s.equipped.offhand !== 'none_off'

  if (job === 'swordsman' && s.job2 === 'knight') {
    const useHalberd = isTwoHand && wpn?.wtype === 'spear'
    return {
      compositeTex: 'hero_knight',
      bodyTex: 'body_knight',
      mountTex: 'mount_peco',
      weaponTex: useHalberd ? 'wpn_halberd' : 'wpn_lance',
      shieldTex: hasShield ? 'shd_kite' : undefined,
      auraTex: job3 === 'lordknight' ? 'aura_gold' : undefined,
      auraTint: job3 === 'lordknight' ? 0xffe08a : undefined,
      mountOffset: { x: 0, y: 0 },
      bodyOffset: { x: -4, y: -17 },
      weaponOffset: { x: 4, y: -31 },
      shieldOffset: { x: 2, y: -27 },
      weaponRestAngle: -6,
      isMounted: true,
      isTwoHand,
      isKnightLine: true,
      afterimageTint: 0xf2d24b,
      slashPalette: [0xfff0b8, 0x7fd7ff, 0xf2d24b],
    }
  }

  if (job === 'swordsman') {
    return {
      compositeTex: 'hero_swordsman',
      bodyTex: 'body_swordsman',
      weaponTex: 'wpn_sword',
      shieldTex: hasShield ? 'shd_buckler' : undefined,
      mountOffset: { x: 0, y: 0 },
      bodyOffset: { x: 0, y: 0 },
      weaponOffset: { x: 10, y: -21 },
      shieldOffset: { x: 3, y: -17 },
      weaponRestAngle: 4,
      isMounted: false,
      isTwoHand,
      isKnightLine: false,
      afterimageTint: 0xffd27a,
      slashPalette: [0xffffff, 0x9fe3ff, 0xffd34d],
    }
  }

  const tex = JOBS[job].tex
  return {
    compositeTex: tex,
    bodyTex: tex,
    mountOffset: { x: 0, y: 0 },
    bodyOffset: { x: 0, y: 0 },
    weaponOffset: { x: 0, y: 0 },
    shieldOffset: { x: 0, y: 0 },
    weaponRestAngle: 0,
    isMounted: false,
    isTwoHand,
    isKnightLine: false,
    afterimageTint: 0xffd27a,
    slashPalette: [0xffffff, 0xffe08a, 0xffd34d],
  }
}

/** Fit scale for UI portraits / job cards where Knight's Peco silhouette (68x64) is wider than base classes (48x52). */
export function fitHeroScale(w: number, h: number, baseScale: number, maxBoxPx: number): number {
  const cur = Math.max(w, h)
  return cur > 0 ? Math.min(baseScale, maxBoxPx / cur) : baseScale
}

