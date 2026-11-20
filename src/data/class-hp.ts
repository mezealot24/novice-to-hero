// ===== 🩸 Class gear flat HP (Q 2026-11-20 pain point: many class-locked pieces gave 0 HP) =====
// Every class-locked item (jobs set) with no flat HP of its own gets one from this table:
//   HP = perTier[slot] x classMul x tier, rounded to 5, at least `min`.
// tier = the item's zone (craft / unique dungeon, dN = N, Rift = 15) or its shop gate (job 2, job2 5, job3 10), whichever is higher.
// Items that already carry flat HP keep their hand-set number; glass-cannon pieces (negative % HP) stay at 0.
// Grade / refine scale it like any maxHp (craft.ts SCALES), so it is a normal item stat everywhere (tooltips, compare, power).
import type { JobId } from "./jobs";
import type { Item, ItemReq, Slot } from "./meta/item-types";

export const CLASS_HP = {
	/** HP per tier for a classMul 1.0 class (armor already has hand-set HP on every class piece) */
	perTier: { weapon: 12, head: 14, offhand: 14, acc: 10, armor: 25 } as Record<Slot, number>,
	/** tanky classes get more HP off their gear, squishy ones less */
	classMul: { novice: 0.6, swordsman: 1, cleric: 0.9, thief: 0.65, archer: 0.6, mage: 0.55 } as Record<JobId, number>,
	reqTier: { job: 2, job2: 5, job3: 10, d2: 2, d3: 3, d4: 4, d10: 10, d11: 11, d12: 12, d13: 13, rift: 15 } as Record<ItemReq, number>,
	riftTier: 15,
	min: 20,
};

const dgTier = (dg: string | undefined): number => {
	if (!dg) return 0;
	if (dg === "rift") return CLASS_HP.riftTier;
	const m = /^d(\d+)$/.exec(dg);
	return m ? Number(m[1]) : 0;
};
/** Zone tier of an item (1 = starter). */
export const itemTier = (it: Pick<Item, "req" | "craft" | "unique">): number =>
	Math.max(1, it.req ? (CLASS_HP.reqTier[it.req] ?? 0) : 0, dgTier(it.craft?.dg), dgTier(it.unique?.dg));

/** The flat HP this class item gets from the table (0 = not a class item / keeps its own HP / glass cannon). */
export function classItemHp(it: Pick<Item, "slot" | "jobs" | "mod" | "pct" | "req" | "craft" | "unique">): number {
	if (!it.jobs?.length || (it.mod.maxHp ?? 0) !== 0 || (it.pct?.maxHp ?? 0) < 0) return 0;
	const mul = Math.max(...it.jobs.map((j) => CLASS_HP.classMul[j] ?? 0));
	if (mul <= 0) return 0;
	const raw = (CLASS_HP.perTier[it.slot] ?? 0) * mul * itemTier(it);
	return Math.max(CLASS_HP.min, Math.round(raw / 5) * 5);
}
/** Fill in class HP once, at item-table build (new mod object: item mods may be shared). Idempotent. */
export function withClassHp<T extends Item>(items: T[]): T[] {
	for (const it of items) {
		const hp = classItemHp(it);
		if (hp > 0) it.mod = { ...it.mod, maxHp: hp };
	}
	return items;
}
