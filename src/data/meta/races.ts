import type { Stats } from "../game-data";
import { JOB_CHANGE } from "../jobs";
import { JOB2_RULES } from "../jobs2";
import { activeJob3, JOB3_RULES, type Job3Id, type Job3Path } from "../jobs3";
import type { JobId } from "../jobs";
import type { Job2Id } from "../jobs2";
import { JOB_RULES, type BaseStat } from "./stat-spec";

// ---------- races (Q 2026-11-20: more races, real impact, race stats grow every 5 Job Lv, weaknesses go negative too) ----------
// Race ids are save data: never rename or remove one (old saves are human / elf / dwarf).
export type RaceId = "human" | "elf" | "dwarf" | "orc" | "beastkin" | "vampire" | "seraph";
export interface Race {
	id: RaceId;
	name: string;
	icon: string;
	blurb: string;
	/** base stats from the start */
	bonus: Partial<Record<BaseStat, number>>;
	/** 📈 per race step (every RACE_GROWTH.every Job Lv): fractional rates add up, whole points count (truncated toward 0) */
	growth: Partial<Record<BaseStat, number>>;
	trait: string;
	traitMod: Partial<Stats>;
	expMul: number;
}
/** Every `every` Job Lv on each tier (Novice, base class, 2nd, 3rd) = 1 race step. Novice steps stay after the job change. */
export const RACE_GROWTH = { every: 5 };

export const RACES: Record<RaceId, Race> = {
	human: {
		id: "human",
		name: "มนุษย์",
		icon: "🧑",
		blurb: "สายกลาง เก่งทุกอย่างนิดหน่อย ไม่มีจุดอ่อน โตไว",
		bonus: { str: 1, vit: 1, dex: 1, luk: 1 },
		growth: { str: 0.3, vit: 0.3, wis: 0.3, dex: 0.3, int: 0.3, luk: 0.3, agi: 0.3 },
		trait: "ใฝ่รู้: EXP ที่ได้ +10%",
		traitMod: {},
		expMul: 1.1,
	},
	elf: {
		id: "elf",
		name: "เอลฟ์",
		icon: "🧝",
		blurb: "ว่องไว ตาไว แม่น เวทดี แต่ตัวบาง",
		bonus: { agi: 2, int: 2, wis: 1, vit: -1 },
		growth: { agi: 1, int: 1, dex: 0.5, vit: -0.5 },
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
		growth: { vit: 1.5, str: 1, agi: -0.5 },
		trait: "กระดูกเหล็ก: P.DEF +8",
		traitMod: { def: 8 },
		expMul: 1,
	},
	orc: {
		id: "orc",
		name: "ออร์ค",
		icon: "👹",
		blurb: "แรงช้างเลือดหนา แต่หัวไม่ค่อยไว เวทแทบไม่ขึ้น",
		bonus: { str: 4, vit: 2, int: -1, wis: -1 },
		growth: { str: 1.5, vit: 1, int: -0.5 },
		trait: "เลือดนักรบ: Max HP +60",
		traitMod: { maxHp: 60 },
		expMul: 1,
	},
	beastkin: {
		id: "beastkin",
		name: "มนุษย์สัตว์",
		icon: "🐺",
		blurb: "ปราดเปรียว ดวงดี สัญชาตญาณป่า แต่ใจร้อน",
		bonus: { agi: 3, luk: 2, str: 1, int: -1, wis: -1 },
		growth: { agi: 1, luk: 0.5, str: 0.5, dex: 0.5, wis: -0.5 },
		trait: "สัญชาตญาณ: Flee +6",
		traitMod: { flee: 6 },
		expMul: 1,
	},
	vampire: {
		id: "vampire",
		name: "แวมไพร์",
		icon: "🧛",
		blurb: "เวทแรง ว่องไว ดูดเลือดศัตรู แต่ร่างกายเปราะ",
		bonus: { int: 2, agi: 2, luk: 2, vit: -2 },
		growth: { int: 1, agi: 1, luk: 0.5, vit: -0.5 },
		trait: "กระหายเลือด: ดูดเลือด +2%",
		traitMod: { lifesteal: 0.02 },
		expMul: 1,
	},
	seraph: {
		id: "seraph",
		name: "เทวทูต",
		icon: "😇",
		blurb: "ใจแข็ง เวทศักดิ์สิทธิ์ แต่แขนบอบบาง",
		bonus: { wis: 3, int: 2, luk: 1, str: -2 },
		growth: { wis: 1, int: 1, vit: 0.5, str: -0.5 },
		trait: "แสงคุ้มครอง: M.DEF +5%",
		traitMod: { mdef: 0.05 },
		expMul: 1,
	},
};
export const RACE_IDS = Object.keys(RACES) as RaceId[];

export interface RaceStepInput {
	job?: JobId;
	jobLevel?: number;
	job2?: Job2Id;
	job2Level?: number;
	job3?: Job3Id;
	job3Level?: number;
	job3Path?: Job3Path;
}
/** Race steps earned so far: floor(Job Lv / every) per tier. Novice Job Lv counts while a Novice; after the job change
 *  the Novice tier counts as maxed (so the change never takes race stats away). Derived from levels only (no save field). */
export function raceSteps(s: RaceStepInput): number {
	const e = RACE_GROWTH.every,
		f = (lv: number | undefined, cap: number) => Math.floor(Math.min(Math.max(1, lv ?? 1), cap) / e);
	if (!s.job || s.job === "novice") return f(s.jobLevel, JOB_RULES.maxJobLevel);
	let n = Math.floor(JOB_RULES.maxJobLevel / e) + f(s.jobLevel, JOB_CHANGE.classMaxJobLevel);
	if (s.job2) n += f(s.job2Level, JOB2_RULES.maxJobLevel);
	if (s.job2 && activeJob3(s)) n += f(s.job3Level, JOB3_RULES.maxJobLevel);
	return n;
}
/** Race base stats now: start bonus + growth x steps (each stat truncated toward 0, so weaknesses go negative too). */
export function raceBase(race: RaceId, steps: number): Record<BaseStat, number> {
	const r = RACES[race] ?? RACES.human,
		out = { str: 0, vit: 0, wis: 0, dex: 0, int: 0, luk: 0, agi: 0 };
	for (const k of Object.keys(out) as BaseStat[])
		out[k] = (r.bonus[k] ?? 0) + Math.trunc((r.growth[k] ?? 0) * steps + 1e-9 * Math.sign(r.growth[k] ?? 0));
	return out;
}
