import { GRADE, forgeItem, type RefineLine } from "../craft";
import { applyCurse, type TaintRec } from "../taint";
import type { Item } from "./item-types";
import { itemById } from "./items";
import { splitStatLine } from "./stat-text";

/** Can this job wear it? (no `jobs` list = everyone) */
/** Card slots (design/equipment-cards.md): starter gear 0, dungeon 2+ weapons 2, everything else 1. */
export function slotCount(it: Item, grade = 1): number {
	const n =
		it.slots !== undefined
			? it.slots
			: it.price === 0
				? 0
				: it.slot === "weapon" && it.req && it.req !== "job"
					? 2
					: 1;
	return grade >= GRADE.slotAt
		? Math.max(n, Math.min(GRADE.slotMax, n + 1))
		: n; // forge grade 4: +1 card slot
}
/** Forge grade of an owned item (1 = never upgraded). */
export const gradeOf = (s: { grade?: Record<string, number> }, id: string) =>
	s.grade?.[id] ?? 1;
/** Forge state of an owned item: refine +0..+10, broken (refine failed, no stats or cards until repaired), bonus lines. */
export interface ForgeState {
	grade?: Record<string, number>;
	refine?: Record<string, number>;
	broken?: string[];
	refineLines?: Record<string, RefineLine[]>;
	taint?: Record<string, TaintRec>;
}
export const refineOf = (s: ForgeState, id: string) => s.refine?.[id] ?? 0;
export const isBroken = (s: ForgeState, id: string) => !!s.broken?.includes(id);
export const linesOf = (s: ForgeState, id: string) => s.refineLines?.[id] ?? [];
/** The item with its grade, refine and bonus lines applied (what it gives when worn and not broken). */
/** v89: a tainted item is locked (no refine, no reroll, no grade-up). Repair still works. */
export const isTainted = (s: ForgeState, id: string) => !!s.taint?.[id];
export const forged = (s: ForgeState, it: Item) => {
	const f = forgeItem(
		it,
		gradeOf(s, it.id),
		refineOf(s, it.id),
		linesOf(s, it.id),
	);
	const t = s.taint?.[it.id];
	return t?.kind === "curse" ? applyCurse(f, t.curse) : f; // v89 curse line: on top of the worn item, never scaled by grade / refine
};
/** " ★3 +7 💔" name tag for lists (empty for a plain item). */
export const forgeTag = (s: ForgeState, id: string) =>
	`${isTainted(s, id) ? " 🌑" : ""}${itemById(id).unique && splitStatLine(itemById(id)).curse ? " 💀" : ""}${gradeOf(s, id) > 1 ? ` ★${gradeOf(s, id)}` : ""}${refineOf(s, id) ? ` +${refineOf(s, id)}` : ""}${isBroken(s, id) ? " 💔" : ""}`;
