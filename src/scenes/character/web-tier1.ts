import { COLORS } from "../../data/game-data";
import {
	persist,
	resetTree,
} from "../../save";
import {
	branchesOf,
	lockReason,
	nodeById,
	nodesOf,
	TREE_RULES,
	treeSpent,
} from "../../data/tree";
import {
	button,
	panel,
	toast,
	txt,
	UI,
} from "../../ui";
import { clipW } from "./node-detail";
import { drawSkillNode } from "./skill-node";
import type { WebBuild, Col1 } from "./web-build";
import type { CharacterScene } from "../CharacterScene";

export function buildTier1(scene: CharacterScene, w: WebBuild) {
	const { s, job, t1, scrollC, x0, wAll, nh, rh } = w;
	let curY = w.curY;

	// ==================== TIER 1: BASE CLASS WEB ====================
	scene.tierOffsets[0] = 0;
	const spent1 = treeSpent(t1, s.job);
	const t1Header = scene.add.graphics();
	t1Header
		.fillStyle(0x1f2748, 0.96)
		.fillRoundedRect(x0 - 2, curY, wAll + 4, 28, 7);
	t1Header
		.lineStyle(1.5, COLORS.gold, 0.85)
		.strokeRoundedRect(x0 - 2, curY, wAll + 4, 28, 7);
	scrollC.add(t1Header);
	scrollC.add(
		txt(
			scene,
			x0 + 8,
			curY + 5,
			`1️⃣ ขั้น 1: ${job.icon} ${job.name} (Job Lv ${s.jobLevel}) · ลงแล้ว ${spent1} แต้ม · ★ ได้ ${TREE_RULES.capstones} ดวง`,
			12,
			UI.gold,
			true,
		),
	);
	scrollC.add(
		button(
			scene,
			x0 + wAll - 48,
			curY + 14,
			88,
			22,
			"↺ รีเซ็ตขั้น 1",
			() => {
				const back = resetTree(s);
				s.skillPoints += back;
				persist();
				toast(scene, "คืนแต้มใยชั้น 1 ครบทุกกระเป๋าแล้วค่ะ");
				scene.redraw();
			},
			{ size: 10.5, fill: 0x5a5f8a, color: UI.text },
		).setEnabled(spent1 > 0),
	);
	curY += 32;

	const cols1: Col1[] = [],
		groups1: { name: string; from: number; to: number; isUlt?: boolean }[] =
			[];
	const brs1 = branchesOf(s.job);
	const lineCols1 = (line: "s1" | "ult", name: string) => {
		const from = cols1.length;
		const root = nodesOf(`${s.job}_${line}`)[0];
		const subs = brs1.filter(
			(x) => x.line === line && x.id !== `${s.job}_${line}`,
		);
		cols1.push({
			group: name,
			isUlt: line === "ult",
			isS1: line === "s1",
			cells: [{ n: root, row: 0 }],
		});
		subs.forEach((br, i) => {
			const cells = nodesOf(br.id).map((n) => ({ n, row: n.tier }));
			if (i === 0) cols1[from].cells.push(...cells);
			else
				cols1.push({
					group: name,
					isUlt: line === "ult",
					isS1: line === "s1",
					cells,
				});
		});
		groups1.push({ name, from, to: cols1.length - 1, isUlt: line === "ult" });
	};
	lineCols1("s1", `${job.auto.icon} ทักษะ 1`);
	{
		const from = cols1.length;
		const s2 = nodesOf(`${s.job}_s2`),
			gate = s2.find((n) => !n.kind),
			dy = gate ? 1 : 0;
		for (const r of s2.filter((n) => n.kind === "s2root"))
			cols1.push({
				group: "s2",
				cells: s2
					.filter((n) => n.s2 === r.s2)
					.map((n) => ({ n, row: n.tier + dy })),
			});
		if (gate) cols1[from + 1].cells.unshift({ n: gate, row: 0 });
		groups1.push({
			name: gate
				? `${gate.icon} ${gate.name} → ทักษะ 2`
				: "🔀 ทักษะ 2 (เลือก 1)",
			from,
			to: cols1.length - 1,
		});
	}
	lineCols1("ult", `🔥 ${job.ult.icon} Ult (แกนสะสม)`);
	const core1 = brs1.filter((x) => x.line === "core");
	for (const br of core1) {
		cols1.push({
			group: "core",
			cells: nodesOf(br.id).map((n, i) => ({ n, row: i })),
		});
		groups1.push({
			name: `${br.icon} ${br.name}`,
			from: cols1.length - 1,
			to: cols1.length - 1,
		});
	}

	const gap1 = 5;
	const cw1 = Math.min(
		114,
		(wAll - gap1 * (cols1.length - 1)) / cols1.length,
	);
	const cx1 = (i: number) => x0 + i * (cw1 + gap1);
	const t1PanelH = 318;
	let ult1CenterX = x0 + wAll * 0.72;
	let s1CenterX = x0 + cw1 / 2;

	for (const g of groups1) {
		const gx = cx1(g.from),
			gw = cx1(g.to) + cw1 - gx;
		if (g.isUlt) ult1CenterX = gx + gw / 2;
		scrollC.add(
			panel(
				scene,
				gx - 2,
				curY,
				gw + 4,
				t1PanelH,
				g.isUlt ? 0x211932 : 0x16192e,
				g.isUlt ? COLORS.gold : UI.line,
				8,
			),
		);
		const hG = scene.add.graphics();
		hG.fillStyle(g.isUlt ? 0x3b2818 : 0x232948, 0.95).fillRoundedRect(
			gx - 1,
			curY + 1,
			gw + 2,
			22,
			6,
		);
		hG.lineStyle(1, g.isUlt ? COLORS.gold : UI.lineHi, 0.7).strokeRoundedRect(
			gx - 1,
			curY + 1,
			gw + 2,
			22,
			6,
		);
		scrollC.add(hG);
		scrollC.add(
			clipW(
				txt(
					scene,
					gx + 4,
					curY + 4,
					g.name,
					10.5,
					g.isUlt ? "#ffe994" : UI.gold,
					true,
				),
				gw - 6,
			),
		);
	}

	const pos1 = new Map<string, { x: number; y: number; isUlt?: boolean }>();
	const top1 = curY + 26;
	cols1.forEach((c, i) =>
		c.cells.forEach((q) =>
			pos1.set(q.n.id, { x: cx1(i), y: top1 + q.row * rh, isUlt: c.isUlt }),
		),
	);

	const edgeG1 = scene.add.graphics();
	scrollC.add(edgeG1);
	for (const [id, p] of pos1) {
		const n = nodeById(id)!,
			pp = n.parent ? pos1.get(n.parent) : undefined;
		if (!pp) continue;
		const active = (t1[id] ?? 0) > 0;
		edgeG1
			.lineStyle(active ? 3 : 2, active ? COLORS.gold : 0x2e3558, 1)
			.lineBetween(pp.x + cw1 / 2, pp.y + nh, p.x + cw1 / 2, p.y);
		if (active)
			edgeG1
				.lineStyle(1, 0xfff6c7, 0.8)
				.lineBetween(pp.x + cw1 / 2, pp.y + nh, p.x + cw1 / 2, p.y);
	}

	for (const [id, p] of pos1) {
		const n = nodeById(id)!,
			lv = t1[id] ?? 0,
			why = lockReason(t1, s.job, n),
			open = !why || why === "เต็มแล้ว";
		const star = n.tier === 4 || n.kind === "s2star",
			sel = id === scene.selNode;
		drawSkillNode(
			scene,
			scrollC,
			p.x,
			p.y,
			cw1,
			nh,
			n,
			lv,
			open,
			star,
			sel,
			() => {
				scene.selNode = id;
				scene.render();
			},
			!!p.isUlt,
		);
	}
	const t1BottomY = curY + t1PanelH;
	curY = t1BottomY + 42;

	w.curY = curY;
	w.cols1 = cols1;
	w.ult1CenterX = ult1CenterX;
	w.s1CenterX = s1CenterX;
	w.t1BottomY = t1BottomY;
}
