import Phaser from "phaser";
import { doubleAtkChance, type Stats } from "../../data/game-data";
import { derivedRows } from "../../data/stat-rows";
import {
	autoInfo,
	dawnInfo,
	doubleCastAt,
	doubleCastMul,
	KIT2,
	KIT3,
	magicPower,
	profOffMul,
	SAGE_S1,
	sageAutoChance,
	sageFireChance,
	sageIceChance,
	sageLightChance,
	sageRodGain,
	skill2Info,
	skill3Info,
	ultInfo,
	type InfoRow,
} from "../../data/skill-math";
import { skill2ById } from "../../data/skill2";
import { heroStats, totalBase } from "../../data/meta";
import { save } from "../../save";
import { BRANCHES, branchPts, skill2Picked, type TreeNode } from "../../data/tree";
import { JOBS } from "../../data/jobs";
import { activeJob3, JOB3 } from "../../data/jobs3";
import { shrinkFit } from "../../ui";

type DetailRow = {
	label: string;
	now: string;
	next?: string;
	section?: boolean;
};
/** Rows for the skill detail panel: the skill this node powers (all rows), other skills / stats that this level changes. */
export function nodeDetail(
	s: ReturnType<typeof save>,
	n: TreeNode,
	tier2: boolean | 3 = false,
): { rows: DetailRow[]; note: string } {
	const key = tier2 === 3 ? "job3Tree" : tier2 ? "job2Tree" : "jobTree";
	const t = s[key] ?? {},
		lv = t[n.id] ?? 0,
		job = s.job;
	const withTree = (tree: Record<string, number>) => ({ ...s, [key]: tree });
	const stOf = (tree: Record<string, number>) => heroStats(withTree(tree));
	const nowT = t,
		nextT = lv < n.max ? { ...t, [n.id]: lv + 1 } : undefined;
	const stNow = stOf(nowT),
		stNext = nextT ? stOf(nextT) : undefined;
	const line = BRANCHES.find((x) => x.id === n.branch)?.line;
	const s2 = n.s2 ? skill2ById(n.s2) : undefined;
	type Sec = {
		name: string;
		info: (st: Stats, tree: Record<string, number>) => InfoRow[] | null;
		all: boolean;
	};
	const picked = (tree: Record<string, number>) =>
		skill2Picked(tier2 ? (s.jobTree ?? {}) : tree, job);
	const secs: Sec[] = [
		{
			name:
				s.job2 === "sage"
					? `${SAGE_S1.icon} ทักษะ 1: ${SAGE_S1.name}`
					: `${JOBS[job].auto.icon} ทักษะ 1: ${JOBS[job].auto.name}`,
			info: (st, tree) => autoInfo(job, st, s.job2, { str: totalBase(withTree(tree)).str, baseLv: s.baseLevel }),
			all: line === "s1",
		},
		...(job === "cleric"
			? [
					{
						name: "🌄 รุ่งอรุณ (passive · ตีธรรมดา/คอมโบ)",
						info: (st: Stats, tree: Record<string, number>) => {
							const x = dawnInfo(st, totalBase(withTree(tree)));
							return x.length ? x : null;
						},
						all: n.branch === "cleric_d",
					},
				]
			: []),
		{
			name:
				s.job2 === "crusader"
					? "✨ Ult: Grand Cross"
					: s.job2 === "monk"
						? stNow.j2Asura > 0
							? "💥 Ult: อาชูร่าสไตรก์"
							: stNext && stNext.j2Asura > 0
								? "🔔 → 💥 Ult: อาชูร่าสไตรก์"
								: "🔔 Ult: Tempest Bell"
						: `${JOBS[job].ult.icon} Ult: ${JOBS[job].ult.name}`,
			info: (st, tree) => ultInfo(job, st, totalBase(withTree(tree)), s.job2),
			all:
				line === "ult" ||
				(tier2 && n.branch.endsWith("_u2")) ||
				(tier2 === 3 && n.branch.endsWith("_u3")),
		},
		...(s.job2 === "crusader" || s.job2 === "monk" // M3: ทักษะ 3 numbers (+ Paladin / Champion variants)
			? [
					{
						name: s.job2 === "crusader" ? "✝️ ทักษะ 3: Holy Cross" : "⚡ ทักษะ 3: Falling Thunder",
						info: (st: Stats) => skill3Info(s.job2 ?? "", st),
						all: !!tier2 && n.branch.endsWith("_s3"),
					},
				]
			: []),
		{
			name: `${(s2 ?? picked(t))?.icon ?? "🔀"} ทักษะ 2: ${(s2 ?? picked(t))?.name ?? ""}`,
			all: !!s2,
			info: (st, tree) => {
				const k = s2 ?? picked(tree);
				return k && (tree[k.id] ?? 0) > 0 ? skill2Info(k, st) : null;
			},
		},
	];
	const isSageBranch =
		n.id.startsWith("sg_") ||
		n.id.startsWith("pf_") ||
		n.branch.startsWith("sage_");
	if (isSageBranch) {
		const S = KIT2.sage,
			P3 = KIT3.professor;
		const bNow = totalBase(s);
		const pc = (x: number) => `${Math.round(x * 100)}%`;
		if (n.branch === "sage_s3" || n.id === "pf_l4" || n.id === "pf_p2") {
			secs.push({
				name:
					activeJob3(s) === "professor"
						? `${JOB3.professor.variants[s.job3Var ?? "a"].icon} ทักษะ 3: ${JOB3.professor.variants[s.job3Var ?? "a"].name}`
						: "🗡️ ทักษะ 3: Endow",
				all: true,
				info: (st) => [
					{
						label: "ใช้ · คูลดาวน์",
						value: `Mana ${S.endowCost} · ${S.endowCd} เทิร์น`,
					},
					{
						label: "ระยะเวลา",
						value:
							st.j2EndowWave > 0
								? "ทั้งเวฟ (ถาวร)"
								: `${S.endowTurns + st.j2EndowTurns} เทิร์น`,
					},
					{
						label: "เสริมแรงตี/Auto/เวทเสริม",
						value: `+${pc(S.endowAmp + st.j2EndowAmp)} · โอกาสติด +${pc(S.endowPerkChance)}`,
					},
				],
			});
		}
		if (n.branch === "sg_a") {
			secs.push({
				name: "📖 Auto Spell",
				all: true,
				info: (st) => [
					{
						label: "โอกาสติดเมื่อตีปกติ",
						value: `${pc(sageAutoChance(st, bNow.int, false))} (Endow: ${pc(sageAutoChance(st, bNow.int, true))})`,
					},
					{
						label: "จำนวนลูก · แรง",
						value: `${1 + st.j2AutoBolts} ลูก · ${pc(S.autoMul + st.j2AutoMul)} พลังเวท`,
					},
					{
						label: "คริเวทเสริม (Auto/On-Hit)",
						value: `โอกาส ${pc(st.spellCrit)} · ดาเมจคริ +${pc(st.procCritMul)}`,
					},
				],
			});
		}
		if (n.branch === "sg_f") {
			secs.push({
				name: "🔥 Fire Bolt on Hit",
				all: true,
				info: (st) =>
					st.j2FirePerk > 0
						? [
								{
									label: "โอกาสติด (ธาตุหลัก / รอง)",
									value: `${pc(sageFireChance(st, bNow.int, "fire", false))} / ${pc(sageFireChance(st, bNow.int, "ice", false))}`,
								},
								{
									label: "โบนัสความแรง Fire Bolt",
									value: `+${pc(st.j2FireDmg)} (สูงสุด ${S.perk.fireMaxBolts} ลูก)`,
								},
							]
						: [{ label: "สถานะ", value: "ยังไม่เรียน" }],
			});
		}
		if (n.branch === "sg_l") {
			secs.push({
				name: "⚡ Chain Lightning on Hit",
				all: true,
				info: (st) =>
					st.j2LightPerk > 0
						? [
								{
									label: "โอกาสติด (ธาตุหลัก / รอง)",
									value: `${pc(sageLightChance(st, bNow.int, "lightning", false))} / ${pc(sageLightChance(st, bNow.int, "fire", false))}`,
								},
								{
									label: "จำนวนเป้า · โบนัสแรง",
									value: `${S.perk.lightTargetsBase + (st.j2LightPerk >= 3 ? 1 : 0)} เป้า (เดี่ยว ×4) · +${pc(st.j2LightDmg)}`,
								},
							]
						: [{ label: "สถานะ", value: "ยังไม่เรียน" }],
			});
		}
		if (n.branch === "sg_i") {
			secs.push({
				name: "❄️ Permafrost on Hit",
				all: true,
				info: (st) =>
					st.j2IcePerk > 0
						? [
								{
									label: "โอกาสติด (ธาตุหลัก / รอง)",
									value: `${pc(sageIceChance(st, "ice", false))} / ${pc(sageIceChance(st, "fire", false))}`,
								},
								{
									label: "โบนัสแรงแตก",
									value: `+${pc(st.j2IceDmg)} (ครบ ${S.perk.iceMax} ขั้น แตก+แช่แข็ง)`,
								},
							]
						: [{ label: "สถานะ", value: "ยังไม่เรียน" }],
			});
		}
		if (n.branch === "sg_r") {
			secs.push({
				name: "🛡️ Magic Rod",
				all: true,
				info: (st) => {
					const rod = sageRodGain(st, bNow.vit);
					return st.j2MagicRod > 0
						? [
								{
									label: "ดูดเวทเป็น Mana / โล่",
									value: `+${rod.mana} Mana · +${rod.shield} โล่`,
								},
							]
						: [{ label: "สถานะ", value: "ยังไม่เรียน" }];
				},
			});
		}
		if (n.id.startsWith("pf_")) {
			const t2 = s.job2Tree ?? {};
			const fPts = branchPts(t2, "sg_f"),
				lPts = branchPts(t2, "sg_l"),
				iPts = branchPts(t2, "sg_i"),
				aPts = branchPts(t2, "sg_a");
			secs.push({
				name: "🎓 ปฏิกิริยาธาตุ & ตำนานขั้น 2",
				all: true,
				info: (st) => [
					{
						label: "Double Casting",
						value: `Mana ≥ ${pc(doubleCastAt(st))} · ยิงซ้ำ ${pc(doubleCastMul(st))} (ธาตุรอง ${pc(profOffMul(st))})`,
					},
					{
						label: "พลังเวทปฏิกิริยา (ฐาน)",
						value: `~${Math.round(magicPower(st) * P3.vapMul)} (♨️) / ~${Math.round(magicPower(st) * P3.ovlMul)} (💥) / ~${Math.round(magicPower(st) * P3.supMul)} (🧲)`,
					},
					{
						label: "แต้มขั้น 2 ปัจจุบัน",
						value: `🔥${fPts} · ⚡${lPts} · ❄️${iPts} · 📖${aPts}`,
					},
				],
			});
		}
	}
	const rows: DetailRow[] = [];
	for (const sec of secs) {
		const a = sec.info(stNow, nowT),
			z = stNext && nextT ? sec.info(stNext, nextT) : undefined;
		if (!a && !z) continue;
		const labels = [
			...new Set([...(a ?? []), ...(z ?? [])].map((r) => r.label)),
		];
		const val = (list: InfoRow[] | null | undefined, l: string) =>
			list?.find((r) => r.label === l)?.value ?? "−";
		const out = labels
			.map((l) => ({
				label: l,
				now: a ? val(a, l) : "ยังไม่เรียน",
				next: z === undefined ? undefined : val(z, l),
			}))
			.filter((r) => sec.all || (r.next !== undefined && r.next !== r.now));
		if (out.length)
			rows.push({ label: sec.name, now: "", section: true }, ...out);
	}
	if (stNext) {
		const a = derivedRows(stNow),
			z = derivedRows(stNext);
		if (stNow.doubleAtk !== stNext.doubleAtk) {
			a.push([
				"โอกาส Double Strike",
				`${Math.round(doubleAtkChance(stNow.doubleAtk) * 100)}%`,
			]);
			z.push([
				"โอกาส Double Strike",
				`${Math.round(doubleAtkChance(stNext.doubleAtk) * 100)}%`,
			]);
		}
		const ch = a
			.map(([k, v], i) => ({ label: k, now: v, next: z[i][1] }))
			.filter((r) => r.now !== r.next);
		if (ch.length)
			rows.push(
				{ label: "📊 ค่าสถานะที่เปลี่ยน", now: "", section: true },
				...ch,
			);
	}
	return {
		rows,
		note: `คำนวณจากค่าตอนนี้: P.ATK ${Math.round(stNow.atk * stNow.minPct)}~${Math.round(stNow.atk)} · M.ATK ${Math.round(stNow.matk)} · HP ${stNow.maxHp} · ดาเมจก่อนหัก DEF มอน ไม่รวมพร/รีลิกในดัน · ตัวเลขเขียว = เปลี่ยนเมื่อลงเพิ่ม 1 แต้ม`,
	};
}

export const clip = (t: string, n: number) =>
	t.length > n ? t.slice(0, n - 1) + "…" : t;
/** Shrink a text object's font size so it fits within maxW pixels without truncating with "…". */
export function clipW(t: Phaser.GameObjects.Text, maxW: number) {
	if (t.width <= maxW) return t;
	return shrinkFit(t, Number.POSITIVE_INFINITY, 8.5, maxW);
}
