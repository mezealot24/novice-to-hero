import type { Stats } from "../game-data";
import type { Job2Id, WeaponType } from "../jobs2";
import type { Job3Id } from "../jobs3";
import type { JobId } from "../jobs";
import type { CraftInfo } from "../craft";
import type { BaseStat } from "./stat-spec";

// ---------- equipment (bought with zeny; nothing here is sold for real money) ----------
// Slot = what kind of item it is (shop tab, card type). EquipSlot = where it is worn: 6 places, two of them
// accessories (acc + acc2, both take 'acc' items). 'acc' keeps its old key so older saves still load.
export type Slot = "weapon" | "armor" | "acc" | "head" | "offhand";
export type EquipSlot = Slot | "acc2";
export const SLOTS: { id: Slot; name: string; icon: string }[] = [
	{ id: "weapon", name: "อาวุธ", icon: "🗡️" },
	{ id: "offhand", name: "มือรอง", icon: "🛡️" },
	{ id: "armor", name: "เกราะ", icon: "🥋" },
	{ id: "head", name: "หมวก", icon: "⛑️" },
	{ id: "acc", name: "ประดับ", icon: "💍" },
];
/** Equipment screen order: left column head / weapon / armor, right column off-hand / acc L / acc R. */
export const EQUIP_SLOTS: {
	id: EquipSlot;
	kind: Slot;
	name: string;
	icon: string;
}[] = [
	{ id: "head", kind: "head", name: "หมวก", icon: "⛑️" },
	{ id: "weapon", kind: "weapon", name: "อาวุธ", icon: "🗡️" },
	{ id: "armor", kind: "armor", name: "ชุดเกราะ", icon: "🥋" },
	{ id: "offhand", kind: "offhand", name: "มือรอง", icon: "🛡️" },
	{ id: "acc", kind: "acc", name: "ประดับ (ซ้าย)", icon: "💍" },
	{ id: "acc2", kind: "acc", name: "ประดับ (ขวา)", icon: "💍" },
];
/** The empty item of each kind (weapon/armor always hold something). */
export const EMPTY_ITEM: Partial<Record<Slot, string>> = {
	acc: "none",
	head: "none_head",
	offhand: "none_off",
};
/** What "take it off" leaves in each slot: the empty item, or the starter piece for weapon / armor (they always hold something). */
export const BARE_ITEM: Record<Slot, string> = {
	weapon: "knife",
	armor: "cloth",
	acc: "none",
	head: "none_head",
	offhand: "none_off",
};
export const slotKind = (sl: EquipSlot): Slot => (sl === "acc2" ? "acc" : sl);
// Gear gives base stats (STR/VIT/...) that run through the stat spec like spent points, plus direct
// stats (Hit, Flee, Counter, Combo, lifesteal, shields...). One item per slot, so nothing stacks.
// jobs = who can wear it (none = everyone). req = when the shop sells it: 'job' after the first job change,
// 'd2' after beating ป่าหมาป่าเงา. Item ids are save data: never rename or remove one.
export type ItemReq = "job" | "d2" | "d3" | "d4" | "job2" | "job3";
export interface Item {
	id: string;
	slot: Slot;
	name: string;
	icon: string;
	price: number;
	desc: string;
	base?: Partial<Record<BaseStat, number>>;
	mod: Partial<Stats>;
	jobs?: JobId[];
	j2?: Job2Id[];
	j3?: Job3Id[] /* class lock (v125): only these 2nd / 3rd jobs wear it (jobs = the base class, still required) */;
	req?: ItemReq;
	slots?: number;
	twoHand?: boolean;
	wtype?: WeaponType;
	craft?: CraftInfo;
	pct?: { maxHp?: number; atk?: number; matk?: number };
	unique?: {
		dg: string;
	}; /* v88: boss-drop unique (data/uniques.ts); dg = the dungeon whose materials it uses */
}
export const SW: JobId[] = ["swordsman"],
	AR: JobId[] = ["archer"],
	MG: JobId[] = ["mage"],
	CL: JobId[] = ["cleric"],
	TH: JobId[] = ["thief"];
