// Small base for verb panels: remembers what the panel put in its box so destroy() really frees it.
import type Phaser from 'phaser'

export abstract class PanelBase {
  protected own: Phaser.GameObjects.GameObject[] = []
  protected put(box: Phaser.GameObjects.Container, ...objs: Phaser.GameObjects.GameObject[]) {
    box.add(objs)
    this.own.push(...objs)
  }
  /** Show / hide everything this panel put in its box (the ⬆️ tab swaps between grade-up and ascension in place). */
  setShown(on: boolean) {
    for (const o of this.own) (o as unknown as { setVisible?: (v: boolean) => unknown }).setVisible?.(on)
  }
  destroy() {
    for (const o of this.own) if (o.scene) o.destroy()
    this.own = []
  }
}
