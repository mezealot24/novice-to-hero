import { PLAYER, type Stats } from "../game-data";
import { JOB2 } from "../jobs2";
import { JOB3 } from "../jobs3";
import { JOBS } from "../jobs";
import type { EquipCard } from "../cards";
import type { Item } from "./item-types";
import { BASE_NAME, type BaseStat } from "./stat-spec";

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
