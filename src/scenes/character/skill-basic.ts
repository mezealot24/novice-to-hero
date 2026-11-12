import { COLORS } from "../../data/game-data";
import {
	smashLv,
	CERT_SLOTS_AT,
	NOVICE_PASSIVES,
	NOVICE_RULES,
	noviceLeft,
	noviceSpent,
	SKILLS,
} from "../../data/meta";
import {
	canChangeJob,
	persist,
	resetNovice,
	save,
} from "../../save";
import { JOB_CHANGE } from "../../data/jobs";
import { askRepick } from "../JobScene";
import {
	button,
	confirm,
	go,
	panel,
	toast,
	txt,
	UI,
} from "../../ui";
import type { CharacterScene } from "../CharacterScene";

// ---------- tab 3 (Novice / Basic view): novice passives + certificates ----------
export function skillTab(scene: CharacterScene) {
	const s = save(),
		b = scene.body!;
	const novice = s.job === "novice",
		left = noviceLeft(s.skills),
		spent = noviceSpent(s.skills);
	b.add(
		txt(
			scene,
			330,
			116,
			`แต้มโนวิส: ${left}/${NOVICE_RULES.points}`,
			20,
			left ? UI.gold : UI.sub,
			true,
		),
	);
	b.add(
		txt(
			scene,
			330,
			144,
			novice
				? `ฟรี ${NOVICE_RULES.points} แต้มตั้งแต่เริ่ม · 💢 ทุบ เลเวลขึ้นเองตาม Job Lv`
				: "สกิลโนวิสติดตัวไปด้วย · สกิลอาชีพอยู่ใน 🕸️ ใยสกิล 3 คลาส",
			14,
			UI.sub,
		),
	);
	if (!novice)
		b.add(
			button(
				scene,
				885,
				124,
				120,
				30,
				"🕸️ ใยสกิล 3 ชั้น",
				() => {
					scene.skillBasic = false;
					scene.redraw();
				},
				{ size: 12 },
			),
		);
	b.add(
		button(
			scene,
			novice ? 870 : 755,
			124,
			120,
			30,
			`↺ รีเซ็ต 💎${NOVICE_RULES.resetGems}`,
			() => {
				if (s.gems < NOVICE_RULES.resetGems) {
					toast(
						scene,
						`เพชรไม่พอ ต้องใช้ 💎${NOVICE_RULES.resetGems} (มี ${s.gems})`,
						UI.sub,
					);
					return;
				}
				confirm(
					scene,
					"↺ รีเซ็ตสกิลโนวิส?",
					`คืนแต้มโนวิสทั้ง ${spent} แต้ม\nจ่าย 💎${NOVICE_RULES.resetGems}`,
					"รีเซ็ต",
					() => {
						if (resetNovice(s)) {
							toast(scene, `คืน ${spent} แต้มแล้ว`);
							scene.redraw();
						}
					},
				);
			},
			{ size: 12, fill: 0x5a5f8a, color: UI.text },
		).setEnabled(spent > 0),
	);

	let gy = 168;
	if (novice) {
		const sm = SKILLS.find((x) => x.id === "smash")!,
			lv = smashLv(s.jobLevel);
		b.add(panel(scene, 330, 164, 600, 36, UI.panel, UI.line, 10));
		b.add(
			txt(
				scene,
				342,
				172,
				`${sm.icon} ${sm.name}  Lv ${lv}/${sm.max}`,
				14,
				UI.text,
				true,
			),
		);
		b.add(
			txt(
				scene,
				520,
				174,
				`${sm.desc(lv)} · เลเวลขึ้นเองตาม Job Lv`,
				10,
				UI.green,
			).setWordWrapWidth(400),
		);
		gy = 206;
	}
	NOVICE_PASSIVES.forEach((sk, i) => {
		const w = 297,
			h = 44,
			x = 330 + (i % 2) * (w + 6),
			y = gy + Math.floor(i / 2) * (h + 5);
		const lv = s.skills[sk.id] ?? 0;
		b.add(panel(scene, x, y, w, h, UI.panel, lv ? COLORS.gold : UI.line, 10));
		b.add(
			txt(scene, x + 10, y + 4, `${sk.icon} ${sk.name}`, 14, UI.text, true),
		);
		b.add(
			txt(
				scene,
				x + 236,
				y + 6,
				`${lv}/${sk.max}`,
				12,
				lv ? UI.gold : UI.sub,
				true,
			).setOrigin(1, 0),
		);
		b.add(
			txt(
				scene,
				x + 10,
				y + 25,
				sk.desc(Math.max(1, lv)),
				10,
				lv ? UI.green : UI.sub,
			).setWordWrapWidth(226),
		);
		b.add(
			button(
				scene,
				x + 268,
				y + h / 2,
				46,
				30,
				lv ? "+1" : "เรียน",
				() => {
					if (noviceLeft(s.skills) <= 0 || (s.skills[sk.id] ?? 0) >= sk.max)
						return;
					s.skills[sk.id] = (s.skills[sk.id] ?? 0) + 1;
					persist();
					scene.redraw();
				},
				{ size: 12 },
			).setEnabled(left > 0 && lv < sk.max),
		);
	});

	const y0 = 372;
	b.add(
		txt(
			scene,
			330,
			y0,
			"🎖️ ช่องใบรับรอง (Passive พิเศษ) · เปิดตาม Base Lv",
			16,
			UI.text,
			true,
		),
	);
	CERT_SLOTS_AT.forEach((lv, i) => {
		const x = 330 + i * 152,
			open = s.baseLevel >= lv;
		b.add(
			panel(
				scene,
				x,
				y0 + 28,
				144,
				56,
				open ? 0x2a3b5a : 0x1d2140,
				open ? COLORS.gold : UI.line,
				10,
			),
		);
		b.add(
			txt(
				scene,
				x + 72,
				y0 + 56,
				open ? "ว่าง\n(เร็วๆ นี้)" : `🔒 Base Lv ${lv}`,
				12,
				open ? UI.gold : UI.sub,
			)
				.setOrigin(0.5)
				.setAlign("center"),
		);
	});
	b.add(
		txt(scene, 330, y0 + 100, "🌳 ทาเลนต์ & เปลี่ยนอาชีพ", 16, UI.text, true),
	);
	if (canChangeJob(s) || s.job !== "novice") {
		b.add(
			txt(
				scene,
				330,
				y0 + 126,
				s.job === "novice"
					? "ล้มบอสดันแรกแล้ว! ไปเลือกอาชีพได้เลย"
					: `ลงแต้มสกิลอาชีพได้ที่ 🕸️ ใยสกิล · เปลี่ยนอาชีพใหม่ได้ด้วย 💎${JOB_CHANGE.repickGems} (คืนแต้มใยสกิลครบ Job Lv คงเดิม)`,
				13,
				UI.gold,
			).setWordWrapWidth(420),
		);
		b.add(
			button(
				scene,
				850,
				y0 + 132,
				150,
				36,
				s.job === "novice" ? "🎓 อาชีพ" : `🔄 💎${JOB_CHANGE.repickGems}`,
				() => (s.job === "novice" ? go(scene, "job") : askRepick(scene)),
				{ size: 15 },
			),
		);
	} else
		b.add(
			txt(
				scene,
				330,
				y0 + 126,
				"ปลดล็อกเมื่อล้มบอสดันแรก (ราชาเจลล็อป) · มี 5 อาชีพ: นักดาบ นักธนู จอมเวท นักบวช โจร",
				13,
				UI.sub,
			).setWordWrapWidth(600),
		);
}
