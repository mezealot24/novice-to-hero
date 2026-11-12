import Phaser from "phaser";
import { derivedRows } from "../../data/stat-rows";
import {
	BASE_STATS,
	heroStats,
	JOB_RULES,
	RACES,
	totalBase,
} from "../../data/meta";
import { save } from "../../save";
import { JOB_CHANGE, JOBS } from "../../data/jobs";
import { JOB2, JOB2_RULES } from "../../data/jobs2";
import { activeJob3, JOB3, JOB3_RULES } from "../../data/jobs3";
import { heroPower } from "../../data/power";
import {
	button,
	panel,
	txt,
	UI,
} from "../../ui";
import { fitHeroScale, heroCostumeTint, heroTex } from "../../gfx/hero-visual";
import type { CharacterScene } from "../CharacterScene";
import { clipW } from "./node-detail";

// ---------- left: hero preview + derived stats summary (or Cumulative Ult & Scalable panel on Skill Tab) ----------
export function drawPreview(scene: CharacterScene) {
	scene.preview?.destroy();
	const s = save(),
		c = scene.add.container(0, 0);
	scene.preview = c;
	c.add(panel(scene, 16, 70, 298, 490, UI.panel, UI.line, 14));
	const st = heroStats(s);
	const rows: [string, string][] = [
		["⚡ Hero Power", `${heroPower(s)}`],
		...derivedRows(st),
	]; // v59: the number monsters scale to
	if (scene.tab === 0) {
		// equipment screen (RO style): hero sits between the gear slots, so this side is a stats panel
		c.add(panel(scene, 26, 78, 278, 44, UI.panelHi, UI.goldDark, 10));
		c.add(
			txt(
				scene,
				165,
				84,
				`${s.supporter ? "🌟 " : ""}${s.name}`,
				18,
				s.supporter ? UI.gold : UI.text,
				true,
			).setOrigin(0.5, 0),
		);
		c.add(
			txt(
				scene,
				165,
				104,
				`${s.job2 ? `${JOB2[s.job2].icon} ${JOB2[s.job2].name}` : `${JOBS[s.job].icon} ${JOBS[s.job].name}`} · Base Lv ${s.baseLevel} · ${s.job2 ? `Job2 Lv ${s.job2Level ?? 1}` : `Job Lv ${s.jobLevel}`}`,
				11,
				UI.sub,
			).setOrigin(0.5, 0),
		);
		const tot = totalBase(s);
		BASE_STATS.forEach((bs, i) => {
			const x = 26 + (i % 2) * 144,
				y = 128 + Math.floor(i / 2) * 26;
			c.add(panel(scene, x, y, 136, 22, 0x161a2e, UI.line, 6));
			c.add(txt(scene, x + 8, y + 3, bs.name, 12, UI.gold, true));
			c.add(
				txt(
					scene,
					x + 128,
					y + 3,
					`${tot[bs.id]}`,
					12,
					UI.text,
					true,
				).setOrigin(1, 0),
			);
		});
		// RPG Stat Table with alternating row tints
		rows.forEach(([k, v], i) => {
			const y = 236 + i * 20;
			if (i % 2 === 0) {
				const bg = scene.add.graphics();
				bg.fillStyle(0xffffff, 0.02).fillRoundedRect(24, y - 2, 282, 18, 4);
				c.add(bg);
			}
			c.add(txt(scene, 30, y, k, 12, i === 0 ? UI.gold : UI.sub, i === 0));
			c.add(
				txt(scene, 300, y, v, 12, i === 0 ? UI.gold : UI.text, true).setOrigin(
					1,
					0,
				),
			);
		});
		return;
	}

	// Skill web: left side is the node detail panel (drawn by nodeFooter into body) -> compact hero strip only
	if (scene.tab === 3 && s.job !== "novice" && !scene.skillBasic) {
		drawSkillHeroStrip(scene, c);
		return;
	}

	// Hero Avatar Podium / Frame
	const pod = scene.add.graphics();
	pod.fillStyle(0x000000, 0.4).fillEllipse(165, 192, 130, 36);
	pod.fillStyle(0x353b60, 0.3).fillEllipse(165, 190, 110, 26);
	pod.lineStyle(1.5, UI.goldDark, 0.5).strokeCircle(165, 145, 60);
	c.add(pod);

	const spr = scene.add
		.image(165, 145, heroTex(s))
		.setTint(heroCostumeTint(s.costume));
	c.add(spr.setScale(fitHeroScale(spr.width, spr.height, 2.5, 132)));

	// Hero title banner card
	const j3 = activeJob3(s);
	c.add(panel(scene, 26, 206, 278, 68, UI.panelHi, UI.goldDark, 10));
	c.add(
		txt(
			scene,
			165,
			214,
			`${s.supporter ? "🌟 " : ""}${s.name}`,
			20,
			s.supporter ? UI.gold : UI.text,
			true,
		).setOrigin(0.5),
	);
	const lineage = j3
		? `${JOBS[s.job].icon} → ${JOB2[s.job2!].icon} → ${JOB3[j3].icon} ${JOB3[j3].name}`
		: s.job2
			? `${JOBS[s.job].icon} ${JOBS[s.job].name} → ${JOB2[s.job2].icon} ${JOB2[s.job2].name}`
			: `${RACES[s.race].icon} ${RACES[s.race].name} · ${JOBS[s.job].icon} ${JOBS[s.job].name}`;
	c.add(txt(scene, 165, 238, lineage, 12, UI.sub).setOrigin(0.5));
	c.add(
		txt(
			scene,
			165,
			258,
			`Base Lv ${s.baseLevel} · ${j3 ? `Job3 Lv ${s.job3Level ?? 1}/${JOB3_RULES.maxJobLevel}` : s.job2 ? `Job2 Lv ${s.job2Level ?? 1}/${JOB2_RULES.maxJobLevel}` : `Job Lv ${s.jobLevel}/${s.job === "novice" ? JOB_RULES.maxJobLevel : JOB_CHANGE.classMaxJobLevel}`}`,
			12,
			UI.gold,
		).setOrigin(0.5),
	);

	// Stats box with grouped rows
	const statBox = scene.add.graphics();
	statBox.fillStyle(0x131728, 0.85).fillRoundedRect(24, 280, 282, 270, 8);
	statBox
		.lineStyle(1.5, UI.line, 0.8)
		.strokeRoundedRect(24, 280, 282, 270, 8);
	c.add(statBox);

	rows.forEach(([k, v], i) => {
		const y = 286 + i * 16.5;
		if (i % 2 === 1) {
			const rowBg = scene.add.graphics();
			rowBg.fillStyle(0xffffff, 0.025).fillRect(26, y - 2, 278, 16);
			c.add(rowBg);
		}
		c.add(txt(scene, 30, y, k, 11, i === 0 ? UI.gold : UI.sub, i === 0));
		c.add(
			txt(scene, 300, y, v, 11, i === 0 ? UI.gold : UI.text, true).setOrigin(
				1,
				0,
			),
		);
	});
}

/** Skill web left panel top: one-line hero identity + 🔥 รวมผล Ult popup button. Rest of the panel = node detail. */
export function drawSkillHeroStrip(scene: CharacterScene, c: Phaser.GameObjects.Container) {
	const s = save(),
		j3 = activeJob3(s);
	const cls = j3
		? `${JOB3[j3].icon} ${JOB3[j3].name}`
		: s.job2
			? `${JOB2[s.job2].icon} ${JOB2[s.job2].name}`
			: `${JOBS[s.job].icon} ${JOBS[s.job].name}`;
	const jl = j3
		? `Job3 Lv ${s.job3Level ?? 1}`
		: s.job2
			? `Job2 Lv ${s.job2Level ?? 1}`
			: `Job Lv ${s.jobLevel}`;
	c.add(
		clipW(
			txt(scene, 28, 80, `${s.supporter ? "🌟 " : ""}${s.name}`, 15, s.supporter ? UI.gold : UI.text, true),
			170,
		),
	);
	c.add(clipW(txt(scene, 28, 101, `${cls} · Base ${s.baseLevel} · ${jl}`, 10.5, UI.sub), 170));
	c.add(
		button(
			scene,
			254,
			98,
			96,
			32,
			"🔥 รวมผล Ult",
			() => {
				scene.showUlt = true;
				scene.render();
			},
			{ size: 12, fill: 0x5a4320, color: UI.gold },
		),
	);
	const g = scene.add.graphics();
	g.lineStyle(1, UI.line, 0.8).lineBetween(26, 124, 304, 124);
	c.add(g);
}
