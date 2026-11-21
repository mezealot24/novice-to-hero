import Phaser from "phaser";
import { COLORS, FONT_NUM, FONT_UI, H, W } from "../../data/game-data";
import { derivedRows } from "../../data/stat-rows";
import { JOBS } from "../../data/jobs";
import { JOB2 } from "../../data/jobs2";
import { activeJob3, JOB3, type Job3Id } from "../../data/jobs3";
import { heroStats } from "../../data/meta";
import {
	PASSIVE_MAX_POINTS,
	PASSIVE_RULES,
	allocatePassive,
	canAllocatePassive,
	canRefundPassive,
	hasPassiveTree,
	normalizePassiveNodes,
	passiveEarnedFor,
	passiveCtxFor,
	passiveNodeUnlocked,
	passiveFree,
	passiveNodeById,
	passiveSpent,
	passiveTreeOf,
	refundPassive,
	type PassiveCtx,
	type PassiveKind,
	type PassiveNode,
	type PassiveSector,
	type PassiveTreeDef,
} from "../../data/passive-tree";
import { persist, save, type SaveData } from "../../save";
import { sfx, unlock } from "../../sfx";
import { button, confirm, panel, toast, txt, UI } from "../../ui";
import type { CharacterScene } from "../CharacterScene";
import { clipW } from "./node-detail";
import { jewelLinesText, jewelName, openJewelPicker } from "./jewel-ui";
import {
	DEFAULT_NODE_RADIUS,
	PASSIVE_CAM_DEFAULTS,
	PASSIVE_VIEW_DEFAULT,
	clampCam,
	computeGraphBounds,
	computeTagFilter,
	containerTransform,
	createPassiveCam,
	fitCamToBounds,
	panBy,
	pickNodeAt,
	pointInView,
	zoomByWheel,
	zoomStep,
	type GraphBounds,
	type PassiveView,
} from "./passive-cam";

const FULLSCREEN_MODAL = { x: 0, y: 18, w: 960, h: 540 } as const;
const FULLSCREEN_VIEW: PassiveView = { x: 8, y: 64, w: 944, h: 486 };
const DRAG_THRESHOLD_PX = 8;

const NODE_RADIUS: Readonly<Record<PassiveKind, number>> = {
	origin: DEFAULT_NODE_RADIUS.origin,
	keystone: DEFAULT_NODE_RADIUS.keystone,
	notable: DEFAULT_NODE_RADIUS.notable,
	socket: DEFAULT_NODE_RADIUS.socket,
	minor: DEFAULT_NODE_RADIUS.minor,
};

const SECTOR_META: Readonly<
	Record<
		PassiveSector,
		{ label: string; color: number; hex: string; lx: number; ly: number }
	>
> = {
	core: { label: "แกนกลาง", color: COLORS.gold, hex: UI.gold, lx: 0, ly: 0 },
	blade: { label: "⚔️ คมมีด", color: 0xe66a55, hex: "#ff9e8c", lx: -335, ly: -395 },
	shadow: { label: "👤 เงา", color: 0x8b7cf6, hex: "#c4baff", lx: 335, ly: -395 },
	venom: { label: "☠️ พิษ", color: 0x4fd18b, hex: "#7fe6ab", lx: 345, ly: 395 },
	alchemy: { label: "⚗️ เล่นแร่", color: 0x52c7e0, hex: "#8ce4f8", lx: -335, ly: 410 },
	vanguard: { label: "⚔️ คมดาบ", color: 0xe66a55, hex: "#ff9e8c", lx: -335, ly: -395 },
	bastion: { label: "🛡️ ปราการ", color: 0x5ea8f5, hex: "#9fd4ff", lx: 335, ly: -395 },
	fury: { label: "🔥 โทสะ", color: 0xf08c42, hex: "#ffbd7a", lx: 345, ly: 395 },
	warblood: { label: "🩸 โลหิตศึก", color: 0xd15b7a, hex: "#ff9bb5", lx: -335, ly: 410 },
	awaken: { label: "🌟 ตื่นรู้", color: 0xffc85a, hex: "#ffd98a", lx: 0, ly: 0 }, // labels per 3rd job: AWAKEN_LABELS
};

const KIND_META: Readonly<Record<PassiveKind, { label: string; color: string }>> = {
	origin: { label: "⭐ จุดเริ่มต้น", color: UI.gold },
	minor: { label: "🔹 โหนดย่อย", color: UI.sub },
	notable: { label: "💠 โหนดเด่น", color: UI.gem },
	keystone: { label: "👑 คีย์สโตน", color: "#ffd875" },
	socket: { label: "💎 ช่องอัญมณี", color: "#d7bfff" },
};

const TAG_THAI: Readonly<Record<string, string>> = {
	blade: "มีด",
	poison: "พิษ",
	shadow: "เงา",
	crit: "คริ",
	offmeta: "นอกกระแส",
	vanguard: "คมดาบ",
	bastion: "เกราะ",
	counter: "สวนกลับ",
	fury: "โทสะ",
	blood: "โลหิต",
	s1: "ทักษะ 1",
	s3: "ทักษะ 3",
	ult: "Ult",
	jewel: "อัญมณี",
};

function passiveCtxOf(s: SaveData): PassiveCtx {
	return passiveCtxFor(s);
}

/** 🌟 Awakening ring cluster labels: one per 3rd job, above / below its cluster. */
const AWAKEN_LABELS: readonly { job3: Job3Id; x: number; y: number; glowY: number }[] = [
	{ job3: "stalker", x: 0, y: -718, glowY: -575 },
	{ job3: "kingpin", x: 0, y: 722, glowY: 575 },
	{ job3: "lordknight", x: 0, y: -718, glowY: -575 },
	{ job3: "warlord", x: 0, y: 722, glowY: 575 },
];

/** "🔒 ปลดเมื่อเป็น 🥷 Stalker" for an Awakening node the hero can't use yet (undefined when open). */
function awakenLockText(node: PassiveNode, ctx: PassiveCtx): string | undefined {
	if (passiveNodeUnlocked(node, ctx) || !node.awaken) return undefined;
	const names = node.awaken.map((j) => `${JOB3[j].icon} ${JOB3[j].name}`).join(" / ");
	return `🔒 วงแหวนตื่นรู้ · ปลดเมื่อเป็น ${names} (Awakening)`;
}

function pointInUiRects(rects: readonly PassiveView[], sx: number, sy: number): boolean {
	for (const r of rects) {
		if (pointInView(r, sx, sy)) return true;
	}
	return false;
}

function regularPoly(
	cx: number,
	cy: number,
	r: number,
	sides: number,
	rotRad: number,
): Phaser.Math.Vector2[] {
	const pts: Phaser.Math.Vector2[] = [];
	for (let i = 0; i < sides; i++) {
		const a = rotRad + (i * Math.PI * 2) / sides;
		pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
	}
	return pts;
}

function starPoly(
	cx: number,
	cy: number,
	outerR: number,
	innerR: number,
	points: number,
	rotRad: number,
): Phaser.Math.Vector2[] {
	const pts: Phaser.Math.Vector2[] = [];
	const total = points * 2;
	for (let i = 0; i < total; i++) {
		const r = i % 2 === 0 ? outerR : innerR;
		const a = rotRad + (i * Math.PI) / points;
		pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
	}
	return pts;
}

/** True when scene-level pointer/wheel events should route to the Passive Constellation. */
export function passiveActive(scene: CharacterScene): boolean {
	return (
		!!scene.passiveWorldC?.active &&
		scene.tab === 4 &&
		hasPassiveTree(save().job) &&
		!scene.passiveConfirm?.active &&
		!scene.showDetail &&
		!scene.showUlt &&
		!scene.showSageGuide
	);
}

/** Applies the current PassiveCamState directly to `passiveWorldC` with zero rebuild. */
export function applyPassiveCam(scene: CharacterScene) {
	const wc = scene.passiveWorldC;
	const cam = scene.passiveCam;
	if (!wc?.active || !cam) return;
	const t = containerTransform(cam, scene.passiveView);
	wc.setPosition(t.x, t.y).setScale(t.scale);
	if (scene.passiveZoomText?.active) {
		scene.passiveZoomText.setText(`${Math.round(cam.zoom * 100)}%`);
	}
}

function stopCamTween(scene: CharacterScene) {
	scene.passiveTween?.stop();
	scene.passiveTween = undefined;
}

function focusCameraOnNode(scene: CharacterScene, node: PassiveNode, animate = true) {
	const cam = scene.passiveCam;
	const bounds = scene.passiveBounds;
	if (!cam || !bounds) return;
	stopCamTween(scene);
	const target = clampCam({ ...cam, panX: node.x, panY: node.y }, bounds, scene.passiveView);
	if (!animate) {
		scene.passiveCam = target;
		applyPassiveCam(scene);
		return;
	}
	const proxy = { panX: cam.panX, panY: cam.panY };
	scene.passiveTween = scene.tweens.add({
		targets: proxy,
		panX: target.panX,
		panY: target.panY,
		duration: 220,
		ease: "Cubic.easeOut",
		onUpdate: () => {
			if (!scene.passiveCam) return;
			scene.passiveCam = { ...scene.passiveCam, panX: proxy.panX, panY: proxy.panY };
			applyPassiveCam(scene);
		},
		onComplete: () => {
			scene.passiveTween = undefined;
		},
	});
}

function resetCameraCenter(scene: CharacterScene, tree: PassiveTreeDef, fitAll = false) {
	const bounds = scene.passiveBounds ?? computeGraphBounds(tree.nodes);
	stopCamTween(scene);
	if (fitAll) {
		scene.passiveCam = fitCamToBounds(
			bounds,
			scene.passiveView,
			PASSIVE_CAM_DEFAULTS.minZoom,
			PASSIVE_CAM_DEFAULTS.maxZoom,
			64,
		);
	} else {
		const origin = passiveNodeById(tree.job, tree.originId);
		const base = createPassiveCam({
			panX: origin?.x ?? 0,
			panY: origin?.y ?? 0,
			zoom: scene.passiveFull ? 1.0 : PASSIVE_CAM_DEFAULTS.zoom,
		});
		scene.passiveCam = clampCam(base, bounds, scene.passiveView);
	}
	applyPassiveCam(scene);
}

function drawNodeRing(
	g: Phaser.GameObjects.Graphics,
	node: PassiveNode,
	color: number,
	alpha: number,
	width: number,
	extraR: number,
) {
	const r = NODE_RADIUS[node.kind] + extraR;
	g.lineStyle(width, color, alpha);
	if (node.kind === "keystone") {
		g.strokePoints(regularPoly(node.x, node.y, r + 1.5, 8, Math.PI / 8), true, true);
	} else if (node.kind === "notable") {
		g.strokePoints(regularPoly(node.x, node.y, r + 1, 6, -Math.PI / 2), true, true);
	} else if (node.kind === "socket") {
		g.strokeRoundedRect(node.x - r, node.y - r, r * 2, r * 2, 6);
	} else {
		g.strokeCircle(node.x, node.y, r);
	}
}

function updateSelectionRing(scene: CharacterScene, tree: PassiveTreeDef) {
	const g = scene.passiveSelRingG;
	if (!g?.active) return;
	g.clear();
	const sel = passiveNodeById(tree.job, scene.passiveSelId);
	if (!sel) return;
	drawNodeRing(g, sel, COLORS.gold, 0.35, 5, 5.5);
	drawNodeRing(g, sel, 0xffffff, 0.95, 2.2, 4);
}

function updateHoverRing(scene: CharacterScene, tree: PassiveTreeDef, nodeId: string) {
	if (scene.passiveHoverId === nodeId) return;
	scene.passiveHoverId = nodeId;
	const g = scene.passiveHoverG;
	if (!g?.active) return;
	g.clear();
	if (nodeId && nodeId !== scene.passiveSelId) {
		const node = passiveNodeById(tree.job, nodeId);
		if (node) drawNodeRing(g, node, 0x9fdcff, 0.85, 2, 4);
	}
	if (!scene.passiveDrag?.moved) {
		const previewId = nodeId || scene.passiveSelId;
		if (scene.passiveFull) {
			if (!scene.passiveFullHideCard) renderFullscreenInspectCard(scene, tree, previewId);
		} else {
			renderPassiveDetail(scene, tree, previewId);
		}
	}
}

/** Scene-level mouse wheel zoom anchored at cursor position. */
export function passiveWheel(
	scene: CharacterScene,
	p: Phaser.Input.Pointer,
	dy: number,
) {
	if (!passiveActive(scene) || !scene.passiveCam || !scene.passiveBounds) return;
	if (!pointInView(scene.passiveView, p.x, p.y)) return;
	if (pointInUiRects(scene.passiveUiRects, p.x, p.y)) return;
	stopCamTween(scene);
	const zoomed = zoomByWheel(scene.passiveCam, scene.passiveView, dy, p.x, p.y);
	scene.passiveCam = clampCam(zoomed, scene.passiveBounds, scene.passiveView);
	applyPassiveCam(scene);
}

/** Scene-level pointer down: starts drag/tap gesture inside passiveView. */
export function passivePointerDown(scene: CharacterScene, p: Phaser.Input.Pointer) {
	if (!passiveActive(scene)) return;
	if (!pointInView(scene.passiveView, p.x, p.y)) return;
	if (pointInUiRects(scene.passiveUiRects, p.x, p.y)) return;
	stopCamTween(scene);
	scene.passiveDrag = {
		pointerId: p.id,
		startX: p.x,
		startY: p.y,
		lastX: p.x,
		lastY: p.y,
		moved: false,
	};
}

/** Scene-level pointer move: drags constellation when down, updates hover ring when idle. */
export function passivePointerMove(scene: CharacterScene, p: Phaser.Input.Pointer) {
	if (!passiveActive(scene) || !scene.passiveCam || !scene.passiveBounds) return;
	const d = scene.passiveDrag;
	if (d && p.isDown && p.id === d.pointerId) {
		if (p.rightButtonDown()) return;
		const dx = p.x - d.lastX;
		const dy = p.y - d.lastY;
		if (!d.moved && Math.hypot(p.x - d.startX, p.y - d.startY) >= DRAG_THRESHOLD_PX) {
			d.moved = true;
			const tree = passiveTreeOf(save().job);
			if (tree) updateHoverRing(scene, tree, "");
		}
		d.lastX = p.x;
		d.lastY = p.y;
		if (d.moved) {
			const panned = panBy(scene.passiveCam, dx, dy);
			scene.passiveCam = clampCam(panned, scene.passiveBounds, scene.passiveView);
			applyPassiveCam(scene);
		}
		return;
	}
	// Hover highlight on desktop when moving cursor inside viewport
	const tree = passiveTreeOf(save().job);
	if (!tree) return;
	if (
		!pointInView(scene.passiveView, p.x, p.y) ||
		pointInUiRects(scene.passiveUiRects, p.x, p.y)
	) {
		updateHoverRing(scene, tree, "");
		return;
	}
	const hit = pickNodeAt(tree.nodes, scene.passiveCam, scene.passiveView, p.x, p.y, NODE_RADIUS);
	updateHoverRing(scene, tree, hit?.id ?? "");
}

/** Scene-level pointer up: ends pan drag, or fires PoE 1-click allocate / right-click refund / inspect. */
export function passivePointerUp(
	scene: CharacterScene,
	p: Phaser.Input.Pointer,
	outside = false,
) {
	const d = scene.passiveDrag;
	if (!d || p.id !== d.pointerId) return;
	scene.passiveDrag = undefined;
	if (outside || d.moved || !passiveActive(scene) || !scene.passiveCam) return;
	if (pointInUiRects(scene.passiveUiRects, p.x, p.y)) return;

	const s = save();
	const tree = passiveTreeOf(s.job);
	if (!tree) return;
	const hit = pickNodeAt(tree.nodes, scene.passiveCam, scene.passiveView, p.x, p.y, NODE_RADIUS);
	if (!hit) return;

	const earned = passiveEarnedFor(s);
	const picked = normalizePassiveNodes(s.job, s.passiveNodes, passiveCtxOf(s));
	const pickedSet = new Set(picked);

	// Right-click (desktop PoE style): immediate refund when allocated
	if (p.rightButtonReleased() || p.button === 2) {
		scene.passiveSelId = hit.id;
		scene.passiveFullHideCard = false;
		if (pickedSet.has(hit.id)) {
			handleNodeToggle(scene, tree, hit);
			return;
		}
		updateSelectionRing(scene, tree);
		if (scene.passiveFull) renderFullscreenInspectCard(scene, tree);
		else renderPassiveDetail(scene, tree);
		return;
	}

	// Left-click / tap: PoE 1-click immediate allocate on allocatable (blue) nodes
	if (canAllocatePassive(s.job, picked, hit.id, earned, passiveCtxOf(s))) {
		scene.passiveSelId = hit.id;
		scene.passiveFullHideCard = false;
		handleNodeToggle(scene, tree, hit);
		return;
	}

	if (scene.passiveSelId !== hit.id) {
		// 1st click on allocated/locked node: inspect without accidental refund
		scene.passiveSelId = hit.id;
		scene.passiveFullHideCard = false;
		unlock();
		sfx.pop();
		updateSelectionRing(scene, tree);
		updateHoverRing(scene, tree, "");
		if (scene.passiveFull) renderFullscreenInspectCard(scene, tree);
		else renderPassiveDetail(scene, tree);
		return;
	}

	// 2nd click on already-selected allocated/locked node: refund or show reason
	handleNodeToggle(scene, tree, hit);
}

function handleNodeToggle(scene: CharacterScene, tree: PassiveTreeDef, node: PassiveNode) {
	const s = save();
	const earned = passiveEarnedFor(s);
	const picked = normalizePassiveNodes(s.job, s.passiveNodes, passiveCtxOf(s));
	const pickedSet = new Set(picked);

	if (node.id === tree.originId) {
		toast(scene, "⭐ จุดเริ่มต้นเปิดใช้ฟรีเสมอ", UI.gold);
		return;
	}

	if (pickedSet.has(node.id)) {
		if (canRefundPassive(s.job, picked, node.id, passiveCtxOf(s))) {
			s.passiveNodes = refundPassive(s.job, picked, node.id, passiveCtxOf(s));
			persist();
			unlock();
			sfx.pop();
			toast(scene, `↩ คืนโหนด "${node.name}" (+1 แต้ม)`, UI.gem);
			scene.redraw();
			return;
		}
		toast(scene, "🔒 โหนดทางผ่าน — คืนโหนดปลายสายก่อน", UI.red);
		return;
	}

	if (canAllocatePassive(s.job, picked, node.id, earned, passiveCtxOf(s))) {
		s.passiveNodes = allocatePassive(s.job, picked, node.id, earned, passiveCtxOf(s));
		persist();
		unlock();
		sfx.pop();
		toast(
			scene,
			`${node.kind === "keystone" ? "👑 ปลดล็อกคีย์สโตน" : "✨ อัปโหนด"} "${node.name}"`,
			node.kind === "keystone" ? UI.gold : UI.green,
		);
		scene.redraw();
		return;
	}

	const free = passiveFree(s.job, picked, earned, passiveCtxOf(s));
	toast(
		scene,
		free < 1 ? "⭐ แต้มพาสซีฟไม่พอ" : "🔒 ต้องเชื่อมจากโหนดที่เรียนแล้วก่อน",
		UI.red,
	);
}

function openResetConfirm(scene: CharacterScene, tree: PassiveTreeDef) {
	const s = save();
	const spent = passiveSpent(s.job, s.passiveNodes, passiveCtxOf(s));
	if (spent <= 0) return;
	scene.passiveConfirm?.destroy();
	const doReset = () => {
		scene.passiveConfirm = undefined;
		s.passiveNodes = [tree.originId];
		persist();
		toast(scene, `🔄 คืนแต้มพาสซีฟทั้งหมด ${spent} แต้มแล้ว`, UI.gold);
		scene.redraw();
	};
	if (spent <= 2) {
		doReset();
		return;
	}
	const dlg = confirm(
		scene,
		"🔄 รีเซ็ตกลุ่มดาวพาสซีฟ?",
		`คืนโหนดที่อัปไว้ทั้งหมด ${spent} โหนด กลับเป็นแต้มพาสซีฟ (ฟรีในเมือง)`,
		"รีเซ็ตฟรี",
		doReset,
	);
	dlg.once("destroy", () => {
		if (scene.passiveConfirm === dlg) scene.passiveConfirm = undefined;
	});
	scene.passiveConfirm = dlg;
}

/** Compact left-sidebar header for Tab 4 Passive Tree (called by `preview.ts`). */
export function drawPassiveHeroStrip(
	scene: CharacterScene,
	c: Phaser.GameObjects.Container,
) {
	const s = save();
	const j3 = activeJob3(s);
	const cls = j3
		? `${JOB3[j3].icon} ${JOB3[j3].name}`
		: s.job2
			? `${JOB2[s.job2].icon} ${JOB2[s.job2].name}`
			: `${JOBS[s.job].icon} ${JOBS[s.job].name}`;
	const earned = passiveEarnedFor(s);
	const free = passiveFree(s.job, s.passiveNodes, earned, passiveCtxOf(s));

	c.add(
		clipW(
			txt(
				scene,
				28,
				78,
				`${s.supporter ? "🌟 " : ""}${s.name} · ${cls}`,
				13,
				s.supporter ? UI.gold : UI.text,
				true,
			),
			274,
		),
	);
	c.add(
		clipW(
			txt(
				scene,
				28,
				98,
				`⭐ แต้มพาสซีฟ: เหลือ ${free} / ${earned} (Max ${PASSIVE_MAX_POINTS})`,
				12.5,
				free > 0 ? UI.gold : UI.sub,
				true,
			),
			274,
		),
	);

	const p1 = Math.floor(Math.max(0, s.jobLevel) / PASSIVE_RULES.job1Every);
	const parts: string[] = [`ได้ทุก J1/${PASSIVE_RULES.job1Every} Lv (+${p1})`];
	if (s.job2 && JOB2[s.job2]?.parent === s.job) {
		const lv2 = s.job2Level ?? 1;
		const p2 = Math.floor(Math.max(0, lv2) / PASSIVE_RULES.job2Every);
		parts.push(`J2/${PASSIVE_RULES.job2Every} Lv (+${p2})`);
	} else {
		parts.push(`J2/${PASSIVE_RULES.job2Every}`);
	}
	if (j3) {
		const lv3 = s.job3Level ?? 1;
		const p3 = Math.floor(Math.max(0, lv3) / PASSIVE_RULES.job3Every);
		parts.push(`J3/${PASSIVE_RULES.job3Every} Lv (+${p3})`);
	} else {
		parts.push(`J3/${PASSIVE_RULES.job3Every}`);
	}
	c.add(clipW(txt(scene, 28, 117, parts.join(" · "), 9.5, UI.sub), 274));

	const g = scene.add.graphics();
	g.lineStyle(1, UI.line, 0.85).lineBetween(26, 132, 304, 132);
	c.add(g);
}

/** Main Tab 4 entry point for jobs migrated to the PoE Passive Constellation. */
export function passiveTab(scene: CharacterScene) {
	const s = save();
	const tree = passiveTreeOf(s.job);
	if (!tree) return;

	const earned = passiveEarnedFor(s);
	const spent = passiveSpent(s.job, s.passiveNodes, passiveCtxOf(s));
	const free = passiveFree(s.job, s.passiveNodes, earned, passiveCtxOf(s));
	const defaultSelId = () => {
		if (spent === 0 && free > 0) {
			const origin = passiveNodeById(s.job, tree.originId);
			const starterId = origin?.edges.find((id) =>
				canAllocatePassive(s.job, s.passiveNodes, id, earned, passiveCtxOf(s)),
			);
			if (starterId) return starterId;
		}
		return tree.originId;
	};

	// Reset per-job camera/selection if job changed
	if (scene.passiveTreeJob !== s.job) {
		scene.passiveTreeJob = s.job;
		scene.passiveCam = undefined;
		scene.passiveSelId = defaultSelId();
		scene.passiveTag = null;
		scene.passiveFull = false;
	}

	const bounds = computeGraphBounds(tree.nodes);
	scene.passiveBounds = bounds;
	scene.passiveUiRects = [];
	scene.passiveHoverId = "";
	stopCamTween(scene);

	if (!scene.passiveSelId || !passiveNodeById(s.job, scene.passiveSelId)) {
		scene.passiveSelId = defaultSelId();
	}

	if (scene.passiveFull) {
		renderFullscreenModal(scene, tree, bounds);
		return;
	}

	const b = scene.body!;
	const view: PassiveView = { ...PASSIVE_VIEW_DEFAULT };
	scene.passiveView = view;

	if (!scene.passiveCam) {
		const origin = passiveNodeById(s.job, tree.originId);
		scene.passiveCam = clampCam(
			createPassiveCam({
				panX: origin?.x ?? 0,
				panY: origin?.y ?? 0,
				zoom: PASSIVE_CAM_DEFAULTS.zoom,
			}),
			bounds,
			view,
		);
	} else {
		scene.passiveCam = clampCam(scene.passiveCam, bounds, view);
	}

	// 1. Top Filter Pills + Reset + Fullscreen strip (y: 108..142, x: 326..942)
	buildFilterPills(scene, b, tree, 326, 125);

	b.add(
		button(
			scene,
			774,
			125,
			96,
			26,
			"🔄 รีเซ็ตฟรี",
			() => openResetConfirm(scene, tree),
			{ size: 11.5, fill: 0x5a5f8a, color: UI.text },
		).setEnabled(spent > 0),
	);
	b.add(
		button(
			scene,
			886,
			125,
			108,
			26,
			"⛶ เต็มจอ",
			() => {
				scene.passiveFull = true;
				scene.passiveFullHideCard = false;
				scene.render();
			},
			{ size: 11.5, fill: 0x3b587d, color: UI.text },
		),
	);

	// 2. Constellation Viewport (x: 326..942, y: 146..540 — 616x394)
	buildConstellationCanvas(scene, b, tree, view, false);

	// 3. Bottom hint / legend bar (y: 544..564)
	b.add(
		clipW(
			txt(
				scene,
				328,
				545,
				"คลิกโหนดขอบฟ้า = อัปทันที · ชี้เมาส์ดูผล · คลิกซ้ำ/คลิกขวาโหนดทอง = คืนฟรี · ลากเลื่อน · ลูกกลิ้งซูม",
				10.5,
				UI.sub,
			),
			612,
		),
	);

	// 4. Left-panel Inspect-then-Allocate detail card
	renderPassiveDetail(scene, tree);
}

function buildFilterPills(
	scene: CharacterScene,
	parent: Phaser.GameObjects.Container,
	tree: PassiveTreeDef,
	startX: number,
	centerY: number,
) {
	let cx = startX;
	for (const f of tree.filters) {
		const active = scene.passiveTag === f.tag;
		const label = `${f.icon} ${f.label}`;
		const w = f.label.length >= 6 ? 100 : 68;
		const btn = button(
			scene,
			cx + w / 2,
			centerY,
			w,
			26,
			label,
			() => {
				scene.passiveTag = active ? null : f.tag;
				scene.render();
			},
			{
				size: 11,
				fill: active ? COLORS.gold : 0x2f365a,
				color: active ? UI.ink : UI.text,
			},
		);
		parent.add(btn);
		cx += w + 4;
	}
}

function buildConstellationCanvas(
	scene: CharacterScene,
	parent: Phaser.GameObjects.Container,
	tree: PassiveTreeDef,
	view: PassiveView,
	isFullscreen: boolean,
) {
	const s = save();
	const earned = passiveEarnedFor(s);
	const picked = normalizePassiveNodes(s.job, s.passiveNodes, passiveCtxOf(s));
	const pickedSet = new Set(picked);
	const free = passiveFree(s.job, picked, earned, passiveCtxOf(s));
	const filter = computeTagFilter(tree.nodes, scene.passiveTag);
	const ctx = passiveCtxOf(s);
	const lockedSet = new Set(tree.nodes.filter((n) => !passiveNodeUnlocked(n, ctx)).map((n) => n.id));

	// Frame background
	const frameBg = scene.add.graphics();
	frameBg.fillStyle(0x0b0e1e, 0.96).fillRoundedRect(view.x, view.y, view.w, view.h, 10);
	frameBg
		.lineStyle(1.5, isFullscreen ? UI.goldDark : UI.line, 0.9)
		.strokeRoundedRect(view.x, view.y, view.w, view.h, 10);
	parent.add(frameBg);

	// Geometry mask clipping worldC strictly to view
	const maskShape = scene.make.graphics({});
	maskShape.fillStyle(0xffffff).fillRect(view.x, view.y, view.w, view.h);
	const mask = maskShape.createGeometryMask();
	parent.once("destroy", () => maskShape.destroy());

	const worldC = scene.add.container(0, 0);
	worldC.setMask(mask);
	parent.add(worldC);
	scene.passiveWorldC = worldC;

	// Layer 1: Cosmic backdrop (sector nebula glows + deterministic starfield + concentric ring guides)
	const bgG = scene.add.graphics();
	const quadPos: readonly [number, number, number][] = [
		[-270, -215, 0.055],
		[275, -215, 0.065],
		[270, 215, 0.055],
		[-265, 215, 0.055],
	];
	tree.quadrants.forEach((sec, idx) => {
		const [qx, qy, qa] = quadPos[idx];
		bgG.fillStyle(SECTOR_META[sec].color, qa).fillCircle(qx, qy, 240);
	});
	bgG.lineStyle(1, 0x2e375e, 0.45).strokeCircle(0, 0, 112);
	bgG.lineStyle(1, 0x242c4e, 0.34).strokeCircle(0, 0, 225);
	bgG.lineStyle(1, 0x1e2545, 0.28).strokeCircle(0, 0, 355);
	// 🌟 Awakening ring: golden guide + a glow behind each 3rd-job cluster (bright when it is the hero's own)
	if (tree.nodes.some((n) => n.awaken)) {
		const ringOpen = ctx.job3 !== undefined;
		bgG.lineStyle(ringOpen ? 1.6 : 1, 0xffc85a, ringOpen ? 0.32 : 0.14).strokeCircle(0, 0, 580);
		for (const a of AWAKEN_LABELS) {
			if (!tree.nodes.some((n) => n.awaken?.includes(a.job3))) continue;
			bgG.fillStyle(0xffc85a, ctx.job3 === a.job3 ? 0.08 : 0.025).fillEllipse(a.x, a.glowY, 520, 250);
		}
	}

	let seed = 4219;
	for (let i = 0; i < 96; i++) {
		seed = (seed * 16807) % 2147483647;
		const sx = ((seed % 1160) - 580);
		seed = (seed * 16807) % 2147483647;
		const sy = ((seed % 1480) - 740);
		seed = (seed * 16807) % 2147483647;
		const r = 0.7 + (seed % 10) * 0.1;
		const a = 0.14 + (seed % 7) * 0.05;
		bgG.fillStyle(0xdbe5ff, a).fillCircle(sx, sy, r);
	}
	worldC.add(bgG);

	// Sector quadrant labels
	for (const sec of tree.quadrants) {
		const meta = SECTOR_META[sec];
		const lbl = scene.add
			.text(meta.lx, meta.ly, meta.label, {
				fontFamily: FONT_UI,
				fontSize: "13px",
				fontStyle: "bold",
				color: meta.hex,
				stroke: "#0b0e1e",
				strokeThickness: 4,
			})
			.setOrigin(0.5)
			.setAlpha(filter.active ? 0.5 : 0.82);
		worldC.add(lbl);
	}
	for (const a of AWAKEN_LABELS) {
		if (!tree.nodes.some((n) => n.awaken?.includes(a.job3))) continue;
		const mine = ctx.job3 === a.job3;
		const def = JOB3[a.job3];
		const lbl = scene.add
			.text(a.x, a.y, `${mine ? "🌟" : "🔒"} ${def.icon} ${def.name} · ตื่นรู้`, {
				fontFamily: FONT_UI,
				fontSize: "13px",
				fontStyle: "bold",
				color: mine ? SECTOR_META.awaken.hex : "#8a8fa8",
				stroke: "#0b0e1e",
				strokeThickness: 4,
			})
			.setOrigin(0.5)
			.setAlpha(filter.active ? 0.5 : mine ? 0.9 : 0.6);
		worldC.add(lbl);
	}

	// Precompute allocatable / adjacent sets
	const nodeMap = new Map<string, PassiveNode>();
	for (const n of tree.nodes) nodeMap.set(n.id, n);
	const canAllocSet = new Set<string>();
	const adjToAllocSet = new Set<string>();
	for (const n of tree.nodes) {
		if (pickedSet.has(n.id)) continue;
		const adj = n.edges.some((nb) => pickedSet.has(nb));
		if (adj) adjToAllocSet.add(n.id);
		if (adj && free >= 1 && n.id !== tree.originId && !lockedSet.has(n.id)) canAllocSet.add(n.id);
	}

	// Layer 2: Undirected edges (unreached / allocatable / allocated)
	const edgeG = scene.add.graphics();
	for (const a of tree.nodes) {
		for (const bId of a.edges) {
			if (a.id >= bId) continue; // draw each undirected edge once
			const bNode = nodeMap.get(bId);
			if (!bNode) continue;

			const bothPicked = pickedSet.has(a.id) && pickedSet.has(bId);
			const lockedEdge = lockedSet.has(a.id) || lockedSet.has(bId);
			const onePicked = pickedSet.has(a.id) || pickedSet.has(bId);
			const isFrontier = onePicked && !bothPicked;
			const matchDim =
				filter.active &&
				!bothPicked &&
				!filter.matchedIds.has(a.id) &&
				!filter.matchedIds.has(bId);

			if (bothPicked) {
				edgeG.lineStyle(6, COLORS.gold, 0.22).lineBetween(a.x, a.y, bNode.x, bNode.y);
				edgeG.lineStyle(2.6, 0xffdf88, 0.95).lineBetween(a.x, a.y, bNode.x, bNode.y);
			} else if (lockedEdge) {
				edgeG.lineStyle(1.2, 0x3b466f, matchDim ? 0.1 : 0.26).lineBetween(a.x, a.y, bNode.x, bNode.y);
			} else if (isFrontier) {
				const col = free >= 1 ? 0x72c8ff : 0x6775a6;
				const alp = matchDim ? 0.28 : free >= 1 ? 0.85 : 0.6;
				edgeG.lineStyle(2.2, col, alp).lineBetween(a.x, a.y, bNode.x, bNode.y);
			} else {
				const alp = matchDim ? 0.18 : 0.56;
				edgeG.lineStyle(1.6, 0x3b466f, alp).lineBetween(a.x, a.y, bNode.x, bNode.y);
			}
		}
	}
	worldC.add(edgeG);

	// Layer 3: Nodes (shape, fill, border, filter beacon, icon, label)
	const nodeG = scene.add.graphics();
	worldC.add(nodeG);

	for (const n of tree.nodes) {
		const isOrigin = n.id === tree.originId;
		const isPicked = pickedSet.has(n.id);
		const isAlloc = canAllocSet.has(n.id);
		const isAdj = adjToAllocSet.has(n.id);
		const isMatch = filter.active && filter.matchedIds.has(n.id);
		const isLocked = lockedSet.has(n.id);
		const dimmed = (filter.active && !isMatch && !isOrigin) || isLocked;
		const alpha = isLocked ? 0.38 : dimmed ? 0.28 : 1;
		const secCol = SECTOR_META[n.sector].color;
		const r = NODE_RADIUS[n.kind];

		// Tag filter highlight beacon behind matching nodes
		if (isMatch) {
			nodeG.fillStyle(0x6fd08c, 0.22).fillCircle(n.x, n.y, r + 9);
			drawNodeRing(nodeG, n, 0x6fd08c, 0.95, 2.2, 6);
		}

		// Soft allocated aura
		if (isPicked) {
			nodeG
				.fillStyle(COLORS.gold, isOrigin || n.kind === "keystone" ? 0.22 : 0.15)
				.fillCircle(n.x, n.y, r + 6);
		} else if (isAlloc && !dimmed) {
			nodeG.fillStyle(0x7fd7ff, 0.12).fillCircle(n.x, n.y, r + 4.5);
		}

		const fillCol = isOrigin
			? 0x3f2f12
			: isPicked
				? n.kind === "keystone"
					? 0x453114
					: 0x2d3859
				: isAlloc
					? 0x203254
					: 0x15192e;

		const strokeCol = isOrigin || isPicked
			? COLORS.gold
			: isAlloc
				? 0x7fd7ff
				: isAdj
					? 0x7a88b8
					: n.kind === "keystone"
						? UI.goldRim
						: n.kind === "notable"
							? secCol
							: 0x424d78;

		const strokeW =
			isOrigin || n.kind === "keystone"
				? isPicked
					? 2.8
					: 2.2
				: n.kind === "notable"
					? isPicked || isAlloc
						? 2.4
						: 1.8
					: isPicked || isAlloc
						? 2.1
						: 1.5;

		drawNodeBody(nodeG, n, r, fillCol, strokeCol, strokeW, alpha, secCol);

		// Emoji icon centered on node
		const iconSize =
			n.kind === "origin" || n.kind === "keystone"
				? "18px"
				: n.kind === "notable"
					? "14px"
					: "11px";
		const ico = scene.add
			.text(n.x, n.y, n.icon, {
				fontFamily: FONT_UI,
				fontSize: iconSize,
			})
			.setOrigin(0.5)
			.setAlpha(dimmed ? 0.32 : isPicked || isAlloc || isOrigin ? 1 : 0.8);
		worldC.add(ico);
		if (isLocked && n.kind !== "minor") {
			const lock = scene.add
				.text(n.x + r * 0.75, n.y - r * 0.75, "🔒", { fontFamily: FONT_UI, fontSize: "9px" })
				.setOrigin(0.5)
				.setAlpha(0.85);
			worldC.add(lock);
		}

		// Name labels for landmarks (origin, keystones, notables) so constellation is readable at a glance
		if (n.kind !== "minor") {
			const labelY = n.y + r + (n.kind === "keystone" || isOrigin ? 9 : 7);
			const labelCol = isPicked || isOrigin
				? "#ffe394"
				: isAlloc
					? "#c8ecff"
					: n.kind === "keystone"
						? "#e5d5b3"
						: "#b0b7d8";
			const lb = scene.add
				.text(n.x, labelY, n.name, {
					fontFamily: FONT_UI,
					fontSize: n.kind === "keystone" || isOrigin ? "10px" : "8.5px",
					fontStyle: n.kind === "keystone" || isOrigin ? "bold" : "normal",
					color: labelCol,
					stroke: "#090c1a",
					strokeThickness: 3,
				})
				.setOrigin(0.5, 0)
				.setAlpha(dimmed ? 0.25 : 0.95);
			worldC.add(lb);
		}
	}

	// Layer 4: Hover ring + Selection reticle ring (updated in-place without canvas rebuild)
	const hoverG = scene.add.graphics();
	const selG = scene.add.graphics();
	worldC.add([hoverG, selG]);
	scene.passiveHoverG = hoverG;
	scene.passiveSelRingG = selG;
	updateSelectionRing(scene, tree);

	// Apply initial camera transform
	applyPassiveCam(scene);

	// Layer 5: Tag filter active badge (top-left inside viewport)
	if (filter.active) {
		const fMeta = tree.filters.find((f) => f.tag === filter.tag);
		const tagText = `${fMeta ? `${fMeta.icon} ${fMeta.label}` : filter.tag} · พบ ${filter.matchCount} โหนด`;
		const badgeG = scene.add.graphics();
		const bw = 152,
			bh = 24,
			bx = view.x + 8,
			by = view.y + 8;
		badgeG.fillStyle(0x13261d, 0.92).fillRoundedRect(bx, by, bw, bh, 12);
		badgeG.lineStyle(1, 0x6fd08c, 0.9).strokeRoundedRect(bx, by, bw, bh, 12);
		parent.add(badgeG);
		parent.add(
			clipW(txt(scene, bx + 10, by + 4, tagText, 11, UI.green, true), bw - 18),
		);
	}

	// Layer 6: Floating zoom & center toolbar docked at bottom-right inside viewport
	buildZoomToolbar(scene, parent, tree, view, isFullscreen);
}

function drawNodeBody(
	g: Phaser.GameObjects.Graphics,
	n: PassiveNode,
	r: number,
	fillCol: number,
	strokeCol: number,
	strokeW: number,
	alpha: number,
	secCol: number,
) {
	if (n.kind === "origin") {
		// Royal 8-point crest + double circular ring
		const crest = starPoly(n.x, n.y, r + 4, r - 2, 8, -Math.PI / 8);
		g.fillStyle(0x241c0d, alpha).fillPoints(crest, true);
		g.lineStyle(1.4, COLORS.gold, alpha * 0.75).strokePoints(crest, true, true);
		g.fillStyle(fillCol, alpha).fillCircle(n.x, n.y, r - 2);
		g.lineStyle(strokeW, strokeCol, alpha).strokeCircle(n.x, n.y, r - 2);
		return;
	}

	if (n.kind === "keystone") {
		// Ornate outer octagon + inner beveled ring + cardinal spikes
		const outer = regularPoly(n.x, n.y, r + 1.5, 8, Math.PI / 8);
		const inner = regularPoly(n.x, n.y, r - 3.5, 8, Math.PI / 8);
		g.fillStyle(0x0c0e1c, alpha).fillPoints(outer, true);
		g.fillStyle(fillCol, alpha).fillPoints(inner, true);
		g.lineStyle(strokeW, strokeCol, alpha).strokePoints(outer, true, true);
		g.lineStyle(1.1, secCol, alpha * 0.7).strokePoints(inner, true, true);
		// 4 cardinal accent studs
		const studs: [number, number][] = [
			[0, -(r + 2.5)],
			[r + 2.5, 0],
			[0, r + 2.5],
			[-(r + 2.5), 0],
		];
		for (const [ox, oy] of studs) {
			g.fillStyle(strokeCol, alpha).fillCircle(n.x + ox, n.y + oy, 2.3);
		}
		return;
	}

	if (n.kind === "notable") {
		// Crisp hexagon with subtle inner rim
		const hex = regularPoly(n.x, n.y, r, 6, -Math.PI / 2);
		const inner = regularPoly(n.x, n.y, r - 3, 6, -Math.PI / 2);
		g.fillStyle(fillCol, alpha).fillPoints(hex, true);
		g.lineStyle(strokeW, strokeCol, alpha).strokePoints(hex, true, true);
		g.lineStyle(1, secCol, alpha * 0.45).strokePoints(inner, true, true);
		return;
	}

	if (n.kind === "socket") {
		g.fillStyle(fillCol, alpha).fillRoundedRect(n.x - r, n.y - r, r * 2, r * 2, 5);
		g.lineStyle(strokeW, strokeCol, alpha).strokeRoundedRect(
			n.x - r,
			n.y - r,
			r * 2,
			r * 2,
			5,
		);
		return;
	}

	// Minor travel node: clean circle
	g.fillStyle(fillCol, alpha).fillCircle(n.x, n.y, r);
	g.lineStyle(strokeW, strokeCol, alpha).strokeCircle(n.x, n.y, r);
}

function buildZoomToolbar(
	scene: CharacterScene,
	parent: Phaser.GameObjects.Container,
	tree: PassiveTreeDef,
	view: PassiveView,
	isFullscreen: boolean,
) {
	const barW = isFullscreen ? 202 : 168;
	const barH = 32;
	const bx = view.x + view.w - barW - 8;
	const by = view.y + view.h - barH - 8;
	const cy = by + barH / 2;

	// Register toolbar bounds so pointer clicks/scrolls don't pass through to canvas
	scene.passiveUiRects.push({ x: bx - 2, y: by - 2, w: barW + 4, h: barH + 4 });

	const bg = scene.add.graphics();
	bg.fillStyle(0x13172b, 0.92).fillRoundedRect(bx, by, barW, barH, 8);
	bg.lineStyle(1.2, UI.line, 0.9).strokeRoundedRect(bx, by, barW, barH, 8);
	parent.add(bg);

	const applyStep = (dir: 1 | -1) => {
		if (!scene.passiveCam || !scene.passiveBounds) return;
		stopCamTween(scene);
		scene.passiveCam = clampCam(
			zoomStep(scene.passiveCam, scene.passiveView, dir),
			scene.passiveBounds,
			scene.passiveView,
		);
		applyPassiveCam(scene);
	};

	parent.add(
		button(scene, bx + 18, cy, 28, 24, "−", () => applyStep(-1), {
			size: 14,
			fill: 0x323a5e,
			color: UI.text,
		}),
	);

	const pctTxt = scene.add
		.text(
			bx + 56,
			cy,
			`${Math.round((scene.passiveCam?.zoom ?? PASSIVE_CAM_DEFAULTS.zoom) * 100)}%`,
			{
				fontFamily: FONT_NUM,
				fontSize: "12px",
				fontStyle: "bold",
				color: UI.text,
			},
		)
		.setOrigin(0.5);
	parent.add(pctTxt);
	scene.passiveZoomText = pctTxt;

	parent.add(
		button(scene, bx + 94, cy, 28, 24, "+", () => applyStep(1), {
			size: 14,
			fill: 0x323a5e,
			color: UI.text,
		}),
	);

	parent.add(
		button(
			scene,
			bx + 138,
			cy,
			46,
			24,
			"⊙ กลาง",
			() => resetCameraCenter(scene, tree, false),
			{ size: 10.5, fill: 0x424a72, color: UI.gold },
		),
	);

	if (isFullscreen) {
		parent.add(
			button(
				scene,
				bx + 182,
				cy,
				30,
				24,
				"⤢",
				() => resetCameraCenter(scene, tree, true),
				{ size: 12, fill: 0x3b587d, color: UI.text },
			),
		);
	}
}

/** Computes up to 3 real derived stat changes when toggling an immediately toggleable node. */
function computeStatPreview(
	s: SaveData,
	node: PassiveNode,
	allocated: boolean,
	canAlloc: boolean,
	canRefund: boolean,
	earned: number,
): { heading: string; rows: { label: string; now: string; next: string }[] } | null {
	if (!canAlloc && !(allocated && canRefund)) return null;
	const picked = normalizePassiveNodes(s.job, s.passiveNodes, passiveCtxOf(s));
	const nextPicked = allocated
		? refundPassive(s.job, picked, node.id, passiveCtxOf(s))
		: allocatePassive(s.job, picked, node.id, Math.max(earned, picked.length), passiveCtxOf(s));

	const stNow = heroStats(s);
	const stNext = heroStats({ ...s, passiveNodes: nextPicked });

	const rowsNow = derivedRows(stNow, s.job, s.job2);
	const rowsNext = derivedRows(stNext, s.job, s.job2);
	if (stNow.poisonDmg !== stNext.poisonDmg) {
		rowsNow.push(["ดาเมจพิษ / stack", `${stNow.poisonDmg.toFixed(1)}`]);
		rowsNext.push(["ดาเมจพิษ / stack", `${stNext.poisonDmg.toFixed(1)}`]);
	}
	if (stNow.poisonCap !== stNext.poisonCap) {
		rowsNow.push(["เพดานพิษ (stacks)", `${stNow.poisonCap}`]);
		rowsNext.push(["เพดานพิษ (stacks)", `${stNext.poisonCap}`]);
	}
	if (stNow.j2Guard !== stNext.j2Guard) {
		rowsNow.push(["Auto Guard", `${Math.round(stNow.j2Guard * 100)}%`]);
		rowsNext.push(["Auto Guard", `${Math.round(stNext.j2Guard * 100)}%`]);
	}

	const diff = rowsNow
		.map(([label, now], i) => ({ label, now, next: rowsNext[i][1] }))
		.filter((r) => r.now !== r.next)
		.slice(0, 3);

	if (diff.length === 0) return null;
	return {
		heading: allocated ? "🔢 ค่าพลังหากคืนโหนด" : "🔢 ผลรวมตอนนี้ → หากอัป",
		rows: diff,
	};
}

function statusMetaOf(
	node: PassiveNode,
	tree: PassiveTreeDef,
	allocated: boolean,
	canAlloc: boolean,
	canRefund: boolean,
	free: number,
	adj: boolean,
	ctx?: PassiveCtx,
): { text: string; bg: number; border: number; color: string } {
	const lockText = ctx ? awakenLockText(node, ctx) : undefined;
	if (lockText && !allocated) {
		return { text: lockText, bg: 0x2a2416, border: 0x8a7440, color: "#e5d5b3" };
	}
	if (node.id === tree.originId) {
		return {
			text: "⭐ จุดเริ่มต้นอาชีพ (เปิดใช้ฟรี)",
			bg: 0x2f2612,
			border: COLORS.gold,
			color: UI.gold,
		};
	}
	if (allocated && canRefund) {
		return {
			text: "✅ เรียนแล้ว · แตะซ้ำหรือกดคืนแต้มได้ฟรี",
			bg: 0x1b3a28,
			border: 0x6fd08c,
			color: UI.green,
		};
	}
	if (allocated) {
		return {
			text: "✅ เรียนแล้ว · โหนดทางผ่าน (คืนปลายสายก่อน)",
			bg: 0x2e2815,
			border: UI.goldDark,
			color: "#ffd984",
		};
	}
	if (canAlloc) {
		return {
			text: "✨ พร้อมอัป (1 แต้ม) · คลิกบนโหนดหรือกดปุ่มได้เลย",
			bg: 0x18304d,
			border: 0x7fd7ff,
			color: UI.gem,
		};
	}
	if (adj && free < 1) {
		return {
			text: "⚠️ เชื่อมแล้ว แต่แต้มพาสซีฟไม่พอ",
			bg: 0x3a2b17,
			border: UI.goldDark,
			color: "#ffd984",
		};
	}
	return {
		text: "🔒 ต้องเชื่อมต่อจากโหนดที่เรียนแล้วก่อน",
		bg: 0x341c24,
		border: 0xa85566,
		color: "#ffb0b0",
	};
}

function statDiffColor(now: string, next: string, fallback: string): string {
	const a = now.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
	const b = next.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
	if (a.length === b.length && a.length > 0) {
		for (let i = 0; i < a.length; i++) {
			if (a[i] !== b[i]) return b[i] > a[i] ? UI.green : UI.red;
		}
	}
	return fallback;
}

/** Left-sidebar Inspect-then-Allocate detail panel (normal Tab 4 mode). */
function renderPassiveDetail(scene: CharacterScene, tree: PassiveTreeDef, previewId?: string) {
	scene.passiveDetailC?.destroy();
	const dc = scene.add.container(0, 0);
	scene.passiveDetailC = dc;
	scene.body!.add(dc);

	const s = save();
	const ctx = passiveCtxOf(s);
	const targetId = previewId || scene.passiveSelId;
	const node = passiveNodeById(s.job, targetId) ?? passiveNodeById(s.job, tree.originId);
	if (!node) return;

	const earned = passiveEarnedFor(s);
	const picked = normalizePassiveNodes(s.job, s.passiveNodes, passiveCtxOf(s));
	const pickedSet = new Set(picked);
	const free = passiveFree(s.job, picked, earned, passiveCtxOf(s));
	const allocated = pickedSet.has(node.id);
	const isOrigin = node.id === tree.originId;
	const adj = !allocated && node.edges.some((nb) => pickedSet.has(nb));
	const canAlloc = canAllocatePassive(s.job, picked, node.id, earned, passiveCtxOf(s));
	const canRefund = canRefundPassive(s.job, picked, node.id, passiveCtxOf(s));

	const x = 28;
	const w = 274;
	const top = 138;
	const btnY = 528;

	// Title + Kind/Sector badge
	dc.add(clipW(txt(scene, x, top, `${node.icon} ${node.name}`, 16.5, UI.gold, true), w));
	const kindMeta = KIND_META[node.kind];
	const secMeta = SECTOR_META[node.sector];
	dc.add(
		clipW(
			txt(
				scene,
				x,
				top + 23,
				`${kindMeta.label} · ${secMeta.label}`,
				11,
				kindMeta.color,
				true,
			),
			w,
		),
	);

	// Status pill
	const stMeta = statusMetaOf(node, tree, allocated, canAlloc, canRefund, free, adj, passiveCtxOf(s));
	const stG = scene.add.graphics();
	stG.fillStyle(stMeta.bg, 0.95).fillRoundedRect(x - 2, top + 42, w + 4, 21, 5);
	stG.lineStyle(1, stMeta.border, 0.85).strokeRoundedRect(x - 2, top + 42, w + 4, 21, 5);
	dc.add(stG);
	dc.add(clipW(txt(scene, x + 6, top + 45, stMeta.text, 10, stMeta.color, true), w - 10));

	// Optional stat diff preview box anchored right above bottom buttons
	const preview = computeStatPreview(s, node, allocated, canAlloc, canRefund, earned);
	const numH = preview ? 22 + preview.rows.length * 32 : 0;
	const numTop = btnY - 26 - numH;
	if (preview) {
		const bg = scene.add.graphics();
		bg.fillStyle(0x0d1020, 0.78).fillRoundedRect(x - 4, numTop - 2, w + 8, numH, 6);
		bg.lineStyle(1, UI.line, 0.6).strokeRoundedRect(x - 4, numTop - 2, w + 8, numH, 6);
		dc.add(bg);
		dc.add(txt(scene, x + 2, numTop + 2, preview.heading, 11, UI.gold, true));
		preview.rows.forEach((r, i) => {
			const ry = numTop + 20 + i * 32;
			dc.add(clipW(txt(scene, x + 2, ry, r.label, 10, "#b8c0e8"), w - 4));
			const nowT = clipW(txt(scene, x + 2, ry + 13, r.now, 11.5, UI.text, true), w - 4);
			dc.add(nowT);
			const nx = x + 2 + nowT.width + 6;
			const nextCol = statDiffColor(r.now, r.next, allocated ? "#ffd984" : UI.green);
			dc.add(
				clipW(
					txt(scene, nx, ry + 13, `→ ${r.next}`, 11.5, nextCol, true),
					Math.max(20, x + w - nx),
				),
			);
		});
	}

	// Auto-shrinking body sections (Keystone green upside / red downside OR regular desc)
	const sections: {
		head: string;
		headCol: string;
		body: string;
		bodyCol: string;
		boxFill?: number;
		boxBorder?: number;
	}[] = [];

	if (node.upside || node.downside) {
		if (node.upside) {
			sections.push({
				head: "✅ ข้อดี (Upside)",
				headCol: UI.green,
				body: node.upside,
				bodyCol: "#d4f7df",
				boxFill: 0x132b1f,
				boxBorder: 0x4ca66d,
			});
		}
		if (node.downside) {
			sections.push({
				head: "⚠️ ข้อเสีย / เงื่อนไข (Downside)",
				headCol: UI.red,
				body: node.downside,
				bodyCol: "#ffd0d0",
				boxFill: 0x33161d,
				boxBorder: 0xc95a66,
			});
		}
	} else if (node.kind === "socket") {
		const jw = s.jewels?.find((j) => j.id === s.jewelSock?.[node.id]);
		sections.push({
			head: jw ? jewelName(jw) : "💎 ช่องนี้ยังว่าง",
			headCol: jw ? "#7fd7ff" : UI.sub,
			body: jw
				? `${jewelLinesText(jw)}${allocated ? "" : "\n(อัปโหนดนี้ก่อน ค่าถึงจะทำงาน)"}`
				: node.desc(ctx),
			bodyCol: jw ? UI.green : UI.text,
		});
	} else {
		sections.push({
			head: "📖 ผลของโหนด",
			headCol: UI.gold,
			body: node.desc(ctx),
			bodyCol: UI.text,
		});
	}

	if (node.tags.length > 0) {
		const tagsText = node.tags.map((t) => `#${TAG_THAI[t] ?? t}`).join("  ");
		sections.push({
			head: "🏷️ หมวดบิลด์",
			headCol: "#98a4d4",
			body: tagsText,
			bodyCol: "#c2caf0",
		});
	}

	let size = 13;
	let made: Phaser.GameObjects.GameObject[] = [];
	const bodyTop = top + 70;
	const jewelBtnY = Math.min(btnY - 48, numTop - 24); // 💎 socket nodes: "เลือก Jewel" sits above the stat preview / bottom buttons
	const maxBottom = node.kind === "socket" ? Math.min(numTop, jewelBtnY - 18) - 8 : numTop - 8;

	for (; ; size -= 0.5) {
		made.forEach((m) => m.destroy());
		made = [];
		let ty = bodyTop;
		for (const sc of sections) {
			const hasBox = sc.boxFill !== undefined;
			const padX = hasBox ? 7 : 0;
			const padY = hasBox ? 5 : 0;
			const boxStart = ty;
			ty += padY;

			const hd = txt(scene, x + padX, ty, sc.head, size, sc.headCol, true);
			ty += hd.height + 2;
			const bd = txt(scene, x + padX, ty, sc.body, Math.max(9.5, size - 0.5), sc.bodyCol)
				.setWordWrapWidth(w - padX * 2, true)
				.setLineSpacing(2);
			ty += bd.height + padY;

			if (hasBox) {
				const boxG = scene.add.graphics();
				boxG
					.fillStyle(sc.boxFill!, 0.92)
					.fillRoundedRect(x - 2, boxStart, w + 4, ty - boxStart, 6);
				boxG
					.lineStyle(1, sc.boxBorder!, 0.85)
					.strokeRoundedRect(x - 2, boxStart, w + 4, ty - boxStart, 6);
				made.push(boxG);
			}
			made.push(hd, bd);
			ty += 8;
		}
		if (ty <= maxBottom || size <= 9.5) break;
	}
	dc.add(made);

	if (node.kind === "socket")
		dc.add(
			button(
				scene,
				x + w / 2,
				jewelBtnY,
				w,
				34,
				s.jewelSock?.[node.id] ? "💎 เปลี่ยน / ถอด Jewel" : "💎 ใส่ Jewel",
				() => openJewelPicker(scene, node.id, () => scene.render()),
				{ size: 13, fill: 0x3c6aa0, color: UI.text },
			),
		);

	// Bottom action buttons: Focus + Allocate/Refund
	dc.add(
		button(
			scene,
			x + 40,
			btnY,
			80,
			40,
			"⊙ โฟกัส",
			() => focusCameraOnNode(scene, node, true),
			{ size: 12, fill: 0x424a72, color: UI.text },
		),
	);

	const ctaLabel = isOrigin
		? "⭐ จุดเริ่มต้น (ฟรี)"
		: allocated
			? canRefund
				? "↩ คืนโหนด (ฟรี)"
				: "🔒 โหนดทางผ่าน"
			: "✨ อัปโหนด (1 แต้ม)";
	const ctaFill = isOrigin
		? 0x3d415b
		: allocated
			? 0x4a5a8a
			: COLORS.gold;
	const ctaColor = allocated || isOrigin ? UI.text : UI.ink;
	const ctaEnabled = !isOrigin && (allocated ? canRefund : canAlloc);

	dc.add(
		button(
			scene,
			x + w - 92,
			btnY,
			184,
			40,
			ctaLabel,
			() => handleNodeToggle(scene, tree, node),
			{ size: 13.5, fill: ctaFill, color: ctaColor },
		).setEnabled(ctaEnabled),
	);
}

/** Fullscreen 960x540 modal overlay for unobstructed constellation exploration. */
function renderFullscreenModal(
	scene: CharacterScene,
	tree: PassiveTreeDef,
	bounds: GraphBounds,
) {
	const s = save();
	const earned = passiveEarnedFor(s);
	const spent = passiveSpent(s.job, s.passiveNodes, passiveCtxOf(s));
	const free = passiveFree(s.job, s.passiveNodes, earned, passiveCtxOf(s));

	const c = scene.add.container(0, 0).setDepth(30000);
	scene.modal = c;

	// Full-canvas backdrop swallows clicks behind modal
	c.add(scene.add.rectangle(W / 2, H / 2, W, H, 0x070914, 0.92).setInteractive());

	// 960x540 modal frame
	const mx = FULLSCREEN_MODAL.x;
	const my = FULLSCREEN_MODAL.y;
	const mw = FULLSCREEN_MODAL.w;
	const mh = FULLSCREEN_MODAL.h;
	c.add(panel(scene, mx, my, mw, mh, 0x111528, COLORS.gold, 10));

	// Top header bar (y: 18..62)
	c.add(
		clipW(
			txt(scene, 14, my + 8, `🌌 ${tree.title}`, 14, UI.gold, true),
			300,
		),
	);
	c.add(
		clipW(
			txt(
				scene,
				14,
				my + 26,
				`⭐ เหลือ ${free}/${earned} (Max ${PASSIVE_MAX_POINTS}) · J1/${PASSIVE_RULES.job1Every} · J2/${PASSIVE_RULES.job2Every} · J3/${PASSIVE_RULES.job3Every} · ESC ย่อจอ`,
				10,
				free > 0 ? UI.green : UI.sub,
			),
			320,
		),
	);

	// 5 Tag filter pills centered in header
	buildFilterPills(scene, c, tree, 336, my + 22);

	c.add(
		button(
			scene,
			792,
			my + 22,
			92,
			28,
			"🔄 รีเซ็ตฟรี",
			() => openResetConfirm(scene, tree),
			{ size: 11.5, fill: 0x5a5f8a, color: UI.text },
		).setEnabled(spent > 0),
	);
	c.add(
		button(
			scene,
			896,
			my + 22,
			104,
			28,
			"✕ ย่อจอ",
			() => {
				scene.passiveFull = false;
				scene.render();
			},
			{ size: 12, fill: 0x70424e, color: UI.text },
		),
	);

	// Fullscreen constellation canvas
	const view: PassiveView = { ...FULLSCREEN_VIEW };
	scene.passiveView = view;
	if (!scene.passiveCam) {
		scene.passiveCam = fitCamToBounds(
			bounds,
			view,
			PASSIVE_CAM_DEFAULTS.minZoom,
			PASSIVE_CAM_DEFAULTS.maxZoom,
			64,
		);
	} else {
		scene.passiveCam = clampCam(scene.passiveCam, bounds, view);
	}

	buildConstellationCanvas(scene, c, tree, view, true);

	// Floating bottom-left Inspect-then-Allocate card
	renderFullscreenInspectCard(scene, tree);
}

function renderFullscreenInspectCard(scene: CharacterScene, tree: PassiveTreeDef, previewId?: string) {
	scene.passiveDetailC?.destroy();
	const parent = scene.modal;
	if (!parent?.active) return;

	// Remove previous floating-card UI exclusion rect (keep toolbar rect at index 0)
	if (scene.passiveUiRects.length > 1) {
		scene.passiveUiRects.splice(1);
	}

	const dc = scene.add.container(0, 0);
	scene.passiveDetailC = dc;
	parent.add(dc);

	const s = save();
	const ctx = passiveCtxOf(s);
	const targetId = previewId || scene.passiveSelId;
	const node = passiveNodeById(s.job, targetId) ?? passiveNodeById(s.job, tree.originId);
	if (!node) return;

	if (scene.passiveFullHideCard) {
		const pillRect: PassiveView = { x: 16, y: 510, w: 168, h: 32 };
		scene.passiveUiRects.push(pillRect);
		dc.add(
			button(
				scene,
				pillRect.x + pillRect.w / 2,
				pillRect.y + pillRect.h / 2,
				pillRect.w,
				pillRect.h,
				`▴ ${node.icon} ${node.name}`,
				() => {
					scene.passiveFullHideCard = false;
					renderFullscreenInspectCard(scene, tree);
				},
				{ size: 11.5, fill: 0x262e4d, color: UI.gold },
			),
		);
		return;
	}

	const earned = passiveEarnedFor(s);
	const picked = normalizePassiveNodes(s.job, s.passiveNodes, passiveCtxOf(s));
	const pickedSet = new Set(picked);
	const free = passiveFree(s.job, picked, earned, passiveCtxOf(s));
	const allocated = pickedSet.has(node.id);
	const isOrigin = node.id === tree.originId;
	const adj = !allocated && node.edges.some((nb) => pickedSet.has(nb));
	const canAlloc = canAllocatePassive(s.job, picked, node.id, earned, passiveCtxOf(s));
	const canRefund = canRefundPassive(s.job, picked, node.id, passiveCtxOf(s));

	const cw = 328;
	const ch = 204;
	const cx = 16;
	const cy = FULLSCREEN_VIEW.y + FULLSCREEN_VIEW.h - ch - 8;
	scene.passiveUiRects.push({ x: cx, y: cy, w: cw, h: ch });

	const bg = scene.add.graphics();
	bg.fillStyle(0x141830, 0.94).fillRoundedRect(cx, cy, cw, ch, 10);
	bg.lineStyle(1.5, allocated ? COLORS.gold : UI.lineHi, 0.95).strokeRoundedRect(
		cx,
		cy,
		cw,
		ch,
		10,
	);
	dc.add(bg);

	// Header + collapse button
	dc.add(
		clipW(
			txt(scene, cx + 10, cy + 8, `${node.icon} ${node.name}`, 14.5, UI.gold, true),
			cw - 62,
		),
	);
	dc.add(
		button(
			scene,
			cx + cw - 24,
			cy + 18,
			34,
			22,
			"▾",
			() => {
				scene.passiveFullHideCard = true;
				renderFullscreenInspectCard(scene, tree);
			},
			{ size: 12, fill: 0x353d60, color: UI.text },
		),
	);

	const kindMeta = KIND_META[node.kind];
	const secMeta = SECTOR_META[node.sector];
	const stMeta = statusMetaOf(node, tree, allocated, canAlloc, canRefund, free, adj, passiveCtxOf(s));
	dc.add(
		clipW(
			txt(
				scene,
				cx + 10,
				cy + 28,
				`${kindMeta.label} · ${secMeta.label}`,
				10,
				kindMeta.color,
				true,
			),
			cw - 20,
		),
	);
	dc.add(
		clipW(
			txt(scene, cx + 10, cy + 43, stMeta.text, 9.5, stMeta.color, true),
			cw - 20,
		),
	);

	// Compact body (green upside / red downside OR desc), auto-shrunk to fit above buttons
	const lines: { text: string; color: string }[] = [];
	if (node.upside || node.downside) {
		if (node.upside) lines.push({ text: `✅ ${node.upside}`, color: UI.green });
		if (node.downside) lines.push({ text: `⚠️ ข้อเสีย: ${node.downside}`, color: UI.red });
	} else {
		lines.push({ text: node.desc(ctx), color: UI.text });
	}

	const bodyTop = cy + 60;
	const bodyMaxY = cy + ch - 46;
	let size = 11.5;
	let made: Phaser.GameObjects.Text[] = [];
	for (; ; size -= 0.5) {
		made.forEach((m) => m.destroy());
		made = [];
		let ty = bodyTop;
		for (const ln of lines) {
			const t = txt(scene, cx + 10, ty, ln.text, size, ln.color)
				.setWordWrapWidth(cw - 20, true)
				.setLineSpacing(2);
			ty += t.height + 5;
			made.push(t);
		}
		if (ty <= bodyMaxY || size <= 9) break;
	}
	dc.add(made);

	// Bottom action row
	const btnY = cy + ch - 23;
	dc.add(
		button(
			scene,
			cx + 46,
			btnY,
			74,
			32,
			"⊙ โฟกัส",
			() => focusCameraOnNode(scene, node, true),
			{ size: 11, fill: 0x424a72, color: UI.text },
		),
	);

	const ctaLabel = isOrigin
		? "⭐ จุดเริ่มต้น (ฟรี)"
		: allocated
			? canRefund
				? "↩ คืนโหนด (ฟรี)"
				: "🔒 โหนดทางผ่าน"
			: "✨ อัปโหนด (1 แต้ม)";
	const ctaFill = isOrigin ? 0x3d415b : allocated ? 0x4a5a8a : COLORS.gold;
	const ctaColor = allocated || isOrigin ? UI.text : UI.ink;
	const ctaEnabled = !isOrigin && (allocated ? canRefund : canAlloc);

	dc.add(
		button(
			scene,
			cx + cw - 114,
			btnY,
			210,
			32,
			ctaLabel,
			() => handleNodeToggle(scene, tree, node),
			{ size: 12.5, fill: ctaFill, color: ctaColor },
		).setEnabled(ctaEnabled),
	);
}
