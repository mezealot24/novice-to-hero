import { COLORS } from "../../data/game-data";
import { persist, save } from "../../save";
import {
	talents2Of,
	TALENT_RULES,
	talentEarned,
	talentFree,
	talentPick,
	talentRankText,
	talentsOf,
} from "../../data/tree";
import { JOB2 } from "../../data/jobs2";
import {
	button,
	panel,
	toast,
	txt,
	UI,
} from "../../ui";
import type { CharacterScene } from "../CharacterScene";

// ---------- tab 4: talents (4 tiers by Job Lv, pick 1 of 3, free swap in town) ----------
export function talentTab(scene: CharacterScene) {
	const s = save(),
		b = scene.body!;
	if (s.job === "novice") {
		b.add(
			txt(
				scene,
				330,
				130,
				"⭐ ทาเลนต์เปิดหลังเปลี่ยนอาชีพ",
				20,
				UI.gold,
				true,
			),
		);
		b.add(
			txt(
				scene,
				330,
				166,
				`4 ชั้น เปิดที่ Job Lv ${TALENT_RULES.rowsAt.join(" / ")} · ชั้นละเลือก 1 จาก 3\nใช้แต้มทาเลนต์ (แยกจากแต้มสกิล) ได้ 1 แต้มทุก ${TALENT_RULES.pointEveryJobLv} Job Lv · รีเซ็ตฟรีในเมือง`,
				14,
				UI.sub,
			),
		);
		return;
	}
	const two = scene.talent2 && !!s.job2,
		j2 = s.job2;
	const t = two ? (s.job2Talents ??= {}) : (s.jobTalents ??= {});
	const jl = two ? (s.job2Level ?? 1) : s.jobLevel,
		jlName = two ? "Job2 Lv" : "Job Lv";
	const free = talentFree(t, jl);
	b.add(
		txt(
			scene,
			330,
			114,
			`⭐ แต้มทาเลนต์${two ? "ชั้น 2" : ""}เหลือ: ${free}`,
			18,
			free > 0 ? UI.gold : UI.sub,
			true,
		),
	);
	b.add(
		txt(
			scene,
			560,
			118,
			`ได้ ${talentEarned(jl)} จาก ${jlName} ${jl}`,
			12,
			UI.sub,
		),
	);
	if (j2)
		b.add(
			button(
				scene,
				760,
				124,
				112,
				30,
				two ? "⭐ ชั้น 1" : `${JOB2[j2].icon} ชั้น 2`,
				() => {
					scene.talent2 = !two;
					scene.redraw();
				},
				{ size: 12, fill: 0x4a5a8a, color: UI.text },
			),
		);
	b.add(
		button(
			scene,
			885,
			124,
			90,
			30,
			"รีเซ็ตฟรี",
			() => {
				if (two) s.job2Talents = {};
				else s.jobTalents = {};
				persist();
				toast(scene, "คืนแต้มทาเลนต์แล้ว");
				scene.redraw();
			},
			{ size: 13, fill: 0x5a5f8a, color: UI.text },
		).setEnabled(Object.keys(t).length > 0),
	);
	TALENT_RULES.rowsAt.forEach((lv, i) => {
		const row = i + 1,
			y = 144 + i * 104,
			open = jl >= lv;
		const opts = two && j2 ? talents2Of(j2, row) : talentsOf(s.job, row);
		const cur = talentPick(t, row);
		b.add(
			txt(
				scene,
				330,
				y,
				`ชั้น ${row} · ${jlName} ${lv}${open ? "" : " 🔒"}`,
				14,
				open ? UI.text : UI.sub,
				true,
			),
		);
		if (!opts.length) {
			b.add(txt(scene, 330, y + 26, "กำลังออกแบบ (เร็วๆ นี้)", 12, UI.sub));
			return;
		}
		const cw = (600 - 2 * 10) / 3;
		opts.slice(0, 3).forEach((o, k) => {
			const x = 330 + k * (cw + 10),
				picked = cur?.id === o.id;
			const rank = picked ? Math.min(cur!.rank, o.max) : 0;
			b.add(
				panel(
					scene,
					x,
					y + 20,
					cw,
					76,
					picked ? 0x2a3b5a : open ? UI.panel : 0x1d2140,
					picked ? COLORS.gold : UI.line,
					10,
				),
			);
			b.add(
				txt(
					scene,
					x + 8,
					y + 24,
					`${o.icon} ${o.name}  ${rank}/${o.max}`,
					13,
					open ? UI.text : UI.sub,
					true,
				),
			);
			const tx = talentRankText(o, rank);
			b.add(
				txt(
					scene,
					x + 8,
					y + 43,
					tx.next ? `${tx.now}\n${tx.next}` : tx.now,
					tx.next ? 10 : 11,
					open ? UI.green : UI.sub,
				).setWordWrapWidth(cw - 16),
			);
			const refund = picked ? 0 : (cur?.rank ?? 0);
			const can = open && rank < o.max && free + refund >= 1;
			if (can) {
				const hit = scene.add
					.zone(x, y + 20, cw, 76)
					.setOrigin(0)
					.setInteractive({ useHandCursor: true });
				hit.on("pointerup", () => {
					t[String(row)] = { id: o.id, rank: rank + 1 };
					persist();
					scene.redraw();
				});
				b.add(hit);
			}
		});
	});
}
