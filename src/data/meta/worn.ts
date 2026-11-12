import { activeJob3 } from "../jobs3";
import { cardById, type EquipCard } from "../cards";
import { forged, gradeOf, isBroken, slotCount } from "./forge-state";
import type { StatsInput } from "./hero-stats";
import type { EquipSlot, Item } from "./item-types";
import { canWear, itemById } from "./items";

/** Items the hero actually gets stats from (gear for another job, or broken by a failed refine, stays on but does nothing). */
export function wornItems(s: StatsInput): Item[] {
	const job = s.job ?? "novice",
		job3 = activeJob3(s);
	const locked = offhandLocked(s);
	return (Object.keys(s.equipped) as EquipSlot[])
		.filter((sl) => !(sl === "offhand" && locked))
		.map((sl) => itemById(s.equipped[sl]!))
		.filter((it) => canWear(it, job, s.job2, job3) && !isBroken(s, it.id))
		.map((it) => forged(s, it));
}
/** A two-handed weapon in hand turns the off-hand slot off (its item stays on but gives nothing). */
export const offhandLocked = (s: {
	equipped: Partial<Record<EquipSlot, string>>;
}) => !!itemById(s.equipped.weapon ?? "").twoHand;
/** Headgear and off-hand take armor cards for now (no head/shield cards yet); both accessory slots take acc cards. */
export const cardFits = (cd: EquipCard, it: Item) =>
	cd.slot === it.slot ||
	(cd.slot === "armor" && (it.slot === "head" || it.slot === "offhand"));
/** Cards slotted in this item (unknown ids and extra cards past the slot count are ignored). */
export function socketed(
	s: { sockets?: Record<string, string[]>; grade?: Record<string, number> },
	it: Item,
): EquipCard[] {
	return (s.sockets?.[it.id] ?? [])
		.slice(0, slotCount(it, gradeOf(s, it.id)))
		.map(cardById)
		.filter((x): x is EquipCard => !!x);
}
/** Cards in worn gear the hero gets stats from. */
export const wornCards = (s: StatsInput) =>
	wornItems(s).flatMap((it) => socketed(s, it));
