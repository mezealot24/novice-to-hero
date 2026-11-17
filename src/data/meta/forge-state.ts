import { GRADE, forgeItem, type RefineLine } from "../craft";
import { aspectModOf, UNIQUE_AWAKEN } from "../item-effects";
import type { Stats } from "../stats";
import { applyCurse, type TaintRec } from "../taint";
import type { Item } from "./item-types";
import { itemById } from "./items";
import type { BaseStat } from "./stat-spec";
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
	awakened?: Record<string, number>;
	imbue?: Record<string, string>;
}
export const refineOf = (s: ForgeState, id: string) => s.refine?.[id] ?? 0;
export const isBroken = (s: ForgeState, id: string) => !!s.broken?.includes(id);
export const linesOf = (s: ForgeState, id: string) => s.refineLines?.[id] ?? [];
/** The item with its grade, refine and bonus lines applied (what it gives when worn and not broken). */
/** v89: a tainted item is locked (no refine, no reroll, no grade-up). Repair still works. */
export const isTainted = (s: ForgeState, id: string) => !!s.taint?.[id];
export const isAwakened = (s: ForgeState, id: string) => !!s.awakened?.[id];
export const imbueOf = (s: ForgeState, id: string) => s.imbue?.[id];

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const FLAT_MOD_STATS = new Set<keyof Stats>([
	"maxHp",
	"atk",
	"matk",
	"def",
	"hit",
	"flee",
	"maxRes",
]);
const NON_SCALING_UNIQUE_FLAGS = new Set<keyof Stats>([
	"overhealShield",
	"ctrAoe",
	"berserk",
	"j3GospelField",
	"j2ChargeMax",
	"doubleAtk",
	"revive",
	"j3Heir",
	"j3Inspire",
	"j3On",
	"j3Lk",
	"j3Ch",
	"j3Rn",
	"j3Wl",
	"j3Pf",
	"poison",
]);

function awakenIntrinsicItem(it: Item): Item {
	const posScale = 1 + UNIQUE_AWAKEN.statScaleBonus;
	const curseScale = Math.max(0, 1 - UNIQUE_AWAKEN.curseReduction);
	let base: Partial<Record<BaseStat, number>> | undefined;
	if (it.base) {
		base = {};
		for (const [k, v] of Object.entries(it.base) as [BaseStat, number][]) {
			base[k] =
				v > 0
					? Math.round(r3(v * posScale))
					: v < 0
						? Math.round(r3(v * curseScale))
						: v;
		}
	}
	const mod: Partial<Stats> = {};
	for (const [k, v] of Object.entries(it.mod) as [keyof Stats, number][]) {
		if (v < 0) {
			mod[k] = FLAT_MOD_STATS.has(k)
				? Math.round(r3(v * curseScale))
				: r3(v * curseScale);
		} else if (v > 0 && !NON_SCALING_UNIQUE_FLAGS.has(k)) {
			mod[k] = FLAT_MOD_STATS.has(k)
				? Math.round(r3(v * posScale))
				: r3(v * posScale);
		} else {
			mod[k] = v;
		}
	}
	let pct: Item["pct"];
	if (it.pct) {
		pct = {};
		for (const [k, v] of Object.entries(it.pct) as [
			keyof NonNullable<Item["pct"]>,
			number,
		][]) {
			pct[k] =
				v > 0 ? r3(v * posScale) : v < 0 ? r3(v * curseScale) : v;
		}
	}
	return { ...it, ...(base ? { base } : {}), mod, ...(pct ? { pct } : {}) };
}

export const forged = (s: ForgeState, it: Item) => {
	const baseItem =
		it.unique && isAwakened(s, it.id) ? awakenIntrinsicItem(it) : it;
	const f = forgeItem(
		baseItem,
		gradeOf(s, it.id),
		refineOf(s, it.id),
		linesOf(s, it.id),
	);
	const t = s.taint?.[it.id];
	let out = t?.kind === "curse" ? applyCurse(f, t.curse) : f; // v89 curse line: on top of the worn item, never scaled by grade / refine
	const asp = aspectModOf(s, it);
	if (asp) {
		const mod: Partial<Stats> = { ...out.mod };
		for (const [k, v] of Object.entries(asp) as [keyof Stats, number][]) {
			mod[k] = r3((mod[k] ?? 0) + v);
		}
		out = { ...out, mod };
	}
	return out;
};
/** " ★3 +7 💔" name tag for lists (empty for a plain item). */
export const forgeTag = (s: ForgeState, id: string) =>
	`${isTainted(s, id) ? " 🌑" : ""}${itemById(id).unique && splitStatLine(itemById(id)).curse ? " 💀" : ""}${gradeOf(s, id) > 1 ? ` ★${gradeOf(s, id)}` : ""}${refineOf(s, id) ? ` +${refineOf(s, id)}` : ""}${isBroken(s, id) ? " 💔" : ""}${isAwakened(s, id) ? " 🌟" : ""}${imbueOf(s, id) ? " 🔮" : ""}`;
