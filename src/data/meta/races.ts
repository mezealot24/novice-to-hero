import type { Stats } from "../game-data";
import type { BaseStat } from "./stat-spec";

// ---------- races (placeholder: will be reshaped by the Eden Eternal / Trickster research) ----------
export type RaceId = "human" | "elf" | "dwarf";
export interface Race {
	id: RaceId;
	name: string;
	icon: string;
	blurb: string;
	bonus: Partial<Record<BaseStat, number>>;
	trait: string;
	traitMod: Partial<Stats>;
	expMul: number;
}
export const RACES: Record<RaceId, Race> = {
	human: {
		id: "human",
		name: "มนุษย์",
		icon: "🧑",
		blurb: "สายกลาง เก่งทุกอย่างนิดหน่อย โตไว",
		bonus: { str: 1, vit: 1, dex: 1, luk: 1 },
		trait: "ใฝ่รู้: EXP ที่ได้ +10%",
		traitMod: {},
		expMul: 1.1,
	},
	elf: {
		id: "elf",
		name: "เอลฟ์",
		icon: "🧝",
		blurb: "ว่องไว ตาไว แม่น แต่ตัวบาง",
		bonus: { agi: 2, int: 2, wis: 1, vit: -1 },
		trait: "สายตาพราน: Hit +6",
		traitMod: { hit: 6 },
		expMul: 1,
	},
	dwarf: {
		id: "dwarf",
		name: "คนแคระ",
		icon: "🧔",
		blurb: "ถึกทน ตีหนัก แต่ช้า",
		bonus: { str: 2, vit: 3, agi: -1 },
		trait: "กระดูกเหล็ก: P.DEF +8",
		traitMod: { def: 8 },
		expMul: 1,
	},
};
