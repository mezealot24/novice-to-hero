import { COLORS } from "../../data/game-data";
import {
	job3Lock,
	persist,
	resetTree3,
	setJob3Variant,
} from "../../save";
import {
	HYBRID_MAX_TIER,
	lockReason3,
	tree3Spent,
	web3Scope,
	nodeById,
	nodesOf,
} from "../../data/tree";
import { JOB3_RULES } from "../../data/jobs3";
import {
	button,
	go,
	panel,
	toast,
	txt,
	UI,
} from "../../ui";
import { clipW } from "./node-detail";
import {
	drawEvolutionConduit,
	drawSkillNode,
} from "./skill-node";
import type { WebBuild } from "./web-build";
import type { CharacterScene } from "../CharacterScene";

export function buildTier3(scene: CharacterScene, w: WebBuild) {
	const {
		s,
		t3,
		j2,
		j3Def,
		isJ3Active,
		path,
		scrollC,
		spineG,
		x0,
		wAll,
		nh,
		ult2CenterX,
		t2BottomY,
	} = w;
	let curY = w.curY;

	// ==================== TIER 3: 3RD CLASS AWAKENING WEB ====================
	scene.tierOffsets[2] = Math.max(0, curY - 38);
	const t3Header = scene.add.graphics();
	t3Header
		.fillStyle(isJ3Active ? 0x2f2238 : 0x1a1c30, 0.96)
		.fillRoundedRect(x0 - 2, curY, wAll + 4, 30, 7);
	t3Header
		.lineStyle(1.5, isJ3Active ? COLORS.gold : UI.lineHi, 0.9)
		.strokeRoundedRect(x0 - 2, curY, wAll + 4, 30, 7);
	scrollC.add(t3Header);

	if (j3Def) {
		const spent3 = tree3Spent(t3, j3Def.id);
		const vKey = s.job3Var ?? "a",
			vObj = j3Def.variants[vKey];
		const lock3 = isJ3Active ? "" : job3Lock(s, j3Def.id);
		scrollC.add(
			clipW(
				txt(
					scene,
					x0 + 8,
					curY + 6,
					`3️⃣ ขั้น 3: ${j3Def.icon} ${j3Def.name} ${isJ3Active ? `(Job3 Lv ${s.job3Level ?? 1}/${JOB3_RULES.maxJobLevel} · ${path === "hybrid" ? "👊Hybrid" : `${j3Def.icon}Pure`})` : `🔒 ${lock3}`}`,
					11.5,
					isJ3Active ? UI.gold : "#ffd984",
					true,
				),
				350,
			),
		);
		if (isJ3Active) {
			scrollC.add(
				button(
					scene,
					x0 + wAll - 224,
					curY + 15,
					76,
					22,
					`${vObj.icon} แบบ ${vKey.toUpperCase()}`,
					() => {
						setJob3Variant(vKey === "a" ? "b" : "a");
						toast(
							scene,
							`สลับเป็น ${j3Def.variants[s.job3Var!].icon} ${j3Def.variants[s.job3Var!].name}`,
						);
						scene.redraw();
					},
					{ size: 10, fill: 0x4a5a8a, color: UI.text },
				),
			);
			scrollC.add(
				button(
					scene,
					x0 + wAll - 140,
					curY + 15,
					80,
					22,
					"⚙️ สาย/ตื่นรู้",
					() => go(scene, "job", { job3: true }),
					{ size: 10, fill: 0x4a5a8a, color: UI.text },
				),
			);
			scrollC.add(
				button(
					scene,
					x0 + wAll - 48,
					curY + 15,
					88,
					22,
					"↺ รีเซ็ตขั้น 3",
					() => {
						const back = resetTree3(s);
						s.job3Points = (s.job3Points ?? 0) + back;
						persist();
						toast(scene, `คืน ${back} แต้มใยชั้น 3 แล้ว`);
						scene.redraw();
					},
					{ size: 10, fill: 0x5a5f8a, color: UI.text },
				).setEnabled(spent3 > 0),
			);
		} else {
			scrollC.add(
				button(
					scene,
					x0 + wAll - 60,
					curY + 15,
					110,
					22,
					"⚔️ ข้อมูลตื่นรู้",
					() => go(scene, "job", { job3: true }),
					{ size: 10, fill: 0x4a5a8a, color: UI.text },
				),
			);
		}
		curY += 34;

		const rawBrs3 = web3Scope(j3Def.id, path);
		// Align `<j3>_u3` with the Ultimate Spine (index 2 on pure 4-column layout)
		const u3Br = rawBrs3.find((b) => b.id.endsWith("_u3"));
		const otherBrs3 = rawBrs3.filter((b) => !b.id.endsWith("_u3"));
		const brs3 = [
			...otherBrs3.slice(0, 2),
			...(u3Br ? [u3Br] : []),
			...otherBrs3.slice(2),
		];
		const cols3 = brs3.map((br) =>
			nodesOf(br.id).filter(
				(n) => path !== "hybrid" || n.tier <= HYBRID_MAX_TIER || n.kind,
			),
		);
		const gap3 = 6,
			cw3 = (wAll - gap3 * (cols3.length - 1)) / cols3.length,
			rh3 = 62;
		const t3PanelH = 278,
			top3 = curY + 26;
		const pos3 = new Map<string, { x: number; y: number; isUlt?: boolean }>();
		let ult3CenterX = ult2CenterX;
		let legCenterX = x0 + cw3 / 2;

		cols3.forEach((c, i) => {
			const x = x0 + i * (cw3 + gap3),
				br = brs3[i];
			const isUlt3 = br.id.endsWith("_u3");
			if (isUlt3) ult3CenterX = x + cw3 / 2;
			if (br.id.endsWith("_l")) legCenterX = x + cw3 / 2;
			scrollC.add(
				panel(
					scene,
					x - 2,
					curY,
					cw3 + 4,
					t3PanelH,
					isUlt3 ? 0x261a36 : br.job3 ? 0x16192e : 0x1f172c,
					isUlt3 ? COLORS.gold : UI.line,
					8,
				),
			);
			const hG = scene.add.graphics();
			hG.fillStyle(isUlt3 ? 0x3b2818 : 0x232948, 0.95).fillRoundedRect(
				x - 1,
				curY + 1,
				cw3 + 2,
				22,
				6,
			);
			hG.lineStyle(
				1,
				isUlt3 ? COLORS.gold : UI.lineHi,
				0.7,
			).strokeRoundedRect(x - 1, curY + 1, cw3 + 2, 22, 6);
			scrollC.add(hG);
			scrollC.add(
				clipW(
					txt(
						scene,
						x + 4,
						curY + 4,
						`${isUlt3 ? "🔥 " : ""}${br.icon} ${br.name}`,
						10.5,
						isUlt3 ? "#ffe994" : br.job3 ? UI.gold : UI.sub,
						true,
					),
					cw3 - 6,
				),
			);
			c.forEach((n) =>
				pos3.set(n.id, {
					x,
					y: top3 + (n.kind ? 0 : n.tier - 1) * rh3,
					isUlt: isUlt3,
				}),
			);
		});

		drawEvolutionConduit(
			spineG,
			x0 + wAll * 0.35,
			t2BottomY,
			legCenterX,
			curY,
			0xb88cff,
			isJ3Active,
			"⚜️ แต้มใยชั้น 2 → โบนัสสายตำนาน",
		);
		drawEvolutionConduit(
			spineG,
			ult2CenterX,
			t2BottomY,
			ult3CenterX,
			curY,
			COLORS.gold,
			isJ3Active,
			"🔥 รวมพลัง Ult ขั้น 1+2 → Awakening",
		);

		const edgeG3 = scene.add.graphics();
		scrollC.add(edgeG3);
		for (const [id, p] of pos3) {
			const n = nodeById(id)!,
				pp = n.parent ? pos3.get(n.parent) : undefined;
			if (pp) {
				const active = (t3[id] ?? 0) > 0;
				edgeG3
					.lineStyle(active ? 3 : 2, active ? COLORS.gold : 0x2e3558, 1)
					.lineBetween(pp.x + cw3 / 2, pp.y + nh, p.x + cw3 / 2, p.y);
				if (active)
					edgeG3
						.lineStyle(1, 0xfff6c7, 0.8)
						.lineBetween(pp.x + cw3 / 2, pp.y + nh, p.x + cw3 / 2, p.y);
			}
		}
		for (const [id, p] of pos3) {
			const n = nodeById(id)!,
				lv = t3[id] ?? 0;
			const why = isJ3Active
				? lockReason3(t3, s.job, n, j3Def.id, path)
				: `ปลดล็อกเมื่อตื่นรู้เป็น ${j3Def.name}`;
			const open = isJ3Active && (!why || why === "เต็มแล้ว"),
				star = n.tier === 4,
				sel = id === scene.selNode;
			drawSkillNode(
				scene,
				scrollC,
				p.x,
				p.y,
				cw3,
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
		curY += t3PanelH + 16;
	} else {
		curY += 34;
		drawEvolutionConduit(
			spineG,
			ult2CenterX,
			t2BottomY,
			ult2CenterX,
			curY,
			COLORS.gold,
			false,
			"🔥 รอปลุกพลัง Ult ขั้น 3",
		);
		scrollC.add(panel(scene, x0, curY, wAll, 90, 0x16192e, UI.line, 10));
		scrollC.add(
			txt(
				scene,
				x0 + wAll / 2,
				curY + 26,
				`🔒 อาชีพขั้น 3 (Awakening) ของ ${j2.icon} ${j2.name} กำลังพัฒนาค่ะ`,
				14,
				UI.gold,
				true,
			).setOrigin(0.5),
		);
		scrollC.add(
			txt(
				scene,
				x0 + wAll / 2,
				curY + 52,
				"ระหว่างนี้สามารถใช้แต้มขั้น 2 อัปสกิลขั้น 1 เพื่อเปิดโบนัส Scalable Skill ได้เลย!",
				12,
				UI.sub,
			).setOrigin(0.5),
		);
		curY += 106;
	}

	w.curY = curY;
}
