import { COLORS } from "../../data/game-data";
import {
	job2Lock,
	persist,
	resetTree2,
} from "../../save";
import {
	branches2Of,
	tree2Spent,
	lockReason,
	nodeById,
	nodesOf,
} from "../../data/tree";
import {
	JOB2_RULES,
	PETS,
	type PetId,
} from "../../data/jobs2";
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

const BRANCH_PET: Record<string, PetId> = {
	bm_h: "hawk",
	bm_b: "boar",
	bm_w: "wolf",
}; // Beastmaster ใยชั้น 2 branch -> its pet

export function buildTier2(scene: CharacterScene, w: WebBuild) {
	const {
		s,
		t2,
		j2,
		j2Options,
		scrollC,
		spineG,
		x0,
		wAll,
		nh,
		ult1CenterX,
		s1CenterX,
		t1BottomY,
	} = w;
	let curY = w.curY;

	// ==================== TIER 2: 2ND CLASS WEB ====================
	scene.tierOffsets[1] = Math.max(0, curY - 38);
	const spent2 = tree2Spent(t2, j2.id);
	const t2Unlocked = !!s.job2;
	const t2Header = scene.add.graphics();
	t2Header
		.fillStyle(t2Unlocked ? 0x271e42 : 0x1a1c30, 0.96)
		.fillRoundedRect(x0 - 2, curY, wAll + 4, 30, 7);
	t2Header
		.lineStyle(1.5, t2Unlocked ? COLORS.gold : UI.lineHi, 0.9)
		.strokeRoundedRect(x0 - 2, curY, wAll + 4, 30, 7);
	scrollC.add(t2Header);

	if (t2Unlocked) {
		scrollC.add(
			clipW(
				txt(
					scene,
					x0 + 8,
					curY + 6,
					`2️⃣ ขั้น 2: ${j2.icon} ${j2.name} (Job2 Lv ${s.job2Level ?? 1}/${JOB2_RULES.maxJobLevel}) · ${j2.signature.icon}${j2.signature.name} · ลงแล้ว ${spent2} แต้ม`,
					11.5,
					UI.gold,
					true,
				),
				410,
			),
		);
		scrollC.add(
			button(
				scene,
				x0 + wAll - 144,
				curY + 15,
				92,
				22,
				`🔄 สาย 💎${JOB2_RULES.repickGems}`,
				() => go(scene, "job", { job2: true }),
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
				"↺ รีเซ็ตขั้น 2",
				() => {
					const back = resetTree2(s);
					s.job2Points = (s.job2Points ?? 0) + back;
					persist();
					toast(scene, "คืนแต้มใยชั้น 2 ครบทุกกระเป๋าแล้วค่ะ");
					scene.redraw();
				},
				{ size: 10, fill: 0x5a5f8a, color: UI.text },
			).setEnabled(spent2 > 0),
		);
	} else {
		const lockTxt = job2Lock(s);
		scrollC.add(
			clipW(
				txt(
					scene,
					x0 + 8,
					curY + 6,
					`2️⃣ ขั้น 2 (ส่องล่วงหน้า): ${j2.icon} ${j2.name} · ${lockTxt ? `🔒 ${lockTxt}` : "✅ พร้อมเปลี่ยนอาชีพ!"}`,
					11.5,
					"#ffd984",
					true,
				),
				420,
			),
		);
		if (j2Options.length > 1) {
			const other = j2Options[(scene.previewJob2Idx + 1) % j2Options.length];
			scrollC.add(
				button(
					scene,
					x0 + wAll - 64,
					curY + 15,
					120,
					22,
					`👁️ สลับดู ${other.icon}${other.name}`,
					() => {
						scene.previewJob2Idx =
							(scene.previewJob2Idx + 1) % j2Options.length;
						scene.render();
					},
					{ size: 10, fill: 0x4a5a8a, color: UI.text },
				),
			);
		}
	}
	curY += 34;

	// Arrange Tier 2 branches so `<j2>_s3` is column 0, regular branches in middle, and `<j2>_u2` (Ult วิวัฒน์) aligns near the Ultimate Spine!
	const rawBrs2 = branches2Of(j2.id);
	const s3Br = rawBrs2.find((b) => b.id.endsWith("_s3"));
	const u2Br = rawBrs2.find((b) => b.id.endsWith("_u2"));
	const midBrs2 = rawBrs2.filter(
		(b) => !b.id.endsWith("_s3") && !b.id.endsWith("_u2"),
	);
	// Place u2Br at index 3 (out of 5 columns: s3, mid0, mid1, u2, mid2) so it lines up vertically under Tier 1 Ult column!
	const brs2 = [
		...(s3Br ? [s3Br] : []),
		...midBrs2.slice(0, 2),
		...(u2Br ? [u2Br] : []),
		...midBrs2.slice(2),
	];
	const cols2 = brs2.map((br) => nodesOf(br.id));
	const gap2 = 7,
		cw2 = (wAll - gap2 * (cols2.length - 1)) / cols2.length,
		rh2 = 62;
	const t2PanelH = 294;
	const top2 = curY + 26;
	const pos2 = new Map<string, { x: number; y: number; isUlt?: boolean }>();
	let ult2CenterX = ult1CenterX;
	let s3CenterX = s1CenterX;

	cols2.forEach((c, i) => {
		const x = x0 + i * (cw2 + gap2),
			br = brs2[i];
		const isUlt2 = br.id.endsWith("_u2");
		if (isUlt2) ult2CenterX = x + cw2 / 2;
		if (br.id.endsWith("_s3")) s3CenterX = x + cw2 / 2;
		scrollC.add(
			panel(
				scene,
				x - 2,
				curY,
				cw2 + 4,
				t2PanelH,
				isUlt2 ? 0x241934 : 0x16192e,
				isUlt2 ? COLORS.gold : UI.line,
				8,
			),
		);
		const hG = scene.add.graphics();
		hG.fillStyle(isUlt2 ? 0x3b2818 : 0x232948, 0.95).fillRoundedRect(
			x - 1,
			curY + 1,
			cw2 + 2,
			22,
			6,
		);
		hG.lineStyle(1, isUlt2 ? COLORS.gold : UI.lineHi, 0.7).strokeRoundedRect(
			x - 1,
			curY + 1,
			cw2 + 2,
			22,
			6,
		);
		scrollC.add(hG);
		scrollC.add(
			clipW(
				txt(
					scene,
					x + 4,
					curY + 4,
					`${isUlt2 ? "🔥 " : ""}${br.icon} ${br.name}`,
					10.5,
					isUlt2 ? "#ffe994" : UI.gold,
					true,
				),
				cw2 - 6,
			),
		);
		const under = c.some((n) => n.kind) ? 1 : 0;
		c.forEach((n) =>
			pos2.set(n.id, {
				x,
				y: top2 + (n.kind ? 0 : n.tier - 1 + under) * rh2,
				isUlt: isUlt2,
			}),
		);

		const pet =
			t2Unlocked && j2.id === "beastmaster" ? BRANCH_PET[br.id] : undefined;
		if (pet) {
			const cur = (s.pet ?? "hawk") === pet,
				evo = (t2[`${br.id}4`] ?? 0) > 0,
				narrow = cw2 < 110;
			const label = narrow
				? `${cur ? "✅" : "🐾"} ${PETS[pet].icon}`
				: cur
					? `✅ คู่หูพราน: ${PETS[pet].icon} ${evo ? PETS[pet].evo : PETS[pet].name}`
					: `🏹 ตั้งคู่หูพราน ${PETS[pet].icon}`;
			scrollC.add(
				button(
					scene,
					x + cw2 / 2,
					curY + t2PanelH - 18,
					cw2 - 10,
					26,
					label,
					() => {
						if (cur) return;
						s.pet = pet;
						persist();
						toast(
							scene,
							`🏹 คู่หูพราน: ${PETS[pet].icon} ${PETS[pet].name} (★ พรานแห่งป่า: ฮีโร่คริ → ตัวนี้ตีซ้ำ) · สัตว์ทั้ง 3 ตัวสู้ทุกเวฟเสมอ`,
						);
						scene.render();
					},
					{
						size: 11,
						fill: cur ? COLORS.gold : 0x4a5a8a,
						color: cur ? UI.ink : UI.text,
					},
				),
			);
		}
	});

	// Draw Cross-Class Energy Bridges from Tier 1 -> Tier 2 (Skill 1 -> Skill 3 AND Ultimate Spine 1 -> Ultimate Spine 2)
	drawEvolutionConduit(
		spineG,
		s1CenterX,
		t1BottomY,
		s3CenterX,
		curY,
		0x5bc0ff,
		t2Unlocked,
		"⚡ ต่อยอดทักษะ 1 → 3",
	);
	drawEvolutionConduit(
		spineG,
		ult1CenterX,
		t1BottomY,
		ult2CenterX,
		curY,
		COLORS.gold,
		t2Unlocked,
		"🔥 สืบทอดพลัง Ult ขั้น 1 → 2",
	);

	const edgeG2 = scene.add.graphics();
	scrollC.add(edgeG2);
	for (const [id, p] of pos2) {
		const n = nodeById(id)!,
			pp = n.parent ? pos2.get(n.parent) : undefined;
		if (pp) {
			const active = (t2[id] ?? 0) > 0;
			edgeG2
				.lineStyle(active ? 3 : 2, active ? COLORS.gold : 0x2e3558, 1)
				.lineBetween(pp.x + cw2 / 2, pp.y + nh, p.x + cw2 / 2, p.y);
			if (active)
				edgeG2
					.lineStyle(1, 0xfff6c7, 0.8)
					.lineBetween(pp.x + cw2 / 2, pp.y + nh, p.x + cw2 / 2, p.y);
		}
	}
	for (const [id, p] of pos2) {
		const n = nodeById(id)!,
			lv = t2[id] ?? 0;
		const why = t2Unlocked
			? lockReason(t2, s.job, n, j2.id)
			: `ปลดล็อกเมื่อเปลี่ยนอาชีพเป็น ${j2.name}`;
		const open = t2Unlocked && (!why || why === "เต็มแล้ว"),
			star = n.tier === 4,
			sel = id === scene.selNode;
		drawSkillNode(
			scene,
			scrollC,
			p.x,
			p.y,
			cw2,
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

	const t2BottomY = curY + t2PanelH;
	curY = t2BottomY + 42;

	w.curY = curY;
	w.ult2CenterX = ult2CenterX;
	w.t2BottomY = t2BottomY;
}
