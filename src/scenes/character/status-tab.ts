import Phaser from "phaser";
import {
	BASE_STATS,
	gearBase,
	jobBonusBase,
	STAT_RULES,
	totalBase,
	type BaseStat,
} from "../../data/meta";
import { persist, save } from "../../save";
import { JOBS, type JobId } from "../../data/jobs";
import { statLines } from "../../data/statInfo";
import {
	button,
	confirm,
	panel,
	toast,
	txt,
	UI,
} from "../../ui";
import type { CharacterScene } from "../CharacterScene";

// ---------- tab 3: base stats ----------
export function statusTab(scene: CharacterScene) {
	const s = save(),
		b = scene.body!;
	const total = totalBase(s),
		gear = gearBase(s),
		jobB = jobBonusBase(s);
	b.add(
		txt(
			scene,
			330,
			112,
			`แต้มสถานะเหลือ: ${s.statPoints}`,
			20,
			s.statPoints ? UI.gold : UI.sub,
			true,
		),
	);
	b.add(
		txt(
			scene,
			330,
			138,
			`ได้ ${STAT_RULES.pointsPerLevel} แต้มทุก Base Lv · รีเซ็ตฟรีได้ตลอด`,
			14,
			UI.sub,
		),
	);
	BASE_STATS.forEach((bs, i) => {
		const y = 166 + i * 56;
		b.add(panel(scene, 330, y, 600, 50, UI.panel, UI.line, 10));
		b.add(txt(scene, 344, y + 6, bs.name, 19, UI.gold, true));
		b.add(txt(scene, 344, y + 30, bs.role, 12, UI.sub));
		const gearB = gear[bs.id],
			jobN = jobB[bs.id],
			raceB = total[bs.id] - s.stats[bs.id] - gearB - jobN;
		b.add(txt(scene, 404, y + 11, `${total[bs.id]}`, 22, UI.text, true));
		const tags: [string, string][] = [];
		if (raceB)
			tags.push([
				`${raceB > 0 ? "+" : ""}${raceB} เผ่า`,
				raceB > 0 ? UI.green : UI.red,
			]);
		if (gearB) tags.push([`+${gearB} ของ`, "#7fd7ff"]);
		if (jobN) tags.push([`+${jobN} อาชีพ`, UI.gold]);
		const step = tags.length > 2 ? 14 : 18;
		tags.forEach(([t, c], j) =>
			b.add(
				txt(scene, 436, y + (tags.length > 2 ? 4 : 8) + j * step, t, 10, c),
			),
		);
		statDesc(scene, b, bs.id, s.job, total[bs.id], 482, y + 4, 322, 44);
		const add = (n: number) => {
			n = Math.min(n, s.statPoints, STAT_RULES.max - s.stats[bs.id]);
			if (n <= 0) return;
			s.stats[bs.id] += n;
			s.statPoints -= n;
			persist();
			scene.redraw();
		};
		b.add(
			button(scene, 838, y + 25, 52, 36, "+1", () => add(1), {
				size: 16,
			}).setEnabled(s.statPoints > 0),
		);
		b.add(
			button(scene, 896, y + 25, 52, 36, "+5", () => add(5), {
				size: 16,
			}).setEnabled(s.statPoints > 1),
		);
	});
	b.add(
		button(
			scene,
			860,
			132,
			140,
			38,
			"↺ รีเซ็ตแต้ม",
			() => {
				const spent = Object.values(s.stats).reduce(
					(a, v) => a + v - STAT_RULES.start,
					0,
				);
				if (!spent) {
					toast(scene, "ยังไม่ได้ลงแต้มเลยค่ะ", UI.sub);
					return;
				}
				confirm(
					scene,
					"รีเซ็ตแต้มสถานะ?",
					`คืน ${spent} แต้มให้ลงใหม่ ฟรี ไม่เสียอะไรค่ะ`,
					"รีเซ็ต",
					() => {
						for (const k of Object.keys(s.stats) as (keyof typeof s.stats)[])
							s.stats[k] = STAT_RULES.start;
						s.statPoints += spent;
						persist();
						scene.redraw();
					},
				);
			},
			{ size: 15, fill: 0x5a5f8a, color: UI.text },
		),
	);
}

export function statDesc(
	scene: CharacterScene,
	b: Phaser.GameObjects.Container,
	stat: BaseStat,
	job: JobId,
	total: number,
	x: number,
	y: number,
	w: number,
	h: number,
) {
	const { generic, cls } = statLines(stat, job, total);
	for (const size of [12, 11, 10, 9]) {
		const g = txt(scene, x, y, generic.join(" · "), size, "#d8d4f0")
			.setWordWrapWidth(w)
			.setLineSpacing(0);
		const c = cls.length
			? txt(
					scene,
					x,
					y + g.height,
					`${JOBS[job].icon} ${cls.join(" · ")}`,
					size,
					UI.gold,
				)
					.setWordWrapWidth(w)
					.setLineSpacing(0)
			: undefined;
		if (g.height + (c?.height ?? 0) <= h || size === 9) {
			const pad = Math.max(0, (h - g.height - (c?.height ?? 0)) / 2);
			g.y += pad;
			if (c) c.y += pad;
			b.add(g);
			if (c) b.add(c);
			return;
		}
		g.destroy();
		c?.destroy();
	}
}
