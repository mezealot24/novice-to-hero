// Shared types for the forge anvil screen (design/forge-ux-v1.md 6.2). Rules stay in src/data/*; these are only the UI contracts.
import type Phaser from 'phaser'
import type { Item } from '../../data/meta'
import type { ForgeCost } from '../../data/refine'
import type { LegacyForge } from './legacy'

export type Verb = 'grade' | 'refine' | 'repair' | 'option' | 'taint'
export type Mode = 'anvil' | 'recipe' | 'stash'

/** What the stage plays when a verb resolves. Panels call these; they never touch stage objects directly. */
export interface StageFx {
  /** Refine/grade went up: pop, "+N", then extra floaters (new bonus line, free gems). */
  success(label: string, notes?: string[]): void
  /** The item broke: shake + crack + hit-stop + "แตก!". No popup. */
  fail(label: string): void
  /** Repair done. */
  mend(): void
}

export interface ForgeCtx {
  scene: Phaser.Scene
  fx: StageFx
  legacy: LegacyForge
  /** Something changed in the save: refresh wallet, rail, stage, panel and cost strip in place. */
  changed(): void
  /** Smith speech bubble. */
  say(text: string): void
}

export interface VerbAction { label: string; enabled: boolean; fill?: number }
export interface Preview { text: string; color?: string }

/** One verb of the anvil. mount() builds the static layout once per (item, verb); refresh() updates it in place after every change. */
export interface VerbPanel {
  mount(box: Phaser.GameObjects.Container, it: Item): void
  refresh(): void
  /** Cost shown in the strip (null = nothing to pay). */
  cost(): ForgeCost | null
  /** The primary button (null = hide it). */
  action(): VerbAction | null
  act(): void
  /** Optional "what you get" line for the stage. */
  preview(): Preview | null
  destroy(): void
}
