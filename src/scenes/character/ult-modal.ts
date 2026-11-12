import Phaser from "phaser";
import { COLORS, H, W } from "../../data/game-data";
import { save, totalCrossSpent } from "../../save";
import { SCALABLE_RULES, ultEvolutionSummary } from "../../data/tree";
import { activeJob3 } from "../../data/jobs3";
import { button, txt, UI } from "../../ui";
import type { CharacterScene } from "../CharacterScene";
import { clipW } from "./node-detail";

/** 🔥 รวมผล Ult popup: the old left sidebar card, scaled up and centered. */
export function ultModal(scene: CharacterScene) {
	const close = () => {
		scene.showUlt = false;
		scene.render();
	};
	const c = scene.add.container(0, 0).setDepth(30000);
	scene.modal = c;
	const dim = scene.add
		.rectangle(W / 2, H / 2, W, H, 0x080a18, 0.8)
		.setInteractive();
	dim.on("pointerup", close);
	c.add(dim);
	// sidebar art spans x 24..306, y 280..552 (center 165,416) -> scale around the screen center
	const k = Math.min(1.6, (H - 70) / 272);
	const inner = scene.add.container(W / 2 - 165 * k, H / 2 - 416 * k).setScale(k);
	inner.add(scene.add.zone(24, 280, 282, 272).setOrigin(0).setInteractive()); // swallow taps on the card
	drawUltEvolutionSidebar(scene, inner);
	c.add(inner);
	c.add(
		button(scene, W / 2 + 141 * k + 28, H / 2 - 136 * k + 18, 40, 36, "✕", close, {
			size: 17,
			fill: 0x5a5f8a,
			color: UI.text,
		}),
	);
}

/** Left sidebar card on the Skill Tree tab: shows how Ultimate accumulates Class 1 -> 2 -> 3 benefits + Scalable Milestones. */
export function drawUltEvolutionSidebar(scene: CharacterScene, c: Phaser.GameObjects.Container) {
	const s = save();
	const j3 = activeJob3(s);
	const crossPts = totalCrossSpent(s);
	const sum = ultEvolutionSummary(
		s.job,
		s.job2,
		j3,
		s.jobTree ?? {},
		s.job2Tree ?? {},
		s.job3Tree ?? {},
		crossPts,
	);

	const box = scene.add.graphics();
	box.fillStyle(0x14172b, 0.94).fillRoundedRect(24, 280, 282, 272, 10);
	box
		.lineStyle(1.5, UI.goldDark, 0.85)
		.strokeRoundedRect(24, 280, 282, 272, 10);
	c.add(box);

	c.add(
		clipW(
			txt(
				scene,
				32,
				286,
				`🔥 รวมผล Ult: ${sum.curIcon} ${sum.curName}`,
				13,
				UI.gold,
				true,
			),
			264,
		),
	);
	// 3 Cumulative Ultimate Tiers stacked with connecting vertical gold spine
	const spine = scene.add.graphics();
	spine.lineStyle(2, COLORS.gold, 0.65).lineBetween(40, 316, 40, 424);
	c.add(spine);

	sum.tiers.forEach((tr, idx) => {
		const ty = 310 + idx * 45;
		const cardG = scene.add.graphics();
		cardG
			.fillStyle(tr.active ? 0x1e2544 : 0x16192c, 0.92)
			.fillRoundedRect(30, ty, 270, 41, 7);
		cardG
			.lineStyle(1, tr.active ? COLORS.gold : 0x2e3558, tr.active ? 0.7 : 0.5)
			.strokeRoundedRect(30, ty, 270, 41, 7);
		c.add(cardG);
		c.add(
			clipW(
				txt(
					scene,
					36,
					ty + 3,
					`${tr.icon} ${tr.name}`,
					11,
					tr.active ? "#ffe994" : UI.sub,
					true,
				),
				258,
			),
		);
		c.add(
			clipW(
				txt(scene, 36, ty + 20, tr.summary, 10, tr.active ? UI.green : UI.sub),
				258,
			),
		);
	});

	// Scalable Skill & Cross-Tier Point Breakthrough section
	const syY = 448;
	const syG = scene.add.graphics();
	syG.fillStyle(0x1b1832, 0.95).fillRoundedRect(30, syY, 270, 98, 8);
	syG.lineStyle(1, 0x8a6fd1, 0.8).strokeRoundedRect(30, syY, 270, 98, 8);
	c.add(syG);

	c.add(
		txt(
			scene,
			36,
			syY + 4,
			"⚡ Scalable Skill (อัปคลาส 1 เปิดลูกเล่นใหม่)",
			11,
			"#d7bfff",
			true,
		),
	);

	const odOn = sum.ultOverdrive;
	c.add(
		clipW(
			txt(
				scene,
				36,
				syY + 23,
				`${odOn ? "✅" : "🔒"} 🌟 Ult Overdrive (สาย Ult ขั้น 1: ${sum.ultPts}/${SCALABLE_RULES.ultOverdriveNeed})`,
				10,
				odOn ? UI.green : UI.text,
				odOn,
			),
			258,
		),
	);
	c.add(
		clipW(
			txt(
				scene,
				44,
				syY + 37,
				"ปลดล็อก: Ult ทุกคลาสแรงขึ้น +15% ทุกฮิต!",
				9.5,
				odOn ? "#ffe994" : UI.sub,
			),
			250,
		),
	);

	const awOn = sum.s1Awaken;
	c.add(
		clipW(
			txt(
				scene,
				36,
				syY + 53,
				`${awOn ? "✅" : "🔒"} ⚡ Origin Awaken (สายทักษะ 1: ${sum.s1Pts}/${SCALABLE_RULES.s1AwakenNeed})`,
				10,
				awOn ? UI.green : UI.text,
				awOn,
			),
			258,
		),
	);
	c.add(
		clipW(
			txt(
				scene,
				44,
				syY + 67,
				"ปลดล็อก: ทักษะ 1 & ทักษะ 3 แรงขึ้น +12%!",
				9.5,
				awOn ? "#ffe994" : UI.sub,
			),
			250,
		),
	);

	const crPct =
		Math.round(
			Math.min(
				SCALABLE_RULES.crossPtCap,
				crossPts * SCALABLE_RULES.crossPtBonus,
			) * 1000,
		) / 10;
	c.add(
		clipW(
			txt(
				scene,
				36,
				syY + 82,
				`🔗 แต้มคลาสสูงอัดลงคลาสต่ำ: ${crossPts} แต้ม (สกิล&Ult +${crPct}%)`,
				9.5,
				crossPts > 0 ? UI.gold : UI.sub,
				crossPts > 0,
			),
			258,
		),
	);
}
