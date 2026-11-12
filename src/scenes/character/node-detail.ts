import Phaser from "phaser";
import { doubleAtkChance, type Stats } from "../../data/game-data";
import { derivedRows } from "../../data/stat-rows";
import {
	autoInfo,
	dawnInfo,
	skill2Info,
	ultInfo,
	type InfoRow,
} from "../../data/skill-math";
import { skill2ById } from "../../data/skill2";
import { heroStats, totalBase } from "../../data/meta";
import { save } from "../../save";
import { BRANCHES, skill2Picked, type TreeNode } from "../../data/tree";
import { JOBS } from "../../data/jobs";

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
			name: `${JOBS[job].auto.icon} ทักษะ 1: ${JOBS[job].auto.name}`,
			info: (st) => autoInfo(job, st),
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
		{
			name: `${(s2 ?? picked(t))?.icon ?? "🔀"} ทักษะ 2: ${(s2 ?? picked(t))?.name ?? ""}`,
			all: !!s2,
			info: (st, tree) => {
				const k = s2 ?? picked(tree);
				return k && (tree[k.id] ?? 0) > 0 ? skill2Info(k, st) : null;
			},
		},
	];
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
/** Clip a text object to maxW pixels with an ellipsis (pixel-based: Thai vowel / tone marks take no width). */
export function clipW(t: Phaser.GameObjects.Text, maxW: number) {
	if (t.width <= maxW) return t;
	const full = t.text;
	let lo = 0,
		hi = full.length;
	while (lo < hi) {
		const m = (lo + hi + 1) >> 1;
		t.setText(full.slice(0, m) + "…");
		if (t.width <= maxW) lo = m;
		else hi = m - 1;
	}
	return t.setText(full.slice(0, lo) + "…");
}
