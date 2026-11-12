import { COMBO, PLAYER, softCapDiminish, type Stats } from "../game-data";
import { KIT2, KIT3, S2N } from "../skill-math";
import { COUNTER_RULES } from "../stack-math";
import { branchPts, crossTierBonus, talent2Mods, talentMods, tree2Mods, tree3Mods, treeMods, type TalentSave, type TreeSave } from "../tree";
import { JOB2, type Job2Id } from "../jobs2";
import { activeJob3, type Job3Id, type Job3Path, type Job3Variant } from "../jobs3";
import { JOBS, JOB_CHANGE, type JobId } from "../jobs";
import type { RefineLine } from "../craft";
import type { TaintRec } from "../taint";
import type { EquipSlot } from "./item-types";
import { itemById } from "./items";
import { SKILLS, smashLv, type SkillId } from "./novice";
import { RACES, type RaceId } from "./races";
import { JOB2_BONUS_STATS, JOB_BONUS, JOB_BONUS_STATS, PER_POINT, STAT_RULES, type BaseStat } from "./stat-spec";
import { wornCards, wornItems } from "./worn";

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
