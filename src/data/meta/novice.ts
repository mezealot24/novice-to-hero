import { PLAYER, type Stats } from "../game-data";

export type SkillId =
	| "smash"
	| "firstaid"
	| "tough"
	| "focus"
	| "power"
	| "iron"
	| "swift";
export interface SkillDef {
	id: SkillId;
	name: string;
	icon: string;
	kind: "active" | "passive";
	max: number;
	desc: (lv: number) => string;
	mod: (lv: number) => Partial<Stats>;
}
export const SKILLS: SkillDef[] = [
	{
		id: "smash",
		name: "ทุบ",
		icon: "💢",
		kind: "active",
		max: 10,
		desc: (lv) =>
			`ท่าไม้ตาย (กดเอง) ทุบทุกตัว คูลดาวน์ 4 เทิร์น แรง +${(lv - 1) * 15}%`,
		mod: (lv) => ({ smashMul: PLAYER.smashMul * 0.15 * (lv - 1) }),
	},
	// v85 novice passives (Q 2026-11-06): 6 lines x 5 Lv, paid from their own NOVICE_RULES.points pool (not Job Lv)
	{
		id: "firstaid",
		name: "ปฐมพยาบาล",
		icon: "🩹",
		kind: "passive",
		max: 5,
		desc: (lv) => `ฟื้น HP ${(lv * 0.3).toFixed(1)}% ทุกเทิร์น (WIS ช่วยเพิ่ม)`,
		mod: (lv) => ({ regen: 0.2 * lv }),
	},
	{
		id: "tough",
		name: "ร่างกายแกร่ง",
		icon: "💪",
		kind: "passive",
		max: 5,
		desc: (lv) => `HP สูงสุด +${lv * 12}`,
		mod: (lv) => ({ maxHp: 12 * lv }),
	},
	{
		id: "focus",
		name: "ฟื้นพลัง",
		icon: "💧",
		kind: "passive",
		max: 5,
		desc: (lv) =>
			`ฟื้น Mana/Energy +${(lv * 0.3).toFixed(1)}/วิ (มีผลหลังเปลี่ยนอาชีพ)`,
		mod: (lv) => ({ resRegen: 0.3 * lv }),
	},
	{
		id: "power",
		name: "พลังโจมตี",
		icon: "⚔️",
		kind: "passive",
		max: 5,
		desc: (lv) => `P.ATK +${lv * 3} · M.ATK +${lv * 3}`,
		mod: (lv) => ({ atk: 3 * lv, matk: 3 * lv }),
	},
	{
		id: "iron",
		name: "ผิวเหล็ก",
		icon: "🛡️",
		kind: "passive",
		max: 5,
		desc: (lv) => `DEF +${lv} · M.DEF +${lv}%`,
		mod: (lv) => ({ def: lv, mdef: 0.01 * lv }),
	},
	{
		id: "swift",
		name: "ว่องไว",
		icon: "🍃",
		kind: "passive",
		max: 5,
		desc: (lv) => `Flee +${lv * 2} · ตีเร็ว +${(lv * 0.03).toFixed(2)}/วิ`,
		mod: (lv) => ({ flee: 2 * lv, aspd: 0.03 * lv }),
	},
];
/** Novice passive pool: a fixed 10 points from the start, not tied to Job Lv. Left = points - levels spent (derived, never stored). */
export const NOVICE_RULES = { points: 10, resetGems: 10 };
/** v86 (Q 2026-11-06): 💢 ทุบ levels itself = the novice's Job Lv (1..10), no points. Only novices use it (classes have an ult). */
export const smashLv = (jobLevel: number) =>
	Math.max(1, Math.min(10, Math.floor(jobLevel || 1)));
export const NOVICE_PASSIVES = SKILLS.filter((x) => x.kind === "passive");
export const noviceSpent = (skills: Partial<Record<SkillId, number>>) =>
	NOVICE_PASSIVES.reduce((a, x) => a + (skills[x.id] ?? 0), 0);
export const noviceLeft = (skills: Partial<Record<SkillId, number>>) =>
	Math.max(0, NOVICE_RULES.points - noviceSpent(skills));
// Certificate-style passive slots (Eden Eternal idea): open with Base Lv, filled after job change.
export const CERT_SLOTS_AT = [10, 20, 30, 40];
