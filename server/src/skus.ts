// Server-side price table for paid-gem spends (client never sends a price).
import { COSTUMES, SUPPORTER_PRICE } from '../../src/data/meta'

export const SKU_PRICE: Record<string, number> = {
  supporter: SUPPORTER_PRICE,
  ...Object.fromEntries(COSTUMES.filter((c) => c.price > 0).map((c) => [`costume:${c.id}`, c.price])),
}
