import Phaser from "phaser";
import {
	describeItemEffects,
	itemConversionsOf,
	type SaveExt,
} from "../../data/item-effects";
import {
	BASE_STATS,
	gearBase,
	heroStats,
	jobBonusBase,
	STAT_RULES,
	totalBase,
	wornItems,
	type BaseStat,
} from "../../data/meta";
import { setBonuses } from "../../data/sets";
import { persist, save } from "../../save";
import { JOBS, type JobId } from "../../data/jobs";
import { DERIVED_STAT_CAPS, statLines } from "../../data/statInfo";
import {
	button,
	confirm,
	fit,
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
		const y = 160 + i * 48;
		b.add(panel(scene, 330, y, 600, 44, UI.panel, UI.line, 10));
		b.add(txt(scene, 344, y + 4, bs.name, 18, UI.gold, true));
		b.add(txt(scene, 344, y + 26, bs.role, 11, UI.sub));
		const gearB = gear[bs.id],
			jobN = jobB[bs.id],
			raceB = total[bs.id] - s.stats[bs.id] - gearB - jobN;
		b.add(txt(scene, 404, y + 9, `${total[bs.id]}`, 21, UI.text, true));
		const tags: [string, string][] = [];
		if (raceB)
			tags.push([
				`${raceB > 0 ? "+" : ""}${raceB} เผ่า`,
				raceB > 0 ? UI.green : UI.red,
			]);
		if (gearB) tags.push([`+${gearB} ของ`, "#7fd7ff"]);
		if (jobN) tags.push([`+${jobN} อาชีพ`, UI.gold]);
		const step = tags.length > 2 ? 13 : 16;
		tags.forEach(([t, c], j) =>
			b.add(
				txt(scene, 436, y + (tags.length > 2 ? 2 : 6) + j * step, t, 10, c),
			),
		);
		statDesc(scene, b, bs.id, s.job, total[bs.id], 482, y + 3, 322, 38);
		const add = (n: number) => {
			n = Math.min(n, s.statPoints, STAT_RULES.max - s.stats[bs.id]);
			if (n <= 0) return;
			s.stats[bs.id] += n;
			s.statPoints -= n;
			persist();
			scene.redraw();
		};
		b.add(
			button(scene, 838, y + 22, 52, 34, "+1", () => add(1), {
				size: 16,
			}).setEnabled(s.statPoints > 0),
		);
		b.add(
			button(scene, 896, y + 22, 52, 34, "+5", () => add(5), {
				size: 16,
			}).setEnabled(s.statPoints > 1),
		);
	});
	const st = heroStats(s);
	const worn = wornItems(s);
	const setSum = setBonuses(worn);
	const convs = [
		...worn.flatMap((it) => itemConversionsOf(s as SaveExt, it)),
		...setSum.conversions,
	];
	b.add(panel(scene, 330, 498, 600, 66, 0x181c36, UI.line, 10));
	const penMetrics: [number, string, string][] = [
		[
			342,
			`🗡️ เจาะกาย ${Math.round(st.physPen * 100)}% (ตัน ${Math.round(DERIVED_STAT_CAPS.physPen.cap * 100)}%)`,
			"#ffbe88",
		],
		[
			536,
			`✨ เจาะเวท ${Math.round(st.magPen * 100)}% (ตัน ${Math.round(DERIVED_STAT_CAPS.magPen.cap * 100)}%)`,
			"#9fd3ff",
		],
		[
			730,
			`🔥 ดาเมจธาตุ +${Math.round(st.elemDmg * 100)}% (ตัน +${Math.round(DERIVED_STAT_CAPS.elemDmg.cap * 100)}%)`,
			"#ff9b9b",
		],
	];
	for (const [px, label, color] of penMetrics) {
		b.add(fit(txt(scene, px, 503, label, 12, color, true).setWordWrapWidth(188), 18));
	}
	const setSummary = setSum.active.length
		? setSum.active
				.map((a) => {
					const maxP =
						a.nextTier?.pieces ??
						a.set.tiers[a.set.tiers.length - 1]?.pieces ??
						a.count;
					const latest = a.activeTiers[a.activeTiers.length - 1];
					return `${a.set.icon}${a.set.name} ${a.count}/${maxP}${latest ? ` (${latest.label})` : ""}`;
				})
				.join(" · ")
		: "ยังไม่มีโบนัสเซต (ใส่ของเซตเดียวกัน 2+ ชิ้น)";
	b.add(
		fit(
			txt(
				scene,
				342,
				524,
				`🧩 เซต: ${setSummary}`,
				11,
				setSum.active.length ? UI.gold : UI.sub,
			).setWordWrapWidth(576),
			16,
		),
	);
	const convLines = describeItemEffects(undefined, convs);
	b.add(
		fit(
			txt(
				scene,
				342,
				543,
				`🔄 แปลงสเตตัส: ${convLines.length ? convLines.join(" · ") : "ยังไม่มีเอฟเฟกต์แปลงค่าพลัง"}`,
				11,
				convLines.length ? "#c9a8ff" : UI.sub,
			).setWordWrapWidth(576),
			16,
		),
	);
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
