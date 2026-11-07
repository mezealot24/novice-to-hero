// Shared types for the forge anvil screen (design/forge-ux-v1.md 6.2). Rules stay in src/data/*; these are only the UI contracts.
import type Phaser from 'phaser'
import type { Item } from '../../data/meta'
import type { ForgeCost } from '../../data/refine'

export type Verb = 'grade' | 'refine' | 'repair' | 'option' | 'taint'
export type Mode = 'anvil' | 'recipe' | 'stash'

/** What the stage plays when a verb resolves. Panels call these; they never touch stage objects directly. */
export interface StageFx {
  /** Refine/grade went up: pop, "+N", then extra floaters (new bonus line, free gems). */
  success(label: string, notes?: string[], tier?: 'light' | 'heavy' | 'epic'): void
  /** The hammer taps before an outcome (the same for a hit and a miss: no tell). Resolves early on a tap, at once in ⚡ fast mode. */
  anticipate(hits: number): Promise<void>
  /** The item broke: shake + crack + hit-stop + "แตก!". No popup. */
  fail(label: string): void
  /** Repair done. */
  mend(): void
  /** A gold roll landed: golden pop + flash. */
  shine(label: string): void
  /** Corrupt resolved: purple vignette + ring burst + hit-stop (`kind` tunes the colour / shake), then `label` floats up. */
  burst(kind: 'none' | 'gold' | 'curse' | 'brick', label: string): void
}

export interface ForgeCtx {
  scene: Phaser.Scene
  fx: StageFx
  /** Something changed in the save: refresh wallet, rail, stage, panel and cost strip in place. */
  changed(): void
  /** Smith speech bubble. */
  say(text: string): void
  /** Ignore the action button and the verb tabs for `ms` (anti double-tap). The shell also does this itself after every act(). */
  busy(ms: number): void
  /** True while locked: panels that draw their own buttons check this before acting. */
  isBusy(): boolean
  /** Hold the same lock until the returned release() runs (a multi-step reveal). Releasing twice is harmless; the scene's shutdown clears it. */
  hold(): () => void
  /** Go to another verb of the current item (no-op when that verb is locked). */
  jump(v: Verb): void
  /** Option-gacha locks survive verb switches on the same item and reset when another item is picked. */
  locks: { get(itemId: string): number[]; set(itemId: string, idx: number[]): void }
}

/** hold = press-and-hold for that many ms instead of a tap (the risky verbs: Corrupt, Salvage). */
export interface VerbAction { label: string; enabled: boolean; fill?: number; hold?: number }
/** v115: the item as it will be after the press (the stage diffs it against now in the compare table); label = "+5" / "★3". */
export interface Preview { label: string; next: Item; color?: string }

/** One verb of the anvil. mount() builds the static layout once per (item, verb); refresh() updates it in place after every change. */
export interface VerbPanel {
  mount(box: Phaser.GameObjects.Container, it: Item): void
  refresh(): void
  /** Cost shown in the strip (null = nothing to pay). */
  cost(): ForgeCost | null
  /** The primary button (null = the panel draws its own buttons / nothing to press). */
  action(): VerbAction | null
  /** May return a promise: the shell keeps the busy lock until it settles. */
  act(): Promise<void> | void
  /** Optional "what you get" item for the stage's compare table. */
  preview(): Preview | null
  /** Free everything the panel started (its own objects, timers, holds). The box itself is destroyed by the shell. */
  destroy(): void
}

/** The verb box in the right column (v101, 3-column layout of forge-ux-v1.md 3.2). Panels lay out inside 0..BOX_W, 0..BOX_H. */
export const BOX_W = 340, BOX_H = 316
/** Inner content: x from PAD to BOX_W - PAD. */
export const PAD = 16, INNER_W = BOX_W - PAD * 2
