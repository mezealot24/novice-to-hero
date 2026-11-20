import type { Job2Id } from "../jobs2";
import { activeJob3, type Job3Id } from "../jobs3";
import type { JobId } from "../jobs";
import { CARDFORGE_EXPANSION_ITEMS, CARDFORGE_ITEMS } from "../cardforge";
import { CRAFT_ITEMS } from "../craft";
import { AWAKENED_CRAFT_ITEMS } from "../awakened-craft";
import { UNIQUE_ITEMS } from "../uniques";
import { CHAMPION_UNIQUES, CREATIVE_UNIQUES, UNIQUE3_ITEMS, WARLORD_UNIQUES } from "../uniques3";
import { CLASS_GEAR } from "../class-gear";
import { CLASS_CRAFT_ITEMS } from "../class-craft";
import type { Item, ItemReq } from "./item-types";
import { withClassHp } from "../class-hp";
import { ARMOR } from "./items-armor";
import { HEAD_OFF } from "./items-head-off";
import { WEAPONS } from "./items-weapons";

export const ITEMS: Item[] = withClassHp([
	...WEAPONS,
	...ARMOR,
	...HEAD_OFF,
	// ----- forge only (data/craft.ts) -----
	...CRAFT_ITEMS,
	// ----- Cardforge (data/cardforge.ts, v98): forge-only gear with a signature flag -----
	...CARDFORGE_ITEMS,
	...CARDFORGE_EXPANSION_ITEMS,
	// ----- boss drops (data/uniques.ts, v88) -----
	...UNIQUE_ITEMS,
	// ----- 3rd job Awakening uniques (data/uniques3.ts) -----
	...UNIQUE3_ITEMS,
	...CHAMPION_UNIQUES,
	...WARLORD_UNIQUES,
	...CREATIVE_UNIQUES,
	// ----- 2nd / 3rd job headgear + accessories (data/class-gear.ts, v125): forge recipes with class-only grade bonuses -----
	...CLASS_GEAR,
	// ----- Class-specific D6-D10 crafted gear (data/class-craft.ts) -----
	...CLASS_CRAFT_ITEMS,
	// ----- Awakened D10-D13 & Rift creative craft gear (data/awakened-craft.ts) -----
	...AWAKENED_CRAFT_ITEMS,
]); // 🩸 class gear flat HP (data/class-hp.ts)
export const itemById = (id: string) =>
	ITEMS.find((i) => i.id === id) ?? ITEMS[0];
/** Can this hero wear it? `jobs` = base class (none = everyone); `j2` / `j3` = class lock to specific 2nd / 3rd jobs (v125 class gear).
 * Pass the hero's job2 / active job3 wherever you have them: a locked item with no job2 / job3 given is NOT wearable. */
export const canWear = (it: Item, job: JobId, job2?: Job2Id, job3?: Job3Id) =>
	(!it.jobs || it.jobs.includes(job)) &&
	(!it.j2 || (!!job2 && it.j2.includes(job2))) &&
	(!it.j3 || (!!job3 && it.j3.includes(job3)));
/** canWear for a whole save / hero state (job + 2nd job + active 3rd job). */
export const canWearAs = (
	it: Item,
	s: { job: JobId; job2?: Job2Id; job3?: Job3Id },
) => canWear(it, s.job, s.job2, activeJob3(s));
/** Is it on sale yet? */
export function itemUnlocked(
	it: Item,
	s: {
		job: JobId;
		job2?: Job2Id;
		job3?: Job3Id;
		clearsBy?: Record<string, number>;
	},
) {
	if (it.req === "job3") return !!s.job2 && !!activeJob3(s);
	if (it.req === "job2") return !!s.job2;
	if (it.req === "job") return s.job !== "novice";
	if (
		it.req === "d2" ||
		it.req === "d3" ||
		it.req === "d4" ||
		it.req === "d10" ||
		it.req === "d11" ||
		it.req === "d12" ||
		it.req === "d13" ||
		it.req === "rift"
	) {
		return (s.clearsBy?.[it.req] ?? 0) > 0;
	}
	return true;
}
export const REQ_TEXT: Record<ItemReq, string> = {
	job: "ขายหลังเปลี่ยนอาชีพ",
	d2: "ขายหลังล้มบอสป่าหมาป่าเงา",
	d3: "ขายหลังล้มอัศวินมรณะ",
	d4: "ขายหลังล้มไฮดรามรกต",
	job2: "ขายหลังเป็นอาชีพขั้น 2",
	job3: "ปลดหลังเป็นอาชีพขั้น 3",
	d10: "ปลดหลังผ่านดันเจี้ยน 10",
	d11: "ปลดหลังผ่านดันเจี้ยน 11",
	d12: "ปลดหลังผ่านดันเจี้ยน 12",
	d13: "ปลดหลังผ่านดันเจี้ยน 13",
	rift: "ปลดหลังผ่านดันเจี้ยน Rift",
};
