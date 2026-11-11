import type { Job2Id } from "../jobs2";
import type { JobId } from "../jobs";

// ---------- base stats (Q's spec, 2026-11-02): 7 stats, points from Base Level ----------
export type BaseStat = "str" | "vit" | "wis" | "dex" | "int" | "luk" | "agi";
// Stat spec v1 (design/stat-system-v1.md, approved by Q 2026-11-02). Flat values grow per point;
// % values use x/(x+K) so they never reach 100%. heroStats() below applies exactly these.
export const PER_POINT = {
	str: { atk: 2, pskill: 0.005 },
	dex: { hit: 1, minPct: 0.005 },
	vit: { maxHp: 10, maxHpPct: 0.005, def: 0.5, regen: 0.02, counterK: 300 },
	int: { matk: 2, maxRes: 3 },
	wis: {
		healAmp: 0.01,
		shieldAmp: 0.01,
		mdefK: 150,
		resRegen: 0.05,
		tenacityK: 200,
	},
	agi: {
		aspdPct: 0.015,
		flee: 1,
		comboK: 360 /* Q 2026-11-04 combo rework: was 120 (AGI 64 = 34% -> 15%) */,
	},
	off: {
		swordDexCounter: 0.002,
		archerStrUlt: 0.01,
		clericDexSpear: 0.003,
		mageLukSpellCrit: 0.01 / 6,
	},
	luk: {
		spear: 0.005,
		spearCap: 0.25,
		/* Cleric: +0.5% light spear chance per LUK per turn, cap 25% */ crit:
			0.01 / 3,
		/* Q: every 3 LUK = +1% crit (only stat that gives crit) */ dodgeK: 600,
		/* lucky dodge LUK/(LUK+K): Q 2026-11-04 nerf 300 -> 600 (LUK 50 = 7.7%, 100 = 14%, 200 = 25% cap; gear adds on top) */ legendPer: 0.0007,
		legendCap: 0.15,
		/* พร v2: base 6% + LUK, cap 15% */ dropPct: 0.005,
		dropCap: 0.5,
		eventPer: 0.005,
		eventCap: 0.3,
	},
};
// What each stat does is in data/statInfo.ts (generic + current class only, numbers from PER_POINT).
export const BASE_STATS: { id: BaseStat; name: string; role: string }[] = [
	{ id: "str", name: "STR", role: "พลังกาย" },
	{ id: "vit", name: "VIT", role: "ความอึด" },
	{ id: "wis", name: "WIS", role: "ใจแข็ง" },
	{ id: "dex", name: "DEX", role: "ความแม่น" },
	{ id: "int", name: "INT", role: "เวทมนตร์" },
	{ id: "luk", name: "LUK", role: "ดวง" },
	{ id: "agi", name: "AGI", role: "ความเร็ว" },
];
export const RESOURCES = {
	mana: {
		name: "Mana",
		color: 0x5aa0ff,
		desc: "ฟื้นเองตามเวลา (INT ช่วยให้ฟื้นไวขึ้น)",
	},
	rage: {
		name: "Rage",
		color: 0xff5a4e,
		desc: "ได้จากการตีและโดนตี ค่อยๆ ลดเมื่อไม่สู้",
	},
	energy: { name: "Energy", color: 0xf2d24b, desc: "ถังเล็ก ฟื้นไวคงที่" },
} as const;
export const STAT_RULES = {
	start: 1, // every stat starts here (before race bonus)
	max: 999, // Uncapped/soft-cap friendly: allows players to invest freely beyond legacy 99
	pointsPerLevel: 3,
	xpBase: 25,
	xpStep: 15, // live-tunable (data/tunables.ts progression)
	baseXpNeed: (lv: number): number =>
		STAT_RULES.xpBase + STAT_RULES.xpStep * (lv - 1), // account EXP to go from lv to lv+1
	maxBaseLevel: 99,
};

/** 📈 Job bonus stat (Q 2026-11-08, design/job-bonus-stat-v1.md): +1 to each listed stat every `every` Job Lv.
 *  Derived from levels only (no save field). The base class bonus stays after the 2nd job (they stack). No bonus for Job3. */
export const JOB_BONUS = { every: 10 };
export const JOB_BONUS_STATS: Record<JobId, readonly BaseStat[]> = {
	novice: [],
	swordsman: ["str", "vit"],
	archer: ["dex", "agi"],
	mage: ["int", "wis"],
	cleric: ["int", "wis"],
	thief: ["agi", "str"],
};
export const JOB2_BONUS_STATS: Record<Job2Id, readonly BaseStat[]> = {
	berserker: ["str", "vit", "agi"],
	knight: ["str", "vit", "dex"],
	rogue: ["agi", "str", "dex"],
	mobster: ["str", "luk", "agi"],
	crusader: ["str", "vit", "int"],
	monk: ["str", "agi", "vit"],
	wizard: ["int", "wis", "dex"],
	sage: ["int", "wis", "vit"],
	beastmaster: ["dex", "vit", "luk"],
	innovator: ["dex", "int", "agi"],
};

// ---------- job + skills (Novice only for now; job change = M3) ----------
// Base Lv and Job Lv are separate (RO / Eden Eternal): Base Lv gives stat points, Job Lv gives skill points.
export const JOB_RULES = {
	maxJobLevel: 10,
	xpBase: 20,
	xpStep: 10,
	jobXpNeed: (lv: number): number =>
		JOB_RULES.xpBase + JOB_RULES.xpStep * (lv - 1),
	changeAt: 10,
};
export const BASE_NAME: Record<BaseStat, string> = {
	str: "STR",
	vit: "VIT",
	wis: "WIS",
	dex: "DEX",
	int: "INT",
	luk: "LUK",
	agi: "AGI",
};
