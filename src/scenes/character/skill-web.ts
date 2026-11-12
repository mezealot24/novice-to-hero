import Phaser from "phaser";
import { COLORS } from "../../data/game-data";
import {
	save,
	totalCrossSpent,
} from "../../save";
import { nodeById } from "../../data/tree";
import { JOBS } from "../../data/jobs";
import {
	JOB2,
	job2Of,
	type Job2Id,
} from "../../data/jobs2";
import {
	activeJob3,
	job3Of,
} from "../../data/jobs3";
import {
	button,
	txt,
	UI,
} from "../../ui";
import { clipW } from "./node-detail";
import { renderSelectedNodeFooter } from "./node-footer";
import {
	applyWebScroll,
	scrollToWebY,
	webTier,
} from "./web-scroll";
import type { WebBuild } from "./web-build";
import { buildTier1 } from "./web-tier1";
import { buildTier2 } from "./web-tier2";
import { buildTier3 } from "./web-tier3";
import type { CharacterScene } from "../CharacterScene";

// ---------- tab 3: Unified RO Mobile Style 3-Class Vertical Skill Web ----------
export function unifiedWebTab(scene: CharacterScene) {
	const s = save(),
		b = scene.body!;
	const job = JOBS[s.job];
	const t1 = (s.jobTree ??= {});
	const t2 = (s.job2Tree ??= {});
	const t3 = (s.job3Tree ??= {});
	const j2Options = job2Of(s.job);
	const activeJ2Id: Job2Id =
		s.job2 ?? j2Options[scene.previewJob2Idx % j2Options.length].id;
	const j2 = JOB2[activeJ2Id];
	const j3Def = job3Of(activeJ2Id);
	const isJ3Active = !!activeJob3(s) && activeJob3(s) === j3Def?.id;
	const path = s.job3Path ?? "pure";

	const p1 = s.skillPoints ?? 0;
	const p2 = s.job2 ? (s.job2Points ?? 0) : 0;
	const p3 = activeJob3(s) ? (s.job3Points ?? 0) : 0;
	const crossPts = totalCrossSpent(s);

	// 1. Unified Top Header Bar: shows all 3 class point pools at once + Quick Tier Jump pills
	b.add(
		clipW(
		txt(
			scene,
			330,
			110,
			`แต้ม: ✨ขั้น1 [${p1}] · ${j2.icon}ขั้น2 [${s.job2 ? p2 : "🔒"}] · ${j3Def ? j3Def.icon : "⚜️"}ขั้น3 [${activeJob3(s) ? p3 : "🔒"}]`,
			13,
			p1 + p2 + p3 > 0 ? UI.gold : UI.sub,
			true,
		),
		326,
		),
	);
	b.add(
		clipW(
			txt(
				scene,
				330,
				130,
				`💡 ไถดูทั้ง 3 คลาส · แต้มคลาสสูงอัปคลาสต่ำได้${crossPts > 0 ? ` (ยืม ${crossPts})` : ""}`,
				10.5,
				"#b8c0e8",
			),
			326,
		),
	);

	// Quick-jump tier pills (RO Mobile style). Tint is updated live by applyWebScroll(), no re-render.
	const curTier = webTier(scene);
	scene.webPills = ([1, 2, 3] as const).map((t, i) => {
		const pill = button(
			scene,
			666 + i * 70,
			122,
			66,
			26,
			`${["1️⃣", "2️⃣", "3️⃣"][i]} ขั้น ${t}`,
			() => scrollToWebY(scene, scene.tierOffsets[i], true),
			{ size: 11, fill: curTier === t ? COLORS.gold : 0x3b4269 },
		);
		b.add(pill);
		return pill;
	});
	b.add(
		button(
			scene,
			896,
			122,
			98,
			26,
			"🌱 โนวิส/อาชีพ",
			() => {
				scene.skillBasic = true;
				scene.redraw();
			},
			{ size: 11, fill: 0x5a5f8a, color: UI.text },
		),
	);

	// 2. Scrollable Viewport Container (x: 326..944, y: 146..492)
	const viewX = 326,
		viewY = 146,
		viewW = 616,
		viewH = 410; // down to the panel bottom (old bottom footer moved into the left panel)
	const frameBg = scene.add.graphics();
	frameBg
		.fillStyle(0x0d1020, 0.7)
		.fillRoundedRect(viewX, viewY, viewW, viewH, 10);
	frameBg
		.lineStyle(1.5, UI.line, 0.8)
		.strokeRoundedRect(viewX, viewY, viewW, viewH, 10);
	b.add(frameBg);

	// Swipe is handled scene-wide (webPointerDown/Move/Up) so it works on top of nodes too.
	scene.webView = { x: viewX, y: viewY, w: viewW, h: viewH };

	const maskShape = scene.make.graphics({});
	maskShape.fillStyle(0xffffff).fillRect(viewX, viewY, viewW, viewH);
	const mask = maskShape.createGeometryMask();
	b.once("destroy", () => maskShape.destroy());

	const scrollC = scene.add.container(0, viewY - scene.webScrollY);
	scrollC.setMask(mask);
	b.add(scrollC);

	const spineG = scene.add.graphics();
	scrollC.add(spineG);

	const x0 = 332,
		wAll = 602,
		nh = 46,
		rh = 58;
	const w: WebBuild = {
		s,
		job,
		j2,
		j2Options,
		j3Def,
		isJ3Active,
		path,
		t1,
		t2,
		t3,
		scrollC,
		spineG,
		x0,
		wAll,
		nh,
		rh,
		curY: 6,
		cols1: [],
		ult1CenterX: 0,
		s1CenterX: 0,
		t1BottomY: 0,
		ult2CenterX: 0,
		t2BottomY: 0,
	};

	buildTier1(scene, w);
	buildTier2(scene, w);
	buildTier3(scene, w);
	const curY = w.curY;
	const cols1 = w.cols1;

	scene.webMaxScroll = Math.max(0, curY - viewH);
	scene.webScrollY = Math.max(0, Math.min(scene.webMaxScroll, scene.webScrollY));
	scrollC.setY(viewY - scene.webScrollY);

	// Right-edge scrollbar: track + separately positioned thumb (drag/tap handled in webPointerDown)
	scene.webThumb = undefined;
	if (scene.webMaxScroll > 0) {
		const sbX = 945,
			sbY = viewY + 4,
			sbH = viewH - 8;
		const track = scene.add.graphics();
		track.fillStyle(0x131728, 0.95).fillRoundedRect(sbX, sbY, 8, sbH, 4);
		track.lineStyle(1, UI.line, 0.6).strokeRoundedRect(sbX, sbY, 8, sbH, 4);
		const thumbH = Math.max(44, Math.round((viewH / curY) * sbH));
		const thumb = scene.add.graphics();
		thumb.fillStyle(COLORS.gold, 0.9).fillRoundedRect(sbX, 0, 8, thumbH, 4);
		thumb.fillStyle(0xffffff, 0.35).fillRect(sbX + 2, thumbH / 2 - 4, 4, 1);
		thumb.fillStyle(0xffffff, 0.35).fillRect(sbX + 2, thumbH / 2, 4, 1);
		thumb.fillStyle(0xffffff, 0.35).fillRect(sbX + 2, thumbH / 2 + 4, 4, 1);
		b.add([track, thumb]);
		scene.webThumb = thumb;
		scene.webSb = { y: sbY, h: sbH, thumbH };
	}

	// Remember every interactive inside the scroller (content-space Y) so applyWebScroll can gate it
	scene.webC = scrollC;
	scene.webHits = [];
	const collect = (list: Phaser.GameObjects.GameObject[], offY: number) => {
		for (const go of list) {
			if (go instanceof Phaser.GameObjects.Container) {
				if (go.input) {
					const top = offY + go.y - go.displayOriginY;
					scene.webHits.push({ go, top, bot: top + go.displayHeight });
				}
				collect(go.list, offY + go.y);
			} else if (go instanceof Phaser.GameObjects.Zone && go.input) {
				const top = offY + go.y - go.displayOriginY;
				scene.webHits.push({ go, top, bot: top + go.displayHeight });
			}
		}
	};
	collect(scrollC.list, 0);
	applyWebScroll(scene);

	// Default selected node fallback
	if (!scene.selNode || !nodeById(scene.selNode)) {
		scene.selNode = cols1[0].cells[0].n.id;
	}
	renderSelectedNodeFooter(scene);
}