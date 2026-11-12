// ===== Out-of-run (meta) game data: races, base stats, equipment, costumes, top-up packs. =====
// Everything a run starts from is computed by heroStats(save). Balance knobs live here.
import { COMBO, PLAYER, softCapDiminish, type Stats } from "./game-data";
import { KIT2, KIT3, S2N } from "./skill-math";
import { COUNTER_RULES } from "./stack-math";
import { branchPts, crossTierBonus, talent2Mods, talentMods, tree2Mods, tree3Mods, treeMods, type TalentSave, type TreeSave } from "./tree";
import { JOB2, type Job2Id } from "./jobs2";
import { JOB3, activeJob3, type Job3Id, type Job3Path, type Job3Variant } from "./jobs3";
import { JOBS, JOB_CHANGE, type JobId } from "./jobs";
import { cardById, type EquipCard } from "./cards";
import { GRADE, forgeItem, type RefineLine } from "./craft";
import { applyCurse, type TaintRec } from "./taint";
import type { EquipSlot, Item } from "./meta/item-types";
import { canWear, itemById } from "./meta/items";
import { SKILLS, smashLv, type SkillId } from "./meta/novice";
import { RACES, type RaceId } from "./meta/races";
import { BASE_NAME, JOB2_BONUS_STATS, JOB_BONUS, JOB_BONUS_STATS, PER_POINT, STAT_RULES, type BaseStat } from "./meta/stat-spec";
export * from "./meta/economy";
export * from "./meta/stat-spec";
export * from "./meta/novice";
export * from "./meta/races";
export * from "./meta/item-types";
export * from "./meta/items";
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

// Labels for the auto-built stat line on every item card (so desc and numbers can never disagree).
const pc = (n: number) => `${Math.round(n * 1000) / 10}%`;
const STAT_LABEL: Partial<
	Record<keyof Stats, [string, (n: number) => string]>
> = {
	maxHp: ["HP", (n) => `${n}`],
	atk: ["P.ATK", (n) => `${n}`],
	matk: ["M.ATK", (n) => `${n}`],
	pskill: ["สกิลกายภาพ", pc],
	def: ["P.DEF", (n) => `${n}`],
	mdef: ["M.DEF", pc],
	tenacity: ["ต้านทาน", pc],
	healAmp: ["ฮีลแรง", pc],
	shieldAmp: ["โล่แรง", pc],
	hit: ["Hit", (n) => `${n}`],
	flee: ["Flee", (n) => `${n}`],
	luckyDodge: ["หลบโชคดี", pc],
	dropChance: ["ดรอปหายาก", pc],
	maxRes: ["Max Mana", (n) => `${n}`],
	resRegen: ["ฟื้น Mana", (n) => `${Math.round(n * 3 * 10) / 10}/เทิร์น`],
	aspd: ["เร็ว", (n) => pc(n / PLAYER.aspd)],
	crit: ["คริ", pc],
	spellCrit: ["เวทคริ", pc],
	critMul: ["ดาเมจคริ", pc],
	guard: ["ลดดาเมจ", pc],
	lifesteal: ["ดูดเลือด", pc],
	regen: ["ฟื้น HP/เทิร์น", (n) => pc((n * 1.5) / 100)],
	poison: ["พิษ stack/hit", (n) => `${n}`],
	poisonDmg: ["พิษแรง", (n) => `${n}`],
	smashMul: ["ทุบ(โนวิส)", (n) => `${n}x`],
	counter: ["สวนกลับ", pc],
	combo: ["คอมโบ", pc],
	comboCount: ["คอมโบต่อได้", (n) => `${n} ฮิต`],
	comboDmg: ["ดาเมจคอมโบ", pc],
	ignoreCombo: ["กันมอนคอมโบ", pc],
	ignoreCounter: ["กันมอนสวน", pc],
	comboDR: ["ลดดาเมจคอมโบมอน", pc],
	counterDR: ["ลดดาเมจสวนมอน", pc],
	critDR: ["ลดดาเมจคริมอน", pc],
	dodgeHeal: ["หลบ→ฟื้น HP", pc],
	revive: ["ลุกใหม่", (n) => `${n} ครั้ง/รอบ`],
	burnDps: ["ติดไฟ", (n) => `${n}/เทิร์น`],
	healShield: ["ฮีลแล้วได้โล่", pc],
	dodgeEnergy: ["หลบ→Energy", (n) => `${n}`],
	counterRage: ["สวนกลับ→Rage", (n) => `${n}`],
	mgUltAmp: ["ult ธาตุแรง", pc],
	thorns: ["โล่สะท้อนดาเมจ", pc],
	holyCounter: ["สวนกลับเป็นเวท (ใช้ M.ATK)", () => ""],
	rageGain: ["ได้ Rage", pc],
	startRage: ["เริ่มเวฟมี Rage", (n) => `${n}`],
	pierce: ["ult ทะลวงเกราะ", pc],
	arUltBreak: ["ult ใส่บอสที่ชาร์จ", pc],
	mgUltMana: ["ร่าย ult คืน Mana", (n) => `${n}`],
	ultAmp: ["ult แรง", pc],
	ultShieldAdd: ["โล่จาก ult", (n) => `${pc(n)} HP`],
	ultPoison: ["ult ติดพิษ", (n) => `${n} stack`],
	arDodgeShield: ["หลบ→โล่", (n) => `${pc(n)} HP`],
	arCritRes: ["คริ→Energy", (n) => `${n}`],
	counterShield: ["สวนกลับ→โล่", (n) => `${pc(n)} HP`],
	poisonAmp: ["ดาเมจใส่มอนพิษ 10+ stack", pc],
	ultMulAdd: ["ult ตัวคูณ", (n) => `${n}x`],
	ultVsCharge: ["ult ใส่บอสที่กำลังชาร์จ", pc],
	ultRegen: ["หลัง ult ฟื้น HP/เทิร์น (3 เทิร์น)", pc],
	autoCostCut: ["สกิลออโต้ใช้ resource ลดลง", (n) => `${n}`],
	spellVamp: ["ดูดเลือดสกิล", pc],
	skillDmgCut: ["ดาเมจสกิลลดลง", pc],
	spearRate: ["ได้หอกแสงต่อเทิร์น", pc],
	spearMul: ["หอกแสงแรง", (n) => `${n}x M.ATK`],
	arLowHpBonus: ["ดาเมจใส่มอน HP<50%", pc],
	ultDodge: ["ult หลบแน่นอน", (n) => `${n} ครั้ง`],
	ultHits: ["ult แทง", (n) => `${n} ที`],
	mgUltCd: ["คูลดาวน์ ult", (n) => `${n} เทิร์น`],
	resRegenCut: ["ฟื้น Mana ลดลง", pc],
	mgWaveBarrier: ["ต้นเวฟได้บาเรีย", (n) => `${n}x M.ATK`],
	debuffRes: ["กันสถานะผิดปกติ", pc],
	waveShield: ["โล่ต้นเวฟ", (n) => `${pc(n)} HP`],
	vsBurn: ["ตีศัตรูติดไฟ", pc],
	vsChill: ["ตีศัตรูที่เย็นอยู่", pc],
	vsPoison: ["ตีศัตรูติดพิษ", pc],
	chillWeak: ["ศัตรูเย็นตีเบาลง", pc],
	spearShield: ["โอกาสหอกแสงให้โล่", pc],
	counterDmg: ["ดาเมจสวนกลับ", pc],
	basicDmg: ["ตีปกติแรง", pc],
	resTurn: ["Mana/Energy/Rage ต่อเทิร์น", (n) => `${n}`],
	smashCd: ["คูลดาวน์ท่าไม้ตาย", (n) => `${Math.round(n / 1500)} เทิร์น`],
	berserk: ["HP<30%: ATK +40% ดูดเลือด x2", () => ""],
	overhealShield: ["ฮีลเกินเต็มกลายเป็นโล่", () => ""],
	ctrAoe: ["สวนกลับโดนมอนทุกตัว 0.5x", () => ""],
	dodgeStrike: ["หลบได้แล้วตีสวนกลับ", () => ""],
	killHeal: ["ฆ่ามอน→ฟื้น HP", pc],
	fireSpread: ["มอนตาย→ไฟลุกลาม", () => ""],
	poisonSpread: ["มอนตาย→พิษลุกลาม", () => ""],
	chillSlow: ["ชะลอมอนที่เย็นอยู่", pc],
	iceBarrier: ["บาเรียเวทน้ำแข็ง", pc],
	chillPlus: ["เย็นนานขึ้น", (n) => `${n} เทิร์น`],
	brittle: ["มอนที่เย็นโดนแรงขึ้น", pc],
};
/** Labels of the 2nd / 3rd job flags that gear and refine lines can carry (v125). Values are the same numbers the ใยชั้น 2 / 3 nodes give per level. */
const CLASS_STAT_LABEL: Partial<
	Record<keyof Stats, [string, (n: number) => string]>
> = {
	j2Guard: ["บล็อก (Auto Guard)", pc],
	j2FrenzyMax: ["Frenzy สูงสุด", (n) => `${n} stack`],
	j2Duel: ["ดวล (เหลือตัวเดียว/บอส)", pc],
	j2LowHp: ["คลั่ง (HP ยิ่งหายยิ่งแรง)", pc],
	j2HpDmg: ["สกิลหอก + HP สูงสุด", pc],
	j2Provoke: ["ข่มขวัญ (มอนเลือดน้อยตีเบา)", pc],
	j2Banner: ["ปักธง: โล่ต้นเวฟ", pc],
	j2BannerKill: ["ธงชัย: ฆ่าได้โล่", pc],
	j2PierceHits: ["Pierce แทงเพิ่ม", (n) => `${n} ฮิต`],
	j2KnifeMul: ["มีดบินแรง", pc],
	j2KnifeAdd: ["มีดบินเพิ่ม", (n) => `${n} เล่ม`],
	j2ExecAdd: ["เกณฑ์ Execute", pc],
	j2DebuffTurns: ["ดีบัฟนานขึ้น", (n) => `${n} เทิร์น`],
	j2CrossAdd: ["กางเขนแรง", pc],
	j2PayCut: ["Grand Cross จ่าย HP น้อยลง", pc],
	j2BlockHeal: ["บล็อกแล้วฮีล", pc],
	j2BlockShield: ["บล็อกแล้วได้โล่", pc],
	j2Reflect: ["สะท้อนกายภาพ", pc],
	j2ThunderPer: ["สายฟ้า/ลูกพลัง", pc],
	j2Es: ["โล่ตอนไม่โดนตี", pc],
	j2Dark: ["Darkness โล่ทุกเทิร์น", pc],
	j2ChargeMax: ["ลูกพลังสูงสุด", (n) => `${n} ลูก`],
	j2ComboRamp: ["คอมโบไต่ระดับ/ฮิต", pc],
	j2MdefDmg: ["M.DEF → แรงหมัดกาย", (n) => `×${n.toFixed(1)}`],
	j2HpPunch: ["หมัด +HP สูงสุด", pc],
	j2GritRate: ["สะสมโทสะ Grit", pc],
	j2ThunderAtk: ["Falling Thunder +P.ATK", pc],
	j2BellMdef: ["ระฆัง/อสุรา +M.DEF", pc],
	j2AsuraMdef: ["อสุรา +M.DEF×HP", pc],
	j2AsuraPow: ["อาชูร่าสไตรก์แรง", pc],
	j2MeteorMul: ["อุกกาบาตแรง", pc],
	j2LovMul: ["Lord of Vermilion แรง", pc],
	j2GustMul: ["Storm Gust แรง", pc],
	j2AutoChance: ["Auto Spell", pc],
	j2AutoBolts: ["Auto Spell +ลูก", (n) => `${n} ลูก`],
	j2EndowAmp: ["Endow แรง", pc],
	j2MagicRod: ["ดูดเวท → Mana", (n) => `${n}`],
	j2PetPow: ["สัตว์เลี้ยงแรง", pc],
	j2PetHeal: ["สัตว์ลงมือ → ฮีล", pc],
	j2HawkMul: ["เหยี่ยวแรง", pc],
	j2WolfMul: ["หมาป่าแรง", pc],
	j2TrapMul: ["กับดักแรง", pc],
	j2TurretMul: ["ป้อมปืนแรง", pc],
	j2BoxLuck: ["ของหายากในกล่องสุ่ม", pc],
	j2BoxMul: ["ของประหลาดแรง", pc],
	j2Spiral: ["Ult ทะลุ DEF", pc],
	j2Charge: ["ชาร์จเปิดเวฟ", pc],
	j3Press: ["Shield Press (x P.DEF)", (n) => `${n}x`],
	j3Banding: ["ดาเมจเข้าลด/มอนที่ยังอยู่", pc],
	j3GospelHeal: ["พระวรสาร/ทวน ฮีล/ฮิต", pc],
	j3AfterBless: ["พรหลัง Ult", pc],
	j3GospelField: ["Ult ฮิตเพิ่ม", (n) => `+${n} ฮิต`],
	j3EarthDrive: ["Earth Drive / Ignition Break", (n) => `${n}x`],
	j3Inspire: ["Inspiration / Parrying", (n) => `${n}`],
};
/** "STR +3 · P.ATK +8 · ดูดเลือด +6%" */
/** A stat line split in two: the upside, and the 💀 curse (every negative number). `force` defaults to "is a unique": plain gear has no curse. */
export function splitStatLine(
	it: {
		base?: Item["base"];
		mod: Partial<Stats>;
		pct?: Item["pct"];
		unique?: Item["unique"];
	},
	force = !!it.unique,
): { good: string; curse: string } {
	if (!force) return { good: itemStatLine(it), curse: "" };
	type Bag = {
		base: Record<string, number>;
		mod: Record<string, number>;
		pct: Record<string, number>;
	};
	const good: Bag = { base: {}, mod: {}, pct: {} },
		bad: Bag = { base: {}, mod: {}, pct: {} };
	for (const part of ["base", "mod", "pct"] as const)
		for (const [k, v] of Object.entries(it[part] ?? {}) as [string, number][])
			(v < 0 ? bad : good)[part][k] = v;
	const line = (x: Bag) =>
		itemStatLine({
			base: x.base as Item["base"],
			mod: x.mod as Partial<Stats>,
			pct: x.pct as Item["pct"],
		});
	return { good: line(good), curse: line(bad) };
}
export function itemStatLine(it: {
	base?: Item["base"];
	mod: Partial<Stats>;
	pct?: Item["pct"];
}): string {
	return statEntries(it)
		.map((e) => e.text)
		.join(" · ");
}

/** One stat of an item: `key` is unique across pct / base / mod, `v` the signed number, `fmt` formats a magnitude, `text` is the item-card piece. */
export interface StatEntry {
	key: string;
	label: string;
	v: number;
	fmt: (n: number) => string;
	text: string;
}
/** v115: the stat line as entries (the forge compare table diffs these). `group = false` never folds 7 equal base stats into "ทุกค่าสถานะ", so two items' keys line up. */
export function statEntries(
	it: { base?: Item["base"]; mod: Partial<Stats>; pct?: Item["pct"] },
	group = true,
): StatEntry[] {
	const out: StatEntry[] = [];
	const p = it.pct ?? {},
		sg = (n: number) => `${n > 0 ? "+" : "-"}${pc(Math.abs(n))}`; // "% of max HP / ATK" (cards, refine lines)
	for (const [k, label] of [
		["maxHp", "HP สูงสุด"],
		["atk", "P.ATK"],
		["matk", "M.ATK"],
	] as const) {
		const v = p[k];
		if (v)
			out.push({
				key: `pct.${k}`,
				label,
				v,
				fmt: pc,
				text: `${label} ${sg(v)}`,
			});
	}
	const b = it.base ?? {},
		num = (n: number) => `${n}`;
	const keys = Object.keys(b) as BaseStat[];
	if (group && keys.length === 7 && keys.every((k) => b[k] === b.str))
		out.push({
			key: "base.all",
			label: "ทุกค่าสถานะ",
			v: b.str!,
			fmt: num,
			text: `ทุกค่าสถานะ +${b.str}`,
		});
	else
		for (const k of keys)
			out.push({
				key: `base.${k}`,
				label: BASE_NAME[k],
				v: b[k]!,
				fmt: num,
				text: `${BASE_NAME[k]} ${b[k]! > 0 ? "+" : ""}${b[k]}`,
			});
	for (const k of Object.keys(it.mod) as (keyof Stats)[]) {
		const L = STAT_LABEL[k] ?? CLASS_STAT_LABEL[k],
			v = it.mod[k]!;
		if (!L) continue;
		const n = L[1](Math.abs(v));
		out.push({
			key: `mod.${k}`,
			label: L[0],
			v,
			fmt: L[1],
			text: n
				? `${L[0]} ${k === "resRegenCut" ? "" : v > 0 ? "+" : "-"}${n}`
				: L[0],
		});
	}
	return out;
}
/** Card effect line, including the "% of max HP / ATK" part. */
export const cardStatLine = (cd: EquipCard): string => itemStatLine(cd);
/** "นักดาบ, นักบวช" or "ทุกอาชีพ" */
export const wearText = (it: Item) =>
	it.j3
		? it.j3.map((j) => `${JOB3[j].icon}${JOB3[j].name}`).join(" ")
		: it.j2
			? it.j2.map((j) => `${JOB2[j].icon}${JOB2[j].name}`).join(" ")
			: it.jobs
				? it.jobs.map((j) => `${JOBS[j].icon}${JOBS[j].name}`).join(" ")
				: "ทุกอาชีพ";

// ---------- combine everything into the hero's starting stats ----------
export interface StatsInput {
	race: RaceId;
	stats: Record<BaseStat, number>;
	equipped: Partial<Record<EquipSlot, string>>;
	skills: Record<SkillId, number>;
	job?: JobId;
	jobTree?: TreeSave;
	job2?: Job2Id;
	job2Tree?: TreeSave;
	job3?: Job3Id;
	job3Tree?: TreeSave;
	job3Level?: number;
	job3Path?: Job3Path;
	job3Var?: Job3Variant;
	jobTalents?: TalentSave;
	jobLevel?: number;
	job2Talents?: TalentSave;
	job2Level?: number;
	sockets?: Record<string, string[]>;
	grade?: Record<string, number>;
	refine?: Record<string, number>;
	broken?: string[];
	refineLines?: Record<string, RefineLine[]>;
	taint?: Record<string, TaintRec>;
	tempBase?: Partial<Record<BaseStat, number>>;
	crossSpent?: { j2In1?: number; j3In1?: number; j3In2?: number };
}

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
/** Base stats from gear only (shown as "+N ของ" on the status tab). */
export function gearBase(s: StatsInput): Record<BaseStat, number> {
	const out = { str: 0, vit: 0, wis: 0, dex: 0, int: 0, luk: 0, agi: 0 };
	for (const it of [...wornItems(s), ...wornCards(s)])
		for (const k of Object.keys(it.base ?? {}) as BaseStat[])
			out[k] += it.base![k]!;
	return out;
}
/** 📈 Base stats from Job Lv (shown as "+N อาชีพ" on the status tab). */
export function jobBonusBase(
	s: Pick<StatsInput, "job" | "jobLevel" | "job2" | "job2Level">,
): Record<BaseStat, number> {
	const out = { str: 0, vit: 0, wis: 0, dex: 0, int: 0, luk: 0, agi: 0 };
	const add = (keys: readonly BaseStat[], lv: number) => {
		const n = Math.floor(lv / JOB_BONUS.every);
		for (const k of keys) out[k] += n;
	};
	if (s.job && s.job !== "novice")
		add(
			JOB_BONUS_STATS[s.job],
			Math.min(s.jobLevel ?? 1, JOB_CHANGE.classMaxJobLevel),
		);
	if (s.job2) add(JOB2_BONUS_STATS[s.job2], s.job2Level ?? 1);
	return out;
}
/** Level-up line for the result screen: the Job Lv that counts (Job2 Lv once there is a 2nd job) + any job bonus just gained. */
export function jobUpText(
	s: Pick<StatsInput, "job" | "jobLevel" | "job2" | "job2Level">,
	ups: number,
): string {
	const lv = s.job2 ? (s.job2Level ?? 1) : (s.jobLevel ?? 1);
	const keys = s.job2
		? JOB2_BONUS_STATS[s.job2]
		: s.job && s.job !== "novice"
			? JOB_BONUS_STATS[s.job]
			: [];
	const n =
		Math.floor(lv / JOB_BONUS.every) -
		Math.floor(Math.max(0, lv - ups) / JOB_BONUS.every);
	const bonus =
		n > 0 && keys.length
			? ` · 📈 ${keys.map((k) => k.toUpperCase()).join(" ")} +${n}`
			: "";
	return `✨ ${s.job2 ? "Job2" : "Job"} Lv ${lv}! ได้แต้มสกิลเพิ่ม${bonus}`;
}
/** Spent points + race + gear + job bonus: what every derived stat is computed from. */
export function totalBase(s: StatsInput): Record<BaseStat, number> {
	const out = { ...s.stats };
	const bonus = RACES[s.race].bonus,
		gear = gearBase(s),
		jb = jobBonusBase(s);
	for (const k of Object.keys(out) as BaseStat[])
		out[k] = Math.max(1, out[k] + (bonus[k] ?? 0) + gear[k] + jb[k]);
	if (s.job === "cleric" && s.jobTree) {
		// v86 💠 แก่นศรัทธา: จิตสงบ + STR / WIS · ศรัทธาสู่กาย INT -> STR (v102: + WIS -> VIT)
		let flat = 0,
			int = 0,
			per = 0,
			perW = 0;
		for (const m of treeMods(s.jobTree, "cleric")) {
			flat += m.clCoreBase ?? 0;
			int += m.clInt ?? 0;
			if (m.clIntToStr) per = per ? Math.min(per, m.clIntToStr) : m.clIntToStr;
			if (m.clWisToVit)
				perW = perW ? Math.min(perW, m.clWisToVit) : m.clWisToVit;
		}
		out.str += Math.round(flat);
		out.wis += Math.round(flat);
		out.int += Math.round(int); // before INT -> STR
		if (per > 0) out.str += Math.floor(out.int / per);
		if (perW > 0) out.vit += Math.floor(out.wis / perW); // WIS after จิตสงบ
	}
	return out;
}

/** 7 base stats -> derived stats: the part every body with stat points shares. The hero AND the D6+ stat monsters
 * (data/mon-stats.ts, Q 2026-11-04) both call this, so Flee / Hit / crit / combo / M.DEF follow one set of formulas. */
export function applyBase(
	st: Stats,
	b: Record<BaseStat, number>,
	atkStat: BaseStat = "str",
) {
	const d = (k: BaseStat) => b[k] - STAT_RULES.start;
	const P = PER_POINT;
	st.atk += P.str.atk * d(atkStat);
	st.pskill += P.str.pskill * b.str;
	st.hit += P.dex.hit * b.dex;
	st.minPct = Math.min(0.95, st.minPct + P.dex.minPct * b.dex);
	st.maxHp = (st.maxHp + P.vit.maxHp * d("vit")) * (1 + P.vit.maxHpPct * b.vit);
	st.def += P.vit.def * b.vit;
	st.regen += P.vit.regen * b.vit;
	st.matk += P.int.matk * d("int");
	st.maxRes += P.int.maxRes * d("int");
	st.healAmp += P.wis.healAmp * b.wis;
	st.shieldAmp += P.wis.shieldAmp * b.wis;
	st.mdef += b.wis / (b.wis + P.wis.mdefK);
	st.tenacity += b.wis / (b.wis + P.wis.tenacityK);
	st.resRegen += P.wis.resRegen * b.wis;
	st.aspd *= 1 + P.agi.aspdPct * d("agi");
	st.flee += P.agi.flee * b.agi;
	st.combo += d("agi") / (d("agi") + P.agi.comboK);
	st.counter += d("vit") / (d("vit") + P.vit.counterK); // VIT = minor counter; cards/gear are the major source
	st.crit += P.luk.crit * b.luk;
	st.luckyDodge += b.luk / (b.luk + P.luk.dodgeK);
	st.legendChance = Math.min(
		P.luk.legendCap,
		st.legendChance + P.luk.legendPer * b.luk,
	);
	st.dropChance *= 1 + Math.min(P.luk.dropCap, P.luk.dropPct * b.luk);
	st.eventChance = Math.min(
		P.luk.eventCap,
		st.eventChance + P.luk.eventPer * b.luk,
	);
}
/** Combo / counter / crit defence from base stats (before gear + caps): AGI Ignore Combo, DEX Ignore Counter, VIT combo + counter DR, LUK crit DR. */
export function baseDefence(b: Record<BaseStat, number>) {
	const K = COMBO.defK,
		f = (x: number) => (x > 0 ? x / (x + K) : 0),
		d = (k: BaseStat) => b[k] - STAT_RULES.start;
	return {
		ignoreCombo: f(d("agi")),
		ignoreCounter: f(d("dex")),
		comboDR: f(d("vit")),
		counterDR: f(d("vit")),
		critDR: f(d("luk")),
	};
}

/** v77 Priest พรแสง (ทักษะ 2, active): the base stats the Blessing adds while it is up (+ ★ Gloria LUK), or undefined if not learned. */
export function blessBase(
	s: StatsInput,
): Partial<Record<BaseStat, number>> | undefined {
	if (s.job !== "cleric" || !(s.jobTree?.cl_bless ?? 0)) return undefined;
	const n = S2N.blessStat;
	return {
		str: n,
		dex: n,
		int: n,
		wis: n,
		luk: (s.jobTree?.cl_bless_x ?? 0) > 0 ? S2N.gloriaLuk : 0,
	};
}

export function heroStats(s: StatsInput): Stats {
	const st: Stats = { ...PLAYER };
	const b = totalBase(s);
	for (const k of Object.keys(s.tempBase ?? {}) as BaseStat[])
		b[k] += s.tempBase?.[k] ?? 0; // in-fight base-stat buffs (v77 พรแสง), see BattleScene.syncBless
	const d = (k: BaseStat) => b[k] - STAT_RULES.start;
	const P = PER_POINT;
	const job = JOBS[s.job ?? "novice"];
	applyBase(st, b, job.attack === "ranged" ? "dex" : "str"); // ranged jobs draw P.ATK from DEX instead of STR (stat spec v1)
	if (job.id === "thief") st.poisonDmg += 0.1 * d("int"); // Q 2026-11-03: off-stat use, Thief poison +0.1 per INT point per stack
	if (job.id === "thief") st.thUltAgi = 0.02 * d("agi"); // Q 2026-11-03: เงาพริ้ว +2% per AGI point
	// off-stats (Q 2026-11-03): each class gets one use for a stat its kit otherwise ignores (design/class-rebalance-v1.md)
	if (job.id === "swordsman") st.counter += P.off.swordDexCounter * d("dex"); // DEX: parry -> more counters
	if (job.id === "archer") st.ultAmp += P.off.archerStrUlt * d("str"); // STR: heavier draw on ศรทะลวง
	if (job.id === "cleric") st.spearMul += P.off.clericDexSpear * d("dex"); // DEX: light spears hit harder
	if (job.id === "mage") {
		st.spellCrit += P.off.mageLukSpellCrit * b.luk; // LUK: magic crit (physical LUK crit does nothing for a Mage)
		const sti = treeMods(s.jobTree, "mage").reduce(
			(a, m) => a + (m.strToInt ?? 0),
			0,
		); // node กายสู่เวท
		const extra = Math.floor(sti * d("str"));
		st.matk += P.int.matk * extra;
		st.maxRes += P.int.maxRes * extra;
	}
	if (job.id === "cleric")
		st.spearLuck = Math.min(P.luk.spearCap, P.luk.spear * b.luk); // v37 Q: LUK -> light spear chance
	if (job.id === "cleric") {
		// v86 💠 จิตสงบ: Mana regen per 10 points of the lower of STR / WIS
		const per = treeMods(s.jobTree, "cleric").reduce(
			(a, m) => a + (m.clMindRegen ?? 0),
			0,
		);
		if (per > 0) st.resRegen += (per * Math.min(b.str, b.wis)) / 10;
	}
	st.maxHp = Math.round(st.maxHp);
	// Q: crit from talents/items/cards/tree also counts for magic (spellCrit); LUK crit above stays physical only
	const add = (mod: Partial<Stats>) => {
		for (const k of Object.keys(mod) as (keyof Stats)[]) {
			st[k] += mod[k]!;
			if (k === "crit") st.spellCrit += mod[k]!;
		}
	};
	add(RACES[s.race].traitMod);
	add(job.mod);
	for (const m of treeMods(s.jobTree, job.id)) add(m);
	for (const m of talentMods(s.jobTalents, job.id, s.jobLevel ?? 1)) add(m);
	const j2 =
		s.job2 && JOB2[s.job2]?.parent === job.id ? JOB2[s.job2] : undefined; // 2nd job (design/second-jobs-v1.md)
	const j2pct = { maxHp: 0, aspd: 0, atk: 0 };
	if (j2) {
		add(j2.mod);
		for (const m of tree2Mods(s.job2Tree, j2.id)) add(m);
		const csPts =
			(s.crossSpent?.j2In1 ?? 0) +
			(s.crossSpent?.j3In1 ?? 0) +
			(s.crossSpent?.j3In2 ?? 0);
		const cBonus = crossTierBonus(s.jobTree, job.id, csPts);
		st.ult2Pow += cBonus.ult2Add;
		st.ultAmp += cBonus.ultAmpAdd;
		st.s1Pow += cBonus.s1Add;
		st.s3Pow += cBonus.s3Add;
		for (const m of talent2Mods(s.job2Talents, j2.id, s.job2Level ?? 1)) add(m); // v119 ทาเลนต์ชั้น 2
		const wpn = itemById(s.equipped.weapon ?? "");
		if (j2.mastery.ok(wpn)) {
			add(j2.mastery.mod);
			j2pct.atk += j2.mastery.pct?.atk ?? 0;
		} // weapon mastery
		j2pct.maxHp += j2.pct?.maxHp ?? 0;
		j2pct.aspd += j2.pct?.aspd ?? 0;
		const j3 = activeJob3(s);
		if (j3) {
			// 3rd job (design/awakening-*.md): ใยชั้น 3 + legacy reads of the 2nd-job web
			const P = KIT3[j3],
				t2 = s.job2Tree;
			if (j3 === "paladin") st.j3On = 1; // ⚜️ Prestige + Gospel Cross
			if (j3 === "lordknight") {
				st.j3Lk = 1;
				st.j2HpDmg += KIT3.lordknight.hpDmgAdd;
				j2pct.maxHp += KIT3.lordknight.hpPct;
			} // 🐉 Aura Blade + Hundred Spear
			if (j3 === "champion") {
				st.j3Ch = 1;
				st.j2ChargeMax += KIT3.champion.chargeMaxAdd;
			} // 🥊 Ki Translation + Supreme Asura
			for (const m of tree3Mods(s.job3Tree, j3, s.job3Path)) add(m);
			const leg = Math.min(
				P.leg.crossCap,
				st.j3LegCross * branchPts(t2, P.leg.cross),
			);
			if (j3 === "paladin") st.j2CrossAdd += leg;
			else st.ult2Pow += leg; // the class's signature move
			st.j2Guard += Math.min(
				P.leg.guardCap,
				st.j3LegGuard * branchPts(t2, P.leg.guard),
			);
			j2pct.maxHp += Math.min(
				P.leg.hpCap,
				st.j3LegHp * branchPts(t2, P.leg.hp),
			);
			const V = s.job3Var === "b" ? P.varB : P.varA;
			st.j3VarMul = Math.min(V.cap, V.per * branchPts(t2, V.branch));
		}
		j2pct.maxHp += st.j2HpPct; // after 3rd-job/Hybrid tree so borrowed j2HpPct nodes (e.g. mk_h2) apply to maxHp
	}
	const worn = wornItems(s);
	for (const it of worn) add(it.mod);
	const cards = wornCards(s);
	for (const cd of cards) add(cd.mod);
	const pct = { maxHp: 0, atk: 0, matk: 0 };
	for (const x of [...cards, ...worn])
		for (const k of Object.keys(x.pct ?? {}) as (keyof typeof pct)[])
			pct[k] += x.pct![k]!; // refine lines: HP / ATK / M.ATK %
	st.maxHp = Math.max(1, Math.round(st.maxHp * (1 + pct.maxHp + j2pct.maxHp)));
	st.atk *= 1 + pct.atk + j2pct.atk;
	st.matk *= 1 + pct.matk;
	if (j2pct.aspd) st.aspd *= 1 + j2pct.aspd;
	if (st.j2DefAtk > 0) st.atk += st.def * st.j2DefAtk; // Knight เกราะเป็นแรง
	if (j2?.id === "crusader") {
		// Crusader Auto Guard: + per VIT point · v116 (Q 2026-11-08): what goes over the cap powers the block shield / heal instead of being lost
		const raw = st.j2Guard + KIT2.crusader.guardVit * Math.max(0, d("vit"));
		const cap =
			KIT2.crusader.guardCap + (st.j3On > 0 ? KIT3.paladin.capAdd : 0); // ⚜️ Paladin Prestige raises the cap
		st.j2Guard = Math.min(cap, raw);
		st.j2GuardOver = Math.max(0, raw - cap);
	}
	for (const sk of SKILLS)
		if (sk.id !== "smash" && (s.skills[sk.id] ?? 0) > 0)
			add(sk.mod(s.skills[sk.id]));
	if (job.id === "novice")
		add(SKILLS.find((x) => x.id === "smash")!.mod(smashLv(s.jobLevel ?? 1))); // v86: ทุบ = Job Lv
	st.smashCd = Math.max(2500, st.smashCd);
	st.aspd = Math.max(0.6, st.aspd);
	st.minPct = Math.min(0.95, st.minPct);
	st.mdef = softCapDiminish(st.mdef);
	st.tenacity = softCapDiminish(st.tenacity);
	st.luckyDodge = Math.min(0.25, st.luckyDodge);
	st.counter = Math.min(COMBO.rateCap, Math.max(COUNTER_RULES.min, st.counter)); // every class counters at least COUNTER_RULES.min (run picks multiply it) · counter rework: may pass 100% vs Ignore Counter (was 60%)
	st.combo = Math.min(COMBO.rateCap, st.combo);
	{
		const f = baseDefence(b); // hero combo / counter / crit defence (Q 2026-11-04)
		st.ignoreCombo = Math.min(COMBO.defCap, st.ignoreCombo + f.ignoreCombo);
		st.ignoreCounter = Math.min(
			COMBO.defCap,
			st.ignoreCounter + f.ignoreCounter,
		);
		st.comboDR = Math.min(COMBO.defCap, st.comboDR + f.comboDR);
		st.counterDR = Math.min(COMBO.defCap, st.counterDR + f.counterDR);
		st.critDR = Math.min(COMBO.critDRCap, st.critDR + f.critDR);
	}
	st.lifesteal = Math.min(0.4, st.lifesteal);
	st.spellVamp = Math.min(0.4, st.spellVamp);
	st.skillDmgCut = Math.min(0.9, st.skillDmgCut);
	st.dodgeHeal = Math.min(0.1, st.dodgeHeal);
	st.fleeFloor = Math.min(0.2, st.fleeFloor); // Thief: monsters still hit at least 60%
	st.waveShield = Math.min(0.2, st.waveShield);
	return st;
}
