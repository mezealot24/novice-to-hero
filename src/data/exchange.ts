// 🧪 TEST ONLY: gem <-> zeny exchange for the playtest (meta.ts GEM_TO_ZENY_TEST / ZENY_TO_GEM_TEST).
// Pure functions so the no-arbitrage rule is unit-tested; the shop scene only calls these + persist().
import { ZENY_COST_PER_GEM, ZENY_PER_GEM } from './meta'

type Wallet = { zeny: number; gems: number }

const validPack = (n: number) => Number.isInteger(n) && n > 0

/** Spend `gems` free gems for zeny. Returns the zeny gained, or 0 if it could not pay. */
export function gemsToZeny(w: Wallet, gems: number): number {
  if (!validPack(gems) || w.gems < gems) return 0
  const z = gems * ZENY_PER_GEM
  w.gems -= gems; w.zeny += z
  return z
}

/** Zeny price of `gems` free gems. */
export const zenyCostOf = (gems: number) => gems * ZENY_COST_PER_GEM

/** Spend zeny for `gems` free gems (client save only, never server paid gems). Returns gems gained, or 0. */
export function zenyToGems(w: Wallet, gems: number): number {
  const cost = zenyCostOf(gems)
  if (!validPack(gems) || w.zeny < cost) return 0
  w.zeny -= cost; w.gems += gems
  return gems
}
