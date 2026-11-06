// v86 MOBA-style skill buttons: the pure rules behind the bottom-right cluster (docs/design/skill-buttons-v86.md).
// No Phaser in here, so tests/skill-hud.test.ts can run it directly. BattleScene only draws what these return.

export type SkillSlot = 's1' | 's2' | 's3' | 'ult'

export interface SkillBtnIn {
  cdLeft: number // hero turns until ready (0 = no cooldown running)
  cdMax: number // full cooldown, 0 when the skill has none (Skill 1)
  cost: number // resource cost, 0 = free
  res: number // current Mana / Rage / Energy
  booked: boolean // the player tapped it in manual mode (ult: smashQueued)
  manual: boolean // 🖐️ กดเอง mode
  blocked?: boolean // silenced / missing charges: cannot cast right now whatever the cost
}

export interface SkillBtnOut {
  ready: boolean // can fire the next hero turn (cooldown done, paid for, not blocked)
  greyed: boolean // dim the button
  short: boolean // resource too low: the cost number turns red
  sweep: number // 0..1 share of the dark radial overlay still covering the button
  turns: number // big centre number (cooldown turns left), 0 = none
  booked: boolean // gold ring + "จอง" tag
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

export function skillButtonState(i: SkillBtnIn): SkillBtnOut {
  const cooling = i.cdLeft > 0
  const short = i.cost > 0 && i.res < i.cost
  const greyed = cooling || short || !!i.blocked
  const sweep = cooling ? (i.cdMax > 0 ? clamp01(i.cdLeft / i.cdMax) : 1) : 0
  return { ready: !greyed, greyed, short, sweep, turns: cooling ? Math.ceil(i.cdLeft) : 0, booked: i.booked }
}

/** Auto mode: skills fire by themselves. Manual mode: only a booked skill fires. */
export function mayCast(manual: boolean, booked: boolean): boolean { return !manual || booked }

/** What a tap does: auto mode only shows a hint, manual mode toggles the booking. */
export function tapAction(manual: boolean): 'hint' | 'book' { return manual ? 'book' : 'hint' }

export function resourceIcon(resource: 'mana' | 'rage' | 'energy' | null): string {
  return resource === 'mana' ? '💧' : resource === 'rage' ? '🔥' : resource === 'energy' ? '⚡' : ''
}

/** Desktop hotkeys: Digit1-3 / Numpad1-3 book Skill 1-3, Digit4 / Numpad4 book the ult. null = not ours. */
export function hotkeySlot(code: string): SkillSlot | null {
  const m = /^(?:Digit|Numpad)([1-4])$/.exec(code)
  if (!m) return null
  return (['s1', 's2', 's3', 'ult'] as const)[Number(m[1]) - 1] ?? null
}

/** Pie-slice end angles (radians) for the dark cooldown sweep, clockwise from 12 o'clock. */
export function sweepAngles(sweep: number): { from: number; to: number } {
  const from = -Math.PI / 2
  return { from, to: from + Math.PI * 2 * clamp01(sweep) }
}

/** Cluster geometry: ult circle bottom-right, Skill 1-3 on an arc around it (180 / 225 / 270 degrees). */
export const SKILL_HUD = {
  ultR: 48, smallR: 28, arcR: 88, margin: 64,
  angles: { s1: 180, s2: 225, s3: 270 },
} as const

export function slotCenter(slot: SkillSlot, w: number, h: number): { x: number; y: number; r: number } {
  const cx = w - SKILL_HUD.margin, cy = h - SKILL_HUD.margin
  if (slot === 'ult') return { x: cx, y: cy, r: SKILL_HUD.ultR }
  const a = (SKILL_HUD.angles[slot] * Math.PI) / 180
  return { x: Math.round(cx + Math.cos(a) * SKILL_HUD.arcR), y: Math.round(cy + Math.sin(a) * SKILL_HUD.arcR), r: SKILL_HUD.smallR }
}
